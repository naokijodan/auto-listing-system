/**
 * Etsy API Client テスト
 * Task 3: OAuth refresh token自動更新のユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const { mockPrisma, mockSafeFetch } = vi.hoisted(() => ({
  mockPrisma: {
    marketplaceCredential: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  mockSafeFetch: vi.fn(),
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/api-utils', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    acquire: vi.fn().mockResolvedValue(undefined),
  })),
  withRetry: vi.fn().mockImplementation(async (fn: () => Promise<any>) => fn()),
  safeFetch: mockSafeFetch,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  RateLimitError: class RateLimitError extends Error {
    retryAfter?: number;
    constructor(message: string, retryAfter?: number) {
      super(message);
      this.retryAfter = retryAfter;
    }
  },
  apiRequest: vi.fn(),
}));

import { EtsyApiClient, calculateEtsyPrice, isEtsyConfigured } from '../../lib/etsy-api';

describe('EtsyApiClient', () => {
  let client: EtsyApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EtsyApiClient();
  });

  describe('ensureAccessToken', () => {
    it('should return cached token if not expired', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'valid-token', clientId: 'test-client', refreshToken: 'rt-1' },
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const token1 = await client.ensureAccessToken();
      expect(token1).toBe('valid-token');

      const token2 = await client.ensureAccessToken();
      expect(token2).toBe('valid-token');
      expect(mockPrisma.marketplaceCredential.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw if no credentials configured', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);
      await expect(client.ensureAccessToken()).rejects.toThrow('Etsy credentials not configured');
    });

    it('should throw if no refresh token available', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'old-token', clientId: 'test-client' },
        tokenExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(client.ensureAccessToken()).rejects.toThrow('Etsy refresh token not available');
    });

    it('should refresh token when expired', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'ETSY',
        isActive: true,
        credentials: {
          accessToken: 'old-token',
          clientId: 'test-client-id',
          refreshToken: 'test-refresh-token',
        },
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      mockSafeFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 7200,
        }),
      });
      mockPrisma.marketplaceCredential.update.mockResolvedValue({});

      const token = await client.ensureAccessToken();
      expect(token).toBe('new-access-token');

      expect(mockSafeFetch).toHaveBeenCalledWith(
        'https://api.etsy.com/v3/public/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      expect(mockPrisma.marketplaceCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-1' },
        data: {
          credentials: {
            accessToken: 'new-access-token',
            clientId: 'test-client-id',
            refreshToken: 'test-refresh-token',
          },
          tokenExpiresAt: expect.any(Date),
        },
      });
    });

    it('should refresh when tokenExpiresAt is null', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-2',
        marketplace: 'ETSY',
        isActive: true,
        credentials: {
          accessToken: 'stale-token',
          clientId: 'cid',
          refreshToken: 'rt-stale',
        },
        tokenExpiresAt: null,
      });

      mockSafeFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'refreshed-token', expires_in: 3600 }),
      });
      mockPrisma.marketplaceCredential.update.mockResolvedValue({});

      const token = await client.ensureAccessToken();
      expect(token).toBe('refreshed-token');
      expect(mockSafeFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on refresh API failure', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-3',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'old', clientId: 'cid', refreshToken: 'rt-bad' },
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      mockSafeFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid_grant'),
      });

      await expect(client.ensureAccessToken()).rejects.toThrow('Failed to refresh Etsy token: invalid_grant');
    });

    it('should use env var ETSY_API_KEY as fallback clientId', async () => {
      const originalEnv = process.env.ETSY_API_KEY;
      process.env.ETSY_API_KEY = 'env-api-key';

      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-env',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'old', refreshToken: 'rt-env' },
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      mockSafeFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'env-refreshed', expires_in: 3600 }),
      });
      mockPrisma.marketplaceCredential.update.mockResolvedValue({});

      const token = await client.ensureAccessToken();
      expect(token).toBe('env-refreshed');

      const fetchCall = mockSafeFetch.mock.calls[0];
      const body = fetchCall[1].body as URLSearchParams;
      expect(body.get('client_id')).toBe('env-api-key');

      process.env.ETSY_API_KEY = originalEnv;
    });

    it('should set correct expiration from expires_in', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-exp',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'old', clientId: 'cid', refreshToken: 'rt-exp' },
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      const now = Date.now();
      mockSafeFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-tok', expires_in: 7200 }),
      });
      mockPrisma.marketplaceCredential.update.mockResolvedValue({});

      await client.ensureAccessToken();

      const updateCall = mockPrisma.marketplaceCredential.update.mock.calls[0][0];
      const expiresAt = updateCall.data.tokenExpiresAt as Date;
      const diffMs = expiresAt.getTime() - now;
      expect(diffMs).toBeGreaterThan(7195 * 1000);
      expect(diffMs).toBeLessThan(7205 * 1000);
    });
  });

  describe('createDraftListing', () => {
    it('should call Etsy API with correct path', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'ETSY',
        isActive: true,
        credentials: { accessToken: 'tok', clientId: 'cid', refreshToken: 'rt' },
        tokenExpiresAt: new Date(Date.now() + 3600000),
      });

      // Mock getShopId response
      mockSafeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ results: [{ shop_id: 12345 }] })),
      });

      // Mock createDraftListing response
      mockSafeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ listing_id: 999 })),
      });

      const result = await client.createDraftListing({
        title: 'Test Item',
        description: 'A test listing',
        price: 29.99,
        quantity: 1,
        tags: ['vintage'],
        taxonomy_id: 100,
        who_made: 'someone_else',
        when_made: 'before_2005',
        is_supply: false,
        shipping_profile_id: 1,
      });

      expect(result).toEqual({ listing_id: 999 });
      const secondCall = mockSafeFetch.mock.calls[1];
      expect(secondCall[0]).toContain('/application/shops/12345/listings');
    });
  });
});

describe('calculateEtsyPrice', () => {
  it('should calculate price with markup and fees', () => {
    const price = calculateEtsyPrice(15000);
    expect(price).toBeGreaterThan(100);
    expect(price).toBeLessThan(200);
  });

  it('should round up to 2 decimal places', () => {
    const price = calculateEtsyPrice(10000);
    const decimals = price.toString().split('.')[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});

describe('isEtsyConfigured', () => {
  it('should return true when ETSY_API_KEY is set', () => {
    const orig = process.env.ETSY_API_KEY;
    process.env.ETSY_API_KEY = 'test-key';
    expect(isEtsyConfigured()).toBe(true);
    process.env.ETSY_API_KEY = orig;
  });

  it('should return false when ETSY_API_KEY is not set', () => {
    const orig = process.env.ETSY_API_KEY;
    delete process.env.ETSY_API_KEY;
    expect(isEtsyConfigured()).toBe(false);
    process.env.ETSY_API_KEY = orig;
  });
});

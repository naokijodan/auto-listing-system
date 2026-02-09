import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockPrisma, mockFetch } = vi.hoisted(() => {
  return {
    mockPrisma: {
      marketplaceCredential: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
    },
    mockFetch: vi.fn(),
  };
});

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

vi.mock('./api-utils', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    acquire: vi.fn().mockResolvedValue(undefined),
  })),
  withRetry: vi.fn().mockImplementation(async (fn) => fn()),
  safeFetch: mockFetch,
  createApiError: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  RateLimitError: class RateLimitError extends Error {
    retryAfter?: number;
    constructor(message: string, retryAfter?: number) {
      super(message);
      this.retryAfter = retryAfter;
    }
  },
}));

const originalFetch = globalThis.fetch;

import {
  isEbayConfigured,
  mapConditionToEbay,
  EbayApiClient,
} from '../../lib/ebay-api';

describe('eBay API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as any;
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);
    mockPrisma.marketplaceCredential.updateMany.mockResolvedValue({});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('isEbayConfigured', () => {
    it('should return true when credential exists', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-123',
        marketplace: 'EBAY',
        isActive: true,
      });

      const result = await isEbayConfigured();

      expect(result).toBe(true);
      expect(mockPrisma.marketplaceCredential.findFirst).toHaveBeenCalledWith({
        where: {
          marketplace: 'EBAY',
          isActive: true,
        },
      });
    });

    it('should return false when no credential', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const result = await isEbayConfigured();

      expect(result).toBe(false);
    });
  });

  describe('mapConditionToEbay', () => {
    it('should map Japanese conditions to eBay conditions', () => {
      expect(mapConditionToEbay('新品')).toBe('NEW');
      expect(mapConditionToEbay('未使用')).toBe('NEW');
      expect(mapConditionToEbay('新品・未使用')).toBe('NEW');
      expect(mapConditionToEbay('未使用に近い')).toBe('NEW_OTHER');
      expect(mapConditionToEbay('目立った傷や汚れなし')).toBe('USED_EXCELLENT');
      expect(mapConditionToEbay('やや傷や汚れあり')).toBe('USED_GOOD');
      expect(mapConditionToEbay('傷や汚れあり')).toBe('USED_ACCEPTABLE');
      expect(mapConditionToEbay('全体的に状態が悪い')).toBe('FOR_PARTS_OR_NOT_WORKING');
    });

    it('should return default for unknown condition', () => {
      expect(mapConditionToEbay('unknown')).toBe('USED_GOOD');
      expect(mapConditionToEbay(undefined)).toBe('USED_GOOD');
      expect(mapConditionToEbay('')).toBe('USED_GOOD');
    });
  });

  describe('EbayApiClient', () => {
    describe('createOrUpdateInventoryItem', () => {
      it('should throw error when credentials not configured', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

        await expect(
          client.createOrUpdateInventoryItem('TEST-SKU', {
            title: 'Test Product',
            description: 'Description',
            imageUrls: ['https://example.com/image.jpg'],
            condition: 'NEW',
          })
        ).rejects.toThrow('eBay credentials not configured');
      });

      it('should call API with correct parameters', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            accessToken: 'test-token',
          },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
        });

        const result = await client.createOrUpdateInventoryItem('TEST-SKU', {
          title: 'Test Product',
          description: 'Description',
          imageUrls: ['https://example.com/image.jpg'],
          condition: 'NEW',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('createOffer', () => {
      it('should create offer with correct data', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            accessToken: 'test-token',
          },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ offerId: 'offer-123' }),
        });

        const result = await client.createOffer('TEST-SKU', {
          marketplaceId: 'EBAY_US',
          format: 'FIXED_PRICE',
          categoryId: '12345',
          pricingPrice: 29.99,
          pricingCurrency: 'USD',
          quantity: 1,
        });

        expect(result.success).toBe(true);
        expect(result.data?.offerId).toBe('offer-123');
      });
    });

    describe('getOffer', () => {
      it('should get offer details', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            offerId: 'offer-123',
            status: 'PUBLISHED',
          }),
        });

        const result = await client.getOffer('offer-123');

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('PUBLISHED');
      });
    });

    describe('publishOffer', () => {
      it('should publish offer', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ listingId: 'listing-123' }),
        });

        const result = await client.publishOffer('offer-123');

        expect(result.success).toBe(true);
        expect(result.data?.listingId).toBe('listing-123');
      });
    });

    describe('withdrawOffer', () => {
      it('should withdraw offer', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
        });

        const result = await client.withdrawOffer('offer-123');

        expect(result.success).toBe(true);
      });
    });

    describe('updateInventory', () => {
      it('should update inventory quantity', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
        });

        const result = await client.updateInventory('TEST-SKU', 10);

        expect(result.success).toBe(true);
      });
    });

    describe('updatePrice', () => {
      it('should update price', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ offerId: 'offer-123' }),
        });

        const result = await client.updatePrice('offer-123', 39.99, 'USD');

        expect(result.success).toBe(true);
      });
    });

    describe('searchCategories', () => {
      it('should search categories', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            categorySuggestions: [
              { category: { categoryId: '123', categoryName: 'Electronics' } },
            ],
          }),
        });

        const result = await client.searchCategories('electronics');

        expect(result.success).toBe(true);
        expect(result.data?.length).toBeGreaterThan(0);
      });
    });

    describe('error handling', () => {
      it('should handle API error response', async () => {
        const client = new EbayApiClient();
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
          credentials: { accessToken: 'test-token' },
        });

        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          headers: {
            get: () => null,
          },
          json: async () => ({
            errors: [{ errorId: 'ERROR_123', message: 'Bad request' }],
          }),
        });

        const result = await client.getOffer('invalid-offer');

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bad request');
      });
    });
  });
});

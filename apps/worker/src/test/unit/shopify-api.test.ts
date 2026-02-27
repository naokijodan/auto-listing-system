/**
 * Shopify API Client テスト
 * Task 3: 認証・トークン管理のユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const { mockPrisma, mockSafeFetch } = vi.hoisted(() => ({
  mockPrisma: {
    marketplaceCredential: {
      findFirst: vi.fn(),
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
}));

import { ShopifyApiClient } from '../../lib/shopify-api';

describe('ShopifyApiClient', () => {
  let client: ShopifyApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ShopifyApiClient();
  });

  describe('ensureAccessToken', () => {
    it('should return token and shop from credentials', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: {
          accessToken: 'shpat_test123',
          shop: 'my-store.myshopify.com',
        },
      });

      const result = await client.ensureAccessToken();
      expect(result).toEqual({
        token: 'shpat_test123',
        shop: 'my-store.myshopify.com',
      });
    });

    it('should cache token after first call', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: {
          accessToken: 'shpat_cached',
          shop: 'cached-store.myshopify.com',
        },
      });

      await client.ensureAccessToken();
      await client.ensureAccessToken();
      expect(mockPrisma.marketplaceCredential.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw if no credentials configured', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);
      await expect(client.ensureAccessToken()).rejects.toThrow('Shopify credentials not configured');
    });

    it('should throw if accessToken is missing', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-bad',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { shop: 'store.myshopify.com' },
      });
      await expect(client.ensureAccessToken()).rejects.toThrow('Invalid Shopify credential: missing token or shop');
    });

    it('should throw if shop is missing', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-noshop',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_valid' },
      });
      await expect(client.ensureAccessToken()).rejects.toThrow('Invalid Shopify credential: missing token or shop');
    });

    it('should accept shopDomain as fallback for shop', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-domain',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: {
          accessToken: 'shpat_domain',
          shopDomain: 'domain-store.myshopify.com',
        },
      });

      const result = await client.ensureAccessToken();
      expect(result).toEqual({
        token: 'shpat_domain',
        shop: 'domain-store.myshopify.com',
      });
    });
  });

  describe('createProduct', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_prod', shop: 'test-store.myshopify.com' },
      });
    });

    it('should create a product via Admin API', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ product: { id: 12345, title: 'Test Product' } })),
      });

      const result = await client.createProduct({
        title: 'Test Product',
        body_html: '<p>Description</p>',
        variants: [{ price: '29.99', sku: 'TEST-001' }],
      });

      expect(result).toEqual({ product: { id: 12345, title: 'Test Product' } });
      expect(mockSafeFetch).toHaveBeenCalledWith(
        'https://test-store.myshopify.com/admin/api/2026-01/products.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': 'shpat_prod',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('getProduct', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_get', shop: 'get-store.myshopify.com' },
      });
    });

    it('should get a product by ID', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ product: { id: 99, title: 'Fetched' } })),
      });

      const result = await client.getProduct('99');
      expect(result).toEqual({ product: { id: 99, title: 'Fetched' } });
      expect(mockSafeFetch).toHaveBeenCalledWith(
        'https://get-store.myshopify.com/admin/api/2026-01/products/99.json',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('setInventoryLevel', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-inv',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_inv', shop: 'inv-store.myshopify.com' },
      });
    });

    it('should set inventory level for an item', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ inventory_level: { available: 10 } })),
      });

      const result = await client.setInventoryLevel('item-1', 'loc-1', 10);
      expect(result).toEqual({ inventory_level: { available: 10 } });

      const body = JSON.parse(mockSafeFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        location_id: 'loc-1',
        inventory_item_id: 'item-1',
        available: 10,
      });
    });
  });

  describe('getOrders', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-ord',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_ord', shop: 'ord-store.myshopify.com' },
      });
    });

    it('should fetch orders with status filter', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ orders: [{ id: 1 }] })),
      });

      await client.getOrders({ status: 'open', limit: 50 });

      const url = mockSafeFetch.mock.calls[0][0];
      expect(url).toContain('status=open');
      expect(url).toContain('limit=50');
    });

    it('should fetch orders without params', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ orders: [] })),
      });

      await client.getOrders();
      const url = mockSafeFetch.mock.calls[0][0];
      expect(url).toContain('/orders.json');
    });
  });

  describe('createWebhook', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-wh',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_wh', shop: 'wh-store.myshopify.com' },
      });
    });

    it('should create a webhook', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({ webhook: { id: 1, topic: 'orders/create' } })),
      });

      await client.createWebhook('orders/create', 'https://example.com/webhook');

      const body = JSON.parse(mockSafeFetch.mock.calls[0][1].body);
      expect(body.webhook.topic).toBe('orders/create');
      expect(body.webhook.address).toBe('https://example.com/webhook');
      expect(body.webhook.format).toBe('json');
    });
  });

  describe('rate limiting (429)', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-rl',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_rl', shop: 'rl-store.myshopify.com' },
      });
    });

    it('should throw RateLimitError on 429 response', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (h: string) => (h === 'Retry-After' ? '2' : null) },
        text: () => Promise.resolve('Too Many Requests'),
      });

      await expect(client.listProducts()).rejects.toThrow();
    });
  });

  describe('deleteProduct', () => {
    beforeEach(() => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: 'cred-del',
        marketplace: 'SHOPIFY',
        isActive: true,
        credentials: { accessToken: 'shpat_del', shop: 'del-store.myshopify.com' },
      });
    });

    it('should delete a product', async () => {
      mockSafeFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve(JSON.stringify({})),
      });

      await client.deleteProduct('123');
      expect(mockSafeFetch).toHaveBeenCalledWith(
        'https://del-store.myshopify.com/admin/api/2026-01/products/123.json',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});

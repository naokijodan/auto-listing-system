import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const {
  mockPrisma,
  mockCheckSingleProductInventory,
  mockEbayApi,
  mockJoomApi,
  mockIsEbayConfigured,
  mockIsJoomConfigured,
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      product: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      listing: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      jobLog: {
        create: vi.fn(),
      },
    },
    mockCheckSingleProductInventory: vi.fn(),
    mockEbayApi: {
      getOffer: vi.fn(),
    },
    mockJoomApi: {
      getProduct: vi.fn(),
    },
    mockIsEbayConfigured: vi.fn(),
    mockIsJoomConfigured: vi.fn(),
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

vi.mock('../../lib/inventory-checker', () => ({
  checkSingleProductInventory: mockCheckSingleProductInventory,
}));

vi.mock('../../lib/ebay-api', () => ({
  ebayApi: mockEbayApi,
  isEbayConfigured: mockIsEbayConfigured,
}));

vi.mock('../../lib/joom-api', () => ({
  joomApi: mockJoomApi,
  isJoomConfigured: mockIsJoomConfigured,
}));

import {
  processInventoryJob,
  processScheduledInventoryCheck,
  processSyncListingStatus,
} from '../../processors/inventory';

describe('Inventory Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'product-123',
      listings: [],
    });
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.listing.findUnique.mockResolvedValue(null);
    mockPrisma.listing.update.mockResolvedValue({});
    mockPrisma.jobLog.create.mockResolvedValue({});
    mockCheckSingleProductInventory.mockResolvedValue({
      productId: 'product-123',
      isAvailable: true,
      currentPrice: 1000,
      priceChanged: false,
      hashChanged: false,
      newHash: 'hash123',
      action: 'none',
    });
    mockIsEbayConfigured.mockResolvedValue(false);
    mockIsJoomConfigured.mockResolvedValue(false);
  });

  describe('processInventoryJob', () => {
    it('should throw error when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'hash',
          checkPrice: true,
          checkStock: true,
        },
      };

      await expect(processInventoryJob(job as any)).rejects.toThrow('Product not found');
    });

    it('should process inventory check successfully', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'hash',
          checkPrice: true,
          checkStock: true,
        },
      };

      const result = await processInventoryJob(job as any);

      expect(result.success).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(mockCheckSingleProductInventory).toHaveBeenCalledWith('product-123');
    });

    it('should create job log on success', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'hash',
          checkPrice: true,
          checkStock: true,
        },
      };

      await processInventoryJob(job as any);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          queueName: 'inventory',
          jobType: 'INVENTORY_CHECK',
          status: 'COMPLETED',
          productId: 'product-123',
        }),
      });
    });

    it('should handle inventory check with error result', async () => {
      mockCheckSingleProductInventory.mockResolvedValue({
        productId: 'product-123',
        isAvailable: false,
        currentPrice: null,
        priceChanged: false,
        hashChanged: false,
        newHash: null,
        action: 'none',
        error: 'Scrape failed',
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'hash',
          checkPrice: true,
          checkStock: true,
        },
      };

      const result = await processInventoryJob(job as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Scrape failed');
    });

    it('should handle exception during check', async () => {
      mockCheckSingleProductInventory.mockRejectedValue(new Error('Network error'));

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'hash',
          checkPrice: true,
          checkStock: true,
        },
      };

      await expect(processInventoryJob(job as any)).rejects.toThrow('Network error');
      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });

    it('should return price and hash change info', async () => {
      mockCheckSingleProductInventory.mockResolvedValue({
        productId: 'product-123',
        isAvailable: true,
        currentPrice: 1200,
        priceChanged: true,
        hashChanged: true,
        newHash: 'newhash',
        action: 'update_price',
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          sourceUrl: 'https://example.com',
          currentHash: 'oldhash',
          checkPrice: true,
          checkStock: true,
        },
      };

      const result = await processInventoryJob(job as any);

      expect(result.priceChanged).toBe(true);
      expect(result.hashChanged).toBe(true);
      expect(result.currentPrice).toBe(1200);
      expect(result.newHash).toBe('newhash');
    });
  });

  describe('processScheduledInventoryCheck', () => {
    let originalSetTimeout: typeof globalThis.setTimeout;

    beforeEach(() => {
      originalSetTimeout = globalThis.setTimeout;
      // Mock setTimeout to execute callback immediately (skip rate limiting delay)
      globalThis.setTimeout = ((fn: (...args: any[]) => void, _delay?: number) => {
        fn();
        return 0 as any;
      }) as any;
    });

    afterEach(() => {
      globalThis.setTimeout = originalSetTimeout;
    });

    it('should check specific products when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'specific' as const,
          productIds: ['product-1', 'product-2'],
          batchSize: 50,
        },
      };

      const result = await processScheduledInventoryCheck(job as any);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['product-1', 'product-2'] } },
        select: { id: true },
      });
      expect(result.totalChecked).toBe(2);
    });

    it('should check all active products when checkType is all', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'all' as const,
          batchSize: 100,
        },
      };

      await processScheduledInventoryCheck(job as any);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] } },
          take: 100,
        })
      );
    });

    it('should count out of stock products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);
      mockCheckSingleProductInventory
        .mockResolvedValueOnce({ isAvailable: true, priceChanged: false })
        .mockResolvedValueOnce({ isAvailable: false, priceChanged: false });

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'all' as const,
          batchSize: 50,
        },
      };

      const result = await processScheduledInventoryCheck(job as any);

      expect(result.outOfStock).toBe(1);
    });

    it('should count price changed products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);
      mockCheckSingleProductInventory
        .mockResolvedValueOnce({ isAvailable: true, priceChanged: true })
        .mockResolvedValueOnce({ isAvailable: true, priceChanged: false });

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'all' as const,
          batchSize: 50,
        },
      };

      const result = await processScheduledInventoryCheck(job as any);

      expect(result.priceChanged).toBe(1);
    });

    it('should handle individual item errors', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);
      mockCheckSingleProductInventory
        .mockResolvedValueOnce({ isAvailable: true, priceChanged: false })
        .mockRejectedValueOnce(new Error('Check failed'));

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'all' as const,
          batchSize: 50,
        },
      };

      const result = await processScheduledInventoryCheck(job as any);

      expect(result.totalChecked).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should handle global error', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('DB error'));

      const job = {
        id: 'job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'all' as const,
          batchSize: 50,
        },
      };

      const result = await processScheduledInventoryCheck(job as any);

      expect(result.success).toBe(false);
      expect(result.errors).toBe(1);
    });
  });

  describe('processSyncListingStatus', () => {
    it('should return error when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Listing not found');
    });

    it('should return error when no marketplace listing ID', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-123',
        marketplaceListingId: null,
      });

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No marketplace listing ID');
    });

    it('should sync Joom listing status', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-123',
        marketplaceListingId: 'joom-123',
        listingPrice: 29.99,
      });
      mockIsJoomConfigured.mockResolvedValue(true);
      mockJoomApi.getProduct.mockResolvedValue({
        success: true,
        data: { quantity: 5, price: 29.99 },
      });

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.quantity).toBe(5);
    });

    it('should sync eBay listing status', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-123',
        marketplaceListingId: 'ebay-123',
        marketplaceData: { offerId: 'offer-123' },
        listingPrice: 29.99,
      });
      mockIsEbayConfigured.mockResolvedValue(true);
      mockEbayApi.getOffer.mockResolvedValue({
        success: true,
        data: {
          status: 'PUBLISHED',
          pricingSummary: { price: { value: '29.99' } },
          availableQuantity: 1,
        },
      });

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'EBAY',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe('PUBLISHED');
    });

    it('should return error when marketplace not configured', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-123',
        marketplaceListingId: 'joom-123',
      });
      mockIsJoomConfigured.mockResolvedValue(false);

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should update listing in database', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-123',
        marketplaceListingId: 'joom-123',
        status: 'ACTIVE',
        listingPrice: 29.99,
      });
      mockIsJoomConfigured.mockResolvedValue(true);
      mockJoomApi.getProduct.mockResolvedValue({
        success: true,
        data: { quantity: 0, price: 29.99 },
      });

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      await processSyncListingStatus(job as any);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: expect.objectContaining({
          status: 'PAUSED',
        }),
      });
    });

    it('should handle exception', async () => {
      mockPrisma.listing.findUnique.mockRejectedValue(new Error('DB error'));

      const job = {
        id: 'job-123',
        data: {
          listingId: 'listing-123',
          marketplace: 'JOOM',
        },
      };

      const result = await processSyncListingStatus(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });
});

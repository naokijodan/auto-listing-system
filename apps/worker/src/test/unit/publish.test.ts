import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const {
  mockPrisma,
  mockJoomApi,
  mockEbayApi,
  mockIsJoomConfigured,
  mockIsEbayConfigured,
  mockMapConditionToEbay,
  mockCalculatePrice,
  mockAlertManager,
  mockEventBus,
  mockProcessBatch,
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      listing: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      product: {
        update: vi.fn(),
      },
      jobLog: {
        create: vi.fn(),
      },
    },
    mockJoomApi: {
      createProduct: vi.fn(),
      enableProduct: vi.fn(),
    },
    mockEbayApi: {
      getCategoryWithSpecifics: vi.fn(),
      createOrUpdateInventoryItem: vi.fn(),
      createOffer: vi.fn(),
      publishOffer: vi.fn(),
    },
    mockIsJoomConfigured: vi.fn(),
    mockIsEbayConfigured: vi.fn(),
    mockMapConditionToEbay: vi.fn(),
    mockCalculatePrice: vi.fn(),
    mockAlertManager: {
      processEvent: vi.fn(),
    },
    mockEventBus: {
      publishListingUpdate: vi.fn(),
    },
    mockProcessBatch: vi.fn(),
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

vi.mock('@rakuda/config', () => ({
  processBatch: mockProcessBatch,
}));

vi.mock('../../lib/joom-api', () => ({
  joomApi: mockJoomApi,
  isJoomConfigured: mockIsJoomConfigured,
}));

vi.mock('../../lib/ebay-api', () => ({
  ebayApi: mockEbayApi,
  isEbayConfigured: mockIsEbayConfigured,
  mapConditionToEbay: mockMapConditionToEbay,
}));

vi.mock('../../lib/price-calculator', () => ({
  calculatePrice: mockCalculatePrice,
}));

vi.mock('../../lib/alert-manager', () => ({
  alertManager: mockAlertManager,
}));

vi.mock('../../lib/event-bus', () => ({
  eventBus: mockEventBus,
}));

vi.mock('../../lib/api-utils', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    acquire: vi.fn().mockResolvedValue(undefined),
  })),
}));

import {
  processPublishJob,
  processBatchPublish,
  processPendingPublish,
} from '../../processors/publish';

describe('Publish Processor', () => {
  const mockProduct = {
    id: 'product-123',
    title: 'Test Product',
    titleEn: 'Test Product EN',
    description: 'Description',
    descriptionEn: 'Description EN',
    price: 1000,
    images: ['https://example.com/image1.jpg'],
    processedImages: ['https://storage.example.com/processed1.jpg'],
    condition: 'new',
    category: 'Electronics',
    attributes: {},
  };

  const mockListing = {
    id: 'listing-123',
    productId: 'product-123',
    product: mockProduct,
    marketplace: 'JOOM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
    mockPrisma.listing.findMany.mockResolvedValue([]);
    mockPrisma.listing.update.mockResolvedValue({});
    mockPrisma.product.update.mockResolvedValue({});
    mockPrisma.jobLog.create.mockResolvedValue({});
    mockIsJoomConfigured.mockResolvedValue(true);
    mockIsEbayConfigured.mockResolvedValue(true);
    mockCalculatePrice.mockResolvedValue({
      listingPrice: 29.99,
      shippingCost: 5.99,
    });
    mockJoomApi.createProduct.mockResolvedValue({
      success: true,
      data: { id: 'joom-product-123' },
    });
    mockJoomApi.enableProduct.mockResolvedValue({ success: true });
    mockEbayApi.getCategoryWithSpecifics.mockResolvedValue({
      categoryId: '12345',
      itemSpecifics: {},
    });
    mockEbayApi.createOrUpdateInventoryItem.mockResolvedValue({ success: true });
    mockEbayApi.createOffer.mockResolvedValue({
      success: true,
      data: { offerId: 'offer-123' },
    });
    mockEbayApi.publishOffer.mockResolvedValue({
      success: true,
      data: { listingId: 'ebay-listing-123' },
    });
    mockMapConditionToEbay.mockReturnValue('NEW');
    mockAlertManager.processEvent.mockResolvedValue(undefined);
    mockEventBus.publishListingUpdate.mockResolvedValue(undefined);
  });

  describe('processPublishJob', () => {
    it('should throw error when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      await expect(processPublishJob(job as any)).rejects.toThrow('Listing not found');
    });

    it('should process dry run successfully', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: true,
        },
      };

      const result = await processPublishJob(job as any);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toContain('dry-run');
      expect(mockJoomApi.createProduct).not.toHaveBeenCalled();
    });

    it('should publish to Joom successfully', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      const result = await processPublishJob(job as any);

      expect(result.success).toBe(true);
      expect(mockJoomApi.createProduct).toHaveBeenCalled();
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      });
    });

    it('should publish to eBay successfully', async () => {
      const ebayListing = { ...mockListing, marketplace: 'EBAY' };
      mockPrisma.listing.findUnique.mockResolvedValue(ebayListing);

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'ebay',
          isDryRun: false,
        },
      };

      const result = await processPublishJob(job as any);

      expect(result.success).toBe(true);
      expect(mockEbayApi.createOrUpdateInventoryItem).toHaveBeenCalled();
      expect(mockEbayApi.createOffer).toHaveBeenCalled();
      expect(mockEbayApi.publishOffer).toHaveBeenCalled();
    });

    it('should update listing status to PUBLISHING at start', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      await processPublishJob(job as any);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: { status: 'PUBLISHING' },
      });
    });

    it('should create job log on success', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      await processPublishJob(job as any);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          queueName: 'publish',
          jobType: 'PUBLISH',
          status: 'COMPLETED',
          productId: 'product-123',
        }),
      });
    });

    it('should handle publish error', async () => {
      mockJoomApi.createProduct.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      await expect(processPublishJob(job as any)).rejects.toThrow('Joom API error');
    });

    it('should update listing status to ERROR on failure', async () => {
      mockJoomApi.createProduct.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      try {
        await processPublishJob(job as any);
      } catch {}

      expect(mockPrisma.listing.update).toHaveBeenLastCalledWith({
        where: { id: 'listing-123' },
        data: expect.objectContaining({ status: 'ERROR' }),
      });
    });

    it('should trigger alert on failure', async () => {
      mockJoomApi.createProduct.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      try {
        await processPublishJob(job as any);
      } catch {}

      expect(mockAlertManager.processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LISTING_FAILED' })
      );
    });

    it('should publish event on success', async () => {
      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      await processPublishJob(job as any);

      expect(mockEventBus.publishListingUpdate).toHaveBeenCalledWith(
        'listing-123',
        'created',
        expect.any(Object)
      );
    });

    it('should use placeholder when Joom not configured', async () => {
      mockIsJoomConfigured.mockResolvedValue(false);

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      const result = await processPublishJob(job as any);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toContain('placeholder');
    });

    it('should handle existing Joom product gracefully', async () => {
      mockJoomApi.createProduct.mockResolvedValue({
        success: false,
        error: { message: 'already_exists productID=abc123def' },
      });

      const job = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          listingId: 'listing-123',
          marketplace: 'joom',
          isDryRun: false,
        },
      };

      const result = await processPublishJob(job as any);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toBe('abc123def');
    });
  });

  describe('processBatchPublish', () => {
    it('should process batch of listings', async () => {
      mockProcessBatch.mockResolvedValue({
        results: [
          { item: 'listing-1', success: true, result: { marketplaceListingId: 'mp-1' } },
          { item: 'listing-2', success: true, result: { marketplaceListingId: 'mp-2' } },
        ],
        stats: {
          succeeded: 2,
          failed: 0,
          duration: 5000,
          averageItemDuration: 2500,
          itemsPerSecond: 0.4,
        },
        aborted: false,
      });

      const result = await processBatchPublish(['listing-1', 'listing-2'], {
        marketplace: 'joom',
        concurrency: 2,
        isDryRun: false,
      });

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should track failed items', async () => {
      mockProcessBatch.mockResolvedValue({
        results: [
          { item: 'listing-1', success: true, result: { marketplaceListingId: 'mp-1' } },
          { item: 'listing-2', success: false, error: new Error('API Error') },
        ],
        stats: {
          succeeded: 1,
          failed: 1,
          duration: 5000,
          averageItemDuration: 2500,
          itemsPerSecond: 0.4,
        },
        aborted: false,
      });

      const result = await processBatchPublish(['listing-1', 'listing-2'], {
        marketplace: 'joom',
        concurrency: 2,
        isDryRun: false,
      });

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].error).toBe('API Error');
    });

    it('should calculate stats correctly', async () => {
      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: {
          succeeded: 10,
          failed: 0,
          duration: 60000,
          averageItemDuration: 6000,
          itemsPerSecond: 10 / 60,
        },
        aborted: false,
      });

      const result = await processBatchPublish(['listing-1'], {
        marketplace: 'joom',
        concurrency: 2,
        isDryRun: false,
      });

      expect(result.stats.itemsPerMinute).toBe(10);
      expect(result.stats.averageTimePerItem).toBe(6000);
    });
  });

  describe('processPendingPublish', () => {
    it('should return empty result when no pending listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const result = await processPendingPublish('joom');

      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should process pending listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { id: 'listing-1' },
        { id: 'listing-2' },
      ]);

      mockProcessBatch.mockResolvedValue({
        results: [
          { item: 'listing-1', success: true, result: { marketplaceListingId: 'mp-1' } },
          { item: 'listing-2', success: true, result: { marketplaceListingId: 'mp-2' } },
        ],
        stats: {
          succeeded: 2,
          failed: 0,
          duration: 5000,
          averageItemDuration: 2500,
          itemsPerSecond: 0.4,
        },
        aborted: false,
      });

      const result = await processPendingPublish('joom');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: {
          marketplace: 'JOOM',
          status: 'PENDING_PUBLISH',
        },
        take: 50,
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      expect(result.total).toBe(2);
    });

    it('should use custom options', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);

      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: { succeeded: 0, failed: 0, duration: 0, averageItemDuration: 0, itemsPerSecond: 0 },
        aborted: false,
      });

      await processPendingPublish('ebay', {
        maxListings: 100,
        concurrency: 5,
        isDryRun: true,
      });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });
});

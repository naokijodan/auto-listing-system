import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks so they're available before vi.mock() factory functions run
const {
  mockPrismaLocal,
  mockJoomApi,
  mockEbayApi,
  mockIsJoomConfigured,
  mockIsEbayConfigured,
  mockMapConditionToEbay,
  mockCalculatePrice,
  mockAlertManager,
  mockEventBus,
} = vi.hoisted(() => {
  return {
    mockPrismaLocal: {
      listing: {
        findUnique: vi.fn(),
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
      getCategoryId: vi.fn(),
      getCategoryWithSpecifics: vi.fn(),
      createOrUpdateInventoryItem: vi.fn(),
      createOffer: vi.fn(),
      publishOffer: vi.fn(),
    },
    mockIsJoomConfigured: vi.fn(),
    mockIsEbayConfigured: vi.fn(),
    mockMapConditionToEbay: vi.fn().mockReturnValue('NEW'),
    mockCalculatePrice: vi.fn(),
    mockAlertManager: {
      processEvent: vi.fn(),
    },
    mockEventBus: {
      publishListingUpdate: vi.fn(),
    },
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
  prisma: mockPrismaLocal,
}));

vi.mock('@rakuda/config', () => ({
  processBatch: vi.fn(),
  MARKETPLACE_PRICE_LIMITS: {
    JOOM_PRICE_LIMIT_JPY: 900000,
  },
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

import { processPublishJob } from '../../processors/publish';

describe('Publish Processor', () => {
  const mockProduct = {
    id: 'product-123456',
    title: 'テスト商品',
    titleEn: 'Test Product',
    description: '説明文',
    descriptionEn: 'Description',
    price: 5000,
    images: ['https://example.com/image1.jpg'],
    processedImages: ['https://cdn.example.com/image1.jpg'],
    category: 'Electronics',
    attributes: {},
  };

  const mockListing = {
    id: 'listing-1',
    productId: 'product-123456',
    marketplace: 'EBAY',
    listingPrice: 100,
    product: mockProduct,
  };

  const mockJob = {
    id: 'job-123',
    data: {
      productId: 'product-123456',
      listingId: 'listing-1',
      marketplace: 'ebay',
      isDryRun: false,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaLocal.listing.findUnique.mockResolvedValue(mockListing);
    mockPrismaLocal.listing.update.mockResolvedValue({ id: 'listing-1' });
    mockPrismaLocal.product.update.mockResolvedValue({ id: 'product-1' });
    mockPrismaLocal.jobLog.create.mockResolvedValue({ id: 'log-1' });
    mockCalculatePrice.mockResolvedValue({
      listingPrice: 100,
      shippingCost: 15,
      profit: 25,
      profitMargin: 0.25,
    });
    mockAlertManager.processEvent.mockResolvedValue(undefined);
    mockEventBus.publishListingUpdate.mockResolvedValue(undefined);
  });

  describe('dry run mode', () => {
    it('should skip actual publish in dry run mode', async () => {
      const dryRunJob = {
        ...mockJob,
        data: { ...mockJob.data, isDryRun: true },
      };

      const result = await processPublishJob(dryRunJob);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toContain('dry-run');
      expect(mockEbayApi.createOrUpdateInventoryItem).not.toHaveBeenCalled();
      expect(mockJoomApi.createProduct).not.toHaveBeenCalled();
    });
  });

  describe('listing not found', () => {
    it('should throw error when listing not found', async () => {
      mockPrismaLocal.listing.findUnique.mockResolvedValue(null);

      await expect(processPublishJob(mockJob)).rejects.toThrow('Listing not found');
    });
  });

  describe('eBay publish', () => {
    beforeEach(() => {
      mockIsEbayConfigured.mockResolvedValue(true);
      mockMapConditionToEbay.mockReturnValue('NEW');
      mockEbayApi.getCategoryWithSpecifics.mockResolvedValue({
        categoryId: '123456',
        categoryName: 'Electronics',
        itemSpecifics: {},
      });
      mockEbayApi.createOrUpdateInventoryItem.mockResolvedValue({
        success: true,
        data: { sku: 'ALS-product-' },
      });
      mockEbayApi.createOffer.mockResolvedValue({
        success: true,
        data: { offerId: 'offer-123' },
      });
      mockEbayApi.publishOffer.mockResolvedValue({
        success: true,
        data: { listingId: 'ebay-listing-123' },
      });
    });

    it('should publish to eBay successfully', async () => {
      const result = await processPublishJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toBe('ebay-listing-123');
      expect(result.listingUrl).toContain('ebay.com');
    });

    it('should update listing status to ACTIVE on success', async () => {
      await processPublishJob(mockJob);

      expect(mockPrismaLocal.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          marketplaceListingId: 'ebay-listing-123',
        }),
      });
    });

    it('should create job log on success', async () => {
      await processPublishJob(mockJob);

      expect(mockPrismaLocal.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'publish',
          jobType: 'PUBLISH',
          status: 'COMPLETED',
        }),
      });
    });

    it('should handle eBay inventory API error', async () => {
      mockEbayApi.createOrUpdateInventoryItem.mockResolvedValue({
        success: false,
        error: { message: 'Inventory API failed' },
      });

      await expect(processPublishJob(mockJob)).rejects.toThrow('eBay Inventory API error');

      expect(mockPrismaLocal.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: expect.objectContaining({
          status: 'ERROR',
        }),
      });
    });

    it('should handle eBay offer API error', async () => {
      mockEbayApi.createOffer.mockResolvedValue({
        success: false,
        error: { message: 'Offer API failed' },
      });

      await expect(processPublishJob(mockJob)).rejects.toThrow('eBay Offer API error');
    });

    it('should use placeholder when eBay not configured', async () => {
      mockIsEbayConfigured.mockResolvedValue(false);

      const result = await processPublishJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toContain('ebay-placeholder');
    });
  });

  describe('Joom publish', () => {
    const joomJob = {
      ...mockJob,
      data: { ...mockJob.data, marketplace: 'joom' },
    };

    beforeEach(() => {
      mockPrismaLocal.listing.findUnique.mockResolvedValue({
        ...mockListing,
        marketplace: 'JOOM',
      });
      mockIsJoomConfigured.mockResolvedValue(true);
      mockJoomApi.createProduct.mockResolvedValue({
        success: true,
        data: { id: 'joom-product-123' },
      });
      mockJoomApi.enableProduct.mockResolvedValue({ success: true });
    });

    it('should publish to Joom successfully', async () => {
      const result = await processPublishJob(joomJob);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toBe('joom-product-123');
      expect(result.listingUrl).toContain('joom.com');
    });

    it('should enable product after creation', async () => {
      await processPublishJob(joomJob);

      expect(mockJoomApi.enableProduct).toHaveBeenCalledWith('joom-product-123');
    });

    it('should handle Joom API error', async () => {
      mockJoomApi.createProduct.mockResolvedValue({
        success: false,
        error: { message: 'Joom API failed' },
      });

      await expect(processPublishJob(joomJob)).rejects.toThrow('Joom API error');
    });

    it('should use placeholder when Joom not configured', async () => {
      mockIsJoomConfigured.mockResolvedValue(false);

      const result = await processPublishJob(joomJob);

      expect(result.success).toBe(true);
      expect(result.marketplaceListingId).toContain('joom-placeholder');
    });
  });
});

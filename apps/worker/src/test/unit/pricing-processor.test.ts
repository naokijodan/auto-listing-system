import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockListingFindMany,
  mockListingFindUnique,
  mockPricingRuleFindMany,
  mockCompetitorPriceLogFindFirst,
  mockPriceRecommendationFindUnique,
  mockEvaluate,
  mockCreateRecommendation,
  mockApply,
  mockProcessExpired,
  mockProcessApproved,
  mockPublishPriceChange,
  mockProcessPriceSyncJob,
} = vi.hoisted(() => ({
  mockListingFindMany: vi.fn(),
  mockListingFindUnique: vi.fn(),
  mockPricingRuleFindMany: vi.fn(),
  mockCompetitorPriceLogFindFirst: vi.fn(),
  mockPriceRecommendationFindUnique: vi.fn(),
  mockEvaluate: vi.fn(),
  mockCreateRecommendation: vi.fn(),
  mockApply: vi.fn(),
  mockProcessExpired: vi.fn(),
  mockProcessApproved: vi.fn(),
  mockPublishPriceChange: vi.fn(),
  mockProcessPriceSyncJob: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    listing: {
      findMany: mockListingFindMany,
      findUnique: mockListingFindUnique,
    },
    pricingRule: {
      findMany: mockPricingRuleFindMany,
    },
    competitorPriceLog: {
      findFirst: mockCompetitorPriceLogFindFirst,
    },
    priceRecommendation: {
      findUnique: mockPriceRecommendationFindUnique,
    },
  },
}));

vi.mock('../../lib/pricing/rule-engine', () => ({
  pricingRuleEngine: {
    evaluate: mockEvaluate,
  },
}));

vi.mock('../../lib/pricing/approval-workflow', () => ({
  approvalWorkflow: {
    createRecommendation: mockCreateRecommendation,
    apply: mockApply,
    processExpired: mockProcessExpired,
    processApproved: mockProcessApproved,
  },
}));

vi.mock('../../lib/event-bus', () => ({
  eventBus: {
    initialized: true,
    publishPriceChange: mockPublishPriceChange,
  },
}));

vi.mock('../../processors/price-sync', () => ({
  processPriceSyncJob: mockProcessPriceSyncJob,
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Import after mocks
import { pricingProcessor } from '../../processors/pricing';

describe('Pricing Processor', () => {
  const createMockJob = (data: any) => ({
    id: 'test-job-id',
    data,
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pricingProcessor', () => {
    it('should throw error for unknown job type', async () => {
      const job = createMockJob({ type: 'unknown-type' });

      await expect(pricingProcessor(job)).rejects.toThrow('Unknown job type: unknown-type');
    });
  });

  describe('evaluate job', () => {
    it('should return success when no active rules', async () => {
      mockListingFindMany.mockResolvedValueOnce([{ id: 'listing-1' }]);
      mockPricingRuleFindMany.mockResolvedValueOnce([]);

      const job = createMockJob({ type: 'evaluate' });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.recommendations).toBe(0);
    });

    it('should evaluate specific listing IDs', async () => {
      // Mock rule fetch
      mockPricingRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'margin',
          conditions: [],
          actions: [],
          priority: 1,
          marketplace: null,
          category: null,
          safetyConfig: null,
        },
      ]);

      // Mock listing fetch
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        listingPrice: 100,
        productId: 'product-1',
        marketplace: 'JOOM',
        createdAt: new Date(),
        product: { price: 50 },
      });

      // Mock competitor price
      mockCompetitorPriceLogFindFirst.mockResolvedValueOnce({
        price: 90,
        recordedAt: new Date(),
      });

      // Mock rule engine - no match
      mockEvaluate.mockResolvedValueOnce({
        matched: false,
        recommendedPrice: null,
      });

      const job = createMockJob({
        type: 'evaluate',
        listingIds: ['listing-1'],
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.recommendations).toBe(0);
    });

    it('should create recommendation when rule matches', async () => {
      mockPricingRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Margin Rule',
          type: 'margin',
          conditions: [],
          actions: [],
          priority: 1,
          marketplace: null,
          category: null,
          safetyConfig: null,
        },
      ]);

      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        listingPrice: 100,
        productId: 'product-1',
        marketplace: 'JOOM',
        createdAt: new Date(),
        product: { price: 50 },
      });

      mockCompetitorPriceLogFindFirst.mockResolvedValueOnce(null);

      mockEvaluate.mockResolvedValueOnce({
        matched: true,
        recommendedPrice: 110,
        confidence: 0.9,
        reason: 'Margin optimization',
        ruleId: 'rule-1',
      });

      mockCreateRecommendation.mockResolvedValueOnce({
        id: 'recommendation-1',
        autoApproved: false,
      });

      const job = createMockJob({
        type: 'evaluate',
        listingId: 'listing-1',
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.recommendations).toBe(1);
      expect(mockCreateRecommendation).toHaveBeenCalledWith({
        listingId: 'listing-1',
        productId: 'product-1',
        currentPrice: 100,
        recommendedPrice: 110,
        confidence: 0.9,
        reason: 'Margin optimization',
        ruleId: 'rule-1',
      });
    });

    it('should handle evaluation errors gracefully', async () => {
      mockPricingRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'margin',
          conditions: [],
          actions: [],
          priority: 1,
          marketplace: null,
          category: null,
          safetyConfig: null,
        },
      ]);

      mockListingFindUnique
        .mockResolvedValueOnce({
          id: 'listing-1',
          listingPrice: 100,
          productId: 'product-1',
          marketplace: 'JOOM',
          createdAt: new Date(),
          product: { price: 50 },
        })
        .mockResolvedValueOnce(null); // listing-2 not found

      mockCompetitorPriceLogFindFirst.mockResolvedValue(null);

      mockEvaluate.mockRejectedValueOnce(new Error('Rule evaluation failed'));

      const job = createMockJob({
        type: 'evaluate',
        listingIds: ['listing-1', 'listing-2'],
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      // listing-1 had an error (counted in errors), listing-2 was not found (skipped)
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0]).toContain('listing-1');
    });

    it('should filter rules by ruleIds if provided', async () => {
      mockPricingRuleFindMany.mockResolvedValueOnce([]);

      const job = createMockJob({
        type: 'evaluate',
        listingIds: ['listing-1'],
        ruleIds: ['rule-1', 'rule-2'],
      });

      const result = await pricingProcessor(job);

      expect(mockPricingRuleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            id: { in: ['rule-1', 'rule-2'] },
          }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('apply job', () => {
    it('should throw error when recommendationId is missing', async () => {
      const job = createMockJob({ type: 'apply' });

      await expect(pricingProcessor(job)).rejects.toThrow('recommendationId is required');
    });

    it('should apply recommendation successfully', async () => {
      mockApply.mockResolvedValueOnce({
        success: true,
        newPrice: 110,
      });

      mockPriceRecommendationFindUnique.mockResolvedValueOnce({
        id: 'recommendation-1',
        listingId: 'listing-1',
        currentPrice: 100,
      });

      const job = createMockJob({
        type: 'apply',
        recommendationId: 'recommendation-1',
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockPublishPriceChange).toHaveBeenCalledWith('listing-1', {
        recommendationId: 'recommendation-1',
        oldPrice: 100,
        newPrice: 110,
        status: 'applied',
      });
    });

    it('should return failure when apply fails', async () => {
      mockApply.mockResolvedValueOnce({
        success: false,
        message: 'Recommendation expired',
      });

      const job = createMockJob({
        type: 'apply',
        recommendationId: 'recommendation-1',
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(false);
      expect(result.applied).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual(['Recommendation expired']);
      expect(mockPublishPriceChange).not.toHaveBeenCalled();
    });
  });

  describe('process_expired job', () => {
    it('should process expired recommendations', async () => {
      mockProcessExpired.mockResolvedValueOnce({
        expired: 5,
      });

      const job = createMockJob({ type: 'process_expired' });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(5);
      expect(mockProcessExpired).toHaveBeenCalled();
    });
  });

  describe('process_approved job', () => {
    it('should process approved recommendations', async () => {
      mockProcessApproved.mockResolvedValueOnce({
        applied: 3,
        failed: 1,
      });

      const job = createMockJob({ type: 'process_approved' });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(3);
      expect(result.failed).toBe(1);
      expect(mockProcessApproved).toHaveBeenCalled();
    });
  });

  describe('price-sync job', () => {
    it('should delegate to processPriceSyncJob', async () => {
      mockProcessPriceSyncJob.mockResolvedValueOnce({
        success: true,
        summary: {
          totalProcessed: 100,
          totalUpdated: 25,
          totalErrors: 2,
        },
      });

      const job = createMockJob({
        type: 'price-sync',
        marketplace: 'joom',
        forceUpdate: false,
        maxListings: 500,
        priceChangeThreshold: 0.05,
      });

      const result = await pricingProcessor(job);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(100);
      expect(result.applied).toBe(25);
      expect(result.failed).toBe(2);
      expect(mockProcessPriceSyncJob).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            marketplace: 'joom',
            forceUpdate: false,
            maxListings: 500,
            priceChangeThreshold: 0.05,
          },
        })
      );
    });
  });
});

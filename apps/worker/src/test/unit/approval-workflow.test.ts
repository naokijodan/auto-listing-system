import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockRecommendationCreate,
  mockRecommendationFindUnique,
  mockRecommendationUpdate,
  mockRecommendationUpdateMany,
  mockRecommendationFindMany,
  mockRecommendationGroupBy,
  mockListingFindUnique,
  mockListingUpdate,
  mockCircuitBreakerCanApply,
  mockCircuitBreakerRecordChange,
  mockHistoryRecordPrice,
  mockHistoryLogPriceChange,
  mockPublishPriceChange,
} = vi.hoisted(() => {
  return {
    mockRecommendationCreate: vi.fn(),
    mockRecommendationFindUnique: vi.fn(),
    mockRecommendationUpdate: vi.fn(),
    mockRecommendationUpdateMany: vi.fn(),
    mockRecommendationFindMany: vi.fn(),
    mockRecommendationGroupBy: vi.fn(),
    mockListingFindUnique: vi.fn(),
    mockListingUpdate: vi.fn(),
    mockCircuitBreakerCanApply: vi.fn(),
    mockCircuitBreakerRecordChange: vi.fn(),
    mockHistoryRecordPrice: vi.fn(),
    mockHistoryLogPriceChange: vi.fn(),
    mockPublishPriceChange: vi.fn(),
  };
});

vi.mock('@rakuda/database', () => ({
  prisma: {
    priceRecommendation: {
      create: mockRecommendationCreate,
      findUnique: mockRecommendationFindUnique,
      update: mockRecommendationUpdate,
      updateMany: mockRecommendationUpdateMany,
      findMany: mockRecommendationFindMany,
      groupBy: mockRecommendationGroupBy,
    },
    listing: {
      findUnique: mockListingFindUnique,
      update: mockListingUpdate,
    },
  },
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

vi.mock('../../lib/pricing/circuit-breaker', () => ({
  pricingCircuitBreaker: {
    canApply: mockCircuitBreakerCanApply,
    recordChange: mockCircuitBreakerRecordChange,
  },
}));

vi.mock('../../lib/pricing/price-history', () => ({
  priceHistoryService: {
    recordPrice: mockHistoryRecordPrice,
    logPriceChange: mockHistoryLogPriceChange,
  },
}));

vi.mock('../../lib/event-bus', () => ({
  eventBus: {
    initialized: true,
    publishPriceChange: mockPublishPriceChange,
  },
}));

import { approvalWorkflow, CreateRecommendationInput } from '../../lib/pricing/approval-workflow';

describe('ApprovalWorkflow', () => {
  const baseRecommendation = {
    id: 'rec-1',
    listingId: 'listing-1',
    productId: 'product-1',
    currentPrice: 100,
    recommendedPrice: 95,
    confidence: 0.85,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    approvedAt: null,
    appliedAt: null,
    ruleId: 'rule-1',
    reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
    impact: null,
  };

  const baseListing = {
    id: 'listing-1',
    listingPrice: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecommendationCreate.mockResolvedValue(baseRecommendation);
    mockRecommendationFindUnique.mockResolvedValue(baseRecommendation);
    mockRecommendationUpdate.mockResolvedValue(baseRecommendation);
    mockRecommendationUpdateMany.mockResolvedValue({ count: 0 });
    mockListingFindUnique.mockResolvedValue(baseListing);
    mockListingUpdate.mockResolvedValue({});
    mockCircuitBreakerCanApply.mockResolvedValue({ allowed: true });
    mockCircuitBreakerRecordChange.mockResolvedValue(undefined);
    mockHistoryRecordPrice.mockResolvedValue(undefined);
    mockHistoryLogPriceChange.mockResolvedValue(undefined);
    mockPublishPriceChange.mockResolvedValue(undefined);
  });

  describe('createRecommendation', () => {
    it('should create a pending recommendation', async () => {
      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 100,
        recommendedPrice: 85, // 15% drop - exceeds auto approve threshold
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      const result = await approvalWorkflow.createRecommendation(input);

      expect(result.status).toBe('PENDING');
      expect(result.autoApproved).toBe(false);
      expect(mockRecommendationCreate).toHaveBeenCalled();
    });

    it('should auto-approve when change is below threshold', async () => {
      mockRecommendationCreate.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });

      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 100,
        recommendedPrice: 48, // 3% drop - within auto approve, price below requireApprovalAbove
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      const result = await approvalWorkflow.createRecommendation(input);

      // Since price is below requireApprovalAbove and change is small, should auto-approve
      expect(mockRecommendationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
      });
    });

    it('should not auto-approve when price exceeds threshold', async () => {
      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 100,
        recommendedPrice: 97, // Small change but price is high
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      const result = await approvalWorkflow.createRecommendation(input);

      expect(mockRecommendationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      });
    });

    it('should not auto-approve when confidence is low', async () => {
      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 100,
        recommendedPrice: 48, // Within threshold
        confidence: 0.5, // Low confidence
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      await approvalWorkflow.createRecommendation(input);

      expect(mockRecommendationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      });
    });

    it('should publish event on auto-approve', async () => {
      mockRecommendationCreate.mockResolvedValue({ ...baseRecommendation, id: 'rec-auto', status: 'APPROVED' });

      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 100,
        recommendedPrice: 48, // 4% drop, below threshold, and price below 50
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      await approvalWorkflow.createRecommendation(input);

      expect(mockPublishPriceChange).toHaveBeenCalledWith('listing-1', expect.objectContaining({
        status: 'auto_approved',
      }));
    });

    it('should include optional fields', async () => {
      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        productId: 'product-1',
        currentPrice: 100,
        recommendedPrice: 85,
        minPrice: 70,
        maxPrice: 120,
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
        impact: { revenueImpact: 10, revenueImpactPercent: 5, profitImpact: 5, profitImpactPercent: 3, marginChange: 2, expectedSalesChange: 8, competitorPosition: 'mid', riskLevel: 'low' },
        ruleId: 'rule-1',
      };

      await approvalWorkflow.createRecommendation(input);

      expect(mockRecommendationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'product-1',
          minPrice: 70,
          maxPrice: 120,
          ruleId: 'rule-1',
        }),
      });
    });
  });

  describe('approve', () => {
    it('should approve a pending recommendation', async () => {
      const result = await approvalWorkflow.approve('rec-1', 'user@example.com');

      expect(result.success).toBe(true);
      expect(mockRecommendationUpdate).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedBy: 'user@example.com',
        }),
      });
    });

    it('should return error when recommendation not found', async () => {
      mockRecommendationFindUnique.mockResolvedValue(null);

      const result = await approvalWorkflow.approve('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Recommendation not found');
    });

    it('should return error when status is not PENDING or APPROVED', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'REJECTED' });

      const result = await approvalWorkflow.approve('rec-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot approve');
    });

    it('should mark as expired when past expiration', async () => {
      mockRecommendationFindUnique.mockResolvedValue({
        ...baseRecommendation,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const result = await approvalWorkflow.approve('rec-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Recommendation has expired');
      expect(mockRecommendationUpdate).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('reject', () => {
    it('should reject a pending recommendation', async () => {
      const result = await approvalWorkflow.reject('rec-1', 'Too risky', 'user@example.com');

      expect(result.success).toBe(true);
      expect(mockRecommendationUpdate).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: {
          status: 'REJECTED',
          rejectedReason: 'Too risky',
        },
      });
    });

    it('should return error when recommendation not found', async () => {
      mockRecommendationFindUnique.mockResolvedValue(null);

      const result = await approvalWorkflow.reject('nonexistent', 'reason');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Recommendation not found');
    });

    it('should return error when status is not PENDING', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });

      const result = await approvalWorkflow.reject('rec-1', 'reason');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot reject');
    });
  });

  describe('apply', () => {
    it('should apply an approved recommendation', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });

      const result = await approvalWorkflow.apply('rec-1');

      expect(result.success).toBe(true);
      expect(result.newPrice).toBe(95);
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { listingPrice: 95 },
      });
      expect(mockHistoryRecordPrice).toHaveBeenCalled();
      expect(mockHistoryLogPriceChange).toHaveBeenCalled();
      expect(mockCircuitBreakerRecordChange).toHaveBeenCalled();
    });

    it('should return error when recommendation not found', async () => {
      mockRecommendationFindUnique.mockResolvedValue(null);

      const result = await approvalWorkflow.apply('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Recommendation not found');
    });

    it('should return error when status is not APPROVED', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'PENDING' });

      const result = await approvalWorkflow.apply('rec-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot apply');
    });

    it('should return error when listing not found', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });
      mockListingFindUnique.mockResolvedValue(null);

      const result = await approvalWorkflow.apply('rec-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Listing not found');
    });

    it('should block when circuit breaker rejects', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });
      mockCircuitBreakerCanApply.mockResolvedValue({ allowed: false, reason: 'Too many changes today' });

      const result = await approvalWorkflow.apply('rec-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Too many changes today');
    });

    it('should publish price change event', async () => {
      mockRecommendationFindUnique.mockResolvedValue({ ...baseRecommendation, status: 'APPROVED' });

      await approvalWorkflow.apply('rec-1');

      expect(mockPublishPriceChange).toHaveBeenCalledWith('listing-1', expect.objectContaining({
        oldPrice: 100,
        newPrice: 95,
        status: 'applied',
      }));
    });
  });

  describe('processExpired', () => {
    it('should mark expired recommendations', async () => {
      mockRecommendationUpdateMany.mockResolvedValue({ count: 5 });

      const result = await approvalWorkflow.processExpired();

      expect(result.expired).toBe(5);
      expect(mockRecommendationUpdateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'EXPIRED',
        },
      });
    });
  });

  describe('processApproved', () => {
    it('should apply approved recommendations', async () => {
      mockRecommendationFindMany.mockResolvedValue([
        { ...baseRecommendation, id: 'rec-1', status: 'APPROVED' },
        { ...baseRecommendation, id: 'rec-2', status: 'APPROVED' },
      ]);
      mockRecommendationFindUnique
        .mockResolvedValueOnce({ ...baseRecommendation, id: 'rec-1', status: 'APPROVED' })
        .mockResolvedValueOnce({ ...baseRecommendation, id: 'rec-2', status: 'APPROVED' });

      const result = await approvalWorkflow.processApproved();

      expect(result.applied).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should count failures', async () => {
      mockRecommendationFindMany.mockResolvedValue([
        { ...baseRecommendation, id: 'rec-1', status: 'APPROVED' },
      ]);
      mockRecommendationFindUnique.mockResolvedValue(null); // Will fail

      const result = await approvalWorkflow.processApproved();

      expect(result.applied).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple recommendations', async () => {
      const result = await approvalWorkflow.bulkApprove(['rec-1', 'rec-2'], 'admin');

      expect(result.approved).toBe(2);
      expect(mockRecommendationUpdate).toHaveBeenCalledTimes(2);
    });

    it('should count failures', async () => {
      mockRecommendationFindUnique
        .mockResolvedValueOnce(baseRecommendation)
        .mockResolvedValueOnce(null);

      const result = await approvalWorkflow.bulkApprove(['rec-1', 'rec-2']);

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getPendingRecommendations', () => {
    it('should return pending recommendations', async () => {
      mockRecommendationFindMany.mockResolvedValue([baseRecommendation]);

      const result = await approvalWorkflow.getPendingRecommendations();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec-1');
      expect(result[0].changePercent).toBe(-5);
    });

    it('should filter by listingId', async () => {
      mockRecommendationFindMany.mockResolvedValue([]);

      await approvalWorkflow.getPendingRecommendations({ listingId: 'listing-1' });

      expect(mockRecommendationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingId: 'listing-1',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockRecommendationFindMany.mockResolvedValue([]);

      await approvalWorkflow.getPendingRecommendations({ limit: 10, offset: 5 });

      expect(mockRecommendationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockRecommendationGroupBy.mockResolvedValue([
        { status: 'PENDING', _count: 10 },
        { status: 'APPROVED', _count: 20 },
        { status: 'APPLIED', _count: 15 },
        { status: 'REJECTED', _count: 5 },
        { status: 'EXPIRED', _count: 3 },
      ]);
      mockRecommendationFindMany.mockResolvedValue([
        { currentPrice: 100, recommendedPrice: 90, approvedAt: null, createdAt: new Date() },
        { currentPrice: 100, recommendedPrice: 110, approvedAt: new Date(Date.now() - 500), createdAt: new Date(Date.now() - 1000) }, // auto-approved (within 1 second)
      ]);

      const result = await approvalWorkflow.getStats(7);

      expect(result.total).toBe(2);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(20);
      expect(result.applied).toBe(15);
      expect(result.rejected).toBe(5);
      expect(result.expired).toBe(3);
      expect(result.avgChangePercent).toBe(10);
      expect(result.autoApproveRate).toBe(50);
    });

    it('should handle empty results', async () => {
      mockRecommendationGroupBy.mockResolvedValue([]);
      mockRecommendationFindMany.mockResolvedValue([]);

      const result = await approvalWorkflow.getStats();

      expect(result.total).toBe(0);
      expect(result.avgChangePercent).toBe(0);
      expect(result.autoApproveRate).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      // Store original threshold
      approvalWorkflow.updateConfig({ autoApproveThreshold: 10, requireApprovalAbove: 100 });

      // Create a recommendation to verify new threshold is applied
      const input: CreateRecommendationInput = {
        listingId: 'listing-1',
        currentPrice: 50,
        recommendedPrice: 46, // 8% drop - within threshold of 10%, price below 100
        confidence: 0.85,
        reason: { ruleId: 'rule-1', ruleName: 'Test', ruleType: 'COMPETITOR_BASED', factors: [], explanation: '' },
      };

      await approvalWorkflow.createRecommendation(input);

      // With new threshold of 10%, 8% change should auto-approve
      expect(mockRecommendationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
      });

      // Reset config for other tests
      approvalWorkflow.updateConfig({ autoApproveThreshold: 5, requireApprovalAbove: 50 });
    });
  });
});

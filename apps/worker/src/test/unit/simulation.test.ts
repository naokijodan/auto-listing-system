import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockListingFindUnique,
  mockListingFindMany,
  mockPricingRuleFindMany,
  mockCompetitorPriceLogFindFirst,
  mockPriceHistoryFindMany,
  mockRuleEngineEvaluate,
  mockCircuitBreakerCanApply,
  mockCircuitBreakerGetStatus,
} = vi.hoisted(() => {
  return {
    mockListingFindUnique: vi.fn(),
    mockListingFindMany: vi.fn(),
    mockPricingRuleFindMany: vi.fn(),
    mockCompetitorPriceLogFindFirst: vi.fn(),
    mockPriceHistoryFindMany: vi.fn(),
    mockRuleEngineEvaluate: vi.fn(),
    mockCircuitBreakerCanApply: vi.fn(),
    mockCircuitBreakerGetStatus: vi.fn(),
  };
});

vi.mock('@rakuda/database', () => ({
  prisma: {
    listing: {
      findUnique: mockListingFindUnique,
      findMany: mockListingFindMany,
    },
    pricingRule: {
      findMany: mockPricingRuleFindMany,
    },
    competitorPriceLog: {
      findFirst: mockCompetitorPriceLogFindFirst,
    },
    priceHistory: {
      findMany: mockPriceHistoryFindMany,
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

vi.mock('../../lib/pricing/rule-engine', () => ({
  pricingRuleEngine: {
    evaluate: mockRuleEngineEvaluate,
  },
}));

vi.mock('../../lib/pricing/circuit-breaker', () => ({
  pricingCircuitBreaker: {
    canApply: mockCircuitBreakerCanApply,
    getStatus: mockCircuitBreakerGetStatus,
  },
}));

import { pricingSimulation } from '../../lib/pricing/simulation';

describe('PricingSimulation', () => {
  const mockListing = {
    id: 'listing-1',
    productId: 'product-1',
    listingPrice: 100,
    marketplace: 'joom',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    product: {
      id: 'product-1',
      price: 50, // cost price
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListingFindUnique.mockResolvedValue(mockListing);
    mockListingFindMany.mockResolvedValue([mockListing]);
    mockCompetitorPriceLogFindFirst.mockResolvedValue(null);
    mockPriceHistoryFindMany.mockResolvedValue([]);
    mockCircuitBreakerCanApply.mockResolvedValue({ allowed: true });
    mockCircuitBreakerGetStatus.mockResolvedValue({ isBlocked: false });
    mockRuleEngineEvaluate.mockResolvedValue(null);
  });

  describe('simulateSingle', () => {
    it('should simulate price for a single listing', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.listingId).toBe('listing-1');
      expect(result.currentPrice).toBe(100);
      expect(result.simulatedPrice).toBe(90);
      expect(result.priceChange).toBe(-10);
      expect(result.changePercent).toBe(-10);
      expect(result.appliedRule).toEqual({ ruleId: 'rule-1', ruleName: 'Test Rule' });
    });

    it('should throw error when listing not found', async () => {
      mockListingFindUnique.mockResolvedValue(null);

      await expect(
        pricingSimulation.simulateSingle({ listingId: 'nonexistent' })
      ).rejects.toThrow('Listing not found: nonexistent');
    });

    it('should use competitor price from input if provided', async () => {
      mockRuleEngineEvaluate.mockResolvedValue(null);

      await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
        competitorPrice: 95,
      });

      expect(mockRuleEngineEvaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorPrice: 95,
        }),
        undefined
      );
    });

    it('should fetch competitor price from DB if not provided', async () => {
      mockCompetitorPriceLogFindFirst.mockResolvedValue({ price: 85 });
      mockRuleEngineEvaluate.mockResolvedValue(null);

      await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(mockCompetitorPriceLogFindFirst).toHaveBeenCalledWith({
        where: { listingId: 'listing-1' },
        orderBy: { recordedAt: 'desc' },
      });
      expect(mockRuleEngineEvaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorPrice: 85,
        }),
        undefined
      );
    });

    it('should use specific rules if provided', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Custom Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
          marketplace: null,
          category: null,
          safetyConfig: null,
          isActive: true,
        },
      ]);

      await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
        rules: ['rule-1'],
      });

      expect(mockPricingRuleFindMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['rule-1'] },
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
    });

    it('should return current price when no rule matches', async () => {
      mockRuleEngineEvaluate.mockResolvedValue(null);

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.simulatedPrice).toBe(100);
      expect(result.priceChange).toBe(0);
      expect(result.appliedRule).toBeUndefined();
    });

    it('should check circuit breaker', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });
      mockCircuitBreakerCanApply.mockResolvedValue({
        allowed: false,
        reason: 'Circuit breaker triggered',
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.blocked).toBe(true);
      expect(result.blockReason).toBe('Circuit breaker triggered');
    });

    it('should perform safety checks for price drops', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.withinDropLimit).toBe(true);
      expect(result.safetyChecks.aboveFloor).toBe(true);
    });

    it('should detect excessive price drops', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 70, // 30% drop
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.withinDropLimit).toBe(false);
    });

    it('should detect excessive price rises', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 150, // 50% rise
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.withinRiseLimit).toBe(false);
    });

    it('should detect price below floor', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 0.5,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.aboveFloor).toBe(false);
    });

    it('should check daily limit status', async () => {
      mockCircuitBreakerGetStatus.mockResolvedValue({
        isBlocked: true,
        blockReason: 'Daily limit exceeded',
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.dailyLimitOk).toBe(false);
    });

    it('should check cooldown status', async () => {
      mockCircuitBreakerGetStatus.mockResolvedValue({
        isBlocked: true,
        blockReason: 'Cooldown period active',
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.safetyChecks.cooldownOk).toBe(false);
    });

    it('should estimate impact', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.estimatedImpact).toBeDefined();
      expect(result.estimatedImpact?.marginChange).toBe(-10);
    });

    it('should handle zero current price', async () => {
      mockListingFindUnique.mockResolvedValue({
        ...mockListing,
        listingPrice: 0,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.changePercent).toBe(0);
    });

    it('should handle listing without product', async () => {
      mockListingFindUnique.mockResolvedValue({
        ...mockListing,
        product: null,
        productId: null,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result).toBeDefined();
    });
  });

  describe('simulateBatch', () => {
    it('should simulate multiple listings', async () => {
      mockListingFindUnique
        .mockResolvedValueOnce(mockListing)
        .mockResolvedValueOnce({ ...mockListing, id: 'listing-2' });
      mockRuleEngineEvaluate
        .mockResolvedValueOnce({
          matched: true,
          ruleId: 'rule-1',
          ruleName: 'Test Rule',
          recommendedPrice: 90,
          confidence: 0.8,
        })
        .mockResolvedValueOnce(null);

      const result = await pricingSimulation.simulateBatch(['listing-1', 'listing-2']);

      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.changed).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      mockListingFindUnique
        .mockResolvedValueOnce(mockListing)
        .mockResolvedValueOnce(null); // Will throw error

      const result = await pricingSimulation.simulateBatch(['listing-1', 'listing-2']);

      expect(result.results).toHaveLength(1);
      expect(result.summary.total).toBe(1);
    });

    it('should calculate summary statistics', async () => {
      mockListingFindUnique.mockResolvedValue(mockListing);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });
      mockCircuitBreakerCanApply.mockResolvedValue({ allowed: false, reason: 'blocked' });

      const result = await pricingSimulation.simulateBatch(['listing-1']);

      expect(result.summary.blocked).toBe(1);
    });

    it('should calculate average change percent', async () => {
      mockListingFindUnique.mockResolvedValue(mockListing);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90, // -10%
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateBatch(['listing-1']);

      expect(result.summary.avgChangePercent).toBe(-10);
    });

    it('should handle empty listing list', async () => {
      const result = await pricingSimulation.simulateBatch([]);

      expect(result.results).toHaveLength(0);
      expect(result.summary.avgChangePercent).toBe(0);
    });

    it('should pass rules to simulateSingle', async () => {
      mockListingFindUnique.mockResolvedValue(mockListing);
      mockPricingRuleFindMany.mockResolvedValue([]);

      await pricingSimulation.simulateBatch(['listing-1'], ['rule-1']);

      expect(mockPricingRuleFindMany).toHaveBeenCalled();
    });
  });

  describe('backtest', () => {
    it('should perform backtest with provided rules', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
          marketplace: null,
          category: null,
          safetyConfig: null,
          isActive: true,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.rulesEvaluated).toBe(1);
      expect(result.listingsAnalyzed).toBe(1);
    });

    it('should throw error when no rules found', async () => {
      mockPricingRuleFindMany.mockResolvedValue([]);

      await expect(
        pricingSimulation.backtest({
          ruleIds: ['nonexistent'],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        })
      ).rejects.toThrow('No rules found');
    });

    it('should filter listings by listingIds', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue(null);

      await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        listingIds: ['listing-1', 'listing-2'],
      });

      expect(mockListingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['listing-1', 'listing-2'] } },
        })
      );
    });

    it('should use sample size', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);

      await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        sampleSize: 50,
      });

      expect(mockListingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should calculate summary statistics', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        recommendedPrice: 110, // +10
        confidence: 0.8,
      });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.summary.profitableChanges).toBe(1);
      expect(result.summary.unprofitableChanges).toBe(0);
      expect(result.summary.avgPriceChange).toBe(10);
    });

    it('should count blocked by circuit breaker', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        recommendedPrice: 50, // 50% drop
        confidence: 0.8,
      });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.summary.blockedByCircuitBreaker).toBe(1);
    });

    it('should calculate rule statistics', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        recommendedPrice: 110,
        confidence: 0.75,
      });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.byRule[0].timesTriggered).toBe(1);
      expect(result.byRule[0].avgPriceChange).toBe(10);
      expect(result.byRule[0].avgConfidence).toBe(0.75);
    });

    it('should calculate risk analysis', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockListingFindMany.mockResolvedValue([
        mockListing,
        { ...mockListing, id: 'listing-2', listingPrice: 100 },
        { ...mockListing, id: 'listing-3', listingPrice: 100 },
      ]);
      mockRuleEngineEvaluate
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 110, confidence: 0.8 })
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 90, confidence: 0.8 })
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 105, confidence: 0.8 });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.riskAnalysis).toBeDefined();
      expect(result.riskAnalysis.maxDrawdown).toBeDefined();
      expect(result.riskAnalysis.volatility).toBeDefined();
      expect(result.riskAnalysis.sharpeRatio).toBeDefined();
    });

    it('should handle no price changes', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue(null);

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.priceChangesSimulated).toBe(0);
      expect(result.riskAnalysis.maxDrawdown).toBe(0);
      expect(result.riskAnalysis.volatility).toBe(0);
    });

    it('should handle rule that does not match', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: false,
        ruleId: 'rule-1',
        recommendedPrice: null,
        confidence: 0,
      });

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.byRule[0].timesTriggered).toBe(0);
    });
  });

  describe('impact estimation', () => {
    it('should calculate sales velocity change', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90, // 10% drop
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      // Price drop -> sales velocity increase (negative elasticity)
      // The implementation uses: -priceChangePercent * elasticity / 100
      expect(result.estimatedImpact?.salesVelocityChange).toBe(-0.15);
    });

    it('should calculate margin change', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      // Current margin: 100 - 50 = 50, New margin: 90 - 50 = 40
      expect(result.estimatedImpact?.marginChange).toBe(-10);
    });

    it('should calculate revenue change', async () => {
      mockRuleEngineEvaluate.mockResolvedValue({
        matched: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        recommendedPrice: 90,
        confidence: 0.8,
      });

      const result = await pricingSimulation.simulateSingle({
        listingId: 'listing-1',
      });

      expect(result.estimatedImpact?.revenueChange).toBeDefined();
    });
  });

  describe('risk metrics calculation', () => {
    it('should calculate max drawdown correctly', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
        },
      ]);
      mockListingFindMany.mockResolvedValue([
        { ...mockListing, id: 'listing-1' },
        { ...mockListing, id: 'listing-2' },
        { ...mockListing, id: 'listing-3' },
      ]);
      mockRuleEngineEvaluate
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 120, confidence: 0.8 }) // +20
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 80, confidence: 0.8 }) // -20
        .mockResolvedValueOnce({ matched: true, ruleId: 'rule-1', recommendedPrice: 110, confidence: 0.8 }); // +10

      const result = await pricingSimulation.backtest({
        ruleIds: ['rule-1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      // Peak at 20, drops to 0, then 10. Max drawdown = 20
      expect(result.riskAnalysis.maxDrawdown).toBe(20);
    });
  });
});

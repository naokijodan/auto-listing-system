import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockPricingRuleFindMany } = vi.hoisted(() => {
  const mockPricingRuleFindMany = vi.fn();
  return { mockPricingRuleFindMany };
});

vi.mock('@rakuda/database', () => ({
  prisma: {
    pricingRule: {
      findMany: mockPricingRuleFindMany,
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

import { pricingRuleEngine, PricingContext, PricingRule } from '../../lib/pricing/rule-engine';

describe('PricingRuleEngine', () => {
  const baseContext: PricingContext = {
    listingId: 'listing-1',
    currentPrice: 100,
    costPrice: 50,
    daysListed: 7,
    salesVelocity: 0.5,
    marketplace: 'joom',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPricingRuleFindMany.mockResolvedValue([]);
  });

  describe('evaluate', () => {
    it('should return null when no rules are provided and DB returns empty', async () => {
      mockPricingRuleFindMany.mockResolvedValue([]);

      const result = await pricingRuleEngine.evaluate(baseContext);

      expect(result).toBeNull();
    });

    it('should return null when provided rules array is empty', async () => {
      const result = await pricingRuleEngine.evaluate(baseContext, []);

      expect(result).toBeNull();
    });

    it('should return null when no rules match', async () => {
      const rules: PricingRule[] = [
        {
          id: 'rule-1',
          name: 'Non-matching Rule',
          type: 'COMPETITOR_BASED',
          conditions: [{ field: 'currentPrice', operator: 'gt', value: 1000 }],
          actions: [{ type: 'SET_PRICE', value: 50 }],
          priority: 1,
        },
      ];

      const result = await pricingRuleEngine.evaluate(baseContext, rules);

      expect(result).toBeNull();
    });

    it('should return result when a rule matches', async () => {
      const rules: PricingRule[] = [
        {
          id: 'rule-1',
          name: 'Matching Rule',
          type: 'COMPETITOR_BASED',
          conditions: [{ field: 'currentPrice', operator: 'lt', value: 200 }],
          actions: [{ type: 'SET_PRICE', value: 80 }],
          priority: 1,
        },
      ];

      const result = await pricingRuleEngine.evaluate(baseContext, rules);

      expect(result).not.toBeNull();
      expect(result?.matched).toBe(true);
      expect(result?.ruleId).toBe('rule-1');
      expect(result?.recommendedPrice).toBe(80);
    });

    it('should evaluate rules by priority (highest first)', async () => {
      const rules: PricingRule[] = [
        {
          id: 'rule-low',
          name: 'Low Priority',
          type: 'COMPETITOR_BASED',
          conditions: [{ field: 'currentPrice', operator: 'lt', value: 200 }],
          actions: [{ type: 'SET_PRICE', value: 60 }],
          priority: 1,
        },
        {
          id: 'rule-high',
          name: 'High Priority',
          type: 'COMPETITOR_BASED',
          conditions: [{ field: 'currentPrice', operator: 'lt', value: 200 }],
          actions: [{ type: 'SET_PRICE', value: 90 }],
          priority: 10,
        },
      ];

      const result = await pricingRuleEngine.evaluate(baseContext, rules);

      expect(result?.ruleId).toBe('rule-high');
      expect(result?.recommendedPrice).toBe(90);
    });

    it('should fetch rules from DB when not provided', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'db-rule-1',
          name: 'DB Rule',
          type: 'COMPETITOR_BASED',
          conditions: [{ field: 'currentPrice', operator: 'lt', value: 200 }],
          actions: [{ type: 'SET_PRICE', value: 75 }],
          priority: 5,
          marketplace: null,
          category: null,
          safetyConfig: null,
          isActive: true,
        },
      ]);

      const result = await pricingRuleEngine.evaluate(baseContext);

      expect(mockPricingRuleFindMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ marketplace: null }, { marketplace: 'joom' }],
        },
        orderBy: { priority: 'desc' },
      });
      expect(result?.ruleId).toBe('db-rule-1');
    });
  });

  describe('evaluateRule', () => {
    it('should return matched:false when conditions are not met', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'currentPrice', operator: 'gt', value: 500 }],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };

      const result = pricingRuleEngine.evaluateRule(rule, baseContext);

      expect(result.matched).toBe(false);
      expect(result.recommendedPrice).toBeNull();
    });

    it('should return matched:true when all conditions are met', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'TIME_BASED',
        conditions: [
          { field: 'currentPrice', operator: 'lt', value: 200 },
          { field: 'daysListed', operator: 'gte', value: 5 },
        ],
        actions: [{ type: 'SET_PRICE', value: 85 }],
        priority: 1,
      };

      const result = pricingRuleEngine.evaluateRule(rule, baseContext);

      expect(result.matched).toBe(true);
      expect(result.recommendedPrice).toBe(85);
    });

    it('should return matched:false when one condition fails', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'TIME_BASED',
        conditions: [
          { field: 'currentPrice', operator: 'lt', value: 200 },
          { field: 'daysListed', operator: 'gte', value: 30 }, // fails
        ],
        actions: [{ type: 'SET_PRICE', value: 85 }],
        priority: 1,
      };

      const result = pricingRuleEngine.evaluateRule(rule, baseContext);

      expect(result.matched).toBe(false);
    });

    it('should round recommended price to 2 decimal places', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'MARGIN_BASED',
        conditions: [],
        actions: [{ type: 'ADJUST_PERCENT', value: 15.555 }],
        priority: 1,
      };

      const result = pricingRuleEngine.evaluateRule(rule, baseContext);

      // 100 * (1 + 15.555/100) = 115.555 => rounded to 115.56
      expect(result.recommendedPrice).toBe(115.56);
    });
  });

  describe('condition operators', () => {
    const createRule = (condition: { field: string; operator: string; value: number | string | [number, number] }): PricingRule => ({
      id: 'rule-1',
      name: 'Test Rule',
      type: 'COMPETITOR_BASED',
      conditions: [condition],
      actions: [{ type: 'SET_PRICE', value: 80 }],
      priority: 1,
    });

    it('should evaluate lt operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'lt', value: 150 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'lt', value: 50 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate lte operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'lte', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'lte', value: 99 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate gt operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'gt', value: 50 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'gt', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate gte operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'gte', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'gte', value: 101 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate eq operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'eq', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'eq', value: 99 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate neq operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'neq', value: 50 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'neq', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate between operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'between', value: [50, 150] });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'currentPrice', operator: 'between', value: [101, 200] });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate string eq operator', () => {
      const rule = createRule({ field: 'marketplace', operator: 'eq', value: 'joom' });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);

      const rule2 = createRule({ field: 'marketplace', operator: 'eq', value: 'ebay' });
      expect(pricingRuleEngine.evaluateRule(rule2, baseContext).matched).toBe(false);
    });

    it('should evaluate string neq operator', () => {
      const rule = createRule({ field: 'marketplace', operator: 'neq', value: 'ebay' });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should return false for unknown operator', () => {
      const rule = createRule({ field: 'currentPrice', operator: 'unknown', value: 100 });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(false);
    });

    it('should return false for string with non-string operators', () => {
      const rule = createRule({ field: 'marketplace', operator: 'gt', value: 'joom' });
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(false);
    });
  });

  describe('field values', () => {
    it('should get currentPrice field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'currentPrice', operator: 'eq', value: 100 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should get competitorPrice field', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 90 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'competitorPrice', operator: 'eq', value: 90 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should get competitorDiff field', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 90 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'competitorDiff', operator: 'eq', value: 10 }], // 100 - 90 = 10
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should get competitorDiffPercent field', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 80 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'competitorDiffPercent', operator: 'eq', value: 25 }], // (100-80)/80 * 100 = 25
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should get margin field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'MARGIN_BASED',
        conditions: [{ field: 'margin', operator: 'eq', value: 50 }], // 100 - 50 = 50
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should get marginPercent field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'MARGIN_BASED',
        conditions: [{ field: 'marginPercent', operator: 'eq', value: 100 }], // (100-50)/50 * 100 = 100
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should get daysListed field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'TIME_BASED',
        conditions: [{ field: 'daysListed', operator: 'eq', value: 7 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should get salesVelocity field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'VELOCITY_BASED',
        conditions: [{ field: 'salesVelocity', operator: 'eq', value: 0.5 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(true);
    });

    it('should get viewCount field', () => {
      const context: PricingContext = { ...baseContext, viewCount: 100 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'VELOCITY_BASED',
        conditions: [{ field: 'viewCount', operator: 'eq', value: 100 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should get stockLevel field', () => {
      const context: PricingContext = { ...baseContext, stockLevel: 5 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'INVENTORY_BASED',
        conditions: [{ field: 'stockLevel', operator: 'eq', value: 5 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should get category field', () => {
      const context: PricingContext = { ...baseContext, category: 'electronics' };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'category', operator: 'eq', value: 'electronics' }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(true);
    });

    it('should return false for undefined field', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'unknownField', operator: 'eq', value: 100 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(false);
    });

    it('should return false for undefined competitorDiff', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'competitorDiff', operator: 'eq', value: 10 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(false);
    });
  });

  describe('action types', () => {
    const createRule = (action: { type: string; value?: number; competitorOffset?: number; constraints?: Record<string, unknown> }): PricingRule => ({
      id: 'rule-1',
      name: 'Test Rule',
      type: 'COMPETITOR_BASED',
      conditions: [],
      actions: [action as any],
      priority: 1,
    });

    it('should apply SET_PRICE action', () => {
      const rule = createRule({ type: 'SET_PRICE', value: 75 });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(75);
    });

    it('should apply ADJUST_PERCENT positive action', () => {
      const rule = createRule({ type: 'ADJUST_PERCENT', value: 10 });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(110); // 100 * 1.10
    });

    it('should apply ADJUST_PERCENT negative action', () => {
      const rule = createRule({ type: 'ADJUST_PERCENT', value: -15 });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(85); // 100 * 0.85
    });

    it('should apply ADJUST_AMOUNT positive action', () => {
      const rule = createRule({ type: 'ADJUST_AMOUNT', value: 25 });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(125); // 100 + 25
    });

    it('should apply ADJUST_AMOUNT negative action', () => {
      const rule = createRule({ type: 'ADJUST_AMOUNT', value: -30 });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(70); // 100 - 30
    });

    it('should apply MATCH_COMPETITOR action', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 85 };
      const rule = createRule({ type: 'MATCH_COMPETITOR' });
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.recommendedPrice).toBe(85);
    });

    it('should apply MATCH_COMPETITOR action with offset', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 85 };
      const rule = createRule({ type: 'MATCH_COMPETITOR', competitorOffset: -5 });
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.recommendedPrice).toBe(80); // 85 - 5
    });

    it('should apply NO_ACTION action', () => {
      const rule = createRule({ type: 'NO_ACTION' });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(100); // unchanged
    });

    it('should not change price when MATCH_COMPETITOR has no competitor price', () => {
      const rule = createRule({ type: 'MATCH_COMPETITOR' });
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(100); // unchanged
    });
  });

  describe('constraints', () => {
    it('should apply minPrice constraint', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 20, constraints: { minPrice: 50 } }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(50);
      expect(result.minPrice).toBe(50);
    });

    it('should apply maxPrice constraint', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 200, constraints: { maxPrice: 150 } }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(150);
      expect(result.maxPrice).toBe(150);
    });

    it('should apply minMargin constraint', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'MARGIN_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 55, constraints: { minMargin: 20 } }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      // minMargin 20%: costPrice * 1.2 = 50 * 1.2 = 60
      expect(result.recommendedPrice).toBe(60);
    });

    it('should apply maxDiscount constraint', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 50, constraints: { maxDiscount: 30 } }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      // maxDiscount 30%: currentPrice * 0.7 = 100 * 0.7 = 70
      expect(result.recommendedPrice).toBe(70);
    });

    it('should apply maxIncrease constraint', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 200, constraints: { maxIncrease: 25 } }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      // maxIncrease 25%: currentPrice * 1.25 = 100 * 1.25 = 125
      expect(result.recommendedPrice).toBe(125);
    });
  });

  describe('safety constraints', () => {
    it('should apply maxPriceDropPercent safety', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 50 }],
        priority: 1,
        safetyConfig: { maxPriceDropPercent: 20 },
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      // maxPriceDropPercent 20%: currentPrice * 0.8 = 100 * 0.8 = 80
      expect(result.recommendedPrice).toBe(80);
    });

    it('should apply minPriceFloor safety', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 30 }],
        priority: 1,
        safetyConfig: { minPriceFloor: 40 },
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(40);
    });

    it('should add safety constraint factor to reason', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 50 }],
        priority: 1,
        safetyConfig: { maxPriceDropPercent: 20 },
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.reason.factors.some(f => f.name === 'safety_constraint')).toBe(true);
    });
  });

  describe('confidence calculation', () => {
    it('should have base confidence of 0.5 with no extra data', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should increase confidence with competitor price', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const context: PricingContext = { ...baseContext, competitorPrice: 90 };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should increase confidence with sales velocity', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'VELOCITY_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const context: PricingContext = { ...baseContext, salesVelocity: 2.0 };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should increase confidence with historical prices', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const context: PricingContext = {
        ...baseContext,
        historicalPrices: [100, 95, 90, 85, 80, 75],
      };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should cap confidence at 1.0', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [
          { field: 'currentPrice', operator: 'lt', value: 200 },
          { field: 'daysListed', operator: 'gte', value: 5 },
        ],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const context: PricingContext = {
        ...baseContext,
        competitorPrice: 90,
        salesVelocity: 5.0,
        historicalPrices: [100, 95, 90, 85, 80, 75],
      };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('impact estimation', () => {
    it('should estimate revenue impact', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 90 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.impact).toBeDefined();
      expect(result.impact?.revenueImpact).toBeDefined();
    });

    it('should estimate profit impact', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'MARGIN_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.impact?.profitImpact).toBeDefined();
      expect(result.impact?.marginChange).toBeDefined();
    });

    it('should determine competitor position as cheapest', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const context: PricingContext = { ...baseContext, competitorPrice: 100 };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.impact?.competitorPosition).toBe('cheapest');
    });

    it('should determine competitor position as premium', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 120 }],
        priority: 1,
      };
      const context: PricingContext = { ...baseContext, competitorPrice: 100 };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.impact?.competitorPosition).toBe('premium');
    });

    it('should determine competitor position as mid', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 100 }],
        priority: 1,
      };
      const context: PricingContext = { ...baseContext, competitorPrice: 100 };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.impact?.competitorPosition).toBe('mid');
    });

    it('should set riskLevel to high for large price changes', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 70 }], // 30% decrease
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.impact?.riskLevel).toBe('high');
    });

    it('should set riskLevel to medium for moderate price changes', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 90 }], // 10% decrease
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.impact?.riskLevel).toBe('medium');
    });

    it('should set riskLevel to low for small price changes', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 95 }], // 5% decrease
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.impact?.riskLevel).toBe('low');
    });
  });

  describe('explanation generation', () => {
    it('should generate explanation for price decrease', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.reason.explanation).toContain('decrease');
      expect(result.reason.explanation).toContain('Test Rule');
    });

    it('should generate explanation for price increase', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 120 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.reason.explanation).toContain('increase');
    });

    it('should generate explanation for maintain price', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.reason.explanation).toContain('maintain');
    });
  });

  describe('getAllRules', () => {
    it('should fetch all active rules from DB', async () => {
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Rule 1',
          type: 'COMPETITOR_BASED',
          conditions: [],
          actions: [],
          priority: 10,
          marketplace: 'joom',
          category: 'electronics',
          safetyConfig: { maxPriceDropPercent: 10 },
          isActive: true,
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          type: 'MARGIN_BASED',
          conditions: [],
          actions: [],
          priority: 5,
          marketplace: null,
          category: null,
          safetyConfig: null,
          isActive: true,
        },
      ]);

      const rules = await pricingRuleEngine.getAllRules();

      expect(mockPricingRuleFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });
      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('rule-1');
      expect(rules[0].marketplace).toBe('joom');
      expect(rules[1].marketplace).toBeUndefined();
    });

    it('should return empty array when no rules exist', async () => {
      mockPricingRuleFindMany.mockResolvedValue([]);

      const rules = await pricingRuleEngine.getAllRules();

      expect(rules).toEqual([]);
    });
  });

  describe('multiple actions', () => {
    it('should apply multiple actions in sequence', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [
          { type: 'ADJUST_PERCENT', value: 10 }, // 100 -> 110
          { type: 'ADJUST_AMOUNT', value: -5 },  // 110 -> 105
        ],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(105);
    });

    it('should accumulate factors from all actions', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [
          { type: 'ADJUST_PERCENT', value: 10 },
          { type: 'ADJUST_AMOUNT', value: -5 },
        ],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      const factorNames = result.reason.factors.map(f => f.name);
      expect(factorNames).toContain('percent_adjustment');
      expect(factorNames).toContain('amount_adjustment');
    });
  });

  describe('edge cases', () => {
    it('should handle zero cost price for marginPercent', () => {
      const context: PricingContext = { ...baseContext, costPrice: 0 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'MARGIN_BASED',
        conditions: [{ field: 'marginPercent', operator: 'gt', value: 0 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      // marginPercent is undefined when costPrice is 0
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(false);
    });

    it('should handle zero competitor price for competitorDiffPercent', () => {
      const context: PricingContext = { ...baseContext, competitorPrice: 0 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'competitorDiffPercent', operator: 'gt', value: 0 }],
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, context).matched).toBe(false);
    });

    it('should handle zero current price for impact calculation', () => {
      const context: PricingContext = { ...baseContext, currentPrice: 0 };
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 50 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, context);
      expect(result.impact?.revenueImpactPercent).toBe(0);
    });

    it('should handle empty conditions array', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE', value: 80 }],
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.matched).toBe(true);
    });

    it('should handle action without value', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [],
        actions: [{ type: 'SET_PRICE' }], // no value
        priority: 1,
      };
      const result = pricingRuleEngine.evaluateRule(rule, baseContext);
      expect(result.recommendedPrice).toBe(100); // unchanged
    });

    it('should handle between with invalid array', () => {
      const rule: PricingRule = {
        id: 'rule-1',
        name: 'Test',
        type: 'COMPETITOR_BASED',
        conditions: [{ field: 'currentPrice', operator: 'between', value: [100] as any }], // invalid
        actions: [{ type: 'NO_ACTION' }],
        priority: 1,
      };
      expect(pricingRuleEngine.evaluateRule(rule, baseContext).matched).toBe(false);
    });
  });
});

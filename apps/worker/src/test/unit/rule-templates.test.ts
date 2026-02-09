import { describe, it, expect } from 'vitest';

import {
  createCompetitorFollowRule,
  createMinMarginRule,
  createStaleItemRule,
  createPopularItemRule,
  createPriceMatchRule,
  createScheduledDiscountRule,
  getDefaultRuleTemplates,
} from '../../lib/pricing/rule-templates';

describe('Rule Templates', () => {
  describe('createCompetitorFollowRule', () => {
    it('should create competitor follow rule with defaults', () => {
      const rule = createCompetitorFollowRule('Test Rule');

      expect(rule.name).toBe('Test Rule');
      expect(rule.type).toBe('COMPETITOR_FOLLOW');
      expect(rule.priority).toBe(50);
      expect(rule.isActive).toBe(true);
      expect(rule.actions[0].type).toBe('MATCH_COMPETITOR');
      expect(rule.actions[0].competitorOffset).toBe(-500);
    });

    it('should create rule with custom offset', () => {
      const rule = createCompetitorFollowRule('Custom Offset', -1000, 20);

      expect(rule.actions[0].competitorOffset).toBe(-1000);
      expect(rule.actions[0].constraints?.minMargin).toBe(20);
    });

    it('should include safety config', () => {
      const rule = createCompetitorFollowRule('With Safety');

      expect(rule.safetyConfig).toBeDefined();
      expect(rule.safetyConfig?.maxPriceDropPercent).toBe(20);
      expect(rule.safetyConfig?.dailyChangeLimit).toBe(3);
      expect(rule.safetyConfig?.cooldownMinutes).toBe(60);
    });
  });

  describe('createMinMarginRule', () => {
    it('should create min margin rule with defaults', () => {
      const rule = createMinMarginRule('Min Margin');

      expect(rule.name).toBe('Min Margin');
      expect(rule.type).toBe('MIN_MARGIN');
      expect(rule.priority).toBe(100); // High priority
    });

    it('should create rule with custom margin', () => {
      const rule = createMinMarginRule('Custom Margin', 25);

      expect(rule.conditions[0].value).toBe(25);
      expect(rule.actions[0].constraints?.minMargin).toBe(25);
    });

    it('should prevent price drops', () => {
      const rule = createMinMarginRule('No Drops');

      expect(rule.safetyConfig?.maxPriceDropPercent).toBe(0);
    });
  });

  describe('createStaleItemRule', () => {
    it('should create stale item rule with defaults', () => {
      const rule = createStaleItemRule('Stale Items');

      expect(rule.name).toBe('Stale Items');
      expect(rule.type).toBe('DEMAND_BASED');
      expect(rule.conditions.length).toBe(2);
    });

    it('should set days threshold condition', () => {
      const rule = createStaleItemRule('Stale 45 Days', 45);

      expect(rule.conditions[0].field).toBe('daysListed');
      expect(rule.conditions[0].operator).toBe('gte');
      expect(rule.conditions[0].value).toBe(45);
    });

    it('should set discount parameters', () => {
      const rule = createStaleItemRule('Custom Discount', 30, 10, 40, 15);

      expect(rule.actions[0].value).toBe(-10);
      expect(rule.actions[0].constraints?.maxDiscount).toBe(40);
      expect(rule.actions[0].constraints?.minMargin).toBe(15);
    });

    it('should set 24h cooldown', () => {
      const rule = createStaleItemRule('Daily Check');

      expect(rule.safetyConfig?.cooldownMinutes).toBe(1440);
    });
  });

  describe('createPopularItemRule', () => {
    it('should create popular item rule with defaults', () => {
      const rule = createPopularItemRule('Popular Items');

      expect(rule.name).toBe('Popular Items');
      expect(rule.type).toBe('DEMAND_BASED');
    });

    it('should set sales velocity threshold', () => {
      const rule = createPopularItemRule('High Velocity', 1.0);

      expect(rule.conditions[0].field).toBe('salesVelocity');
      expect(rule.conditions[0].operator).toBe('gte');
      expect(rule.conditions[0].value).toBe(1.0);
    });

    it('should set increase parameters', () => {
      const rule = createPopularItemRule('Big Increase', 0.5, 10, 30);

      expect(rule.actions[0].value).toBe(10);
      expect(rule.actions[0].constraints?.maxIncrease).toBe(30);
    });

    it('should prevent price drops', () => {
      const rule = createPopularItemRule('No Drops');

      expect(rule.safetyConfig?.maxPriceDropPercent).toBe(0);
    });
  });

  describe('createPriceMatchRule', () => {
    it('should create price match rule with defaults', () => {
      const rule = createPriceMatchRule('Price Match');

      expect(rule.name).toBe('Price Match');
      expect(rule.type).toBe('COMPETITOR_FOLLOW');
      expect(rule.priority).toBe(60);
    });

    it('should set diff threshold', () => {
      const rule = createPriceMatchRule('Match 15%', 15, 20);

      expect(rule.conditions[0].field).toBe('competitorDiffPercent');
      expect(rule.conditions[0].operator).toBe('gt');
      expect(rule.conditions[0].value).toBe(15);
    });

    it('should match competitor with zero offset', () => {
      const rule = createPriceMatchRule('Exact Match');

      expect(rule.actions[0].type).toBe('MATCH_COMPETITOR');
      expect(rule.actions[0].competitorOffset).toBe(0);
    });
  });

  describe('createScheduledDiscountRule', () => {
    it('should create scheduled discount rule', () => {
      const rule = createScheduledDiscountRule('Weekly Discount', 7, 5);

      expect(rule.name).toBe('Weekly Discount');
      expect(rule.type).toBe('TIME_BASED');
      expect(rule.priority).toBe(20);
    });

    it('should set start day condition', () => {
      const rule = createScheduledDiscountRule('Late Discount', 14, 10);

      expect(rule.conditions[0].field).toBe('daysListed');
      expect(rule.conditions[0].value).toBe(14);
    });

    it('should set discount action', () => {
      const rule = createScheduledDiscountRule('5% Off', 7, 5, 7, 40, 5);

      expect(rule.actions[0].value).toBe(-5);
      expect(rule.actions[0].constraints?.maxDiscount).toBe(40);
      expect(rule.actions[0].constraints?.minMargin).toBe(5);
    });

    it('should set cooldown based on interval', () => {
      const rule = createScheduledDiscountRule('Weekly', 7, 5, 7);

      // 7 days * 24 hours * 60 minutes = 10080 minutes
      expect(rule.safetyConfig?.cooldownMinutes).toBe(10080);
    });
  });

  describe('getDefaultRuleTemplates', () => {
    it('should return array of default rules', () => {
      const templates = getDefaultRuleTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBe(5);
    });

    it('should include min margin rule', () => {
      const templates = getDefaultRuleTemplates();
      const minMargin = templates.find(t => t.type === 'MIN_MARGIN');

      expect(minMargin).toBeDefined();
      expect(minMargin?.name).toContain('利益率');
    });

    it('should include competitor follow rule', () => {
      const templates = getDefaultRuleTemplates();
      const competitor = templates.filter(t => t.type === 'COMPETITOR_FOLLOW');

      expect(competitor.length).toBeGreaterThanOrEqual(1);
    });

    it('should include demand-based rules', () => {
      const templates = getDefaultRuleTemplates();
      const demandBased = templates.filter(t => t.type === 'DEMAND_BASED');

      expect(demandBased.length).toBe(2); // stale + popular
    });

    it('should have all rules active by default', () => {
      const templates = getDefaultRuleTemplates();

      templates.forEach(t => {
        expect(t.isActive).toBe(true);
      });
    });
  });
});

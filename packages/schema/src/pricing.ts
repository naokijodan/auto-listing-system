/**
 * 価格最適化スキーマ（Phase 28）
 */

import { z } from 'zod';

// ========================================
// ルール条件
// ========================================

export const RuleOperator = z.enum([
  'lt',      // less than
  'lte',     // less than or equal
  'gt',      // greater than
  'gte',     // greater than or equal
  'eq',      // equal
  'neq',     // not equal
  'between', // between (requires array value)
]);

export type RuleOperator = z.infer<typeof RuleOperator>;

export const RuleConditionField = z.enum([
  'currentPrice',
  'competitorPrice',
  'competitorDiff',
  'competitorDiffPercent',
  'margin',
  'marginPercent',
  'daysListed',
  'salesVelocity',
  'viewCount',
  'stockLevel',
  'category',
  'marketplace',
]);

export type RuleConditionField = z.infer<typeof RuleConditionField>;

export const RuleCondition = z.object({
  field: RuleConditionField,
  operator: RuleOperator,
  value: z.union([z.number(), z.string(), z.tuple([z.number(), z.number()])]),
});

export type RuleCondition = z.infer<typeof RuleCondition>;

// ========================================
// ルールアクション
// ========================================

export const RuleActionType = z.enum([
  'SET_PRICE',          // 固定価格を設定
  'ADJUST_PERCENT',     // パーセンテージで調整
  'ADJUST_AMOUNT',      // 金額で調整
  'MATCH_COMPETITOR',   // 競合に合わせる
  'NO_ACTION',          // 何もしない
]);

export type RuleActionType = z.infer<typeof RuleActionType>;

export const RuleConstraints = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minMargin: z.number().optional(),      // 最低利益率 (%)
  maxDiscount: z.number().optional(),    // 最大値下げ率 (%)
  maxIncrease: z.number().optional(),    // 最大値上げ率 (%)
});

export type RuleConstraints = z.infer<typeof RuleConstraints>;

export const RuleAction = z.object({
  type: RuleActionType,
  value: z.number().optional(),          // SET_PRICE, ADJUST_PERCENT, ADJUST_AMOUNT用
  competitorOffset: z.number().optional(), // MATCH_COMPETITOR用（差額）
  constraints: RuleConstraints.optional(),
});

export type RuleAction = z.infer<typeof RuleAction>;

// ========================================
// 価格ルール
// ========================================

export const PricingRuleType = z.enum([
  'COMPETITOR_FOLLOW',
  'MIN_MARGIN',
  'MAX_DISCOUNT',
  'DEMAND_BASED',
  'TIME_BASED',
  'CUSTOM',
]);

export type PricingRuleType = z.infer<typeof PricingRuleType>;

export const PricingRuleDefinition = z.object({
  type: PricingRuleType,
  conditions: z.array(RuleCondition),
  actions: z.array(RuleAction),
});

export type PricingRuleDefinition = z.infer<typeof PricingRuleDefinition>;

export const CreatePricingRuleInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: PricingRuleType,
  conditions: z.array(RuleCondition),
  actions: z.array(RuleAction),
  marketplace: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
  safetyConfig: z.object({
    maxPriceDropPercent: z.number().min(0).max(100).default(20),
    minPriceFloor: z.number().min(0).optional(),
    dailyChangeLimit: z.number().int().min(1).default(3),
    cooldownMinutes: z.number().int().min(0).default(60),
  }).optional(),
});

export type CreatePricingRuleInput = z.infer<typeof CreatePricingRuleInput>;

// ========================================
// 価格推奨
// ========================================

export const PriceRecommendationStatus = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'APPLIED',
  'EXPIRED',
  'CANCELLED',
]);

export type PriceRecommendationStatus = z.infer<typeof PriceRecommendationStatus>;

export const RecommendationReason = z.object({
  ruleId: z.string().optional(),
  ruleName: z.string().optional(),
  ruleType: PricingRuleType.optional(),
  factors: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number()]),
    impact: z.enum(['positive', 'negative', 'neutral']),
    description: z.string().optional(),
  })),
  explanation: z.string(),
});

export type RecommendationReason = z.infer<typeof RecommendationReason>;

export const ImpactEstimate = z.object({
  revenueImpact: z.number(),
  revenueImpactPercent: z.number(),
  profitImpact: z.number(),
  profitImpactPercent: z.number(),
  marginChange: z.number(),
  expectedSalesChange: z.number(),
  competitorPosition: z.enum(['cheapest', 'mid', 'premium']),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

export type ImpactEstimate = z.infer<typeof ImpactEstimate>;

export const CreateRecommendationInput = z.object({
  listingId: z.string(),
  productId: z.string().optional(),
  currentPrice: z.number().positive(),
  recommendedPrice: z.number().positive(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  reason: RecommendationReason,
  impact: ImpactEstimate.optional(),
  ruleId: z.string().optional(),
  expiresAt: z.date(),
});

export type CreateRecommendationInput = z.infer<typeof CreateRecommendationInput>;

// ========================================
// シミュレーション
// ========================================

export const SimulationInput = z.object({
  listingIds: z.array(z.string()).min(1),
  rules: z.array(PricingRuleDefinition),
  startDate: z.date(),
  endDate: z.date(),
});

export type SimulationInput = z.infer<typeof SimulationInput>;

export const SimulationListingResult = z.object({
  listingId: z.string(),
  productId: z.string().optional(),
  title: z.string(),
  originalPrice: z.number(),
  simulatedPrice: z.number(),
  priceChange: z.number(),
  priceChangePercent: z.number(),
  originalRevenue: z.number(),
  simulatedRevenue: z.number(),
  originalProfit: z.number(),
  simulatedProfit: z.number(),
  rulesApplied: z.array(z.string()),
});

export type SimulationListingResult = z.infer<typeof SimulationListingResult>;

export const SimulationSummary = z.object({
  totalRevenueBefore: z.number(),
  totalRevenueAfter: z.number(),
  revenueChange: z.number(),
  revenueChangePercent: z.number(),
  totalProfitBefore: z.number(),
  totalProfitAfter: z.number(),
  profitChange: z.number(),
  profitChangePercent: z.number(),
  priceChanges: z.number(),
  avgPriceChange: z.number(),
  avgPriceChangePercent: z.number(),
});

export type SimulationSummary = z.infer<typeof SimulationSummary>;

export const SimulationResult = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  listings: z.array(SimulationListingResult),
  summary: SimulationSummary,
});

export type SimulationResult = z.infer<typeof SimulationResult>;

// ========================================
// 安全設定
// ========================================

export const SafetyConfig = z.object({
  maxPriceDropPercent: z.number().min(0).max(100).default(20),
  minPriceFloor: z.number().min(0).optional(),
  dailyChangeLimit: z.number().int().min(1).default(3),
  cooldownMinutes: z.number().int().min(0).default(60),
  autoApproveThreshold: z.number().min(0).max(100).default(5),
  requireApprovalAbove: z.number().min(0).optional(),
});

export type SafetyConfig = z.infer<typeof SafetyConfig>;

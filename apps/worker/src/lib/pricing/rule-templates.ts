/**
 * 価格ルールテンプレート（Phase 28）
 *
 * よく使用されるルールのプリセット
 */

import { CreatePricingRuleInput } from '@rakuda/schema';

/**
 * 競合追従ルール: 競合より指定額安く設定
 */
export function createCompetitorFollowRule(
  name: string,
  offsetAmount: number = -500,
  minMarginPercent: number = 15
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `競合価格より${Math.abs(offsetAmount)}円安く設定（利益率${minMarginPercent}%以上を維持）`,
    type: 'COMPETITOR_FOLLOW',
    conditions: [
      {
        field: 'competitorPrice',
        operator: 'gt',
        value: 0,
      },
    ],
    actions: [
      {
        type: 'MATCH_COMPETITOR',
        competitorOffset: offsetAmount,
        constraints: {
          minMargin: minMarginPercent,
        },
      },
    ],
    priority: 50,
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: 20,
      dailyChangeLimit: 3,
      cooldownMinutes: 60,
    },
  };
}

/**
 * 最低利益率維持ルール
 */
export function createMinMarginRule(
  name: string,
  minMarginPercent: number = 20
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `利益率が${minMarginPercent}%を下回らないよう価格を調整`,
    type: 'MIN_MARGIN',
    conditions: [
      {
        field: 'marginPercent',
        operator: 'lt',
        value: minMarginPercent,
      },
    ],
    actions: [
      {
        type: 'ADJUST_PERCENT',
        value: 0, // 制約で調整
        constraints: {
          minMargin: minMarginPercent,
        },
      },
    ],
    priority: 100, // 高優先度
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: 0, // 値下げ禁止
      dailyChangeLimit: 5,
      cooldownMinutes: 30,
    },
  };
}

/**
 * 滞留商品値下げルール
 */
export function createStaleItemRule(
  name: string,
  daysThreshold: number = 30,
  discountPercent: number = 5,
  maxDiscountPercent: number = 30,
  minMarginPercent: number = 10
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `${daysThreshold}日以上売れ残った商品を${discountPercent}%値下げ（最大${maxDiscountPercent}%、利益率${minMarginPercent}%以上維持）`,
    type: 'DEMAND_BASED',
    conditions: [
      {
        field: 'daysListed',
        operator: 'gte',
        value: daysThreshold,
      },
      {
        field: 'salesVelocity',
        operator: 'lt',
        value: 0.1,
      },
    ],
    actions: [
      {
        type: 'ADJUST_PERCENT',
        value: -discountPercent,
        constraints: {
          maxDiscount: maxDiscountPercent,
          minMargin: minMarginPercent,
        },
      },
    ],
    priority: 30,
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: maxDiscountPercent,
      dailyChangeLimit: 1,
      cooldownMinutes: 1440, // 24時間
    },
  };
}

/**
 * 人気商品値上げルール
 */
export function createPopularItemRule(
  name: string,
  salesVelocityThreshold: number = 0.5,
  increasePercent: number = 5,
  maxIncreasePercent: number = 20
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `売上速度が${salesVelocityThreshold}以上の人気商品を${increasePercent}%値上げ`,
    type: 'DEMAND_BASED',
    conditions: [
      {
        field: 'salesVelocity',
        operator: 'gte',
        value: salesVelocityThreshold,
      },
    ],
    actions: [
      {
        type: 'ADJUST_PERCENT',
        value: increasePercent,
        constraints: {
          maxIncrease: maxIncreasePercent,
        },
      },
    ],
    priority: 40,
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: 0,
      dailyChangeLimit: 2,
      cooldownMinutes: 360, // 6時間
    },
  };
}

/**
 * 競合より高い場合の値下げルール
 */
export function createPriceMatchRule(
  name: string,
  maxDiffPercent: number = 10,
  minMarginPercent: number = 15
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `競合より${maxDiffPercent}%以上高い場合、競合価格に合わせる`,
    type: 'COMPETITOR_FOLLOW',
    conditions: [
      {
        field: 'competitorDiffPercent',
        operator: 'gt',
        value: maxDiffPercent,
      },
    ],
    actions: [
      {
        type: 'MATCH_COMPETITOR',
        competitorOffset: 0,
        constraints: {
          minMargin: minMarginPercent,
          maxDiscount: 25,
        },
      },
    ],
    priority: 60,
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: 25,
      dailyChangeLimit: 2,
      cooldownMinutes: 120,
    },
  };
}

/**
 * 定期値下げルール（時間ベース）
 */
export function createScheduledDiscountRule(
  name: string,
  startDay: number,
  discountPercent: number,
  intervalDays: number = 7,
  maxDiscountPercent: number = 40,
  minMarginPercent: number = 5
): Omit<CreatePricingRuleInput, 'name'> & { name: string } {
  return {
    name,
    description: `${startDay}日目から${intervalDays}日ごとに${discountPercent}%値下げ（最大${maxDiscountPercent}%）`,
    type: 'TIME_BASED',
    conditions: [
      {
        field: 'daysListed',
        operator: 'gte',
        value: startDay,
      },
    ],
    actions: [
      {
        type: 'ADJUST_PERCENT',
        value: -discountPercent,
        constraints: {
          maxDiscount: maxDiscountPercent,
          minMargin: minMarginPercent,
        },
      },
    ],
    priority: 20,
    isActive: true,
    safetyConfig: {
      maxPriceDropPercent: discountPercent + 5,
      dailyChangeLimit: 1,
      cooldownMinutes: intervalDays * 24 * 60,
    },
  };
}

/**
 * デフォルトルールセットを取得
 */
export function getDefaultRuleTemplates(): Array<Omit<CreatePricingRuleInput, 'name'> & { name: string }> {
  return [
    createMinMarginRule('最低利益率維持（20%）', 20),
    createCompetitorFollowRule('競合追従（-500円）', -500, 15),
    createPriceMatchRule('競合価格マッチ', 10, 15),
    createStaleItemRule('滞留商品値下げ（30日）', 30, 5, 30, 10),
    createPopularItemRule('人気商品値上げ', 0.5, 5, 20),
  ];
}

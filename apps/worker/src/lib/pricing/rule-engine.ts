/**
 * 価格ルールエンジン（Phase 28）
 *
 * ルールベースの価格最適化ロジック
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import {
  RuleCondition,
  RuleAction,
  RuleConstraints,
  PricingRuleType,
  RecommendationReason,
  ImpactEstimate,
} from '@rakuda/schema';

const log = logger.child({ module: 'RuleEngine' });

// ========================================
// 型定義
// ========================================

export interface PricingContext {
  listingId: string;
  productId?: string;
  currentPrice: number;
  costPrice: number;        // 仕入価格
  competitorPrice?: number;
  competitorCount?: number;
  daysListed: number;
  salesVelocity: number;    // 売上速度 (件/日)
  viewCount?: number;
  stockLevel?: number;
  category?: string;
  marketplace: string;
  historicalPrices?: number[];
}

export interface RuleEvaluationResult {
  matched: boolean;
  ruleId: string;
  ruleName: string;
  ruleType: PricingRuleType;
  recommendedPrice: number | null;
  minPrice?: number;
  maxPrice?: number;
  confidence: number;
  reason: RecommendationReason;
  impact?: ImpactEstimate;
}

export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  marketplace?: string;
  category?: string;
  safetyConfig?: {
    maxPriceDropPercent?: number;
    minPriceFloor?: number;
  };
}

// ========================================
// ルールエンジンクラス
// ========================================

class PricingRuleEngine {
  /**
   * コンテキストに対してルールを評価
   */
  async evaluate(
    context: PricingContext,
    rules?: PricingRule[]
  ): Promise<RuleEvaluationResult | null> {
    // ルールが指定されていない場合はDBから取得
    const applicableRules = rules ?? await this.getApplicableRules(context);

    if (applicableRules.length === 0) {
      log.debug({ type: 'no_applicable_rules', listingId: context.listingId });
      return null;
    }

    // 優先度順にソート
    const sortedRules = [...applicableRules].sort((a, b) => b.priority - a.priority);

    // 各ルールを評価
    for (const rule of sortedRules) {
      const result = this.evaluateRule(rule, context);
      if (result.matched && result.recommendedPrice !== null) {
        log.info({
          type: 'rule_matched',
          listingId: context.listingId,
          ruleId: rule.id,
          ruleName: rule.name,
          currentPrice: context.currentPrice,
          recommendedPrice: result.recommendedPrice,
        });
        return result;
      }
    }

    return null;
  }

  /**
   * 単一ルールを評価
   */
  evaluateRule(rule: PricingRule, context: PricingContext): RuleEvaluationResult {
    const baseResult: RuleEvaluationResult = {
      matched: false,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type as PricingRuleType,
      recommendedPrice: null,
      confidence: 0,
      reason: {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type as PricingRuleType,
        factors: [],
        explanation: '',
      },
    };

    // すべての条件を評価
    const conditionResults = rule.conditions.map(condition =>
      this.evaluateCondition(condition, context)
    );

    // すべての条件が満たされているか確認
    const allConditionsMet = conditionResults.every(r => r.matched);

    if (!allConditionsMet) {
      return baseResult;
    }

    // アクションを適用して推奨価格を計算
    let recommendedPrice = context.currentPrice;
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    const factors: RecommendationReason['factors'] = [];

    for (const action of rule.actions) {
      const actionResult = this.applyAction(action, context, recommendedPrice);
      recommendedPrice = actionResult.newPrice;

      if (actionResult.minPrice !== undefined) {
        minPrice = Math.max(minPrice ?? 0, actionResult.minPrice);
      }
      if (actionResult.maxPrice !== undefined) {
        maxPrice = maxPrice === undefined
          ? actionResult.maxPrice
          : Math.min(maxPrice, actionResult.maxPrice);
      }

      factors.push(...actionResult.factors);
    }

    // 安全制約の適用
    if (rule.safetyConfig) {
      const safetyResult = this.applySafetyConstraints(
        recommendedPrice,
        context.currentPrice,
        rule.safetyConfig
      );
      recommendedPrice = safetyResult.price;
      if (safetyResult.constrained) {
        factors.push({
          name: 'safety_constraint',
          value: safetyResult.constraintType || 'applied',
          impact: 'neutral',
          description: safetyResult.reason,
        });
      }
    }

    // 信頼度の計算
    const confidence = this.calculateConfidence(conditionResults, context);

    // 影響試算
    const impact = this.estimateImpact(context, recommendedPrice);

    return {
      matched: true,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type as PricingRuleType,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      minPrice,
      maxPrice,
      confidence,
      reason: {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type as PricingRuleType,
        factors,
        explanation: this.generateExplanation(rule, factors, context, recommendedPrice),
      },
      impact,
    };
  }

  /**
   * 条件を評価
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: PricingContext
  ): { matched: boolean; value: number | string } {
    const fieldValue = this.getFieldValue(condition.field, context);

    if (fieldValue === undefined || fieldValue === null) {
      return { matched: false, value: 'N/A' };
    }

    const matched = this.compareValues(
      fieldValue,
      condition.operator,
      condition.value
    );

    return { matched, value: fieldValue };
  }

  /**
   * フィールド値を取得
   */
  private getFieldValue(field: string, context: PricingContext): number | string | undefined {
    switch (field) {
      case 'currentPrice':
        return context.currentPrice;
      case 'competitorPrice':
        return context.competitorPrice;
      case 'competitorDiff':
        return context.competitorPrice !== undefined
          ? context.currentPrice - context.competitorPrice
          : undefined;
      case 'competitorDiffPercent':
        return context.competitorPrice !== undefined && context.competitorPrice > 0
          ? ((context.currentPrice - context.competitorPrice) / context.competitorPrice) * 100
          : undefined;
      case 'margin':
        return context.currentPrice - context.costPrice;
      case 'marginPercent':
        return context.costPrice > 0
          ? ((context.currentPrice - context.costPrice) / context.costPrice) * 100
          : undefined;
      case 'daysListed':
        return context.daysListed;
      case 'salesVelocity':
        return context.salesVelocity;
      case 'viewCount':
        return context.viewCount;
      case 'stockLevel':
        return context.stockLevel;
      case 'category':
        return context.category;
      case 'marketplace':
        return context.marketplace;
      default:
        return undefined;
    }
  }

  /**
   * 値を比較
   */
  private compareValues(
    actual: number | string,
    operator: string,
    expected: number | string | [number, number]
  ): boolean {
    if (typeof actual === 'string' || typeof expected === 'string') {
      // 文字列比較（eq, neqのみ）
      if (operator === 'eq') return actual === expected;
      if (operator === 'neq') return actual !== expected;
      return false;
    }

    const numActual = Number(actual);
    const numExpected = Array.isArray(expected) ? expected : Number(expected);

    switch (operator) {
      case 'lt':
        return numActual < (numExpected as number);
      case 'lte':
        return numActual <= (numExpected as number);
      case 'gt':
        return numActual > (numExpected as number);
      case 'gte':
        return numActual >= (numExpected as number);
      case 'eq':
        return numActual === (numExpected as number);
      case 'neq':
        return numActual !== (numExpected as number);
      case 'between':
        if (Array.isArray(numExpected) && numExpected.length === 2) {
          return numActual >= numExpected[0] && numActual <= numExpected[1];
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * アクションを適用
   */
  private applyAction(
    action: RuleAction,
    context: PricingContext,
    currentRecommendedPrice: number
  ): {
    newPrice: number;
    minPrice?: number;
    maxPrice?: number;
    factors: RecommendationReason['factors'];
  } {
    let newPrice = currentRecommendedPrice;
    const factors: RecommendationReason['factors'] = [];

    switch (action.type) {
      case 'SET_PRICE':
        if (action.value !== undefined) {
          newPrice = action.value;
          factors.push({
            name: 'fixed_price',
            value: action.value,
            impact: 'neutral',
            description: `Fixed price set to ${action.value}`,
          });
        }
        break;

      case 'ADJUST_PERCENT':
        if (action.value !== undefined) {
          const adjustment = currentRecommendedPrice * (action.value / 100);
          newPrice = currentRecommendedPrice + adjustment;
          factors.push({
            name: 'percent_adjustment',
            value: `${action.value > 0 ? '+' : ''}${action.value}%`,
            impact: action.value > 0 ? 'positive' : 'negative',
            description: `Price adjusted by ${action.value}%`,
          });
        }
        break;

      case 'ADJUST_AMOUNT':
        if (action.value !== undefined) {
          newPrice = currentRecommendedPrice + action.value;
          factors.push({
            name: 'amount_adjustment',
            value: `${action.value > 0 ? '+' : ''}${action.value}`,
            impact: action.value > 0 ? 'positive' : 'negative',
            description: `Price adjusted by ${action.value}`,
          });
        }
        break;

      case 'MATCH_COMPETITOR':
        if (context.competitorPrice !== undefined) {
          const offset = action.competitorOffset ?? 0;
          newPrice = context.competitorPrice + offset;
          factors.push({
            name: 'competitor_match',
            value: context.competitorPrice,
            impact: offset < 0 ? 'negative' : offset > 0 ? 'positive' : 'neutral',
            description: `Matched competitor price (${context.competitorPrice}) ${offset !== 0 ? `with offset ${offset}` : ''}`,
          });
        }
        break;

      case 'NO_ACTION':
        factors.push({
          name: 'no_action',
          value: 'unchanged',
          impact: 'neutral',
          description: 'No price change recommended',
        });
        break;
    }

    // 制約の適用
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (action.constraints) {
      const constrained = this.applyConstraints(newPrice, context, action.constraints);
      newPrice = constrained.price;
      minPrice = constrained.minPrice;
      maxPrice = constrained.maxPrice;

      if (constrained.constraintApplied) {
        factors.push({
          name: 'constraint_applied',
          value: constrained.constraintType || 'limit',
          impact: 'neutral',
          description: constrained.reason || 'Constraint applied',
        });
      }
    }

    return { newPrice, minPrice, maxPrice, factors };
  }

  /**
   * 制約を適用
   */
  private applyConstraints(
    price: number,
    context: PricingContext,
    constraints: RuleConstraints
  ): {
    price: number;
    minPrice?: number;
    maxPrice?: number;
    constraintApplied: boolean;
    constraintType?: string;
    reason?: string;
  } {
    let adjustedPrice = price;
    let constraintApplied = false;
    let constraintType: string | undefined;
    let reason: string | undefined;

    // 最小価格
    if (constraints.minPrice !== undefined && adjustedPrice < constraints.minPrice) {
      adjustedPrice = constraints.minPrice;
      constraintApplied = true;
      constraintType = 'min_price';
      reason = `Price floored at minimum ${constraints.minPrice}`;
    }

    // 最大価格
    if (constraints.maxPrice !== undefined && adjustedPrice > constraints.maxPrice) {
      adjustedPrice = constraints.maxPrice;
      constraintApplied = true;
      constraintType = 'max_price';
      reason = `Price capped at maximum ${constraints.maxPrice}`;
    }

    // 最低利益率
    if (constraints.minMargin !== undefined) {
      const minPriceForMargin = context.costPrice * (1 + constraints.minMargin / 100);
      if (adjustedPrice < minPriceForMargin) {
        adjustedPrice = minPriceForMargin;
        constraintApplied = true;
        constraintType = 'min_margin';
        reason = `Price adjusted to maintain ${constraints.minMargin}% margin`;
      }
    }

    // 最大値下げ率
    if (constraints.maxDiscount !== undefined) {
      const minPriceForDiscount = context.currentPrice * (1 - constraints.maxDiscount / 100);
      if (adjustedPrice < minPriceForDiscount) {
        adjustedPrice = minPriceForDiscount;
        constraintApplied = true;
        constraintType = 'max_discount';
        reason = `Discount limited to ${constraints.maxDiscount}%`;
      }
    }

    // 最大値上げ率
    if (constraints.maxIncrease !== undefined) {
      const maxPriceForIncrease = context.currentPrice * (1 + constraints.maxIncrease / 100);
      if (adjustedPrice > maxPriceForIncrease) {
        adjustedPrice = maxPriceForIncrease;
        constraintApplied = true;
        constraintType = 'max_increase';
        reason = `Increase limited to ${constraints.maxIncrease}%`;
      }
    }

    return {
      price: adjustedPrice,
      minPrice: constraints.minPrice,
      maxPrice: constraints.maxPrice,
      constraintApplied,
      constraintType,
      reason,
    };
  }

  /**
   * 安全制約を適用
   */
  private applySafetyConstraints(
    recommendedPrice: number,
    currentPrice: number,
    safetyConfig: PricingRule['safetyConfig']
  ): {
    price: number;
    constrained: boolean;
    constraintType?: string;
    reason?: string;
  } {
    if (!safetyConfig) {
      return { price: recommendedPrice, constrained: false };
    }

    let adjustedPrice = recommendedPrice;
    let constrained = false;
    let constraintType: string | undefined;
    let reason: string | undefined;

    // 最大値下げ率
    if (safetyConfig.maxPriceDropPercent !== undefined) {
      const minAllowedPrice = currentPrice * (1 - safetyConfig.maxPriceDropPercent / 100);
      if (adjustedPrice < minAllowedPrice) {
        adjustedPrice = minAllowedPrice;
        constrained = true;
        constraintType = 'max_drop';
        reason = `Safety: Max ${safetyConfig.maxPriceDropPercent}% drop limit`;
      }
    }

    // 絶対最低価格
    if (safetyConfig.minPriceFloor !== undefined && adjustedPrice < safetyConfig.minPriceFloor) {
      adjustedPrice = safetyConfig.minPriceFloor;
      constrained = true;
      constraintType = 'floor';
      reason = `Safety: Minimum floor ${safetyConfig.minPriceFloor}`;
    }

    return { price: adjustedPrice, constrained, constraintType, reason };
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    conditionResults: Array<{ matched: boolean; value: number | string }>,
    context: PricingContext
  ): number {
    let confidence = 0.5; // ベース信頼度

    // 条件が多いほど信頼度アップ
    confidence += Math.min(conditionResults.length * 0.1, 0.2);

    // 競合データがあれば信頼度アップ
    if (context.competitorPrice !== undefined) {
      confidence += 0.1;
    }

    // 販売履歴があれば信頼度アップ
    if (context.salesVelocity > 0) {
      confidence += 0.1;
    }

    // 価格履歴があれば信頼度アップ
    if (context.historicalPrices && context.historicalPrices.length > 5) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 影響を試算
   */
  private estimateImpact(
    context: PricingContext,
    recommendedPrice: number
  ): ImpactEstimate {
    const priceChange = recommendedPrice - context.currentPrice;
    const priceChangePercent = context.currentPrice > 0
      ? (priceChange / context.currentPrice) * 100
      : 0;

    // 需要弾力性を仮定（価格1%下げると売上0.5%増加）
    const elasticity = -0.5;
    const expectedSalesChange = priceChangePercent * elasticity;

    // 現在の利益率
    const currentMargin = context.currentPrice - context.costPrice;
    const newMargin = recommendedPrice - context.costPrice;
    const marginChange = newMargin - currentMargin;

    // 収益影響（簡易計算）
    const revenueImpact = priceChange * (1 + expectedSalesChange / 100);
    const revenueImpactPercent = context.currentPrice > 0
      ? (revenueImpact / context.currentPrice) * 100
      : 0;

    // 利益影響
    const profitImpact = marginChange * (1 + expectedSalesChange / 100);
    const profitImpactPercent = currentMargin > 0
      ? (profitImpact / currentMargin) * 100
      : 0;

    // 競合ポジション
    let competitorPosition: 'cheapest' | 'mid' | 'premium' = 'mid';
    if (context.competitorPrice !== undefined) {
      if (recommendedPrice < context.competitorPrice * 0.95) {
        competitorPosition = 'cheapest';
      } else if (recommendedPrice > context.competitorPrice * 1.05) {
        competitorPosition = 'premium';
      }
    }

    // リスクレベル
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(priceChangePercent) > 15) {
      riskLevel = 'high';
    } else if (Math.abs(priceChangePercent) > 7) {
      riskLevel = 'medium';
    }

    return {
      revenueImpact: Math.round(revenueImpact * 100) / 100,
      revenueImpactPercent: Math.round(revenueImpactPercent * 100) / 100,
      profitImpact: Math.round(profitImpact * 100) / 100,
      profitImpactPercent: Math.round(profitImpactPercent * 100) / 100,
      marginChange: Math.round(marginChange * 100) / 100,
      expectedSalesChange: Math.round(expectedSalesChange * 100) / 100,
      competitorPosition,
      riskLevel,
    };
  }

  /**
   * 説明文を生成
   */
  private generateExplanation(
    rule: PricingRule,
    factors: RecommendationReason['factors'],
    context: PricingContext,
    recommendedPrice: number
  ): string {
    const priceChange = recommendedPrice - context.currentPrice;
    const changeDirection = priceChange > 0 ? 'increase' : priceChange < 0 ? 'decrease' : 'maintain';
    const changeAmount = Math.abs(priceChange).toFixed(2);
    const changePercent = ((priceChange / context.currentPrice) * 100).toFixed(1);

    let explanation = `Rule "${rule.name}" recommends to ${changeDirection} price`;

    if (priceChange !== 0) {
      explanation += ` by $${changeAmount} (${changePercent}%)`;
    }

    explanation += `. Factors: ${factors.map(f => f.name).join(', ')}.`;

    return explanation;
  }

  /**
   * 適用可能なルールを取得
   */
  private async getApplicableRules(context: PricingContext): Promise<PricingRule[]> {
    const rules = await prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { marketplace: null },
          { marketplace: context.marketplace },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as PricingRuleType,
      conditions: r.conditions as RuleCondition[],
      actions: r.actions as RuleAction[],
      priority: r.priority,
      marketplace: r.marketplace ?? undefined,
      category: r.category ?? undefined,
      safetyConfig: r.safetyConfig as PricingRule['safetyConfig'],
    }));
  }

  /**
   * すべてのアクティブなルールを取得
   */
  async getAllRules(): Promise<PricingRule[]> {
    const rules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as PricingRuleType,
      conditions: r.conditions as RuleCondition[],
      actions: r.actions as RuleAction[],
      priority: r.priority,
      marketplace: r.marketplace ?? undefined,
      category: r.category ?? undefined,
      safetyConfig: r.safetyConfig as PricingRule['safetyConfig'],
    }));
  }
}

// シングルトンインスタンス
export const pricingRuleEngine = new PricingRuleEngine();

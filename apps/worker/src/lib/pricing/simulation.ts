/**
 * 価格シミュレーション・バックテスト（Phase 28D）
 *
 * ルール適用前のシミュレーションと過去データでのバックテスト
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { pricingRuleEngine, PricingContext, PricingRule } from './rule-engine';
import { pricingCircuitBreaker } from './circuit-breaker';

const log = logger.child({ module: 'PricingSimulation' });

export interface SimulationInput {
  listingId: string;
  rules?: string[];         // 特定ルールのみ適用（未指定は全アクティブルール）
  competitorPrice?: number; // 競合価格をオーバーライド
}

export interface SimulationResult {
  listingId: string;
  currentPrice: number;
  simulatedPrice: number;
  priceChange: number;
  changePercent: number;
  appliedRule?: {
    ruleId: string;
    ruleName: string;
  };
  safetyChecks: {
    withinDropLimit: boolean;
    withinRiseLimit: boolean;
    aboveFloor: boolean;
    dailyLimitOk: boolean;
    cooldownOk: boolean;
  };
  blocked: boolean;
  blockReason?: string;
  estimatedImpact?: {
    salesVelocityChange: number;
    marginChange: number;
    revenueChange: number;
  };
}

export interface BacktestInput {
  ruleIds: string[];
  startDate: Date;
  endDate: Date;
  listingIds?: string[];     // 未指定は全リスティング
  sampleSize?: number;       // サンプリング数
}

export interface BacktestResult {
  period: { start: Date; end: Date };
  rulesEvaluated: number;
  listingsAnalyzed: number;
  priceChangesSimulated: number;
  summary: {
    avgPriceChange: number;
    avgMarginImpact: number;
    profitableChanges: number;
    unprofitableChanges: number;
    blockedByCircuitBreaker: number;
  };
  byRule: Array<{
    ruleId: string;
    ruleName: string;
    timesTriggered: number;
    avgPriceChange: number;
    avgConfidence: number;
  }>;
  riskAnalysis: {
    maxDrawdown: number;
    volatility: number;
    sharpeRatio: number;
  };
}

class PricingSimulation {
  /**
   * 単一リスティングのシミュレーション
   */
  async simulateSingle(input: SimulationInput): Promise<SimulationResult> {
    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      include: { product: true },
    });

    if (!listing) {
      throw new Error(`Listing not found: ${input.listingId}`);
    }

    // 競合価格を取得または上書き
    let competitorPrice = input.competitorPrice;
    if (competitorPrice === undefined) {
      const latestCompetitor = await prisma.competitorPriceLog.findFirst({
        where: { listingId: input.listingId },
        orderBy: { recordedAt: 'desc' },
      });
      competitorPrice = latestCompetitor?.price || undefined;
    }

    const currentPrice = listing.listingPrice;
    const costPrice = listing.product?.price || 0; // 仕入価格

    // ルールを取得
    let rules: PricingRule[] | undefined;
    if (input.rules?.length) {
      const dbRules = await prisma.pricingRule.findMany({
        where: {
          id: { in: input.rules },
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      rules = dbRules.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type as any,
        conditions: r.conditions as any[],
        actions: r.actions as any[],
        priority: r.priority,
        marketplace: r.marketplace ?? undefined,
        category: r.category ?? undefined,
        safetyConfig: r.safetyConfig as any,
      }));
    }

    // コンテキストを作成
    const context: PricingContext = {
      listingId: input.listingId,
      productId: listing.productId || undefined,
      currentPrice,
      costPrice,
      competitorPrice,
      daysListed: this.getDaysListed(listing.createdAt),
      salesVelocity: 0.3, // TODO: 実際の販売速度を計算
      marketplace: listing.marketplace,
    };

    // ルールエンジンで評価
    const result = await pricingRuleEngine.evaluate(context, rules);

    const simulatedPrice = result?.recommendedPrice ?? currentPrice;

    // サーキットブレーカーチェック
    const safetyResult = await pricingCircuitBreaker.canApply(
      input.listingId,
      currentPrice,
      simulatedPrice
    );

    const safetyChecks = {
      withinDropLimit: simulatedPrice >= currentPrice ||
        ((currentPrice - simulatedPrice) / currentPrice) * 100 <= 20,
      withinRiseLimit: simulatedPrice <= currentPrice ||
        ((simulatedPrice - currentPrice) / currentPrice) * 100 <= 30,
      aboveFloor: simulatedPrice >= 1.0,
      dailyLimitOk: true,
      cooldownOk: true,
    };

    // 日次制限とクールダウンをチェック
    const status = await pricingCircuitBreaker.getStatus(input.listingId);
    safetyChecks.dailyLimitOk = !status.isBlocked || !status.blockReason?.includes('Daily');
    safetyChecks.cooldownOk = !status.isBlocked || !status.blockReason?.includes('Cooldown');

    const priceChange = simulatedPrice - currentPrice;
    const changePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

    // 影響予測（簡易版）
    const estimatedImpact = this.estimateImpact(currentPrice, simulatedPrice, costPrice);

    return {
      listingId: input.listingId,
      currentPrice,
      simulatedPrice: Math.round(simulatedPrice * 100) / 100,
      priceChange: Math.round(priceChange * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      appliedRule: result ? { ruleId: result.ruleId, ruleName: result.ruleName } : undefined,
      safetyChecks,
      blocked: !safetyResult.allowed,
      blockReason: safetyResult.reason,
      estimatedImpact,
    };
  }

  /**
   * 複数リスティングのバッチシミュレーション
   */
  async simulateBatch(
    listingIds: string[],
    rules?: string[]
  ): Promise<{
    results: SimulationResult[];
    summary: {
      total: number;
      changed: number;
      blocked: number;
      avgChangePercent: number;
    };
  }> {
    const results: SimulationResult[] = [];

    for (const listingId of listingIds) {
      try {
        const result = await this.simulateSingle({ listingId, rules });
        results.push(result);
      } catch (error) {
        log.warn({ type: 'simulation_error', listingId, error });
      }
    }

    const changed = results.filter(r => r.priceChange !== 0).length;
    const blocked = results.filter(r => r.blocked).length;
    const avgChangePercent = results.length > 0
      ? results.reduce((sum, r) => sum + r.changePercent, 0) / results.length
      : 0;

    return {
      results,
      summary: {
        total: results.length,
        changed,
        blocked,
        avgChangePercent: Math.round(avgChangePercent * 100) / 100,
      },
    };
  }

  /**
   * 過去データでのバックテスト
   */
  async backtest(input: BacktestInput): Promise<BacktestResult> {
    log.info({
      type: 'backtest_start',
      ruleIds: input.ruleIds,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    // ルールを取得
    const dbRules = await prisma.pricingRule.findMany({
      where: { id: { in: input.ruleIds } },
    });

    if (dbRules.length === 0) {
      throw new Error('No rules found');
    }

    const rules: PricingRule[] = dbRules.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as any,
      conditions: r.conditions as any[],
      actions: r.actions as any[],
      priority: r.priority,
      marketplace: r.marketplace ?? undefined,
      category: r.category ?? undefined,
      safetyConfig: r.safetyConfig as any,
    }));

    // リスティングを取得
    const listings = await prisma.listing.findMany({
      where: input.listingIds?.length
        ? { id: { in: input.listingIds } }
        : { status: 'ACTIVE' },
      include: { product: true },
      take: input.sampleSize || 100,
    });

    // 過去の価格履歴を取得
    const priceHistories = await prisma.priceHistory.findMany({
      where: {
        listingId: { in: listings.map(l => l.id) },
        recordedAt: {
          gte: input.startDate,
          lte: input.endDate,
        },
      },
      orderBy: { recordedAt: 'asc' },
    });

    // シミュレーション結果
    const simulatedChanges: Array<{
      listingId: string;
      date: string;
      ruleId: string;
      oldPrice: number;
      newPrice: number;
      confidence: number;
    }> = [];

    const ruleStats = new Map<string, {
      timesTriggered: number;
      totalPriceChange: number;
      totalConfidence: number;
    }>();

    // 各ルールの初期化
    for (const rule of rules) {
      ruleStats.set(rule.id, {
        timesTriggered: 0,
        totalPriceChange: 0,
        totalConfidence: 0,
      });
    }

    let blockedCount = 0;

    // 各リスティングでシミュレーション
    for (const listing of listings) {
      const costPrice = listing.product?.price || 0;

      const context: PricingContext = {
        listingId: listing.id,
        productId: listing.productId || undefined,
        currentPrice: listing.listingPrice,
        costPrice,
        daysListed: 30,
        salesVelocity: 0.3,
        marketplace: listing.marketplace,
      };

      const result = await pricingRuleEngine.evaluate(context, rules);

      if (result && result.matched && result.recommendedPrice !== null) {
        const stats = ruleStats.get(result.ruleId)!;
        stats.timesTriggered++;
        stats.totalPriceChange += result.recommendedPrice - listing.listingPrice;
        stats.totalConfidence += result.confidence;

        const changePercent = Math.abs(
          (result.recommendedPrice - listing.listingPrice) / listing.listingPrice
        ) * 100;

        if (changePercent > 20) {
          blockedCount++;
        } else {
          simulatedChanges.push({
            listingId: listing.id,
            date: new Date().toISOString(),
            ruleId: result.ruleId,
            oldPrice: listing.listingPrice,
            newPrice: result.recommendedPrice,
            confidence: result.confidence,
          });
        }
      }
    }

    // 結果を集計
    const priceChanges = simulatedChanges.map(c => c.newPrice - c.oldPrice);
    const avgPriceChange = priceChanges.length > 0
      ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
      : 0;

    const profitableChanges = priceChanges.filter(c => c > 0).length;
    const unprofitableChanges = priceChanges.filter(c => c < 0).length;

    // リスク分析
    const riskAnalysis = this.calculateRiskMetrics(priceChanges);

    // ルール別統計
    const byRule = rules.map(rule => {
      const stats = ruleStats.get(rule.id)!;
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        timesTriggered: stats.timesTriggered,
        avgPriceChange: stats.timesTriggered > 0
          ? Math.round((stats.totalPriceChange / stats.timesTriggered) * 100) / 100
          : 0,
        avgConfidence: stats.timesTriggered > 0
          ? Math.round((stats.totalConfidence / stats.timesTriggered) * 100) / 100
          : 0,
      };
    });

    log.info({
      type: 'backtest_complete',
      listingsAnalyzed: listings.length,
      priceChangesSimulated: simulatedChanges.length,
    });

    return {
      period: { start: input.startDate, end: input.endDate },
      rulesEvaluated: rules.length,
      listingsAnalyzed: listings.length,
      priceChangesSimulated: simulatedChanges.length,
      summary: {
        avgPriceChange: Math.round(avgPriceChange * 100) / 100,
        avgMarginImpact: 0,
        profitableChanges,
        unprofitableChanges,
        blockedByCircuitBreaker: blockedCount,
      },
      byRule,
      riskAnalysis,
    };
  }

  /**
   * 出品日数を計算
   */
  private getDaysListed(createdAt: Date): number {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * 影響を予測
   */
  private estimateImpact(
    currentPrice: number,
    newPrice: number,
    cost: number
  ): SimulationResult['estimatedImpact'] {
    const priceDiff = newPrice - currentPrice;
    const priceChangePercent = currentPrice > 0 ? (priceDiff / currentPrice) * 100 : 0;

    const elasticity = -1.5;
    const salesVelocityChange = -priceChangePercent * elasticity / 100;

    const currentMargin = currentPrice - cost;
    const newMargin = newPrice - cost;
    const marginChange = newMargin - currentMargin;

    const revenueChange = (1 + salesVelocityChange) * newMargin - currentMargin;

    return {
      salesVelocityChange: Math.round(salesVelocityChange * 100) / 100,
      marginChange: Math.round(marginChange * 100) / 100,
      revenueChange: Math.round(revenueChange * 100) / 100,
    };
  }

  /**
   * リスクメトリクスを計算
   */
  private calculateRiskMetrics(priceChanges: number[]): BacktestResult['riskAnalysis'] {
    if (priceChanges.length === 0) {
      return { maxDrawdown: 0, volatility: 0, sharpeRatio: 0 };
    }

    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const change of priceChanges) {
      cumulative += change;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const mean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const variance = priceChanges.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / priceChanges.length;
    const volatility = Math.sqrt(variance);

    const sharpeRatio = volatility > 0 ? mean / volatility : 0;

    return {
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  }
}

// シングルトンインスタンス
export const pricingSimulation = new PricingSimulation();

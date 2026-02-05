/**
 * 価格変更承認ワークフロー（Phase 28）
 *
 * 推奨価格の承認/却下/自動処理を管理
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { PriceRecommendationStatus, RecommendationReason, ImpactEstimate } from '@rakuda/schema';
import { pricingCircuitBreaker } from './circuit-breaker';
import { priceHistoryService } from './price-history';
import { eventBus } from '../event-bus';

const log = logger.child({ module: 'ApprovalWorkflow' });

export interface ApprovalConfig {
  autoApproveThreshold: number;       // 自動承認の閾値（変動率%）
  requireApprovalAbove: number;       // 承認必須の閾値（金額）
  expirationHours: number;            // 推奨の有効期限（時間）
  autoRejectOnExpiry: boolean;        // 期限切れ時に自動却下
}

export interface CreateRecommendationInput {
  listingId: string;
  productId?: string;
  currentPrice: number;
  recommendedPrice: number;
  minPrice?: number;
  maxPrice?: number;
  confidence: number;
  reason: RecommendationReason;
  impact?: ImpactEstimate;
  ruleId?: string;
}

const DEFAULT_CONFIG: ApprovalConfig = {
  autoApproveThreshold: 5,
  requireApprovalAbove: 50,
  expirationHours: 24,
  autoRejectOnExpiry: true,
};

class ApprovalWorkflow {
  private config: ApprovalConfig;

  constructor(config?: Partial<ApprovalConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ApprovalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 価格推奨を作成
   */
  async createRecommendation(
    input: CreateRecommendationInput
  ): Promise<{
    id: string;
    status: PriceRecommendationStatus;
    autoApproved: boolean;
  }> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.expirationHours);

    // 自動承認の判定
    const changePercent = Math.abs(
      ((input.recommendedPrice - input.currentPrice) / input.currentPrice) * 100
    );
    const shouldAutoApprove = this.shouldAutoApprove(
      changePercent,
      input.recommendedPrice,
      input.confidence
    );

    const status: PriceRecommendationStatus = shouldAutoApprove ? 'APPROVED' : 'PENDING';

    const recommendation = await prisma.priceRecommendation.create({
      data: {
        listingId: input.listingId,
        productId: input.productId,
        currentPrice: input.currentPrice,
        recommendedPrice: input.recommendedPrice,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        confidence: input.confidence,
        reason: JSON.parse(JSON.stringify(input.reason)),
        impact: input.impact ? JSON.parse(JSON.stringify(input.impact)) : undefined,
        ruleId: input.ruleId,
        status,
        expiresAt,
        approvedAt: shouldAutoApprove ? new Date() : undefined,
      },
    });

    log.info({
      type: 'recommendation_created',
      id: recommendation.id,
      listingId: input.listingId,
      currentPrice: input.currentPrice,
      recommendedPrice: input.recommendedPrice,
      changePercent,
      autoApproved: shouldAutoApprove,
    });

    // 自動承認の場合、適用キューに追加
    if (shouldAutoApprove) {
      // Phase 27のリアルタイムイベント発火
      if (eventBus.initialized) {
        await eventBus.publishPriceChange(input.listingId, {
          recommendationId: recommendation.id,
          oldPrice: input.currentPrice,
          newPrice: input.recommendedPrice,
          status: 'auto_approved',
        });
      }
    }

    return {
      id: recommendation.id,
      status,
      autoApproved: shouldAutoApprove,
    };
  }

  /**
   * 自動承認の判定
   */
  private shouldAutoApprove(
    changePercent: number,
    newPrice: number,
    confidence: number
  ): boolean {
    // 変動が閾値以下
    if (changePercent > this.config.autoApproveThreshold) {
      return false;
    }

    // 金額が閾値以上は手動承認必須
    if (newPrice >= this.config.requireApprovalAbove) {
      return false;
    }

    // 信頼度が低い場合は手動承認
    if (confidence < 0.7) {
      return false;
    }

    return true;
  }

  /**
   * 推奨を承認
   */
  async approve(
    recommendationId: string,
    approvedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    const recommendation = await prisma.priceRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return { success: false, message: 'Recommendation not found' };
    }

    if (recommendation.status !== 'PENDING' && recommendation.status !== 'APPROVED') {
      return { success: false, message: `Cannot approve recommendation with status: ${recommendation.status}` };
    }

    if (new Date() > recommendation.expiresAt) {
      await this.markExpired(recommendationId);
      return { success: false, message: 'Recommendation has expired' };
    }

    await prisma.priceRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    log.info({
      type: 'recommendation_approved',
      id: recommendationId,
      approvedBy,
    });

    return { success: true, message: 'Recommendation approved' };
  }

  /**
   * 推奨を却下
   */
  async reject(
    recommendationId: string,
    reason: string,
    rejectedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    const recommendation = await prisma.priceRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return { success: false, message: 'Recommendation not found' };
    }

    if (recommendation.status !== 'PENDING') {
      return { success: false, message: `Cannot reject recommendation with status: ${recommendation.status}` };
    }

    await prisma.priceRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });

    log.info({
      type: 'recommendation_rejected',
      id: recommendationId,
      reason,
      rejectedBy,
    });

    return { success: true, message: 'Recommendation rejected' };
  }

  /**
   * 推奨を適用（実際の価格変更）
   */
  async apply(
    recommendationId: string
  ): Promise<{ success: boolean; message: string; newPrice?: number }> {
    const recommendation = await prisma.priceRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return { success: false, message: 'Recommendation not found' };
    }

    if (recommendation.status !== 'APPROVED') {
      return { success: false, message: `Cannot apply recommendation with status: ${recommendation.status}` };
    }

    // 出品情報を取得
    const listing = await prisma.listing.findUnique({
      where: { id: recommendation.listingId },
    });

    if (!listing) {
      return { success: false, message: 'Listing not found' };
    }

    // サーキットブレーカーチェック
    const circuitCheck = await pricingCircuitBreaker.canApply(
      recommendation.listingId,
      listing.listingPrice,
      recommendation.recommendedPrice
    );

    if (!circuitCheck.allowed) {
      log.warn({
        type: 'apply_blocked_by_circuit_breaker',
        recommendationId,
        reason: circuitCheck.reason,
      });
      return { success: false, message: circuitCheck.reason || 'Blocked by circuit breaker' };
    }

    // 価格を更新
    const oldPrice = listing.listingPrice;
    const newPrice = recommendation.recommendedPrice;

    await prisma.listing.update({
      where: { id: recommendation.listingId },
      data: { listingPrice: newPrice },
    });

    // 推奨ステータスを更新
    await prisma.priceRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });

    // 履歴を記録
    await priceHistoryService.recordPrice(
      recommendation.listingId,
      newPrice,
      'rule',
      { recommendationId, ruleId: recommendation.ruleId }
    );

    await priceHistoryService.logPriceChange(
      recommendation.listingId,
      oldPrice,
      newPrice,
      'rule',
      {
        recommendationId,
        ruleId: recommendation.ruleId ?? undefined,
        reason: 'Price recommendation applied',
      }
    );

    // サーキットブレーカーに記録
    await pricingCircuitBreaker.recordChange(
      recommendation.listingId,
      oldPrice,
      newPrice
    );

    // リアルタイムイベント発火
    if (eventBus.initialized) {
      await eventBus.publishPriceChange(recommendation.listingId, {
        recommendationId,
        oldPrice,
        newPrice,
        status: 'applied',
      });
    }

    log.info({
      type: 'recommendation_applied',
      recommendationId,
      listingId: recommendation.listingId,
      oldPrice,
      newPrice,
    });

    return { success: true, message: 'Price updated successfully', newPrice };
  }

  /**
   * 期限切れをマーク
   */
  private async markExpired(recommendationId: string): Promise<void> {
    await prisma.priceRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'EXPIRED' },
    });
  }

  /**
   * 期限切れ推奨の自動処理
   */
  async processExpired(): Promise<{ expired: number }> {
    const now = new Date();

    const expired = await prisma.priceRecommendation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: {
        status: this.config.autoRejectOnExpiry ? 'EXPIRED' : 'CANCELLED',
      },
    });

    if (expired.count > 0) {
      log.info({
        type: 'expired_recommendations_processed',
        count: expired.count,
      });
    }

    return { expired: expired.count };
  }

  /**
   * 承認済み推奨の自動適用
   */
  async processApproved(): Promise<{ applied: number; failed: number }> {
    const approved = await prisma.priceRecommendation.findMany({
      where: {
        status: 'APPROVED',
        appliedAt: null,
        expiresAt: { gt: new Date() },
      },
      take: 10, // バッチサイズ
      orderBy: { createdAt: 'asc' },
    });

    let applied = 0;
    let failed = 0;

    for (const recommendation of approved) {
      const result = await this.apply(recommendation.id);
      if (result.success) {
        applied++;
      } else {
        failed++;
        log.warn({
          type: 'auto_apply_failed',
          recommendationId: recommendation.id,
          reason: result.message,
        });
      }
    }

    return { applied, failed };
  }

  /**
   * 一括承認
   */
  async bulkApprove(
    recommendationIds: string[],
    approvedBy?: string
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const id of recommendationIds) {
      const result = await this.approve(id, approvedBy);
      if (result.success) {
        approved++;
      } else {
        failed++;
      }
    }

    return { approved, failed };
  }

  /**
   * 保留中の推奨を取得
   */
  async getPendingRecommendations(options?: {
    listingId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: string;
    listingId: string;
    currentPrice: number;
    recommendedPrice: number;
    changePercent: number;
    confidence: number;
    reason: RecommendationReason;
    impact: ImpactEstimate | null;
    expiresAt: Date;
    createdAt: Date;
  }>> {
    const recommendations = await prisma.priceRecommendation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        ...(options?.listingId ? { listingId: options.listingId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return recommendations.map(r => ({
      id: r.id,
      listingId: r.listingId,
      currentPrice: r.currentPrice,
      recommendedPrice: r.recommendedPrice,
      changePercent: ((r.recommendedPrice - r.currentPrice) / r.currentPrice) * 100,
      confidence: r.confidence,
      reason: r.reason as RecommendationReason,
      impact: r.impact as ImpactEstimate | null,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 推奨の統計を取得
   */
  async getStats(days: number = 7): Promise<{
    total: number;
    pending: number;
    approved: number;
    applied: number;
    rejected: number;
    expired: number;
    avgChangePercent: number;
    autoApproveRate: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [counts, allRecs] = await Promise.all([
      prisma.priceRecommendation.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: since } },
        select: {
          currentPrice: true,
          recommendedPrice: true,
          approvedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach(c => {
      statusCounts[c.status] = c._count;
    });

    const total = allRecs.length;
    const autoApproved = allRecs.filter(r => {
      if (!r.approvedAt) return false;
      const diff = r.approvedAt.getTime() - r.createdAt.getTime();
      return diff < 1000; // 1秒以内に承認 = 自動承認
    }).length;

    const avgChangePercent = total > 0
      ? allRecs.reduce((sum, r) => {
          const change = ((r.recommendedPrice - r.currentPrice) / r.currentPrice) * 100;
          return sum + Math.abs(change);
        }, 0) / total
      : 0;

    return {
      total,
      pending: statusCounts['PENDING'] || 0,
      approved: statusCounts['APPROVED'] || 0,
      applied: statusCounts['APPLIED'] || 0,
      rejected: statusCounts['REJECTED'] || 0,
      expired: statusCounts['EXPIRED'] || 0,
      avgChangePercent: Math.round(avgChangePercent * 100) / 100,
      autoApproveRate: total > 0 ? Math.round((autoApproved / total) * 100) : 0,
    };
  }
}

// 環境変数から設定を読み込む
function loadConfigFromEnv(): Partial<ApprovalConfig> {
  return {
    autoApproveThreshold: process.env.PRICING_AUTO_APPROVE_THRESHOLD
      ? parseInt(process.env.PRICING_AUTO_APPROVE_THRESHOLD, 10)
      : undefined,
    expirationHours: process.env.PRICING_RECOMMENDATION_EXPIRY_HOURS
      ? parseInt(process.env.PRICING_RECOMMENDATION_EXPIRY_HOURS, 10)
      : undefined,
  };
}

// シングルトンインスタンス
export const approvalWorkflow = new ApprovalWorkflow(loadConfigFromEnv());

/**
 * 価格最適化ワーカー（Phase 28）
 *
 * 価格推奨の生成、承認処理、自動適用を行う
 */

import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { pricingRuleEngine, PricingContext, PricingRule } from '../lib/pricing/rule-engine';
import { approvalWorkflow } from '../lib/pricing/approval-workflow';
import { eventBus } from '../lib/event-bus';
import { processPriceSyncJob, PriceSyncJobPayload } from './price-sync';

const log = logger.child({ processor: 'pricing' });

export interface PricingJobData {
  type: 'evaluate' | 'apply' | 'process_expired' | 'process_approved' | 'price-sync';
  listingId?: string;
  listingIds?: string[];
  ruleIds?: string[];
  recommendationId?: string;
  // price-sync用のパラメータ
  marketplace?: 'joom' | 'ebay';
  forceUpdate?: boolean;
  maxListings?: number;
  priceChangeThreshold?: number;
}

export interface PricingJobResult {
  success: boolean;
  processedCount?: number;
  recommendations?: number;
  applied?: number;
  failed?: number;
  errors?: string[];
}

/**
 * 価格最適化ジョブのプロセッサ
 */
export async function pricingProcessor(job: Job<PricingJobData>): Promise<PricingJobResult> {
  const { type } = job.data;

  log.info({
    type: 'pricing_job_start',
    jobId: job.id,
    jobType: type,
  });

  try {
    switch (type) {
      case 'evaluate':
        return await evaluatePricing(job.data);
      case 'apply':
        return await applyRecommendation(job.data);
      case 'process_expired':
        return await processExpiredRecommendations();
      case 'process_approved':
        return await processApprovedRecommendations();
      case 'price-sync':
        // 為替レート変動に基づく価格同期
        const syncPayload: PriceSyncJobPayload = {
          marketplace: job.data.marketplace,
          forceUpdate: job.data.forceUpdate,
          maxListings: job.data.maxListings,
          priceChangeThreshold: job.data.priceChangeThreshold,
        };
        const syncResult = await processPriceSyncJob({ ...job, data: syncPayload } as Job<PriceSyncJobPayload>);
        return {
          success: syncResult.success,
          processedCount: syncResult.summary.totalProcessed,
          applied: syncResult.summary.totalUpdated,
          failed: syncResult.summary.totalErrors,
        };
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    log.error({
      type: 'pricing_job_error',
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 価格評価ジョブ
 */
async function evaluatePricing(data: PricingJobData): Promise<PricingJobResult> {
  const listingIds = data.listingIds || (data.listingId ? [data.listingId] : []);

  if (listingIds.length === 0) {
    // 全アクティブリスティングを評価
    const activeListings = await prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
      take: 100, // バッチサイズ
    });
    listingIds.push(...activeListings.map(l => l.id));
  }

  // アクティブルールを取得
  const dbRules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
      ...(data.ruleIds?.length ? { id: { in: data.ruleIds } } : {}),
    },
    orderBy: { priority: 'desc' },
  });

  if (dbRules.length === 0) {
    log.info({ type: 'no_active_rules' });
    return { success: true, processedCount: 0, recommendations: 0 };
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

  let processedCount = 0;
  let recommendationsCreated = 0;
  const errors: string[] = [];

  for (const listingId of listingIds) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { product: true },
      });

      if (!listing) continue;

      // 競合価格を取得
      const latestCompetitor = await prisma.competitorPriceLog.findFirst({
        where: { listingId },
        orderBy: { recordedAt: 'desc' },
      });

      const costPrice = listing.product?.price || 0;

      // コンテキストを作成
      const context: PricingContext = {
        listingId,
        productId: listing.productId || undefined,
        currentPrice: listing.listingPrice,
        costPrice,
        competitorPrice: latestCompetitor?.price,
        daysListed: Math.floor((Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        salesVelocity: 0.3, // TODO: 実際の販売速度
        marketplace: listing.marketplace,
      };

      // ルールエンジンで評価
      const result = await pricingRuleEngine.evaluate(context, rules);

      if (result && result.matched && result.recommendedPrice !== null) {
        // 推奨を作成
        const recommendation = await approvalWorkflow.createRecommendation({
          listingId,
          productId: listing.productId || undefined,
          currentPrice: listing.listingPrice,
          recommendedPrice: result.recommendedPrice,
          confidence: result.confidence,
          reason: result.reason,
          ruleId: result.ruleId,
        });

        recommendationsCreated++;

        log.info({
          type: 'recommendation_created',
          listingId,
          recommendationId: recommendation.id,
          autoApproved: recommendation.autoApproved,
        });
      }

      processedCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${listingId}: ${msg}`);
      log.warn({ type: 'evaluate_error', listingId, error: msg });
    }
  }

  return {
    success: true,
    processedCount,
    recommendations: recommendationsCreated,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 推奨適用ジョブ
 */
async function applyRecommendation(data: PricingJobData): Promise<PricingJobResult> {
  if (!data.recommendationId) {
    throw new Error('recommendationId is required');
  }

  const result = await approvalWorkflow.apply(data.recommendationId);

  if (result.success && result.newPrice) {
    // イベント発火
    const recommendation = await prisma.priceRecommendation.findUnique({
      where: { id: data.recommendationId },
    });

    if (recommendation && eventBus.initialized) {
      await eventBus.publishPriceChange(recommendation.listingId, {
        recommendationId: data.recommendationId,
        oldPrice: recommendation.currentPrice,
        newPrice: result.newPrice,
        status: 'applied',
      });
    }
  }

  return {
    success: result.success,
    applied: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    errors: result.success ? undefined : [result.message],
  };
}

/**
 * 期限切れ推奨の処理
 */
async function processExpiredRecommendations(): Promise<PricingJobResult> {
  const result = await approvalWorkflow.processExpired();

  log.info({
    type: 'expired_processed',
    count: result.expired,
  });

  return {
    success: true,
    processedCount: result.expired,
  };
}

/**
 * 承認済み推奨の自動適用
 */
async function processApprovedRecommendations(): Promise<PricingJobResult> {
  const result = await approvalWorkflow.processApproved();

  log.info({
    type: 'approved_processed',
    applied: result.applied,
    failed: result.failed,
  });

  return {
    success: true,
    applied: result.applied,
    failed: result.failed,
  };
}

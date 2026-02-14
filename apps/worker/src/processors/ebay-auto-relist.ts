/**
 * Phase 105-C: eBay自動再出品ワーカー
 */

import { Job } from 'bullmq';
import { prisma, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ processor: 'ebay-auto-relist' });

export interface EbayAutoRelistJobPayload {
  configId?: string;
  scheduledAt?: string;
  forceRun?: boolean;
  limit?: number;
}

export interface EbayAutoRelistJobResult {
  success: boolean;
  message: string;
  summary: {
    totalEnded: number;
    totalEligible: number;
    totalRelisted: number;
    totalSkipped: number;
    totalErrors: number;
    priceAdjustment: number;
  };
  relisted: Array<{
    listingId: string;
    productTitle: string;
    oldPrice: number;
    newPrice: number;
    relistCount: number;
    status: 'relisted' | 'skipped' | 'error';
    reason?: string;
  }>;
  timestamp: string;
}

/**
 * eBay自動再出品プロセッサー
 *
 * - 終了した出品を自動的に再出品
 * - 設定に基づく価格調整
 * - 再出品回数の管理
 * - カテゴリ・ブランド除外
 */
export async function processEbayAutoRelistJob(
  job: Job<EbayAutoRelistJobPayload>
): Promise<EbayAutoRelistJobResult> {
  const { limit = 50, forceRun = false } = job.data;

  log.info({
    type: 'auto_relist_start',
    jobId: job.id,
    limit,
    forceRun,
  });

  const timestamp = new Date().toISOString();

  try {
    // 設定を取得
    const config = await prisma.ebayAutoRelistConfig.findFirst();

    if (!config) {
      log.warn({ type: 'no_config' });
      return {
        success: false,
        message: 'No auto-relist configuration found',
        summary: {
          totalEnded: 0,
          totalEligible: 0,
          totalRelisted: 0,
          totalSkipped: 0,
          totalErrors: 0,
          priceAdjustment: 0,
        },
        relisted: [],
        timestamp,
      };
    }

    // 有効でない場合はスキップ（forceRunでない限り）
    if (!config.enabled && !forceRun) {
      log.info({ type: 'disabled' });
      return {
        success: true,
        message: 'Auto-relist is disabled',
        summary: {
          totalEnded: 0,
          totalEligible: 0,
          totalRelisted: 0,
          totalSkipped: 0,
          totalErrors: 0,
          priceAdjustment: config.priceAdjustment,
        },
        relisted: [],
        timestamp,
      };
    }

    // 終了した出品を取得
    const endedListings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        status: 'ENDED',
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category: true,
            brand: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    log.info({
      type: 'ended_listings_found',
      count: endedListings.length,
    });

    if (endedListings.length === 0) {
      return {
        success: true,
        message: 'No ended listings to relist',
        summary: {
          totalEnded: 0,
          totalEligible: 0,
          totalRelisted: 0,
          totalSkipped: 0,
          totalErrors: 0,
          priceAdjustment: config.priceAdjustment,
        },
        relisted: [],
        timestamp,
      };
    }

    // フィルタリングと再出品処理
    const relisted: EbayAutoRelistJobResult['relisted'] = [];
    let totalRelisted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const listing of endedListings) {
      const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
      const currentRelistCount = (marketplaceData.relistCount as number) || 0;

      // 再出品回数チェック
      if (currentRelistCount >= config.maxRelistCount) {
        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice: listing.listingPrice,
          relistCount: currentRelistCount,
          status: 'skipped',
          reason: `Max relist count reached (${currentRelistCount}/${config.maxRelistCount})`,
        });
        totalSkipped++;
        continue;
      }

      // カテゴリ除外チェック
      if (
        config.excludeCategories.length > 0 &&
        listing.product?.category &&
        config.excludeCategories.includes(listing.product.category)
      ) {
        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice: listing.listingPrice,
          relistCount: currentRelistCount,
          status: 'skipped',
          reason: `Category excluded: ${listing.product.category}`,
        });
        totalSkipped++;
        continue;
      }

      // ブランド除外チェック
      if (
        config.excludeBrands.length > 0 &&
        listing.product?.brand &&
        config.excludeBrands.includes(listing.product.brand)
      ) {
        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice: listing.listingPrice,
          relistCount: currentRelistCount,
          status: 'skipped',
          reason: `Brand excluded: ${listing.product.brand}`,
        });
        totalSkipped++;
        continue;
      }

      // 新価格を計算
      const newPrice = Math.max(
        0.01,
        Math.round(listing.listingPrice * (1 + config.priceAdjustment / 100) * 100) / 100
      );

      // 最低価格チェック
      if (config.minPrice !== null && newPrice < config.minPrice) {
        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice,
          relistCount: currentRelistCount,
          status: 'skipped',
          reason: `Below minimum price: $${newPrice} < $${config.minPrice}`,
        });
        totalSkipped++;
        continue;
      }

      // 再出品処理
      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'DRAFT',
            listingPrice: newPrice,
            listedAt: null,
            marketplaceData: {
              ...marketplaceData,
              relistCount: currentRelistCount + 1,
              relistedAt: new Date().toISOString(),
              previousPrice: listing.listingPrice,
              autoRelisted: true,
            },
          },
        });

        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice,
          relistCount: currentRelistCount + 1,
          status: 'relisted',
        });
        totalRelisted++;

        log.info({
          type: 'listing_relisted',
          listingId: listing.id,
          oldPrice: listing.listingPrice,
          newPrice,
          relistCount: currentRelistCount + 1,
        });
      } catch (error: any) {
        relisted.push({
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice,
          relistCount: currentRelistCount,
          status: 'error',
          reason: error.message,
        });
        totalErrors++;

        log.error({
          type: 'relist_error',
          listingId: listing.id,
          error: error.message,
        });
      }

      // ジョブ進捗を更新
      await job.updateProgress({
        processed: relisted.length,
        total: endedListings.length,
      });
    }

    const summary = {
      totalEnded: endedListings.length,
      totalEligible: endedListings.length,
      totalRelisted,
      totalSkipped,
      totalErrors,
      priceAdjustment: config.priceAdjustment,
    };

    log.info({
      type: 'auto_relist_complete',
      ...summary,
    });

    return {
      success: true,
      message: `Auto-relist completed: ${totalRelisted} relisted, ${totalSkipped} skipped, ${totalErrors} errors`,
      summary,
      relisted: relisted.slice(0, 100), // 最大100件まで返す
      timestamp,
    };
  } catch (error: any) {
    log.error({
      type: 'auto_relist_failed',
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}

/**
 * スケジュール実行用のチェック関数
 * 現在の曜日・時刻が設定と一致するかチェック
 */
export async function shouldRunAutoRelist(): Promise<boolean> {
  const config = await prisma.ebayAutoRelistConfig.findFirst();

  if (!config || !config.enabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay() || 7; // 日曜=0を7に変換

  // 時刻チェック
  if (currentHour !== config.runHour) {
    return false;
  }

  // 曜日チェック
  if (!config.runDays.includes(currentDay)) {
    return false;
  }

  return true;
}

import { Job } from 'bullmq';
import { prisma, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { calculatePrice } from '../lib/price-calculator';

const log = logger.child({ processor: 'price-sync' });

export interface PriceSyncJobPayload {
  marketplace?: 'joom' | 'ebay';
  forceUpdate?: boolean;
  maxListings?: number;
  priceChangeThreshold?: number; // 価格変更の閾値（%）
}

export interface PriceSyncJobResult {
  success: boolean;
  message: string;
  summary: {
    totalProcessed: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
    averagePriceChange: number;
  };
  updates: Array<{
    listingId: string;
    productTitle: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    status: 'updated' | 'skipped' | 'error';
    reason?: string;
  }>;
  timestamp: string;
}

/**
 * 価格同期プロセッサー
 *
 * - 為替レート変動時に出品価格を自動更新
 * - カテゴリ別の価格設定を反映
 * - 価格変更履歴を記録
 */
export async function processPriceSyncJob(
  job: Job<PriceSyncJobPayload>
): Promise<PriceSyncJobResult> {
  const {
    marketplace,
    forceUpdate = false,
    maxListings = 100,
    priceChangeThreshold = 2, // デフォルト: 2%以上の変動で更新
  } = job.data;

  log.info({
    type: 'price_sync_start',
    jobId: job.id,
    marketplace,
    forceUpdate,
    maxListings,
  });

  const updates: PriceSyncJobResult['updates'] = [];
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let sumPriceChange = 0;

  try {
    // アクティブな出品を取得
    const whereClause: any = {
      status: 'ACTIVE',
    };

    if (marketplace) {
      whereClause.marketplace = marketplace.toUpperCase() as Marketplace;
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: {
        product: true,
      },
      take: maxListings,
      orderBy: { updatedAt: 'asc' }, // 古いものから更新
    });

    log.info({
      type: 'price_sync_listings_found',
      count: listings.length,
    });

    for (const listing of listings) {
      const product = listing.product;

      if (!product) {
        updates.push({
          listingId: listing.id,
          productTitle: 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice: listing.listingPrice,
          changePercent: 0,
          status: 'error',
          reason: 'Product not found',
        });
        totalErrors++;
        continue;
      }

      try {
        // 新しい価格を計算
        const priceResult = await calculatePrice({
          sourcePrice: product.price,
          weight: product.weight || 200,
          category: product.category || undefined,
          marketplace: listing.marketplace.toLowerCase() as 'joom' | 'ebay',
        });

        const oldPrice = listing.listingPrice;
        const newPrice = priceResult.listingPrice;
        const changePercent = oldPrice > 0
          ? ((newPrice - oldPrice) / oldPrice) * 100
          : 0;
        const absChangePercent = Math.abs(changePercent);

        // 価格変更が閾値を超えているか、強制更新の場合
        if (forceUpdate || absChangePercent >= priceChangeThreshold) {
          // 価格を更新
          await prisma.$transaction([
            prisma.listing.update({
              where: { id: listing.id },
              data: {
                listingPrice: newPrice,
                shippingCost: priceResult.shippingCost,
              },
            }),
            prisma.priceChangeLog.create({
              data: {
                listingId: listing.id,
                oldPrice,
                newPrice,
                currency: listing.currency || 'USD',
                changePercent,
                source: 'auto_sync',
                reason: `Exchange rate sync (threshold: ${priceChangeThreshold}%, rate: ${priceResult.breakdown.exchangeRate.toFixed(6)})`,
              },
            }),
          ]);

          updates.push({
            listingId: listing.id,
            productTitle: product.titleEn || product.title || 'Unknown',
            oldPrice,
            newPrice,
            changePercent: Math.round(changePercent * 100) / 100,
            status: 'updated',
          });

          totalUpdated++;
          sumPriceChange += absChangePercent;

          log.info({
            type: 'price_updated',
            listingId: listing.id,
            oldPrice,
            newPrice,
            changePercent: changePercent.toFixed(2),
          });
        } else {
          updates.push({
            listingId: listing.id,
            productTitle: product.titleEn || product.title || 'Unknown',
            oldPrice,
            newPrice,
            changePercent: Math.round(changePercent * 100) / 100,
            status: 'skipped',
            reason: `Change ${absChangePercent.toFixed(2)}% below threshold ${priceChangeThreshold}%`,
          });

          totalSkipped++;
        }
      } catch (error: any) {
        updates.push({
          listingId: listing.id,
          productTitle: product.titleEn || product.title || 'Unknown',
          oldPrice: listing.listingPrice,
          newPrice: listing.listingPrice,
          changePercent: 0,
          status: 'error',
          reason: error.message,
        });

        totalErrors++;

        log.error({
          type: 'price_sync_error',
          listingId: listing.id,
          error: error.message,
        });
      }
    }

    const totalProcessed = listings.length;
    const averagePriceChange = totalUpdated > 0
      ? Math.round((sumPriceChange / totalUpdated) * 100) / 100
      : 0;

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `price-sync-${Date.now()}`,
        queueName: 'pricing',
        jobType: 'PRICE_SYNC',
        status: 'COMPLETED',
        result: {
          totalProcessed,
          totalUpdated,
          totalSkipped,
          totalErrors,
          averagePriceChange,
          hasErrors: totalErrors > 0,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'price_sync_complete',
      totalProcessed,
      totalUpdated,
      totalSkipped,
      totalErrors,
      averagePriceChange,
    });

    return {
      success: true,
      message: `Price sync completed: ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`,
      summary: {
        totalProcessed,
        totalUpdated,
        totalSkipped,
        totalErrors,
        averagePriceChange,
      },
      updates: updates.slice(0, 50), // レスポンスサイズ制限
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'price_sync_fatal_error',
      error: error.message,
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `price-sync-${Date.now()}`,
        queueName: 'pricing',
        jobType: 'PRICE_SYNC',
        status: 'FAILED',
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * 単一出品の価格を再計算
 */
export async function recalculateListingPrice(listingId: string): Promise<{
  success: boolean;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
}> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: true },
  });

  if (!listing || !listing.product) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  const priceResult = await calculatePrice({
    sourcePrice: listing.product.price,
    weight: listing.product.weight || 200,
    category: listing.product.category || undefined,
    marketplace: listing.marketplace.toLowerCase() as 'joom' | 'ebay',
  });

  const oldPrice = listing.listingPrice;
  const newPrice = priceResult.listingPrice;
  const changePercent = oldPrice > 0
    ? ((newPrice - oldPrice) / oldPrice) * 100
    : 0;

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: {
        listingPrice: newPrice,
        shippingCost: priceResult.shippingCost,
      },
    }),
    prisma.priceChangeLog.create({
      data: {
        listingId,
        oldPrice,
        newPrice,
        currency: listing.currency || 'USD',
        changePercent,
        source: 'manual',
        reason: `Manual price recalculation (rate: ${priceResult.breakdown.exchangeRate.toFixed(6)})`,
      },
    }),
  ]);

  return {
    success: true,
    oldPrice,
    newPrice,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

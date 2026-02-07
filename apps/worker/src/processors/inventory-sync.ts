import { Job } from 'bullmq';
import { prisma, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { JoomApiClient } from '../lib/joom-api';

const log = logger.child({ processor: 'inventory-sync' });

// Joom APIクライアントのシングルトン
let joomClient: JoomApiClient | null = null;
function getJoomClient(): JoomApiClient {
  if (!joomClient) {
    joomClient = new JoomApiClient();
  }
  return joomClient;
}

export interface InventorySyncJobPayload {
  marketplace?: 'joom' | 'ebay';
  listingIds?: string[];         // 特定の出品のみ同期
  syncOutOfStock?: boolean;      // 在庫切れを同期するか
  maxListings?: number;
}

export interface InventorySyncJobResult {
  success: boolean;
  message: string;
  summary: {
    totalProcessed: number;
    totalSynced: number;
    totalSkipped: number;
    totalErrors: number;
  };
  updates: Array<{
    listingId: string;
    productTitle: string;
    localQuantity: number;
    marketplaceQuantity?: number;
    status: 'synced' | 'skipped' | 'error';
    reason?: string;
  }>;
  timestamp: string;
}

/**
 * Joom在庫同期プロセッサー
 *
 * RAKUDAの在庫情報をJoomに同期
 * - 在庫切れ商品は数量0に更新
 * - アクティブな商品は現在の在庫数を反映
 */
export async function processInventorySyncJob(
  job: Job<InventorySyncJobPayload>
): Promise<InventorySyncJobResult> {
  const {
    marketplace = 'joom',
    listingIds,
    syncOutOfStock = true,
    maxListings = 100,
  } = job.data;

  log.info({
    type: 'inventory_sync_start',
    jobId: job.id,
    marketplace,
    listingIds: listingIds?.length,
    maxListings,
  });

  const updates: InventorySyncJobResult['updates'] = [];
  let totalSynced = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    if (marketplace !== 'joom') {
      return {
        success: false,
        message: 'Only Joom marketplace is currently supported',
        summary: {
          totalProcessed: 0,
          totalSynced: 0,
          totalSkipped: 0,
          totalErrors: 0,
        },
        updates: [],
        timestamp: new Date().toISOString(),
      };
    }

    // 同期対象の出品を取得
    const whereClause: any = {
      marketplace: 'JOOM' as Marketplace,
      marketplaceListingId: { not: null },
    };

    if (listingIds && listingIds.length > 0) {
      whereClause.id = { in: listingIds };
    } else {
      // デフォルトはアクティブな出品
      whereClause.status = { in: ['ACTIVE', 'PENDING_PUBLISH'] };
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: {
        product: true,
      },
      take: maxListings,
      orderBy: { updatedAt: 'asc' },
    });

    log.info({
      type: 'inventory_sync_listings_found',
      count: listings.length,
    });

    const joom = getJoomClient();

    for (const listing of listings) {
      const product = listing.product;

      if (!product) {
        updates.push({
          listingId: listing.id,
          productTitle: 'Unknown',
          localQuantity: 0,
          status: 'error',
          reason: 'Product not found',
        });
        totalErrors++;
        continue;
      }

      try {
        // ローカルの在庫数（商品のステータスから判定）
        // 注: Productモデルにquantityフィールドはないため、ステータスで判定
        const isOutOfStock = product.status === 'OUT_OF_STOCK' || product.status === 'SOLD';
        const localQuantity = isOutOfStock ? 0 : 1; // 在庫あり=1、在庫なし=0

        // 在庫切れの同期をスキップする場合
        if (!syncOutOfStock && isOutOfStock) {
          updates.push({
            listingId: listing.id,
            productTitle: product.titleEn || product.title || 'Unknown',
            localQuantity,
            status: 'skipped',
            reason: 'Out of stock sync disabled',
          });
          totalSkipped++;
          continue;
        }

        // Joomに在庫を同期
        const marketplaceData = listing.marketplaceData as { sku?: string; variantSku?: string } | null;
        const sku = marketplaceData?.variantSku || marketplaceData?.sku || `${listing.marketplaceListingId}-V1`;

        const result = await joom.updateInventory(
          listing.marketplaceListingId!,
          sku,
          localQuantity
        );

        if (result.success) {
          updates.push({
            listingId: listing.id,
            productTitle: product.titleEn || product.title || 'Unknown',
            localQuantity,
            status: 'synced',
          });
          totalSynced++;

          log.info({
            type: 'inventory_synced',
            listingId: listing.id,
            localQuantity,
          });
        } else {
          updates.push({
            listingId: listing.id,
            productTitle: product.titleEn || product.title || 'Unknown',
            localQuantity,
            status: 'error',
            reason: result.error?.message || 'API error',
          });
          totalErrors++;
        }
      } catch (error: any) {
        updates.push({
          listingId: listing.id,
          productTitle: product.titleEn || product.title || 'Unknown',
          localQuantity: 0,
          status: 'error',
          reason: error.message,
        });
        totalErrors++;

        log.error({
          type: 'inventory_sync_error',
          listingId: listing.id,
          error: error.message,
        });
      }
    }

    const totalProcessed = listings.length;

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `inventory-sync-${Date.now()}`,
        queueName: 'inventory',
        jobType: 'INVENTORY_SYNC',
        status: 'COMPLETED',
        result: {
          totalProcessed,
          totalSynced,
          totalSkipped,
          totalErrors,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'inventory_sync_complete',
      totalProcessed,
      totalSynced,
      totalSkipped,
      totalErrors,
    });

    return {
      success: true,
      message: `Inventory sync completed: ${totalSynced} synced, ${totalSkipped} skipped, ${totalErrors} errors`,
      summary: {
        totalProcessed,
        totalSynced,
        totalSkipped,
        totalErrors,
      },
      updates: updates.slice(0, 50),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'inventory_sync_fatal_error',
      error: error.message,
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `inventory-sync-${Date.now()}`,
        queueName: 'inventory',
        jobType: 'INVENTORY_SYNC',
        status: 'FAILED',
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * 単一出品の在庫をJoomに同期
 */
export async function syncListingInventory(
  listingId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.marketplace !== 'JOOM' || !listing.marketplaceListingId) {
    return { success: false, error: 'Invalid listing or not a Joom listing' };
  }

  try {
    const joom = getJoomClient();
    const marketplaceData = listing.marketplaceData as { sku?: string; variantSku?: string } | null;
    const sku = marketplaceData?.variantSku || marketplaceData?.sku || `${listing.marketplaceListingId}-V1`;

    const result = await joom.updateInventory(
      listing.marketplaceListingId,
      sku,
      quantity
    );

    if (result.success) {
      log.info({
        type: 'single_inventory_synced',
        listingId,
        quantity,
      });
      return { success: true };
    } else {
      return { success: false, error: result.error?.message };
    }
  } catch (error: any) {
    log.error({
      type: 'single_inventory_sync_error',
      listingId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

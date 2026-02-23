/**
 * Phase 103: eBay出品ワーカープロセッサー
 * eBay Inventory APIを使用した出品をBullMQジョブとして非同期処理
 */
import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import type { EbayPublishJobData, EbayPublishJobType } from '@rakuda/queue';
import { ebayApi, mapConditionToEbay } from '../lib/ebay-api';

const log = logger.child({ module: 'ebay-publish-processor' });

// Re-export types for backward compatibility
export type { EbayPublishJobType, EbayPublishJobData };

/**
 * eBay出品ジョブプロセッサー
 */
export async function processEbayPublishJob(job: Job<EbayPublishJobData>): Promise<any> {
  const { type, listingId, batchId, listingIds, options } = job.data;

  log.info({
    type: 'job_start',
    jobId: job.id,
    jobType: type,
    listingId,
    batchId,
  });

  try {
    switch (type) {
      case 'create-inventory-item':
        return await processCreateInventoryItem(listingId!);

      case 'create-offer':
        return await processCreateOffer(listingId!);

      case 'publish-offer':
        return await processPublishOffer(listingId!);

      case 'batch-publish':
        return await processBatchPublish(batchId!, listingIds!);

      case 'end-listing':
        return await processEndListing(listingId!);

      case 'sync-status':
        return await processSyncStatus(listingId!);

      case 'price-sync':
        return await processPriceSync(options || {});

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error: any) {
    log.error({
      type: 'job_error',
      jobId: job.id,
      jobType: type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * eBayインベントリアイテム作成処理
 * Step 1: Inventory API で商品情報を登録
 */
async function processCreateInventoryItem(listingId: string): Promise<any> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      product: true,
    },
  });

  if (!listing || listing.marketplace !== 'EBAY') {
    throw new Error(`Listing not found or not eBay: ${listingId}`);
  }

  const product = listing.product;
  const marketplaceData = (listing.marketplaceData as any) || {};

  // SKU生成（既存があれば使用）
  const sku = marketplaceData.sku || `RAKUDA-${listing.id}`;

  // 画像URL取得（processedImagesを優先、なければimages）
  const allImages = product.processedImages.length > 0
    ? product.processedImages
    : product.images;
  const imageUrls = allImages.slice(0, 12); // eBayは最大12枚

  // インベントリアイテム作成
  const result = await ebayApi.createOrUpdateInventoryItem(sku, {
    title: marketplaceData.title || product.title,
    description: marketplaceData.description || product.description || '',
    aspects: marketplaceData.itemSpecifics,
    imageUrls,
    condition: mapConditionToEbay(product.condition ?? undefined),
    conditionDescription: product.condition ?? undefined,
  });

  if (!result.success) {
    // エラー時はステータスを更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ERROR',
        marketplaceData: {
          ...marketplaceData,
          sku,
          lastError: result.error?.message,
          lastErrorAt: new Date().toISOString(),
        },
      },
    });

    throw new Error(result.error?.message || 'Failed to create inventory item');
  }

  // 成功時はマーケットプレイスデータを更新
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      marketplaceData: {
        ...marketplaceData,
        sku,
        inventoryItemCreatedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'create_inventory_item_complete',
    listingId,
    sku,
  });

  return {
    listingId,
    sku,
    success: true,
  };
}

/**
 * eBayオファー作成処理
 * Step 2: Inventory API でオファーを作成
 */
async function processCreateOffer(listingId: string): Promise<any> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      product: true,
    },
  });

  if (!listing || listing.marketplace !== 'EBAY') {
    throw new Error(`Listing not found or not eBay: ${listingId}`);
  }

  const marketplaceData = (listing.marketplaceData as any) || {};
  const sku = marketplaceData.sku;

  if (!sku) {
    throw new Error('SKU not found. Run create-inventory-item first.');
  }

  // オファー作成
  const result = await ebayApi.createOffer(sku, {
    marketplaceId: marketplaceData.marketplaceId || 'EBAY_US',
    format: marketplaceData.format || 'FIXED_PRICE',
    categoryId: marketplaceData.categoryId || '',
    pricingPrice: listing.listingPrice,
    pricingCurrency: listing.currency || 'USD',
    quantity: marketplaceData.quantity || 1,
    listingDescription: marketplaceData.description || listing.product.description,
    fulfillmentPolicyId: marketplaceData.fulfillmentPolicyId,
    paymentPolicyId: marketplaceData.paymentPolicyId,
    returnPolicyId: marketplaceData.returnPolicyId,
  });

  if (!result.success || !result.data?.offerId) {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ERROR',
        marketplaceData: {
          ...marketplaceData,
          lastError: result.error?.message,
          lastErrorAt: new Date().toISOString(),
        },
      },
    });

    throw new Error(result.error?.message || 'Failed to create offer');
  }

  const offerId = result.data.offerId;

  // オファーID保存
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'PENDING_PUBLISH',
      marketplaceData: {
        ...marketplaceData,
        offerId,
        offerCreatedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'create_offer_complete',
    listingId,
    offerId,
  });

  return {
    listingId,
    offerId,
    success: true,
  };
}

/**
 * eBayオファー公開処理
 * Step 3: オファーを公開して出品
 */
async function processPublishOffer(listingId: string): Promise<any> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.marketplace !== 'EBAY') {
    throw new Error(`Listing not found or not eBay: ${listingId}`);
  }

  const marketplaceData = (listing.marketplaceData as any) || {};
  const offerId = marketplaceData.offerId;

  if (!offerId) {
    throw new Error('Offer ID not found. Run create-offer first.');
  }

  // オファー公開
  const result = await ebayApi.publishOffer(offerId);

  if (!result.success || !result.data?.listingId) {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ERROR',
        marketplaceData: {
          ...marketplaceData,
          lastError: result.error?.message,
          lastErrorAt: new Date().toISOString(),
        },
      },
    });

    throw new Error(result.error?.message || 'Failed to publish offer');
  }

  const ebayListingId = result.data.listingId;

  // 出品ID保存・ステータス更新
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'ACTIVE',
      marketplaceListingId: ebayListingId,
      listedAt: new Date(),
      marketplaceData: {
        ...marketplaceData,
        ebayListingId,
        listedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'publish_offer_complete',
    listingId,
    ebayListingId,
  });

  // Phase 44: 出品成功時のSlackアラート
  try {
    const { alertManager: slackAlertManager } = await import('../lib/slack-alert');
    await slackAlertManager.alertPublishSuccess(
      marketplaceData.title || listing.id,
      ebayListingId,
      listing.listingPrice
    );
  } catch (alertErr) {
    log.error({ type: 'failed_to_send_publish_alert', error: (alertErr as Error).message });
  }

  return {
    listingId,
    ebayListingId,
    success: true,
    ebayListingUrl: `https://www.ebay.com/itm/${ebayListingId}`,
  };
}

/**
 * バッチ出品処理
 */
async function processBatchPublish(batchId: string, listingIds: string[]): Promise<any> {
  log.info({
    type: 'batch_publish_start',
    batchId,
    total: listingIds.length,
  });

  const results: Array<{
    listingId: string;
    success: boolean;
    ebayListingId?: string;
    error?: string;
  }> = [];

  for (const listingId of listingIds) {
    try {
      // Step 1: インベントリアイテム作成
      await processCreateInventoryItem(listingId);

      // Step 2: オファー作成
      await processCreateOffer(listingId);

      // Step 3: オファー公開
      const publishResult = await processPublishOffer(listingId);

      results.push({
        listingId,
        success: true,
        ebayListingId: publishResult.ebayListingId,
      });
    } catch (error: any) {
      log.error({
        type: 'batch_publish_item_error',
        batchId,
        listingId,
        error: error.message,
      });

      results.push({
        listingId,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  log.info({
    type: 'batch_publish_complete',
    batchId,
    total: listingIds.length,
    success: successCount,
    failed: failedCount,
  });

  // Phase 44: バッチ完了時のSlackアラート
  try {
    const { alertManager: slackAlertManager } = await import('../lib/slack-alert');
    await slackAlertManager.alertBatchComplete(
      batchId,
      listingIds.length,
      successCount,
      failedCount
    );
  } catch (alertErr) {
    log.error({ type: 'failed_to_send_batch_alert', error: (alertErr as Error).message });
  }

  return {
    batchId,
    total: listingIds.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 出品終了処理
 */
async function processEndListing(listingId: string): Promise<any> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.marketplace !== 'EBAY') {
    throw new Error(`Listing not found or not eBay: ${listingId}`);
  }

  const marketplaceData = (listing.marketplaceData as any) || {};
  const offerId = marketplaceData.offerId;

  if (!offerId) {
    // オファーIDがない場合は既に終了済み扱い
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'ENDED' },
    });

    return {
      listingId,
      success: true,
      note: 'No offer ID found, marked as ended',
    };
  }

  // オファー取り下げ
  const result = await ebayApi.withdrawOffer(offerId);

  if (!result.success) {
    // エラーでも強制終了する場合がある
    log.warn({
      type: 'end_listing_api_error',
      listingId,
      error: result.error?.message,
    });
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'ENDED',
      marketplaceData: {
        ...marketplaceData,
        endedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'end_listing_complete',
    listingId,
  });

  return {
    listingId,
    success: true,
  };
}

/**
 * ステータス同期処理
 */
async function processSyncStatus(listingId: string): Promise<any> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.marketplace !== 'EBAY') {
    return { listingId, synced: false, reason: 'Not an eBay listing' };
  }

  const marketplaceData = (listing.marketplaceData as any) || {};
  const offerId = marketplaceData.offerId;

  if (!offerId) {
    return { listingId, synced: false, reason: 'No offer ID' };
  }

  // オファー情報を取得
  const result = await ebayApi.getOffer(offerId);

  if (!result.success || !result.data) {
    return {
      listingId,
      synced: false,
      reason: result.error?.message || 'Failed to get offer',
    };
  }

  const offerStatus = result.data.status;
  let newStatus = listing.status;

  // eBayステータスをRAKUDAステータスにマッピング
  if (offerStatus === 'PUBLISHED') {
    newStatus = 'ACTIVE';
  } else if (offerStatus === 'UNPUBLISHED') {
    newStatus = 'ENDED';
  } else if (offerStatus === 'PENDING') {
    newStatus = 'PENDING_PUBLISH';
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: newStatus as any,
      marketplaceData: {
        ...marketplaceData,
        ebayOfferStatus: offerStatus,
        lastSyncedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'sync_status_complete',
    listingId,
    ebayOfferStatus: offerStatus,
    newStatus,
  });

  return {
    listingId,
    synced: true,
    ebayOfferStatus: offerStatus,
    newStatus,
  };
}

/**
 * 完全ワークフロー処理（インベントリ→オファー→公開）
 */
export async function processFullEbayWorkflow(
  job: Job<{ listingId: string }>
): Promise<any> {
  const { listingId } = job.data;

  log.info({
    type: 'full_ebay_workflow_start',
    jobId: job.id,
    listingId,
  });

  try {
    // Step 1: インベントリアイテム作成
    await processCreateInventoryItem(listingId);

    // Step 2: オファー作成
    await processCreateOffer(listingId);

    // Step 3: オファー公開
    const result = await processPublishOffer(listingId);

    log.info({
      type: 'full_ebay_workflow_complete',
      jobId: job.id,
      listingId,
      ebayListingId: result.ebayListingId,
    });

    return {
      listingId,
      success: true,
      ebayListingId: result.ebayListingId,
      ebayListingUrl: result.ebayListingUrl,
    };
  } catch (error: any) {
    log.error({
      type: 'full_ebay_workflow_error',
      jobId: job.id,
      listingId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 価格同期処理
 * アクティブなeBay出品の価格を再計算し、必要に応じてeBayにも反映
 */
async function processPriceSync(options: {
  priceChangeThreshold?: number;
  maxListings?: number;
  syncToMarketplace?: boolean;
}): Promise<any> {
  const {
    priceChangeThreshold = 2, // 2%以上の変動で更新
    maxListings = 100,
    syncToMarketplace = false,
  } = options;

  log.info({
    type: 'price_sync_start',
    options: { priceChangeThreshold, maxListings, syncToMarketplace },
  });

  // アクティブなeBay出品を取得
  const listings = await prisma.listing.findMany({
    where: {
      marketplace: 'EBAY',
      status: 'ACTIVE',
    },
    include: {
      product: true,
    },
    take: maxListings,
    orderBy: { updatedAt: 'asc' }, // 古いものから処理
  });

  const results: Array<{
    listingId: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    updated: boolean;
    syncedToEbay: boolean;
    error?: string;
  }> = [];

  // 為替レート取得
  const exchangeRate = await getExchangeRate();

  for (const listing of listings) {
    try {
      const product = listing.product;
      if (!product) continue;

      // 新しい価格を計算
      const costJpy = product.price;
      const costUsd = costJpy / exchangeRate;

      // 利益率30%を目標として価格計算
      const targetMargin = 0.30;
      const shippingCost = listing.shippingCost || 0;
      const ebayFeeRate = 0.1625; // 掲載料+落札手数料+決済手数料の合計約16.25%

      // 価格 = (仕入れ + 送料) / (1 - 手数料率 - 目標利益率)
      const newPrice = Math.ceil((costUsd + shippingCost) / (1 - ebayFeeRate - targetMargin) * 100) / 100;

      const oldPrice = listing.listingPrice;
      const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

      // 変動が閾値以下ならスキップ
      if (changePercent < priceChangeThreshold) {
        results.push({
          listingId: listing.id,
          oldPrice,
          newPrice,
          changePercent,
          updated: false,
          syncedToEbay: false,
        });
        continue;
      }

      // DBを更新
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          listingPrice: newPrice,
          marketplaceData: {
            ...(listing.marketplaceData as any || {}),
            priceUpdatedAt: new Date().toISOString(),
            previousPrice: oldPrice,
          },
        },
      });

      // 価格変更履歴を記録
      await prisma.priceHistory.create({
        data: {
          listingId: listing.id,
          price: newPrice,
          source: 'auto_sync',
          metadata: {
            oldPrice,
            exchangeRate,
            costJpy,
            costUsd,
            targetMargin,
          },
        },
      });

      let syncedToEbay = false;

      // eBayに同期
      if (syncToMarketplace) {
        const marketplaceData = (listing.marketplaceData as any) || {};
        const offerId = marketplaceData.offerId;

        if (offerId) {
          try {
            const updateResult = await ebayApi.updateOfferPrice(offerId, newPrice);
            syncedToEbay = updateResult.success;

            if (!updateResult.success) {
              log.warn({
                type: 'price_sync_ebay_update_failed',
                listingId: listing.id,
                error: updateResult.error?.message,
              });
            }
          } catch (ebayErr) {
            log.error({
              type: 'price_sync_ebay_error',
              listingId: listing.id,
              error: (ebayErr as Error).message,
            });
          }
        }
      }

      results.push({
        listingId: listing.id,
        oldPrice,
        newPrice,
        changePercent,
        updated: true,
        syncedToEbay,
      });

      log.info({
        type: 'price_sync_listing_updated',
        listingId: listing.id,
        oldPrice,
        newPrice,
        changePercent: changePercent.toFixed(2),
        syncedToEbay,
      });
    } catch (error: any) {
      results.push({
        listingId: listing.id,
        oldPrice: listing.listingPrice,
        newPrice: listing.listingPrice,
        changePercent: 0,
        updated: false,
        syncedToEbay: false,
        error: error.message,
      });
    }
  }

  const updatedCount = results.filter(r => r.updated).length;
  const syncedCount = results.filter(r => r.syncedToEbay).length;
  const errorCount = results.filter(r => r.error).length;

  log.info({
    type: 'price_sync_complete',
    total: listings.length,
    updated: updatedCount,
    synced: syncedCount,
    errors: errorCount,
  });

  return {
    total: listings.length,
    updated: updatedCount,
    synced: syncedCount,
    errors: errorCount,
    results,
  };
}

/**
 * 為替レート取得（USD/JPY）
 */
async function getExchangeRate(): Promise<number> {
  try {
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'JPY',
      },
      orderBy: { fetchedAt: 'desc' },
    });
    return rate?.rate || 150; // デフォルト値
  } catch {
    return 150;
  }
}

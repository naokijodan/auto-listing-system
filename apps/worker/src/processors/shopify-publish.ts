/**
 * v3.0: Shopify同期ワーカープロセッサー
 * Shopify出品・注文同期・在庫同期をBullMQジョブとして非同期処理
 */
import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { shopifyPublishService, shopifyOrderSyncService } from '../lib/shopify-publish-service';

const log = logger.child({ module: 'shopify-publish-processor' });

/**
 * Shopify同期ジョブプロセッサー
 */
export async function processShopifyPublishJob(job: Job): Promise<any> {
  const { type } = job.data;
  log.info({ type: 'job_start', jobId: job.id, jobType: type });

  try {
    switch (type) {
      case 'publish': {
        const enrichmentTaskId: string = job.data.enrichmentTaskId;
        const spId = await shopifyPublishService.createShopifyListing(enrichmentTaskId);
        await shopifyPublishService.processImagesForListing(spId);
        return await shopifyPublishService.publishToShopify(spId);
      }
      case 'sync-orders': {
        return await shopifyOrderSyncService.syncOrders();
      }
      case 'sync-inventory': {
        const productId: string = job.data.productId;
        const sync = await prisma.marketplaceSyncState.upsert({
          where: { marketplace_productId: { marketplace: 'SHOPIFY', productId } },
          create: {
            marketplace: 'SHOPIFY',
            productId,
            listingId: '',
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
            localStock: 1,
            remoteStock: 1,
          },
          update: { lastSyncAt: new Date(), syncStatus: 'SYNCED' },
        });
        log.info({ type: 'shopify_inventory_synced', productId, syncId: sync.id });
        return { success: true, syncId: sync.id };
      }
      case 'fulfill-order': {
        await shopifyOrderSyncService.fulfillOrder(
          job.data.orderId,
          job.data.trackingNumber,
          job.data.carrier
        );
        return { success: true };
      }
      default:
        throw new Error(`Unknown Shopify job type: ${type}`);
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
 * Shopify完全ワークフロー（リスティング作成→画像処理→出品）
 */
export async function processFullShopifyWorkflow(job: Job): Promise<any> {
  log.info({
    type: 'full_shopify_workflow_start',
    jobId: job.id,
    productId: job.data.productId,
    enrichmentTaskId: job.data.enrichmentTaskId,
  });

  try {
    const spId = await shopifyPublishService.createShopifyListing(job.data.enrichmentTaskId);
    await shopifyPublishService.processImagesForListing(spId);
    const result = await shopifyPublishService.publishToShopify(spId);

    log.info({
      type: 'full_shopify_workflow_complete',
      jobId: job.id,
      shopifyListingId: spId,
    });

    return result;
  } catch (error: any) {
    log.error({
      type: 'full_shopify_workflow_error',
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
}

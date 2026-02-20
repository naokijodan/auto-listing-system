import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { etsyPublishService } from '../lib/etsy-publish-service';
import { etsyApi } from '../lib/etsy-api';

const QUEUE_NAME = 'etsy-publish';
const log = logger.child({ module: 'etsy-publish-worker' });

// ジョブタイプ:
// { type: 'publish', productId: string, enrichmentTaskId: string }
// { type: 'sync-orders' }
// { type: 'fulfill-order', receiptId: number, trackingCode: string, carrierName: string }

const worker = new Worker(QUEUE_NAME, async (job: Job) => {
  switch (job.data.type) {
    case 'publish': {
      const etsyListingId = await etsyPublishService.createEtsyListing(job.data.enrichmentTaskId);
      await etsyPublishService.processImagesForListing(etsyListingId);
      return await etsyPublishService.publishToEtsy(etsyListingId);
    }
    case 'sync-orders': {
      try {
        const receipts = await etsyApi.getShopReceipts({ min_created: Math.floor(Date.now() / 1000) - 86400, limit: 50 });
        // TODO: Orderテーブルにupsert、InventoryEvent記録
        log.info({ type: 'etsy_sync_orders_fetched', count: (receipts?.results?.length || receipts?.count || 0) });
        return { success: true };
      } catch (e: any) {
        log.error({ type: 'etsy_sync_orders_failed', error: e.message });
        throw e;
      }
    }
    case 'fulfill-order': {
      await etsyApi.createReceiptShipment(job.data.receiptId, job.data.trackingCode, job.data.carrierName);
      return { success: true };
    }
    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}, {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }),
  concurrency: 3,
});

export { worker as etsyPublishWorker };


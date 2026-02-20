import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';
import { ebayPublishService, ebayOrderSyncService } from '../lib/ebay-publish-service';

const QUEUE_NAME = 'ebay-publish';
const log = logger.child({ module: 'ebay-publish-worker' });

// ジョブタイプ
// { type: 'publish', productId: string }
// { type: 'sync-orders' }
// { type: 'fulfill-order', orderId: string, trackingNumber: string, carrier: string }

const worker = new Worker(QUEUE_NAME, async (job: Job) => {
  switch (job.data.type) {
    case 'publish': {
      const productId: string = job.data.productId;
      // EnrichmentTaskを取得
      const task = await prisma.enrichmentTask.findUnique({ where: { productId } });
      if (!task) {
        throw new Error(`No enrichment task for product: ${productId}`);
      }
      // 3段階実行
      const listingId = await ebayPublishService.createEbayListing(task.id);
      await ebayPublishService.processImagesForListing(listingId);
      return await ebayPublishService.publishToEbay(listingId);
    }
    case 'sync-orders': {
      return await ebayOrderSyncService.syncOrders();
    }
    case 'fulfill-order': {
      await ebayOrderSyncService.fulfillOrder(job.data.orderId, job.data.trackingNumber, job.data.carrier);
      return { success: true };
    }
    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}, {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }),
  concurrency: 3,
});

export { worker as ebayPublishWorker };


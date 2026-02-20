import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';
import { shopifyPublishService, shopifyOrderSyncService } from '../lib/shopify-publish-service';

const QUEUE_NAME = 'shopify-sync';
const log = logger.child({ module: 'shopify-sync-worker' });

// ジョブタイプ:
// { type: 'publish', productId: string, enrichmentTaskId: string }
// { type: 'sync-orders' }
// { type: 'sync-inventory', productId: string }
// { type: 'fulfill-order', orderId: string, trackingNumber: string, carrier: string }

const worker = new Worker(QUEUE_NAME, async (job: Job) => {
  switch (job.data.type) {
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
      // ここではシンプルにMarketplaceSyncStateを更新する例とする
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
      return { success: true };
    }
    case 'fulfill-order': {
      await shopifyOrderSyncService.fulfillOrder(job.data.orderId, job.data.trackingNumber, job.data.carrier);
      return { success: true };
    }
    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}, {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }),
  concurrency: 3,
});

export { worker as shopifySyncWorker };


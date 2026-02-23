import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';
import { inventoryManager } from '../lib/inventory-manager';
import { orderSyncManager } from '../lib/order-sync-manager';
import { marketplaceRouter } from '../lib/marketplace-router';

const log = logger.child({ module: 'inventory-sync-worker' });
const QUEUE_NAME = 'inventory-sync';

const publishQueues: Record<string, Queue> = {
  EBAY: new Queue('publish-ebay', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
  JOOM: new Queue('publish-joom', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
  ETSY: new Queue('publish-etsy', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
  SHOPIFY: new Queue('publish-shopify', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
  INSTAGRAM_SHOP: new Queue('publish-shopify', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
  TIKTOK_SHOP: new Queue('publish-shopify', { connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
};

const worker = new Worker(QUEUE_NAME, async (job: Job) => {
  switch (job.data.type) {
    case 'sync-all-orders':
      return orderSyncManager.syncAllOrders();

    case 'reconcile-inventory':
      return inventoryManager.reconcileInventory(job.data.productId);

    case 'reconcile-all': {
      const ids = await prisma.product.findMany({ select: { id: true } });
      const results = await Promise.allSettled(ids.map(p => inventoryManager.reconcileInventory(p.id)));
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      return { processed: results.length, ok, failed };
    }

    case 'route-product': {
      const routing = await marketplaceRouter.routeProduct(job.data.productId);
      for (const target of routing.targets) {
        const q = publishQueues[target];
        if (!q) continue;
        await q.add('publish', { productId: job.data.productId, reason: routing.reasons[target], requestedBy: 'router' }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
      }
      return routing;
    }

    case 'sync-inventory':
      return inventoryManager.syncToAllMarketplaces(job.data.productId, job.data.quantity);

    default:
      log.warn({ type: 'unknown_job_type', jobType: job.data.type });
      return { message: 'Unknown job type', type: job.data.type };
  }
}, {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }),
  concurrency: 5,
});

export { worker as inventorySyncWorker };


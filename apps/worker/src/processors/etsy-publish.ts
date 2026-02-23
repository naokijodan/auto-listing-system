/**
 * v3.0: Etsy出品ワーカープロセッサー
 * Etsy出品をBullMQジョブとして非同期処理
 */
import { Job } from 'bullmq';
import { logger } from '@rakuda/logger';
import { etsyPublishService } from '../lib/etsy-publish-service';
import { etsyApi } from '../lib/etsy-api';

const log = logger.child({ module: 'etsy-publish-processor' });

/**
 * Etsy出品ジョブプロセッサー
 */
export async function processEtsyPublishJob(job: Job): Promise<any> {
  const { type } = job.data;
  log.info({ type: 'job_start', jobId: job.id, jobType: type });

  try {
    switch (type) {
      case 'publish': {
        const etsyListingId = await etsyPublishService.createEtsyListing(job.data.enrichmentTaskId);
        await etsyPublishService.processImagesForListing(etsyListingId);
        return await etsyPublishService.publishToEtsy(etsyListingId);
      }
      case 'sync-orders': {
        try {
          const receipts = await etsyApi.getShopReceipts({
            min_created: Math.floor(Date.now() / 1000) - 86400,
            limit: 50,
          });
          log.info({
            type: 'etsy_sync_orders_fetched',
            count: receipts?.results?.length || receipts?.count || 0,
          });
          return { success: true };
        } catch (e: any) {
          log.error({ type: 'etsy_sync_orders_failed', error: e.message });
          throw e;
        }
      }
      case 'fulfill-order': {
        await etsyApi.createReceiptShipment(
          job.data.receiptId,
          job.data.trackingCode,
          job.data.carrierName
        );
        return { success: true };
      }
      default:
        throw new Error(`Unknown Etsy job type: ${type}`);
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
 * Etsy完全ワークフロー（リスティング作成→画像処理→出品）
 */
export async function processFullEtsyWorkflow(job: Job): Promise<any> {
  log.info({
    type: 'full_etsy_workflow_start',
    jobId: job.id,
    productId: job.data.productId,
    enrichmentTaskId: job.data.enrichmentTaskId,
  });

  try {
    const etsyListingId = await etsyPublishService.createEtsyListing(job.data.enrichmentTaskId);
    await etsyPublishService.processImagesForListing(etsyListingId);
    const result = await etsyPublishService.publishToEtsy(etsyListingId);

    log.info({
      type: 'full_etsy_workflow_complete',
      jobId: job.id,
      etsyListingId,
    });

    return result;
  } catch (error: any) {
    log.error({
      type: 'full_etsy_workflow_error',
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
}

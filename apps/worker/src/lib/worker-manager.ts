import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES, QUEUE_CONFIG } from '@rakuda/config';

import { processScrapeJob } from '../processors/scrape';
import { processImageJob } from '../processors/image';
import { processTranslateJob } from '../processors/translate';
import { processPublishJob } from '../processors/publish';
import { processInventoryJob, processScheduledInventoryCheck, processSyncListingStatus } from '../processors/inventory';
import { processNotificationJob } from '../processors/notification';
import { pricingProcessor } from '../processors/pricing';
import { alertManager } from './alert-manager';
import { updateExchangeRate } from './exchange-rate';
import { syncAllPrices } from './price-sync';
import { sendDailyReportNotification, generateDailyReport } from './daily-report';
import { notifyHealthIssues, checkSystemHealth, recordError } from './error-monitor';
import { notifyExchangeRateUpdated } from './notifications';

const workers: Worker[] = [];
let deadLetterQueue: Queue | null = null;

/**
 * 全ワーカーを起動
 */
export async function startWorkers(connection: IORedis): Promise<void> {
  // Dead Letter Queue
  deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection });

  // スクレイピングワーカー
  const scrapeWorker = createWorker(
    QUEUE_NAMES.SCRAPE,
    async (job) => {
      // 為替レート更新ジョブ
      if (job.name === 'update-exchange-rate') {
        return handleExchangeRateUpdate(job);
      }
      // 価格同期ジョブ
      if (job.name === 'sync-prices' || job.name === 'manual-price-sync' || job.name === 'sync-price') {
        return handlePriceSync(job);
      }
      // 日次レポートジョブ
      if (job.name === 'daily-report') {
        return handleDailyReport(job);
      }
      // ヘルスチェックジョブ
      if (job.name === 'health-check') {
        return handleHealthCheck(job);
      }
      // 通常のスクレイピング
      return processScrapeJob(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.SCRAPE]
  );
  workers.push(scrapeWorker);

  // 画像処理ワーカー
  const imageWorker = createWorker(
    QUEUE_NAMES.IMAGE,
    processImageJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.IMAGE]
  );
  workers.push(imageWorker);

  // 翻訳ワーカー
  const translateWorker = createWorker(
    QUEUE_NAMES.TRANSLATE,
    processTranslateJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.TRANSLATE]
  );
  workers.push(translateWorker);

  // 出品ワーカー
  const publishWorker = createWorker(
    QUEUE_NAMES.PUBLISH,
    processPublishJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.PUBLISH]
  );
  workers.push(publishWorker);

  // 在庫監視ワーカー
  const inventoryWorker = createWorker(
    QUEUE_NAMES.INVENTORY,
    async (job) => {
      // 出品状態同期
      if (job.name === 'sync-listing-status') {
        return processSyncListingStatus(job);
      }
      // スケジュールされた在庫チェック
      if (job.name === 'scheduled-inventory-check' || job.name === 'manual-inventory-check') {
        return processScheduledInventoryCheck(job);
      }
      // 個別の在庫チェック
      return processInventoryJob(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.INVENTORY]
  );
  workers.push(inventoryWorker);

  // 通知ワーカー（Phase 26）
  const notificationWorker = createWorker(
    QUEUE_NAMES.NOTIFICATION,
    processNotificationJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.NOTIFICATION]
  );
  workers.push(notificationWorker);

  // 価格最適化ワーカー（Phase 28）
  const pricingWorker = createWorker(
    QUEUE_NAMES.PRICING,
    pricingProcessor,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.PRICING]
  );
  workers.push(pricingWorker);

  // AlertManager初期化
  await alertManager.initialize();

  logger.info(`Started ${workers.length} workers`);
}

/**
 * 為替レート更新ジョブのハンドラー
 */
async function handleExchangeRateUpdate(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'exchange-rate' });

  log.info({ type: 'exchange_rate_update_job_start' });

  try {
    const result = await updateExchangeRate();

    log.info({
      type: 'exchange_rate_update_job_complete',
      oldRate: result.oldRate,
      newRate: result.newRate,
      source: result.source,
    });

    // 変動があれば通知
    if (result.success && result.oldRate !== result.newRate) {
      await notifyExchangeRateUpdated(result.oldRate, result.newRate);
    }

    return {
      success: result.success,
      oldRate: result.oldRate,
      newRate: result.newRate,
      source: result.source,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'exchange_rate_update_job_error', error: error.message });
    await recordError('EXCHANGE_RATE', job.id, error.message, job.attemptsMade);
    throw error;
  }
}

/**
 * 価格同期ジョブのハンドラー
 */
async function handlePriceSync(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'price-sync' });

  log.info({ type: 'price_sync_job_start', data: job.data });

  try {
    const { listingIds, listingId, marketplace, externalId, newPrice, currency } = job.data;

    let result;

    // 単一出品の直接価格更新（APIからの推奨価格適用）
    if (listingId && externalId && newPrice !== undefined) {
      const { ebayApi, isEbayConfigured } = await import('./ebay-api');
      const { joomApi, isJoomConfigured } = await import('./joom-api');

      let apiUpdated = false;
      let error: string | undefined;

      try {
        if (marketplace === 'EBAY' && await isEbayConfigured()) {
          await ebayApi.updatePrice(externalId, newPrice, currency || 'USD');
          apiUpdated = true;
        } else if (marketplace === 'JOOM' && await isJoomConfigured()) {
          // Joomは productId と sku が必要
          const listing = await (await import('@rakuda/database')).prisma.listing.findUnique({
            where: { id: listingId },
          });
          const marketplaceData = listing?.marketplaceData as { sku?: string };
          if (marketplaceData?.sku) {
            await joomApi.updatePrice(externalId, marketplaceData.sku, newPrice);
            apiUpdated = true;
          }
        }
      } catch (apiError: any) {
        error = apiError.message;
        log.error({ type: 'price_sync_api_error', listingId, error });
      }

      result = {
        success: apiUpdated,
        listingId,
        marketplace,
        newPrice,
        apiUpdated,
        error,
      };
    } else if (listingIds && listingIds.length > 0) {
      // 特定の出品のみ再計算して同期
      const results = [];
      for (const id of listingIds) {
        const { syncListingPrice } = await import('./price-sync');
        results.push(await syncListingPrice(id));
      }
      result = {
        success: true,
        total: results.length,
        updated: results.filter(r => r.priceChanged).length,
        apiUpdated: results.filter(r => r.apiUpdated).length,
        errors: results.filter(r => r.error).length,
      };
    } else {
      // 全アクティブ出品を同期
      result = await syncAllPrices();
    }

    log.info({ type: 'price_sync_job_complete', result });

    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'price_sync_job_error', error: error.message });
    await recordError('PRICE_SYNC', job.id, error.message, job.attemptsMade);
    throw error;
  }
}

/**
 * 日次レポートジョブのハンドラー
 */
async function handleDailyReport(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'daily-report' });

  log.info({ type: 'daily_report_job_start' });

  try {
    const report = await generateDailyReport();
    await sendDailyReportNotification();

    log.info({
      type: 'daily_report_job_complete',
      date: report.date,
      newProducts: report.products.new,
      published: report.listings.published,
    });

    return {
      success: true,
      report,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'daily_report_job_error', error: error.message });
    throw error;
  }
}

/**
 * ヘルスチェックジョブのハンドラー
 */
async function handleHealthCheck(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'health-check' });

  log.info({ type: 'health_check_job_start' });

  try {
    const health = await checkSystemHealth();

    if (!health.healthy) {
      await notifyHealthIssues();
    }

    log.info({
      type: 'health_check_job_complete',
      healthy: health.healthy,
      issues: health.checks.filter(c => c.status !== 'ok').length,
    });

    return {
      success: true,
      healthy: health.healthy,
      checks: health.checks,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'health_check_job_error', error: error.message });
    throw error;
  }
}

/**
 * ワーカーを作成
 */
function createWorker(
  queueName: string,
  processor: (job: any) => Promise<any>,
  connection: IORedis,
  config: any
): Worker {
  const worker = new Worker(
    queueName,
    async (job) => {
      const log = logger.child({ jobId: job.id, queueName, jobName: job.name });
      const startTime = Date.now();

      log.info({ type: 'job_start', data: job.data });

      try {
        const result = await processor(job);
        const duration = Date.now() - startTime;

        log.info({
          type: 'job_complete',
          duration,
          result,
        });

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;

        log.error({
          type: 'job_error',
          duration,
          error: error.message,
          stack: error.stack,
        });

        // エラーモニタリング
        await recordError(
          job.name || queueName,
          job.id || 'unknown',
          error.message,
          job.attemptsMade || 1
        );

        throw error;
      }
    },
    {
      connection,
      concurrency: config.concurrency || 1,
      limiter: config.rateLimit
        ? {
            max: config.rateLimit.max,
            duration: config.rateLimit.duration,
          }
        : undefined,
    }
  );

  // イベントハンドラー
  worker.on('completed', (job) => {
    logger.debug({
      type: 'worker_job_completed',
      queueName,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', async (job, err) => {
    logger.warn({
      type: 'worker_job_failed',
      queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });

    // 最大リトライ回数超過時はDLQへ
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDeadLetter(job, err);
    }
  });

  worker.on('error', (err) => {
    logger.error({
      type: 'worker_error',
      queueName,
      error: err.message,
    });
  });

  return worker;
}

/**
 * Dead Letter Queueに移動
 */
async function moveToDeadLetter(job: any, error: Error): Promise<void> {
  if (!deadLetterQueue) return;

  try {
    await deadLetterQueue.add('dead-letter', {
      originalQueue: job.queueName,
      originalJobId: job.id,
      originalJobName: job.name,
      payload: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
    });

    logger.warn({
      type: 'moved_to_dlq',
      originalQueue: job.queueName,
      jobId: job.id,
      jobName: job.name,
    });
  } catch (err) {
    logger.error('Failed to move job to DLQ', err);
  }
}

/**
 * 全ワーカーを停止
 */
export async function stopWorkers(): Promise<void> {
  logger.info('Stopping all workers...');

  // 新規ジョブの受付停止
  await Promise.all(workers.map((w) => w.pause()));

  // 処理中のジョブ完了を待機
  await Promise.all(workers.map((w) => w.close()));

  // DLQを閉じる
  if (deadLetterQueue) {
    await deadLetterQueue.close();
  }

  workers.length = 0;
  logger.info('All workers stopped');
}

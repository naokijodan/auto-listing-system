import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@als/logger';
import { QUEUE_NAMES, QUEUE_CONFIG } from '@als/config';

import { processScrapeJob } from '../processors/scrape';
import { processImageJob } from '../processors/image';
import { processTranslateJob } from '../processors/translate';
import { processPublishJob } from '../processors/publish';
import { processInventoryJob } from '../processors/inventory';

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
    processScrapeJob,
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
    processInventoryJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.INVENTORY]
  );
  workers.push(inventoryWorker);

  logger.info(`Started ${workers.length} workers`);
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
      const log = logger.child({ jobId: job.id, queueName });
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
    });
  });

  worker.on('failed', async (job, err) => {
    logger.warn({
      type: 'worker_job_failed',
      queueName,
      jobId: job?.id,
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
      payload: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
    });

    logger.warn({
      type: 'moved_to_dlq',
      originalQueue: job.queueName,
      jobId: job.id,
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

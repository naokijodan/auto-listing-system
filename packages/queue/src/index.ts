/**
 * Phase 41: ジョブキューパッケージ
 * BullMQへのジョブ追加を統一管理
 */
import { Queue, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES, QUEUE_CONFIG } from '@rakuda/config';

const log = logger.child({ module: 'queue-service' });

// キューインスタンスをキャッシュ
const queues: Map<string, Queue> = new Map();

// Redis接続
let redisConnection: IORedis | null = null;

// ジョブタイプ定義
export type EnrichmentJobType =
  | 'enrich-product'
  | 'enrich-batch'
  | 'process-images'
  | 'validate-content'
  | 'calculate-price';

export type JoomPublishJobType =
  | 'create-listing'
  | 'process-images'
  | 'publish'
  | 'batch-publish'
  | 'dry-run'
  | 'sync-status';

export interface EnrichmentJobData {
  type: EnrichmentJobType;
  productId?: string;
  taskId?: string;
  productIds?: string[];
  priority?: number;
}

export interface JoomPublishJobData {
  type: JoomPublishJobType;
  taskId?: string;
  joomListingId?: string;
  batchId?: string;
  productIds?: string[];
  options?: {
    dryRun?: boolean;
    concurrency?: number;
  };
}

/**
 * Redis接続を初期化
 */
export function initQueueConnection(connection?: IORedis): IORedis {
  if (connection) {
    redisConnection = connection;
  } else if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return redisConnection;
}

/**
 * キューインスタンスを取得
 */
function getQueue(queueName: string): Queue {
  if (!queues.has(queueName)) {
    const connection = initQueueConnection();
    const queue = new Queue(queueName, { connection });
    queues.set(queueName, queue);
  }
  return queues.get(queueName)!;
}

/**
 * デフォルトのジョブオプション
 */
function getDefaultJobOptions(queueName: string): JobsOptions {
  const config = (QUEUE_CONFIG as any)[queueName];
  if (!config) {
    return {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    };
  }

  return {
    attempts: config.attempts || 3,
    backoff: config.backoff || { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
    priority: config.priority,
  };
}

// ========================================
// エンリッチメントジョブ
// ========================================

/**
 * エンリッチメントジョブを追加
 */
export async function addEnrichmentJob(
  type: EnrichmentJobType,
  data: Omit<EnrichmentJobData, 'type'>,
  options?: Partial<JobsOptions>
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.ENRICHMENT);
  const jobData: EnrichmentJobData = { type, ...data };

  const job = await queue.add(type, jobData, {
    ...getDefaultJobOptions(QUEUE_NAMES.ENRICHMENT),
    ...options,
  });

  log.info({
    type: 'job_added',
    queue: QUEUE_NAMES.ENRICHMENT,
    jobId: job.id,
    jobType: type,
    productId: data.productId,
  });

  return job.id!;
}

/**
 * 商品エンリッチメントジョブを追加
 */
export async function addEnrichProductJob(
  productId: string,
  priority: number = 0
): Promise<string> {
  return addEnrichmentJob('enrich-product', { productId, priority });
}

/**
 * バッチエンリッチメントジョブを追加
 */
export async function addEnrichBatchJob(
  productIds: string[],
  priority: number = 0
): Promise<string> {
  return addEnrichmentJob('enrich-batch', { productIds, priority });
}

/**
 * 画像処理ジョブを追加
 */
export async function addProcessImagesJob(taskId: string): Promise<string> {
  return addEnrichmentJob('process-images', { taskId });
}

/**
 * 完全ワークフロージョブを追加
 */
export async function addFullWorkflowJob(
  productId: string,
  autoPublish: boolean = false
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.ENRICHMENT);

  const job = await queue.add(
    'full-workflow',
    { productId, autoPublish },
    {
      ...getDefaultJobOptions(QUEUE_NAMES.ENRICHMENT),
      priority: 1,
    }
  );

  log.info({
    type: 'job_added',
    queue: QUEUE_NAMES.ENRICHMENT,
    jobId: job.id,
    jobType: 'full-workflow',
    productId,
    autoPublish,
  });

  return job.id!;
}

// ========================================
// Joom出品ジョブ
// ========================================

/**
 * Joom出品ジョブを追加
 */
export async function addJoomPublishJob(
  type: JoomPublishJobType,
  data: Omit<JoomPublishJobData, 'type'>,
  options?: Partial<JobsOptions>
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.JOOM_PUBLISH);
  const jobData: JoomPublishJobData = { type, ...data };

  const job = await queue.add(type, jobData, {
    ...getDefaultJobOptions(QUEUE_NAMES.JOOM_PUBLISH),
    ...options,
  });

  log.info({
    type: 'job_added',
    queue: QUEUE_NAMES.JOOM_PUBLISH,
    jobId: job.id,
    jobType: type,
    taskId: data.taskId,
    joomListingId: data.joomListingId,
  });

  return job.id!;
}

/**
 * 出品作成ジョブを追加
 */
export async function addCreateListingJob(taskId: string): Promise<string> {
  return addJoomPublishJob('create-listing', { taskId });
}

/**
 * Joom出品実行ジョブを追加
 */
export async function addPublishJob(joomListingId: string): Promise<string> {
  return addJoomPublishJob('publish', { joomListingId });
}

/**
 * バッチ出品ジョブを追加
 */
export async function addBatchPublishJob(batchId: string): Promise<string> {
  return addJoomPublishJob('batch-publish', { batchId });
}

/**
 * 完全Joomワークフロージョブを追加
 */
export async function addFullJoomWorkflowJob(
  taskId: string,
  skipImages: boolean = false
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.JOOM_PUBLISH);

  const job = await queue.add(
    'full-joom-workflow',
    { taskId, skipImages },
    {
      ...getDefaultJobOptions(QUEUE_NAMES.JOOM_PUBLISH),
      priority: 1,
    }
  );

  log.info({
    type: 'job_added',
    queue: QUEUE_NAMES.JOOM_PUBLISH,
    jobId: job.id,
    jobType: 'full-joom-workflow',
    taskId,
  });

  return job.id!;
}

/**
 * 自動Joom出品ジョブを追加
 */
export async function addAutoJoomPublishJob(limit: number = 10): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.JOOM_PUBLISH);

  const job = await queue.add(
    'auto-joom-publish',
    { limit },
    {
      ...getDefaultJobOptions(QUEUE_NAMES.JOOM_PUBLISH),
      priority: 2,
    }
  );

  log.info({
    type: 'job_added',
    queue: QUEUE_NAMES.JOOM_PUBLISH,
    jobId: job.id,
    jobType: 'auto-joom-publish',
    limit,
  });

  return job.id!;
}

// ========================================
// キュー管理
// ========================================

/**
 * ジョブステータスを取得
 */
export async function getJobStatus(queueName: string, jobId: string): Promise<any> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
    timestamp: job.timestamp,
  };
}

/**
 * キュー統計を取得
 */
export async function getQueueStats(queueName: string): Promise<any> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * エンリッチメントキュー統計
 */
export async function getEnrichmentQueueStats(): Promise<any> {
  return getQueueStats(QUEUE_NAMES.ENRICHMENT);
}

/**
 * Joom出品キュー統計
 */
export async function getJoomPublishQueueStats(): Promise<any> {
  return getQueueStats(QUEUE_NAMES.JOOM_PUBLISH);
}

/**
 * 全キューをクリーンアップ
 */
export async function cleanupQueues(): Promise<void> {
  const entries = Array.from(queues.entries());
  for (const [name, queue] of entries) {
    await queue.obliterate({ force: true });
    log.info({ type: 'queue_cleaned', queue: name });
  }
}

/**
 * 接続を閉じる
 */
export async function closeQueueConnections(): Promise<void> {
  const queueList = Array.from(queues.values());
  for (const queue of queueList) {
    await queue.close();
  }
  queues.clear();

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

// re-export types
export { QUEUE_NAMES };

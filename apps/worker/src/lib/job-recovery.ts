/**
 * Phase 43: ジョブリカバリーサービス
 * 失敗したジョブの追跡・自動リトライ・ロールバック
 */
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES } from '@rakuda/config';
import { initQueueConnection } from '@rakuda/queue';

const log = logger.child({ module: 'job-recovery' });

// ========================================
// 型定義
// ========================================

export interface FailedJobRecord {
  id: string;
  queueName: string;
  jobId: string;
  jobName: string;
  jobData: any;
  error: string;
  attemptsMade: number;
  maxAttempts: number;
  canRetry: boolean;
  retryAfter?: Date;
  createdAt: Date;
}

export interface JobRecoveryResult {
  jobId: string;
  success: boolean;
  action: 'retried' | 'skipped' | 'abandoned';
  error?: string;
}

// ========================================
// 冪等性キー管理
// ========================================

/**
 * 冪等性キーを生成
 */
export function generateIdempotencyKey(
  operation: string,
  resourceId: string,
  timestamp?: number
): string {
  const ts = timestamp || Math.floor(Date.now() / 60000); // 1分単位
  return `${operation}:${resourceId}:${ts}`;
}

/**
 * 冪等性キーを確認（既に処理済みかどうか）
 */
export async function checkIdempotencyKey(key: string): Promise<boolean> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key },
  });
  return !!existing;
}

/**
 * 冪等性キーを記録
 */
export async function recordIdempotencyKey(
  key: string,
  result: any,
  expiresIn: number = 86400000 // 24時間
): Promise<void> {
  await prisma.idempotencyKey.upsert({
    where: { key },
    create: {
      key,
      result,
      expiresAt: new Date(Date.now() + expiresIn),
    },
    update: {
      result,
      expiresAt: new Date(Date.now() + expiresIn),
    },
  });
}

// ========================================
// 失敗ジョブ追跡
// ========================================

/**
 * 失敗したジョブを記録
 */
export async function recordFailedJob(
  job: Job,
  error: Error
): Promise<FailedJobRecord> {
  const queueName = job.queueName;
  const canRetry = job.attemptsMade < (job.opts.attempts || 3);
  const retryAfter = canRetry
    ? new Date(Date.now() + calculateBackoff(job.attemptsMade))
    : undefined;

  const record = await prisma.failedJob.create({
    data: {
      queueName,
      jobId: job.id!,
      jobName: job.name,
      jobData: job.data,
      error: error.message,
      stackTrace: error.stack,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
      canRetry,
      retryAfter,
    },
  });

  log.warn({
    type: 'job_failed_recorded',
    queueName,
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade,
    canRetry,
  });

  return {
    id: record.id,
    queueName,
    jobId: job.id!,
    jobName: job.name,
    jobData: job.data,
    error: error.message,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts || 3,
    canRetry,
    retryAfter,
    createdAt: record.createdAt,
  };
}

/**
 * バックオフ時間を計算
 */
function calculateBackoff(attemptsMade: number): number {
  // 指数バックオフ: 5秒, 25秒, 125秒, ...
  const baseDelay = 5000;
  const multiplier = Math.pow(5, attemptsMade);
  const maxDelay = 3600000; // 最大1時間
  return Math.min(baseDelay * multiplier, maxDelay);
}

// ========================================
// 自動リトライスケジューラ
// ========================================

export class JobRecoveryService {
  private queues: Map<string, Queue> = new Map();

  constructor() {
    const connection = initQueueConnection();

    // キューインスタンスを初期化
    [QUEUE_NAMES.ENRICHMENT, QUEUE_NAMES.JOOM_PUBLISH].forEach(name => {
      this.queues.set(name, new Queue(name, { connection }));
    });
  }

  /**
   * リトライ可能な失敗ジョブを取得
   */
  async getRetryableJobs(limit: number = 50): Promise<FailedJobRecord[]> {
    const jobs = await prisma.failedJob.findMany({
      where: {
        canRetry: true,
        retryAfter: { lte: new Date() },
        status: 'PENDING',
      },
      orderBy: { retryAfter: 'asc' },
      take: limit,
    });

    return jobs.map(job => ({
      id: job.id,
      queueName: job.queueName,
      jobId: job.jobId,
      jobName: job.jobName,
      jobData: job.jobData,
      error: job.error,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      canRetry: job.canRetry,
      retryAfter: job.retryAfter || undefined,
      createdAt: job.createdAt,
    }));
  }

  /**
   * 失敗ジョブをリトライ
   */
  async retryJob(failedJobId: string): Promise<JobRecoveryResult> {
    const failedJob = await prisma.failedJob.findUnique({
      where: { id: failedJobId },
    });

    if (!failedJob) {
      return { jobId: failedJobId, success: false, action: 'skipped', error: 'Job not found' };
    }

    if (!failedJob.canRetry) {
      return { jobId: failedJob.jobId, success: false, action: 'abandoned', error: 'Max retries exceeded' };
    }

    const queue = this.queues.get(failedJob.queueName);
    if (!queue) {
      return { jobId: failedJob.jobId, success: false, action: 'skipped', error: 'Queue not found' };
    }

    try {
      // 新しいジョブを追加（リトライ回数を引き継ぐ）
      const newJob = await queue.add(failedJob.jobName, failedJob.jobData, {
        attempts: failedJob.maxAttempts - failedJob.attemptsMade,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });

      // 失敗レコードを更新
      await prisma.failedJob.update({
        where: { id: failedJobId },
        data: {
          status: 'RETRIED',
          retriedAt: new Date(),
          newJobId: newJob.id,
        },
      });

      log.info({
        type: 'job_retried',
        failedJobId,
        originalJobId: failedJob.jobId,
        newJobId: newJob.id,
      });

      return { jobId: newJob.id!, success: true, action: 'retried' };
    } catch (error: any) {
      log.error({
        type: 'retry_failed',
        failedJobId,
        error: error.message,
      });

      return { jobId: failedJob.jobId, success: false, action: 'skipped', error: error.message };
    }
  }

  /**
   * バッチリトライ
   */
  async retryBatch(limit: number = 50): Promise<{
    total: number;
    retried: number;
    skipped: number;
    abandoned: number;
  }> {
    const jobs = await this.getRetryableJobs(limit);

    let retried = 0;
    let skipped = 0;
    let abandoned = 0;

    for (const job of jobs) {
      const result = await this.retryJob(job.id);
      switch (result.action) {
        case 'retried': retried++; break;
        case 'skipped': skipped++; break;
        case 'abandoned': abandoned++; break;
      }
    }

    log.info({
      type: 'batch_retry_complete',
      total: jobs.length,
      retried,
      skipped,
      abandoned,
    });

    return { total: jobs.length, retried, skipped, abandoned };
  }

  /**
   * 古い失敗レコードをクリーンアップ
   */
  async cleanupOldRecords(daysOld: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.failedJob.deleteMany({
      where: {
        OR: [
          { status: 'RETRIED', retriedAt: { lt: cutoff } },
          { status: 'ABANDONED', createdAt: { lt: cutoff } },
        ],
      },
    });

    log.info({
      type: 'cleanup_complete',
      deletedCount: result.count,
    });

    return result.count;
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    pending: number;
    retried: number;
    abandoned: number;
    byQueue: Record<string, { pending: number; retried: number }>;
  }> {
    const [pending, retried, abandoned, byQueue] = await Promise.all([
      prisma.failedJob.count({ where: { status: 'PENDING' } }),
      prisma.failedJob.count({ where: { status: 'RETRIED' } }),
      prisma.failedJob.count({ where: { status: 'ABANDONED' } }),
      prisma.failedJob.groupBy({
        by: ['queueName', 'status'],
        _count: true,
      }),
    ]);

    const queueStats: Record<string, { pending: number; retried: number }> = {};
    for (const row of byQueue) {
      if (!queueStats[row.queueName]) {
        queueStats[row.queueName] = { pending: 0, retried: 0 };
      }
      if (row.status === 'PENDING') {
        queueStats[row.queueName].pending = row._count;
      } else if (row.status === 'RETRIED') {
        queueStats[row.queueName].retried = row._count;
      }
    }

    return { pending, retried, abandoned, byQueue: queueStats };
  }
}

// シングルトンインスタンス
export const jobRecoveryService = new JobRecoveryService();

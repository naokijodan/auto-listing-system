import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { QUEUE_NAMES } from '@rakuda/config';
import { AppError } from '../middleware/error-handler';

const router = Router();

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー一覧
const queues: Record<string, Queue> = {};
Object.values(QUEUE_NAMES).forEach((name) => {
  queues[name] = new Queue(name, { connection: redis });
});

/**
 * ジョブログ一覧取得
 */
router.get('/logs', async (req, res, next) => {
  try {
    const { productId, queueName, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (productId) where.productId = productId;
    if (queueName) where.queueName = queueName;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.jobLog.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キュー統計取得
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
        };
      })
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キュー内のジョブ一覧取得
 */
router.get('/queue/:queueName', async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { status = 'waiting', limit = 50, offset = 0 } = req.query;

    const queue = queues[queueName];
    if (!queue) {
      throw new AppError(404, 'Queue not found', 'QUEUE_NOT_FOUND');
    }

    let jobs;
    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(Number(offset), Number(offset) + Number(limit) - 1);
        break;
      case 'active':
        jobs = await queue.getActive(Number(offset), Number(offset) + Number(limit) - 1);
        break;
      case 'completed':
        jobs = await queue.getCompleted(Number(offset), Number(offset) + Number(limit) - 1);
        break;
      case 'failed':
        jobs = await queue.getFailed(Number(offset), Number(offset) + Number(limit) - 1);
        break;
      case 'delayed':
        jobs = await queue.getDelayed(Number(offset), Number(offset) + Number(limit) - 1);
        break;
      default:
        throw new AppError(400, 'Invalid status', 'INVALID_STATUS');
    }

    res.json({
      success: true,
      data: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ジョブ詳細取得
 */
router.get('/queue/:queueName/:jobId', async (req, res, next) => {
  try {
    const { queueName, jobId } = req.params;

    const queue = queues[queueName];
    if (!queue) {
      throw new AppError(404, 'Queue not found', 'QUEUE_NOT_FOUND');
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    const progress = job.progress;

    // Redisから詳細な進捗情報を取得
    let detailedProgress = null;
    const progressKey = `rakuda:job:${jobId}:progress`;
    const progressData = await redis.get(progressKey);
    if (progressData) {
      try {
        detailedProgress = JSON.parse(progressData);
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        progress,
        detailedProgress,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ジョブ進捗取得（軽量版）
 */
router.get('/queue/:queueName/:jobId/progress', async (req, res, next) => {
  try {
    const { queueName, jobId } = req.params;

    const queue = queues[queueName];
    if (!queue) {
      throw new AppError(404, 'Queue not found', 'QUEUE_NOT_FOUND');
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    const progress = job.progress;

    // Redisから詳細な進捗情報を取得
    let detailedProgress = null;
    const progressKey = `rakuda:job:${jobId}:progress`;
    const progressData = await redis.get(progressKey);
    if (progressData) {
      try {
        detailedProgress = JSON.parse(progressData);
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      data: {
        jobId,
        queueName,
        state,
        progress,
        detailedProgress,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ジョブリトライ
 */
router.post('/queue/:queueName/:jobId/retry', async (req, res, next) => {
  try {
    const { queueName, jobId } = req.params;

    const queue = queues[queueName];
    if (!queue) {
      throw new AppError(404, 'Queue not found', 'QUEUE_NOT_FOUND');
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    await job.retry();

    res.json({
      success: true,
      message: 'Job retried',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 失敗ジョブ一括リトライ
 */
router.post('/queue/:queueName/retry-all', async (req, res, next) => {
  try {
    const { queueName } = req.params;

    const queue = queues[queueName];
    if (!queue) {
      throw new AppError(404, 'Queue not found', 'QUEUE_NOT_FOUND');
    }

    const failed = await queue.getFailed();
    await Promise.all(failed.map((job) => job.retry()));

    res.json({
      success: true,
      message: `Retried ${failed.length} jobs`,
      count: failed.length,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// Phase 43-44: ジョブリカバリー
// ========================================

/**
 * 失敗ジョブ一覧取得（DB記録）
 * GET /api/jobs/failed
 */
router.get('/failed', async (req, res, next) => {
  try {
    const { status, queueName, limit = '50' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (queueName) where.queueName = queueName;

    const jobs = await prisma.failedJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

/**
 * リカバリー統計取得
 * GET /api/jobs/recovery-stats
 */
router.get('/recovery-stats', async (_req, res, next) => {
  try {
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

    res.json({ pending, retried, abandoned, byQueue: queueStats });
  } catch (error) {
    next(error);
  }
});

/**
 * ジョブをリトライ（DB記録）
 * POST /api/jobs/retry/:id
 */
router.post('/retry/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const failedJob = await prisma.failedJob.findUnique({
      where: { id },
    });

    if (!failedJob) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    if (!failedJob.canRetry) {
      throw new AppError(400, 'Job cannot be retried', 'CANNOT_RETRY');
    }

    // キューに新しいジョブを追加
    const queue = queues[failedJob.queueName];
    if (queue) {
      const newJob = await queue.add(failedJob.jobName, failedJob.jobData, {
        attempts: failedJob.maxAttempts - failedJob.attemptsMade,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });

      // ステータスをRETRIEDに更新
      await prisma.failedJob.update({
        where: { id },
        data: {
          status: 'RETRIED',
          retriedAt: new Date(),
          newJobId: newJob.id,
        },
      });
    }

    res.json({ success: true, action: 'retried' });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチリトライ
 * POST /api/jobs/retry-batch
 */
router.post('/retry-batch', async (req, res, next) => {
  try {
    const { limit = 50 } = req.body;

    const jobs = await prisma.failedJob.findMany({
      where: {
        canRetry: true,
        status: 'PENDING',
        retryAfter: { lte: new Date() },
      },
      orderBy: { retryAfter: 'asc' },
      take: limit,
    });

    let retried = 0;
    for (const job of jobs) {
      const queue = queues[job.queueName];
      if (queue) {
        const newJob = await queue.add(job.jobName, job.jobData, {
          attempts: job.maxAttempts - job.attemptsMade,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        });

        await prisma.failedJob.update({
          where: { id: job.id },
          data: {
            status: 'RETRIED',
            retriedAt: new Date(),
            newJobId: newJob.id,
          },
        });
        retried++;
      }
    }

    res.json({ success: true, total: jobs.length, retried });
  } catch (error) {
    next(error);
  }
});

/**
 * ジョブを諦める
 * POST /api/jobs/abandon/:id
 */
router.post('/abandon/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.failedJob.update({
      where: { id },
      data: {
        status: 'ABANDONED',
        canRetry: false,
      },
    });

    res.json({ success: true, action: 'abandoned' });
  } catch (error) {
    next(error);
  }
});

/**
 * 古いレコードをクリーンアップ
 * POST /api/jobs/cleanup
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const { daysOld = 7 } = req.body;
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.failedJob.deleteMany({
      where: {
        OR: [
          { status: 'RETRIED', retriedAt: { lt: cutoff } },
          { status: 'ABANDONED', createdAt: { lt: cutoff } },
        ],
      },
    });

    res.json({ success: true, deletedCount: result.count });
  } catch (error) {
    next(error);
  }
});

export { router as jobsRouter };

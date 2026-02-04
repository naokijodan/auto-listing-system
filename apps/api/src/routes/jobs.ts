import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@als/database';
import { QUEUE_NAMES } from '@als/config';
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

    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
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

export { router as jobsRouter };

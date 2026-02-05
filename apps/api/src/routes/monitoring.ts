import { Router } from 'express';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';

const router = Router();
const log = logger.child({ module: 'monitoring' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キューインスタンス
const queues = Object.values(QUEUE_NAMES).map(
  (name) => new Queue(name, { connection: redis })
);

interface Alert {
  id: string;
  type: 'error_rate' | 'queue_depth' | 'processing_time' | 'consecutive_errors';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  queueName?: string;
  value: number;
  threshold: number;
  createdAt: Date;
  acknowledged: boolean;
}

interface MetricPoint {
  timestamp: number;
  value: number;
}

/**
 * システム全体のメトリクスを取得
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    const hoursNum = Math.min(168, Math.max(1, Number(hours))); // 最大1週間
    const now = Date.now();

    // キュー別メトリクス
    const queueMetrics = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        // Redisからメトリクスを取得
        let totalCompleted = 0;
        let totalFailed = 0;
        const processingTimes: number[] = [];
        const errorsByType: Record<string, number> = {};

        for (let i = 0; i < hoursNum; i++) {
          const hourKey = Math.floor((now - i * 3600000) / 3600000);

          const completedStr = await redis.get(`rakuda:metrics:${queue.name}:${hourKey}:completed`);
          const failedStr = await redis.get(`rakuda:metrics:${queue.name}:${hourKey}:failed`);
          totalCompleted += parseInt(completedStr || '0', 10);
          totalFailed += parseInt(failedStr || '0', 10);

          const times = await redis.lrange(`rakuda:metrics:${queue.name}:${hourKey}:processing_time`, 0, -1);
          times.forEach((t) => processingTimes.push(parseInt(t, 10)));
        }

        const total = totalCompleted + totalFailed;
        const successRate = total > 0 ? (totalCompleted / total) * 100 : 100;
        const avgProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0;

        return {
          queueName: queue.name,
          completed: totalCompleted,
          failed: totalFailed,
          active,
          waiting,
          delayed,
          successRate: Math.round(successRate * 10) / 10,
          avgProcessingTime: Math.round(avgProcessingTime),
          errorsByType,
        };
      })
    );

    // 合計
    const totalJobs = {
      completed: queueMetrics.reduce((sum, q) => sum + q.completed, 0),
      failed: queueMetrics.reduce((sum, q) => sum + q.failed, 0),
      active: queueMetrics.reduce((sum, q) => sum + q.active, 0),
      waiting: queueMetrics.reduce((sum, q) => sum + q.waiting, 0),
    };

    // アラート
    const alertsStr = await redis.lrange('rakuda:alerts', 0, 99);
    const alerts = alertsStr.map((str) => JSON.parse(str) as Alert);

    res.json({
      success: true,
      data: {
        timestamp: now,
        queues: queueMetrics,
        totalJobs,
        alerts: alerts.filter((a) => !a.acknowledged).slice(0, 20),
        period: {
          hours: hoursNum,
          from: new Date(now - hoursNum * 3600000).toISOString(),
          to: new Date(now).toISOString(),
        },
      },
    });
  } catch (error) {
    log.error('Failed to get metrics', error);
    next(error);
  }
});

/**
 * キュー別の時系列データを取得
 */
router.get('/metrics/timeseries/:queueName', async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { hours = 24, metric = 'completed' } = req.query;
    const hoursNum = Math.min(168, Math.max(1, Number(hours)));
    const now = Date.now();

    const points: MetricPoint[] = [];

    for (let i = hoursNum - 1; i >= 0; i--) {
      const hourKey = Math.floor((now - i * 3600000) / 3600000);
      const timestamp = hourKey * 3600000;

      const valueStr = await redis.get(`rakuda:metrics:${queueName}:${hourKey}:${metric}`);
      const value = parseInt(valueStr || '0', 10);
      points.push({ timestamp, value });
    }

    res.json({
      success: true,
      data: {
        queueName,
        metric,
        points,
      },
    });
  } catch (error) {
    log.error('Failed to get time series data', error);
    next(error);
  }
});

/**
 * アラート一覧取得
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const { acknowledged, limit = 50 } = req.query;

    const alertsStr = await redis.lrange('rakuda:alerts', 0, Number(limit) - 1);
    let alerts = alertsStr.map((str) => JSON.parse(str) as Alert);

    if (acknowledged === 'true') {
      alerts = alerts.filter((a) => a.acknowledged);
    } else if (acknowledged === 'false') {
      alerts = alerts.filter((a) => !a.acknowledged);
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    log.error('Failed to get alerts', error);
    next(error);
  }
});

/**
 * アラートを確認済みにする
 */
router.post('/alerts/:alertId/acknowledge', async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alertsStr = await redis.lrange('rakuda:alerts', 0, 999);
    const alerts = alertsStr.map((str) => JSON.parse(str) as Alert);

    const alertIndex = alerts.findIndex((a) => a.id === alertId);
    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    alerts[alertIndex].acknowledged = true;

    // 更新
    await redis.del('rakuda:alerts');
    for (const alert of alerts.reverse()) {
      await redis.lpush('rakuda:alerts', JSON.stringify(alert));
    }

    res.json({
      success: true,
      data: { acknowledged: true, alertId },
    });
  } catch (error) {
    log.error('Failed to acknowledge alert', error);
    next(error);
  }
});

/**
 * 全アラートを確認済みにする
 */
router.post('/alerts/acknowledge-all', async (req, res, next) => {
  try {
    const alertsStr = await redis.lrange('rakuda:alerts', 0, 999);
    const alerts = alertsStr.map((str) => {
      const alert = JSON.parse(str) as Alert;
      alert.acknowledged = true;
      return alert;
    });

    await redis.del('rakuda:alerts');
    for (const alert of alerts.reverse()) {
      await redis.lpush('rakuda:alerts', JSON.stringify(alert));
    }

    res.json({
      success: true,
      data: { acknowledged: alerts.length },
    });
  } catch (error) {
    log.error('Failed to acknowledge all alerts', error);
    next(error);
  }
});

/**
 * エラーログを取得
 */
router.get('/errors', async (req, res, next) => {
  try {
    const { queueName, limit = 50 } = req.query;

    // 失敗したジョブを取得
    const errors = [];

    for (const queue of queues) {
      if (queueName && queue.name !== queueName) continue;

      const failedJobs = await queue.getFailed(0, Number(limit) - 1);
      for (const job of failedJobs) {
        errors.push({
          id: job.id,
          queueName: queue.name,
          jobName: job.name,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        });
      }
    }

    // 時刻でソート
    errors.sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0));

    res.json({
      success: true,
      data: errors.slice(0, Number(limit)),
    });
  } catch (error) {
    log.error('Failed to get errors', error);
    next(error);
  }
});

/**
 * ヘルスチェック
 */
router.get('/health', async (req, res, next) => {
  try {
    // Redis接続チェック
    await redis.ping();

    // キューチェック
    const queueHealth = await Promise.all(
      queues.map(async (queue) => {
        try {
          await queue.getWaitingCount();
          return { name: queue.name, status: 'healthy' };
        } catch {
          return { name: queue.name, status: 'unhealthy' };
        }
      })
    );

    const allHealthy = queueHealth.every((q) => q.status === 'healthy');

    res.json({
      success: true,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        redis: 'connected',
        queues: queueHealth,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('Health check failed', error);
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: (error as Error).message,
      },
    });
  }
});

export { router as monitoringRouter };

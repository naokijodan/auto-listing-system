import { Router } from 'express';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { logger, getLogAggregator } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { prisma } from '@rakuda/database';

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

/**
 * ログ検索
 */
router.get('/logs', async (req, res, next) => {
  try {
    const {
      startTime,
      endTime,
      level,
      module,
      type,
      jobId,
      queueName,
      requestId,
      search,
      limit = 100,
      offset = 0,
    } = req.query;

    const aggregator = getLogAggregator();
    const result = await aggregator.search({
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      level: level as string | undefined,
      module: module as string | undefined,
      type: type as string | undefined,
      jobId: jobId as string | undefined,
      queueName: queueName as string | undefined,
      requestId: requestId as string | undefined,
      search: search as string | undefined,
      limit: Math.min(1000, Number(limit)),
      offset: Number(offset),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to search logs', error);
    next(error);
  }
});

/**
 * ログ統計を取得
 */
router.get('/logs/stats', async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;

    const aggregator = getLogAggregator();
    const stats = await aggregator.getStats({
      hours: Math.min(168, Math.max(1, Number(hours))),
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error('Failed to get log stats', error);
    next(error);
  }
});

/**
 * ログをエクスポート
 */
router.get('/logs/export', async (req, res, next) => {
  try {
    const {
      startTime,
      endTime,
      level,
      module,
      type,
      format = 'ndjson',
    } = req.query;

    const aggregator = getLogAggregator();
    const data = await aggregator.export({
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      level: level as string | undefined,
      module: module as string | undefined,
      type: type as string | undefined,
      format: format as 'json' | 'ndjson' | 'csv',
    });

    // Content-Type設定
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      ndjson: 'application/x-ndjson',
      csv: 'text/csv',
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', contentTypes[format as string] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="rakuda-logs-${timestamp}.${format}"`);
    res.send(data);
  } catch (error) {
    log.error('Failed to export logs', error);
    next(error);
  }
});

export { router as monitoringRouter };

// =====================
// Phase 4 監視API 追加
// =====================

// GET /api/monitoring/scraping-stats
router.get('/scraping-stats', async (req, res, next) => {
  try {
    const now = new Date();
    const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const whereBase = { queueName: QUEUE_NAMES.SCRAPE } as const;

    const [
      total24, failed24, total7, failed7, total30, failed30,
    ] = await Promise.all([
      prisma.jobLog.count({ where: { ...whereBase, createdAt: { gte: start24h } } }),
      prisma.jobLog.count({ where: { ...whereBase, status: 'FAILED', createdAt: { gte: start24h } } }),
      prisma.jobLog.count({ where: { ...whereBase, createdAt: { gte: start7d } } }),
      prisma.jobLog.count({ where: { ...whereBase, status: 'FAILED', createdAt: { gte: start7d } } }),
      prisma.jobLog.count({ where: { ...whereBase, createdAt: { gte: start30d } } }),
      prisma.jobLog.count({ where: { ...whereBase, status: 'FAILED', createdAt: { gte: start30d } } }),
    ]);

    // Ban検知（簡易ヒューリスティック）
    const banWhere = {
      ...whereBase,
      status: 'FAILED',
      createdAt: { gte: start7d },
      OR: [
        { errorMessage: { contains: 'ban', mode: 'insensitive' } },
        { errorMessage: { contains: 'blocked', mode: 'insensitive' } },
        { errorMessage: { contains: 'captcha', mode: 'insensitive' } },
        { errorMessage: { contains: '403' } },
      ],
    } as const;
    const banDetections7d = await prisma.jobLog.count({ where: banWhere });

    // ソースタイプ別統計（直近7日）
    const recentScrapeLogs = await prisma.jobLog.findMany({
      where: { ...whereBase, createdAt: { gte: start7d } },
      select: { status: true, product: { select: { source: { select: { type: true } } } } },
      take: 5000, // 安全のため上限
      orderBy: { createdAt: 'desc' },
    });
    const bySource: Record<string, { total: number; failed: number; successRate: number }> = {};
    for (const log of recentScrapeLogs) {
      const type = log.product?.source?.type || 'OTHER';
      if (!bySource[type]) bySource[type] = { total: 0, failed: 0, successRate: 100 };
      bySource[type].total += 1;
      if (log.status === 'FAILED') bySource[type].failed += 1;
    }
    for (const key of Object.keys(bySource)) {
      const item = bySource[key];
      const succ = item.total - item.failed;
      item.successRate = item.total > 0 ? Math.round((succ / item.total) * 1000) / 10 : 100;
    }

    // 時間帯別のエラー率（直近24h）
    const hourly: Array<{ hour: string; total: number; failed: number; errorRate: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
      // eslint-disable-next-line no-await-in-loop
      const [t, f] = await Promise.all([
        prisma.jobLog.count({ where: { ...whereBase, createdAt: { gte: hourStart, lt: hourEnd } } }),
        prisma.jobLog.count({ where: { ...whereBase, status: 'FAILED', createdAt: { gte: hourStart, lt: hourEnd } } }),
      ]);
      hourly.push({
        hour: hourStart.toISOString(),
        total: t,
        failed: f,
        errorRate: t > 0 ? Math.round((f / t) * 1000) / 10 : 0,
      });
    }

    const resp = {
      summary: {
        last24h: {
          total: total24,
          failed: failed24,
          successRate: total24 > 0 ? Math.round(((total24 - failed24) / total24) * 1000) / 10 : 100,
        },
        last7d: {
          total: total7,
          failed: failed7,
          successRate: total7 > 0 ? Math.round(((total7 - failed7) / total7) * 1000) / 10 : 100,
          banDetections: banDetections7d,
        },
        last30d: {
          total: total30,
          failed: failed30,
          successRate: total30 > 0 ? Math.round(((total30 - failed30) / total30) * 1000) / 10 : 100,
        },
      },
      bySource,
      hourly,
    } as const;

    res.json({ success: true, data: resp });
  } catch (error) {
    log.error('Failed to get scraping-stats', error);
    next(error);
  }
});

// GET /api/monitoring/system-health
router.get('/system-health', async (_req, res, next) => {
  try {
    // Redis/DB 状態
    let redisStatus: 'CONNECTED' | 'ERROR' = 'CONNECTED';
    let dbStatus: 'CONNECTED' | 'ERROR' = 'CONNECTED';
    try { await redis.ping(); } catch { redisStatus = 'ERROR'; }
    try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'ERROR'; }

    // キュー状態
    const queueStates = await Promise.all(
      queues.map(async (q) => {
        const [waiting, active, failed, completed] = await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getFailedCount(),
          q.getCompletedCount(),
        ]);
        return { name: q.name, waiting, active, failed, completed };
      })
    );

    // スケジューラー（同期設定など）の最終実行時刻
    const schedulers = await prisma.marketplaceSyncSetting.findMany({
      select: { marketplace: true, syncType: true, lastRunAt: true, isEnabled: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // ヘルス判定
    const anyQueueBacklog = queueStates.some((s) => s.waiting > 100 || s.failed > 10);
    const unhealthy = redisStatus === 'ERROR' || dbStatus === 'ERROR';
    const health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = unhealthy
      ? 'UNHEALTHY'
      : anyQueueBacklog
        ? 'DEGRADED'
        : 'HEALTHY';

    res.json({
      success: true,
      data: {
        status: health,
        redis: redisStatus,
        database: dbStatus,
        queues: queueStates,
        schedulers,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('Failed to get system-health', error);
    next(error);
  }
});

// GET /api/monitoring/inventory-stats
router.get('/inventory-stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 在庫チェック数（InventoryLog）
    const checkedCount = await prisma.inventoryLog.count({ where: { checkedAt: { gte: todayStart } } });

    // 在庫切れ検知数（InventoryAlert: STOCK_OUT）
    const outOfStockCount = await prisma.inventoryAlert.count({
      where: { alertType: 'STOCK_OUT', createdAt: { gte: todayStart } },
    });

    // 価格変動検知数（InventoryLog.priceChanged）
    const priceChangeCount = await prisma.inventoryLog.count({
      where: { checkedAt: { gte: todayStart }, priceChanged: true },
    });

    // ソースタイプ別（今日）
    const logs = await prisma.inventoryLog.findMany({
      where: { checkedAt: { gte: todayStart } },
      select: { product: { select: { source: { select: { type: true } } } }, priceChanged: true, stockChanged: true },
      take: 5000,
      orderBy: { checkedAt: 'desc' },
    });
    const bySource: Record<string, { checked: number; priceChanged: number }> = {};
    for (const l of logs) {
      const type = l.product?.source?.type || 'OTHER';
      if (!bySource[type]) bySource[type] = { checked: 0, priceChanged: 0 };
      bySource[type].checked += 1;
      if (l.priceChanged) bySource[type].priceChanged += 1;
    }

    res.json({
      success: true,
      data: {
        today: {
          checked: checkedCount,
          outOfStock: outOfStockCount,
          priceChanges: priceChangeCount,
        },
        bySource,
      },
    });
  } catch (error) {
    log.error('Failed to get inventory-stats', error);
    next(error);
  }
});

// GET /api/monitoring/marketplace-sync
router.get('/marketplace-sync', async (_req, res, next) => {
  try {
    const marketplaces: Array<'JOOM' | 'EBAY'> = ['JOOM', 'EBAY'];

    const result: Record<string, any> = {};
    for (const mp of marketplaces) {
      // eslint-disable-next-line no-await-in-loop
      const [states, last] = await Promise.all([
        prisma.marketplaceSyncState.groupBy({
          by: ['syncStatus'],
          where: { marketplace: mp },
          _count: true,
        }),
        prisma.marketplaceSyncState.findFirst({
          where: { marketplace: mp, lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true },
        }),
      ]);

      const counts: Record<string, number> = { SYNCED: 0, PENDING: 0, ERROR: 0, STALE: 0, SYNCING: 0 };
      for (const s of states) counts[s.syncStatus] = s._count as unknown as number;

      result[mp.toLowerCase()] = {
        counts: {
          synced: counts.SYNCED || 0,
          pending: (counts.PENDING || 0) + (counts.STALE || 0) + (counts.SYNCING || 0),
          error: counts.ERROR || 0,
        },
        lastSyncAt: last?.lastSyncAt ?? null,
      };
    }

    res.json({ success: true, data: result });
  } catch (error) {
    log.error('Failed to get marketplace-sync', error);
    next(error);
  }
});

// GET /api/monitoring/alerts/recent
router.get('/alerts/recent', async (_req, res, next) => {
  try {
    const alerts = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, type: true, message: true, severity: true, createdAt: true, title: true },
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    log.error('Failed to get recent alerts', error);
    next(error);
  }
});

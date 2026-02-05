import { Router } from 'express';
import { prisma } from '@rakuda/database';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const router = Router();

// Redis接続（シングルトン）
let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  }
  return redis;
}

// ヘルスチェック履歴のRedisキー
const HEALTH_HISTORY_KEY = 'rakuda:health:history';
const HEALTH_CURRENT_KEY = 'rakuda:health:current';
const HEALTH_HISTORY_MAX = 100; // 最大履歴数

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: 'ok' | 'error' | 'unknown';
    redis: 'ok' | 'error' | 'unknown';
  };
  responseTime?: {
    database: number | null;
    redis: number | null;
  };
}

/**
 * ヘルスチェック結果をRedisに保存
 */
async function persistHealthCheck(check: HealthCheck): Promise<void> {
  try {
    const redisClient = getRedis();

    // 現在の状態を保存
    await redisClient.set(HEALTH_CURRENT_KEY, JSON.stringify(check), 'EX', 60);

    // 履歴に追加（リストの先頭に追加）
    await redisClient.lpush(HEALTH_HISTORY_KEY, JSON.stringify(check));

    // 履歴の最大数を超えたら古いものを削除
    await redisClient.ltrim(HEALTH_HISTORY_KEY, 0, HEALTH_HISTORY_MAX - 1);

    // 履歴のTTLを設定（24時間）
    await redisClient.expire(HEALTH_HISTORY_KEY, 86400);
  } catch (error) {
    logger.warn({ type: 'health_persist_error', error: (error as Error).message });
  }
}

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: システムヘルスチェック
 *     description: データベースとRedisの接続状態を確認します
 *     security: []
 *     responses:
 *       200:
 *         description: すべてのサービスが正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded, down]
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       enum: [ok, error, unknown]
 *                     redis:
 *                       type: string
 *                       enum: [ok, error, unknown]
 *                 responseTime:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: number
 *                       description: Database response time in ms
 *                     redis:
 *                       type: number
 *                       description: Redis response time in ms
 *       503:
 *         description: 一部のサービスに問題あり
 */
router.get('/', async (_req, res) => {
  const checks: HealthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
    responseTime: {
      database: null,
      redis: null,
    },
  };

  // PostgreSQL チェック
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = 'ok';
    checks.responseTime!.database = Date.now() - dbStart;
  } catch (error) {
    checks.services.database = 'error';
    checks.status = 'degraded';
    checks.responseTime!.database = Date.now() - dbStart;
  }

  // Redis チェック
  const redisStart = Date.now();
  try {
    const redisClient = getRedis();
    await redisClient.ping();
    checks.services.redis = 'ok';
    checks.responseTime!.redis = Date.now() - redisStart;
  } catch (error) {
    checks.services.redis = 'error';
    checks.status = 'degraded';
    checks.responseTime!.redis = Date.now() - redisStart;
  }

  // 両方エラーの場合はdown
  if (checks.services.database === 'error' && checks.services.redis === 'error') {
    checks.status = 'down';
  }

  // 結果を永続化（非同期）
  persistHealthCheck(checks).catch(() => {});

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

/**
 * @openapi
 * /api/health/history:
 *   get:
 *     tags:
 *       - Health
 *     summary: ヘルスチェック履歴
 *     description: 過去のヘルスチェック結果の履歴を取得します
 *     security: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: 取得件数
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: ヘルスチェック履歴
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                           services:
 *                             type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalChecks:
 *                           type: integer
 *                         okCount:
 *                           type: integer
 *                         degradedCount:
 *                           type: integer
 *                         downCount:
 *                           type: integer
 *                         uptime:
 *                           type: number
 *                           description: Uptime percentage
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const redisClient = getRedis();

    const historyRaw = await redisClient.lrange(HEALTH_HISTORY_KEY, 0, limit - 1);
    const history = historyRaw.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // 統計計算
    const stats = {
      totalChecks: history.length,
      okCount: history.filter((h: HealthCheck) => h.status === 'ok').length,
      degradedCount: history.filter((h: HealthCheck) => h.status === 'degraded').length,
      downCount: history.filter((h: HealthCheck) => h.status === 'down').length,
      uptime: 0,
    };

    if (stats.totalChecks > 0) {
      stats.uptime = Math.round((stats.okCount / stats.totalChecks) * 10000) / 100;
    }

    res.json({
      success: true,
      data: {
        history,
        stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health history',
    });
  }
});

/**
 * @openapi
 * /api/health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readinessチェック
 *     description: Kubernetes Readiness Probeで使用。データベース接続を確認します
 *     security: []
 *     responses:
 *       200:
 *         description: アプリケーションがリクエストを受け付ける準備ができている
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *       503:
 *         description: アプリケーションがリクエストを受け付ける準備ができていない
 */
router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

/**
 * @openapi
 * /api/health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: Livenessチェック
 *     description: Kubernetes Liveness Probeで使用。プロセスが生きているか確認します
 *     security: []
 *     responses:
 *       200:
 *         description: アプリケーションが実行中
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 */
router.get('/live', (_req, res) => {
  res.status(200).json({ alive: true });
});

/**
 * @openapi
 * /api/health/metrics:
 *   get:
 *     tags:
 *       - Health
 *     summary: システムメトリクス
 *     description: システムの詳細なメトリクスを取得します
 *     security: []
 *     responses:
 *       200:
 *         description: システムメトリクス
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     process:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                     system:
 *                       type: object
 */
router.get('/metrics', async (_req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    data: {
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        nodeVersion: process.version,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          unit: 'MB',
        },
      },
      timestamp: new Date().toISOString(),
    },
  });
});

export { router as healthRouter };

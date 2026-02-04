import { Router } from 'express';
import { prisma } from '@rakuda/database';
import IORedis from 'ioredis';

const router = Router();

/**
 * ヘルスチェックエンドポイント
 */
router.get('/', async (_req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // PostgreSQL チェック
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = 'ok';
  } catch (error) {
    checks.services.database = 'error';
    checks.status = 'degraded';
  }

  try {
    // Redis チェック
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    await redis.quit();
    checks.services.redis = 'ok';
  } catch (error) {
    checks.services.redis = 'error';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

/**
 * 詳細ヘルスチェック（内部用）
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
 * Liveness チェック
 */
router.get('/live', (_req, res) => {
  res.status(200).json({ alive: true });
});

export { router as healthRouter };

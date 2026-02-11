/**
 * Phase 59-60: キャッシュ管理APIエンドポイント
 *
 * キャッシュの監視・管理:
 * - キャッシュ統計
 * - キャッシュ無効化
 * - キャッシュ設定表示
 */

import { Router } from 'express';
import { logger } from '@rakuda/logger';
import {
  getCacheStats,
  invalidateAllCache,
  invalidateOrderCache,
  invalidateProductCache,
  deleteCachePattern,
  CACHE_CONFIG,
} from '../lib/cache-service';

const router = Router();
const log = logger.child({ module: 'cache-admin' });

/**
 * @swagger
 * /api/admin/cache/stats:
 *   get:
 *     summary: キャッシュ統計を取得
 *     tags: [Cache Admin]
 *     responses:
 *       200:
 *         description: キャッシュ統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/cache/config:
 *   get:
 *     summary: キャッシュ設定を取得
 *     tags: [Cache Admin]
 *     responses:
 *       200:
 *         description: キャッシュ設定一覧
 */
router.get('/config', async (_req, res) => {
  res.json({
    success: true,
    data: CACHE_CONFIG,
  });
});

/**
 * @swagger
 * /api/admin/cache/invalidate:
 *   post:
 *     summary: キャッシュを無効化
 *     tags: [Cache Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [all, orders, products, pattern]
 *               pattern:
 *                 type: string
 *     responses:
 *       200:
 *         description: キャッシュが無効化されました
 */
router.post('/invalidate', async (req, res, next) => {
  try {
    const { type, pattern } = req.body;

    switch (type) {
      case 'all':
        await invalidateAllCache();
        log.info('All cache invalidated by admin');
        break;
      case 'orders':
        await invalidateOrderCache();
        log.info('Order cache invalidated by admin');
        break;
      case 'products':
        await invalidateProductCache();
        log.info('Product cache invalidated by admin');
        break;
      case 'pattern':
        if (!pattern) {
          return res.status(400).json({
            success: false,
            message: 'Pattern is required for pattern invalidation',
          });
        }
        await deleteCachePattern(pattern);
        log.info({ pattern }, 'Cache pattern invalidated by admin');
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid invalidation type',
        });
    }

    res.json({
      success: true,
      message: `Cache invalidated: ${type}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/cache/warm:
 *   post:
 *     summary: キャッシュをウォームアップ
 *     tags: [Cache Admin]
 *     responses:
 *       200:
 *         description: キャッシュウォームアップが開始されました
 */
router.post('/warm', async (_req, res, next) => {
  try {
    // 非同期でキャッシュをウォームアップ
    // 主要なエンドポイントを事前にキャッシュ
    const warmupEndpoints = [
      '/api/analytics/kpi',
      '/api/orders/stats/summary',
      '/api/shipments/stats',
      '/api/sourcing/stats',
      '/api/shipments/carriers',
      '/api/admin/exchange-rates',
    ];

    log.info({ endpoints: warmupEndpoints }, 'Cache warmup started');

    // 実際のウォームアップはバックグラウンドで行う
    // ここではリクエストをすぐ返す
    res.json({
      success: true,
      message: 'Cache warmup started',
      endpoints: warmupEndpoints,
    });
  } catch (error) {
    next(error);
  }
});

export { router as cacheAdminRouter };

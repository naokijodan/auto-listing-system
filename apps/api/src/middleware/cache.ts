/**
 * Phase 59-60: キャッシュミドルウェア
 *
 * APIレスポンスの自動キャッシュ:
 * - GETリクエストのキャッシュ
 * - パラメータベースのキャッシュキー生成
 * - Cache-Controlヘッダー設定
 */

import { Request, Response, NextFunction } from 'express';
import { getCache, setCache } from '../lib/cache-service';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'cache-middleware' });

interface CacheOptions {
  ttl?: number; // キャッシュTTL（秒）
  keyPrefix?: string; // キャッシュキーのプレフィックス
  keyGenerator?: (req: Request) => string; // カスタムキー生成関数
  condition?: (req: Request) => boolean; // キャッシュ条件
}

/**
 * APIレスポンスをキャッシュするミドルウェア
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 60,
    keyPrefix = 'api',
    keyGenerator,
    condition,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // GETリクエストのみキャッシュ
    if (req.method !== 'GET') {
      return next();
    }

    // 条件チェック
    if (condition && !condition(req)) {
      return next();
    }

    // キャッシュキー生成
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `${keyPrefix}:${req.originalUrl}`;

    try {
      // キャッシュから取得
      const cached = await getCache<unknown>(cacheKey);

      if (cached !== null) {
        log.debug({ cacheKey }, 'Serving from cache');

        // Cache-Controlヘッダー設定
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `private, max-age=${ttl}`);

        return res.json(cached);
      }

      // キャッシュミス - レスポンスをインターセプト
      const originalJson = res.json.bind(res);

      res.json = function(data: unknown) {
        // 成功レスポンスのみキャッシュ
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, ttl).catch((err) => {
            log.error({ cacheKey, error: err }, 'Failed to cache response');
          });
        }

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `private, max-age=${ttl}`);

        return originalJson(data);
      };

      next();
    } catch (error) {
      log.error({ cacheKey, error }, 'Cache middleware error');
      next();
    }
  };
}

/**
 * 特定のパスパターンに対するキャッシュ設定
 */
export const routeCacheConfig: Record<string, CacheOptions> = {
  // KPI・統計系（1分）
  '/api/analytics/kpi': { ttl: 60, keyPrefix: 'kpi' },
  '/api/orders/stats/summary': { ttl: 60, keyPrefix: 'order-stats' },
  '/api/analytics/marketplace-stats': { ttl: 60, keyPrefix: 'mp-stats' },

  // 発送・仕入れ系（30秒）
  '/api/shipments/stats': { ttl: 30, keyPrefix: 'shipment-stats' },
  '/api/sourcing/stats': { ttl: 30, keyPrefix: 'sourcing-stats' },

  // マスタデータ系（5分）
  '/api/shipments/carriers': { ttl: 300, keyPrefix: 'carriers' },
  '/api/categories': { ttl: 300, keyPrefix: 'categories' },

  // 為替レート（5分）
  '/api/admin/exchange-rates': { ttl: 300, keyPrefix: 'exchange' },

  // ランキング系（5分）
  '/api/analytics/rankings/brand': { ttl: 300, keyPrefix: 'brand-rank' },
  '/api/analytics/rankings/category': { ttl: 300, keyPrefix: 'cat-rank' },

  // トレンド系（3分）
  '/api/analytics/trends/sales': { ttl: 180, keyPrefix: 'sales-trend' },
  '/api/analytics/financial/daily': { ttl: 180, keyPrefix: 'fin-daily' },
};

/**
 * ルートベースのキャッシュミドルウェア
 */
export function routeCache(path: string) {
  const config = routeCacheConfig[path];
  if (!config) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return cacheMiddleware(config);
}

/**
 * キャッシュ無効化ミドルウェア
 * POST/PUT/PATCH/DELETE時にキャッシュを無効化
 */
export function cacheInvalidationMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 書き込み系リクエストのみ
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // レスポンス後にキャッシュ無効化
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const { deleteCachePattern } = await import('../lib/cache-service');

        for (const pattern of patterns) {
          await deleteCachePattern(pattern);
        }

        log.debug({ patterns, method: req.method, path: req.path }, 'Cache invalidated');
      }
    });

    next();
  };
}

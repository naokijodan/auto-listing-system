/**
 * Phase 59-60: Redis キャッシュサービス
 *
 * APIレスポンスのキャッシュを管理:
 * - KPI/統計データのキャッシュ
 * - 発送・仕入れ統計のキャッシュ
 * - TTL管理
 * - キャッシュ無効化
 */

import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'cache-service' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'rakuda:cache:';

// デフォルトTTL（秒）
const DEFAULT_TTL = 60; // 1分

// キャッシュ設定
export const CACHE_CONFIG: Record<string, { ttl: number; key: string }> = {
  // KPI・統計系（1分キャッシュ）
  KPI: { ttl: 60, key: 'kpi' },
  ORDER_STATS: { ttl: 60, key: 'order-stats' },
  MARKETPLACE_STATS: { ttl: 60, key: 'marketplace-stats' },

  // 発送・仕入れ系（30秒キャッシュ）
  SHIPMENT_STATS: { ttl: 30, key: 'shipment-stats' },
  SOURCING_STATS: { ttl: 30, key: 'sourcing-stats' },
  PENDING_SHIPMENTS: { ttl: 30, key: 'pending-shipments' },
  PENDING_SOURCING: { ttl: 30, key: 'pending-sourcing' },

  // マスタデータ系（5分キャッシュ）
  CARRIERS: { ttl: 300, key: 'carriers' },
  CATEGORIES: { ttl: 300, key: 'categories' },

  // 為替レート（5分キャッシュ）
  EXCHANGE_RATE: { ttl: 300, key: 'exchange-rate' },

  // ランキング系（5分キャッシュ）
  BRAND_RANKINGS: { ttl: 300, key: 'brand-rankings' },
  CATEGORY_RANKINGS: { ttl: 300, key: 'category-rankings' },

  // トレンド系（3分キャッシュ）
  SALES_TRENDS: { ttl: 180, key: 'sales-trends' },
  FINANCIAL_DAILY: { ttl: 180, key: 'financial-daily' },
};

/**
 * キャッシュからデータを取得
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const fullKey = CACHE_PREFIX + key;
    const data = await redis.get(fullKey);

    if (data) {
      log.debug({ key: fullKey }, 'Cache hit');
      return JSON.parse(data);
    }

    log.debug({ key: fullKey }, 'Cache miss');
    return null;
  } catch (error) {
    log.error({ key, error }, 'Cache get error');
    return null;
  }
}

/**
 * データをキャッシュに保存
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const fullKey = CACHE_PREFIX + key;
    await redis.setex(fullKey, ttl, JSON.stringify(data));
    log.debug({ key: fullKey, ttl }, 'Cache set');
  } catch (error) {
    log.error({ key, error }, 'Cache set error');
  }
}

/**
 * キャッシュを削除
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const fullKey = CACHE_PREFIX + key;
    await redis.del(fullKey);
    log.debug({ key: fullKey }, 'Cache deleted');
  } catch (error) {
    log.error({ key, error }, 'Cache delete error');
  }
}

/**
 * パターンに一致するキャッシュを削除
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const fullPattern = CACHE_PREFIX + pattern;
    const keys = await redis.keys(fullPattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      log.info({ pattern: fullPattern, count: keys.length }, 'Cache pattern deleted');
    }
  } catch (error) {
    log.error({ pattern, error }, 'Cache pattern delete error');
  }
}

/**
 * 設定済みのキャッシュタイプを使ってデータを取得/保存
 */
export async function getCachedData<T>(
  cacheType: keyof typeof CACHE_CONFIG,
  fetchFn: () => Promise<T>,
  params?: Record<string, unknown>
): Promise<T> {
  const config = CACHE_CONFIG[cacheType];
  const cacheKey = params
    ? `${config.key}:${JSON.stringify(params)}`
    : config.key;

  // キャッシュから取得を試みる
  const cached = await getCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // キャッシュがなければデータを取得
  const data = await fetchFn();

  // キャッシュに保存
  await setCache(cacheKey, data, config.ttl);

  return data;
}

/**
 * 注文関連のキャッシュを無効化
 */
export async function invalidateOrderCache(): Promise<void> {
  await Promise.all([
    deleteCachePattern('order-stats*'),
    deleteCachePattern('pending-shipments*'),
    deleteCachePattern('pending-sourcing*'),
    deleteCachePattern('shipment-stats*'),
    deleteCachePattern('sourcing-stats*'),
    deleteCachePattern('kpi*'),
  ]);
  log.info('Order-related cache invalidated');
}

/**
 * 商品関連のキャッシュを無効化
 */
export async function invalidateProductCache(): Promise<void> {
  await Promise.all([
    deleteCachePattern('kpi*'),
    deleteCachePattern('marketplace-stats*'),
    deleteCachePattern('brand-rankings*'),
    deleteCachePattern('category-rankings*'),
  ]);
  log.info('Product-related cache invalidated');
}

/**
 * 全キャッシュを無効化
 */
export async function invalidateAllCache(): Promise<void> {
  await deleteCachePattern('*');
  log.info('All cache invalidated');
}

/**
 * キャッシュ統計を取得
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memoryUsed: string;
  hitRate: string;
}> {
  try {
    const keys = await redis.keys(CACHE_PREFIX + '*');
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    return {
      keys: keys.length,
      memoryUsed: memoryMatch ? memoryMatch[1] : 'unknown',
      hitRate: 'N/A', // 別途計算が必要
    };
  } catch (error) {
    log.error({ error }, 'Failed to get cache stats');
    return {
      keys: 0,
      memoryUsed: 'unknown',
      hitRate: 'N/A',
    };
  }
}

// Redis接続エラーハンドリング
redis.on('error', (error) => {
  log.error({ error }, 'Redis connection error');
});

redis.on('connect', () => {
  log.info('Redis cache connected');
});

export { redis as cacheRedis };

import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'cache' });

// Redis接続
let redis: IORedis | null = null;

try {
  redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    log.warn({ type: 'redis_cache_error', error: err.message });
  });
} catch (error) {
  log.warn('Redis not available for caching');
}

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'rakuda:cache:';

// デフォルトTTL（秒）
const DEFAULT_TTL = 60; // 1分

/**
 * キャッシュキーを生成
 */
function getCacheKey(namespace: string, key: string): string {
  return `${CACHE_PREFIX}${namespace}:${key}`;
}

/**
 * キャッシュからデータを取得
 */
export async function getCache<T>(namespace: string, key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const cacheKey = getCacheKey(namespace, key);
    const data = await redis.get(cacheKey);

    if (data) {
      log.debug({ type: 'cache_hit', namespace, key });
      return JSON.parse(data) as T;
    }

    log.debug({ type: 'cache_miss', namespace, key });
    return null;
  } catch (error: any) {
    log.warn({ type: 'cache_get_error', namespace, key, error: error.message });
    return null;
  }
}

/**
 * キャッシュにデータを保存
 */
export async function setCache<T>(
  namespace: string,
  key: string,
  data: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  if (!redis) return;

  try {
    const cacheKey = getCacheKey(namespace, key);
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
    log.debug({ type: 'cache_set', namespace, key, ttl: ttlSeconds });
  } catch (error: any) {
    log.warn({ type: 'cache_set_error', namespace, key, error: error.message });
  }
}

/**
 * キャッシュを削除
 */
export async function deleteCache(namespace: string, key: string): Promise<void> {
  if (!redis) return;

  try {
    const cacheKey = getCacheKey(namespace, key);
    await redis.del(cacheKey);
    log.debug({ type: 'cache_delete', namespace, key });
  } catch (error: any) {
    log.warn({ type: 'cache_delete_error', namespace, key, error: error.message });
  }
}

/**
 * 名前空間のキャッシュを全て削除
 */
export async function invalidateNamespace(namespace: string): Promise<void> {
  if (!redis) return;

  try {
    const pattern = `${CACHE_PREFIX}${namespace}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      log.info({ type: 'cache_invalidate_namespace', namespace, count: keys.length });
    }
  } catch (error: any) {
    log.warn({ type: 'cache_invalidate_error', namespace, error: error.message });
  }
}

/**
 * キャッシュを通してデータを取得（キャッシュがなければ取得して保存）
 */
export async function withCache<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  // キャッシュから取得を試みる
  const cached = await getCache<T>(namespace, key);
  if (cached !== null) {
    return cached;
  }

  // データを取得
  const data = await fetcher();

  // キャッシュに保存（非同期で実行、エラーは無視）
  setCache(namespace, key, data, ttlSeconds).catch(() => {});

  return data;
}

// キャッシュTTL定数（秒）
export const CACHE_TTL = {
  KPI: 30,           // KPIは30秒
  TRENDS: 60,        // トレンドは1分
  RANKINGS: 120,     // ランキングは2分
  FINANCIAL: 60,     // 財務データは1分
  EXCHANGE_RATE: 300,// 為替レートは5分
} as const;

// キャッシュ名前空間
export const CACHE_NS = {
  ANALYTICS: 'analytics',
  PRODUCTS: 'products',
  LISTINGS: 'listings',
  EXCHANGE_RATE: 'exchange-rate',
} as const;

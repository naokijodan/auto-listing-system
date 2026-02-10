/**
 * キャッシュサービス
 * Phase 31: パフォーマンス最適化
 */

import { prisma, CacheType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import IORedis from 'ioredis';
import * as crypto from 'crypto';

const log = logger.child({ module: 'cache-service' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キャッシュ設定
export interface CacheOptions {
  ttl?: number;       // TTL（秒）
  tags?: string[];    // タグ
  forceRefresh?: boolean;  // 強制リフレッシュ
}

// キャッシュ結果
export interface CacheResult<T> {
  hit: boolean;
  value: T | null;
  fromCache: boolean;
  key: string;
}

// キャッシュ設定定義
export interface CacheConfigDefinition {
  name: string;
  description?: string;
  cacheType?: CacheType;
  ttlSeconds?: number;
  maxEntries?: number;
  tags?: string[];
  invalidateOn?: string[];
}

/**
 * キャッシュ設定を作成/取得
 */
export async function getOrCreateCacheConfig(
  name: string,
  defaults?: Partial<CacheConfigDefinition>
): Promise<{ id: string; ttlSeconds: number; tags: string[] }> {
  let config = await prisma.cacheConfig.findUnique({
    where: { name },
  });

  if (!config) {
    config = await prisma.cacheConfig.create({
      data: {
        name,
        description: defaults?.description,
        cacheType: defaults?.cacheType || 'QUERY',
        ttlSeconds: defaults?.ttlSeconds || 300,
        maxEntries: defaults?.maxEntries,
        tags: defaults?.tags || [],
        invalidateOn: defaults?.invalidateOn || [],
      },
    });
    log.info({ configId: config.id, name }, 'Cache config created');
  }

  return {
    id: config.id,
    ttlSeconds: config.ttlSeconds,
    tags: config.tags,
  };
}

/**
 * キャッシュキーを生成
 */
export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(parts));
  return `${prefix}:${hash.digest('hex')}`;
}

/**
 * キャッシュから値を取得
 */
export async function get<T>(
  configName: string,
  key: string
): Promise<CacheResult<T>> {
  try {
    // Redisから取得
    const cached = await redis.get(`cache:${configName}:${key}`);

    if (cached) {
      // ヒットカウントを更新（非同期）
      updateHitStats(configName, key, true).catch(() => {});

      return {
        hit: true,
        value: JSON.parse(cached) as T,
        fromCache: true,
        key,
      };
    }

    // ミスカウントを更新（非同期）
    updateHitStats(configName, key, false).catch(() => {});

    return {
      hit: false,
      value: null,
      fromCache: false,
      key,
    };
  } catch (error) {
    log.error({ configName, key, error }, 'Cache get error');
    return {
      hit: false,
      value: null,
      fromCache: false,
      key,
    };
  }
}

/**
 * キャッシュに値を設定
 */
export async function set<T>(
  configName: string,
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  try {
    const config = await getOrCreateCacheConfig(configName);
    const ttl = options?.ttl || config.ttlSeconds;
    const tags = [...(config.tags || []), ...(options?.tags || [])];

    // Redisに保存
    await redis.setex(
      `cache:${configName}:${key}`,
      ttl,
      JSON.stringify(value)
    );

    // タグインデックスを更新
    for (const tag of tags) {
      await redis.sadd(`cache:tag:${tag}`, `cache:${configName}:${key}`);
      await redis.expire(`cache:tag:${tag}`, ttl + 60);
    }

    // DBにエントリを記録（オプション）
    await prisma.cacheEntry.upsert({
      where: {
        configId_cacheKey: {
          configId: config.id,
          cacheKey: key,
        },
      },
      update: {
        value: value as any,
        tags,
        expiresAt: new Date(Date.now() + ttl * 1000),
        hitCount: 0,
      },
      create: {
        configId: config.id,
        cacheKey: key,
        value: value as any,
        tags,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
  } catch (error) {
    log.error({ configName, key, error }, 'Cache set error');
  }
}

/**
 * キャッシュを無効化（キー指定）
 */
export async function invalidate(configName: string, key: string): Promise<void> {
  try {
    await redis.del(`cache:${configName}:${key}`);

    const config = await prisma.cacheConfig.findUnique({
      where: { name: configName },
    });

    if (config) {
      await prisma.cacheEntry.deleteMany({
        where: {
          configId: config.id,
          cacheKey: key,
        },
      });

      await prisma.cacheConfig.update({
        where: { id: config.id },
        data: { evictCount: { increment: 1 } },
      });
    }

    log.debug({ configName, key }, 'Cache invalidated');
  } catch (error) {
    log.error({ configName, key, error }, 'Cache invalidate error');
  }
}

/**
 * キャッシュを無効化（タグ指定）
 */
export async function invalidateByTag(tag: string): Promise<number> {
  try {
    const keys = await redis.smembers(`cache:tag:${tag}`);

    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`cache:tag:${tag}`);
    }

    log.info({ tag, count: keys.length }, 'Cache invalidated by tag');
    return keys.length;
  } catch (error) {
    log.error({ tag, error }, 'Cache invalidate by tag error');
    return 0;
  }
}

/**
 * キャッシュを無効化（設定全体）
 */
export async function invalidateAll(configName: string): Promise<number> {
  try {
    const pattern = `cache:${configName}:*`;
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    const config = await prisma.cacheConfig.findUnique({
      where: { name: configName },
    });

    if (config) {
      await prisma.cacheEntry.deleteMany({
        where: { configId: config.id },
      });
    }

    log.info({ configName, count: deletedCount }, 'Cache invalidated all');
    return deletedCount;
  } catch (error) {
    log.error({ configName, error }, 'Cache invalidate all error');
    return 0;
  }
}

/**
 * キャッシュまたは取得（Read-through）
 */
export async function getOrFetch<T>(
  configName: string,
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // 強制リフレッシュでない場合はキャッシュを確認
  if (!options?.forceRefresh) {
    const cached = await get<T>(configName, key);
    if (cached.hit && cached.value !== null) {
      return cached.value;
    }
  }

  // データを取得
  const value = await fetcher();

  // キャッシュに保存
  await set(configName, key, value, options);

  return value;
}

/**
 * ヒット統計を更新
 */
async function updateHitStats(
  configName: string,
  key: string,
  isHit: boolean
): Promise<void> {
  const config = await prisma.cacheConfig.findUnique({
    where: { name: configName },
  });

  if (config) {
    if (isHit) {
      await prisma.cacheConfig.update({
        where: { id: config.id },
        data: { hitCount: { increment: 1 } },
      });

      await prisma.cacheEntry.updateMany({
        where: {
          configId: config.id,
          cacheKey: key,
        },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: new Date(),
        },
      });
    } else {
      await prisma.cacheConfig.update({
        where: { id: config.id },
        data: { missCount: { increment: 1 } },
      });
    }
  }
}

/**
 * キャッシュ統計を取得
 */
export async function getCacheStats(configName?: string): Promise<{
  configs: Array<{
    name: string;
    hitCount: number;
    missCount: number;
    evictCount: number;
    hitRate: number;
    entryCount: number;
  }>;
  totalHitRate: number;
}> {
  const where = configName ? { name: configName } : {};

  const configs = await prisma.cacheConfig.findMany({
    where,
    include: {
      _count: { select: { entries: true } },
    },
  });

  let totalHits = 0;
  let totalMisses = 0;

  const stats = configs.map((config) => {
    const total = config.hitCount + config.missCount;
    const hitRate = total > 0 ? (config.hitCount / total) * 100 : 0;

    totalHits += config.hitCount;
    totalMisses += config.missCount;

    return {
      name: config.name,
      hitCount: config.hitCount,
      missCount: config.missCount,
      evictCount: config.evictCount,
      hitRate: Math.round(hitRate * 100) / 100,
      entryCount: config._count.entries,
    };
  });

  const totalHitRate =
    totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

  return {
    configs: stats,
    totalHitRate: Math.round(totalHitRate * 100) / 100,
  };
}

/**
 * 期限切れキャッシュをクリーンアップ
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();

  const result = await prisma.cacheEntry.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  log.info({ deleted: result.count }, 'Expired cache entries cleaned up');
  return result.count;
}

/**
 * デコレータ用キャッシュラッパー
 */
export function cacheable<T>(
  configName: string,
  keyGenerator: (...args: unknown[]) => string,
  options?: CacheOptions
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyGenerator(...args);
      return getOrFetch(configName, key, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

import { Router } from 'express';
import { prisma, CacheType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'cache' });

/**
 * キャッシュ設定一覧取得
 */
router.get('/configs', async (req, res, next) => {
  try {
    const { cacheType, isActive } = req.query;

    const where: any = {};
    if (cacheType) where.cacheType = cacheType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const configs = await prisma.cacheConfig.findMany({
      where,
      include: {
        _count: { select: { entries: true } },
      },
      orderBy: { name: 'asc' },
    });

    // ヒット率を計算
    const configsWithStats = configs.map((config) => {
      const total = config.hitCount + config.missCount;
      const hitRate = total > 0 ? (config.hitCount / total) * 100 : 0;
      return {
        ...config,
        hitRate: Math.round(hitRate * 100) / 100,
        entryCount: config._count.entries,
      };
    });

    res.json({
      success: true,
      data: configsWithStats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ設定詳細取得
 */
router.get('/configs/:name', async (req, res, next) => {
  try {
    const config = await prisma.cacheConfig.findUnique({
      where: { name: req.params.name },
      include: {
        entries: {
          orderBy: { lastHitAt: 'desc' },
          take: 100,
          select: {
            id: true,
            cacheKey: true,
            tags: true,
            hitCount: true,
            lastHitAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!config) {
      throw new AppError(404, 'Cache config not found', 'NOT_FOUND');
    }

    const total = config.hitCount + config.missCount;
    const hitRate = total > 0 ? (config.hitCount / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...config,
        hitRate: Math.round(hitRate * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ設定作成
 */
router.post('/configs', async (req, res, next) => {
  try {
    const {
      name,
      description,
      cacheType = 'QUERY',
      ttlSeconds = 300,
      maxEntries,
      tags = [],
      invalidateOn = [],
    } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_INPUT');
    }

    const validCacheTypes = Object.values(CacheType);
    if (!validCacheTypes.includes(cacheType)) {
      throw new AppError(400, `Invalid cacheType: ${cacheType}`, 'INVALID_INPUT');
    }

    const config = await prisma.cacheConfig.create({
      data: {
        name,
        description,
        cacheType,
        ttlSeconds,
        maxEntries,
        tags,
        invalidateOn,
      },
    });

    log.info({ configId: config.id, name }, 'Cache config created');

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ設定更新
 */
router.patch('/configs/:name', async (req, res, next) => {
  try {
    const {
      description,
      ttlSeconds,
      maxEntries,
      tags,
      invalidateOn,
      isActive,
    } = req.body;

    const config = await prisma.cacheConfig.update({
      where: { name: req.params.name },
      data: {
        ...(description !== undefined && { description }),
        ...(ttlSeconds !== undefined && { ttlSeconds }),
        ...(maxEntries !== undefined && { maxEntries }),
        ...(tags !== undefined && { tags }),
        ...(invalidateOn !== undefined && { invalidateOn }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ無効化（設定全体）
 */
router.post('/configs/:name/invalidate', async (req, res, next) => {
  try {
    const config = await prisma.cacheConfig.findUnique({
      where: { name: req.params.name },
    });

    if (!config) {
      throw new AppError(404, 'Cache config not found', 'NOT_FOUND');
    }

    const result = await prisma.cacheEntry.deleteMany({
      where: { configId: config.id },
    });

    await prisma.cacheConfig.update({
      where: { id: config.id },
      data: { evictCount: { increment: result.count } },
    });

    log.info({ configName: req.params.name, count: result.count }, 'Cache invalidated');

    res.json({
      success: true,
      data: { invalidated: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ無効化（タグ指定）
 */
router.post('/invalidate/tag/:tag', async (req, res, next) => {
  try {
    const result = await prisma.cacheEntry.deleteMany({
      where: {
        tags: { has: req.params.tag },
      },
    });

    log.info({ tag: req.params.tag, count: result.count }, 'Cache invalidated by tag');

    res.json({
      success: true,
      data: { invalidated: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュ統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const configs = await prisma.cacheConfig.findMany({
      include: {
        _count: { select: { entries: true } },
      },
    });

    let totalHits = 0;
    let totalMisses = 0;
    let totalEvicts = 0;
    let totalEntries = 0;

    const configStats = configs.map((config) => {
      const total = config.hitCount + config.missCount;
      const hitRate = total > 0 ? (config.hitCount / total) * 100 : 0;

      totalHits += config.hitCount;
      totalMisses += config.missCount;
      totalEvicts += config.evictCount;
      totalEntries += config._count.entries;

      return {
        name: config.name,
        cacheType: config.cacheType,
        hitCount: config.hitCount,
        missCount: config.missCount,
        evictCount: config.evictCount,
        hitRate: Math.round(hitRate * 100) / 100,
        entryCount: config._count.entries,
      };
    });

    const overallTotal = totalHits + totalMisses;
    const overallHitRate = overallTotal > 0 ? (totalHits / overallTotal) * 100 : 0;

    res.json({
      success: true,
      data: {
        overall: {
          totalConfigs: configs.length,
          totalEntries,
          totalHits,
          totalMisses,
          totalEvicts,
          hitRate: Math.round(overallHitRate * 100) / 100,
        },
        byConfig: configStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 期限切れキャッシュをクリーンアップ
 */
router.post('/cleanup', async (_req, res, next) => {
  try {
    const now = new Date();

    const result = await prisma.cacheEntry.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    log.info({ deleted: result.count }, 'Expired cache entries cleaned up');

    res.json({
      success: true,
      data: { cleaned: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * クエリパフォーマンス一覧取得
 */
router.get('/query-performance', async (req, res, next) => {
  try {
    const { isSlowQuery, hasN1Problem, tableName, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (isSlowQuery !== undefined) where.isSlowQuery = isSlowQuery === 'true';
    if (hasN1Problem !== undefined) where.hasN1Problem = hasN1Problem === 'true';
    if (tableName) where.tableName = tableName;

    const [queries, total] = await Promise.all([
      prisma.queryPerformance.findMany({
        where,
        orderBy: { executionTime: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.queryPerformance.count({ where }),
    ]);

    res.json({
      success: true,
      data: queries,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * クエリパフォーマンス統計
 */
router.get('/query-performance/stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate) where.recordedAt = { gte: new Date(startDate as string) };
    if (endDate) where.recordedAt = { ...where.recordedAt, lte: new Date(endDate as string) };

    const queries = await prisma.queryPerformance.findMany({ where });

    const slowQueries = queries.filter((q) => q.isSlowQuery);
    const n1Problems = queries.filter((q) => q.hasN1Problem);

    const avgExecutionTime =
      queries.length > 0
        ? queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length
        : 0;

    const maxExecutionTime =
      queries.length > 0 ? Math.max(...queries.map((q) => q.executionTime)) : 0;

    // テーブル別統計
    const byTable: Record<string, { count: number; avgTime: number }> = {};
    for (const query of queries) {
      const table = query.tableName || 'unknown';
      if (!byTable[table]) {
        byTable[table] = { count: 0, avgTime: 0 };
      }
      byTable[table].count++;
      byTable[table].avgTime += query.executionTime;
    }

    for (const table of Object.keys(byTable)) {
      byTable[table].avgTime = byTable[table].avgTime / byTable[table].count;
    }

    res.json({
      success: true,
      data: {
        totalQueries: queries.length,
        slowQueries: slowQueries.length,
        n1Problems: n1Problems.length,
        avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
        maxExecutionTime: Math.round(maxExecutionTime * 100) / 100,
        byTable,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * キャッシュタイプ一覧
 */
router.get('/types', async (_req, res, next) => {
  try {
    const cacheTypes = Object.values(CacheType).map((type) => ({
      value: type,
      label: getCacheTypeLabel(type),
    }));

    res.json({
      success: true,
      data: cacheTypes,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getCacheTypeLabel(type: CacheType): string {
  const labels: Record<CacheType, string> = {
    QUERY: 'クエリキャッシュ',
    DATA: 'データキャッシュ',
    PAGE: 'ページキャッシュ',
    FRAGMENT: 'フラグメントキャッシュ',
    SESSION: 'セッションキャッシュ',
    API: 'APIキャッシュ',
  };
  return labels[type] || type;
}

export { router as cacheRouter };


import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { z } from 'zod';

const router = Router();

// ========================================
// システムパフォーマンス統計
// ========================================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;

    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[period as string] || 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - periodMs);

    const [
      totalRequests,
      avgResponseTime,
      errorRate,
      topEndpoints,
      slowestEndpoints,
      statusCodeDistribution,
    ] = await Promise.all([
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.apiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { responseTime: true },
      }),
      prisma.apiUsageLog.count({
        where: {
          createdAt: { gte: since },
          statusCode: { gte: 400 },
        },
      }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _avg: { responseTime: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 10,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: since } },
        _avg: { responseTime: true },
        _count: { _all: true },
        orderBy: { _avg: { responseTime: 'desc' } },
        take: 10,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['statusCode'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    res.json({
      period,
      totalRequests,
      avgResponseTimeMs: Math.round(avgResponseTime._avg?.responseTime || 0),
      cacheHitRate: 0,
      errorRate: totalRequests > 0 ? (errorRate / totalRequests) * 100 : 0,
      topEndpoints: topEndpoints.map((e) => ({
        endpoint: e.endpoint,
        count: e._count._all,
        avgResponseTimeMs: Math.round(e._avg?.responseTime || 0),
      })),
      slowestEndpoints: slowestEndpoints
        .filter((e) => e._count._all >= 10)
        .map((e) => ({
          endpoint: e.endpoint,
          avgResponseTimeMs: Math.round(e._avg?.responseTime || 0),
          count: e._count._all,
        })),
      statusCodeDistribution: statusCodeDistribution.map((s) => ({
        statusCode: s.statusCode,
        count: s._count._all,
      })),
    });
  } catch (error) {
    console.error('Failed to get performance stats:', error);
    res.status(500).json({ error: 'Failed to get performance stats' });
  }
});

// ========================================
// API使用ログ
// ========================================
router.get('/api-logs', async (req: Request, res: Response) => {
  try {
    const {
      endpoint,
      statusCode,
      minResponseTime,
      maxResponseTime,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (endpoint) where.endpoint = { contains: endpoint };
    if (statusCode) where.statusCode = parseInt(statusCode as string);
    if (minResponseTime) where.responseTime = { gte: parseInt(minResponseTime as string) };
    if (maxResponseTime) {
      where.responseTime = { ...where.responseTime, lte: parseInt(maxResponseTime as string) };
    }

    const [logs, total] = await Promise.all([
      prisma.apiUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.apiUsageLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    console.error('Failed to get API logs:', error);
    res.status(500).json({ error: 'Failed to get API logs' });
  }
});

// ========================================
// パフォーマンスメトリクス記録
// ========================================
const recordMetricSchema = z.object({
  metricType: z.enum([
    'API_LATENCY',
    'DB_QUERY_TIME',
    'CACHE_HIT_RATE',
    'MEMORY_USAGE',
    'CPU_USAGE',
    'THROUGHPUT',
    'ERROR_RATE',
    'QUEUE_DEPTH',
    'ACTIVE_CONNECTIONS',
    'CUSTOM',
  ]),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  endpoint: z.string().optional(),
  tags: z.record(z.any()).optional(),
});

router.post('/metrics', async (req: Request, res: Response) => {
  try {
    const data = recordMetricSchema.parse(req.body);

    const now = new Date();
    const periodStart = new Date(now.getTime() - (now.getTime() % 60000));
    const periodEnd = new Date(periodStart.getTime() + 60000);

    const existing = await prisma.performanceMetric.findFirst({
      where: {
        metricType: data.metricType,
        name: data.name,
        endpoint: data.endpoint,
        periodStart,
      },
    });

    if (existing) {
      const newSampleCount = existing.sampleCount + 1;
      const newValue =
        (existing.value * existing.sampleCount + data.value) / newSampleCount;

      await prisma.performanceMetric.update({
        where: { id: existing.id },
        data: {
          value: newValue,
          sampleCount: newSampleCount,
        },
      });

      res.json({ success: true, updated: true });
    } else {
      await prisma.performanceMetric.create({
        data: {
          metricType: data.metricType,
          name: data.name,
          value: data.value,
          unit: data.unit,
          endpoint: data.endpoint,
          tags: data.tags || {},
          periodStart,
          periodEnd,
        },
      });

      res.json({ success: true, created: true });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to record metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// ========================================
// メトリクス取得
// ========================================
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { metricType, name, endpoint, period = '1h' } = req.query;

    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }[period as string] || 60 * 60 * 1000;

    const since = new Date(Date.now() - periodMs);

    const where: any = { periodStart: { gte: since } };
    if (metricType) where.metricType = metricType;
    if (name) where.name = name;
    if (endpoint) where.endpoint = endpoint;

    const metrics = await prisma.performanceMetric.findMany({
      where,
      orderBy: { periodStart: 'asc' },
    });

    res.json(metrics);
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// ========================================
// CDN設定一覧
// ========================================
router.get('/cdn-configs', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.cdnConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const masked = configs.map((c) => ({
      ...c,
      secretAccessKey: c.secretAccessKey ? '********' : null,
      apiToken: c.apiToken ? '********' : null,
    }));

    res.json(masked);
  } catch (error) {
    console.error('Failed to get CDN configs:', error);
    res.status(500).json({ error: 'Failed to get CDN configs' });
  }
});

// ========================================
// CDN設定作成
// ========================================
const createCdnConfigSchema = z.object({
  name: z.string().min(1),
  provider: z.enum([
    'CLOUDFLARE',
    'AWS_CLOUDFRONT',
    'FASTLY',
    'BUNNY_CDN',
    'IMGIX',
    'CLOUDINARY',
    'CUSTOM',
  ]),
  originUrl: z.string().url(),
  cdnUrl: z.string().url().optional(),
  customDomain: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  apiToken: z.string().optional(),
  defaultTtl: z.number().optional(),
  maxTtl: z.number().optional(),
  enableHttps: z.boolean().optional(),
  enableCompression: z.boolean().optional(),
  enableWebp: z.boolean().optional(),
  imageOptimization: z.boolean().optional(),
  imageQuality: z.number().min(1).max(100).optional(),
  imageSizes: z.array(z.number()).optional(),
});

router.post('/cdn-configs', async (req: Request, res: Response) => {
  try {
    const data = createCdnConfigSchema.parse(req.body);

    const config = await prisma.cdnConfig.create({
      data: {
        name: data.name,
        provider: data.provider,
        originUrl: data.originUrl,
        cdnUrl: data.cdnUrl,
        customDomain: data.customDomain,
        accessKeyId: data.accessKeyId,
        secretAccessKey: data.secretAccessKey,
        apiToken: data.apiToken,
        defaultTtl: data.defaultTtl || 86400,
        maxTtl: data.maxTtl || 604800,
        enableHttps: data.enableHttps ?? true,
        enableCompression: data.enableCompression ?? true,
        enableWebp: data.enableWebp ?? true,
        imageOptimization: data.imageOptimization ?? true,
        imageQuality: data.imageQuality || 85,
        imageSizes: data.imageSizes || [320, 640, 960, 1280, 1920],
        status: 'CONFIGURING',
      },
    });

    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to create CDN config:', error);
    res.status(500).json({ error: 'Failed to create CDN config' });
  }
});

// ========================================
// CDN設定更新
// ========================================
router.patch('/cdn-configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.secretAccessKey === '********') delete updateData.secretAccessKey;
    if (updateData.apiToken === '********') delete updateData.apiToken;

    const config = await prisma.cdnConfig.update({
      where: { id },
      data: updateData,
    });

    res.json(config);
  } catch (error) {
    console.error('Failed to update CDN config:', error);
    res.status(500).json({ error: 'Failed to update CDN config' });
  }
});

// ========================================
// CDN設定アクティベート
// ========================================
router.post('/cdn-configs/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await prisma.cdnConfig.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    res.json(config);
  } catch (error) {
    console.error('Failed to activate CDN config:', error);
    res.status(500).json({ error: 'Failed to activate CDN config' });
  }
});

// ========================================
// クエリ最適化ルール一覧
// ========================================
router.get('/optimization-rules', async (_req: Request, res: Response) => {
  try {
    const rules = await prisma.queryOptimizationRule.findMany({
      orderBy: [{ isEnabled: 'desc' }, { priority: 'desc' }],
    });

    res.json(rules);
  } catch (error) {
    console.error('Failed to get optimization rules:', error);
    res.status(500).json({ error: 'Failed to get optimization rules' });
  }
});

// ========================================
// クエリ最適化ルール作成
// ========================================
const createOptimizationRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().optional(),
  targetTable: z.string().optional(),
  targetEndpoint: z.string().optional(),
  queryPattern: z.string().optional(),
  minExecutionTimeMs: z.number().optional(),
  optimizationType: z.enum([
    'ADD_INDEX',
    'QUERY_REWRITE',
    'ENABLE_CACHE',
    'PAGINATION',
    'BATCH_LOADING',
    'LAZY_LOADING',
    'PRECOMPUTE',
    'DENORMALIZE',
    'CUSTOM',
  ]),
  optimizationConfig: z.record(z.any()).optional(),
  suggestedIndex: z.string().optional(),
  enableCache: z.boolean().optional(),
  cacheTtl: z.number().optional(),
  cacheKey: z.string().optional(),
});

router.post('/optimization-rules', async (req: Request, res: Response) => {
  try {
    const data = createOptimizationRuleSchema.parse(req.body);

    const rule = await prisma.queryOptimizationRule.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority || 100,
        targetTable: data.targetTable,
        targetEndpoint: data.targetEndpoint,
        queryPattern: data.queryPattern,
        minExecutionTimeMs: data.minExecutionTimeMs || 100,
        optimizationType: data.optimizationType,
        optimizationConfig: data.optimizationConfig || {},
        suggestedIndex: data.suggestedIndex,
        enableCache: data.enableCache || false,
        cacheTtl: data.cacheTtl || 60,
        cacheKey: data.cacheKey,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to create optimization rule:', error);
    res.status(500).json({ error: 'Failed to create optimization rule' });
  }
});

// ========================================
// クエリ最適化ルール有効/無効切り替え
// ========================================
router.patch('/optimization-rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await prisma.queryOptimizationRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.queryOptimizationRule.update({
      where: { id },
      data: { isEnabled: !rule.isEnabled },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to toggle optimization rule:', error);
    res.status(500).json({ error: 'Failed to toggle optimization rule' });
  }
});

// ========================================
// クエリ最適化ルール削除
// ========================================
router.delete('/optimization-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.queryOptimizationRule.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete optimization rule:', error);
    res.status(500).json({ error: 'Failed to delete optimization rule' });
  }
});

// ========================================
// リアルタイムメトリクス
// ========================================
router.get('/realtime', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

    const [
      requestsLastMinute,
      requestsLast5Minutes,
      avgLatencyLastMinute,
      errorCountLastMinute,
      activeConnections,
    ] = await Promise.all([
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: oneMinuteAgo } },
      }),
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: fiveMinutesAgo } },
      }),
      prisma.apiUsageLog.aggregate({
        where: { createdAt: { gte: oneMinuteAgo } },
        _avg: { responseTime: true },
      }),
      prisma.apiUsageLog.count({
        where: {
          createdAt: { gte: oneMinuteAgo },
          statusCode: { gte: 500 },
        },
      }),
      prisma.performanceMetric.findFirst({
        where: { metricType: 'ACTIVE_CONNECTIONS' },
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    res.json({
      timestamp: now.toISOString(),
      requestsPerMinute: requestsLastMinute,
      requestsPerFiveMinutes: requestsLast5Minutes,
      avgLatencyMs: Math.round(avgLatencyLastMinute._avg?.responseTime || 0),
      errorCountLastMinute,
      activeConnections: activeConnections?.value || 0,
      throughput: requestsLastMinute,
    });
  } catch (error) {
    console.error('Failed to get realtime metrics:', error);
    res.status(500).json({ error: 'Failed to get realtime metrics' });
  }
});

// ========================================
// データベースヘルスチェック
// ========================================
router.get('/db-health', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    await prisma.$queryRaw`SELECT 1`;

    const dbLatency = Date.now() - startTime;

    const tableStats = await prisma.$queryRaw<any[]>`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `;

    const indexStats = await prisma.$queryRaw<any[]>`
      SELECT
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 20
    `;

    res.json({
      status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'slow',
      latencyMs: dbLatency,
      tableStats,
      indexStats,
    });
  } catch (error) {
    console.error('Failed to get DB health:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get DB health',
    });
  }
});

// ========================================
// キャッシュ統計
// ========================================
router.get('/cache-stats', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;

    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[period as string] || 24 * 60 * 60 * 1000;

    const since = new Date(Date.now() - periodMs);

    const cacheByEndpoint = await prisma.apiUsageLog.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const endpointCache: Record<string, { hits: number; misses: number; hitRate: number }> = {};

    cacheByEndpoint.forEach((row) => {
      if (!endpointCache[row.endpoint]) {
        endpointCache[row.endpoint] = { hits: 0, misses: 0, hitRate: 0 };
      }
      endpointCache[row.endpoint].misses += row._count._all;
    });

    Object.keys(endpointCache).forEach((endpoint) => {
      const e = endpointCache[endpoint];
      const total = e.hits + e.misses;
      e.hitRate = total > 0 ? (e.hits / total) * 100 : 0;
    });

    const sortedEndpoints = Object.entries(endpointCache)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.hitRate - a.hitRate);

    const totalHits = Object.values(endpointCache).reduce((sum, e) => sum + e.hits, 0);
    const totalMisses = Object.values(endpointCache).reduce((sum, e) => sum + e.misses, 0);
    const overallHitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

    res.json({
      period,
      overallHitRate,
      totalHits,
      totalMisses,
      byEndpoint: sortedEndpoints.slice(0, 20),
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

export { router as systemPerformanceRouter };

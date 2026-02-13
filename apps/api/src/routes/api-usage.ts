import { Hono } from 'hono';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import crypto from 'crypto';

const app = new Hono();

// ========================================
// スキーマ定義
// ========================================

const createApiKeySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  scopes: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).default(1000),
  rateLimitWindow: z.number().int().min(60).default(3600),
  expiresAt: z.string().datetime().optional(),
  ipWhitelist: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

const createRateLimitRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target: z.enum(['GLOBAL', 'ORGANIZATION', 'API_KEY', 'IP_ADDRESS', 'ENDPOINT', 'USER']),
  targetValue: z.string().optional(),
  limit: z.number().int().min(1),
  windowSeconds: z.number().int().min(1),
  action: z.enum(['REJECT', 'THROTTLE', 'QUEUE', 'LOG_ONLY']).default('REJECT'),
  priority: z.number().int().default(0),
});

const createQuotaSchema = z.object({
  quotaType: z.enum([
    'REQUESTS_DAILY', 'REQUESTS_MONTHLY',
    'BANDWIDTH_DAILY', 'BANDWIDTH_MONTHLY',
    'STORAGE', 'EXPORTS', 'IMPORTS'
  ]),
  limit: z.number().int().min(1),
  alertThreshold: z.number().min(0).max(1).default(0.8),
});

// ========================================
// 統計情報
// ========================================

app.get('/stats', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalApiKeys,
    activeApiKeys,
    totalRules,
    activeRules,
    todayRequests,
    todayErrors,
    avgLatency,
    quotas,
  ] = await Promise.all([
    prisma.apiKey.count({ where: { organizationId } }),
    prisma.apiKey.count({ where: { organizationId, isActive: true } }),
    prisma.rateLimitRule.count({ where: { organizationId } }),
    prisma.rateLimitRule.count({ where: { organizationId, isActive: true } }),
    prisma.apiUsageSummary.aggregate({
      where: { organizationId, date: today },
      _sum: { totalRequests: true },
    }),
    prisma.apiUsageSummary.aggregate({
      where: { organizationId, date: today },
      _sum: { errorCount: true },
    }),
    prisma.apiUsageSummary.aggregate({
      where: { organizationId, date: today },
      _avg: { avgLatencyMs: true },
    }),
    prisma.apiQuota.findMany({
      where: {
        organizationId,
        periodEnd: { gte: new Date() },
      },
    }),
  ]);

  // 過去7日間のトレンド
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyStats = await prisma.apiUsageSummary.groupBy({
    by: ['date'],
    where: {
      organizationId,
      date: { gte: sevenDaysAgo },
    },
    _sum: {
      totalRequests: true,
      errorCount: true,
    },
    orderBy: { date: 'asc' },
  });

  return c.json({
    apiKeys: {
      total: totalApiKeys,
      active: activeApiKeys,
    },
    rateLimits: {
      total: totalRules,
      active: activeRules,
    },
    today: {
      requests: todayRequests._sum.totalRequests || 0,
      errors: todayErrors._sum.errorCount || 0,
      avgLatencyMs: avgLatency._avg.avgLatencyMs || 0,
    },
    quotas: quotas.map(q => ({
      type: q.quotaType,
      limit: q.limit,
      used: q.used,
      percentage: ((q.used / q.limit) * 100).toFixed(1),
    })),
    trend: dailyStats,
  });
});

// ========================================
// APIキー管理
// ========================================

app.get('/keys', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { isActive } = c.req.query();

  const where: any = { organizationId };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const keys = await prisma.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      permissions: true,
      scopes: true,
      rateLimit: true,
      rateLimitWindow: true,
      expiresAt: true,
      lastUsedAt: true,
      isActive: true,
      usageCount: true,
      ipWhitelist: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return c.json({ keys });
});

app.post('/keys', zValidator('json', createApiKeySchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // APIキー生成
  const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      ...data,
      organizationId,
      keyHash,
      keyPrefix,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      scopes: true,
      rateLimit: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // 生のAPIキーは一度だけ返す
  return c.json({
    apiKey,
    key: rawKey,
    message: 'Save this key securely. It will not be shown again.',
  }, 201);
});

app.get('/keys/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, organizationId },
    include: {
      usageLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!apiKey) {
    return c.json({ error: 'API key not found' }, 404);
  }

  // keyHashは除外
  const { keyHash, ...safeKey } = apiKey;

  return c.json({ apiKey: safeKey });
});

app.put('/keys/:id', zValidator('json', createApiKeySchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const updateData: any = { ...data };
  if (data.expiresAt) {
    updateData.expiresAt = new Date(data.expiresAt);
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      scopes: true,
      rateLimit: true,
      expiresAt: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return c.json({ apiKey });
});

app.delete('/keys/:id', async (c) => {
  const { id } = c.req.param();

  await prisma.apiKey.delete({
    where: { id },
  });

  return c.json({ success: true });
});

app.post('/keys/:id/toggle', async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json({ apiKey });
});

app.post('/keys/:id/regenerate', async (c) => {
  const { id } = c.req.param();

  const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      keyHash,
      keyPrefix,
      usageCount: 0,
    },
  });

  return c.json({
    apiKey,
    key: rawKey,
    message: 'New key generated. Save this key securely.',
  });
});

app.get('/keys/:id/usage', async (c) => {
  const { id } = c.req.param();
  const { startDate, endDate, page = '1', limit = '50' } = c.req.query();

  const where: any = { apiKeyId: id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.apiKeyUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.apiKeyUsageLog.count({ where }),
  ]);

  return c.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ========================================
// レート制限ルール
// ========================================

app.get('/rate-limits', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { target, isActive } = c.req.query();

  const where: any = { organizationId };
  if (target) where.target = target;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const rules = await prisma.rateLimitRule.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });

  return c.json({ rules });
});

app.post('/rate-limits', zValidator('json', createRateLimitRuleSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const rule = await prisma.rateLimitRule.create({
    data: {
      ...data,
      organizationId,
    },
  });

  return c.json({ rule }, 201);
});

app.put('/rate-limits/:id', zValidator('json', createRateLimitRuleSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const rule = await prisma.rateLimitRule.update({
    where: { id },
    data,
  });

  return c.json({ rule });
});

app.delete('/rate-limits/:id', async (c) => {
  const { id } = c.req.param();

  await prisma.rateLimitRule.delete({
    where: { id },
  });

  return c.json({ success: true });
});

app.post('/rate-limits/:id/toggle', async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.rateLimitRule.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'Rule not found' }, 404);
  }

  const rule = await prisma.rateLimitRule.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json({ rule });
});

app.post('/rate-limits/:id/reset', async (c) => {
  const { id } = c.req.param();

  const rule = await prisma.rateLimitRule.update({
    where: { id },
    data: {
      currentCount: 0,
      windowStart: null,
    },
  });

  return c.json({ rule });
});

// ========================================
// 使用量サマリー
// ========================================

app.get('/usage', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { startDate, endDate, granularity = 'daily' } = c.req.query();

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const summaries = await prisma.apiUsageSummary.findMany({
    where: {
      organizationId,
      date: {
        gte: start,
        lte: end,
      },
      hour: granularity === 'hourly' ? { not: null } : null,
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });

  // エンドポイント別集計
  const byEndpoint = await prisma.apiUsageSummary.groupBy({
    by: ['endpoint'],
    where: {
      organizationId,
      date: { gte: start, lte: end },
      endpoint: { not: null },
    },
    _sum: {
      totalRequests: true,
      errorCount: true,
    },
    _avg: {
      avgLatencyMs: true,
    },
    orderBy: {
      _sum: { totalRequests: 'desc' },
    },
    take: 20,
  });

  // メソッド別集計
  const byMethod = await prisma.apiUsageSummary.groupBy({
    by: ['method'],
    where: {
      organizationId,
      date: { gte: start, lte: end },
      method: { not: null },
    },
    _sum: {
      totalRequests: true,
    },
  });

  return c.json({
    summaries,
    byEndpoint,
    byMethod,
  });
});

app.get('/usage/top-endpoints', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { days = '7', limit = '10' } = c.req.query();

  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const topEndpoints = await prisma.apiUsageSummary.groupBy({
    by: ['endpoint', 'method'],
    where: {
      organizationId,
      date: { gte: startDate },
      endpoint: { not: null },
    },
    _sum: {
      totalRequests: true,
      errorCount: true,
    },
    _avg: {
      avgLatencyMs: true,
      p95LatencyMs: true,
    },
    orderBy: {
      _sum: { totalRequests: 'desc' },
    },
    take: parseInt(limit),
  });

  return c.json({ topEndpoints });
});

app.get('/usage/errors', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { days = '7' } = c.req.query();

  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  // エラーが多いエンドポイント
  const errorEndpoints = await prisma.apiUsageSummary.groupBy({
    by: ['endpoint'],
    where: {
      organizationId,
      date: { gte: startDate },
      endpoint: { not: null },
      errorCount: { gt: 0 },
    },
    _sum: {
      errorCount: true,
      totalRequests: true,
    },
    orderBy: {
      _sum: { errorCount: 'desc' },
    },
    take: 10,
  });

  // エラー率計算
  const withErrorRate = errorEndpoints.map(e => ({
    ...e,
    errorRate: ((e._sum.errorCount || 0) / (e._sum.totalRequests || 1) * 100).toFixed(2),
  }));

  return c.json({ errorEndpoints: withErrorRate });
});

// ========================================
// クォータ管理
// ========================================

app.get('/quotas', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const quotas = await prisma.apiQuota.findMany({
    where: {
      organizationId,
      periodEnd: { gte: new Date() },
    },
    orderBy: { quotaType: 'asc' },
  });

  return c.json({
    quotas: quotas.map(q => ({
      ...q,
      percentage: ((q.used / q.limit) * 100).toFixed(1),
      remaining: q.limit - q.used,
    })),
  });
});

app.post('/quotas', zValidator('json', createQuotaSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // 期間設定
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (data.quotaType.includes('DAILY')) {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const quota = await prisma.apiQuota.upsert({
    where: {
      organizationId_quotaType_periodStart: {
        organizationId,
        quotaType: data.quotaType,
        periodStart,
      },
    },
    update: {
      limit: data.limit,
      alertThreshold: data.alertThreshold,
    },
    create: {
      organizationId,
      quotaType: data.quotaType,
      limit: data.limit,
      alertThreshold: data.alertThreshold,
      periodStart,
      periodEnd,
    },
  });

  return c.json({ quota }, 201);
});

app.post('/quotas/:id/reset', async (c) => {
  const { id } = c.req.param();

  const quota = await prisma.apiQuota.update({
    where: { id },
    data: {
      used: 0,
      alertSent: false,
    },
  });

  return c.json({ quota });
});

// ========================================
// レート制限チェック（ミドルウェア用）
// ========================================

app.post('/check-rate-limit', async (c) => {
  const { apiKeyId, ipAddress, endpoint, userId } = await c.req.json();
  const organizationId = c.req.header('x-organization-id') || 'default';

  // 該当するルールを優先度順に取得
  const rules = await prisma.rateLimitRule.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [
        { target: 'GLOBAL' },
        { target: 'ORGANIZATION' },
        { target: 'API_KEY', targetValue: apiKeyId },
        { target: 'IP_ADDRESS', targetValue: ipAddress },
        { target: 'ENDPOINT', targetValue: endpoint },
        { target: 'USER', targetValue: userId },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  for (const rule of rules) {
    const now = new Date();
    const windowStart = rule.windowStart || now;
    const windowEnd = new Date(windowStart.getTime() + rule.windowSeconds * 1000);

    // ウィンドウがリセットされるべきか
    if (now > windowEnd) {
      await prisma.rateLimitRule.update({
        where: { id: rule.id },
        data: {
          currentCount: 1,
          windowStart: now,
        },
      });
      continue;
    }

    // 制限チェック
    if (rule.currentCount >= rule.limit) {
      return c.json({
        allowed: false,
        rule: rule.name,
        action: rule.action,
        retryAfter: Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
      }, 429);
    }

    // カウントアップ
    await prisma.rateLimitRule.update({
      where: { id: rule.id },
      data: {
        currentCount: { increment: 1 },
        windowStart: rule.windowStart || now,
      },
    });
  }

  return c.json({ allowed: true });
});

// ========================================
// デフォルト設定
// ========================================

app.post('/setup-defaults', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  // デフォルトレート制限ルール
  const defaultRules = [
    { name: 'グローバル制限', target: 'GLOBAL' as const, limit: 10000, windowSeconds: 3600, priority: 0 },
    { name: 'IP制限', target: 'IP_ADDRESS' as const, limit: 1000, windowSeconds: 3600, priority: 10 },
    { name: '認証エンドポイント', target: 'ENDPOINT' as const, targetValue: '/api/auth', limit: 20, windowSeconds: 60, priority: 20 },
  ];

  // デフォルトクォータ
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const defaultQuotas = [
    { quotaType: 'REQUESTS_MONTHLY' as const, limit: 1000000 },
    { quotaType: 'EXPORTS' as const, limit: 100 },
    { quotaType: 'IMPORTS' as const, limit: 50 },
  ];

  let createdRules = 0;
  let createdQuotas = 0;

  for (const rule of defaultRules) {
    const existing = await prisma.rateLimitRule.findFirst({
      where: { organizationId, name: rule.name },
    });
    if (!existing) {
      await prisma.rateLimitRule.create({
        data: { ...rule, organizationId, action: 'REJECT' },
      });
      createdRules++;
    }
  }

  for (const quota of defaultQuotas) {
    const existing = await prisma.apiQuota.findFirst({
      where: {
        organizationId,
        quotaType: quota.quotaType,
        periodStart: monthStart,
      },
    });
    if (!existing) {
      await prisma.apiQuota.create({
        data: {
          organizationId,
          quotaType: quota.quotaType,
          limit: quota.limit,
          periodStart: monthStart,
          periodEnd: monthEnd,
        },
      });
      createdQuotas++;
    }
  }

  return c.json({
    success: true,
    created: {
      rules: createdRules,
      quotas: createdQuotas,
    },
  });
});

export const apiUsageRouter = app;

import { prisma, RateLimitIdentifierType, UsagePeriodType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';

const log = logger.child({ module: 'api-usage-service' });

// メモリ内レート制限カウンター（高速化のため）
const rateLimitCounters: Map<string, { count: number; windowStart: number }> = new Map();

interface RateLimitConfig {
  windowSizeSeconds: number;
  maxRequests: number;
  burstLimit?: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowSizeSeconds: 3600, // 1時間
  maxRequests: 1000,
  burstLimit: 50,
};

/**
 * APIキーを生成
 */
export async function createApiKey(options: {
  name: string;
  permissions?: string[];
  rateLimit?: number;
  dailyLimit?: number;
  expiresAt?: Date;
  description?: string;
  createdBy?: string;
}): Promise<{ id: string; key: string; keyPrefix: string }> {
  // ランダムなAPIキーを生成
  const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: options.name,
      keyHash,
      keyPrefix,
      permissions: options.permissions || ['*'],
      rateLimit: options.rateLimit || 1000,
      dailyLimit: options.dailyLimit,
      expiresAt: options.expiresAt,
      description: options.description,
      createdBy: options.createdBy,
    },
  });

  log.info({ apiKeyId: apiKey.id, name: options.name }, 'API key created');

  return {
    id: apiKey.id,
    key: rawKey, // 生のキーは一度だけ返す
    keyPrefix,
  };
}

/**
 * APIキーを検証
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  apiKeyId?: string;
  permissions?: string[];
  rateLimit?: number;
  error?: string;
}> {
  if (!key || !key.startsWith('rk_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    return { valid: false, error: 'API key not found' };
  }

  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // 最終使用日時を更新
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    apiKeyId: apiKey.id,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit,
  };
}

/**
 * レート制限をチェック
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: RateLimitIdentifierType,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}> {
  const now = Date.now();
  const windowStart = Math.floor(now / (config.windowSizeSeconds * 1000)) * config.windowSizeSeconds * 1000;
  const cacheKey = `${identifierType}:${identifier}:${windowStart}`;

  // メモリカウンターをチェック
  let counter = rateLimitCounters.get(cacheKey);
  if (!counter || counter.windowStart !== windowStart) {
    // DBから取得またはリセット
    const record = await prisma.rateLimitRecord.findUnique({
      where: {
        identifier_windowStart: {
          identifier,
          windowStart: new Date(windowStart),
        },
      },
    });

    counter = {
      count: record?.requestCount || 0,
      windowStart,
    };
    rateLimitCounters.set(cacheKey, counter);
  }

  // ブロック状態チェック
  const blockRecord = await prisma.rateLimitRecord.findFirst({
    where: {
      identifier,
      isBlocked: true,
      blockedUntil: { gt: new Date() },
    },
  });

  if (blockRecord) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: blockRecord.blockedUntil!,
      retryAfter: Math.ceil((blockRecord.blockedUntil!.getTime() - now) / 1000),
    };
  }

  const remaining = Math.max(0, config.maxRequests - counter.count);
  const resetAt = new Date(windowStart + config.windowSizeSeconds * 1000);

  if (counter.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
    };
  }

  // カウンターをインクリメント
  counter.count++;
  rateLimitCounters.set(cacheKey, counter);

  // DBに非同期で保存
  setImmediate(async () => {
    try {
      await prisma.rateLimitRecord.upsert({
        where: {
          identifier_windowStart: {
            identifier,
            windowStart: new Date(windowStart),
          },
        },
        update: {
          requestCount: counter!.count,
        },
        create: {
          identifier,
          identifierType,
          windowStart: new Date(windowStart),
          windowSize: config.windowSizeSeconds,
          requestCount: counter!.count,
        },
      });
    } catch (error) {
      log.error({ error, identifier }, 'Failed to update rate limit record');
    }
  });

  return {
    allowed: true,
    remaining: remaining - 1,
    resetAt,
  };
}

/**
 * API使用量をログに記録
 */
export async function logApiUsage(options: {
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    await prisma.apiUsageLog.create({
      data: {
        apiKeyId: options.apiKeyId,
        endpoint: options.endpoint,
        method: options.method,
        statusCode: options.statusCode,
        responseTime: options.responseTime,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        requestSize: options.requestSize,
        responseSize: options.responseSize,
        errorCode: options.errorCode,
        errorMessage: options.errorMessage,
      },
    });
  } catch (error) {
    log.error({ error, endpoint: options.endpoint }, 'Failed to log API usage');
  }
}

/**
 * API使用量の統計を取得
 */
export async function getApiUsageStats(options: {
  apiKeyId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'endpoint' | 'hour' | 'day';
}): Promise<{
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
  errorBreakdown: { statusCode: number; count: number }[];
}> {
  const where: any = {
    createdAt: {
      gte: options.startDate,
      lte: options.endDate,
    },
  };

  if (options.apiKeyId) {
    where.apiKeyId = options.apiKeyId;
  }

  const [total, success, errors, avgResponse, topEndpoints, errorBreakdown] = await Promise.all([
    prisma.apiUsageLog.count({ where }),
    prisma.apiUsageLog.count({
      where: { ...where, statusCode: { lt: 400 } },
    }),
    prisma.apiUsageLog.count({
      where: { ...where, statusCode: { gte: 400 } },
    }),
    prisma.apiUsageLog.aggregate({
      where,
      _avg: { responseTime: true },
    }),
    prisma.apiUsageLog.groupBy({
      by: ['endpoint'],
      where,
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10,
    }),
    prisma.apiUsageLog.groupBy({
      by: ['statusCode'],
      where: { ...where, statusCode: { gte: 400 } },
      _count: true,
      orderBy: { _count: { statusCode: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalRequests: total,
    successCount: success,
    errorCount: errors,
    avgResponseTime: avgResponse._avg.responseTime || 0,
    topEndpoints: topEndpoints.map(e => ({
      endpoint: e.endpoint,
      count: e._count,
    })),
    errorBreakdown: errorBreakdown.map(e => ({
      statusCode: e.statusCode,
      count: e._count,
    })),
  };
}

/**
 * API使用量サマリーを計算
 */
export async function calculateUsageSummary(
  periodType: UsagePeriodType,
  periodStart: Date,
  apiKeyId?: string
): Promise<void> {
  let periodEnd: Date;

  switch (periodType) {
    case 'HOURLY':
      periodEnd = new Date(periodStart.getTime() + 3600000);
      break;
    case 'DAILY':
      periodEnd = new Date(periodStart.getTime() + 86400000);
      break;
    case 'MONTHLY':
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
  }

  const where: any = {
    createdAt: {
      gte: periodStart,
      lt: periodEnd,
    },
  };

  if (apiKeyId) {
    where.apiKeyId = apiKeyId;
  }

  const [stats, topEndpoints] = await Promise.all([
    prisma.apiUsageLog.aggregate({
      where,
      _count: true,
      _avg: { responseTime: true },
      _max: { responseTime: true },
      _sum: { requestSize: true, responseSize: true },
    }),
    prisma.apiUsageLog.groupBy({
      by: ['endpoint'],
      where,
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10,
    }),
  ]);

  const successCount = await prisma.apiUsageLog.count({
    where: { ...where, statusCode: { lt: 400 } },
  });

  const uniqueKey = {
    periodType,
    periodStart,
    apiKeyId: apiKeyId || null,
    endpoint: null,
  };

  await prisma.apiUsageSummary.upsert({
    where: {
      periodType_periodStart_apiKeyId_endpoint: uniqueKey as any,
    },
    update: {
      periodEnd,
      totalRequests: stats._count,
      successCount,
      errorCount: stats._count - successCount,
      avgResponseTime: stats._avg.responseTime,
      maxResponseTime: stats._max.responseTime,
      totalRequestSize: stats._sum.requestSize ? BigInt(stats._sum.requestSize) : null,
      totalResponseSize: stats._sum.responseSize ? BigInt(stats._sum.responseSize) : null,
      topEndpoints: topEndpoints.map(e => ({
        endpoint: e.endpoint,
        count: e._count,
      })) as any,
      calculatedAt: new Date(),
    },
    create: {
      periodType,
      periodStart,
      periodEnd,
      apiKeyId,
      totalRequests: stats._count,
      successCount,
      errorCount: stats._count - successCount,
      avgResponseTime: stats._avg.responseTime,
      maxResponseTime: stats._max.responseTime,
      totalRequestSize: stats._sum.requestSize ? BigInt(stats._sum.requestSize) : null,
      totalResponseSize: stats._sum.responseSize ? BigInt(stats._sum.responseSize) : null,
      topEndpoints: topEndpoints.map(e => ({
        endpoint: e.endpoint,
        count: e._count,
      })) as any,
    },
  });

  log.info({
    periodType,
    periodStart,
    apiKeyId,
    totalRequests: stats._count,
  }, 'Usage summary calculated');
}

/**
 * APIキーをブロック
 */
export async function blockApiKey(
  apiKeyId: string,
  durationMinutes: number,
  reason: string
): Promise<void> {
  const blockedUntil = new Date();
  blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

  await prisma.rateLimitRecord.create({
    data: {
      identifier: apiKeyId,
      identifierType: 'API_KEY',
      windowStart: new Date(),
      windowSize: durationMinutes * 60,
      isBlocked: true,
      blockedUntil,
      blockReason: reason,
    },
  });

  log.warn({ apiKeyId, durationMinutes, reason }, 'API key blocked');
}

/**
 * 古い使用量ログを削除
 */
export async function cleanupOldUsageLogs(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.apiUsageLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  log.info({ deletedCount: result.count, retentionDays }, 'Old API usage logs cleaned up');

  return result.count;
}

/**
 * メモリキャッシュをクリア
 */
export function clearRateLimitCache(): void {
  rateLimitCounters.clear();
  log.info('Rate limit cache cleared');
}

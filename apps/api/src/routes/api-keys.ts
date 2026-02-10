import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import * as crypto from 'crypto';

const router = Router();
const log = logger.child({ module: 'api-keys' });

/**
 * APIキー一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { isActive, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          rateLimit: true,
          dailyLimit: true,
          isActive: true,
          expiresAt: true,
          description: true,
          createdBy: true,
          lastUsedAt: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiKey.count({ where }),
    ]);

    res.json({
      success: true,
      data: keys,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキー詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        dailyLimit: true,
        isActive: true,
        expiresAt: true,
        description: true,
        createdBy: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new AppError(404, 'API key not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキー作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      permissions = ['*'],
      rateLimit = 1000,
      dailyLimit,
      expiresAt,
      description,
    } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_INPUT');
    }

    // ランダムなAPIキーを生成
    const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        permissions,
        rateLimit,
        dailyLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
        createdBy: req.headers['x-api-key'] as string || 'system',
      },
    });

    log.info({ apiKeyId: apiKey.id, name }, 'API key created');

    res.status(201).json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // 生のキーは一度だけ返す
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
      },
      message: 'Save the API key securely. It will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキー更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, permissions, rateLimit, dailyLimit, expiresAt, description, isActive } = req.body;

    const existing = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'API key not found', 'NOT_FOUND');
    }

    const apiKey = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(permissions !== undefined && { permissions }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        dailyLimit: true,
        isActive: true,
        expiresAt: true,
        description: true,
      },
    });

    log.info({ apiKeyId: apiKey.id }, 'API key updated');

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキー無効化
 */
router.post('/:id/revoke', async (req, res, next) => {
  try {
    const apiKey = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    log.warn({ apiKeyId: apiKey.id }, 'API key revoked');

    res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキー削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.apiKey.delete({
      where: { id: req.params.id },
    });

    log.info({ apiKeyId: req.params.id }, 'API key deleted');

    res.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキーの使用量統計
 */
router.get('/:id/usage', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!apiKey) {
      throw new AppError(404, 'API key not found', 'NOT_FOUND');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where = {
      apiKeyId: req.params.id,
      createdAt: { gte: startDate },
    };

    const [total, success, errors, avgResponse, topEndpoints, dailyUsage] = await Promise.all([
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
      prisma.apiUsageSummary.findMany({
        where: {
          apiKeyId: req.params.id,
          periodType: 'DAILY',
          periodStart: { gte: startDate },
        },
        orderBy: { periodStart: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        summary: {
          totalRequests: total,
          successCount: success,
          errorCount: errors,
          successRate: total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '0%',
          avgResponseTime: avgResponse._avg.responseTime?.toFixed(0) || 0,
        },
        topEndpoints: topEndpoints.map(e => ({
          endpoint: e.endpoint,
          count: e._count,
        })),
        dailyUsage: dailyUsage.map(d => ({
          date: d.periodStart.toISOString().split('T')[0],
          requests: d.totalRequests,
          errors: d.errorCount,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 全体のAPI使用量統計
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where = { createdAt: { gte: startDate } };

    const [total, success, byEndpoint, byApiKey, hourlyDistribution] = await Promise.all([
      prisma.apiUsageLog.count({ where }),
      prisma.apiUsageLog.count({
        where: { ...where, statusCode: { lt: 400 } },
      }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where,
        _count: true,
        _avg: { responseTime: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 15,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['apiKeyId'],
        where,
        _count: true,
        orderBy: { _count: { apiKeyId: 'desc' } },
        take: 10,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where,
        _count: true,
      }),
    ]);

    // APIキー名を取得
    const apiKeyIds = byApiKey.map(a => a.apiKeyId).filter(Boolean) as string[];
    const apiKeyNames = await prisma.apiKey.findMany({
      where: { id: { in: apiKeyIds } },
      select: { id: true, name: true },
    });
    const keyNameMap = new Map(apiKeyNames.map(k => [k.id, k.name]));

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        overview: {
          totalRequests: total,
          successCount: success,
          errorCount: total - success,
          successRate: total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '0%',
        },
        topEndpoints: byEndpoint.map(e => ({
          endpoint: e.endpoint,
          count: e._count,
          avgResponseTime: e._avg.responseTime?.toFixed(0) || 0,
        })),
        topApiKeys: byApiKey.map(a => ({
          apiKeyId: a.apiKeyId,
          name: a.apiKeyId ? keyNameMap.get(a.apiKeyId) || 'Unknown' : 'Anonymous',
          count: a._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レート制限状況確認
 */
router.get('/rate-limits/status', async (req, res, next) => {
  try {
    const blockedRecords = await prisma.rateLimitRecord.findMany({
      where: {
        isBlocked: true,
        blockedUntil: { gt: new Date() },
      },
      orderBy: { blockedUntil: 'desc' },
      take: 20,
    });

    // APIキー情報を取得
    const apiKeyIds = blockedRecords
      .filter(r => r.identifierType === 'API_KEY')
      .map(r => r.identifier);

    const apiKeys = await prisma.apiKey.findMany({
      where: { id: { in: apiKeyIds } },
      select: { id: true, name: true },
    });
    const keyMap = new Map(apiKeys.map(k => [k.id, k.name]));

    res.json({
      success: true,
      data: {
        blockedCount: blockedRecords.length,
        blocked: blockedRecords.map(r => ({
          identifier: r.identifier,
          identifierType: r.identifierType,
          name: r.identifierType === 'API_KEY' ? keyMap.get(r.identifier) : null,
          blockedUntil: r.blockedUntil,
          reason: r.blockReason,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as apiKeysRouter };

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'audit-logs' });

/**
 * 監査ログ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      entityType,
      entityId,
      actorType,
      actorId,
      action,
      severity,
      startDate,
      endDate,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorType) where.actorType = actorType;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (severity) where.severity = severity;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { entityName: { contains: search as string, mode: 'insensitive' } },
        { actorName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 監査ログ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id: req.params.id },
    });

    if (!auditLog) {
      throw new AppError(404, 'Audit log not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンティティの変更履歴取得
 */
router.get('/entity/:entityType/:entityId', async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = '20' } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: entityType as any,
        entityId,
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 監査ログ統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where = {
      createdAt: { gte: startDate },
    };

    const [total, byAction, byEntityType, bySeverity, byActorType, recentCritical] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
        orderBy: { _count: { entityType: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['actorType'],
        where,
        _count: true,
      }),
      prisma.auditLog.findMany({
        where: {
          ...where,
          severity: { in: ['WARNING', 'ERROR', 'CRITICAL'] },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        total,
        byAction: byAction.reduce((acc, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byEntityType: byEntityType.reduce((acc, item) => {
          acc[item.entityType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item.severity] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byActorType: byActorType.reduce((acc, item) => {
          acc[item.actorType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentCritical,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 日別アクティビティ取得
 */
router.get('/stats/activity', async (req, res, next) => {
  try {
    const { days = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    startDate.setHours(0, 0, 0, 0);

    // 日別でグループ化（Prisma raw queryを使用）
    const logs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, action: true },
    });

    // 日別に集計
    const dailyActivity: Record<string, { total: number; actions: Record<string, number> }> = {};

    for (const log of logs) {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = { total: 0, actions: {} };
      }
      dailyActivity[date].total++;
      dailyActivity[date].actions[log.action] = (dailyActivity[date].actions[log.action] || 0) + 1;
    }

    // 配列に変換してソート
    const activity = Object.entries(dailyActivity)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 操作者別アクティビティ取得
 */
router.get('/stats/actors', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const actorStats = await prisma.auditLog.groupBy({
      by: ['actorType', 'actorId', 'actorName'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      orderBy: { _count: { actorType: 'desc' } },
      take: 20,
    });

    const actors = actorStats.map(stat => ({
      actorType: stat.actorType,
      actorId: stat.actorId,
      actorName: stat.actorName,
      actionCount: stat._count,
    }));

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        actors,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 監査ログ手動作成（管理者用）
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      actorType,
      actorId,
      actorName,
      entityType,
      entityId,
      entityName,
      action,
      description,
      metadata,
      severity,
    } = req.body;

    if (!entityType || !action || !description) {
      throw new AppError(400, 'entityType, action, and description are required', 'INVALID_INPUT');
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        actorType: actorType || 'USER',
        actorId,
        actorName,
        entityType,
        entityId,
        entityName,
        action,
        description,
        metadata: metadata || {},
        severity: severity || 'INFO',
        changedFields: [],
      },
    });

    log.info({ auditLogId: auditLog.id }, 'Audit log created manually');

    res.status(201).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
});

export { router as auditLogsRouter };

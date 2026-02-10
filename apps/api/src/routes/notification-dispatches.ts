import { Router } from 'express';
import { prisma, NotificationChannelType, NotificationSeverity, NotificationDispatchStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'notification-dispatches' });

/**
 * 通知ディスパッチ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, channelType, severity, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (channelType) where.channelType = channelType;
    if (severity) where.severity = severity;

    const [dispatches, total] = await Promise.all([
      prisma.notificationDispatch.findMany({
        where,
        select: {
          id: true,
          channelId: true,
          channelType: true,
          eventType: true,
          title: true,
          severity: true,
          status: true,
          attemptCount: true,
          maxAttempts: true,
          sentAt: true,
          nextRetryAt: true,
          errorCode: true,
          errorMessage: true,
          scheduledAt: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notificationDispatch.count({ where }),
    ]);

    res.json({
      success: true,
      data: dispatches,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知ディスパッチ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const dispatch = await prisma.notificationDispatch.findUnique({
      where: { id: req.params.id },
    });

    if (!dispatch) {
      throw new AppError(404, 'Notification dispatch not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知を送信
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      channelId,
      channelType,
      eventType,
      title,
      message,
      severity = 'INFO',
      payload,
      scheduledAt,
    } = req.body;

    if (!channelId || !channelType || !eventType || !title || !message) {
      throw new AppError(400, 'channelId, channelType, eventType, title, and message are required', 'INVALID_INPUT');
    }

    const validChannelTypes = Object.values(NotificationChannelType);
    if (!validChannelTypes.includes(channelType)) {
      throw new AppError(400, `Invalid channelType: ${channelType}`, 'INVALID_INPUT');
    }

    const validSeverities = Object.values(NotificationSeverity);
    if (!validSeverities.includes(severity)) {
      throw new AppError(400, `Invalid severity: ${severity}`, 'INVALID_INPUT');
    }

    const dispatch = await prisma.notificationDispatch.create({
      data: {
        channelId,
        channelType,
        eventType,
        title,
        message,
        severity,
        payload: payload || {},
        status: scheduledAt ? 'SCHEDULED' : 'PENDING',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    log.info({ dispatchId: dispatch.id, channelType, eventType }, 'Notification dispatch created');

    res.status(201).json({
      success: true,
      data: {
        id: dispatch.id,
        channelType: dispatch.channelType,
        status: dispatch.status,
      },
      message: 'Notification queued for delivery',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知をリトライ
 */
router.post('/:id/retry', async (req, res, next) => {
  try {
    const dispatch = await prisma.notificationDispatch.findUnique({
      where: { id: req.params.id },
    });

    if (!dispatch) {
      throw new AppError(404, 'Notification dispatch not found', 'NOT_FOUND');
    }

    if (dispatch.status !== 'FAILED') {
      throw new AppError(400, 'Only failed notifications can be retried', 'INVALID_OPERATION');
    }

    const updated = await prisma.notificationDispatch.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING',
        errorCode: null,
        errorMessage: null,
        nextRetryAt: null,
      },
    });

    log.info({ dispatchId: req.params.id }, 'Notification dispatch retry queued');

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
      },
      message: 'Notification retry queued',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知をキャンセル
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const dispatch = await prisma.notificationDispatch.findUnique({
      where: { id: req.params.id },
    });

    if (!dispatch) {
      throw new AppError(404, 'Notification dispatch not found', 'NOT_FOUND');
    }

    if (!['PENDING', 'SCHEDULED'].includes(dispatch.status)) {
      throw new AppError(400, 'Only pending or scheduled notifications can be cancelled', 'INVALID_OPERATION');
    }

    const updated = await prisma.notificationDispatch.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
      },
      message: 'Notification cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知テンプレート一覧取得
 */
router.get('/templates', async (req, res, next) => {
  try {
    const { eventType, isActive } = req.query;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知テンプレート作成
 */
router.post('/templates', async (req, res, next) => {
  try {
    const {
      name,
      description,
      eventType,
      slackTemplate,
      discordTemplate,
      lineTemplate,
      emailTemplate,
      placeholders = [],
    } = req.body;

    if (!name || !eventType) {
      throw new AppError(400, 'name and eventType are required', 'INVALID_INPUT');
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        name,
        description,
        eventType,
        slackTemplate: slackTemplate || null,
        discordTemplate: discordTemplate || null,
        lineTemplate: lineTemplate || null,
        emailTemplate: emailTemplate || null,
        placeholders,
        isActive: true,
      },
    });

    log.info({ templateId: template.id, name }, 'Notification template created');

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知テンプレート更新
 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      slackTemplate,
      discordTemplate,
      lineTemplate,
      emailTemplate,
      placeholders,
      isActive,
    } = req.body;

    const template = await prisma.notificationTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(slackTemplate !== undefined && { slackTemplate }),
        ...(discordTemplate !== undefined && { discordTemplate }),
        ...(lineTemplate !== undefined && { lineTemplate }),
        ...(emailTemplate !== undefined && { emailTemplate }),
        ...(placeholders !== undefined && { placeholders }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知テンプレート削除
 */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    await prisma.notificationTemplate.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知設定一覧取得
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      throw new AppError(400, 'userId is required', 'INVALID_INPUT');
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: userId as string },
      orderBy: { eventType: 'asc' },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知設定作成/更新
 */
router.put('/preferences', async (req, res, next) => {
  try {
    const {
      userId,
      eventType,
      channels = [],
      isEnabled = true,
      frequency = 'IMMEDIATE',
      digestHour,
      quietHoursStart,
      quietHoursEnd,
      minSeverity = 'INFO',
      filters,
    } = req.body;

    if (!userId || !eventType) {
      throw new AppError(400, 'userId and eventType are required', 'INVALID_INPUT');
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
      update: {
        channels,
        isEnabled,
        frequency,
        digestHour,
        quietHoursStart,
        quietHoursEnd,
        minSeverity,
        filters: filters || {},
      },
      create: {
        userId,
        eventType,
        channels,
        isEnabled,
        frequency,
        digestHour,
        quietHoursStart,
        quietHoursEnd,
        minSeverity,
        filters: filters || {},
      },
    });

    res.json({
      success: true,
      data: preference,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知設定削除
 */
router.delete('/preferences/:id', async (req, res, next) => {
  try {
    await prisma.notificationPreference.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Preference deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [total, dispatches] = await Promise.all([
      prisma.notificationDispatch.count({ where }),
      prisma.notificationDispatch.findMany({
        where,
        select: {
          status: true,
          channelType: true,
          severity: true,
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byChannelType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const dispatch of dispatches) {
      byStatus[dispatch.status] = (byStatus[dispatch.status] || 0) + 1;
      byChannelType[dispatch.channelType] = (byChannelType[dispatch.channelType] || 0) + 1;
      bySeverity[dispatch.severity] = (bySeverity[dispatch.severity] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        byChannelType,
        bySeverity,
        deliveryRate: total > 0
          ? `${(((byStatus['SENT'] || 0) / total) * 100).toFixed(1)}%`
          : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * チャンネルタイプ一覧
 */
router.get('/channel-types', async (_req, res, next) => {
  try {
    const channelTypes = Object.values(NotificationChannelType).map((type) => ({
      value: type,
      label: getChannelTypeLabel(type),
    }));

    res.json({
      success: true,
      data: channelTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 重要度一覧
 */
router.get('/severities', async (_req, res, next) => {
  try {
    const severities = Object.values(NotificationSeverity).map((severity) => ({
      value: severity,
      label: severity,
    }));

    res.json({
      success: true,
      data: severities,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getChannelTypeLabel(type: NotificationChannelType): string {
  const labels: Record<NotificationChannelType, string> = {
    SLACK: 'Slack',
    DISCORD: 'Discord',
    LINE: 'LINE',
    EMAIL: 'Email',
  };
  return labels[type] || type;
}

export { router as notificationDispatchesRouter };

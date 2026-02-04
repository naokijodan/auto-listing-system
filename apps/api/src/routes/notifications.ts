import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();

/**
 * 通知一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { unreadOnly, type, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    if (type) {
      where.type = type as string;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 未読通知数取得
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { isRead: false },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知を既読にする
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 全通知を既読にする
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知作成（内部API・Worker用）
 */
router.post('/', async (req, res, next) => {
  try {
    const { type, title, message, severity = 'INFO', productId, listingId, jobLogId, metadata = {} } =
      req.body;

    if (!type || !title || !message) {
      throw new AppError(400, 'type, title, and message are required', 'INVALID_REQUEST');
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        severity,
        productId,
        listingId,
        jobLogId,
        metadata,
      },
    });

    logger.info({
      type: 'notification_created',
      notificationId: notification.id,
      notificationType: type,
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

export { router as notificationsRouter };

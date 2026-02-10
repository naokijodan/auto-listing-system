import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'customer-messages' });

// バリデーションスキーマ
const createMessageSchema = z.object({
  orderId: z.string().optional(),
  templateId: z.string().optional(),
  marketplace: z.enum(['JOOM', 'EBAY']),
  buyerUsername: z.string().min(1),
  buyerEmail: z.string().email().optional().nullable(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  bodyHtml: z.string().optional().nullable(),
});

const retryMessageSchema = z.object({
  resetAttempts: z.boolean().default(false),
});

/**
 * メッセージ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      orderId,
      marketplace,
      status,
      buyerUsername,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (marketplace) where.marketplace = marketplace;
    if (status) where.status = status;
    if (buyerUsername) where.buyerUsername = { contains: buyerUsername as string };

    const [messages, total] = await Promise.all([
      prisma.customerMessage.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { name: true, triggerEvent: true },
          },
        },
      }),
      prisma.customerMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: messages,
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
 * メッセージ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const message = await prisma.customerMessage.findUnique({
      where: { id: req.params.id },
      include: {
        template: true,
        webhookEvent: {
          select: {
            id: true,
            provider: true,
            eventType: true,
            status: true,
          },
        },
      },
    });

    if (!message) {
      throw new AppError(404, 'Message not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メッセージ手動作成（カスタムメッセージ）
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createMessageSchema.parse(req.body);

    const message = await prisma.customerMessage.create({
      data: {
        ...validated,
        status: 'PENDING',
      },
    });

    log.info({ messageId: message.id, buyerUsername: message.buyerUsername }, 'Customer message created');

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メッセージ再送信
 */
router.post('/:id/retry', async (req, res, next) => {
  try {
    const validated = retryMessageSchema.parse(req.body);

    const message = await prisma.customerMessage.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      throw new AppError(404, 'Message not found', 'NOT_FOUND');
    }

    if (message.status === 'SENT') {
      throw new AppError(400, 'Message already sent', 'ALREADY_SENT');
    }

    const updateData: any = {
      status: 'PENDING',
      errorMessage: null,
    };

    if (validated.resetAttempts) {
      updateData.sendingAttempts = 0;
    }

    const updated = await prisma.customerMessage.update({
      where: { id: req.params.id },
      data: updateData,
    });

    log.info({ messageId: updated.id }, 'Customer message queued for retry');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メッセージ統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { marketplace, days = '7' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const where: any = {
      createdAt: { gte: since },
    };
    if (marketplace) where.marketplace = marketplace;

    const [statusCounts, byMarketplace, recentFailed] = await Promise.all([
      // ステータス別カウント
      prisma.customerMessage.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // マーケットプレイス別カウント
      prisma.customerMessage.groupBy({
        by: ['marketplace'],
        where,
        _count: true,
      }),
      // 最近の失敗メッセージ
      prisma.customerMessage.findMany({
        where: {
          ...where,
          status: { in: ['FAILED', 'FATAL'] },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          marketplace: true,
          buyerUsername: true,
          status: true,
          errorMessage: true,
          sendingAttempts: true,
          updatedAt: true,
        },
      }),
    ]);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const marketplaceMap = byMarketplace.reduce((acc, item) => {
      acc[item.marketplace] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(statusMap).reduce((sum, count) => sum + count, 0);
    const successRate = total > 0
      ? ((statusMap.SENT || 0) / total * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        period: { days: Number(days), since },
        total,
        byStatus: statusMap,
        byMarketplace: marketplaceMap,
        successRate: `${successRate}%`,
        recentFailed,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括リトライ（FAILEDメッセージ）
 */
router.post('/bulk/retry', async (req, res, next) => {
  try {
    const { marketplace, maxMessages = 100 } = req.body;

    const where: any = {
      status: 'FAILED',
      sendingAttempts: { lt: 3 }, // maxAttemptsより少ない
    };
    if (marketplace) where.marketplace = marketplace;

    const messages = await prisma.customerMessage.findMany({
      where,
      take: maxMessages,
      select: { id: true },
    });

    if (messages.length === 0) {
      res.json({
        success: true,
        data: { retried: 0 },
      });
      return;
    }

    const result = await prisma.customerMessage.updateMany({
      where: {
        id: { in: messages.map(m => m.id) },
      },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    log.info({ count: result.count }, 'Bulk retry initiated');

    res.json({
      success: true,
      data: { retried: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレートからメッセージ生成
 */
router.post('/from-template', async (req, res, next) => {
  try {
    const { templateId, orderId, placeholderValues } = req.body;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    // デフォルトプレースホルダー値
    const defaultValues: Record<string, string> = {
      buyer_name: order.buyerName || order.buyerUsername,
      order_id: order.marketplaceOrderId,
      tracking_number: order.trackingNumber || '',
      tracking_carrier: order.trackingCarrier || '',
      total: `${order.total} ${order.currency}`,
    };

    const values: Record<string, string> = { ...defaultValues, ...(placeholderValues || {}) };

    let subject = template.subject;
    let body = template.body;
    let bodyHtml = template.bodyHtml || null;

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
      body = body.replace(new RegExp(placeholder, 'g'), value || '');
      if (bodyHtml) {
        bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value || '');
      }
    }

    const message = await prisma.customerMessage.create({
      data: {
        orderId,
        templateId,
        marketplace: order.marketplace,
        buyerUsername: order.buyerUsername,
        buyerEmail: order.buyerEmail,
        subject,
        body,
        bodyHtml,
        status: 'PENDING',
      },
    });

    log.info({ messageId: message.id, templateId, orderId }, 'Customer message created from template');

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

export { router as customerMessagesRouter };

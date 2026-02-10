import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'message-templates' });

// バリデーションスキーマ
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  triggerEvent: z.enum([
    'ORDER_CONFIRMED',
    'ORDER_PAID',
    'ORDER_SHIPPED',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    'ORDER_REFUNDED',
    'TRACKING_UPDATED',
    'CUSTOM',
  ]),
  marketplace: z.enum(['JOOM', 'EBAY']).optional().nullable(),
  language: z.string().default('en'),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  bodyHtml: z.string().optional().nullable(),
  placeholders: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
});

const updateTemplateSchema = createTemplateSchema.partial();

/**
 * テンプレート一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { triggerEvent, marketplace, language, isActive } = req.query;

    const where: any = {};
    if (triggerEvent) where.triggerEvent = triggerEvent;
    if (marketplace) where.marketplace = marketplace;
    if (language) where.language = language;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: [{ triggerEvent: 'asc' }, { priority: 'desc' }],
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
 * テンプレート取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.messageTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { customerMessages: true },
        },
      },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート作成
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createTemplateSchema.parse(req.body);

    // デフォルトプレースホルダー
    const defaultPlaceholders = [
      'buyer_name',
      'order_id',
      'tracking_number',
      'tracking_carrier',
      'total',
    ];

    const template = await prisma.messageTemplate.create({
      data: {
        ...validated,
        placeholders: validated.placeholders || defaultPlaceholders,
      },
    });

    log.info({ templateId: template.id, name: template.name }, 'Message template created');

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート更新
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateTemplateSchema.parse(req.body);

    const existing = await prisma.messageTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    const template = await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: validated,
    });

    log.info({ templateId: template.id }, 'Message template updated');

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.messageTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { customerMessages: true },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    if (existing._count.customerMessages > 0) {
      // メッセージがある場合は非アクティブ化
      await prisma.messageTemplate.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      log.info({ templateId: req.params.id }, 'Message template deactivated (has messages)');

      res.json({
        success: true,
        message: 'Template deactivated (has existing messages)',
      });
    } else {
      await prisma.messageTemplate.delete({
        where: { id: req.params.id },
      });

      log.info({ templateId: req.params.id }, 'Message template deleted');

      res.json({
        success: true,
        message: 'Template deleted',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレートプレビュー（プレースホルダー置換テスト）
 */
router.post('/:id/preview', async (req, res, next) => {
  try {
    const template = await prisma.messageTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    // サンプルデータ
    const sampleData: Record<string, string> = {
      buyer_name: req.body.buyer_name || 'John Doe',
      order_id: req.body.order_id || 'ORD-123456',
      tracking_number: req.body.tracking_number || 'JP1234567890',
      tracking_carrier: req.body.tracking_carrier || 'Japan Post',
      total: req.body.total || '99.99 USD',
      ...req.body,
    };

    let subject = template.subject;
    let body = template.body;
    let bodyHtml = template.bodyHtml || null;

    for (const [key, value] of Object.entries(sampleData)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
      if (bodyHtml) {
        bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    res.json({
      success: true,
      data: {
        subject,
        body,
        bodyHtml,
        placeholders: template.placeholders,
        sampleData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デフォルトテンプレート一括作成
 */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    const defaultTemplates = [
      // 注文確認（英語）
      {
        name: 'order_confirmation_en',
        description: 'Order confirmation email (English)',
        triggerEvent: 'ORDER_CONFIRMED' as const,
        language: 'en',
        subject: 'Order Confirmed - Order #{{order_id}}',
        body: `Dear {{buyer_name}},

Thank you for your order!

Your order #{{order_id}} has been confirmed and is being prepared for shipment.

Order Total: {{total}}

We will notify you once your order has been shipped.

Best regards,
RAKUDA Store`,
        placeholders: ['buyer_name', 'order_id', 'total'],
        isActive: true,
        priority: 10,
      },
      // 発送通知（英語）
      {
        name: 'order_shipped_en',
        description: 'Order shipped notification (English)',
        triggerEvent: 'ORDER_SHIPPED' as const,
        language: 'en',
        subject: 'Your Order Has Been Shipped - Order #{{order_id}}',
        body: `Dear {{buyer_name}},

Great news! Your order #{{order_id}} has been shipped.

Tracking Information:
- Carrier: {{tracking_carrier}}
- Tracking Number: {{tracking_number}}

You can track your package using the tracking number above.

Thank you for shopping with us!

Best regards,
RAKUDA Store`,
        placeholders: ['buyer_name', 'order_id', 'tracking_number', 'tracking_carrier'],
        isActive: true,
        priority: 10,
      },
      // 配達完了（英語）
      {
        name: 'order_delivered_en',
        description: 'Order delivered notification (English)',
        triggerEvent: 'ORDER_DELIVERED' as const,
        language: 'en',
        subject: 'Your Order Has Been Delivered - Order #{{order_id}}',
        body: `Dear {{buyer_name}},

Your order #{{order_id}} has been delivered!

We hope you enjoy your purchase. If you have any questions or concerns, please don't hesitate to contact us.

Thank you for choosing RAKUDA Store!

Best regards,
RAKUDA Store`,
        placeholders: ['buyer_name', 'order_id'],
        isActive: true,
        priority: 10,
      },
      // 追跡情報更新（英語）
      {
        name: 'tracking_updated_en',
        description: 'Tracking information updated (English)',
        triggerEvent: 'TRACKING_UPDATED' as const,
        language: 'en',
        subject: 'Tracking Update - Order #{{order_id}}',
        body: `Dear {{buyer_name}},

The tracking information for your order #{{order_id}} has been updated.

Updated Tracking Information:
- Carrier: {{tracking_carrier}}
- Tracking Number: {{tracking_number}}

Best regards,
RAKUDA Store`,
        placeholders: ['buyer_name', 'order_id', 'tracking_number', 'tracking_carrier'],
        isActive: true,
        priority: 10,
      },
      // 返金完了（英語）
      {
        name: 'order_refunded_en',
        description: 'Order refunded notification (English)',
        triggerEvent: 'ORDER_REFUNDED' as const,
        language: 'en',
        subject: 'Refund Processed - Order #{{order_id}}',
        body: `Dear {{buyer_name}},

Your refund for order #{{order_id}} has been processed.

Refund Amount: {{total}}

Please allow 5-10 business days for the refund to appear in your account.

If you have any questions, please contact us.

Best regards,
RAKUDA Store`,
        placeholders: ['buyer_name', 'order_id', 'total'],
        isActive: true,
        priority: 10,
      },
    ];

    const results = [];
    for (const template of defaultTemplates) {
      const existing = await prisma.messageTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        results.push({ name: template.name, status: 'skipped', reason: 'already exists' });
      } else {
        const created = await prisma.messageTemplate.create({
          data: template,
        });
        results.push({ name: template.name, status: 'created', id: created.id });
      }
    }

    log.info({ count: results.filter(r => r.status === 'created').length }, 'Default templates seeded');

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

export { router as messageTemplatesRouter };

/**
 * Phase 108: eBayメッセージ管理 API
 *
 * eBay顧客メッセージの送受信・管理機能
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { logger } from '@rakuda/logger';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-messages' });

// バリデーションスキーマ
const sendMessageSchema = z.object({
  orderId: z.string().optional(),
  listingId: z.string().optional(),
  buyerUsername: z.string().min(1),
  buyerEmail: z.string().email().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  templateId: z.string().optional(),
});

const replyMessageSchema = z.object({
  body: z.string().min(1),
  templateId: z.string().optional(),
});

// ========================================
// メッセージダッシュボード
// ========================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      pendingMessages,
      sentToday,
      failedMessages,
      recentMessages,
      byStatus,
    ] = await Promise.all([
      // 総メッセージ数
      prisma.customerMessage.count({
        where: { marketplace: Marketplace.EBAY },
      }),
      // 未送信メッセージ
      prisma.customerMessage.count({
        where: { marketplace: Marketplace.EBAY, status: 'PENDING' },
      }),
      // 今日の送信数
      prisma.customerMessage.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'SENT',
          sentAt: { gte: today },
        },
      }),
      // 失敗メッセージ
      prisma.customerMessage.count({
        where: { marketplace: Marketplace.EBAY, status: 'FAILED' },
      }),
      // 最近のメッセージ
      prisma.customerMessage.findMany({
        where: { marketplace: Marketplace.EBAY },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          template: { select: { name: true } },
        },
      }),
      // ステータス別集計
      prisma.customerMessage.groupBy({
        by: ['status'],
        where: { marketplace: Marketplace.EBAY },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      summary: {
        totalMessages,
        pendingMessages,
        sentToday,
        failedMessages,
      },
      byStatus: statusCounts,
      recentMessages: recentMessages.map(msg => ({
        id: msg.id,
        buyerUsername: msg.buyerUsername,
        subject: msg.subject,
        status: msg.status,
        templateName: msg.template?.name || null,
        createdAt: msg.createdAt,
        sentAt: msg.sentAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get message dashboard' });
  }
});

// ========================================
// メッセージ一覧
// ========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      buyerUsername,
      orderId,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      marketplace: Marketplace.EBAY,
    };
    if (status) where.status = status;
    if (buyerUsername) where.buyerUsername = { contains: buyerUsername as string };
    if (orderId) where.orderId = orderId;

    const [messages, total] = await Promise.all([
      prisma.customerMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          template: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              externalOrderId: true,
              totalAmount: true,
            },
          },
        },
      }),
      prisma.customerMessage.count({ where }),
    ]);

    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        orderId: msg.orderId,
        orderExternalId: msg.order?.externalOrderId,
        buyerUsername: msg.buyerUsername,
        buyerEmail: msg.buyerEmail,
        subject: msg.subject,
        body: msg.body,
        status: msg.status,
        templateId: msg.templateId,
        templateName: msg.template?.name,
        attempts: msg.attempts,
        errorMessage: msg.errorMessage,
        createdAt: msg.createdAt,
        sentAt: msg.sentAt,
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

// ========================================
// メッセージ詳細
// ========================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.customerMessage.findUnique({
      where: { id },
      include: {
        template: true,
        order: {
          include: {
            items: {
              include: {
                product: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    log.error({ type: 'get_error', error });
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// ========================================
// メッセージ送信
// ========================================

router.post('/send', async (req: Request, res: Response) => {
  try {
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // テンプレートを使用する場合
    let body = data.body;
    let subject = data.subject;

    if (data.templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (template) {
        // 変数置換
        const variables: Record<string, string> = {
          buyerName: data.buyerUsername,
          // 注文情報がある場合
        };

        if (data.orderId) {
          const order = await prisma.order.findUnique({
            where: { id: data.orderId },
            include: { items: { include: { product: true } } },
          });
          if (order) {
            variables.orderId = order.externalOrderId || order.id;
            variables.orderTotal = `$${order.totalAmount.toFixed(2)}`;
            variables.itemTitle = order.items[0]?.product?.title || '';
          }
        }

        body = replaceVariables(template.body, variables);
        subject = replaceVariables(template.subject, variables);
      }
    }

    // メッセージを作成
    const message = await prisma.customerMessage.create({
      data: {
        marketplace: Marketplace.EBAY,
        orderId: data.orderId || null,
        buyerUsername: data.buyerUsername,
        buyerEmail: data.buyerEmail || null,
        subject,
        body,
        templateId: data.templateId || null,
        status: 'PENDING',
      },
    });

    log.info({
      type: 'message_created',
      messageId: message.id,
      buyerUsername: data.buyerUsername,
    });

    // TODO: 実際のeBay API送信はワーカーで行う
    // ここでは即座にPENDINGとして保存

    res.status(201).json({
      message: 'Message queued for sending',
      id: message.id,
      status: message.status,
    });
  } catch (error) {
    log.error({ type: 'send_error', error });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ========================================
// メッセージ再送信
// ========================================

router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.customerMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.status === 'SENT') {
      return res.status(400).json({ error: 'Message already sent' });
    }

    // ステータスをリセット
    const updated = await prisma.customerMessage.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null,
        attempts: 0,
      },
    });

    log.info({ type: 'message_retry', messageId: id });

    res.json({
      message: 'Message queued for retry',
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    log.error({ type: 'retry_error', error });
    res.status(500).json({ error: 'Failed to retry message' });
  }
});

// ========================================
// メッセージテンプレート一覧（eBay用）
// ========================================

router.get('/templates/list', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        OR: [
          { marketplace: null },
          { marketplace: Marketplace.EBAY },
        ],
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // カテゴリ別にグループ化
    const byCategory: Record<string, typeof templates> = {};
    for (const template of templates) {
      const cat = template.category || 'その他';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(template);
    }

    res.json({
      templates,
      byCategory,
    });
  } catch (error) {
    log.error({ type: 'list_templates_error', error });
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// ========================================
// テンプレートプレビュー
// ========================================

router.post('/templates/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;

    const template = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // デフォルト変数
    const defaultVars: Record<string, string> = {
      buyerName: 'John Doe',
      orderId: 'ORD-12345',
      orderTotal: '$99.99',
      itemTitle: 'Sample Product',
      trackingNumber: 'JP123456789',
      estimatedDelivery: '5-10 business days',
      ...variables,
    };

    const previewSubject = replaceVariables(template.subject, defaultVars);
    const previewBody = replaceVariables(template.body, defaultVars);

    res.json({
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
      },
      preview: {
        subject: previewSubject,
        body: previewBody,
      },
      availableVariables: Object.keys(defaultVars),
    });
  } catch (error) {
    log.error({ type: 'preview_error', error });
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// ========================================
// 統計
// ========================================

router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [
      totalSent,
      totalFailed,
      byDay,
      topTemplates,
    ] = await Promise.all([
      // 送信成功数
      prisma.customerMessage.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'SENT',
          sentAt: { gte: since },
        },
      }),
      // 送信失敗数
      prisma.customerMessage.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'FAILED',
          createdAt: { gte: since },
        },
      }),
      // 日別送信数
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(sent_at) as date, COUNT(*) as count
        FROM customer_messages
        WHERE marketplace = 'EBAY'
          AND status = 'SENT'
          AND sent_at >= ${since}
        GROUP BY DATE(sent_at)
        ORDER BY date DESC
        LIMIT 30
      `.catch(() => []),
      // よく使うテンプレート
      prisma.customerMessage.groupBy({
        by: ['templateId'],
        where: {
          marketplace: Marketplace.EBAY,
          templateId: { not: null },
          createdAt: { gte: since },
        },
        _count: true,
        orderBy: { _count: { templateId: 'desc' } },
        take: 5,
      }),
    ]);

    // テンプレート名を取得
    const templateIds = topTemplates.map(t => t.templateId).filter(Boolean) as string[];
    const templates = await prisma.messageTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true },
    });
    const templateMap = new Map(templates.map(t => [t.id, t.name]));

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      summary: {
        totalSent,
        totalFailed,
        successRate: totalSent + totalFailed > 0
          ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      byDay: byDay.map(d => ({
        date: d.date,
        count: Number(d.count),
      })),
      topTemplates: topTemplates.map(t => ({
        templateId: t.templateId,
        templateName: templateMap.get(t.templateId!) || 'Unknown',
        count: t._count,
      })),
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ========================================
// ヘルパー関数
// ========================================

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export default router;

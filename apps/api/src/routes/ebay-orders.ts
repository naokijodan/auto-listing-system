
/**
 * Phase 109: eBay注文管理 API
 *
 * eBay注文の詳細管理・発送・キャンセル機能
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace, OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-orders' });

// Redis接続
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const orderQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーションスキーマ
const updateShippingSchema = z.object({
  trackingNumber: z.string().min(1),
  trackingCarrier: z.string().min(1),
  shippingCost: z.number().optional(),
  syncToEbay: z.boolean().default(true),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  fulfillmentStatus: z.enum(['UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED']).optional(),
  notes: z.string().optional(),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(1),
  refundAmount: z.number().optional(),
  syncToEbay: z.boolean().default(true),
});

const addNoteSchema = z.object({
  note: z.string().min(1).max(1000),
  type: z.enum(['INTERNAL', 'BUYER', 'SHIPPING', 'ISSUE']).default('INTERNAL'),
});

// ========================================
// ダッシュボード
// ========================================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      weekOrders,
      monthRevenue,
      actionRequired,
      recentOrders,
    ] = await Promise.all([
      // 総注文数
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY },
      }),
      // 保留中
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY, status: 'PENDING' },
      }),
      // 処理中
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY, status: 'PROCESSING' },
      }),
      // 発送済み
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY, status: 'SHIPPED' },
      }),
      // 配達完了
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY, status: 'DELIVERED' },
      }),
      // キャンセル
      prisma.order.count({
        where: { marketplace: Marketplace.EBAY, status: 'CANCELLED' },
      }),
      // 今日の注文
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: today },
        },
      }),
      // 週間注文
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: weekAgo },
        },
      }),
      // 月間売上
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: monthAgo },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      // 要対応
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          OR: [
            { status: 'PENDING', paymentStatus: 'PAID' },
            { status: 'CONFIRMED' },
            { status: 'PROCESSING', fulfillmentStatus: 'UNFULFILLED' },
          ],
        },
      }),
      // 最近の注文
      prisma.order.findMany({
        where: { marketplace: Marketplace.EBAY },
        orderBy: { orderedAt: 'desc' },
        take: 10,
        include: {
          sales: {
            select: {
              title: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
      }),
    ]);

    res.json({
      summary: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        actionRequired,
      },
      period: {
        today: todayOrders,
        week: weekOrders,
        monthRevenue: monthRevenue._sum.total || 0,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        marketplaceOrderId: order.marketplaceOrderId,
        buyerUsername: order.buyerUsername,
        buyerName: order.buyerName,
        total: order.total,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        orderedAt: order.orderedAt,
        itemCount: order.sales.reduce((sum, s) => sum + s.quantity, 0),
        firstItemTitle: order.sales[0]?.title || null,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get order dashboard' });
  }
});

// ========================================
// 注文一覧
// ========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      search,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
      sortBy = 'orderedAt',
      sortOrder = 'desc',
    } = req.query;

    const where: Record<string, unknown> = {
      marketplace: Marketplace.EBAY,
    };

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;

    if (search) {
      where.OR = [
        { marketplaceOrderId: { contains: search as string, mode: 'insensitive' } },
        { buyerUsername: { contains: search as string, mode: 'insensitive' } },
        { buyerName: { contains: search as string, mode: 'insensitive' } },
        { buyerEmail: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) (where.orderedAt as Record<string, unknown>).gte = new Date(startDate as string);
      if (endDate) (where.orderedAt as Record<string, unknown>).lte = new Date(endDate as string);
    }

    const orderByField = ['orderedAt', 'total', 'createdAt', 'status'].includes(sortBy as string)
      ? (sortBy as string)
      : 'orderedAt';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          sales: {
            select: {
              id: true,
              sku: true,
              title: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        marketplaceOrderId: order.marketplaceOrderId,
        externalOrderId: order.marketplaceOrderId,
        buyerUsername: order.buyerUsername,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        total: order.total,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
        orderedAt: order.orderedAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        items: order.sales,
        itemCount: order.sales.reduce((sum, s) => sum + s.quantity, 0),
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// ========================================
// 要対応注文
// ========================================

router.get('/action-required', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        OR: [
          { status: 'PENDING', paymentStatus: 'PAID' },
          { status: 'CONFIRMED' },
          { status: 'PROCESSING', fulfillmentStatus: 'UNFULFILLED' },
        ],
      },
      include: {
        sales: {
          select: {
            title: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
      orderBy: { orderedAt: 'asc' },
    });

    // 経過時間でグループ化
    const now = Date.now();
    const urgent: typeof orders = [];
    const normal: typeof orders = [];
    const recent: typeof orders = [];

    for (const order of orders) {
      const hoursSinceOrder = (now - order.orderedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceOrder > 48) {
        urgent.push(order);
      } else if (hoursSinceOrder > 24) {
        normal.push(order);
      } else {
        recent.push(order);
      }
    }

    res.json({
      total: orders.length,
      urgent: urgent.map(formatActionOrder),
      normal: normal.map(formatActionOrder),
      recent: recent.map(formatActionOrder),
    });
  } catch (error) {
    log.error({ type: 'action_required_error', error });
    res.status(500).json({ error: 'Failed to get action required orders' });
  }
});

function formatActionOrder(order: any) {
  return {
    id: order.id,
    marketplaceOrderId: order.marketplaceOrderId,
    buyerUsername: order.buyerUsername,
    buyerName: order.buyerName,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderedAt: order.orderedAt,
    hoursSinceOrder: Math.round((Date.now() - order.orderedAt.getTime()) / (1000 * 60 * 60)),
    items: order.sales,
  };
}

// ========================================
// 注文詳細
// ========================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        marketplace: Marketplace.EBAY,
      },
      include: {
        sales: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 注文メモを取得（メタデータから）
    const metadata = (order.rawData as Record<string, unknown>) || {};
    const notes = (metadata.notes as Array<{ note: string; type: string; createdAt: string }>) || [];

    res.json({
      ...order,
      notes,
      itemCount: order.sales.reduce((sum, s) => sum + s.quantity, 0),
    });
  } catch (error) {
    log.error({ type: 'get_order_error', error });
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// ========================================
// 発送情報更新
// ========================================

router.post('/:id/ship', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateShippingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { trackingNumber, trackingCarrier, shippingCost, syncToEbay } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Order already shipped' });
    }

    // 注文を更新
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        trackingNumber,
        trackingCarrier,
        shippingCost: shippingCost ?? order.shippingCost,
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        shippedAt: new Date(),
      },
    });

    // eBayに同期
    let syncResult = { queued: false, error: null as string | null };
    if (syncToEbay && order.marketplaceOrderId) {
      try {
        await orderQueue.add(
          'ebay-ship-order',
          {
            orderId: id,
            marketplaceOrderId: order.marketplaceOrderId,
            trackingNumber,
            trackingCarrier,
          },
          { priority: 1, attempts: 3 }
        );
        syncResult.queued = true;
      } catch (syncError: any) {
        syncResult.error = syncError.message;
      }
    }

    // 通知を作成
    await prisma.notification.create({
      data: {
        type: 'ORDER_SHIPPED',
        title: '出荷完了',
        message: `eBay注文 ${order.marketplaceOrderId} を出荷しました`,
        severity: 'SUCCESS',
        metadata: {
          orderId: id,
          trackingNumber,
          trackingCarrier,
        },
      },
    });

    log.info({
      type: 'order_shipped',
      orderId: id,
      trackingNumber,
      trackingCarrier,
      syncToEbay: syncResult.queued,
    });

    res.json({
      message: 'Order shipped successfully',
      order: updatedOrder,
      sync: syncResult,
    });
  } catch (error) {
    log.error({ type: 'ship_error', error });
    res.status(500).json({ error: 'Failed to ship order' });
  }
});

// ========================================
// ステータス更新
// ========================================

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { status, fulfillmentStatus, notes } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (fulfillmentStatus) updateData.fulfillmentStatus = fulfillmentStatus;

    // メモを追加
    if (notes) {
      const rawData = (order.rawData as Record<string, unknown>) || {};
      const existingNotes = (rawData.notes as Array<unknown>) || [];
      existingNotes.push({
        note: notes,
        type: 'STATUS_CHANGE',
        createdAt: new Date().toISOString(),
      });
      updateData.rawData = { ...rawData, notes: existingNotes };
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    log.info({
      type: 'status_updated',
      orderId: id,
      status,
      fulfillmentStatus,
    });

    res.json({
      message: 'Status updated',
      order: updatedOrder,
    });
  } catch (error) {
    log.error({ type: 'status_update_error', error });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ========================================
// 注文キャンセル
// ========================================

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = cancelOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { reason, refundAmount, syncToEbay } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return res.status(400).json({
        error: 'Cannot cancel shipped order. Use refund instead.',
      });
    }

    // メモを追加
    const rawData = (order.rawData as Record<string, unknown>) || {};
    const existingNotes = (rawData.notes as Array<unknown>) || [];
    existingNotes.push({
      note: `キャンセル理由: ${reason}`,
      type: 'CANCELLATION',
      createdAt: new Date().toISOString(),
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        rawData: { ...rawData, notes: existingNotes, cancelReason: reason } as any,
      },
    });

    // eBayに同期
    let syncResult = { queued: false, error: null as string | null };
    if (syncToEbay && order.marketplaceOrderId) {
      try {
        await orderQueue.add(
          'ebay-cancel-order',
          {
            orderId: id,
            marketplaceOrderId: order.marketplaceOrderId,
            reason,
            refundAmount,
          },
          { priority: 1, attempts: 3 }
        );
        syncResult.queued = true;
      } catch (syncError: any) {
        syncResult.error = syncError.message;
      }
    }

    // 通知を作成
    await prisma.notification.create({
      data: {
        type: 'ORDER_CANCELLED',
        title: '注文キャンセル',
        message: `eBay注文 ${order.marketplaceOrderId} をキャンセルしました`,
        severity: 'WARNING',
        metadata: {
          orderId: id,
          reason,
        },
      },
    });

    log.info({
      type: 'order_cancelled',
      orderId: id,
      reason,
    });

    res.json({
      message: 'Order cancelled',
      order: updatedOrder,
      sync: syncResult,
    });
  } catch (error) {
    log.error({ type: 'cancel_error', error });
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ========================================
// メモ追加
// ========================================

router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = addNoteSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { note, type } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const rawData = (order.rawData as Record<string, unknown>) || {};
    const existingNotes = (rawData.notes as Array<unknown>) || [];
    existingNotes.push({
      note,
      type,
      createdAt: new Date().toISOString(),
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        rawData: { ...rawData, notes: existingNotes } as any,
      },
    });

    log.info({
      type: 'note_added',
      orderId: id,
      noteType: type,
    });

    res.json({
      message: 'Note added',
      notes: existingNotes,
    });
  } catch (error) {
    log.error({ type: 'add_note_error', error });
    res.status(500).json({ error: 'Failed to add note' });
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
      totalOrders,
      paidOrders,
      shippedOrders,
      cancelledOrders,
      revenue,
      avgOrderValue,
      byStatus,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
        },
      }),
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          paymentStatus: 'PAID',
        },
      }),
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: 'SHIPPED',
        },
      }),
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: 'CANCELLED',
        },
      }),
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          paymentStatus: 'PAID',
        },
        _avg: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
        },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      period: {
        days: parseInt(days as string, 10),
        since: since.toISOString(),
      },
      summary: {
        totalOrders,
        paidOrders,
        shippedOrders,
        cancelledOrders,
        revenue: revenue._sum.total || 0,
        avgOrderValue: avgOrderValue._avg.total || 0,
        fulfillmentRate:
          totalOrders > 0 ? ((shippedOrders / totalOrders) * 100).toFixed(1) + '%' : 'N/A',
        cancellationRate:
          totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) + '%' : 'N/A',
      },
      byStatus: statusCounts,
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ========================================
// 日別売上
// ========================================

router.get('/stats/daily', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        orderedAt: { gte: since },
        paymentStatus: 'PAID',
      },
      select: {
        orderedAt: true,
        total: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    // 日別に集計
    const dailyStats: Record<string, { date: string; orders: number; revenue: number }> = {};

    for (const order of orders) {
      const dateKey = order.orderedAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
      }
      dailyStats[dateKey].orders += 1;
      dailyStats[dateKey].revenue += order.total;
    }

    res.json({
      data: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    log.error({ type: 'daily_stats_error', error });
    res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

// ========================================
// 同期
// ========================================

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { sinceDays = 7, maxOrders = 100 } = req.body;

    const job = await orderQueue.add(
      'ebay-order-sync',
      {
        marketplace: 'EBAY',
        sinceDays,
        maxOrders,
      },
      { priority: 2, attempts: 3 }
    );

    log.info({
      type: 'order_sync_queued',
      jobId: job.id,
      sinceDays,
    });

    res.status(202).json({
      message: 'Order sync job queued',
      jobId: job.id,
    });
  } catch (error) {
    log.error({ type: 'sync_error', error });
    res.status(500).json({ error: 'Failed to queue sync' });
  }
});

export default router;

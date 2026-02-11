/**
 * Phase 55-56: 仕入れ管理APIエンドポイント
 *
 * 仕入れ処理の管理API:
 * - 仕入れ待ち注文一覧
 * - 仕入れステータス更新
 * - 仕入れ統計
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'sourcing-api' });

// 仕入れステータスの定義
const SOURCING_STATUSES = ['PENDING', 'CONFIRMED', 'ORDERED', 'RECEIVED', 'UNAVAILABLE'] as const;
type SourcingStatus = typeof SOURCING_STATUSES[number];

// バリデーションスキーマ
const updateStatusSchema = z.object({
  status: z.enum(SOURCING_STATUSES),
  notes: z.string().optional(),
  costPrice: z.number().positive().optional(),
  supplierOrderId: z.string().optional(),
  expectedDeliveryDate: z.string().datetime().optional(),
});

/**
 * @swagger
 * /api/sourcing/pending:
 *   get:
 *     summary: 仕入れ待ち注文一覧を取得
 *     tags: [Sourcing]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, ORDERED, RECEIVED, UNAVAILABLE]
 *       - in: query
 *         name: marketplace
 *         schema:
 *           type: string
 *           enum: [JOOM, EBAY]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 仕入れ待ち注文一覧
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { status, marketplace, limit = '50' } = req.query;

    const where: any = {
      // 未発送の注文のみ
      fulfillmentStatus: 'UNFULFILLED',
      paymentStatus: 'PAID',
      status: { in: ['CONFIRMED', 'PROCESSING'] },
    };

    if (marketplace && ['JOOM', 'EBAY'].includes(marketplace as string)) {
      where.marketplace = marketplace;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        sales: true,
      },
      orderBy: { orderedAt: 'asc' },
      take: parseInt(limit as string, 10),
    });

    // 各SaleのproductIdからProduct情報を取得
    const productIds = orders
      .flatMap((o) => o.sales)
      .map((s) => s.productId)
      .filter((id): id is string => id !== null);

    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            title: true,
            titleEn: true,
            sourceUrl: true,
            price: true,
            images: true,
            brand: true,
            category: true,
          },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    // ordersにproduct情報を追加
    const ordersWithProducts = orders.map((order) => ({
      ...order,
      sales: order.sales.map((sale) => ({
        ...sale,
        product: sale.productId ? productMap.get(sale.productId) || null : null,
      })),
    }));

    // 仕入れステータス情報を追加
    const ordersWithSourcing = ordersWithProducts.map((order) => {
      const rawData = order.rawData as any || {};
      const sourcingStatus = rawData.sourcingStatus || 'PENDING';

      return {
        ...order,
        sourcingStatus,
        sourcingNotes: rawData.sourcingNotes || null,
        sourcingUpdatedAt: rawData.sourcingUpdatedAt || null,
        costPrice: rawData.costPrice || null,
        supplierOrderId: rawData.supplierOrderId || null,
        expectedDeliveryDate: rawData.expectedDeliveryDate || null,
      };
    });

    // ステータスでフィルター
    const filteredOrders = status
      ? ordersWithSourcing.filter((o) => o.sourcingStatus === status)
      : ordersWithSourcing;

    // ステータス別カウント
    const statusCounts = ordersWithSourcing.reduce((acc, order) => {
      acc[order.sourcingStatus] = (acc[order.sourcingStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: filteredOrders,
      total: filteredOrders.length,
      statusCounts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sourcing/{orderId}/status:
 *   patch:
 *     summary: 仕入れステータスを更新
 *     tags: [Sourcing]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, ORDERED, RECEIVED, UNAVAILABLE]
 *               notes:
 *                 type: string
 *               costPrice:
 *                 type: number
 *               supplierOrderId:
 *                 type: string
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: 仕入れステータスが更新されました
 */
router.patch('/:orderId/status', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const data = updateStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const rawData = order.rawData as any || {};

    // 注文データを更新
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        rawData: {
          ...rawData,
          sourcingStatus: data.status,
          sourcingNotes: data.notes || rawData.sourcingNotes,
          sourcingUpdatedAt: new Date().toISOString(),
          costPrice: data.costPrice || rawData.costPrice,
          supplierOrderId: data.supplierOrderId || rawData.supplierOrderId,
          expectedDeliveryDate: data.expectedDeliveryDate || rawData.expectedDeliveryDate,
        },
      },
      include: {
        sales: true,
      },
    });

    log.info({
      type: 'sourcing_status_updated',
      orderId,
      status: data.status,
      notes: data.notes,
    });

    // 仕入れ不可の場合は通知を作成
    if (data.status === 'UNAVAILABLE') {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: '仕入れ不可',
          message: `注文 ${order.marketplaceOrderId} の商品が仕入れ不可です。キャンセルを検討してください。`,
          severity: 'ERROR',
          metadata: {
            orderId,
            marketplaceOrderId: order.marketplaceOrderId,
            marketplace: order.marketplace,
            notes: data.notes,
          },
        },
      });
    }

    // 仕入れ完了（受領）の場合も通知
    if (data.status === 'RECEIVED') {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: '仕入れ完了',
          message: `注文 ${order.marketplaceOrderId} の商品が入荷しました。発送準備を行ってください。`,
          severity: 'SUCCESS',
          metadata: {
            orderId,
            marketplaceOrderId: order.marketplaceOrderId,
            marketplace: order.marketplace,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...updatedOrder,
        sourcingStatus: data.status,
        sourcingNotes: data.notes,
        sourcingUpdatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/sourcing/stats:
 *   get:
 *     summary: 仕入れ統計を取得
 *     tags: [Sourcing]
 *     responses:
 *       200:
 *         description: 仕入れ統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    // 未発送の注文を取得
    const orders = await prisma.order.findMany({
      where: {
        fulfillmentStatus: 'UNFULFILLED',
        paymentStatus: 'PAID',
        status: { in: ['CONFIRMED', 'PROCESSING'] },
      },
      select: {
        id: true,
        marketplace: true,
        rawData: true,
        total: true,
        currency: true,
      },
    });

    // ステータス別に集計
    const stats: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      ORDERED: 0,
      RECEIVED: 0,
      UNAVAILABLE: 0,
    };

    let totalCost = 0;
    let ordersWithCost = 0;

    orders.forEach((order) => {
      const rawData = order.rawData as any || {};
      const status = rawData.sourcingStatus || 'PENDING';
      stats[status] = (stats[status] || 0) + 1;

      if (rawData.costPrice) {
        totalCost += rawData.costPrice;
        ordersWithCost++;
      }
    });

    // マーケットプレイス別
    const byMarketplace = orders.reduce((acc, order) => {
      const rawData = order.rawData as any || {};
      const status = rawData.sourcingStatus || 'PENDING';
      if (!acc[order.marketplace]) {
        acc[order.marketplace] = { total: 0, byStatus: {} };
      }
      acc[order.marketplace].total++;
      acc[order.marketplace].byStatus[status] = (acc[order.marketplace].byStatus[status] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; byStatus: Record<string, number> }>);

    res.json({
      success: true,
      data: {
        total: orders.length,
        byStatus: stats,
        byMarketplace,
        costSummary: {
          totalCost,
          ordersWithCost,
          averageCost: ordersWithCost > 0 ? totalCost / ordersWithCost : 0,
        },
        readyToShip: stats.RECEIVED || 0,
        needsAttention: (stats.PENDING || 0) + (stats.UNAVAILABLE || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sourcing/bulk-update:
 *   post:
 *     summary: 複数注文の仕入れステータスを一括更新
 *     tags: [Sourcing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - status
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, ORDERED, RECEIVED, UNAVAILABLE]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 一括更新が完了しました
 */
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { orderIds, status, notes } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError(400, 'orderIds must be a non-empty array', 'VALIDATION_ERROR');
    }

    if (!SOURCING_STATUSES.includes(status)) {
      throw new AppError(400, `Invalid status: ${status}`, 'VALIDATION_ERROR');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const orderId of orderIds) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          results.failed++;
          results.errors.push(`Order not found: ${orderId}`);
          continue;
        }

        const rawData = order.rawData as any || {};

        await prisma.order.update({
          where: { id: orderId },
          data: {
            rawData: {
              ...rawData,
              sourcingStatus: status,
              sourcingNotes: notes || rawData.sourcingNotes,
              sourcingUpdatedAt: new Date().toISOString(),
            },
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to update ${orderId}: ${(error as Error).message}`);
      }
    }

    log.info({
      type: 'bulk_sourcing_update',
      status,
      success: results.success,
      failed: results.failed,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

export { router as sourcingRouter };

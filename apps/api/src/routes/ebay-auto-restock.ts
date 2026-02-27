// @ts-nocheck
/**
 * Phase 117: eBay在庫自動補充 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-auto-restock' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const createRuleSchema = z.object({
  name: z.string().min(1),
  productIds: z.array(z.string()).optional(), // 空なら全商品
  categoryIds: z.array(z.string()).optional(),
  lowStockThreshold: z.number().min(0),
  restockQuantity: z.number().min(1),
  supplierId: z.string().optional(),
  autoOrder: z.boolean().default(false),
  notifyEmail: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const updateRuleSchema = createRuleSchema.partial();

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      activeRules,
      lowStockCount,
      outOfStockCount,
      pendingOrders,
      recentRestocks,
      lowStockItems,
    ] = await Promise.all([
      // アクティブなルール数
      prisma.restockRule.count({ where: { isActive: true } }),
      // 低在庫数
      prisma.product.count({ where: { stockQuantity: { gt: 0, lte: 5 } } as any }),
      // 在庫切れ数
      prisma.product.count({ where: { stockQuantity: { lte: 0 } } as any }),
      // 発注待ち
      prisma.restockOrder.count({ where: { status: 'PENDING' } }),
      // 最近の補充
      prisma.restockLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          product: { select: { title: true, titleEn: true } },
        } as any,
      }),
      // 低在庫商品
      prisma.product.findMany({
        where: { stockQuantity: { lte: 5 } } as any,
        orderBy: { stockQuantity: 'asc' } as any,
        take: 10,
        include: {
          listings: { where: { marketplace: Marketplace.EBAY, status: 'ACTIVE' } },
        } as any,
      }),
    ]);

    res.json({
      summary: {
        activeRules,
        lowStockCount,
        outOfStockCount,
        pendingOrders,
      },
      recentRestocks: recentRestocks.map(r => ({
        id: r.id,
        productTitle: (r as any).product?.titleEn || (r as any).product?.title,
        previousStock: r.previousStock,
        addedStock: r.addedStock,
        newStock: r.newStock,
        source: r.source,
        createdAt: r.createdAt,
      })),
      lowStockItems: lowStockItems.map(p => ({
        id: p.id,
        title: p.titleEn || p.title,
        stockQuantity: (p as any).stockQuantity,
        hasActiveListing: (p as any).listings.length > 0,
        images: p.images,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ルール一覧
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.restockRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { logs: true } },
      } as any,
    });

    res.json({
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        lowStockThreshold: r.lowStockThreshold,
        restockQuantity: r.restockQuantity,
        supplierName: (r as any).supplier?.name,
        autoOrder: r.autoOrder,
        notifyEmail: r.notifyEmail,
        isActive: r.isActive,
        appliedCount: (r as any)._count?.logs,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'list_rules_error', error });
    res.status(500).json({ error: 'Failed to list rules' });
  }
});

// ルール作成
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const validation = createRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const rule = await prisma.restockRule.create({
      data: {
        ...validation.data,
        metadata: {
          productIds: validation.data.productIds || [],
          categoryIds: validation.data.categoryIds || [],
        },
      },
    });

    log.info({ type: 'rule_created', ruleId: rule.id });
    res.status(201).json({ message: 'Rule created', rule });
  } catch (error) {
    log.error({ type: 'create_rule_error', error });
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// ルール更新
router.patch('/rules/:id', async (req: Request, res: Response) => {
  try {
    const validation = updateRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const rule = await prisma.restockRule.update({
      where: { id: req.params.id },
      data: validation.data,
    });

    res.json({ message: 'Rule updated', rule });
  } catch (error) {
    log.error({ type: 'update_rule_error', error });
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// ルール削除
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    await prisma.restockRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    log.error({ type: 'delete_rule_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ルール有効/無効切替
router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const rule = await prisma.restockRule.findUnique({ where: { id: req.params.id } });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const updated = await prisma.restockRule.update({
      where: { id: req.params.id },
      data: { isActive: !rule.isActive },
    });

    res.json({ message: `Rule ${updated.isActive ? 'activated' : 'deactivated'}`, rule: updated });
  } catch (error) {
    log.error({ type: 'toggle_rule_error', error });
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// 低在庫アラート一覧
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { threshold = '5' } = req.query;

    const lowStockProducts = await prisma.product.findMany({
      where: { stockQuantity: { lte: parseInt(threshold as string, 10) } } as any,
      orderBy: { stockQuantity: 'asc' } as any,
      include: {
        listings: {
          where: { marketplace: Marketplace.EBAY },
          select: { id: true, status: true, listingPrice: true },
        },
      } as any,
    });

    res.json({
      alerts: lowStockProducts.map(p => ({
        id: p.id,
        title: p.titleEn || p.title,
        stockQuantity: (p as any).stockQuantity,
        image: p.images?.[0],
        ebayListings: (p as any).listings.filter((l: any) => l.status === 'ACTIVE').length,
        isOutOfStock: (p as any).stockQuantity <= 0,
        urgency: (p as any).stockQuantity <= 0 ? 'critical' : (p as any).stockQuantity <= 2 ? 'high' : 'medium',
      })),
      total: lowStockProducts.length,
    });
  } catch (error) {
    log.error({ type: 'alerts_error', error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// 手動補充
router.post('/restock', async (req: Request, res: Response) => {
  try {
    const { productId, quantity, source = 'manual', notes } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'productId and quantity required' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const previousStock = (product as any).stockQuantity;
    const newStock = previousStock + quantity;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock } as any,
      }),
      prisma.restockLog.create({
        data: {
          productId,
          previousStock,
          addedStock: quantity,
          newStock,
          source,
          metadata: notes ? { notes } : {},
        },
      }),
    ]);

    // 在庫が復活した場合、出品を再開
    if (previousStock <= 0 && newStock > 0) {
      await inventoryQueue.add('resume-listing', { productId }, { priority: 2 });
    }

    log.info({ type: 'manual_restock', productId, quantity, newStock });
    res.json({ message: 'Restocked', previousStock, addedStock: quantity, newStock });
  } catch (error) {
    log.error({ type: 'restock_error', error });
    res.status(500).json({ error: 'Failed to restock' });
  }
});

// 一括補充
router.post('/restock/bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }

    const results = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const previousStock = (product as any).stockQuantity;
      const newStock = previousStock + item.quantity;

      await prisma.$transaction([
        prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newStock } as any,
        }),
        prisma.restockLog.create({
          data: {
            productId: item.productId,
            previousStock,
            addedStock: item.quantity,
            newStock,
            source: 'bulk',
          },
        }),
      ]);

      if (previousStock <= 0 && newStock > 0) {
        await inventoryQueue.add('resume-listing', { productId: item.productId }, { priority: 2 });
      }

      results.push({ productId: item.productId, previousStock, newStock });
    }

    log.info({ type: 'bulk_restock', count: results.length });
    res.json({ message: 'Bulk restock completed', results });
  } catch (error) {
    log.error({ type: 'bulk_restock_error', error });
    res.status(500).json({ error: 'Failed to bulk restock' });
  }
});

// 発注作成
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const { productId, quantity, supplierId, notes } = req.body;

    const order = await prisma.restockOrder.create({
      data: {
        productId,
        quantity,
        supplierId,
        status: 'PENDING',
        metadata: notes ? { notes } : {},
      },
    });

    log.info({ type: 'order_created', orderId: order.id });
    res.status(201).json({ message: 'Order created', order });
  } catch (error) {
    log.error({ type: 'create_order_error', error });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 発注一覧
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const orders = await prisma.restockOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      include: {
        product: { select: { title: true, titleEn: true, images: true } },
        supplier: { select: { name: true } },
      },
    });

    res.json({
      orders: orders.map(o => ({
        id: o.id,
        productTitle: o.product?.titleEn || o.product?.title,
        productImage: o.product?.images?.[0],
        quantity: o.quantity,
        supplierName: o.supplier?.name,
        status: o.status,
        createdAt: o.createdAt,
        completedAt: o.completedAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'list_orders_error', error });
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// 発注完了（在庫に反映）
router.post('/orders/:id/complete', async (req: Request, res: Response) => {
  try {
    const order = await prisma.restockOrder.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not pending' });
    }

    const previousStock = (order as any).product?.stockQuantity || 0;
    const newStock = previousStock + order.quantity;

    await prisma.$transaction([
      prisma.restockOrder.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.product.update({
        where: { id: order.productId },
        data: { stockQuantity: newStock } as any,
      }),
      prisma.restockLog.create({
        data: {
          productId: order.productId,
          orderId: order.id,
          previousStock,
          addedStock: order.quantity,
          newStock,
          source: 'order',
        },
      }),
    ]);

    if (previousStock <= 0 && newStock > 0) {
      await inventoryQueue.add('resume-listing', { productId: order.productId }, { priority: 2 });
    }

    res.json({ message: 'Order completed', previousStock, newStock });
  } catch (error) {
    log.error({ type: 'complete_order_error', error });
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// 発注キャンセル
router.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    await prisma.restockOrder.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ message: 'Order cancelled' });
  } catch (error) {
    log.error({ type: 'cancel_order_error', error });
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// 補充履歴
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { days = '30', limit = '100' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const history = await prisma.restockLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      include: {
        product: { select: { title: true, titleEn: true, images: true } },
      } as any,
    });

    res.json({
      history: history.map(h => ({
        id: h.id,
        productId: h.productId,
        productTitle: (h as any).product?.titleEn || (h as any).product?.title,
        productImage: (h as any).product?.images?.[0],
        previousStock: h.previousStock,
        addedStock: h.addedStock,
        newStock: h.newStock,
        source: h.source,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'history_error', error });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// チェック実行（ルールに基づいて低在庫チェック）
router.post('/check', async (_req: Request, res: Response) => {
  try {
    await inventoryQueue.add('check-restock-rules', {}, { priority: 3 });
    res.json({ message: 'Restock check queued' });
  } catch (error) {
    log.error({ type: 'check_error', error });
    res.status(500).json({ error: 'Failed to queue check' });
  }
});

// 統計
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [restockCount, totalAdded, bySource] = await Promise.all([
      prisma.restockLog.count({ where: { createdAt: { gte: since } } }),
      prisma.restockLog.aggregate({
        _sum: { addedStock: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.restockLog.groupBy({
        by: ['source'],
        _count: true,
        _sum: { addedStock: true },
        where: { createdAt: { gte: since } },
      }),
    ]);

    res.json({
      stats: {
        restockCount,
        totalAdded: totalAdded._sum.addedStock || 0,
        bySource: bySource.map(s => ({
          source: s.source,
          count: s._count,
          totalAdded: s._sum.addedStock || 0,
        })),
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

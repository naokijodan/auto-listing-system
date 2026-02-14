/**
 * Phase 110: eBay返品・返金管理 API
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
const log = logger.child({ module: 'ebay-returns' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const returnQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const createReturnSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1),
  type: z.enum(['RETURN', 'REFUND_ONLY', 'PARTIAL_REFUND']),
  items: z.array(z.object({
    saleId: z.string(),
    quantity: z.number().int().positive(),
    refundAmount: z.number().optional(),
  })).optional(),
  refundAmount: z.number().optional(),
  notes: z.string().optional(),
});

const processReturnSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REFUND', 'CLOSE']),
  refundAmount: z.number().optional(),
  notes: z.string().optional(),
  syncToEbay: z.boolean().default(true),
});

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [total, pending, approved, refunded, rejected, recent] = await Promise.all([
      prisma.returnRequest.count({ where: { marketplace: Marketplace.EBAY } }),
      prisma.returnRequest.count({ where: { marketplace: Marketplace.EBAY, status: 'PENDING' } }),
      prisma.returnRequest.count({ where: { marketplace: Marketplace.EBAY, status: 'APPROVED' } }),
      prisma.returnRequest.count({ where: { marketplace: Marketplace.EBAY, status: 'REFUNDED' } }),
      prisma.returnRequest.count({ where: { marketplace: Marketplace.EBAY, status: 'REJECTED' } }),
      prisma.returnRequest.findMany({
        where: { marketplace: Marketplace.EBAY },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { order: { select: { marketplaceOrderId: true, buyerUsername: true } } },
      }),
    ]);

    res.json({
      summary: { total, pending, approved, refunded, rejected },
      recentReturns: recent.map(r => ({
        id: r.id,
        orderId: r.orderId,
        marketplaceOrderId: r.order?.marketplaceOrderId,
        buyerUsername: r.order?.buyerUsername,
        type: r.type,
        status: r.status,
        refundAmount: r.refundAmount,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// 一覧
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = { marketplace: Marketplace.EBAY };
    if (status) where.status = status;
    if (type) where.type = type;

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          order: { select: { marketplaceOrderId: true, buyerUsername: true, total: true } },
        },
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({ returns, total });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list returns' });
  }
});

// 詳細
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const returnReq = await prisma.returnRequest.findFirst({
      where: { id: req.params.id, marketplace: Marketplace.EBAY },
      include: {
        order: { include: { sales: true } },
      },
    });
    if (!returnReq) return res.status(404).json({ error: 'Return not found' });
    res.json(returnReq);
  } catch (error) {
    log.error({ type: 'get_error', error });
    res.status(500).json({ error: 'Failed to get return' });
  }
});

// 新規作成
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createReturnSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { orderId, reason, type, items, refundAmount, notes } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, marketplace: Marketplace.EBAY },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const returnReq = await prisma.returnRequest.create({
      data: {
        marketplace: Marketplace.EBAY,
        orderId,
        type,
        reason,
        status: 'PENDING',
        refundAmount: refundAmount || order.total,
        metadata: { items, notes },
      },
    });

    log.info({ type: 'return_created', returnId: returnReq.id, orderId });
    res.status(201).json({ message: 'Return request created', return: returnReq });
  } catch (error) {
    log.error({ type: 'create_error', error });
    res.status(500).json({ error: 'Failed to create return' });
  }
});

// 処理
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const validation = processReturnSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { action, refundAmount, notes, syncToEbay } = validation.data;
    const returnReq = await prisma.returnRequest.findFirst({
      where: { id: req.params.id, marketplace: Marketplace.EBAY },
      include: { order: true },
    });
    if (!returnReq) return res.status(404).json({ error: 'Return not found' });

    const statusMap: Record<string, string> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REFUND: 'REFUNDED',
      CLOSE: 'CLOSED',
    };

    const updateData: Record<string, unknown> = { status: statusMap[action] };
    if (refundAmount !== undefined) updateData.refundAmount = refundAmount;
    if (action === 'REFUND') updateData.refundedAt = new Date();

    const metadata = (returnReq.metadata as Record<string, unknown>) || {};
    if (notes) {
      const history = (metadata.history as Array<unknown>) || [];
      history.push({ action, notes, timestamp: new Date().toISOString() });
      updateData.metadata = { ...metadata, history };
    }

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // 返金時は注文ステータスも更新
    if (action === 'REFUND') {
      await prisma.order.update({
        where: { id: returnReq.orderId },
        data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
      });
    }

    // eBay同期
    if (syncToEbay && returnReq.order?.marketplaceOrderId) {
      await returnQueue.add('ebay-process-return', {
        returnId: req.params.id,
        action,
        refundAmount: updated.refundAmount,
      }, { priority: 1 });
    }

    log.info({ type: 'return_processed', returnId: req.params.id, action });
    res.json({ message: 'Return processed', return: updated });
  } catch (error) {
    log.error({ type: 'process_error', error });
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// 統計
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [total, refundTotal, byType, byStatus] = await Promise.all([
      prisma.returnRequest.count({
        where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } },
      }),
      prisma.returnRequest.aggregate({
        where: { marketplace: Marketplace.EBAY, status: 'REFUNDED', createdAt: { gte: since } },
        _sum: { refundAmount: true },
      }),
      prisma.returnRequest.groupBy({
        by: ['type'],
        where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.returnRequest.groupBy({
        by: ['status'],
        where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      summary: { total, totalRefunded: refundTotal._sum.refundAmount || 0 },
      byType: byType.reduce((acc, i) => ({ ...acc, [i.type]: i._count }), {}),
      byStatus: byStatus.reduce((acc, i) => ({ ...acc, [i.status]: i._count }), {}),
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

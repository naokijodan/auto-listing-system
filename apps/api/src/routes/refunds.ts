import { Router, Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'refunds-api' });

// 返金理由
type RefundReason =
  | 'OUT_OF_STOCK'
  | 'SHIPPING_ISSUE'
  | 'ITEM_DAMAGED'
  | 'BUYER_REQUEST'
  | 'ITEM_NOT_AS_DESCRIBED'
  | 'OTHER';

// 返金ポリシー
const REFUND_POLICY = {
  maxDaysAfterShipment: 30,
  maxDaysAfterDelivery: 14,
  autoApproveReasons: ['OUT_OF_STOCK', 'SHIPPING_ISSUE'] as RefundReason[],
};

/**
 * @swagger
 * /api/refunds:
 *   post:
 *     summary: 返金リクエストを送信
 *     tags: [Refunds]
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, saleId, reason, amount, description } = req.body;

    if (!orderId || !reason) {
      res.status(400).json({ error: 'orderId and reason are required' });
      return;
    }

    const validReasons: RefundReason[] = [
      'OUT_OF_STOCK',
      'SHIPPING_ISSUE',
      'ITEM_DAMAGED',
      'BUYER_REQUEST',
      'ITEM_NOT_AS_DESCRIBED',
      'OTHER',
    ];

    if (!validReasons.includes(reason)) {
      res.status(400).json({ error: 'Invalid reason', validReasons });
      return;
    }

    log.info({ type: 'refund_request', orderId, reason });

    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sales: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // 返金額を計算
    let refundAmount: number;
    if (amount !== undefined) {
      refundAmount = amount;
    } else if (saleId) {
      const sale = order.sales.find(s => s.id === saleId);
      refundAmount = sale ? (sale.unitPrice || 0) : 0;
    } else {
      refundAmount = order.total || 0;
    }

    // 自動承認判定
    const isAutoApprove = REFUND_POLICY.autoApproveReasons.includes(reason);

    // 返金リクエストを記録
    const refundRecord = await prisma.shadowLog.create({
      data: {
        service: 'refund-automation',
        operation: 'process_refund',
        input: {
          orderId,
          saleId,
          reason,
          requestedAmount: amount,
          description,
        },
        output: {
          status: isAutoApprove ? 'AUTO_APPROVED' : 'PENDING_REVIEW',
          amount: refundAmount,
          marketplace: order.marketplace,
        },
        decision: isAutoApprove ? 'AUTO_APPROVED' : 'PENDING_REVIEW',
        decisionReason: isAutoApprove ? 'Auto-approved based on reason' : 'Manual review required',
        isDryRun: false,
      },
    });

    if (isAutoApprove) {
      // ステータス更新（実際のマーケットプレイスAPI呼び出しは省略）
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' as OrderStatus },
      });

      log.info({ type: 'refund_auto_approved', orderId, amount: refundAmount });
    }

    res.json({
      requestId: refundRecord.id,
      orderId,
      status: isAutoApprove ? 'PROCESSED' : 'PENDING_REVIEW',
      amount: refundAmount,
      reason,
      autoApproved: isAutoApprove,
      message: isAutoApprove
        ? 'Refund processed automatically'
        : 'Refund request submitted for manual review',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/refunds/pending:
 *   get:
 *     summary: 保留中の返金リクエスト一覧
 *     tags: [Refunds]
 */
router.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.shadowLog.findMany({
      where: {
        service: 'refund-automation',
        decision: 'PENDING_REVIEW',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const refunds = logs.map(log => ({
      id: log.id,
      orderId: (log.input as any).orderId,
      reason: (log.input as any).reason,
      amount: (log.output as any).amount,
      createdAt: log.createdAt,
    }));

    res.json({ refunds, count: refunds.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/refunds/{refundId}/approve:
 *   post:
 *     summary: 返金を承認
 *     tags: [Refunds]
 */
router.post('/:refundId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refundId } = req.params;
    const { approvedBy } = req.body;

    if (!approvedBy) {
      res.status(400).json({ error: 'approvedBy is required' });
      return;
    }

    const record = await prisma.shadowLog.findUnique({
      where: { id: refundId },
    });

    if (!record || record.decision !== 'PENDING_REVIEW') {
      res.status(404).json({ error: 'Refund request not found or already processed' });
      return;
    }

    const input = record.input as any;
    const output = record.output as any;

    // 注文ステータスを更新
    await prisma.order.update({
      where: { id: input.orderId },
      data: { status: 'REFUNDED' as OrderStatus },
    });

    // ログを更新
    await prisma.shadowLog.update({
      where: { id: refundId },
      data: {
        decision: 'APPROVED',
        decisionReason: `Approved by ${approvedBy}`,
      },
    });

    log.info({ type: 'refund_manual_approved', refundId, approvedBy });

    res.json({
      requestId: refundId,
      orderId: input.orderId,
      status: 'PROCESSED',
      amount: output.amount,
      message: `Refund approved by ${approvedBy}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/refunds/stats:
 *   get:
 *     summary: 返金統計を取得
 *     tags: [Refunds]
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.shadowLog.findMany({
      where: {
        service: 'refund-automation',
        createdAt: { gte: since },
      },
    });

    const stats = {
      totalRefunds: 0,
      totalAmount: 0,
      byReason: {} as Record<string, { count: number; amount: number }>,
      autoApproved: 0,
      manualApproved: 0,
      pending: 0,
    };

    for (const log_ of logs) {
      const input = log_.input as any;
      const output = log_.output as any;
      const amount = output?.amount || 0;
      const reason = input?.reason || 'OTHER';

      if (log_.decision === 'AUTO_APPROVED' || log_.decision === 'APPROVED') {
        stats.totalRefunds++;
        stats.totalAmount += amount;

        if (!stats.byReason[reason]) {
          stats.byReason[reason] = { count: 0, amount: 0 };
        }
        stats.byReason[reason].count++;
        stats.byReason[reason].amount += amount;

        if (log_.decision === 'AUTO_APPROVED') {
          stats.autoApproved++;
        } else {
          stats.manualApproved++;
        }
      } else if (log_.decision === 'PENDING_REVIEW') {
        stats.pending++;
      }
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export { router as refundsRouter };

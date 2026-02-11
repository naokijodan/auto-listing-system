/**
 * Phase 52: 発送処理APIエンドポイント
 *
 * 発送処理の管理API:
 * - 発送処理（単一・一括）
 * - 未発送注文一覧
 * - 発送期限管理
 */

import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { AppError } from '../middleware/error-handler';
import { cacheMiddleware, cacheInvalidationMiddleware } from '../middleware/cache';

const router = Router();

// キャッシュ無効化ミドルウェア（発送処理時に統計キャッシュを無効化）
router.use(cacheInvalidationMiddleware(['shipment-stats*', 'pending-shipments*', 'order-stats*']));
const log = logger.child({ module: 'shipments-api' });

// Redis接続とキュー
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const shipmentQueue = new Queue(QUEUE_NAMES.SHIPMENT, { connection: redis });

// バリデーションスキーマ
const shipmentSchema = z.object({
  orderId: z.string(),
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1),
  shippedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const batchShipmentSchema = z.object({
  shipments: z.array(shipmentSchema).min(1).max(100),
});

/**
 * @swagger
 * /api/shipments:
 *   post:
 *     summary: 発送処理を実行
 *     tags: [Shipments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - trackingNumber
 *               - carrier
 *             properties:
 *               orderId:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               carrier:
 *                 type: string
 *               shippedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 発送処理がキューに追加されました
 */
router.post('/', async (req, res, next) => {
  try {
    const data = shipmentSchema.parse(req.body);

    // 注文の存在確認
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    // 既に発送済みの場合はエラー
    if (order.fulfillmentStatus === 'FULFILLED') {
      throw new AppError(400, 'Order already shipped', 'ALREADY_SHIPPED');
    }

    // 発送処理ジョブをキューに追加
    const job = await shipmentQueue.add(
      'process-shipment',
      {
        type: 'single',
        shipment: {
          orderId: data.orderId,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          shippedAt: data.shippedAt ? new Date(data.shippedAt) : undefined,
          notes: data.notes,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    log.info({
      type: 'shipment_job_queued',
      jobId: job.id,
      orderId: data.orderId,
    });

    res.json({
      success: true,
      message: 'Shipment processing queued',
      jobId: job.id,
      orderId: data.orderId,
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
 * /api/shipments/batch:
 *   post:
 *     summary: 一括発送処理を実行
 *     tags: [Shipments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipments
 *             properties:
 *               shipments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     trackingNumber:
 *                       type: string
 *                     carrier:
 *                       type: string
 *     responses:
 *       200:
 *         description: 一括発送処理がキューに追加されました
 */
router.post('/batch', async (req, res, next) => {
  try {
    const data = batchShipmentSchema.parse(req.body);

    // 注文の存在確認
    const orderIds = data.shipments.map((s) => s.orderId);
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
    });

    if (orders.length !== orderIds.length) {
      const foundIds = orders.map((o) => o.id);
      const missingIds = orderIds.filter((id) => !foundIds.includes(id));
      throw new AppError(404, `Orders not found: ${missingIds.join(', ')}`, 'NOT_FOUND');
    }

    // 発送処理ジョブをキューに追加
    const job = await shipmentQueue.add(
      'batch-shipment',
      {
        type: 'batch',
        shipments: data.shipments.map((s) => ({
          orderId: s.orderId,
          trackingNumber: s.trackingNumber,
          carrier: s.carrier,
          shippedAt: s.shippedAt ? new Date(s.shippedAt) : undefined,
          notes: s.notes,
        })),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    log.info({
      type: 'batch_shipment_job_queued',
      jobId: job.id,
      count: data.shipments.length,
    });

    res.json({
      success: true,
      message: 'Batch shipment processing queued',
      jobId: job.id,
      count: data.shipments.length,
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
 * /api/shipments/pending:
 *   get:
 *     summary: 未発送注文一覧を取得
 *     tags: [Shipments]
 *     parameters:
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
 *       - in: query
 *         name: urgentOnly
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: 未発送注文一覧
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { marketplace, limit = '50', urgentOnly = 'false' } = req.query;

    const where: any = {
      status: {
        in: ['CONFIRMED', 'PROCESSING'],
      },
      fulfillmentStatus: 'UNFULFILLED',
      paymentStatus: 'PAID',
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

    // 発送期限情報を追加
    const ordersWithDeadline = orders.map((order) => {
      const rawData = order.rawData as any;
      const deadline = rawData?.shipmentDeadline
        ? new Date(rawData.shipmentDeadline)
        : null;
      const hoursRemaining = deadline
        ? Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))
        : null;

      return {
        ...order,
        shipmentDeadline: deadline,
        hoursRemaining,
        isUrgent: hoursRemaining !== null && hoursRemaining <= 24,
      };
    });

    // 緊急のみフィルター
    const filteredOrders = urgentOnly === 'true'
      ? ordersWithDeadline.filter((o) => o.isUrgent)
      : ordersWithDeadline;

    res.json({
      success: true,
      data: filteredOrders,
      total: filteredOrders.length,
      urgentCount: filteredOrders.filter((o) => o.isUrgent).length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shipments/carriers:
 *   get:
 *     summary: 配送業者一覧を取得
 *     tags: [Shipments]
 *     responses:
 *       200:
 *         description: 配送業者一覧
 */
router.get('/carriers', async (_req, res) => {
  const carriers = [
    { id: 'yamato', name: 'Yamato Transport', nameJa: 'ヤマト運輸' },
    { id: 'sagawa', name: 'Sagawa Express', nameJa: '佐川急便' },
    { id: 'japan_post', name: 'Japan Post', nameJa: '日本郵便' },
    { id: 'fedex', name: 'FedEx', nameJa: 'FedEx' },
    { id: 'dhl', name: 'DHL', nameJa: 'DHL' },
    { id: 'ups', name: 'UPS', nameJa: 'UPS' },
    { id: 'ems', name: 'EMS', nameJa: 'EMS（国際スピード郵便）' },
  ];

  res.json({
    success: true,
    data: carriers,
  });
});

/**
 * @swagger
 * /api/shipments/{orderId}/extend-deadline:
 *   post:
 *     summary: 発送期限を延長
 *     tags: [Shipments]
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
 *               - newDeadline
 *               - reason
 *             properties:
 *               newDeadline:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 発送期限が延長されました
 */
router.post('/:orderId/extend-deadline', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { newDeadline, reason } = req.body;

    if (!newDeadline || !reason) {
      throw new AppError(400, 'newDeadline and reason are required', 'VALIDATION_ERROR');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    // 注文データを更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        rawData: {
          ...(order.rawData as object || {}),
          shipmentDeadline: new Date(newDeadline).toISOString(),
          deadlineExtendedAt: new Date().toISOString(),
          deadlineExtendReason: reason,
        },
      },
    });

    log.info({
      type: 'shipment_deadline_extended',
      orderId,
      newDeadline,
      reason,
    });

    res.json({
      success: true,
      message: 'Shipment deadline extended',
      orderId,
      newDeadline,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shipments/stats:
 *   get:
 *     summary: 発送統計を取得
 *     tags: [Shipments]
 *     responses:
 *       200:
 *         description: 発送統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingCount,
      urgentCount,
      shippedTodayCount,
      totalShippedCount,
    ] = await Promise.all([
      // 未発送件数
      prisma.order.count({
        where: {
          fulfillmentStatus: 'UNFULFILLED',
          paymentStatus: 'PAID',
          status: { in: ['CONFIRMED', 'PROCESSING'] },
        },
      }),
      // 緊急（24時間以内）の未発送件数（概算）
      prisma.order.count({
        where: {
          fulfillmentStatus: 'UNFULFILLED',
          paymentStatus: 'PAID',
          status: { in: ['CONFIRMED', 'PROCESSING'] },
          orderedAt: {
            lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日以上前の注文
          },
        },
      }),
      // 今日発送した件数
      prisma.order.count({
        where: {
          fulfillmentStatus: 'FULFILLED',
          shippedAt: { gte: today },
        },
      }),
      // 総発送件数
      prisma.order.count({
        where: {
          fulfillmentStatus: 'FULFILLED',
        },
      }),
    ]);

    // マーケットプレイス別の未発送件数
    const pendingByMarketplace = await prisma.order.groupBy({
      by: ['marketplace'],
      where: {
        fulfillmentStatus: 'UNFULFILLED',
        paymentStatus: 'PAID',
        status: { in: ['CONFIRMED', 'PROCESSING'] },
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        pending: pendingCount,
        urgent: urgentCount,
        shippedToday: shippedTodayCount,
        totalShipped: totalShippedCount,
        byMarketplace: pendingByMarketplace.reduce((acc, item) => {
          acc[item.marketplace] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as shipmentsRouter };

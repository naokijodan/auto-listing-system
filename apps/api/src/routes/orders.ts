import { Router } from 'express';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { EXCHANGE_RATE_DEFAULTS, QUEUE_NAMES } from '@rakuda/config';
import { AppError } from '../middleware/error-handler';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

const router = Router();
const log = logger.child({ module: 'orders' });

/**
 * 注文一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      marketplace,
      status,
      paymentStatus,
      fulfillmentStatus,
      search,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      sortBy = 'orderedAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    if (marketplace) {
      where.marketplace = marketplace;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (fulfillmentStatus) {
      where.fulfillmentStatus = fulfillmentStatus;
    }

    if (search) {
      where.OR = [
        { marketplaceOrderId: { contains: search as string, mode: 'insensitive' } },
        { buyerUsername: { contains: search as string, mode: 'insensitive' } },
        { buyerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) {
        where.orderedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.orderedAt.lte = new Date(endDate as string);
      }
    }

    const orderByField = ['orderedAt', 'total', 'createdAt', 'status'].includes(sortBy as string)
      ? sortBy as string
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
        take: Number(limit),
        skip: Number(offset),
        orderBy: { [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
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
 * 要対応注文一覧（処理待ち）
 * IMPORTANT: This route must come before /:id to avoid being matched as an ID
 */
router.get('/action-required', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'PENDING', paymentStatus: 'PAID' },
          { status: 'CONFIRMED' },
          { status: 'PROCESSING', fulfillmentStatus: 'UNFULFILLED' },
        ],
      },
      include: {
        sales: {
          select: {
            id: true,
            sku: true,
            title: true,
            quantity: true,
          },
        },
      },
      orderBy: { orderedAt: 'asc' },
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 注文統計取得
 * IMPORTANT: This route must come before /:id to avoid being matched as an ID
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { marketplace, startDate, endDate } = req.query;

    const where: any = {};
    if (marketplace) {
      where.marketplace = marketplace;
    }
    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) {
        where.orderedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.orderedAt.lte = new Date(endDate as string);
      }
    }

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenue,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.order.count({ where: { ...where, status: 'SHIPPED' } }),
      prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    // 売上明細から利益を計算
    const salesStats = await prisma.sale.aggregate({
      where: {
        order: where,
      },
      _sum: {
        totalPrice: true,
        costPrice: true,
        profitJpy: true,
      },
    });

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        revenue: {
          total: revenue._sum.total || 0,
          currency: 'USD',
        },
        profit: {
          totalSales: salesStats._sum.totalPrice || 0,
          totalCost: salesStats._sum.costPrice || 0,
          totalProfit: salesStats._sum.profitJpy || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 日別売上集計
 */
router.get('/stats/daily', async (req, res, next) => {
  try {
    const { marketplace, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where: any = {
      orderedAt: { gte: startDate },
      paymentStatus: 'PAID',
    };
    if (marketplace) {
      where.marketplace = marketplace;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        orderedAt: true,
        total: true,
        marketplace: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    // 日別に集計
    const dailyStats: Record<string, { date: string; total: number; count: number }> = {};

    for (const order of orders) {
      const dateKey = order.orderedAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { date: dateKey, total: 0, count: 0 };
      }
      dailyStats[dateKey].total += order.total;
      dailyStats[dateKey].count += 1;
    }

    res.json({
      success: true,
      data: Object.values(dailyStats),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス別売上集計
 */
router.get('/stats/by-marketplace', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { paymentStatus: 'PAID' };
    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) {
        where.orderedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.orderedAt.lte = new Date(endDate as string);
      }
    }

    const stats = await prisma.order.groupBy({
      by: ['marketplace'],
      where,
      _count: { id: true },
      _sum: { total: true },
    });

    const result = stats.map((s) => ({
      marketplace: s.marketplace,
      orderCount: s._count.id,
      revenue: s._sum.total || 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 売上明細の利益更新
 * IMPORTANT: This route must come before /:orderId/sales to avoid path conflicts
 */
router.patch('/sales/:saleId', async (req, res, next) => {
  try {
    const { costPrice } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id: req.params.saleId },
    });

    if (!sale) {
      throw new AppError(404, 'Sale not found', 'NOT_FOUND');
    }

    // 利益を計算（データベースから最新の為替レートを取得）
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = latestRate ? (1 / latestRate.rate) : DEFAULT_USD_TO_JPY;
    const costPriceUsd = costPrice ? costPrice / exchangeRate : null;
    const profitUsd = costPriceUsd ? sale.totalPrice - costPriceUsd : null;
    const profitJpy = profitUsd ? profitUsd * exchangeRate : null;
    const profitRate = costPrice && profitJpy ? (profitJpy / costPrice) * 100 : null;

    const updatedSale = await prisma.sale.update({
      where: { id: req.params.saleId },
      data: {
        costPrice,
        profitJpy,
        profitRate,
      },
    });

    res.json({
      success: true,
      data: updatedSale,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 注文詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        sales: {
          include: {
            // Note: These relations may not exist in the current schema
            // but we include them for future compatibility
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出荷情報更新
 */
router.patch('/:id/shipping', async (req, res, next) => {
  try {
    const { trackingNumber, trackingCarrier, syncToMarketplace = true } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        trackingNumber,
        trackingCarrier,
        shippedAt: new Date(),
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
      },
    });

    // マーケットプレイスへの出荷通知（Joom/eBay）
    let marketplaceSynced = false;
    let marketplaceError: string | undefined;

    if (syncToMarketplace && (order.marketplace === 'JOOM' || order.marketplace === 'EBAY') && order.marketplaceOrderId) {
      try {
        // マーケットプレイスAPIに出荷通知をジョブとして追加
        await inventoryQueue.add('ship-to-marketplace', {
          orderId: order.id,
          marketplaceOrderId: order.marketplaceOrderId,
          marketplace: order.marketplace,
          trackingNumber,
          trackingCarrier,
        }, {
          priority: 1,
          attempts: 3,
        });
        marketplaceSynced = true;
        log.info({
          orderId: order.id,
          marketplace: order.marketplace,
        }, 'Shipment sync queued');
      } catch (syncError: any) {
        marketplaceError = syncError.message;
        log.error({
          orderId: order.id,
          marketplace: order.marketplace,
          error: syncError.message,
        }, 'Failed to queue shipment sync');
      }
    }

    // 通知を作成
    await prisma.notification.create({
      data: {
        type: 'ORDER_SHIPPED',
        title: '出荷完了',
        message: `注文 ${order.marketplaceOrderId} を出荷しました（追跡番号: ${trackingNumber}）${marketplaceSynced ? ' - マーケットプレイスに同期中' : ''}`,
        severity: 'SUCCESS',
        metadata: {
          orderId: order.id,
          trackingNumber,
          trackingCarrier,
          marketplaceSynced,
          marketplaceError,
        },
      },
    });

    log.info({
      orderId: order.id,
      trackingNumber,
      trackingCarrier,
      marketplaceSynced,
    }, 'Order shipped');

    res.json({
      success: true,
      data: {
        ...updatedOrder,
        marketplaceSynced,
        marketplaceError,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 注文ステータス更新
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, paymentStatus, fulfillmentStatus } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (fulfillmentStatus) updateData.fulfillmentStatus = fulfillmentStatus;

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
    });

    log.info({
      orderId: order.id,
      status,
      paymentStatus,
      fulfillmentStatus,
    }, 'Order status updated');

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 売上明細一覧取得
 */
router.get('/:orderId/sales', async (req, res, next) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { orderId: req.params.orderId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    next(error);
  }
});

// Redis接続（注文同期用）
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

/**
 * マーケットプレイスから注文を同期
 */
router.post('/sync', async (req, res, next) => {
  try {
    const {
      marketplace = 'joom',
      sinceDays = 7,
      maxOrders = 100,
    } = req.body;

    // ジョブを追加
    const job = await inventoryQueue.add('order-sync', {
      marketplace,
      sinceDays,
      maxOrders,
    }, {
      priority: 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });

    log.info({
      type: 'order_sync_queued',
      jobId: job.id,
      marketplace,
      sinceDays,
    });

    res.status(202).json({
      success: true,
      message: 'Order sync job queued',
      data: {
        jobId: job.id,
        marketplace,
        sinceDays,
        maxOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 注文同期ステータス取得
 */
router.get('/sync/status', async (req, res, next) => {
  try {
    // 最近のジョブログ
    const recentJobs = await prisma.jobLog.findMany({
      where: {
        jobType: 'ORDER_SYNC',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // キュー状態
    const [waiting, active, completed, failed] = await Promise.all([
      inventoryQueue.getWaitingCount(),
      inventoryQueue.getActiveCount(),
      inventoryQueue.getCompletedCount(),
      inventoryQueue.getFailedCount(),
    ]);

    // 24時間の同期統計
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const syncStats = await prisma.order.aggregate({
      where: {
        createdAt: { gte: oneDayAgo },
      },
      _count: true,
    });

    res.json({
      success: true,
      queue: {
        waiting,
        active,
        completed,
        failed,
      },
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        jobId: job.jobId,
        status: job.status,
        result: job.result,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      })),
      stats24h: {
        newOrders: syncStats._count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as ordersRouter };

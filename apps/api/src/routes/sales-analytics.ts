import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'sales-analytics' });

/**
 * 売上サマリー取得
 */
router.get('/summary', async (req, res, next) => {
  try {
    const {
      periodType = 'DAILY',
      startDate,
      endDate,
      marketplace,
      category,
    } = req.query;

    // デフォルト期間: 過去7日
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      periodType,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    };

    if (marketplace) where.marketplace = marketplace;
    if (category) where.category = category;

    const summaries = await prisma.salesSummary.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });

    // 集計
    const totals = summaries.reduce(
      (acc, s) => {
        acc.orderCount += s.orderCount;
        acc.itemCount += s.itemCount;
        acc.grossRevenue += s.grossRevenue;
        acc.netRevenue += s.netRevenue;
        acc.feeTotal += s.feeTotal;
        if (s.costTotal) acc.costTotal += s.costTotal;
        if (s.profitTotal) acc.profitTotal += s.profitTotal;
        return acc;
      },
      {
        orderCount: 0,
        itemCount: 0,
        grossRevenue: 0,
        netRevenue: 0,
        feeTotal: 0,
        costTotal: 0,
        profitTotal: 0,
      }
    );

    const profitRate = totals.costTotal > 0
      ? ((totals.profitTotal / totals.costTotal) * 100).toFixed(2)
      : null;

    res.json({
      success: true,
      data: {
        period: { start, end, type: periodType },
        totals: {
          ...totals,
          profitRate: profitRate ? `${profitRate}%` : null,
        },
        summaries,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リアルタイム今日の売上
 */
router.get('/today', async (req, res, next) => {
  try {
    const { marketplace } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orderWhere: any = {
      orderedAt: { gte: today, lt: tomorrow },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    };

    if (marketplace) orderWhere.marketplace = marketplace;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        sales: true,
      },
    });

    let orderCount = orders.length;
    let itemCount = 0;
    let grossRevenue = 0;
    let feeTotal = 0;

    for (const order of orders) {
      grossRevenue += order.subtotal;
      feeTotal += order.marketplaceFee + order.paymentFee;

      for (const sale of order.sales) {
        itemCount += sale.quantity;
      }
    }

    // 昨日との比較
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayOrders = await prisma.order.count({
      where: {
        orderedAt: { gte: yesterday, lt: today },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        ...(marketplace ? { marketplace: marketplace as any } : {}),
      },
    });

    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        orderCount,
        itemCount,
        grossRevenue,
        netRevenue: grossRevenue - feeTotal,
        comparison: {
          yesterdayOrders,
          change: yesterdayOrders > 0
            ? ((orderCount - yesterdayOrders) / yesterdayOrders * 100).toFixed(1)
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 売上トレンド（グラフ用）
 */
router.get('/trends', async (req, res, next) => {
  try {
    const {
      days = '30',
      marketplace,
      groupBy = 'day',
    } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const periodType = groupBy === 'week' ? 'WEEKLY' : 'DAILY';

    const where: any = {
      periodType,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
      category: null, // 全カテゴリ
    };

    if (marketplace) {
      where.marketplace = marketplace;
    } else {
      where.marketplace = null; // 全マーケットプレイス
    }

    const summaries = await prisma.salesSummary.findMany({
      where,
      orderBy: { periodStart: 'asc' },
    });

    const trends = summaries.map(s => ({
      date: s.periodStart.toISOString().split('T')[0],
      orderCount: s.orderCount,
      itemCount: s.itemCount,
      revenue: s.grossRevenue,
      netRevenue: s.netRevenue,
    }));

    res.json({
      success: true,
      data: {
        period: { days: Number(days), groupBy },
        trends,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ベストセラー商品
 */
router.get('/bestsellers', async (req, res, next) => {
  try {
    const {
      days = '30',
      marketplace,
      limit = '10',
      sortBy = 'revenue', // revenue | quantity
    } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const orderWhere: any = {
      orderedAt: { gte: startDate, lt: endDate },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    };

    if (marketplace) orderWhere.marketplace = marketplace;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        sales: {
          include: {
            listing: {
              include: {
                product: { select: { id: true, title: true, category: true, images: true } },
              },
            },
          },
        },
      },
    });

    const productSales: Record<string, {
      productId: string;
      title: string;
      category: string | null;
      image: string | null;
      quantity: number;
      revenue: number;
      orderCount: number;
    }> = {};

    for (const order of orders) {
      for (const sale of order.sales) {
        const productId = sale.productId || sale.sku;
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            title: sale.listing?.product?.title || sale.title,
            category: sale.listing?.product?.category || null,
            image: sale.listing?.product?.images?.[0] || null,
            quantity: 0,
            revenue: 0,
            orderCount: 0,
          };
        }
        productSales[productId].quantity += sale.quantity;
        productSales[productId].revenue += sale.totalPrice;
        productSales[productId].orderCount++;
      }
    }

    const bestsellers = Object.values(productSales)
      .sort((a, b) => sortBy === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate, endDate },
        sortBy,
        bestsellers,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス別サマリー
 */
router.get('/by-marketplace', async (req, res, next) => {
  try {
    const { days = '30' } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [joomOrders, ebayOrders] = await Promise.all([
      prisma.order.aggregate({
        where: {
          marketplace: 'JOOM',
          orderedAt: { gte: startDate, lt: endDate },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _count: true,
        _sum: { subtotal: true, shippingCost: true, marketplaceFee: true },
      }),
      prisma.order.aggregate({
        where: {
          marketplace: 'EBAY',
          orderedAt: { gte: startDate, lt: endDate },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _count: true,
        _sum: { subtotal: true, shippingCost: true, marketplaceFee: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate, endDate },
        marketplaces: {
          JOOM: {
            orderCount: joomOrders._count,
            revenue: joomOrders._sum.subtotal || 0,
            shipping: joomOrders._sum.shippingCost || 0,
            fees: joomOrders._sum.marketplaceFee || 0,
          },
          EBAY: {
            orderCount: ebayOrders._count,
            revenue: ebayOrders._sum.subtotal || 0,
            shipping: ebayOrders._sum.shippingCost || 0,
            fees: ebayOrders._sum.marketplaceFee || 0,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリ別サマリー
 */
router.get('/by-category', async (req, res, next) => {
  try {
    const { days = '30', marketplace } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const orderWhere: any = {
      orderedAt: { gte: startDate, lt: endDate },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    };

    if (marketplace) orderWhere.marketplace = marketplace;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        sales: {
          include: {
            listing: {
              include: {
                product: { select: { category: true } },
              },
            },
          },
        },
      },
    });

    const categorySales: Record<string, {
      category: string;
      quantity: number;
      revenue: number;
      orderCount: number;
    }> = {};

    for (const order of orders) {
      for (const sale of order.sales) {
        const category = sale.listing?.product?.category || 'その他';
        if (!categorySales[category]) {
          categorySales[category] = {
            category,
            quantity: 0,
            revenue: 0,
            orderCount: 0,
          };
        }
        categorySales[category].quantity += sale.quantity;
        categorySales[category].revenue += sale.totalPrice;
        categorySales[category].orderCount++;
      }
    }

    const categories = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate, endDate },
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * サマリー計算をトリガー
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { date, periodType = 'DAILY', marketplace } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setDate(targetDate.getDate() - 1); // デフォルトは昨日

    let periodStart: Date;
    let periodEnd: Date;

    if (periodType === 'DAILY') {
      periodStart = new Date(targetDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (periodType === 'WEEKLY') {
      periodStart = new Date(targetDate);
      const dayOfWeek = periodStart.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart.setDate(periodStart.getDate() - diff);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      periodEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
    }

    // 注文集計（簡易版）
    const orderWhere: any = {
      orderedAt: { gte: periodStart, lt: periodEnd },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    };

    if (marketplace) orderWhere.marketplace = marketplace;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: { sales: true },
    });

    let orderCount = orders.length;
    let itemCount = 0;
    let grossRevenue = 0;
    let feeTotal = 0;

    for (const order of orders) {
      grossRevenue += order.subtotal;
      feeTotal += order.marketplaceFee + order.paymentFee;
      for (const sale of order.sales) {
        itemCount += sale.quantity;
      }
    }

    const uniqueKey = {
      periodType: periodType as any,
      periodStart,
      marketplace: (marketplace as 'JOOM' | 'EBAY') || null,
      category: null,
    };

    const summary = await prisma.salesSummary.upsert({
      where: {
        periodType_periodStart_marketplace_category: uniqueKey as any,
      },
      update: {
        periodEnd,
        orderCount,
        itemCount,
        grossRevenue,
        feeTotal,
        netRevenue: grossRevenue - feeTotal,
        calculatedAt: new Date(),
        isComplete: true,
      },
      create: {
        periodType: periodType as any,
        periodStart,
        periodEnd,
        marketplace: marketplace || null,
        orderCount,
        itemCount,
        grossRevenue,
        feeTotal,
        netRevenue: grossRevenue - feeTotal,
        calculatedAt: new Date(),
        isComplete: true,
      },
    });

    log.info({ periodType, periodStart, marketplace, orderCount }, 'Sales summary calculated');

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

export { router as salesAnalyticsRouter };

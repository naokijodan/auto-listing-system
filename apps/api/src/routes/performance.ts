import { Router, Request, Response, NextFunction } from 'express';
import { prisma, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'performance-api' });

/**
 * @swagger
 * /api/performance/overview:
 *   get:
 *     summary: パフォーマンス概要を取得
 *     tags: [Performance]
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 注文統計
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since } },
      include: { sales: true },
    });

    // 売上計算
    let totalRevenue = 0;
    let totalCost = 0;
    let totalOrders = orders.length;
    let totalItems = 0;

    for (const order of orders) {
      totalRevenue += order.total || 0;
      for (const sale of order.sales) {
        totalCost += sale.costPrice || 0;
        totalItems++;
      }
    }

    const totalProfit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // 出品統計
    const activeListings = await prisma.listing.count({
      where: { status: 'ACTIVE' },
    });

    const pendingListings = await prisma.listing.count({
      where: { status: 'PENDING_PUBLISH' },
    });

    // 日次データ
    const dailyStats = await calculateDailyStats(since, days);

    res.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        profitRate: Math.round(profitRate * 10) / 10,
        totalOrders,
        totalItems,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0,
      },
      listings: {
        active: activeListings,
        pending: pendingListings,
      },
      dailyStats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 日次統計を計算
 */
async function calculateDailyStats(since: Date, days: number): Promise<Array<{
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}>> {
  const stats: Array<{ date: string; revenue: number; orders: number; profit: number }> = [];

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const dayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      include: { sales: true },
    });

    let revenue = 0;
    let cost = 0;
    for (const order of dayOrders) {
      revenue += order.total || 0;
      for (const sale of order.sales) {
        cost += sale.costPrice || 0;
      }
    }

    stats.push({
      date: dayStart.toISOString().split('T')[0],
      revenue: Math.round(revenue * 100) / 100,
      orders: dayOrders.length,
      profit: Math.round((revenue - cost) * 100) / 100,
    });
  }

  return stats;
}

/**
 * @swagger
 * /api/performance/marketplace:
 *   get:
 *     summary: マーケットプレイス別パフォーマンス
 *     tags: [Performance]
 */
router.get('/marketplace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const marketplaces: Marketplace[] = ['JOOM', 'EBAY'];
    const results: Record<string, any> = {};

    for (const mp of marketplaces) {
      const orders = await prisma.order.findMany({
        where: {
          marketplace: mp,
          createdAt: { gte: since },
        },
        include: { sales: true },
      });

      let revenue = 0;
      let cost = 0;
      for (const order of orders) {
        revenue += order.total || 0;
        for (const sale of order.sales) {
          cost += sale.costPrice || 0;
        }
      }

      const activeListings = await prisma.listing.count({
        where: { marketplace: mp, status: 'ACTIVE' },
      });

      results[mp] = {
        orders: orders.length,
        revenue: Math.round(revenue * 100) / 100,
        profit: Math.round((revenue - cost) * 100) / 100,
        profitRate: revenue > 0 ? Math.round((revenue - cost) / revenue * 1000) / 10 : 0,
        activeListings,
        averageOrderValue: orders.length > 0 ? Math.round(revenue / orders.length * 100) / 100 : 0,
      };
    }

    res.json({ period: { days }, marketplaces: results });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/performance/top-products:
 *   get:
 *     summary: トップ商品を取得
 *     tags: [Performance]
 */
router.get('/top-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 売上データを集計
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: since },
        productId: { not: null },
      },
    });

    // 商品別に集計
    const productStats: Record<string, {
      id: string;
      title: string;
      quantity: number;
      revenue: number;
      profit: number;
    }> = {};

    for (const sale of sales) {
      if (!sale.productId) continue;
      const pid = sale.productId;

      if (!productStats[pid]) {
        productStats[pid] = {
          id: pid,
          title: sale.title,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }

      productStats[pid].quantity += sale.quantity || 1;
      productStats[pid].revenue += sale.unitPrice || 0;
      productStats[pid].profit += (sale.unitPrice || 0) - (sale.costPrice || 0);
    }

    // 売上順にソート
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        profit: Math.round(p.profit * 100) / 100,
        profitRate: p.revenue > 0 ? Math.round(p.profit / p.revenue * 1000) / 10 : 0,
      }));

    res.json({ period: { days }, topProducts });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/performance/forecast:
 *   get:
 *     summary: 売上予測を取得
 *     tags: [Performance]
 */
router.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baseDays = parseInt(req.query.baseDays as string) || 30;
    const forecastDays = parseInt(req.query.forecastDays as string) || 7;
    const since = new Date(Date.now() - baseDays * 24 * 60 * 60 * 1000);

    // 過去データを取得
    const historicalStats = await calculateDailyStats(since, baseDays);

    // 移動平均を計算
    const recentDays = Math.min(7, baseDays);
    const recentStats = historicalStats.slice(-recentDays);

    const avgRevenue = recentStats.reduce((sum, s) => sum + s.revenue, 0) / recentDays;
    const avgOrders = recentStats.reduce((sum, s) => sum + s.orders, 0) / recentDays;
    const avgProfit = recentStats.reduce((sum, s) => sum + s.profit, 0) / recentDays;

    // トレンドを計算（単純線形回帰）
    const trend = calculateTrend(recentStats.map(s => s.revenue));

    // 予測を生成
    const forecast: Array<{
      date: string;
      predictedRevenue: number;
      predictedOrders: number;
      predictedProfit: number;
      confidence: number;
    }> = [];

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();

      // 曜日別調整（週末は売上が上がる傾向）
      let weekdayMultiplier = 1;
      if (dayOfWeek === 0 || dayOfWeek === 6) weekdayMultiplier = 1.2;

      const predictedRevenue = Math.max(0, (avgRevenue + trend * i) * weekdayMultiplier);
      const confidence = Math.max(50, 95 - i * 5); // 日が経つほど信頼度低下

      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        predictedOrders: Math.round(avgOrders * weekdayMultiplier),
        predictedProfit: Math.round(avgProfit * weekdayMultiplier * 100) / 100,
        confidence,
      });
    }

    // 予測サマリー
    const totalPredictedRevenue = forecast.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const totalPredictedProfit = forecast.reduce((sum, f) => sum + f.predictedProfit, 0);

    res.json({
      basePeriod: { days: baseDays, avgRevenue, avgOrders, avgProfit },
      trend: trend > 0 ? 'GROWING' : trend < 0 ? 'DECLINING' : 'STABLE',
      trendValue: Math.round(trend * 100) / 100,
      forecast,
      summary: {
        totalPredictedRevenue: Math.round(totalPredictedRevenue * 100) / 100,
        totalPredictedProfit: Math.round(totalPredictedProfit * 100) / 100,
        averageConfidence: Math.round(forecast.reduce((s, f) => s + f.confidence, 0) / forecastDays),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 線形トレンドを計算
 */
function calculateTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return isFinite(slope) ? slope : 0;
}

/**
 * @swagger
 * /api/performance/alerts:
 *   get:
 *     summary: パフォーマンスアラートを取得
 *     tags: [Performance]
 */
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts: Array<{
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      message: string;
      data: any;
    }> = [];

    // 低利益率アラート
    const lowProfitListings = await prisma.listing.count({
      where: {
        status: 'ACTIVE',
        listingPrice: { lt: 10 },
      },
    });

    if (lowProfitListings > 0) {
      alerts.push({
        type: 'LOW_PRICE_LISTINGS',
        severity: 'MEDIUM',
        message: `${lowProfitListings} listings have very low prices (<$10)`,
        data: { count: lowProfitListings },
      });
    }

    // 保留中注文アラート
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' },
    });

    if (pendingOrders > 10) {
      alerts.push({
        type: 'PENDING_ORDERS',
        severity: 'HIGH',
        message: `${pendingOrders} orders are pending and need attention`,
        data: { count: pendingOrders },
      });
    }

    // 在庫切れアラート
    const pausedListings = await prisma.listing.count({
      where: { status: 'PAUSED' },
    });

    if (pausedListings > 20) {
      alerts.push({
        type: 'PAUSED_LISTINGS',
        severity: 'LOW',
        message: `${pausedListings} listings are paused`,
        data: { count: pausedListings },
      });
    }

    res.json({ alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
});

export { router as performanceRouter };

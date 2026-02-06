/**
 * ダッシュボード分析API（Phase 30）
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ route: 'dashboard-analytics' });

// ========================================
// ダッシュボードサマリー
// ========================================

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: ダッシュボードサマリー
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 7
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    // 並列でデータを取得
    const [
      totalProducts,
      activeListings,
      listings,
      priceRecommendations,
      priceChangeLogs,
      competitorTrackers,
      competitorAlerts,
      orders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.findMany({
        where: { status: 'ACTIVE' },
        include: { product: true },
        take: 1000,
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from } },
      }),
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from } },
      }),
      prisma.competitorTracker.count({ where: { isActive: true } }),
      prisma.competitorAlert.count({ where: { status: 'pending' } }),
      prisma.order.findMany({
        where: { createdAt: { gte: from } },
      }),
    ]);

    // 収益計算
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    // 平均利益率
    const avgMarginPercent = listings.length > 0
      ? listings.reduce((sum, l) => {
          const cost = l.product?.price || 0;
          const margin = l.listingPrice > 0 ? ((l.listingPrice - cost) / l.listingPrice) * 100 : 0;
          return sum + margin;
        }, 0) / listings.length
      : 0;

    // 価格変更統計
    const priceIncreases = priceChangeLogs.filter(l => l.newPrice > l.oldPrice).length;
    const priceDecreases = priceChangeLogs.filter(l => l.newPrice < l.oldPrice).length;

    // 滞留商品（30日以上）
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 30);
    const staleItems = listings.filter(l => l.createdAt < staleThreshold).length;

    res.json({
      success: true,
      data: {
        period: {
          from: from.toISOString(),
          to: now.toISOString(),
          days: daysNum,
        },
        overview: {
          totalProducts,
          activeListings,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgMarginPercent: Math.round(avgMarginPercent * 100) / 100,
          ordersCount: orders.length,
        },
        pricing: {
          recommendationsGenerated: priceRecommendations.length,
          recommendationsApplied: priceRecommendations.filter(r => r.status === 'APPLIED').length,
          priceIncreases,
          priceDecreases,
        },
        competitors: {
          trackersActive: competitorTrackers,
          alertsPending: competitorAlerts,
        },
        inventory: {
          active: activeListings,
          staleItems,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 価格トレンド
// ========================================

/**
 * @swagger
 * /api/dashboard/trends/pricing:
 *   get:
 *     tags: [Dashboard]
 *     summary: 価格トレンド
 */
router.get('/trends/pricing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    const [priceChanges, recommendations] = await Promise.all([
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 日別に集計
    const priceChangesByDay = groupByDay(priceChanges, 'createdAt');
    const recommendationsByDay = groupByDay(recommendations, 'createdAt');

    res.json({
      success: true,
      data: {
        priceChanges: Object.entries(priceChangesByDay).map(([date, items]) => ({
          date,
          count: items.length,
          avgChangePercent: items.reduce((sum, i) =>
            sum + ((i.newPrice - i.oldPrice) / i.oldPrice) * 100, 0) / items.length || 0,
        })),
        recommendations: Object.entries(recommendationsByDay).map(([date, items]) => ({
          date,
          count: items.length,
          applied: items.filter((i: any) => i.status === 'APPLIED').length,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 競合トレンド
// ========================================

/**
 * @swagger
 * /api/dashboard/trends/competitors:
 *   get:
 *     tags: [Dashboard]
 *     summary: 競合トレンド
 */
router.get('/trends/competitors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    const [priceLogs, alerts] = await Promise.all([
      prisma.competitorPriceLog.findMany({
        where: { recordedAt: { gte: from } },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.competitorAlert.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const priceLogsByDay = groupByDay(priceLogs, 'recordedAt');
    const alertsByDay = groupByDay(alerts, 'createdAt');

    res.json({
      success: true,
      data: {
        priceChecks: Object.entries(priceLogsByDay).map(([date, items]) => ({
          date,
          count: items.length,
          avgPriceChange: items
            .filter((i: any) => i.priceChangePercent !== null)
            .reduce((sum, i: any) => sum + (i.priceChangePercent || 0), 0) / items.length || 0,
        })),
        alerts: Object.entries(alertsByDay).map(([date, items]) => ({
          date,
          count: items.length,
          priceDrops: items.filter((i: any) => i.alertType === 'price_drop').length,
          priceRises: items.filter((i: any) => i.alertType === 'price_rise').length,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 売上トレンド
// ========================================

/**
 * @swagger
 * /api/dashboard/trends/sales:
 *   get:
 *     tags: [Dashboard]
 *     summary: 売上トレンド
 */
router.get('/trends/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
      include: {
        sales: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const ordersByDay = groupByDay(orders, 'createdAt');

    // カテゴリ別集計（salesのtitleからカテゴリ推定）
    const categoryStats = new Map<string, { count: number; revenue: number }>();
    for (const order of orders) {
      // 簡易的にマーケットプレイスをカテゴリとして使用
      const category = order.marketplace || 'Unknown';
      const existing = categoryStats.get(category) || { count: 0, revenue: 0 };
      categoryStats.set(category, {
        count: existing.count + 1,
        revenue: existing.revenue + order.total,
      });
    }

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        daily: Object.entries(ordersByDay).map(([date, items]) => ({
          date,
          count: items.length,
          revenue: items.reduce((sum, o: any) => sum + o.total, 0),
        })),
        topCategories,
        summary: {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
          avgOrderValue: orders.length > 0
            ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// トップパフォーマー
// ========================================

/**
 * @swagger
 * /api/dashboard/top-performers:
 *   get:
 *     tags: [Dashboard]
 *     summary: トップパフォーマー
 */
router.get('/top-performers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30', limit = '10' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    // Sale（注文明細）から商品別の集計を行う
    const sales = await prisma.sale.findMany({
      where: {
        order: {
          createdAt: { gte: from },
        },
      },
      include: {
        order: true,
      },
    });

    // SKU別集計
    const productStats = new Map<string, {
      sku: string;
      title: string;
      orderCount: number;
      revenue: number;
      avgPrice: number;
    }>();

    for (const sale of sales) {
      const sku = sale.sku;
      const title = sale.title;
      const existing = productStats.get(sku);

      if (existing) {
        productStats.set(sku, {
          ...existing,
          orderCount: existing.orderCount + 1,
          revenue: existing.revenue + sale.totalPrice,
          avgPrice: (existing.revenue + sale.totalPrice) / (existing.orderCount + 1),
        });
      } else {
        productStats.set(sku, {
          sku,
          title,
          orderCount: 1,
          revenue: sale.totalPrice,
          avgPrice: sale.totalPrice,
        });
      }
    }

    const topByRevenue = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitNum);

    const topByOrders = Array.from(productStats.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limitNum);

    res.json({
      success: true,
      data: {
        byRevenue: topByRevenue,
        byOrderCount: topByOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// KPIメトリクス
// ========================================

/**
 * @swagger
 * /api/dashboard/kpis:
 *   get:
 *     tags: [Dashboard]
 *     summary: KPIメトリクス
 */
router.get('/kpis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysNum);

    // 前期間との比較用
    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - daysNum);

    const [
      currentOrders,
      previousOrders,
      currentListings,
      previousListings,
      priceChanges,
    ] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: from } } }),
      prisma.order.findMany({ where: { createdAt: { gte: previousFrom, lt: from } } }),
      prisma.listing.count({ where: { createdAt: { gte: from } } }),
      prisma.listing.count({ where: { createdAt: { gte: previousFrom, lt: from } } }),
      prisma.priceChangeLog.findMany({ where: { createdAt: { gte: from } } }),
    ]);

    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    const ordersChange = previousOrders.length > 0
      ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100
      : 0;

    const listingsChange = previousListings > 0
      ? ((currentListings - previousListings) / previousListings) * 100
      : 0;

    res.json({
      success: true,
      data: {
        period: {
          current: { from: from.toISOString(), to: now.toISOString() },
          previous: { from: previousFrom.toISOString(), to: from.toISOString() },
        },
        revenue: {
          current: Math.round(currentRevenue * 100) / 100,
          previous: Math.round(previousRevenue * 100) / 100,
          changePercent: Math.round(revenueChange * 100) / 100,
        },
        orders: {
          current: currentOrders.length,
          previous: previousOrders.length,
          changePercent: Math.round(ordersChange * 100) / 100,
        },
        listings: {
          current: currentListings,
          previous: previousListings,
          changePercent: Math.round(listingsChange * 100) / 100,
        },
        priceOptimization: {
          changesApplied: priceChanges.length,
          avgChangePercent: priceChanges.length > 0
            ? priceChanges.reduce((sum, c) => sum + ((c.newPrice - c.oldPrice) / c.oldPrice) * 100, 0) / priceChanges.length
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 日別にグループ化
 */
function groupByDay<T>(items: T[], dateField: keyof T): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const date = new Date(item[dateField] as any);
    const dateKey = date.toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  }
  return grouped;
}

// ========================================
// 予測・フォーキャスト
// ========================================

/**
 * @swagger
 * /api/dashboard/forecast/sales:
 *   get:
 *     tags: [Dashboard]
 *     summary: 売上予測
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 7
 */
router.get('/forecast/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);

    // 過去30日のデータを取得
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: 'asc' },
    });

    // 日別に集計
    const dailyStats = groupByDay(orders, 'createdAt');
    const dailyValues = Object.entries(dailyStats).map(([date, items]) => ({
      date,
      count: items.length,
      revenue: items.reduce((sum, o: any) => sum + o.total, 0),
    }));

    if (dailyValues.length < 7) {
      return res.json({
        success: true,
        data: {
          forecasts: [],
          message: 'Insufficient historical data for forecasting',
        },
      });
    }

    // 単純移動平均法で予測
    const recentDays = dailyValues.slice(-7);
    const avgOrders = recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length;
    const avgRevenue = recentDays.reduce((sum, d) => sum + d.revenue, 0) / recentDays.length;

    const forecasts = [];
    for (let i = 1; i <= daysNum; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);

      // 曜日による補正
      const dayOfWeek = futureDate.getDay();
      const weekdayFactors = [1.2, 0.9, 0.9, 1.0, 1.0, 1.1, 1.2];
      const weekdayFactor = weekdayFactors[dayOfWeek];

      forecasts.push({
        date: futureDate.toISOString().split('T')[0],
        predictedOrders: Math.max(0, Math.round(avgOrders * weekdayFactor)),
        predictedRevenue: Math.round(avgRevenue * weekdayFactor * 100) / 100,
        confidence: Math.max(0.3, 1 - (i / daysNum) * 0.5),
      });
    }

    res.json({
      success: true,
      data: {
        forecasts,
        basedOn: {
          days: dailyValues.length,
          avgDailyOrders: Math.round(avgOrders * 100) / 100,
          avgDailyRevenue: Math.round(avgRevenue * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/seasonality:
 *   get:
 *     tags: [Dashboard]
 *     summary: 季節性分析
 */
router.get('/seasonality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 過去90日のデータを分析
    const from = new Date();
    from.setDate(from.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
    });

    // 曜日別パターン
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayPattern: Record<string, number> = {};
    weekdays.forEach(d => { weekdayPattern[d] = 0; });

    // 時間帯別パターン
    const hourlyPattern: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyPattern[`${i.toString().padStart(2, '0')}:00`] = 0;
    }

    for (const order of orders) {
      const date = new Date(order.createdAt);
      weekdayPattern[weekdays[date.getDay()]]++;
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      hourlyPattern[hourKey]++;
    }

    // 正規化
    const total = orders.length || 1;
    const normalizedWeekday: Record<string, number> = {};
    const normalizedHourly: Record<string, number> = {};

    Object.entries(weekdayPattern).forEach(([k, v]) => {
      normalizedWeekday[k] = Math.round((v / total) * 100 * 100) / 100;
    });

    Object.entries(hourlyPattern).forEach(([k, v]) => {
      normalizedHourly[k] = Math.round((v / total) * 100 * 100) / 100;
    });

    res.json({
      success: true,
      data: {
        weekdayPattern: normalizedWeekday,
        hourlyPattern: normalizedHourly,
        totalOrders: orders.length,
        analyzedDays: 90,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// レポート生成
// ========================================

/**
 * @swagger
 * /api/dashboard/reports/daily:
 *   get:
 *     tags: [Dashboard]
 *     summary: 日次レポート生成
 *     parameters:
 *       - name: date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: format
 *         in: query
 *         schema:
 *           type: string
 *           enum: [json, markdown, csv]
 *           default: json
 */
router.get('/reports/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, format = 'json' } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);

    const [
      orders,
      newListings,
      priceChanges,
      competitorAlerts,
      recommendations,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { sales: true },
      }),
      prisma.listing.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceChangeLog.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.competitorAlert.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => {
      return sum + o.sales.reduce((s, sale) => s + (sale.profitJpy || 0), 0);
    }, 0);

    const report = {
      id: `daily-${from.toISOString().split('T')[0]}`,
      type: 'daily',
      period: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
      sections: {
        salesSummary: {
          ordersCount: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgOrderValue: orders.length > 0
            ? Math.round((totalRevenue / orders.length) * 100) / 100
            : 0,
        },
        listingActivity: {
          newListings,
          priceChanges,
        },
        priceOptimization: {
          recommendationsGenerated: recommendations.length,
          recommendationsApplied: recommendations.filter(r => r.status === 'APPLIED').length,
          recommendationsPending: recommendations.filter(r => r.status === 'PENDING').length,
        },
        competitorMonitoring: {
          alertsGenerated: competitorAlerts,
        },
      },
    };

    if (format === 'markdown') {
      const md = formatReportAsMarkdown(report);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(md);
    } else if (format === 'csv') {
      const csv = formatReportAsCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/reports/weekly:
 *   get:
 *     tags: [Dashboard]
 *     summary: 週次レポート生成
 */
router.get('/reports/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weekStart, format = 'json' } = req.query;

    const from = weekStart ? new Date(weekStart as string) : getWeekStart(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);

    const [
      orders,
      newListings,
      priceChanges,
      competitorAlerts,
      recommendations,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { sales: true },
      }),
      prisma.listing.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.competitorAlert.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => {
      return sum + o.sales.reduce((s, sale) => s + (sale.profitJpy || 0), 0);
    }, 0);

    // 日別集計
    const dailyStats = groupByDay(orders, 'createdAt');

    const report = {
      id: `weekly-${from.toISOString().split('T')[0]}`,
      type: 'weekly',
      period: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
      sections: {
        weeklySummary: {
          ordersCount: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgOrderValue: orders.length > 0
            ? Math.round((totalRevenue / orders.length) * 100) / 100
            : 0,
        },
        dailyBreakdown: Object.entries(dailyStats).map(([date, items]) => ({
          date,
          orders: items.length,
          revenue: items.reduce((sum, o: any) => sum + o.total, 0),
        })),
        priceOptimization: {
          recommendationsGenerated: recommendations.length,
          recommendationsApplied: recommendations.filter(r => r.status === 'APPLIED').length,
          priceIncreases: priceChanges.filter(p => p.newPrice > p.oldPrice).length,
          priceDecreases: priceChanges.filter(p => p.newPrice < p.oldPrice).length,
        },
        competitorActivity: {
          alertsGenerated: competitorAlerts,
        },
      },
    };

    if (format === 'markdown') {
      const md = formatReportAsMarkdown(report);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(md);
    } else if (format === 'csv') {
      const csv = formatReportAsCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/reports/monthly:
 *   get:
 *     tags: [Dashboard]
 *     summary: 月次レポート生成
 */
router.get('/reports/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, format = 'json' } = req.query;

    let from: Date;
    if (month) {
      from = new Date(month as string);
    } else {
      from = new Date();
      from.setDate(1);
    }
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    to.setDate(0);
    to.setHours(23, 59, 59, 999);

    const [
      orders,
      totalProducts,
      activeListings,
      priceChanges,
      recommendations,
      competitorTrackers,
      competitorAlerts,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { sales: true },
      }),
      prisma.product.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.competitorTracker.count({ where: { isActive: true } }),
      prisma.competitorAlert.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => {
      return sum + o.sales.reduce((s, sale) => s + (sale.profitJpy || 0), 0);
    }, 0);

    const report = {
      id: `monthly-${from.toISOString().slice(0, 7)}`,
      type: 'monthly',
      period: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
      sections: {
        monthlySummary: {
          ordersCount: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgOrderValue: orders.length > 0
            ? Math.round((totalRevenue / orders.length) * 100) / 100
            : 0,
        },
        inventory: {
          totalProducts,
          activeListings,
        },
        priceOptimization: {
          recommendationsGenerated: recommendations.length,
          recommendationsApplied: recommendations.filter(r => r.status === 'APPLIED').length,
          totalPriceChanges: priceChanges.length,
          avgPriceChange: priceChanges.length > 0
            ? priceChanges.reduce((sum, p) => sum + ((p.newPrice - p.oldPrice) / p.oldPrice) * 100, 0) / priceChanges.length
            : 0,
        },
        competitorAnalysis: {
          trackersActive: competitorTrackers,
          alertsGenerated: competitorAlerts,
        },
      },
    };

    if (format === 'markdown') {
      const md = formatReportAsMarkdown(report);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(md);
    } else if (format === 'csv') {
      const csv = formatReportAsCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 週の開始日を取得
 */
function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * レポートをマークダウン形式に変換
 */
function formatReportAsMarkdown(report: any): string {
  const lines: string[] = [];
  const typeLabels: Record<string, string> = { daily: '日次', weekly: '週次', monthly: '月次' };
  const typeLabel = typeLabels[report.type] || report.type;

  lines.push(`# ${typeLabel}レポート`);
  lines.push('');
  lines.push(`**期間**: ${report.period.from.split('T')[0]} 〜 ${report.period.to.split('T')[0]}`);
  lines.push(`**生成日時**: ${report.generatedAt}`);
  lines.push('');

  for (const [sectionName, sectionData] of Object.entries(report.sections)) {
    lines.push(`## ${sectionName}`);
    lines.push('');

    if (Array.isArray(sectionData)) {
      if (sectionData.length > 0) {
        const keys = Object.keys(sectionData[0]);
        lines.push('| ' + keys.join(' | ') + ' |');
        lines.push('| ' + keys.map(() => '---').join(' | ') + ' |');
        for (const row of sectionData as any[]) {
          lines.push('| ' + keys.map(k => String(row[k] ?? '')).join(' | ') + ' |');
        }
      }
    } else if (typeof sectionData === 'object') {
      for (const [key, value] of Object.entries(sectionData as object)) {
        lines.push(`- **${key}**: ${value}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * レポートをCSV形式に変換
 */
function formatReportAsCsv(report: any): string {
  const lines: string[] = [];

  lines.push(`Report Type,${report.type}`);
  lines.push(`Period Start,${report.period.from}`);
  lines.push(`Period End,${report.period.to}`);
  lines.push(`Generated At,${report.generatedAt}`);
  lines.push('');

  for (const [sectionName, sectionData] of Object.entries(report.sections)) {
    lines.push(`[${sectionName}]`);

    if (Array.isArray(sectionData) && sectionData.length > 0) {
      const keys = Object.keys(sectionData[0]);
      lines.push(keys.join(','));
      for (const row of sectionData as any[]) {
        lines.push(keys.map(k => String(row[k] ?? '')).join(','));
      }
    } else if (typeof sectionData === 'object') {
      lines.push('Key,Value');
      for (const [key, value] of Object.entries(sectionData as object)) {
        lines.push(`${key},${value}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export { router as dashboardAnalyticsRouter };

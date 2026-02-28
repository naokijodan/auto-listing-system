
/**
 * Phase 112: eBay分析・レポート強化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { logger } from '@rakuda/logger';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-analytics' });

// 総合ダッシュボード
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(since.getTime() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [
      // 現在期間
      currentOrders, currentRevenue, currentListings, currentSold,
      // 前期間
      prevOrders, prevRevenue,
      // 追加指標
      activeListings, avgOrderValue, topProducts
    ] = await Promise.all([
      prisma.order.count({ where: { marketplace: Marketplace.EBAY, orderedAt: { gte: since } } }),
      prisma.order.aggregate({ where: { marketplace: Marketplace.EBAY, orderedAt: { gte: since }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.listing.count({ where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } } }),
      prisma.listing.count({ where: { marketplace: Marketplace.EBAY, status: 'SOLD', updatedAt: { gte: since } } }),
      prisma.order.count({ where: { marketplace: Marketplace.EBAY, orderedAt: { gte: prevPeriodStart, lt: since } } }),
      prisma.order.aggregate({ where: { marketplace: Marketplace.EBAY, orderedAt: { gte: prevPeriodStart, lt: since }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.listing.count({ where: { marketplace: Marketplace.EBAY, status: 'ACTIVE' } }),
      prisma.order.aggregate({ where: { marketplace: Marketplace.EBAY, orderedAt: { gte: since }, paymentStatus: 'PAID' }, _avg: { total: true } }),
      // Top products via sale joined through order
      prisma.sale.groupBy({
        by: ['sku', 'title'],
        where: {
          createdAt: { gte: since },
          order: { marketplace: Marketplace.EBAY },
        },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10,
      }),
    ]);

    const currRev = currentRevenue._sum.total || 0;
    const prevRev = prevRevenue._sum.total || 0;
    const revenueChange = prevRev > 0 ? ((currRev - prevRev) / prevRev * 100).toFixed(1) : '0';
    const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders * 100).toFixed(1) : '0';

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      summary: {
        orders: { current: currentOrders, change: `${ordersChange}%` },
        revenue: { current: currRev, change: `${revenueChange}%` },
        newListings: currentListings,
        soldItems: currentSold,
        activeListings,
        avgOrderValue: avgOrderValue._avg.total || 0,
      },
      topProducts: topProducts.map(p => ({
        sku: p.sku,
        title: p.title,
        revenue: p._sum?.totalPrice || 0,
        quantity: p._sum?.quantity || 0,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// 売上トレンド
router.get('/sales-trend', async (req: Request, res: Response) => {
  try {
    const { days = '30', groupBy = 'day' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: { marketplace: Marketplace.EBAY, orderedAt: { gte: since }, paymentStatus: 'PAID' },
      select: { orderedAt: true, total: true },
      orderBy: { orderedAt: 'asc' },
    });

    const grouped: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (const order of orders) {
      let key: string;
      if (groupBy === 'week') {
        const d = new Date(order.orderedAt);
        d.setDate(d.getDate() - d.getDay());
        key = d.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = order.orderedAt.toISOString().substring(0, 7);
      } else {
        key = order.orderedAt.toISOString().split('T')[0];
      }
      if (!grouped[key]) grouped[key] = { date: key, revenue: 0, orders: 0 };
      grouped[key].revenue += order.total;
      grouped[key].orders += 1;
    }

    res.json({ data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (error) {
    log.error({ type: 'sales_trend_error', error });
    res.status(500).json({ error: 'Failed to get sales trend' });
  }
});

// リスティングパフォーマンス
router.get('/listing-performance', async (req: Request, res: Response) => {
  try {
    const { days = '30', limit = '20' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const listings = await prisma.listing.findMany({
      where: { marketplace: Marketplace.EBAY, status: 'ACTIVE' },
      include: { product: { select: { title: true, titleEn: true, images: true } } },
      take: parseInt(limit as string, 10),
    });

    // 各リスティングの売上を取得
    const performance = await Promise.all(listings.map(async (listing) => {
      const sales = await prisma.sale.aggregate({
        where: { listingId: listing.id, createdAt: { gte: since } },
        _sum: { totalPrice: true, quantity: true },
        _count: true,
      });
      const data = listing.marketplaceData as Record<string, unknown> || {};
      return {
        id: listing.id,
        title: listing.product?.titleEn || listing.product?.title,
        image: listing.product?.images?.[0],
        price: listing.listingPrice,
        views: (data.views as number) || 0,
        watchers: (data.watchers as number) || 0,
        sales: sales._count,
        revenue: sales._sum.totalPrice || 0,
        conversionRate: (data.views as number) > 0 ? ((sales._count / (data.views as number)) * 100).toFixed(2) + '%' : 'N/A',
        listedAt: listing.listedAt,
      };
    }));

    // ソート（売上順）
    performance.sort((a, b) => b.revenue - a.revenue);

    res.json({ listings: performance });
  } catch (error) {
    log.error({ type: 'listing_performance_error', error });
    res.status(500).json({ error: 'Failed to get listing performance' });
  }
});

// カテゴリ分析 (Sale has no category, use sku-based grouping instead)
router.get('/category-analysis', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const salesBySku = await prisma.sale.groupBy({
      by: ['sku'],
      where: {
        createdAt: { gte: since },
        order: { marketplace: Marketplace.EBAY },
      },
      _sum: { totalPrice: true, quantity: true },
      _count: { _all: true },
    });

    const categories = salesBySku.map(s => ({
      sku: s.sku,
      revenue: s._sum?.totalPrice || 0,
      quantity: s._sum?.quantity || 0,
      orderCount: s._count?._all || 0,
      avgOrderValue: (s._count?._all || 0) > 0 ? (((s._sum?.totalPrice || 0)) / (s._count._all)).toFixed(2) : '0',
    }));

    res.json({ categories: categories.sort((a, b) => b.revenue - a.revenue) });
  } catch (error) {
    log.error({ type: 'category_analysis_error', error });
    res.status(500).json({ error: 'Failed to get category analysis' });
  }
});

// 在庫回転率
router.get('/inventory-turnover', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [activeListings, soldInPeriod, avgDaysToSell] = await Promise.all([
      prisma.listing.count({ where: { marketplace: Marketplace.EBAY, status: 'ACTIVE' } }),
      prisma.listing.count({ where: { marketplace: Marketplace.EBAY, status: 'SOLD', updatedAt: { gte: since } } }),
      prisma.listing.findMany({
        where: { marketplace: Marketplace.EBAY, status: 'SOLD', listedAt: { not: null } },
        select: { listedAt: true, updatedAt: true },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // 平均販売日数計算
    let totalDays = 0;
    let count = 0;
    for (const l of avgDaysToSell) {
      if (l.listedAt) {
        totalDays += (l.updatedAt.getTime() - l.listedAt.getTime()) / (1000 * 60 * 60 * 24);
        count++;
      }
    }
    const avgDays = count > 0 ? (totalDays / count).toFixed(1) : 'N/A';
    const turnoverRate = activeListings > 0 ? ((soldInPeriod / activeListings) * 100).toFixed(1) + '%' : 'N/A';

    res.json({
      activeListings,
      soldInPeriod,
      turnoverRate,
      avgDaysToSell: avgDays,
    });
  } catch (error) {
    log.error({ type: 'inventory_turnover_error', error });
    res.status(500).json({ error: 'Failed to get inventory turnover' });
  }
});

// 利益分析
router.get('/profit-analysis', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: since },
        order: { marketplace: Marketplace.EBAY },
      },
      select: { totalPrice: true, costPrice: true, profitJpy: true, profitRate: true, sku: true },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const bySku: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalPrice;
      totalCost += sale.costPrice || 0;
      totalProfit += sale.profitJpy || 0;
      const skuKey = sale.sku || 'unknown';
      if (!bySku[skuKey]) bySku[skuKey] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      bySku[skuKey].revenue += sale.totalPrice;
      bySku[skuKey].cost += sale.costPrice || 0;
      bySku[skuKey].profit += sale.profitJpy || 0;
      bySku[skuKey].count += 1;
    }

    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : 'N/A';

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        orderCount: sales.length,
      },
      bySku: Object.entries(bySku).map(([sku, data]) => ({
        sku,
        ...data,
        profitMargin: data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) + '%' : 'N/A',
      })).sort((a, b) => b.profit - a.profit),
    });
  } catch (error) {
    log.error({ type: 'profit_analysis_error', error });
    res.status(500).json({ error: 'Failed to get profit analysis' });
  }
});

// エクスポート
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { type = 'orders', days = '30', format = 'json' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    let data: unknown[];

    if (type === 'orders') {
      data = await prisma.order.findMany({
        where: { marketplace: Marketplace.EBAY, orderedAt: { gte: since } },
        include: { sales: true },
        orderBy: { orderedAt: 'desc' },
      });
    } else if (type === 'sales') {
      data = await prisma.sale.findMany({
        where: {
          createdAt: { gte: since },
          order: { marketplace: Marketplace.EBAY },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'listings') {
      data = await prisma.listing.findMany({
        where: { marketplace: Marketplace.EBAY },
        include: { product: { select: { title: true, titleEn: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Simple CSV conversion
      if (data.length === 0) return res.status(200).send('');
      const headers = Object.keys(data[0] as object).join(',');
      const rows = data.map(row => Object.values(row as object).map(v =>
        typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
      ).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
      return res.send([headers, ...rows].join('\n'));
    }

    res.json({ data, count: data.length });
  } catch (error) {
    log.error({ type: 'export_error', error });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;

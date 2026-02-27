// @ts-nocheck
/**
 * Phase 107: eBay売上レポート API
 *
 * eBay出品の売上分析・レポート機能
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { logger } from '@rakuda/logger';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-sales' });

// ========================================
// 売上ダッシュボード
// ========================================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      totalRevenue,
      totalItems,
      avgOrderValue,
      soldListings,
      topSellingProducts,
      recentOrders,
      dailySales,
    ] = await Promise.all([
      // 総注文数
      prisma.order.count({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      }),
      // 総売上
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _sum: { total: true },
      }),
      // 総販売点数
      prisma.orderItem.count({
        where: {
          order: {
            marketplace: Marketplace.EBAY,
            orderedAt: { gte: since },
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          },
        },
      }),
      // 平均注文額
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _avg: { total: true },
      }),
      // 売却済み出品数
      prisma.listing.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'SOLD',
          soldAt: { gte: since },
        },
      }),
      // トップ売上商品
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            marketplace: Marketplace.EBAY,
            orderedAt: { gte: since },
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          },
        },
        _sum: { price: true, quantity: true },
        _count: true,
        orderBy: { _sum: { price: 'desc' } },
        take: 10,
      }),
      // 最近の注文
      prisma.order.findMany({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
        },
        orderBy: { orderedAt: 'desc' },
        take: 10,
        include: {
          items: {
            include: {
              product: { select: { title: true } },
            },
          },
        },
      }),
      // 日別売上
      prisma.$queryRaw<Array<{ date: string; orders: bigint; revenue: number }>>`
        SELECT
          DATE(ordered_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE marketplace = 'EBAY'
          AND ordered_at >= ${since}
          AND status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        GROUP BY DATE(ordered_at)
        ORDER BY date DESC
        LIMIT 30
      `.catch(() => []),
    ]);

    // トップ商品の詳細を取得
    const productIds = topSellingProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, category: true, brand: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    res.json({
      period: { days: daysNum, since: since.toISOString() },
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        totalItems,
        avgOrderValue: avgOrderValue._avg.total || 0,
        soldListings,
      },
      topProducts: topSellingProducts.map(p => ({
        productId: p.productId,
        title: productMap.get(p.productId)?.title || 'Unknown',
        category: productMap.get(p.productId)?.category,
        brand: productMap.get(p.productId)?.brand,
        revenue: p._sum.price || 0,
        quantity: p._sum.quantity || 0,
        orderCount: p._count,
      })),
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        externalId: order.externalOrderId,
        amount: order.total,
        currency: order.currency,
        status: order.status,
        itemCount: order.items.length,
        items: order.items.slice(0, 3).map(item => ({
          title: item.product?.title || 'Unknown',
          price: item.price,
          quantity: item.quantity,
        })),
        orderedAt: order.orderedAt,
      })),
      dailySales: dailySales.map(d => ({
        date: d.date,
        orders: Number(d.orders),
        revenue: d.revenue,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get sales dashboard' });
  }
});

// ========================================
// 期間別売上サマリー
// ========================================

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const {
      period = 'week', // day, week, month, year
      startDate,
      endDate,
    } = req.query;

    let since: Date;
    let until: Date = new Date();

    if (startDate && endDate) {
      since = new Date(startDate as string);
      until = new Date(endDate as string);
    } else {
      switch (period) {
        case 'day':
          since = new Date();
          since.setHours(0, 0, 0, 0);
          break;
        case 'week':
          since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    const [orders, listings, prevPeriodOrders] = await Promise.all([
      // 現期間の注文
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since, lte: until },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _count: true,
        _sum: { total: true },
      }),
      // 売却済み出品
      prisma.listing.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'SOLD',
          soldAt: { gte: since, lte: until },
        },
        _count: true,
        _sum: { soldPrice: true },
      }),
      // 前期間の注文（比較用）
      prisma.order.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          orderedAt: {
            gte: new Date(since.getTime() - (until.getTime() - since.getTime())),
            lt: since,
          },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    const currentRevenue = orders._sum.total || 0;
    const prevRevenue = prevPeriodOrders._sum.total || 0;
    const revenueChange = prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : null;

    const currentOrders = orders._count;
    const prevOrders = prevPeriodOrders._count;
    const ordersChange = prevOrders > 0
      ? ((currentOrders - prevOrders) / prevOrders * 100).toFixed(1)
      : null;

    res.json({
      period: {
        type: period,
        start: since.toISOString(),
        end: until.toISOString(),
      },
      current: {
        orders: currentOrders,
        revenue: currentRevenue,
        soldListings: listings._count,
        listingRevenue: listings._sum.soldPrice || 0,
      },
      comparison: {
        orders: prevOrders,
        revenue: prevRevenue,
        ordersChange: ordersChange ? `${ordersChange}%` : null,
        revenueChange: revenueChange ? `${revenueChange}%` : null,
        trend: revenueChange
          ? parseFloat(revenueChange) > 0 ? 'up' : parseFloat(revenueChange) < 0 ? 'down' : 'stable'
          : null,
      },
    });
  } catch (error) {
    log.error({ type: 'summary_error', error });
    res.status(500).json({ error: 'Failed to get sales summary' });
  }
});

// ========================================
// カテゴリ別売上
// ========================================

router.get('/by-category', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    // カテゴリ別の売上を集計
    const categoryStats = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      _sum: { price: true, quantity: true },
      _count: true,
    });

    // 商品情報を取得
    const productIds = categoryStats.map(s => s.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true },
    });
    const productCategoryMap = new Map(products.map(p => [p.id, p.category || 'その他']));

    // カテゴリ別に集計
    const byCategory: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    for (const stat of categoryStats) {
      const category = productCategoryMap.get(stat.productId) || 'その他';
      if (!byCategory[category]) {
        byCategory[category] = { revenue: 0, quantity: 0, orders: 0 };
      }
      byCategory[category].revenue += stat._sum.price || 0;
      byCategory[category].quantity += stat._sum.quantity || 0;
      byCategory[category].orders += stat._count;
    }

    // ソートして返す
    const sorted = Object.entries(byCategory)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = sorted.reduce((sum, c) => sum + c.revenue, 0);

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      categories: sorted.map(c => ({
        ...c,
        revenuePercent: totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : '0',
      })),
      totalRevenue,
    });
  } catch (error) {
    log.error({ type: 'by_category_error', error });
    res.status(500).json({ error: 'Failed to get category sales' });
  }
});

// ========================================
// 商品別売上ランキング
// ========================================

router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const { days = '30', limit = '20' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          marketplace: Marketplace.EBAY,
          orderedAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      _sum: { price: true, quantity: true },
      _count: true,
      orderBy: { _sum: { price: 'desc' } },
      take: parseInt(limit as string, 10),
    });

    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, category: true, brand: true, images: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      products: topProducts.map((p, index) => {
        const product = productMap.get(p.productId);
        return {
          rank: index + 1,
          productId: p.productId,
          title: product?.title || 'Unknown',
          category: product?.category,
          brand: product?.brand,
          image: product?.images?.[0],
          revenue: p._sum.price || 0,
          quantity: p._sum.quantity || 0,
          orderCount: p._count,
          avgPrice: p._sum.quantity ? (p._sum.price || 0) / p._sum.quantity : 0,
        };
      }),
    });
  } catch (error) {
    log.error({ type: 'top_products_error', error });
    res.status(500).json({ error: 'Failed to get top products' });
  }
});

// ========================================
// 売上トレンド
// ========================================

router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { days = '30', groupBy = 'day' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = "to_char(ordered_at, 'IYYY-IW')";
        break;
      case 'month':
        dateFormat = "to_char(ordered_at, 'YYYY-MM')";
        break;
      default:
        dateFormat = "DATE(ordered_at)";
    }

    const trends = await prisma.$queryRawUnsafe<Array<{
      period: string;
      orders: bigint;
      revenue: number;
      items: bigint;
    }>>(
      `SELECT
        ${dateFormat} as period,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue,
        (SELECT COUNT(*) FROM order_items WHERE order_id IN
          (SELECT id FROM orders WHERE marketplace = 'EBAY'
           AND ${dateFormat} = ${dateFormat}
           AND status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'))
        ) as items
      FROM orders
      WHERE marketplace = 'EBAY'
        AND ordered_at >= $1
        AND status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      GROUP BY ${dateFormat}
      ORDER BY period ASC`,
      since
    ).catch(() => []);

    // 前期間との比較
    const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));
    const prevRevenue = await prisma.order.aggregate({
      where: {
        marketplace: Marketplace.EBAY,
        orderedAt: { gte: prevSince, lt: since },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: { total: true },
    });

    const currentTotal = trends.reduce((sum, t) => sum + t.revenue, 0);
    const prevTotal = prevRevenue._sum.total || 0;
    const growthRate = prevTotal > 0
      ? ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1)
      : null;

    res.json({
      period: {
        days: parseInt(days as string, 10),
        groupBy,
        since: since.toISOString(),
      },
      trends: trends.map(t => ({
        period: t.period,
        orders: Number(t.orders),
        revenue: t.revenue,
        items: Number(t.items),
      })),
      summary: {
        totalRevenue: currentTotal,
        prevPeriodRevenue: prevTotal,
        growthRate: growthRate ? `${growthRate}%` : null,
        trend: growthRate
          ? parseFloat(growthRate) > 0 ? 'up' : parseFloat(growthRate) < 0 ? 'down' : 'stable'
          : null,
      },
    });
  } catch (error) {
    log.error({ type: 'trends_error', error });
    res.status(500).json({ error: 'Failed to get sales trends' });
  }
});

// ========================================
// 利益分析
// ========================================

router.get('/profit', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    // 売却済み出品を取得
    const soldListings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        status: 'SOLD',
        soldAt: { gte: since },
      },
      include: {
        product: {
          select: { id: true, title: true, price: true, category: true },
        },
      },
    });

    // 利益計算
    const profitAnalysis = soldListings.map(listing => {
      const costPrice = listing.product?.price || 0;
      const soldPrice = listing.soldPrice || listing.listingPrice;
      const shippingCost = listing.shippingCost || 0;
      const fees = soldPrice * 0.13; // eBay手数料約13%想定
      const profit = soldPrice - costPrice - shippingCost - fees;
      const profitRate = costPrice > 0 ? (profit / costPrice) * 100 : 0;

      return {
        listingId: listing.id,
        productId: listing.productId,
        title: listing.product?.title,
        category: listing.product?.category,
        costPrice,
        soldPrice,
        shippingCost,
        fees,
        profit,
        profitRate,
        soldAt: listing.soldAt,
      };
    });

    // 集計
    const totalCost = profitAnalysis.reduce((sum, p) => sum + p.costPrice, 0);
    const totalRevenue = profitAnalysis.reduce((sum, p) => sum + p.soldPrice, 0);
    const totalFees = profitAnalysis.reduce((sum, p) => sum + p.fees, 0);
    const totalProfit = profitAnalysis.reduce((sum, p) => sum + p.profit, 0);
    const avgProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // カテゴリ別利益
    const byCategory: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
    for (const item of profitAnalysis) {
      const cat = item.category || 'その他';
      if (!byCategory[cat]) {
        byCategory[cat] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      }
      byCategory[cat].revenue += item.soldPrice;
      byCategory[cat].cost += item.costPrice;
      byCategory[cat].profit += item.profit;
      byCategory[cat].count += 1;
    }

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      summary: {
        totalItems: soldListings.length,
        totalCost: Math.round(totalCost),
        totalRevenue: Math.round(totalRevenue),
        totalFees: Math.round(totalFees),
        totalProfit: Math.round(totalProfit),
        avgProfitRate: avgProfitRate.toFixed(1) + '%',
      },
      byCategory: Object.entries(byCategory)
        .map(([category, stats]) => ({
          category,
          ...stats,
          profitRate: stats.cost > 0 ? ((stats.profit / stats.cost) * 100).toFixed(1) + '%' : 'N/A',
        }))
        .sort((a, b) => b.profit - a.profit),
      topProfitItems: profitAnalysis
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
        .map(item => ({
          ...item,
          profit: Math.round(item.profit),
          profitRate: item.profitRate.toFixed(1) + '%',
        })),
      lowProfitItems: profitAnalysis
        .sort((a, b) => a.profit - b.profit)
        .slice(0, 10)
        .map(item => ({
          ...item,
          profit: Math.round(item.profit),
          profitRate: item.profitRate.toFixed(1) + '%',
        })),
    });
  } catch (error) {
    log.error({ type: 'profit_error', error });
    res.status(500).json({ error: 'Failed to get profit analysis' });
  }
});

export default router;

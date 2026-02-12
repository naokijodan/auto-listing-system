/**
 * 高度な分析API
 * Phase 76: カスタムチャート、ドリルダウン分析、データエクスポート
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * 売上トレンド分析
 * GET /api/advanced-analytics/sales-trend
 */
router.get('/sales-trend', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day', // day, week, month
      marketplace,
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: Record<string, unknown> = {
      createdAt: { gte: start, lte: end },
    };
    if (marketplace) {
      where.marketplace = marketplace;
    }

    // 売上データを取得
    const sales = await prisma.sale.findMany({
      where,
      include: {
        order: {
          select: {
            marketplace: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // グループ化
    const grouped: Record<string, { revenue: number; orders: number; profit: number }> = {};

    for (const sale of sales) {
      let key: string;
      const date = new Date(sale.createdAt);

      if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orders: 0, profit: 0 };
      }
      grouped[key].revenue += sale.revenue;
      grouped[key].orders += 1;
      grouped[key].profit += sale.profit;
    }

    // 配列に変換
    const trend = Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        profit: data.profit,
        avgOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 合計
    const totals = trend.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        orders: acc.orders + item.orders,
        profit: acc.profit + item.profit,
      }),
      { revenue: 0, orders: 0, profit: 0 }
    );

    res.json({
      success: true,
      data: {
        trend,
        totals: {
          ...totals,
          avgOrderValue: totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0,
          profitMargin: totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0',
        },
        period: { start, end, groupBy },
      },
    });
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales trend',
    });
  }
});

/**
 * カテゴリ別分析
 * GET /api/advanced-analytics/by-category
 */
router.get('/by-category', async (req, res) => {
  try {
    const { startDate, endDate, limit = '10' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // カテゴリ別売上
    const salesByCategory = await prisma.$queryRaw<
      Array<{ category: string; revenue: number; orders: number; profit: number }>
    >`
      SELECT
        COALESCE(p.category, 'その他') as category,
        SUM(s.revenue) as revenue,
        COUNT(DISTINCT s."orderId") as orders,
        SUM(s.profit) as profit
      FROM sales s
      JOIN orders o ON s."orderId" = o.id
      JOIN order_items oi ON o.id = oi."orderId"
      JOIN listings l ON oi."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE s."createdAt" >= ${start} AND s."createdAt" <= ${end}
      GROUP BY p.category
      ORDER BY revenue DESC
      LIMIT ${parseInt(limit as string)}
    `;

    // 全体の合計
    const total = salesByCategory.reduce(
      (acc, item) => ({
        revenue: acc.revenue + Number(item.revenue),
        orders: acc.orders + Number(item.orders),
        profit: acc.profit + Number(item.profit),
      }),
      { revenue: 0, orders: 0, profit: 0 }
    );

    // パーセンテージを追加
    const categoriesWithPercentage = salesByCategory.map((item) => ({
      category: item.category,
      revenue: Number(item.revenue),
      orders: Number(item.orders),
      profit: Number(item.profit),
      revenuePercentage: total.revenue > 0 ? ((Number(item.revenue) / total.revenue) * 100).toFixed(1) : '0',
      profitMargin: Number(item.revenue) > 0 ? ((Number(item.profit) / Number(item.revenue)) * 100).toFixed(1) : '0',
    }));

    res.json({
      success: true,
      data: {
        categories: categoriesWithPercentage,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching category analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category analysis',
    });
  }
});

/**
 * マーケットプレイス比較
 * GET /api/advanced-analytics/marketplace-comparison
 */
router.get('/marketplace-comparison', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // マーケットプレイス別売上
    const salesByMarketplace = await prisma.$queryRaw<
      Array<{ marketplace: string; revenue: number; orders: number; profit: number; listings: number }>
    >`
      SELECT
        o.marketplace,
        COALESCE(SUM(s.revenue), 0) as revenue,
        COUNT(DISTINCT s."orderId") as orders,
        COALESCE(SUM(s.profit), 0) as profit,
        (SELECT COUNT(*) FROM listings WHERE marketplace = o.marketplace AND status = 'ACTIVE') as listings
      FROM orders o
      LEFT JOIN sales s ON o.id = s."orderId" AND s."createdAt" >= ${start} AND s."createdAt" <= ${end}
      WHERE o."orderedAt" >= ${start} AND o."orderedAt" <= ${end}
      GROUP BY o.marketplace
      ORDER BY revenue DESC
    `;

    // 前期間のデータも取得して比較
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);

    const prevSales = await prisma.$queryRaw<
      Array<{ marketplace: string; revenue: number; orders: number }>
    >`
      SELECT
        o.marketplace,
        COALESCE(SUM(s.revenue), 0) as revenue,
        COUNT(DISTINCT s."orderId") as orders
      FROM orders o
      LEFT JOIN sales s ON o.id = s."orderId" AND s."createdAt" >= ${prevStart} AND s."createdAt" <= ${prevEnd}
      WHERE o."orderedAt" >= ${prevStart} AND o."orderedAt" <= ${prevEnd}
      GROUP BY o.marketplace
    `;

    // 比較データを作成
    const prevSalesMap = new Map(prevSales.map(item => [item.marketplace, item]));

    const comparison = salesByMarketplace.map((item) => {
      const prev = prevSalesMap.get(item.marketplace);
      const prevRevenue = prev ? Number(prev.revenue) : 0;
      const prevOrders = prev ? Number(prev.orders) : 0;

      return {
        marketplace: item.marketplace,
        revenue: Number(item.revenue),
        orders: Number(item.orders),
        profit: Number(item.profit),
        listings: Number(item.listings),
        revenueChange: prevRevenue > 0
          ? (((Number(item.revenue) - prevRevenue) / prevRevenue) * 100).toFixed(1)
          : 'N/A',
        ordersChange: prevOrders > 0
          ? (((Number(item.orders) - prevOrders) / prevOrders) * 100).toFixed(1)
          : 'N/A',
        avgOrderValue: Number(item.orders) > 0 ? Math.round(Number(item.revenue) / Number(item.orders)) : 0,
        profitMargin: Number(item.revenue) > 0
          ? ((Number(item.profit) / Number(item.revenue)) * 100).toFixed(1)
          : '0',
      };
    });

    res.json({
      success: true,
      data: {
        comparison,
        period: { start, end },
        previousPeriod: { start: prevStart, end: prevEnd },
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch marketplace comparison',
    });
  }
});

/**
 * 商品パフォーマンス分析（ドリルダウン用）
 * GET /api/advanced-analytics/product-performance
 */
router.get('/product-performance', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      category,
      marketplace,
      sortBy = 'revenue', // revenue, orders, profit, margin
      sortOrder = 'desc',
      limit = '20',
      offset = '0',
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // 動的なWHERE句を構築
    let whereClause = `WHERE s."createdAt" >= '${start.toISOString()}' AND s."createdAt" <= '${end.toISOString()}'`;
    if (category) {
      whereClause += ` AND p.category = '${category}'`;
    }
    if (marketplace) {
      whereClause += ` AND o.marketplace = '${marketplace}'`;
    }

    // 並び替え
    const validSortColumns: Record<string, string> = {
      revenue: 'revenue',
      orders: 'orders',
      profit: 'profit',
      margin: 'profit_margin',
    };
    const orderByColumn = validSortColumns[sortBy as string] || 'revenue';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const products = await prisma.$queryRawUnsafe<
      Array<{
        productId: string;
        title: string;
        category: string;
        brand: string;
        revenue: number;
        orders: number;
        profit: number;
        profit_margin: number;
      }>
    >(`
      SELECT
        p.id as "productId",
        p.title,
        COALESCE(p.category, 'その他') as category,
        COALESCE(p.brand, '不明') as brand,
        COALESCE(SUM(s.revenue), 0) as revenue,
        COUNT(DISTINCT s."orderId") as orders,
        COALESCE(SUM(s.profit), 0) as profit,
        CASE WHEN SUM(s.revenue) > 0 THEN (SUM(s.profit) / SUM(s.revenue) * 100) ELSE 0 END as profit_margin
      FROM products p
      JOIN listings l ON p.id = l."productId"
      JOIN order_items oi ON l.id = oi."listingId"
      JOIN orders o ON oi."orderId" = o.id
      LEFT JOIN sales s ON o.id = s."orderId"
      ${whereClause}
      GROUP BY p.id, p.title, p.category, p.brand
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `);

    // 総数を取得
    const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      JOIN listings l ON p.id = l."productId"
      JOIN order_items oi ON l.id = oi."listingId"
      JOIN orders o ON oi."orderId" = o.id
      LEFT JOIN sales s ON o.id = s."orderId"
      ${whereClause}
    `);

    res.json({
      success: true,
      data: {
        products: products.map((p) => ({
          ...p,
          revenue: Number(p.revenue),
          orders: Number(p.orders),
          profit: Number(p.profit),
          profitMargin: Number(p.profit_margin).toFixed(1),
        })),
        total: Number(countResult[0]?.count || 0),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching product performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product performance',
    });
  }
});

/**
 * サマリー統計
 * GET /api/advanced-analytics/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // 前期間
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);

    // 現在期間の統計
    const currentStats = await prisma.sale.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { revenue: true, profit: true, cost: true },
      _count: { id: true },
    });

    // 前期間の統計
    const prevStats = await prisma.sale.aggregate({
      where: { createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { revenue: true, profit: true },
      _count: { id: true },
    });

    // 注文数
    const currentOrders = await prisma.order.count({
      where: { orderedAt: { gte: start, lte: end } },
    });
    const prevOrders = await prisma.order.count({
      where: { orderedAt: { gte: prevStart, lte: prevEnd } },
    });

    // アクティブ出品数
    const activeListings = await prisma.listing.count({
      where: { status: 'ACTIVE' },
    });

    // 計算
    const revenue = currentStats._sum.revenue || 0;
    const prevRevenue = prevStats._sum.revenue || 0;
    const profit = currentStats._sum.profit || 0;
    const cost = currentStats._sum.cost || 0;

    res.json({
      success: true,
      data: {
        revenue,
        revenueChange: prevRevenue > 0 ? (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 'N/A',
        orders: currentOrders,
        ordersChange: prevOrders > 0 ? (((currentOrders - prevOrders) / prevOrders) * 100).toFixed(1) : 'N/A',
        profit,
        profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0',
        cost,
        avgOrderValue: currentOrders > 0 ? Math.round(revenue / currentOrders) : 0,
        activeListings,
        period: { start, end, days: periodDays },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary',
    });
  }
});

/**
 * データエクスポート
 * GET /api/advanced-analytics/export
 */
router.get('/export', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type = 'sales', // sales, orders, products
      format = 'csv', // csv, json
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let data: unknown[];
    let filename: string;

    if (type === 'sales') {
      data = await prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          order: {
            select: {
              externalOrderId: true,
              marketplace: true,
              buyerName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      filename = `sales_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    } else if (type === 'orders') {
      data = await prisma.order.findMany({
        where: { orderedAt: { gte: start, lte: end } },
        include: {
          items: {
            include: {
              listing: {
                select: {
                  product: { select: { title: true } },
                },
              },
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
      });
      filename = `orders_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    } else {
      data = await prisma.product.findMany({
        where: { updatedAt: { gte: start, lte: end } },
        select: {
          id: true,
          title: true,
          category: true,
          brand: true,
          price: true,
          status: true,
          createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      filename = `products_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    } else {
      // CSV形式
      if (data.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send('No data');
        return;
      }

      const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}_${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
          } else {
            result[newKey] = value instanceof Date ? value.toISOString() : String(value ?? '');
          }
        }
        return result;
      };

      const flatData = data.map((item) => flattenObject(item as Record<string, unknown>));
      const headers = [...new Set(flatData.flatMap((item) => Object.keys(item)))];
      const csvRows = [
        headers.join(','),
        ...flatData.map((item) =>
          headers.map((h) => `"${(item[h] || '').replace(/"/g, '""')}"`).join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    });
  }
});

export default router;

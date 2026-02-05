import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import PDFDocument from 'pdfkit';

const router = Router();
const log = logger.child({ module: 'analytics' });

/**
 * ダッシュボードKPI取得
 */
router.get('/kpi', async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 並列でデータ取得
    const [
      totalProducts,
      totalListings,
      activeListings,
      soldThisMonth,
      soldThisWeek,
      soldToday,
      outOfStockCount,
      staleListings30,
      staleListings60,
      salesToday,
      salesThisWeek,
      salesThisMonth,
      productsByStatus,
      latestExchangeRate,
    ] = await Promise.all([
      // 総商品数
      prisma.product.count(),
      // 総出品数
      prisma.listing.count(),
      // アクティブ出品数
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      // 今月の販売数
      prisma.listing.count({
        where: {
          status: 'SOLD',
          soldAt: { gte: monthStart },
        },
      }),
      // 今週の販売数
      prisma.listing.count({
        where: {
          status: 'SOLD',
          soldAt: { gte: weekStart },
        },
      }),
      // 今日の販売数
      prisma.listing.count({
        where: {
          status: 'SOLD',
          soldAt: { gte: todayStart },
        },
      }),
      // 在庫切れ商品数
      prisma.product.count({ where: { status: 'OUT_OF_STOCK' } }),
      // 30日以上滞留（出品から30日経過で売れていない）
      prisma.listing.count({
        where: {
          status: 'ACTIVE',
          listedAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      // 60日以上滞留
      prisma.listing.count({
        where: {
          status: 'ACTIVE',
          listedAt: { lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        },
      }),
      // 今日の売上（利益計算用）
      prisma.listing.findMany({
        where: {
          status: 'SOLD',
          soldAt: { gte: todayStart },
        },
        select: {
          listingPrice: true,
          product: {
            select: { price: true },
          },
        },
      }),
      // 今週の売上
      prisma.listing.findMany({
        where: {
          status: 'SOLD',
          soldAt: { gte: weekStart },
        },
        select: {
          listingPrice: true,
          product: {
            select: { price: true },
          },
        },
      }),
      // 今月の売上
      prisma.listing.findMany({
        where: {
          status: 'SOLD',
          soldAt: { gte: monthStart },
        },
        select: {
          listingPrice: true,
          product: {
            select: { price: true },
          },
        },
      }),
      // ステータス別商品数
      prisma.product.groupBy({
        by: ['status'],
        _count: true,
      }),
      // 最新の為替レート
      prisma.exchangeRate.findFirst({
        where: { fromCurrency: 'JPY', toCurrency: 'USD' },
        orderBy: { fetchedAt: 'desc' },
      }),
    ]);

    // 為替レート（DBから取得、なければフォールバック）
    const exchangeRate = latestExchangeRate ? (1 / latestExchangeRate.rate) : 150;

    // 売上・利益計算関数
    const calculateRevenue = (sales: typeof salesToday) => {
      let revenue = 0;
      let cost = 0;
      for (const sale of sales) {
        revenue += sale.listingPrice;
        cost += sale.product?.price || 0;
      }
      const profit = revenue - (cost / exchangeRate);
      return { revenue, profit };
    };

    // 各期間の売上・利益を計算
    const todayStats = calculateRevenue(salesToday);
    const weekStats = calculateRevenue(salesThisWeek);
    const monthStats = calculateRevenue(salesThisMonth);

    // 滞留率計算
    const staleRate = activeListings > 0 ? (staleListings30 / activeListings) * 100 : 0;

    // ストア健全性スコア（0-100）
    // 滞留率が低い、在庫切れが少ない、利益率が高いほど高スコア
    const staleScore = Math.max(0, 100 - staleRate * 2);
    const stockScore = totalProducts > 0 ? Math.max(0, 100 - (outOfStockCount / totalProducts) * 200) : 100;
    const profitScore = monthStats.revenue > 0 ? Math.min(100, (monthStats.profit / monthStats.revenue) * 300) : 50;
    const healthScore = Math.round((staleScore + stockScore + profitScore) / 3);

    res.json({
      success: true,
      data: {
        // 基本KPI
        totalProducts,
        totalListings,
        activeListings,

        // 販売KPI
        soldToday,
        soldThisWeek,
        soldThisMonth,

        // 売上・利益
        revenue: {
          today: Math.round(todayStats.revenue * 100) / 100,
          thisWeek: Math.round(weekStats.revenue * 100) / 100,
          thisMonth: Math.round(monthStats.revenue * 100) / 100,
        },
        grossProfit: {
          today: Math.round(todayStats.profit * 100) / 100,
          thisWeek: Math.round(weekStats.profit * 100) / 100,
          thisMonth: Math.round(monthStats.profit * 100) / 100,
        },

        // 在庫KPI
        outOfStockCount,
        staleListings30,
        staleListings60,
        staleRate: Math.round(staleRate * 10) / 10,

        // 健全性スコア
        healthScore,
        healthScoreBreakdown: {
          staleScore: Math.round(staleScore),
          stockScore: Math.round(stockScore),
          profitScore: Math.round(profitScore),
        },

        // ステータス別
        productsByStatus: productsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),

        // メタデータ
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 売上トレンド（日別）
 */
router.get('/trends/sales', async (req, res, next) => {
  try {
    const { days = 14 } = req.query;
    const daysNum = Math.min(90, Math.max(7, Number(days)));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // 日別の出品数と販売数を取得
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { listedAt: { gte: startDate } },
          { soldAt: { gte: startDate } },
        ],
      },
      select: {
        listedAt: true,
        soldAt: true,
        listingPrice: true,
        status: true,
      },
    });

    // 日別に集計
    const dailyData: Record<string, { date: string; listings: number; sold: number; revenue: number }> = {};

    for (let i = 0; i < daysNum; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      dailyData[dateStr] = { date: dateStr, listings: 0, sold: 0, revenue: 0 };
    }

    for (const listing of listings) {
      if (listing.listedAt) {
        const dateStr = `${listing.listedAt.getMonth() + 1}/${listing.listedAt.getDate()}`;
        if (dailyData[dateStr]) {
          dailyData[dateStr].listings++;
        }
      }
      if (listing.soldAt && listing.status === 'SOLD') {
        const dateStr = `${listing.soldAt.getMonth() + 1}/${listing.soldAt.getDate()}`;
        if (dailyData[dateStr]) {
          dailyData[dateStr].sold++;
          dailyData[dateStr].revenue += listing.listingPrice;
        }
      }
    }

    const trendData = Object.values(dailyData);

    res.json({
      success: true,
      data: trendData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリ別売上ランキング
 */
router.get('/rankings/category', async (req, res, next) => {
  try {
    const { limit = 10, period = 'month' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const soldListings = await prisma.listing.findMany({
      where: {
        status: 'SOLD',
        soldAt: { gte: startDate },
      },
      select: {
        listingPrice: true,
        product: {
          select: {
            category: true,
            price: true,
          },
        },
      },
    });

    // カテゴリ別集計
    const categoryStats: Record<string, { count: number; revenue: number; profit: number }> = {};

    for (const listing of soldListings) {
      const category = listing.product?.category || '未分類';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, revenue: 0, profit: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].revenue += listing.listingPrice;
      categoryStats[category].profit += listing.listingPrice - (listing.product?.price || 0) / 150;
    }

    const rankings = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        soldCount: stats.count,
        revenue: Math.round(stats.revenue * 100) / 100,
        profit: Math.round(stats.profit * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: rankings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ブランド別売上ランキング
 */
router.get('/rankings/brand', async (req, res, next) => {
  try {
    const { limit = 10, period = 'month' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const soldListings = await prisma.listing.findMany({
      where: {
        status: 'SOLD',
        soldAt: { gte: startDate },
      },
      select: {
        listingPrice: true,
        product: {
          select: {
            brand: true,
            price: true,
          },
        },
      },
    });

    // ブランド別集計
    const brandStats: Record<string, { count: number; revenue: number; profit: number }> = {};

    for (const listing of soldListings) {
      const brand = listing.product?.brand || '不明';
      if (!brandStats[brand]) {
        brandStats[brand] = { count: 0, revenue: 0, profit: 0 };
      }
      brandStats[brand].count++;
      brandStats[brand].revenue += listing.listingPrice;
      brandStats[brand].profit += listing.listingPrice - (listing.product?.price || 0) / 150;
    }

    const rankings = Object.entries(brandStats)
      .map(([brand, stats]) => ({
        brand,
        soldCount: stats.count,
        revenue: Math.round(stats.revenue * 100) / 100,
        profit: Math.round(stats.profit * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: rankings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 仕入れ提案（売れ筋に基づく）
 */
router.get('/suggestions/sourcing', async (req, res, next) => {
  try {
    // 過去30日で売れた商品の分析
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const soldProducts = await prisma.listing.findMany({
      where: {
        status: 'SOLD',
        soldAt: { gte: startDate },
      },
      select: {
        product: {
          select: {
            brand: true,
            category: true,
            sellerId: true,
            sellerName: true,
            source: { select: { type: true } },
          },
        },
      },
    });

    // ブランド別・カテゴリ別・セラー別に集計
    const brandCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const sellerCount: Record<string, { name: string; count: number; sourceType: string }> = {};

    for (const listing of soldProducts) {
      const product = listing.product;
      if (!product) continue;

      if (product.brand) {
        brandCount[product.brand] = (brandCount[product.brand] || 0) + 1;
      }
      if (product.category) {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
      }
      if (product.sellerId) {
        if (!sellerCount[product.sellerId]) {
          sellerCount[product.sellerId] = {
            name: product.sellerName || product.sellerId,
            count: 0,
            sourceType: product.source?.type || 'UNKNOWN',
          };
        }
        sellerCount[product.sellerId].count++;
      }
    }

    // 提案生成
    const suggestions = [];

    // トップブランド
    const topBrands = Object.entries(brandCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [brand, count] of topBrands) {
      suggestions.push({
        type: 'brand',
        title: `${brand}をもっと仕入れましょう`,
        description: `過去30日で${count}件売れています`,
        priority: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
        data: { brand, soldCount: count },
      });
    }

    // トップセラー
    const topSellers = Object.entries(sellerCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);
    for (const [sellerId, info] of topSellers) {
      if (info.count >= 2) {
        suggestions.push({
          type: 'seller',
          title: `セラー「${info.name}」の商品をチェック`,
          description: `過去30日で${info.count}件売れています（${info.sourceType}）`,
          priority: info.count >= 5 ? 'high' : 'medium',
          data: { sellerId, sellerName: info.name, soldCount: info.count, sourceType: info.sourceType },
        });
      }
    }

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 財務レポート
// ========================================

/**
 * 損益計算書（Profit/Loss Statement）
 */
router.get('/financial/pnl', async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      end = new Date();
      start = new Date();
      if (period === 'week') {
        start.setDate(start.getDate() - 7);
      } else if (period === 'month') {
        start.setMonth(start.getMonth() - 1);
      } else if (period === 'quarter') {
        start.setMonth(start.getMonth() - 3);
      } else if (period === 'year') {
        start.setFullYear(start.getFullYear() - 1);
      }
    }

    // 注文・売上データを取得
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        paymentStatus: 'PAID',
      },
      include: {
        sales: true,
      },
    });

    // 為替レートを取得
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
      },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = latestRate?.rate || 0.0067; // デフォルト 150円/ドル

    // 集計
    let totalRevenue = 0;
    let totalCost = 0;
    let totalMarketplaceFees = 0;
    let totalPaymentFees = 0;
    let totalShippingCost = 0;
    let totalTax = 0;
    let orderCount = 0;
    let itemCount = 0;

    for (const order of orders) {
      totalRevenue += order.subtotal;
      totalShippingCost += order.shippingCost;
      totalTax += order.tax;
      totalMarketplaceFees += order.marketplaceFee;
      totalPaymentFees += order.paymentFee;
      orderCount++;

      for (const sale of order.sales) {
        itemCount += sale.quantity;
        if (sale.costPrice) {
          // 仕入価格は円なのでドルに変換
          totalCost += sale.costPrice * exchangeRate;
        }
      }
    }

    // 総手数料
    const totalFees = totalMarketplaceFees + totalPaymentFees;

    // 粗利（売上 - 仕入原価）
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // 営業利益（粗利 - 手数料 - 送料）
    const operatingProfit = grossProfit - totalFees - totalShippingCost;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

    // 純利益（営業利益 - 税金）
    const netProfit = operatingProfit - totalTax;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 平均値
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const avgItemValue = itemCount > 0 ? totalRevenue / itemCount : 0;
    const avgProfitPerOrder = orderCount > 0 ? netProfit / orderCount : 0;

    res.json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: period,
        },
        summary: {
          orderCount,
          itemCount,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          avgItemValue: Math.round(avgItemValue * 100) / 100,
          avgProfitPerOrder: Math.round(avgProfitPerOrder * 100) / 100,
        },
        revenue: {
          gross: Math.round(totalRevenue * 100) / 100,
          shipping: Math.round(totalShippingCost * 100) / 100,
          total: Math.round((totalRevenue + totalShippingCost) * 100) / 100,
        },
        costs: {
          cogs: Math.round(totalCost * 100) / 100, // Cost of Goods Sold
          marketplaceFees: Math.round(totalMarketplaceFees * 100) / 100,
          paymentFees: Math.round(totalPaymentFees * 100) / 100,
          totalFees: Math.round(totalFees * 100) / 100,
          shipping: Math.round(totalShippingCost * 100) / 100,
          tax: Math.round(totalTax * 100) / 100,
        },
        profit: {
          gross: Math.round(grossProfit * 100) / 100,
          grossMargin: Math.round(grossMargin * 10) / 10,
          operating: Math.round(operatingProfit * 100) / 100,
          operatingMargin: Math.round(operatingMargin * 10) / 10,
          net: Math.round(netProfit * 100) / 100,
          netMargin: Math.round(netMargin * 10) / 10,
        },
        currency: 'USD',
        exchangeRate: Math.round((1 / exchangeRate) * 100) / 100,
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス別手数料内訳
 */
router.get('/financial/fees', async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      end = new Date();
      start = new Date();
      if (period === 'week') {
        start.setDate(start.getDate() - 7);
      } else if (period === 'month') {
        start.setMonth(start.getMonth() - 1);
      } else if (period === 'quarter') {
        start.setMonth(start.getMonth() - 3);
      } else if (period === 'year') {
        start.setFullYear(start.getFullYear() - 1);
      }
    }

    // マーケットプレイス別に集計
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        paymentStatus: 'PAID',
      },
      select: {
        marketplace: true,
        subtotal: true,
        shippingCost: true,
        marketplaceFee: true,
        paymentFee: true,
      },
    });

    const feesByMarketplace: Record<string, {
      orderCount: number;
      revenue: number;
      marketplaceFees: number;
      paymentFees: number;
      totalFees: number;
      effectiveFeeRate: number;
    }> = {};

    for (const order of orders) {
      const mp = order.marketplace;
      if (!feesByMarketplace[mp]) {
        feesByMarketplace[mp] = {
          orderCount: 0,
          revenue: 0,
          marketplaceFees: 0,
          paymentFees: 0,
          totalFees: 0,
          effectiveFeeRate: 0,
        };
      }
      feesByMarketplace[mp].orderCount++;
      feesByMarketplace[mp].revenue += order.subtotal;
      feesByMarketplace[mp].marketplaceFees += order.marketplaceFee;
      feesByMarketplace[mp].paymentFees += order.paymentFee;
      feesByMarketplace[mp].totalFees += order.marketplaceFee + order.paymentFee;
    }

    // 実効手数料率を計算
    for (const mp of Object.keys(feesByMarketplace)) {
      const data = feesByMarketplace[mp];
      data.effectiveFeeRate = data.revenue > 0
        ? Math.round((data.totalFees / data.revenue) * 1000) / 10
        : 0;
      data.revenue = Math.round(data.revenue * 100) / 100;
      data.marketplaceFees = Math.round(data.marketplaceFees * 100) / 100;
      data.paymentFees = Math.round(data.paymentFees * 100) / 100;
      data.totalFees = Math.round(data.totalFees * 100) / 100;
    }

    // 合計
    const totals = Object.values(feesByMarketplace).reduce(
      (acc, mp) => ({
        orderCount: acc.orderCount + mp.orderCount,
        revenue: acc.revenue + mp.revenue,
        marketplaceFees: acc.marketplaceFees + mp.marketplaceFees,
        paymentFees: acc.paymentFees + mp.paymentFees,
        totalFees: acc.totalFees + mp.totalFees,
        effectiveFeeRate: 0,
      }),
      { orderCount: 0, revenue: 0, marketplaceFees: 0, paymentFees: 0, totalFees: 0, effectiveFeeRate: 0 }
    );
    totals.effectiveFeeRate = totals.revenue > 0
      ? Math.round((totals.totalFees / totals.revenue) * 1000) / 10
      : 0;

    res.json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        byMarketplace: feesByMarketplace,
        totals,
        currency: 'USD',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ROI計算（商品・カテゴリ別）
 */
router.get('/financial/roi', async (req, res, next) => {
  try {
    const { groupBy = 'category', period = 'month', limit = 20 } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // 為替レートを取得
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
      },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = latestRate?.rate || 0.0067;

    // 売上データを取得
    const sales = await prisma.sale.findMany({
      where: {
        order: {
          paymentStatus: 'PAID',
          orderedAt: { gte: startDate },
        },
      },
      include: {
        order: {
          select: {
            marketplaceFee: true,
            paymentFee: true,
            orderedAt: true,
          },
        },
      },
    });

    // 商品情報も取得
    const productIds = [...new Set(sales.filter(s => s.productId).map(s => s.productId!))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        category: true,
        brand: true,
        price: true,
      },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // グループ別に集計
    const roiData: Record<string, {
      name: string;
      itemsSold: number;
      revenue: number;
      cost: number;
      fees: number;
      profit: number;
      roi: number;
      profitMargin: number;
    }> = {};

    for (const sale of sales) {
      const product = sale.productId ? productMap.get(sale.productId) : null;
      let groupKey: string;
      let groupName: string;

      if (groupBy === 'brand') {
        groupKey = product?.brand || '不明';
        groupName = groupKey;
      } else if (groupBy === 'product') {
        groupKey = sale.productId || sale.sku;
        groupName = sale.title;
      } else {
        // category
        groupKey = product?.category || '未分類';
        groupName = groupKey;
      }

      if (!roiData[groupKey]) {
        roiData[groupKey] = {
          name: groupName,
          itemsSold: 0,
          revenue: 0,
          cost: 0,
          fees: 0,
          profit: 0,
          roi: 0,
          profitMargin: 0,
        };
      }

      const data = roiData[groupKey];
      data.itemsSold += sale.quantity;
      data.revenue += sale.totalPrice;

      // コスト計算（仕入価格）
      if (sale.costPrice) {
        data.cost += sale.costPrice * exchangeRate;
      } else if (product?.price) {
        data.cost += product.price * exchangeRate;
      }

      // 手数料は売上按分で計算
      if (sale.order) {
        const orderFees = sale.order.marketplaceFee + sale.order.paymentFee;
        data.fees += orderFees; // 簡易計算（実際は按分が必要）
      }
    }

    // ROI と利益率を計算
    for (const key of Object.keys(roiData)) {
      const data = roiData[key];
      data.profit = data.revenue - data.cost - data.fees;
      data.roi = data.cost > 0 ? ((data.profit / data.cost) * 100) : 0;
      data.profitMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100) : 0;

      // 丸め処理
      data.revenue = Math.round(data.revenue * 100) / 100;
      data.cost = Math.round(data.cost * 100) / 100;
      data.fees = Math.round(data.fees * 100) / 100;
      data.profit = Math.round(data.profit * 100) / 100;
      data.roi = Math.round(data.roi * 10) / 10;
      data.profitMargin = Math.round(data.profitMargin * 10) / 10;
    }

    // ROI順でソート
    const sortedData = Object.entries(roiData)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, Number(limit));

    // 全体サマリー
    const totals = Object.values(roiData).reduce(
      (acc, d) => ({
        itemsSold: acc.itemsSold + d.itemsSold,
        revenue: acc.revenue + d.revenue,
        cost: acc.cost + d.cost,
        fees: acc.fees + d.fees,
        profit: acc.profit + d.profit,
      }),
      { itemsSold: 0, revenue: 0, cost: 0, fees: 0, profit: 0 }
    );
    const overallRoi = totals.cost > 0 ? ((totals.profit / totals.cost) * 100) : 0;
    const overallMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        groupBy,
        period,
        items: sortedData,
        totals: {
          ...totals,
          revenue: Math.round(totals.revenue * 100) / 100,
          cost: Math.round(totals.cost * 100) / 100,
          fees: Math.round(totals.fees * 100) / 100,
          profit: Math.round(totals.profit * 100) / 100,
          roi: Math.round(overallRoi * 10) / 10,
          profitMargin: Math.round(overallMargin * 10) / 10,
        },
        currency: 'USD',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 税務用エクスポート
 */
router.get('/financial/tax-export', async (req, res, next) => {
  try {
    const { year, quarter, format = 'json' } = req.query;

    // 期間計算
    const currentYear = new Date().getFullYear();
    const targetYear = year ? Number(year) : currentYear;

    let startDate: Date;
    let endDate: Date;

    if (quarter) {
      const q = Number(quarter);
      startDate = new Date(targetYear, (q - 1) * 3, 1);
      endDate = new Date(targetYear, q * 3, 0, 23, 59, 59);
    } else {
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    }

    // 注文データを取得
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: startDate, lte: endDate },
        paymentStatus: 'PAID',
      },
      include: {
        sales: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    // 為替レート履歴を取得（月別）
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        fetchedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { fetchedAt: 'desc' },
    });

    // 月別の為替レートマップを作成
    const monthlyRates: Record<string, number> = {};
    for (const rate of exchangeRates) {
      const monthKey = `${rate.fetchedAt.getFullYear()}-${rate.fetchedAt.getMonth() + 1}`;
      if (!monthlyRates[monthKey]) {
        monthlyRates[monthKey] = rate.rate;
      }
    }
    const defaultRate = 0.0067;

    // 月別サマリー
    const monthlySummary: Record<string, {
      month: string;
      orderCount: number;
      itemCount: number;
      revenueUsd: number;
      revenueJpy: number;
      costJpy: number;
      feesUsd: number;
      feesJpy: number;
      profitJpy: number;
      taxUsd: number;
      taxJpy: number;
    }> = {};

    // 取引明細
    const transactions: Array<{
      date: string;
      orderId: string;
      marketplace: string;
      items: string;
      revenueUsd: number;
      revenueJpy: number;
      costJpy: number;
      feesUsd: number;
      profitJpy: number;
    }> = [];

    for (const order of orders) {
      const monthKey = `${order.orderedAt.getFullYear()}-${String(order.orderedAt.getMonth() + 1).padStart(2, '0')}`;
      const rate = monthlyRates[monthKey] || defaultRate;
      const jpyRate = 1 / rate;

      if (!monthlySummary[monthKey]) {
        monthlySummary[monthKey] = {
          month: monthKey,
          orderCount: 0,
          itemCount: 0,
          revenueUsd: 0,
          revenueJpy: 0,
          costJpy: 0,
          feesUsd: 0,
          feesJpy: 0,
          profitJpy: 0,
          taxUsd: 0,
          taxJpy: 0,
        };
      }

      const summary = monthlySummary[monthKey];
      summary.orderCount++;
      summary.revenueUsd += order.subtotal;
      summary.revenueJpy += order.subtotal * jpyRate;
      summary.feesUsd += order.marketplaceFee + order.paymentFee;
      summary.feesJpy += (order.marketplaceFee + order.paymentFee) * jpyRate;
      summary.taxUsd += order.tax;
      summary.taxJpy += order.tax * jpyRate;

      let orderCostJpy = 0;
      const itemTitles: string[] = [];

      for (const sale of order.sales) {
        summary.itemCount += sale.quantity;
        if (sale.costPrice) {
          orderCostJpy += sale.costPrice;
          summary.costJpy += sale.costPrice;
        }
        itemTitles.push(`${sale.title} x${sale.quantity}`);
      }

      summary.profitJpy += (order.subtotal * jpyRate) - orderCostJpy - ((order.marketplaceFee + order.paymentFee) * jpyRate);

      // 取引明細に追加
      transactions.push({
        date: order.orderedAt.toISOString().split('T')[0],
        orderId: order.marketplaceOrderId,
        marketplace: order.marketplace,
        items: itemTitles.join(', '),
        revenueUsd: Math.round(order.subtotal * 100) / 100,
        revenueJpy: Math.round(order.subtotal * jpyRate),
        costJpy: Math.round(orderCostJpy),
        feesUsd: Math.round((order.marketplaceFee + order.paymentFee) * 100) / 100,
        profitJpy: Math.round((order.subtotal * jpyRate) - orderCostJpy - ((order.marketplaceFee + order.paymentFee) * jpyRate)),
      });
    }

    // 丸め処理
    for (const summary of Object.values(monthlySummary)) {
      summary.revenueUsd = Math.round(summary.revenueUsd * 100) / 100;
      summary.revenueJpy = Math.round(summary.revenueJpy);
      summary.costJpy = Math.round(summary.costJpy);
      summary.feesUsd = Math.round(summary.feesUsd * 100) / 100;
      summary.feesJpy = Math.round(summary.feesJpy);
      summary.profitJpy = Math.round(summary.profitJpy);
      summary.taxUsd = Math.round(summary.taxUsd * 100) / 100;
      summary.taxJpy = Math.round(summary.taxJpy);
    }

    // 年間合計
    const yearTotal = Object.values(monthlySummary).reduce(
      (acc, m) => ({
        orderCount: acc.orderCount + m.orderCount,
        itemCount: acc.itemCount + m.itemCount,
        revenueUsd: acc.revenueUsd + m.revenueUsd,
        revenueJpy: acc.revenueJpy + m.revenueJpy,
        costJpy: acc.costJpy + m.costJpy,
        feesUsd: acc.feesUsd + m.feesUsd,
        feesJpy: acc.feesJpy + m.feesJpy,
        profitJpy: acc.profitJpy + m.profitJpy,
        taxUsd: acc.taxUsd + m.taxUsd,
        taxJpy: acc.taxJpy + m.taxJpy,
      }),
      {
        orderCount: 0, itemCount: 0, revenueUsd: 0, revenueJpy: 0,
        costJpy: 0, feesUsd: 0, feesJpy: 0, profitJpy: 0, taxUsd: 0, taxJpy: 0,
      }
    );

    const responseData = {
      period: {
        year: targetYear,
        quarter: quarter ? Number(quarter) : null,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        total: {
          ...yearTotal,
          revenueUsd: Math.round(yearTotal.revenueUsd * 100) / 100,
          feesUsd: Math.round(yearTotal.feesUsd * 100) / 100,
          taxUsd: Math.round(yearTotal.taxUsd * 100) / 100,
        },
        monthly: Object.values(monthlySummary).sort((a, b) => a.month.localeCompare(b.month)),
      },
      transactions,
      meta: {
        generatedAt: new Date().toISOString(),
        recordCount: transactions.length,
        baseCurrency: 'USD',
        reportCurrency: 'JPY',
      },
    };

    if (format === 'csv') {
      // CSVヘッダー
      const csvHeader = '日付,注文ID,マーケットプレイス,商品,売上(USD),売上(JPY),仕入原価(JPY),手数料(USD),利益(JPY)\n';
      const csvRows = transactions.map(t =>
        `${t.date},${t.orderId},${t.marketplace},"${t.items.replace(/"/g, '""')}",${t.revenueUsd},${t.revenueJpy},${t.costJpy},${t.feesUsd},${t.profitJpy}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tax-report-${targetYear}${quarter ? `-Q${quarter}` : ''}.csv"`);
      res.send('\uFEFF' + csvHeader + csvRows); // BOM for Excel
    } else {
      res.json({
        success: true,
        data: responseData,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 日別売上推移（財務観点）
 */
router.get('/financial/daily', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(90, Math.max(7, Number(days)));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // 為替レート
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = latestRate?.rate || 0.0067;

    // 注文データ
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: startDate },
        paymentStatus: 'PAID',
      },
      include: {
        sales: true,
      },
    });

    // 日別に集計
    const dailyData: Record<string, {
      date: string;
      orders: number;
      items: number;
      revenue: number;
      cost: number;
      fees: number;
      profit: number;
    }> = {};

    for (let i = 0; i < daysNum; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        orders: 0,
        items: 0,
        revenue: 0,
        cost: 0,
        fees: 0,
        profit: 0,
      };
    }

    for (const order of orders) {
      const dateStr = order.orderedAt.toISOString().split('T')[0];
      if (!dailyData[dateStr]) continue;

      const day = dailyData[dateStr];
      day.orders++;
      day.revenue += order.subtotal;
      day.fees += order.marketplaceFee + order.paymentFee;

      for (const sale of order.sales) {
        day.items += sale.quantity;
        if (sale.costPrice) {
          day.cost += sale.costPrice * exchangeRate;
        }
      }
    }

    // 利益計算と丸め
    for (const day of Object.values(dailyData)) {
      day.profit = day.revenue - day.cost - day.fees;
      day.revenue = Math.round(day.revenue * 100) / 100;
      day.cost = Math.round(day.cost * 100) / 100;
      day.fees = Math.round(day.fees * 100) / 100;
      day.profit = Math.round(day.profit * 100) / 100;
    }

    const sortedData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: sortedData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PDFレポートエクスポート
 */
router.get('/financial/export-pdf', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    let startDate = new Date();
    let endDate = new Date();

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // データ取得
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: startDate, lte: endDate },
        paymentStatus: 'PAID',
      },
      include: { sales: true },
    });

    // 為替レート
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = latestRate?.rate || 0.0067;

    // 集計
    let totalRevenue = 0;
    let totalCost = 0;
    let totalFees = 0;
    let orderCount = orders.length;
    let itemCount = 0;

    for (const order of orders) {
      totalRevenue += order.subtotal;
      totalFees += order.marketplaceFee + order.paymentFee;
      for (const sale of order.sales) {
        itemCount += sale.quantity;
        if (sale.costPrice) {
          totalCost += sale.costPrice * exchangeRate;
        }
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalFees;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // PDF生成
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="financial-report-${period}-${new Date().toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // ヘッダー
    doc.fontSize(24).text('RAKUDA Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // サマリーセクション
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Orders: ${orderCount}`);
    doc.text(`Total Items Sold: ${itemCount}`);
    doc.text(`Average Order Value: $${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : '0.00'}`);
    doc.moveDown(2);

    // 収益セクション
    doc.fontSize(16).text('Revenue', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Gross Revenue: $${totalRevenue.toFixed(2)}`);
    doc.moveDown(2);

    // コストセクション
    doc.fontSize(16).text('Costs', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Cost of Goods (COGS): $${totalCost.toFixed(2)}`);
    doc.text(`Marketplace Fees: $${totalFees.toFixed(2)}`);
    doc.text(`Total Costs: $${(totalCost + totalFees).toFixed(2)}`);
    doc.moveDown(2);

    // 利益セクション
    doc.fontSize(16).text('Profit', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Gross Profit: $${grossProfit.toFixed(2)} (${grossMargin.toFixed(1)}%)`);
    doc.text(`Net Profit: $${netProfit.toFixed(2)} (${netMargin.toFixed(1)}%)`);
    doc.moveDown(2);

    // 追加情報
    doc.fontSize(10).fillColor('gray');
    doc.text(`Exchange Rate: 1 USD = ${Math.round(1 / exchangeRate)} JPY`);
    doc.text('Note: All amounts are in USD unless otherwise specified.');

    doc.end();
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRouter };

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

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
      recentSales,
      productsByStatus,
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
      // 最近の売上（利益計算用）
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
    ]);

    // 売上・利益計算
    let totalRevenue = 0;
    let totalCost = 0;
    for (const sale of recentSales) {
      totalRevenue += sale.listingPrice;
      totalCost += sale.product?.price || 0;
    }
    const grossProfit = totalRevenue - totalCost / 150; // 仮のレート変換

    // 滞留率計算
    const staleRate = activeListings > 0 ? (staleListings30 / activeListings) * 100 : 0;

    // ストア健全性スコア（0-100）
    // 滞留率が低い、在庫切れが少ない、利益率が高いほど高スコア
    const staleScore = Math.max(0, 100 - staleRate * 2);
    const stockScore = totalProducts > 0 ? Math.max(0, 100 - (outOfStockCount / totalProducts) * 200) : 100;
    const profitScore = totalRevenue > 0 ? Math.min(100, (grossProfit / totalRevenue) * 300) : 50;
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
          today: 0, // TODO: 実装
          thisWeek: 0,
          thisMonth: Math.round(totalRevenue * 100) / 100,
        },
        grossProfit: {
          today: 0,
          thisWeek: 0,
          thisMonth: Math.round(grossProfit * 100) / 100,
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

export { router as analyticsRouter };

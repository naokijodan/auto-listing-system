// @ts-nocheck
/**
 * eBayレポート自動生成API
 * Phase 122: 売上・パフォーマンスレポート
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';

const router = Router();

// レポートタイプ
const REPORT_TYPES = [
  { type: 'SALES_SUMMARY', name: '売上サマリー', description: '売上・利益の概要' },
  { type: 'LISTING_PERFORMANCE', name: '出品パフォーマンス', description: '閲覧数・コンバージョン率' },
  { type: 'INVENTORY_STATUS', name: '在庫状況', description: '在庫レベル・補充推奨' },
  { type: 'COMPETITOR_ANALYSIS', name: '競合分析', description: '競合価格比較' },
  { type: 'PROMOTION_EFFECTIVENESS', name: 'プロモーション効果', description: 'セール・クーポン効果' },
  { type: 'AB_TEST_RESULTS', name: 'A/Bテスト結果', description: 'テスト結果サマリー' },
  { type: 'MULTILINGUAL_COVERAGE', name: '多言語カバレッジ', description: '翻訳状況' },
];

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/ebay-reports/dashboard:
 *   get:
 *     summary: レポートダッシュボード
 *     tags: [eBay Reports]
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 最近生成されたレポート（メタデータから）
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      select: { marketplaceData: true, status: true, listingPrice: true, createdAt: true },
    });

    // 基本統計を計算
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
    const totalRevenue = listings
      .filter(l => l.status === 'SOLD')
      .reduce((sum, l) => sum + l.listingPrice, 0);

    // 売上データ（過去30日）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        listing: { marketplace: 'EBAY' },
      },
      include: {
        listing: true,
      },
    });

    const salesStats = {
      count: sales.length,
      revenue: sales.reduce((sum, s) => sum + (s.salePrice || 0), 0),
      avgOrderValue: sales.length > 0
        ? sales.reduce((sum, s) => sum + (s.salePrice || 0), 0) / sales.length
        : 0,
    };

    res.json({
      stats: {
        totalListings,
        activeListings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        salesLast30Days: salesStats,
      },
      reportTypes: REPORT_TYPES,
      scheduledReports: [], // 将来的にスケジュールされたレポートを表示
    });
  } catch (error) {
    logger.error('Reports dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ========================================
// レポートタイプ一覧
// ========================================

/**
 * @swagger
 * /api/ebay-reports/types:
 *   get:
 *     summary: レポートタイプ一覧
 *     tags: [eBay Reports]
 */
router.get('/types', async (req: Request, res: Response) => {
  res.json({
    types: REPORT_TYPES,
    frequencies: [
      { value: 'DAILY', label: '日次' },
      { value: 'WEEKLY', label: '週次' },
      { value: 'MONTHLY', label: '月次' },
      { value: 'CUSTOM', label: 'カスタム' },
    ],
    formats: [
      { value: 'JSON', label: 'JSON' },
      { value: 'CSV', label: 'CSV' },
      { value: 'PDF', label: 'PDF' },
      { value: 'EXCEL', label: 'Excel' },
    ],
  });
});

// ========================================
// 売上サマリーレポート生成
// ========================================

const generateReportSchema = z.object({
  type: z.enum(['SALES_SUMMARY', 'LISTING_PERFORMANCE', 'INVENTORY_STATUS', 'COMPETITOR_ANALYSIS', 'PROMOTION_EFFECTIVENESS', 'AB_TEST_RESULTS', 'MULTILINGUAL_COVERAGE']),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['JSON', 'CSV', 'PDF', 'EXCEL']).default('JSON'),
});

/**
 * @swagger
 * /api/ebay-reports/generate:
 *   post:
 *     summary: レポート生成
 *     tags: [eBay Reports]
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const body = generateReportSchema.parse(req.body);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    let reportData: Record<string, unknown> = {};

    switch (body.type) {
      case 'SALES_SUMMARY':
        reportData = await generateSalesSummary(startDate, endDate);
        break;
      case 'LISTING_PERFORMANCE':
        reportData = await generateListingPerformance(startDate, endDate);
        break;
      case 'INVENTORY_STATUS':
        reportData = await generateInventoryStatus();
        break;
      case 'COMPETITOR_ANALYSIS':
        reportData = await generateCompetitorAnalysis();
        break;
      case 'PROMOTION_EFFECTIVENESS':
        reportData = await generatePromotionEffectiveness(startDate, endDate);
        break;
      case 'AB_TEST_RESULTS':
        reportData = await generateABTestResults();
        break;
      case 'MULTILINGUAL_COVERAGE':
        reportData = await generateMultilingualCoverage();
        break;
    }

    const report = {
      id: `report_${Date.now()}`,
      type: body.type,
      typeName: REPORT_TYPES.find(t => t.type === body.type)?.name,
      period: { startDate: body.startDate, endDate: body.endDate },
      generatedAt: new Date().toISOString(),
      format: body.format,
      data: reportData,
    };

    logger.info(`Generated report: ${report.id} (${body.type})`);

    // CSV形式の場合
    if (body.format === 'CSV') {
      const csv = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${body.type}_${body.startDate}_${body.endDate}.csv`);
      return res.send(csv);
    }

    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ========================================
// 個別レポート生成関数
// ========================================

async function generateSalesSummary(startDate: Date, endDate: Date) {
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      listing: { marketplace: 'EBAY' },
    },
    include: {
      listing: {
        include: { product: true },
      },
    },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalCost = sales.reduce((sum, s) => sum + (s.listing?.product?.price || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  // 日別売上
  const dailySales: Record<string, { count: number; revenue: number }> = {};
  sales.forEach(sale => {
    const date = sale.createdAt.toISOString().split('T')[0];
    if (!dailySales[date]) {
      dailySales[date] = { count: 0, revenue: 0 };
    }
    dailySales[date].count++;
    dailySales[date].revenue += sale.salePrice || 0;
  });

  // カテゴリ別売上
  const categorySales: Record<string, { count: number; revenue: number }> = {};
  sales.forEach(sale => {
    const category = sale.listing?.product?.category || 'Unknown';
    if (!categorySales[category]) {
      categorySales[category] = { count: 0, revenue: 0 };
    }
    categorySales[category].count++;
    categorySales[category].revenue += sale.salePrice || 0;
  });

  return {
    summary: {
      totalSales: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0,
      avgOrderValue: sales.length > 0 ? Math.round((totalRevenue / sales.length) * 100) / 100 : 0,
    },
    dailySales: Object.entries(dailySales)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    categorySales: Object.entries(categorySales)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue),
    topProducts: sales
      .reduce((acc: Record<string, { title: string; count: number; revenue: number }>, sale) => {
        const productId = sale.listing?.productId || 'unknown';
        if (!acc[productId]) {
          acc[productId] = {
            title: sale.listing?.product?.titleEn || sale.listing?.product?.title || 'Unknown',
            count: 0,
            revenue: 0,
          };
        }
        acc[productId].count++;
        acc[productId].revenue += sale.salePrice || 0;
        return acc;
      }, {})
  };
}

async function generateListingPerformance(startDate: Date, endDate: Date) {
  const listings = await prisma.listing.findMany({
    where: {
      marketplace: 'EBAY',
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      product: true,
      sales: true,
    },
  });

  const performanceData = listings.map(listing => {
    const data = listing.marketplaceData as Record<string, unknown>;
    const views = (data?.views as number) || 0;
    const clicks = (data?.clicks as number) || 0;
    const salesCount = listing.sales.length;

    return {
      listingId: listing.id,
      title: listing.product.titleEn || listing.product.title,
      status: listing.status,
      price: listing.listingPrice,
      views,
      clicks,
      sales: salesCount,
      conversionRate: views > 0 ? Math.round((salesCount / views) * 10000) / 100 : 0,
      clickRate: views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0,
    };
  });

  // 集計
  const totalViews = performanceData.reduce((sum, p) => sum + p.views, 0);
  const totalClicks = performanceData.reduce((sum, p) => sum + p.clicks, 0);
  const totalSales = performanceData.reduce((sum, p) => sum + p.sales, 0);

  return {
    summary: {
      totalListings: listings.length,
      totalViews,
      totalClicks,
      totalSales,
      avgConversionRate: totalViews > 0 ? Math.round((totalSales / totalViews) * 10000) / 100 : 0,
      avgClickRate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 10000) / 100 : 0,
    },
    listings: performanceData.sort((a, b) => b.sales - a.sales).slice(0, 50),
    lowPerformers: performanceData
      .filter(p => p.views > 100 && p.conversionRate < 1)
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 10),
  };
}

async function generateInventoryStatus() {
  const products = await prisma.product.findMany({
    include: {
      listings: {
        where: { marketplace: 'EBAY' },
      },
    },
  });

  const inventoryData = products.map(product => {
    const listing = product.listings[0];
    const data = listing?.marketplaceData as Record<string, unknown>;
    const stock = (data?.quantity as number) || 0;

    return {
      productId: product.id,
      title: product.titleEn || product.title,
      status: product.status,
      stock,
      listingStatus: listing?.status || 'NO_LISTING',
      needsRestock: stock < 5,
      outOfStock: stock === 0,
    };
  });

  const needsRestock = inventoryData.filter(i => i.needsRestock && !i.outOfStock);
  const outOfStock = inventoryData.filter(i => i.outOfStock);

  return {
    summary: {
      totalProducts: products.length,
      inStock: inventoryData.filter(i => i.stock > 0).length,
      lowStock: needsRestock.length,
      outOfStock: outOfStock.length,
    },
    needsRestock: needsRestock.slice(0, 20),
    outOfStock: outOfStock.slice(0, 20),
  };
}

async function generateCompetitorAnalysis() {
  // 競合データを集計
  const listings = await prisma.listing.findMany({
    where: { marketplace: 'EBAY' },
    include: { product: true },
  });

  const analysisData = listings.map(listing => {
    const data = listing.marketplaceData as Record<string, unknown>;
    const competitors = (data?.competitors as Array<Record<string, unknown>>) || [];

    const avgCompetitorPrice = competitors.length > 0
      ? competitors.reduce((sum, c) => sum + ((c.price as number) || 0), 0) / competitors.length
      : 0;

    const priceDiff = avgCompetitorPrice > 0
      ? ((listing.listingPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100
      : 0;

    return {
      listingId: listing.id,
      title: listing.product.titleEn || listing.product.title,
      ourPrice: listing.listingPrice,
      avgCompetitorPrice: Math.round(avgCompetitorPrice * 100) / 100,
      priceDifference: Math.round(priceDiff * 100) / 100,
      competitorCount: competitors.length,
      isCompetitive: priceDiff <= 10 && priceDiff >= -10,
    };
  });

  return {
    summary: {
      totalAnalyzed: analysisData.length,
      competitive: analysisData.filter(a => a.isCompetitive).length,
      aboveMarket: analysisData.filter(a => a.priceDifference > 10).length,
      belowMarket: analysisData.filter(a => a.priceDifference < -10).length,
    },
    listings: analysisData.sort((a, b) => b.priceDifference - a.priceDifference).slice(0, 30),
    recommendations: analysisData
      .filter(a => a.priceDifference > 15)
      .map(a => ({
        listingId: a.listingId,
        title: a.title,
        currentPrice: a.ourPrice,
        recommendedPrice: Math.round(a.avgCompetitorPrice * 1.05 * 100) / 100,
        potentialSavings: Math.round((a.ourPrice - a.avgCompetitorPrice * 1.05) * 100) / 100,
      })),
  };
}

async function generatePromotionEffectiveness(startDate: Date, endDate: Date) {
  const listings = await prisma.listing.findMany({
    where: { marketplace: 'EBAY' },
    include: { sales: { where: { createdAt: { gte: startDate, lte: endDate } } } },
  });

  const promotionData: Array<{
    promotionId: string;
    name: string;
    type: string;
    discountValue: number;
    salesCount: number;
    revenue: number;
  }> = [];

  listings.forEach(listing => {
    const data = listing.marketplaceData as Record<string, unknown>;
    const promotions = (data?.promotions as Array<Record<string, unknown>>) || [];

    promotions.forEach(promo => {
      const existing = promotionData.find(p => p.promotionId === promo.id);
      if (existing) {
        existing.salesCount += listing.sales.length;
        existing.revenue += listing.sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
      } else {
        promotionData.push({
          promotionId: promo.id as string,
          name: promo.name as string,
          type: promo.type as string,
          discountValue: promo.discountValue as number,
          salesCount: listing.sales.length,
          revenue: listing.sales.reduce((sum, s) => sum + (s.salePrice || 0), 0),
        });
      }
    });
  });

  return {
    summary: {
      totalPromotions: promotionData.length,
      totalSales: promotionData.reduce((sum, p) => sum + p.salesCount, 0),
      totalRevenue: Math.round(promotionData.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100,
    },
    promotions: promotionData.sort((a, b) => b.revenue - a.revenue),
  };
}

async function generateABTestResults() {
  const tests = await prisma.aBTest.findMany({
    where: { status: 'COMPLETED' },
    include: { variants: true },
    orderBy: { completedAt: 'desc' },
    take: 20,
  });

  const results = tests.map(test => {
    const control = test.variants.find(v => v.isControl);
    const winner = test.variants.find(v => v.id === test.winningVariantId);

    const controlRate = control && control.views > 0
      ? (control.sales / control.views) * 100
      : 0;
    const winnerRate = winner && winner.views > 0
      ? (winner.sales / winner.views) * 100
      : 0;

    return {
      testId: test.id,
      name: test.name,
      testType: test.testType,
      isSignificant: test.isSignificant,
      controlConversionRate: Math.round(controlRate * 100) / 100,
      winnerConversionRate: Math.round(winnerRate * 100) / 100,
      lift: controlRate > 0 ? Math.round(((winnerRate - controlRate) / controlRate) * 10000) / 100 : 0,
      winnerName: winner?.name || 'N/A',
      completedAt: test.completedAt,
    };
  });

  const significantTests = results.filter(r => r.isSignificant);
  const avgLift = significantTests.length > 0
    ? significantTests.reduce((sum, r) => sum + r.lift, 0) / significantTests.length
    : 0;

  return {
    summary: {
      totalTests: results.length,
      significantTests: significantTests.length,
      avgLift: Math.round(avgLift * 100) / 100,
    },
    tests: results,
  };
}

async function generateMultilingualCoverage() {
  const listings = await prisma.listing.findMany({
    where: { marketplace: 'EBAY' },
    include: { product: true },
  });

  const languageStats: Record<string, number> = {};
  let translatedCount = 0;

  listings.forEach(listing => {
    const data = listing.marketplaceData as Record<string, unknown>;
    const translations = data?.translations as Record<string, unknown>;

    if (translations && Object.keys(translations).length > 0) {
      translatedCount++;
      Object.keys(translations).forEach(lang => {
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      });
    }
  });

  return {
    summary: {
      totalListings: listings.length,
      translatedListings: translatedCount,
      coverageRate: listings.length > 0
        ? Math.round((translatedCount / listings.length) * 10000) / 100
        : 0,
      languagesUsed: Object.keys(languageStats).length,
    },
    byLanguage: Object.entries(languageStats)
      .map(([code, count]) => ({ language: code, count }))
      .sort((a, b) => b.count - a.count),
    untranslated: listings
      .filter(l => {
        const data = l.marketplaceData as Record<string, unknown>;
        return !data?.translations || Object.keys(data.translations as object).length === 0;
      })
      .slice(0, 20)
      .map(l => ({
        listingId: l.id,
        title: l.product.titleEn || l.product.title,
      })),
  };
}

// CSV変換ヘルパー
function convertToCSV(data: Record<string, unknown>): string {
  const rows: string[] = [];

  // サマリーセクション
  if (data.summary) {
    rows.push('=== Summary ===');
    Object.entries(data.summary as Record<string, unknown>).forEach(([key, value]) => {
      rows.push(`${key},${value}`);
    });
    rows.push('');
  }

  // リストデータ
  const listKeys = Object.keys(data).filter(k => Array.isArray(data[k]));
  listKeys.forEach(key => {
    const list = data[key] as Array<Record<string, unknown>>;
    if (list.length > 0) {
      rows.push(`=== ${key} ===`);
      const headers = Object.keys(list[0]);
      rows.push(headers.join(','));
      list.forEach(item => {
        rows.push(headers.map(h => String(item[h] || '')).join(','));
      });
      rows.push('');
    }
  });

  return rows.join('\n');
}

// ========================================
// スケジュールレポート設定
// ========================================

const scheduleReportSchema = z.object({
  type: z.string(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  format: z.enum(['JSON', 'CSV', 'PDF', 'EXCEL']),
  emailRecipients: z.array(z.string().email()).optional(),
  enabled: z.boolean().default(true),
});

/**
 * @swagger
 * /api/ebay-reports/schedule:
 *   post:
 *     summary: レポートスケジュール設定
 *     tags: [eBay Reports]
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const body = scheduleReportSchema.parse(req.body);

    // スケジュール設定を保存（実際にはDBに保存）
    const schedule = {
      id: `schedule_${Date.now()}`,
      ...body,
      nextRunAt: calculateNextRun(body.frequency),
      createdAt: new Date().toISOString(),
    };

    logger.info(`Created report schedule: ${schedule.id}`);

    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Schedule report error:', error);
    res.status(500).json({ error: 'Failed to schedule report' });
  }
});

function calculateNextRun(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'DAILY':
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      break;
    case 'WEEKLY':
      now.setDate(now.getDate() + (7 - now.getDay() + 1) % 7 + 1);
      now.setHours(9, 0, 0, 0);
      break;
    case 'MONTHLY':
      now.setMonth(now.getMonth() + 1, 1);
      now.setHours(9, 0, 0, 0);
      break;
  }
  return now.toISOString();
}

// ========================================
// 統計
// ========================================

/**
 * @swagger
 * /api/ebay-reports/stats:
 *   get:
 *     summary: レポート統計
 *     tags: [eBay Reports]
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 過去30日の売上トレンド
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        listing: { marketplace: 'EBAY' },
      },
    });

    const dailyRevenue: Record<string, number> = {};
    sales.forEach(sale => {
      const date = sale.createdAt.toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (sale.salePrice || 0);
    });

    res.json({
      revenuetrend: Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      summary: {
        totalSales: sales.length,
        totalRevenue: Math.round(sales.reduce((sum, s) => sum + (s.salePrice || 0), 0) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Report stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as ebayReportsRouter };

/**
 * 売上予測API
 * Phase 67: 需要予測、季節性分析、在庫最適化提案
 */

import { Router } from 'express';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import {
  generateForecastSummary,
  getHistoricalSalesData,
  detectSeasonality,
  forecastFutureSales,
  forecastByCategory,
  forecastProductDemand,
  getInventoryRecommendations,
  evaluateForecastAccuracy,
  ForecastSummary,
} from '../lib/sales-forecast-engine';

const router = Router();
const log = logger.child({ module: 'sales-forecast' });

/**
 * 予測サマリーを取得
 * GET /api/sales-forecast/summary
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { historicalDays = '90', forecastDays = '30' } = req.query;

    const summary = await generateForecastSummary(
      Number(historicalDays),
      Number(forecastDays)
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    log.error({ error }, 'Failed to generate forecast summary');
    next(error);
  }
});

/**
 * 日別予測を取得
 * GET /api/sales-forecast/daily
 */
router.get('/daily', async (req, res, next) => {
  try {
    const { historicalDays = '90', forecastDays = '30' } = req.query;

    const historicalData = await getHistoricalSalesData(Number(historicalDays));
    const seasonality = detectSeasonality(historicalData);
    const forecasts = forecastFutureSales(
      historicalData,
      Number(forecastDays),
      seasonality
    );

    res.json({
      success: true,
      data: {
        historical: historicalData.slice(-30), // 直近30日
        forecasts,
        seasonality,
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get daily forecast');
    next(error);
  }
});

/**
 * カテゴリ別予測を取得
 * GET /api/sales-forecast/categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const { historicalDays = '90', forecastDays = '30' } = req.query;

    const forecasts = await forecastByCategory(
      Number(historicalDays),
      Number(forecastDays)
    );

    res.json({
      success: true,
      data: forecasts,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get category forecast');
    next(error);
  }
});

/**
 * 商品別需要予測を取得
 * GET /api/sales-forecast/products
 */
router.get('/products', async (req, res, next) => {
  try {
    const { historicalDays = '90', limit = '20' } = req.query;

    const forecasts = await forecastProductDemand(
      Number(historicalDays),
      Number(limit)
    );

    res.json({
      success: true,
      data: forecasts,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get product demand forecast');
    next(error);
  }
});

/**
 * 在庫補充推奨を取得
 * GET /api/sales-forecast/inventory-recommendations
 */
router.get('/inventory-recommendations', async (req, res, next) => {
  try {
    const { forecastDays = '30' } = req.query;

    const recommendations = await getInventoryRecommendations(
      Number(forecastDays)
    );

    // サマリー統計
    const summary = {
      totalProducts: recommendations.length,
      urgentRestock: recommendations.filter((r) => r.action === 'restock_urgent')
        .length,
      soonRestock: recommendations.filter((r) => r.action === 'restock_soon')
        .length,
      sufficient: recommendations.filter((r) => r.action === 'sufficient')
        .length,
      overstock: recommendations.filter((r) => r.action === 'overstock').length,
    };

    res.json({
      success: true,
      data: {
        summary,
        recommendations,
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get inventory recommendations');
    next(error);
  }
});

/**
 * 予測精度を取得
 * GET /api/sales-forecast/accuracy
 */
router.get('/accuracy', async (req, res, next) => {
  try {
    const { testDays = '14' } = req.query;

    const accuracy = await evaluateForecastAccuracy(Number(testDays));

    res.json({
      success: true,
      data: {
        ...accuracy,
        description: {
          mape: '平均絶対パーセント誤差（低いほど良い）',
          rmse: '二乗平均平方根誤差（低いほど良い）',
          accuracy: '予測精度（高いほど良い）',
        },
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to evaluate forecast accuracy');
    next(error);
  }
});

/**
 * 季節性パターンを取得
 * GET /api/sales-forecast/seasonality
 */
router.get('/seasonality', async (req, res, next) => {
  try {
    const { historicalDays = '90' } = req.query;

    const historicalData = await getHistoricalSalesData(Number(historicalDays));
    const seasonality = detectSeasonality(historicalData);

    // 人間可読形式に変換
    const dayNames = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
    const monthNames = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月',
    ];

    const dayOfWeekFormatted = Object.entries(seasonality.dayOfWeek).map(
      ([day, factor]) => ({
        day: dayNames[Number(day)],
        factor: Math.round(factor * 100) / 100,
        impact: factor > 1.1 ? 'high' : factor < 0.9 ? 'low' : 'normal',
      })
    );

    const monthOfYearFormatted = Object.entries(seasonality.monthOfYear).map(
      ([month, factor]) => ({
        month: monthNames[Number(month) - 1],
        factor: Math.round(factor * 100) / 100,
        impact: factor > 1.1 ? 'high' : factor < 0.9 ? 'low' : 'normal',
      })
    );

    res.json({
      success: true,
      data: {
        dayOfWeek: dayOfWeekFormatted,
        monthOfYear: monthOfYearFormatted,
        weekOfMonth: seasonality.weekOfMonth,
        insights: generateSeasonalityInsights(seasonality),
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get seasonality');
    next(error);
  }
});

/**
 * トレンド分析を取得
 * GET /api/sales-forecast/trends
 */
router.get('/trends', async (req, res, next) => {
  try {
    const { historicalDays = '90' } = req.query;

    const historicalData = await getHistoricalSalesData(Number(historicalDays));

    if (historicalData.length < 14) {
      throw new AppError(400, 'Insufficient data for trend analysis', 'INSUFFICIENT_DATA');
    }

    // 週別トレンド
    const weeklyData: { week: string; revenue: number; orders: number }[] = [];
    let weekStart = 0;
    for (let i = 0; i < historicalData.length; i += 7) {
      const weekSlice = historicalData.slice(i, Math.min(i + 7, historicalData.length));
      const revenue = weekSlice.reduce((sum, d) => sum + d.revenue, 0);
      const orders = weekSlice.reduce((sum, d) => sum + d.orders, 0);
      weekStart++;
      weeklyData.push({
        week: `W${weekStart}`,
        revenue: Math.round(revenue),
        orders,
      });
    }

    // 成長率計算
    const recentWeeks = weeklyData.slice(-4);
    const previousWeeks = weeklyData.slice(-8, -4);

    const recentRevenue = recentWeeks.reduce((sum, w) => sum + w.revenue, 0);
    const previousRevenue = previousWeeks.reduce((sum, w) => sum + w.revenue, 0);

    const growthRate =
      previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // ベストセラー期間を特定
    const maxWeek = weeklyData.reduce(
      (max, w) => (w.revenue > max.revenue ? w : max),
      weeklyData[0]
    );

    res.json({
      success: true,
      data: {
        weeklyTrend: weeklyData,
        growthRate: Math.round(growthRate * 10) / 10,
        trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
        peakWeek: maxWeek?.week,
        peakRevenue: maxWeek?.revenue,
        summary: {
          totalRevenue: historicalData.reduce((sum, d) => sum + d.revenue, 0),
          totalOrders: historicalData.reduce((sum, d) => sum + d.orders, 0),
          avgDailyRevenue: Math.round(
            historicalData.reduce((sum, d) => sum + d.revenue, 0) /
              historicalData.length
          ),
          avgDailyOrders: Math.round(
            historicalData.reduce((sum, d) => sum + d.orders, 0) /
              historicalData.length
          ),
        },
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get trends');
    next(error);
  }
});

/**
 * 予測統計ダッシュボードデータを取得
 * GET /api/sales-forecast/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const summary = await generateForecastSummary(90, 30);
    const accuracy = await evaluateForecastAccuracy(14);

    const stats = {
      // 予測サマリー
      predictedRevenue30d: summary.totalPredictedRevenue,
      predictedOrders30d: summary.totalPredictedOrders,
      growthRate: summary.growthRate,
      trend: summary.trend,
      confidence: summary.averageConfidence,

      // 精度
      forecastAccuracy: accuracy.accuracy,
      mape: accuracy.mape,

      // 在庫アラート
      urgentRestockCount: summary.inventoryRecommendations.filter(
        (r) => r.action === 'restock_urgent'
      ).length,
      soonRestockCount: summary.inventoryRecommendations.filter(
        (r) => r.action === 'restock_soon'
      ).length,

      // トップカテゴリ
      topGrowthCategory: summary.categoryForecasts[0]?.category,
      topGrowthRate: summary.categoryForecasts[0]?.growthRate,

      // トップ商品
      topDemandProduct: summary.topGrowthProducts[0]?.title,
      topDemandPredicted: summary.topGrowthProducts[0]?.predictedSales,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get forecast stats');
    next(error);
  }
});

// ヘルパー関数
function generateSeasonalityInsights(seasonality: any): string[] {
  const insights: string[] = [];

  // 曜日分析
  const dayEntries = Object.entries(seasonality.dayOfWeek as Record<string, number>);
  const bestDay = dayEntries.reduce((max, [day, factor]) =>
    factor > max[1] ? [day, factor] : max
  );
  const worstDay = dayEntries.reduce((min, [day, factor]) =>
    factor < min[1] ? [day, factor] : min
  );

  const dayNames = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
  insights.push(
    `${dayNames[Number(bestDay[0])]}日が最も売上が高い傾向（平均の${Math.round(
      Number(bestDay[1]) * 100
    )}%）`
  );
  insights.push(
    `${dayNames[Number(worstDay[0])]}日が最も売上が低い傾向（平均の${Math.round(
      Number(worstDay[1]) * 100
    )}%）`
  );

  // 月分析
  const monthEntries = Object.entries(seasonality.monthOfYear as Record<string, number>);
  const highMonths = monthEntries
    .filter(([, factor]) => factor > 1.1)
    .map(([month]) => `${month}月`);

  if (highMonths.length > 0) {
    insights.push(`${highMonths.join('、')}は売上が高い傾向`);
  }

  return insights;
}

export { router as salesForecastRouter };

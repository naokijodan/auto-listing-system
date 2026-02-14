import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 予測期間
const FORECAST_PERIODS = {
  DAILY: { code: 'DAILY', name: '日次', days: 1 },
  WEEKLY: { code: 'WEEKLY', name: '週次', days: 7 },
  MONTHLY: { code: 'MONTHLY', name: '月次', days: 30 },
  QUARTERLY: { code: 'QUARTERLY', name: '四半期', days: 90 },
} as const;

// 予測モデル
const FORECAST_MODELS = {
  MOVING_AVERAGE: { code: 'MOVING_AVERAGE', name: '移動平均', description: '過去データの平均' },
  EXPONENTIAL_SMOOTHING: { code: 'EXPONENTIAL_SMOOTHING', name: '指数平滑', description: '最近のデータに重み付け' },
  ARIMA: { code: 'ARIMA', name: 'ARIMA', description: '時系列分析' },
  PROPHET: { code: 'PROPHET', name: 'Prophet', description: '季節性を考慮' },
  AI_ENSEMBLE: { code: 'AI_ENSEMBLE', name: 'AIアンサンブル', description: '複数モデルの組み合わせ' },
} as const;

// 季節性パターン
const SEASONALITY_PATTERNS = {
  NONE: { code: 'NONE', name: 'なし' },
  WEEKLY: { code: 'WEEKLY', name: '週次' },
  MONTHLY: { code: 'MONTHLY', name: '月次' },
  YEARLY: { code: 'YEARLY', name: '年次' },
  HOLIDAY: { code: 'HOLIDAY', name: 'ホリデー' },
} as const;

// ダッシュボード
router.get('/dashboard', async (_req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
    });

    // 売上統計（モック）
    const stats = {
      currentMonthSales: 45800,
      forecastedMonthSales: 52000,
      growthRate: 13.5,
      accuracy: 89.2,
      confidenceLevel: 0.85,
      lastUpdated: new Date().toISOString(),
    };

    // 日別予測（過去14日 + 未来14日）
    const dailyForecast = Array.from({ length: 28 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 14 + i);
      const isHistorical = i < 14;

      const baseValue = 1500 + Math.sin(i / 7 * Math.PI) * 300;
      const randomness = Math.random() * 200 - 100;
      const actualValue = isHistorical ? baseValue + randomness : null;
      const forecastValue = baseValue + (isHistorical ? 0 : randomness * 0.5);

      return {
        date: date.toISOString().split('T')[0],
        actual: actualValue ? Math.floor(actualValue) : null,
        forecast: Math.floor(forecastValue),
        lowerBound: Math.floor(forecastValue * 0.85),
        upperBound: Math.floor(forecastValue * 1.15),
        isHistorical,
      };
    });

    // カテゴリ別予測
    const categoryForecast = [
      { category: 'Electronics', currentSales: 15000, forecastSales: 17500, growth: 16.7, trend: 'up' },
      { category: 'Fashion', currentSales: 12000, forecastSales: 13200, growth: 10.0, trend: 'up' },
      { category: 'Collectibles', currentSales: 8000, forecastSales: 7600, growth: -5.0, trend: 'down' },
      { category: 'Home & Garden', currentSales: 6500, forecastSales: 7800, growth: 20.0, trend: 'up' },
      { category: 'Sports', currentSales: 4300, forecastSales: 4500, growth: 4.7, trend: 'stable' },
    ];

    // 季節性分析
    const seasonality = {
      weeklyPattern: [
        { day: '月', factor: 0.85 },
        { day: '火', factor: 0.90 },
        { day: '水', factor: 0.95 },
        { day: '木', factor: 1.00 },
        { day: '金', factor: 1.10 },
        { day: '土', factor: 1.15 },
        { day: '日', factor: 1.05 },
      ],
      monthlyPattern: [
        { month: '1月', factor: 0.80 },
        { month: '2月', factor: 0.75 },
        { month: '3月', factor: 0.85 },
        { month: '4月', factor: 0.90 },
        { month: '5月', factor: 0.95 },
        { month: '6月', factor: 0.90 },
        { month: '7月', factor: 0.95 },
        { month: '8月', factor: 1.00 },
        { month: '9月', factor: 1.05 },
        { month: '10月', factor: 1.10 },
        { month: '11月', factor: 1.30 },
        { month: '12月', factor: 1.45 },
      ],
      upcomingEvents: [
        { event: 'Valentine\'s Day', date: '2026-02-14', expectedImpact: '+15%' },
        { event: 'Easter', date: '2026-04-05', expectedImpact: '+8%' },
        { event: 'Mother\'s Day', date: '2026-05-10', expectedImpact: '+12%' },
      ],
    };

    res.json({
      success: true,
      stats,
      dailyForecast,
      categoryForecast,
      seasonality,
      totalListings: listings.length,
    });
  } catch (error) {
    logger.error('Failed to get sales forecast dashboard', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

// 予測期間一覧
router.get('/periods', (_req, res) => {
  res.json({
    success: true,
    periods: Object.values(FORECAST_PERIODS),
  });
});

// 予測モデル一覧
router.get('/models', (_req, res) => {
  res.json({
    success: true,
    models: Object.values(FORECAST_MODELS),
  });
});

// 季節性パターン一覧
router.get('/seasonality-patterns', (_req, res) => {
  res.json({
    success: true,
    patterns: Object.values(SEASONALITY_PATTERNS),
  });
});

// 売上予測生成
const generateForecastSchema = z.object({
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']).default('WEEKLY'),
  horizon: z.number().min(1).max(365).default(30), // 予測日数
  model: z.enum(['MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'ARIMA', 'PROPHET', 'AI_ENSEMBLE']).default('AI_ENSEMBLE'),
  includeSeasonality: z.boolean().default(true),
  category: z.string().optional(),
});

router.post('/generate', async (req, res) => {
  try {
    const body = generateForecastSchema.parse(req.body);

    // 過去の売上データを取得（モック）
    const historicalData = Array.from({ length: 90 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (90 - i));
      const baseValue = 1500 + Math.sin(i / 30 * Math.PI * 2) * 500;
      const trend = i * 5;
      const randomness = Math.random() * 300 - 150;
      return {
        date: date.toISOString().split('T')[0],
        sales: Math.floor(baseValue + trend + randomness),
        orders: Math.floor((baseValue + trend + randomness) / 45),
      };
    });

    // 予測を生成
    const forecast = Array.from({ length: body.horizon }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      // 簡易的な予測ロジック
      const lastValue = historicalData[historicalData.length - 1].sales;
      const trend = 5; // 日あたりのトレンド
      const seasonalFactor = body.includeSeasonality
        ? 1 + Math.sin((historicalData.length + i) / 7 * Math.PI * 2) * 0.1
        : 1;

      const forecastValue = (lastValue + trend * (i + 1)) * seasonalFactor;
      const confidence = Math.max(0.5, 0.95 - i * 0.01);

      return {
        date: date.toISOString().split('T')[0],
        forecast: Math.floor(forecastValue),
        lowerBound: Math.floor(forecastValue * (1 - (1 - confidence) * 0.5)),
        upperBound: Math.floor(forecastValue * (1 + (1 - confidence) * 0.5)),
        confidence,
      };
    });

    // 予測サマリー
    const summary = {
      totalForecastSales: forecast.reduce((sum, f) => sum + f.forecast, 0),
      averageDailySales: Math.floor(forecast.reduce((sum, f) => sum + f.forecast, 0) / forecast.length),
      peakDay: forecast.reduce((max, f) => f.forecast > max.forecast ? f : max, forecast[0]),
      lowestDay: forecast.reduce((min, f) => f.forecast < min.forecast ? f : min, forecast[0]),
      overallConfidence: forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length,
    };

    res.json({
      success: true,
      parameters: body,
      historicalData: historicalData.slice(-30), // 直近30日のみ返す
      forecast,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate forecast', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

// 商品別予測
const productForecastSchema = z.object({
  listingId: z.string(),
  horizon: z.number().min(1).max(90).default(30),
});

router.post('/product-forecast', async (req, res) => {
  try {
    const body = productForecastSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    // 商品別予測を生成
    const forecast = Array.from({ length: body.horizon }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      const baseSales = Math.random() * 3 + 1;
      const trend = i * 0.05;
      const forecastSales = baseSales + trend;

      return {
        date: date.toISOString().split('T')[0],
        expectedSales: Math.floor(forecastSales * 10) / 10,
        expectedRevenue: Math.floor(forecastSales * listing.listingPrice * 10) / 10,
        confidence: Math.max(0.5, 0.9 - i * 0.01),
      };
    });

    const summary = {
      totalExpectedSales: forecast.reduce((sum, f) => sum + f.expectedSales, 0),
      totalExpectedRevenue: forecast.reduce((sum, f) => sum + f.expectedRevenue, 0),
      averageDailySales: forecast.reduce((sum, f) => sum + f.expectedSales, 0) / forecast.length,
      recommendedStock: Math.ceil(forecast.reduce((sum, f) => sum + f.expectedSales, 0) * 1.2),
    };

    res.json({
      success: true,
      listing: {
        id: listing.id,
        title: listing.product.titleEn || listing.product.title,
        price: listing.listingPrice,
        category: listing.product.category,
      },
      forecast,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate product forecast', error);
    res.status(500).json({ success: false, error: 'Failed to generate product forecast' });
  }
});

// トレンド分析
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // トレンドデータ（モック）
    const trends = {
      overall: {
        direction: 'up',
        changePercent: 12.5,
        momentum: 'strong',
        description: '売上は安定した成長を続けています',
      },
      byCategory: [
        { category: 'Electronics', trend: 'up', change: 18.2, momentum: 'strong' },
        { category: 'Fashion', trend: 'up', change: 8.5, momentum: 'moderate' },
        { category: 'Collectibles', trend: 'down', change: -5.2, momentum: 'weak' },
        { category: 'Home & Garden', trend: 'up', change: 22.1, momentum: 'strong' },
        { category: 'Sports', trend: 'stable', change: 1.5, momentum: 'weak' },
      ],
      topGrowing: [
        { title: 'Wireless Earbuds', growth: 45, currentSales: 120 },
        { title: 'Smart Watch', growth: 38, currentSales: 85 },
        { title: 'LED Strip Lights', growth: 32, currentSales: 95 },
      ],
      declining: [
        { title: 'DVD Player', decline: -25, currentSales: 15 },
        { title: 'Phone Cases (Old Models)', decline: -18, currentSales: 30 },
      ],
    };

    res.json({
      success: true,
      period,
      trends,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get trends', error);
    res.status(500).json({ success: false, error: 'Failed to get trends' });
  }
});

// 異常検出
router.get('/anomalies', async (req, res) => {
  try {
    const { period = '30d', threshold = '2' } = req.query;

    // 異常検出結果（モック）
    const anomalies = [
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'spike',
        actualValue: 3500,
        expectedValue: 1800,
        deviation: 94.4,
        possibleCauses: ['フラッシュセール', '外部メディア露出', 'バイラルマーケティング'],
      },
      {
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'dip',
        actualValue: 800,
        expectedValue: 1600,
        deviation: -50.0,
        possibleCauses: ['システム障害', '競合の大規模セール', 'サプライチェーン問題'],
      },
    ];

    res.json({
      success: true,
      period,
      threshold: parseFloat(threshold as string),
      anomalies,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to detect anomalies', error);
    res.status(500).json({ success: false, error: 'Failed to detect anomalies' });
  }
});

// AI予測分析
const aiAnalysisSchema = z.object({
  question: z.string().optional(),
  focusArea: z.enum(['revenue', 'growth', 'seasonality', 'risk']).optional(),
});

router.post('/ai-analysis', async (req, res) => {
  try {
    const body = aiAnalysisSchema.parse(req.body);

    const prompt = `
あなたはEコマースの売上予測専門家です。
以下の条件で売上予測の分析とアドバイスを提供してください。

${body.focusArea ? `フォーカスエリア: ${body.focusArea}` : ''}
${body.question ? `質問: ${body.question}` : ''}

現在の状況（仮定）:
- 月間売上: $45,000
- 前月比成長: +12%
- 季節性: 2月は通常より低め
- トップカテゴリ: Electronics (35%), Fashion (25%), Collectibles (20%)

以下の形式でJSONを返してください:
{
  "analysis": "分析結果の説明",
  "predictions": [
    {
      "timeframe": "期間",
      "prediction": "予測内容",
      "confidence": "高/中/低"
    }
  ],
  "risks": ["リスク1", "リスク2"],
  "opportunities": ["機会1", "機会2"],
  "recommendations": ["推奨アクション1", "推奨アクション2", "推奨アクション3"]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        analysis: '分析を生成できませんでした',
        predictions: [],
        risks: [],
        opportunities: [],
        recommendations: [],
      };
    }

    res.json({
      success: true,
      focusArea: body.focusArea,
      ...result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate AI analysis', error);
    res.status(500).json({ success: false, error: 'Failed to generate AI analysis' });
  }
});

// 在庫計画
const inventoryPlanSchema = z.object({
  horizon: z.number().min(7).max(90).default(30),
  safetyStock: z.number().min(0).max(100).default(20), // パーセンテージ
});

router.post('/inventory-plan', async (req, res) => {
  try {
    const body = inventoryPlanSchema.parse(req.body);

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
      take: 20,
    });

    // 各商品の在庫計画を生成
    const inventoryPlan = listings.map((listing) => {
      const dailySales = Math.random() * 5 + 1;
      const forecastedDemand = Math.floor(dailySales * body.horizon);
      const safetyStock = Math.ceil(forecastedDemand * (body.safetyStock / 100));
      const currentStock = Math.floor(Math.random() * 50) + 10;
      const reorderPoint = Math.ceil(dailySales * 7 + safetyStock); // 1週間分 + 安全在庫

      return {
        listingId: listing.id,
        title: listing.product.titleEn || listing.product.title,
        currentStock,
        forecastedDemand,
        safetyStock,
        recommendedStock: forecastedDemand + safetyStock,
        reorderPoint,
        needsReorder: currentStock <= reorderPoint,
        daysUntilStockout: currentStock > 0 ? Math.floor(currentStock / dailySales) : 0,
        reorderQuantity: Math.max(0, forecastedDemand + safetyStock - currentStock),
      };
    });

    // サマリー
    const summary = {
      totalItems: inventoryPlan.length,
      needsReorder: inventoryPlan.filter(i => i.needsReorder).length,
      atRisk: inventoryPlan.filter(i => i.daysUntilStockout <= 7).length,
      totalReorderValue: inventoryPlan
        .filter(i => i.needsReorder)
        .reduce((sum, i) => sum + i.reorderQuantity * 20, 0), // 仮の仕入れ単価
    };

    res.json({
      success: true,
      parameters: body,
      inventoryPlan,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate inventory plan', error);
    res.status(500).json({ success: false, error: 'Failed to generate inventory plan' });
  }
});

// 予測精度
router.get('/accuracy', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // 予測精度データ（モック）
    const accuracy = {
      overall: {
        mape: 8.5, // Mean Absolute Percentage Error
        rmse: 120, // Root Mean Square Error
        accuracy: 91.5,
        trend: 'improving',
      },
      byModel: [
        { model: 'MOVING_AVERAGE', mape: 12.3, accuracy: 87.7 },
        { model: 'EXPONENTIAL_SMOOTHING', mape: 10.1, accuracy: 89.9 },
        { model: 'ARIMA', mape: 9.2, accuracy: 90.8 },
        { model: 'PROPHET', mape: 8.8, accuracy: 91.2 },
        { model: 'AI_ENSEMBLE', mape: 7.5, accuracy: 92.5 },
      ],
      byPeriod: [
        { period: '1日', accuracy: 95.2 },
        { period: '7日', accuracy: 92.1 },
        { period: '14日', accuracy: 89.5 },
        { period: '30日', accuracy: 85.8 },
      ],
      recentForecasts: Array.from({ length: 10 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        forecasted: 1500 + Math.floor(Math.random() * 500),
        actual: 1500 + Math.floor(Math.random() * 500),
        error: Math.random() * 15 - 7.5,
      })),
    };

    res.json({
      success: true,
      period,
      accuracy,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get accuracy', error);
    res.status(500).json({ success: false, error: 'Failed to get accuracy' });
  }
});

// 設定
router.get('/settings', async (_req, res) => {
  try {
    const settings = {
      defaultModel: 'AI_ENSEMBLE',
      defaultHorizon: 30,
      includeSeasonality: true,
      confidenceLevel: 0.95,
      autoRefresh: true,
      refreshInterval: 6, // hours
      alertOnAnomaly: true,
      anomalyThreshold: 2.0, // standard deviations
    };

    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// 設定更新
const updateSettingsSchema = z.object({
  defaultModel: z.enum(['MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'ARIMA', 'PROPHET', 'AI_ENSEMBLE']).optional(),
  defaultHorizon: z.number().min(1).max(365).optional(),
  includeSeasonality: z.boolean().optional(),
  confidenceLevel: z.number().min(0.5).max(0.99).optional(),
  autoRefresh: z.boolean().optional(),
  refreshInterval: z.number().min(1).max(24).optional(),
  alertOnAnomaly: z.boolean().optional(),
  anomalyThreshold: z.number().min(1).max(5).optional(),
});

router.put('/settings', async (req, res) => {
  try {
    const body = updateSettingsSchema.parse(req.body);

    logger.info('Sales forecast settings updated', body);

    res.json({
      success: true,
      message: 'Settings updated',
      settings: body,
    });
  } catch (error) {
    logger.error('Failed to update settings', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export { router as ebaySalesForecastRouter };

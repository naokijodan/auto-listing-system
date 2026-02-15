import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// 在庫予測ダッシュボード
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalProducts: 1245,
      lowStockAlerts: 23,
      outOfStockRisk: 8,
      overstockRisk: 15,
      forecastAccuracy: 94.2,
      avgTurnoverDays: 28,
    },
    healthScore: {
      score: 78,
      trend: 'improving',
      factors: [
        { factor: 'stockLevels', score: 82, weight: 0.3 },
        { factor: 'turnoverRate', score: 75, weight: 0.25 },
        { factor: 'forecastAccuracy', score: 85, weight: 0.25 },
        { factor: 'seasonalPrep', score: 68, weight: 0.2 },
      ],
    },
    alerts: [
      { id: 'alert-001', type: 'low_stock', product: 'Sony WH-1000XM5', currentStock: 5, reorderPoint: 10, urgency: 'high' },
      { id: 'alert-002', type: 'stockout_risk', product: 'Apple AirPods Pro', daysUntilStockout: 7, urgency: 'critical' },
      { id: 'alert-003', type: 'overstock', product: 'Generic USB Cable', excessUnits: 150, holdingCost: 45.00, urgency: 'medium' },
    ],
    reorderRecommendations: [
      { productId: 'prod-001', product: 'Sony WH-1000XM5', currentStock: 5, suggestedQty: 50, leadTime: 7, urgency: 'high' },
      { productId: 'prod-002', product: 'Apple AirPods Pro', currentStock: 12, suggestedQty: 30, leadTime: 5, urgency: 'high' },
    ],
  };
  res.json(dashboard);
});

// 予測精度トレンド
router.get('/dashboard/accuracy-trend', async (req, res) => {
  const { period = '30d' } = req.query;
  const trend = {
    period,
    data: [
      { date: '2026-02-01', accuracy: 92.5, predictions: 156, correct: 144 },
      { date: '2026-02-08', accuracy: 93.8, predictions: 178, correct: 167 },
      { date: '2026-02-15', accuracy: 94.2, predictions: 189, correct: 178 },
    ],
    avgAccuracy: 93.5,
    improvement: 1.7,
  };
  res.json(trend);
});

// 在庫回転率
router.get('/dashboard/turnover', async (_req, res) => {
  const turnover = {
    overall: { rate: 12.5, avgDays: 28, trend: 'stable' },
    byCategory: [
      { category: 'Electronics', rate: 15.2, avgDays: 24, value: 45678 },
      { category: 'Clothing', rate: 10.8, avgDays: 34, value: 23456 },
      { category: 'Home', rate: 8.5, avgDays: 43, value: 12345 },
    ],
    slowMoving: [
      { productId: 'prod-100', product: 'Vintage Clock', daysInStock: 120, units: 15, value: 750 },
      { productId: 'prod-101', product: 'Decorative Vase', daysInStock: 95, units: 22, value: 440 },
    ],
  };
  res.json(turnover);
});

// ===== 予測管理 =====

// 商品別予測一覧
router.get('/forecasts', async (req, res) => {
  const { category, riskLevel, page = 1, limit = 20 } = req.query;
  const forecasts = {
    items: [
      {
        id: 'fc-001',
        productId: 'prod-001',
        product: { title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5', category: 'Electronics' },
        currentStock: 45,
        forecast: {
          next7Days: 12,
          next14Days: 25,
          next30Days: 52,
          confidence: 0.92,
        },
        reorderPoint: 20,
        safetyStock: 10,
        daysUntilReorder: 8,
        riskLevel: 'low',
        lastUpdated: '2026-02-16T08:00:00Z',
      },
      {
        id: 'fc-002',
        productId: 'prod-002',
        product: { title: 'Apple AirPods Pro', sku: 'APPLE-APP2', category: 'Electronics' },
        currentStock: 12,
        forecast: {
          next7Days: 8,
          next14Days: 18,
          next30Days: 38,
          confidence: 0.88,
        },
        reorderPoint: 15,
        safetyStock: 8,
        daysUntilReorder: 3,
        riskLevel: 'high',
        lastUpdated: '2026-02-16T08:00:00Z',
      },
    ],
    total: 1245,
    page: Number(page),
    limit: Number(limit),
    filters: { category, riskLevel },
  };
  res.json(forecasts);
});

// 商品別予測詳細
router.get('/forecasts/:productId', async (req, res) => {
  const { productId } = req.params;
  const forecast = {
    productId,
    product: { title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5', category: 'Electronics', price: 299.99 },
    currentStock: 45,
    incomingStock: [
      { orderId: 'po-001', quantity: 50, eta: '2026-02-20' },
    ],
    forecast: {
      daily: [
        { date: '2026-02-17', predicted: 2, confidence: 0.95 },
        { date: '2026-02-18', predicted: 3, confidence: 0.93 },
        { date: '2026-02-19', predicted: 2, confidence: 0.91 },
      ],
      weekly: [
        { week: '2026-W08', predicted: 12, confidence: 0.92 },
        { week: '2026-W09', predicted: 14, confidence: 0.88 },
        { week: '2026-W10', predicted: 11, confidence: 0.85 },
      ],
      monthly: [
        { month: '2026-02', predicted: 52, confidence: 0.90 },
        { month: '2026-03', predicted: 48, confidence: 0.82 },
      ],
    },
    historical: {
      avgDailySales: 1.8,
      salesVariance: 0.6,
      seasonality: [
        { period: 'weekday', multiplier: 1.1 },
        { period: 'weekend', multiplier: 0.85 },
        { period: 'holiday', multiplier: 1.5 },
      ],
    },
    recommendations: {
      reorderQuantity: 50,
      reorderDate: '2026-02-18',
      optimalStockLevel: 65,
      safetyStock: 15,
    },
  };
  res.json(forecast);
});

// 予測を再計算
router.post('/forecasts/:productId/recalculate', async (req, res) => {
  const { productId } = req.params;
  res.json({
    success: true,
    productId,
    message: 'Forecast recalculation started',
    jobId: `job-${Date.now()}`,
  });
});

// 一括予測再計算
const bulkRecalculateSchema = z.object({
  productIds: z.array(z.string()).optional(),
  category: z.string().optional(),
  all: z.boolean().optional(),
});

router.post('/forecasts/recalculate', async (req, res) => {
  const data = bulkRecalculateSchema.parse(req.body);
  res.json({
    success: true,
    productsQueued: data.productIds?.length ?? (data.all ? 1245 : 0),
    jobId: `job-${Date.now()}`,
  });
});

// ===== 再注文管理 =====

// 再注文推奨一覧
router.get('/reorder/recommendations', async (req, res) => {
  const { urgency, supplier, page = 1, limit = 20 } = req.query;
  const recommendations = {
    items: [
      {
        id: 'rec-001',
        productId: 'prod-001',
        product: { title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5' },
        supplier: { id: 'sup-001', name: 'Tech Wholesale Inc' },
        currentStock: 5,
        reorderPoint: 10,
        suggestedQty: 50,
        unitCost: 180.00,
        totalCost: 9000.00,
        leadTime: 7,
        urgency: 'high',
        daysUntilStockout: 3,
        potentialLostSales: 12,
        potentialRevenueLoss: 3599.88,
      },
    ],
    total: 23,
    page: Number(page),
    limit: Number(limit),
    filters: { urgency, supplier },
    summary: {
      totalItems: 23,
      totalCost: 45678.90,
      criticalItems: 8,
      highPriorityItems: 15,
    },
  };
  res.json(recommendations);
});

// 再注文を作成
const createReorderSchema = z.object({
  productId: z.string(),
  supplierId: z.string(),
  quantity: z.number(),
  notes: z.string().optional(),
});

router.post('/reorder', async (req, res) => {
  const data = createReorderSchema.parse(req.body);
  res.json({
    success: true,
    orderId: `po-${Date.now()}`,
    ...data,
    status: 'pending',
    estimatedDelivery: '2026-02-23',
  });
});

// 一括再注文
const bulkReorderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    supplierId: z.string(),
    quantity: z.number(),
  })),
});

router.post('/reorder/bulk', async (req, res) => {
  const data = bulkReorderSchema.parse(req.body);
  res.json({
    success: true,
    ordersCreated: data.items.length,
    orderIds: data.items.map((_, i) => `po-${Date.now()}-${i}`),
  });
});

// ===== 季節性分析 =====

// 季節性パターン
router.get('/seasonality', async (req, res) => {
  const { category, productId } = req.query;
  const seasonality = {
    patterns: [
      { period: 'Q1', index: 0.85, description: 'Post-holiday slowdown' },
      { period: 'Q2', index: 1.05, description: 'Spring recovery' },
      { period: 'Q3', index: 0.95, description: 'Summer stable' },
      { period: 'Q4', index: 1.35, description: 'Holiday peak' },
    ],
    monthly: [
      { month: 'Jan', index: 0.75 }, { month: 'Feb', index: 0.85 },
      { month: 'Mar', index: 0.95 }, { month: 'Apr', index: 1.05 },
      { month: 'May', index: 1.10 }, { month: 'Jun', index: 0.95 },
      { month: 'Jul', index: 0.90 }, { month: 'Aug', index: 0.95 },
      { month: 'Sep', index: 1.00 }, { month: 'Oct', index: 1.15 },
      { month: 'Nov', index: 1.45 }, { month: 'Dec', index: 1.55 },
    ],
    events: [
      { event: 'Black Friday', date: '2026-11-27', impactMultiplier: 3.5 },
      { event: 'Cyber Monday', date: '2026-11-30', impactMultiplier: 2.8 },
      { event: 'Christmas', date: '2026-12-25', impactMultiplier: 2.2 },
    ],
    filters: { category, productId },
  };
  res.json(seasonality);
});

// 季節性予測
router.get('/seasonality/forecast', async (req, res) => {
  const { months = 6 } = req.query;
  const forecast = {
    months: Number(months),
    predictions: [
      { month: '2026-03', index: 0.95, expectedDemandChange: -5 },
      { month: '2026-04', index: 1.05, expectedDemandChange: 5 },
      { month: '2026-05', index: 1.10, expectedDemandChange: 10 },
      { month: '2026-06', index: 0.95, expectedDemandChange: -5 },
      { month: '2026-07', index: 0.90, expectedDemandChange: -10 },
      { month: '2026-08', index: 0.95, expectedDemandChange: -5 },
    ],
    recommendations: [
      { month: '2026-04', action: 'increase_stock', reason: 'Spring demand surge', suggestedIncrease: 15 },
      { month: '2026-07', action: 'reduce_orders', reason: 'Summer slowdown', suggestedReduction: 20 },
    ],
  };
  res.json(forecast);
});

// ===== 在庫最適化 =====

// 最適化提案
router.get('/optimization/suggestions', async (_req, res) => {
  const suggestions = [
    {
      id: 'sug-001',
      type: 'reduce_safety_stock',
      product: { id: 'prod-050', title: 'USB-C Cable 3-pack' },
      currentValue: 50,
      suggestedValue: 30,
      impact: { costSaving: 200, serviceLevel: -0.5 },
      confidence: 0.85,
    },
    {
      id: 'sug-002',
      type: 'increase_reorder_point',
      product: { id: 'prod-001', title: 'Sony WH-1000XM5' },
      currentValue: 10,
      suggestedValue: 15,
      impact: { costSaving: -500, serviceLevel: 2.5 },
      confidence: 0.92,
    },
    {
      id: 'sug-003',
      type: 'liquidate',
      product: { id: 'prod-100', title: 'Vintage Clock' },
      currentStock: 15,
      suggestedAction: 'Discount 40% and clear',
      impact: { costSaving: 450, serviceLevel: 0 },
      confidence: 0.78,
    },
  ];
  res.json(suggestions);
});

// 最適化提案を適用
router.post('/optimization/suggestions/:id/apply', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, suggestionId: id, appliedAt: new Date().toISOString() });
});

// ABC分析
router.get('/optimization/abc-analysis', async (_req, res) => {
  const analysis = {
    summary: {
      classA: { count: 125, percentage: 10, revenueShare: 70 },
      classB: { count: 312, percentage: 25, revenueShare: 20 },
      classC: { count: 808, percentage: 65, revenueShare: 10 },
    },
    recommendations: [
      { class: 'A', strategy: 'High monitoring, low safety stock, frequent reorders' },
      { class: 'B', strategy: 'Moderate monitoring, moderate safety stock' },
      { class: 'C', strategy: 'Periodic review, higher safety stock, bulk orders' },
    ],
    products: {
      classA: [
        { id: 'prod-001', title: 'Sony WH-1000XM5', revenue: 89000, percentage: 5.2 },
        { id: 'prod-002', title: 'Apple AirPods Pro', revenue: 76500, percentage: 4.5 },
      ],
    },
  };
  res.json(analysis);
});

// ===== 設定 =====

// 予測設定取得
router.get('/settings/forecasting', async (_req, res) => {
  const settings = {
    model: {
      type: 'ensemble',
      components: ['moving_average', 'exponential_smoothing', 'ml_regression'],
      updateFrequency: 'daily',
    },
    parameters: {
      forecastHorizon: 30,
      confidenceLevel: 0.95,
      seasonalityWeight: 0.3,
      trendWeight: 0.4,
      historicalWeight: 0.3,
    },
    dataRetention: {
      historicalDays: 365,
      granularity: 'daily',
    },
  };
  res.json(settings);
});

// 予測設定更新
router.put('/settings/forecasting', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// 再注文設定取得
router.get('/settings/reorder', async (_req, res) => {
  const settings = {
    defaults: {
      safetyStockDays: 7,
      leadTimeBuffer: 2,
      reorderPointMethod: 'demand_based',
    },
    autoReorder: {
      enabled: true,
      approvalRequired: true,
      maxAutoOrderValue: 5000,
    },
    suppliers: {
      preferredSuppliers: ['sup-001', 'sup-002'],
      fallbackEnabled: true,
    },
  };
  res.json(settings);
});

// 再注文設定更新
router.put('/settings/reorder', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// アラート設定取得
router.get('/settings/alerts', async (_req, res) => {
  const settings = {
    lowStock: {
      enabled: true,
      threshold: 'reorder_point',
      notifyChannels: ['email', 'dashboard'],
    },
    stockout: {
      enabled: true,
      daysAhead: 7,
      notifyChannels: ['email', 'sms', 'dashboard'],
    },
    overstock: {
      enabled: true,
      daysThreshold: 90,
      valueThreshold: 500,
      notifyChannels: ['email', 'dashboard'],
    },
    forecastDeviation: {
      enabled: true,
      deviationThreshold: 25,
      notifyChannels: ['email'],
    },
  };
  res.json(settings);
});

// アラート設定更新
router.put('/settings/alerts', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

export const ebayInventoryForecastingRouter = router;

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 167: Machine Learning Insights（機械学習インサイト）
// ============================================

// --- 売上予測 ---
router.get('/predictions/sales', (req, res) => {
  const { period = '30', granularity = 'daily' } = req.query;

  const days = parseInt(period as string);
  const predictions = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    const baseValue = 5000 + Math.random() * 3000;
    return {
      date: date.toISOString().split('T')[0],
      predicted: Math.round(baseValue),
      lowerBound: Math.round(baseValue * 0.85),
      upperBound: Math.round(baseValue * 1.15),
      confidence: 0.85 + Math.random() * 0.1,
    };
  });

  res.json({
    predictions,
    model: 'Prophet',
    trainedAt: '2026-02-15T00:00:00Z',
    accuracy: {
      mape: 8.5,
      rmse: 420.5,
      r2: 0.92,
    },
    factors: [
      { name: 'seasonality', impact: 0.35 },
      { name: 'trend', impact: 0.25 },
      { name: 'promotions', impact: 0.20 },
      { name: 'holidays', impact: 0.12 },
      { name: 'weather', impact: 0.08 },
    ],
  });
});

// --- 需要予測 ---
router.get('/predictions/demand', (req, res) => {
  const { productId, category } = req.query;

  res.json({
    predictions: [
      {
        productId: productId ?? 'prod_001',
        productName: 'Vintage Watch Model X',
        currentStock: 15,
        predictedDemand: 25,
        daysUntilStockout: 8,
        reorderPoint: 20,
        recommendedReorder: 30,
        confidence: 0.88,
      },
      {
        productId: 'prod_002',
        productName: 'Antique Camera Y',
        currentStock: 8,
        predictedDemand: 12,
        daysUntilStockout: 5,
        reorderPoint: 10,
        recommendedReorder: 20,
        confidence: 0.82,
      },
      {
        productId: 'prod_003',
        productName: 'Collectible Figure Z',
        currentStock: 50,
        predictedDemand: 15,
        daysUntilStockout: 45,
        reorderPoint: 20,
        recommendedReorder: 0,
        confidence: 0.91,
      },
    ],
    total: 3,
    summary: {
      highRisk: 2,
      mediumRisk: 1,
      lowRisk: 0,
    },
  });
});

// --- 価格最適化 ---
router.get('/predictions/pricing', (req, res) => {
  const { productId } = req.query;

  res.json({
    recommendations: [
      {
        productId: productId ?? 'prod_001',
        productName: 'Vintage Watch Model X',
        currentPrice: 299.99,
        optimalPrice: 329.99,
        priceRange: { min: 279.99, max: 349.99 },
        expectedRevenue: {
          current: 8999.70,
          optimal: 10229.69,
          increase: 13.7,
        },
        elasticity: -1.8,
        competitorPrices: [
          { competitor: 'Seller A', price: 319.99 },
          { competitor: 'Seller B', price: 339.99 },
          { competitor: 'Seller C', price: 289.99 },
        ],
        confidence: 0.85,
      },
    ],
    model: 'XGBoost',
    lastUpdated: new Date().toISOString(),
  });
});

// 価格最適化実行
router.post('/predictions/pricing/optimize', (req, res) => {
  const schema = z.object({
    productIds: z.array(z.string()),
    strategy: z.enum(['MAXIMIZE_REVENUE', 'MAXIMIZE_PROFIT', 'MATCH_COMPETITORS', 'UNDERCUT']),
    constraints: z.object({
      minMargin: z.number().optional(),
      maxPriceChange: z.number().optional(),
    }).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    jobId: `opt_${Date.now()}`,
    status: 'PROCESSING',
    productCount: parsed.data.productIds.length,
    strategy: parsed.data.strategy,
    estimatedTime: '2-5 minutes',
  });
});

// --- 顧客セグメンテーション ---
router.get('/segments/customers', (req, res) => {
  res.json({
    segments: [
      {
        id: 'seg_001',
        name: 'ハイバリュー顧客',
        description: '高頻度・高単価購入者',
        size: 1250,
        percentage: 8.5,
        characteristics: {
          avgOrderValue: 285.50,
          orderFrequency: 4.2,
          ltv: 1450.00,
          preferredCategories: ['Electronics', 'Watches'],
        },
        recommendations: ['VIPプログラム招待', '先行セール案内', 'パーソナライズドオファー'],
      },
      {
        id: 'seg_002',
        name: 'リピーター',
        description: '定期的に購入する顧客',
        size: 3500,
        percentage: 23.8,
        characteristics: {
          avgOrderValue: 125.30,
          orderFrequency: 2.5,
          ltv: 620.00,
          preferredCategories: ['Fashion', 'Home'],
        },
        recommendations: ['ロイヤリティポイント', '定期購入割引', 'クロスセル提案'],
      },
      {
        id: 'seg_003',
        name: '新規顧客',
        description: '過去30日以内の初回購入者',
        size: 2800,
        percentage: 19.0,
        characteristics: {
          avgOrderValue: 85.20,
          orderFrequency: 1.0,
          ltv: 85.20,
          preferredCategories: ['Electronics', 'Sports'],
        },
        recommendations: ['ウェルカムシリーズ', '次回購入クーポン', '商品レビュー依頼'],
      },
      {
        id: 'seg_004',
        name: '休眠顧客',
        description: '90日以上購入なし',
        size: 4500,
        percentage: 30.6,
        characteristics: {
          avgOrderValue: 110.40,
          orderFrequency: 0.8,
          ltv: 220.00,
          preferredCategories: ['Fashion', 'Other'],
        },
        recommendations: ['リアクティベーションメール', '特別割引オファー', 'アンケート送付'],
      },
    ],
    model: 'K-Means + RFM',
    lastUpdated: '2026-02-15T06:00:00Z',
    totalCustomers: 14700,
  });
});

// --- 商品レコメンデーション ---
router.get('/recommendations/products', (req, res) => {
  const { customerId, productId, type = 'similar' } = req.query;

  const recommendations = [
    {
      productId: 'prod_101',
      name: 'Vintage Watch Case',
      category: 'Accessories',
      price: 45.99,
      score: 0.95,
      reason: type === 'similar' ? '類似商品' : 'よく一緒に購入されています',
    },
    {
      productId: 'prod_102',
      name: 'Watch Repair Kit',
      category: 'Tools',
      price: 29.99,
      score: 0.88,
      reason: type === 'similar' ? '類似カテゴリ' : '関連アクセサリー',
    },
    {
      productId: 'prod_103',
      name: 'Collector Display Box',
      category: 'Storage',
      price: 89.99,
      score: 0.82,
      reason: type === 'similar' ? '同じブランドの人気商品' : 'コレクターに人気',
    },
  ];

  res.json({
    recommendations,
    model: 'Collaborative Filtering',
    context: { customerId, productId, type },
  });
});

// --- 異常検知 ---
router.get('/anomalies', (req, res) => {
  const { type, severity, status } = req.query;

  const anomalies = [
    {
      id: 'anom_001',
      type: 'SALES_SPIKE',
      severity: 'MEDIUM',
      status: 'OPEN',
      description: '商品Aの売上が通常の3倍に急増',
      detectedAt: '2026-02-15T08:30:00Z',
      metric: 'daily_sales',
      expected: 50,
      actual: 150,
      deviation: 200,
      possibleCauses: ['プロモーション効果', 'バイラル効果', 'データ異常'],
    },
    {
      id: 'anom_002',
      type: 'PRICE_DROP',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      description: '競合が大幅値下げ（-30%）',
      detectedAt: '2026-02-15T07:15:00Z',
      metric: 'competitor_price',
      expected: 299.99,
      actual: 209.99,
      deviation: -30,
      possibleCauses: ['在庫処分', '新モデル発売前', 'キャンペーン'],
    },
    {
      id: 'anom_003',
      type: 'CONVERSION_DROP',
      severity: 'HIGH',
      status: 'OPEN',
      description: 'カテゴリBのコンバージョン率が急落',
      detectedAt: '2026-02-15T06:00:00Z',
      metric: 'conversion_rate',
      expected: 3.5,
      actual: 1.2,
      deviation: -65.7,
      possibleCauses: ['ページ表示エラー', '価格競争力低下', 'シーズン要因'],
    },
  ];

  let filtered = [...anomalies];
  if (type) filtered = filtered.filter(a => a.type === type);
  if (severity) filtered = filtered.filter(a => a.severity === severity);
  if (status) filtered = filtered.filter(a => a.status === status);

  res.json({
    anomalies: filtered,
    total: filtered.length,
    summary: {
      bySeverity: {
        high: anomalies.filter(a => a.severity === 'HIGH').length,
        medium: anomalies.filter(a => a.severity === 'MEDIUM').length,
        low: anomalies.filter(a => a.severity === 'LOW').length,
      },
    },
  });
});

// 異常ステータス更新
router.put('/anomalies/:id/status', (req, res) => {
  const schema = z.object({
    status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    id: req.params.id,
    status: parsed.data.status,
    updatedAt: new Date().toISOString(),
  });
});

// --- トレンド分析 ---
router.get('/trends', (req, res) => {
  res.json({
    trends: [
      {
        id: 'trend_001',
        name: 'ヴィンテージ時計の需要増加',
        category: 'Watches',
        direction: 'UP',
        strength: 0.85,
        startDate: '2026-01-01',
        description: '1960-80年代の機械式時計への関心が高まっています',
        keywords: ['vintage', 'mechanical', 'automatic', 'seiko', 'omega'],
        actionItems: ['在庫補充', 'SEOキーワード更新', '関連商品バンドル'],
      },
      {
        id: 'trend_002',
        name: 'エコ商品の人気上昇',
        category: 'Home',
        direction: 'UP',
        strength: 0.72,
        startDate: '2025-11-01',
        description: '環境に配慮した商品への需要が増加',
        keywords: ['eco-friendly', 'sustainable', 'organic', 'recycled'],
        actionItems: ['エコ商品の仕入れ強化', 'サステナビリティラベル追加'],
      },
      {
        id: 'trend_003',
        name: 'フィルムカメラの再流行',
        category: 'Electronics',
        direction: 'STABLE',
        strength: 0.65,
        startDate: '2025-06-01',
        description: '35mmフィルムカメラへの若年層の関心が持続',
        keywords: ['film camera', '35mm', 'analog', 'retro'],
        actionItems: ['フィルム関連アクセサリー強化', 'ガイドコンテンツ作成'],
      },
    ],
    analyzedAt: new Date().toISOString(),
  });
});

// --- モデル管理 ---
const models = [
  {
    id: 'model_001',
    name: 'Sales Forecaster',
    type: 'TIME_SERIES',
    algorithm: 'Prophet',
    version: '2.1.0',
    status: 'ACTIVE',
    accuracy: { mape: 8.5, rmse: 420.5 },
    trainedAt: '2026-02-15T00:00:00Z',
    nextTraining: '2026-02-22T00:00:00Z',
  },
  {
    id: 'model_002',
    name: 'Price Optimizer',
    type: 'REGRESSION',
    algorithm: 'XGBoost',
    version: '1.5.0',
    status: 'ACTIVE',
    accuracy: { mae: 12.5, r2: 0.89 },
    trainedAt: '2026-02-14T00:00:00Z',
    nextTraining: '2026-02-21T00:00:00Z',
  },
  {
    id: 'model_003',
    name: 'Customer Segmentation',
    type: 'CLUSTERING',
    algorithm: 'K-Means',
    version: '1.2.0',
    status: 'ACTIVE',
    accuracy: { silhouette: 0.72 },
    trainedAt: '2026-02-01T00:00:00Z',
    nextTraining: '2026-03-01T00:00:00Z',
  },
  {
    id: 'model_004',
    name: 'Anomaly Detector',
    type: 'ANOMALY_DETECTION',
    algorithm: 'Isolation Forest',
    version: '1.0.0',
    status: 'ACTIVE',
    accuracy: { precision: 0.88, recall: 0.82 },
    trainedAt: '2026-02-10T00:00:00Z',
    nextTraining: '2026-02-24T00:00:00Z',
  },
];

router.get('/models', (req, res) => {
  res.json({
    models,
    total: models.length,
  });
});

router.get('/models/:id', (req, res) => {
  const model = models.find(m => m.id === req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }
  res.json(model);
});

router.post('/models/:id/retrain', (req, res) => {
  const model = models.find(m => m.id === req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  res.json({
    modelId: model.id,
    jobId: `train_${Date.now()}`,
    status: 'QUEUED',
    estimatedTime: '15-30 minutes',
    message: 'Model retraining job queued',
  });
});

// --- インサイトサマリー ---
router.get('/summary', (req, res) => {
  res.json({
    kpis: {
      predictedRevenue30d: 185000,
      revenueGrowth: 12.5,
      demandAccuracy: 92,
      anomaliesDetected: 3,
    },
    topInsights: [
      { type: 'OPPORTUNITY', message: '週末に向けて在庫補充を推奨（3商品）', priority: 'HIGH' },
      { type: 'WARNING', message: '競合の価格変動を検知（2商品）', priority: 'MEDIUM' },
      { type: 'INFO', message: '新しいトレンド検出：ヴィンテージカメラ', priority: 'LOW' },
    ],
    modelHealth: {
      active: 4,
      total: 4,
      avgAccuracy: 0.88,
    },
    lastUpdated: new Date().toISOString(),
  });
});

// --- A/B テスト分析 ---
router.get('/experiments', (req, res) => {
  res.json({
    experiments: [
      {
        id: 'exp_001',
        name: '価格表示テスト',
        status: 'RUNNING',
        startDate: '2026-02-01',
        endDate: null,
        variants: [
          { id: 'control', name: 'Control', traffic: 50, conversions: 125, revenue: 12500 },
          { id: 'variant_a', name: '値引き表示', traffic: 50, conversions: 145, revenue: 13050 },
        ],
        winner: null,
        statisticalSignificance: 0.85,
        minimumSampleReached: true,
      },
      {
        id: 'exp_002',
        name: '送料無料閾値テスト',
        status: 'COMPLETED',
        startDate: '2026-01-15',
        endDate: '2026-02-14',
        variants: [
          { id: 'control', name: '$50以上無料', traffic: 33, conversions: 890, revenue: 44500 },
          { id: 'variant_a', name: '$30以上無料', traffic: 33, conversions: 1050, revenue: 36750 },
          { id: 'variant_b', name: '$75以上無料', traffic: 34, conversions: 720, revenue: 54000 },
        ],
        winner: 'variant_b',
        statisticalSignificance: 0.95,
        minimumSampleReached: true,
      },
    ],
    total: 2,
  });
});

router.get('/experiments/:id/analysis', (req, res) => {
  res.json({
    experimentId: req.params.id,
    summary: {
      duration: '14 days',
      totalSamples: 10000,
      significance: 0.95,
    },
    metrics: {
      conversionRate: { control: 2.5, variant: 2.9, lift: 16 },
      avgOrderValue: { control: 100, variant: 90, lift: -10 },
      revenuePerUser: { control: 2.5, variant: 2.61, lift: 4.4 },
    },
    recommendation: 'variant_aを採用することで、コンバージョン率が16%向上する見込みです',
  });
});

export { router as ebayMlInsightsRouter };

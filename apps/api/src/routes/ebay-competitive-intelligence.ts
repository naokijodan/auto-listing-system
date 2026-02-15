import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// 競合インテリジェンスダッシュボード
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      trackedCompetitors: 45,
      trackedProducts: 234,
      priceAlerts: 12,
      marketPosition: 3,
      avgPriceDiff: -5.2,
    },
    marketShare: {
      you: 15.5,
      competitor1: 22.3,
      competitor2: 18.7,
      competitor3: 12.4,
      others: 31.1,
    },
    priceComparison: {
      cheaper: { count: 89, percentage: 38 },
      similar: { count: 98, percentage: 42 },
      expensive: { count: 47, percentage: 20 },
    },
    recentChanges: [
      { competitor: 'TechSeller Pro', product: 'Sony WH-1000XM5', change: -8.5, newPrice: 274.99, timestamp: '2026-02-16T09:30:00Z' },
      { competitor: 'AudioKing', product: 'Apple AirPods Pro', change: 5.0, newPrice: 249.99, timestamp: '2026-02-16T08:45:00Z' },
    ],
    alerts: [
      { id: 'alert-001', type: 'price_undercut', competitor: 'TechSeller Pro', product: 'Sony WH-1000XM5', impact: 'high', createdAt: '2026-02-16T09:30:00Z' },
      { id: 'alert-002', type: 'new_listing', competitor: 'AudioKing', product: 'Bose QuietComfort', impact: 'medium', createdAt: '2026-02-16T08:00:00Z' },
    ],
  };
  res.json(dashboard);
});

// 市場トレンド
router.get('/dashboard/market-trends', async (req, res) => {
  const { period = '30d' } = req.query;
  const trends = {
    period,
    avgPrice: [
      { date: '2026-02-01', you: 285.50, market: 292.30 },
      { date: '2026-02-08', you: 282.00, market: 290.50 },
      { date: '2026-02-15', you: 279.99, market: 288.00 },
    ],
    salesVolume: [
      { date: '2026-02-01', you: 45, market: 890 },
      { date: '2026-02-08', you: 52, market: 920 },
      { date: '2026-02-15', you: 58, market: 945 },
    ],
    seasonality: {
      currentPeriod: 'post_holiday',
      trend: 'recovering',
      forecast: { nextMonth: 5.2, confidence: 0.78 },
    },
  };
  res.json(trends);
});

// 競争力スコア
router.get('/dashboard/competitiveness', async (_req, res) => {
  const competitiveness = {
    overallScore: 72,
    factors: [
      { factor: 'price', score: 68, weight: 0.35, trend: 'improving' },
      { factor: 'shipping', score: 82, weight: 0.25, trend: 'stable' },
      { factor: 'feedback', score: 88, weight: 0.20, trend: 'stable' },
      { factor: 'selection', score: 55, weight: 0.20, trend: 'declining' },
    ],
    recommendations: [
      { priority: 'high', action: 'Expand product selection in Electronics', impact: '+8 competitiveness score' },
      { priority: 'medium', action: 'Lower prices on slow-moving items', impact: '+5 competitiveness score' },
    ],
  };
  res.json(competitiveness);
});

// ===== 競合管理 =====

// 競合一覧
router.get('/competitors', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const competitors = {
    items: [
      {
        id: 'comp-001',
        name: 'TechSeller Pro',
        sellerId: 'techsellerpro',
        profileUrl: 'https://ebay.com/usr/techsellerpro',
        feedbackScore: 98.5,
        totalListings: 1234,
        trackedProducts: 45,
        avgPriceDiff: -3.2,
        status: 'tracking',
        lastUpdated: '2026-02-16T10:00:00Z',
      },
      {
        id: 'comp-002',
        name: 'AudioKing',
        sellerId: 'audioking',
        profileUrl: 'https://ebay.com/usr/audioking',
        feedbackScore: 99.1,
        totalListings: 567,
        trackedProducts: 28,
        avgPriceDiff: 5.8,
        status: 'tracking',
        lastUpdated: '2026-02-16T09:45:00Z',
      },
    ],
    total: 45,
    page: Number(page),
    limit: Number(limit),
    filters: { status },
  };
  res.json(competitors);
});

// 競合詳細
router.get('/competitors/:id', async (req, res) => {
  const { id } = req.params;
  const competitor = {
    id,
    name: 'TechSeller Pro',
    sellerId: 'techsellerpro',
    profileUrl: 'https://ebay.com/usr/techsellerpro',
    feedbackScore: 98.5,
    feedbackCount: 23456,
    memberSince: '2015-03-15',
    topRatedSeller: true,
    stats: {
      totalListings: 1234,
      avgPrice: 156.78,
      avgShipping: 8.50,
      responseTime: 2.5,
    },
    categories: [
      { category: 'Electronics', listings: 456, percentage: 37 },
      { category: 'Audio', listings: 389, percentage: 31.5 },
      { category: 'Accessories', listings: 234, percentage: 19 },
    ],
    priceAnalysis: {
      cheaper: 35,
      similar: 45,
      expensive: 20,
      avgDiff: -3.2,
    },
    trackedProducts: [
      { id: 'prod-001', title: 'Sony WH-1000XM5', yourPrice: 299.99, theirPrice: 274.99, diff: -8.3 },
      { id: 'prod-002', title: 'Apple AirPods Pro', yourPrice: 249.99, theirPrice: 254.99, diff: 2.0 },
    ],
    priceHistory: [
      { date: '2026-02-01', avgPrice: 162.50 },
      { date: '2026-02-08', avgPrice: 158.90 },
      { date: '2026-02-15', avgPrice: 156.78 },
    ],
  };
  res.json(competitor);
});

// 競合追加
const addCompetitorSchema = z.object({
  sellerId: z.string(),
  name: z.string().optional(),
  categories: z.array(z.string()).optional(),
  productsToTrack: z.array(z.string()).optional(),
});

router.post('/competitors', async (req, res) => {
  const data = addCompetitorSchema.parse(req.body);
  res.json({
    success: true,
    competitorId: `comp-${Date.now()}`,
    ...data,
    status: 'tracking',
    createdAt: new Date().toISOString(),
  });
});

// 競合削除
router.delete('/competitors/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, competitorId: id, deleted: true });
});

// 競合を再スキャン
router.post('/competitors/:id/scan', async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    competitorId: id,
    jobId: `scan-${Date.now()}`,
    message: 'Scan started',
  });
});

// ===== 商品比較 =====

// 商品比較一覧
router.get('/products', async (req, res) => {
  const { competitorId, category, page = 1, limit = 20 } = req.query;
  const products = {
    items: [
      {
        id: 'prod-001',
        yourListing: {
          listingId: 'lst-001',
          title: 'Sony WH-1000XM5 Wireless Headphones',
          price: 299.99,
          shipping: 0,
          stock: 45,
          sold30d: 23,
        },
        competitors: [
          { competitorId: 'comp-001', name: 'TechSeller Pro', price: 274.99, shipping: 0, diff: -8.3 },
          { competitorId: 'comp-002', name: 'AudioKing', price: 289.99, shipping: 9.99, diff: -3.3 },
        ],
        marketAvg: 285.50,
        yourPosition: 3,
        recommendation: 'Consider lowering price by $10',
      },
    ],
    total: 234,
    page: Number(page),
    limit: Number(limit),
    filters: { competitorId, category },
  };
  res.json(products);
});

// 商品比較詳細
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const product = {
    id,
    yourListing: {
      listingId: 'lst-001',
      title: 'Sony WH-1000XM5 Wireless Headphones',
      price: 299.99,
      shipping: 0,
      condition: 'New',
      stock: 45,
      sold30d: 23,
      views30d: 890,
      conversionRate: 2.58,
    },
    competitors: [
      {
        competitorId: 'comp-001',
        name: 'TechSeller Pro',
        listingUrl: 'https://ebay.com/itm/123',
        price: 274.99,
        shipping: 0,
        condition: 'New',
        soldCount: 56,
        feedback: 98.5,
        diff: -8.3,
      },
      {
        competitorId: 'comp-002',
        name: 'AudioKing',
        listingUrl: 'https://ebay.com/itm/456',
        price: 289.99,
        shipping: 9.99,
        condition: 'New',
        soldCount: 34,
        feedback: 99.1,
        diff: -3.3,
      },
    ],
    priceHistory: {
      yours: [
        { date: '2026-02-01', price: 309.99 },
        { date: '2026-02-08', price: 299.99 },
        { date: '2026-02-15', price: 299.99 },
      ],
      market: [
        { date: '2026-02-01', avg: 295.50, min: 275.00, max: 320.00 },
        { date: '2026-02-08', avg: 290.00, min: 270.00, max: 315.00 },
        { date: '2026-02-15', avg: 285.50, min: 265.00, max: 310.00 },
      ],
    },
    recommendation: {
      action: 'lower_price',
      targetPrice: 284.99,
      expectedImpact: { sales: '+15%', revenue: '+8%' },
      confidence: 0.82,
    },
  };
  res.json(product);
});

// 商品追跡追加
const trackProductSchema = z.object({
  listingId: z.string(),
  competitorIds: z.array(z.string()).optional(),
  alertThreshold: z.number().optional(),
});

router.post('/products/track', async (req, res) => {
  const data = trackProductSchema.parse(req.body);
  res.json({
    success: true,
    trackingId: `track-${Date.now()}`,
    ...data,
    status: 'active',
  });
});

// ===== アラート管理 =====

// アラート一覧
router.get('/alerts', async (req, res) => {
  const { type, status, page = 1, limit = 20 } = req.query;
  const alerts = {
    items: [
      {
        id: 'alert-001',
        type: 'price_undercut',
        priority: 'high',
        product: { id: 'prod-001', title: 'Sony WH-1000XM5' },
        competitor: { id: 'comp-001', name: 'TechSeller Pro' },
        details: { yourPrice: 299.99, theirPrice: 274.99, diff: -8.3 },
        status: 'unread',
        createdAt: '2026-02-16T09:30:00Z',
      },
      {
        id: 'alert-002',
        type: 'new_competitor',
        priority: 'medium',
        competitor: { id: 'comp-new', name: 'NewSeller123' },
        details: { listings: 45, category: 'Electronics' },
        status: 'unread',
        createdAt: '2026-02-16T08:00:00Z',
      },
    ],
    total: 12,
    page: Number(page),
    limit: Number(limit),
    filters: { type, status },
  };
  res.json(alerts);
});

// アラートを既読にする
router.post('/alerts/:id/read', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, alertId: id, status: 'read' });
});

// 一括既読
const bulkReadSchema = z.object({
  alertIds: z.array(z.string()),
});

router.post('/alerts/bulk-read', async (req, res) => {
  const data = bulkReadSchema.parse(req.body);
  res.json({ success: true, updated: data.alertIds.length });
});

// アラートルール一覧
router.get('/alerts/rules', async (_req, res) => {
  const rules = [
    {
      id: 'rule-001',
      name: 'Price undercut alert',
      type: 'price_change',
      conditions: { direction: 'down', threshold: 5 },
      enabled: true,
      notifications: ['email', 'dashboard'],
    },
    {
      id: 'rule-002',
      name: 'New competitor alert',
      type: 'new_competitor',
      conditions: { minListings: 10 },
      enabled: true,
      notifications: ['dashboard'],
    },
  ];
  res.json(rules);
});

// アラートルール作成
const createAlertRuleSchema = z.object({
  name: z.string(),
  type: z.enum(['price_change', 'new_competitor', 'stock_change', 'listing_change']),
  conditions: z.record(z.unknown()),
  notifications: z.array(z.string()),
});

router.post('/alerts/rules', async (req, res) => {
  const data = createAlertRuleSchema.parse(req.body);
  res.json({
    success: true,
    ruleId: `rule-${Date.now()}`,
    ...data,
    enabled: true,
  });
});

// ===== レポート =====

// 競合レポート生成
router.get('/reports/competitor/:id', async (req, res) => {
  const { id } = req.params;
  const { period = '30d' } = req.query;
  const report = {
    competitorId: id,
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      priceChanges: 23,
      newListings: 45,
      removedListings: 12,
      avgPriceChange: -2.5,
    },
    priceAnalysis: {
      categories: [
        { category: 'Electronics', avgChange: -3.2, trend: 'decreasing' },
        { category: 'Audio', avgChange: 1.5, trend: 'increasing' },
      ],
    },
    recommendations: [
      { action: 'Match prices in Electronics', priority: 'high' },
      { action: 'Monitor Audio category for opportunities', priority: 'medium' },
    ],
  };
  res.json(report);
});

// 市場レポート
router.get('/reports/market', async (req, res) => {
  const { category, period = '30d' } = req.query;
  const report = {
    category: category || 'all',
    period,
    generatedAt: new Date().toISOString(),
    marketSize: { listings: 45678, sellers: 234, avgPrice: 125.50 },
    trends: {
      priceDirection: 'stable',
      volumeDirection: 'increasing',
      competitionLevel: 'high',
    },
    topSellers: [
      { name: 'TechSeller Pro', marketShare: 22.3, trend: 'growing' },
      { name: 'AudioKing', marketShare: 18.7, trend: 'stable' },
    ],
    opportunities: [
      { type: 'pricing_gap', description: 'Opportunity in $50-$100 range', potential: 'high' },
      { type: 'underserved_niche', description: 'Vintage audio equipment', potential: 'medium' },
    ],
  };
  res.json(report);
});

// ===== 設定 =====

// モニタリング設定取得
router.get('/settings/monitoring', async (_req, res) => {
  const settings = {
    scanFrequency: {
      competitors: 'hourly',
      products: 'every_6h',
      market: 'daily',
    },
    dataRetention: {
      priceHistory: 90,
      alerts: 30,
    },
    autoTracking: {
      enabled: true,
      categories: ['Electronics', 'Audio'],
      minListings: 5,
    },
  };
  res.json(settings);
});

// モニタリング設定更新
router.put('/settings/monitoring', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// 通知設定取得
router.get('/settings/notifications', async (_req, res) => {
  const settings = {
    priceChanges: {
      enabled: true,
      threshold: 5,
      channels: ['email', 'dashboard'],
    },
    newCompetitors: {
      enabled: true,
      channels: ['dashboard'],
    },
    dailyDigest: {
      enabled: true,
      time: '09:00',
      channels: ['email'],
    },
  };
  res.json(settings);
});

// 通知設定更新
router.put('/settings/notifications', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

export const ebayCompetitiveIntelligenceRouter = router;

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 179: Analytics Dashboard v2 API
// 分析ダッシュボードv2
// ============================================

// --- ダッシュボード概要 ---

// サマリー
router.get('/summary', async (req, res) => {
  const period = req.query.period || '30d';

  res.json({
    period,
    revenue: {
      total: 125840.50,
      change: 12.5,
      trend: 'up',
    },
    orders: {
      total: 1250,
      change: 8.3,
      trend: 'up',
    },
    avgOrderValue: {
      value: 100.67,
      change: 3.8,
      trend: 'up',
    },
    conversionRate: {
      value: 3.2,
      change: -0.5,
      trend: 'down',
    },
    activeListings: {
      total: 450,
      change: 15,
      trend: 'up',
    },
    views: {
      total: 45000,
      change: 22.1,
      trend: 'up',
    },
  });
});

// リアルタイム統計
router.get('/realtime', async (_req, res) => {
  res.json({
    activeVisitors: 125,
    ordersToday: 42,
    revenueToday: 4250.00,
    viewsToday: 1580,
    topListings: [
      { id: 'lst_1', title: 'Vintage Watch', views: 45, orders: 3 },
      { id: 'lst_2', title: 'Designer Bag', views: 38, orders: 2 },
      { id: 'lst_3', title: 'Antique Vase', views: 32, orders: 1 },
    ],
    recentOrders: [
      { id: 'ord_1', amount: 150.00, timestamp: '2026-02-15T10:30:00Z' },
      { id: 'ord_2', amount: 85.50, timestamp: '2026-02-15T10:25:00Z' },
    ],
  });
});

// --- 売上分析 ---

// 売上推移
router.get('/sales/trends', async (req, res) => {
  const period = req.query.period || '30d';

  res.json({
    period,
    data: [
      { date: '2026-02-14', revenue: 4250.00, orders: 42, avgValue: 101.19 },
      { date: '2026-02-13', revenue: 3980.50, orders: 38, avgValue: 104.75 },
      { date: '2026-02-12', revenue: 4520.00, orders: 45, avgValue: 100.44 },
      { date: '2026-02-11', revenue: 3850.00, orders: 35, avgValue: 110.00 },
      { date: '2026-02-10', revenue: 4100.00, orders: 40, avgValue: 102.50 },
    ],
    comparison: {
      previousPeriod: {
        revenue: 112500.00,
        orders: 1150,
        change: {
          revenue: 11.8,
          orders: 8.7,
        },
      },
    },
  });
});

// カテゴリ別売上
router.get('/sales/by-category', async (req, res) => {
  res.json({
    data: [
      { category: 'Electronics', revenue: 45000.00, orders: 380, percentage: 35.7 },
      { category: 'Fashion', revenue: 32500.00, orders: 420, percentage: 25.8 },
      { category: 'Collectibles', revenue: 28000.00, orders: 280, percentage: 22.2 },
      { category: 'Home & Garden', revenue: 12500.00, orders: 120, percentage: 9.9 },
      { category: 'Others', revenue: 7840.50, orders: 50, percentage: 6.2 },
    ],
  });
});

// 地域別売上
router.get('/sales/by-region', async (req, res) => {
  res.json({
    data: [
      { region: 'United States', revenue: 62500.00, orders: 580, percentage: 49.6 },
      { region: 'United Kingdom', revenue: 25000.00, orders: 240, percentage: 19.8 },
      { region: 'Germany', revenue: 18500.00, orders: 180, percentage: 14.7 },
      { region: 'Japan', revenue: 12000.00, orders: 150, percentage: 9.5 },
      { region: 'Others', revenue: 7840.50, orders: 100, percentage: 6.2 },
    ],
  });
});

// 時間帯別売上
router.get('/sales/by-hour', async (_req, res) => {
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    revenue: Math.floor(Math.random() * 500) + 100,
    orders: Math.floor(Math.random() * 10) + 1,
  }));

  res.json({
    data: hourlyData,
    peakHours: [10, 14, 20],
    timezone: 'Asia/Tokyo',
  });
});

// --- 商品分析 ---

// トップセラー
router.get('/products/top-sellers', async (req, res) => {
  res.json({
    data: [
      { id: 'lst_1', title: 'Vintage Rolex Watch', revenue: 8500.00, units: 5, avgPrice: 1700.00, views: 1250 },
      { id: 'lst_2', title: 'Louis Vuitton Bag', revenue: 6200.00, units: 4, avgPrice: 1550.00, views: 980 },
      { id: 'lst_3', title: 'Antique Japanese Vase', revenue: 4800.00, units: 8, avgPrice: 600.00, views: 720 },
      { id: 'lst_4', title: 'Vintage Camera', revenue: 3600.00, units: 12, avgPrice: 300.00, views: 650 },
      { id: 'lst_5', title: 'Designer Sunglasses', revenue: 2400.00, units: 20, avgPrice: 120.00, views: 580 },
    ],
  });
});

// 商品パフォーマンス
router.get('/products/performance', async (req, res) => {
  res.json({
    metrics: {
      avgViewsPerListing: 85,
      avgWatchersPerListing: 12,
      avgConversionRate: 3.2,
      avgDaysToSell: 14,
    },
    distribution: {
      byPerformance: [
        { level: 'High', count: 45, percentage: 10 },
        { level: 'Medium', count: 180, percentage: 40 },
        { level: 'Low', count: 150, percentage: 33.3 },
        { level: 'Very Low', count: 75, percentage: 16.7 },
      ],
    },
    recommendations: [
      { listingId: 'lst_10', title: 'Low performing item', suggestion: '価格を10%下げることを検討', expectedImpact: '+25% views' },
      { listingId: 'lst_11', title: 'Stale listing', suggestion: '写真の更新を推奨', expectedImpact: '+15% conversion' },
    ],
  });
});

// 在庫分析
router.get('/products/inventory', async (_req, res) => {
  res.json({
    summary: {
      totalValue: 125000.00,
      totalItems: 450,
      avgAge: 21,
      turnoverRate: 4.2,
    },
    aging: [
      { range: '0-7 days', count: 85, value: 28000.00, percentage: 18.9 },
      { range: '8-14 days', count: 120, value: 42000.00, percentage: 26.7 },
      { range: '15-30 days', count: 150, value: 38000.00, percentage: 33.3 },
      { range: '31-60 days', count: 70, value: 12000.00, percentage: 15.6 },
      { range: '60+ days', count: 25, value: 5000.00, percentage: 5.6 },
    ],
    alerts: [
      { type: 'slow_moving', count: 25, message: '60日以上売れていない商品があります' },
      { type: 'low_stock', count: 5, message: '在庫切れ間近の人気商品があります' },
    ],
  });
});

// --- 顧客分析 ---

// 顧客概要
router.get('/customers/overview', async (_req, res) => {
  res.json({
    totalCustomers: 2850,
    newCustomers: {
      count: 320,
      change: 15.2,
    },
    returningCustomers: {
      count: 580,
      percentage: 20.4,
    },
    avgLifetimeValue: 285.50,
    segments: [
      { name: 'VIP', count: 85, revenue: 45000.00, percentage: 3 },
      { name: 'Regular', count: 580, revenue: 52000.00, percentage: 20.4 },
      { name: 'Occasional', count: 1200, revenue: 22000.00, percentage: 42.1 },
      { name: 'One-time', count: 985, revenue: 6840.50, percentage: 34.6 },
    ],
  });
});

// 顧客行動
router.get('/customers/behavior', async (_req, res) => {
  res.json({
    avgSessionDuration: 285,
    avgPagesPerSession: 8.5,
    bounceRate: 32.5,
    cartAbandonment: 68.5,
    deviceBreakdown: [
      { device: 'Mobile', percentage: 58.2 },
      { device: 'Desktop', percentage: 35.5 },
      { device: 'Tablet', percentage: 6.3 },
    ],
    topEntryPages: [
      { page: '/listings', views: 12500 },
      { page: '/categories/electronics', views: 8500 },
      { page: '/search', views: 6200 },
    ],
  });
});

// 顧客満足度
router.get('/customers/satisfaction', async (_req, res) => {
  res.json({
    nps: 72,
    csat: 4.5,
    feedbackBreakdown: {
      positive: 850,
      neutral: 120,
      negative: 30,
      total: 1000,
    },
    trends: [
      { month: '2026-02', nps: 72, csat: 4.5 },
      { month: '2026-01', nps: 70, csat: 4.4 },
      { month: '2025-12', nps: 68, csat: 4.3 },
    ],
  });
});

// --- トラフィック分析 ---

// トラフィック概要
router.get('/traffic/overview', async (req, res) => {
  res.json({
    totalVisits: 45000,
    uniqueVisitors: 28500,
    pageViews: 185000,
    avgSessionDuration: 285,
    sources: [
      { source: 'eBay Search', visits: 18000, percentage: 40 },
      { source: 'Direct', visits: 9000, percentage: 20 },
      { source: 'Google', visits: 6750, percentage: 15 },
      { source: 'Social Media', visits: 5400, percentage: 12 },
      { source: 'Email', visits: 3600, percentage: 8 },
      { source: 'Others', visits: 2250, percentage: 5 },
    ],
  });
});

// 検索キーワード
router.get('/traffic/keywords', async (_req, res) => {
  res.json({
    data: [
      { keyword: 'vintage watch', impressions: 5200, clicks: 520, ctr: 10.0, position: 3.2 },
      { keyword: 'designer bag', impressions: 4800, clicks: 384, ctr: 8.0, position: 4.5 },
      { keyword: 'antique vase', impressions: 3500, clicks: 315, ctr: 9.0, position: 2.8 },
      { keyword: 'collectible coins', impressions: 2800, clicks: 196, ctr: 7.0, position: 5.1 },
      { keyword: 'vintage camera', impressions: 2200, clicks: 176, ctr: 8.0, position: 3.9 },
    ],
    trending: ['retro electronics', 'japanese pottery', 'mid-century modern'],
  });
});

// --- カスタムレポート ---

// レポート一覧
router.get('/reports', async (_req, res) => {
  const reports = [
    { id: 'rpt_1', name: '月次売上レポート', type: 'sales', schedule: 'monthly', lastRun: '2026-02-01', status: 'active' },
    { id: 'rpt_2', name: '週次在庫レポート', type: 'inventory', schedule: 'weekly', lastRun: '2026-02-12', status: 'active' },
    { id: 'rpt_3', name: '日次パフォーマンス', type: 'performance', schedule: 'daily', lastRun: '2026-02-15', status: 'active' },
  ];

  res.json({ reports, total: reports.length });
});

// レポート作成
router.post('/reports', async (req, res) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['sales', 'inventory', 'performance', 'customers', 'traffic']),
    metrics: z.array(z.string()),
    filters: z.record(z.any()).optional(),
    schedule: z.enum(['daily', 'weekly', 'monthly', 'none']).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `rpt_${Date.now()}`,
    ...data,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// レポート実行
router.post('/reports/:id/run', async (req, res) => {
  res.json({
    reportId: req.params.id,
    executionId: `exec_${Date.now()}`,
    status: 'running',
    startedAt: new Date().toISOString(),
  });
});

// レポートエクスポート
router.post('/reports/:id/export', async (req, res) => {
  const schema = z.object({
    format: z.enum(['csv', 'xlsx', 'pdf']),
    dateRange: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    reportId: req.params.id,
    format: data.format,
    downloadUrl: `https://example.com/exports/report_${req.params.id}.${data.format}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
});

// レポート削除
router.delete('/reports/:id', async (req, res) => {
  res.json({ success: true, reportId: req.params.id });
});

// --- アラート・通知 ---

// アラート一覧
router.get('/alerts', async (_req, res) => {
  const alerts = [
    { id: 'alert_1', type: 'sales_drop', severity: 'high', message: '売上が前週比20%減少しています', createdAt: '2026-02-15T08:00:00Z', acknowledged: false },
    { id: 'alert_2', type: 'low_inventory', severity: 'medium', message: '人気商品の在庫が残り3点です', createdAt: '2026-02-15T06:00:00Z', acknowledged: true },
    { id: 'alert_3', type: 'high_returns', severity: 'medium', message: '返品率が通常より高くなっています', createdAt: '2026-02-14T12:00:00Z', acknowledged: false },
  ];

  res.json({ alerts, total: alerts.length });
});

// アラート設定
router.get('/alerts/settings', async (_req, res) => {
  res.json({
    rules: [
      { id: 'rule_1', type: 'sales_drop', threshold: 20, enabled: true },
      { id: 'rule_2', type: 'low_inventory', threshold: 5, enabled: true },
      { id: 'rule_3', type: 'high_returns', threshold: 10, enabled: true },
      { id: 'rule_4', type: 'negative_feedback', threshold: 3, enabled: true },
    ],
    notifications: {
      email: true,
      push: true,
      slack: false,
    },
  });
});

// アラート設定更新
router.put('/alerts/settings', async (req, res) => {
  const schema = z.object({
    rules: z.array(z.object({
      id: z.string(),
      threshold: z.number(),
      enabled: z.boolean(),
    })).optional(),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      slack: z.boolean(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- ダッシュボード設定 ---

// ウィジェット一覧
router.get('/widgets', async (_req, res) => {
  const widgets = [
    { id: 'widget_1', type: 'revenue_chart', title: '売上推移', position: { x: 0, y: 0, w: 6, h: 4 }, visible: true },
    { id: 'widget_2', type: 'orders_summary', title: '注文サマリー', position: { x: 6, y: 0, w: 3, h: 2 }, visible: true },
    { id: 'widget_3', type: 'top_products', title: 'トップセラー', position: { x: 6, y: 2, w: 3, h: 2 }, visible: true },
    { id: 'widget_4', type: 'traffic_sources', title: 'トラフィック', position: { x: 9, y: 0, w: 3, h: 4 }, visible: true },
    { id: 'widget_5', type: 'alerts', title: 'アラート', position: { x: 0, y: 4, w: 4, h: 2 }, visible: true },
  ];

  res.json({ widgets });
});

// ウィジェット更新
router.put('/widgets', async (req, res) => {
  const schema = z.object({
    widgets: z.array(z.object({
      id: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }).optional(),
      visible: z.boolean().optional(),
    })),
  });

  const data = schema.parse(req.body);

  res.json({
    widgets: data.widgets,
    updatedAt: new Date().toISOString(),
  });
});

// --- 比較分析 ---

// 期間比較
router.get('/compare', async (req, res) => {
  const schema = z.object({
    period1: z.string(),
    period2: z.string(),
    metrics: z.string().optional(),
  });

  const query = schema.parse(req.query);

  res.json({
    period1: {
      label: query.period1,
      revenue: 125840.50,
      orders: 1250,
      avgOrderValue: 100.67,
      views: 45000,
    },
    period2: {
      label: query.period2,
      revenue: 112500.00,
      orders: 1150,
      avgOrderValue: 97.83,
      views: 38000,
    },
    changes: {
      revenue: { value: 13340.50, percentage: 11.9 },
      orders: { value: 100, percentage: 8.7 },
      avgOrderValue: { value: 2.84, percentage: 2.9 },
      views: { value: 7000, percentage: 18.4 },
    },
  });
});

// ベンチマーク
router.get('/benchmark', async (_req, res) => {
  res.json({
    yourPerformance: {
      conversionRate: 3.2,
      avgPrice: 100.67,
      shippingSpeed: 2.5,
      feedbackScore: 4.8,
    },
    categoryAverage: {
      conversionRate: 2.8,
      avgPrice: 85.50,
      shippingSpeed: 3.2,
      feedbackScore: 4.5,
    },
    topSellers: {
      conversionRate: 4.5,
      avgPrice: 120.00,
      shippingSpeed: 1.8,
      feedbackScore: 4.9,
    },
    ranking: {
      overall: 15,
      percentile: 92,
    },
  });
});

export const ebayAnalyticsDashboardV2Router = router;

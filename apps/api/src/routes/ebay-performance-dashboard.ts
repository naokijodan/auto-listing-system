import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 279: eBay Performance Dashboard（パフォーマンスダッシュボード）
// 28エンドポイント - テーマカラー: pink-600
// ============================================================

// スキーマ
const createWidgetSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CHART', 'METRIC', 'TABLE', 'GAUGE', 'MAP', 'HEATMAP']),
  dataSource: z.string(),
  config: z.object({
    chartType: z.string().optional(),
    metrics: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string(),
    })).optional(),
  }),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

// ========== メインダッシュボード ==========
router.get('/overview', async (req: Request, res: Response) => {
  res.json({
    revenue: { current: 125000, previous: 110000, change: 13.6 },
    orders: { current: 450, previous: 400, change: 12.5 },
    avgOrderValue: { current: 277.78, previous: 275.00, change: 1.0 },
    conversionRate: { current: 3.5, previous: 3.2, change: 9.4 },
    visitors: { current: 12857, previous: 12500, change: 2.9 },
    returnRate: { current: 2.1, previous: 2.5, change: -16.0 },
  });
});

router.get('/revenue', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    total: 125000,
    timeline: [
      { date: '2026-02-01', revenue: 4200, orders: 15 },
      { date: '2026-02-05', revenue: 4800, orders: 17 },
      { date: '2026-02-10', revenue: 5100, orders: 18 },
      { date: '2026-02-15', revenue: 4500, orders: 16 },
    ],
    byCategory: [
      { category: 'Watches', revenue: 50000, percent: 40 },
      { category: 'Electronics', revenue: 37500, percent: 30 },
      { category: 'Collectibles', revenue: 25000, percent: 20 },
      { category: 'Other', revenue: 12500, percent: 10 },
    ],
  });
});

router.get('/orders', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    total: 450,
    timeline: [
      { date: '2026-02-01', orders: 15, shipped: 14, pending: 1 },
      { date: '2026-02-05', orders: 17, shipped: 16, pending: 1 },
      { date: '2026-02-10', orders: 18, shipped: 18, pending: 0 },
      { date: '2026-02-15', orders: 16, shipped: 15, pending: 1 },
    ],
    byStatus: [
      { status: 'COMPLETED', count: 420, percent: 93.3 },
      { status: 'SHIPPED', count: 20, percent: 4.4 },
      { status: 'PENDING', count: 10, percent: 2.2 },
    ],
  });
});

// ========== 売上分析 ==========
router.get('/sales/by-product', async (req: Request, res: Response) => {
  res.json({
    products: [
      { sku: 'SKU001', name: 'Seiko 5 Sports', sales: 75, revenue: 15000, avgPrice: 200 },
      { sku: 'SKU002', name: 'Citizen Eco-Drive', sales: 50, revenue: 12500, avgPrice: 250 },
      { sku: 'SKU003', name: 'Orient Bambino', sales: 40, revenue: 8000, avgPrice: 200 },
    ],
    total: 2500,
  });
});

router.get('/sales/by-region', async (req: Request, res: Response) => {
  res.json({
    regions: [
      { region: 'North America', revenue: 50000, orders: 180, percent: 40 },
      { region: 'Europe', revenue: 37500, orders: 135, percent: 30 },
      { region: 'Asia', revenue: 25000, orders: 90, percent: 20 },
      { region: 'Other', revenue: 12500, orders: 45, percent: 10 },
    ],
  });
});

router.get('/sales/by-time', async (req: Request, res: Response) => {
  res.json({
    hourly: [
      { hour: 9, orders: 25, revenue: 6250 },
      { hour: 12, orders: 40, revenue: 10000 },
      { hour: 15, orders: 35, revenue: 8750 },
      { hour: 18, orders: 50, revenue: 12500 },
      { hour: 21, orders: 45, revenue: 11250 },
    ],
    peakHour: 18,
    peakDay: 'Saturday',
  });
});

// ========== トラフィック分析 ==========
router.get('/traffic/overview', async (req: Request, res: Response) => {
  res.json({
    visitors: 12857,
    pageViews: 45000,
    bounceRate: 35.5,
    avgSessionDuration: 245,
    sources: [
      { source: 'eBay Search', visitors: 6000, percent: 46.7 },
      { source: 'Direct', visitors: 3000, percent: 23.3 },
      { source: 'External Links', visitors: 2000, percent: 15.6 },
      { source: 'Social', visitors: 1857, percent: 14.4 },
    ],
  });
});

router.get('/traffic/listings', async (req: Request, res: Response) => {
  res.json({
    listings: [
      { id: 'L001', title: 'Seiko 5 Sports SRPD...', views: 1500, watchers: 45, soldCount: 25 },
      { id: 'L002', title: 'Citizen Eco-Drive...', views: 1200, watchers: 38, soldCount: 18 },
      { id: 'L003', title: 'Orient Bambino V2...', views: 1000, watchers: 30, soldCount: 15 },
    ],
    total: 500,
  });
});

// ========== 競合分析 ==========
router.get('/competitors/overview', async (req: Request, res: Response) => {
  res.json({
    trackedCompetitors: 15,
    avgPricePosition: 'COMPETITIVE',
    priceGap: -2.5,
    marketShare: 8.5,
    competitors: [
      { name: 'Competitor A', priceAvg: 205, volumeEstimate: 500, trend: 'stable' },
      { name: 'Competitor B', priceAvg: 195, volumeEstimate: 450, trend: 'increasing' },
      { name: 'Competitor C', priceAvg: 210, volumeEstimate: 350, trend: 'decreasing' },
    ],
  });
});

router.get('/competitors/price-comparison', async (req: Request, res: Response) => {
  res.json({
    comparisons: [
      { sku: 'SKU001', ourPrice: 200, avgCompetitor: 205, position: 'BELOW', gap: -2.4 },
      { sku: 'SKU002', ourPrice: 250, avgCompetitor: 245, position: 'ABOVE', gap: 2.0 },
      { sku: 'SKU003', ourPrice: 200, avgCompetitor: 200, position: 'EQUAL', gap: 0 },
    ],
    summary: { below: 150, equal: 50, above: 100 },
  });
});

// ========== KPIとメトリクス ==========
router.get('/kpis', async (req: Request, res: Response) => {
  res.json({
    kpis: [
      { name: 'Revenue', value: 125000, target: 120000, status: 'ON_TRACK', trend: 'up' },
      { name: 'Orders', value: 450, target: 500, status: 'BELOW_TARGET', trend: 'up' },
      { name: 'Conversion Rate', value: 3.5, target: 3.5, status: 'ON_TRACK', trend: 'stable' },
      { name: 'Customer Satisfaction', value: 98.2, target: 95, status: 'EXCEEDING', trend: 'up' },
      { name: 'Return Rate', value: 2.1, target: 3.0, status: 'EXCEEDING', trend: 'down' },
    ],
  });
});

router.get('/metrics/:metricId', async (req: Request, res: Response) => {
  res.json({
    id: req.params.metricId,
    name: 'Revenue',
    current: 125000,
    previous: 110000,
    change: 13.6,
    target: 120000,
    timeline: [
      { date: '2026-01', value: 100000 },
      { date: '2026-02', value: 125000 },
    ],
    forecast: { next: 135000, confidence: 85 },
  });
});

// ========== ウィジェット管理 ==========
router.get('/widgets', async (req: Request, res: Response) => {
  res.json({
    widgets: [
      { id: 'w1', name: 'Revenue Chart', type: 'CHART', position: { x: 0, y: 0, width: 2, height: 1 } },
      { id: 'w2', name: 'Orders Today', type: 'METRIC', position: { x: 2, y: 0, width: 1, height: 1 } },
      { id: 'w3', name: 'Top Products', type: 'TABLE', position: { x: 0, y: 1, width: 2, height: 1 } },
      { id: 'w4', name: 'Conversion Gauge', type: 'GAUGE', position: { x: 2, y: 1, width: 1, height: 1 } },
    ],
    total: 10,
  });
});

router.post('/widgets', async (req: Request, res: Response) => {
  const parsed = createWidgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid widget', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `widget_${Date.now()}`,
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});

router.put('/widgets/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/widgets/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

// ========== アラート ==========
router.get('/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: 'a1', type: 'revenue_drop', message: '売上が前日比20%減少', severity: 'high', createdAt: '2026-02-16T08:00:00Z' },
      { id: 'a2', type: 'stock_low', message: '10商品が在庫切れ間近', severity: 'warning', createdAt: '2026-02-16T09:00:00Z' },
      { id: 'a3', type: 'competitor_price', message: '競合が5商品で値下げ', severity: 'info', createdAt: '2026-02-16T10:00:00Z' },
    ],
    unread: 2,
  });
});

router.post('/alerts/dismiss/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, dismissed: true, dismissedAt: new Date().toISOString() });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    revenue: 125000,
    orders: 450,
    avgOrderValue: 277.78,
    topProducts: 3,
    insights: [
      'Watch category performed 15% above target',
      'Weekend sales increased by 20%',
      'Return rate improved by 16%',
    ],
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-performance-dashboard/reports/download/performance_report_2026_02.pdf',
    format: req.query.format || 'pdf',
    generatedAt: new Date().toISOString(),
  });
});

router.post('/reports/schedule', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `rpt_${Date.now()}`,
    schedule: req.body.schedule,
    recipients: req.body.recipients,
    format: req.body.format,
    createdAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    refreshInterval: 60,
    defaultPeriod: 'last_30_days',
    currency: 'USD',
    timezone: 'Asia/Tokyo',
    alertThresholds: {
      revenueDropPercent: 20,
      lowStockDays: 7,
      competitorPriceGap: 10,
    },
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

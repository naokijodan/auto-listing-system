import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 283: eBay Customer Insights（顧客インサイト）
// 28エンドポイント - テーマカラー: violet-600
// ============================================================

const segmentSchema = z.object({
  name: z.string().min(1),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })),
  description: z.string().optional(),
});

router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalCustomers: 5000,
    newCustomersThisMonth: 250,
    repeatCustomers: 1500,
    avgLifetimeValue: 450,
    churnRate: 5.2,
    npsScore: 72,
  });
});

router.get('/dashboard/overview', async (req: Request, res: Response) => {
  res.json({
    bySegment: [
      { segment: 'VIP', count: 500, revenue: 150000, avgOrders: 8.5 },
      { segment: 'Regular', count: 1500, revenue: 200000, avgOrders: 3.2 },
      { segment: 'New', count: 2000, revenue: 100000, avgOrders: 1.2 },
      { segment: 'At Risk', count: 1000, revenue: 50000, avgOrders: 0.5 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'churn_risk', message: '50人の顧客が離脱リスク', severity: 'high' },
      { id: '2', type: 'vip_inactive', message: '5人のVIP顧客が30日以上未購入', severity: 'warning' },
    ],
  });
});

router.get('/customers', async (req: Request, res: Response) => {
  res.json({
    customers: [
      { id: 'c1', name: 'John Smith', segment: 'VIP', orders: 25, ltv: 2500, lastOrder: '2026-02-10' },
      { id: 'c2', name: 'Jane Doe', segment: 'Regular', orders: 8, ltv: 800, lastOrder: '2026-02-05' },
    ],
    total: 5000,
  });
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'John Smith',
    segment: 'VIP',
    stats: { orders: 25, ltv: 2500, avgOrderValue: 100 },
    preferences: { categories: ['Watches', 'Electronics'] },
  });
});

router.get('/customers/:id/timeline', async (req: Request, res: Response) => {
  res.json({
    customerId: req.params.id,
    timeline: [
      { date: '2026-02-10', type: 'order', description: 'Placed order #12345' },
      { date: '2026-02-08', type: 'message', description: 'Asked about product' },
    ],
  });
});

router.post('/customers/:id/tags', async (req: Request, res: Response) => {
  res.json({ customerId: req.params.id, tags: req.body.tags, updatedAt: new Date().toISOString() });
});

router.get('/segments', async (req: Request, res: Response) => {
  res.json({
    segments: [
      { id: 's1', name: 'VIP', count: 500, avgLtv: 2000 },
      { id: 's2', name: 'Regular', count: 1500, avgLtv: 500 },
      { id: 's3', name: 'New', count: 2000, avgLtv: 100 },
      { id: 's4', name: 'At Risk', count: 1000, avgLtv: 300 },
    ],
  });
});

router.post('/segments', async (req: Request, res: Response) => {
  const parsed = segmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid segment', details: parsed.error.issues });
  res.status(201).json({ id: `seg_${Date.now()}`, ...parsed.data, count: 0, createdAt: new Date().toISOString() });
});

router.get('/segments/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'VIP',
    conditions: [{ field: 'ltv', operator: 'gte', value: 1000 }],
    count: 500,
    avgLtv: 2000,
    topCustomers: [
      { id: 'c1', name: 'John Smith', ltv: 5000 },
      { id: 'c5', name: 'Alice Brown', ltv: 4500 },
    ],
  });
});

router.put('/segments/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, ...req.body, updatedAt: new Date().toISOString() });
});

router.delete('/segments/:id', async (req: Request, res: Response) => {
  res.json({ deleted: true, segmentId: req.params.id });
});

// ========== ライフタイムバリュー ==========
router.get('/ltv/overview', async (req: Request, res: Response) => {
  res.json({
    avgLtv: 450,
    medianLtv: 300,
    topPercentileLtv: 5000,
    distribution: [
      { range: '$0-$100', count: 1500, percentage: 30 },
      { range: '$100-$500', count: 2000, percentage: 40 },
      { range: '$500-$1000', count: 1000, percentage: 20 },
      { range: '$1000+', count: 500, percentage: 10 },
    ],
  });
});

router.get('/ltv/trends', async (req: Request, res: Response) => {
  res.json({
    monthly: [
      { month: '2026-01', avgLtv: 420, newCustomerLtv: 80 },
      { month: '2025-12', avgLtv: 410, newCustomerLtv: 75 },
    ],
  });
});

// ========== コホート分析 ==========
router.get('/cohort', async (req: Request, res: Response) => {
  res.json({
    cohorts: [
      { month: '2025-12', size: 300, retention: [100, 65, 45, 38] },
      { month: '2025-11', size: 280, retention: [100, 60, 42, 35] },
      { month: '2025-10', size: 350, retention: [100, 58, 40, 32] },
    ],
  });
});

router.get('/cohort/:month', async (req: Request, res: Response) => {
  res.json({
    month: req.params.month,
    size: 300,
    retentionWeekly: [100, 80, 65, 55, 50, 48, 45, 42],
    avgOrdersPerCustomer: 2.3,
    avgRevenue: 230,
  });
});

// ========== リテンション・チャーン ==========
router.get('/retention', async (req: Request, res: Response) => {
  res.json({
    overall: 72,
    bySegment: [
      { segment: 'VIP', retention: 95 },
      { segment: 'Regular', retention: 70 },
      { segment: 'New', retention: 45 },
    ],
    trend: [
      { month: '2026-01', rate: 72 },
      { month: '2025-12', rate: 70 },
    ],
  });
});

router.get('/churn', async (req: Request, res: Response) => {
  res.json({
    churnRate: 5.2,
    atRiskCustomers: 150,
    churnedThisMonth: 50,
    reasons: [
      { reason: 'Price sensitivity', percentage: 35 },
      { reason: 'Better alternatives', percentage: 25 },
      { reason: 'Service issues', percentage: 20 },
      { reason: 'No longer needed', percentage: 20 },
    ],
  });
});

router.get('/churn/predictions', async (req: Request, res: Response) => {
  res.json({
    predictions: [
      { customerId: 'c10', name: 'Bob Wilson', churnProbability: 85, lastOrder: '2025-11-15' },
      { customerId: 'c22', name: 'Carol Davis', churnProbability: 72, lastOrder: '2025-12-01' },
    ],
    total: 150,
  });
});

// ========== 顧客フィードバック ==========
router.get('/feedback', async (req: Request, res: Response) => {
  res.json({
    avgRating: 4.5,
    totalReviews: 3200,
    npsScore: 72,
    recent: [
      { id: 'f1', customerId: 'c1', rating: 5, comment: 'Excellent service', date: '2026-02-14' },
      { id: 'f2', customerId: 'c2', rating: 4, comment: 'Good quality', date: '2026-02-13' },
    ],
  });
});

router.get('/feedback/sentiment', async (req: Request, res: Response) => {
  res.json({
    positive: 75,
    neutral: 15,
    negative: 10,
    topTopics: [
      { topic: 'Shipping speed', sentiment: 'positive', mentions: 450 },
      { topic: 'Product quality', sentiment: 'positive', mentions: 380 },
      { topic: 'Customer support', sentiment: 'neutral', mentions: 200 },
    ],
  });
});

// ========== RFM分析 ==========
router.get('/rfm', async (req: Request, res: Response) => {
  res.json({
    segments: [
      { rfmScore: '555', label: 'Champions', count: 200, avgRevenue: 3000 },
      { rfmScore: '444', label: 'Loyal', count: 400, avgRevenue: 1500 },
      { rfmScore: '333', label: 'Potential', count: 800, avgRevenue: 500 },
      { rfmScore: '111', label: 'Lost', count: 600, avgRevenue: 50 },
    ],
  });
});

// ========== 購買パターン ==========
router.get('/purchase-patterns', async (req: Request, res: Response) => {
  res.json({
    topCategories: [
      { category: 'Watches', customers: 2500, avgSpend: 300 },
      { category: 'Electronics', customers: 1800, avgSpend: 200 },
    ],
    peakHours: [{ hour: 10, orders: 250 }, { hour: 14, orders: 300 }, { hour: 20, orders: 400 }],
    avgDaysBetweenOrders: 18,
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({ segmentAutoUpdate: true, churnThresholdDays: 60, vipThresholdLtv: 1000, emailAlerts: true });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({ ...req.body, updatedAt: new Date().toISOString() });
});

// ========== レポート ==========
router.get('/reports', async (req: Request, res: Response) => {
  res.json({
    reports: [
      { id: 'r1', name: 'Customer Segment Report', generatedAt: '2026-02-15', format: 'csv' },
      { id: 'r2', name: 'Churn Analysis', generatedAt: '2026-02-14', format: 'pdf' },
    ],
  });
});

router.post('/reports/generate', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `rpt_${Date.now()}`,
    name: req.body.name || 'Customer Insights Report',
    status: 'GENERATING',
    estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
  });
});

router.get('/reports/download', async (req: Request, res: Response) => {
  res.json({ downloadUrl: '/api/ebay-customer-insights/reports/download/report.csv', format: req.query.format || 'csv', generatedAt: new Date().toISOString() });
});

export default router;

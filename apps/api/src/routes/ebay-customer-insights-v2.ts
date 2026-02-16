import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 243: Customer Insights V2（顧客インサイトV2）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - 概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalCustomers: 8500,
    activeCustomers: 2800,
    newCustomers30d: 450,
    repeatCustomers: 1200,
    avgLifetimeValue: 285.50,
    avgOrdersPerCustomer: 2.3,
    churnRate: 5.2,
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/segments - セグメント概要
router.get('/dashboard/segments', async (_req: Request, res: Response) => {
  res.json({
    segments: [
      { id: 'segment_001', name: 'VIP Customers', count: 250, avgLtv: 1200.00, share: 2.9 },
      { id: 'segment_002', name: 'Repeat Buyers', count: 1200, avgLtv: 450.00, share: 14.1 },
      { id: 'segment_003', name: 'One-Time Buyers', count: 5800, avgLtv: 120.00, share: 68.2 },
      { id: 'segment_004', name: 'At Risk', count: 850, avgLtv: 85.00, share: 10.0 },
      { id: 'segment_005', name: 'Churned', count: 400, avgLtv: 50.00, share: 4.7 },
    ],
  });
});

// GET /dashboard/trends - トレンド
router.get('/dashboard/trends', async (_req: Request, res: Response) => {
  res.json({
    monthly: [
      { month: '2025-11', newCustomers: 380, repeatPurchases: 420, churnRate: 4.8 },
      { month: '2025-12', newCustomers: 520, repeatPurchases: 480, churnRate: 5.0 },
      { month: '2026-01', newCustomers: 420, repeatPurchases: 450, churnRate: 5.1 },
      { month: '2026-02', newCustomers: 450, repeatPurchases: 520, churnRate: 5.2 },
    ],
  });
});

// --- 顧客管理 ---

// GET /customers - 顧客一覧
router.get('/customers', async (req: Request, res: Response) => {
  res.json({
    customers: [
      { id: 'cust_001', username: 'john_doe', totalOrders: 15, totalSpent: 2500.00, avgOrderValue: 166.67, lastOrder: '2026-02-15', segment: 'VIP' },
      { id: 'cust_002', username: 'jane_smith', totalOrders: 5, totalSpent: 650.00, avgOrderValue: 130.00, lastOrder: '2026-02-10', segment: 'Repeat' },
      { id: 'cust_003', username: 'bob_wilson', totalOrders: 1, totalSpent: 95.00, avgOrderValue: 95.00, lastOrder: '2026-01-20', segment: 'One-Time' },
    ],
    total: 8500,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
});

// GET /customers/:id - 顧客詳細
router.get('/customers/:id', async (req: Request, res: Response) => {
  res.json({
    customer: {
      id: req.params.id,
      username: 'john_doe',
      email: 'john@example.com',
      location: { city: 'New York', state: 'NY', country: 'US' },
      stats: {
        totalOrders: 15,
        totalSpent: 2500.00,
        avgOrderValue: 166.67,
        firstOrder: '2024-05-10',
        lastOrder: '2026-02-15',
        lifetimeValue: 2500.00,
      },
      segment: 'VIP',
      preferences: {
        categories: ['Watches', 'Watch Accessories'],
        brands: ['Seiko', 'Orient', 'Casio'],
        priceRange: { min: 100, max: 500 },
      },
      orders: [
        { orderId: 'order_150', date: '2026-02-15', total: 380.00, items: 1 },
        { orderId: 'order_125', date: '2026-01-20', total: 250.00, items: 2 },
      ],
      feedback: { positive: 14, neutral: 1, negative: 0 },
    },
  });
});

// POST /customers/:id/tag - タグ追加
router.post('/customers/:id/tag', async (req: Request, res: Response) => {
  res.json({ success: true, customerId: req.params.id, message: 'タグを追加しました' });
});

// DELETE /customers/:id/tag/:tagId - タグ削除
router.delete('/customers/:id/tag/:tagId', async (req: Request, res: Response) => {
  res.json({ success: true, customerId: req.params.id, message: 'タグを削除しました' });
});

// --- セグメント管理 ---

// GET /segments - セグメント一覧
router.get('/segments', async (_req: Request, res: Response) => {
  res.json({
    segments: [
      { id: 'segment_001', name: 'VIP Customers', criteria: 'totalSpent > 1000 AND orders > 10', count: 250, avgLtv: 1200.00, active: true },
      { id: 'segment_002', name: 'Repeat Buyers', criteria: 'orders >= 2 AND orders < 10', count: 1200, avgLtv: 450.00, active: true },
      { id: 'segment_003', name: 'At Risk', criteria: 'daysSinceLastOrder > 90', count: 850, avgLtv: 85.00, active: true },
    ],
  });
});

// GET /segments/:id - セグメント詳細
router.get('/segments/:id', async (req: Request, res: Response) => {
  res.json({
    segment: {
      id: req.params.id,
      name: 'VIP Customers',
      description: 'High-value customers with significant purchase history',
      criteria: {
        rules: [
          { field: 'totalSpent', operator: 'greaterThan', value: 1000 },
          { field: 'orders', operator: 'greaterThan', value: 10 },
        ],
        logic: 'AND',
      },
      count: 250,
      stats: {
        avgLtv: 1200.00,
        avgOrders: 15.5,
        avgOrderValue: 185.00,
      },
      active: true,
      createdAt: '2026-01-01 00:00:00',
    },
  });
});

// POST /segments - セグメント作成
router.post('/segments', async (_req: Request, res: Response) => {
  res.json({ success: true, segmentId: 'segment_006', message: 'セグメントを作成しました' });
});

// PUT /segments/:id - セグメント更新
router.put('/segments/:id', async (req: Request, res: Response) => {
  res.json({ success: true, segmentId: req.params.id, message: 'セグメントを更新しました' });
});

// DELETE /segments/:id - セグメント削除
router.delete('/segments/:id', async (req: Request, res: Response) => {
  res.json({ success: true, segmentId: req.params.id, message: 'セグメントを削除しました' });
});

// --- 分析 ---

// GET /analytics/behavior - 行動分析
router.get('/analytics/behavior', async (_req: Request, res: Response) => {
  res.json({
    behavior: {
      purchasePatterns: {
        avgDaysBetweenOrders: 45,
        peakPurchaseDay: 'Saturday',
        peakPurchaseHour: 14,
      },
      categoryPreferences: [
        { category: 'Watches', percentage: 65 },
        { category: 'Watch Accessories', percentage: 25 },
        { category: 'Watch Parts', percentage: 10 },
      ],
      priceRange: {
        avg: 145.00,
        min: 25.00,
        max: 2500.00,
      },
    },
  });
});

// GET /analytics/cohort - コホート分析
router.get('/analytics/cohort', async (_req: Request, res: Response) => {
  res.json({
    cohorts: [
      { cohort: '2025-Q4', size: 520, month1: 100, month2: 45, month3: 28, month6: 15 },
      { cohort: '2026-Q1', size: 450, month1: 100, month2: 48, month3: 30, month6: null },
    ],
  });
});

// GET /analytics/rfm - RFM分析
router.get('/analytics/rfm', async (_req: Request, res: Response) => {
  res.json({
    rfm: {
      champions: { count: 250, percentage: 2.9, avgLtv: 1200.00 },
      loyalCustomers: { count: 450, percentage: 5.3, avgLtv: 650.00 },
      potentialLoyalists: { count: 800, percentage: 9.4, avgLtv: 350.00 },
      atRisk: { count: 850, percentage: 10.0, avgLtv: 85.00 },
      cantLose: { count: 200, percentage: 2.4, avgLtv: 450.00 },
      hibernating: { count: 1500, percentage: 17.6, avgLtv: 50.00 },
      lost: { count: 400, percentage: 4.7, avgLtv: 30.00 },
    },
  });
});

// --- キャンペーン ---

// GET /campaigns - キャンペーン一覧
router.get('/campaigns', async (_req: Request, res: Response) => {
  res.json({
    campaigns: [
      { id: 'campaign_001', name: 'VIP Appreciation', segment: 'VIP Customers', type: 'email', status: 'active', sent: 250, opened: 180, converted: 45 },
      { id: 'campaign_002', name: 'Win Back', segment: 'At Risk', type: 'email', status: 'draft', sent: 0, opened: 0, converted: 0 },
    ],
  });
});

// POST /campaigns - キャンペーン作成
router.post('/campaigns', async (_req: Request, res: Response) => {
  res.json({ success: true, campaignId: 'campaign_003', message: 'キャンペーンを作成しました' });
});

// --- レポート ---

// GET /reports/summary - サマリーレポート
router.get('/reports/summary', async (_req: Request, res: Response) => {
  res.json({
    report: {
      period: '2026-02',
      totalCustomers: 8500,
      newCustomers: 450,
      repeatRate: 28.5,
      avgLtv: 285.50,
      topSegments: [
        { name: 'VIP Customers', contribution: 35.5 },
        { name: 'Repeat Buyers', contribution: 32.2 },
      ],
      insights: [
        'VIP customers contribute 35% of revenue',
        'Churn rate increased 0.2% this month',
        'Weekend purchases up 15%',
      ],
    },
  });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      autoSegmentation: true,
      segmentationInterval: 'daily',
      trackBehavior: true,
      retentionDays: 365,
      churnThresholdDays: 90,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

export default router;

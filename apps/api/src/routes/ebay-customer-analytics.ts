import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// 顧客分析ダッシュボード
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalCustomers: 15678,
      activeCustomers: 4567,
      newCustomers30d: 234,
      repeatRate: 28.5,
      avgLifetimeValue: 456.78,
      churnRate: 3.2,
    },
    segments: [
      { segment: 'champions', count: 1234, revenue: 234567, percentage: 7.9 },
      { segment: 'loyal', count: 2345, revenue: 178901, percentage: 15.0 },
      { segment: 'potential', count: 3456, revenue: 123456, percentage: 22.0 },
      { segment: 'new', count: 4567, revenue: 89012, percentage: 29.1 },
      { segment: 'at_risk', count: 2345, revenue: 56789, percentage: 15.0 },
      { segment: 'dormant', count: 1731, revenue: 12345, percentage: 11.0 },
    ],
    trends: {
      customerGrowth: [
        { month: '2025-12', total: 14890, new: 198, churned: 45 },
        { month: '2026-01', total: 15234, new: 389, churned: 45 },
        { month: '2026-02', total: 15678, new: 489, churned: 45 },
      ],
      repeatPurchase: [
        { month: '2025-12', rate: 26.8 },
        { month: '2026-01', rate: 27.5 },
        { month: '2026-02', rate: 28.5 },
      ],
    },
    topCustomers: [
      { id: 'cust-001', username: 'power_buyer', totalOrders: 156, totalSpent: 12345.67, lastOrder: '2026-02-15' },
      { id: 'cust-002', username: 'loyal_shopper', totalOrders: 89, totalSpent: 8765.43, lastOrder: '2026-02-14' },
    ],
  };
  res.json(dashboard);
});

// 顧客獲得分析
router.get('/dashboard/acquisition', async (req, res) => {
  const { period = '30d' } = req.query;
  const acquisition = {
    period,
    sources: [
      { source: 'organic_search', customers: 89, percentage: 38.0, cac: 0 },
      { source: 'direct', customers: 56, percentage: 23.9, cac: 0 },
      { source: 'promoted_listings', customers: 45, percentage: 19.2, cac: 12.50 },
      { source: 'social', customers: 28, percentage: 12.0, cac: 8.75 },
      { source: 'email', customers: 16, percentage: 6.8, cac: 2.50 },
    ],
    trend: [
      { date: '2026-02-01', newCustomers: 8 },
      { date: '2026-02-08', newCustomers: 12 },
      { date: '2026-02-15', newCustomers: 15 },
    ],
    avgCac: 5.25,
    firstPurchaseValue: 67.89,
  };
  res.json(acquisition);
});

// 顧客維持分析
router.get('/dashboard/retention', async (_req, res) => {
  const retention = {
    cohortAnalysis: [
      { cohort: '2025-11', month0: 100, month1: 45, month2: 32, month3: 28 },
      { cohort: '2025-12', month0: 100, month1: 48, month2: 35, month3: null },
      { cohort: '2026-01', month0: 100, month1: 52, month2: null, month3: null },
    ],
    retentionBySegment: [
      { segment: 'champions', retention30: 95, retention60: 92, retention90: 88 },
      { segment: 'loyal', retention30: 78, retention60: 65, retention90: 55 },
      { segment: 'potential', retention30: 55, retention60: 40, retention90: 28 },
    ],
    churnRisk: [
      { id: 'cust-100', username: 'occasional_buyer', riskScore: 0.85, lastOrder: '2025-11-15', daysInactive: 93 },
      { id: 'cust-101', username: 'once_loyal', riskScore: 0.78, lastOrder: '2025-12-01', daysInactive: 77 },
    ],
  };
  res.json(retention);
});

// ===== 顧客管理 =====

// 顧客一覧
router.get('/customers', async (req, res) => {
  const { segment, sortBy, page = 1, limit = 20 } = req.query;
  const customers = {
    items: [
      {
        id: 'cust-001',
        username: 'power_buyer',
        email: 'power@example.com',
        segment: 'champion',
        metrics: {
          totalOrders: 156,
          totalSpent: 12345.67,
          avgOrderValue: 79.14,
          lifetimeValue: 15678.90,
        },
        firstPurchase: '2024-06-15',
        lastPurchase: '2026-02-15',
        status: 'active',
      },
      {
        id: 'cust-002',
        username: 'loyal_shopper',
        email: 'loyal@example.com',
        segment: 'loyal',
        metrics: {
          totalOrders: 89,
          totalSpent: 8765.43,
          avgOrderValue: 98.49,
          lifetimeValue: 10234.56,
        },
        firstPurchase: '2024-09-22',
        lastPurchase: '2026-02-14',
        status: 'active',
      },
    ],
    total: 15678,
    page: Number(page),
    limit: Number(limit),
    filters: { segment, sortBy },
  };
  res.json(customers);
});

// 顧客詳細
router.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const customer = {
    id,
    username: 'power_buyer',
    email: 'power@example.com',
    segment: 'champion',
    segmentHistory: [
      { date: '2024-06-15', segment: 'new' },
      { date: '2024-08-01', segment: 'potential' },
      { date: '2024-11-15', segment: 'loyal' },
      { date: '2025-03-01', segment: 'champion' },
    ],
    metrics: {
      totalOrders: 156,
      totalSpent: 12345.67,
      avgOrderValue: 79.14,
      lifetimeValue: 15678.90,
      purchaseFrequency: 2.8,
      avgDaysBetweenPurchases: 13,
    },
    purchaseHistory: [
      { orderId: 'ord-001', date: '2026-02-15', amount: 299.99, items: 1, status: 'delivered' },
      { orderId: 'ord-002', date: '2026-02-02', amount: 149.99, items: 2, status: 'delivered' },
    ],
    preferences: {
      favoriteCategories: ['Electronics', 'Audio'],
      favoriteBrands: ['Sony', 'Apple', 'Bose'],
      avgPriceRange: { min: 50, max: 300 },
      preferredPayment: 'PayPal',
    },
    engagement: {
      emailOpenRate: 45.5,
      clickRate: 12.3,
      lastEmailOpen: '2026-02-14',
      feedbackScore: 4.8,
    },
    notes: [
      { date: '2026-01-15', note: 'VIP customer, prioritize support requests', author: 'support_team' },
    ],
  };
  res.json(customer);
});

// 顧客ノート追加
const addNoteSchema = z.object({
  note: z.string(),
  author: z.string().optional(),
});

router.post('/customers/:id/notes', async (req, res) => {
  const { id } = req.params;
  const data = addNoteSchema.parse(req.body);
  res.json({
    success: true,
    customerId: id,
    noteId: `note-${Date.now()}`,
    ...data,
    date: new Date().toISOString(),
  });
});

// 顧客タグ更新
const updateTagsSchema = z.object({
  tags: z.array(z.string()),
});

router.put('/customers/:id/tags', async (req, res) => {
  const { id } = req.params;
  const data = updateTagsSchema.parse(req.body);
  res.json({ success: true, customerId: id, tags: data.tags });
});

// ===== セグメント管理 =====

// セグメント一覧
router.get('/segments', async (_req, res) => {
  const segments = [
    {
      id: 'seg-001',
      name: 'Champions',
      description: 'High value, frequent buyers',
      criteria: { rfmScore: { min: 9 }, purchaseFrequency: { min: 5 } },
      customerCount: 1234,
      totalRevenue: 234567,
      avgLtv: 190.05,
      createdAt: '2024-01-01',
      type: 'system',
    },
    {
      id: 'seg-002',
      name: 'At Risk',
      description: 'Previously active, now inactive',
      criteria: { lastPurchaseDays: { min: 60 }, totalOrders: { min: 3 } },
      customerCount: 2345,
      totalRevenue: 56789,
      avgLtv: 24.22,
      createdAt: '2024-01-01',
      type: 'system',
    },
    {
      id: 'seg-003',
      name: 'Electronics Enthusiasts',
      description: 'Custom segment for electronics buyers',
      criteria: { category: 'Electronics', totalOrders: { min: 2 } },
      customerCount: 3456,
      totalRevenue: 345678,
      avgLtv: 100.02,
      createdAt: '2025-06-15',
      type: 'custom',
    },
  ];
  res.json(segments);
});

// セグメント作成
const createSegmentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  criteria: z.record(z.unknown()),
});

router.post('/segments', async (req, res) => {
  const data = createSegmentSchema.parse(req.body);
  res.json({
    success: true,
    segmentId: `seg-${Date.now()}`,
    ...data,
    type: 'custom',
    customerCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// セグメント詳細
router.get('/segments/:id', async (req, res) => {
  const { id } = req.params;
  const segment = {
    id,
    name: 'Champions',
    description: 'High value, frequent buyers',
    criteria: { rfmScore: { min: 9 }, purchaseFrequency: { min: 5 } },
    customerCount: 1234,
    totalRevenue: 234567,
    avgLtv: 190.05,
    metrics: {
      avgOrderValue: 125.50,
      avgOrdersPerCustomer: 12.5,
      retentionRate: 92,
    },
    trends: {
      customerGrowth: [
        { month: '2025-12', count: 1189 },
        { month: '2026-01', count: 1212 },
        { month: '2026-02', count: 1234 },
      ],
    },
    topCustomers: [
      { id: 'cust-001', username: 'power_buyer', totalSpent: 12345.67 },
    ],
  };
  res.json(segment);
});

// セグメント更新
router.put('/segments/:id', async (req, res) => {
  const { id } = req.params;
  const data = createSegmentSchema.partial().parse(req.body);
  res.json({ success: true, segmentId: id, ...data });
});

// セグメント削除
router.delete('/segments/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, segmentId: id, deleted: true });
});

// ===== RFM分析 =====

// RFM分析結果
router.get('/rfm', async (_req, res) => {
  const rfm = {
    distribution: [
      { rfmScore: '555', count: 234, label: 'Best Customers' },
      { rfmScore: '554', count: 189, label: 'Loyal Customers' },
      { rfmScore: '544', count: 345, label: 'Recent Customers' },
      { rfmScore: '444', count: 567, label: 'Promising' },
      { rfmScore: '334', count: 789, label: 'Need Attention' },
      { rfmScore: '223', count: 1234, label: 'About to Sleep' },
      { rfmScore: '112', count: 2345, label: 'Hibernating' },
    ],
    segments: [
      { segment: 'Champions', rfmRange: '4-5, 4-5, 4-5', count: 1234, action: 'Reward & upsell' },
      { segment: 'Loyal', rfmRange: '2-5, 3-5, 3-5', count: 2345, action: 'Cross-sell' },
      { segment: 'Potential', rfmRange: '3-5, 1-3, 1-3', count: 3456, action: 'Convert to loyal' },
      { segment: 'At Risk', rfmRange: '0-2, 2-5, 2-5', count: 2345, action: 'Re-engage' },
      { segment: 'Lost', rfmRange: '0-2, 0-2, 0-2', count: 1500, action: 'Win back campaigns' },
    ],
    thresholds: {
      recency: { excellent: 14, good: 30, fair: 60, poor: 90 },
      frequency: { excellent: 10, good: 5, fair: 3, poor: 1 },
      monetary: { excellent: 500, good: 200, fair: 100, poor: 50 },
    },
  };
  res.json(rfm);
});

// RFMスコア再計算
router.post('/rfm/recalculate', async (_req, res) => {
  res.json({
    success: true,
    message: 'RFM recalculation started',
    jobId: `job-${Date.now()}`,
    estimatedTime: '5 minutes',
  });
});

// ===== 顧客行動分析 =====

// 購買行動分析
router.get('/behavior/purchase', async (req, res) => {
  const { period = '30d' } = req.query;
  const behavior = {
    period,
    patterns: {
      dayOfWeek: [
        { day: 'Mon', orders: 145, revenue: 12345 },
        { day: 'Tue', orders: 156, revenue: 13456 },
        { day: 'Wed', orders: 178, revenue: 15678 },
        { day: 'Thu', orders: 167, revenue: 14567 },
        { day: 'Fri', orders: 189, revenue: 17890 },
        { day: 'Sat', orders: 234, revenue: 21234 },
        { day: 'Sun', orders: 198, revenue: 18901 },
      ],
      timeOfDay: [
        { hour: '9-12', orders: 234, percentage: 18.5 },
        { hour: '12-15', orders: 345, percentage: 27.3 },
        { hour: '15-18', orders: 289, percentage: 22.9 },
        { hour: '18-21', orders: 278, percentage: 22.0 },
        { hour: '21-24', orders: 117, percentage: 9.3 },
      ],
    },
    productAffinity: [
      { products: ['Sony WH-1000XM5', 'Sony WF-1000XM5'], support: 0.15, confidence: 0.45 },
      { products: ['iPhone 15 Pro', 'AirPods Pro'], support: 0.12, confidence: 0.52 },
    ],
    categoryJourney: [
      { from: 'Electronics', to: 'Accessories', probability: 0.35 },
      { from: 'Audio', to: 'Electronics', probability: 0.28 },
    ],
  };
  res.json(behavior);
});

// ブラウズ行動分析
router.get('/behavior/browse', async (req, res) => {
  const { period = '30d' } = req.query;
  const browse = {
    period,
    metrics: {
      avgSessionDuration: 8.5,
      avgPagesViewed: 12.3,
      bounceRate: 28.5,
      conversionRate: 3.2,
    },
    topViewed: [
      { productId: 'prod-001', title: 'Sony WH-1000XM5', views: 4567, conversions: 89 },
      { productId: 'prod-002', title: 'Apple AirPods Pro', views: 3456, conversions: 78 },
    ],
    searchTerms: [
      { term: 'wireless headphones', searches: 567, conversions: 34 },
      { term: 'bluetooth earbuds', searches: 456, conversions: 28 },
    ],
    abandonedProducts: [
      { productId: 'prod-010', title: 'Premium Speaker', abandonRate: 45.5, views: 234 },
    ],
  };
  res.json(browse);
});

// ===== 設定 =====

// 分析設定取得
router.get('/settings/analytics', async (_req, res) => {
  const settings = {
    segmentation: {
      autoUpdate: true,
      updateFrequency: 'daily',
      rfmThresholds: {
        recency: [14, 30, 60, 90],
        frequency: [10, 5, 3, 1],
        monetary: [500, 200, 100, 50],
      },
    },
    tracking: {
      trackBrowsing: true,
      trackSearch: true,
      sessionTimeout: 30,
    },
    retention: {
      historicalDataDays: 730,
      anonymizeAfterDays: 365,
    },
  };
  res.json(settings);
});

// 分析設定更新
router.put('/settings/analytics', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// 通知設定取得
router.get('/settings/notifications', async (_req, res) => {
  const settings = {
    churnAlert: {
      enabled: true,
      riskThreshold: 0.7,
      notifyChannels: ['email', 'dashboard'],
    },
    newChampion: {
      enabled: true,
      notifyChannels: ['email'],
    },
    milestones: {
      enabled: true,
      orderMilestones: [10, 25, 50, 100],
      spendMilestones: [500, 1000, 5000],
    },
  };
  res.json(settings);
});

// 通知設定更新
router.put('/settings/notifications', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

export const ebayCustomerAnalyticsRouter = router;

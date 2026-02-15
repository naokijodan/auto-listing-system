import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 212: Customer Insights（顧客インサイト）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - 顧客概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalCustomers: 15000,
    activeCustomers: 8500,
    newCustomersThisMonth: 450,
    repeatCustomerRate: 42.5,
    avgCustomerValue: 12500,
    customerSatisfaction: 4.6,
    churnRate: 5.2,
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/metrics - 顧客メトリクス
router.get('/dashboard/metrics', async (_req: Request, res: Response) => {
  res.json({
    metrics: [
      { name: 'LTV（顧客生涯価値）', value: 125000, change: 8.5, trend: 'up' },
      { name: 'CAC（顧客獲得コスト）', value: 2500, change: -3.2, trend: 'down' },
      { name: 'NPS（推奨意向）', value: 72, change: 5.0, trend: 'up' },
      { name: 'リピート率', value: 42.5, change: 2.3, trend: 'up' },
    ],
    trend: [
      { date: '2026-02-10', customers: 14800, active: 8300, new: 55 },
      { date: '2026-02-11', customers: 14850, active: 8350, new: 62 },
      { date: '2026-02-12', customers: 14900, active: 8400, new: 58 },
      { date: '2026-02-13', customers: 14920, active: 8420, new: 45 },
      { date: '2026-02-14', customers: 14950, active: 8450, new: 70 },
      { date: '2026-02-15', customers: 14980, active: 8480, new: 68 },
      { date: '2026-02-16', customers: 15000, active: 8500, new: 72 },
    ],
  });
});

// GET /dashboard/alerts - 顧客アラート
router.get('/dashboard/alerts', async (_req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'churn_risk', severity: 'high', message: '50人の顧客が離脱リスク高', count: 50, action: 'リテンションキャンペーンを推奨' },
      { id: '2', type: 'vip_inactive', severity: 'medium', message: 'VIP顧客10人が30日以上未活動', count: 10, action: 'パーソナライズドアプローチを推奨' },
      { id: '3', type: 'satisfaction_drop', severity: 'low', message: '顧客満足度が先週から2%低下', value: -2, action: 'フィードバック分析を推奨' },
    ],
  });
});

// --- 顧客分析 ---

// GET /customers - 顧客一覧
router.get('/customers', async (_req: Request, res: Response) => {
  res.json({
    customers: [
      { id: '1', name: 'John Smith', email: 'john@example.com', segment: 'VIP', totalOrders: 25, totalSpent: 450000, lastOrder: '2026-02-14', status: 'active' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com', segment: 'Regular', totalOrders: 8, totalSpent: 85000, lastOrder: '2026-02-10', status: 'active' },
      { id: '3', name: 'Bob Wilson', email: 'bob@example.com', segment: 'New', totalOrders: 2, totalSpent: 15000, lastOrder: '2026-02-15', status: 'active' },
      { id: '4', name: 'Alice Brown', email: 'alice@example.com', segment: 'At Risk', totalOrders: 12, totalSpent: 180000, lastOrder: '2026-01-05', status: 'inactive' },
    ],
    total: 15000,
    segments: ['VIP', 'Regular', 'New', 'At Risk', 'Churned'],
  });
});

// GET /customers/:id - 顧客詳細
router.get('/customers/:id', async (req: Request, res: Response) => {
  res.json({
    customer: {
      id: req.params.id,
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1-555-0123',
      country: 'US',
      segment: 'VIP',
      status: 'active',
      joinedAt: '2024-03-15',
      lastActivity: '2026-02-16 09:30:00',
      profile: {
        totalOrders: 25,
        totalSpent: 450000,
        avgOrderValue: 18000,
        favoriteCategories: ['時計', 'アクセサリー'],
        preferredPayment: 'PayPal',
        preferredShipping: 'Express',
      },
      metrics: {
        ltv: 550000,
        purchaseFrequency: 2.5,
        daysSinceLastOrder: 2,
        satisfaction: 4.8,
        nps: 9,
      },
      orders: [
        { id: 'ord_1', date: '2026-02-14', total: 35000, items: 2, status: 'delivered' },
        { id: 'ord_2', date: '2026-01-28', total: 28000, items: 1, status: 'delivered' },
        { id: 'ord_3', date: '2026-01-10', total: 42000, items: 3, status: 'delivered' },
      ],
      communications: [
        { date: '2026-02-15', type: 'email', subject: '発送完了のお知らせ' },
        { date: '2026-02-14', type: 'purchase', subject: '注文確認' },
      ],
    },
  });
});

// GET /customers/:id/timeline - 顧客タイムライン
router.get('/customers/:id/timeline', async (req: Request, res: Response) => {
  res.json({
    timeline: [
      { id: '1', date: '2026-02-16 09:30:00', type: 'visit', description: 'サイト訪問', details: '商品ページ閲覧: 5ページ' },
      { id: '2', date: '2026-02-14 15:00:00', type: 'purchase', description: '注文完了', details: '¥35,000 / 2アイテム' },
      { id: '3', date: '2026-02-14 14:45:00', type: 'cart', description: 'カート追加', details: 'セイコー プロスペックス' },
      { id: '4', date: '2026-02-10 10:00:00', type: 'email_open', description: 'メール開封', details: '週末セールのご案内' },
    ],
  });
});

// --- セグメント ---

// GET /segments - セグメント一覧
router.get('/segments', async (_req: Request, res: Response) => {
  res.json({
    segments: [
      { id: '1', name: 'VIP', description: '累計購入額50万円以上', customerCount: 850, avgSpent: 650000, avgOrders: 22, revenue: 552500000 },
      { id: '2', name: 'Regular', description: '過去6ヶ月に2回以上購入', customerCount: 4500, avgSpent: 85000, avgOrders: 5, revenue: 382500000 },
      { id: '3', name: 'New', description: '過去30日以内に初購入', customerCount: 450, avgSpent: 12000, avgOrders: 1, revenue: 5400000 },
      { id: '4', name: 'At Risk', description: '90日以上未購入', customerCount: 1200, avgSpent: 45000, avgOrders: 3, revenue: 54000000 },
      { id: '5', name: 'Churned', description: '180日以上未購入', customerCount: 1500, avgSpent: 35000, avgOrders: 2, revenue: 52500000 },
    ],
  });
});

// GET /segments/:id - セグメント詳細
router.get('/segments/:id', async (req: Request, res: Response) => {
  res.json({
    segment: {
      id: req.params.id,
      name: 'VIP',
      description: '累計購入額50万円以上の優良顧客',
      criteria: [
        { field: 'totalSpent', operator: 'gte', value: 500000 },
      ],
      customerCount: 850,
      metrics: {
        avgSpent: 650000,
        avgOrders: 22,
        avgLtv: 850000,
        avgSatisfaction: 4.8,
        retentionRate: 95,
      },
      topCustomers: [
        { id: '1', name: 'John Smith', totalSpent: 450000, orders: 25 },
        { id: '2', name: 'Emily Johnson', totalSpent: 380000, orders: 18 },
      ],
    },
  });
});

// POST /segments - セグメント作成
router.post('/segments', async (_req: Request, res: Response) => {
  res.json({ success: true, segmentId: 'seg_new_123', message: 'セグメントを作成しました' });
});

// PUT /segments/:id - セグメント更新
router.put('/segments/:id', async (req: Request, res: Response) => {
  res.json({ success: true, segmentId: req.params.id, message: 'セグメントを更新しました' });
});

// --- 行動分析 ---

// GET /behavior/overview - 行動概要
router.get('/behavior/overview', async (_req: Request, res: Response) => {
  res.json({
    overview: {
      avgSessionDuration: 420,
      avgPagesPerSession: 8.5,
      bounceRate: 32.5,
      conversionRate: 3.8,
      cartAbandonmentRate: 68.5,
    },
    topActions: [
      { action: 'product_view', count: 125000, change: 5.2 },
      { action: 'add_to_cart', count: 18500, change: 8.5 },
      { action: 'checkout_start', count: 8200, change: 3.2 },
      { action: 'purchase', count: 4750, change: 6.8 },
    ],
  });
});

// GET /behavior/journey - カスタマージャーニー
router.get('/behavior/journey', async (_req: Request, res: Response) => {
  res.json({
    journey: {
      stages: [
        { stage: 'awareness', customers: 50000, conversion: 40 },
        { stage: 'interest', customers: 20000, conversion: 50 },
        { stage: 'consideration', customers: 10000, conversion: 60 },
        { stage: 'purchase', customers: 6000, conversion: 70 },
        { stage: 'retention', customers: 4200, conversion: 50 },
        { stage: 'advocacy', customers: 2100, conversion: null },
      ],
      dropoffPoints: [
        { from: 'awareness', to: 'interest', dropoff: 60, reason: '価格が高い' },
        { from: 'consideration', to: 'purchase', dropoff: 40, reason: '送料が高い' },
      ],
    },
  });
});

// GET /behavior/cohorts - コホート分析
router.get('/behavior/cohorts', async (_req: Request, res: Response) => {
  res.json({
    cohorts: [
      { cohort: '2025-09', month0: 100, month1: 45, month2: 32, month3: 28, month4: 25, month5: 23 },
      { cohort: '2025-10', month0: 100, month1: 48, month2: 35, month3: 30, month4: 27, month5: null },
      { cohort: '2025-11', month0: 100, month1: 52, month2: 38, month3: 33, month4: null, month5: null },
      { cohort: '2025-12', month0: 100, month1: 50, month2: 36, month3: null, month4: null, month5: null },
      { cohort: '2026-01', month0: 100, month1: 55, month2: null, month3: null, month4: null, month5: null },
      { cohort: '2026-02', month0: 100, month1: null, month2: null, month3: null, month4: null, month5: null },
    ],
  });
});

// --- 予測分析 ---

// GET /predictions/churn - 離脱予測
router.get('/predictions/churn', async (_req: Request, res: Response) => {
  res.json({
    predictions: {
      highRisk: { count: 50, percentage: 0.33 },
      mediumRisk: { count: 150, percentage: 1.0 },
      lowRisk: { count: 300, percentage: 2.0 },
    },
    topRiskCustomers: [
      { id: '1', name: 'Alice Brown', riskScore: 0.92, daysSinceLastOrder: 45, lastOrder: '2026-01-05', ltv: 180000, reason: '購入頻度の低下' },
      { id: '2', name: 'Mike Davis', riskScore: 0.85, daysSinceLastOrder: 38, lastOrder: '2026-01-10', ltv: 95000, reason: 'サイト訪問減少' },
    ],
    recommendations: [
      { action: 'discount_offer', target: 'high_risk', expectedRetention: 25 },
      { action: 'personalized_email', target: 'medium_risk', expectedRetention: 40 },
    ],
  });
});

// GET /predictions/ltv - LTV予測
router.get('/predictions/ltv', async (_req: Request, res: Response) => {
  res.json({
    predictions: [
      { segment: 'VIP', currentLtv: 650000, predictedLtv: 850000, confidence: 0.85 },
      { segment: 'Regular', currentLtv: 85000, predictedLtv: 120000, confidence: 0.78 },
      { segment: 'New', currentLtv: 12000, predictedLtv: 45000, confidence: 0.65 },
    ],
    topPotential: [
      { id: '1', name: 'Jane Doe', currentLtv: 85000, predictedLtv: 180000, growthPotential: 112 },
      { id: '2', name: 'Bob Wilson', currentLtv: 15000, predictedLtv: 65000, growthPotential: 333 },
    ],
  });
});

// --- レポート ---

// GET /reports - レポート一覧
router.get('/reports', async (_req: Request, res: Response) => {
  res.json({
    reports: [
      { id: '1', name: '月次顧客レポート', type: 'customer', lastGenerated: '2026-02-01', schedule: 'monthly' },
      { id: '2', name: 'セグメント分析', type: 'segment', lastGenerated: '2026-02-15', schedule: 'weekly' },
      { id: '3', name: '離脱リスクレポート', type: 'churn', lastGenerated: '2026-02-16', schedule: 'daily' },
    ],
  });
});

// POST /reports/generate - レポート生成
router.post('/reports/generate', async (_req: Request, res: Response) => {
  res.json({ success: true, reportId: 'report_123', message: 'レポート生成を開始しました' });
});

// GET /reports/:id - レポート詳細
router.get('/reports/:id', async (req: Request, res: Response) => {
  res.json({
    report: {
      id: req.params.id,
      name: '月次顧客レポート',
      type: 'customer',
      generatedAt: '2026-02-01 00:00:00',
      downloadUrl: '/reports/customer_monthly_202602.pdf',
    },
  });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      trackingEnabled: true,
      anonymizeData: false,
      dataRetentionDays: 730,
      defaultCurrency: 'JPY',
      timezone: 'Asia/Tokyo',
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

// GET /settings/alerts - アラート設定
router.get('/settings/alerts', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      churnRiskThreshold: 0.7,
      inactivityDays: 30,
      vipThreshold: 500000,
      notifyOnHighRisk: true,
      notifyOnVipInactive: true,
      dailyDigest: true,
    },
  });
});

// PUT /settings/alerts - アラート設定更新
router.put('/settings/alerts', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'アラート設定を更新しました' });
});

export default router;

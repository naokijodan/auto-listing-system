import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// マーケティングダッシュボード概要
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      activeCampaigns: 8,
      totalSpend: 2345.67,
      totalImpressions: 156789,
      totalClicks: 4567,
      totalSales: 123,
      roas: 4.2,
      avgCpc: 0.51,
      conversionRate: 2.69,
    },
    performance: {
      today: { impressions: 5234, clicks: 156, spend: 78.45, sales: 8 },
      yesterday: { impressions: 4890, clicks: 142, spend: 71.23, sales: 6 },
      weekChange: { impressions: 12.5, clicks: 8.3, spend: 5.2, sales: 15.4 },
    },
    topCampaigns: [
      { id: 'camp-001', name: 'Spring Electronics Sale', type: 'promoted_listings', spend: 456.78, sales: 23, roas: 5.2 },
      { id: 'camp-002', name: 'Brand Awareness', type: 'display', spend: 234.56, impressions: 45678, cpm: 5.13 },
    ],
    recommendations: [
      { type: 'budget_increase', campaign: 'camp-001', suggestion: 'Increase budget by 20%', impact: '+8 estimated sales' },
      { type: 'bid_optimization', campaign: 'camp-003', suggestion: 'Lower bids on underperforming keywords', impact: '-15% CPC' },
    ],
  };
  res.json(dashboard);
});

// パフォーマンストレンド
router.get('/dashboard/trends', async (req, res) => {
  const { period = '30d', metric = 'all' } = req.query;
  const trends = {
    period,
    metric,
    data: [
      { date: '2026-02-01', impressions: 4500, clicks: 120, spend: 62.50, sales: 5, roas: 4.0 },
      { date: '2026-02-08', impressions: 5200, clicks: 145, spend: 73.25, sales: 7, roas: 4.8 },
      { date: '2026-02-15', impressions: 5800, clicks: 168, spend: 84.00, sales: 9, roas: 5.4 },
    ],
    summary: {
      totalImpressions: 15500,
      totalClicks: 433,
      totalSpend: 219.75,
      totalSales: 21,
      avgRoas: 4.73,
    },
  };
  res.json(trends);
});

// チャネル別パフォーマンス
router.get('/dashboard/by-channel', async (_req, res) => {
  const channels = [
    { channel: 'promoted_listings', spend: 1234.56, sales: 78, roas: 5.1, percentage: 52.6 },
    { channel: 'display', spend: 567.89, impressions: 89012, cpm: 6.38, percentage: 24.2 },
    { channel: 'email', spend: 234.56, opens: 4567, clicks: 890, ctr: 19.5, percentage: 10.0 },
    { channel: 'social', spend: 308.66, reach: 34567, engagement: 1234, percentage: 13.2 },
  ];
  res.json(channels);
});

// ===== キャンペーン管理 =====

// キャンペーン一覧
router.get('/campaigns', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const campaigns = {
    items: [
      {
        id: 'camp-001',
        name: 'Spring Electronics Sale',
        type: 'promoted_listings',
        status: 'active',
        budget: { daily: 50, total: 1500, spent: 456.78 },
        schedule: { startDate: '2026-02-01', endDate: '2026-03-31' },
        targeting: { categories: ['Electronics'], countries: ['US', 'UK', 'DE'] },
        performance: { impressions: 45678, clicks: 1234, sales: 23, roas: 5.2 },
        createdAt: '2026-01-28T10:00:00Z',
      },
      {
        id: 'camp-002',
        name: 'Brand Awareness Q1',
        type: 'display',
        status: 'active',
        budget: { daily: 30, total: 900, spent: 234.56 },
        schedule: { startDate: '2026-01-15', endDate: '2026-03-15' },
        targeting: { demographics: ['25-44'], interests: ['Electronics', 'Gadgets'] },
        performance: { impressions: 89012, clicks: 2345, ctr: 2.63 },
        createdAt: '2026-01-12T10:00:00Z',
      },
    ],
    total: 8,
    page: Number(page),
    limit: Number(limit),
    filters: { status, type },
  };
  res.json(campaigns);
});

// キャンペーン詳細
router.get('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const campaign = {
    id,
    name: 'Spring Electronics Sale',
    type: 'promoted_listings',
    status: 'active',
    budget: { daily: 50, total: 1500, spent: 456.78, remaining: 1043.22 },
    schedule: { startDate: '2026-02-01', endDate: '2026-03-31', daysRemaining: 43 },
    bidStrategy: { type: 'auto', target: 'sales', maxBid: 2.50 },
    targeting: {
      categories: [{ id: 'cat-001', name: 'Electronics', selected: true }],
      countries: ['US', 'UK', 'DE', 'FR'],
      devices: ['desktop', 'mobile', 'tablet'],
    },
    listings: {
      total: 45,
      active: 42,
      paused: 3,
      topPerformers: [
        { id: 'lst-001', title: 'Sony WH-1000XM5', impressions: 5678, clicks: 234, sales: 5, roas: 6.2 },
        { id: 'lst-002', title: 'Apple AirPods Pro', impressions: 4567, clicks: 189, sales: 4, roas: 5.8 },
      ],
    },
    performance: {
      daily: [
        { date: '2026-02-14', impressions: 3456, clicks: 98, spend: 48.50, sales: 2 },
        { date: '2026-02-15', impressions: 3890, clicks: 112, spend: 55.00, sales: 3 },
        { date: '2026-02-16', impressions: 4123, clicks: 125, spend: 61.25, sales: 4 },
      ],
      summary: { totalImpressions: 45678, totalClicks: 1234, totalSpend: 456.78, totalSales: 23, roas: 5.2 },
    },
  };
  res.json(campaign);
});

// キャンペーン作成
const createCampaignSchema = z.object({
  name: z.string(),
  type: z.enum(['promoted_listings', 'display', 'email', 'social']),
  budget: z.object({
    daily: z.number(),
    total: z.number().optional(),
  }),
  schedule: z.object({
    startDate: z.string(),
    endDate: z.string().optional(),
  }),
  targeting: z.record(z.unknown()),
  bidStrategy: z.object({
    type: z.enum(['auto', 'manual', 'target_roas']),
    target: z.string().optional(),
    maxBid: z.number().optional(),
  }).optional(),
});

router.post('/campaigns', async (req, res) => {
  const data = createCampaignSchema.parse(req.body);
  res.json({ success: true, campaignId: `camp-${Date.now()}`, status: 'draft', ...data });
});

// キャンペーン更新
router.put('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const data = createCampaignSchema.partial().parse(req.body);
  res.json({ success: true, campaignId: id, ...data });
});

// キャンペーン削除
router.delete('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, campaignId: id, deleted: true });
});

// キャンペーン一時停止/再開
router.post('/campaigns/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body as { action: 'pause' | 'resume' };
  res.json({ success: true, campaignId: id, status: action === 'pause' ? 'paused' : 'active' });
});

// ===== プロモーション管理 =====

// プロモーション一覧
router.get('/promotions', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const promotions = {
    items: [
      {
        id: 'promo-001',
        name: 'Winter Clearance',
        type: 'markdown',
        status: 'active',
        discount: { type: 'percent', value: 25 },
        listings: 156,
        sales: 45,
        revenue: 3456.78,
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      },
      {
        id: 'promo-002',
        name: 'Buy 2 Get 1 Free',
        type: 'volume',
        status: 'scheduled',
        rules: { buyQuantity: 2, getQuantity: 1, discountPercent: 100 },
        listings: 89,
        startDate: '2026-03-01',
        endDate: '2026-03-15',
      },
    ],
    total: 12,
    page: Number(page),
    limit: Number(limit),
    filters: { status, type },
  };
  res.json(promotions);
});

// プロモーション作成
const createPromotionSchema = z.object({
  name: z.string(),
  type: z.enum(['markdown', 'volume', 'shipping', 'bundle', 'coupon']),
  discount: z.object({
    type: z.enum(['percent', 'fixed']),
    value: z.number(),
  }).optional(),
  rules: z.record(z.unknown()).optional(),
  listings: z.array(z.string()).optional(),
  schedule: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
});

router.post('/promotions', async (req, res) => {
  const data = createPromotionSchema.parse(req.body);
  res.json({ success: true, promotionId: `promo-${Date.now()}`, status: 'draft', ...data });
});

// プロモーション詳細
router.get('/promotions/:id', async (req, res) => {
  const { id } = req.params;
  const promotion = {
    id,
    name: 'Winter Clearance',
    type: 'markdown',
    status: 'active',
    discount: { type: 'percent', value: 25 },
    listings: {
      total: 156,
      topSellers: [
        { id: 'lst-001', title: 'Winter Jacket', originalPrice: 199.99, salePrice: 149.99, sales: 12 },
        { id: 'lst-002', title: 'Ski Goggles', originalPrice: 89.99, salePrice: 67.49, sales: 8 },
      ],
    },
    performance: { views: 23456, sales: 45, revenue: 3456.78, conversionRate: 0.19 },
    schedule: { startDate: '2026-02-01', endDate: '2026-02-28', daysRemaining: 12 },
  };
  res.json(promotion);
});

// プロモーション更新
router.put('/promotions/:id', async (req, res) => {
  const { id } = req.params;
  const data = createPromotionSchema.partial().parse(req.body);
  res.json({ success: true, promotionId: id, ...data });
});

// ===== 広告管理 =====

// 広告グループ一覧
router.get('/ad-groups', async (req, res) => {
  const { campaignId, status, page = 1, limit = 20 } = req.query;
  const adGroups = {
    items: [
      {
        id: 'ag-001',
        campaignId: 'camp-001',
        name: 'Top Sellers',
        status: 'active',
        bidAdjustment: 1.2,
        listings: 15,
        performance: { impressions: 12345, clicks: 345, ctr: 2.79, spend: 156.78 },
      },
    ],
    total: 5,
    page: Number(page),
    limit: Number(limit),
    filters: { campaignId, status },
  };
  res.json(adGroups);
});

// 広告グループ作成
const createAdGroupSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  bidAdjustment: z.number().optional(),
  listings: z.array(z.string()),
});

router.post('/ad-groups', async (req, res) => {
  const data = createAdGroupSchema.parse(req.body);
  res.json({ success: true, adGroupId: `ag-${Date.now()}`, status: 'active', ...data });
});

// キーワード管理
router.get('/keywords', async (req, res) => {
  const { adGroupId, status, page = 1, limit = 50 } = req.query;
  const keywords = {
    items: [
      { id: 'kw-001', adGroupId: 'ag-001', keyword: 'wireless headphones', matchType: 'phrase', bid: 1.50, impressions: 5678, clicks: 123, ctr: 2.17, cpc: 1.28, status: 'active' },
      { id: 'kw-002', adGroupId: 'ag-001', keyword: 'bluetooth earbuds', matchType: 'broad', bid: 1.25, impressions: 4567, clicks: 98, ctr: 2.15, cpc: 1.15, status: 'active' },
    ],
    total: 45,
    page: Number(page),
    limit: Number(limit),
    filters: { adGroupId, status },
  };
  res.json(keywords);
});

// キーワード追加
const addKeywordsSchema = z.object({
  adGroupId: z.string(),
  keywords: z.array(z.object({
    keyword: z.string(),
    matchType: z.enum(['exact', 'phrase', 'broad']),
    bid: z.number().optional(),
  })),
});

router.post('/keywords', async (req, res) => {
  const data = addKeywordsSchema.parse(req.body);
  res.json({ success: true, added: data.keywords.length });
});

// ===== オーディエンス管理 =====

// オーディエンス一覧
router.get('/audiences', async (_req, res) => {
  const audiences = [
    { id: 'aud-001', name: 'Past Buyers', type: 'custom', size: 5678, status: 'active', lastUpdated: '2026-02-15' },
    { id: 'aud-002', name: 'Cart Abandoners', type: 'retargeting', size: 1234, status: 'active', lastUpdated: '2026-02-16' },
    { id: 'aud-003', name: 'High-Value Shoppers', type: 'lookalike', size: 34567, status: 'active', lastUpdated: '2026-02-14' },
  ];
  res.json(audiences);
});

// オーディエンス作成
const createAudienceSchema = z.object({
  name: z.string(),
  type: z.enum(['custom', 'retargeting', 'lookalike']),
  criteria: z.record(z.unknown()),
});

router.post('/audiences', async (req, res) => {
  const data = createAudienceSchema.parse(req.body);
  res.json({ success: true, audienceId: `aud-${Date.now()}`, size: 0, status: 'building', ...data });
});

// ===== 分析 =====

// ROI分析
router.get('/analytics/roi', async (req, res) => {
  const { period = '30d' } = req.query;
  const roi = {
    period,
    overall: { spend: 2345.67, revenue: 9876.54, profit: 7530.87, roas: 4.21, roi: 321.0 },
    byCampaign: [
      { campaignId: 'camp-001', name: 'Spring Sale', spend: 456.78, revenue: 2345.67, roas: 5.13 },
      { campaignId: 'camp-002', name: 'Brand Awareness', spend: 234.56, revenue: 890.12, roas: 3.79 },
    ],
    byChannel: [
      { channel: 'promoted_listings', spend: 1234.56, revenue: 5678.90, roas: 4.60 },
      { channel: 'display', spend: 567.89, revenue: 1890.12, roas: 3.33 },
    ],
  };
  res.json(roi);
});

// コンバージョン分析
router.get('/analytics/conversions', async (req, res) => {
  const { period = '30d' } = req.query;
  const conversions = {
    period,
    funnel: [
      { stage: 'impressions', count: 156789, rate: 100 },
      { stage: 'clicks', count: 4567, rate: 2.91 },
      { stage: 'add_to_cart', count: 890, rate: 19.49 },
      { stage: 'purchase', count: 123, rate: 13.82 },
    ],
    byDevice: [
      { device: 'mobile', impressions: 89012, clicks: 2345, conversions: 67, rate: 2.86 },
      { device: 'desktop', impressions: 56789, clicks: 1890, conversions: 48, rate: 2.54 },
      { device: 'tablet', impressions: 10988, clicks: 332, conversions: 8, rate: 2.41 },
    ],
    attribution: {
      firstClick: { conversions: 89, revenue: 4567.89 },
      lastClick: { conversions: 123, revenue: 5678.90 },
      linear: { conversions: 98, revenue: 4890.12 },
    },
  };
  res.json(conversions);
});

// ===== 設定 =====

// 一般設定取得
router.get('/settings/general', async (_req, res) => {
  const settings = {
    billing: {
      paymentMethod: 'credit_card',
      monthlyBudgetCap: 5000,
      alertThreshold: 80,
    },
    defaults: {
      bidStrategy: 'auto',
      dailyBudget: 50,
      targetRoas: 4.0,
    },
    notifications: {
      budgetAlert: true,
      performanceReport: true,
      reportFrequency: 'daily',
      email: 'marketing@example.com',
    },
    tracking: {
      conversionWindow: 30,
      crossDeviceTracking: true,
      viewThroughConversion: true,
    },
  };
  res.json(settings);
});

// 一般設定更新
router.put('/settings/general', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// 広告ポリシー設定
router.get('/settings/policies', async (_req, res) => {
  const policies = {
    autoOptimization: {
      enabled: true,
      pauseUnderperforming: true,
      pauseThreshold: { roas: 1.5, days: 7 },
      boostTopPerformers: true,
      boostThreshold: { roas: 5.0, budgetIncrease: 20 },
    },
    scheduling: {
      dayParting: {
        enabled: true,
        schedule: {
          weekdays: { start: '08:00', end: '22:00' },
          weekends: { start: '10:00', end: '20:00' },
        },
      },
    },
    exclusions: {
      categories: ['adult', 'weapons'],
      keywords: ['free', 'cheap', 'knockoff'],
    },
  };
  res.json(policies);
});

// 広告ポリシー更新
router.put('/settings/policies', async (req, res) => {
  const policies = req.body;
  res.json({ success: true, policies });
});

export const ebayMarketingHubRouter = router;

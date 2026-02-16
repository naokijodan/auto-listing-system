import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 273: eBay Promotion Manager（プロモーション管理）
// 28エンドポイント - テーマカラー: purple-600
// ============================================================

// スキーマ
const createPromotionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['MARKDOWN', 'ORDER_DISCOUNT', 'VOLUME_DISCOUNT', 'CODELESS_COUPON', 'CODED_COUPON']),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().min(0),
  minPurchaseAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
  applicableItems: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    activePromotions: 12,
    totalPromotions: 45,
    totalSales: 15000,
    promotionRevenue: 12500,
    avgConversionLift: 25,
    topPromotion: { id: '1', name: 'Winter Sale', revenue: 5000 },
  });
});

router.get('/dashboard/performance', async (req: Request, res: Response) => {
  res.json({
    performance: [
      { promotionId: '1', name: 'Winter Sale', impressions: 10000, clicks: 1500, conversions: 300, revenue: 5000, roi: 250 },
      { promotionId: '2', name: '20% Off Electronics', impressions: 8000, clicks: 1200, conversions: 200, revenue: 3500, roi: 180 },
      { promotionId: '3', name: 'Free Shipping Week', impressions: 6000, clicks: 900, conversions: 150, revenue: 2500, roi: 150 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'expiring', message: '2つのプロモーションが3日以内に終了します', severity: 'warning' },
      { id: '2', type: 'low_performance', message: 'Spring Saleのパフォーマンスが低下しています', severity: 'medium' },
      { id: '3', type: 'budget', message: 'Monthly Couponの予算の80%を使用しました', severity: 'info' },
    ],
  });
});

// ========== プロモーション管理 ==========
router.get('/promotions', async (req: Request, res: Response) => {
  const { type, status, page = '1', limit = '20' } = req.query;
  res.json({
    promotions: [
      { id: '1', name: 'Winter Sale', type: 'MARKDOWN', discountType: 'PERCENTAGE', discountValue: 30, status: 'ACTIVE', startDate: '2026-02-01', endDate: '2026-02-28', revenue: 5000 },
      { id: '2', name: '20% Off Electronics', type: 'MARKDOWN', discountType: 'PERCENTAGE', discountValue: 20, status: 'ACTIVE', startDate: '2026-02-10', endDate: '2026-03-10', revenue: 3500 },
      { id: '3', name: 'Free Shipping Week', type: 'ORDER_DISCOUNT', discountType: 'FIXED_AMOUNT', discountValue: 10, status: 'SCHEDULED', startDate: '2026-03-01', endDate: '2026-03-07', revenue: 0 },
      { id: '4', name: 'VIP Coupon', type: 'CODED_COUPON', discountType: 'PERCENTAGE', discountValue: 15, status: 'ACTIVE', startDate: '2026-01-01', endDate: '2026-12-31', revenue: 1500 },
    ],
    total: 45,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });
});

router.post('/promotions', async (req: Request, res: Response) => {
  const parsed = createPromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid promotion', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `promo_${Date.now()}`,
    ...parsed.data,
    status: new Date(parsed.data.startDate) > new Date() ? 'SCHEDULED' : 'ACTIVE',
    createdAt: new Date().toISOString(),
  });
});

router.get('/promotions/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Winter Sale',
    type: 'MARKDOWN',
    discountType: 'PERCENTAGE',
    discountValue: 30,
    minPurchaseAmount: 50,
    maxDiscountAmount: 100,
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    applicableCategories: ['Watches', 'Electronics'],
    itemCount: 150,
    status: 'ACTIVE',
    stats: {
      impressions: 10000,
      clicks: 1500,
      conversions: 300,
      revenue: 5000,
      avgOrderValue: 85,
    },
  });
});

router.put('/promotions/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/promotions/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

router.post('/promotions/:id/activate', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'ACTIVE',
    activatedAt: new Date().toISOString(),
  });
});

router.post('/promotions/:id/pause', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'PAUSED',
    pausedAt: new Date().toISOString(),
  });
});

router.post('/promotions/:id/duplicate', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `promo_${Date.now()}`,
    originalId: req.params.id,
    name: `${req.body.name || 'Copy of promotion'}`,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
  });
});

// ========== クーポン管理 ==========
router.get('/coupons', async (req: Request, res: Response) => {
  res.json({
    coupons: [
      { id: '1', code: 'WINTER30', promotionId: '1', usageCount: 150, maxUsage: 500, status: 'ACTIVE' },
      { id: '2', code: 'VIP15', promotionId: '4', usageCount: 50, maxUsage: 100, status: 'ACTIVE' },
      { id: '3', code: 'NEWCUSTOMER', promotionId: '5', usageCount: 200, maxUsage: 200, status: 'EXHAUSTED' },
    ],
    total: 10,
  });
});

router.post('/coupons/generate', async (req: Request, res: Response) => {
  const { promotionId, prefix, count, maxUsagePerCoupon } = req.body;
  const codes = Array.from({ length: count || 1 }, (_, i) =>
    `${prefix || 'CODE'}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  );
  res.status(201).json({
    promotionId,
    generatedCodes: codes,
    count: codes.length,
  });
});

router.get('/coupons/:code/usage', async (req: Request, res: Response) => {
  res.json({
    code: req.params.code,
    totalUsage: 150,
    usage: [
      { orderId: 'order1', buyerId: 'buyer1', usedAt: '2026-02-15T10:00:00Z', orderTotal: 100, discountAmount: 30 },
      { orderId: 'order2', buyerId: 'buyer2', usedAt: '2026-02-14T15:30:00Z', orderTotal: 80, discountAmount: 24 },
    ],
  });
});

// ========== 商品・カテゴリ選択 ==========
router.get('/items', async (req: Request, res: Response) => {
  const { promotionId, q } = req.query;
  res.json({
    items: [
      { id: 'item1', title: 'Vintage Seiko Watch', price: 200, inPromotion: true, promotionPrice: 140 },
      { id: 'item2', title: 'Canon Camera', price: 500, inPromotion: false, promotionPrice: null },
      { id: 'item3', title: 'Gaming Headset', price: 150, inPromotion: true, promotionPrice: 105 },
    ],
    total: 500,
  });
});

router.post('/promotions/:id/items', async (req: Request, res: Response) => {
  const { itemIds, action } = req.body;
  res.json({
    promotionId: req.params.id,
    action, // 'add' or 'remove'
    affectedItems: itemIds?.length || 0,
    success: true,
  });
});

router.get('/categories', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: 'watches', name: 'Watches', itemCount: 200, activePromotions: 2 },
      { id: 'electronics', name: 'Electronics', itemCount: 150, activePromotions: 1 },
      { id: 'collectibles', name: 'Collectibles', itemCount: 300, activePromotions: 0 },
      { id: 'clothing', name: 'Clothing', itemCount: 100, activePromotions: 1 },
    ],
  });
});

// ========== 分析 ==========
router.get('/analytics/overview', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalRevenue: 12500,
    promotionRevenue: 8500,
    promotionPercent: 68,
    avgConversionRate: 25,
    avgOrderValue: 95,
    bestPerforming: { id: '1', name: 'Winter Sale', roi: 250 },
  });
});

router.get('/analytics/comparison', async (req: Request, res: Response) => {
  res.json({
    comparison: [
      { type: 'MARKDOWN', count: 20, totalRevenue: 6000, avgRoi: 180 },
      { type: 'ORDER_DISCOUNT', count: 10, totalRevenue: 3500, avgRoi: 150 },
      { type: 'VOLUME_DISCOUNT', count: 5, totalRevenue: 1500, avgRoi: 120 },
      { type: 'CODED_COUPON', count: 10, totalRevenue: 1500, avgRoi: 100 },
    ],
    recommendation: 'MARKDOWN promotions show the highest ROI',
  });
});

router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { period: '2026-01-W1', revenue: 2000, promotions: 8, conversions: 150 },
      { period: '2026-01-W2', revenue: 2500, promotions: 10, conversions: 180 },
      { period: '2026-01-W3', revenue: 3000, promotions: 12, conversions: 220 },
      { period: '2026-01-W4', revenue: 2800, promotions: 11, conversions: 200 },
      { period: '2026-02-W1', revenue: 3200, promotions: 12, conversions: 250 },
      { period: '2026-02-W2', revenue: 3500, promotions: 14, conversions: 280 },
    ],
  });
});

router.get('/analytics/roi', async (req: Request, res: Response) => {
  res.json({
    roiByPromotion: [
      { id: '1', name: 'Winter Sale', investment: 2000, revenue: 7000, roi: 250 },
      { id: '2', name: '20% Off Electronics', investment: 1500, revenue: 4200, roi: 180 },
      { id: '3', name: 'Free Shipping Week', investment: 1000, revenue: 2500, roi: 150 },
    ],
    avgRoi: 193,
    bestRoi: 250,
    worstRoi: 100,
  });
});

// ========== スケジュール ==========
router.get('/schedule', async (req: Request, res: Response) => {
  res.json({
    upcoming: [
      { id: '3', name: 'Free Shipping Week', startDate: '2026-03-01', endDate: '2026-03-07' },
      { id: '5', name: 'Spring Sale', startDate: '2026-03-20', endDate: '2026-04-05' },
    ],
    active: [
      { id: '1', name: 'Winter Sale', startDate: '2026-02-01', endDate: '2026-02-28', daysRemaining: 12 },
      { id: '2', name: '20% Off Electronics', startDate: '2026-02-10', endDate: '2026-03-10', daysRemaining: 22 },
    ],
    expiring: [
      { id: '1', name: 'Winter Sale', endDate: '2026-02-28', daysRemaining: 12 },
    ],
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalPromotions: 15,
    activePromotions: 5,
    totalRevenue: 12500,
    avgRoi: 180,
    topPromotion: 'Winter Sale',
    conversionRate: 25,
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-promotion-manager/reports/download/promotions_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    autoRenewEnabled: false,
    defaultDuration: 14,
    maxDiscountPercent: 50,
    minPurchaseRequired: true,
    notifyOnExpiry: true,
    expiryNotifyDays: 3,
    budgetLimit: 5000,
    budgetAlertPercent: 80,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 288: eBay Promotion Engine（プロモーション）
// 28エンドポイント - テーマカラー: red-600
// =============================================================

// スキーマ
const promotionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BOGO', 'FREE_SHIPPING', 'BUNDLE']),
  discountValue: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().default(true),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    activePromotions: 15,
    totalProducts: 2500,
    revenueImpact: 12500,
    conversionLift: 18.5,
    avgDiscount: 12.0,
    upcomingPromotions: 5,
  });
});

router.get('/dashboard/performance', async (req: Request, res: Response) => {
  res.json({
    performance: [
      { date: '2026-02-10', sales: 5000, discountGiven: 600 },
      { date: '2026-02-13', sales: 7500, discountGiven: 900 },
      { date: '2026-02-16', sales: 6800, discountGiven: 820 },
    ],
  });
});

router.get('/dashboard/top-promotions', async (req: Request, res: Response) => {
  res.json({
    topPromotions: [
      { id: 'p1', name: 'Winter Sale', revenue: 5000, conversions: 150 },
      { id: 'p2', name: 'Free Shipping Week',revenue: 4200, conversions: 120 },
      { id: 'p3', name: 'Bundle Deal', revenue: 3300, conversions: 80 },
    ],
  });
});

// ========== プロモーション管理 ==========
router.get('/promotions', async (req: Request, res: Response) => {
  res.json({
    promotions: [
      { id: 'p1', name: 'Winter Sale', type: 'PERCENTAGE', discount: 15, products: 300, isActive: true, endDate: '2026-02-28' },
      { id: 'p2', name: 'Free Shipping Week', type: 'FREE_SHIPPING', discount: 0, products: 500, isActive: true, endDate: '2026-02-20' },
      { id: 'p3', name: 'Bundle Deal', type: 'BUNDLE', discount: 20, products: 100, isActive: false, endDate: '2026-03-15' },
    ],
    total: 15,
  });
});

router.post('/promotions', async (req: Request, res: Response) => {
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid promotion', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `promo_${Date.now()}`,
    ...parsed.data,
    products: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/promotions/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Winter Sale',
    type: 'PERCENTAGE',
    discountValue: 15,
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    products: 300,
    isActive: true,
    stats: {
      revenue: 5000,
      orders: 150,
      conversionRate: 25.5,
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

router.post('/promotions/:id/toggle', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    isActive: req.body.isActive,
    toggledAt: new Date().toISOString(),
  });
});

// ========== 商品管理 ==========
router.get('/promotions/:id/products', async (req: Request, res: Response) => {
  res.json({
    promotionId: req.params.id,
    products: [
      { sku: 'SKU001', title: 'Seiko 5 Sports', originalPrice: 200, promoPrice: 170, sales: 45 },
      { sku: 'SKU002', title: 'Citizen Eco-Drive', originalPrice: 250, promoPrice: 212, sales: 32 },
    ],
    total: 300,
  });
});

router.post('/promotions/:id/products', async (req: Request, res: Response) => {
  res.json({
    promotionId: req.params.id,
    addedSkus: req.body.skus,
    addedCount: req.body.skus.length,
  });
});

router.delete('/promotions/:id/products/:sku', async (req: Request, res: Response) => {
  res.json({
    promotionId: req.params.id,
    removedSku: req.params.sku,
  });
});

// ========== クーポン ==========
router.get('/coupons', async (req: Request, res: Response) => {
  res.json({
    coupons: [
      { id: 'c1', code: 'WINTERSPALE26', discount: 10, used: 45, limit: 100, isActive: true },
      { id: 'c2', code: 'NEWCUSTOMER', discount: 15, used: 120, limit: null, isActive: true },
    ],
    total: 10,
  });
});

router.post('/coupons', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `coupon_${Date.now()}`,
    ...req.body,
    used: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/coupons/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    code: 'WINTERSALE26',
    discount: 10,
    type: 'PERCENTAGE',
    used: 45,
    limit: 100,
    minOrder: 50,
    isActive: true,
    startDate: '2026-02-01',
    endDate: '2026-02-28',
  });
});

// ========== 分析 ==========
router.get('/analytics/impact', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    revenueIncrease: 25000,
    ordersIncrease: 350,
    avgOrderValueChange: 12.5,
    discountCost: 3200,
    roi: 681,
  });
});

router.get('/analytics/comparison', async (req: Request, res: Response) => {
  res.json({
    comparison: [
      { promotionId: 'p1', name: 'Winter Sale', roi: 720, conversion: 25.5 },
      { promotionId: 'p2', name: 'Free Shipping', roi: 650, conversion: 22.0 },
      { promotionId: 'p3', name: 'Bundle Deal', roi: 580, conversion: 18.5 },
    ],
  });
});

// ========== テンプレート ��========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 't1', name: 'Seasonal Sale', type: 'PERCENTAGE', defaultDiscount: 20, usageCount: 15 },
      { id: 't2', name: 'Free Shipping Event', type: 'FREE_SHIPPING', defaultDiscount: 0, usageCount: 8 },
      { id: 't3', name: 'Flash Sale', type: 'PERCENTAGE', defaultDiscount: 30, usageCount: 5 },
    ],
    total: 10,
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `template_${Date.now()}`,
    ...req.body,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultDurationDays: 14,
    maxDiscountPercent: 50,
    allowStacking: false,
    notifyOnStart: true,
    notifyOnEnd: true,
    autoEndPromotions: true,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
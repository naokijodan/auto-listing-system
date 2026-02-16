import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 289: eBay Fee Calculator（手数料計算）
// 28エンドポイント - テーマカラー: sky-600
// =============================================================

// スキーマ
const feeCalculationSchema = z.object({
  salePrice: z.number().min(0),
  category: z.string(),
  storeType: z.enum(['BASIC', 'PREMIUM', 'ANCHOR', 'ENTERPRISE']),
  shippingCost: z.number().min(0).optional(),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalFeesPaid: 12500,
    avgFeeRate: 12.5,
    feeSavings: 1500,
    calculationsThisMonth: 250,
    mostCommonCategory: 'Watches',
    storeType: 'PREMIUM',
  });
});

router.get('/dashboard/by-category', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { category: 'Watches', fees: 5000, rate: 11.5 },
      { category: 'Electronics', fees: 3500, rate: 13.0 },
      { category: 'Collectibles', fees: 2500, rate: 12.5 },
      { category: 'Other', fees: 1500, rate: 14.0 },
    ],
  });
});

router.get('/dashboard/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { date: '2026-02-10', fees: 400, sales: 3200 },
      { date: '2026-02-13', fees: 450, sales: 3600 },
      { date: '2026-02-16', fees: 420, sales: 3350 },
    ],
  });
});

// ========== 手数料計算 ==========
router.post('/calculate', async (req: Request, res: Response) => {
  const parsed = feeCalculationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { salePrice } = parsed.data;
  res.json({
    salePrice,
    insertionFee: 0,
    finalValueFee: salePrice * 0.129,
    paymentProcessingFee: salePrice * 0.027 + 0.30,
    promotedListingFee: 0,
    totalFees: salePrice * 0.156 + 0.30,
    netProceeds: salePrice - (salePrice * 0.156 + 0.30),
    feeRate: 15.6,
  });
});

router.post('/calculate/bulk', async (req: Request, res: Response) => {
  res.json({
    results: req.body.items.map((item: any, idx: number) => ({
      itemId: item.id || `item_${idx}`,
      salePrice: item.price,
      totalFees: item.price * 0.156 + 0.30,
      netProceeds: item.price - (item.price * 0.156 + 0.30),
    })),
    summary: {
      totalSales: req.body.items.reduce((acc: number, item: any) => acc + item.price, 0),
      totalFees: req.body.items.reduce((acc: number, item: any) => acc + (item.price * 0.156 + 0.30), 0),
    },
  });
});

router.post('/calculate/compare', async (req: Request, res: Response) => {
  const { salePrice } = req.body;
  res.json({
    comparison: [
      { storeType: 'BASIC', fees: salePrice * 0.15, monthly: 0 },
      { storeType: 'PREMIUM', fees: salePrice * 0.135, monthly: 25.95 },
      { storeType: 'ANCHOR', fees: salePrice * 0.12, monthly: 149.95 },
      { storeType: 'ENTERPRISE', fees: salePrice * 0.105, monthly: 2499.95 },
    ],
    recommended: 'PREMIUM',
  });
});

// ========== 手数料スキャーム ==========
router.get('/fee-types', async (req: Request, res: Response) => {
  res.json({
    feeTypes: [
      { id: 'insertion', name: '出品手数料', description: '出品時に発生する手数料' },
      { id: 'fvf', name: '落札手数料', description: '質売時に適用される手数料' },
      { id: 'payment', name: '決済手数料', description: 'Managed Payments手数料' },
      { id: 'promoted', name: 'プロモーション手数料', description: '広告費用（オプション)' },
    ],
  });
});

router.get('/fee-types/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: '落札手数料',
    description: '販売時に適用される手数料',
    rates: [
      { category: 'Watches', rate: 11.5 },
      { category: 'Electronics', rate: 13.0 },
      { category: 'Collectibles', rate: 12.5 },
    ],
  });
});

// ========== カテゴリ別手数料 ==========
router.get('/categories', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: 'c1', name: 'Watches', fvfRate: 11.5, insertionFree: 250 },
      { id: 'c2', name: 'Electronics', fvfRate: 13.0, insertionFree: 200 },
      { id: 'c3', name: 'Collectibles', fvfRate: 12.5, insertionFree: 100 },
      { id: 'c4', name: 'Clothing', fvfRate: 13.5, insertionFree: 150 },
    ],
    total: 50,
  });
});

router.get('/categories/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Watches',
    fvfRate: 11.5,
    insertionFree: 250,
    paymentRate: 2.7,
    paymentFixed: 0.30,
    examples: [
      { price: 100, totalFees: 15.00, net: 85.00 },
      { price: 500, totalFees: 72.00, net: 428.00 },
    ],
  });
});

// ========== ストアプラン ==========
router.get('/store-plans', async (req: Request, res: Response) => {
  res.json({
    plans: [
      { id: 'basic', name: 'Basic', monthly: 0, fvfDiscount: 0, freeListings: 50 },
      { id: 'premium', name: 'Premium', monthly: 25.95, fvfDiscount: 10, freeListings: 250 },
      { id: 'anchor', name: 'Anchor', monthly: 149.95, fvfDiscount: 20, freeListings: 10000 },
      { id: 'enterprise', name: 'Enterprise', monthly: 2499.95, fvfDiscount: 30, freeListings: 100000 },
    ],
  });
});

router.get('/store-plans/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Premium',
    monthly: 25.95,
    annual: 239.40,
    fvfDiscount: 10,
    freeListings: 250,
    benefits: ['250無料出品)month', '10%FVF割弖', 'マーケティングツール'],
  });
});

router.post('/store-plans/compare', async (req: Request, res: Response) => {
  const { monthlySales, listingsPerMonth } = req.body;
  res.json({
    comparison: [
      { plan: 'Basic', monthlyCost: 0, fees: monthlySales * 0.15, total: monthlySales * 0.15 },
      { plan: 'Premium', monthlyCost: 25.95, fees: monthlySales * 0.135, total: 25.95 + monthlySales * 0.135 },
    ],
    recommended: monthlySales > 2000 ? 'Premium' : 'Basic',
  });
});

// ========== 履歷 ==========
router.get('/history', async (req: Request, res: Response) => {
  res.json({
    history: [
      { id: 'h1', date: '2026-02-16', orderId: 'ORD001', salePrice: 200, totalFees: 30.50 },
      { id: 'h2', date: '2026-02-15', orderId: 'ORD002', salePrice: 150, totalFees: 23.15 },
    ],
    total: 500,
  });
});

router.get('/history/orders/:id', async (req: Request, res: Response) => {
  res.json({
    orderId: req.params.id,
    salePrice: 200,
    fees: {
      insertion: 0,
      finalValue: 23.00,
      payment: 5.70,
      promoted: 1.80,
      total: 30.50,
    },
    netProceeds: 169.50,
  });
});

// ========== 分析 ==========
router.get('/analytics/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalSales: 100000,
    totalFees: 12500,
    avgFeeRate: 12.5,
    byType: [
      { type: 'Final Value', amount: 9500 },
      { type: 'Payment', amount: 2700 },
      { type: 'Promoted', amount: 300 },
    ],
  });
});

router.get('/analytics/optimization', async (req: Request, res: Response) => {
  res.json({
    recommendations: [
      { action: 'Upgrade to Premium', savings: 150, reason: '10% FVF discount' },
      { action: 'Use Promoted Listings Standard', savings: 80, reason: 'Lower ad rate' },
    ],
    potentialSavings: 230,
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultStoreType: 'PREMIUM',
    includePromotedFees: true,
    includeShipping: false,
    currency: 'USD',
    autoCalculate: true,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
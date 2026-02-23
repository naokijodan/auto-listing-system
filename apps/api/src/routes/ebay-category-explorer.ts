import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 291: eBay Category Explorer（カテゴリ探索）
// 28エンドポイント - テーマカラー: teal-600
// =============================================================

// スキーマ
const categorySearchSchema = z.object({
  query: z.string().min(1),
  marketplace: z.enum(['US', 'UK', 'DE', 'AU']).optional(),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalCategories: 5000,
    topLevelCategories: 50,
    savedCategories: 25,
    recentSearches: 30,
    mostUsedCategory: 'Jewelry & Watches',
    avgFeeRate: 12.5,
  });
});

router.get('/dashboard/popular', async (req: Request, res: Response) => {
  res.json({
    popular: [
      { id: '281104', name: 'Wristwatches', listings: 1500000, feeRate: 11.5 },
      { id: '175684', name: 'Cell Phones & Smartphones', listings: 1200000, feeRate: 13.25 },
      { id: '2614', name: 'Video Games', listings: 800000, feeRate: 12.9 },
    ],
  });
});

router.get('/dashboard/trending', async (req: Request, res: Response) => {
  res.json({
    trending: [
      { id: '2224', name: 'Vintage Watches', growth: 25 },
      { id: '26106', name: 'NVIDIA Graphics Cards', growth: 18 },
      { id: '150032', name: 'Collectible Card Games', growth: 15 },
    ],
  });
});

// ========== カテゴリ検索 ==========
router.post('/search', async (req: Request, res: Response) => {
  const parsed = categorySearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search', details: parsed.error.issues });
  }
  res.json({
    query: parsed.data.query,
    results: [
      { id: '281104', name: 'Wristwatches', path: 'Jewelry & Watches > Watches > Wristwatches', feeRate: 11.5 },
      { id: '14324', name: 'Watch Parts', path: 'Jewelry & Watches > Watches > Parts', feeRate: 12.0 },
    ],
    total: 25,
  });
});

router.get('/suggestions', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  res.json({
    suggestions: [
      { id: '281104', name: 'Wristwatches' },
      { id: '14324', name: 'Watch Parts' },
      { id: '2224', name: 'Vintage Watches' },
    ],
  });
});

// ========== カテゴリツリー ==========
router.get('/tree', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: '281100', name: 'Jewelry & Watches', children: 15 },
      { id: '55', name: 'Collectibles & Art', children: 20 },
      { id: '11233', name: 'Electronics', children: 25 },
    ],
    total: 50,
  });
});

router.get('/tree/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Jewelry & Watches',
    children: [
      { id: '281104', name: 'Wristwatches', children: 10 },
      { id: '281102', name: 'Pocket Watches', children: 5 },
      { id: '14324', name: 'Watch Parts', children: 8 },
    ],
  });
});

// ========== カテゴリ詳細 ==========
router.get('/categories/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Wristwatches',
    path: 'Jewelry & Watches > Watches > Wristwatches',
    level: 3,
    parentId: '281100',
    feeRate: 11.5,
    listingCount: 1500000,
    itemSpecifics: ['Brand', 'Movement', 'Case Material', 'Band Color'],
  });
});

router.get('/categories/:id/fees', async (req: Request, res: Response) => {
  res.json({
    categoryId: req.params.id,
    insertionFee: 0.35,
    finalValueFee: 11.5,
    internationalFee: 1.65,
    paymentProcessingFee: 2.35,
    promotedListingFee: 5.0,
    estimatedTotal: 20.85,
  });
});

router.get('/categories/:id/specifics', async (req: Request, res: Response) => {
  res.json({
    categoryId: req.params.id,
    specifics: [
      { name: 'Brand', required: true, values: ['Seiko', 'Citizen', 'Casio', 'Orient'] },
      { name: 'Movement', required: true, values: ['Automatic', 'Quartz', 'Mechanical'] },
      { name: 'Case Material', required: false, values: ['Stainless Steel', 'Titanium', 'Gold'] },
    ],
  });
});

router.get('/categories/:id/policies', async (req: Request, res: Response) => {
  res.json({
    categoryId: req.params.id,
    policies: {
      conditionRequired: true,
      allowedConditions: ['New', 'Pre-owned', 'Refurbished'],
      returnPolicyRequired: true,
      itemSpecificsRequired: true,
    },
  });
});

// ========== お気に入り・最近使用 ==========
router.get('/saved', async (req: Request, res: Response) => {
  res.json({
    saved: [
      { id: '281104', name: 'Wristwatches', savedAt: '2026-02-01', usageCount: 50 },
      { id: '14324', name: 'Watch Parts', savedAt: '2026-01-15', usageCount: 30 },
    ],
    total: 25,
  });
});

router.post('/saved', async (req: Request, res: Response) => {
  res.status(201).json({ id: req.body.categoryId, savedAt: new Date().toISOString() });
});

router.delete('/saved/:id', async (req: Request, res: Response) => {
  res.json({ deleted: true, categoryId: req.params.id });
});

router.get('/recent', async (req: Request, res: Response) => {
  res.json({
    recent: [
      { id: '281104', name: 'Wristwatches', lastUsed: '2026-02-15' },
      { id: '175684', name: 'Cell Phones & Smartphones', lastUsed: '2026-02-14' },
      { id: '2614', name: 'Video Games', lastUsed: '2026-02-13' },
    ],
  });
});

// ========== カテゴリ比較 ==========
router.post('/compare', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: '281104', name: 'Wristwatches', feeRate: 11.5, listings: 1500000, avgPrice: 250 },
      { id: '175684', name: 'Cell Phones', feeRate: 13.25, listings: 1200000, avgPrice: 400 },
    ],
    recommendation: 'Wristwatches has lower fees and higher volume',
  });
});

// ========== 人気・トレンド ==========
router.get('/popular/by-marketplace', async (req: Request, res: Response) => {
  res.json({
    marketplaces: [
      { marketplace: 'US', top: [{ id: '281104', name: 'Wristwatches', listings: 800000 }] },
      { marketplace: 'UK', top: [{ id: '281104', name: 'Wristwatches', listings: 300000 }] },
    ],
  });
});

router.get('/popular/by-season', async (req: Request, res: Response) => {
  res.json({
    seasonal: [
      { season: 'Spring', categories: ['Garden & Patio', 'Sporting Goods'] },
      { season: 'Winter', categories: ['Electronics', 'Toys & Hobbies'] },
    ],
  });
});

// ========== マッピング・変換 ==========
router.get('/mapping/:id', async (req: Request, res: Response) => {
  res.json({
    categoryId: req.params.id,
    mappings: {
      amazon: { id: 'B07XYZ', name: 'Watches' },
      yahoo: { id: '23456', name: '腕時計' },
      mercari: { id: '345', name: '腕時計' },
    },
  });
});

router.get('/mapping/cross-platform', async (req: Request, res: Response) => {
  res.json({
    mappings: [
      { ebay: 'Wristwatches', amazon: 'Watches', yahoo: '腕時計', mercari: '腕時計' },
      { ebay: 'Watch Parts', amazon: 'Watch Accessories', yahoo: '時計パーツ', mercari: '時計パーツ' },
    ],
  });
});

// ========== 分析・統計 ==========
router.get('/analytics/fee-comparison', async (req: Request, res: Response) => {
  res.json({
    comparison: [
      { category: 'Wristwatches', feeRate: 11.5, avgPrice: 250, estimatedFee: 28.75 },
      { category: 'Electronics', feeRate: 12.9, avgPrice: 300, estimatedFee: 38.70 },
    ],
  });
});

router.get('/analytics/listing-distribution', async (req: Request, res: Response) => {
  res.json({
    distribution: [
      { category: 'Jewelry & Watches', percentage: 22, listings: 330000 },
      { category: 'Electronics', percentage: 18, listings: 270000 },
      { category: 'Collectibles', percentage: 15, listings: 225000 },
    ],
  });
});

router.get('/analytics/price-ranges', async (req: Request, res: Response) => {
  res.json({
    priceRanges: [
      { range: '$0-$50', percentage: 35, avgListings: 500000 },
      { range: '$50-$200', percentage: 30, avgListings: 450000 },
      { range: '$200-$1000', percentage: 25, avgListings: 375000 },
      { range: '$1000+', percentage: 10, avgListings: 150000 },
    ],
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({ defaultMarketplace: 'US', autoSuggest: true, recentLimit: 20, savedLimit: 100 });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({ ...req.body, updatedAt: new Date().toISOString() });
});

// ========== レポート ==========
router.get('/reports', async (req: Request, res: Response) => {
  res.json({
    reports: [
      { id: 'r1', name: 'Category Fee Report', generatedAt: '2026-02-15', format: 'csv' },
      { id: 'r2', name: 'Trending Categories', generatedAt: '2026-02-14', format: 'pdf' },
    ],
  });
});

router.post('/reports/generate', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `rpt_${Date.now()}`,
    name: req.body.name || 'Category Report',
    status: 'GENERATING',
    estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
  });
});

router.get('/reports/download', async (req: Request, res: Response) => {
  res.json({ downloadUrl: '/api/ebay-category-explorer/reports/download/report.csv', format: req.query.format || 'csv', generatedAt: new Date().toISOString() });
});

export default router;

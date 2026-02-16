import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 281: eBay Smart Repricing（スマート価格調整）
// 28エンドポイント - テーマカラー: cyan-600
// ============================================================

// スキーマ
const repricingRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['COMPETITIVE', 'TIME_BASED', 'INVENTORY_BASED', 'DEMAND_BASED']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })),
  actions: z.object({
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED', 'MATCH', 'UNDERCUT']),
    adjustmentValue: z.number(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
  }),
  isActive: z.boolean().default(true),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    activeRules: 12,
    productsMonitored: 2500,
    priceChangesToday: 150,
    avgPriceChange: 3.5,
    revenueImpact: 12500,
    competitivePosition: 'STRONG',
  });
});

router.get('/dashboard/activity', async (req: Request, res: Response) => {
  res.json({
    activity: [
      { time: '10:30', sku: 'SKU001', oldPrice: 200, newPrice: 195, reason: 'Competitor undercut' },
      { time: '10:25', sku: 'SKU002', oldPrice: 250, newPrice: 245, reason: 'Time-based rule' },
      { time: '10:20', sku: 'SKU003', oldPrice: 180, newPrice: 185, reason: 'Demand increase' },
    ],
    total: 150,
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'competitor_drop', message: '競合が5商品で大幅値下げ', severity: 'high' },
      { id: '2', type: 'min_price_reached', message: '10商品が最低価格に到達', severity: 'warning' },
      { id: '3', type: 'rule_triggered', message: '需要増加ルールが発動', severity: 'info' },
    ],
  });
});

// ========== ルール管理 ==========
router.get('/rules', async (req: Request, res: Response) => {
  res.json({
    rules: [
      { id: 'r1', name: 'Competitor Match', type: 'COMPETITIVE', products: 500, isActive: true, triggeredToday: 45 },
      { id: 'r2', name: 'Weekend Discount', type: 'TIME_BASED', products: 200, isActive: true, triggeredToday: 0 },
      { id: 'r3', name: 'Low Stock Premium', type: 'INVENTORY_BASED', products: 100, isActive: true, triggeredToday: 15 },
      { id: 'r4', name: 'High Demand Boost', type: 'DEMAND_BASED', products: 300, isActive: false, triggeredToday: 0 },
    ],
    total: 12,
  });
});

router.post('/rules', async (req: Request, res: Response) => {
  const parsed = repricingRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid rule', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `rule_${Date.now()}`,
    ...parsed.data,
    products: 0,
    triggeredToday: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/rules/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Competitor Match',
    type: 'COMPETITIVE',
    conditions: [
      { field: 'competitor_price', operator: 'less_than', value: 'our_price' },
    ],
    actions: {
      adjustmentType: 'UNDERCUT',
      adjustmentValue: 2,
      minPrice: 150,
      maxPrice: null,
    },
    products: 500,
    isActive: true,
    triggeredToday: 45,
    lastTriggered: '2026-02-16T10:30:00Z',
    history: [
      { date: '2026-02-15', triggers: 52 },
      { date: '2026-02-14', triggers: 48 },
    ],
  });
});

router.put('/rules/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/rules/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    isActive: req.body.isActive,
    toggledAt: new Date().toISOString(),
  });
});

// ========== 商品管理 ==========
router.get('/products', async (req: Request, res: Response) => {
  res.json({
    products: [
      { sku: 'SKU001', title: 'Seiko 5 Sports', currentPrice: 195, minPrice: 180, maxPrice: 220, lastChange: '2026-02-16', rules: 2 },
      { sku: 'SKU002', title: 'Citizen Eco-Drive', currentPrice: 245, minPrice: 230, maxPrice: 280, lastChange: '2026-02-16', rules: 1 },
      { sku: 'SKU003', title: 'Orient Bambino', currentPrice: 185, minPrice: 170, maxPrice: 210, lastChange: '2026-02-16', rules: 3 },
    ],
    total: 2500,
  });
});

router.get('/products/:sku', async (req: Request, res: Response) => {
  res.json({
    sku: req.params.sku,
    title: 'Seiko 5 Sports',
    currentPrice: 195,
    minPrice: 180,
    maxPrice: 220,
    costPrice: 140,
    margin: 39.3,
    rules: ['r1', 'r3'],
    competitors: [
      { seller: 'Competitor A', price: 198, shipping: 10 },
      { seller: 'Competitor B', price: 205, shipping: 0 },
    ],
    priceHistory: [
      { date: '2026-02-10', price: 200 },
      { date: '2026-02-13', price: 198 },
      { date: '2026-02-16', price: 195 },
    ],
  });
});

router.put('/products/:sku/bounds', async (req: Request, res: Response) => {
  res.json({
    sku: req.params.sku,
    minPrice: req.body.minPrice,
    maxPrice: req.body.maxPrice,
    updatedAt: new Date().toISOString(),
  });
});

router.post('/products/:sku/reprice', async (req: Request, res: Response) => {
  res.json({
    sku: req.params.sku,
    oldPrice: 195,
    newPrice: req.body.newPrice,
    reason: 'Manual reprice',
    repricedAt: new Date().toISOString(),
  });
});

// ========== 競合分析 ==========
router.get('/competitors', async (req: Request, res: Response) => {
  res.json({
    competitors: [
      { id: 'c1', name: 'Competitor A', productsTracked: 150, avgPriceDiff: -2.5, lastUpdated: '2026-02-16' },
      { id: 'c2', name: 'Competitor B', productsTracked: 120, avgPriceDiff: 3.2, lastUpdated: '2026-02-16' },
      { id: 'c3', name: 'Competitor C', productsTracked: 80, avgPriceDiff: 1.0, lastUpdated: '2026-02-15' },
    ],
    total: 15,
  });
});

router.get('/competitors/:id/prices', async (req: Request, res: Response) => {
  res.json({
    competitorId: req.params.id,
    prices: [
      { sku: 'SKU001', ourPrice: 195, theirPrice: 198, diff: -1.5 },
      { sku: 'SKU002', ourPrice: 245, theirPrice: 240, diff: 2.1 },
      { sku: 'SKU003', ourPrice: 185, theirPrice: 190, diff: -2.6 },
    ],
    summary: { below: 80, equal: 20, above: 50 },
  });
});

// ========== 履歴 ==========
router.get('/history', async (req: Request, res: Response) => {
  res.json({
    history: [
      { id: 'h1', sku: 'SKU001', oldPrice: 200, newPrice: 195, rule: 'Competitor Match', timestamp: '2026-02-16T10:30:00Z' },
      { id: 'h2', sku: 'SKU002', oldPrice: 250, newPrice: 245, rule: 'Time-based', timestamp: '2026-02-16T10:25:00Z' },
      { id: 'h3', sku: 'SKU003', oldPrice: 180, newPrice: 185, rule: 'Demand-based', timestamp: '2026-02-16T10:20:00Z' },
    ],
    total: 500,
  });
});

router.get('/history/:sku', async (req: Request, res: Response) => {
  res.json({
    sku: req.params.sku,
    changes: [
      { oldPrice: 200, newPrice: 198, rule: 'Competitor Match', timestamp: '2026-02-14T15:00:00Z' },
      { oldPrice: 198, newPrice: 195, rule: 'Competitor Match', timestamp: '2026-02-16T10:30:00Z' },
    ],
    totalChanges: 15,
    avgChange: -2.5,
  });
});

// ========== 分析 ==========
router.get('/analytics/impact', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    revenueImpact: 45000,
    marginImpact: 5.2,
    conversionChange: 12.5,
    competitiveWins: 85,
    byRule: [
      { rule: 'Competitor Match', revenueImpact: 25000, triggers: 450 },
      { rule: 'Demand-based', revenueImpact: 15000, triggers: 200 },
      { rule: 'Inventory-based', revenueImpact: 5000, triggers: 100 },
    ],
  });
});

router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { date: '2026-02-10', avgPrice: 200, avgCompetitor: 205 },
      { date: '2026-02-13', avgPrice: 198, avgCompetitor: 200 },
      { date: '2026-02-16', avgPrice: 195, avgCompetitor: 198 },
    ],
    priceDirection: 'DOWN',
    competitorDirection: 'DOWN',
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    priceChanges: 500,
    avgChange: -2.5,
    revenueImpact: 45000,
    topRules: ['Competitor Match', 'Demand-based'],
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-smart-repricing/reports/download/repricing_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    autoRepriceEnabled: true,
    repriceInterval: 60,
    globalMinMargin: 15,
    globalMaxDiscount: 20,
    notifyOnReprice: false,
    notifyOnMinPrice: true,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

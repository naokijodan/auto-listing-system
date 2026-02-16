import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 227: Profit Dashboard（利益ダッシュボード）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - 利益概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalRevenue: 2850000,
    totalCost: 1850000,
    grossProfit: 1000000,
    netProfit: 750000,
    profitMargin: 26.3,
    roi: 54.1,
    currency: 'JPY',
    period: 'month',
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/trends - 利益トレンド
router.get('/dashboard/trends', async (_req: Request, res: Response) => {
  res.json({
    daily: [
      { date: '2026-02-10', revenue: 95000, cost: 62000, profit: 33000 },
      { date: '2026-02-11', revenue: 88000, cost: 58000, profit: 30000 },
      { date: '2026-02-12', revenue: 102000, cost: 65000, profit: 37000 },
      { date: '2026-02-13', revenue: 110000, cost: 70000, profit: 40000 },
      { date: '2026-02-14', revenue: 125000, cost: 78000, profit: 47000 },
      { date: '2026-02-15', revenue: 145000, cost: 92000, profit: 53000 },
      { date: '2026-02-16', revenue: 98000, cost: 63000, profit: 35000 },
    ],
    comparison: {
      vsLastWeek: 12.5,
      vsLastMonth: 8.2,
      vsLastYear: 25.8,
    },
  });
});

// GET /dashboard/top-products - トップ商品
router.get('/dashboard/top-products', async (_req: Request, res: Response) => {
  res.json({
    products: [
      { id: 'prod_001', name: 'Seiko Prospex SBDC089', revenue: 450000, profit: 135000, margin: 30.0, sales: 10 },
      { id: 'prod_002', name: 'Casio G-Shock DW-5600', revenue: 280000, profit: 98000, margin: 35.0, sales: 28 },
      { id: 'prod_003', name: 'Orient Bambino V4', revenue: 220000, profit: 66000, margin: 30.0, sales: 12 },
      { id: 'prod_004', name: 'Citizen Eco-Drive BN0150', revenue: 180000, profit: 45000, margin: 25.0, sales: 8 },
    ],
  });
});

// --- 売上分析 ---

// GET /revenue/summary - 売上サマリー
router.get('/revenue/summary', async (_req: Request, res: Response) => {
  res.json({
    total: 2850000,
    byMarketplace: [
      { marketplace: 'eBay US', revenue: 1250000, percentage: 43.9 },
      { marketplace: 'eBay UK', revenue: 650000, percentage: 22.8 },
      { marketplace: 'eBay DE', revenue: 450000, percentage: 15.8 },
      { marketplace: 'eBay AU', revenue: 500000, percentage: 17.5 },
    ],
    byCategory: [
      { category: '時計', revenue: 1500000, percentage: 52.6 },
      { category: 'カメラ', revenue: 800000, percentage: 28.1 },
      { category: 'オーディオ', revenue: 550000, percentage: 19.3 },
    ],
  });
});

// GET /revenue/breakdown - 売上内訳
router.get('/revenue/breakdown', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'month',
    breakdown: [
      { type: '商品売上', amount: 2750000, percentage: 96.5 },
      { type: '送料収入', amount: 85000, percentage: 3.0 },
      { type: 'その他', amount: 15000, percentage: 0.5 },
    ],
    trends: [
      { week: 'W06', revenue: 680000 },
      { week: 'W07', revenue: 720000 },
      { week: 'W08', revenue: 750000 },
      { week: 'W09', revenue: 700000 },
    ],
  });
});

// GET /revenue/by-product - 商品別売上
router.get('/revenue/by-product', async (_req: Request, res: Response) => {
  res.json({
    products: [
      { id: 'prod_001', sku: 'SEIKO-SBDC089', name: 'Seiko Prospex', revenue: 450000, units: 10, avgPrice: 45000 },
      { id: 'prod_002', sku: 'CASIO-DW5600', name: 'Casio G-Shock', revenue: 280000, units: 28, avgPrice: 10000 },
      { id: 'prod_003', sku: 'ORIENT-BAM-V4', name: 'Orient Bambino', revenue: 220000, units: 12, avgPrice: 18333 },
    ],
    total: 156,
  });
});

// --- コスト分析 ---

// GET /costs/summary - コストサマリー
router.get('/costs/summary', async (_req: Request, res: Response) => {
  res.json({
    total: 1850000,
    byType: [
      { type: '仕入れ原価', amount: 1400000, percentage: 75.7 },
      { type: '送料', amount: 250000, percentage: 13.5 },
      { type: 'eBay手数料', amount: 150000, percentage: 8.1 },
      { type: 'PayPal手数料', amount: 35000, percentage: 1.9 },
      { type: 'その他', amount: 15000, percentage: 0.8 },
    ],
  });
});

// GET /costs/breakdown - コスト内訳
router.get('/costs/breakdown', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'month',
    details: [
      { category: '仕入れ原価', amount: 1400000, items: 156 },
      { category: '国際送料', amount: 180000, items: 145 },
      { category: '国内送料', amount: 70000, items: 156 },
      { category: 'eBay最終価値手数料', amount: 120000, rate: '12.9%' },
      { category: 'eBay出品手数料', amount: 30000, items: 156 },
      { category: 'PayPal手数料', amount: 35000, rate: '3.9%' },
      { category: '梱包材', amount: 15000, items: 156 },
    ],
  });
});

// GET /costs/by-product - 商品別コスト
router.get('/costs/by-product', async (_req: Request, res: Response) => {
  res.json({
    products: [
      { id: 'prod_001', name: 'Seiko Prospex', purchaseCost: 280000, shippingCost: 25000, fees: 30000, totalCost: 335000 },
      { id: 'prod_002', name: 'Casio G-Shock', purchaseCost: 140000, shippingCost: 28000, fees: 14000, totalCost: 182000 },
      { id: 'prod_003', name: 'Orient Bambino', purchaseCost: 120000, shippingCost: 18000, fees: 16000, totalCost: 154000 },
    ],
    total: 156,
  });
});

// --- 利益分析 ---

// GET /profit/summary - 利益サマリー
router.get('/profit/summary', async (_req: Request, res: Response) => {
  res.json({
    grossProfit: 1000000,
    operatingExpenses: 250000,
    netProfit: 750000,
    profitMargin: 26.3,
    grossMargin: 35.1,
    netMargin: 26.3,
    roi: 54.1,
  });
});

// GET /profit/by-marketplace - マーケットプレース別利益
router.get('/profit/by-marketplace', async (_req: Request, res: Response) => {
  res.json({
    marketplaces: [
      { marketplace: 'eBay US', revenue: 1250000, cost: 850000, profit: 400000, margin: 32.0 },
      { marketplace: 'eBay UK', revenue: 650000, cost: 450000, profit: 200000, margin: 30.8 },
      { marketplace: 'eBay DE', revenue: 450000, cost: 320000, profit: 130000, margin: 28.9 },
      { marketplace: 'eBay AU', revenue: 500000, cost: 380000, profit: 120000, margin: 24.0 },
    ],
  });
});

// GET /profit/by-category - カテゴリ別利益
router.get('/profit/by-category', async (_req: Request, res: Response) => {
  res.json({
    categories: [
      { category: '時計', revenue: 1500000, cost: 980000, profit: 520000, margin: 34.7 },
      { category: 'カメラ', revenue: 800000, cost: 560000, profit: 240000, margin: 30.0 },
      { category: 'オーディオ', revenue: 550000, cost: 400000, profit: 150000, margin: 27.3 },
    ],
  });
});

// GET /profit/by-product - 商品別利益
router.get('/profit/by-product', async (_req: Request, res: Response) => {
  res.json({
    products: [
      { id: 'prod_001', name: 'Seiko Prospex SBDC089', revenue: 450000, cost: 315000, profit: 135000, margin: 30.0, roi: 42.9 },
      { id: 'prod_002', name: 'Casio G-Shock DW-5600', revenue: 280000, cost: 182000, profit: 98000, margin: 35.0, roi: 53.8 },
      { id: 'prod_003', name: 'Orient Bambino V4', revenue: 220000, cost: 154000, profit: 66000, margin: 30.0, roi: 42.9 },
    ],
    total: 156,
  });
});

// --- 比較分析 ---

// GET /comparison/period - 期間比較
router.get('/comparison/period', async (req: Request, res: Response) => {
  res.json({
    currentPeriod: {
      period: 'this_month',
      revenue: 2850000,
      cost: 1850000,
      profit: 1000000,
      margin: 35.1,
    },
    previousPeriod: {
      period: 'last_month',
      revenue: 2650000,
      cost: 1750000,
      profit: 900000,
      margin: 34.0,
    },
    changes: {
      revenue: 7.5,
      cost: 5.7,
      profit: 11.1,
      margin: 1.1,
    },
  });
});

// GET /comparison/yoy - 年次比較
router.get('/comparison/yoy', async (_req: Request, res: Response) => {
  res.json({
    thisYear: { revenue: 28500000, profit: 8500000, margin: 29.8 },
    lastYear: { revenue: 22000000, profit: 6200000, margin: 28.2 },
    growth: {
      revenue: 29.5,
      profit: 37.1,
      margin: 1.6,
    },
  });
});

// --- レポート ---

// GET /reports/summary - サマリーレポート
router.get('/reports/summary', async (_req: Request, res: Response) => {
  res.json({
    report: {
      period: '2026-02',
      generatedAt: '2026-02-16 10:00:00',
      summary: {
        totalRevenue: 2850000,
        totalCost: 1850000,
        grossProfit: 1000000,
        netProfit: 750000,
      },
      topProducts: [
        { name: 'Seiko Prospex', profit: 135000 },
        { name: 'Casio G-Shock', profit: 98000 },
      ],
      topMarketplaces: [
        { name: 'eBay US', profit: 400000 },
        { name: 'eBay UK', profit: 200000 },
      ],
    },
  });
});

// POST /reports/generate - レポート生成
router.post('/reports/generate', async (_req: Request, res: Response) => {
  res.json({ success: true, reportId: 'report_001', message: 'レポートを生成しました' });
});

// GET /reports/download/:id - レポートダウンロード
router.get('/reports/download/:id', async (req: Request, res: Response) => {
  res.json({ success: true, reportId: req.params.id, downloadUrl: '/downloads/profit_report_202602.pdf' });
});

// --- 目標管理 ---

// GET /goals - 目標一覧
router.get('/goals', async (_req: Request, res: Response) => {
  res.json({
    goals: [
      { id: 'goal_001', type: 'revenue', target: 3000000, current: 2850000, progress: 95.0, period: 'month' },
      { id: 'goal_002', type: 'profit', target: 800000, current: 750000, progress: 93.8, period: 'month' },
      { id: 'goal_003', type: 'margin', target: 30.0, current: 26.3, progress: 87.7, period: 'month' },
    ],
  });
});

// POST /goals - 目標設定
router.post('/goals', async (_req: Request, res: Response) => {
  res.json({ success: true, goalId: 'goal_new_001', message: '目標を設定しました' });
});

// PUT /goals/:id - 目標更新
router.put('/goals/:id', async (req: Request, res: Response) => {
  res.json({ success: true, goalId: req.params.id, message: '目標を更新しました' });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      currency: 'JPY',
      fiscalYearStart: '04',
      defaultCostCalculation: 'fifo',
      includeShippingInCost: true,
      includeFeesInCost: true,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

// GET /settings/cost-rules - コストルール
router.get('/settings/cost-rules', async (_req: Request, res: Response) => {
  res.json({
    rules: [
      { id: 'rule_001', name: '標準送料', type: 'shipping', value: 1500, applyTo: 'all' },
      { id: 'rule_002', name: 'eBay手数料', type: 'fee', rate: 12.9, applyTo: 'ebay' },
      { id: 'rule_003', name: '梱包材費', type: 'fixed', value: 200, applyTo: 'all' },
    ],
  });
});

// PUT /settings/cost-rules - コストルール更新
router.put('/settings/cost-rules', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'コストルールを更新しました' });
});

export default router;

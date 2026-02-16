import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 274: eBay Tax Calculator（税金計算システム）
// 28エンドポイント - テーマカラー: slate-600
// ============================================================

// スキーマ
const calculateTaxSchema = z.object({
  itemPrice: z.number().min(0),
  shippingCost: z.number().min(0).default(0),
  originCountry: z.string(),
  destinationCountry: z.string(),
  destinationState: z.string().optional(),
  categoryId: z.string().optional(),
  hsCode: z.string().optional(),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalTaxCollected: 15000,
    totalTaxRemitted: 12000,
    pendingRemittance: 3000,
    avgTaxRate: 8.5,
    jurisdictions: 45,
    complianceScore: 98,
  });
});

router.get('/dashboard/breakdown', async (req: Request, res: Response) => {
  res.json({
    breakdown: [
      { type: 'Sales Tax (US)', amount: 8000, percent: 53 },
      { type: 'VAT (EU)', amount: 4000, percent: 27 },
      { type: 'GST (AU/CA)', amount: 2000, percent: 13 },
      { type: 'Import Duty', amount: 1000, percent: 7 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'deadline', message: 'カリフォルニア州の申告期限が3日後です', severity: 'high' },
      { id: '2', type: 'rate_change', message: 'テキサス州の税率が4月から変更予定', severity: 'medium' },
      { id: '3', type: 'nexus', message: '新しい州でネクサス閾値に近づいています', severity: 'info' },
    ],
  });
});

// ========== 税金計算 ==========
router.post('/calculate', async (req: Request, res: Response) => {
  const parsed = calculateTaxSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
  }
  const { itemPrice, shippingCost, destinationCountry, destinationState } = parsed.data;
  const subtotal = itemPrice + shippingCost;
  const taxRate = destinationCountry === 'US' ? 0.085 : destinationCountry === 'GB' ? 0.20 : 0.10;
  const taxAmount = subtotal * taxRate;

  res.json({
    subtotal,
    taxRate: taxRate * 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
    breakdown: [
      { name: 'State Tax', rate: taxRate * 100 * 0.6, amount: taxAmount * 0.6 },
      { name: 'County Tax', rate: taxRate * 100 * 0.3, amount: taxAmount * 0.3 },
      { name: 'City Tax', rate: taxRate * 100 * 0.1, amount: taxAmount * 0.1 },
    ],
    jurisdiction: { country: destinationCountry, state: destinationState },
  });
});

router.post('/calculate/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  res.json({
    results: items?.map((item: any, i: number) => ({
      itemId: item.itemId || `item_${i}`,
      subtotal: item.itemPrice + (item.shippingCost || 0),
      taxAmount: (item.itemPrice + (item.shippingCost || 0)) * 0.085,
      total: (item.itemPrice + (item.shippingCost || 0)) * 1.085,
    })) || [],
    totalTax: 250,
    totalAmount: 3200,
  });
});

router.get('/rates', async (req: Request, res: Response) => {
  const { country, state } = req.query;
  res.json({
    rates: [
      { jurisdiction: 'California', country: 'US', rate: 7.25, effectiveDate: '2026-01-01' },
      { jurisdiction: 'New York', country: 'US', rate: 8.0, effectiveDate: '2026-01-01' },
      { jurisdiction: 'Texas', country: 'US', rate: 6.25, effectiveDate: '2026-01-01' },
      { jurisdiction: 'United Kingdom', country: 'GB', rate: 20.0, effectiveDate: '2026-01-01' },
      { jurisdiction: 'Germany', country: 'DE', rate: 19.0, effectiveDate: '2026-01-01' },
    ],
  });
});

router.get('/rates/:jurisdiction', async (req: Request, res: Response) => {
  res.json({
    jurisdiction: req.params.jurisdiction,
    country: 'US',
    stateRate: 6.0,
    avgLocalRate: 1.5,
    combinedRate: 7.5,
    effectiveDate: '2026-01-01',
    nextChange: { date: '2026-04-01', newRate: 7.75 },
  });
});

// ========== ネクサス管理 ==========
router.get('/nexus', async (req: Request, res: Response) => {
  res.json({
    nexusStates: [
      { state: 'CA', hasNexus: true, type: 'economic', salesThreshold: 500000, transactionThreshold: 200, currentSales: 650000 },
      { state: 'NY', hasNexus: true, type: 'physical', salesThreshold: 500000, transactionThreshold: 100, currentSales: 300000 },
      { state: 'TX', hasNexus: false, type: 'none', salesThreshold: 500000, transactionThreshold: 200, currentSales: 150000 },
      { state: 'FL', hasNexus: false, type: 'approaching', salesThreshold: 100000, transactionThreshold: 200, currentSales: 85000 },
    ],
    totalNexusStates: 15,
  });
});

router.get('/nexus/:state', async (req: Request, res: Response) => {
  res.json({
    state: req.params.state,
    hasNexus: true,
    nexusType: 'economic',
    establishedDate: '2025-06-15',
    thresholds: { sales: 500000, transactions: 200 },
    currentMetrics: { sales: 650000, transactions: 350 },
    filingFrequency: 'quarterly',
    nextFilingDate: '2026-04-15',
  });
});

router.post('/nexus/:state/register', async (req: Request, res: Response) => {
  res.json({
    state: req.params.state,
    registrationId: `REG_${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  });
});

// ========== 申告・納付 ==========
router.get('/filings', async (req: Request, res: Response) => {
  res.json({
    filings: [
      { id: '1', jurisdiction: 'California', period: '2026-Q1', dueDate: '2026-04-15', status: 'pending', amount: 2500 },
      { id: '2', jurisdiction: 'New York', period: '2026-Q1', dueDate: '2026-04-20', status: 'pending', amount: 1800 },
      { id: '3', jurisdiction: 'Texas', period: '2026-Q1', dueDate: '2026-04-25', status: 'draft', amount: 1200 },
    ],
    totalDue: 5500,
    upcomingCount: 3,
  });
});

router.get('/filings/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    jurisdiction: 'California',
    period: '2026-Q1',
    dueDate: '2026-04-15',
    status: 'pending',
    grossSales: 35000,
    taxableSales: 32000,
    taxCollected: 2720,
    adjustments: -220,
    amountDue: 2500,
  });
});

router.post('/filings/:id/submit', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'submitted',
    confirmationNumber: `CONF_${Date.now()}`,
    submittedAt: new Date().toISOString(),
  });
});

router.post('/filings/:id/pay', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'paid',
    paymentId: `PAY_${Date.now()}`,
    amount: req.body.amount || 2500,
    paidAt: new Date().toISOString(),
  });
});

// ========== 分析 ==========
router.get('/analytics/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalCollected: 15000,
    totalRemitted: 12000,
    effectiveTaxRate: 8.2,
    topJurisdictions: [
      { name: 'California', amount: 5000 },
      { name: 'New York', amount: 3000 },
      { name: 'Texas', amount: 2000 },
    ],
  });
});

router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { period: '2026-01', collected: 4500, remitted: 4000 },
      { period: '2026-02', collected: 5200, remitted: 4500 },
      { period: '2026-03', collected: 5300, remitted: 3500 },
    ],
  });
});

router.get('/analytics/compliance', async (req: Request, res: Response) => {
  res.json({
    complianceScore: 98,
    onTimeFilings: 45,
    lateFilings: 1,
    missedFilings: 0,
    pendingRegistrations: 2,
  });
});

// ========== HSコード ==========
router.get('/hs-codes', async (req: Request, res: Response) => {
  const { q } = req.query;
  res.json({
    codes: [
      { code: '9101.11', description: 'Wristwatches with mechanical display', dutyRate: 6.4 },
      { code: '9101.21', description: 'Wristwatches with automatic winding', dutyRate: 6.4 },
      { code: '8525.80', description: 'Television cameras, digital cameras', dutyRate: 0 },
    ],
  });
});

router.get('/hs-codes/:code', async (req: Request, res: Response) => {
  res.json({
    code: req.params.code,
    description: 'Wristwatches with mechanical display',
    chapter: '91',
    dutyRates: {
      US: 6.4,
      EU: 4.5,
      UK: 0,
      AU: 5.0,
    },
    restrictions: [],
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalCollected: 15000,
    totalRemitted: 12000,
    complianceScore: 98,
    jurisdictionCount: 45,
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-tax-calculator/reports/download/tax_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    autoCollect: true,
    defaultHsCode: '9101.11',
    roundingMode: 'half_up',
    includeTaxInPrice: false,
    reminderDays: 7,
    autoFileEnabled: false,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

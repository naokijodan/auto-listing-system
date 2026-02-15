import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ==================== Dashboard ====================

// 1. GET /dashboard/overview - ダッシュボード概要
router.get('/dashboard/overview', async (req: Request, res: Response) => {
  try {
    const overview = {
      totalRevenue: 4250000,
      totalExpenses: 2975000,
      netProfit: 1275000,
      profitMargin: 30.0,
      cashFlow: 850000,
      accountsReceivable: 125000,
      accountsPayable: 95000,
      period: 'monthly',
      lastUpdated: new Date().toISOString(),
    };
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// 2. GET /dashboard/financial-health - 財務健全性
router.get('/dashboard/financial-health', async (req: Request, res: Response) => {
  try {
    const health = {
      overallScore: 82,
      metrics: {
        liquidity: { score: 85, status: 'good', currentRatio: 2.1 },
        profitability: { score: 78, status: 'good', grossMargin: 42.5 },
        efficiency: { score: 80, status: 'good', assetTurnover: 1.8 },
        leverage: { score: 88, status: 'excellent', debtRatio: 0.25 },
      },
      trends: {
        revenue: 8.5,
        expenses: 5.2,
        profit: 12.3,
      },
      alerts: [
        { type: 'warning', message: '売掛金回収期間が長期化傾向' },
        { type: 'info', message: '在庫回転率が改善中' },
      ],
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch financial health' });
  }
});

// 3. GET /dashboard/cash-flow - キャッシュフロー概要
router.get('/dashboard/cash-flow', async (req: Request, res: Response) => {
  try {
    const cashFlow = {
      operating: 950000,
      investing: -150000,
      financing: 50000,
      netChange: 850000,
      openingBalance: 1200000,
      closingBalance: 2050000,
      byMonth: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7),
        operating: 120000 + Math.random() * 80000,
        investing: -20000 - Math.random() * 30000,
        financing: -10000 + Math.random() * 30000,
      })),
    };
    res.json(cashFlow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cash flow' });
  }
});

// ==================== Income Statement ====================

// 4. GET /income/summary - 損益サマリー
router.get('/income/summary', async (req: Request, res: Response) => {
  try {
    const summary = {
      period: req.query.period || 'monthly',
      revenue: {
        total: 4250000,
        productSales: 3800000,
        shippingRevenue: 320000,
        otherIncome: 130000,
      },
      costOfGoodsSold: {
        total: 2445000,
        productCost: 2150000,
        shippingCost: 245000,
        platformFees: 50000,
      },
      grossProfit: 1805000,
      grossMargin: 42.5,
      operatingExpenses: {
        total: 530000,
        marketing: 180000,
        payroll: 200000,
        software: 45000,
        office: 35000,
        other: 70000,
      },
      operatingIncome: 1275000,
      otherExpenses: 0,
      netIncome: 1275000,
      netMargin: 30.0,
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income summary' });
  }
});

// 5. GET /income/trends - 損益トレンド
router.get('/income/trends', async (req: Request, res: Response) => {
  try {
    const trends = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().slice(0, 7),
      revenue: 3500000 + Math.random() * 1500000,
      cogs: 2000000 + Math.random() * 800000,
      grossProfit: 1500000 + Math.random() * 700000,
      operatingExpenses: 400000 + Math.random() * 200000,
      netIncome: 1000000 + Math.random() * 500000,
    }));
    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income trends' });
  }
});

// 6. GET /income/by-category - カテゴリ別損益
router.get('/income/by-category', async (req: Request, res: Response) => {
  try {
    const categories = [
      { category: 'Electronics', revenue: 1500000, cogs: 900000, profit: 600000, margin: 40.0 },
      { category: 'Fashion', revenue: 950000, cogs: 520000, profit: 430000, margin: 45.3 },
      { category: 'Home & Garden', revenue: 720000, cogs: 400000, profit: 320000, margin: 44.4 },
      { category: 'Sports', revenue: 580000, cogs: 320000, profit: 260000, margin: 44.8 },
      { category: 'Collectibles', revenue: 500000, cogs: 305000, profit: 195000, margin: 39.0 },
    ];
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income by category' });
  }
});

// ==================== Balance Sheet ====================

// 7. GET /balance/summary - 貸借対照表サマリー
router.get('/balance/summary', async (req: Request, res: Response) => {
  try {
    const summary = {
      asOf: new Date().toISOString().split('T')[0],
      assets: {
        total: 5850000,
        current: {
          total: 3200000,
          cash: 2050000,
          accountsReceivable: 125000,
          inventory: 850000,
          prepaidExpenses: 175000,
        },
        nonCurrent: {
          total: 2650000,
          equipment: 1200000,
          software: 450000,
          deposits: 1000000,
        },
      },
      liabilities: {
        total: 1450000,
        current: {
          total: 950000,
          accountsPayable: 95000,
          accruedExpenses: 180000,
          shortTermDebt: 300000,
          deferredRevenue: 375000,
        },
        nonCurrent: {
          total: 500000,
          longTermDebt: 500000,
        },
      },
      equity: {
        total: 4400000,
        retainedEarnings: 3200000,
        capitalStock: 1000000,
        otherEquity: 200000,
      },
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance summary' });
  }
});

// 8. GET /balance/trends - 貸借トレンド
router.get('/balance/trends', async (req: Request, res: Response) => {
  try {
    const trends = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().slice(0, 7),
      totalAssets: 5000000 + i * 70000 + Math.random() * 100000,
      totalLiabilities: 1200000 + i * 20000 + Math.random() * 50000,
      totalEquity: 3800000 + i * 50000 + Math.random() * 50000,
    }));
    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance trends' });
  }
});

// ==================== Cash Flow Statement ====================

// 9. GET /cashflow/detailed - 詳細キャッシュフロー
router.get('/cashflow/detailed', async (req: Request, res: Response) => {
  try {
    const cashflow = {
      period: req.query.period || 'monthly',
      operating: {
        total: 950000,
        netIncome: 1275000,
        adjustments: {
          depreciation: 85000,
          accountsReceivable: -25000,
          inventory: -150000,
          accountsPayable: 15000,
          other: -250000,
        },
      },
      investing: {
        total: -150000,
        equipmentPurchases: -120000,
        softwarePurchases: -30000,
        assetSales: 0,
      },
      financing: {
        total: 50000,
        debtProceeds: 100000,
        debtPayments: -50000,
        dividends: 0,
      },
      netChange: 850000,
      beginningCash: 1200000,
      endingCash: 2050000,
    };
    res.json(cashflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch detailed cash flow' });
  }
});

// 10. GET /cashflow/forecast - キャッシュフロー予測
router.get('/cashflow/forecast', async (req: Request, res: Response) => {
  try {
    const forecast = {
      currentBalance: 2050000,
      projections: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString().slice(0, 7),
        inflow: 800000 + Math.random() * 200000,
        outflow: 600000 + Math.random() * 150000,
        netChange: 150000 + Math.random() * 100000,
        endingBalance: 2050000 + (i + 1) * 150000,
      })),
      warnings: [
        { month: '2026-05', type: 'low_balance', message: '残高が最低水準に近づく可能性' },
      ],
    };
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cash flow forecast' });
  }
});

// ==================== Expense Analysis ====================

// 11. GET /expenses/breakdown - 経費内訳
router.get('/expenses/breakdown', async (req: Request, res: Response) => {
  try {
    const breakdown = {
      total: 2975000,
      byCategory: [
        { category: 'Product Cost', amount: 2150000, percentage: 72.3 },
        { category: 'Shipping', amount: 245000, percentage: 8.2 },
        { category: 'Marketing', amount: 180000, percentage: 6.1 },
        { category: 'Payroll', amount: 200000, percentage: 6.7 },
        { category: 'Platform Fees', amount: 50000, percentage: 1.7 },
        { category: 'Software', amount: 45000, percentage: 1.5 },
        { category: 'Other', amount: 105000, percentage: 3.5 },
      ],
      trends: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7),
        total: 2500000 + Math.random() * 500000,
        productCost: 1800000 + Math.random() * 400000,
        operating: 500000 + Math.random() * 100000,
      })),
    };
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense breakdown' });
  }
});

// 12. GET /expenses/comparison - 経費比較
router.get('/expenses/comparison', async (req: Request, res: Response) => {
  try {
    const comparison = {
      currentPeriod: {
        total: 2975000,
        byCategory: {
          productCost: 2150000,
          shipping: 245000,
          marketing: 180000,
          payroll: 200000,
          other: 200000,
        },
      },
      previousPeriod: {
        total: 2850000,
        byCategory: {
          productCost: 2050000,
          shipping: 260000,
          marketing: 150000,
          payroll: 200000,
          other: 190000,
        },
      },
      changes: {
        total: { amount: 125000, percentage: 4.4 },
        productCost: { amount: 100000, percentage: 4.9 },
        shipping: { amount: -15000, percentage: -5.8 },
        marketing: { amount: 30000, percentage: 20.0 },
        payroll: { amount: 0, percentage: 0 },
        other: { amount: 10000, percentage: 5.3 },
      },
    };
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense comparison' });
  }
});

// ==================== Profitability Analysis ====================

// 13. GET /profitability/by-product - 商品別収益性
router.get('/profitability/by-product', async (req: Request, res: Response) => {
  try {
    const products = Array.from({ length: 20 }, (_, i) => ({
      id: `prod-${i + 1}`,
      sku: `SKU-${1000 + i}`,
      title: `商品 ${i + 1}`,
      revenue: 50000 + Math.random() * 150000,
      cost: 30000 + Math.random() * 80000,
      profit: 20000 + Math.random() * 70000,
      margin: 25 + Math.random() * 30,
      unitsSold: 50 + Math.floor(Math.random() * 200),
      avgSellingPrice: 500 + Math.random() * 1000,
    }));
    res.json({ products, total: products.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product profitability' });
  }
});

// 14. GET /profitability/by-channel - チャネル別収益性
router.get('/profitability/by-channel', async (req: Request, res: Response) => {
  try {
    const channels = [
      { channel: 'eBay US', revenue: 1800000, cost: 1080000, profit: 720000, margin: 40.0, orders: 2800 },
      { channel: 'eBay UK', revenue: 950000, cost: 590000, profit: 360000, margin: 37.9, orders: 1500 },
      { channel: 'eBay DE', revenue: 720000, cost: 450000, profit: 270000, margin: 37.5, orders: 1200 },
      { channel: 'eBay AU', revenue: 480000, cost: 305000, profit: 175000, margin: 36.5, orders: 800 },
      { channel: 'eBay CA', revenue: 300000, cost: 190000, profit: 110000, margin: 36.7, orders: 500 },
    ];
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel profitability' });
  }
});

// 15. GET /profitability/margin-analysis - マージン分析
router.get('/profitability/margin-analysis', async (req: Request, res: Response) => {
  try {
    const analysis = {
      overall: {
        grossMargin: 42.5,
        operatingMargin: 30.0,
        netMargin: 30.0,
      },
      distribution: [
        { range: '0-20%', count: 45, revenue: 180000 },
        { range: '20-30%', count: 120, revenue: 650000 },
        { range: '30-40%', count: 200, revenue: 1500000 },
        { range: '40-50%', count: 150, revenue: 1200000 },
        { range: '50%+', count: 85, revenue: 720000 },
      ],
      trends: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7),
        grossMargin: 40 + Math.random() * 5,
        netMargin: 28 + Math.random() * 4,
      })),
    };
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch margin analysis' });
  }
});

// ==================== Financial Ratios ====================

// 16. GET /ratios/all - 財務比率一覧
router.get('/ratios/all', async (req: Request, res: Response) => {
  try {
    const ratios = {
      liquidity: {
        currentRatio: 2.1,
        quickRatio: 1.8,
        cashRatio: 1.2,
      },
      profitability: {
        grossMargin: 42.5,
        operatingMargin: 30.0,
        netMargin: 30.0,
        roe: 29.0,
        roa: 21.8,
      },
      efficiency: {
        inventoryTurnover: 4.2,
        receivablesTurnover: 12.5,
        assetTurnover: 1.8,
        daysInventory: 87,
        daysReceivables: 29,
      },
      leverage: {
        debtRatio: 0.25,
        debtToEquity: 0.33,
        interestCoverage: 15.5,
      },
    };
    res.json(ratios);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch financial ratios' });
  }
});

// 17. GET /ratios/trends - 比率トレンド
router.get('/ratios/trends', async (req: Request, res: Response) => {
  try {
    const trends = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().slice(0, 7),
      currentRatio: 1.8 + Math.random() * 0.5,
      grossMargin: 40 + Math.random() * 5,
      inventoryTurnover: 3.5 + Math.random() * 1.5,
      debtRatio: 0.2 + Math.random() * 0.1,
    }));
    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratio trends' });
  }
});

// ==================== Reports ====================

// 18. GET /reports/summary - レポートサマリー
router.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    const summary = {
      availableReports: [
        { id: 'income', name: '損益計算書', lastGenerated: new Date().toISOString() },
        { id: 'balance', name: '貸借対照表', lastGenerated: new Date().toISOString() },
        { id: 'cashflow', name: 'キャッシュフロー計算書', lastGenerated: new Date().toISOString() },
        { id: 'profitability', name: '収益性分析', lastGenerated: new Date().toISOString() },
        { id: 'tax', name: '税務レポート', lastGenerated: new Date().toISOString() },
      ],
      scheduledReports: [
        { id: 'weekly-income', name: '週次損益', schedule: 'weekly', nextRun: new Date(Date.now() + 86400000).toISOString() },
        { id: 'monthly-full', name: '月次総合レポート', schedule: 'monthly', nextRun: new Date(Date.now() + 7 * 86400000).toISOString() },
      ],
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report summary' });
  }
});

// 19. POST /reports/generate - レポート生成
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      reportType: z.enum(['income', 'balance', 'cashflow', 'profitability', 'tax', 'full']),
      period: z.string(),
      format: z.enum(['pdf', 'xlsx', 'csv']),
    });
    const data = schema.parse(req.body);
    res.json({
      success: true,
      reportId: `report-${Date.now()}`,
      downloadUrl: `/api/ebay/financial-reporting/reports/download/${data.reportType}-${Date.now()}.${data.format}`,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 20. POST /reports/schedule - レポートスケジュール
router.post('/reports/schedule', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      reportType: z.enum(['income', 'balance', 'cashflow', 'profitability', 'tax', 'full']),
      schedule: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
      format: z.enum(['pdf', 'xlsx', 'csv']),
      recipients: z.array(z.string().email()),
    });
    const data = schema.parse(req.body);
    res.json({
      success: true,
      scheduleId: `schedule-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule report' });
  }
});

// ==================== Budgeting ====================

// 21. GET /budget/current - 現在の予算
router.get('/budget/current', async (req: Request, res: Response) => {
  try {
    const budget = {
      period: 'monthly',
      revenue: {
        budget: 4000000,
        actual: 4250000,
        variance: 250000,
        variancePercent: 6.25,
      },
      expenses: {
        budget: 3000000,
        actual: 2975000,
        variance: -25000,
        variancePercent: -0.83,
      },
      netIncome: {
        budget: 1000000,
        actual: 1275000,
        variance: 275000,
        variancePercent: 27.5,
      },
      byCategory: [
        { category: 'Product Cost', budget: 2200000, actual: 2150000, variance: -50000 },
        { category: 'Marketing', budget: 200000, actual: 180000, variance: -20000 },
        { category: 'Shipping', budget: 250000, actual: 245000, variance: -5000 },
        { category: 'Payroll', budget: 200000, actual: 200000, variance: 0 },
        { category: 'Other', budget: 150000, actual: 200000, variance: 50000 },
      ],
    };
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current budget' });
  }
});

// 22. PUT /budget/update - 予算更新
router.put('/budget/update', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      period: z.string(),
      revenue: z.number().optional(),
      expenses: z.record(z.number()).optional(),
    });
    const data = schema.parse(req.body);
    res.json({
      success: true,
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// ==================== Tax ====================

// 23. GET /tax/summary - 税金サマリー
router.get('/tax/summary', async (req: Request, res: Response) => {
  try {
    const summary = {
      period: req.query.period || 'quarterly',
      taxableIncome: 1275000,
      estimatedTax: 382500,
      taxRate: 30.0,
      deductions: [
        { type: 'Business Expenses', amount: 530000 },
        { type: 'Depreciation', amount: 85000 },
        { type: 'Other', amount: 45000 },
      ],
      byJurisdiction: [
        { jurisdiction: 'Federal', taxableIncome: 1275000, rate: 21, tax: 267750 },
        { jurisdiction: 'State', taxableIncome: 1275000, rate: 9, tax: 114750 },
      ],
      filingDates: [
        { type: 'Quarterly Estimated', dueDate: '2026-04-15', status: 'upcoming' },
        { type: 'Annual Return', dueDate: '2027-03-15', status: 'upcoming' },
      ],
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tax summary' });
  }
});

// 24. GET /tax/transactions - 税金関連取引
router.get('/tax/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = Array.from({ length: 20 }, (_, i) => ({
      id: `tx-${i + 1}`,
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      type: ['sale', 'expense', 'refund'][i % 3],
      description: `取引 ${i + 1}`,
      amount: 10000 + Math.random() * 50000,
      taxAmount: 1000 + Math.random() * 5000,
      category: ['product', 'shipping', 'marketing', 'other'][i % 4],
      deductible: i % 3 !== 0,
    }));
    res.json({ transactions, total: transactions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tax transactions' });
  }
});

// ==================== Settings ====================

// 25. GET /settings/general - 一般設定
router.get('/settings/general', async (req: Request, res: Response) => {
  try {
    const settings = {
      fiscalYearStart: '01-01',
      currency: 'JPY',
      accountingMethod: 'accrual',
      taxJurisdiction: 'JP',
      autoReconciliation: true,
      reportingFrequency: 'monthly',
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch general settings' });
  }
});

// 26. PUT /settings/general - 一般設定更新
router.put('/settings/general', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      fiscalYearStart: z.string().optional(),
      currency: z.enum(['JPY', 'USD', 'EUR', 'GBP']).optional(),
      accountingMethod: z.enum(['accrual', 'cash']).optional(),
      taxJurisdiction: z.string().optional(),
      autoReconciliation: z.boolean().optional(),
      reportingFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
    });
    const data = schema.parse(req.body);
    res.json({ success: true, settings: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update general settings' });
  }
});

// 27. GET /settings/accounts - 勘定科目設定
router.get('/settings/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = {
      revenue: [
        { code: '4000', name: 'Product Sales', type: 'revenue' },
        { code: '4100', name: 'Shipping Revenue', type: 'revenue' },
        { code: '4200', name: 'Other Income', type: 'revenue' },
      ],
      expenses: [
        { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
        { code: '5100', name: 'Shipping Expense', type: 'expense' },
        { code: '6000', name: 'Marketing', type: 'expense' },
        { code: '6100', name: 'Payroll', type: 'expense' },
        { code: '6200', name: 'Software', type: 'expense' },
      ],
      assets: [
        { code: '1000', name: 'Cash', type: 'asset' },
        { code: '1100', name: 'Accounts Receivable', type: 'asset' },
        { code: '1200', name: 'Inventory', type: 'asset' },
      ],
      liabilities: [
        { code: '2000', name: 'Accounts Payable', type: 'liability' },
        { code: '2100', name: 'Accrued Expenses', type: 'liability' },
      ],
    };
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account settings' });
  }
});

// 28. POST /settings/accounts - 勘定科目追加
router.post('/settings/accounts', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      code: z.string(),
      name: z.string(),
      type: z.enum(['revenue', 'expense', 'asset', 'liability', 'equity']),
      parentCode: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.json({
      success: true,
      account: {
        ...data,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add account' });
  }
});

export default router;

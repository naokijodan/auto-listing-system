import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// 手数料タイプ
const FEE_TYPES = {
  FINAL_VALUE: { id: 'FINAL_VALUE', name: '落札手数料', description: '最終販売価格の一定割合' },
  INSERTION: { id: 'INSERTION', name: '出品手数料', description: '出品時の固定費用' },
  PAYPAL: { id: 'PAYPAL', name: 'PayPal手数料', description: '決済手数料' },
  PROMOTED: { id: 'PROMOTED', name: '広告手数料', description: 'Promoted Listings費用' },
  INTERNATIONAL: { id: 'INTERNATIONAL', name: '国際手数料', description: '国際取引追加費用' },
  SHIPPING: { id: 'SHIPPING', name: '送料', description: '配送費用' },
  CURRENCY: { id: 'CURRENCY', name: '為替手数料', description: '通貨換算費用' },
} as const;

// カテゴリ別手数料率
const CATEGORY_FEE_RATES: Record<string, { finalValue: number; promoted: number }> = {
  'Electronics': { finalValue: 0.1265, promoted: 0.02 },
  'Clothing': { finalValue: 0.1265, promoted: 0.03 },
  'Home & Garden': { finalValue: 0.1265, promoted: 0.025 },
  'Collectibles': { finalValue: 0.1465, promoted: 0.035 },
  'Sports': { finalValue: 0.1265, promoted: 0.025 },
  'Toys': { finalValue: 0.1265, promoted: 0.03 },
  'Books': { finalValue: 0.1465, promoted: 0.02 },
  'Music': { finalValue: 0.1465, promoted: 0.025 },
  'Other': { finalValue: 0.1265, promoted: 0.025 },
};

// モック商品データ
const mockProducts = Array.from({ length: 20 }, (_, i) => {
  const categories = Object.keys(CATEGORY_FEE_RATES);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const salePrice = Math.floor(Math.random() * 200) + 20;
  const cost = Math.floor(salePrice * (0.3 + Math.random() * 0.3));
  const shippingCost = Math.floor(Math.random() * 15) + 5;
  const shippingCharged = shippingCost + Math.floor(Math.random() * 10);
  const finalValueFee = salePrice * CATEGORY_FEE_RATES[category].finalValue;
  const paypalFee = salePrice * 0.029 + 0.30;
  const promotedFee = Math.random() > 0.5 ? salePrice * CATEGORY_FEE_RATES[category].promoted : 0;
  const totalFees = finalValueFee + paypalFee + promotedFee;
  const profit = salePrice + shippingCharged - cost - shippingCost - totalFees;
  const profitMargin = (profit / salePrice) * 100;

  return {
    id: `prod-${i + 1}`,
    title: `Product ${i + 1}`,
    sku: `SKU-${1000 + i}`,
    category,
    salePrice,
    cost,
    shippingCost,
    shippingCharged,
    fees: {
      finalValue: finalValueFee,
      paypal: paypalFee,
      promoted: promotedFee,
      insertion: 0,
      international: 0,
    },
    totalFees,
    profit,
    profitMargin,
    soldDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    currency: 'USD',
  };
});

// ダッシュボード
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const totalRevenue = mockProducts.reduce((sum, p) => sum + p.salePrice, 0);
    const totalCost = mockProducts.reduce((sum, p) => sum + p.cost, 0);
    const totalFees = mockProducts.reduce((sum, p) => sum + p.totalFees, 0);
    const totalShipping = mockProducts.reduce((sum, p) => sum + p.shippingCost, 0);
    const totalProfit = mockProducts.reduce((sum, p) => sum + p.profit, 0);

    const dashboard = {
      summary: {
        totalRevenue,
        totalCost,
        totalFees,
        totalShipping,
        totalProfit,
        profitMargin: ((totalProfit / totalRevenue) * 100).toFixed(1),
        orderCount: mockProducts.length,
        averageOrderValue: (totalRevenue / mockProducts.length).toFixed(2),
        averageProfit: (totalProfit / mockProducts.length).toFixed(2),
      },
      feeBreakdown: {
        finalValue: mockProducts.reduce((sum, p) => sum + p.fees.finalValue, 0),
        paypal: mockProducts.reduce((sum, p) => sum + p.fees.paypal, 0),
        promoted: mockProducts.reduce((sum, p) => sum + p.fees.promoted, 0),
        insertion: mockProducts.reduce((sum, p) => sum + p.fees.insertion, 0),
        international: mockProducts.reduce((sum, p) => sum + p.fees.international, 0),
      },
      profitByCategory: Object.keys(CATEGORY_FEE_RATES).map(cat => {
        const products = mockProducts.filter(p => p.category === cat);
        return {
          category: cat,
          revenue: products.reduce((sum, p) => sum + p.salePrice, 0),
          profit: products.reduce((sum, p) => sum + p.profit, 0),
          margin: products.length > 0
            ? ((products.reduce((sum, p) => sum + p.profit, 0) / products.reduce((sum, p) => sum + p.salePrice, 0)) * 100).toFixed(1)
            : 0,
          count: products.length,
        };
      }).filter(c => c.count > 0),
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 500) + 200,
        cost: Math.floor(Math.random() * 200) + 80,
        fees: Math.floor(Math.random() * 80) + 30,
        profit: Math.floor(Math.random() * 150) + 50,
      })),
      topProfitProducts: [...mockProducts].sort((a, b) => b.profit - a.profit).slice(0, 5),
      lowProfitProducts: [...mockProducts].sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 5),
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// 手数料タイプ一覧
router.get('/fee-types', async (_req: Request, res: Response) => {
  try {
    res.json(Object.values(FEE_TYPES));
  } catch (error) {
    console.error('Fee types error:', error);
    res.status(500).json({ error: 'Failed to fetch fee types' });
  }
});

// カテゴリ手数料率
router.get('/category-rates', async (_req: Request, res: Response) => {
  try {
    const rates = Object.entries(CATEGORY_FEE_RATES).map(([category, rates]) => ({
      category,
      finalValueRate: (rates.finalValue * 100).toFixed(2),
      promotedRate: (rates.promoted * 100).toFixed(2),
    }));

    res.json(rates);
  } catch (error) {
    console.error('Category rates error:', error);
    res.status(500).json({ error: 'Failed to fetch category rates' });
  }
});

// 利益計算
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      salePrice: z.number().positive(),
      cost: z.number().min(0),
      shippingCost: z.number().min(0),
      shippingCharged: z.number().min(0),
      category: z.string(),
      isPromoted: z.boolean().default(false),
      promotedRate: z.number().min(0).max(100).optional(),
      isInternational: z.boolean().default(false),
      currency: z.string().default('USD'),
      exchangeRate: z.number().positive().optional(),
    });

    const data = schema.parse(req.body);

    const categoryRates = CATEGORY_FEE_RATES[data.category] || CATEGORY_FEE_RATES['Other'];

    // 手数料計算
    const fees = {
      finalValue: data.salePrice * categoryRates.finalValue,
      paypal: data.salePrice * 0.029 + 0.30,
      promoted: data.isPromoted ? data.salePrice * (data.promotedRate ? data.promotedRate / 100 : categoryRates.promoted) : 0,
      insertion: 0,
      international: data.isInternational ? data.salePrice * 0.015 : 0,
      currency: data.exchangeRate ? data.salePrice * 0.025 : 0,
    };

    const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);
    const shippingProfit = data.shippingCharged - data.shippingCost;
    const grossProfit = data.salePrice - data.cost;
    const netProfit = grossProfit + shippingProfit - totalFees;
    const profitMargin = (netProfit / data.salePrice) * 100;
    const roi = (netProfit / data.cost) * 100;

    res.json({
      input: data,
      fees,
      totalFees,
      breakdown: {
        salePrice: data.salePrice,
        cost: data.cost,
        grossProfit,
        shippingCost: data.shippingCost,
        shippingCharged: data.shippingCharged,
        shippingProfit,
        totalFees,
        netProfit,
      },
      metrics: {
        profitMargin: profitMargin.toFixed(2),
        roi: roi.toFixed(2),
        breakEvenPrice: (data.cost + data.shippingCost + totalFees - data.shippingCharged).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: 'Failed to calculate profit' });
  }
});

// バルク利益計算
router.post('/calculate-bulk', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      items: z.array(z.object({
        id: z.string(),
        salePrice: z.number().positive(),
        cost: z.number().min(0),
        shippingCost: z.number().min(0),
        shippingCharged: z.number().min(0),
        category: z.string(),
      })),
    });

    const data = schema.parse(req.body);

    const results = data.items.map(item => {
      const categoryRates = CATEGORY_FEE_RATES[item.category] || CATEGORY_FEE_RATES['Other'];
      const finalValueFee = item.salePrice * categoryRates.finalValue;
      const paypalFee = item.salePrice * 0.029 + 0.30;
      const totalFees = finalValueFee + paypalFee;
      const profit = item.salePrice + item.shippingCharged - item.cost - item.shippingCost - totalFees;

      return {
        id: item.id,
        salePrice: item.salePrice,
        cost: item.cost,
        totalFees,
        profit,
        profitMargin: ((profit / item.salePrice) * 100).toFixed(2),
      };
    });

    const summary = {
      totalItems: results.length,
      totalRevenue: results.reduce((sum, r) => sum + r.salePrice, 0),
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
      totalFees: results.reduce((sum, r) => sum + r.totalFees, 0),
      totalProfit: results.reduce((sum, r) => sum + r.profit, 0),
      averageMargin: (results.reduce((sum, r) => sum + parseFloat(r.profitMargin), 0) / results.length).toFixed(2),
    };

    res.json({
      results,
      summary,
    });
  } catch (error) {
    console.error('Bulk calculate error:', error);
    res.status(500).json({ error: 'Failed to calculate bulk profit' });
  }
});

// 商品別利益
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, sortBy = 'profit', order = 'desc', limit = '50' } = req.query;

    let products = [...mockProducts];

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (sortBy === 'profit') {
      products.sort((a, b) => order === 'desc' ? b.profit - a.profit : a.profit - b.profit);
    } else if (sortBy === 'margin') {
      products.sort((a, b) => order === 'desc' ? b.profitMargin - a.profitMargin : a.profitMargin - b.profitMargin);
    } else if (sortBy === 'revenue') {
      products.sort((a, b) => order === 'desc' ? b.salePrice - a.salePrice : a.salePrice - b.salePrice);
    }

    res.json({
      products: products.slice(0, Number(limit)),
      total: products.length,
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// 商品詳細
router.get('/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = mockProducts.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const detail = {
      ...product,
      feeBreakdown: [
        { type: '落札手数料', amount: product.fees.finalValue, rate: (CATEGORY_FEE_RATES[product.category]?.finalValue || 0.1265) * 100 },
        { type: 'PayPal手数料', amount: product.fees.paypal, rate: 2.9, fixed: 0.30 },
        { type: '広告手数料', amount: product.fees.promoted, rate: product.fees.promoted > 0 ? (CATEGORY_FEE_RATES[product.category]?.promoted || 0.025) * 100 : 0 },
      ],
      costBreakdown: {
        productCost: product.cost,
        shippingCost: product.shippingCost,
        totalCost: product.cost + product.shippingCost,
      },
      revenueBreakdown: {
        salePrice: product.salePrice,
        shippingCharged: product.shippingCharged,
        totalRevenue: product.salePrice + product.shippingCharged,
      },
      metrics: {
        profitMargin: product.profitMargin.toFixed(2),
        roi: ((product.profit / product.cost) * 100).toFixed(2),
        feePercentage: ((product.totalFees / product.salePrice) * 100).toFixed(2),
      },
    };

    res.json(detail);
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// 為替レート
router.get('/exchange-rates', async (_req: Request, res: Response) => {
  try {
    const rates = {
      base: 'USD',
      lastUpdated: new Date().toISOString(),
      rates: {
        JPY: 149.50,
        EUR: 0.92,
        GBP: 0.79,
        AUD: 1.53,
        CAD: 1.36,
        CNY: 7.24,
      },
    };

    res.json(rates);
  } catch (error) {
    console.error('Exchange rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// 為替影響分析
router.get('/currency-impact', async (req: Request, res: Response) => {
  try {
    const { baseCurrency = 'JPY' } = req.query;

    // 為替変動の影響分析
    const impact = {
      baseCurrency,
      currentRate: 149.50,
      scenarios: [
        { change: -10, rate: 134.55, profitImpact: -8.5, marginImpact: -1.2 },
        { change: -5, rate: 142.03, profitImpact: -4.2, marginImpact: -0.6 },
        { change: 0, rate: 149.50, profitImpact: 0, marginImpact: 0 },
        { change: 5, rate: 156.98, profitImpact: 4.2, marginImpact: 0.6 },
        { change: 10, rate: 164.45, profitImpact: 8.5, marginImpact: 1.2 },
      ],
      historicalImpact: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().slice(0, 7),
        rate: 145 + Math.random() * 10,
        profitAdjustment: (Math.random() * 10 - 5).toFixed(2),
      })),
    };

    res.json(impact);
  } catch (error) {
    console.error('Currency impact error:', error);
    res.status(500).json({ error: 'Failed to analyze currency impact' });
  }
});

// レポート生成
router.post('/generate-report', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      period: z.enum(['7d', '30d', '90d', '1y']),
      groupBy: z.enum(['category', 'product', 'day', 'week', 'month']),
      includeCharts: z.boolean().default(true),
    });

    const data = schema.parse(req.body);

    res.json({
      success: true,
      message: 'レポートを生成しました',
      reportId: `report-${Date.now()}`,
      period: data.period,
      groupBy: data.groupBy,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/ebay-profit-calculator/reports/report-${Date.now()}/download`,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 目標設定
router.get('/goals', async (_req: Request, res: Response) => {
  try {
    const goals = {
      monthly: {
        revenue: { target: 50000, current: 35200, progress: 70.4 },
        profit: { target: 15000, current: 10500, progress: 70 },
        margin: { target: 30, current: 29.8, progress: 99.3 },
        orders: { target: 500, current: 456, progress: 91.2 },
      },
      quarterly: {
        revenue: { target: 150000, current: 98500, progress: 65.7 },
        profit: { target: 45000, current: 29400, progress: 65.3 },
      },
    };

    res.json(goals);
  } catch (error) {
    console.error('Goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// 目標更新
router.put('/goals', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      monthly: z.object({
        revenue: z.number().optional(),
        profit: z.number().optional(),
        margin: z.number().optional(),
        orders: z.number().optional(),
      }).optional(),
      quarterly: z.object({
        revenue: z.number().optional(),
        profit: z.number().optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

    res.json({
      success: true,
      message: '目標を更新しました',
      goals: data,
    });
  } catch (error) {
    console.error('Update goals error:', error);
    res.status(500).json({ error: 'Failed to update goals' });
  }
});

// 設定
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      defaultCurrency: 'USD',
      baseCurrency: 'JPY',
      includeShippingInProfit: true,
      paypalFeeRate: 2.9,
      paypalFixedFee: 0.30,
      internationalFeeRate: 1.5,
      currencyConversionFee: 2.5,
      customFeeRates: {},
      profitAlertThreshold: 10, // margin below this triggers alert
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    res.json({
      success: true,
      message: '設定を更新しました',
      settings: data,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as ebayProfitCalculatorRouter };

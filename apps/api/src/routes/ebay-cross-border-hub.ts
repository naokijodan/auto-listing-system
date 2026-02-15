import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ==================== Dashboard ====================

// 1. GET /dashboard/overview - ダッシュボード概要
router.get('/dashboard/overview', async (req: Request, res: Response) => {
  try {
    const overview = {
      totalInternationalSales: 2850000,
      internationalOrderCount: 3200,
      countriesServed: 45,
      activeMarketplaces: 8,
      avgShippingTime: 8.5,
      internationalShare: 58.7,
      currenciesHandled: 12,
      complianceScore: 95,
      lastUpdated: new Date().toISOString(),
    };
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// 2. GET /dashboard/markets - 市場概要
router.get('/dashboard/markets', async (req: Request, res: Response) => {
  try {
    const markets = [
      { market: 'North America', sales: 1250000, orders: 1400, growth: 12.5, share: 43.9 },
      { market: 'Europe', sales: 850000, orders: 950, growth: 8.2, share: 29.8 },
      { market: 'Asia Pacific', sales: 450000, orders: 520, growth: 25.3, share: 15.8 },
      { market: 'Latin America', sales: 180000, orders: 220, growth: 15.8, share: 6.3 },
      { market: 'Middle East', sales: 120000, orders: 110, growth: 32.1, share: 4.2 },
    ];
    res.json({ markets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

// 3. GET /dashboard/compliance-status - コンプライアンス状況
router.get('/dashboard/compliance-status', async (req: Request, res: Response) => {
  try {
    const status = {
      overallScore: 95,
      issues: 3,
      warnings: 8,
      byCategory: [
        { category: 'Customs Documentation', status: 'compliant', score: 98 },
        { category: 'Product Restrictions', status: 'warning', score: 85 },
        { category: 'Tax Compliance', status: 'compliant', score: 96 },
        { category: 'Labeling Requirements', status: 'compliant', score: 94 },
        { category: 'Shipping Regulations', status: 'compliant', score: 97 },
      ],
      recentIssues: [
        { id: 'issue-1', type: 'warning', message: 'バッテリー製品のEU規制確認が必要', country: 'DE' },
        { id: 'issue-2', type: 'info', message: 'カナダ向け成分表示の更新推奨', country: 'CA' },
      ],
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance status' });
  }
});

// ==================== Markets Management ====================

// 4. GET /markets - マーケット一覧
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const markets = [
      { id: 'us', name: 'eBay US', country: 'United States', currency: 'USD', status: 'active', listings: 850, sales: 1100000 },
      { id: 'uk', name: 'eBay UK', country: 'United Kingdom', currency: 'GBP', status: 'active', listings: 720, sales: 650000 },
      { id: 'de', name: 'eBay DE', country: 'Germany', currency: 'EUR', status: 'active', listings: 680, sales: 550000 },
      { id: 'au', name: 'eBay AU', country: 'Australia', currency: 'AUD', status: 'active', listings: 450, sales: 320000 },
      { id: 'ca', name: 'eBay CA', country: 'Canada', currency: 'CAD', status: 'active', listings: 380, sales: 230000 },
      { id: 'fr', name: 'eBay FR', country: 'France', currency: 'EUR', status: 'pending', listings: 0, sales: 0 },
      { id: 'it', name: 'eBay IT', country: 'Italy', currency: 'EUR', status: 'inactive', listings: 0, sales: 0 },
    ];
    res.json({ markets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// 5. GET /markets/:id - マーケット詳細
router.get('/markets/:id', async (req: Request, res: Response) => {
  try {
    const market = {
      id: req.params.id,
      name: `eBay ${req.params.id.toUpperCase()}`,
      country: 'United States',
      currency: 'USD',
      status: 'active',
      listings: 850,
      sales: 1100000,
      orders: 1200,
      avgOrderValue: 917,
      topCategories: ['Electronics', 'Fashion', 'Home'],
      shippingOptions: ['Standard', 'Express', 'Economy'],
      taxSettings: { collectTax: true, vatRegistered: false },
      restrictions: ['Tobacco', 'Alcohol', 'Weapons'],
    };
    res.json(market);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market details' });
  }
});

// 6. POST /markets/:id/activate - マーケット有効化
router.post('/markets/:id/activate', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      marketId: req.params.id,
      status: 'active',
      activatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate market' });
  }
});

// ==================== Currency Management ====================

// 7. GET /currencies/rates - 為替レート
router.get('/currencies/rates', async (req: Request, res: Response) => {
  try {
    const rates = {
      baseCurrency: 'JPY',
      lastUpdated: new Date().toISOString(),
      rates: [
        { currency: 'USD', rate: 0.0067, change: 0.12 },
        { currency: 'EUR', rate: 0.0062, change: -0.05 },
        { currency: 'GBP', rate: 0.0053, change: 0.08 },
        { currency: 'AUD', rate: 0.0102, change: 0.15 },
        { currency: 'CAD', rate: 0.0091, change: 0.03 },
        { currency: 'CNY', rate: 0.0485, change: -0.02 },
      ],
    };
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currency rates' });
  }
});

// 8. GET /currencies/conversion - 通貨換算
router.get('/currencies/conversion', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      from: z.string(),
      to: z.string(),
      amount: z.coerce.number(),
    });
    const { from, to, amount } = schema.parse(req.query);
    const rate = 0.0067; // Mock rate
    res.json({
      from,
      to,
      amount,
      convertedAmount: amount * rate,
      rate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// 9. GET /currencies/payout - ペイアウト通貨設定
router.get('/currencies/payout', async (req: Request, res: Response) => {
  try {
    const payout = {
      defaultCurrency: 'JPY',
      payoutSchedule: 'weekly',
      minimumPayout: 10000,
      accounts: [
        { currency: 'JPY', bankAccount: '****1234', primary: true },
        { currency: 'USD', bankAccount: '****5678', primary: false },
      ],
    };
    res.json(payout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payout settings' });
  }
});

// ==================== Shipping Management ====================

// 10. GET /shipping/carriers - キャリア一覧
router.get('/shipping/carriers', async (req: Request, res: Response) => {
  try {
    const carriers = [
      { id: 'fedex', name: 'FedEx International', services: ['Express', 'Priority', 'Economy'], countries: 220 },
      { id: 'dhl', name: 'DHL Express', services: ['Express', 'Worldwide'], countries: 220 },
      { id: 'ups', name: 'UPS International', services: ['Express', 'Standard', 'Economy'], countries: 200 },
      { id: 'ems', name: 'EMS', services: ['Standard'], countries: 180 },
      { id: 'usps', name: 'USPS Priority Mail International', services: ['Priority', 'First Class'], countries: 180 },
    ];
    res.json({ carriers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch carriers' });
  }
});

// 11. POST /shipping/quote - 配送見積もり
router.post('/shipping/quote', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      origin: z.string(),
      destination: z.string(),
      weight: z.number(),
      dimensions: z.object({
        length: z.number(),
        width: z.number(),
        height: z.number(),
      }),
    });
    const data = schema.parse(req.body);
    const quotes = [
      { carrier: 'FedEx', service: 'Express', price: 4500, currency: 'JPY', days: 3 },
      { carrier: 'DHL', service: 'Express', price: 4200, currency: 'JPY', days: 4 },
      { carrier: 'EMS', service: 'Standard', price: 2800, currency: 'JPY', days: 7 },
    ];
    res.json({ quotes, request: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get shipping quote' });
  }
});

// 12. GET /shipping/zones - 配送ゾーン
router.get('/shipping/zones', async (req: Request, res: Response) => {
  try {
    const zones = [
      { zone: 1, name: 'Asia', countries: ['CN', 'KR', 'TW', 'HK', 'SG'], baseRate: 1500 },
      { zone: 2, name: 'Oceania', countries: ['AU', 'NZ'], baseRate: 2500 },
      { zone: 3, name: 'North America', countries: ['US', 'CA', 'MX'], baseRate: 3500 },
      { zone: 4, name: 'Europe', countries: ['UK', 'DE', 'FR', 'IT', 'ES'], baseRate: 4000 },
      { zone: 5, name: 'Rest of World', countries: [], baseRate: 5500 },
    ];
    res.json({ zones });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping zones' });
  }
});

// ==================== Customs & Duties ====================

// 13. GET /customs/hs-codes - HSコード検索
router.get('/customs/hs-codes', async (req: Request, res: Response) => {
  try {
    const codes = [
      { code: '8471.30', description: 'Portable digital automatic data processing machines', duty: 0 },
      { code: '6109.10', description: 'T-shirts, singlets and other vests, knitted cotton', duty: 12 },
      { code: '9503.00', description: 'Toys and models', duty: 0 },
      { code: '8517.12', description: 'Smartphones', duty: 0 },
      { code: '4202.21', description: 'Handbags with outer surface of leather', duty: 8 },
    ];
    res.json({ codes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch HS codes' });
  }
});

// 14. POST /customs/duty-calculator - 関税計算
router.post('/customs/duty-calculator', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      hsCode: z.string(),
      value: z.number(),
      destination: z.string(),
      currency: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.json({
      hsCode: data.hsCode,
      productValue: data.value,
      dutyRate: 5.0,
      dutyAmount: data.value * 0.05,
      vatRate: 10.0,
      vatAmount: data.value * 0.1,
      totalTaxes: data.value * 0.15,
      destination: data.destination,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate duty' });
  }
});

// 15. GET /customs/restrictions - 輸出入制限
router.get('/customs/restrictions', async (req: Request, res: Response) => {
  try {
    const restrictions = {
      prohibited: [
        { category: 'Weapons', countries: ['all'] },
        { category: 'Narcotics', countries: ['all'] },
        { category: 'Counterfeit goods', countries: ['all'] },
      ],
      restricted: [
        { category: 'Electronics with batteries', countries: ['CN'], requirement: 'UN38.3 certification' },
        { category: 'Food products', countries: ['AU', 'NZ'], requirement: 'Import permit' },
        { category: 'Cosmetics', countries: ['EU'], requirement: 'CPNP registration' },
      ],
      byCountry: [
        { country: 'AU', items: ['Food', 'Plants', 'Animal products'], note: 'Strict biosecurity' },
        { country: 'DE', items: ['Electronics'], note: 'WEEE registration required' },
      ],
    };
    res.json(restrictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restrictions' });
  }
});

// ==================== Tax Management ====================

// 16. GET /tax/vat-rates - VAT/GST税率
router.get('/tax/vat-rates', async (req: Request, res: Response) => {
  try {
    const rates = [
      { country: 'United Kingdom', code: 'UK', standardRate: 20, reducedRate: 5, threshold: 85000 },
      { country: 'Germany', code: 'DE', standardRate: 19, reducedRate: 7, threshold: 10000 },
      { country: 'France', code: 'FR', standardRate: 20, reducedRate: 5.5, threshold: 10000 },
      { country: 'Australia', code: 'AU', standardRate: 10, reducedRate: 0, threshold: 75000 },
      { country: 'Canada', code: 'CA', standardRate: 5, reducedRate: 0, threshold: 30000 },
    ];
    res.json({ rates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch VAT rates' });
  }
});

// 17. GET /tax/registrations - 税務登録
router.get('/tax/registrations', async (req: Request, res: Response) => {
  try {
    const registrations = [
      { country: 'UK', vatNumber: 'GB123456789', status: 'active', registeredAt: '2024-01-15' },
      { country: 'DE', vatNumber: 'DE987654321', status: 'active', registeredAt: '2024-03-20' },
      { country: 'AU', vatNumber: 'AU-ABN-12345', status: 'pending', registeredAt: null },
    ];
    res.json({ registrations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tax registrations' });
  }
});

// 18. POST /tax/calculate - 税金計算
router.post('/tax/calculate', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      amount: z.number(),
      country: z.string(),
      category: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.json({
      amount: data.amount,
      country: data.country,
      taxRate: 20,
      taxAmount: data.amount * 0.2,
      totalAmount: data.amount * 1.2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// ==================== Localization ====================

// 19. GET /localization/languages - 対応言語
router.get('/localization/languages', async (req: Request, res: Response) => {
  try {
    const languages = [
      { code: 'en', name: 'English', markets: ['US', 'UK', 'AU', 'CA'], translations: 100 },
      { code: 'de', name: 'German', markets: ['DE', 'AT', 'CH'], translations: 98 },
      { code: 'fr', name: 'French', markets: ['FR', 'CA', 'BE'], translations: 95 },
      { code: 'es', name: 'Spanish', markets: ['ES', 'MX'], translations: 92 },
      { code: 'it', name: 'Italian', markets: ['IT'], translations: 88 },
      { code: 'ja', name: 'Japanese', markets: ['JP'], translations: 100 },
    ];
    res.json({ languages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// 20. POST /localization/translate - 翻訳リクエスト
router.post('/localization/translate', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      text: z.string(),
      sourceLang: z.string(),
      targetLang: z.string(),
    });
    const data = schema.parse(req.body);
    res.json({
      original: data.text,
      translated: `[Translated to ${data.targetLang}]: ${data.text}`,
      sourceLang: data.sourceLang,
      targetLang: data.targetLang,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// ==================== Reports ====================

// 21. GET /reports/international-sales - 国際売上レポート
router.get('/reports/international-sales', async (req: Request, res: Response) => {
  try {
    const report = {
      period: req.query.period || 'monthly',
      totalSales: 2850000,
      byCountry: [
        { country: 'US', sales: 1100000, orders: 1200, avgOrder: 917 },
        { country: 'UK', sales: 650000, orders: 720, avgOrder: 903 },
        { country: 'DE', sales: 550000, orders: 620, avgOrder: 887 },
        { country: 'AU', sales: 320000, orders: 380, avgOrder: 842 },
        { country: 'CA', sales: 230000, orders: 280, avgOrder: 821 },
      ],
      trends: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().slice(0, 7),
        sales: 2000000 + Math.random() * 1000000,
      })),
    };
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch international sales report' });
  }
});

// 22. GET /reports/shipping-performance - 配送パフォーマンス
router.get('/reports/shipping-performance', async (req: Request, res: Response) => {
  try {
    const report = {
      avgDeliveryTime: 8.5,
      onTimeDelivery: 94.2,
      lostPackages: 0.3,
      damagedPackages: 0.5,
      byCarrier: [
        { carrier: 'FedEx', avgTime: 5.2, onTime: 96.5, cost: 4500 },
        { carrier: 'DHL', avgTime: 6.1, onTime: 95.2, cost: 4200 },
        { carrier: 'EMS', avgTime: 12.3, onTime: 88.5, cost: 2800 },
      ],
      byDestination: [
        { region: 'North America', avgTime: 5.5, onTime: 95.8 },
        { region: 'Europe', avgTime: 7.2, onTime: 93.5 },
        { region: 'Asia Pacific', avgTime: 4.8, onTime: 96.2 },
      ],
    };
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping performance report' });
  }
});

// ==================== Settings ====================

// 23. GET /settings/general - 一般設定
router.get('/settings/general', async (req: Request, res: Response) => {
  try {
    const settings = {
      defaultCurrency: 'JPY',
      defaultLanguage: 'ja',
      autoTranslate: true,
      calculateDuties: true,
      showLocalPrices: true,
      internationalReturns: true,
      returnPeriod: 30,
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch general settings' });
  }
});

// 24. PUT /settings/general - 一般設定更新
router.put('/settings/general', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      defaultCurrency: z.string().optional(),
      defaultLanguage: z.string().optional(),
      autoTranslate: z.boolean().optional(),
      calculateDuties: z.boolean().optional(),
      showLocalPrices: z.boolean().optional(),
      internationalReturns: z.boolean().optional(),
      returnPeriod: z.number().optional(),
    });
    const data = schema.parse(req.body);
    res.json({ success: true, settings: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update general settings' });
  }
});

// 25. GET /settings/shipping - 配送設定
router.get('/settings/shipping', async (req: Request, res: Response) => {
  try {
    const settings = {
      preferredCarriers: ['FedEx', 'DHL'],
      handlingTime: 2,
      freeShippingThreshold: 10000,
      insuranceRequired: true,
      signatureRequired: false,
      customsDeclaration: 'gift',
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping settings' });
  }
});

// 26. PUT /settings/shipping - 配送設定更新
router.put('/settings/shipping', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      preferredCarriers: z.array(z.string()).optional(),
      handlingTime: z.number().optional(),
      freeShippingThreshold: z.number().optional(),
      insuranceRequired: z.boolean().optional(),
      signatureRequired: z.boolean().optional(),
      customsDeclaration: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.json({ success: true, settings: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shipping settings' });
  }
});

// 27. GET /settings/excluded-countries - 除外国
router.get('/settings/excluded-countries', async (req: Request, res: Response) => {
  try {
    const excluded = [
      { code: 'RU', name: 'Russia', reason: 'Sanctions' },
      { code: 'BY', name: 'Belarus', reason: 'Sanctions' },
      { code: 'IR', name: 'Iran', reason: 'Sanctions' },
      { code: 'KP', name: 'North Korea', reason: 'Sanctions' },
    ];
    res.json({ excluded });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch excluded countries' });
  }
});

// 28. POST /settings/excluded-countries - 除外国追加
router.post('/settings/excluded-countries', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      code: z.string(),
      reason: z.string(),
    });
    const data = schema.parse(req.body);
    res.json({
      success: true,
      country: {
        ...data,
        addedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add excluded country' });
  }
});

export default router;

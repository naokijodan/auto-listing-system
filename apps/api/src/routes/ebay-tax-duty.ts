import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

type TaxType = 'sales_tax' | 'vat' | 'gst' | 'customs_duty' | 'import_tax' | 'excise';
type TaxStatus = 'active' | 'pending' | 'exempt' | 'not_applicable';
type DutyCategory = 'electronics' | 'clothing' | 'jewelry' | 'collectibles' | 'art' | 'machinery' | 'other';
type ComplianceStatus = 'compliant' | 'pending_review' | 'action_required' | 'non_compliant';

interface TaxRate {
  id: string;
  country: string;
  countryCode: string;
  region?: string;
  taxType: TaxType;
  rate: number;
  minThreshold?: number;
  maxThreshold?: number;
  effectiveDate: string;
  expirationDate?: string;
  status: TaxStatus;
  notes?: string;
}

interface DutyRate {
  id: string;
  originCountry: string;
  destinationCountry: string;
  hsCode: string;
  category: DutyCategory;
  dutyRate: number;
  additionalFees: {
    name: string;
    rate: number;
    type: 'percentage' | 'fixed';
  }[];
  exemptions?: string[];
  effectiveDate: string;
}

interface TaxCalculation {
  id: string;
  orderId: string;
  orderValue: number;
  currency: string;
  originCountry: string;
  destinationCountry: string;
  taxes: {
    type: TaxType;
    name: string;
    rate: number;
    amount: number;
  }[];
  duties: {
    hsCode: string;
    description: string;
    rate: number;
    amount: number;
  }[];
  totalTax: number;
  totalDuty: number;
  grandTotal: number;
  calculatedAt: string;
}

interface TaxExemption {
  id: string;
  name: string;
  type: 'product' | 'buyer' | 'region' | 'threshold';
  conditions: {
    field: string;
    operator: string;
    value: string | number;
  }[];
  exemptTaxTypes: TaxType[];
  validFrom: string;
  validTo?: string;
  enabled: boolean;
}

interface HSCodeMapping {
  id: string;
  productCategory: string;
  keywords: string[];
  hsCode: string;
  description: string;
  dutyCategory: DutyCategory;
  avgDutyRate: number;
}

interface ComplianceReport {
  id: string;
  period: string;
  country: string;
  status: ComplianceStatus;
  totalSales: number;
  totalTaxCollected: number;
  totalTaxRemitted: number;
  filingDeadline: string;
  filedDate?: string;
  issues: {
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }[];
}

// ============================================
// モックデータ
// ============================================

const mockTaxRates: TaxRate[] = [
  {
    id: 'tax-1',
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    taxType: 'sales_tax',
    rate: 7.25,
    effectiveDate: '2024-01-01',
    status: 'active'
  },
  {
    id: 'tax-2',
    country: 'United Kingdom',
    countryCode: 'GB',
    taxType: 'vat',
    rate: 20,
    minThreshold: 135,
    effectiveDate: '2024-01-01',
    status: 'active',
    notes: 'VAT applies to orders over £135'
  },
  {
    id: 'tax-3',
    country: 'Germany',
    countryCode: 'DE',
    taxType: 'vat',
    rate: 19,
    effectiveDate: '2024-01-01',
    status: 'active'
  },
  {
    id: 'tax-4',
    country: 'Australia',
    countryCode: 'AU',
    taxType: 'gst',
    rate: 10,
    minThreshold: 1000,
    effectiveDate: '2024-01-01',
    status: 'active'
  },
  {
    id: 'tax-5',
    country: 'Japan',
    countryCode: 'JP',
    taxType: 'customs_duty',
    rate: 0,
    effectiveDate: '2024-01-01',
    status: 'exempt',
    notes: 'Origin country - no import duties'
  }
];

const mockDutyRates: DutyRate[] = [
  {
    id: 'duty-1',
    originCountry: 'JP',
    destinationCountry: 'US',
    hsCode: '9102.11',
    category: 'jewelry',
    dutyRate: 6.4,
    additionalFees: [
      { name: 'Merchandise Processing Fee', rate: 0.3464, type: 'percentage' }
    ],
    effectiveDate: '2024-01-01'
  },
  {
    id: 'duty-2',
    originCountry: 'JP',
    destinationCountry: 'GB',
    hsCode: '9102.11',
    category: 'jewelry',
    dutyRate: 4.5,
    additionalFees: [],
    effectiveDate: '2024-01-01'
  },
  {
    id: 'duty-3',
    originCountry: 'JP',
    destinationCountry: 'DE',
    hsCode: '9102.11',
    category: 'jewelry',
    dutyRate: 4.5,
    additionalFees: [],
    effectiveDate: '2024-01-01'
  }
];

const mockHSCodes: HSCodeMapping[] = [
  {
    id: 'hs-1',
    productCategory: 'Wristwatches',
    keywords: ['watch', 'wristwatch', 'timepiece', 'seiko', 'citizen', 'casio'],
    hsCode: '9102.11',
    description: 'Wrist-watches, electrically operated, with mechanical display only',
    dutyCategory: 'jewelry',
    avgDutyRate: 5.2
  },
  {
    id: 'hs-2',
    productCategory: 'Camera Lenses',
    keywords: ['lens', 'camera lens', 'optical', 'canon', 'nikon', 'sony'],
    hsCode: '9002.11',
    description: 'Objective lenses for cameras, projectors or photographic enlargers',
    dutyCategory: 'electronics',
    avgDutyRate: 2.8
  },
  {
    id: 'hs-3',
    productCategory: 'Vintage Collectibles',
    keywords: ['vintage', 'antique', 'collectible', 'rare'],
    hsCode: '9706.00',
    description: 'Antiques of an age exceeding 100 years',
    dutyCategory: 'collectibles',
    avgDutyRate: 0
  }
];

const mockExemptions: TaxExemption[] = [
  {
    id: 'exempt-1',
    name: '低額免税',
    type: 'threshold',
    conditions: [
      { field: 'orderValue', operator: 'less_than', value: 800 }
    ],
    exemptTaxTypes: ['customs_duty'],
    validFrom: '2024-01-01',
    enabled: true
  },
  {
    id: 'exempt-2',
    name: 'アンティーク免税',
    type: 'product',
    conditions: [
      { field: 'age', operator: 'greater_than', value: 100 }
    ],
    exemptTaxTypes: ['customs_duty', 'import_tax'],
    validFrom: '2024-01-01',
    enabled: true
  }
];

const mockCalculations: TaxCalculation[] = [
  {
    id: 'calc-1',
    orderId: 'order-12345',
    orderValue: 250,
    currency: 'USD',
    originCountry: 'JP',
    destinationCountry: 'US',
    taxes: [
      { type: 'sales_tax', name: 'California Sales Tax', rate: 7.25, amount: 18.13 }
    ],
    duties: [
      { hsCode: '9102.11', description: 'Wristwatch', rate: 6.4, amount: 16.00 }
    ],
    totalTax: 18.13,
    totalDuty: 16.00,
    grandTotal: 284.13,
    calculatedAt: '2026-02-15T10:00:00Z'
  }
];

const mockComplianceReports: ComplianceReport[] = [
  {
    id: 'comp-1',
    period: '2026-Q1',
    country: 'United States',
    status: 'compliant',
    totalSales: 125000,
    totalTaxCollected: 9062.50,
    totalTaxRemitted: 9062.50,
    filingDeadline: '2026-04-20',
    filedDate: '2026-04-15',
    issues: []
  },
  {
    id: 'comp-2',
    period: '2026-Q1',
    country: 'United Kingdom',
    status: 'pending_review',
    totalSales: 45000,
    totalTaxCollected: 9000,
    totalTaxRemitted: 8500,
    filingDeadline: '2026-04-07',
    issues: [
      { type: 'underpayment', description: '£500の未払いVATがあります', severity: 'medium' }
    ]
  }
];

// ============================================
// スキーマ
// ============================================

const taxRateSchema = z.object({
  country: z.string(),
  countryCode: z.string().length(2),
  region: z.string().optional(),
  taxType: z.enum(['sales_tax', 'vat', 'gst', 'customs_duty', 'import_tax', 'excise']),
  rate: z.number().min(0).max(100),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  notes: z.string().optional()
});

const dutyRateSchema = z.object({
  originCountry: z.string().length(2),
  destinationCountry: z.string().length(2),
  hsCode: z.string(),
  category: z.enum(['electronics', 'clothing', 'jewelry', 'collectibles', 'art', 'machinery', 'other']),
  dutyRate: z.number().min(0).max(100),
  additionalFees: z.array(z.object({
    name: z.string(),
    rate: z.number(),
    type: z.enum(['percentage', 'fixed'])
  })).optional(),
  exemptions: z.array(z.string()).optional()
});

const calculateTaxSchema = z.object({
  orderValue: z.number().positive(),
  currency: z.string().length(3),
  originCountry: z.string().length(2),
  destinationCountry: z.string().length(2),
  destinationRegion: z.string().optional(),
  hsCode: z.string().optional(),
  productCategory: z.string().optional()
});

const hsCodeMappingSchema = z.object({
  productCategory: z.string(),
  keywords: z.array(z.string()),
  hsCode: z.string(),
  description: z.string(),
  dutyCategory: z.enum(['electronics', 'clothing', 'jewelry', 'collectibles', 'art', 'machinery', 'other'])
});

const exemptionSchema = z.object({
  name: z.string(),
  type: z.enum(['product', 'buyer', 'region', 'threshold']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number()])
  })),
  exemptTaxTypes: z.array(z.enum(['sales_tax', 'vat', 'gst', 'customs_duty', 'import_tax', 'excise'])),
  validFrom: z.string(),
  validTo: z.string().optional(),
  enabled: z.boolean().optional().default(true)
});

// ============================================
// エンドポイント
// ============================================

// 税金・関税統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  const stats = {
    totalTaxCollected: 156780.50,
    totalDutyPaid: 42350.00,
    avgTaxRate: 8.5,
    avgDutyRate: 4.2,
    countriesWithTax: 45,
    activeExemptions: 12,
    pendingFilings: 3,
    complianceRate: 98.5,
    byCountry: [
      { country: 'United States', taxCollected: 85420, dutyPaid: 18500 },
      { country: 'United Kingdom', taxCollected: 32150, dutyPaid: 12400 },
      { country: 'Germany', taxCollected: 24680, dutyPaid: 8200 },
      { country: 'Australia', taxCollected: 14530, dutyPaid: 3250 }
    ],
    upcomingDeadlines: [
      { country: 'UK', deadline: '2026-04-07', type: 'VAT Filing' },
      { country: 'DE', deadline: '2026-04-10', type: 'VAT Filing' },
      { country: 'US', deadline: '2026-04-20', type: 'Sales Tax Filing' }
    ]
  };

  res.json(stats);
});

// 税率一覧取得
router.get('/tax-rates', async (req: Request, res: Response) => {
  const { country, taxType, status, limit, offset } = req.query;

  let filtered = [...mockTaxRates];

  if (country) {
    filtered = filtered.filter(t => t.countryCode === String(country));
  }
  if (taxType) {
    filtered = filtered.filter(t => t.taxType === String(taxType));
  }
  if (status) {
    filtered = filtered.filter(t => t.status === String(status));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 50);

  res.json({
    taxRates: filtered.slice(start, end),
    total: filtered.length
  });
});

// 税率詳細取得
router.get('/tax-rates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const taxRate = mockTaxRates.find(t => t.id === id);
  if (!taxRate) {
    return res.status(404).json({ error: 'Tax rate not found' });
  }

  res.json(taxRate);
});

// 税率作成
router.post('/tax-rates', async (req: Request, res: Response) => {
  const validation = taxRateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newTaxRate: TaxRate = {
    id: `tax-${Date.now()}`,
    ...validation.data,
    status: 'active'
  };

  res.status(201).json(newTaxRate);
});

// 税率更新
router.put('/tax-rates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = taxRateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const taxRate = mockTaxRates.find(t => t.id === id);
  if (!taxRate) {
    return res.status(404).json({ error: 'Tax rate not found' });
  }

  const updated = { ...taxRate, ...validation.data };
  res.json(updated);
});

// 税率削除
router.delete('/tax-rates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const taxRate = mockTaxRates.find(t => t.id === id);
  if (!taxRate) {
    return res.status(404).json({ error: 'Tax rate not found' });
  }

  res.json({ success: true, deletedId: id });
});

// 関税率一覧取得
router.get('/duty-rates', async (req: Request, res: Response) => {
  const { origin, destination, category, limit, offset } = req.query;

  let filtered = [...mockDutyRates];

  if (origin) {
    filtered = filtered.filter(d => d.originCountry === String(origin));
  }
  if (destination) {
    filtered = filtered.filter(d => d.destinationCountry === String(destination));
  }
  if (category) {
    filtered = filtered.filter(d => d.category === String(category));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 50);

  res.json({
    dutyRates: filtered.slice(start, end),
    total: filtered.length
  });
});

// 関税率作成
router.post('/duty-rates', async (req: Request, res: Response) => {
  const validation = dutyRateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newDutyRate: DutyRate = {
    id: `duty-${Date.now()}`,
    ...validation.data,
    additionalFees: validation.data.additionalFees || [],
    effectiveDate: new Date().toISOString().split('T')[0]
  };

  res.status(201).json(newDutyRate);
});

// 関税率更新
router.put('/duty-rates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = dutyRateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const dutyRate = mockDutyRates.find(d => d.id === id);
  if (!dutyRate) {
    return res.status(404).json({ error: 'Duty rate not found' });
  }

  const updated = { ...dutyRate, ...validation.data };
  res.json(updated);
});

// 関税率削除
router.delete('/duty-rates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const dutyRate = mockDutyRates.find(d => d.id === id);
  if (!dutyRate) {
    return res.status(404).json({ error: 'Duty rate not found' });
  }

  res.json({ success: true, deletedId: id });
});

// 税金・関税計算
router.post('/calculate', async (req: Request, res: Response) => {
  const validation = calculateTaxSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { orderValue, currency, originCountry, destinationCountry, destinationRegion, hsCode } = validation.data;

  // 税金を検索
  const applicableTaxes = mockTaxRates.filter(t =>
    t.countryCode === destinationCountry &&
    t.status === 'active' &&
    (!t.minThreshold || orderValue >= t.minThreshold)
  );

  // 関税を検索
  const applicableDuties = mockDutyRates.filter(d =>
    d.originCountry === originCountry &&
    d.destinationCountry === destinationCountry &&
    (!hsCode || d.hsCode === hsCode)
  );

  const taxes = applicableTaxes.map(t => ({
    type: t.taxType,
    name: `${t.country}${t.region ? ` - ${t.region}` : ''} ${t.taxType.toUpperCase()}`,
    rate: t.rate,
    amount: Math.round(orderValue * t.rate) / 100
  }));

  const duties = applicableDuties.map(d => ({
    hsCode: d.hsCode,
    description: d.category,
    rate: d.dutyRate,
    amount: Math.round(orderValue * d.dutyRate) / 100
  }));

  const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0);
  const totalDuty = duties.reduce((sum, d) => sum + d.amount, 0);

  const calculation: TaxCalculation = {
    id: `calc-${Date.now()}`,
    orderId: 'estimate',
    orderValue,
    currency,
    originCountry,
    destinationCountry,
    taxes,
    duties,
    totalTax,
    totalDuty,
    grandTotal: orderValue + totalTax + totalDuty,
    calculatedAt: new Date().toISOString()
  };

  res.json(calculation);
});

// 計算履歴取得
router.get('/calculations', async (req: Request, res: Response) => {
  const { orderId, limit, offset } = req.query;

  let filtered = [...mockCalculations];

  if (orderId) {
    filtered = filtered.filter(c => c.orderId === String(orderId));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 50);

  res.json({
    calculations: filtered.slice(start, end),
    total: filtered.length
  });
});

// HSコードマッピング一覧
router.get('/hs-codes', async (req: Request, res: Response) => {
  const { category, keyword, limit, offset } = req.query;

  let filtered = [...mockHSCodes];

  if (category) {
    filtered = filtered.filter(h => h.productCategory.toLowerCase().includes(String(category).toLowerCase()));
  }
  if (keyword) {
    filtered = filtered.filter(h =>
      h.keywords.some(k => k.toLowerCase().includes(String(keyword).toLowerCase()))
    );
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 50);

  res.json({
    hsCodes: filtered.slice(start, end),
    total: filtered.length
  });
});

// HSコードマッピング作成
router.post('/hs-codes', async (req: Request, res: Response) => {
  const validation = hsCodeMappingSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newMapping: HSCodeMapping = {
    id: `hs-${Date.now()}`,
    ...validation.data,
    avgDutyRate: 0
  };

  res.status(201).json(newMapping);
});

// HSコード自動検出
router.post('/hs-codes/detect', async (req: Request, res: Response) => {
  const { title, description, category } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  // キーワードマッチング（モック）
  const detectedCodes = mockHSCodes.filter(h =>
    h.keywords.some(k => title.toLowerCase().includes(k.toLowerCase()))
  );

  res.json({
    detected: detectedCodes.length > 0,
    suggestions: detectedCodes.map(h => ({
      hsCode: h.hsCode,
      description: h.description,
      confidence: 0.85,
      avgDutyRate: h.avgDutyRate
    })),
    input: { title, description, category }
  });
});

// 免税ルール一覧
router.get('/exemptions', async (_req: Request, res: Response) => {
  res.json({
    exemptions: mockExemptions,
    total: mockExemptions.length
  });
});

// 免税ルール作成
router.post('/exemptions', async (req: Request, res: Response) => {
  const validation = exemptionSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newExemption: TaxExemption = {
    id: `exempt-${Date.now()}`,
    ...validation.data
  };

  res.status(201).json(newExemption);
});

// 免税ルール更新
router.put('/exemptions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = exemptionSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const exemption = mockExemptions.find(e => e.id === id);
  if (!exemption) {
    return res.status(404).json({ error: 'Exemption not found' });
  }

  const updated = { ...exemption, ...validation.data };
  res.json(updated);
});

// 免税ルール削除
router.delete('/exemptions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const exemption = mockExemptions.find(e => e.id === id);
  if (!exemption) {
    return res.status(404).json({ error: 'Exemption not found' });
  }

  res.json({ success: true, deletedId: id });
});

// コンプライアンスレポート一覧
router.get('/compliance', async (req: Request, res: Response) => {
  const { country, period, status, limit, offset } = req.query;

  let filtered = [...mockComplianceReports];

  if (country) {
    filtered = filtered.filter(c => c.country === String(country));
  }
  if (period) {
    filtered = filtered.filter(c => c.period === String(period));
  }
  if (status) {
    filtered = filtered.filter(c => c.status === String(status));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 20);

  res.json({
    reports: filtered.slice(start, end),
    total: filtered.length
  });
});

// コンプライアンスサマリー
router.get('/compliance/summary', async (_req: Request, res: Response) => {
  res.json({
    overallStatus: 'compliant',
    countriesCompliant: 8,
    countriesPending: 2,
    countriesActionRequired: 1,
    upcomingDeadlines: [
      { country: 'UK', deadline: '2026-04-07', daysRemaining: 51 },
      { country: 'DE', deadline: '2026-04-10', daysRemaining: 54 }
    ],
    totalLiability: 42580.00,
    lastUpdated: new Date().toISOString()
  });
});

// 国別税率サマリー
router.get('/countries/:countryCode', async (req: Request, res: Response) => {
  const { countryCode } = req.params;

  const taxRates = mockTaxRates.filter(t => t.countryCode === countryCode);
  const dutyRates = mockDutyRates.filter(d => d.destinationCountry === countryCode);

  if (taxRates.length === 0 && dutyRates.length === 0) {
    return res.status(404).json({ error: 'Country not found' });
  }

  res.json({
    countryCode,
    country: taxRates[0]?.country || 'Unknown',
    taxRates,
    dutyRates,
    exemptions: mockExemptions.filter(e =>
      e.conditions.some(c => c.field === 'country' && c.value === countryCode)
    ),
    compliance: mockComplianceReports.filter(c =>
      c.country.toLowerCase().includes(countryCode.toLowerCase())
    )
  });
});

// レポート生成
router.post('/reports/generate', async (req: Request, res: Response) => {
  const { type, period, countries, format } = req.body;

  res.json({
    reportId: `report-${Date.now()}`,
    type: type || 'comprehensive',
    period: period || 'Q1-2026',
    countries: countries || ['all'],
    format: format || 'pdf',
    status: 'generating',
    estimatedCompletion: new Date(Date.now() + 60000).toISOString()
  });
});

export const ebayTaxDutyRouter = router;

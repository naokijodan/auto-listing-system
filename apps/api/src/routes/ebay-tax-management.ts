import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// Phase 188: Tax Management（税金管理）
// ========================================

// ----------------------------------------
// ダッシュボード
// ----------------------------------------

// 税金ダッシュボード取得
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalTaxCollected: 45680,
      pendingRemittance: 12450,
      jurisdictionsActive: 52,
      exemptionsActive: 35,
      lastUpdated: new Date().toISOString(),
    },
    collectionSummary: {
      thisMonth: { collected: 15230, orders: 1250 },
      lastMonth: { collected: 14890, orders: 1180 },
      thisYear: { collected: 125680, orders: 10450 },
    },
    byJurisdiction: [
      { name: 'California', code: 'CA', rate: 7.25, collected: 8520, orders: 450 },
      { name: 'New York', code: 'NY', rate: 8.0, collected: 6230, orders: 320 },
      { name: 'Texas', code: 'TX', rate: 6.25, collected: 4850, orders: 380 },
      { name: 'Florida', code: 'FL', rate: 6.0, collected: 3980, orders: 290 },
      { name: 'Washington', code: 'WA', rate: 6.5, collected: 3450, orders: 245 },
    ],
    upcomingRemittances: [
      { jurisdiction: 'CA', amount: 8520, dueDate: '2026-02-28', status: 'pending' },
      { jurisdiction: 'NY', amount: 6230, dueDate: '2026-03-05', status: 'pending' },
      { jurisdiction: 'TX', amount: 4850, dueDate: '2026-03-10', status: 'scheduled' },
    ],
    alerts: [
      { type: 'warning', message: 'CA州の納付期限が2週間後です' },
      { type: 'info', message: 'WA州の税率が4月に改定されます' },
    ],
    trends: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2026, i, 1).toISOString().slice(0, 7),
      collected: 10000 + Math.floor(Math.random() * 5000),
      orders: 800 + Math.floor(Math.random() * 400),
    })),
  };
  res.json(dashboard);
});

// ----------------------------------------
// 税率管理
// ----------------------------------------

// 税率一覧
router.get('/rates', async (req, res) => {
  const { country, state, type } = req.query;
  const rates = Array.from({ length: 52 }, (_, i) => ({
    id: `RATE-${1000 + i}`,
    country: 'US',
    state: ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'PA', 'OH', 'GA', 'NC'][i % 10],
    county: i % 3 === 0 ? `County ${i}` : null,
    city: i % 5 === 0 ? `City ${i}` : null,
    postalCode: i % 7 === 0 ? `${90000 + i * 100}` : null,
    rate: 5.0 + (i % 10) * 0.5,
    type: ['sales', 'use', 'vat'][i % 3],
    effectiveDate: '2026-01-01',
    expirationDate: null,
    enabled: true,
    autoCollect: true,
    lastUpdated: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  res.json({
    rates,
    total: 52,
    filters: { country, state, type },
  });
});

// 税率詳細
router.get('/rates/:rateId', async (req, res) => {
  const { rateId } = req.params;
  const rate = {
    id: rateId,
    country: 'US',
    state: 'CA',
    stateName: 'California',
    county: 'Los Angeles',
    city: 'Los Angeles',
    postalCodes: ['90001', '90002', '90003', '90004', '90005'],
    components: [
      { name: 'State Tax', rate: 6.0, type: 'state' },
      { name: 'County Tax', rate: 0.25, type: 'county' },
      { name: 'City Tax', rate: 1.0, type: 'city' },
    ],
    totalRate: 7.25,
    type: 'sales',
    taxableItems: ['physical_goods', 'digital_goods'],
    exemptItems: ['food', 'medicine'],
    effectiveDate: '2026-01-01',
    expirationDate: null,
    enabled: true,
    autoCollect: true,
    nexusRequired: true,
    minimumNexus: {
      salesAmount: 500000,
      transactionCount: 200,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z',
  };
  res.json(rate);
});

// 税率作成
const rateSchema = z.object({
  country: z.string(),
  state: z.string(),
  county: z.string().optional(),
  city: z.string().optional(),
  rate: z.number(),
  type: z.enum(['sales', 'use', 'vat']),
  effectiveDate: z.string(),
  enabled: z.boolean().default(true),
});

router.post('/rates', async (req, res) => {
  const body = rateSchema.parse(req.body);
  res.status(201).json({
    id: `RATE-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  });
});

// 税率更新
router.put('/rates/:rateId', async (req, res) => {
  const { rateId } = req.params;
  const body = req.body;
  res.json({
    id: rateId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// 税率削除
router.delete('/rates/:rateId', async (req, res) => {
  const { rateId } = req.params;
  res.json({ success: true, deletedId: rateId });
});

// 税率一括インポート
router.post('/rates/import', async (req, res) => {
  const { source, format } = req.body;
  res.json({
    importId: `IMP-${Date.now()}`,
    source,
    format,
    status: 'processing',
    estimatedTime: '5 minutes',
    createdAt: new Date().toISOString(),
  });
});

// 税率同期（外部サービス）
router.post('/rates/sync', async (req, res) => {
  const { provider } = req.body;
  res.json({
    syncId: `SYNC-${Date.now()}`,
    provider: provider || 'avalara',
    status: 'syncing',
    startedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 免税管理
// ----------------------------------------

// 免税一覧
router.get('/exemptions', async (req, res) => {
  const { type, status } = req.query;
  const exemptions = Array.from({ length: 15 }, (_, i) => ({
    id: `EXP-${1000 + i}`,
    customerId: `CUST-${2000 + i}`,
    customerName: `Customer ${i + 1}`,
    type: ['resale', 'nonprofit', 'government', 'manufacturer'][i % 4],
    jurisdictions: ['CA', 'NY', 'TX'].slice(0, 1 + (i % 3)),
    certificateNumber: `CERT-${3000 + i}`,
    certificateFile: `/certificates/cert-${i + 1}.pdf`,
    startDate: '2026-01-01',
    expirationDate: i % 3 === 0 ? '2027-12-31' : null,
    status: ['active', 'pending', 'expired'][i % 10 < 8 ? 0 : i % 10 < 9 ? 1 : 2],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  res.json({
    exemptions,
    total: 35,
    filters: { type, status },
  });
});

// 免税詳細
router.get('/exemptions/:exemptionId', async (req, res) => {
  const { exemptionId } = req.params;
  const exemption = {
    id: exemptionId,
    customerId: 'CUST-2001',
    customerName: 'ABC Wholesale Inc.',
    customerEmail: 'tax@abcwholesale.com',
    type: 'resale',
    typeName: 'Resale Certificate',
    jurisdictions: [
      { state: 'CA', stateName: 'California', status: 'active' },
      { state: 'NY', stateName: 'New York', status: 'active' },
      { state: 'TX', stateName: 'Texas', status: 'pending' },
    ],
    certificateNumber: 'CERT-3001',
    certificateFile: '/certificates/cert-abc.pdf',
    businessType: 'Wholesale',
    startDate: '2026-01-01',
    expirationDate: '2027-12-31',
    status: 'active',
    notes: '年次更新が必要',
    orderHistory: {
      totalOrders: 45,
      totalExemptAmount: 125000,
    },
    verificationStatus: 'verified',
    verifiedAt: '2026-01-05T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-15T14:00:00Z',
  };
  res.json(exemption);
});

// 免税作成
const exemptionSchema = z.object({
  customerId: z.string(),
  type: z.enum(['resale', 'nonprofit', 'government', 'manufacturer', 'other']),
  jurisdictions: z.array(z.string()),
  certificateNumber: z.string(),
  startDate: z.string(),
  expirationDate: z.string().optional(),
});

router.post('/exemptions', async (req, res) => {
  const body = exemptionSchema.parse(req.body);
  res.status(201).json({
    id: `EXP-${Date.now()}`,
    ...body,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
});

// 免税更新
router.put('/exemptions/:exemptionId', async (req, res) => {
  const { exemptionId } = req.params;
  const body = req.body;
  res.json({
    id: exemptionId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// 免税削除
router.delete('/exemptions/:exemptionId', async (req, res) => {
  const { exemptionId } = req.params;
  res.json({ success: true, deletedId: exemptionId });
});

// 免税証明書アップロード
router.post('/exemptions/:exemptionId/certificate', async (req, res) => {
  const { exemptionId } = req.params;
  res.json({
    exemptionId,
    certificateFile: `/certificates/cert-${Date.now()}.pdf`,
    uploadedAt: new Date().toISOString(),
  });
});

// 免税検証
router.post('/exemptions/:exemptionId/verify', async (req, res) => {
  const { exemptionId } = req.params;
  res.json({
    exemptionId,
    verificationStatus: 'verified',
    verifiedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 税金計算
// ----------------------------------------

// 税金計算
const calculateTaxSchema = z.object({
  lineItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    price: z.number(),
    taxCode: z.string().optional(),
  })),
  shipping: z.object({
    fromAddress: z.object({
      postalCode: z.string(),
      state: z.string(),
      country: z.string(),
    }),
    toAddress: z.object({
      postalCode: z.string(),
      state: z.string(),
      country: z.string(),
    }),
    amount: z.number().optional(),
  }),
  customerId: z.string().optional(),
});

router.post('/calculate', async (req, res) => {
  const body = calculateTaxSchema.parse(req.body);
  const subtotal = body.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.0725;
  const tax = subtotal * taxRate;
  res.json({
    subtotal,
    taxableAmount: subtotal,
    taxRate,
    taxAmount: tax,
    total: subtotal + tax + (body.shipping.amount || 0),
    breakdown: [
      { jurisdiction: 'CA', type: 'State', rate: 0.06, amount: subtotal * 0.06 },
      { jurisdiction: 'CA', type: 'County', rate: 0.0025, amount: subtotal * 0.0025 },
      { jurisdiction: 'CA', type: 'City', rate: 0.01, amount: subtotal * 0.01 },
    ],
    exemptAmount: 0,
    calculatedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// ネクサス管理
// ----------------------------------------

// ネクサス一覧
router.get('/nexus', async (req, res) => {
  const nexus = [
    { state: 'CA', stateName: 'California', hasPhysicalPresence: true, hasSalesNexus: true, salesAmount: 1250000, transactionCount: 850 },
    { state: 'NY', stateName: 'New York', hasPhysicalPresence: false, hasSalesNexus: true, salesAmount: 680000, transactionCount: 420 },
    { state: 'TX', stateName: 'Texas', hasPhysicalPresence: false, hasSalesNexus: true, salesAmount: 520000, transactionCount: 380 },
    { state: 'FL', stateName: 'Florida', hasPhysicalPresence: false, hasSalesNexus: false, salesAmount: 380000, transactionCount: 180 },
    { state: 'WA', stateName: 'Washington', hasPhysicalPresence: false, hasSalesNexus: true, salesAmount: 450000, transactionCount: 220 },
  ];
  res.json({ nexus });
});

// ネクサス詳細
router.get('/nexus/:state', async (req, res) => {
  const { state } = req.params;
  const nexusDetail = {
    state,
    stateName: 'California',
    hasPhysicalPresence: true,
    hasSalesNexus: true,
    nexusType: 'physical_and_economic',
    thresholds: {
      salesAmount: 500000,
      transactionCount: 200,
      effectiveDate: '2019-04-01',
    },
    currentStatus: {
      salesAmount: 1250000,
      transactionCount: 850,
      meetsThreshold: true,
    },
    registrationStatus: 'registered',
    registrationDate: '2019-04-15',
    filingFrequency: 'quarterly',
    nextFilingDate: '2026-03-31',
    physicalLocations: [
      { type: 'warehouse', address: '123 Main St, Los Angeles, CA 90001' },
    ],
    history: [
      { date: '2026-02-01', salesAmount: 125000, transactionCount: 85 },
      { date: '2026-01-01', salesAmount: 118000, transactionCount: 78 },
      { date: '2025-12-01', salesAmount: 132000, transactionCount: 92 },
    ],
  };
  res.json(nexusDetail);
});

// ネクサス更新
router.put('/nexus/:state', async (req, res) => {
  const { state } = req.params;
  const body = req.body;
  res.json({
    state,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 納税管理
// ----------------------------------------

// 納税スケジュール一覧
router.get('/remittances', async (req, res) => {
  const { status, state } = req.query;
  const remittances = Array.from({ length: 20 }, (_, i) => ({
    id: `REM-${1000 + i}`,
    jurisdiction: ['CA', 'NY', 'TX', 'FL', 'WA'][i % 5],
    period: `2026-${String(1 + (i % 3)).padStart(2, '0')}`,
    taxCollected: 5000 + i * 500,
    dueDate: `2026-0${2 + (i % 3)}-${15 + (i % 15)}`,
    status: ['pending', 'scheduled', 'paid', 'overdue'][i % 4],
    paidDate: i % 4 === 2 ? `2026-0${2 + (i % 3)}-${10 + (i % 10)}` : null,
    confirmationNumber: i % 4 === 2 ? `CONF-${5000 + i}` : null,
  }));
  res.json({
    remittances,
    total: 45,
    filters: { status, state },
  });
});

// 納税詳細
router.get('/remittances/:remittanceId', async (req, res) => {
  const { remittanceId } = req.params;
  const remittance = {
    id: remittanceId,
    jurisdiction: 'CA',
    jurisdictionName: 'California',
    period: '2026-01',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    taxCollected: 8520,
    adjustments: -120,
    netAmount: 8400,
    dueDate: '2026-02-28',
    status: 'pending',
    filingMethod: 'online',
    paymentMethod: 'ach',
    breakdown: [
      { category: 'Physical Goods', taxableAmount: 95000, taxAmount: 6887 },
      { category: 'Digital Goods', taxableAmount: 22500, taxAmount: 1633 },
    ],
    orders: {
      count: 450,
      totalSales: 117500,
    },
    notes: '',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  };
  res.json(remittance);
});

// 納税スケジュール設定
router.post('/remittances/:remittanceId/schedule', async (req, res) => {
  const { remittanceId } = req.params;
  const { paymentDate, paymentMethod } = req.body;
  res.json({
    id: remittanceId,
    status: 'scheduled',
    paymentDate,
    paymentMethod,
    scheduledAt: new Date().toISOString(),
  });
});

// 納税完了報告
router.post('/remittances/:remittanceId/mark-paid', async (req, res) => {
  const { remittanceId } = req.params;
  const { confirmationNumber } = req.body;
  res.json({
    id: remittanceId,
    status: 'paid',
    confirmationNumber,
    paidAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// レポート
// ----------------------------------------

// 税金レポート生成
router.post('/reports/generate', async (req, res) => {
  const { reportType, dateRange, jurisdictions } = req.body;
  res.json({
    reportId: `RPT-${Date.now()}`,
    type: reportType,
    status: 'generating',
    dateRange,
    jurisdictions,
    estimatedTime: '2 minutes',
    createdAt: new Date().toISOString(),
  });
});

// レポート一覧
router.get('/reports', async (req, res) => {
  const reports = [
    { id: 'RPT-3001', name: '月次税金サマリー', type: 'monthly_summary', status: 'completed', downloadUrl: '/reports/RPT-3001.pdf', createdAt: '2026-02-01' },
    { id: 'RPT-3002', name: '州別税金レポート', type: 'by_jurisdiction', status: 'completed', downloadUrl: '/reports/RPT-3002.xlsx', createdAt: '2026-02-10' },
    { id: 'RPT-3003', name: '免税取引レポート', type: 'exemptions', status: 'completed', downloadUrl: '/reports/RPT-3003.pdf', createdAt: '2026-02-15' },
  ];
  res.json({ reports });
});

// ----------------------------------------
// 設定
// ----------------------------------------

// 税金設定取得
router.get('/settings', async (_req, res) => {
  const settings = {
    general: {
      autoCollect: true,
      includeTaxInPrice: false,
      roundingRule: 'up',
      roundingPrecision: 2,
    },
    calculation: {
      defaultTaxCode: 'P0000000',
      shippingTaxable: true,
      handlingTaxable: true,
      discountTaxable: 'pre',
    },
    nexus: {
      autoDetect: true,
      threshold: {
        salesAmount: 100000,
        transactionCount: 200,
      },
    },
    remittance: {
      autoSchedule: true,
      reminderDays: 7,
      defaultPaymentMethod: 'ach',
    },
    provider: {
      name: 'avalara',
      apiKey: 'ava***',
      sandboxMode: false,
    },
  };
  res.json(settings);
});

// 税金設定更新
router.put('/settings', async (req, res) => {
  const settings = req.body;
  res.json({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayTaxManagementRouter = router;

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// Phase 187: Shipping Rate Calculator（送料計算機）
// ========================================

// ----------------------------------------
// ダッシュボード
// ----------------------------------------

// 送料計算ダッシュボード取得
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalCalculations: 15680,
      avgShippingCost: 12.45,
      carriersActive: 5,
      zonesConfigured: 8,
      lastUpdated: new Date().toISOString(),
    },
    carrierUsage: [
      { carrier: 'USPS', usage: 45, avgCost: 8.50 },
      { carrier: 'FedEx', usage: 28, avgCost: 15.20 },
      { carrier: 'UPS', usage: 20, avgCost: 14.80 },
      { carrier: 'DHL', usage: 7, avgCost: 22.50 },
    ],
    costTrends: [
      { date: '2026-02-10', avgCost: 12.20, calculations: 520 },
      { date: '2026-02-11', avgCost: 12.35, calculations: 485 },
      { date: '2026-02-12', avgCost: 12.50, calculations: 510 },
      { date: '2026-02-13', avgCost: 12.40, calculations: 495 },
      { date: '2026-02-14', avgCost: 12.55, calculations: 530 },
      { date: '2026-02-15', avgCost: 12.45, calculations: 545 },
      { date: '2026-02-16', avgCost: 12.50, calculations: 480 },
    ],
    topDestinations: [
      { country: 'US', state: 'CA', shipments: 2450, avgCost: 10.50 },
      { country: 'US', state: 'NY', shipments: 1820, avgCost: 11.20 },
      { country: 'US', state: 'TX', shipments: 1560, avgCost: 10.80 },
      { country: 'UK', state: null, shipments: 980, avgCost: 18.50 },
      { country: 'DE', state: null, shipments: 720, avgCost: 19.20 },
    ],
    alerts: [
      { type: 'info', message: 'USPS料金が3月1日に改定されます' },
      { type: 'warning', message: 'FedExサーチャージが更新されています' },
    ],
  };
  res.json(dashboard);
});

// ----------------------------------------
// 送料計算
// ----------------------------------------

// 送料計算（単一）
const calculateSchema = z.object({
  origin: z.object({
    postalCode: z.string(),
    country: z.string().default('US'),
  }),
  destination: z.object({
    postalCode: z.string(),
    country: z.string(),
    state: z.string().optional(),
  }),
  package: z.object({
    weight: z.number(),
    weightUnit: z.enum(['oz', 'lb', 'g', 'kg']).default('oz'),
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    dimensionUnit: z.enum(['in', 'cm']).default('in'),
  }),
  carriers: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
});

router.post('/calculate', async (req, res) => {
  const body = calculateSchema.parse(req.body);
  const rates = [
    {
      carrier: 'USPS',
      service: 'Priority Mail',
      rate: 8.95,
      currency: 'USD',
      estimatedDays: { min: 2, max: 3 },
      guaranteed: false,
      tracking: true,
      insurance: { included: 50, available: true },
    },
    {
      carrier: 'USPS',
      service: 'Priority Mail Express',
      rate: 26.95,
      currency: 'USD',
      estimatedDays: { min: 1, max: 2 },
      guaranteed: true,
      tracking: true,
      insurance: { included: 100, available: true },
    },
    {
      carrier: 'FedEx',
      service: 'Ground',
      rate: 12.45,
      currency: 'USD',
      estimatedDays: { min: 3, max: 5 },
      guaranteed: false,
      tracking: true,
      insurance: { included: 100, available: true },
    },
    {
      carrier: 'FedEx',
      service: '2Day',
      rate: 22.80,
      currency: 'USD',
      estimatedDays: { min: 2, max: 2 },
      guaranteed: true,
      tracking: true,
      insurance: { included: 100, available: true },
    },
    {
      carrier: 'UPS',
      service: 'Ground',
      rate: 11.95,
      currency: 'USD',
      estimatedDays: { min: 3, max: 5 },
      guaranteed: false,
      tracking: true,
      insurance: { included: 100, available: true },
    },
  ];
  res.json({
    request: body,
    rates: rates.sort((a, b) => a.rate - b.rate),
    cheapest: rates[0],
    fastest: rates.find(r => r.estimatedDays.min === 1) || rates[0],
    calculatedAt: new Date().toISOString(),
  });
});

// 送料計算（バッチ）
router.post('/calculate/batch', async (req, res) => {
  const { shipments } = req.body;
  const results = shipments.map((shipment: unknown, i: number) => ({
    index: i,
    shipment,
    rates: [
      { carrier: 'USPS', service: 'Priority Mail', rate: 8.95 + i * 0.5 },
      { carrier: 'FedEx', service: 'Ground', rate: 12.45 + i * 0.5 },
    ],
    cheapest: { carrier: 'USPS', service: 'Priority Mail', rate: 8.95 + i * 0.5 },
  }));
  res.json({
    total: shipments.length,
    results,
    summary: {
      avgCheapestRate: 10.50,
      totalCost: 52.50,
    },
    calculatedAt: new Date().toISOString(),
  });
});

// 商品送料計算
router.post('/calculate/product', async (req, res) => {
  const { productId, destination } = req.body;
  res.json({
    productId,
    destination,
    rates: [
      { carrier: 'USPS', service: 'Priority Mail', rate: 8.95, estimatedDays: '2-3' },
      { carrier: 'FedEx', service: 'Ground', rate: 12.45, estimatedDays: '3-5' },
      { carrier: 'UPS', service: 'Ground', rate: 11.95, estimatedDays: '3-5' },
    ],
    recommended: { carrier: 'USPS', service: 'Priority Mail', rate: 8.95 },
    freeShippingThreshold: 49.99,
    calculatedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// キャリア管理
// ----------------------------------------

// キャリア一覧
router.get('/carriers', async (req, res) => {
  const carriers = [
    {
      id: 'USPS',
      name: 'USPS',
      displayName: 'United States Postal Service',
      enabled: true,
      apiConnected: true,
      services: [
        { code: 'PRIORITY', name: 'Priority Mail', enabled: true },
        { code: 'EXPRESS', name: 'Priority Mail Express', enabled: true },
        { code: 'FIRST_CLASS', name: 'First Class Package', enabled: true },
        { code: 'MEDIA', name: 'Media Mail', enabled: false },
      ],
      lastSync: new Date().toISOString(),
    },
    {
      id: 'FEDEX',
      name: 'FedEx',
      displayName: 'FedEx',
      enabled: true,
      apiConnected: true,
      services: [
        { code: 'GROUND', name: 'FedEx Ground', enabled: true },
        { code: '2DAY', name: 'FedEx 2Day', enabled: true },
        { code: 'EXPRESS', name: 'FedEx Express', enabled: true },
        { code: 'OVERNIGHT', name: 'FedEx Overnight', enabled: false },
      ],
      lastSync: new Date().toISOString(),
    },
    {
      id: 'UPS',
      name: 'UPS',
      displayName: 'United Parcel Service',
      enabled: true,
      apiConnected: true,
      services: [
        { code: 'GROUND', name: 'UPS Ground', enabled: true },
        { code: '2ND_DAY', name: 'UPS 2nd Day Air', enabled: true },
        { code: 'NEXT_DAY', name: 'UPS Next Day Air', enabled: false },
      ],
      lastSync: new Date().toISOString(),
    },
    {
      id: 'DHL',
      name: 'DHL',
      displayName: 'DHL Express',
      enabled: true,
      apiConnected: true,
      services: [
        { code: 'EXPRESS', name: 'DHL Express Worldwide', enabled: true },
        { code: 'ECOMMERCE', name: 'DHL eCommerce', enabled: true },
      ],
      lastSync: new Date().toISOString(),
    },
  ];
  res.json({ carriers });
});

// キャリア詳細
router.get('/carriers/:carrierId', async (req, res) => {
  const { carrierId } = req.params;
  const carrier = {
    id: carrierId,
    name: 'USPS',
    displayName: 'United States Postal Service',
    enabled: true,
    apiConnected: true,
    credentials: {
      userId: 'user***',
      hasPassword: true,
      lastValidated: new Date().toISOString(),
    },
    services: [
      { code: 'PRIORITY', name: 'Priority Mail', enabled: true, domestic: true, international: true },
      { code: 'EXPRESS', name: 'Priority Mail Express', enabled: true, domestic: true, international: true },
      { code: 'FIRST_CLASS', name: 'First Class Package', enabled: true, domestic: true, international: false },
      { code: 'MEDIA', name: 'Media Mail', enabled: false, domestic: true, international: false },
    ],
    surcharges: [
      { name: 'Fuel Surcharge', type: 'percent', value: 5.5 },
      { name: 'Residential Delivery', type: 'fixed', value: 4.50 },
    ],
    markups: {
      enabled: true,
      type: 'percent',
      value: 10,
    },
    lastSync: new Date().toISOString(),
  };
  res.json(carrier);
});

// キャリア設定更新
router.put('/carriers/:carrierId', async (req, res) => {
  const { carrierId } = req.params;
  const body = req.body;
  res.json({
    id: carrierId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// キャリア接続テスト
router.post('/carriers/:carrierId/test', async (req, res) => {
  const { carrierId } = req.params;
  res.json({
    carrierId,
    success: true,
    message: 'API接続テスト成功',
    responseTime: 245,
    testedAt: new Date().toISOString(),
  });
});

// キャリア料金同期
router.post('/carriers/:carrierId/sync', async (req, res) => {
  const { carrierId } = req.params;
  res.json({
    carrierId,
    status: 'syncing',
    estimatedTime: '5 minutes',
    startedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// ゾーン管理
// ----------------------------------------

// ゾーン一覧
router.get('/zones', async (req, res) => {
  const zones = [
    {
      id: 'ZONE-1',
      name: 'Domestic - Zone 1',
      type: 'domestic',
      countries: ['US'],
      regions: ['CA', 'NV', 'AZ', 'OR', 'WA'],
      baseRate: 5.00,
      perLbRate: 0.50,
      handlingFee: 1.00,
    },
    {
      id: 'ZONE-2',
      name: 'Domestic - Zone 2',
      type: 'domestic',
      countries: ['US'],
      regions: ['TX', 'CO', 'NM', 'UT'],
      baseRate: 6.00,
      perLbRate: 0.60,
      handlingFee: 1.00,
    },
    {
      id: 'ZONE-3',
      name: 'Domestic - Zone 3',
      type: 'domestic',
      countries: ['US'],
      regions: ['NY', 'NJ', 'PA', 'MA'],
      baseRate: 8.00,
      perLbRate: 0.80,
      handlingFee: 1.00,
    },
    {
      id: 'ZONE-INT-1',
      name: 'International - Europe',
      type: 'international',
      countries: ['UK', 'DE', 'FR', 'IT', 'ES'],
      regions: [],
      baseRate: 15.00,
      perLbRate: 2.00,
      handlingFee: 3.00,
    },
    {
      id: 'ZONE-INT-2',
      name: 'International - Asia Pacific',
      type: 'international',
      countries: ['JP', 'AU', 'KR', 'SG'],
      regions: [],
      baseRate: 18.00,
      perLbRate: 2.50,
      handlingFee: 3.00,
    },
  ];
  res.json({ zones, total: 8 });
});

// ゾーン詳細
router.get('/zones/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  const zone = {
    id: zoneId,
    name: 'Domestic - Zone 1',
    type: 'domestic',
    countries: ['US'],
    regions: ['CA', 'NV', 'AZ', 'OR', 'WA'],
    postalCodes: ['90*', '91*', '92*', '93*', '94*', '95*'],
    pricing: {
      baseRate: 5.00,
      perLbRate: 0.50,
      perOzRate: 0.03,
      handlingFee: 1.00,
      minCharge: 3.99,
      maxCharge: 50.00,
    },
    weightTiers: [
      { minWeight: 0, maxWeight: 1, rate: 5.99 },
      { minWeight: 1, maxWeight: 5, rate: 8.99 },
      { minWeight: 5, maxWeight: 10, rate: 12.99 },
      { minWeight: 10, maxWeight: null, ratePerLb: 1.20 },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z',
  };
  res.json(zone);
});

// ゾーン作成
const zoneSchema = z.object({
  name: z.string(),
  type: z.enum(['domestic', 'international']),
  countries: z.array(z.string()),
  regions: z.array(z.string()).optional(),
  baseRate: z.number(),
  perLbRate: z.number(),
  handlingFee: z.number().default(0),
});

router.post('/zones', async (req, res) => {
  const body = zoneSchema.parse(req.body);
  res.status(201).json({
    id: `ZONE-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  });
});

// ゾーン更新
router.put('/zones/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  const body = req.body;
  res.json({
    id: zoneId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// ゾーン削除
router.delete('/zones/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  res.json({ success: true, deletedId: zoneId });
});

// ----------------------------------------
// 送料ルール
// ----------------------------------------

// ルール一覧
router.get('/rules', async (req, res) => {
  const rules = [
    {
      id: 'RULE-1',
      name: '無料送料 - $50以上',
      type: 'free_shipping',
      conditions: { minOrderValue: 50 },
      action: { type: 'free', carrier: null },
      priority: 1,
      enabled: true,
    },
    {
      id: 'RULE-2',
      name: '重量オーバー追加料金',
      type: 'surcharge',
      conditions: { minWeight: 50, weightUnit: 'lb' },
      action: { type: 'surcharge', amount: 15.00 },
      priority: 2,
      enabled: true,
    },
    {
      id: 'RULE-3',
      name: '大型商品追加料金',
      type: 'surcharge',
      conditions: { oversized: true },
      action: { type: 'surcharge', amount: 25.00 },
      priority: 3,
      enabled: true,
    },
    {
      id: 'RULE-4',
      name: 'VIP顧客割引',
      type: 'discount',
      conditions: { customerTag: 'VIP' },
      action: { type: 'discount', percent: 15 },
      priority: 4,
      enabled: true,
    },
  ];
  res.json({ rules });
});

// ルール詳細
router.get('/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  const rule = {
    id: ruleId,
    name: '無料送料 - $50以上',
    description: '注文金額が$50以上の場合、送料無料',
    type: 'free_shipping',
    conditions: {
      minOrderValue: 50,
      maxOrderValue: null,
      categories: [],
      products: [],
      customers: [],
      countries: ['US'],
    },
    action: {
      type: 'free',
      carrier: null,
      service: null,
      maxDiscount: null,
    },
    priority: 1,
    enabled: true,
    startDate: '2026-01-01',
    endDate: null,
    usageCount: 1250,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  };
  res.json(rule);
});

// ルール作成
const ruleSchema = z.object({
  name: z.string(),
  type: z.enum(['free_shipping', 'flat_rate', 'surcharge', 'discount']),
  conditions: z.record(z.unknown()),
  action: z.record(z.unknown()),
  priority: z.number().default(10),
  enabled: z.boolean().default(true),
});

router.post('/rules', async (req, res) => {
  const body = ruleSchema.parse(req.body);
  res.status(201).json({
    id: `RULE-${Date.now()}`,
    ...body,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// ルール更新
router.put('/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  const body = req.body;
  res.json({
    id: ruleId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// ルール削除
router.delete('/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  res.json({ success: true, deletedId: ruleId });
});

// ルール順序更新
router.put('/rules/reorder', async (req, res) => {
  const { order } = req.body;
  res.json({
    success: true,
    order,
    updatedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// パッケージテンプレート
// ----------------------------------------

// テンプレート一覧
router.get('/packages', async (req, res) => {
  const packages = [
    {
      id: 'PKG-1',
      name: 'Small Box',
      dimensions: { length: 8, width: 6, height: 4, unit: 'in' },
      maxWeight: { value: 5, unit: 'lb' },
      isDefault: true,
    },
    {
      id: 'PKG-2',
      name: 'Medium Box',
      dimensions: { length: 12, width: 10, height: 8, unit: 'in' },
      maxWeight: { value: 20, unit: 'lb' },
      isDefault: false,
    },
    {
      id: 'PKG-3',
      name: 'Large Box',
      dimensions: { length: 18, width: 14, height: 12, unit: 'in' },
      maxWeight: { value: 50, unit: 'lb' },
      isDefault: false,
    },
    {
      id: 'PKG-4',
      name: 'Flat Rate Envelope',
      dimensions: { length: 12.5, width: 9.5, height: 0.25, unit: 'in' },
      maxWeight: { value: 4, unit: 'lb' },
      isDefault: false,
      carrierSpecific: 'USPS',
    },
  ];
  res.json({ packages });
});

// テンプレート作成
const packageSchema = z.object({
  name: z.string(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(['in', 'cm']).default('in'),
  }),
  maxWeight: z.object({
    value: z.number(),
    unit: z.enum(['lb', 'kg']).default('lb'),
  }),
  isDefault: z.boolean().default(false),
});

router.post('/packages', async (req, res) => {
  const body = packageSchema.parse(req.body);
  res.status(201).json({
    id: `PKG-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  });
});

// テンプレート削除
router.delete('/packages/:packageId', async (req, res) => {
  const { packageId } = req.params;
  res.json({ success: true, deletedId: packageId });
});

// ----------------------------------------
// レポート
// ----------------------------------------

// 送料レポート
router.get('/reports/shipping', async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  res.json({
    period: { startDate, endDate },
    summary: {
      totalShipments: 2450,
      totalCost: 28500,
      avgCost: 11.63,
      freeShippingCount: 620,
      freeShippingValue: 7850,
    },
    byCarrier: [
      { carrier: 'USPS', shipments: 1100, cost: 9350, avgCost: 8.50 },
      { carrier: 'FedEx', shipments: 680, cost: 10340, avgCost: 15.21 },
      { carrier: 'UPS', shipments: 520, cost: 7696, avgCost: 14.80 },
      { carrier: 'DHL', shipments: 150, cost: 3375, avgCost: 22.50 },
    ],
    byZone: [
      { zone: 'Zone 1', shipments: 890, avgCost: 8.20 },
      { zone: 'Zone 2', shipments: 650, avgCost: 10.50 },
      { zone: 'Zone 3', shipments: 420, avgCost: 12.80 },
      { zone: 'International', shipments: 490, avgCost: 18.50 },
    ],
    trends: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
      shipments: 320 + Math.floor(Math.random() * 100),
      totalCost: 3800 + Math.floor(Math.random() * 500),
    })),
  });
});

// ----------------------------------------
// 設定
// ----------------------------------------

// 送料設定取得
router.get('/settings', async (_req, res) => {
  const settings = {
    general: {
      defaultOrigin: {
        postalCode: '90210',
        country: 'US',
        state: 'CA',
      },
      weightUnit: 'oz',
      dimensionUnit: 'in',
      currency: 'USD',
    },
    calculation: {
      roundingRule: 'up',
      roundingPrecision: 2,
      includeSurcharges: true,
      includeInsurance: false,
      defaultInsuranceValue: 100,
    },
    display: {
      showEstimatedDelivery: true,
      showCarrierLogos: true,
      sortBy: 'price',
      maxOptionsToShow: 5,
    },
    freeShipping: {
      enabled: true,
      threshold: 49.99,
      domesticOnly: true,
      excludedCategories: [],
    },
    markups: {
      enabled: true,
      type: 'percent',
      value: 10,
      roundToNearest: 0.99,
    },
  };
  res.json(settings);
});

// 送料設定更新
router.put('/settings', async (req, res) => {
  const settings = req.body;
  res.json({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayShippingCalculatorRouter = router;

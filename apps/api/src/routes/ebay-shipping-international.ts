import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@rakuda/logger';

const router = Router();

// ============================================
// 型定義
// ============================================

// 配送地域
const SHIPPING_REGIONS = {
  NORTH_AMERICA: {
    id: 'NORTH_AMERICA',
    name: '北米',
    nameEn: 'North America',
    countries: ['US', 'CA', 'MX'],
  },
  EUROPE: {
    id: 'EUROPE',
    name: 'ヨーロッパ',
    nameEn: 'Europe',
    countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 'PL', 'IE', 'PT'],
  },
  ASIA_PACIFIC: {
    id: 'ASIA_PACIFIC',
    name: 'アジア太平洋',
    nameEn: 'Asia Pacific',
    countries: ['JP', 'AU', 'NZ', 'SG', 'HK', 'TW', 'KR', 'MY', 'TH', 'PH', 'ID', 'VN'],
  },
  LATIN_AMERICA: {
    id: 'LATIN_AMERICA',
    name: '中南米',
    nameEn: 'Latin America',
    countries: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE'],
  },
  MIDDLE_EAST: {
    id: 'MIDDLE_EAST',
    name: '中東',
    nameEn: 'Middle East',
    countries: ['AE', 'SA', 'IL', 'TR', 'EG'],
  },
  AFRICA: {
    id: 'AFRICA',
    name: 'アフリカ',
    nameEn: 'Africa',
    countries: ['ZA', 'NG', 'KE', 'MA'],
  },
} as const;

// 配送方法
const SHIPPING_METHODS = {
  ECONOMY: {
    id: 'ECONOMY',
    name: 'エコノミー',
    nameEn: 'Economy',
    minDays: 14,
    maxDays: 30,
    trackingAvailable: false,
    insuranceIncluded: false,
  },
  STANDARD: {
    id: 'STANDARD',
    name: 'スタンダード',
    nameEn: 'Standard',
    minDays: 7,
    maxDays: 14,
    trackingAvailable: true,
    insuranceIncluded: false,
  },
  EXPRESS: {
    id: 'EXPRESS',
    name: 'エクスプレス',
    nameEn: 'Express',
    minDays: 3,
    maxDays: 7,
    trackingAvailable: true,
    insuranceIncluded: true,
  },
  OVERNIGHT: {
    id: 'OVERNIGHT',
    name: 'オーバーナイト',
    nameEn: 'Overnight',
    minDays: 1,
    maxDays: 3,
    trackingAvailable: true,
    insuranceIncluded: true,
  },
} as const;

// キャリア
const CARRIERS = {
  EMS: { id: 'EMS', name: 'EMS（日本郵便）', logo: 'ems.png' },
  DHL: { id: 'DHL', name: 'DHL Express', logo: 'dhl.png' },
  FEDEX: { id: 'FEDEX', name: 'FedEx', logo: 'fedex.png' },
  UPS: { id: 'UPS', name: 'UPS', logo: 'ups.png' },
  SAGAWA: { id: 'SAGAWA', name: '佐川急便', logo: 'sagawa.png' },
  YAMATO: { id: 'YAMATO', name: 'ヤマト運輸', logo: 'yamato.png' },
  ECONOMY_AIR: { id: 'ECONOMY_AIR', name: 'エコノミー航空便', logo: 'airmail.png' },
  SAL: { id: 'SAL', name: 'SAL便', logo: 'sal.png' },
  SURFACE: { id: 'SURFACE', name: '船便', logo: 'surface.png' },
} as const;

// 重量単位
const WEIGHT_UNITS = {
  G: { id: 'G', name: 'グラム', factor: 1 },
  KG: { id: 'KG', name: 'キログラム', factor: 1000 },
  OZ: { id: 'OZ', name: 'オンス', factor: 28.35 },
  LB: { id: 'LB', name: 'ポンド', factor: 453.59 },
} as const;

// ============================================
// バリデーションスキーマ
// ============================================

const calculateRateSchema = z.object({
  originCountry: z.string().length(2).default('JP'),
  destinationCountry: z.string().length(2),
  weight: z.number().positive(),
  weightUnit: z.enum(['G', 'KG', 'OZ', 'LB']).default('G'),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['CM', 'IN']).default('CM'),
  }).optional(),
  declaredValue: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  category: z.string().optional(),
});

const shippingProfileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  originCountry: z.string().length(2).default('JP'),
  regions: z.array(z.object({
    regionId: z.string(),
    methods: z.array(z.object({
      methodId: z.string(),
      carrierId: z.string(),
      price: z.number().min(0),
      additionalItemPrice: z.number().min(0).default(0),
      freeShippingThreshold: z.number().min(0).optional(),
      handlingTime: z.number().int().min(0).default(1),
    })),
    excludedCountries: z.array(z.string()).optional(),
  })),
  isDefault: z.boolean().default(false),
});

const customRateSchema = z.object({
  profileId: z.string().uuid(),
  destinationCountry: z.string().length(2),
  methodId: z.string(),
  weightRanges: z.array(z.object({
    minWeight: z.number().min(0),
    maxWeight: z.number().positive(),
    price: z.number().min(0),
  })),
});

// ============================================
// ダッシュボード
// ============================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      summary: {
        totalProfiles: 12,
        activeProfiles: 8,
        totalShipments: 2847,
        totalShippingRevenue: 45680.00,
        averageShippingCost: 16.05,
        freeShippingOrders: 523,
      },
      byRegion: [
        { region: 'NORTH_AMERICA', shipments: 1234, revenue: 19744.00, percentage: 43.3 },
        { region: 'EUROPE', shipments: 678, revenue: 12204.00, percentage: 23.8 },
        { region: 'ASIA_PACIFIC', shipments: 534, revenue: 8544.00, percentage: 18.8 },
        { region: 'LATIN_AMERICA', shipments: 234, revenue: 3744.00, percentage: 8.2 },
        { region: 'MIDDLE_EAST', shipments: 112, revenue: 1568.00, percentage: 3.9 },
        { region: 'AFRICA', shipments: 55, revenue: 876.00, percentage: 1.9 },
      ],
      byMethod: [
        { method: 'STANDARD', shipments: 1456, percentage: 51.2 },
        { method: 'EXPRESS', shipments: 867, percentage: 30.5 },
        { method: 'ECONOMY', shipments: 412, percentage: 14.5 },
        { method: 'OVERNIGHT', shipments: 112, percentage: 3.9 },
      ],
      byCarrier: [
        { carrier: 'EMS', shipments: 945, percentage: 33.2 },
        { carrier: 'DHL', shipments: 678, percentage: 23.8 },
        { carrier: 'FEDEX', shipments: 534, percentage: 18.8 },
        { carrier: 'UPS', shipments: 412, percentage: 14.5 },
        { carrier: 'ECONOMY_AIR', shipments: 278, percentage: 9.8 },
      ],
      topDestinations: [
        { country: 'US', name: 'United States', shipments: 987, flag: '🇺🇸' },
        { country: 'GB', name: 'United Kingdom', shipments: 345, flag: '🇬🇧' },
        { country: 'AU', name: 'Australia', shipments: 289, flag: '🇦🇺' },
        { country: 'DE', name: 'Germany', shipments: 234, flag: '🇩🇪' },
        { country: 'CA', name: 'Canada', shipments: 198, flag: '🇨🇦' },
      ],
      recentShipments: [
        { id: 'shp-001', destination: 'US', method: 'EXPRESS', carrier: 'DHL', cost: 24.99, status: 'IN_TRANSIT' },
        { id: 'shp-002', destination: 'GB', method: 'STANDARD', carrier: 'EMS', cost: 18.50, status: 'DELIVERED' },
        { id: 'shp-003', destination: 'AU', method: 'EXPRESS', carrier: 'FEDEX', cost: 32.00, status: 'SHIPPED' },
      ],
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get shipping dashboard', error);
    res.status(500).json({ error: 'ダッシュボードの取得に失敗しました' });
  }
});

// ============================================
// マスターデータ
// ============================================

router.get('/regions', async (_req: Request, res: Response) => {
  try {
    res.json({
      regions: Object.values(SHIPPING_REGIONS),
    });
  } catch (error) {
    logger.error('Failed to get shipping regions', error);
    res.status(500).json({ error: '地域の取得に失敗しました' });
  }
});

router.get('/methods', async (_req: Request, res: Response) => {
  try {
    res.json({
      methods: Object.values(SHIPPING_METHODS),
    });
  } catch (error) {
    logger.error('Failed to get shipping methods', error);
    res.status(500).json({ error: '配送方法の取得に失敗しました' });
  }
});

router.get('/carriers', async (_req: Request, res: Response) => {
  try {
    res.json({
      carriers: Object.values(CARRIERS),
    });
  } catch (error) {
    logger.error('Failed to get carriers', error);
    res.status(500).json({ error: 'キャリアの取得に失敗しました' });
  }
});

router.get('/countries', async (_req: Request, res: Response) => {
  try {
    const countries = [
      { code: 'US', name: 'United States', nameJa: 'アメリカ合衆国', flag: '🇺🇸', region: 'NORTH_AMERICA' },
      { code: 'CA', name: 'Canada', nameJa: 'カナダ', flag: '🇨🇦', region: 'NORTH_AMERICA' },
      { code: 'MX', name: 'Mexico', nameJa: 'メキシコ', flag: '🇲🇽', region: 'NORTH_AMERICA' },
      { code: 'GB', name: 'United Kingdom', nameJa: 'イギリス', flag: '🇬🇧', region: 'EUROPE' },
      { code: 'DE', name: 'Germany', nameJa: 'ドイツ', flag: '🇩🇪', region: 'EUROPE' },
      { code: 'FR', name: 'France', nameJa: 'フランス', flag: '🇫🇷', region: 'EUROPE' },
      { code: 'IT', name: 'Italy', nameJa: 'イタリア', flag: '🇮🇹', region: 'EUROPE' },
      { code: 'ES', name: 'Spain', nameJa: 'スペイン', flag: '🇪🇸', region: 'EUROPE' },
      { code: 'AU', name: 'Australia', nameJa: 'オーストラリア', flag: '🇦🇺', region: 'ASIA_PACIFIC' },
      { code: 'JP', name: 'Japan', nameJa: '日本', flag: '🇯🇵', region: 'ASIA_PACIFIC' },
      { code: 'SG', name: 'Singapore', nameJa: 'シンガポール', flag: '🇸🇬', region: 'ASIA_PACIFIC' },
      { code: 'HK', name: 'Hong Kong', nameJa: '香港', flag: '🇭🇰', region: 'ASIA_PACIFIC' },
      { code: 'KR', name: 'South Korea', nameJa: '韓国', flag: '🇰🇷', region: 'ASIA_PACIFIC' },
      { code: 'BR', name: 'Brazil', nameJa: 'ブラジル', flag: '🇧🇷', region: 'LATIN_AMERICA' },
      { code: 'AE', name: 'United Arab Emirates', nameJa: 'アラブ首長国連邦', flag: '🇦🇪', region: 'MIDDLE_EAST' },
      { code: 'ZA', name: 'South Africa', nameJa: '南アフリカ', flag: '🇿🇦', region: 'AFRICA' },
    ];

    res.json({ countries });
  } catch (error) {
    logger.error('Failed to get countries', error);
    res.status(500).json({ error: '国の取得に失敗しました' });
  }
});

// ============================================
// 送料計算
// ============================================

router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const validated = calculateRateSchema.parse(req.body);

    // 重量をグラムに変換
    const weightUnit = WEIGHT_UNITS[validated.weightUnit];
    const weightInGrams = validated.weight * weightUnit.factor;

    // 容積重量計算（該当する場合）
    let volumetricWeight = 0;
    if (validated.dimensions) {
      const { length, width, height, unit } = validated.dimensions;
      const factor = unit === 'IN' ? 2.54 : 1;
      volumetricWeight = (length * factor * width * factor * height * factor) / 5000 * 1000; // グラム
    }

    const chargeableWeight = Math.max(weightInGrams, volumetricWeight);

    // モック料金計算
    const rates = [
      {
        carrier: 'EMS',
        method: 'EXPRESS',
        price: 28.50,
        currency: 'USD',
        deliveryDays: { min: 3, max: 7 },
        tracking: true,
        insurance: true,
      },
      {
        carrier: 'DHL',
        method: 'EXPRESS',
        price: 42.00,
        currency: 'USD',
        deliveryDays: { min: 2, max: 5 },
        tracking: true,
        insurance: true,
      },
      {
        carrier: 'FEDEX',
        method: 'EXPRESS',
        price: 38.50,
        currency: 'USD',
        deliveryDays: { min: 3, max: 6 },
        tracking: true,
        insurance: true,
      },
      {
        carrier: 'EMS',
        method: 'STANDARD',
        price: 18.00,
        currency: 'USD',
        deliveryDays: { min: 7, max: 14 },
        tracking: true,
        insurance: false,
      },
      {
        carrier: 'ECONOMY_AIR',
        method: 'ECONOMY',
        price: 12.50,
        currency: 'USD',
        deliveryDays: { min: 14, max: 21 },
        tracking: false,
        insurance: false,
      },
      {
        carrier: 'SAL',
        method: 'ECONOMY',
        price: 9.00,
        currency: 'USD',
        deliveryDays: { min: 14, max: 30 },
        tracking: true,
        insurance: false,
      },
    ];

    res.json({
      origin: validated.originCountry,
      destination: validated.destinationCountry,
      weight: {
        actual: weightInGrams,
        volumetric: volumetricWeight,
        chargeable: chargeableWeight,
        unit: 'G',
      },
      rates: rates.sort((a, b) => a.price - b.price),
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to calculate shipping rate', error);
    res.status(500).json({ error: '送料計算に失敗しました' });
  }
});

// 一括計算
router.post('/calculate-bulk', async (req: Request, res: Response) => {
  try {
    const { items, destinationCountry } = req.body;

    const results = items.map((item: { listingId: string; weight: number; dimensions?: { length: number; width: number; height: number } }) => ({
      listingId: item.listingId,
      rates: [
        { carrier: 'EMS', method: 'EXPRESS', price: 28.50 + (item.weight / 100) },
        { carrier: 'DHL', method: 'EXPRESS', price: 42.00 + (item.weight / 80) },
        { carrier: 'ECONOMY_AIR', method: 'ECONOMY', price: 12.50 + (item.weight / 150) },
      ],
    }));

    res.json({
      destination: destinationCountry,
      results,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to calculate bulk shipping rates', error);
    res.status(500).json({ error: '一括送料計算に失敗しました' });
  }
});

// ============================================
// 配送プロファイル
// ============================================

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const profiles = [
      {
        id: 'prof-001',
        name: 'Standard International',
        description: '標準的な国際配送プロファイル',
        originCountry: 'JP',
        regionCount: 6,
        methodCount: 4,
        isDefault: true,
        listingCount: 156,
        createdAt: '2025-12-01T00:00:00Z',
        updatedAt: '2026-02-14T10:00:00Z',
      },
      {
        id: 'prof-002',
        name: 'Express Only',
        description: 'エクスプレス配送のみ',
        originCountry: 'JP',
        regionCount: 4,
        methodCount: 2,
        isDefault: false,
        listingCount: 45,
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-02-10T15:00:00Z',
      },
      {
        id: 'prof-003',
        name: 'Economy Worldwide',
        description: 'エコノミー配送（全世界）',
        originCountry: 'JP',
        regionCount: 6,
        methodCount: 2,
        isDefault: false,
        listingCount: 89,
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-02-12T08:00:00Z',
      },
      {
        id: 'prof-004',
        name: 'US & Canada Only',
        description: '北米限定配送',
        originCountry: 'JP',
        regionCount: 1,
        methodCount: 3,
        isDefault: false,
        listingCount: 34,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-14T12:00:00Z',
      },
    ];

    res.json({
      profiles,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: 12,
        totalPages: 1,
      },
    });
  } catch (error) {
    logger.error('Failed to get shipping profiles', error);
    res.status(500).json({ error: 'プロファイル一覧の取得に失敗しました' });
  }
});

router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const validated = shippingProfileSchema.parse(req.body);

    const profile = {
      id: `prof-${Date.now()}`,
      ...validated,
      listingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info(`Shipping profile created: ${profile.id}`);

    res.status(201).json({
      message: '配送プロファイルを作成しました',
      profile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to create shipping profile', error);
    res.status(500).json({ error: 'プロファイルの作成に失敗しました' });
  }
});

router.get('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    const profile = {
      id: profileId,
      name: 'Standard International',
      description: '標準的な国際配送プロファイル',
      originCountry: 'JP',
      regions: [
        {
          regionId: 'NORTH_AMERICA',
          regionName: '北米',
          methods: [
            { methodId: 'EXPRESS', carrierId: 'DHL', price: 35.00, additionalItemPrice: 5.00, freeShippingThreshold: 150, handlingTime: 1 },
            { methodId: 'STANDARD', carrierId: 'EMS', price: 22.00, additionalItemPrice: 3.00, freeShippingThreshold: 100, handlingTime: 2 },
            { methodId: 'ECONOMY', carrierId: 'ECONOMY_AIR', price: 14.00, additionalItemPrice: 2.00, freeShippingThreshold: null, handlingTime: 3 },
          ],
          excludedCountries: [],
        },
        {
          regionId: 'EUROPE',
          regionName: 'ヨーロッパ',
          methods: [
            { methodId: 'EXPRESS', carrierId: 'DHL', price: 42.00, additionalItemPrice: 6.00, freeShippingThreshold: 180, handlingTime: 1 },
            { methodId: 'STANDARD', carrierId: 'EMS', price: 28.00, additionalItemPrice: 4.00, freeShippingThreshold: 120, handlingTime: 2 },
          ],
          excludedCountries: ['RU', 'BY'],
        },
        {
          regionId: 'ASIA_PACIFIC',
          regionName: 'アジア太平洋',
          methods: [
            { methodId: 'EXPRESS', carrierId: 'FEDEX', price: 28.00, additionalItemPrice: 4.00, freeShippingThreshold: 100, handlingTime: 1 },
            { methodId: 'STANDARD', carrierId: 'EMS', price: 18.00, additionalItemPrice: 2.50, freeShippingThreshold: 80, handlingTime: 2 },
            { methodId: 'ECONOMY', carrierId: 'SAL', price: 10.00, additionalItemPrice: 1.50, freeShippingThreshold: null, handlingTime: 3 },
          ],
          excludedCountries: [],
        },
      ],
      isDefault: true,
      listingCount: 156,
      createdAt: '2025-12-01T00:00:00Z',
      updatedAt: '2026-02-14T10:00:00Z',
    };

    res.json(profile);
  } catch (error) {
    logger.error('Failed to get shipping profile', error);
    res.status(500).json({ error: 'プロファイル詳細の取得に失敗しました' });
  }
});

router.put('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const validated = shippingProfileSchema.partial().parse(req.body);

    logger.info(`Shipping profile updated: ${profileId}`);

    res.json({
      message: 'プロファイルを更新しました',
      profile: {
        id: profileId,
        ...validated,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to update shipping profile', error);
    res.status(500).json({ error: 'プロファイルの更新に失敗しました' });
  }
});

router.delete('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    logger.info(`Shipping profile deleted: ${profileId}`);

    res.json({ message: 'プロファイルを削除しました' });
  } catch (error) {
    logger.error('Failed to delete shipping profile', error);
    res.status(500).json({ error: 'プロファイルの削除に失敗しました' });
  }
});

// デフォルト設定
router.post('/profiles/:profileId/set-default', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    logger.info(`Shipping profile set as default: ${profileId}`);

    res.json({ message: 'デフォルトプロファイルを設定しました' });
  } catch (error) {
    logger.error('Failed to set default profile', error);
    res.status(500).json({ error: 'デフォルト設定に失敗しました' });
  }
});

// プロファイル複製
router.post('/profiles/:profileId/duplicate', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { name } = req.body;

    const newProfile = {
      id: `prof-${Date.now()}`,
      name: name || `Copy of profile`,
      originalProfileId: profileId,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    logger.info(`Shipping profile duplicated: ${profileId} -> ${newProfile.id}`);

    res.status(201).json({
      message: 'プロファイルを複製しました',
      profile: newProfile,
    });
  } catch (error) {
    logger.error('Failed to duplicate profile', error);
    res.status(500).json({ error: 'プロファイルの複製に失敗しました' });
  }
});

// ============================================
// カスタムレート
// ============================================

router.post('/custom-rates', async (req: Request, res: Response) => {
  try {
    const validated = customRateSchema.parse(req.body);

    logger.info(`Custom rate created for profile: ${validated.profileId}`);

    res.status(201).json({
      message: 'カスタムレートを設定しました',
      customRate: validated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to create custom rate', error);
    res.status(500).json({ error: 'カスタムレートの設定に失敗しました' });
  }
});

router.get('/custom-rates/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    const customRates = [
      {
        destinationCountry: 'US',
        methodId: 'EXPRESS',
        weightRanges: [
          { minWeight: 0, maxWeight: 500, price: 28.00 },
          { minWeight: 500, maxWeight: 1000, price: 35.00 },
          { minWeight: 1000, maxWeight: 2000, price: 45.00 },
          { minWeight: 2000, maxWeight: 5000, price: 65.00 },
        ],
      },
      {
        destinationCountry: 'GB',
        methodId: 'EXPRESS',
        weightRanges: [
          { minWeight: 0, maxWeight: 500, price: 32.00 },
          { minWeight: 500, maxWeight: 1000, price: 42.00 },
          { minWeight: 1000, maxWeight: 2000, price: 55.00 },
        ],
      },
    ];

    res.json({ profileId, customRates });
  } catch (error) {
    logger.error('Failed to get custom rates', error);
    res.status(500).json({ error: 'カスタムレートの取得に失敗しました' });
  }
});

// ============================================
// 除外国設定
// ============================================

router.get('/excluded-countries', async (_req: Request, res: Response) => {
  try {
    const excludedCountries = {
      global: ['RU', 'BY', 'IR', 'KP', 'SY', 'CU'],
      byRegion: {
        EUROPE: ['RU', 'BY'],
        MIDDLE_EAST: ['IR', 'SY'],
      },
      reasons: {
        RU: '制裁対象国',
        BY: '制裁対象国',
        IR: '制裁対象国',
        KP: '制裁対象国',
        SY: '制裁対象国',
        CU: '制裁対象国',
      },
    };

    res.json(excludedCountries);
  } catch (error) {
    logger.error('Failed to get excluded countries', error);
    res.status(500).json({ error: '除外国の取得に失敗しました' });
  }
});

router.put('/excluded-countries', async (req: Request, res: Response) => {
  try {
    const { countries, reason } = req.body;

    logger.info(`Excluded countries updated: ${countries.join(', ')}`);

    res.json({ message: '除外国を更新しました' });
  } catch (error) {
    logger.error('Failed to update excluded countries', error);
    res.status(500).json({ error: '除外国の更新に失敗しました' });
  }
});

// ============================================
// 送料無料設定
// ============================================

router.get('/free-shipping-rules', async (_req: Request, res: Response) => {
  try {
    const rules = [
      {
        id: 'rule-001',
        name: 'US $100以上送料無料',
        destinationCountry: 'US',
        minOrderValue: 100,
        currency: 'USD',
        methods: ['STANDARD', 'ECONOMY'],
        isActive: true,
      },
      {
        id: 'rule-002',
        name: 'ヨーロッパ €150以上送料無料',
        region: 'EUROPE',
        minOrderValue: 150,
        currency: 'EUR',
        methods: ['STANDARD'],
        isActive: true,
      },
      {
        id: 'rule-003',
        name: '全世界 $200以上送料無料',
        region: 'WORLDWIDE',
        minOrderValue: 200,
        currency: 'USD',
        methods: ['ECONOMY'],
        isActive: false,
      },
    ];

    res.json({ rules });
  } catch (error) {
    logger.error('Failed to get free shipping rules', error);
    res.status(500).json({ error: '送料無料ルールの取得に失敗しました' });
  }
});

router.post('/free-shipping-rules', async (req: Request, res: Response) => {
  try {
    const rule = req.body;

    logger.info('Free shipping rule created');

    res.status(201).json({
      message: '送料無料ルールを作成しました',
      rule: { id: `rule-${Date.now()}`, ...rule },
    });
  } catch (error) {
    logger.error('Failed to create free shipping rule', error);
    res.status(500).json({ error: '送料無料ルールの作成に失敗しました' });
  }
});

// ============================================
// 統計
// ============================================

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = {
      overview: {
        totalShipments: 2847,
        totalRevenue: 45680.00,
        averageCost: 16.05,
        freeShippingRate: 18.4,
      },
      trends: {
        monthly: [
          { month: '2025-09', shipments: 312, revenue: 4980 },
          { month: '2025-10', shipments: 378, revenue: 6048 },
          { month: '2025-11', shipments: 456, revenue: 7296 },
          { month: '2025-12', shipments: 534, revenue: 8544 },
          { month: '2026-01', shipments: 589, revenue: 9424 },
          { month: '2026-02', shipments: 578, revenue: 9388 },
        ],
      },
      performance: {
        onTimeDelivery: 94.5,
        lostPackages: 0.2,
        returnRate: 2.3,
        averageDeliveryDays: 8.5,
      },
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get shipping stats', error);
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

// ============================================
// 設定
// ============================================

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      defaultOriginCountry: 'JP',
      defaultCurrency: 'USD',
      defaultWeightUnit: 'G',
      defaultDimensionUnit: 'CM',
      handlingFee: 0,
      packagingFee: 0,
      insuranceEnabled: true,
      insuranceThreshold: 100,
      trackingRequired: true,
      combineShipping: true,
      combineDiscount: 10,
      maxCombineItems: 5,
    };

    res.json(settings);
  } catch (error) {
    logger.error('Failed to get shipping settings', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    logger.info('Shipping settings updated');

    res.json({
      message: '設定を更新しました',
      settings,
    });
  } catch (error) {
    logger.error('Failed to update shipping settings', error);
    res.status(500).json({ error: '設定の更新に失敗しました' });
  }
});

export { router as ebayShippingInternationalRouter };

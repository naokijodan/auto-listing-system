import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@rakuda/logger';

const router = Router();

// ============================================
// 型定義
// ============================================

// バンドルタイプ
const BUNDLE_TYPES = {
  FIXED: {
    id: 'FIXED',
    name: '固定セット',
    nameEn: 'Fixed Bundle',
    description: '決まった商品の組み合わせ',
    icon: 'package',
  },
  MIX_MATCH: {
    id: 'MIX_MATCH',
    name: 'ミックス&マッチ',
    nameEn: 'Mix & Match',
    description: '選択可能な商品の組み合わせ',
    icon: 'shuffle',
  },
  BOGO: {
    id: 'BOGO',
    name: 'Buy One Get One',
    nameEn: 'BOGO',
    description: '1つ買うともう1つ無料/割引',
    icon: 'gift',
  },
  QUANTITY: {
    id: 'QUANTITY',
    name: '数量割引',
    nameEn: 'Quantity Discount',
    description: '複数購入で割引',
    icon: 'layers',
  },
  TIERED: {
    id: 'TIERED',
    name: '階層型割引',
    nameEn: 'Tiered Discount',
    description: '購入数に応じた段階割引',
    icon: 'trending-down',
  },
  CROSS_SELL: {
    id: 'CROSS_SELL',
    name: 'クロスセル',
    nameEn: 'Cross-Sell Bundle',
    description: '関連商品のセット',
    icon: 'git-branch',
  },
} as const;

// 割引タイプ
const DISCOUNT_TYPES = {
  PERCENTAGE: { id: 'PERCENTAGE', name: 'パーセント割引', symbol: '%' },
  FIXED_AMOUNT: { id: 'FIXED_AMOUNT', name: '固定金額割引', symbol: '$' },
  FIXED_PRICE: { id: 'FIXED_PRICE', name: 'セット価格', symbol: '$' },
  FREE_ITEM: { id: 'FREE_ITEM', name: '無料アイテム', symbol: '🎁' },
} as const;

// バンドルステータス
const BUNDLE_STATUS = {
  DRAFT: { id: 'DRAFT', name: '下書き', color: 'zinc' },
  ACTIVE: { id: 'ACTIVE', name: '有効', color: 'emerald' },
  SCHEDULED: { id: 'SCHEDULED', name: '予約済み', color: 'blue' },
  PAUSED: { id: 'PAUSED', name: '一時停止', color: 'amber' },
  ENDED: { id: 'ENDED', name: '終了', color: 'zinc' },
  SOLD_OUT: { id: 'SOLD_OUT', name: '売り切れ', color: 'red' },
} as const;

// ============================================
// バリデーションスキーマ
// ============================================

const bundleItemSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  required: z.boolean().default(true),
  discountPercentage: z.number().min(0).max(100).optional(),
});

const createBundleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['FIXED', 'MIX_MATCH', 'BOGO', 'QUANTITY', 'TIERED', 'CROSS_SELL']),
  items: z.array(bundleItemSchema).min(2),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FIXED_PRICE', 'FREE_ITEM']),
  discountValue: z.number().min(0),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limitPerBuyer: z.number().int().min(1).optional(),
  totalLimit: z.number().int().min(1).optional(),
  requireAllItems: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const updateBundleSchema = createBundleSchema.partial();

const tieredDiscountSchema = z.object({
  bundleId: z.string().uuid(),
  tiers: z.array(z.object({
    minQuantity: z.number().int().min(1),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().min(0),
  })).min(1),
});

// ============================================
// ダッシュボード
// ============================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      summary: {
        totalBundles: 48,
        activeBundles: 32,
        totalSold: 1847,
        totalRevenue: 89450.00,
        averageDiscount: 18.5,
        conversionRate: 12.3,
      },
      performance: {
        today: { sold: 23, revenue: 1150.00 },
        thisWeek: { sold: 156, revenue: 7800.00 },
        thisMonth: { sold: 589, revenue: 29450.00 },
      },
      topBundles: [
        {
          id: 'bnd-001',
          name: 'Complete Camera Kit',
          type: 'FIXED',
          soldCount: 234,
          revenue: 23400.00,
          conversionRate: 15.2,
        },
        {
          id: 'bnd-002',
          name: 'T-Shirt 3-Pack',
          type: 'QUANTITY',
          soldCount: 189,
          revenue: 5670.00,
          conversionRate: 22.1,
        },
        {
          id: 'bnd-003',
          name: 'Accessory Bundle',
          type: 'CROSS_SELL',
          soldCount: 156,
          revenue: 7800.00,
          conversionRate: 18.5,
        },
        {
          id: 'bnd-004',
          name: 'Buy 2 Get 1 Free Socks',
          type: 'BOGO',
          soldCount: 134,
          revenue: 2680.00,
          conversionRate: 25.3,
        },
        {
          id: 'bnd-005',
          name: 'Mix & Match Jewelry Set',
          type: 'MIX_MATCH',
          soldCount: 98,
          revenue: 9800.00,
          conversionRate: 14.7,
        },
      ],
      byType: [
        { type: 'FIXED', count: 15, soldCount: 456, revenue: 34200.00 },
        { type: 'QUANTITY', count: 12, soldCount: 389, revenue: 11670.00 },
        { type: 'BOGO', count: 8, soldCount: 312, revenue: 6240.00 },
        { type: 'CROSS_SELL', count: 6, soldCount: 278, revenue: 13900.00 },
        { type: 'MIX_MATCH', count: 5, soldCount: 245, revenue: 17150.00 },
        { type: 'TIERED', count: 2, soldCount: 167, revenue: 6290.00 },
      ],
      recentActivity: [
        { type: 'BUNDLE_SOLD', bundleName: 'Camera Kit', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { type: 'BUNDLE_CREATED', bundleName: 'Summer Collection', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        { type: 'BUNDLE_EXPIRED', bundleName: 'Winter Sale Pack', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { type: 'LOW_STOCK', bundleName: 'Accessory Bundle', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
      ],
      alerts: [
        { type: 'LOW_STOCK', bundleId: 'bnd-003', bundleName: 'Accessory Bundle', message: '在庫残り5セット' },
        { type: 'EXPIRING', bundleId: 'bnd-010', bundleName: 'Flash Sale Bundle', message: '24時間以内に終了' },
      ],
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get bundles dashboard', error);
    res.status(500).json({ error: 'ダッシュボードの取得に失敗しました' });
  }
});

// ============================================
// バンドルタイプ・割引タイプ
// ============================================

router.get('/types', async (_req: Request, res: Response) => {
  try {
    res.json({
      bundleTypes: Object.values(BUNDLE_TYPES),
      discountTypes: Object.values(DISCOUNT_TYPES),
      statusTypes: Object.values(BUNDLE_STATUS),
    });
  } catch (error) {
    logger.error('Failed to get bundle types', error);
    res.status(500).json({ error: 'タイプの取得に失敗しました' });
  }
});

// ============================================
// バンドルCRUD
// ============================================

// バンドル一覧
router.get('/bundles', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, type, search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const bundles = [
      {
        id: 'bnd-001',
        name: 'Complete Camera Kit',
        description: 'カメラ本体、レンズ、バッグの完全セット',
        type: 'FIXED',
        itemCount: 3,
        items: [
          { listingId: 'lst-001', title: 'Digital Camera Body', quantity: 1, price: 599.99 },
          { listingId: 'lst-002', title: '50mm Lens', quantity: 1, price: 299.99 },
          { listingId: 'lst-003', title: 'Camera Bag', quantity: 1, price: 79.99 },
        ],
        originalPrice: 979.97,
        bundlePrice: 849.99,
        discountType: 'FIXED_PRICE',
        discountValue: 849.99,
        savingsAmount: 129.98,
        savingsPercent: 13.3,
        soldCount: 234,
        revenue: 23400.00,
        stockQuantity: 15,
        status: 'ACTIVE',
        startDate: '2026-01-01T00:00:00Z',
        endDate: null,
        createdAt: '2025-12-15T10:00:00Z',
        updatedAt: '2026-02-14T15:30:00Z',
      },
      {
        id: 'bnd-002',
        name: 'T-Shirt 3-Pack',
        description: '同じTシャツを3枚セットでお得に',
        type: 'QUANTITY',
        itemCount: 1,
        items: [
          { listingId: 'lst-010', title: 'Cotton T-Shirt', quantity: 3, price: 29.99 },
        ],
        originalPrice: 89.97,
        bundlePrice: 69.99,
        discountType: 'FIXED_PRICE',
        discountValue: 69.99,
        savingsAmount: 19.98,
        savingsPercent: 22.2,
        soldCount: 189,
        revenue: 5670.00,
        stockQuantity: 45,
        status: 'ACTIVE',
        startDate: '2026-01-15T00:00:00Z',
        endDate: null,
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-02-13T09:15:00Z',
      },
      {
        id: 'bnd-003',
        name: 'Accessory Bundle',
        description: 'スマホアクセサリーセット',
        type: 'CROSS_SELL',
        itemCount: 4,
        items: [
          { listingId: 'lst-020', title: 'Phone Case', quantity: 1, price: 19.99 },
          { listingId: 'lst-021', title: 'Screen Protector', quantity: 1, price: 9.99 },
          { listingId: 'lst-022', title: 'Charging Cable', quantity: 1, price: 14.99 },
          { listingId: 'lst-023', title: 'Car Mount', quantity: 1, price: 24.99 },
        ],
        originalPrice: 69.96,
        bundlePrice: 49.99,
        discountType: 'FIXED_PRICE',
        discountValue: 49.99,
        savingsAmount: 19.97,
        savingsPercent: 28.5,
        soldCount: 156,
        revenue: 7800.00,
        stockQuantity: 5,
        status: 'ACTIVE',
        startDate: '2026-02-01T00:00:00Z',
        endDate: null,
        createdAt: '2026-01-28T14:00:00Z',
        updatedAt: '2026-02-14T18:00:00Z',
      },
      {
        id: 'bnd-004',
        name: 'Buy 2 Get 1 Free Socks',
        description: '靴下2足買うと1足無料',
        type: 'BOGO',
        itemCount: 1,
        items: [
          { listingId: 'lst-030', title: 'Premium Socks', quantity: 3, price: 12.99 },
        ],
        originalPrice: 38.97,
        bundlePrice: 25.98,
        discountType: 'FREE_ITEM',
        discountValue: 1,
        savingsAmount: 12.99,
        savingsPercent: 33.3,
        soldCount: 134,
        revenue: 2680.00,
        stockQuantity: 80,
        status: 'ACTIVE',
        startDate: '2026-02-10T00:00:00Z',
        endDate: '2026-02-28T23:59:59Z',
        createdAt: '2026-02-08T09:00:00Z',
        updatedAt: '2026-02-14T12:00:00Z',
      },
    ];

    res.json({
      bundles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 48,
        totalPages: Math.ceil(48 / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to get bundles', error);
    res.status(500).json({ error: 'バンドル一覧の取得に失敗しました' });
  }
});

// バンドル作成
router.post('/bundles', async (req: Request, res: Response) => {
  try {
    const validated = createBundleSchema.parse(req.body);

    const bundle = {
      id: `bnd-${Date.now()}`,
      ...validated,
      originalPrice: 0, // 計算される
      bundlePrice: 0, // 計算される
      savingsAmount: 0,
      savingsPercent: 0,
      soldCount: 0,
      revenue: 0,
      stockQuantity: 0,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info(`Bundle created: ${bundle.id}`);

    res.status(201).json({
      message: 'バンドルを作成しました',
      bundle,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to create bundle', error);
    res.status(500).json({ error: 'バンドルの作成に失敗しました' });
  }
});

// バンドル詳細
router.get('/bundles/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    const bundle = {
      id: bundleId,
      name: 'Complete Camera Kit',
      description: 'カメラ本体、レンズ、バッグの完全セット。初心者からプロまで対応。',
      type: 'FIXED',
      items: [
        {
          listingId: 'lst-001',
          title: 'Digital Camera Body',
          image: 'https://example.com/camera.jpg',
          quantity: 1,
          originalPrice: 599.99,
          discountedPrice: 549.99,
          required: true,
          stockQuantity: 25,
        },
        {
          listingId: 'lst-002',
          title: '50mm Prime Lens',
          image: 'https://example.com/lens.jpg',
          quantity: 1,
          originalPrice: 299.99,
          discountedPrice: 249.99,
          required: true,
          stockQuantity: 30,
        },
        {
          listingId: 'lst-003',
          title: 'Professional Camera Bag',
          image: 'https://example.com/bag.jpg',
          quantity: 1,
          originalPrice: 79.99,
          discountedPrice: 49.99,
          required: true,
          stockQuantity: 45,
        },
      ],
      pricing: {
        originalPrice: 979.97,
        bundlePrice: 849.99,
        discountType: 'FIXED_PRICE',
        discountValue: 849.99,
        savingsAmount: 129.98,
        savingsPercent: 13.3,
      },
      limits: {
        minQuantity: 1,
        maxQuantity: 5,
        limitPerBuyer: 2,
        totalLimit: 100,
        remainingLimit: 66,
      },
      schedule: {
        startDate: '2026-01-01T00:00:00Z',
        endDate: null,
        isScheduled: false,
        isExpired: false,
      },
      performance: {
        soldCount: 234,
        revenue: 23400.00,
        views: 4500,
        conversionRate: 5.2,
        averageOrderValue: 849.99,
      },
      analytics: {
        dailySales: [
          { date: '2026-02-08', sold: 8, revenue: 6800 },
          { date: '2026-02-09', sold: 12, revenue: 10200 },
          { date: '2026-02-10', sold: 6, revenue: 5100 },
          { date: '2026-02-11', sold: 15, revenue: 12750 },
          { date: '2026-02-12', sold: 9, revenue: 7650 },
          { date: '2026-02-13', sold: 11, revenue: 9350 },
          { date: '2026-02-14', sold: 14, revenue: 11900 },
        ],
        topBuyerCountries: [
          { country: 'US', count: 98 },
          { country: 'UK', count: 45 },
          { country: 'DE', count: 32 },
          { country: 'JP', count: 28 },
          { country: 'AU', count: 21 },
        ],
      },
      stockQuantity: 15,
      status: 'ACTIVE',
      tags: ['camera', 'photography', 'beginner', 'bundle'],
      ebayListingId: 'ebay-12345678',
      ebayListingUrl: 'https://www.ebay.com/itm/12345678',
      createdAt: '2025-12-15T10:00:00Z',
      updatedAt: '2026-02-14T15:30:00Z',
    };

    res.json(bundle);
  } catch (error) {
    logger.error('Failed to get bundle', error);
    res.status(500).json({ error: 'バンドル詳細の取得に失敗しました' });
  }
});

// バンドル更新
router.put('/bundles/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const validated = updateBundleSchema.parse(req.body);

    logger.info(`Bundle updated: ${bundleId}`);

    res.json({
      message: 'バンドルを更新しました',
      bundle: {
        id: bundleId,
        ...validated,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to update bundle', error);
    res.status(500).json({ error: 'バンドルの更新に失敗しました' });
  }
});

// バンドル削除
router.delete('/bundles/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    logger.info(`Bundle deleted: ${bundleId}`);

    res.json({ message: 'バンドルを削除しました' });
  } catch (error) {
    logger.error('Failed to delete bundle', error);
    res.status(500).json({ error: 'バンドルの削除に失敗しました' });
  }
});

// ============================================
// バンドルステータス管理
// ============================================

// 有効化
router.post('/bundles/:bundleId/activate', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    logger.info(`Bundle activated: ${bundleId}`);

    res.json({
      message: 'バンドルを有効化しました',
      status: 'ACTIVE',
    });
  } catch (error) {
    logger.error('Failed to activate bundle', error);
    res.status(500).json({ error: 'バンドルの有効化に失敗しました' });
  }
});

// 一時停止
router.post('/bundles/:bundleId/pause', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    logger.info(`Bundle paused: ${bundleId}`);

    res.json({
      message: 'バンドルを一時停止しました',
      status: 'PAUSED',
    });
  } catch (error) {
    logger.error('Failed to pause bundle', error);
    res.status(500).json({ error: 'バンドルの一時停止に失敗しました' });
  }
});

// 終了
router.post('/bundles/:bundleId/end', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    logger.info(`Bundle ended: ${bundleId}`);

    res.json({
      message: 'バンドルを終了しました',
      status: 'ENDED',
    });
  } catch (error) {
    logger.error('Failed to end bundle', error);
    res.status(500).json({ error: 'バンドルの終了に失敗しました' });
  }
});

// 複製
router.post('/bundles/:bundleId/duplicate', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    const { name } = req.body;

    const newBundle = {
      id: `bnd-${Date.now()}`,
      name: name || `Copy of Bundle`,
      originalBundleId: bundleId,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    logger.info(`Bundle duplicated: ${bundleId} -> ${newBundle.id}`);

    res.status(201).json({
      message: 'バンドルを複製しました',
      bundle: newBundle,
    });
  } catch (error) {
    logger.error('Failed to duplicate bundle', error);
    res.status(500).json({ error: 'バンドルの複製に失敗しました' });
  }
});

// ============================================
// 階層型割引
// ============================================

router.post('/tiered-discount', async (req: Request, res: Response) => {
  try {
    const validated = tieredDiscountSchema.parse(req.body);

    logger.info(`Tiered discount set for bundle: ${validated.bundleId}`);

    res.json({
      message: '階層型割引を設定しました',
      bundleId: validated.bundleId,
      tiers: validated.tiers,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to set tiered discount', error);
    res.status(500).json({ error: '階層型割引の設定に失敗しました' });
  }
});

router.get('/tiered-discount/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    const tieredDiscount = {
      bundleId,
      tiers: [
        { minQuantity: 2, discountType: 'PERCENTAGE', discountValue: 10, label: '2個以上で10%OFF' },
        { minQuantity: 5, discountType: 'PERCENTAGE', discountValue: 15, label: '5個以上で15%OFF' },
        { minQuantity: 10, discountType: 'PERCENTAGE', discountValue: 20, label: '10個以上で20%OFF' },
      ],
    };

    res.json(tieredDiscount);
  } catch (error) {
    logger.error('Failed to get tiered discount', error);
    res.status(500).json({ error: '階層型割引の取得に失敗しました' });
  }
});

// ============================================
// 価格計算
// ============================================

router.post('/calculate-price', async (req: Request, res: Response) => {
  try {
    const { items, discountType, discountValue } = req.body;

    // モック計算
    const originalPrice = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + (item.price * item.quantity), 0);

    let bundlePrice = originalPrice;

    if (discountType === 'PERCENTAGE') {
      bundlePrice = originalPrice * (1 - discountValue / 100);
    } else if (discountType === 'FIXED_AMOUNT') {
      bundlePrice = originalPrice - discountValue;
    } else if (discountType === 'FIXED_PRICE') {
      bundlePrice = discountValue;
    }

    const savingsAmount = originalPrice - bundlePrice;
    const savingsPercent = (savingsAmount / originalPrice) * 100;

    res.json({
      originalPrice: Math.round(originalPrice * 100) / 100,
      bundlePrice: Math.round(bundlePrice * 100) / 100,
      savingsAmount: Math.round(savingsAmount * 100) / 100,
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    });
  } catch (error) {
    logger.error('Failed to calculate price', error);
    res.status(500).json({ error: '価格計算に失敗しました' });
  }
});

// ============================================
// eBay同期
// ============================================

router.post('/sync/:bundleId', async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;

    logger.info(`Syncing bundle to eBay: ${bundleId}`);

    res.json({
      message: 'eBayへの同期を開始しました',
      jobId: `sync-bundle-${Date.now()}`,
      bundleId,
      status: 'PROCESSING',
    });
  } catch (error) {
    logger.error('Failed to sync bundle to eBay', error);
    res.status(500).json({ error: 'eBay同期に失敗しました' });
  }
});

// ============================================
// 推奨バンドル
// ============================================

router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.query;

    const suggestions = [
      {
        type: 'CROSS_SELL',
        name: 'おすすめアクセサリーセット',
        items: [
          { listingId: 'lst-100', title: 'Screen Protector', price: 9.99 },
          { listingId: 'lst-101', title: 'Protective Case', price: 19.99 },
          { listingId: 'lst-102', title: 'Charging Cable', price: 14.99 },
        ],
        estimatedDiscount: 15,
        reason: 'よく一緒に購入される商品',
      },
      {
        type: 'QUANTITY',
        name: '3個セット割引',
        items: [
          { listingId: listingId || 'lst-050', title: '同商品', price: 29.99, quantity: 3 },
        ],
        estimatedDiscount: 20,
        reason: 'まとめ買い需要あり',
      },
      {
        type: 'BOGO',
        name: '2つ買うと1つ無料',
        items: [
          { listingId: listingId || 'lst-050', title: '同商品', price: 29.99, quantity: 3 },
        ],
        estimatedDiscount: 33,
        reason: '在庫消化に効果的',
      },
    ];

    res.json({ suggestions });
  } catch (error) {
    logger.error('Failed to get bundle suggestions', error);
    res.status(500).json({ error: '推奨バンドルの取得に失敗しました' });
  }
});

// AI推奨
router.post('/ai-suggestions', async (req: Request, res: Response) => {
  try {
    const { listingIds, targetRevenue, targetMargin } = req.body;

    // AIによる推奨（モック）
    const aiSuggestions = {
      recommendations: [
        {
          name: 'AI推奨: プレミアムセット',
          type: 'FIXED',
          items: listingIds?.slice(0, 3) || [],
          suggestedDiscount: 18,
          estimatedSales: 45,
          estimatedRevenue: 4500,
          confidence: 0.85,
          reasoning: '過去の購入パターンと季節性を分析した結果、このセットが最も効果的と判断',
        },
        {
          name: 'AI推奨: エントリーセット',
          type: 'FIXED',
          items: listingIds?.slice(0, 2) || [],
          suggestedDiscount: 12,
          estimatedSales: 67,
          estimatedRevenue: 3350,
          confidence: 0.78,
          reasoning: '初回購入者向けの低価格セットが効果的',
        },
      ],
      analysisDate: new Date().toISOString(),
    };

    res.json(aiSuggestions);
  } catch (error) {
    logger.error('Failed to get AI suggestions', error);
    res.status(500).json({ error: 'AI推奨の取得に失敗しました' });
  }
});

// ============================================
// 統計
// ============================================

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = {
      overview: {
        totalBundles: 48,
        activeBundles: 32,
        totalItemsInBundles: 156,
        averageItemsPerBundle: 3.25,
      },
      sales: {
        totalSold: 1847,
        totalRevenue: 89450.00,
        totalSavingsGiven: 18920.00,
        averageOrderValue: 48.43,
      },
      byType: {
        FIXED: { count: 15, sold: 456, revenue: 34200 },
        QUANTITY: { count: 12, sold: 389, revenue: 11670 },
        BOGO: { count: 8, sold: 312, revenue: 6240 },
        CROSS_SELL: { count: 6, sold: 278, revenue: 13900 },
        MIX_MATCH: { count: 5, sold: 245, revenue: 17150 },
        TIERED: { count: 2, sold: 167, revenue: 6290 },
      },
      trends: {
        monthly: [
          { month: '2025-09', sold: 120, revenue: 5800 },
          { month: '2025-10', sold: 145, revenue: 7200 },
          { month: '2025-11', sold: 189, revenue: 9450 },
          { month: '2025-12', sold: 234, revenue: 11700 },
          { month: '2026-01', sold: 312, revenue: 15600 },
          { month: '2026-02', sold: 478, revenue: 23900 },
        ],
      },
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get bundle stats', error);
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

// ============================================
// テンプレート
// ============================================

router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'tpl-001',
        name: '商品3点セット',
        type: 'FIXED',
        itemCount: 3,
        discountType: 'PERCENTAGE',
        discountValue: 15,
        description: '関連商品3点のセット販売',
      },
      {
        id: 'tpl-002',
        name: '2つ買うと1つ無料',
        type: 'BOGO',
        itemCount: 1,
        discountType: 'FREE_ITEM',
        discountValue: 1,
        description: 'Buy 2 Get 1 Free プロモーション',
      },
      {
        id: 'tpl-003',
        name: '数量割引（5個〜）',
        type: 'QUANTITY',
        itemCount: 1,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        description: '5個以上のまとめ買いで20%OFF',
      },
      {
        id: 'tpl-004',
        name: 'アクセサリーセット',
        type: 'CROSS_SELL',
        itemCount: 4,
        discountType: 'PERCENTAGE',
        discountValue: 25,
        description: '本体購入時のアクセサリーセット',
      },
      {
        id: 'tpl-005',
        name: '階層型割引',
        type: 'TIERED',
        itemCount: 1,
        discountType: 'PERCENTAGE',
        discountValue: 0,
        description: '購入数に応じた段階的割引',
        tiers: [
          { minQuantity: 2, discountValue: 10 },
          { minQuantity: 5, discountValue: 15 },
          { minQuantity: 10, discountValue: 20 },
        ],
      },
    ];

    res.json({ templates });
  } catch (error) {
    logger.error('Failed to get bundle templates', error);
    res.status(500).json({ error: 'テンプレートの取得に失敗しました' });
  }
});

router.post('/templates/:templateId/apply', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { listingIds, name } = req.body;

    const bundle = {
      id: `bnd-${Date.now()}`,
      name: name || `Bundle from template ${templateId}`,
      templateId,
      items: listingIds,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    logger.info(`Template applied: ${templateId} -> ${bundle.id}`);

    res.status(201).json({
      message: 'テンプレートを適用しました',
      bundle,
    });
  } catch (error) {
    logger.error('Failed to apply template', error);
    res.status(500).json({ error: 'テンプレートの適用に失敗しました' });
  }
});

// ============================================
// 設定
// ============================================

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      defaultDiscountType: 'PERCENTAGE',
      defaultDiscountValue: 10,
      autoEndWhenSoldOut: true,
      notifyOnLowStock: true,
      lowStockThreshold: 5,
      syncToEbayOnCreate: false,
      maxItemsPerBundle: 10,
      allowMixAndMatch: true,
      showSavingsOnListing: true,
      trackInventoryPerBundle: true,
    };

    res.json(settings);
  } catch (error) {
    logger.error('Failed to get bundle settings', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    logger.info('Bundle settings updated');

    res.json({
      message: '設定を更新しました',
      settings,
    });
  } catch (error) {
    logger.error('Failed to update bundle settings', error);
    res.status(500).json({ error: '設定の更新に失敗しました' });
  }
});

export { router as ebayBundlesRouter };

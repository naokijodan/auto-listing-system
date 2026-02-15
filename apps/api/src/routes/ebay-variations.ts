import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@rakuda/logger';

const router = Router();

// ============================================
// 型定義
// ============================================

// バリエーション属性タイプ
const VARIATION_ATTRIBUTES = {
  COLOR: {
    id: 'COLOR',
    name: 'カラー',
    nameEn: 'Color',
    icon: 'palette',
    examples: ['Red', 'Blue', 'Black', 'White', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Gray', 'Navy'],
  },
  SIZE: {
    id: 'SIZE',
    name: 'サイズ',
    nameEn: 'Size',
    icon: 'ruler',
    examples: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'],
  },
  MATERIAL: {
    id: 'MATERIAL',
    name: '素材',
    nameEn: 'Material',
    icon: 'layers',
    examples: ['Cotton', 'Polyester', 'Leather', 'Wool', 'Silk', 'Linen', 'Nylon', 'Denim'],
  },
  STYLE: {
    id: 'STYLE',
    name: 'スタイル',
    nameEn: 'Style',
    icon: 'sparkles',
    examples: ['Casual', 'Formal', 'Sport', 'Vintage', 'Modern', 'Classic'],
  },
  PATTERN: {
    id: 'PATTERN',
    name: 'パターン',
    nameEn: 'Pattern',
    icon: 'grid',
    examples: ['Solid', 'Striped', 'Plaid', 'Floral', 'Polka Dot', 'Geometric', 'Animal Print'],
  },
  LENGTH: {
    id: 'LENGTH',
    name: '長さ',
    nameEn: 'Length',
    icon: 'move-vertical',
    examples: ['Short', 'Regular', 'Long', 'Extra Long', 'Cropped', 'Ankle'],
  },
  WIDTH: {
    id: 'WIDTH',
    name: '幅',
    nameEn: 'Width',
    icon: 'move-horizontal',
    examples: ['Narrow', 'Regular', 'Wide', 'Extra Wide'],
  },
  CAPACITY: {
    id: 'CAPACITY',
    name: '容量',
    nameEn: 'Capacity',
    icon: 'package',
    examples: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
  },
  VOLTAGE: {
    id: 'VOLTAGE',
    name: '電圧',
    nameEn: 'Voltage',
    icon: 'zap',
    examples: ['100V', '110V', '220V', '240V', 'Universal'],
  },
  FLAVOR: {
    id: 'FLAVOR',
    name: 'フレーバー',
    nameEn: 'Flavor',
    icon: 'coffee',
    examples: ['Original', 'Vanilla', 'Chocolate', 'Strawberry', 'Mint', 'Caramel'],
  },
} as const;

// カテゴリ別推奨属性
const CATEGORY_ATTRIBUTES: Record<string, string[]> = {
  'Clothing': ['COLOR', 'SIZE', 'MATERIAL', 'STYLE', 'PATTERN'],
  'Shoes': ['COLOR', 'SIZE', 'WIDTH', 'MATERIAL', 'STYLE'],
  'Electronics': ['COLOR', 'CAPACITY', 'VOLTAGE'],
  'Jewelry': ['COLOR', 'SIZE', 'MATERIAL', 'STYLE'],
  'Bags': ['COLOR', 'SIZE', 'MATERIAL', 'STYLE'],
  'Watches': ['COLOR', 'SIZE', 'MATERIAL', 'STYLE'],
  'Home & Garden': ['COLOR', 'SIZE', 'MATERIAL', 'PATTERN'],
  'Sports': ['COLOR', 'SIZE', 'MATERIAL', 'LENGTH'],
  'Toys': ['COLOR', 'SIZE', 'STYLE'],
  'Food': ['FLAVOR', 'SIZE', 'CAPACITY'],
};

// バリエーションステータス
const VARIATION_STATUS = {
  ACTIVE: { id: 'ACTIVE', name: '有効', color: 'emerald' },
  INACTIVE: { id: 'INACTIVE', name: '無効', color: 'zinc' },
  OUT_OF_STOCK: { id: 'OUT_OF_STOCK', name: '在庫切れ', color: 'red' },
  LOW_STOCK: { id: 'LOW_STOCK', name: '在庫少', color: 'amber' },
} as const;

// ============================================
// バリデーションスキーマ
// ============================================

const variationOptionSchema = z.object({
  value: z.string().min(1),
  displayValue: z.string().optional(),
  priceAdjustment: z.number().default(0),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  images: z.array(z.string()).optional(),
});

const createVariationGroupSchema = z.object({
  listingId: z.string().uuid(),
  name: z.string().min(1),
  attributes: z.array(z.object({
    type: z.string(),
    options: z.array(variationOptionSchema),
  })).min(1).max(3),
  basePrice: z.number().positive(),
  baseSku: z.string().optional(),
  generateCombinations: z.boolean().default(true),
});

const updateVariationSchema = z.object({
  price: z.number().positive().optional(),
  quantity: z.number().int().min(0).optional(),
  sku: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  images: z.array(z.string()).optional(),
});

const bulkUpdateSchema = z.object({
  variationIds: z.array(z.string().uuid()),
  updates: z.object({
    priceAdjustment: z.number().optional(),
    priceAdjustmentType: z.enum(['fixed', 'percent']).optional(),
    quantityAdjustment: z.number().int().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

const importVariationsSchema = z.object({
  listingId: z.string().uuid(),
  variations: z.array(z.object({
    attributes: z.record(z.string()),
    price: z.number().positive(),
    quantity: z.number().int().min(0),
    sku: z.string().optional(),
  })),
});

// ============================================
// ダッシュボード
// ============================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    // モックデータ
    const dashboard = {
      summary: {
        totalGroups: 156,
        totalVariations: 2847,
        activeVariations: 2534,
        outOfStockVariations: 89,
        lowStockVariations: 224,
        totalInventoryValue: 458920.50,
      },
      topSellingVariations: [
        {
          id: 'var-001',
          listingTitle: 'Vintage Denim Jacket',
          attributes: { Color: 'Blue', Size: 'M' },
          soldCount: 145,
          revenue: 14500.00,
        },
        {
          id: 'var-002',
          listingTitle: 'Leather Crossbody Bag',
          attributes: { Color: 'Black' },
          soldCount: 98,
          revenue: 9800.00,
        },
        {
          id: 'var-003',
          listingTitle: 'Cotton T-Shirt',
          attributes: { Color: 'White', Size: 'L' },
          soldCount: 87,
          revenue: 2610.00,
        },
        {
          id: 'var-004',
          listingTitle: 'Running Shoes',
          attributes: { Color: 'Gray', Size: '10' },
          soldCount: 76,
          revenue: 7600.00,
        },
        {
          id: 'var-005',
          listingTitle: 'Wool Sweater',
          attributes: { Color: 'Navy', Size: 'XL' },
          soldCount: 65,
          revenue: 5200.00,
        },
      ],
      stockAlerts: [
        {
          id: 'var-010',
          listingTitle: 'Silk Scarf',
          attributes: { Color: 'Red', Pattern: 'Floral' },
          quantity: 2,
          status: 'LOW_STOCK',
        },
        {
          id: 'var-011',
          listingTitle: 'Canvas Sneakers',
          attributes: { Color: 'White', Size: '9' },
          quantity: 0,
          status: 'OUT_OF_STOCK',
        },
        {
          id: 'var-012',
          listingTitle: 'Linen Shirt',
          attributes: { Color: 'Blue', Size: 'S' },
          quantity: 3,
          status: 'LOW_STOCK',
        },
      ],
      attributeDistribution: [
        { attribute: 'Color', count: 2340, percentage: 82.2 },
        { attribute: 'Size', count: 1980, percentage: 69.5 },
        { attribute: 'Material', count: 567, percentage: 19.9 },
        { attribute: 'Style', count: 234, percentage: 8.2 },
        { attribute: 'Pattern', count: 189, percentage: 6.6 },
      ],
      recentActivity: [
        {
          type: 'VARIATION_SOLD',
          listingTitle: 'Vintage Denim Jacket',
          attributes: { Color: 'Blue', Size: 'L' },
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          type: 'LOW_STOCK_ALERT',
          listingTitle: 'Silk Scarf',
          attributes: { Color: 'Red' },
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          type: 'VARIATION_CREATED',
          listingTitle: 'New Arrival Dress',
          attributes: { Color: 'Pink', Size: 'M' },
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ],
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get variations dashboard', error);
    res.status(500).json({ error: 'ダッシュボードの取得に失敗しました' });
  }
});

// ============================================
// 属性タイプ
// ============================================

router.get('/attributes', async (_req: Request, res: Response) => {
  try {
    res.json({
      attributes: Object.values(VARIATION_ATTRIBUTES),
      categoryRecommendations: CATEGORY_ATTRIBUTES,
    });
  } catch (error) {
    logger.error('Failed to get variation attributes', error);
    res.status(500).json({ error: '属性の取得に失敗しました' });
  }
});

// カテゴリ別推奨属性取得
router.get('/attributes/recommended', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'カテゴリが必要です' });
    }

    const recommendedIds = CATEGORY_ATTRIBUTES[category] || ['COLOR', 'SIZE'];
    const recommended = recommendedIds.map(id => VARIATION_ATTRIBUTES[id as keyof typeof VARIATION_ATTRIBUTES]).filter(Boolean);

    res.json({ category, recommended });
  } catch (error) {
    logger.error('Failed to get recommended attributes', error);
    res.status(500).json({ error: '推奨属性の取得に失敗しました' });
  }
});

// ============================================
// バリエーショングループCRUD
// ============================================

// グループ一覧
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status, hasLowStock } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // モックデータ
    const groups = [
      {
        id: 'grp-001',
        listingId: 'lst-001',
        listingTitle: 'Vintage Denim Jacket',
        name: 'Size & Color Variations',
        attributes: [
          { type: 'COLOR', optionCount: 5 },
          { type: 'SIZE', optionCount: 4 },
        ],
        variationCount: 20,
        activeCount: 18,
        outOfStockCount: 2,
        totalQuantity: 156,
        basePrice: 89.99,
        priceRange: { min: 89.99, max: 109.99 },
        status: 'ACTIVE',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-02-14T15:30:00Z',
      },
      {
        id: 'grp-002',
        listingId: 'lst-002',
        listingTitle: 'Leather Crossbody Bag',
        name: 'Color Variations',
        attributes: [
          { type: 'COLOR', optionCount: 8 },
        ],
        variationCount: 8,
        activeCount: 7,
        outOfStockCount: 1,
        totalQuantity: 89,
        basePrice: 129.99,
        priceRange: { min: 129.99, max: 149.99 },
        status: 'ACTIVE',
        createdAt: '2026-01-20T14:00:00Z',
        updatedAt: '2026-02-13T09:15:00Z',
      },
      {
        id: 'grp-003',
        listingId: 'lst-003',
        listingTitle: 'Cotton T-Shirt',
        name: 'Full Variations',
        attributes: [
          { type: 'COLOR', optionCount: 10 },
          { type: 'SIZE', optionCount: 6 },
        ],
        variationCount: 60,
        activeCount: 52,
        outOfStockCount: 8,
        totalQuantity: 420,
        basePrice: 29.99,
        priceRange: { min: 29.99, max: 34.99 },
        status: 'ACTIVE',
        createdAt: '2026-02-01T08:00:00Z',
        updatedAt: '2026-02-14T18:00:00Z',
      },
    ];

    res.json({
      groups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 156,
        totalPages: Math.ceil(156 / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to get variation groups', error);
    res.status(500).json({ error: 'グループ一覧の取得に失敗しました' });
  }
});

// グループ作成
router.post('/groups', async (req: Request, res: Response) => {
  try {
    const validated = createVariationGroupSchema.parse(req.body);

    // バリエーションの組み合わせを生成
    let combinations: Array<Record<string, string>> = [{}];

    if (validated.generateCombinations) {
      for (const attr of validated.attributes) {
        const newCombinations: Array<Record<string, string>> = [];
        for (const combo of combinations) {
          for (const option of attr.options) {
            newCombinations.push({
              ...combo,
              [attr.type]: option.value,
            });
          }
        }
        combinations = newCombinations;
      }
    }

    const group = {
      id: `grp-${Date.now()}`,
      listingId: validated.listingId,
      name: validated.name,
      attributes: validated.attributes.map(attr => ({
        type: attr.type,
        options: attr.options,
      })),
      basePrice: validated.basePrice,
      baseSku: validated.baseSku,
      variationCount: combinations.length,
      variations: combinations.map((combo, index) => ({
        id: `var-${Date.now()}-${index}`,
        attributes: combo,
        price: validated.basePrice,
        quantity: 0,
        sku: validated.baseSku ? `${validated.baseSku}-${index + 1}` : undefined,
        status: 'ACTIVE',
      })),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    logger.info(`Variation group created: ${group.id} with ${group.variationCount} variations`);

    res.status(201).json({
      message: 'バリエーショングループを作成しました',
      group,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to create variation group', error);
    res.status(500).json({ error: 'グループの作成に失敗しました' });
  }
});

// グループ詳細
router.get('/groups/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    // モックデータ
    const group = {
      id: groupId,
      listingId: 'lst-001',
      listingTitle: 'Vintage Denim Jacket',
      listingImage: 'https://example.com/images/jacket-main.jpg',
      name: 'Size & Color Variations',
      attributes: [
        {
          type: 'COLOR',
          name: 'Color',
          options: [
            { value: 'Blue', displayValue: 'ブルー', count: 4 },
            { value: 'Black', displayValue: 'ブラック', count: 4 },
            { value: 'Brown', displayValue: 'ブラウン', count: 4 },
            { value: 'Gray', displayValue: 'グレー', count: 4 },
            { value: 'Navy', displayValue: 'ネイビー', count: 4 },
          ],
        },
        {
          type: 'SIZE',
          name: 'Size',
          options: [
            { value: 'S', displayValue: 'Small', count: 5 },
            { value: 'M', displayValue: 'Medium', count: 5 },
            { value: 'L', displayValue: 'Large', count: 5 },
            { value: 'XL', displayValue: 'Extra Large', count: 5 },
          ],
        },
      ],
      basePrice: 89.99,
      baseSku: 'VDJ-2026',
      variations: [
        { id: 'var-001', attributes: { Color: 'Blue', Size: 'S' }, price: 89.99, quantity: 8, sku: 'VDJ-2026-BL-S', status: 'ACTIVE', soldCount: 12 },
        { id: 'var-002', attributes: { Color: 'Blue', Size: 'M' }, price: 89.99, quantity: 5, sku: 'VDJ-2026-BL-M', status: 'ACTIVE', soldCount: 45 },
        { id: 'var-003', attributes: { Color: 'Blue', Size: 'L' }, price: 89.99, quantity: 3, sku: 'VDJ-2026-BL-L', status: 'LOW_STOCK', soldCount: 38 },
        { id: 'var-004', attributes: { Color: 'Blue', Size: 'XL' }, price: 94.99, quantity: 10, sku: 'VDJ-2026-BL-XL', status: 'ACTIVE', soldCount: 22 },
        { id: 'var-005', attributes: { Color: 'Black', Size: 'S' }, price: 89.99, quantity: 12, sku: 'VDJ-2026-BK-S', status: 'ACTIVE', soldCount: 8 },
        { id: 'var-006', attributes: { Color: 'Black', Size: 'M' }, price: 89.99, quantity: 0, sku: 'VDJ-2026-BK-M', status: 'OUT_OF_STOCK', soldCount: 52 },
        { id: 'var-007', attributes: { Color: 'Black', Size: 'L' }, price: 89.99, quantity: 7, sku: 'VDJ-2026-BK-L', status: 'ACTIVE', soldCount: 35 },
        { id: 'var-008', attributes: { Color: 'Black', Size: 'XL' }, price: 94.99, quantity: 15, sku: 'VDJ-2026-BK-XL', status: 'ACTIVE', soldCount: 18 },
      ],
      summary: {
        variationCount: 20,
        activeCount: 18,
        outOfStockCount: 1,
        lowStockCount: 1,
        totalQuantity: 156,
        totalSold: 280,
        totalRevenue: 25200.00,
        averagePrice: 91.49,
        priceRange: { min: 89.99, max: 109.99 },
      },
      status: 'ACTIVE',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-02-14T15:30:00Z',
    };

    res.json(group);
  } catch (error) {
    logger.error('Failed to get variation group', error);
    res.status(500).json({ error: 'グループ詳細の取得に失敗しました' });
  }
});

// グループ更新
router.put('/groups/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { name, status } = req.body;

    logger.info(`Variation group updated: ${groupId}`);

    res.json({
      message: 'グループを更新しました',
      group: {
        id: groupId,
        name,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to update variation group', error);
    res.status(500).json({ error: 'グループの更新に失敗しました' });
  }
});

// グループ削除
router.delete('/groups/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    logger.info(`Variation group deleted: ${groupId}`);

    res.json({ message: 'グループを削除しました' });
  } catch (error) {
    logger.error('Failed to delete variation group', error);
    res.status(500).json({ error: 'グループの削除に失敗しました' });
  }
});

// ============================================
// 個別バリエーションCRUD
// ============================================

// バリエーション一覧
router.get('/variations', async (req: Request, res: Response) => {
  try {
    const { groupId, status, lowStock, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // モックデータ
    const variations = [
      { id: 'var-001', groupId: 'grp-001', listingTitle: 'Vintage Denim Jacket', attributes: { Color: 'Blue', Size: 'M' }, price: 89.99, quantity: 12, sku: 'VDJ-BL-M', status: 'ACTIVE', soldCount: 45 },
      { id: 'var-002', groupId: 'grp-001', listingTitle: 'Vintage Denim Jacket', attributes: { Color: 'Black', Size: 'L' }, price: 89.99, quantity: 0, sku: 'VDJ-BK-L', status: 'OUT_OF_STOCK', soldCount: 32 },
      { id: 'var-003', groupId: 'grp-002', listingTitle: 'Leather Crossbody Bag', attributes: { Color: 'Brown' }, price: 129.99, quantity: 8, sku: 'LCB-BR', status: 'ACTIVE', soldCount: 28 },
      { id: 'var-004', groupId: 'grp-003', listingTitle: 'Cotton T-Shirt', attributes: { Color: 'White', Size: 'XL' }, price: 29.99, quantity: 3, sku: 'CTS-WH-XL', status: 'LOW_STOCK', soldCount: 67 },
    ];

    res.json({
      variations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 2847,
        totalPages: Math.ceil(2847 / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to get variations', error);
    res.status(500).json({ error: 'バリエーション一覧の取得に失敗しました' });
  }
});

// バリエーション更新
router.put('/variations/:variationId', async (req: Request, res: Response) => {
  try {
    const { variationId } = req.params;
    const validated = updateVariationSchema.parse(req.body);

    logger.info(`Variation updated: ${variationId}`);

    res.json({
      message: 'バリエーションを更新しました',
      variation: {
        id: variationId,
        ...validated,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to update variation', error);
    res.status(500).json({ error: 'バリエーションの更新に失敗しました' });
  }
});

// バリエーション削除
router.delete('/variations/:variationId', async (req: Request, res: Response) => {
  try {
    const { variationId } = req.params;

    logger.info(`Variation deleted: ${variationId}`);

    res.json({ message: 'バリエーションを削除しました' });
  } catch (error) {
    logger.error('Failed to delete variation', error);
    res.status(500).json({ error: 'バリエーションの削除に失敗しました' });
  }
});

// ============================================
// 一括操作
// ============================================

// 一括更新
router.post('/bulk-update', async (req: Request, res: Response) => {
  try {
    const validated = bulkUpdateSchema.parse(req.body);

    logger.info(`Bulk update variations: ${validated.variationIds.length} items`);

    res.json({
      message: `${validated.variationIds.length}件のバリエーションを更新しました`,
      updatedCount: validated.variationIds.length,
      failedCount: 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to bulk update variations', error);
    res.status(500).json({ error: '一括更新に失敗しました' });
  }
});

// 一括価格調整
router.post('/bulk-price-adjust', async (req: Request, res: Response) => {
  try {
    const { groupId, adjustmentType, adjustmentValue, applyTo } = req.body;

    logger.info(`Bulk price adjust for group: ${groupId}, type: ${adjustmentType}, value: ${adjustmentValue}`);

    res.json({
      message: '価格を一括調整しました',
      adjustedCount: 20,
      newPriceRange: { min: 94.99, max: 114.99 },
    });
  } catch (error) {
    logger.error('Failed to bulk adjust prices', error);
    res.status(500).json({ error: '価格一括調整に失敗しました' });
  }
});

// 一括在庫更新
router.post('/bulk-inventory-update', async (req: Request, res: Response) => {
  try {
    const { groupId, updates } = req.body;

    // updates: Array<{ variationId: string, quantity: number }>

    logger.info(`Bulk inventory update for group: ${groupId}`);

    res.json({
      message: '在庫を一括更新しました',
      updatedCount: updates?.length || 0,
    });
  } catch (error) {
    logger.error('Failed to bulk update inventory', error);
    res.status(500).json({ error: '在庫一括更新に失敗しました' });
  }
});

// ============================================
// インポート/エクスポート
// ============================================

// CSVインポート
router.post('/import', async (req: Request, res: Response) => {
  try {
    const validated = importVariationsSchema.parse(req.body);

    logger.info(`Import variations for listing: ${validated.listingId}, count: ${validated.variations.length}`);

    res.json({
      message: `${validated.variations.length}件のバリエーションをインポートしました`,
      importedCount: validated.variations.length,
      skippedCount: 0,
      errors: [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to import variations', error);
    res.status(500).json({ error: 'インポートに失敗しました' });
  }
});

// CSVエクスポート
router.get('/export/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { format = 'csv' } = req.query;

    // モックCSVデータ
    const csvContent = `SKU,Color,Size,Price,Quantity,Status
VDJ-BL-S,Blue,S,89.99,8,ACTIVE
VDJ-BL-M,Blue,M,89.99,5,ACTIVE
VDJ-BL-L,Blue,L,89.99,3,LOW_STOCK
VDJ-BL-XL,Blue,XL,94.99,10,ACTIVE
VDJ-BK-S,Black,S,89.99,12,ACTIVE
VDJ-BK-M,Black,M,89.99,0,OUT_OF_STOCK`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=variations-${groupId}.csv`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Failed to export variations', error);
    res.status(500).json({ error: 'エクスポートに失敗しました' });
  }
});

// ============================================
// eBay同期
// ============================================

// eBayに同期
router.post('/sync/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    logger.info(`Syncing variations to eBay for group: ${groupId}`);

    // 実際のeBay API呼び出しをシミュレート
    res.json({
      message: 'eBayへの同期を開始しました',
      jobId: `sync-${Date.now()}`,
      groupId,
      status: 'PROCESSING',
    });
  } catch (error) {
    logger.error('Failed to sync variations to eBay', error);
    res.status(500).json({ error: 'eBay同期に失敗しました' });
  }
});

// eBayから取得
router.post('/fetch/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;

    logger.info(`Fetching variations from eBay for listing: ${listingId}`);

    // モックデータ（eBayから取得したバリエーション）
    const fetchedVariations = {
      listingId,
      variations: [
        { attributes: { Color: 'Blue', Size: 'M' }, price: 89.99, quantity: 5, ebayVariationId: 'ebay-var-001' },
        { attributes: { Color: 'Black', Size: 'L' }, price: 89.99, quantity: 3, ebayVariationId: 'ebay-var-002' },
      ],
      fetchedAt: new Date().toISOString(),
    };

    res.json({
      message: 'eBayからバリエーションを取得しました',
      ...fetchedVariations,
    });
  } catch (error) {
    logger.error('Failed to fetch variations from eBay', error);
    res.status(500).json({ error: 'eBayからの取得に失敗しました' });
  }
});

// ============================================
// 在庫マトリックス
// ============================================

router.get('/matrix/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    // 在庫マトリックス（2属性の場合）
    const matrix = {
      groupId,
      rowAttribute: 'Size',
      columnAttribute: 'Color',
      rows: ['S', 'M', 'L', 'XL'],
      columns: ['Blue', 'Black', 'Brown', 'Gray', 'Navy'],
      cells: [
        // S行
        [
          { variationId: 'var-001', quantity: 8, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-005', quantity: 12, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-009', quantity: 6, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-013', quantity: 4, price: 89.99, status: 'LOW_STOCK' },
          { variationId: 'var-017', quantity: 9, price: 89.99, status: 'ACTIVE' },
        ],
        // M行
        [
          { variationId: 'var-002', quantity: 5, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-006', quantity: 0, price: 89.99, status: 'OUT_OF_STOCK' },
          { variationId: 'var-010', quantity: 8, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-014', quantity: 7, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-018', quantity: 11, price: 89.99, status: 'ACTIVE' },
        ],
        // L行
        [
          { variationId: 'var-003', quantity: 3, price: 89.99, status: 'LOW_STOCK' },
          { variationId: 'var-007', quantity: 7, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-011', quantity: 5, price: 89.99, status: 'ACTIVE' },
          { variationId: 'var-015', quantity: 2, price: 89.99, status: 'LOW_STOCK' },
          { variationId: 'var-019', quantity: 6, price: 89.99, status: 'ACTIVE' },
        ],
        // XL行
        [
          { variationId: 'var-004', quantity: 10, price: 94.99, status: 'ACTIVE' },
          { variationId: 'var-008', quantity: 15, price: 94.99, status: 'ACTIVE' },
          { variationId: 'var-012', quantity: 9, price: 94.99, status: 'ACTIVE' },
          { variationId: 'var-016', quantity: 8, price: 94.99, status: 'ACTIVE' },
          { variationId: 'var-020', quantity: 12, price: 94.99, status: 'ACTIVE' },
        ],
      ],
      totals: {
        byRow: [39, 31, 23, 54],
        byColumn: [26, 34, 28, 21, 38],
        total: 147,
      },
    };

    res.json(matrix);
  } catch (error) {
    logger.error('Failed to get variation matrix', error);
    res.status(500).json({ error: 'マトリックスの取得に失敗しました' });
  }
});

// ============================================
// 統計
// ============================================

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = {
      overview: {
        totalGroups: 156,
        totalVariations: 2847,
        totalInventory: 12450,
        totalValue: 458920.50,
      },
      byStatus: {
        active: 2534,
        inactive: 89,
        outOfStock: 135,
        lowStock: 89,
      },
      byAttribute: {
        color: { count: 2340, topValues: ['Black', 'Blue', 'White', 'Red', 'Gray'] },
        size: { count: 1980, topValues: ['M', 'L', 'S', 'XL', 'XXL'] },
        material: { count: 567, topValues: ['Cotton', 'Polyester', 'Leather'] },
      },
      performance: {
        topSelling: [
          { attributes: { Color: 'Black', Size: 'M' }, soldCount: 523 },
          { attributes: { Color: 'Blue', Size: 'L' }, soldCount: 467 },
          { attributes: { Color: 'White', Size: 'M' }, soldCount: 412 },
        ],
        lowPerforming: [
          { attributes: { Color: 'Yellow', Size: 'XXL' }, soldCount: 3 },
          { attributes: { Color: 'Orange', Size: 'XS' }, soldCount: 5 },
        ],
      },
      trends: {
        daily: [
          { date: '2026-02-08', sold: 45, revenue: 4050 },
          { date: '2026-02-09', sold: 52, revenue: 4680 },
          { date: '2026-02-10', sold: 38, revenue: 3420 },
          { date: '2026-02-11', sold: 61, revenue: 5490 },
          { date: '2026-02-12', sold: 55, revenue: 4950 },
          { date: '2026-02-13', sold: 48, revenue: 4320 },
          { date: '2026-02-14', sold: 67, revenue: 6030 },
        ],
      },
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get variation stats', error);
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

// ============================================
// 設定
// ============================================

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      lowStockThreshold: 5,
      autoDeactivateOutOfStock: true,
      syncToEbayOnUpdate: false,
      defaultSkuFormat: '{BASE}-{COLOR}-{SIZE}',
      allowNegativeInventory: false,
      trackInventoryHistory: true,
      notifyOnLowStock: true,
      notifyOnOutOfStock: true,
      maxVariationsPerListing: 250,
      maxAttributesPerVariation: 3,
    };

    res.json(settings);
  } catch (error) {
    logger.error('Failed to get variation settings', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    logger.info('Variation settings updated');

    res.json({
      message: '設定を更新しました',
      settings,
    });
  } catch (error) {
    logger.error('Failed to update variation settings', error);
    res.status(500).json({ error: '設定の更新に失敗しました' });
  }
});

export { router as ebayVariationsRouter };

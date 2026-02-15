import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

// カテゴリレベル
const CATEGORY_LEVELS = {
  L1: 'L1', // 大カテゴリ
  L2: 'L2', // 中カテゴリ
  L3: 'L3', // 小カテゴリ
  L4: 'L4', // 詳細カテゴリ
  L5: 'L5', // 最小カテゴリ
} as const;

// マッピングソース
const MAPPING_SOURCES = {
  YAHOO_AUCTION: 'YAHOO_AUCTION',
  MERCARI: 'MERCARI',
  AMAZON_JP: 'AMAZON_JP',
  RAKUTEN: 'RAKUTEN',
  CUSTOM: 'CUSTOM',
} as const;

// マッピングステータス
const MAPPING_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  DEPRECATED: 'DEPRECATED',
} as const;

// Item Specifics タイプ
const SPECIFICS_TYPES = {
  REQUIRED: 'REQUIRED',
  RECOMMENDED: 'RECOMMENDED',
  OPTIONAL: 'OPTIONAL',
} as const;

// 値タイプ
const VALUE_TYPES = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  DATE: 'DATE',
} as const;

// ============================================
// モックデータ
// ============================================

// eBayカテゴリツリー
const mockCategoryTree: Record<string, any> = {
  'cat-1': {
    id: 'cat-1',
    categoryId: '11450',
    name: 'Clothing, Shoes & Accessories',
    nameJa: '衣類・靴・アクセサリー',
    level: 'L1',
    parentId: null,
    path: ['Clothing, Shoes & Accessories'],
    pathIds: ['11450'],
    isLeaf: false,
    listingsCount: 15420,
    children: ['cat-1-1', 'cat-1-2', 'cat-1-3'],
  },
  'cat-1-1': {
    id: 'cat-1-1',
    categoryId: '15724',
    name: 'Women\'s Clothing',
    nameJa: 'レディース',
    level: 'L2',
    parentId: 'cat-1',
    path: ['Clothing, Shoes & Accessories', 'Women\'s Clothing'],
    pathIds: ['11450', '15724'],
    isLeaf: false,
    listingsCount: 8520,
    children: ['cat-1-1-1', 'cat-1-1-2'],
  },
  'cat-1-1-1': {
    id: 'cat-1-1-1',
    categoryId: '63869',
    name: 'Dresses',
    nameJa: 'ドレス・ワンピース',
    level: 'L3',
    parentId: 'cat-1-1',
    path: ['Clothing, Shoes & Accessories', 'Women\'s Clothing', 'Dresses'],
    pathIds: ['11450', '15724', '63869'],
    isLeaf: true,
    listingsCount: 2340,
    children: [],
  },
  'cat-1-1-2': {
    id: 'cat-1-1-2',
    categoryId: '63863',
    name: 'Tops',
    nameJa: 'トップス',
    level: 'L3',
    parentId: 'cat-1-1',
    path: ['Clothing, Shoes & Accessories', 'Women\'s Clothing', 'Tops'],
    pathIds: ['11450', '15724', '63863'],
    isLeaf: true,
    listingsCount: 3120,
    children: [],
  },
  'cat-2': {
    id: 'cat-2',
    categoryId: '550',
    name: 'Art',
    nameJa: 'アート・美術品',
    level: 'L1',
    parentId: null,
    path: ['Art'],
    pathIds: ['550'],
    isLeaf: false,
    listingsCount: 5230,
    children: ['cat-2-1', 'cat-2-2'],
  },
  'cat-2-1': {
    id: 'cat-2-1',
    categoryId: '360',
    name: 'Paintings',
    nameJa: '絵画',
    level: 'L2',
    parentId: 'cat-2',
    path: ['Art', 'Paintings'],
    pathIds: ['550', '360'],
    isLeaf: true,
    listingsCount: 2100,
    children: [],
  },
  'cat-3': {
    id: 'cat-3',
    categoryId: '625',
    name: 'Cameras & Photo',
    nameJa: 'カメラ・写真',
    level: 'L1',
    parentId: null,
    path: ['Cameras & Photo'],
    pathIds: ['625'],
    isLeaf: false,
    listingsCount: 12500,
    children: ['cat-3-1', 'cat-3-2', 'cat-3-3'],
  },
  'cat-3-1': {
    id: 'cat-3-1',
    categoryId: '31388',
    name: 'Digital Cameras',
    nameJa: 'デジタルカメラ',
    level: 'L2',
    parentId: 'cat-3',
    path: ['Cameras & Photo', 'Digital Cameras'],
    pathIds: ['625', '31388'],
    isLeaf: true,
    listingsCount: 4200,
    children: [],
  },
  'cat-3-2': {
    id: 'cat-3-2',
    categoryId: '69323',
    name: 'Lenses & Filters',
    nameJa: 'レンズ・フィルター',
    level: 'L2',
    parentId: 'cat-3',
    path: ['Cameras & Photo', 'Lenses & Filters'],
    pathIds: ['625', '69323'],
    isLeaf: true,
    listingsCount: 3800,
    children: [],
  },
  'cat-4': {
    id: 'cat-4',
    categoryId: '293',
    name: 'Consumer Electronics',
    nameJa: '家電・AV機器',
    level: 'L1',
    parentId: null,
    path: ['Consumer Electronics'],
    pathIds: ['293'],
    isLeaf: false,
    listingsCount: 28400,
    children: [],
  },
  'cat-5': {
    id: 'cat-5',
    categoryId: '260324',
    name: 'Watches',
    nameJa: '腕時計',
    level: 'L1',
    parentId: null,
    path: ['Watches'],
    pathIds: ['260324'],
    isLeaf: false,
    listingsCount: 18200,
    children: ['cat-5-1', 'cat-5-2'],
  },
  'cat-5-1': {
    id: 'cat-5-1',
    categoryId: '31387',
    name: 'Wristwatches',
    nameJa: '腕時計',
    level: 'L2',
    parentId: 'cat-5',
    path: ['Watches', 'Wristwatches'],
    pathIds: ['260324', '31387'],
    isLeaf: true,
    listingsCount: 15200,
    children: [],
  },
};

// カテゴリマッピングルール
const mockMappingRules: Record<string, any> = {
  'rule-1': {
    id: 'rule-1',
    name: 'ヤフオク レディース → eBay Women\'s Clothing',
    source: 'YAHOO_AUCTION',
    sourceCategory: 'レディースファッション',
    sourceCategoryId: '2084223223',
    targetCategoryId: 'cat-1-1',
    targetCategoryName: 'Women\'s Clothing',
    confidence: 0.95,
    status: 'ACTIVE',
    matchCount: 1523,
    lastUsed: '2026-02-15T10:30:00Z',
    createdAt: '2026-01-15T00:00:00Z',
    createdBy: 'system',
    keywords: ['レディース', 'ワンピース', 'ドレス', 'スカート'],
    excludeKeywords: ['メンズ', 'キッズ'],
  },
  'rule-2': {
    id: 'rule-2',
    name: 'メルカリ カメラ → eBay Digital Cameras',
    source: 'MERCARI',
    sourceCategory: 'カメラ',
    sourceCategoryId: 'mercari-camera',
    targetCategoryId: 'cat-3-1',
    targetCategoryName: 'Digital Cameras',
    confidence: 0.92,
    status: 'ACTIVE',
    matchCount: 892,
    lastUsed: '2026-02-15T09:15:00Z',
    createdAt: '2026-01-20T00:00:00Z',
    createdBy: 'system',
    keywords: ['デジカメ', 'ミラーレス', '一眼レフ', 'Canon', 'Sony', 'Nikon'],
    excludeKeywords: ['フィルム', 'トイカメラ'],
  },
  'rule-3': {
    id: 'rule-3',
    name: 'ヤフオク 腕時計 → eBay Wristwatches',
    source: 'YAHOO_AUCTION',
    sourceCategory: '腕時計',
    sourceCategoryId: '2084024030',
    targetCategoryId: 'cat-5-1',
    targetCategoryName: 'Wristwatches',
    confidence: 0.98,
    status: 'ACTIVE',
    matchCount: 3421,
    lastUsed: '2026-02-15T11:00:00Z',
    createdAt: '2026-01-10T00:00:00Z',
    createdBy: 'system',
    keywords: ['時計', 'ウォッチ', 'Rolex', 'Omega', 'Seiko', 'Casio'],
    excludeKeywords: ['置時計', '壁掛け'],
  },
  'rule-4': {
    id: 'rule-4',
    name: 'Amazon JP レンズ → eBay Lenses & Filters',
    source: 'AMAZON_JP',
    sourceCategory: 'カメラ用交換レンズ',
    sourceCategoryId: 'B00005OKPU',
    targetCategoryId: 'cat-3-2',
    targetCategoryName: 'Lenses & Filters',
    confidence: 0.96,
    status: 'ACTIVE',
    matchCount: 567,
    lastUsed: '2026-02-14T16:30:00Z',
    createdAt: '2026-02-01T00:00:00Z',
    createdBy: 'user',
    keywords: ['レンズ', '交換レンズ', '単焦点', 'ズーム', 'マクロ'],
    excludeKeywords: ['コンタクト', 'メガネ'],
  },
};

// Item Specifics 定義
const mockItemSpecifics: Record<string, any[]> = {
  'cat-5-1': [ // Wristwatches
    {
      id: 'spec-1',
      name: 'Brand',
      nameJa: 'ブランド',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['Rolex', 'Omega', 'Seiko', 'Casio', 'Citizen', 'TAG Heuer', 'Cartier', 'Other'],
      description: 'Watch brand name',
    },
    {
      id: 'spec-2',
      name: 'Model',
      nameJa: 'モデル',
      type: 'RECOMMENDED',
      valueType: 'TEXT',
      values: [],
      description: 'Model name or number',
    },
    {
      id: 'spec-3',
      name: 'Movement',
      nameJa: 'ムーブメント',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['Mechanical (Automatic)', 'Mechanical (Manual)', 'Quartz', 'Solar', 'Kinetic'],
      description: 'Type of watch movement',
    },
    {
      id: 'spec-4',
      name: 'Case Material',
      nameJa: 'ケース素材',
      type: 'RECOMMENDED',
      valueType: 'SELECT',
      values: ['Stainless Steel', 'Gold', 'Titanium', 'Ceramic', 'Plastic', 'Other'],
      description: 'Material of watch case',
    },
    {
      id: 'spec-5',
      name: 'Case Size',
      nameJa: 'ケースサイズ',
      type: 'RECOMMENDED',
      valueType: 'TEXT',
      values: [],
      description: 'Case diameter in mm',
    },
    {
      id: 'spec-6',
      name: 'Water Resistance',
      nameJa: '防水性',
      type: 'OPTIONAL',
      valueType: 'SELECT',
      values: ['Not Water Resistant', '30m', '50m', '100m', '200m', '300m+'],
      description: 'Water resistance rating',
    },
    {
      id: 'spec-7',
      name: 'Year Manufactured',
      nameJa: '製造年',
      type: 'OPTIONAL',
      valueType: 'TEXT',
      values: [],
      description: 'Year the watch was manufactured',
    },
  ],
  'cat-3-1': [ // Digital Cameras
    {
      id: 'spec-10',
      name: 'Brand',
      nameJa: 'ブランド',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['Canon', 'Sony', 'Nikon', 'Fujifilm', 'Panasonic', 'Olympus', 'Leica', 'Other'],
      description: 'Camera brand',
    },
    {
      id: 'spec-11',
      name: 'Model',
      nameJa: 'モデル',
      type: 'REQUIRED',
      valueType: 'TEXT',
      values: [],
      description: 'Model name',
    },
    {
      id: 'spec-12',
      name: 'Type',
      nameJa: 'タイプ',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['Mirrorless', 'DSLR', 'Compact', 'Medium Format', 'Action Camera'],
      description: 'Camera type',
    },
    {
      id: 'spec-13',
      name: 'Megapixels',
      nameJa: '画素数',
      type: 'RECOMMENDED',
      valueType: 'TEXT',
      values: [],
      description: 'Sensor resolution in megapixels',
    },
    {
      id: 'spec-14',
      name: 'Sensor Format',
      nameJa: 'センサーサイズ',
      type: 'RECOMMENDED',
      valueType: 'SELECT',
      values: ['Full Frame', 'APS-C', 'Micro Four Thirds', '1"', 'Other'],
      description: 'Image sensor size',
    },
  ],
  'cat-1-1-1': [ // Dresses
    {
      id: 'spec-20',
      name: 'Brand',
      nameJa: 'ブランド',
      type: 'RECOMMENDED',
      valueType: 'TEXT',
      values: [],
      description: 'Brand name',
    },
    {
      id: 'spec-21',
      name: 'Size',
      nameJa: 'サイズ',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Plus Size'],
      description: 'Dress size',
    },
    {
      id: 'spec-22',
      name: 'Color',
      nameJa: 'カラー',
      type: 'REQUIRED',
      valueType: 'SELECT',
      values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Yellow', 'Multicolor', 'Other'],
      description: 'Main color',
    },
    {
      id: 'spec-23',
      name: 'Material',
      nameJa: '素材',
      type: 'RECOMMENDED',
      valueType: 'MULTI_SELECT',
      values: ['Cotton', 'Polyester', 'Silk', 'Linen', 'Wool', 'Lace', 'Other'],
      description: 'Fabric material',
    },
    {
      id: 'spec-24',
      name: 'Style',
      nameJa: 'スタイル',
      type: 'RECOMMENDED',
      valueType: 'SELECT',
      values: ['Casual', 'Formal', 'Party', 'Maxi', 'Mini', 'Midi', 'Other'],
      description: 'Dress style',
    },
  ],
};

// AI推薦履歴
const mockAiSuggestions: any[] = [
  {
    id: 'sug-1',
    productId: 'prod-001',
    productTitle: 'SEIKO プレサージュ 自動巻き メンズ腕時計',
    suggestedCategories: [
      { categoryId: 'cat-5-1', categoryName: 'Wristwatches', confidence: 0.98 },
      { categoryId: 'cat-5', categoryName: 'Watches', confidence: 0.85 },
    ],
    selectedCategoryId: 'cat-5-1',
    status: 'ACCEPTED',
    createdAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'sug-2',
    productId: 'prod-002',
    productTitle: 'Canon EOS R5 ミラーレスカメラ ボディ',
    suggestedCategories: [
      { categoryId: 'cat-3-1', categoryName: 'Digital Cameras', confidence: 0.96 },
      { categoryId: 'cat-3', categoryName: 'Cameras & Photo', confidence: 0.88 },
    ],
    selectedCategoryId: 'cat-3-1',
    status: 'ACCEPTED',
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    id: 'sug-3',
    productId: 'prod-003',
    productTitle: 'ヴィンテージ レースワンピース 黒',
    suggestedCategories: [
      { categoryId: 'cat-1-1-1', categoryName: 'Dresses', confidence: 0.94 },
      { categoryId: 'cat-1-1', categoryName: 'Women\'s Clothing', confidence: 0.82 },
    ],
    selectedCategoryId: null,
    status: 'PENDING',
    createdAt: '2026-02-15T11:15:00Z',
  },
];

// 統計データ
const mockStats = {
  totalMappings: 127,
  activeMappings: 115,
  totalCategories: 1842,
  leafCategories: 1456,
  mappingsBySource: {
    YAHOO_AUCTION: 52,
    MERCARI: 38,
    AMAZON_JP: 25,
    RAKUTEN: 8,
    CUSTOM: 4,
  },
  aiSuggestionStats: {
    total: 3421,
    accepted: 3102,
    rejected: 187,
    pending: 132,
    accuracy: 94.5,
  },
  topCategories: [
    { categoryId: 'cat-5-1', name: 'Wristwatches', count: 3421 },
    { categoryId: 'cat-3-1', name: 'Digital Cameras', count: 2156 },
    { categoryId: 'cat-1-1-1', name: 'Dresses', count: 1823 },
    { categoryId: 'cat-3-2', name: 'Lenses & Filters', count: 1245 },
    { categoryId: 'cat-1-1-2', name: 'Tops', count: 987 },
  ],
  recentActivity: {
    mappingsCreated: 12,
    mappingsUpdated: 8,
    suggestionsProcessed: 156,
  },
};

// ============================================
// バリデーションスキーマ
// ============================================

const searchCategoriesSchema = z.object({
  query: z.string().optional(),
  parentId: z.string().optional(),
  level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
  isLeaf: z.string().optional(),
});

const createMappingSchema = z.object({
  name: z.string().min(1),
  source: z.enum(['YAHOO_AUCTION', 'MERCARI', 'AMAZON_JP', 'RAKUTEN', 'CUSTOM']),
  sourceCategory: z.string().min(1),
  sourceCategoryId: z.string().min(1),
  targetCategoryId: z.string().min(1),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
});

const updateMappingSchema = z.object({
  name: z.string().optional(),
  targetCategoryId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_REVIEW', 'DEPRECATED']).optional(),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
});

const suggestCategorySchema = z.object({
  productTitle: z.string().min(1),
  productDescription: z.string().optional(),
  sourceCategory: z.string().optional(),
  sourcePlatform: z.enum(['YAHOO_AUCTION', 'MERCARI', 'AMAZON_JP', 'RAKUTEN', 'CUSTOM']).optional(),
  keywords: z.array(z.string()).optional(),
});

const bulkSuggestSchema = z.object({
  products: z.array(z.object({
    productId: z.string(),
    productTitle: z.string(),
    productDescription: z.string().optional(),
    sourceCategory: z.string().optional(),
    sourcePlatform: z.enum(['YAHOO_AUCTION', 'MERCARI', 'AMAZON_JP', 'RAKUTEN', 'CUSTOM']).optional(),
  })).min(1).max(100),
});

const acceptSuggestionSchema = z.object({
  suggestionId: z.string(),
  categoryId: z.string(),
});

// ============================================
// エンドポイント
// ============================================

// ダッシュボード取得
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      stats: mockStats,
      recentMappings: Object.values(mockMappingRules).slice(0, 5),
      pendingSuggestions: mockAiSuggestions.filter(s => s.status === 'PENDING'),
      topCategories: mockStats.topCategories,
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// カテゴリツリー取得
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const validation = searchCategoriesSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { query, parentId, level, isLeaf } = validation.data;
    let categories = Object.values(mockCategoryTree);

    // フィルタリング
    if (query) {
      const q = query.toLowerCase();
      categories = categories.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.nameJa.toLowerCase().includes(q)
      );
    }

    if (parentId) {
      categories = categories.filter(c => c.parentId === parentId);
    }

    if (level) {
      categories = categories.filter(c => c.level === level);
    }

    if (isLeaf !== undefined) {
      const leafValue = isLeaf === 'true';
      categories = categories.filter(c => c.isLeaf === leafValue);
    }

    res.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// カテゴリ詳細取得
router.get('/categories/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const category = mockCategoryTree[categoryId];

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // 子カテゴリを取得
    const children = category.children.map((childId: string) => mockCategoryTree[childId]).filter(Boolean);

    // Item Specificsを取得
    const itemSpecifics = mockItemSpecifics[categoryId] || [];

    res.json({
      ...category,
      childrenDetails: children,
      itemSpecifics,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category details' });
  }
});

// カテゴリパス取得（パンくず用）
router.get('/categories/:categoryId/path', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const category = mockCategoryTree[categoryId];

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // パスを構築
    const path: any[] = [];
    let currentId = categoryId;

    while (currentId) {
      const cat = mockCategoryTree[currentId];
      if (cat) {
        path.unshift({
          id: cat.id,
          categoryId: cat.categoryId,
          name: cat.name,
          nameJa: cat.nameJa,
          level: cat.level,
        });
        currentId = cat.parentId;
      } else {
        break;
      }
    }

    res.json({ path });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category path' });
  }
});

// Item Specifics取得
router.get('/categories/:categoryId/specifics', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const specifics = mockItemSpecifics[categoryId] || [];

    res.json({
      categoryId,
      specifics,
      requiredCount: specifics.filter((s: any) => s.type === 'REQUIRED').length,
      recommendedCount: specifics.filter((s: any) => s.type === 'RECOMMENDED').length,
      optionalCount: specifics.filter((s: any) => s.type === 'OPTIONAL').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item specifics' });
  }
});

// マッピングルール一覧取得
router.get('/mappings', async (req: Request, res: Response) => {
  try {
    const { source, status, search } = req.query;
    let mappings = Object.values(mockMappingRules);

    if (source) {
      mappings = mappings.filter(m => m.source === source);
    }

    if (status) {
      mappings = mappings.filter(m => m.status === status);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      mappings = mappings.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.sourceCategory.toLowerCase().includes(q) ||
        m.targetCategoryName.toLowerCase().includes(q)
      );
    }

    res.json({
      mappings,
      total: mappings.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// マッピングルール作成
router.post('/mappings', async (req: Request, res: Response) => {
  try {
    const validation = createMappingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;
    const targetCategory = mockCategoryTree[data.targetCategoryId];

    if (!targetCategory) {
      return res.status(400).json({ error: 'Target category not found' });
    }

    const newMapping = {
      id: `rule-${Date.now()}`,
      ...data,
      targetCategoryName: targetCategory.name,
      confidence: 1.0, // 手動作成は信頼度100%
      status: 'ACTIVE',
      matchCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
    };

    mockMappingRules[newMapping.id] = newMapping;

    res.status(201).json(newMapping);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

// マッピングルール詳細取得
router.get('/mappings/:mappingId', async (req: Request, res: Response) => {
  try {
    const { mappingId } = req.params;
    const mapping = mockMappingRules[mappingId];

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const targetCategory = mockCategoryTree[mapping.targetCategoryId];

    res.json({
      ...mapping,
      targetCategory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mapping' });
  }
});

// マッピングルール更新
router.put('/mappings/:mappingId', async (req: Request, res: Response) => {
  try {
    const { mappingId } = req.params;
    const mapping = mockMappingRules[mappingId];

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const validation = updateMappingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const updates = validation.data;

    if (updates.targetCategoryId) {
      const targetCategory = mockCategoryTree[updates.targetCategoryId];
      if (!targetCategory) {
        return res.status(400).json({ error: 'Target category not found' });
      }
      updates.targetCategoryName = targetCategory.name;
    }

    const updatedMapping = {
      ...mapping,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    mockMappingRules[mappingId] = updatedMapping;

    res.json(updatedMapping);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

// マッピングルール削除
router.delete('/mappings/:mappingId', async (req: Request, res: Response) => {
  try {
    const { mappingId } = req.params;

    if (!mockMappingRules[mappingId]) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    delete mockMappingRules[mappingId];

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// AI カテゴリ推薦
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const validation = suggestCategorySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { productTitle, productDescription, sourceCategory, sourcePlatform, keywords } = validation.data;

    // AIによるカテゴリ推薦（モック）
    const suggestions: any[] = [];
    const titleLower = productTitle.toLowerCase();

    // キーワードベースの推薦ロジック
    if (titleLower.includes('時計') || titleLower.includes('watch') ||
        titleLower.includes('seiko') || titleLower.includes('rolex') ||
        titleLower.includes('omega') || titleLower.includes('casio')) {
      suggestions.push({
        categoryId: 'cat-5-1',
        categoryName: 'Wristwatches',
        categoryPath: ['Watches', 'Wristwatches'],
        confidence: 0.95,
        reason: 'Title contains watch-related keywords',
      });
    }

    if (titleLower.includes('カメラ') || titleLower.includes('camera') ||
        titleLower.includes('canon') || titleLower.includes('sony') ||
        titleLower.includes('nikon') || titleLower.includes('fuji')) {
      suggestions.push({
        categoryId: 'cat-3-1',
        categoryName: 'Digital Cameras',
        categoryPath: ['Cameras & Photo', 'Digital Cameras'],
        confidence: 0.92,
        reason: 'Title contains camera-related keywords',
      });
    }

    if (titleLower.includes('レンズ') || titleLower.includes('lens')) {
      suggestions.push({
        categoryId: 'cat-3-2',
        categoryName: 'Lenses & Filters',
        categoryPath: ['Cameras & Photo', 'Lenses & Filters'],
        confidence: 0.90,
        reason: 'Title contains lens-related keywords',
      });
    }

    if (titleLower.includes('ワンピース') || titleLower.includes('ドレス') ||
        titleLower.includes('dress')) {
      suggestions.push({
        categoryId: 'cat-1-1-1',
        categoryName: 'Dresses',
        categoryPath: ['Clothing, Shoes & Accessories', 'Women\'s Clothing', 'Dresses'],
        confidence: 0.88,
        reason: 'Title contains dress-related keywords',
      });
    }

    // マッピングルールとの照合
    for (const rule of Object.values(mockMappingRules)) {
      if (sourcePlatform && rule.source === sourcePlatform) {
        const matchedKeyword = rule.keywords.find((kw: string) =>
          titleLower.includes(kw.toLowerCase())
        );
        const excludedKeyword = rule.excludeKeywords?.find((kw: string) =>
          titleLower.includes(kw.toLowerCase())
        );

        if (matchedKeyword && !excludedKeyword) {
          const existing = suggestions.find(s => s.categoryId === rule.targetCategoryId);
          if (!existing) {
            suggestions.push({
              categoryId: rule.targetCategoryId,
              categoryName: rule.targetCategoryName,
              categoryPath: mockCategoryTree[rule.targetCategoryId]?.path || [],
              confidence: rule.confidence * 0.9,
              reason: `Matched mapping rule: ${rule.name}`,
              mappingRuleId: rule.id,
            });
          }
        }
      }
    }

    // 信頼度でソート
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // 推薦結果を保存
    const suggestionRecord = {
      id: `sug-${Date.now()}`,
      productTitle,
      productDescription,
      sourceCategory,
      sourcePlatform,
      keywords,
      suggestions: suggestions.slice(0, 5),
      createdAt: new Date().toISOString(),
    };

    res.json({
      suggestions: suggestions.slice(0, 5),
      record: suggestionRecord,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suggest category' });
  }
});

// 一括カテゴリ推薦
router.post('/suggest-bulk', async (req: Request, res: Response) => {
  try {
    const validation = bulkSuggestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { products } = validation.data;
    const results: any[] = [];

    for (const product of products) {
      const titleLower = product.productTitle.toLowerCase();
      const suggestions: any[] = [];

      // 簡易的なカテゴリ推薦
      if (titleLower.includes('時計') || titleLower.includes('watch')) {
        suggestions.push({
          categoryId: 'cat-5-1',
          categoryName: 'Wristwatches',
          confidence: 0.95,
        });
      } else if (titleLower.includes('カメラ') || titleLower.includes('camera')) {
        suggestions.push({
          categoryId: 'cat-3-1',
          categoryName: 'Digital Cameras',
          confidence: 0.92,
        });
      } else if (titleLower.includes('ドレス') || titleLower.includes('dress')) {
        suggestions.push({
          categoryId: 'cat-1-1-1',
          categoryName: 'Dresses',
          confidence: 0.88,
        });
      }

      results.push({
        productId: product.productId,
        productTitle: product.productTitle,
        suggestions: suggestions.slice(0, 3),
        status: suggestions.length > 0 ? 'SUGGESTED' : 'NO_MATCH',
      });
    }

    res.json({
      results,
      processed: results.length,
      suggested: results.filter(r => r.status === 'SUGGESTED').length,
      noMatch: results.filter(r => r.status === 'NO_MATCH').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bulk suggestions' });
  }
});

// AI推薦履歴取得
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;
    let suggestions = [...mockAiSuggestions];

    if (status) {
      suggestions = suggestions.filter(s => s.status === status);
    }

    suggestions = suggestions.slice(0, parseInt(limit as string));

    res.json({
      suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// AI推薦を承認
router.post('/suggestions/:suggestionId/accept', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { categoryId } = req.body;

    const suggestionIndex = mockAiSuggestions.findIndex(s => s.id === suggestionId);
    if (suggestionIndex === -1) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    mockAiSuggestions[suggestionIndex] = {
      ...mockAiSuggestions[suggestionIndex],
      selectedCategoryId: categoryId,
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
    };

    res.json(mockAiSuggestions[suggestionIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept suggestion' });
  }
});

// AI推薦を却下
router.post('/suggestions/:suggestionId/reject', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { reason } = req.body;

    const suggestionIndex = mockAiSuggestions.findIndex(s => s.id === suggestionId);
    if (suggestionIndex === -1) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    mockAiSuggestions[suggestionIndex] = {
      ...mockAiSuggestions[suggestionIndex],
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    };

    res.json(mockAiSuggestions[suggestionIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

// カテゴリツリー同期（eBay APIから取得）
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    // 実際にはeBay APIからカテゴリツリーを取得
    const syncResult = {
      success: true,
      categoriesUpdated: 156,
      categoriesAdded: 23,
      categoriesRemoved: 5,
      specificsSynced: 89,
      syncedAt: new Date().toISOString(),
      nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    res.json(syncResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync categories' });
  }
});

// 統計情報取得
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    res.json(mockStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      autoSuggestEnabled: true,
      suggestConfidenceThreshold: 0.85,
      autoAcceptThreshold: 0.95,
      preferLeafCategories: true,
      defaultSource: 'YAHOO_AUCTION',
      syncInterval: 24, // hours
      lastSyncAt: '2026-02-15T06:00:00Z',
      notifyOnLowConfidence: true,
      lowConfidenceThreshold: 0.7,
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = {
      autoSuggestEnabled: updates.autoSuggestEnabled ?? true,
      suggestConfidenceThreshold: updates.suggestConfidenceThreshold ?? 0.85,
      autoAcceptThreshold: updates.autoAcceptThreshold ?? 0.95,
      preferLeafCategories: updates.preferLeafCategories ?? true,
      defaultSource: updates.defaultSource ?? 'YAHOO_AUCTION',
      syncInterval: updates.syncInterval ?? 24,
      notifyOnLowConfidence: updates.notifyOnLowConfidence ?? true,
      lowConfidenceThreshold: updates.lowConfidenceThreshold ?? 0.7,
      updatedAt: new Date().toISOString(),
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export const ebayCategoryMappingRouter = router;

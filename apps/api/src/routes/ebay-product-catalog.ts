import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// Phase 186: Product Catalog（商品カタログ）
// ========================================

// ----------------------------------------
// ダッシュボード
// ----------------------------------------

// カタログダッシュボード取得
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalProducts: 4580,
      activeProducts: 3920,
      draftProducts: 450,
      archivedProducts: 210,
      lastUpdated: new Date().toISOString(),
    },
    categories: {
      total: 156,
      topLevel: 12,
      withProducts: 142,
    },
    attributes: {
      total: 245,
      required: 45,
      custom: 120,
    },
    recentActivity: [
      { type: 'product_created', productId: 'PROD-4580', title: '新商品A', date: new Date().toISOString() },
      { type: 'product_updated', productId: 'PROD-4579', title: '商品B更新', date: new Date(Date.now() - 3600000).toISOString() },
      { type: 'category_created', categoryId: 'CAT-156', name: '新カテゴリ', date: new Date(Date.now() - 7200000).toISOString() },
    ],
    healthScore: {
      overall: 92,
      completeness: 95,
      imageQuality: 88,
      seoScore: 90,
    },
    trends: {
      productsAdded7d: 45,
      productsUpdated7d: 120,
      productsArchived7d: 8,
    },
  };
  res.json(dashboard);
});

// ----------------------------------------
// 商品管理
// ----------------------------------------

// 商品一覧
router.get('/products', async (req, res) => {
  const { category, status, search, page = 1, limit = 20 } = req.query;
  const products = Array.from({ length: 20 }, (_, i) => ({
    id: `PROD-${4000 + i}`,
    sku: `SKU-${5000 + i}`,
    title: `商品 ${i + 1}`,
    titleEn: `Product ${i + 1}`,
    description: `商品${i + 1}の説明文です。`,
    category: {
      id: `CAT-${100 + (i % 12)}`,
      name: ['Electronics', 'Clothing', 'Home', 'Sports', 'Toys'][i % 5],
      path: ['Root', 'Category', 'Subcategory'],
    },
    brand: ['Sony', 'Apple', 'Samsung', 'Nike', 'Adidas'][i % 5],
    price: {
      cost: 25.00 + i * 2,
      retail: 49.99 + i * 3,
      wholesale: 35.00 + i * 2.5,
    },
    inventory: {
      quantity: 50 + i * 5,
      reserved: i * 2,
      available: 50 + i * 5 - i * 2,
    },
    images: {
      primary: `https://example.com/images/prod-${i + 1}-1.jpg`,
      gallery: [`https://example.com/images/prod-${i + 1}-2.jpg`],
      count: 3 + (i % 5),
    },
    status: ['active', 'draft', 'archived'][i % 10 < 8 ? 0 : i % 10 < 9 ? 1 : 2],
    completeness: 75 + (i % 25),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
  }));
  res.json({
    products,
    total: 4580,
    page: Number(page),
    pageSize: Number(limit),
    filters: { category, status, search },
  });
});

// 商品詳細
router.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const product = {
    id: productId,
    sku: 'SKU-5001',
    title: 'プレミアム商品',
    titleEn: 'Premium Product',
    description: '高品質なプレミアム商品です。',
    descriptionEn: 'High quality premium product.',
    category: {
      id: 'CAT-101',
      name: 'Electronics',
      path: ['Root', 'Electronics', 'Accessories'],
    },
    brand: 'Premium Brand',
    manufacturer: 'Premium Manufacturer Inc.',
    mpn: 'MPN-12345',
    upc: '012345678901',
    ean: '0012345678901',
    price: {
      cost: 25.00,
      retail: 49.99,
      wholesale: 35.00,
      map: 45.00,
      msrp: 59.99,
    },
    dimensions: {
      weight: 0.5,
      weightUnit: 'kg',
      length: 20,
      width: 15,
      height: 10,
      dimensionUnit: 'cm',
    },
    inventory: {
      quantity: 150,
      reserved: 12,
      available: 138,
      reorderPoint: 20,
      reorderQuantity: 50,
    },
    images: {
      primary: 'https://example.com/images/premium-1.jpg',
      gallery: [
        'https://example.com/images/premium-2.jpg',
        'https://example.com/images/premium-3.jpg',
        'https://example.com/images/premium-4.jpg',
      ],
    },
    attributes: [
      { name: 'Color', value: 'Black', type: 'select' },
      { name: 'Material', value: 'Aluminum', type: 'select' },
      { name: 'Warranty', value: '2 Years', type: 'text' },
    ],
    variations: [
      { id: 'VAR-1', sku: 'SKU-5001-BLK', attributes: { Color: 'Black' }, price: 49.99, quantity: 50 },
      { id: 'VAR-2', sku: 'SKU-5001-WHT', attributes: { Color: 'White' }, price: 49.99, quantity: 50 },
      { id: 'VAR-3', sku: 'SKU-5001-SLV', attributes: { Color: 'Silver' }, price: 54.99, quantity: 50 },
    ],
    seo: {
      metaTitle: 'Premium Product - Best Quality',
      metaDescription: 'Shop our premium product with best quality and fast shipping.',
      keywords: ['premium', 'quality', 'product'],
    },
    status: 'active',
    completeness: 95,
    listings: [
      { marketplace: 'eBay', listingId: 'EBAY-123', status: 'active' },
      { marketplace: 'Amazon', listingId: 'AMZN-456', status: 'active' },
    ],
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-16T08:00:00Z',
  };
  res.json(product);
});

// 商品作成
const productSchema = z.object({
  sku: z.string(),
  title: z.string(),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string(),
  brand: z.string().optional(),
  price: z.object({
    cost: z.number().optional(),
    retail: z.number(),
  }),
  status: z.enum(['active', 'draft']).default('draft'),
});

router.post('/products', async (req, res) => {
  const body = productSchema.parse(req.body);
  res.status(201).json({
    id: `PROD-${Date.now()}`,
    ...body,
    completeness: 60,
    createdAt: new Date().toISOString(),
  });
});

// 商品更新
router.put('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const body = req.body;
  res.json({
    id: productId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// 商品削除（アーカイブ）
router.delete('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  res.json({ success: true, productId, status: 'archived' });
});

// 商品一括操作
const bulkProductSchema = z.object({
  productIds: z.array(z.string()),
  action: z.enum(['activate', 'draft', 'archive', 'delete']),
});

router.post('/products/bulk', async (req, res) => {
  const body = bulkProductSchema.parse(req.body);
  res.json({
    processed: body.productIds.length,
    action: body.action,
    success: true,
  });
});

// 商品複製
router.post('/products/:productId/duplicate', async (req, res) => {
  const { productId } = req.params;
  res.json({
    originalId: productId,
    newId: `PROD-${Date.now()}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// カテゴリ管理
// ----------------------------------------

// カテゴリ一覧（ツリー）
router.get('/categories', async (req, res) => {
  const categories = [
    {
      id: 'CAT-1',
      name: 'Electronics',
      slug: 'electronics',
      productCount: 850,
      children: [
        { id: 'CAT-1-1', name: 'Smartphones', slug: 'smartphones', productCount: 320, children: [] },
        { id: 'CAT-1-2', name: 'Accessories', slug: 'accessories', productCount: 530, children: [] },
      ],
    },
    {
      id: 'CAT-2',
      name: 'Clothing',
      slug: 'clothing',
      productCount: 1200,
      children: [
        { id: 'CAT-2-1', name: 'Men', slug: 'men', productCount: 600, children: [] },
        { id: 'CAT-2-2', name: 'Women', slug: 'women', productCount: 600, children: [] },
      ],
    },
    {
      id: 'CAT-3',
      name: 'Home & Garden',
      slug: 'home-garden',
      productCount: 680,
      children: [],
    },
  ];
  res.json({ categories, total: 156 });
});

// カテゴリ詳細
router.get('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const category = {
    id: categoryId,
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    parentId: null,
    path: ['Electronics'],
    productCount: 850,
    attributes: [
      { id: 'ATTR-1', name: 'Brand', required: true },
      { id: 'ATTR-2', name: 'Model', required: false },
      { id: 'ATTR-3', name: 'Color', required: true },
    ],
    ebayCategory: { id: '175672', name: 'Consumer Electronics' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z',
  };
  res.json(category);
});

// カテゴリ作成
const categorySchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  parentId: z.string().nullable().optional(),
  description: z.string().optional(),
});

router.post('/categories', async (req, res) => {
  const body = categorySchema.parse(req.body);
  res.status(201).json({
    id: `CAT-${Date.now()}`,
    ...body,
    productCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// カテゴリ更新
router.put('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const body = req.body;
  res.json({
    id: categoryId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// カテゴリ削除
router.delete('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  res.json({ success: true, deletedId: categoryId });
});

// カテゴリマッピング（eBay）
router.get('/categories/:categoryId/mappings', async (req, res) => {
  const { categoryId } = req.params;
  const mappings = [
    { marketplace: 'eBay', categoryId: '175672', categoryName: 'Consumer Electronics', path: ['All Categories', 'Electronics'] },
    { marketplace: 'Amazon', categoryId: 'ELEC-001', categoryName: 'Electronics', path: ['Electronics'] },
  ];
  res.json({ categoryId, mappings });
});

router.put('/categories/:categoryId/mappings', async (req, res) => {
  const { categoryId } = req.params;
  const { mappings } = req.body;
  res.json({ categoryId, mappings, updatedAt: new Date().toISOString() });
});

// ----------------------------------------
// 属性管理
// ----------------------------------------

// 属性一覧
router.get('/attributes', async (req, res) => {
  const { categoryId, type } = req.query;
  const attributes = Array.from({ length: 20 }, (_, i) => ({
    id: `ATTR-${1000 + i}`,
    name: ['Color', 'Size', 'Material', 'Brand', 'Weight', 'Model', 'Style', 'Pattern'][i % 8],
    type: ['select', 'text', 'number', 'multiselect'][i % 4],
    required: i % 3 === 0,
    options: i % 4 === 0 ? ['Red', 'Blue', 'Green', 'Black', 'White'] : null,
    categories: [`CAT-${100 + (i % 5)}`],
    usageCount: 50 + i * 10,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  res.json({
    attributes,
    total: 245,
    filters: { categoryId, type },
  });
});

// 属性詳細
router.get('/attributes/:attributeId', async (req, res) => {
  const { attributeId } = req.params;
  const attribute = {
    id: attributeId,
    name: 'Color',
    type: 'select',
    required: true,
    options: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Orange', 'Purple'],
    defaultValue: null,
    validation: {
      minLength: null,
      maxLength: null,
      pattern: null,
    },
    categories: ['CAT-1', 'CAT-2', 'CAT-3'],
    ebayMapping: { aspectName: 'Color', required: true },
    usageCount: 1250,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-02-10T15:00:00Z',
  };
  res.json(attribute);
});

// 属性作成
const attributeSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'boolean', 'date']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

router.post('/attributes', async (req, res) => {
  const body = attributeSchema.parse(req.body);
  res.status(201).json({
    id: `ATTR-${Date.now()}`,
    ...body,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// 属性更新
router.put('/attributes/:attributeId', async (req, res) => {
  const { attributeId } = req.params;
  const body = req.body;
  res.json({
    id: attributeId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// 属性削除
router.delete('/attributes/:attributeId', async (req, res) => {
  const { attributeId } = req.params;
  res.json({ success: true, deletedId: attributeId });
});

// ----------------------------------------
// 画像管理
// ----------------------------------------

// 画像一覧
router.get('/images', async (req, res) => {
  const { productId, unused } = req.query;
  const images = Array.from({ length: 20 }, (_, i) => ({
    id: `IMG-${1000 + i}`,
    url: `https://example.com/images/img-${i + 1}.jpg`,
    filename: `img-${i + 1}.jpg`,
    size: 125000 + i * 10000,
    width: 1200,
    height: 1200,
    productId: productId || (i % 3 === 0 ? null : `PROD-${4000 + i}`),
    isPrimary: i % 5 === 0,
    sortOrder: i,
    uploadedAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  res.json({
    images,
    total: 5680,
    filters: { productId, unused },
  });
});

// 画像アップロード
router.post('/images/upload', async (req, res) => {
  res.json({
    id: `IMG-${Date.now()}`,
    url: 'https://example.com/images/new-image.jpg',
    filename: 'new-image.jpg',
    size: 150000,
    width: 1200,
    height: 1200,
    uploadedAt: new Date().toISOString(),
  });
});

// 画像削除
router.delete('/images/:imageId', async (req, res) => {
  const { imageId } = req.params;
  res.json({ success: true, deletedId: imageId });
});

// 未使用画像クリーンアップ
router.post('/images/cleanup', async (req, res) => {
  res.json({
    deleted: 45,
    freedSpace: 5600000,
    completedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// インポート/エクスポート
// ----------------------------------------

// エクスポート開始
router.post('/export', async (req, res) => {
  const { format, filters } = req.body;
  res.json({
    exportId: `EXP-${Date.now()}`,
    format: format || 'csv',
    status: 'processing',
    filters,
    estimatedTime: '2 minutes',
    createdAt: new Date().toISOString(),
  });
});

// エクスポート状態確認
router.get('/export/:exportId', async (req, res) => {
  const { exportId } = req.params;
  res.json({
    exportId,
    status: 'completed',
    downloadUrl: `/downloads/${exportId}.csv`,
    recordCount: 4580,
    completedAt: new Date().toISOString(),
  });
});

// インポート開始
router.post('/import', async (req, res) => {
  const { fileUrl, mapping, updateExisting } = req.body;
  res.json({
    importId: `IMP-${Date.now()}`,
    status: 'processing',
    fileUrl,
    mapping,
    updateExisting: updateExisting || false,
    createdAt: new Date().toISOString(),
  });
});

// インポート状態確認
router.get('/import/:importId', async (req, res) => {
  const { importId } = req.params;
  res.json({
    importId,
    status: 'completed',
    totalRows: 500,
    created: 450,
    updated: 30,
    skipped: 15,
    errors: 5,
    errorDetails: [
      { row: 125, field: 'sku', error: 'Duplicate SKU' },
      { row: 256, field: 'price', error: 'Invalid price format' },
    ],
    completedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 設定
// ----------------------------------------

// カタログ設定取得
router.get('/settings', async (_req, res) => {
  const settings = {
    general: {
      defaultStatus: 'draft',
      autoGenerateSku: true,
      skuPrefix: 'SKU-',
      requireImages: true,
      minImages: 1,
    },
    attributes: {
      requireBrand: true,
      requireCategory: true,
      autoMapToEbay: true,
    },
    images: {
      maxSize: 5000000,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      autoResize: true,
      targetWidth: 1200,
      targetHeight: 1200,
    },
    validation: {
      requireDescription: true,
      minDescriptionLength: 50,
      requirePrice: true,
      validateBarcodes: true,
    },
  };
  res.json(settings);
});

// カタログ設定更新
router.put('/settings', async (req, res) => {
  const settings = req.body;
  res.json({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayProductCatalogRouter = router;

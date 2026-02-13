import { Hono } from 'hono';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// ========================================
// スキーマ定義
// ========================================

const createSavedSearchSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCT', 'ORDER', 'LISTING', 'CUSTOMER', 'SHIPMENT', 'SUPPLIER', 'INVENTORY']),
  filters: z.record(z.any()).default({}),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  columns: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isShared: z.boolean().default(false),
  shareWith: z.array(z.string()).default([]),
});

const searchQuerySchema = z.object({
  entityType: z.enum(['PRODUCT', 'ORDER', 'LISTING', 'CUSTOMER', 'SHIPMENT', 'SUPPLIER', 'INVENTORY']),
  query: z.string().optional(),
  filters: z.record(z.any()).default({}),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const createFilterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCT', 'ORDER', 'LISTING', 'CUSTOMER', 'SHIPMENT', 'SUPPLIER', 'INVENTORY']),
  fieldName: z.string().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'ENUM', 'ARRAY', 'JSON']),
  operator: z.enum([
    'EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH',
    'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN_OR_EQUALS',
    'BETWEEN', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL', 'REGEX'
  ]),
  values: z.array(z.any()).default([]),
});

// ========================================
// 統計情報
// ========================================

app.get('/stats', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';

  const [
    totalSavedSearches,
    sharedSearches,
    totalFilters,
    recentSearches,
    searchHistoryCount,
  ] = await Promise.all([
    prisma.savedSearch.count({ where: { organizationId, userId } }),
    prisma.savedSearch.count({ where: { organizationId, isShared: true } }),
    prisma.advancedFilter.count({ where: { organizationId, isActive: true } }),
    prisma.searchHistory.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.searchHistory.count({
      where: {
        organizationId,
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // エンティティ別検索数
  const searchesByEntity = await prisma.searchHistory.groupBy({
    by: ['entityType'],
    where: { organizationId },
    _count: true,
    orderBy: { _count: { entityType: 'desc' } },
  });

  return c.json({
    savedSearches: {
      total: totalSavedSearches,
      shared: sharedSearches,
    },
    filters: {
      active: totalFilters,
    },
    searchHistory: {
      last24Hours: searchHistoryCount,
      recent: recentSearches,
      byEntity: searchesByEntity,
    },
  });
});

// ========================================
// 検索実行
// ========================================

app.post('/search', zValidator('json', searchQuerySchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const data = c.req.valid('json');
  const startTime = Date.now();

  let results: any[] = [];
  let total = 0;
  const skip = (data.page - 1) * data.limit;

  // エンティティ別検索
  switch (data.entityType) {
    case 'PRODUCT':
      const productWhere = buildProductWhere(data.filters, data.query);
      [results, total] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          orderBy: data.sortBy ? { [data.sortBy]: data.sortOrder } : { createdAt: 'desc' },
          skip,
          take: data.limit,
          include: {
            source: true,
            listings: { take: 1 },
          },
        }),
        prisma.product.count({ where: productWhere }),
      ]);
      break;

    case 'ORDER':
      const orderWhere = buildOrderWhere(data.filters, data.query);
      [results, total] = await Promise.all([
        prisma.order.findMany({
          where: orderWhere,
          orderBy: data.sortBy ? { [data.sortBy]: data.sortOrder } : { createdAt: 'desc' },
          skip,
          take: data.limit,
        }),
        prisma.order.count({ where: orderWhere }),
      ]);
      break;

    case 'LISTING':
      const listingWhere = buildListingWhere(data.filters, data.query);
      [results, total] = await Promise.all([
        prisma.listing.findMany({
          where: listingWhere,
          orderBy: data.sortBy ? { [data.sortBy]: data.sortOrder } : { createdAt: 'desc' },
          skip,
          take: data.limit,
          include: {
            product: true,
          },
        }),
        prisma.listing.count({ where: listingWhere }),
      ]);
      break;

    case 'SHIPMENT':
      const shipmentWhere = buildShipmentWhere(data.filters, data.query);
      [results, total] = await Promise.all([
        prisma.shipment.findMany({
          where: shipmentWhere,
          orderBy: data.sortBy ? { [data.sortBy]: data.sortOrder } : { createdAt: 'desc' },
          skip,
          take: data.limit,
        }),
        prisma.shipment.count({ where: shipmentWhere }),
      ]);
      break;

    default:
      return c.json({ error: 'Unsupported entity type' }, 400);
  }

  const executionTime = Date.now() - startTime;

  // 検索履歴を記録
  await prisma.searchHistory.create({
    data: {
      organizationId,
      userId,
      entityType: data.entityType,
      query: data.query || '',
      filters: data.filters,
      resultCount: total,
      executionTimeMs: executionTime,
    },
  });

  // サジェスト更新（非同期）
  if (data.query) {
    updateSearchSuggestions(organizationId, data.entityType, 'query', data.query).catch(() => {});
  }

  return c.json({
    results,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      pages: Math.ceil(total / data.limit),
    },
    meta: {
      executionTimeMs: executionTime,
      entityType: data.entityType,
    },
  });
});

// ========================================
// 保存済み検索
// ========================================

app.get('/saved', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const { entityType, includeShared } = c.req.query();

  const where: any = {
    OR: [
      { organizationId, userId },
      ...(includeShared === 'true' ? [{ organizationId, isShared: true }] : []),
    ],
  };
  if (entityType) where.entityType = entityType;

  const searches = await prisma.savedSearch.findMany({
    where,
    orderBy: [
      { isDefault: 'desc' },
      { usageCount: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return c.json({ searches });
});

app.post('/saved', zValidator('json', createSavedSearchSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const data = c.req.valid('json');

  // デフォルトを設定する場合、既存のデフォルトを解除
  if (data.isDefault) {
    await prisma.savedSearch.updateMany({
      where: { organizationId, userId, entityType: data.entityType, isDefault: true },
      data: { isDefault: false },
    });
  }

  const search = await prisma.savedSearch.create({
    data: {
      ...data,
      organizationId,
      userId,
    },
  });

  return c.json({ search }, 201);
});

app.get('/saved/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const search = await prisma.savedSearch.findFirst({
    where: { id, organizationId },
  });

  if (!search) {
    return c.json({ error: 'Search not found' }, 404);
  }

  return c.json({ search });
});

app.put('/saved/:id', zValidator('json', createSavedSearchSchema.partial()), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const search = await prisma.savedSearch.update({
    where: { id },
    data,
  });

  return c.json({ search });
});

app.delete('/saved/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  await prisma.savedSearch.delete({
    where: { id },
  });

  return c.json({ success: true });
});

app.post('/saved/:id/use', async (c) => {
  const { id } = c.req.param();

  const search = await prisma.savedSearch.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return c.json({ search });
});

// ========================================
// 検索履歴
// ========================================

app.get('/history', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const { entityType, limit = '20' } = c.req.query();

  const where: any = { organizationId, userId };
  if (entityType) where.entityType = entityType;

  const history = await prisma.searchHistory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });

  return c.json({ history });
});

app.delete('/history', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';

  await prisma.searchHistory.deleteMany({
    where: { organizationId, userId },
  });

  return c.json({ success: true });
});

// ========================================
// サジェスト
// ========================================

app.get('/suggestions', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { entityType, fieldName, prefix, limit = '10' } = c.req.query();

  if (!entityType || !fieldName) {
    return c.json({ error: 'entityType and fieldName are required' }, 400);
  }

  const where: any = {
    organizationId,
    entityType,
    fieldName,
  };

  if (prefix) {
    where.value = { startsWith: prefix, mode: 'insensitive' };
  }

  const suggestions = await prisma.searchSuggestion.findMany({
    where,
    orderBy: { frequency: 'desc' },
    take: parseInt(limit),
  });

  return c.json({ suggestions: suggestions.map(s => s.value) });
});

// ========================================
// フィルター設定
// ========================================

app.get('/filters', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { entityType, isActive } = c.req.query();

  const where: any = { organizationId };
  if (entityType) where.entityType = entityType;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const filters = await prisma.advancedFilter.findMany({
    where,
    orderBy: [{ entityType: 'asc' }, { priority: 'asc' }],
  });

  return c.json({ filters });
});

app.post('/filters', zValidator('json', createFilterSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const filter = await prisma.advancedFilter.create({
    data: {
      ...data,
      organizationId,
    },
  });

  return c.json({ filter }, 201);
});

app.put('/filters/:id', zValidator('json', createFilterSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const filter = await prisma.advancedFilter.update({
    where: { id },
    data,
  });

  return c.json({ filter });
});

app.delete('/filters/:id', async (c) => {
  const { id } = c.req.param();

  await prisma.advancedFilter.delete({
    where: { id },
  });

  return c.json({ success: true });
});

// ========================================
// フィールド定義
// ========================================

app.get('/fields/:entityType', async (c) => {
  const { entityType } = c.req.param();

  const fields = getEntityFields(entityType);
  return c.json({ fields });
});

// ========================================
// ヘルパー関数
// ========================================

function buildProductWhere(filters: any, query?: string) {
  const where: any = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.status) where.status = filters.status;
  if (filters.sourceType) where.source = { type: filters.sourceType };
  if (filters.priceMin) where.price = { ...where.price, gte: filters.priceMin };
  if (filters.priceMax) where.price = { ...where.price, lte: filters.priceMax };
  if (filters.category) where.category = filters.category;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.createdAfter) where.createdAt = { ...where.createdAt, gte: new Date(filters.createdAfter) };
  if (filters.createdBefore) where.createdAt = { ...where.createdAt, lte: new Date(filters.createdBefore) };

  return where;
}

function buildOrderWhere(filters: any, query?: string) {
  const where: any = {};

  if (query) {
    where.OR = [
      { externalOrderId: { contains: query, mode: 'insensitive' } },
      { buyerName: { contains: query, mode: 'insensitive' } },
      { buyerEmail: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.status) where.status = filters.status;
  if (filters.marketplace) where.marketplace = filters.marketplace;
  if (filters.totalMin) where.totalPrice = { ...where.totalPrice, gte: filters.totalMin };
  if (filters.totalMax) where.totalPrice = { ...where.totalPrice, lte: filters.totalMax };

  return where;
}

function buildListingWhere(filters: any, query?: string) {
  const where: any = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { externalId: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.status) where.status = filters.status;
  if (filters.marketplace) where.marketplace = filters.marketplace;
  if (filters.priceMin) where.price = { ...where.price, gte: filters.priceMin };
  if (filters.priceMax) where.price = { ...where.price, lte: filters.priceMax };

  return where;
}

function buildShipmentWhere(filters: any, query?: string) {
  const where: any = {};

  if (query) {
    where.OR = [
      { trackingNumber: { contains: query, mode: 'insensitive' } },
      { recipientName: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.status) where.status = filters.status;
  if (filters.carrier) where.carrier = filters.carrier;

  return where;
}

async function updateSearchSuggestions(
  organizationId: string,
  entityType: string,
  fieldName: string,
  value: string
) {
  await prisma.searchSuggestion.upsert({
    where: {
      organizationId_entityType_fieldName_value: {
        organizationId,
        entityType: entityType as any,
        fieldName,
        value,
      },
    },
    update: {
      frequency: { increment: 1 },
    },
    create: {
      organizationId,
      entityType: entityType as any,
      fieldName,
      value,
      frequency: 1,
    },
  });
}

function getEntityFields(entityType: string) {
  const fields: Record<string, any[]> = {
    PRODUCT: [
      { name: 'title', type: 'TEXT', label: 'タイトル' },
      { name: 'description', type: 'TEXT', label: '説明' },
      { name: 'price', type: 'NUMBER', label: '価格' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED'] },
      { name: 'category', type: 'TEXT', label: 'カテゴリ' },
      { name: 'brand', type: 'TEXT', label: 'ブランド' },
      { name: 'condition', type: 'ENUM', label: '状態', options: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'] },
      { name: 'createdAt', type: 'DATETIME', label: '作成日' },
    ],
    ORDER: [
      { name: 'externalOrderId', type: 'TEXT', label: '注文ID' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
      { name: 'marketplace', type: 'ENUM', label: 'マーケットプレイス', options: ['JOOM', 'EBAY'] },
      { name: 'totalPrice', type: 'NUMBER', label: '合計金額' },
      { name: 'buyerName', type: 'TEXT', label: '購入者名' },
      { name: 'createdAt', type: 'DATETIME', label: '注文日' },
    ],
    LISTING: [
      { name: 'title', type: 'TEXT', label: 'タイトル' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'ENDED'] },
      { name: 'marketplace', type: 'ENUM', label: 'マーケットプレイス', options: ['JOOM', 'EBAY'] },
      { name: 'price', type: 'NUMBER', label: '価格' },
      { name: 'quantity', type: 'NUMBER', label: '数量' },
      { name: 'createdAt', type: 'DATETIME', label: '出品日' },
    ],
    SHIPMENT: [
      { name: 'trackingNumber', type: 'TEXT', label: '追跡番号' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'] },
      { name: 'carrier', type: 'TEXT', label: '配送業者' },
      { name: 'recipientName', type: 'TEXT', label: '受取人' },
      { name: 'shippedAt', type: 'DATETIME', label: '発送日' },
    ],
    SUPPLIER: [
      { name: 'name', type: 'TEXT', label: '名前' },
      { name: 'contactEmail', type: 'TEXT', label: 'メール' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'rating', type: 'NUMBER', label: '評価' },
    ],
    CUSTOMER: [
      { name: 'email', type: 'TEXT', label: 'メール' },
      { name: 'name', type: 'TEXT', label: '名前' },
      { name: 'segment', type: 'ENUM', label: 'セグメント', options: ['NEW', 'ACTIVE', 'VIP', 'AT_RISK', 'CHURNED'] },
      { name: 'totalOrders', type: 'NUMBER', label: '総注文数' },
      { name: 'totalSpent', type: 'NUMBER', label: '総購入額' },
    ],
    INVENTORY: [
      { name: 'sku', type: 'TEXT', label: 'SKU' },
      { name: 'quantity', type: 'NUMBER', label: '数量' },
      { name: 'location', type: 'TEXT', label: '保管場所' },
      { name: 'status', type: 'ENUM', label: 'ステータス', options: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] },
    ],
  };

  return fields[entityType] || [];
}

export const advancedSearchRouter = app;

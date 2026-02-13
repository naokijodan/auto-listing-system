import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Use vi.hoisted to properly hoist mock functions
const {
  mockListingFindMany,
  mockListingFindFirst,
  mockListingCreate,
  mockListingUpdate,
  mockListingUpdateMany,
  mockListingDelete,
  mockListingCount,
  mockProductFindUnique,
  mockSaleAggregate,
  mockEbayCategoryMappingFindMany,
  mockPriceHistoryFindMany,
  mockPriceHistoryAggregate,
} = vi.hoisted(() => ({
  mockListingFindMany: vi.fn(),
  mockListingFindFirst: vi.fn(),
  mockListingCreate: vi.fn(),
  mockListingUpdate: vi.fn(),
  mockListingUpdateMany: vi.fn(),
  mockListingDelete: vi.fn(),
  mockListingCount: vi.fn(),
  mockProductFindUnique: vi.fn(),
  mockSaleAggregate: vi.fn(),
  mockEbayCategoryMappingFindMany: vi.fn(),
  mockPriceHistoryFindMany: vi.fn(),
  mockPriceHistoryAggregate: vi.fn(),
}));

// Mock @prisma/client
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      listing: {
        findMany: mockListingFindMany,
        findFirst: mockListingFindFirst,
        create: mockListingCreate,
        update: mockListingUpdate,
        updateMany: mockListingUpdateMany,
        delete: mockListingDelete,
        count: mockListingCount,
      },
      product: {
        findUnique: mockProductFindUnique,
      },
      sale: {
        aggregate: mockSaleAggregate,
      },
      marketplaceCredential: {
        findFirst: vi.fn(),
      },
      ebayCategoryMapping: {
        findMany: mockEbayCategoryMappingFindMany,
      },
      priceHistory: {
        findMany: mockPriceHistoryFindMany,
        aggregate: mockPriceHistoryAggregate,
      },
    })),
    ListingStatus: {
      DRAFT: 'DRAFT',
      PENDING_PUBLISH: 'PENDING_PUBLISH',
      PUBLISHING: 'PUBLISHING',
      ACTIVE: 'ACTIVE',
      SOLD: 'SOLD',
      ENDED: 'ENDED',
      ERROR: 'ERROR',
    },
    Marketplace: {
      JOOM: 'JOOM',
      EBAY: 'EBAY',
    },
  };
});

vi.mock('@rakuda/queue', () => ({
  addEbayBatchPublishJob: vi.fn().mockResolvedValue('job-123'),
  addEbayPriceSyncJob: vi.fn().mockResolvedValue('job-456'),
  getEbayPublishQueueStats: vi.fn().mockResolvedValue({
    waiting: 2,
    active: 1,
    completed: 50,
    failed: 3,
  }),
  QUEUE_NAMES: {
    EBAY_PUBLISH: 'ebay-publish',
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import ebayListingsRouter from '../../routes/ebay-listings';

describe('eBay Listings API (Phase 103/104)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/ebay-listings', ebayListingsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    // Setup default mocks
    mockListingFindMany.mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'EBAY',
        listingPrice: 99.99,
        shippingCost: 12.99,
        currency: 'USD',
        status: 'DRAFT',
        marketplaceData: { categoryId: '175672' },
        product: {
          id: 'product-1',
          title: 'テスト商品',
          titleEn: 'Test Product',
          price: 8000,
          images: ['https://example.com/image1.jpg'],
          processedImages: ['https://cdn.example.com/image1.jpg'],
        },
      },
    ]);

    mockListingCount.mockResolvedValue(10);

    mockSaleAggregate.mockResolvedValue({
      _sum: { totalPrice: 1500 },
      _count: 5,
    });

    mockEbayCategoryMappingFindMany.mockResolvedValue([
      {
        id: 'cat-1',
        ebayCategoryId: '175672',
        ebayCategoryName: 'Cell Phones & Smartphones',
        sourceCategory: 'スマートフォン',
        isActive: true,
      },
    ]);

    mockPriceHistoryFindMany.mockResolvedValue([
      {
        listingId: 'listing-1',
        oldPrice: 89.99,
        newPrice: 99.99,
        reason: 'auto_sync',
        createdAt: new Date(),
        listing: {
          product: { title: 'テスト商品', titleEn: 'Test Product' },
        },
      },
    ]);

    mockPriceHistoryAggregate.mockResolvedValue({
      _count: 3,
      _avg: { oldPrice: 85, newPrice: 95 },
    });
  });

  // =============================================
  // GET /listings - 出品一覧取得
  // =============================================
  describe('GET /api/ebay-listings/listings', () => {
    it('should return eBay listings', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/listings');

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/listings?status=DRAFT');

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/listings?limit=10&offset=0');

      expect(response.status).toBe(200);
    });
  });

  // =============================================
  // GET /stats - 統計取得
  // =============================================
  describe('GET /api/ebay-listings/stats', () => {
    it('should return eBay stats', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/stats');

      expect(response.status).toBe(200);
      expect(response.body.total).toBeDefined();
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.sales).toBeDefined();
    });
  });

  // =============================================
  // GET /listings/:id - 出品詳細取得
  // =============================================
  describe('GET /api/ebay-listings/listings/:id', () => {
    it('should return listing details', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'EBAY',
        listingPrice: 99.99,
        status: 'DRAFT',
        product: { id: 'product-1', title: 'テスト商品' },
        sales: [],
      });

      const response = await request(app)
        .get('/api/ebay-listings/listings/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('listing-1');
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/ebay-listings/listings/non-existent');

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // POST /listings - 出品作成
  // =============================================
  describe('POST /api/ebay-listings/listings', () => {
    it('should create a new eBay listing', async () => {
      mockProductFindUnique.mockResolvedValueOnce({
        id: 'product-1',
        title: 'テスト商品',
        price: 8000,
      });
      mockListingFindFirst.mockResolvedValueOnce(null);
      mockListingCreate.mockResolvedValueOnce({
        id: 'listing-new',
        productId: 'product-1',
        marketplace: 'EBAY',
        listingPrice: 99.99,
        status: 'DRAFT',
        product: { id: 'product-1', title: 'テスト商品' },
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings')
        .send({
          productId: 'product-1',
          price: 99.99,
          categoryId: '175672',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should require productId', async () => {
      const response = await request(app)
        .post('/api/ebay-listings/listings')
        .send({ price: 99.99 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('productId');
    });

    it('should return 404 if product not found', async () => {
      mockProductFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/ebay-listings/listings')
        .send({ productId: 'non-existent', price: 99.99 });

      expect(response.status).toBe(404);
    });

    it('should reject if listing already exists', async () => {
      mockProductFindUnique.mockResolvedValueOnce({ id: 'product-1' });
      mockListingFindFirst.mockResolvedValueOnce({ id: 'existing', productId: 'product-1' });

      const response = await request(app)
        .post('/api/ebay-listings/listings')
        .send({ productId: 'product-1', price: 99.99 });

      expect(response.status).toBe(409);
    });
  });

  // =============================================
  // PUT /listings/:id - 出品更新
  // =============================================
  describe('PUT /api/ebay-listings/listings/:id', () => {
    it('should update listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        marketplaceData: {},
      });
      mockListingUpdate.mockResolvedValueOnce({
        id: 'listing-1',
        listingPrice: 109.99,
        product: {},
      });

      const response = await request(app)
        .put('/api/ebay-listings/listings/listing-1')
        .send({ price: 109.99 });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/ebay-listings/listings/non-existent')
        .send({ price: 109.99 });

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // POST /listings/:id/preview - プレビュー
  // =============================================
  describe('POST /api/ebay-listings/listings/:id/preview', () => {
    it('should return preview with validation', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        listingPrice: 99.99,
        currency: 'USD',
        marketplaceData: { categoryId: '175672', conditionId: '3000' },
        product: {
          titleEn: 'Test Product',
          descriptionEn: 'Description',
          images: [],
          processedImages: ['https://cdn.example.com/image1.jpg'],
        },
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings/listing-1/preview');

      expect(response.status).toBe(200);
      expect(response.body.listing).toBeDefined();
      expect(response.body.validation).toBeDefined();
      expect(response.body.estimatedFees).toBeDefined();
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/ebay-listings/listings/non-existent/preview');

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // POST /listings/:id/publish - 出品公開
  // =============================================
  describe('POST /api/ebay-listings/listings/:id/publish', () => {
    it('should start publish job', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'DRAFT',
        product: {},
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings/listing-1/publish');

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBeDefined();
    });

    it('should reject already active listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'ACTIVE',
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings/listing-1/publish');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/ebay-listings/listings/non-existent/publish');

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // POST /batch-publish - バッチ出品
  // =============================================
  describe('POST /api/ebay-listings/batch-publish', () => {
    it('should start batch publish job', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        { id: 'listing-1', status: 'DRAFT' },
        { id: 'listing-2', status: 'DRAFT' },
      ]);

      const response = await request(app)
        .post('/api/ebay-listings/batch-publish')
        .send({ listingIds: ['listing-1', 'listing-2'] });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('should require listingIds array', async () => {
      const response = await request(app)
        .post('/api/ebay-listings/batch-publish')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject when no eligible listings', async () => {
      mockListingFindMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/ebay-listings/batch-publish')
        .send({ listingIds: ['listing-1'] });

      expect(response.status).toBe(400);
    });
  });

  // =============================================
  // POST /listings/:id/end - 出品終了
  // =============================================
  describe('POST /api/ebay-listings/listings/:id/end', () => {
    it('should end active listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'ACTIVE',
        marketplaceData: {},
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings/listing-1/end');

      expect(response.status).toBe(200);
    });

    it('should reject non-active listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'DRAFT',
      });

      const response = await request(app)
        .post('/api/ebay-listings/listings/listing-1/end');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/ebay-listings/listings/non-existent/end');

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // DELETE /listings/:id - 出品削除
  // =============================================
  describe('DELETE /api/ebay-listings/listings/:id', () => {
    it('should delete draft listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'DRAFT',
      });

      const response = await request(app)
        .delete('/api/ebay-listings/listings/listing-1');

      expect(response.status).toBe(200);
    });

    it('should reject active listing deletion', async () => {
      mockListingFindFirst.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        status: 'ACTIVE',
      });

      const response = await request(app)
        .delete('/api/ebay-listings/listings/listing-1');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/ebay-listings/listings/non-existent');

      expect(response.status).toBe(404);
    });
  });

  // =============================================
  // GET /categories/search - カテゴリ検索
  // =============================================
  describe('GET /api/ebay-listings/categories/search', () => {
    it('should search categories', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/categories/search?q=phone');

      expect(response.status).toBe(200);
      expect(response.body.categories).toBeInstanceOf(Array);
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/categories/search');

      expect(response.status).toBe(400);
    });
  });

  // =============================================
  // POST /pricing/sync - 価格同期
  // =============================================
  describe('POST /api/ebay-listings/pricing/sync', () => {
    it('should start price sync job', async () => {
      const response = await request(app)
        .post('/api/ebay-listings/pricing/sync')
        .send({ priceChangeThreshold: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });
  });

  // =============================================
  // GET /pricing/sync/status - 価格同期ステータス
  // =============================================
  describe('GET /api/ebay-listings/pricing/sync/status', () => {
    it('should return sync status', async () => {
      const response = await request(app)
        .get('/api/ebay-listings/pricing/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queue).toBeDefined();
      expect(response.body.recentChanges).toBeInstanceOf(Array);
      expect(response.body.stats24h).toBeDefined();
    });
  });
});

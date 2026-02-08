import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockEbayCategoryMapping } = vi.hoisted(() => ({
  mockEbayCategoryMapping: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    ebayCategoryMapping: mockEbayCategoryMapping,
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/enrichment', () => ({
  mapToEbayCategory: vi.fn().mockResolvedValue({
    categoryId: '31387',
    categoryName: 'Wristwatches',
    categoryPath: 'Jewelry & Watches > Wristwatches',
    confidence: 0.85,
    source: 'ai',
  }),
  suggestCategories: vi.fn().mockReturnValue([
    { category: 'watches', categoryId: '31387', similarity: 0.9 },
    { category: 'accessories', categoryId: '281', similarity: 0.7 },
  ]),
  getAllCategories: vi.fn().mockReturnValue([
    { category: 'watches', categoryId: '31387', categoryName: 'Wristwatches' },
    { category: 'electronics', categoryId: '293', categoryName: 'Electronics' },
  ]),
  getItemSpecificsForCategory: vi.fn().mockReturnValue({
    Brand: { required: true },
    Model: { required: false },
  }),
  EBAY_CATEGORY_MAP: {
    watches: {
      categoryId: '31387',
      categoryName: 'Wristwatches',
      categoryPath: 'Jewelry & Watches > Wristwatches',
      itemSpecifics: { Brand: { required: true } },
    },
  },
  inferCategoryFromText: vi.fn().mockReturnValue({
    category: 'watches',
    confidence: 0.8,
    hints: ['watch', 'seiko'],
  }),
}));

// Import after mocks
import { categoriesRouter } from '../../routes/categories';
import { errorHandler } from '../../middleware/error-handler';

describe('Categories API', () => {
  let app: express.Application;

  const mockCategory = {
    id: 'cat-1',
    sourceCategory: 'Watches',
    ebayCategoryId: '31387',
    ebayCategoryName: 'Wristwatches',
    itemSpecifics: { Brand: { required: true } },
    isActive: true,
    templates: [],
    _count: { templates: 2 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/categories', categoriesRouter);
    app.use(errorHandler);
  });

  describe('GET /api/categories', () => {
    it('should return list of category mappings', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);
      mockEbayCategoryMapping.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by search query', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);
      mockEbayCategoryMapping.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/categories?search=Watch');

      expect(response.status).toBe(200);
      expect(mockEbayCategoryMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ sourceCategory: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);
      mockEbayCategoryMapping.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/categories?isActive=true');

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([]);
      mockEbayCategoryMapping.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/categories?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return single category mapping', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(mockCategory);

      const response = await request(app)
        .get('/api/categories/cat-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('cat-1');
    });

    it('should return 404 for non-existent category', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/categories/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/categories', () => {
    it('should create new category mapping', async () => {
      mockEbayCategoryMapping.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/categories')
        .send({
          sourceCategory: 'Watches',
          ebayCategoryId: '31387',
          ebayCategoryName: 'Wristwatches',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({
          sourceCategory: 'Watches',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('should update category mapping', async () => {
      mockEbayCategoryMapping.update.mockResolvedValue({
        ...mockCategory,
        sourceCategory: 'Updated Category',
      });

      const response = await request(app)
        .patch('/api/categories/cat-1')
        .send({ sourceCategory: 'Updated Category' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category mapping', async () => {
      mockEbayCategoryMapping.delete.mockResolvedValue(mockCategory);

      const response = await request(app)
        .delete('/api/categories/cat-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Category mapping deleted');
    });
  });

  describe('POST /api/categories/import', () => {
    it('should import category mappings', async () => {
      mockEbayCategoryMapping.upsert.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/categories/import')
        .send({
          mappings: [
            {
              sourceCategory: 'Watches',
              ebayCategoryId: '31387',
              ebayCategoryName: 'Wristwatches',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 when mappings is empty', async () => {
      const response = await request(app)
        .post('/api/categories/import')
        .send({ mappings: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories/export/json', () => {
    it('should export category mappings as JSON', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);

      const response = await request(app)
        .get('/api/categories/export/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('GET /api/categories/ebay/search', () => {
    it('should search eBay categories', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);

      const response = await request(app)
        .get('/api/categories/ebay/search?query=watch');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/categories/ebay/search');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/categories/infer', () => {
    it('should infer category from DB mapping', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/categories/infer')
        .send({
          title: 'Seiko Watch',
          sourceCategory: 'Watches',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('database');
    });

    it('should infer category using AI when no DB mapping', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/categories/infer')
        .send({
          title: 'Seiko Automatic Watch',
          description: 'Vintage watch from Japan',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/categories/infer')
        .send({
          description: 'Test description',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories/suggest', () => {
    it('should suggest categories', async () => {
      mockEbayCategoryMapping.findMany.mockResolvedValue([mockCategory]);

      const response = await request(app)
        .get('/api/categories/suggest?query=watch');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/categories/suggest');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories/builtin', () => {
    it('should return built-in categories', async () => {
      const response = await request(app)
        .get('/api/categories/builtin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/categories/item-specifics/:categoryId', () => {
    it('should return item specifics from DB', async () => {
      mockEbayCategoryMapping.findFirst.mockResolvedValue(mockCategory);

      const response = await request(app)
        .get('/api/categories/item-specifics/31387');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('database');
    });

    it('should return item specifics from builtin when not in DB', async () => {
      mockEbayCategoryMapping.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/categories/item-specifics/31387');

      expect(response.status).toBe(200);
      expect(response.body.data.source).toBe('builtin');
    });
  });

  describe('POST /api/categories/sync-builtin', () => {
    it('should sync built-in categories to DB', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(null);
      mockEbayCategoryMapping.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/categories/sync-builtin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBeGreaterThanOrEqual(0);
    });

    it('should skip existing categories', async () => {
      mockEbayCategoryMapping.findUnique.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/categories/sync-builtin');

      expect(response.status).toBe(200);
      expect(response.body.data.skipped).toBeGreaterThan(0);
    });
  });

  describe('POST /api/categories/infer-fast', () => {
    it('should infer category using rule-based matching', async () => {
      const response = await request(app)
        .post('/api/categories/infer-fast')
        .send({
          title: 'Seiko Automatic Watch',
          description: 'Vintage Japanese watch',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/categories/infer-fast')
        .send({
          description: 'Test description',
        });

      expect(response.status).toBe(400);
    });
  });
});

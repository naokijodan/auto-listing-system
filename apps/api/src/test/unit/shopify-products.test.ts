/**
 * Shopify商品管理API ユニットテスト
 * Task 4: Phase 12 core - 主要APIユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoist mocks
const { mockShopifyProduct, mockQueueAdd } = vi.hoisted(() => ({
  mockShopifyProduct: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockQueueAdd: vi.fn().mockResolvedValue({ id: 'job-shopify-1' }),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
  })),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    shopifyProduct: mockShopifyProduct,
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    SHOPIFY_SYNC: 'shopify-sync',
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import shopifyRouter from '../../routes/shopify';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/shopify-products', shopifyRouter);
  return app;
}

describe('Shopify Products API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/shopify-products/products', () => {
    it('should return products with pagination', async () => {
      const products = [
        { id: '1', shopifyProductId: '500001', title: 'Vintage Clock', status: 'ACTIVE' },
        { id: '2', shopifyProductId: '500002', title: 'Antique Vase', status: 'SYNCED' },
      ];
      mockShopifyProduct.findMany.mockResolvedValue(products);
      mockShopifyProduct.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/shopify-products/products')
        .query({ limit: '10', offset: '0' });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockShopifyProduct.findMany.mockResolvedValue([]);
      mockShopifyProduct.count.mockResolvedValue(0);

      await request(app)
        .get('/api/shopify-products/products')
        .query({ status: 'ACTIVE' });

      expect(mockShopifyProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockShopifyProduct.findMany.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/shopify-products/products');
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/shopify-products/products/:id', () => {
    it('should return a product by id', async () => {
      const product = {
        id: '1',
        shopifyProductId: '500001',
        title: 'Vintage Clock',
        status: 'ACTIVE',
      };
      mockShopifyProduct.findUnique.mockResolvedValue(product);

      const response = await request(app).get('/api/shopify-products/products/1');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });

    it('should return 404 for non-existent product', async () => {
      mockShopifyProduct.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/shopify-products/products/999');
      expect(response.status).toBe(404);
    });
  });
});

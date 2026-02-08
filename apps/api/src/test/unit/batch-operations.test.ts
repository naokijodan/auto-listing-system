import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'test-job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@rakuda/database', async () => {
  const mockPrismaInner = {
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    listing: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'listing-123' }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    jobLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    priceChangeLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn((fn: (prisma: any) => Promise<any>) => fn(mockPrismaInner)),
  };

  return {
    prisma: mockPrismaInner,
    ProductStatus: {
      APPROVED: 'APPROVED',
      READY_TO_REVIEW: 'READY_TO_REVIEW',
      PENDING: 'PENDING',
    },
    Marketplace: {
      JOOM: 'JOOM',
      EBAY: 'EBAY',
    },
  };
});

// Import prisma for test access
import { prisma } from '@rakuda/database';
const mockPrisma = prisma as any;

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    PUBLISH: 'publish-queue',
  },
}));

// Import after mocks
import { batchOperationsRouter } from '../../routes/batch-operations';

describe('Batch Operations API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/batch', batchOperationsRouter);
  });

  describe('POST /api/batch/publish', () => {
    it('should reject request without marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('marketplace is required');
    });

    it('should reject invalid marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid joom marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'joom', options: { dryRun: true } });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.marketplace).toBe('joom');
      expect(response.body.dryRun).toBe(true);
    });

    it('should accept valid ebay marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'ebay', options: { dryRun: true } });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.marketplace).toBe('ebay');
    });
  });

  describe('POST /api/batch/publish/preview', () => {
    it('should return preview with dryRun=true', async () => {
      const response = await request(app)
        .post('/api/batch/publish/preview')
        .send({ marketplace: 'joom' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dryRun).toBe(true);
    });
  });

  describe('GET /api/batch/publish/status', () => {
    it('should return queue status', async () => {
      const response = await request(app)
        .get('/api/batch/publish/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.name).toBe('publish');
    });
  });

  describe('POST /api/batch/price-change', () => {
    it('should reject request without change type', async () => {
      const response = await request(app)
        .post('/api/batch/price-change')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('change.type is required');
    });

    it('should accept valid price change request', async () => {
      const response = await request(app)
        .post('/api/batch/price-change')
        .send({
          change: { type: 'percent', value: 10 },
          options: { dryRun: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dryRun).toBe(true);
    });
  });

  describe('POST /api/batch/listing-operation', () => {
    it('should reject request without operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('operation is required');
    });

    it('should reject invalid operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid pause operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'pause', options: { dryRun: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('pause');
    });

    it('should accept valid resume operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'resume', options: { dryRun: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('resume');
    });

    it('should accept valid delete operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'delete', options: { dryRun: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('delete');
    });
  });

  describe('GET /api/batch/export/listings', () => {
    it('should export empty CSV when no listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/batch/export/listings');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,marketplace,status,listingPrice');
    });

    it('should export listings with data', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          marketplace: 'JOOM',
          status: 'ACTIVE',
          listingPrice: 49.99,
          currency: 'USD',
          productId: 'product-1',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          product: {
            id: 'product-1',
            title: 'Test Product',
            titleEn: 'Test Product EN',
            category: 'electronics',
            price: 5000,
          },
        },
      ]);

      const response = await request(app)
        .get('/api/batch/export/listings');

      expect(response.status).toBe(200);
      expect(response.text).toContain('listing-1');
      expect(response.text).toContain('JOOM');
      expect(response.text).toContain('49.99');
    });

    it('should filter by marketplace', async () => {
      await request(app)
        .get('/api/batch/export/listings?marketplace=JOOM');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketplace: 'JOOM',
          }),
        })
      );
    });

    it('should respect limit parameter', async () => {
      await request(app)
        .get('/api/batch/export/listings?limit=500');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      );
    });
  });

  describe('GET /api/batch/export/products', () => {
    it('should export empty CSV when no products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/batch/export/products');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,title,titleEn,category,brand,price');
    });

    it('should export products with data', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product-1',
          title: 'Test Product',
          titleEn: 'Test Product EN',
          category: 'watches',
          brand: 'SEIKO',
          price: 50000,
          sourceUrl: 'https://example.com/product',
          condition: 'NEW',
          createdAt: new Date('2026-01-01'),
          source: { name: 'Yahoo Auctions' },
        },
      ]);

      const response = await request(app)
        .get('/api/batch/export/products');

      expect(response.status).toBe(200);
      expect(response.text).toContain('product-1');
      expect(response.text).toContain('SEIKO');
      expect(response.text).toContain('50000');
    });

    it('should filter by category', async () => {
      await request(app)
        .get('/api/batch/export/products?category=watches');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'watches',
          }),
        })
      );
    });
  });

  describe('GET /api/batch/export/orders', () => {
    it('should export empty CSV when no orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/batch/export/orders');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,marketplace,marketplaceOrderId,status');
    });

    it('should export orders with data', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          marketplace: 'EBAY',
          marketplaceOrderId: 'EBAY-ORD-001',
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          buyerUsername: 'buyer123',
          subtotal: 100.00,
          shippingCost: 15.00,
          tax: 10.00,
          total: 125.00,
          currency: 'USD',
          orderedAt: new Date('2026-02-01'),
          createdAt: new Date('2026-02-01'),
          sales: [{ id: 'sale-1' }, { id: 'sale-2' }],
        },
      ]);

      const response = await request(app)
        .get('/api/batch/export/orders');

      expect(response.status).toBe(200);
      expect(response.text).toContain('order-1');
      expect(response.text).toContain('EBAY-ORD-001');
      expect(response.text).toContain('125');
    });

    it('should filter by status', async () => {
      await request(app)
        .get('/api/batch/export/orders?status=SHIPPED');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SHIPPED',
          }),
        })
      );
    });

    it('should filter by marketplace', async () => {
      await request(app)
        .get('/api/batch/export/orders?marketplace=JOOM');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketplace: 'JOOM',
          }),
        })
      );
    });
  });

  describe('POST /api/batch/price-change (advanced)', () => {
    it('should apply fixed price change', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          marketplace: 'JOOM',
          status: 'ACTIVE',
          listingPrice: 50.00,
          currency: 'USD',
          product: { id: 'product-1', titleEn: 'Test Product' },
        },
      ]);

      const response = await request(app)
        .post('/api/batch/price-change')
        .send({
          change: { type: 'fixed', value: 60.00 },
          options: { dryRun: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.changes).toBeDefined();
    });

    it('should apply percent price change', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          marketplace: 'JOOM',
          status: 'ACTIVE',
          listingPrice: 100.00,
          currency: 'USD',
          product: { id: 'product-1', titleEn: 'Test Product' },
        },
      ]);

      const response = await request(app)
        .post('/api/batch/price-change')
        .send({
          change: { type: 'percent', value: 10 }, // +10%
          options: { dryRun: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by listing IDs', async () => {
      await request(app)
        .post('/api/batch/price-change')
        .send({
          filter: { listingIds: ['listing-1', 'listing-2'] },
          change: { type: 'percent', value: 5 },
          options: { dryRun: true },
        });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['listing-1', 'listing-2'] },
          }),
        })
      );
    });

    it('should filter by price range', async () => {
      await request(app)
        .post('/api/batch/price-change')
        .send({
          filter: { minPrice: 10, maxPrice: 100 },
          change: { type: 'percent', value: 5 },
          options: { dryRun: true },
        });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingPrice: { gte: 10, lte: 100 },
          }),
        })
      );
    });
  });
});

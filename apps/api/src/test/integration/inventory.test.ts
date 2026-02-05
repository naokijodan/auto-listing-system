import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

describe('Inventory API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/inventory/stale', () => {
    it('should return empty array when no stale inventory', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/inventory/stale');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBe(0);
    });

    it('should return stale inventory items', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          productId: 'product-1',
          listingPrice: 100,
          listedAt: thirtyOneDaysAgo,
          marketplaceData: { views: 5, watchers: 2 },
          product: {
            id: 'product-1',
            title: 'Test Product',
            price: 5000, // JPY
            category: 'Electronics',
            brand: 'TestBrand',
            images: ['https://example.com/image.jpg'],
          },
        },
      ]);

      const response = await request(app).get('/api/inventory/stale');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        listingId: 'listing-1',
        productId: 'product-1',
        title: 'Test Product',
      });
      expect(response.body.data[0].recommendedAction).toBeDefined();
    });

    it('should filter by minDays', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      await request(app).get('/api/inventory/stale?minDays=60');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by category', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      await request(app).get('/api/inventory/stale?category=Electronics');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { category: 'Electronics' },
          }),
        })
      );
    });

    it('should filter by brand', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      await request(app).get('/api/inventory/stale?brand=Sony');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { brand: 'Sony' },
          }),
        })
      );
    });

    it('should support pagination', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockPrisma.listing.findMany.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `listing-${i}`,
          productId: `product-${i}`,
          listingPrice: 100 + i,
          listedAt: thirtyOneDaysAgo,
          marketplaceData: {},
          product: {
            id: `product-${i}`,
            title: `Product ${i}`,
            price: 5000,
            category: null,
            brand: null,
            images: [],
          },
        }))
      );

      const response = await request(app).get('/api/inventory/stale?limit=10&offset=20');

      expect(response.body.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
      });
      expect(response.body.data).toHaveLength(10);
    });

    it('should include stats in response', async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          productId: 'product-1',
          listingPrice: 100,
          listedAt: sixtyDaysAgo,
          marketplaceData: { views: 5 },
          product: {
            id: 'product-1',
            title: 'Test',
            price: 5000,
            category: null,
            brand: null,
            images: [],
          },
        },
      ]);

      const response = await request(app).get('/api/inventory/stale');

      expect(response.body.stats).toMatchObject({
        total: 1,
        totalValue: 100,
        byAction: expect.any(Object),
      });
    });
  });

  describe('GET /api/inventory/stale/filters', () => {
    it('should return filter options', async () => {
      mockPrisma.product.findMany
        .mockResolvedValueOnce([{ category: 'Electronics' }, { category: 'Clothing' }])
        .mockResolvedValueOnce([{ brand: 'Sony' }, { brand: 'Nike' }]);

      const response = await request(app).get('/api/inventory/stale/filters');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toEqual(['Electronics', 'Clothing']);
      expect(response.body.data.brands).toEqual(['Sony', 'Nike']);
    });

    it('should filter out null values', async () => {
      mockPrisma.product.findMany
        .mockResolvedValueOnce([{ category: 'Electronics' }, { category: null }])
        .mockResolvedValueOnce([{ brand: null }]);

      const response = await request(app).get('/api/inventory/stale/filters');

      expect(response.body.data.categories).toEqual(['Electronics']);
      expect(response.body.data.brands).toEqual([]);
    });
  });

  describe('POST /api/inventory/stale/bulk-delete', () => {
    it('should bulk delete listings', async () => {
      mockPrisma.listing.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/api/inventory/stale/bulk-delete')
        .send({ listingIds: ['listing-1', 'listing-2', 'listing-3'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(3);
    });

    it('should return 400 when listingIds is missing', async () => {
      const response = await request(app)
        .post('/api/inventory/stale/bulk-delete')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when listingIds is empty', async () => {
      const response = await request(app)
        .post('/api/inventory/stale/bulk-delete')
        .send({ listingIds: [] });

      expect(response.status).toBe(400);
    });

    it('should update status to ENDED', async () => {
      mockPrisma.listing.updateMany.mockResolvedValue({ count: 1 });

      await request(app)
        .post('/api/inventory/stale/bulk-delete')
        .send({ listingIds: ['listing-1'] });

      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['listing-1'] },
          status: 'ACTIVE',
        },
        data: expect.objectContaining({
          status: 'ENDED',
        }),
      });
    });
  });
});

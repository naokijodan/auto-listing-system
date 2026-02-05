import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

describe('Pricing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pricing/recommendations', () => {
    it('should return empty array when no eligible listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/pricing/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.stats.total).toBe(0);
    });

    it('should return price recommendations for stale listings', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          productId: 'product-1',
          listingPrice: 100,
          listedAt: thirtyOneDaysAgo,
          marketplaceData: { views: 5 },
          product: {
            id: 'product-1',
            title: 'Test Product',
            price: 5000, // JPY
            images: ['https://example.com/image.jpg'],
          },
        },
      ]);

      const response = await request(app).get('/api/pricing/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        listingId: 'listing-1',
        productId: 'product-1',
        currentPrice: 100,
      });
      expect(response.body.data[0].recommendedPrice).toBeLessThan(100);
    });

    it('should generate 25% discount for 90+ day old listings', async () => {
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          productId: 'product-1',
          listingPrice: 100,
          listedAt: ninetyOneDaysAgo,
          marketplaceData: {},
          product: {
            id: 'product-1',
            title: 'Old Product',
            price: 1000, // Low cost to avoid margin floor
            images: [],
          },
        },
      ]);

      const response = await request(app).get('/api/pricing/recommendations');

      expect(response.body.data[0].reasonCode).toBe('stale_90');
      expect(response.body.data[0].discountPercent).toBe(25);
    });

    it('should include stats in response', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/pricing/recommendations');

      expect(response.body.stats).toMatchObject({
        total: 0,
        byReason: {
          stale_30: 0,
          stale_60: 0,
          stale_90: 0,
          low_views: 0,
        },
      });
    });

    it('should support pagination', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/pricing/recommendations?limit=10&offset=20');

      expect(response.body.pagination).toMatchObject({
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('POST /api/pricing/simulate', () => {
    it('should simulate price change', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        listingPrice: 100,
        product: { price: 5000 }, // JPY
      });

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'listing-1', newPrice: 90 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        listingId: 'listing-1',
        currentPrice: 100,
        newPrice: 90,
      });
      expect(response.body.data.profitChange).toBeLessThan(0);
    });

    it('should return 400 when listingId missing', async () => {
      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ newPrice: 90 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when newPrice missing', async () => {
      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'listing-1' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'non-existent', newPrice: 90 });

      expect(response.status).toBe(404);
    });

    it('should flag below cost prices', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        listingPrice: 100,
        product: { price: 15000 }, // High cost (100 USD)
      });

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'listing-1', newPrice: 50 });

      expect(response.body.data.isBelowCost).toBe(true);
    });
  });

  describe('POST /api/pricing/recommendations/:listingId/approve', () => {
    it('should approve and update price', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        listingPrice: 100,
      });
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        listingPrice: 90,
      });

      const response = await request(app)
        .post('/api/pricing/recommendations/listing-1/approve')
        .send({ newPrice: 90 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: expect.objectContaining({
          listingPrice: 90,
        }),
      });
    });

    it('should return 400 when newPrice invalid', async () => {
      const response = await request(app)
        .post('/api/pricing/recommendations/listing-1/approve')
        .send({ newPrice: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when newPrice negative', async () => {
      const response = await request(app)
        .post('/api/pricing/recommendations/listing-1/approve')
        .send({ newPrice: -10 });

      expect(response.status).toBe(400);
    });

    it('should return 404 when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pricing/recommendations/non-existent/approve')
        .send({ newPrice: 90 });

      expect(response.status).toBe(404);
    });
  });
});

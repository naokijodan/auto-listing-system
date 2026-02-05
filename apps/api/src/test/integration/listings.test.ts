import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

describe('Listings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/listings', () => {
    it('should return empty array when no listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);
      mockPrisma.listing.count.mockResolvedValue(0);

      const response = await request(app).get('/api/listings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should return listings with pagination', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          productId: 'product-1',
          marketplace: 'EBAY',
          listingPrice: 100.0,
          status: 'ACTIVE',
          product: {
            id: 'product-1',
            title: 'Test Product',
            titleEn: 'Test Product EN',
            price: 80.0,
            images: [],
            processedImages: [],
          },
        },
      ];
      mockPrisma.listing.findMany.mockResolvedValue(mockListings);
      mockPrisma.listing.count.mockResolvedValue(1);

      const response = await request(app).get('/api/listings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('listing-1');
    });

    it('should filter by marketplace', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);
      mockPrisma.listing.count.mockResolvedValue(0);

      await request(app).get('/api/listings?marketplace=EBAY');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { marketplace: 'EBAY' },
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);
      mockPrisma.listing.count.mockResolvedValue(0);

      await request(app).get('/api/listings?status=ACTIVE');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        })
      );
    });

    it('should support pagination parameters', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);
      mockPrisma.listing.count.mockResolvedValue(100);

      const response = await request(app).get('/api/listings?limit=10&offset=20');

      expect(response.body.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return listing by id', async () => {
      const mockListing = {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'EBAY',
        listingPrice: 100.0,
        status: 'ACTIVE',
        product: {
          id: 'product-1',
          title: 'Test Product',
        },
      };
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      const response = await request(app).get('/api/listings/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('listing-1');
    });

    it('should return 404 for non-existent listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/listings/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LISTING_NOT_FOUND');
    });
  });

  describe('POST /api/listings', () => {
    const validEbayMarketplaceData = {
      ebayCategoryId: '123456',
      conditionId: 1000,
      itemSpecifics: {},
    };

    it('should create new listing', async () => {
      const mockProduct = {
        id: 'product-1',
        title: 'Test Product',
      };
      const mockListing = {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'EBAY',
        listingPrice: 100.0,
        shippingCost: 10.0,
        status: 'DRAFT',
        marketplaceData: validEbayMarketplaceData,
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.listing.findUnique.mockResolvedValue(null);
      mockPrisma.listing.create.mockResolvedValue(mockListing);

      const response = await request(app)
        .post('/api/listings')
        .send({
          productId: 'product-1',
          marketplace: 'ebay',
          listingPrice: 100.0,
          shippingCost: 10.0,
          marketplaceData: validEbayMarketplaceData,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('listing-1');
    });

    it('should return 404 when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/listings')
        .send({
          productId: 'non-existent',
          marketplace: 'ebay',
          listingPrice: 100.0,
          shippingCost: 10.0,
          marketplaceData: validEbayMarketplaceData,
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 409 when listing already exists', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrisma.listing.findUnique.mockResolvedValue({ id: 'existing-listing' });

      const response = await request(app)
        .post('/api/listings')
        .send({
          productId: 'product-1',
          marketplace: 'ebay',
          listingPrice: 100.0,
          shippingCost: 10.0,
          marketplaceData: validEbayMarketplaceData,
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('LISTING_EXISTS');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send({
          productId: 'product-1',
          marketplace: 'ebay',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/listings/:id/publish', () => {
    it('should queue publish job for draft listing', async () => {
      const mockListing = {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'EBAY',
        status: 'DRAFT',
        marketplaceData: {},
        product: { id: 'product-1' },
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.listing.update.mockResolvedValue({
        ...mockListing,
        status: 'PENDING_PUBLISH',
      });

      const response = await request(app)
        .post('/api/listings/listing-1/publish')
        .send({});

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
    });

    it('should return 404 for non-existent listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/listings/non-existent/publish')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LISTING_NOT_FOUND');
    });

    it('should return 400 for listing not in publishable state', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        status: 'ACTIVE',
        product: { id: 'product-1' },
      });

      const response = await request(app)
        .post('/api/listings/listing-1/publish')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('PATCH /api/listings/:id', () => {
    it('should update listing price', async () => {
      const mockListing = {
        id: 'listing-1',
        listingPrice: 150.0,
      };
      mockPrisma.listing.update.mockResolvedValue(mockListing);

      const response = await request(app)
        .patch('/api/listings/listing-1')
        .send({ listingPrice: 150.0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should update shipping cost', async () => {
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        shippingCost: 15.0,
      });

      const response = await request(app)
        .patch('/api/listings/listing-1')
        .send({ shippingCost: 15.0 });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/listings/:id', () => {
    it('should delete listing', async () => {
      mockPrisma.listing.delete.mockResolvedValue({ id: 'listing-1' });

      const response = await request(app).delete('/api/listings/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Listing deleted');
    });
  });
});

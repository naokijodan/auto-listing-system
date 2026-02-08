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

  describe('POST /api/listings/bulk/update-price', () => {
    it('should update prices with percent change', async () => {
      mockPrisma.listing.findUnique
        .mockResolvedValueOnce({ id: 'listing-1', listingPrice: 100 })
        .mockResolvedValueOnce({ id: 'listing-2', listingPrice: 200 });
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({
          listingIds: ['listing-1', 'listing-2'],
          priceChange: { percent: 10 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('2/2');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].newPrice).toBeCloseTo(110, 2);
      expect(response.body.data[1].newPrice).toBeCloseTo(220, 2);
    });

    it('should update prices with fixed value', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ id: 'listing-1', listingPrice: 100 });
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({
          listingIds: ['listing-1'],
          priceChange: { fixed: 150 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].newPrice).toBe(150);
    });

    it('should update prices with amount change', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ id: 'listing-1', listingPrice: 100 });
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({
          listingIds: ['listing-1'],
          priceChange: { amount: -20 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].newPrice).toBe(80);
    });

    it('should enforce minimum price of 0.01', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ id: 'listing-1', listingPrice: 10 });
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({
          listingIds: ['listing-1'],
          priceChange: { amount: -100 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].newPrice).toBe(0.01);
    });

    it('should handle not found listings', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({
          listingIds: ['non-existent'],
          priceChange: { percent: 10 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].success).toBe(false);
      expect(response.body.data[0].error).toBe('Not found');
    });

    it('should return 400 when listingIds is missing', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({ priceChange: { percent: 10 } });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when priceChange is missing', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/update-price')
        .send({ listingIds: ['listing-1'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /api/listings/bulk/update-status', () => {
    it('should update status for multiple listings', async () => {
      mockPrisma.listing.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/api/listings/bulk/update-status')
        .send({
          listingIds: ['listing-1', 'listing-2', 'listing-3'],
          status: 'PAUSED',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('3 listings to PAUSED');
      expect(response.body.data.updatedCount).toBe(3);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/update-status')
        .send({
          listingIds: ['listing-1'],
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when listingIds is empty', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/update-status')
        .send({
          listingIds: [],
          status: 'PAUSED',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/listings/bulk/publish', () => {
    it('should queue publish jobs for draft listings', async () => {
      const mockListings = [
        { id: 'listing-1', productId: 'p1', marketplace: 'JOOM', status: 'DRAFT', marketplaceData: {}, product: {} },
        { id: 'listing-2', productId: 'p2', marketplace: 'EBAY', status: 'ERROR', marketplaceData: {}, product: {} },
      ];
      mockPrisma.listing.findMany.mockResolvedValue(mockListings);
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/publish')
        .send({
          listingIds: ['listing-1', 'listing-2', 'listing-3'],
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('2/3');
      // listing-3 should be marked as not in publishable state
      const failedListing = response.body.data.find((r: any) => r.listingId === 'listing-3');
      expect(failedListing.success).toBe(false);
      expect(failedListing.error).toContain('Not in publishable state');
    });

    it('should support dry run mode', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { id: 'listing-1', productId: 'p1', marketplace: 'JOOM', status: 'DRAFT', marketplaceData: {}, product: {} },
      ]);
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/publish')
        .send({
          listingIds: ['listing-1'],
          dryRun: true,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when listingIds is missing', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/publish')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/listings/bulk/delete', () => {
    it('should delete non-active listings with confirmation', async () => {
      mockPrisma.listing.count.mockResolvedValue(0); // No active listings
      mockPrisma.listing.deleteMany.mockResolvedValue({ count: 2 });

      const response = await request(app)
        .post('/api/listings/bulk/delete')
        .send({
          listingIds: ['listing-1', 'listing-2'],
          confirm: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(2);
    });

    it('should return 400 when confirm is false', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/delete')
        .send({
          listingIds: ['listing-1'],
          confirm: false,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('should return 400 when trying to delete active listings', async () => {
      mockPrisma.listing.count.mockResolvedValue(2); // 2 active listings

      const response = await request(app)
        .post('/api/listings/bulk/delete')
        .send({
          listingIds: ['listing-1', 'listing-2'],
          confirm: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ACTIVE_LISTINGS');
    });

    it('should return 400 when listingIds is empty', async () => {
      const response = await request(app)
        .post('/api/listings/bulk/delete')
        .send({
          listingIds: [],
          confirm: true,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/listings/bulk/retry', () => {
    it('should retry error listings', async () => {
      const errorListings = [
        { id: 'listing-1', productId: 'p1', marketplace: 'JOOM', marketplaceData: {}, product: {} },
        { id: 'listing-2', productId: 'p2', marketplace: 'EBAY', marketplaceData: {}, product: {} },
      ];
      mockPrisma.listing.findMany.mockResolvedValue(errorListings);
      mockPrisma.listing.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/listings/bulk/retry')
        .send({});

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queuedCount).toBe(2);
      expect(response.body.data.listings).toHaveLength(2);
    });

    it('should filter by marketplace', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/listings/bulk/retry')
        .send({ marketplace: 'joom' });

      expect(response.status).toBe(200);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ERROR', marketplace: 'JOOM' },
        })
      );
    });

    it('should return success with zero count when no error listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/listings/bulk/retry')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('No error listings');
      expect(response.body.data.queuedCount).toBe(0);
    });
  });

  describe('POST /api/listings/bulk/sync', () => {
    it('should sync active listings', async () => {
      const activeListings = [
        { id: 'listing-1', marketplace: 'JOOM', marketplaceListingId: 'joom-1' },
        { id: 'listing-2', marketplace: 'EBAY', marketplaceListingId: 'ebay-1' },
      ];
      mockPrisma.listing.findMany.mockResolvedValue(activeListings);

      const response = await request(app)
        .post('/api/listings/bulk/sync')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestedCount).toBe(2);
      expect(response.body.data.jobsQueued).toBe(2);
    });

    it('should filter by marketplace', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/listings/bulk/sync')
        .send({ marketplace: 'joom' });

      expect(response.status).toBe(200);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ marketplace: 'JOOM' }),
        })
      );
    });

    it('should filter by specific listing IDs', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/listings/bulk/sync')
        .send({ listingIds: ['listing-1', 'listing-2'] });

      expect(response.status).toBe(200);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['listing-1', 'listing-2'] },
          }),
        })
      );
    });
  });

  describe('POST /api/listings/inventory/sync', () => {
    it('should queue inventory sync job', async () => {
      const response = await request(app)
        .post('/api/listings/inventory/sync')
        .send({});

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inventory sync job queued');
      expect(response.body.data.jobId).toBeDefined();
    });

    it('should accept marketplace parameter', async () => {
      const response = await request(app)
        .post('/api/listings/inventory/sync')
        .send({ marketplace: 'ebay' });

      expect(response.status).toBe(202);
      expect(response.body.data.marketplace).toBe('ebay');
    });

    it('should accept listing IDs', async () => {
      const response = await request(app)
        .post('/api/listings/inventory/sync')
        .send({
          listingIds: ['listing-1', 'listing-2'],
          syncOutOfStock: false,
          maxListings: 50,
        });

      expect(response.status).toBe(202);
      expect(response.body.data.listingCount).toBe(2);
    });
  });

  describe('GET /api/listings/inventory/sync/status', () => {
    it('should return sync status', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([
        {
          id: 'job-1',
          jobId: 'bullmq-1',
          jobType: 'INVENTORY_SYNC',
          status: 'COMPLETED',
          result: { synced: 10 },
          errorMessage: null,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get('/api/listings/inventory/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.waiting).toBeDefined();
      expect(response.body.queue.active).toBeDefined();
      expect(response.body.recentJobs).toHaveLength(1);
    });

    it('should return empty jobs when none exist', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/listings/inventory/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.recentJobs).toHaveLength(0);
    });
  });
});

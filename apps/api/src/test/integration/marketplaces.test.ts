import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Marketplaces API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET /api/marketplaces/overview', () => {
    it('should return marketplace overview', async () => {
      mockPrisma.marketplaceCredential.findFirst
        .mockResolvedValueOnce({ id: '1', marketplace: 'EBAY', tokenExpiresAt: new Date(Date.now() + 3600000) })
        .mockResolvedValueOnce({ id: '2', marketplace: 'JOOM' });

      mockPrisma.listing.groupBy
        .mockResolvedValueOnce([{ status: 'ACTIVE', _count: 5 }])
        .mockResolvedValueOnce([{ status: 'ACTIVE', _count: 3 }]);

      const response = await request(app).get('/api/marketplaces/overview');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ebay.connected).toBe(true);
      expect(response.body.data.joom.connected).toBe(true);
      expect(response.body.data.ebay.environment).toBe('sandbox');
    });

    it('should handle disconnected marketplaces', async () => {
      mockPrisma.marketplaceCredential.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockPrisma.listing.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await request(app).get('/api/marketplaces/overview');

      expect(response.status).toBe(200);
      expect(response.body.data.ebay.connected).toBe(false);
      expect(response.body.data.joom.connected).toBe(false);
    });
  });

  describe('GET /api/marketplaces/ebay/category-mappings', () => {
    it('should return category mappings', async () => {
      mockPrisma.ebayCategoryMapping.findMany.mockResolvedValue([
        { id: '1', sourceCategory: 'カメラ', ebayCategoryId: '625', ebayCategoryName: 'Cameras' },
        { id: '2', sourceCategory: 'レンズ', ebayCategoryId: '3323', ebayCategoryName: 'Lenses' },
      ]);

      const response = await request(app).get('/api/marketplaces/ebay/category-mappings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/marketplaces/ebay/category-mappings', () => {
    it('should create category mapping', async () => {
      mockPrisma.ebayCategoryMapping.upsert.mockResolvedValue({
        id: '1',
        sourceCategory: 'カメラ',
        ebayCategoryId: '625',
        ebayCategoryName: 'Cameras',
      });

      const response = await request(app)
        .post('/api/marketplaces/ebay/category-mappings')
        .send({
          sourceCategory: 'カメラ',
          ebayCategoryId: '625',
          ebayCategoryName: 'Cameras',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/marketplaces/ebay/category-mappings')
        .send({ sourceCategory: 'カメラ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/marketplaces/ebay/category-mappings/:id', () => {
    it('should soft delete category mapping', async () => {
      mockPrisma.ebayCategoryMapping.update.mockResolvedValue({ id: '1', isActive: false });

      const response = await request(app).delete('/api/marketplaces/ebay/category-mappings/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.ebayCategoryMapping.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });
  });

  describe('GET /api/marketplaces/ebay/inventory/stats', () => {
    it('should return eBay inventory stats', async () => {
      mockPrisma.listing.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(50)   // active
        .mockResolvedValueOnce(30)   // draft
        .mockResolvedValueOnce(5)    // error
        .mockResolvedValueOnce(15);  // sold

      const response = await request(app).get('/api/marketplaces/ebay/inventory/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        total: 100,
        active: 50,
        draft: 30,
        error: 5,
        sold: 15,
      });
    });
  });

  describe('GET /api/marketplaces/joom/inventory/stats', () => {
    it('should return Joom inventory stats', async () => {
      mockPrisma.listing.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(8);

      const response = await request(app).get('/api/marketplaces/joom/inventory/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(50);
    });
  });

  describe('GET /api/marketplaces/ebay/categories/suggest', () => {
    it('should return 400 when query missing', async () => {
      const response = await request(app).get('/api/marketplaces/ebay/categories/suggest');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when eBay not connected', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/marketplaces/ebay/categories/suggest?q=camera');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('eBay not connected');
    });

    it('should return category suggestions', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        credentials: { accessToken: 'test-token' },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          categorySuggestions: [
            { category: { categoryId: '625', categoryName: 'Cameras' }, relevancy: 'HIGH' },
          ],
        }),
      });

      const response = await request(app).get('/api/marketplaces/ebay/categories/suggest?q=camera');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/marketplaces/ebay/categories/:categoryId/aspects', () => {
    it('should return 401 when eBay not connected', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/marketplaces/ebay/categories/625/aspects');

      expect(response.status).toBe(401);
    });

    it('should return item aspects', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        credentials: { accessToken: 'test-token' },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          aspects: [
            {
              localizedAspectName: 'Brand',
              aspectConstraint: { aspectRequired: true },
              aspectValues: [{ localizedValue: 'Canon' }, { localizedValue: 'Nikon' }],
            },
          ],
        }),
      });

      const response = await request(app).get('/api/marketplaces/ebay/categories/625/aspects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data[0].localizedAspectName).toBe('Brand');
    });
  });

  describe('GET /api/marketplaces/ebay/policies/fulfillment', () => {
    it('should return 401 when eBay not connected', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/marketplaces/ebay/policies/fulfillment');

      expect(response.status).toBe(401);
    });

    it('should return fulfillment policies', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        credentials: { accessToken: 'test-token' },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          fulfillmentPolicies: [
            { fulfillmentPolicyId: 'fp1', name: 'Standard Shipping' },
          ],
        }),
      });

      const response = await request(app).get('/api/marketplaces/ebay/policies/fulfillment');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/marketplaces/ebay/policies/payment', () => {
    it('should return payment policies', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        credentials: { accessToken: 'test-token' },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          paymentPolicies: [
            { paymentPolicyId: 'pp1', name: 'Managed Payments' },
          ],
        }),
      });

      const response = await request(app).get('/api/marketplaces/ebay/policies/payment');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/marketplaces/ebay/policies/return', () => {
    it('should return return policies', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        credentials: { accessToken: 'test-token' },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          returnPolicies: [
            { returnPolicyId: 'rp1', name: '30 Day Returns' },
          ],
        }),
      });

      const response = await request(app).get('/api/marketplaces/ebay/policies/return');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

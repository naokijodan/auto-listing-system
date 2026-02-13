import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      profitCalculation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'calc-1',
            listingId: 'listing-1',
            salePrice: 100,
            purchaseCost: 30,
            shippingCost: 15,
            platformFee: 10,
            paymentFee: 3,
            otherCosts: 2,
            profit: 40,
            profitMargin: 0.4,
            currency: 'USD',
            calculatedAt: new Date(),
            listing: {
              id: 'listing-1',
              title: 'Test Product',
              listingPrice: 100,
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'calc-1',
          listingId: 'listing-1',
          salePrice: 100,
          purchaseCost: 30,
          profit: 40,
          profitMargin: 0.4,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'calc-2',
          listingId: 'listing-2',
          salePrice: 150,
          purchaseCost: 50,
          profit: 70,
          profitMargin: 0.47,
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { profit: 500 },
          _avg: { profitMargin: 0.35 },
        }),
      },
      productCost: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'cost-1',
            productId: 'product-1',
            purchasePrice: 3000,
            domesticShipping: 500,
            internationalShipping: 1500,
            currency: 'JPY',
            product: {
              id: 'product-1',
              title: 'Test Product',
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'cost-1',
          productId: 'product-1',
          purchasePrice: 3000,
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'cost-1',
          productId: 'product-1',
          purchasePrice: 3000,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'cost-2',
          productId: 'product-2',
          purchasePrice: 5000,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'cost-1',
          purchasePrice: 3500,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'cost-1' }),
        count: vi.fn().mockResolvedValue(5),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { purchasePrice: 15000 },
        }),
      },
      feeStructure: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'fee-1',
            marketplace: 'ebay',
            feeType: 'platform',
            feeRate: 0.13,
            fixedFee: 0,
            isActive: true,
          },
          {
            id: 'fee-2',
            marketplace: 'ebay',
            feeType: 'payment',
            feeRate: 0.029,
            fixedFee: 0.3,
            isActive: true,
          },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'fee-1',
          marketplace: 'ebay',
          feeType: 'platform',
          feeRate: 0.13,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'fee-1',
          feeRate: 0.12,
        }),
      },
      profitTarget: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'target-1',
          minProfitMargin: 0.2,
          targetProfitMargin: 0.35,
          warningThreshold: 0.25,
          isActive: true,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'target-1',
          minProfitMargin: 0.25,
          targetProfitMargin: 0.4,
        }),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'listing-1',
            title: 'Test Product',
            listingPrice: 100,
            currency: 'USD',
            product: {
              id: 'product-1',
              sourceCurrency: 'JPY',
              originalPrice: 3000,
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'listing-1',
          title: 'Test Product',
          listingPrice: 100,
          product: {
            id: 'product-1',
            originalPrice: 3000,
          },
        }),
        count: vi.fn().mockResolvedValue(10),
      },
      exchangeRate: {
        findFirst: vi.fn().mockResolvedValue({
          rate: 0.0067,
          fromCurrency: 'JPY',
          toCurrency: 'USD',
        }),
      },
    },
  };
});

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
import { profitCalculationRouter } from '../../routes/profit-calculation';

describe('Profit Calculation API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/profit-calculation', profitCalculationRouter);
    // Error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/profit-calculation/stats', () => {
    it('should return profit statistics', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/profit-calculation/listings', () => {
    it('should return listings with profit data', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by profit status', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings?status=profitable');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/profit-calculation/calculate', () => {
    it('should calculate profit for a listing', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/calculate')
        .send({
          listingId: 'listing-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profit).toBeDefined();
      expect(response.body.data.profitMargin).toBeDefined();
    });

    it('should require listingId', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/calculate')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/profit-calculation/simulate', () => {
    it('should simulate profit with different price', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/simulate')
        .send({
          listingId: 'listing-1',
          newPrice: 120,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentProfit).toBeDefined();
      expect(response.body.data.simulatedProfit).toBeDefined();
    });

    it('should handle price change percentage', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/simulate')
        .send({
          listingId: 'listing-1',
          priceChangePercent: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/profit-calculation/costs', () => {
    it('should return product costs', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/costs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/profit-calculation/costs', () => {
    it('should create a cost entry', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/costs')
        .send({
          productId: 'product-1',
          purchasePrice: 3000,
          domesticShipping: 500,
          currency: 'JPY',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should require productId', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/costs')
        .send({
          purchasePrice: 3000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/profit-calculation/costs/:id', () => {
    it('should update a cost entry', async () => {
      const response = await request(app)
        .put('/api/profit-calculation/costs/cost-1')
        .send({
          purchasePrice: 3500,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/profit-calculation/costs/:id', () => {
    it('should delete a cost entry', async () => {
      const response = await request(app)
        .delete('/api/profit-calculation/costs/cost-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/profit-calculation/fees', () => {
    it('should return fee structures', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/fees');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by marketplace', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/fees?marketplace=ebay');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/profit-calculation/fees', () => {
    it('should update fee structure', async () => {
      const response = await request(app)
        .put('/api/profit-calculation/fees')
        .send({
          marketplace: 'ebay',
          feeType: 'platform',
          feeRate: 0.12,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/profit-calculation/targets', () => {
    it('should return profit targets', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/targets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.minProfitMargin).toBeDefined();
      expect(response.body.data.targetProfitMargin).toBeDefined();
    });
  });

  describe('PUT /api/profit-calculation/targets', () => {
    it('should update profit targets', async () => {
      const response = await request(app)
        .put('/api/profit-calculation/targets')
        .send({
          minProfitMargin: 0.25,
          targetProfitMargin: 0.4,
          warningThreshold: 0.3,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate margin values', async () => {
      const response = await request(app)
        .put('/api/profit-calculation/targets')
        .send({
          minProfitMargin: 1.5, // Invalid: > 1
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/profit-calculation/report', () => {
    it('should return profit report', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/report');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept date range', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/report?startDate=2026-01-01&endDate=2026-02-01');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

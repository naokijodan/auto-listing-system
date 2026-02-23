import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  const mockCalculation = {
    id: 'calc-1',
    organizationId: 'default',
    listingId: 'listing-1',
    ebayItemId: 'ebay-123',
    costId: 'cost-1',
    salePrice: 100,
    saleCurrency: 'USD',
    totalCost: 7500,
    costCurrency: 'JPY',
    ebayFinalValueFee: 12.9,
    ebayFixedFee: 0.3,
    paypalFee: 3.2,
    shippingCost: 10,
    otherFees: 0,
    totalFees: 16.4,
    totalCostUsd: 50,
    grossProfit: 50,
    netProfit: 33.6,
    profitMargin: 33.6,
    exchangeRate: 150,
    exchangeRateDate: new Date(),
    profitStatus: 'HIGHLY_PROFITABLE',
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-02-20'),
  };

  const mockCost = {
    id: 'cost-1',
    organizationId: 'default',
    listingId: 'listing-1',
    productId: 'product-1',
    sku: null,
    purchasePrice: 5000,
    purchaseCurrency: 'JPY',
    domesticShipping: 500,
    internationalShipping: 2000,
    totalCost: 7500,
    exchangeRate: 150,
    exchangeRateDate: new Date(),
    supplierName: 'Test Supplier',
    purchaseDate: null,
    purchaseUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFee = {
    id: 'fee-1',
    organizationId: 'default',
    name: 'eBay Standard',
    description: 'Standard eBay fees',
    platform: 'ebay',
    category: null,
    finalValueFeePercent: 12.9,
    fixedFeeAmount: 0.3,
    paymentFeePercent: 2.9,
    paymentFixedFee: 0.3,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTarget = {
    id: 'target-1',
    organizationId: 'default',
    name: 'Default Target',
    description: 'Default profit target',
    targetType: 'GLOBAL',
    category: null,
    minProfitMargin: 15,
    targetProfitMargin: 25,
    isDefault: true,
    alertOnBelow: true,
    alertThreshold: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    prisma: {
      profitCalculation: {
        findMany: vi.fn().mockResolvedValue([mockCalculation]),
        findUnique: vi.fn().mockResolvedValue(mockCalculation),
        create: vi.fn().mockResolvedValue(mockCalculation),
        count: vi.fn().mockResolvedValue(1),
        groupBy: vi.fn().mockResolvedValue([
          { profitStatus: 'HIGHLY_PROFITABLE', _count: 3 },
          { profitStatus: 'PROFITABLE', _count: 5 },
          { profitStatus: 'LOSS', _count: 1 },
        ]),
      },
      productCost: {
        findMany: vi.fn().mockResolvedValue([mockCost]),
        findUnique: vi.fn().mockResolvedValue(mockCost),
        create: vi.fn().mockResolvedValue(mockCost),
        update: vi.fn().mockResolvedValue({ ...mockCost, purchasePrice: 3500 }),
        count: vi.fn().mockResolvedValue(5),
      },
      feeStructure: {
        findMany: vi.fn().mockResolvedValue([mockFee]),
        create: vi.fn().mockResolvedValue(mockFee),
        count: vi.fn().mockResolvedValue(2),
      },
      profitTarget: {
        findMany: vi.fn().mockResolvedValue([mockTarget]),
        create: vi.fn().mockResolvedValue(mockTarget),
        update: vi.fn().mockResolvedValue({ ...mockTarget, minProfitMargin: 20 }),
        count: vi.fn().mockResolvedValue(1),
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
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /api/profit-calculation/stats', () => {
    it('should return profit statistics', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalCalculations).toBeDefined();
      expect(response.body.totalRevenue).toBeDefined();
      expect(response.body.totalCost).toBeDefined();
      expect(response.body.totalProfit).toBeDefined();
      expect(response.body.avgProfitMargin).toBeDefined();
      expect(response.body.profitableCount).toBeDefined();
      expect(response.body.lossCount).toBeDefined();
      expect(response.body.byStatus).toBeInstanceOf(Array);
      expect(response.body.totalCosts).toBeDefined();
      expect(response.body.totalFees).toBeDefined();
      expect(response.body.totalTargets).toBeDefined();
    });
  });

  describe('GET /api/profit-calculation/listings', () => {
    it('should return listings with profit data', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings');

      expect(response.status).toBe(200);
      expect(response.body.calculations).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should filter by profit status', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings?status=PROFITABLE');

      expect(response.status).toBe(200);
      expect(response.body.calculations).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('should support pagination via limit and offset', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/listings?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.calculations).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });

  describe('POST /api/profit-calculation/calculate', () => {
    it('should calculate profit for a listing', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/calculate')
        .send({
          listingId: 'listing-1',
          ebayItemId: 'ebay-123',
          salePrice: 100,
          purchasePrice: 5000,
          domesticShipping: 500,
          internationalShipping: 2000,
          exchangeRate: 150,
        });

      expect(response.status).toBe(201);
      expect(response.body.calculation).toBeDefined();
      expect(response.body.breakdown).toBeDefined();
      expect(response.body.breakdown.salePrice).toBeDefined();
      expect(response.body.breakdown.netProfit).toBeDefined();
      expect(response.body.breakdown.profitMargin).toBeDefined();
      expect(response.body.breakdown.profitStatus).toBeDefined();
    });

    it('should use default exchange rate when not provided', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/calculate')
        .send({
          listingId: 'listing-2',
          salePrice: 80,
          purchasePrice: 6000,
        });

      expect(response.status).toBe(201);
      expect(response.body.calculation).toBeDefined();
      expect(response.body.breakdown).toBeDefined();
    });
  });

  describe('POST /api/profit-calculation/simulate', () => {
    it('should simulate profit without saving', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/simulate')
        .send({
          salePrice: 100,
          purchasePrice: 5000,
          domesticShipping: 500,
          internationalShipping: 2000,
          exchangeRate: 150,
        });

      expect(response.status).toBe(200);
      expect(response.body.input).toBeDefined();
      expect(response.body.input.salePrice).toBe(100);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.netProfit).toBeDefined();
      expect(response.body.result.profitMargin).toBeDefined();
      expect(response.body.breakEvenPrice).toBeDefined();
      expect(response.body.suggestedPrices).toBeInstanceOf(Array);
    });

    it('should accept custom fee percentages', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/simulate')
        .send({
          salePrice: 120,
          purchasePrice: 6000,
          exchangeRate: 150,
          ebayFeePercent: 10.0,
          paypalFeePercent: 3.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.suggestedPrices).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/profit-calculation/costs', () => {
    it('should return product costs', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/costs');

      expect(response.status).toBe(200);
      expect(response.body.costs).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should support pagination via limit and offset', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/costs?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.costs).toBeDefined();
      expect(response.body.total).toBeDefined();
    });
  });

  describe('POST /api/profit-calculation/costs', () => {
    it('should create a cost entry', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/costs')
        .send({
          listingId: 'listing-1',
          purchasePrice: 3000,
          domesticShipping: 500,
          purchaseCurrency: 'JPY',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.purchasePrice).toBeDefined();
    });

    it('should use default currency when not provided', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/costs')
        .send({
          listingId: 'listing-2',
          purchasePrice: 5000,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
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
      expect(response.body.id).toBeDefined();
      expect(response.body.purchasePrice).toBe(3500);
    });
  });

  describe('GET /api/profit-calculation/fees', () => {
    it('should return fee structures', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/fees');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/fees?platform=ebay');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/profit-calculation/fees', () => {
    it('should create a fee structure', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/fees')
        .send({
          name: 'eBay Standard',
          platform: 'ebay',
          finalValueFeePercent: 12.9,
          fixedFeeAmount: 0.3,
          paymentFeePercent: 2.9,
          paymentFixedFee: 0.3,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.platform).toBeDefined();
    });
  });

  describe('GET /api/profit-calculation/targets', () => {
    it('should return profit targets', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/targets');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].minProfitMargin).toBeDefined();
      expect(response.body[0].targetProfitMargin).toBeDefined();
    });
  });

  describe('POST /api/profit-calculation/targets', () => {
    it('should create a profit target', async () => {
      const response = await request(app)
        .post('/api/profit-calculation/targets')
        .send({
          name: 'Standard Target',
          minProfitMargin: 15,
          targetProfitMargin: 25,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.minProfitMargin).toBeDefined();
    });
  });

  describe('PUT /api/profit-calculation/targets/:id', () => {
    it('should update a profit target', async () => {
      const response = await request(app)
        .put('/api/profit-calculation/targets/target-1')
        .send({
          minProfitMargin: 20,
          targetProfitMargin: 30,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /api/profit-calculation/report', () => {
    it('should return profit report with default period', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/report');

      expect(response.status).toBe(200);
      expect(response.body.period).toBe(30);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalRevenue).toBeDefined();
      expect(response.body.summary.totalCost).toBeDefined();
      expect(response.body.summary.totalFees).toBeDefined();
      expect(response.body.summary.totalProfit).toBeDefined();
      expect(response.body.summary.avgProfitMargin).toBeDefined();
      expect(response.body.summary.totalTransactions).toBeDefined();
      expect(response.body.dailyStats).toBeInstanceOf(Array);
    });

    it('should accept custom period', async () => {
      const response = await request(app)
        .get('/api/profit-calculation/report?period=7');

      expect(response.status).toBe(200);
      expect(response.body.period).toBe(7);
      expect(response.body.summary).toBeDefined();
      expect(response.body.dailyStats).toBeDefined();
    });
  });
});

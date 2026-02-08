import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      product: {
        count: vi.fn().mockResolvedValue(50),
        groupBy: vi.fn().mockResolvedValue([
          { status: 'ACTIVE', _count: 30 },
          { status: 'OUT_OF_STOCK', _count: 5 },
        ]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      listing: {
        count: vi.fn().mockResolvedValue(30),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ _sum: { listingPrice: 1000 } }),
      },
      sale: {
        findMany: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ _sum: { total: 500 } }),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({ _sum: { total: 5000, subtotal: 4500 } }),
      },
      exchangeRate: {
        findFirst: vi.fn().mockResolvedValue({
          rate: 0.0067,
          fetchedAt: new Date(),
        }),
      },
      priceSetting: {
        findFirst: vi.fn().mockResolvedValue({
          platformFeeRate: 0.13,
          paymentFeeRate: 0.03,
        }),
      },
      jobLog: {
        findFirst: vi.fn().mockResolvedValue({
          completedAt: new Date(),
          jobType: 'INVENTORY_SYNC',
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
  },
}));

vi.mock('@rakuda/config', () => ({
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
  },
}));

vi.mock('../../utils/cache', () => ({
  withCache: vi.fn((ns, key, fn) => fn()),
  CACHE_TTL: { ANALYTICS_KPI: 60000 },
  CACHE_NS: { ANALYTICS: 'analytics' },
  invalidateNamespace: vi.fn(),
}));

// Import after mocks
import { analyticsRouter } from '../../routes/analytics';

describe('Analytics API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRouter);
    // Error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/analytics/kpi', () => {
    it('should return KPI data', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalProducts).toBeDefined();
      expect(response.body.data.totalListings).toBeDefined();
    });

    it('should include revenue data', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi');

      expect(response.status).toBe(200);
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.grossProfit).toBeDefined();
    });

    it('should include health score', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi');

      expect(response.status).toBe(200);
      expect(response.body.data.healthScore).toBeDefined();
      expect(response.body.data.healthScoreBreakdown).toBeDefined();
    });
  });

  describe('POST /api/analytics/cache/invalidate', () => {
    it('should invalidate analytics cache', async () => {
      const response = await request(app)
        .post('/api/analytics/cache/invalidate');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/analytics/trends/sales', () => {
    it('should return sales trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends/sales');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/trends/sales?days=14');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/rankings/category', () => {
    it('should return category rankings', async () => {
      const response = await request(app)
        .get('/api/analytics/rankings/category');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/rankings/category?limit=5');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/rankings/brand', () => {
    it('should return brand rankings', async () => {
      const response = await request(app)
        .get('/api/analytics/rankings/brand');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/analytics/suggestions/sourcing', () => {
    it('should return sourcing suggestions', async () => {
      const response = await request(app)
        .get('/api/analytics/suggestions/sourcing');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/analytics/financial/pnl', () => {
    it('should return P&L data', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/pnl');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept period parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/pnl?period=weekly');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/financial/fees', () => {
    it('should return fee breakdown', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/fees');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/analytics/financial/roi', () => {
    it('should return ROI data', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/roi');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept period and groupBy parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/roi?period=30&groupBy=category');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/financial/daily', () => {
    it('should return daily financial data', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/daily');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/financial/daily?days=7');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/marketplace-stats', () => {
    it('should return marketplace statistics', async () => {
      const response = await request(app)
        .get('/api/analytics/marketplace-stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});

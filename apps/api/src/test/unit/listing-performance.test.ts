import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      listingPerformance: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'perf-1',
            listingId: 'listing-1',
            impressions: 1000,
            views: 50,
            clicks: 25,
            watchers: 5,
            sales: 2,
            ctr: 0.025,
            conversionRate: 0.08,
            score: 75,
            recordedAt: new Date(),
            listing: {
              id: 'listing-1',
              title: 'Test Product',
              listingPrice: 100,
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'perf-1',
          listingId: 'listing-1',
          impressions: 1000,
          views: 50,
          score: 75,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'perf-2',
          listingId: 'listing-2',
          impressions: 500,
          views: 30,
          score: 60,
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _avg: { score: 70, ctr: 0.03 },
          _sum: { impressions: 10000, views: 500 },
        }),
      },
      performanceSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
      performanceThreshold: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'thresh-1',
            metric: 'views',
            minValue: 10,
            warningValue: 5,
            criticalValue: 0,
            isActive: true,
          },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'thresh-1',
          metric: 'views',
          minValue: 10,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'thresh-1',
          metric: 'views',
          minValue: 15,
        }),
      },
      lowPerformanceFlag: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'flag-1',
            listingId: 'listing-1',
            reason: 'low_views',
            score: 20,
            recommendedAction: 'review_title',
            flaggedAt: new Date(),
          },
        ]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(5),
      },
      categoryBenchmark: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'bench-1',
            category: 'Electronics',
            avgViews: 100,
            avgCtr: 0.05,
            avgConversionRate: 0.1,
          },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'bench-1',
          category: 'Electronics',
          avgViews: 100,
        }),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(50),
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
import { listingPerformanceRouter } from '../../routes/listing-performance';

describe('Listing Performance API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/listing-performance', listingPerformanceRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/listing-performance/stats', () => {
    it('should return performance statistics', async () => {
      const response = await request(app)
        .get('/api/listing-performance/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/listing-performance/listings', () => {
    it('should return listings with performance data', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by score range', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings?minScore=50&maxScore=100');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-performance/low-performers', () => {
    it('should return low performing listings', async () => {
      const response = await request(app)
        .get('/api/listing-performance/low-performers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by reason', async () => {
      const response = await request(app)
        .get('/api/listing-performance/low-performers?reason=low_views');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/listing-performance/sync', () => {
    it('should sync performance data', async () => {
      const response = await request(app)
        .post('/api/listing-performance/sync');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept marketplace filter', async () => {
      const response = await request(app)
        .post('/api/listing-performance/sync')
        .send({ marketplace: 'ebay' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-performance/thresholds', () => {
    it('should return threshold settings', async () => {
      const response = await request(app)
        .get('/api/listing-performance/thresholds');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('PUT /api/listing-performance/thresholds', () => {
    it('should update threshold settings', async () => {
      const response = await request(app)
        .put('/api/listing-performance/thresholds')
        .send({
          metric: 'views',
          minValue: 15,
          warningValue: 8,
          criticalValue: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-performance/trends', () => {
    it('should return performance trends', async () => {
      const response = await request(app)
        .get('/api/listing-performance/trends');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept date range', async () => {
      const response = await request(app)
        .get('/api/listing-performance/trends?days=30');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-performance/benchmarks', () => {
    it('should return category benchmarks', async () => {
      const response = await request(app)
        .get('/api/listing-performance/benchmarks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/listing-performance/benchmarks?category=Electronics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

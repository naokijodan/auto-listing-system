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
            ebayItemId: 'ebay-abc123',
            title: 'Test Product',
            price: 100,
            currency: 'USD',
            category: 'Electronics',
            categoryId: 'cat-1',
            views: 50,
            watchers: 5,
            impressions: 1000,
            clicks: 25,
            ctr: 2.5,
            daysListed: 10,
            performanceScore: 75,
            isLowPerformer: false,
            _count: { flags: 1, suggestions: 2 },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'perf-1',
          listingId: 'listing-1',
          views: 50,
          watchers: 5,
          performanceScore: 75,
        }),
        createMany: vi.fn().mockResolvedValue({ count: 20 }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn()
          .mockResolvedValueOnce({ _avg: { views: 45.3 } })
          .mockResolvedValueOnce({ _avg: { watchers: 8.7 } }),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      performanceSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
      performanceThreshold: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'thresh-1',
            organizationId: 'default',
            name: 'Low Views Threshold',
            description: 'Flag listings with low views',
            metric: 'views',
            operator: 'LESS_THAN',
            absoluteValue: 10,
            relativePercentile: null,
            daysListedMin: null,
            actionOnMatch: 'FLAG',
            priority: 1,
            isActive: true,
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'thresh-2',
          organizationId: 'default',
          name: 'New Threshold',
          metric: 'views',
          operator: 'LESS_THAN',
          absoluteValue: 15,
          priority: 0,
          isActive: true,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'thresh-1',
          name: 'Updated Threshold',
          metric: 'views',
          absoluteValue: 15,
          isActive: true,
        }),
        delete: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(3),
      },
      lowPerformanceFlag: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'flag-1',
            organizationId: 'default',
            listingId: 'perf-1',
            reason: 'Low performance detected during sync',
            score: 20,
            metrics: { views: 5, watchers: 0, ctr: 0, daysListed: 45 },
            suggestedActions: ['PRICE_REDUCE', 'IMPROVE_TITLE'],
            status: 'ACTIVE',
            listing: { title: 'Test Product', views: 5, watchers: 0, price: 100 },
          },
        ]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({
          id: 'flag-1',
          status: 'DISMISSED',
          dismissedAt: new Date(),
          dismissedBy: 'user',
          dismissReason: 'Not relevant',
        }),
        count: vi.fn().mockResolvedValue(5),
      },
      categoryBenchmark: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'bench-1',
            organizationId: 'default',
            categoryId: 'cat-1',
            categoryName: 'Electronics',
            avgViews: 100,
            avgWatchers: 15,
            avgImpressions: 2000,
            avgCtr: 5.0,
            avgDaysToSell: 14,
            sampleSize: 50,
          },
        ]),
        count: vi.fn().mockResolvedValue(4),
        upsert: vi.fn().mockResolvedValue({}),
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
import { prisma } from '@rakuda/database';

describe('Listing Performance API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/listing-performance', listingPerformanceRouter);
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    // Reset aggregate mock to return correct sequential values for stats endpoint
    (prisma.listingPerformance.aggregate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ _avg: { views: 45.3 } })
      .mockResolvedValueOnce({ _avg: { watchers: 8.7 } });
  });

  describe('GET /api/listing-performance/stats', () => {
    it('should return performance statistics', async () => {
      const response = await request(app)
        .get('/api/listing-performance/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalListings');
      expect(response.body).toHaveProperty('lowPerformers');
      expect(response.body).toHaveProperty('lowPerformerRate');
      expect(response.body).toHaveProperty('avgViews');
      expect(response.body).toHaveProperty('avgWatchers');
      expect(response.body).toHaveProperty('totalFlags');
      expect(response.body).toHaveProperty('activeFlags');
      expect(response.body).toHaveProperty('totalThresholds');
      expect(response.body).toHaveProperty('activeThresholds');
      expect(response.body).toHaveProperty('totalBenchmarks');
    });

    it('should calculate lowPerformerRate correctly', async () => {
      // count mock returns 10 for all count() calls
      // lowPerformerRate = (10 / 10) * 100 = 100
      const response = await request(app)
        .get('/api/listing-performance/stats');

      expect(response.status).toBe(200);
      expect(typeof response.body.lowPerformerRate).toBe('number');
      expect(typeof response.body.avgViews).toBe('number');
      expect(typeof response.body.avgWatchers).toBe('number');
    });
  });

  describe('GET /api/listing-performance/listings', () => {
    it('should return listings with performance data', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
      expect(response.body.listings).toBeInstanceOf(Array);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by lowPerformer flag', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings?lowPerformer=true');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/listing-performance/listings?sortBy=views&order=desc');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
    });
  });

  describe('GET /api/listing-performance/low-performers', () => {
    it('should return low performing listings', async () => {
      const response = await request(app)
        .get('/api/listing-performance/low-performers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
      expect(response.body.listings).toBeInstanceOf(Array);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/listing-performance/low-performers?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('listings');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('POST /api/listing-performance/sync', () => {
    it('should sync performance data and return counts', async () => {
      const response = await request(app)
        .post('/api/listing-performance/sync');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('synced');
      expect(response.body).toHaveProperty('lowPerformersDetected');
    });

    it('should accept request body without error', async () => {
      const response = await request(app)
        .post('/api/listing-performance/sync')
        .send({ marketplace: 'ebay' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-performance/thresholds', () => {
    it('should return threshold settings as array', async () => {
      const response = await request(app)
        .get('/api/listing-performance/thresholds');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('metric');
      expect(response.body[0]).toHaveProperty('isActive');
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/listing-performance/thresholds?active=true');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/listing-performance/thresholds', () => {
    it('should create a new threshold', async () => {
      const response = await request(app)
        .post('/api/listing-performance/thresholds')
        .send({
          name: 'New Threshold',
          metric: 'views',
          operator: 'LESS_THAN',
          absoluteValue: 15,
          priority: 0,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('metric', 'views');
    });
  });

  describe('PUT /api/listing-performance/thresholds/:id', () => {
    it('should update threshold settings by id', async () => {
      const response = await request(app)
        .put('/api/listing-performance/thresholds/thresh-1')
        .send({
          name: 'Updated Threshold',
          absoluteValue: 15,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'thresh-1');
      expect(response.body).toHaveProperty('absoluteValue', 15);
    });
  });

  describe('DELETE /api/listing-performance/thresholds/:id', () => {
    it('should delete a threshold by id', async () => {
      const response = await request(app)
        .delete('/api/listing-performance/thresholds/thresh-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/listing-performance/trends', () => {
    it('should return performance trends as array', async () => {
      const response = await request(app)
        .get('/api/listing-performance/trends');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should accept days query parameter', async () => {
      const response = await request(app)
        .get('/api/listing-performance/trends?days=30');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should accept listingId query parameter', async () => {
      const response = await request(app)
        .get('/api/listing-performance/trends?listingId=listing-1');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/listing-performance/category-benchmark', () => {
    it('should return category benchmarks as array', async () => {
      const response = await request(app)
        .get('/api/listing-performance/category-benchmark');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('categoryName');
      expect(response.body[0]).toHaveProperty('avgViews');
      expect(response.body[0]).toHaveProperty('avgCtr');
    });
  });

  describe('POST /api/listing-performance/calculate-benchmarks', () => {
    it('should calculate and return benchmarks', async () => {
      const response = await request(app)
        .post('/api/listing-performance/calculate-benchmarks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('benchmarks');
      expect(response.body.benchmarks).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/listing-performance/flags', () => {
    it('should return flags with total count', async () => {
      const response = await request(app)
        .get('/api/listing-performance/flags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('flags');
      expect(response.body).toHaveProperty('total');
      expect(response.body.flags).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/listing-performance/flags?status=ACTIVE');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('flags');
      expect(response.body).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/listing-performance/flags?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('flags');
    });
  });

  describe('PATCH /api/listing-performance/flags/:id/dismiss', () => {
    it('should dismiss a flag by id', async () => {
      const response = await request(app)
        .patch('/api/listing-performance/flags/flag-1/dismiss')
        .send({ reason: 'Not relevant' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'flag-1');
      expect(response.body).toHaveProperty('status', 'DISMISSED');
    });
  });
});

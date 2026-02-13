import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      improvementSuggestion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'sug-1',
            listingId: 'listing-1',
            type: 'title',
            currentValue: 'Old Title',
            suggestedValue: 'New Improved Title',
            confidence: 0.85,
            reason: 'Better keywords for SEO',
            status: 'pending',
            createdAt: new Date(),
            listing: {
              id: 'listing-1',
              title: 'Old Title',
              listingPrice: 100,
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'sug-1',
          listingId: 'listing-1',
          type: 'title',
          suggestedValue: 'New Improved Title',
          status: 'pending',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'sug-2',
          listingId: 'listing-2',
          type: 'price',
          suggestedValue: '95.00',
          confidence: 0.75,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'sug-1',
          status: 'applied',
        }),
        count: vi.fn().mockResolvedValue(15),
      },
      bulkAction: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'action-1',
            type: 'price_adjust',
            status: 'completed',
            affectedCount: 10,
            executedAt: new Date(),
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'action-2',
          type: 'apply_suggestion',
          status: 'pending',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'action-1',
          status: 'completed',
        }),
        count: vi.fn().mockResolvedValue(5),
      },
      actionHistory: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'hist-1',
            listingId: 'listing-1',
            actionType: 'title_change',
            previousValue: 'Old Title',
            newValue: 'New Title',
            performedAt: new Date(),
            result: 'success',
          },
        ]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(20),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'listing-1',
            title: 'Test Product',
            description: 'Test description',
            listingPrice: 100,
            marketplace: 'ebay',
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'listing-1',
          title: 'Test Product',
          listingPrice: 100,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'listing-1',
          title: 'New Title',
        }),
        count: vi.fn().mockResolvedValue(50),
      },
      lowPerformanceFlag: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(5),
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
import { listingImprovementRouter } from '../../routes/listing-improvement';

describe('Listing Improvement API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/listing-improvement', listingImprovementRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/listing-improvement/stats', () => {
    it('should return improvement statistics', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/listing-improvement/suggestions', () => {
    it('should return improvement suggestions', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/suggestions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/suggestions?type=title');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/suggestions?status=pending');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/suggestions?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/listing-improvement/generate', () => {
    it('should generate improvement suggestions', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/generate')
        .send({
          listingId: 'listing-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept suggestion types', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/generate')
        .send({
          listingId: 'listing-1',
          types: ['title', 'description'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require listingId', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/generate')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/listing-improvement/apply/:id', () => {
    it('should apply a suggestion', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/apply/sug-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/listing-improvement/reject/:id', () => {
    it('should reject a suggestion', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/reject/sug-1')
        .send({ reason: 'Not appropriate' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/listing-improvement/bulk-action', () => {
    it('should execute bulk action', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/bulk-action')
        .send({
          type: 'apply_suggestion',
          suggestionIds: ['sug-1', 'sug-2'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support price adjustment', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/bulk-action')
        .send({
          type: 'price_adjust',
          listingIds: ['listing-1', 'listing-2'],
          adjustmentPercent: -5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require type', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/bulk-action')
        .send({
          suggestionIds: ['sug-1'],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/listing-improvement/history', () => {
    it('should return action history', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by listing', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/history?listingId=listing-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by action type', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/history?actionType=title_change');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/listing-improvement/effectiveness', () => {
    it('should return effectiveness report', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/effectiveness');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept date range', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/effectiveness?days=30');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/listing-improvement/preview', () => {
    it('should preview changes', async () => {
      const response = await request(app)
        .post('/api/listing-improvement/preview')
        .send({
          suggestionId: 'sug-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.before).toBeDefined();
      expect(response.body.data.after).toBeDefined();
    });
  });

  describe('GET /api/listing-improvement/low-performers', () => {
    it('should return low performers with suggestions', async () => {
      const response = await request(app)
        .get('/api/listing-improvement/low-performers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    priceRecommendation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    pricingRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    listing: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    priceHistory: {
      findMany: vi.fn(),
    },
    priceChangeLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
  PriceRecommendationStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    APPLIED: 'APPLIED',
    EXPIRED: 'EXPIRED',
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/schema', () => ({
  CreatePricingRuleInput: {
    safeParse: vi.fn((data) => ({
      success: true,
      data: {
        name: data.name || 'Test Rule',
        type: data.type || 'COMPETITOR_BASED',
        conditions: data.conditions || [],
        actions: data.actions || [],
        priority: data.priority || 10,
        isActive: data.isActive ?? true,
      },
    })),
  },
}));

// Import after mocks
import { pricingOptimizerRouter } from '../../routes/pricing-optimizer';

describe('Pricing Optimizer API', () => {
  let app: express.Application;

  const mockRecommendation = {
    id: 'rec-1',
    listingId: 'listing-1',
    currentPrice: 100,
    recommendedPrice: 95,
    status: 'PENDING',
    reason: 'Competitor price lower',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockRule = {
    id: 'rule-1',
    name: 'Competitor Match',
    type: 'COMPETITOR_BASED',
    conditions: [{ type: 'COMPETITOR_LOWER', threshold: 5 }],
    actions: [{ type: 'ADJUST_PERCENT', value: -3 }],
    priority: 10,
    isActive: true,
    createdAt: new Date(),
  };

  const mockListing = {
    id: 'listing-1',
    listingPrice: 100,
    product: { title: 'Test Product', price: 70 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/pricing', pricingOptimizerRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/pricing/recommendations', () => {
    it('should return list of recommendations', async () => {
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/pricing/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].changePercent).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/pricing/recommendations?status=PENDING');

      expect(response.status).toBe(200);
      expect(mockPrisma.priceRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should filter by listingId', async () => {
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/pricing/recommendations?listingId=listing-1');

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/pricing/recommendations?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });
  });

  describe('GET /api/pricing/recommendations/:id', () => {
    it('should return single recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(mockRecommendation);
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      const response = await request(app)
        .get('/api/pricing/recommendations/rec-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.listing).toBeDefined();
    });

    it('should return 404 for non-existent recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pricing/recommendations/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/pricing/recommendations/:id/approve', () => {
    it('should approve recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(mockRecommendation);
      mockPrisma.priceRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: 'APPROVED',
      });

      const response = await request(app)
        .post('/api/pricing/recommendations/rec-1/approve')
        .send({ approvedBy: 'user-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recommendation approved');
    });

    it('should return 404 for non-existent recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pricing/recommendations/non-existent/approve');

      expect(response.status).toBe(404);
    });

    it('should return 400 for non-pending recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue({
        ...mockRecommendation,
        status: 'APPLIED',
      });

      const response = await request(app)
        .post('/api/pricing/recommendations/rec-1/approve');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot approve');
    });

    it('should return 400 for expired recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue({
        ...mockRecommendation,
        expiresAt: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post('/api/pricing/recommendations/rec-1/approve');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/pricing/recommendations/:id/reject', () => {
    it('should reject recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(mockRecommendation);
      mockPrisma.priceRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: 'REJECTED',
      });

      const response = await request(app)
        .post('/api/pricing/recommendations/rec-1/reject')
        .send({ reason: 'Price too aggressive' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recommendation rejected');
    });

    it('should return 400 when reason is missing', async () => {
      const response = await request(app)
        .post('/api/pricing/recommendations/rec-1/reject')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Reason is required');
    });

    it('should return 404 for non-existent recommendation', async () => {
      mockPrisma.priceRecommendation.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pricing/recommendations/non-existent/reject')
        .send({ reason: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/pricing/recommendations/bulk-approve', () => {
    it('should bulk approve recommendations', async () => {
      mockPrisma.priceRecommendation.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/api/pricing/recommendations/bulk-approve')
        .send({ ids: ['rec-1', 'rec-2', 'rec-3'], approvedBy: 'user-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.approved).toBe(3);
    });

    it('should return 400 when ids is empty', async () => {
      const response = await request(app)
        .post('/api/pricing/recommendations/bulk-approve')
        .send({ ids: [] });

      expect(response.status).toBe(400);
    });

    it('should return 400 when ids is not an array', async () => {
      const response = await request(app)
        .post('/api/pricing/recommendations/bulk-approve')
        .send({ ids: 'rec-1' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pricing/rules', () => {
    it('should return list of rules', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/pricing/rules');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by isActive', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/pricing/rules?isActive=true');

      expect(response.status).toBe(200);
      expect(mockPrisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });
  });

  describe('POST /api/pricing/rules', () => {
    it('should create new rule', async () => {
      mockPrisma.pricingRule.create.mockResolvedValue(mockRule);

      const response = await request(app)
        .post('/api/pricing/rules')
        .send({
          name: 'Competitor Match',
          type: 'COMPETITOR_BASED',
          conditions: [{ type: 'COMPETITOR_LOWER', threshold: 5 }],
          actions: [{ type: 'ADJUST_PERCENT', value: -3 }],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/pricing/rules/:id', () => {
    it('should update rule', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.pricingRule.update.mockResolvedValue({
        ...mockRule,
        name: 'Updated Rule',
      });

      const response = await request(app)
        .put('/api/pricing/rules/rule-1')
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent rule', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/pricing/rules/non-existent')
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/pricing/rules/:id', () => {
    it('should delete rule', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue(mockRule);
      mockPrisma.pricingRule.delete.mockResolvedValue(mockRule);

      const response = await request(app)
        .delete('/api/pricing/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rule deleted');
    });

    it('should return 404 for non-existent rule', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/pricing/rules/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/pricing/history/:listingId', () => {
    it('should return price history', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([
        { listingId: 'listing-1', price: 100, recordedAt: new Date() },
      ]);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([
        { listingId: 'listing-1', oldPrice: 100, newPrice: 95, createdAt: new Date() },
      ]);

      const response = await request(app)
        .get('/api/pricing/history/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toBeDefined();
      expect(response.body.data.changes).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/pricing/history/listing-1?days=7');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/pricing/stats', () => {
    it('should return pricing statistics', async () => {
      mockPrisma.priceRecommendation.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 10 },
        { status: 'APPLIED', _count: 5 },
      ]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(15);
      mockPrisma.priceChangeLog.count.mockResolvedValue(20);
      mockPrisma.pricingRule.count.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/pricing/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.priceChanges).toBeDefined();
      expect(response.body.data.activeRules).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockPrisma.priceRecommendation.groupBy.mockResolvedValue([]);
      mockPrisma.priceRecommendation.count.mockResolvedValue(0);
      mockPrisma.priceChangeLog.count.mockResolvedValue(0);
      mockPrisma.pricingRule.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/pricing/stats?days=30');

      expect(response.status).toBe(200);
      expect(response.body.data.period.days).toBe(30);
    });
  });

  describe('POST /api/pricing/simulate', () => {
    it('should simulate price change', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'listing-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentPrice).toBeDefined();
      expect(response.body.data.simulatedPrice).toBeDefined();
      expect(response.body.data.safetyChecks).toBeDefined();
    });

    it('should return 400 when listingId is missing', async () => {
      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'non-existent' });

      expect(response.status).toBe(404);
    });

    it('should apply specific rules when provided', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .post('/api/pricing/simulate')
        .send({ listingId: 'listing-1', rules: ['rule-1'] });

      expect(response.status).toBe(200);
      expect(mockPrisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['rule-1'] },
          }),
        })
      );
    });
  });

  describe('POST /api/pricing/simulate/batch', () => {
    it('should simulate batch price changes', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([mockListing]);
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .post('/api/pricing/simulate/batch')
        .send({ listingIds: ['listing-1'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return 400 when listingIds is empty', async () => {
      const response = await request(app)
        .post('/api/pricing/simulate/batch')
        .send({ listingIds: [] });

      expect(response.status).toBe(400);
    });

    it('should return 400 when listingIds exceeds 100', async () => {
      const response = await request(app)
        .post('/api/pricing/simulate/batch')
        .send({ listingIds: Array(101).fill('listing-1') });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum 100');
    });
  });

  describe('POST /api/pricing/backtest', () => {
    it('should run backtest', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);
      mockPrisma.priceHistory.findMany.mockResolvedValue([
        { listingId: 'listing-1', price: 100, recordedAt: new Date() },
      ]);

      const response = await request(app)
        .post('/api/pricing/backtest')
        .send({ ruleIds: ['rule-1'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.byRule).toBeDefined();
      expect(response.body.data.riskAnalysis).toBeDefined();
    });

    it('should return 400 when ruleIds is empty', async () => {
      const response = await request(app)
        .post('/api/pricing/backtest')
        .send({ ruleIds: [] });

      expect(response.status).toBe(400);
    });

    it('should return 404 when no rules found', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/pricing/backtest')
        .send({ ruleIds: ['non-existent'] });

      expect(response.status).toBe(404);
    });

    it('should accept date range and sample size', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([mockRule]);
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/pricing/backtest')
        .send({
          ruleIds: ['rule-1'],
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          sampleSize: 100,
        });

      expect(response.status).toBe(200);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Redis and BullMQ
const { mockRedis, mockQueue } = vi.hoisted(() => ({
  mockRedis: {
    hgetall: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    hexists: vi.fn(),
    hdel: vi.fn(),
    hkeys: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  mockQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => mockQueue),
}));

// Mock Prisma
const { mockListing } = vi.hoisted(() => ({
  mockListing: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    listing: mockListing,
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

// Import after mocks
import { competitorsRouter } from '../../routes/competitors';

describe('Competitors API', () => {
  let app: express.Application;

  const mockCompetitor = {
    id: 'comp_123',
    listingId: 'listing-1',
    competitorUrl: 'https://ebay.com/item/123',
    competitorTitle: 'Test Product',
    competitorPrice: 50,
    competitorSeller: 'seller123',
    lastChecked: new Date(),
    priceHistory: [{ price: 50, date: new Date() }],
    createdAt: new Date(),
  };

  const mockListingData = {
    id: 'listing-1',
    listingPrice: 55,
    product: {
      title: 'My Product',
      images: ['image1.jpg'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/competitors', competitorsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/competitors', () => {
    it('should return list of competitors', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'comp_123': JSON.stringify(mockCompetitor),
      });
      mockListing.findMany.mockResolvedValue([mockListingData]);

      const response = await request(app)
        .get('/api/competitors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by listingId', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'comp_123': JSON.stringify(mockCompetitor),
        'comp_456': JSON.stringify({ ...mockCompetitor, id: 'comp_456', listingId: 'listing-2' }),
      });
      mockListing.findMany.mockResolvedValue([mockListingData]);

      const response = await request(app)
        .get('/api/competitors?listingId=listing-1');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].listingId).toBe('listing-1');
    });

    it('should support pagination', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      mockListing.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/competitors?limit=10&offset=5');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(5);
    });

    it('should enrich with listing data', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'comp_123': JSON.stringify(mockCompetitor),
      });
      mockListing.findMany.mockResolvedValue([mockListingData]);

      const response = await request(app)
        .get('/api/competitors');

      expect(response.status).toBe(200);
      expect(response.body.data[0].myTitle).toBe('My Product');
      expect(response.body.data[0].myPrice).toBe(55);
      expect(response.body.data[0].priceDiff).toBe(-5);
    });
  });

  describe('POST /api/competitors', () => {
    it('should create new competitor', async () => {
      mockListing.findUnique.mockResolvedValue(mockListingData);
      mockRedis.hset.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/competitors')
        .send({
          listingId: 'listing-1',
          competitorUrl: 'https://ebay.com/item/123',
          competitorTitle: 'Test Product',
          competitorPrice: 50,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.competitorUrl).toBe('https://ebay.com/item/123');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/competitors')
        .send({
          listingId: 'listing-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 404 when listing not found', async () => {
      mockListing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/competitors')
        .send({
          listingId: 'non-existent',
          competitorUrl: 'https://ebay.com/item/123',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Listing not found');
    });
  });

  describe('PATCH /api/competitors/:id', () => {
    it('should update competitor price', async () => {
      mockRedis.hget.mockResolvedValue(JSON.stringify(mockCompetitor));
      mockRedis.hset.mockResolvedValue(1);

      const response = await request(app)
        .patch('/api/competitors/comp_123')
        .send({ competitorPrice: 45 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.competitorPrice).toBe(45);
    });

    it('should return 404 for non-existent competitor', async () => {
      mockRedis.hget.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/competitors/non-existent')
        .send({ competitorPrice: 45 });

      expect(response.status).toBe(404);
    });

    it('should add to price history when price changes', async () => {
      mockRedis.hget.mockResolvedValue(JSON.stringify(mockCompetitor));
      mockRedis.hset.mockResolvedValue(1);

      const response = await request(app)
        .patch('/api/competitors/comp_123')
        .send({ competitorPrice: 48 });

      expect(response.status).toBe(200);
      expect(response.body.data.priceHistory.length).toBeGreaterThan(1);
    });
  });

  describe('DELETE /api/competitors/:id', () => {
    it('should delete competitor', async () => {
      mockRedis.hexists.mockResolvedValue(1);
      mockRedis.hdel.mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/competitors/comp_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe('comp_123');
    });

    it('should return 404 for non-existent competitor', async () => {
      mockRedis.hexists.mockResolvedValue(0);

      const response = await request(app)
        .delete('/api/competitors/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/competitors/stats', () => {
    it('should return competitor statistics', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'comp_123': JSON.stringify({ ...mockCompetitor, competitorPrice: 45 }),
        'comp_456': JSON.stringify({ ...mockCompetitor, id: 'comp_456', competitorPrice: 60 }),
      });
      mockListing.findMany.mockResolvedValue([
        { id: 'listing-1', listingPrice: 55 },
      ]);

      const response = await request(app)
        .get('/api/competitors/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data).toHaveProperty('lowerThanMe');
      expect(response.body.data).toHaveProperty('higherThanMe');
      expect(response.body.data).toHaveProperty('avgPriceDiff');
    });
  });

  describe('POST /api/competitors/search', () => {
    it('should queue search job with searchQuery', async () => {
      const response = await request(app)
        .post('/api/competitors/search')
        .send({ searchQuery: 'test product' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe('job-1');
      expect(response.body.data.status).toBe('queued');
    });

    it('should queue search job with listingId', async () => {
      mockListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        product: { title: 'Test Product' },
      });

      const response = await request(app)
        .post('/api/competitors/search')
        .send({ listingId: 'listing-1' });

      expect(response.status).toBe(200);
      expect(response.body.data.searchQuery).toBe('Test Product');
    });

    it('should return 400 when neither listingId nor searchQuery provided', async () => {
      const response = await request(app)
        .post('/api/competitors/search')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 when listing not found', async () => {
      mockListing.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/competitors/search')
        .send({ listingId: 'non-existent' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/competitors/search-results/:listingId', () => {
    it('should return search results', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        competitors: [{ url: 'https://ebay.com/item/123' }],
        searchedAt: new Date(),
      }));

      const response = await request(app)
        .get('/api/competitors/search-results/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return null when no results found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/competitors/search-results/listing-1');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toContain('still be in progress');
    });
  });

  describe('POST /api/competitors/update-all', () => {
    it('should queue update jobs for all competitors', async () => {
      mockRedis.hkeys.mockResolvedValue(['comp_123', 'comp_456']);

      const response = await request(app)
        .post('/api/competitors/update-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queued).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no competitors exist', async () => {
      mockRedis.hkeys.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/competitors/update-all');

      expect(response.status).toBe(200);
      expect(response.body.data.queued).toBe(0);
    });
  });

  describe('GET /api/competitors/alert-settings', () => {
    it('should return alert settings from Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        enabled: true,
        priceDropThreshold: 10,
        priceRiseThreshold: 15,
        checkInterval: 3600000,
      }));

      const response = await request(app)
        .get('/api/competitors/alert-settings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
    });

    it('should return default settings when not configured', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/competitors/alert-settings');

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.priceDropThreshold).toBe(5);
      expect(response.body.data.priceRiseThreshold).toBe(10);
    });
  });

  describe('PUT /api/competitors/alert-settings', () => {
    it('should update alert settings', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/competitors/alert-settings')
        .send({
          enabled: false,
          priceDropThreshold: 8,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'rakuda:competitor-alert-settings',
        expect.any(String)
      );
    });
  });
});

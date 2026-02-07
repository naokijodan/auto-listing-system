import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies before importing route
vi.mock('@rakuda/database', () => ({
  prisma: {
    jobLog: {
      findMany: vi.fn(),
    },
    priceChangeLog: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    listing: {
      findMany: vi.fn(),
    },
    exchangeRate: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(10),
    getFailedCount: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@rakuda/database';
import { pricingRouter } from '../../routes/pricing';

const mockPrisma = vi.mocked(prisma);

describe('Pricing Sync API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/pricing', pricingRouter);
  });

  describe('POST /pricing/sync', () => {
    it('should start price sync job', async () => {
      const response = await request(app)
        .post('/pricing/sync')
        .send({
          marketplace: 'joom',
          priceChangeThreshold: 2,
          maxListings: 100,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.message).toContain('Price sync job queued');
    });

    it('should accept forceUpdate parameter', async () => {
      const response = await request(app)
        .post('/pricing/sync')
        .send({
          forceUpdate: true,
          maxListings: 50,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /pricing/sync/status', () => {
    beforeEach(() => {
      mockPrisma.jobLog.findMany.mockResolvedValue([
        {
          id: '1',
          jobId: 'job-1',
          queueName: 'pricing',
          jobType: 'PRICE_SYNC',
          status: 'COMPLETED',
          result: { totalUpdated: 5 },
          errorMessage: null,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
        },
      ] as any);

      mockPrisma.priceChangeLog.findMany.mockResolvedValue([
        {
          id: '1',
          listingId: 'listing-1',
          oldPrice: 10.00,
          newPrice: 10.50,
          changePercent: 5,
          source: 'auto_sync',
          createdAt: new Date(),
        },
      ] as any);

      mockPrisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          product: { title: 'Test Product', titleEn: 'Test Product EN' },
        },
      ] as any);

      mockPrisma.priceChangeLog.aggregate.mockResolvedValue({
        _count: 10,
        _avg: { changePercent: 2.5 },
      } as any);
    });

    it('should return sync status with queue info', async () => {
      const response = await request(app)
        .get('/pricing/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.waiting).toBe(0);
      expect(response.body.queue.completed).toBe(10);
    });

    it('should return recent jobs', async () => {
      const response = await request(app)
        .get('/pricing/sync/status');

      expect(response.body.recentJobs).toBeDefined();
      expect(response.body.recentJobs.length).toBeGreaterThan(0);
    });

    it('should return 24h stats', async () => {
      const response = await request(app)
        .get('/pricing/sync/status');

      expect(response.body.stats24h).toBeDefined();
      expect(response.body.stats24h.totalChanges).toBe(10);
      expect(response.body.stats24h.averageChangePercent).toBe(2.5);
    });
  });

  describe('GET /pricing/exchange-rate', () => {
    beforeEach(() => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: '1',
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        rate: 0.0067, // 1 JPY = 0.0067 USD
        source: 'exchangerate-api',
        fetchedAt: new Date(),
      } as any);
    });

    it('should return current exchange rate', async () => {
      const response = await request(app)
        .get('/pricing/exchange-rate');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fromCurrency).toBe('JPY');
      expect(response.body.data.toCurrency).toBe('USD');
      expect(response.body.data.rate).toBe(0.0067);
    });

    it('should return default rate if none found', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/pricing/exchange-rate');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('default');
    });
  });
});

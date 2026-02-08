import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(5),
    getActiveCount: vi.fn().mockResolvedValue(2),
    getCompletedCount: vi.fn().mockResolvedValue(100),
    getFailedCount: vi.fn().mockResolvedValue(3),
    getDelayedCount: vi.fn().mockResolvedValue(1),
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    getJobs: vi.fn().mockResolvedValue([]),
    removeJobs: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('ioredis', () => {
  const mockRedis = {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    hset: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    lrange: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: vi.fn().mockImplementation(() => mockRedis),
  };
});

vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      product: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(50),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(30),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({ _sum: { total: 5000 } }),
      },
      exchangeRate: {
        findMany: vi.fn().mockResolvedValue([
          { fromCurrency: 'JPY', toCurrency: 'USD', rate: 0.0067, fetchedAt: new Date(), source: 'api' },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          fromCurrency: 'JPY',
          toCurrency: 'USD',
          rate: 0.0067,
          fetchedAt: new Date(),
        }),
      },
      priceSetting: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockRejectedValue(new Error('Record not found')),
      },
      translationPrompt: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({ id: 'prompt-1', name: 'test-prompt' }),
      },
      shippingPolicy: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      notification: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(5),
      },
      notificationChannel: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      dailyReport: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      jobLog: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      marketplaceCredential: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    },
    Marketplace: {
      JOOM: 'JOOM',
      EBAY: 'EBAY',
    },
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    INVENTORY: 'inventory-queue',
    PRICING: 'pricing-queue',
    SCRAPE: 'scrape-queue',
    PUBLISH: 'publish-queue',
    TRANSLATE: 'translate-queue',
    IMAGE: 'image-queue',
    COMPETITOR: 'competitor-queue',
    ORDERS: 'orders-queue',
    DEAD_LETTER: 'dead-letter-queue',
  },
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
    EUR_TO_USD: 1.08,
  },
}));

// Import after mocks
import { adminRouter } from '../../routes/admin';

describe('Admin API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    // Error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('POST /api/admin/trigger/inventory-check', () => {
    it('should trigger inventory check successfully', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/inventory-check')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.message).toContain('Inventory check triggered');
    });

    it('should accept filter parameters', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/inventory-check')
        .send({
          productIds: ['product-1', 'product-2'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/trigger/price-sync', () => {
    it('should trigger price sync successfully', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/price-sync')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should accept marketplace filter', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/price-sync')
        .send({ marketplace: 'joom' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/trigger/exchange-rate', () => {
    it('should trigger exchange rate update successfully', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/exchange-rate')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });
  });

  describe('POST /api/admin/trigger/daily-report', () => {
    it('should trigger daily report generation', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/daily-report')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/trigger/health-check', () => {
    it('should trigger health check', async () => {
      const response = await request(app)
        .post('/api/admin/trigger/health-check')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/scheduler', () => {
    it('should return scheduler status', async () => {
      const response = await request(app)
        .get('/api/admin/scheduler');

      expect(response.status).toBe(200);
      expect(response.body.inventoryCheck).toBeDefined();
      expect(response.body.exchangeRate).toBeDefined();
      expect(response.body.priceSync).toBeDefined();
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return system statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
      expect(response.body.products.total).toBeDefined();
      expect(response.body.listings).toBeDefined();
      expect(response.body.jobs).toBeDefined();
    });
  });

  describe('GET /api/admin/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/admin/health');

      expect(response.status).toBe(200);
      expect(response.body.healthy).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.checks).toBeDefined();
      expect(Array.isArray(response.body.checks)).toBe(true);
    });
  });

  describe('GET /api/admin/exchange-rates', () => {
    it('should return exchange rates', async () => {
      const response = await request(app)
        .get('/api/admin/exchange-rates');

      expect(response.status).toBe(200);
      expect(response.body.currentRate).toBeDefined();
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('GET /api/admin/price-settings', () => {
    it('should return price settings', async () => {
      const response = await request(app)
        .get('/api/admin/price-settings');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PUT /api/admin/price-settings/:id', () => {
    it('should return 500 when setting not found (Prisma error)', async () => {
      const response = await request(app)
        .put('/api/admin/price-settings/invalid-id')
        .send({ platformFeeRate: 0.15 });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/shipping-policies', () => {
    it('should return shipping policies', async () => {
      const response = await request(app)
        .get('/api/admin/shipping-policies');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/admin/translation-prompts', () => {
    it('should return translation prompts', async () => {
      const response = await request(app)
        .get('/api/admin/translation-prompts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/admin/translation-prompts', () => {
    it('should create translation prompt with valid data', async () => {
      const response = await request(app)
        .post('/api/admin/translation-prompts')
        .send({
          name: 'test-prompt',
          category: 'watches',
          marketplace: 'JOOM',
          systemPrompt: 'You are a translator',
          userPrompt: 'Translate: {{text}}',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('test-prompt');
    });
  });

  describe('GET /api/admin/notifications/config', () => {
    it('should return notification config', async () => {
      const response = await request(app)
        .get('/api/admin/notifications/config');

      expect(response.status).toBe(200);
      expect(response.body.configured).toBeDefined();
      expect(response.body.channels).toBeDefined();
    });
  });

  describe('POST /api/admin/notifications/test', () => {
    it('should reject when no channels configured', async () => {
      const response = await request(app)
        .post('/api/admin/notifications/test')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No notification channels configured');
    });
  });

  describe('GET /api/admin/reports/daily', () => {
    it('should return daily reports', async () => {
      const response = await request(app)
        .get('/api/admin/reports/daily');

      expect(response.status).toBe(200);
      expect(response.body.date).toBeDefined();
      expect(response.body.products).toBeDefined();
      expect(response.body.listings).toBeDefined();
      expect(response.body.jobs).toBeDefined();
    });
  });

  describe('GET /api/admin/reports/weekly', () => {
    it('should return weekly reports', async () => {
      const response = await request(app)
        .get('/api/admin/reports/weekly');

      expect(response.status).toBe(200);
      expect(response.body.period).toBeDefined();
      expect(response.body.totals).toBeDefined();
      expect(response.body.daily).toBeDefined();
    });
  });

  describe('GET /api/admin/performance', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/admin/performance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.circuitBreakers).toBeDefined();
      expect(response.body.data.jobSuccessRate).toBeDefined();
    });
  });

  describe('POST /api/admin/performance/circuit-breaker/:name/reset', () => {
    it('should reset circuit breaker', async () => {
      const response = await request(app)
        .post('/api/admin/performance/circuit-breaker/joom-api/reset');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/performance/dlq', () => {
    it('should clear DLQ', async () => {
      const response = await request(app)
        .delete('/api/admin/performance/dlq');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

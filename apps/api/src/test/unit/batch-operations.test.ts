import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'test-job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    listing: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'listing-123' }),
      update: vi.fn().mockResolvedValue({}),
    },
    jobLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    priceChangeLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
  ProductStatus: {
    APPROVED: 'APPROVED',
    READY_TO_REVIEW: 'READY_TO_REVIEW',
    PENDING: 'PENDING',
  },
  Marketplace: {
    JOOM: 'JOOM',
    EBAY: 'EBAY',
  },
}));

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
  QUEUE_NAMES: {
    PUBLISH: 'publish-queue',
  },
}));

// Import after mocks
import { batchOperationsRouter } from '../../routes/batch-operations';

describe('Batch Operations API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/batch', batchOperationsRouter);
  });

  describe('POST /api/batch/publish', () => {
    it('should reject request without marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('marketplace is required');
    });

    it('should reject invalid marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid joom marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'joom', options: { dryRun: true } });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.marketplace).toBe('joom');
      expect(response.body.dryRun).toBe(true);
    });

    it('should accept valid ebay marketplace', async () => {
      const response = await request(app)
        .post('/api/batch/publish')
        .send({ marketplace: 'ebay', options: { dryRun: true } });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.marketplace).toBe('ebay');
    });
  });

  describe('POST /api/batch/publish/preview', () => {
    it('should return preview with dryRun=true', async () => {
      const response = await request(app)
        .post('/api/batch/publish/preview')
        .send({ marketplace: 'joom' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dryRun).toBe(true);
    });
  });

  describe('GET /api/batch/publish/status', () => {
    it('should return queue status', async () => {
      const response = await request(app)
        .get('/api/batch/publish/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.name).toBe('publish');
    });
  });

  describe('POST /api/batch/price-change', () => {
    it('should reject request without change type', async () => {
      const response = await request(app)
        .post('/api/batch/price-change')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('change.type is required');
    });

    it('should accept valid price change request', async () => {
      const response = await request(app)
        .post('/api/batch/price-change')
        .send({
          change: { type: 'percent', value: 10 },
          options: { dryRun: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dryRun).toBe(true);
    });
  });

  describe('POST /api/batch/listing-operation', () => {
    it('should reject request without operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('operation is required');
    });

    it('should reject invalid operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid pause operation', async () => {
      const response = await request(app)
        .post('/api/batch/listing-operation')
        .send({ operation: 'pause', options: { dryRun: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('pause');
    });
  });
});

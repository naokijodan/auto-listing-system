import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Use vi.hoisted to define mocks before vi.mock
const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
    })),
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

// Import after mocks
import { concurrencyRouter } from '../../routes/concurrency';

describe('Concurrency API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/concurrency', concurrencyRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/concurrency', () => {
    it('should return default concurrency configs when no custom configs exist', async () => {
      mockGet.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/concurrency');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include utilization in response', async () => {
      mockGet.mockImplementation(async (key: string) => {
        if (key === 'rakuda:concurrency:configs') return null;
        if (key.includes(':active')) return '2';
        return null;
      });

      const response = await request(app)
        .get('/api/concurrency');

      expect(response.status).toBe(200);
      const config = response.body.data[0];
      expect(config.activeJobs).toBeDefined();
      expect(config.utilization).toBeDefined();
    });

    it('should merge custom configs with defaults', async () => {
      const customConfigs = [
        { queueName: 'scrape', concurrency: 5, priority: 1, enabled: false },
      ];
      mockGet.mockImplementation(async (key: string) => {
        if (key === 'rakuda:concurrency:configs') return JSON.stringify(customConfigs);
        return '0';
      });

      const response = await request(app)
        .get('/api/concurrency');

      expect(response.status).toBe(200);
      const scrapeConfig = response.body.data.find((c: any) => c.queueName === 'scrape');
      expect(scrapeConfig.concurrency).toBe(5);
      expect(scrapeConfig.enabled).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Redis connection error'));

      const response = await request(app)
        .get('/api/concurrency');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/concurrency/:queueName', () => {
    it('should update concurrency config for a queue', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/concurrency/scrape')
        .send({
          concurrency: 10,
          priority: 2,
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queueName).toBe('scrape');
      expect(response.body.data.concurrency).toBe(10);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should update existing config', async () => {
      const existingConfigs = [
        { queueName: 'scrape', concurrency: 2, priority: 1, enabled: true },
      ];
      mockGet.mockResolvedValue(JSON.stringify(existingConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/concurrency/scrape')
        .send({ concurrency: 8 });

      expect(response.status).toBe(200);
      expect(response.body.data.concurrency).toBe(8);
    });

    it('should use default values for new queue', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/concurrency/new-queue')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.queueName).toBe('new-queue');
      expect(response.body.data.concurrency).toBe(1);
    });
  });

  describe('DELETE /api/concurrency/:queueName', () => {
    it('should reset concurrency config for a queue', async () => {
      const existingConfigs = [
        { queueName: 'scrape', concurrency: 10, priority: 1, enabled: true },
        { queueName: 'translate', concurrency: 5, priority: 2, enabled: true },
      ];
      mockGet.mockResolvedValue(JSON.stringify(existingConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .delete('/api/concurrency/scrape');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reset).toBe(true);
      expect(response.body.data.queueName).toBe('scrape');
    });

    it('should return reset:false when no configs exist', async () => {
      mockGet.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/concurrency/scrape');

      expect(response.status).toBe(200);
      expect(response.body.data.reset).toBe(false);
    });
  });

  describe('GET /api/concurrency/recommended', () => {
    it('should return recommended settings', async () => {
      const response = await request(app)
        .get('/api/concurrency/recommended');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.scrape).toBeDefined();
      expect(response.body.data.scrape.concurrency).toBeDefined();
      expect(response.body.data.scrape.reason).toBeDefined();
    });
  });

  describe('POST /api/concurrency/pause-all', () => {
    it('should pause all queues', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/concurrency/pause-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paused).toBeGreaterThan(0);

      // Verify all queues are set to enabled: false
      const setCall = mockSet.mock.calls[0];
      const savedConfigs = JSON.parse(setCall[1]);
      savedConfigs.forEach((config: any) => {
        expect(config.enabled).toBe(false);
      });
    });

    it('should pause existing custom configs', async () => {
      const existingConfigs = [
        { queueName: 'scrape', concurrency: 10, priority: 1, enabled: true },
      ];
      mockGet.mockResolvedValue(JSON.stringify(existingConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/concurrency/pause-all');

      expect(response.status).toBe(200);
      const setCall = mockSet.mock.calls[0];
      const savedConfigs = JSON.parse(setCall[1]);
      expect(savedConfigs[0].enabled).toBe(false);
    });
  });

  describe('POST /api/concurrency/resume-all', () => {
    it('should resume all queues', async () => {
      const pausedConfigs = [
        { queueName: 'scrape', concurrency: 2, priority: 1, enabled: false },
        { queueName: 'translate', concurrency: 5, priority: 2, enabled: false },
      ];
      mockGet.mockResolvedValue(JSON.stringify(pausedConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/concurrency/resume-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resumed).toBe(2);

      // Verify all queues are set to enabled: true
      const setCall = mockSet.mock.calls[0];
      const savedConfigs = JSON.parse(setCall[1]);
      savedConfigs.forEach((config: any) => {
        expect(config.enabled).toBe(true);
      });
    });

    it('should resume default configs when no custom configs exist', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/concurrency/resume-all');

      expect(response.status).toBe(200);
      expect(response.body.data.resumed).toBeGreaterThan(0);
    });
  });
});

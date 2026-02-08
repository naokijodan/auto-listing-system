import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Use vi.hoisted to define mocks before vi.mock
const { mockGet, mockSet, mockDel, mockZremrangebyscore, mockZcard } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
  mockZremrangebyscore: vi.fn(),
  mockZcard: vi.fn(),
}));

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      del: mockDel,
      zremrangebyscore: mockZremrangebyscore,
      zcard: mockZcard,
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
import { rateLimitsRouter } from '../../routes/rate-limits';

describe('Rate Limits API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/rate-limits', rateLimitsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/rate-limits', () => {
    it('should return default rate limit configs when no custom configs exist', async () => {
      mockGet.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/rate-limits');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should merge custom configs with defaults', async () => {
      const customConfigs = [
        { domain: 'mercari.com', requestsPerWindow: 5, windowMs: 60000, minDelayMs: 10000 },
      ];
      mockGet.mockResolvedValue(JSON.stringify(customConfigs));

      const response = await request(app)
        .get('/api/rate-limits');

      expect(response.status).toBe(200);
      const mercariConfig = response.body.data.find((c: any) => c.domain === 'mercari.com');
      expect(mercariConfig.requestsPerWindow).toBe(5);
    });

    it('should handle Redis errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Redis connection error'));

      const response = await request(app)
        .get('/api/rate-limits');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/rate-limits/:domain', () => {
    it('should update rate limit config for a domain', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/rate-limits/mercari.com')
        .send({
          requestsPerWindow: 20,
          windowMs: 120000,
          minDelayMs: 2000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('mercari.com');
      expect(response.body.data.requestsPerWindow).toBe(20);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should update existing config', async () => {
      const existingConfigs = [
        { domain: 'mercari.com', requestsPerWindow: 10, windowMs: 60000, minDelayMs: 5000 },
      ];
      mockGet.mockResolvedValue(JSON.stringify(existingConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/rate-limits/mercari.com')
        .send({ requestsPerWindow: 15 });

      expect(response.status).toBe(200);
      expect(response.body.data.requestsPerWindow).toBe(15);
    });

    it('should use default values for new domain', async () => {
      mockGet.mockResolvedValue(null);
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .put('/api/rate-limits/new-domain.com')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.domain).toBe('new-domain.com');
      // Should use default config values
      expect(response.body.data.requestsPerWindow).toBeDefined();
    });
  });

  describe('DELETE /api/rate-limits/:domain', () => {
    it('should reset rate limit config for a domain', async () => {
      const existingConfigs = [
        { domain: 'mercari.com', requestsPerWindow: 10, windowMs: 60000, minDelayMs: 5000 },
        { domain: 'yahoo.co.jp', requestsPerWindow: 15, windowMs: 60000, minDelayMs: 3000 },
      ];
      mockGet.mockResolvedValue(JSON.stringify(existingConfigs));
      mockSet.mockResolvedValue('OK');

      const response = await request(app)
        .delete('/api/rate-limits/mercari.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reset).toBe(true);
      expect(response.body.data.domain).toBe('mercari.com');
    });

    it('should return reset:false when no configs exist', async () => {
      mockGet.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/rate-limits/mercari.com');

      expect(response.status).toBe(200);
      expect(response.body.data.reset).toBe(false);
    });
  });

  describe('GET /api/rate-limits/status', () => {
    it('should return rate limit status for all domains', async () => {
      mockGet.mockResolvedValue(null);
      mockZremrangebyscore.mockResolvedValue(0);
      mockZcard.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/rate-limits/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const status = response.body.data[0];
      expect(status.domain).toBeDefined();
      expect(status.currentCount).toBeDefined();
      expect(status.limit).toBeDefined();
      expect(status.remaining).toBeDefined();
      expect(status.canRequest).toBeDefined();
    });

    it('should merge custom configs when checking status', async () => {
      const customConfigs = [
        { domain: 'mercari.com', requestsPerWindow: 5, windowMs: 60000, minDelayMs: 10000 },
      ];
      mockGet.mockResolvedValue(JSON.stringify(customConfigs));
      mockZremrangebyscore.mockResolvedValue(0);
      mockZcard.mockResolvedValue(3);

      const response = await request(app)
        .get('/api/rate-limits/status');

      expect(response.status).toBe(200);
      const mercariStatus = response.body.data.find((s: any) => s.domain === 'mercari.com');
      expect(mercariStatus.config.requestsPerWindow).toBe(5);
    });
  });

  describe('POST /api/rate-limits/reset/:domain', () => {
    it('should reset rate limit counter for a domain', async () => {
      mockDel.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/rate-limits/reset/mercari.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reset).toBe(true);
      expect(response.body.data.domain).toBe('mercari.com');
      expect(mockDel).toHaveBeenCalledWith('rakuda:rate-limit:mercari.com');
    });
  });
});

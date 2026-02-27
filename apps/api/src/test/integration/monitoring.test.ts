import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Redis and BullMQ
const { mockRedis, mockQueue } = vi.hoisted(() => ({
  mockRedis: {
    get: vi.fn(),
    set: vi.fn(),
    lrange: vi.fn(),
    lpush: vi.fn(),
    del: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    hincrby: vi.fn(),
    expire: vi.fn(),
  },
  mockQueue: {
    getWaitingCount: vi.fn().mockResolvedValue(5),
    getActiveCount: vi.fn().mockResolvedValue(2),
    getCompletedCount: vi.fn().mockResolvedValue(100),
    getFailedCount: vi.fn().mockResolvedValue(3),
    getDelayedCount: vi.fn().mockResolvedValue(1),
    getFailed: vi.fn().mockResolvedValue([]),
    name: 'test-queue',
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => mockQueue),
}));

// Mock log aggregator
const { mockLogAggregator } = vi.hoisted(() => ({
  mockLogAggregator: {
    search: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
    getStats: vi.fn().mockResolvedValue({
      totalLogs: 1000,
      byLevel: { info: 800, error: 50, warn: 150 },
    }),
    export: vi.fn().mockResolvedValue('[]'),
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
  getLogAggregator: vi.fn().mockReturnValue(mockLogAggregator),
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    TRANSLATION: 'translation',
    IMAGE_PROCESSING: 'image-processing',
    NOTIFICATION: 'notification',
  },
}));

// Import after mocks
import { monitoringRouter } from '../../routes/monitoring';

describe('Monitoring API', () => {
  let app: express.Application;

  const mockAlert = {
    id: 'alert-1',
    type: 'error_rate',
    severity: 'warning',
    message: 'High error rate detected',
    queueName: 'translation',
    value: 15,
    threshold: 10,
    createdAt: new Date(),
    acknowledged: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/monitoring', monitoringRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return system metrics', async () => {
      mockRedis.get.mockResolvedValue('10');
      // Most lrange calls are for processing times, last one is for alerts
      mockRedis.lrange.mockImplementation((key: string) => {
        if (key === 'rakuda:alerts') {
          return Promise.resolve([JSON.stringify(mockAlert)]);
        }
        return Promise.resolve(['100', '150', '120']); // processing times
      });

      const response = await request(app)
        .get('/api/monitoring/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queues).toBeDefined();
      expect(response.body.data.totalJobs).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.period).toBeDefined();
    });

    it('should accept hours parameter', async () => {
      mockRedis.get.mockResolvedValue('10');
      mockRedis.lrange.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/monitoring/metrics?hours=48');

      expect(response.status).toBe(200);
      expect(response.body.data.period.hours).toBe(48);
    });

    it('should cap hours at 168 (1 week)', async () => {
      mockRedis.get.mockResolvedValue('10');
      mockRedis.lrange.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/monitoring/metrics?hours=500');

      expect(response.status).toBe(200);
      expect(response.body.data.period.hours).toBe(168);
    });

    it('should calculate success rate', async () => {
      mockRedis.get.mockImplementation((key) => {
        if (key.includes(':completed')) return '90';
        if (key.includes(':failed')) return '10';
        return '0';
      });
      mockRedis.lrange.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/monitoring/metrics?hours=1');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/monitoring/metrics/timeseries/:queueName', () => {
    it('should return time series data', async () => {
      mockRedis.get.mockResolvedValue('10');

      const response = await request(app)
        .get('/api/monitoring/metrics/timeseries/translation');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queueName).toBe('translation');
      expect(response.body.data.points).toBeDefined();
    });

    it('should accept metric parameter', async () => {
      mockRedis.get.mockResolvedValue('5');

      const response = await request(app)
        .get('/api/monitoring/metrics/timeseries/translation?metric=failed');

      expect(response.status).toBe(200);
      expect(response.body.data.metric).toBe('failed');
    });

    it('should accept hours parameter', async () => {
      mockRedis.get.mockResolvedValue('10');

      const response = await request(app)
        .get('/api/monitoring/metrics/timeseries/translation?hours=12');

      expect(response.status).toBe(200);
      expect(response.body.data.points).toHaveLength(12);
    });
  });

  describe('GET /api/monitoring/alerts', () => {
    it('should return list of alerts', async () => {
      mockRedis.lrange.mockResolvedValue([JSON.stringify(mockAlert)]);

      const response = await request(app)
        .get('/api/monitoring/alerts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by acknowledged=false', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify(mockAlert),
        JSON.stringify({ ...mockAlert, id: 'alert-2', acknowledged: true }),
      ]);

      const response = await request(app)
        .get('/api/monitoring/alerts?acknowledged=false');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].acknowledged).toBe(false);
    });

    it('should filter by acknowledged=true', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify(mockAlert),
        JSON.stringify({ ...mockAlert, id: 'alert-2', acknowledged: true }),
      ]);

      const response = await request(app)
        .get('/api/monitoring/alerts?acknowledged=true');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].acknowledged).toBe(true);
    });

    it('should accept limit parameter', async () => {
      mockRedis.lrange.mockResolvedValue([]);

      await request(app)
        .get('/api/monitoring/alerts?limit=10');

      expect(mockRedis.lrange).toHaveBeenCalledWith('rakuda:alerts', 0, 9);
    });
  });

  describe('POST /api/monitoring/alerts/:alertId/acknowledge', () => {
    it('should acknowledge alert', async () => {
      mockRedis.lrange.mockResolvedValue([JSON.stringify(mockAlert)]);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.lpush.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/monitoring/alerts/alert-1/acknowledge');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.acknowledged).toBe(true);
    });

    it('should return 404 for non-existent alert', async () => {
      mockRedis.lrange.mockResolvedValue([JSON.stringify(mockAlert)]);

      const response = await request(app)
        .post('/api/monitoring/alerts/non-existent/acknowledge');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/monitoring/alerts/acknowledge-all', () => {
    it('should acknowledge all alerts', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify(mockAlert),
        JSON.stringify({ ...mockAlert, id: 'alert-2' }),
      ]);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.lpush.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/monitoring/alerts/acknowledge-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.acknowledged).toBe(2);
    });
  });

  describe('GET /api/monitoring/errors', () => {
    it('should return list of errors', async () => {
      mockQueue.getFailed.mockResolvedValue([
        {
          id: 'job-1',
          name: 'translate',
          failedReason: 'API Error',
          stacktrace: ['Error at line 1'],
          attemptsMade: 3,
          timestamp: Date.now(),
          processedOn: Date.now(),
          finishedOn: Date.now(),
        },
      ]);

      const response = await request(app)
        .get('/api/monitoring/errors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter by queueName', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/monitoring/errors?queueName=translation');

      expect(response.status).toBe(200);
    });

    it('should accept limit parameter', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/monitoring/errors?limit=10');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/monitoring/health', () => {
    it('should return healthy status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockQueue.getWaitingCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/monitoring/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.redis).toBe('connected');
    });

    it('should return degraded status when queue is unhealthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Queue error'));

      const response = await request(app)
        .get('/api/monitoring/health');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('degraded');
    });

    it('should return unhealthy when Redis fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/api/monitoring/health');

      expect(response.status).toBe(500);
      expect(response.body.data.status).toBe('unhealthy');
    });
  });

  describe('GET /api/monitoring/logs', () => {
    it('should return log search results', async () => {
      mockLogAggregator.search.mockResolvedValue({
        logs: [{ level: 'info', message: 'Test log' }],
        total: 1,
      });

      const response = await request(app)
        .get('/api/monitoring/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeDefined();
    });

    it('should accept filter parameters', async () => {
      mockLogAggregator.search.mockResolvedValue({ logs: [], total: 0 });

      const response = await request(app)
        .get('/api/monitoring/logs?level=error&module=api&search=failed');

      expect(response.status).toBe(200);
      expect(mockLogAggregator.search).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          module: 'api',
          search: 'failed',
        })
      );
    });

    it('should accept pagination parameters', async () => {
      mockLogAggregator.search.mockResolvedValue({ logs: [], total: 100 });

      const response = await request(app)
        .get('/api/monitoring/logs?limit=50&offset=10');

      expect(response.status).toBe(200);
      expect(mockLogAggregator.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 10,
        })
      );
    });

    it('should cap limit at 1000', async () => {
      mockLogAggregator.search.mockResolvedValue({ logs: [], total: 0 });

      const response = await request(app)
        .get('/api/monitoring/logs?limit=5000');

      expect(response.status).toBe(200);
      expect(mockLogAggregator.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000,
        })
      );
    });
  });

  describe('GET /api/monitoring/logs/stats', () => {
    it('should return log statistics', async () => {
      mockLogAggregator.getStats.mockResolvedValue({
        totalLogs: 1000,
        byLevel: { info: 800, error: 50, warn: 150 },
      });

      const response = await request(app)
        .get('/api/monitoring/logs/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLogs).toBe(1000);
      expect(response.body.data.byLevel).toBeDefined();
    });

    it('should accept hours parameter', async () => {
      mockLogAggregator.getStats.mockResolvedValue({ totalLogs: 500 });

      const response = await request(app)
        .get('/api/monitoring/logs/stats?hours=48');

      expect(response.status).toBe(200);
      expect(mockLogAggregator.getStats).toHaveBeenCalledWith({ hours: 48 });
    });
  });

  describe('GET /api/monitoring/logs/export', () => {
    it('should export logs as ndjson', async () => {
      mockLogAggregator.export.mockResolvedValue('{"level":"info"}\n{"level":"error"}');

      const response = await request(app)
        .get('/api/monitoring/logs/export');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/x-ndjson');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export logs as JSON', async () => {
      mockLogAggregator.export.mockResolvedValue('[{"level":"info"}]');

      const response = await request(app)
        .get('/api/monitoring/logs/export?format=json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should export logs as CSV', async () => {
      mockLogAggregator.export.mockResolvedValue('level,message\ninfo,test');

      const response = await request(app)
        .get('/api/monitoring/logs/export?format=csv');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should accept filter parameters', async () => {
      mockLogAggregator.export.mockResolvedValue('[]');

      const response = await request(app)
        .get('/api/monitoring/logs/export?level=error&module=worker');

      expect(response.status).toBe(200);
      expect(mockLogAggregator.export).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          module: 'worker',
        })
      );
    });
  });
});

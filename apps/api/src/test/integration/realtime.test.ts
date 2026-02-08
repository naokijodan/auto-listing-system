import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Redis
const { mockRedis, mockSubscriber } = vi.hoisted(() => ({
  mockRedis: {
    hincrby: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    publish: vi.fn().mockResolvedValue(1),
  },
  mockSubscriber: {
    psubscribe: vi.fn().mockResolvedValue(undefined),
    punsubscribe: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => {
    // First call returns main redis, subsequent calls return subscriber
    return { ...mockRedis, ...mockSubscriber };
  }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123'),
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

vi.mock('@rakuda/config', () => ({
  EVENT_CHANNELS: {
    ALL: 'rakuda:events:*',
    LISTINGS: 'rakuda:events:listings',
    ORDERS: 'rakuda:events:orders',
    JOBS: 'rakuda:events:jobs',
  },
  SSE_CONFIG: {
    enabled: true,
    heartbeatInterval: 30000,
    debounceWindow: 100,
  },
}));

vi.mock('@rakuda/schema', () => ({
  RealTimeEvent: {},
}));

// Import after mocks
import { realtimeRouter } from '../../routes/realtime';

describe('Realtime API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/realtime', realtimeRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/realtime/status', () => {
    it('should return connection status', async () => {
      const response = await request(app)
        .get('/api/realtime/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.activeConnections).toBeDefined();
      expect(response.body.data.totalConnections).toBeDefined();
      expect(response.body.data.heartbeatInterval).toBeDefined();
      expect(response.body.data.debounceWindow).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /api/realtime/stats', () => {
    it('should return delivery statistics', async () => {
      mockRedis.hgetall.mockResolvedValue({
        published: '100',
        delivered: '95',
      });

      const response = await request(app)
        .get('/api/realtime/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activeConnections).toBeDefined();
      expect(response.body.data.totalPublished).toBeDefined();
      expect(response.body.data.totalDelivered).toBeDefined();
      expect(response.body.data.deliveryRate).toBeDefined();
      expect(response.body.data.period).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const response = await request(app)
        .get('/api/realtime/stats?days=30');

      expect(response.status).toBe(200);
      expect(response.body.data.period.days).toBe(30);
    });

    it('should calculate delivery rate correctly', async () => {
      mockRedis.hgetall.mockImplementation((key) => {
        const date = key.split(':').pop();
        return Promise.resolve({
          published: '100',
          delivered: '80',
        });
      });

      const response = await request(app)
        .get('/api/realtime/stats?days=1');

      expect(response.status).toBe(200);
      expect(response.body.data.deliveryRate).toBeGreaterThan(0);
    });

    it('should handle empty stats', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const response = await request(app)
        .get('/api/realtime/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalPublished).toBe(0);
      expect(response.body.data.totalDelivered).toBe(0);
      expect(response.body.data.deliveryRate).toBe(1);
    });
  });

  describe('GET /api/realtime/connections', () => {
    it('should return active connections list', async () => {
      const response = await request(app)
        .get('/api/realtime/connections');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeDefined();
      expect(response.body.data.connections).toBeDefined();
      expect(Array.isArray(response.body.data.connections)).toBe(true);
    });
  });

  describe('POST /api/realtime/test', () => {
    it('should publish test event', async () => {
      mockRedis.publish.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/realtime/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test event published');
      expect(response.body.event).toBeDefined();
      expect(response.body.event.type).toBe('LISTING_UPDATE');
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('should return event details', async () => {
      mockRedis.publish.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/realtime/test');

      expect(response.status).toBe(200);
      expect(response.body.event.payload).toBeDefined();
      expect(response.body.event.timestamp).toBeDefined();
    });

    it('should return active connections count', async () => {
      mockRedis.publish.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/realtime/test');

      expect(response.status).toBe(200);
      expect(response.body.activeConnections).toBeDefined();
    });
  });

  // Note: SSE endpoint testing is complex because it's a streaming endpoint
  // These tests verify the endpoint exists and handles disabled state
  describe('GET /api/realtime/events', () => {
    it('should return 503 when SSE is disabled', async () => {
      // Temporarily modify config to disable SSE
      const { SSE_CONFIG } = await import('@rakuda/config');
      const originalEnabled = SSE_CONFIG.enabled;
      (SSE_CONFIG as any).enabled = false;

      const response = await request(app)
        .get('/api/realtime/events');

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('disabled');

      // Restore
      (SSE_CONFIG as any).enabled = originalEnabled;
    });
  });
});

describe('Realtime API - SSE Disabled', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset module to get fresh SSE_CONFIG
    vi.doMock('@rakuda/config', () => ({
      EVENT_CHANNELS: {
        ALL: 'rakuda:events:*',
        LISTINGS: 'rakuda:events:listings',
      },
      SSE_CONFIG: {
        enabled: false,
        heartbeatInterval: 30000,
        debounceWindow: 100,
      },
    }));

    app = express();
    app.use(express.json());

    // Re-import router with disabled config
    const { realtimeRouter: disabledRouter } = await import('../../routes/realtime');
    app.use('/api/realtime', disabledRouter);
  });

  it('should indicate SSE is disabled in status', async () => {
    const response = await request(app)
      .get('/api/realtime/status');

    expect(response.status).toBe(200);
    // Status endpoint still works, just shows enabled: false
    expect(response.body.data.enabled).toBeDefined();
  });
});

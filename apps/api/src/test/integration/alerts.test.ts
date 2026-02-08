import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Redis and BullMQ
const { mockRedis, mockQueue } = vi.hoisted(() => ({
  mockRedis: {
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
const { mockAlertRule, mockAlertLog } = vi.hoisted(() => ({
  mockAlertRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mockAlertLog: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    alertRule: mockAlertRule,
    alertLog: mockAlertLog,
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

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    NOTIFICATION: 'notification-queue',
  },
}));

vi.mock('@rakuda/schema', () => ({
  CreateAlertRuleSchema: {
    parse: vi.fn((data) => data),
  },
  UpdateAlertRuleSchema: {
    parse: vi.fn((data) => data),
  },
  SendManualAlertSchema: {
    parse: vi.fn((data) => data),
  },
  AlertEventType: {},
}));

// Import after mocks
import { alertsRouter } from '../../routes/alerts';

describe('Alerts API', () => {
  let app: express.Application;

  const mockRule = {
    id: 'rule-1',
    name: 'Test Alert Rule',
    eventType: 'INVENTORY_LOW',
    conditions: { threshold: 5 },
    severity: 'warning',
    channels: ['slack', 'email'],
    cooldownMinutes: 60,
    batchWindowMinutes: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLog = {
    id: 'log-1',
    eventType: 'INVENTORY_LOW',
    severity: 'warning',
    title: 'Low inventory alert',
    message: 'Stock is running low',
    metadata: {},
    channels: ['slack'],
    status: 'sent',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/alerts', alertsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/alerts/rules', () => {
    it('should return list of alert rules', async () => {
      mockAlertRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/alerts/rules');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });

    it('should filter by eventType', async () => {
      mockAlertRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/alerts/rules?eventType=INVENTORY_LOW');

      expect(response.status).toBe(200);
      expect(mockAlertRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: 'INVENTORY_LOW',
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      mockAlertRule.findMany.mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/alerts/rules?isActive=true');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/alerts/rules', () => {
    it('should create new alert rule', async () => {
      mockAlertRule.create.mockResolvedValue(mockRule);

      const response = await request(app)
        .post('/api/alerts/rules')
        .send({
          name: 'Test Alert Rule',
          eventType: 'INVENTORY_LOW',
          conditions: { threshold: 5 },
          severity: 'warning',
          channels: ['slack'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/alerts/rules/:id', () => {
    it('should return single alert rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(mockRule);

      const response = await request(app)
        .get('/api/alerts/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('rule-1');
    });

    it('should return 404 for non-existent rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/alerts/rules/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/alerts/rules/:id', () => {
    it('should update alert rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(mockRule);
      mockAlertRule.update.mockResolvedValue({
        ...mockRule,
        name: 'Updated Rule',
      });

      const response = await request(app)
        .put('/api/alerts/rules/rule-1')
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/alerts/rules/non-existent')
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/alerts/rules/:id', () => {
    it('should delete alert rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(mockRule);
      mockAlertRule.delete.mockResolvedValue(mockRule);

      const response = await request(app)
        .delete('/api/alerts/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alert rule deleted');
    });

    it('should return 404 for non-existent rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/alerts/rules/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/alerts/rules/:id/test', () => {
    it('should send test notification', async () => {
      mockAlertRule.findUnique.mockResolvedValue(mockRule);

      const response = await request(app)
        .post('/api/alerts/rules/rule-1/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test notifications queued');
      expect(response.body.jobs).toBeDefined();
    });

    it('should return 404 for non-existent rule', async () => {
      mockAlertRule.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/alerts/rules/non-existent/test');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/alerts/logs', () => {
    it('should return list of alert logs', async () => {
      mockAlertLog.findMany.mockResolvedValue([mockLog]);
      mockAlertLog.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/alerts/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by eventType', async () => {
      mockAlertLog.findMany.mockResolvedValue([mockLog]);
      mockAlertLog.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/alerts/logs?eventType=INVENTORY_LOW');

      expect(response.status).toBe(200);
    });

    it('should filter by status', async () => {
      mockAlertLog.findMany.mockResolvedValue([mockLog]);
      mockAlertLog.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/alerts/logs?status=sent');

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      mockAlertLog.findMany.mockResolvedValue([mockLog]);
      mockAlertLog.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/alerts/logs?from=2026-01-01&to=2026-12-31');

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      mockAlertLog.findMany.mockResolvedValue([]);
      mockAlertLog.count.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/alerts/logs?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });
  });

  describe('GET /api/alerts/logs/stats', () => {
    it('should return alert statistics', async () => {
      mockAlertLog.count.mockResolvedValue(10);
      mockAlertLog.groupBy.mockResolvedValue([
        { status: 'sent', _count: { status: 8 } },
        { status: 'failed', _count: { status: 2 } },
      ]);
      mockAlertLog.findMany.mockResolvedValue([
        { channels: ['slack'] },
        { channels: ['email', 'slack'] },
      ]);

      const response = await request(app)
        .get('/api/alerts/logs/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLogs).toBeDefined();
      expect(response.body.data.byStatus).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockAlertLog.count.mockResolvedValue(5);
      mockAlertLog.groupBy.mockResolvedValue([]);
      mockAlertLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/alerts/logs/stats?days=30');

      expect(response.status).toBe(200);
      expect(response.body.data.period.days).toBe(30);
    });
  });

  describe('POST /api/alerts/send', () => {
    it('should send manual alert', async () => {
      mockAlertLog.create.mockResolvedValue(mockLog);

      const response = await request(app)
        .post('/api/alerts/send')
        .send({
          eventType: 'MANUAL',
          title: 'Test Alert',
          message: 'This is a test alert',
          severity: 'info',
          channels: ['slack'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

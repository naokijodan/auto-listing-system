import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      alertRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rule-1',
            name: 'High Error Rate',
            metric: 'error_rate',
            condition: 'greater_than',
            threshold: 5,
            severity: 'critical',
            isActive: true,
            channels: ['slack', 'email'],
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'rule-1',
          name: 'High Error Rate',
          isActive: true,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'rule-2',
          name: 'Low Memory',
          metric: 'memory_usage',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'rule-1',
          isActive: false,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'rule-1' }),
        count: vi.fn().mockResolvedValue(5),
      },
      alertIncident: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inc-1',
            ruleId: 'rule-1',
            status: 'active',
            severity: 'critical',
            message: 'Error rate exceeded threshold',
            triggeredAt: new Date(),
            acknowledgedAt: null,
            resolvedAt: null,
            rule: {
              id: 'rule-1',
              name: 'High Error Rate',
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'inc-1',
          status: 'active',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'inc-2',
          ruleId: 'rule-1',
          status: 'active',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'inc-1',
          status: 'acknowledged',
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _count: { id: 10 },
        }),
      },
      alertEscalation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'esc-1',
            ruleId: 'rule-1',
            level: 1,
            delayMinutes: 15,
            channels: ['pagerduty'],
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'esc-2',
          ruleId: 'rule-1',
          level: 2,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'esc-1',
          delayMinutes: 30,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'esc-1' }),
      },
      alertNotificationChannel: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ch-1',
            name: 'Slack Engineering',
            type: 'slack',
            config: { webhookUrl: 'https://hooks.slack.com/...' },
            isActive: true,
          },
          {
            id: 'ch-2',
            name: 'Email Team',
            type: 'email',
            config: { emails: ['team@example.com'] },
            isActive: true,
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'ch-1',
          name: 'Slack Engineering',
          type: 'slack',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'ch-3',
          name: 'PagerDuty',
          type: 'pagerduty',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'ch-1',
          isActive: false,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'ch-1' }),
        count: vi.fn().mockResolvedValue(3),
      },
      alertNotification: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(100),
      },
    },
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { monitoringAlertsRouter } from '../../routes/monitoring-alerts';

describe('Monitoring Alerts API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/monitoring-alerts', monitoringAlertsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/monitoring-alerts/stats', () => {
    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/monitoring-alerts/rules', () => {
    it('should return alert rules', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules?isActive=true');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules?severity=critical');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/monitoring-alerts/rules', () => {
    it('should create an alert rule', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/rules')
        .send({
          name: 'CPU Usage Alert',
          metric: 'cpu_usage',
          condition: 'greater_than',
          threshold: 80,
          severity: 'warning',
          channels: ['slack'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should require name', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/rules')
        .send({
          metric: 'cpu_usage',
          threshold: 80,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/monitoring-alerts/rules/:id', () => {
    it('should return a specific rule', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('rule-1');
    });
  });

  describe('PUT /api/monitoring-alerts/rules/:id', () => {
    it('should update a rule', async () => {
      const response = await request(app)
        .put('/api/monitoring-alerts/rules/rule-1')
        .send({
          threshold: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/monitoring-alerts/rules/:id', () => {
    it('should delete a rule', async () => {
      const response = await request(app)
        .delete('/api/monitoring-alerts/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/monitoring-alerts/rules/:id/toggle', () => {
    it('should toggle rule active status', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/rules/rule-1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/monitoring-alerts/incidents', () => {
    it('should return incidents', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents?status=active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents?severity=critical');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/monitoring-alerts/incidents/:id/acknowledge', () => {
    it('should acknowledge an incident', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/acknowledge');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept acknowledger info', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/acknowledge')
        .send({ acknowledgedBy: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/monitoring-alerts/incidents/:id/resolve', () => {
    it('should resolve an incident', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/resolve');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept resolution notes', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/resolve')
        .send({ notes: 'Fixed by restarting service' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/monitoring-alerts/escalations', () => {
    it('should return escalation settings', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/escalations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/monitoring-alerts/escalations', () => {
    it('should create an escalation', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/escalations')
        .send({
          ruleId: 'rule-1',
          level: 2,
          delayMinutes: 30,
          channels: ['pagerduty'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/monitoring-alerts/channels', () => {
    it('should return notification channels', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/channels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/monitoring-alerts/channels', () => {
    it('should create a notification channel', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/channels')
        .send({
          name: 'PagerDuty Oncall',
          type: 'pagerduty',
          config: { apiKey: 'xxx' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/monitoring-alerts/test', () => {
    it('should send a test alert', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/test')
        .send({
          channelId: 'ch-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require channelId', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/test')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});

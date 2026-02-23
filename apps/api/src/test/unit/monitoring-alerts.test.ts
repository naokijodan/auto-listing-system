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
            metricName: 'error_rate',
            condition: 'GREATER_THAN',
            threshold: 5,
            severity: 'CRITICAL',
            isActive: true,
            notificationChannels: ['slack', 'email'],
            _count: { incidents: 3, escalations: 1 },
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
          metricName: 'memory_usage',
          condition: 'GREATER_THAN',
          threshold: 80,
          severity: 'WARNING',
          isActive: true,
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
            status: 'OPEN',
            severity: 'CRITICAL',
            title: 'Error rate exceeded threshold',
            triggeredAt: new Date(),
            acknowledgedAt: null,
            resolvedAt: null,
            rule: {
              name: 'High Error Rate',
              metricName: 'error_rate',
            },
            _count: { notifications: 2 },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'inc-1',
          status: 'OPEN',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'inc-2',
          ruleId: 'rule-1',
          title: 'Test Alert',
          status: 'OPEN',
          severity: 'INFO',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'inc-1',
          status: 'ACKNOWLEDGED',
        }),
        count: vi.fn().mockResolvedValue(10),
      },
      alertEscalation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'esc-1',
            ruleId: 'rule-1',
            level: 1,
            delayMinutes: 15,
            notificationChannels: ['pagerduty'],
            rule: { name: 'High Error Rate' },
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'esc-2',
          ruleId: 'rule-1',
          level: 2,
          delayMinutes: 30,
          isActive: true,
        }),
      },
      alertNotificationChannel: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ch-1',
            name: 'Slack Engineering',
            channelType: 'slack',
            configuration: { webhookUrl: 'https://hooks.slack.com/...' },
            isActive: true,
          },
          {
            id: 'ch-2',
            name: 'Email Team',
            channelType: 'email',
            configuration: { emails: ['team@example.com'] },
            isActive: true,
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'ch-1',
          name: 'Slack Engineering',
          channelType: 'slack',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'ch-3',
          name: 'PagerDuty Oncall',
          channelType: 'pagerduty',
          isActive: true,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'ch-1',
          testStatus: 'SUCCESS',
          lastTestedAt: new Date(),
        }),
        count: vi.fn().mockResolvedValue(3),
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
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /api/monitoring-alerts/stats', () => {
    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalRules');
      expect(response.body).toHaveProperty('activeRules');
      expect(response.body).toHaveProperty('totalIncidents');
      expect(response.body).toHaveProperty('openIncidents');
      expect(response.body).toHaveProperty('acknowledgedIncidents');
      expect(response.body).toHaveProperty('resolvedIncidents');
      expect(response.body).toHaveProperty('criticalIncidents');
      expect(response.body).toHaveProperty('incidentsLast24h');
      expect(response.body).toHaveProperty('totalChannels');
      expect(response.body).toHaveProperty('activeChannels');
    });
  });

  describe('GET /api/monitoring-alerts/rules', () => {
    it('should return alert rules', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('rule-1');
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules?active=true');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/rules?severity=CRITICAL');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/monitoring-alerts/rules', () => {
    it('should create an alert rule', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/rules')
        .send({
          name: 'CPU Usage Alert',
          metricName: 'cpu_usage',
          condition: 'GREATER_THAN',
          threshold: 80,
          severity: 'WARNING',
          notificationChannels: ['slack'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
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
      expect(response.body).toHaveProperty('id', 'rule-1');
    });
  });

  describe('DELETE /api/monitoring-alerts/rules/:id', () => {
    it('should delete a rule', async () => {
      const response = await request(app)
        .delete('/api/monitoring-alerts/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('PATCH /api/monitoring-alerts/rules/:id/toggle', () => {
    it('should toggle rule active status', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/rules/rule-1/toggle');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'rule-1');
      expect(response.body).toHaveProperty('isActive');
    });
  });

  describe('GET /api/monitoring-alerts/incidents', () => {
    it('should return incidents with total count', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incidents');
      expect(response.body).toHaveProperty('total');
      expect(response.body.incidents).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents?status=OPEN');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incidents');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/incidents?severity=CRITICAL');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incidents');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('PATCH /api/monitoring-alerts/incidents/:id/acknowledge', () => {
    it('should acknowledge an incident', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/acknowledge');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'inc-1');
      expect(response.body).toHaveProperty('status', 'ACKNOWLEDGED');
    });

    it('should accept acknowledger info', async () => {
      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/acknowledge')
        .send({ acknowledgedBy: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('PATCH /api/monitoring-alerts/incidents/:id/resolve', () => {
    it('should resolve an incident', async () => {
      const { prisma } = await import('@rakuda/database');
      (prisma.alertIncident.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'inc-1',
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: 'system',
      });

      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/resolve');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'inc-1');
      expect(response.body).toHaveProperty('status', 'RESOLVED');
    });

    it('should accept resolution details', async () => {
      const { prisma } = await import('@rakuda/database');
      (prisma.alertIncident.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'inc-1',
        status: 'RESOLVED',
        resolvedBy: 'admin@example.com',
        rootCause: 'Memory leak',
        resolution: 'Fixed by restarting service',
      });

      const response = await request(app)
        .patch('/api/monitoring-alerts/incidents/inc-1/resolve')
        .send({
          resolvedBy: 'admin@example.com',
          rootCause: 'Memory leak',
          resolution: 'Fixed by restarting service',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'inc-1');
      expect(response.body).toHaveProperty('status', 'RESOLVED');
    });
  });

  describe('GET /api/monitoring-alerts/escalations', () => {
    it('should return escalation settings', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/escalations');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('esc-1');
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
          notificationChannels: ['pagerduty'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('ruleId', 'rule-1');
    });
  });

  describe('GET /api/monitoring-alerts/channels', () => {
    it('should return notification channels', async () => {
      const response = await request(app)
        .get('/api/monitoring-alerts/channels');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /api/monitoring-alerts/channels', () => {
    it('should create a notification channel', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/channels')
        .send({
          name: 'PagerDuty Oncall',
          channelType: 'pagerduty',
          configuration: { apiKey: 'xxx' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });
  });

  describe('POST /api/monitoring-alerts/channels/:id/test', () => {
    it('should test a notification channel', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/channels/ch-1/test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent channel', async () => {
      const { prisma } = await import('@rakuda/database');
      (prisma.alertNotificationChannel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/monitoring-alerts/channels/nonexistent/test');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Channel not found' });
    });
  });

  describe('POST /api/monitoring-alerts/test', () => {
    it('should send a test alert', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/test')
        .send({
          severity: 'INFO',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('incident');
      expect(response.body).toHaveProperty('message', 'Test alert created successfully');
    });

    it('should accept optional ruleId', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/test')
        .send({
          ruleId: 'rule-1',
          severity: 'WARNING',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('incident');
    });

    it('should create test alert with default severity when body is empty', async () => {
      const response = await request(app)
        .post('/api/monitoring-alerts/test')
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});

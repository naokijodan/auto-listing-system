import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      automationRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rule-1',
            name: 'Low Performance Rule',
            description: 'Auto pause low performance listings',
            triggerType: 'low_performance',
            conditions: { threshold: 10, metric: 'views' },
            actions: [{ type: 'pause_listing' }],
            isActive: true,
            priority: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'rule-1',
          name: 'Low Performance Rule',
          description: 'Auto pause low performance listings',
          triggerType: 'low_performance',
          conditions: { threshold: 10, metric: 'views' },
          actions: [{ type: 'pause_listing' }],
          isActive: true,
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn().mockResolvedValue({
          id: 'rule-2',
          name: 'New Rule',
          description: 'Test rule',
          triggerType: 'price_change',
          conditions: {},
          actions: [],
          isActive: true,
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({
          id: 'rule-1',
          name: 'Updated Rule',
          isActive: false,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'rule-1' }),
        count: vi.fn().mockResolvedValue(5),
      },
      automationExecution: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'exec-1',
            ruleId: 'rule-1',
            status: 'success',
            affectedListings: 3,
            executedAt: new Date(),
            details: {},
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'exec-2',
          ruleId: 'rule-1',
          status: 'success',
          affectedListings: 1,
          executedAt: new Date(),
          details: {},
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { affectedListings: 25 },
        }),
      },
      safetySettings: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'safety-1',
          maxDailyExecutions: 100,
          cooldownMinutes: 30,
          requireConfirmation: false,
          emergencyStop: false,
          excludedCategories: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'safety-1',
          maxDailyExecutions: 50,
          cooldownMinutes: 60,
          requireConfirmation: true,
          emergencyStop: false,
          excludedCategories: [],
        }),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
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
import { automationRulesRouter } from '../../routes/automation-rules';

describe('Automation Rules API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/automation-rules', automationRulesRouter);
    // Error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/automation-rules/stats', () => {
    it('should return automation statistics', async () => {
      const response = await request(app)
        .get('/api/automation-rules/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalRules).toBeDefined();
    });
  });

  describe('GET /api/automation-rules', () => {
    it('should return list of rules', async () => {
      const response = await request(app)
        .get('/api/automation-rules');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/automation-rules?isActive=true');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by trigger type', async () => {
      const response = await request(app)
        .get('/api/automation-rules?triggerType=low_performance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/automation-rules', () => {
    it('should create a new rule', async () => {
      const newRule = {
        name: 'Test Rule',
        description: 'Test description',
        triggerType: 'low_performance',
        conditions: { threshold: 5 },
        actions: [{ type: 'pause_listing' }],
      };

      const response = await request(app)
        .post('/api/automation-rules')
        .send(newRule);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should require name field', async () => {
      const response = await request(app)
        .post('/api/automation-rules')
        .send({
          triggerType: 'low_performance',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/automation-rules/:id', () => {
    it('should return a specific rule', async () => {
      const response = await request(app)
        .get('/api/automation-rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('rule-1');
    });
  });

  describe('PUT /api/automation-rules/:id', () => {
    it('should update a rule', async () => {
      const response = await request(app)
        .put('/api/automation-rules/rule-1')
        .send({
          name: 'Updated Rule',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/automation-rules/:id', () => {
    it('should delete a rule', async () => {
      const response = await request(app)
        .delete('/api/automation-rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/automation-rules/:id/toggle', () => {
    it('should toggle rule active status', async () => {
      const response = await request(app)
        .patch('/api/automation-rules/rule-1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/automation-rules/:id/test', () => {
    it('should perform dry run', async () => {
      const response = await request(app)
        .post('/api/automation-rules/rule-1/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.dryRun).toBe(true);
    });
  });

  describe('POST /api/automation-rules/:id/execute', () => {
    it('should execute a rule', async () => {
      const response = await request(app)
        .post('/api/automation-rules/rule-1/execute');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/automation-rules/executions', () => {
    it('should return execution history', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by rule ID', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions?ruleId=rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions?status=success');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/automation-rules/safety-settings', () => {
    it('should return safety settings', async () => {
      const response = await request(app)
        .get('/api/automation-rules/safety-settings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.maxDailyExecutions).toBeDefined();
      expect(response.body.data.cooldownMinutes).toBeDefined();
    });
  });

  describe('PUT /api/automation-rules/safety-settings', () => {
    it('should update safety settings', async () => {
      const response = await request(app)
        .put('/api/automation-rules/safety-settings')
        .send({
          maxDailyExecutions: 50,
          cooldownMinutes: 60,
          requireConfirmation: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/automation-rules/emergency-stop', () => {
    it('should activate emergency stop', async () => {
      const response = await request(app)
        .post('/api/automation-rules/emergency-stop')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deactivate emergency stop', async () => {
      const response = await request(app)
        .post('/api/automation-rules/emergency-stop')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

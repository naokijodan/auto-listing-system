import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  const mockRule = {
    id: 'rule-1',
    organizationId: 'default',
    name: 'Low Performance Rule',
    description: 'Auto pause low performance listings',
    trigger: 'LOW_PERFORMANCE',
    triggerConfig: {},
    conditions: [{ field: 'views', operator: 'lt', value: 10 }],
    conditionLogic: 'AND',
    action: 'PAUSE_LISTING',
    actionConfig: {},
    scheduleType: 'MANUAL',
    cronExpression: null,
    requiresConfirmation: true,
    maxExecutionsPerDay: 100,
    cooldownMinutes: 60,
    priority: 1,
    isActive: true,
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastExecutedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { executions: 3 },
  };

  const mockCreatedRule = {
    id: 'rule-2',
    organizationId: 'default',
    name: 'New Rule',
    description: 'Test rule',
    trigger: 'PRICE_CHANGE',
    triggerConfig: {},
    conditions: [],
    conditionLogic: 'AND',
    action: 'ADJUST_PRICE',
    actionConfig: {},
    scheduleType: 'MANUAL',
    cronExpression: null,
    requiresConfirmation: true,
    maxExecutionsPerDay: 100,
    cooldownMinutes: 60,
    priority: 0,
    isActive: false,
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastExecutedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExecution = {
    id: 'exec-1',
    organizationId: 'default',
    ruleId: 'rule-1',
    status: 'RUNNING',
    triggeredBy: 'USER',
    triggerReason: 'Manual execution',
    isDryRun: false,
    startedAt: new Date(),
    completedAt: null,
    targetCount: null,
    processedCount: null,
    successCount: null,
    failedCount: null,
    targetListings: [],
    results: null,
    durationMs: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDryRunExecution = {
    id: 'exec-2',
    organizationId: 'default',
    ruleId: 'rule-1',
    status: 'DRY_RUN_COMPLETED',
    triggeredBy: 'USER',
    triggerReason: 'Manual test (dry run)',
    isDryRun: true,
    startedAt: new Date(),
    completedAt: new Date(),
    targetCount: 0,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    targetListings: [],
    results: [],
    durationMs: 600,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSafetySettings = {
    id: 'safety-1',
    organizationId: 'default',
    emergencyStopEnabled: false,
    emergencyStopAt: null,
    maxConcurrentExecutions: 5,
    maxDailyExecutions: 100,
    requireApprovalAbove: 50,
    excludedCategories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    prisma: {
      automationRule: {
        findMany: vi.fn().mockResolvedValue([mockRule]),
        findUnique: vi.fn().mockResolvedValue(mockRule),
        create: vi.fn().mockResolvedValue(mockCreatedRule),
        update: vi.fn().mockResolvedValue({
          ...mockRule,
          name: 'Updated Rule',
          isActive: false,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        delete: vi.fn().mockResolvedValue({ id: 'rule-1' }),
        count: vi.fn().mockResolvedValue(5),
      },
      automationExecution: {
        findMany: vi.fn().mockResolvedValue([
          {
            ...mockExecution,
            status: 'COMPLETED',
            rule: { name: 'Low Performance Rule', action: 'PAUSE_LISTING', trigger: 'LOW_PERFORMANCE' },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue(mockDryRunExecution),
        create: vi.fn().mockResolvedValue(mockExecution),
        update: vi.fn().mockResolvedValue(mockDryRunExecution),
        count: vi.fn().mockResolvedValue(10),
      },
      safetySettings: {
        findUnique: vi.fn().mockResolvedValue(mockSafetySettings),
        create: vi.fn().mockResolvedValue(mockSafetySettings),
        upsert: vi.fn().mockResolvedValue(mockSafetySettings),
      },
      listingPerformance: {
        findMany: vi.fn().mockResolvedValue([]),
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
import { prisma } from '@rakuda/database';

describe('Automation Rules API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/automation-rules', automationRulesRouter);
    // Error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /api/automation-rules/stats', () => {
    it('should return automation statistics', async () => {
      const response = await request(app)
        .get('/api/automation-rules/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalRules).toBeDefined();
      expect(response.body.activeRules).toBeDefined();
      expect(response.body.totalExecutions).toBeDefined();
      expect(response.body.successfulExecutions).toBeDefined();
      expect(response.body.failedExecutions).toBeDefined();
      expect(response.body.successRate).toBeDefined();
      expect(response.body.todayExecutions).toBeDefined();
      expect(response.body.recentExecutions).toBeDefined();
    });
  });

  describe('GET /api/automation-rules/rules', () => {
    it('should return list of rules', async () => {
      const response = await request(app)
        .get('/api/automation-rules/rules');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].id).toBe('rule-1');
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/automation-rules/rules?active=true');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter by trigger type', async () => {
      const response = await request(app)
        .get('/api/automation-rules/rules?trigger=LOW_PERFORMANCE');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/automation-rules/rules', () => {
    it('should create a new rule', async () => {
      const newRule = {
        name: 'Test Rule',
        description: 'Test description',
        trigger: 'PRICE_CHANGE',
        triggerConfig: {},
        conditions: [],
        conditionLogic: 'AND',
        action: 'ADJUST_PRICE',
        actionConfig: {},
      };

      const response = await request(app)
        .post('/api/automation-rules/rules')
        .send(newRule);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Rule');
    });

    it('should return 500 when prisma create fails', async () => {
      vi.mocked(prisma.automationRule.create).mockRejectedValueOnce(
        new Error('Missing required field: name'),
      );

      const response = await request(app)
        .post('/api/automation-rules/rules')
        .send({
          trigger: 'LOW_PERFORMANCE',
          action: 'PAUSE_LISTING',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create automation rule');
    });
  });

  describe('PUT /api/automation-rules/rules/:id', () => {
    it('should update a rule', async () => {
      const response = await request(app)
        .put('/api/automation-rules/rules/rule-1')
        .send({
          name: 'Updated Rule',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Rule');
    });
  });

  describe('DELETE /api/automation-rules/rules/:id', () => {
    it('should delete a rule', async () => {
      const response = await request(app)
        .delete('/api/automation-rules/rules/rule-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/automation-rules/rules/:id/toggle', () => {
    it('should toggle rule active status', async () => {
      const response = await request(app)
        .patch('/api/automation-rules/rules/rule-1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('rule-1');
    });

    it('should return 404 for non-existent rule', async () => {
      vi.mocked(prisma.automationRule.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .patch('/api/automation-rules/rules/nonexistent/toggle');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rule not found');
    });

    it('should block activation when emergency stop is enabled', async () => {
      vi.mocked(prisma.automationRule.findUnique).mockResolvedValueOnce({
        id: 'rule-1',
        isActive: false,
      } as any);
      vi.mocked(prisma.safetySettings.findUnique).mockResolvedValueOnce({
        emergencyStopEnabled: true,
      } as any);

      const response = await request(app)
        .patch('/api/automation-rules/rules/rule-1/toggle');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Emergency stop is enabled. Cannot activate rules.');
    });
  });

  describe('POST /api/automation-rules/rules/:id/test', () => {
    it('should perform dry run', async () => {
      const response = await request(app)
        .post('/api/automation-rules/rules/rule-1/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.execution).toBeDefined();
      expect(response.body.affectedListings).toBeDefined();
      expect(response.body.results).toBeDefined();
    });

    it('should return 404 for non-existent rule', async () => {
      vi.mocked(prisma.automationRule.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/automation-rules/rules/nonexistent/test');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rule not found');
    });
  });

  describe('POST /api/automation-rules/rules/:id/execute', () => {
    it('should execute a rule', async () => {
      const response = await request(app)
        .post('/api/automation-rules/rules/rule-1/execute');

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.ruleId).toBe('rule-1');
      expect(response.body.status).toBe('RUNNING');
    });

    it('should return 404 for non-existent rule', async () => {
      vi.mocked(prisma.automationRule.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/automation-rules/rules/nonexistent/execute');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rule not found');
    });

    it('should block execution when emergency stop is enabled', async () => {
      vi.mocked(prisma.safetySettings.findUnique).mockResolvedValueOnce({
        emergencyStopEnabled: true,
      } as any);

      const response = await request(app)
        .post('/api/automation-rules/rules/rule-1/execute')
        .send({ force: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Emergency stop is enabled');
    });
  });

  describe('GET /api/automation-rules/executions', () => {
    it('should return execution history', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions');

      expect(response.status).toBe(200);
      expect(response.body.executions).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should filter by rule ID', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions?ruleId=rule-1');

      expect(response.status).toBe(200);
      expect(response.body.executions).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/automation-rules/executions?status=COMPLETED');

      expect(response.status).toBe(200);
      expect(response.body.executions).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });
  });

  describe('GET /api/automation-rules/safety-settings', () => {
    it('should return safety settings', async () => {
      const response = await request(app)
        .get('/api/automation-rules/safety-settings');

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.organizationId).toBe('default');
      expect(response.body.emergencyStopEnabled).toBeDefined();
    });

    it('should create default settings if none exist', async () => {
      vi.mocked(prisma.safetySettings.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.safetySettings.create).mockResolvedValueOnce({
        id: 'safety-new',
        organizationId: 'default',
        emergencyStopEnabled: false,
        emergencyStopAt: null,
      } as any);

      const response = await request(app)
        .get('/api/automation-rules/safety-settings');

      expect(response.status).toBe(200);
      expect(response.body.organizationId).toBe('default');
    });
  });

  describe('PUT /api/automation-rules/safety-settings', () => {
    it('should update safety settings', async () => {
      const response = await request(app)
        .put('/api/automation-rules/safety-settings')
        .send({
          maxDailyExecutions: 50,
          requireApprovalAbove: 20,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.organizationId).toBe('default');
    });
  });

  describe('POST /api/automation-rules/emergency-stop', () => {
    it('should activate emergency stop', async () => {
      vi.mocked(prisma.safetySettings.upsert).mockResolvedValueOnce({
        id: 'safety-1',
        organizationId: 'default',
        emergencyStopEnabled: true,
        emergencyStopAt: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/automation-rules/emergency-stop')
        .send({ enable: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.emergencyStopEnabled).toBe(true);
      expect(response.body.settings).toBeDefined();
    });

    it('should deactivate emergency stop', async () => {
      vi.mocked(prisma.safetySettings.upsert).mockResolvedValueOnce({
        id: 'safety-1',
        organizationId: 'default',
        emergencyStopEnabled: false,
        emergencyStopAt: null,
      } as any);

      const response = await request(app)
        .post('/api/automation-rules/emergency-stop')
        .send({ enable: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.emergencyStopEnabled).toBe(false);
      expect(response.body.settings).toBeDefined();
    });
  });
});

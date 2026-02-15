import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// 自動化ダッシュボード
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalAutomatedOrders: 1234,
      todayAutomated: 45,
      automationRate: 78.5,
      avgProcessingTime: 2.5,
      errorRate: 1.2,
      savedHours: 156,
    },
    status: {
      activeRules: 23,
      pausedRules: 5,
      runningWorkflows: 12,
      queuedTasks: 34,
    },
    recentActivity: [
      { id: 'act-001', type: 'order_fulfilled', orderId: 'ord-123', rule: 'Auto-fulfill standard', timestamp: '2026-02-16T10:30:00Z' },
      { id: 'act-002', type: 'tracking_updated', orderId: 'ord-124', rule: 'Tracking sync', timestamp: '2026-02-16T10:28:00Z' },
      { id: 'act-003', type: 'message_sent', orderId: 'ord-125', rule: 'Order confirmation', timestamp: '2026-02-16T10:25:00Z' },
    ],
    performance: {
      last24h: { processed: 145, success: 143, failed: 2 },
      last7d: { processed: 987, success: 975, failed: 12 },
      last30d: { processed: 4123, success: 4089, failed: 34 },
    },
  };
  res.json(dashboard);
});

// 自動化トレンド
router.get('/dashboard/trends', async (req, res) => {
  const { period = '30d' } = req.query;
  const trends = {
    period,
    data: [
      { date: '2026-02-01', automated: 42, manual: 12, rate: 77.8 },
      { date: '2026-02-08', automated: 48, manual: 10, rate: 82.8 },
      { date: '2026-02-15', automated: 52, manual: 8, rate: 86.7 },
    ],
    improvement: { rateChange: 8.9, timeSaved: 45 },
  };
  res.json(trends);
});

// 節約時間分析
router.get('/dashboard/time-savings', async (_req, res) => {
  const savings = {
    total: { hours: 156, value: 3120 },
    byTask: [
      { task: 'order_fulfillment', hours: 45, percentage: 28.8 },
      { task: 'tracking_updates', hours: 38, percentage: 24.4 },
      { task: 'message_sending', hours: 32, percentage: 20.5 },
      { task: 'inventory_updates', hours: 25, percentage: 16.0 },
      { task: 'label_printing', hours: 16, percentage: 10.3 },
    ],
  };
  res.json(savings);
});

// ===== ルール管理 =====

// ルール一覧
router.get('/rules', async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;
  const rules = {
    items: [
      {
        id: 'rule-001',
        name: 'Auto-fulfill standard orders',
        description: 'Automatically fulfill orders when tracking is uploaded',
        category: 'fulfillment',
        trigger: { type: 'tracking_uploaded', conditions: { carrier: 'any' } },
        actions: [
          { type: 'mark_shipped', params: {} },
          { type: 'send_notification', params: { template: 'shipping_confirmation' } },
        ],
        status: 'active',
        stats: { executions: 567, success: 565, failed: 2 },
        lastTriggered: '2026-02-16T10:30:00Z',
        createdAt: '2025-06-15T10:00:00Z',
      },
      {
        id: 'rule-002',
        name: 'Low stock alert',
        description: 'Send alert when inventory drops below threshold',
        category: 'inventory',
        trigger: { type: 'inventory_low', conditions: { threshold: 5 } },
        actions: [
          { type: 'send_alert', params: { channels: ['email', 'slack'] } },
          { type: 'create_reorder', params: { quantity: 'auto' } },
        ],
        status: 'active',
        stats: { executions: 89, success: 89, failed: 0 },
        lastTriggered: '2026-02-15T14:20:00Z',
        createdAt: '2025-08-20T10:00:00Z',
      },
    ],
    total: 28,
    page: Number(page),
    limit: Number(limit),
    filters: { status, category },
  };
  res.json(rules);
});

// ルール詳細
router.get('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const rule = {
    id,
    name: 'Auto-fulfill standard orders',
    description: 'Automatically fulfill orders when tracking is uploaded',
    category: 'fulfillment',
    trigger: {
      type: 'tracking_uploaded',
      conditions: {
        carrier: 'any',
        orderType: 'standard',
        minValue: 0,
        maxValue: 1000,
      },
    },
    actions: [
      { type: 'mark_shipped', params: {}, order: 1 },
      { type: 'send_notification', params: { template: 'shipping_confirmation' }, order: 2 },
      { type: 'update_inventory', params: { action: 'decrement' }, order: 3 },
    ],
    conditions: [
      { field: 'payment_status', operator: 'equals', value: 'paid' },
      { field: 'shipping_address.country', operator: 'in', value: ['US', 'UK', 'DE'] },
    ],
    schedule: { enabled: false },
    status: 'active',
    stats: {
      totalExecutions: 567,
      successRate: 99.6,
      avgExecutionTime: 1.2,
      lastExecution: '2026-02-16T10:30:00Z',
    },
    executionHistory: [
      { id: 'exec-001', orderId: 'ord-123', status: 'success', duration: 1.1, timestamp: '2026-02-16T10:30:00Z' },
      { id: 'exec-002', orderId: 'ord-122', status: 'success', duration: 1.3, timestamp: '2026-02-16T09:45:00Z' },
    ],
  };
  res.json(rule);
});

// ルール作成
const createRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(['fulfillment', 'inventory', 'communication', 'pricing', 'returns']),
  trigger: z.object({
    type: z.string(),
    conditions: z.record(z.unknown()),
  }),
  actions: z.array(z.object({
    type: z.string(),
    params: z.record(z.unknown()),
    order: z.number().optional(),
  })),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.unknown(),
  })).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    cron: z.string().optional(),
  }).optional(),
});

router.post('/rules', async (req, res) => {
  const data = createRuleSchema.parse(req.body);
  res.json({
    success: true,
    ruleId: `rule-${Date.now()}`,
    ...data,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// ルール更新
router.put('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const data = createRuleSchema.partial().parse(req.body);
  res.json({ success: true, ruleId: id, ...data });
});

// ルール削除
router.delete('/rules/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, ruleId: id, deleted: true });
});

// ルール一時停止/再開
router.post('/rules/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body as { action: 'pause' | 'resume' };
  res.json({ success: true, ruleId: id, status: action === 'pause' ? 'paused' : 'active' });
});

// ルールテスト
const testRuleSchema = z.object({
  orderId: z.string().optional(),
  mockData: z.record(z.unknown()).optional(),
});

router.post('/rules/:id/test', async (req, res) => {
  const { id } = req.params;
  const data = testRuleSchema.parse(req.body);
  res.json({
    success: true,
    ruleId: id,
    testResult: {
      triggered: true,
      actionsExecuted: ['mark_shipped', 'send_notification'],
      duration: 0.8,
      logs: ['Condition met: payment_status equals paid', 'Action: mark_shipped executed', 'Action: send_notification executed'],
    },
    ...data,
  });
});

// ===== ワークフロー管理 =====

// ワークフロー一覧
router.get('/workflows', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const workflows = {
    items: [
      {
        id: 'wf-001',
        name: 'Complete order processing',
        description: 'Full order lifecycle automation',
        steps: [
          { id: 'step-1', name: 'Validate order', type: 'validation' },
          { id: 'step-2', name: 'Process payment', type: 'payment' },
          { id: 'step-3', name: 'Create shipping label', type: 'shipping' },
          { id: 'step-4', name: 'Notify customer', type: 'notification' },
        ],
        status: 'active',
        executions: { total: 234, running: 3, completed: 228, failed: 3 },
        avgDuration: 5.5,
      },
    ],
    total: 8,
    page: Number(page),
    limit: Number(limit),
    filters: { status },
  };
  res.json(workflows);
});

// ワークフロー作成
const createWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: z.record(z.unknown()).optional(),
  })),
  trigger: z.object({
    type: z.string(),
    conditions: z.record(z.unknown()),
  }).optional(),
});

router.post('/workflows', async (req, res) => {
  const data = createWorkflowSchema.parse(req.body);
  res.json({
    success: true,
    workflowId: `wf-${Date.now()}`,
    ...data,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
});

// ワークフロー詳細
router.get('/workflows/:id', async (req, res) => {
  const { id } = req.params;
  const workflow = {
    id,
    name: 'Complete order processing',
    description: 'Full order lifecycle automation',
    steps: [
      { id: 'step-1', name: 'Validate order', type: 'validation', config: { rules: ['address', 'payment'] } },
      { id: 'step-2', name: 'Process payment', type: 'payment', config: { retry: 3 } },
      { id: 'step-3', name: 'Create shipping label', type: 'shipping', config: { carrier: 'auto' } },
      { id: 'step-4', name: 'Notify customer', type: 'notification', config: { template: 'order_shipped' } },
    ],
    status: 'active',
    stats: { totalExecutions: 234, avgDuration: 5.5, successRate: 98.7 },
    recentExecutions: [
      { id: 'exec-001', orderId: 'ord-123', status: 'completed', duration: 5.2, timestamp: '2026-02-16T10:30:00Z' },
    ],
  };
  res.json(workflow);
});

// ===== スケジュール管理 =====

// スケジュール一覧
router.get('/schedules', async (_req, res) => {
  const schedules = [
    {
      id: 'sched-001',
      name: 'Daily inventory sync',
      type: 'recurring',
      cron: '0 6 * * *',
      nextRun: '2026-02-17T06:00:00Z',
      lastRun: '2026-02-16T06:00:00Z',
      status: 'active',
      action: { type: 'sync_inventory', params: {} },
    },
    {
      id: 'sched-002',
      name: 'Weekly sales report',
      type: 'recurring',
      cron: '0 9 * * 1',
      nextRun: '2026-02-23T09:00:00Z',
      lastRun: '2026-02-16T09:00:00Z',
      status: 'active',
      action: { type: 'generate_report', params: { type: 'sales' } },
    },
  ];
  res.json(schedules);
});

// スケジュール作成
const createScheduleSchema = z.object({
  name: z.string(),
  type: z.enum(['one_time', 'recurring']),
  cron: z.string().optional(),
  runAt: z.string().optional(),
  action: z.object({
    type: z.string(),
    params: z.record(z.unknown()),
  }),
});

router.post('/schedules', async (req, res) => {
  const data = createScheduleSchema.parse(req.body);
  res.json({
    success: true,
    scheduleId: `sched-${Date.now()}`,
    ...data,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// スケジュール更新
router.put('/schedules/:id', async (req, res) => {
  const { id } = req.params;
  const data = createScheduleSchema.partial().parse(req.body);
  res.json({ success: true, scheduleId: id, ...data });
});

// スケジュール削除
router.delete('/schedules/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, scheduleId: id, deleted: true });
});

// ===== テンプレート管理 =====

// テンプレート一覧
router.get('/templates', async (req, res) => {
  const { category } = req.query;
  const templates = [
    {
      id: 'tpl-001',
      name: 'Auto-fulfill domestic orders',
      category: 'fulfillment',
      description: 'Standard template for domestic order fulfillment',
      rules: 3,
      actions: 5,
      uses: 1234,
    },
    {
      id: 'tpl-002',
      name: 'Low stock reorder',
      category: 'inventory',
      description: 'Automatic reorder when stock is low',
      rules: 2,
      actions: 3,
      uses: 567,
    },
  ];
  res.json(templates.filter(t => !category || t.category === category));
});

// テンプレートを適用
router.post('/templates/:id/apply', async (req, res) => {
  const { id } = req.params;
  const { customizations } = req.body as { customizations?: Record<string, unknown> };
  res.json({
    success: true,
    templateId: id,
    rulesCreated: 3,
    customizations,
    appliedAt: new Date().toISOString(),
  });
});

// ===== 設定 =====

// 一般設定取得
router.get('/settings/general', async (_req, res) => {
  const settings = {
    execution: {
      maxConcurrent: 10,
      retryAttempts: 3,
      retryDelay: 60,
      timeout: 300,
    },
    notifications: {
      onSuccess: false,
      onFailure: true,
      channels: ['email', 'dashboard'],
    },
    logging: {
      level: 'info',
      retentionDays: 30,
    },
  };
  res.json(settings);
});

// 一般設定更新
router.put('/settings/general', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// トリガー設定取得
router.get('/settings/triggers', async (_req, res) => {
  const settings = {
    availableTriggers: [
      { type: 'order_created', name: 'Order Created', category: 'order' },
      { type: 'payment_received', name: 'Payment Received', category: 'payment' },
      { type: 'tracking_uploaded', name: 'Tracking Uploaded', category: 'shipping' },
      { type: 'inventory_low', name: 'Inventory Low', category: 'inventory' },
      { type: 'message_received', name: 'Message Received', category: 'communication' },
    ],
    customTriggers: [],
    webhooksEnabled: true,
  };
  res.json(settings);
});

// トリガー設定更新
router.put('/settings/triggers', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

export const ebayOrderAutomationRouter = router;

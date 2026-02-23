import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 282: eBay Order Automation（注文自動化）
// 28エンドポイント - テーマカラー: amber-600
// ============================================================

// スキーマ
const automationRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(['ORDER_RECEIVED', 'PAYMENT_CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['SEND_EMAIL', 'UPDATE_STATUS', 'CREATE_LABEL', 'NOTIFY_WAREHOUSE', 'ADD_TAG', 'SEND_MESSAGE']),
    params: z.record(z.any()),
  })),
  isActive: z.boolean().default(true),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    activeRules: 15,
    ordersProcessedToday: 85,
    automationRate: 92,
    timeSaved: 12.5,
    pendingActions: 5,
    failedActions: 2,
  });
});

router.get('/dashboard/activity', async (req: Request, res: Response) => {
  res.json({
    activity: [
      { time: '10:30', orderId: 'ORD001', action: 'Label created', status: 'SUCCESS' },
      { time: '10:28', orderId: 'ORD002', action: 'Email sent', status: 'SUCCESS' },
      { time: '10:25', orderId: 'ORD003', action: 'Warehouse notified', status: 'PENDING' },
    ],
    total: 250,
  });
});

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  res.json({
    byTrigger: [
      { trigger: 'ORDER_RECEIVED', count: 100, percent: 40 },
      { trigger: 'PAYMENT_CONFIRMED', count: 75, percent: 30 },
      { trigger: 'SHIPPED', count: 50, percent: 20 },
      { trigger: 'DELIVERED', count: 25, percent: 10 },
    ],
    byAction: [
      { action: 'SEND_EMAIL', count: 150 },
      { action: 'CREATE_LABEL', count: 80 },
      { action: 'NOTIFY_WAREHOUSE', count: 70 },
    ],
  });
});

// ========== ルール管理 ==========
router.get('/rules', async (req: Request, res: Response) => {
  res.json({
    rules: [
      { id: 'r1', name: 'Auto Confirm & Label', trigger: 'PAYMENT_CONFIRMED', actions: 2, isActive: true, executed: 500 },
      { id: 'r2', name: 'Ship Notification', trigger: 'SHIPPED', actions: 1, isActive: true, executed: 450 },
      { id: 'r3', name: 'Delivery Follow-up', trigger: 'DELIVERED', actions: 2, isActive: true, executed: 400 },
      { id: 'r4', name: 'Return Handler', trigger: 'RETURN_REQUESTED', actions: 3, isActive: false, executed: 50 },
    ],
    total: 15,
  });
});

router.post('/rules', async (req: Request, res: Response) => {
  const parsed = automationRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid rule', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `rule_${Date.now()}`,
    ...parsed.data,
    executed: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/rules/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Auto Confirm & Label',
    trigger: 'PAYMENT_CONFIRMED',
    conditions: [{ field: 'orderTotal', operator: 'gte', value: 50 }],
    actions: [
      { type: 'UPDATE_STATUS', params: { status: 'CONFIRMED' } },
      { type: 'CREATE_LABEL', params: { carrier: 'FedEx' } },
    ],
    isActive: true,
    executed: 500,
    lastExecuted: '2026-02-15T10:30:00Z',
  });
});

router.put('/rules/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, ...req.body, updatedAt: new Date().toISOString() });
});

router.delete('/rules/:id', async (req: Request, res: Response) => {
  res.json({ deleted: true, ruleId: req.params.id });
});

router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, isActive: req.body.isActive ?? true, updatedAt: new Date().toISOString() });
});

// ========== トリガー ==========
router.get('/triggers', async (req: Request, res: Response) => {
  res.json({
    triggers: [
      { type: 'ORDER_RECEIVED', label: '注文受信', description: '新しい注文が入った時', rulesCount: 5 },
      { type: 'PAYMENT_CONFIRMED', label: '支払い確認', description: '支払いが確認された時', rulesCount: 4 },
      { type: 'SHIPPED', label: '発送完了', description: '商品が発送された時', rulesCount: 3 },
      { type: 'DELIVERED', label: '配達完了', description: '商品が配達された時', rulesCount: 2 },
      { type: 'RETURN_REQUESTED', label: '返品依頼', description: '返品が依頼された時', rulesCount: 1 },
    ],
  });
});

router.get('/triggers/:type/history', async (req: Request, res: Response) => {
  res.json({
    trigger: req.params.type,
    history: [
      { id: 'e1', orderId: 'ORD001', triggeredAt: '2026-02-15T10:30:00Z', rulesExecuted: 2, status: 'SUCCESS' },
      { id: 'e2', orderId: 'ORD002', triggeredAt: '2026-02-15T10:28:00Z', rulesExecuted: 1, status: 'SUCCESS' },
    ],
    total: 500,
  });
});

// ========== アクション ==========
router.get('/actions', async (req: Request, res: Response) => {
  res.json({
    actions: [
      { type: 'SEND_EMAIL', label: 'メール送信', description: '顧客にメールを送信', usageCount: 150 },
      { type: 'UPDATE_STATUS', label: 'ステータス更新', description: '注文ステータスを更新', usageCount: 120 },
      { type: 'CREATE_LABEL', label: 'ラベル作成', description: '配送ラベルを作成', usageCount: 80 },
      { type: 'NOTIFY_WAREHOUSE', label: '倉庫通知', description: '倉庫に出荷通知を送信', usageCount: 70 },
      { type: 'ADD_TAG', label: 'タグ追加', description: '注文にタグを追加', usageCount: 50 },
      { type: 'SEND_MESSAGE', label: 'メッセージ送信', description: 'eBayメッセージを送信', usageCount: 40 },
    ],
  });
});

// ========== 実行履歴 ==========
router.get('/executions', async (req: Request, res: Response) => {
  res.json({
    executions: [
      { id: 'ex1', ruleId: 'r1', orderId: 'ORD001', trigger: 'PAYMENT_CONFIRMED', status: 'SUCCESS', executedAt: '2026-02-15T10:30:00Z', duration: 2.5 },
      { id: 'ex2', ruleId: 'r2', orderId: 'ORD002', trigger: 'SHIPPED', status: 'SUCCESS', executedAt: '2026-02-15T10:28:00Z', duration: 1.8 },
      { id: 'ex3', ruleId: 'r3', orderId: 'ORD003', trigger: 'DELIVERED', status: 'FAILED', executedAt: '2026-02-15T10:25:00Z', error: 'Email service unavailable' },
    ],
    total: 2500,
  });
});

router.get('/executions/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ruleId: 'r1',
    ruleName: 'Auto Confirm & Label',
    orderId: 'ORD001',
    trigger: 'PAYMENT_CONFIRMED',
    status: 'SUCCESS',
    actions: [
      { type: 'UPDATE_STATUS', status: 'SUCCESS', duration: 0.5 },
      { type: 'CREATE_LABEL', status: 'SUCCESS', duration: 2.0 },
    ],
    executedAt: '2026-02-15T10:30:00Z',
    totalDuration: 2.5,
  });
});

// ========== テンプレート ==========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 't1', name: 'Basic Order Flow', description: '基本的な注文処理フロー', triggers: 3, actions: 5, popularity: 95 },
      { id: 't2', name: 'Return Management', description: '返品管理フロー', triggers: 1, actions: 3, popularity: 80 },
      { id: 't3', name: 'VIP Customer Flow', description: 'VIP顧客専用フロー', triggers: 2, actions: 4, popularity: 70 },
    ],
  });
});

router.post('/templates/:id/apply', async (req: Request, res: Response) => {
  res.json({
    templateId: req.params.id,
    rulesCreated: 3,
    ruleIds: [`rule_${Date.now()}`, `rule_${Date.now() + 1}`, `rule_${Date.now() + 2}`],
    appliedAt: new Date().toISOString(),
  });
});

// ========== ワークフロー ==========
router.get('/workflows', async (req: Request, res: Response) => {
  res.json({
    workflows: [
      { id: 'wf1', name: 'Full Order Pipeline', steps: 5, isActive: true, executionsToday: 30 },
      { id: 'wf2', name: 'Return & Refund', steps: 3, isActive: true, executionsToday: 5 },
    ],
    total: 8,
  });
});

router.get('/workflows/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Full Order Pipeline',
    steps: [
      { order: 1, trigger: 'ORDER_RECEIVED', action: 'SEND_EMAIL', description: 'Send confirmation' },
      { order: 2, trigger: 'PAYMENT_CONFIRMED', action: 'CREATE_LABEL', description: 'Create shipping label' },
      { order: 3, trigger: 'SHIPPED', action: 'SEND_EMAIL', description: 'Send tracking info' },
    ],
    isActive: true,
    totalExecutions: 1500,
  });
});

router.post('/workflows', async (req: Request, res: Response) => {
  res.status(201).json({ id: `wf_${Date.now()}`, name: req.body.name, steps: req.body.steps || [], isActive: true, createdAt: new Date().toISOString() });
});

router.put('/workflows/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, ...req.body, updatedAt: new Date().toISOString() });
});

router.delete('/workflows/:id', async (req: Request, res: Response) => {
  res.json({ deleted: true, workflowId: req.params.id });
});

router.post('/rules/test', async (req: Request, res: Response) => {
  res.json({
    ruleId: req.body.ruleId,
    testOrderId: req.body.orderId || 'TEST_ORD001',
    result: 'PASS',
    actionsSimulated: [
      { type: 'SEND_EMAIL', wouldExecute: true },
      { type: 'CREATE_LABEL', wouldExecute: true },
    ],
    testedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    emailNotifications: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 60,
    logRetention: 30,
    defaultCarrier: 'FedEx',
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({ ...req.body, updatedAt: new Date().toISOString() });
});

// ========== ログ ==========
router.get('/logs', async (req: Request, res: Response) => {
  res.json({
    logs: [
      { id: 'log1', level: 'info', message: 'Rule r1 executed for ORD001', timestamp: '2026-02-15T10:30:00Z' },
      { id: 'log2', level: 'error', message: 'Failed to send email for ORD003', timestamp: '2026-02-15T10:25:00Z' },
    ],
    total: 5000,
  });
});

// ========== レポート ==========
router.get('/reports', async (req: Request, res: Response) => {
  res.json({
    reports: [
      { id: 'r1', name: 'Automation Performance Report', generatedAt: '2026-02-15', format: 'csv' },
      { id: 'r2', name: 'Failed Actions Report', generatedAt: '2026-02-14', format: 'pdf' },
    ],
  });
});

router.post('/reports/generate', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `rpt_${Date.now()}`,
    name: req.body.name || 'Automation Report',
    status: 'GENERATING',
    estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
  });
});

router.get('/reports/download', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-order-automation/reports/download/automation_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

export default router;

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 171: Custom Workflows Builder API
// カスタムワークフロービルダー機能
// ============================================

// --- ワークフロー管理 ---

// ワークフロー一覧
router.get('/workflows', async (req, res) => {
  const workflows = [
    {
      id: 'wf_1',
      name: '新規出品自動処理',
      description: '商品登録時に自動で翻訳・価格設定・出品を行う',
      status: 'active',
      trigger: { type: 'event', event: 'product.created' },
      stepsCount: 5,
      lastRun: '2026-02-15T09:30:00Z',
      runsToday: 12,
      successRate: 95.8,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-02-10T14:00:00Z',
    },
    {
      id: 'wf_2',
      name: '在庫切れアラート',
      description: '在庫が閾値以下になったら通知を送信',
      status: 'active',
      trigger: { type: 'condition', condition: 'inventory.quantity < 5' },
      stepsCount: 3,
      lastRun: '2026-02-15T08:00:00Z',
      runsToday: 5,
      successRate: 100,
      createdAt: '2026-01-20T15:00:00Z',
      updatedAt: '2026-02-01T10:00:00Z',
    },
    {
      id: 'wf_3',
      name: '週次レポート生成',
      description: '毎週月曜日に売上レポートを生成してメール送信',
      status: 'active',
      trigger: { type: 'schedule', cron: '0 9 * * 1' },
      stepsCount: 4,
      lastRun: '2026-02-10T09:00:00Z',
      runsToday: 0,
      successRate: 100,
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-01-10T09:00:00Z',
    },
    {
      id: 'wf_4',
      name: '競合価格対応',
      description: '競合が価格を下げたら自動で対抗価格を設定',
      status: 'paused',
      trigger: { type: 'event', event: 'competitor.price_changed' },
      stepsCount: 6,
      lastRun: '2026-02-14T16:00:00Z',
      runsToday: 0,
      successRate: 88.5,
      createdAt: '2026-02-01T11:00:00Z',
      updatedAt: '2026-02-14T16:30:00Z',
    },
  ];

  res.json({ workflows, total: workflows.length });
});

// ワークフロー詳細
router.get('/workflows/:id', async (req, res) => {
  const workflow = {
    id: req.params.id,
    name: '新規出品自動処理',
    description: '商品登録時に自動で翻訳・価格設定・出品を行う',
    status: 'active',
    trigger: {
      type: 'event',
      event: 'product.created',
      conditions: [
        { field: 'category', operator: 'in', value: ['electronics', 'fashion'] },
      ],
    },
    steps: [
      { id: 'step_1', type: 'action', action: 'translate', config: { targetLang: 'en', fields: ['title', 'description'] }, position: { x: 100, y: 100 } },
      { id: 'step_2', type: 'action', action: 'calculate_price', config: { margin: 1.3, rounding: 'up' }, position: { x: 300, y: 100 } },
      { id: 'step_3', type: 'condition', condition: 'price > 10', trueBranch: 'step_4', falseBranch: 'step_5', position: { x: 500, y: 100 } },
      { id: 'step_4', type: 'action', action: 'create_listing', config: { marketplace: 'ebay_us' }, position: { x: 700, y: 50 } },
      { id: 'step_5', type: 'action', action: 'notify', config: { channel: 'slack', message: '低価格商品: {{product.title}}' }, position: { x: 700, y: 150 } },
    ],
    connections: [
      { from: 'step_1', to: 'step_2' },
      { from: 'step_2', to: 'step_3' },
      { from: 'step_3', to: 'step_4', condition: 'true' },
      { from: 'step_3', to: 'step_5', condition: 'false' },
    ],
    variables: [
      { name: 'product', type: 'object', description: 'トリガーされた商品データ' },
      { name: 'price', type: 'number', description: '計算された価格' },
    ],
    settings: {
      retryOnFailure: true,
      maxRetries: 3,
      timeout: 300,
      notifyOnError: true,
      errorNotificationChannel: 'slack',
    },
    stats: {
      totalRuns: 156,
      successfulRuns: 149,
      failedRuns: 7,
      averageDuration: 12.5,
    },
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-10T14:00:00Z',
  };

  res.json(workflow);
});

// ワークフロー作成
router.post('/workflows', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    trigger: z.object({
      type: z.enum(['event', 'schedule', 'manual', 'condition']),
      event: z.string().optional(),
      cron: z.string().optional(),
      condition: z.string().optional(),
    }),
    steps: z.array(z.any()).optional(),
    connections: z.array(z.any()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `wf_${Date.now()}`,
    ...data,
    status: 'draft',
    stepsCount: data.steps?.length || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// ワークフロー更新
router.put('/workflows/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    trigger: z.any().optional(),
    steps: z.array(z.any()).optional(),
    connections: z.array(z.any()).optional(),
    settings: z.any().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// ワークフロー削除
router.delete('/workflows/:id', async (req, res) => {
  res.json({ success: true, workflowId: req.params.id });
});

// ワークフロー複製
router.post('/workflows/:id/duplicate', async (req, res) => {
  res.json({
    id: `wf_${Date.now()}`,
    name: '新規出品自動処理 (コピー)',
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
});

// --- ワークフロー制御 ---

// ワークフロー有効化
router.post('/workflows/:id/activate', async (req, res) => {
  res.json({
    id: req.params.id,
    status: 'active',
    activatedAt: new Date().toISOString(),
  });
});

// ワークフロー一時停止
router.post('/workflows/:id/pause', async (req, res) => {
  res.json({
    id: req.params.id,
    status: 'paused',
    pausedAt: new Date().toISOString(),
  });
});

// ワークフロー手動実行
router.post('/workflows/:id/run', async (req, res) => {
  const schema = z.object({
    inputs: z.record(z.any()).optional(),
    dryRun: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    runId: `run_${Date.now()}`,
    workflowId: req.params.id,
    status: 'running',
    dryRun: data.dryRun || false,
    startedAt: new Date().toISOString(),
  });
});

// 実行キャンセル
router.post('/workflows/:id/runs/:runId/cancel', async (req, res) => {
  res.json({
    runId: req.params.runId,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  });
});

// --- 実行履歴 ---

// 実行履歴一覧
router.get('/workflows/:id/runs', async (req, res) => {
  const runs = [
    { runId: 'run_1', status: 'success', trigger: 'event', startedAt: '2026-02-15T09:30:00Z', completedAt: '2026-02-15T09:30:12Z', duration: 12000, stepsExecuted: 5 },
    { runId: 'run_2', status: 'success', trigger: 'event', startedAt: '2026-02-15T09:15:00Z', completedAt: '2026-02-15T09:15:10Z', duration: 10000, stepsExecuted: 5 },
    { runId: 'run_3', status: 'failed', trigger: 'event', startedAt: '2026-02-15T09:00:00Z', completedAt: '2026-02-15T09:00:15Z', duration: 15000, stepsExecuted: 3, error: 'API rate limit exceeded' },
    { runId: 'run_4', status: 'success', trigger: 'manual', startedAt: '2026-02-15T08:45:00Z', completedAt: '2026-02-15T08:45:11Z', duration: 11000, stepsExecuted: 5 },
  ];

  res.json({ workflowId: req.params.id, runs, total: runs.length });
});

// 実行詳細
router.get('/workflows/:id/runs/:runId', async (req, res) => {
  const run = {
    runId: req.params.runId,
    workflowId: req.params.id,
    status: 'success',
    trigger: 'event',
    inputs: { productId: 'prod_123', category: 'electronics' },
    outputs: { listingId: 'lst_456', price: 29.99 },
    steps: [
      { stepId: 'step_1', name: 'translate', status: 'success', startedAt: '2026-02-15T09:30:00Z', completedAt: '2026-02-15T09:30:03Z', output: { translatedTitle: 'Sample Product' } },
      { stepId: 'step_2', name: 'calculate_price', status: 'success', startedAt: '2026-02-15T09:30:03Z', completedAt: '2026-02-15T09:30:04Z', output: { price: 29.99 } },
      { stepId: 'step_3', name: 'condition', status: 'success', startedAt: '2026-02-15T09:30:04Z', completedAt: '2026-02-15T09:30:04Z', output: { result: true, branch: 'step_4' } },
      { stepId: 'step_4', name: 'create_listing', status: 'success', startedAt: '2026-02-15T09:30:04Z', completedAt: '2026-02-15T09:30:12Z', output: { listingId: 'lst_456' } },
    ],
    startedAt: '2026-02-15T09:30:00Z',
    completedAt: '2026-02-15T09:30:12Z',
    duration: 12000,
  };

  res.json(run);
});

// --- テンプレート ---

// テンプレート一覧
router.get('/templates', async (_req, res) => {
  const templates = [
    { id: 'tmpl_1', name: '新規出品自動化', description: '商品登録から出品までを自動化', category: 'listing', stepsCount: 5, popularity: 156 },
    { id: 'tmpl_2', name: '在庫アラート', description: '在庫切れ時に通知を送信', category: 'inventory', stepsCount: 3, popularity: 234 },
    { id: 'tmpl_3', name: '定期レポート', description: 'スケジュールでレポートを生成', category: 'reporting', stepsCount: 4, popularity: 89 },
    { id: 'tmpl_4', name: '競合価格監視', description: '競合の価格変動に対応', category: 'pricing', stepsCount: 6, popularity: 178 },
    { id: 'tmpl_5', name: '注文処理自動化', description: '注文受付から発送まで自動化', category: 'orders', stepsCount: 7, popularity: 312 },
    { id: 'tmpl_6', name: 'バルク更新', description: '条件に合う商品を一括更新', category: 'bulk', stepsCount: 4, popularity: 145 },
  ];

  res.json({ templates, total: templates.length });
});

// テンプレート詳細
router.get('/templates/:id', async (req, res) => {
  const template = {
    id: req.params.id,
    name: '新規出品自動化',
    description: '商品登録から出品までを自動化するテンプレート',
    category: 'listing',
    trigger: { type: 'event', event: 'product.created' },
    steps: [
      { id: 'step_1', type: 'action', action: 'translate', config: { targetLang: 'en' } },
      { id: 'step_2', type: 'action', action: 'calculate_price', config: { margin: 1.3 } },
      { id: 'step_3', type: 'action', action: 'optimize_images', config: {} },
      { id: 'step_4', type: 'action', action: 'create_listing', config: {} },
      { id: 'step_5', type: 'action', action: 'notify', config: { channel: 'slack' } },
    ],
    connections: [
      { from: 'step_1', to: 'step_2' },
      { from: 'step_2', to: 'step_3' },
      { from: 'step_3', to: 'step_4' },
      { from: 'step_4', to: 'step_5' },
    ],
    variables: [
      { name: 'targetLang', type: 'string', default: 'en', description: '翻訳先言語' },
      { name: 'margin', type: 'number', default: 1.3, description: '価格マージン' },
    ],
    popularity: 156,
    rating: 4.5,
    reviews: 23,
  };

  res.json(template);
});

// テンプレートからワークフロー作成
router.post('/templates/:id/use', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    variables: z.record(z.any()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    workflowId: `wf_${Date.now()}`,
    templateId: req.params.id,
    name: data.name,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
});

// --- アクション・トリガー ---

// 利用可能なトリガー一覧
router.get('/triggers', async (_req, res) => {
  const triggers = [
    { id: 'product.created', name: '商品作成', category: 'product', description: '新しい商品が作成された時' },
    { id: 'product.updated', name: '商品更新', category: 'product', description: '商品が更新された時' },
    { id: 'listing.published', name: '出品完了', category: 'listing', description: '出品が公開された時' },
    { id: 'listing.sold', name: '販売完了', category: 'listing', description: '商品が売れた時' },
    { id: 'order.created', name: '注文作成', category: 'order', description: '新しい注文が入った時' },
    { id: 'order.shipped', name: '発送完了', category: 'order', description: '商品が発送された時' },
    { id: 'inventory.low', name: '在庫低下', category: 'inventory', description: '在庫が閾値以下になった時' },
    { id: 'competitor.price_changed', name: '競合価格変動', category: 'competitor', description: '競合の価格が変動した時' },
    { id: 'schedule', name: 'スケジュール', category: 'time', description: '指定した時間に実行' },
    { id: 'manual', name: '手動実行', category: 'manual', description: '手動でトリガー' },
  ];

  res.json({ triggers, total: triggers.length });
});

// 利用可能なアクション一覧
router.get('/actions', async (_req, res) => {
  const actions = [
    { id: 'translate', name: '翻訳', category: 'ai', description: 'テキストを翻訳', inputs: ['text', 'targetLang'], outputs: ['translatedText'] },
    { id: 'calculate_price', name: '価格計算', category: 'pricing', description: '価格を計算', inputs: ['basePrice', 'margin'], outputs: ['price'] },
    { id: 'create_listing', name: '出品作成', category: 'listing', description: 'マーケットプレイスに出品', inputs: ['productId', 'marketplace'], outputs: ['listingId'] },
    { id: 'update_listing', name: '出品更新', category: 'listing', description: '出品情報を更新', inputs: ['listingId', 'fields'], outputs: ['success'] },
    { id: 'end_listing', name: '出品終了', category: 'listing', description: '出品を終了', inputs: ['listingId'], outputs: ['success'] },
    { id: 'update_inventory', name: '在庫更新', category: 'inventory', description: '在庫数を更新', inputs: ['productId', 'quantity'], outputs: ['success'] },
    { id: 'send_email', name: 'メール送信', category: 'notification', description: 'メールを送信', inputs: ['to', 'subject', 'body'], outputs: ['messageId'] },
    { id: 'notify', name: '通知送信', category: 'notification', description: '通知を送信', inputs: ['channel', 'message'], outputs: ['success'] },
    { id: 'http_request', name: 'HTTP リクエスト', category: 'integration', description: '外部APIを呼び出し', inputs: ['url', 'method', 'body'], outputs: ['response'] },
    { id: 'delay', name: '遅延', category: 'flow', description: '指定時間待機', inputs: ['duration'], outputs: [] },
    { id: 'condition', name: '条件分岐', category: 'flow', description: '条件に基づいて分岐', inputs: ['condition'], outputs: ['result'] },
    { id: 'loop', name: 'ループ', category: 'flow', description: '繰り返し処理', inputs: ['items'], outputs: ['item', 'index'] },
    { id: 'optimize_images', name: '画像最適化', category: 'media', description: '画像を最適化', inputs: ['images'], outputs: ['optimizedImages'] },
    { id: 'generate_report', name: 'レポート生成', category: 'reporting', description: 'レポートを生成', inputs: ['type', 'dateRange'], outputs: ['reportUrl'] },
  ];

  res.json({ actions, total: actions.length });
});

// --- 変数・データ ---

// ワークフロー変数一覧
router.get('/workflows/:id/variables', async (req, res) => {
  const variables = [
    { name: 'product', type: 'object', scope: 'trigger', description: 'トリガー商品データ' },
    { name: 'price', type: 'number', scope: 'step', source: 'step_2', description: '計算価格' },
    { name: 'listingId', type: 'string', scope: 'step', source: 'step_4', description: '作成された出品ID' },
  ];

  res.json({ workflowId: req.params.id, variables });
});

// カスタム変数追加
router.post('/workflows/:id/variables', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    defaultValue: z.any().optional(),
    description: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    workflowId: req.params.id,
    variable: { ...data, scope: 'custom' },
  });
});

// --- バリデーション・テスト ---

// ワークフロー検証
router.post('/workflows/:id/validate', async (req, res) => {
  res.json({
    workflowId: req.params.id,
    valid: true,
    errors: [],
    warnings: [
      { stepId: 'step_5', message: 'Slack通知のチャンネルが未設定です' },
    ],
  });
});

// ワークフローテスト実行
router.post('/workflows/:id/test', async (req, res) => {
  const schema = z.object({
    inputs: z.record(z.any()),
    stopAtStep: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    testId: `test_${Date.now()}`,
    workflowId: req.params.id,
    status: 'completed',
    inputs: data.inputs,
    outputs: { listingId: 'lst_test_123', price: 29.99 },
    stepsExecuted: [
      { stepId: 'step_1', status: 'success', output: { translatedTitle: 'Test Product' } },
      { stepId: 'step_2', status: 'success', output: { price: 29.99 } },
      { stepId: 'step_3', status: 'success', output: { result: true } },
      { stepId: 'step_4', status: 'success', output: { listingId: 'lst_test_123' } },
    ],
    duration: 5000,
  });
});

// --- 統計・分析 ---

// ワークフロー統計
router.get('/stats', async (_req, res) => {
  res.json({
    totalWorkflows: 15,
    activeWorkflows: 10,
    totalRuns: 1234,
    successfulRuns: 1180,
    failedRuns: 54,
    successRate: 95.6,
    averageDuration: 15.3,
    runsByDay: [
      { date: '2026-02-15', runs: 45, success: 43, failed: 2 },
      { date: '2026-02-14', runs: 52, success: 50, failed: 2 },
      { date: '2026-02-13', runs: 48, success: 47, failed: 1 },
      { date: '2026-02-12', runs: 55, success: 52, failed: 3 },
      { date: '2026-02-11', runs: 41, success: 40, failed: 1 },
      { date: '2026-02-10', runs: 50, success: 48, failed: 2 },
      { date: '2026-02-09', runs: 38, success: 37, failed: 1 },
    ],
    topWorkflows: [
      { id: 'wf_1', name: '新規出品自動処理', runs: 156, successRate: 95.8 },
      { id: 'wf_5', name: '注文処理自動化', runs: 312, successRate: 98.2 },
      { id: 'wf_2', name: '在庫切れアラート', runs: 89, successRate: 100 },
    ],
  });
});

// --- エクスポート・インポート ---

// ワークフローエクスポート
router.get('/workflows/:id/export', async (req, res) => {
  const workflow = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workflow: {
      name: '新規出品自動処理',
      trigger: { type: 'event', event: 'product.created' },
      steps: [],
      connections: [],
    },
  };

  res.json(workflow);
});

// ワークフローインポート
router.post('/import', async (req, res) => {
  const schema = z.object({
    workflow: z.any(),
    name: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    workflowId: `wf_${Date.now()}`,
    name: data.name || 'インポートされたワークフロー',
    status: 'draft',
    importedAt: new Date().toISOString(),
  });
});

export const ebayCustomWorkflowsRouter = router;

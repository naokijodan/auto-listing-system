import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// トリガータイプ
const TRIGGER_TYPES = {
  ORDER_RECEIVED: { id: 'ORDER_RECEIVED', name: '注文受信', category: 'order', icon: 'ShoppingCart' },
  ORDER_PAID: { id: 'ORDER_PAID', name: '支払い完了', category: 'order', icon: 'CreditCard' },
  ORDER_SHIPPED: { id: 'ORDER_SHIPPED', name: '発送完了', category: 'order', icon: 'Truck' },
  ORDER_DELIVERED: { id: 'ORDER_DELIVERED', name: '配達完了', category: 'order', icon: 'CheckCircle' },
  LISTING_SOLD: { id: 'LISTING_SOLD', name: '商品売却', category: 'listing', icon: 'DollarSign' },
  LISTING_ENDED: { id: 'LISTING_ENDED', name: '出品終了', category: 'listing', icon: 'XCircle' },
  LISTING_VIEWS: { id: 'LISTING_VIEWS', name: '閲覧数達成', category: 'listing', icon: 'Eye' },
  INVENTORY_LOW: { id: 'INVENTORY_LOW', name: '在庫低下', category: 'inventory', icon: 'AlertTriangle' },
  INVENTORY_EMPTY: { id: 'INVENTORY_EMPTY', name: '在庫切れ', category: 'inventory', icon: 'XCircle' },
  PRICE_CHANGE: { id: 'PRICE_CHANGE', name: '競合価格変動', category: 'pricing', icon: 'TrendingUp' },
  MESSAGE_RECEIVED: { id: 'MESSAGE_RECEIVED', name: 'メッセージ受信', category: 'message', icon: 'MessageSquare' },
  FEEDBACK_RECEIVED: { id: 'FEEDBACK_RECEIVED', name: 'フィードバック受信', category: 'feedback', icon: 'Star' },
  RETURN_REQUESTED: { id: 'RETURN_REQUESTED', name: '返品リクエスト', category: 'return', icon: 'RotateCcw' },
  SCHEDULE: { id: 'SCHEDULE', name: 'スケジュール', category: 'time', icon: 'Clock' },
} as const;

// アクションタイプ
const ACTION_TYPES = {
  SEND_EMAIL: { id: 'SEND_EMAIL', name: 'メール送信', category: 'notification' },
  SEND_SLACK: { id: 'SEND_SLACK', name: 'Slack通知', category: 'notification' },
  UPDATE_PRICE: { id: 'UPDATE_PRICE', name: '価格更新', category: 'listing' },
  UPDATE_QUANTITY: { id: 'UPDATE_QUANTITY', name: '数量更新', category: 'listing' },
  END_LISTING: { id: 'END_LISTING', name: '出品終了', category: 'listing' },
  RELIST: { id: 'RELIST', name: '再出品', category: 'listing' },
  SEND_MESSAGE: { id: 'SEND_MESSAGE', name: 'メッセージ送信', category: 'communication' },
  ADD_TAG: { id: 'ADD_TAG', name: 'タグ追加', category: 'organization' },
  REMOVE_TAG: { id: 'REMOVE_TAG', name: 'タグ削除', category: 'organization' },
  CREATE_TASK: { id: 'CREATE_TASK', name: 'タスク作成', category: 'task' },
  WEBHOOK: { id: 'WEBHOOK', name: 'Webhook呼び出し', category: 'integration' },
  WAIT: { id: 'WAIT', name: '待機', category: 'flow' },
  CONDITION: { id: 'CONDITION', name: '条件分岐', category: 'flow' },
  AI_GENERATE: { id: 'AI_GENERATE', name: 'AI生成', category: 'ai' },
} as const;

// モックワークフローデータ
const mockWorkflows = [
  {
    id: 'wf-1',
    name: '注文後フォローアップ',
    description: '注文完了後に自動でフォローアップメッセージを送信',
    trigger: {
      type: 'ORDER_PAID',
      config: {},
    },
    actions: [
      { id: 'a1', type: 'WAIT', config: { duration: 1, unit: 'hours' }, order: 1 },
      { id: 'a2', type: 'SEND_MESSAGE', config: { template: 'order_thanks' }, order: 2 },
    ],
    conditions: [],
    status: 'active',
    executionCount: 156,
    lastExecuted: new Date(Date.now() - 3600000).toISOString(),
    successRate: 98.5,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'wf-2',
    name: '低在庫アラート',
    description: '在庫が5個以下になったら通知',
    trigger: {
      type: 'INVENTORY_LOW',
      config: { threshold: 5 },
    },
    actions: [
      { id: 'a1', type: 'SEND_EMAIL', config: { to: 'admin@example.com', subject: '低在庫アラート' }, order: 1 },
      { id: 'a2', type: 'SEND_SLACK', config: { channel: '#inventory' }, order: 2 },
      { id: 'a3', type: 'ADD_TAG', config: { tag: 'low-stock' }, order: 3 },
    ],
    conditions: [],
    status: 'active',
    executionCount: 45,
    lastExecuted: new Date(Date.now() - 7200000).toISOString(),
    successRate: 100,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'wf-3',
    name: '競合価格追従',
    description: '競合が値下げしたら自動で価格調整',
    trigger: {
      type: 'PRICE_CHANGE',
      config: { direction: 'down', threshold: 5 },
    },
    actions: [
      { id: 'a1', type: 'CONDITION', config: { field: 'priceGap', operator: 'gt', value: 10 }, order: 1 },
      { id: 'a2', type: 'UPDATE_PRICE', config: { adjustment: -5, type: 'percent' }, order: 2 },
      { id: 'a3', type: 'SEND_SLACK', config: { channel: '#pricing' }, order: 3 },
    ],
    conditions: [
      { field: 'profitMargin', operator: 'gte', value: 15 },
    ],
    status: 'active',
    executionCount: 89,
    lastExecuted: new Date(Date.now() - 1800000).toISOString(),
    successRate: 95.5,
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'wf-4',
    name: '配達完了レビュー依頼',
    description: '配達完了3日後にレビュー依頼を送信',
    trigger: {
      type: 'ORDER_DELIVERED',
      config: {},
    },
    actions: [
      { id: 'a1', type: 'WAIT', config: { duration: 3, unit: 'days' }, order: 1 },
      { id: 'a2', type: 'AI_GENERATE', config: { type: 'review_request' }, order: 2 },
      { id: 'a3', type: 'SEND_MESSAGE', config: { useAiContent: true }, order: 3 },
    ],
    conditions: [],
    status: 'paused',
    executionCount: 234,
    lastExecuted: new Date(Date.now() - 86400000).toISOString(),
    successRate: 97.2,
    createdAt: '2024-01-20T00:00:00Z',
  },
];

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const activeWorkflows = mockWorkflows.filter(w => w.status === 'active').length;
    const totalExecutions = mockWorkflows.reduce((sum, w) => sum + w.executionCount, 0);
    const avgSuccessRate = (mockWorkflows.reduce((sum, w) => sum + w.successRate, 0) / mockWorkflows.length).toFixed(1);

    const dashboard = {
      summary: {
        totalWorkflows: mockWorkflows.length,
        activeWorkflows,
        pausedWorkflows: mockWorkflows.filter(w => w.status === 'paused').length,
        totalExecutions,
        executionsToday: 45,
        avgSuccessRate,
      },
      recentExecutions: Array.from({ length: 10 }, (_, i) => ({
        id: `exec-${Date.now() - i * 100000}`,
        workflowId: mockWorkflows[Math.floor(Math.random() * mockWorkflows.length)].id,
        workflowName: mockWorkflows[Math.floor(Math.random() * mockWorkflows.length)].name,
        status: Math.random() > 0.05 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 5000) + 500,
        executedAt: new Date(Date.now() - i * 600000).toISOString(),
      })),
      executionsByTrigger: Object.keys(TRIGGER_TYPES).slice(0, 6).map(type => ({
        trigger: type,
        count: Math.floor(Math.random() * 100) + 10,
      })),
      executionsTrend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        executions: Math.floor(Math.random() * 50) + 20,
        success: Math.floor(Math.random() * 48) + 18,
        failed: Math.floor(Math.random() * 3),
      })),
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// トリガータイプ一覧
router.get('/triggers', async (_req: Request, res: Response) => {
  try {
    const triggers = Object.values(TRIGGER_TYPES);
    const grouped = triggers.reduce((acc, trigger) => {
      if (!acc[trigger.category]) {
        acc[trigger.category] = [];
      }
      acc[trigger.category].push(trigger);
      return acc;
    }, {} as Record<string, typeof triggers>);

    res.json({
      triggers,
      grouped,
    });
  } catch (error) {
    console.error('Triggers error:', error);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

// アクションタイプ一覧
router.get('/actions', async (_req: Request, res: Response) => {
  try {
    const actions = Object.values(ACTION_TYPES);
    const grouped = actions.reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {} as Record<string, typeof actions>);

    res.json({
      actions,
      grouped,
    });
  } catch (error) {
    console.error('Actions error:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// ワークフロー一覧
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const { status, trigger } = req.query;

    let workflows = [...mockWorkflows];

    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }

    if (trigger) {
      workflows = workflows.filter(w => w.trigger.type === trigger);
    }

    res.json({
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    console.error('Workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// ワークフロー詳細
router.get('/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = mockWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const detail = {
      ...workflow,
      executionHistory: Array.from({ length: 20 }, (_, i) => ({
        id: `exec-${Date.now() - i * 100000}`,
        status: Math.random() > 0.05 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 5000) + 500,
        executedAt: new Date(Date.now() - i * 3600000).toISOString(),
        triggeredBy: 'system',
        actions: workflow.actions.map(a => ({
          ...a,
          status: Math.random() > 0.02 ? 'completed' : 'failed',
          duration: Math.floor(Math.random() * 1000) + 100,
        })),
      })),
      stats: {
        last24h: { executions: 12, success: 11, failed: 1 },
        last7d: { executions: 78, success: 76, failed: 2 },
        last30d: { executions: workflow.executionCount, success: Math.floor(workflow.executionCount * workflow.successRate / 100), failed: Math.ceil(workflow.executionCount * (100 - workflow.successRate) / 100) },
      },
    };

    res.json(detail);
  } catch (error) {
    console.error('Workflow detail error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// ワークフロー作成
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      trigger: z.object({
        type: z.string(),
        config: z.record(z.unknown()).optional(),
      }),
      actions: z.array(z.object({
        type: z.string(),
        config: z.record(z.unknown()).optional(),
        order: z.number(),
      })),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.string(),
        value: z.unknown(),
      })).optional(),
    });

    const data = schema.parse(req.body);

    const newWorkflow = {
      id: `wf-${Date.now()}`,
      ...data,
      status: 'active',
      executionCount: 0,
      lastExecuted: null,
      successRate: 0,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: 'ワークフローを作成しました',
      workflow: newWorkflow,
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// ワークフロー更新
router.put('/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = mockWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const schema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      trigger: z.object({
        type: z.string(),
        config: z.record(z.unknown()).optional(),
      }).optional(),
      actions: z.array(z.object({
        id: z.string().optional(),
        type: z.string(),
        config: z.record(z.unknown()).optional(),
        order: z.number(),
      })).optional(),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.string(),
        value: z.unknown(),
      })).optional(),
      status: z.enum(['active', 'paused']).optional(),
    });

    const data = schema.parse(req.body);

    res.json({
      success: true,
      message: 'ワークフローを更新しました',
      workflow: { ...workflow, ...data },
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ワークフロー削除
router.delete('/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = mockWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      success: true,
      message: 'ワークフローを削除しました',
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ワークフロー有効/無効切替
router.post('/workflows/:workflowId/toggle', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = mockWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const newStatus = workflow.status === 'active' ? 'paused' : 'active';

    res.json({
      success: true,
      message: `ワークフローを${newStatus === 'active' ? '有効' : '無効'}にしました`,
      status: newStatus,
    });
  } catch (error) {
    console.error('Toggle workflow error:', error);
    res.status(500).json({ error: 'Failed to toggle workflow' });
  }
});

// ワークフロー手動実行
router.post('/workflows/:workflowId/execute', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { testMode = false } = req.body;

    const workflow = mockWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      success: true,
      message: testMode ? 'テスト実行を開始しました' : 'ワークフローを実行しました',
      executionId: `exec-${Date.now()}`,
      testMode,
    });
  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// 実行履歴
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const { workflowId, status, limit = '50' } = req.query;

    const executions = Array.from({ length: Number(limit) }, (_, i) => {
      const wf = mockWorkflows[Math.floor(Math.random() * mockWorkflows.length)];
      return {
        id: `exec-${Date.now() - i * 100000}`,
        workflowId: wf.id,
        workflowName: wf.name,
        trigger: wf.trigger.type,
        status: Math.random() > 0.05 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 5000) + 500,
        actionsExecuted: wf.actions.length,
        executedAt: new Date(Date.now() - i * 600000).toISOString(),
      };
    });

    res.json({
      executions,
      total: 500,
    });
  } catch (error) {
    console.error('Executions error:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// 実行詳細
router.get('/executions/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    const wf = mockWorkflows[0];
    const execution = {
      id: executionId,
      workflowId: wf.id,
      workflowName: wf.name,
      trigger: {
        type: wf.trigger.type,
        data: { orderId: 'order-123', amount: 150 },
      },
      status: 'success',
      duration: 2345,
      startedAt: new Date(Date.now() - 2345).toISOString(),
      completedAt: new Date().toISOString(),
      actions: wf.actions.map((a, i) => ({
        ...a,
        status: 'completed',
        duration: Math.floor(Math.random() * 1000) + 100,
        startedAt: new Date(Date.now() - (wf.actions.length - i) * 500).toISOString(),
        output: { success: true },
      })),
      logs: [
        { level: 'info', message: 'Workflow started', timestamp: new Date(Date.now() - 2345).toISOString() },
        { level: 'info', message: 'Trigger matched: ORDER_PAID', timestamp: new Date(Date.now() - 2300).toISOString() },
        { level: 'info', message: 'Action 1 started: WAIT', timestamp: new Date(Date.now() - 2000).toISOString() },
        { level: 'info', message: 'Action 1 completed', timestamp: new Date(Date.now() - 1000).toISOString() },
        { level: 'info', message: 'Action 2 started: SEND_MESSAGE', timestamp: new Date(Date.now() - 800).toISOString() },
        { level: 'info', message: 'Action 2 completed', timestamp: new Date(Date.now() - 100).toISOString() },
        { level: 'info', message: 'Workflow completed successfully', timestamp: new Date().toISOString() },
      ],
    };

    res.json(execution);
  } catch (error) {
    console.error('Execution detail error:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// テンプレート一覧
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'tmpl-1',
        name: '注文後フォローアップ',
        description: '注文完了後に感謝メッセージを送信',
        category: 'order',
        trigger: 'ORDER_PAID',
        popularity: 95,
      },
      {
        id: 'tmpl-2',
        name: '低在庫アラート',
        description: '在庫が少なくなったら通知',
        category: 'inventory',
        trigger: 'INVENTORY_LOW',
        popularity: 88,
      },
      {
        id: 'tmpl-3',
        name: '価格自動調整',
        description: '競合価格に合わせて自動調整',
        category: 'pricing',
        trigger: 'PRICE_CHANGE',
        popularity: 75,
      },
      {
        id: 'tmpl-4',
        name: 'レビュー依頼',
        description: '配達完了後にレビューを依頼',
        category: 'feedback',
        trigger: 'ORDER_DELIVERED',
        popularity: 82,
      },
      {
        id: 'tmpl-5',
        name: '返品対応通知',
        description: '返品リクエストを即座に通知',
        category: 'return',
        trigger: 'RETURN_REQUESTED',
        popularity: 70,
      },
    ];

    res.json(templates);
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// テンプレートからワークフロー作成
router.post('/templates/:templateId/create', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { name, customize } = req.body;

    res.json({
      success: true,
      message: 'テンプレートからワークフローを作成しました',
      workflowId: `wf-${Date.now()}`,
    });
  } catch (error) {
    console.error('Create from template error:', error);
    res.status(500).json({ error: 'Failed to create workflow from template' });
  }
});

// 設定
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      globalEnabled: true,
      maxConcurrentExecutions: 10,
      defaultTimeout: 30000, // ms
      retryOnFailure: true,
      maxRetries: 3,
      notifications: {
        onFailure: true,
        onSuccess: false,
        channels: ['email', 'slack'],
      },
      logging: {
        level: 'info',
        retentionDays: 30,
      },
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    res.json({
      success: true,
      message: '設定を更新しました',
      settings: data,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as ebayWorkflowsRouter };

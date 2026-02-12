/**
 * ワークフロールール管理API
 * Phase 73: ワークフロー自動化エンジン
 */

import { Router } from 'express';
import { PrismaClient, WorkflowTriggerType, WorkflowExecutionStatus } from '@prisma/client';
import {
  triggerWorkflows,
  createWorkflowRule,
  updateWorkflowRule,
  getWorkflowStats,
  getExecutionHistory,
  setupDefaultWorkflowRules,
} from '../lib/workflow-engine';

const router = Router();
const prisma = new PrismaClient();

/**
 * ワークフロー統計を取得
 * GET /api/workflow-rules/stats
 */
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getWorkflowStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow stats',
    });
  }
});

/**
 * トリガータイプ一覧を取得
 * GET /api/workflow-rules/trigger-types
 */
router.get('/trigger-types', (_req, res) => {
  const triggerTypes = [
    { value: 'ORDER_CREATED', label: '注文作成', labelEn: 'Order Created', category: 'order' },
    { value: 'ORDER_PAID', label: '支払い完了', labelEn: 'Order Paid', category: 'order' },
    { value: 'ORDER_SHIPPED', label: '発送完了', labelEn: 'Order Shipped', category: 'order' },
    { value: 'ORDER_CANCELLED', label: '注文キャンセル', labelEn: 'Order Cancelled', category: 'order' },
    { value: 'LISTING_CREATED', label: '出品作成', labelEn: 'Listing Created', category: 'listing' },
    { value: 'LISTING_SOLD', label: '販売成立', labelEn: 'Listing Sold', category: 'listing' },
    { value: 'INVENTORY_LOW', label: '在庫僅少', labelEn: 'Low Inventory', category: 'inventory' },
    { value: 'OUT_OF_STOCK', label: '在庫切れ', labelEn: 'Out of Stock', category: 'inventory' },
    { value: 'PRICE_CHANGED', label: '価格変更', labelEn: 'Price Changed', category: 'product' },
    { value: 'MESSAGE_RECEIVED', label: 'メッセージ受信', labelEn: 'Message Received', category: 'communication' },
    { value: 'JOB_COMPLETED', label: 'ジョブ完了', labelEn: 'Job Completed', category: 'system' },
    { value: 'JOB_FAILED', label: 'ジョブ失敗', labelEn: 'Job Failed', category: 'system' },
    { value: 'SCHEDULE', label: 'スケジュール', labelEn: 'Schedule', category: 'system' },
    { value: 'MANUAL', label: '手動実行', labelEn: 'Manual', category: 'system' },
  ];

  res.json({ success: true, data: triggerTypes });
});

/**
 * アクションタイプ一覧を取得
 * GET /api/workflow-rules/action-types
 */
router.get('/action-types', (_req, res) => {
  const actionTypes = [
    {
      value: 'SEND_NOTIFICATION',
      label: '通知を送信',
      labelEn: 'Send Notification',
      description: 'アプリ内通知を作成',
      configSchema: {
        notificationType: { type: 'select', options: ['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'ORDER', 'TASK'] },
        title: { type: 'text', placeholder: '通知タイトル' },
        message: { type: 'textarea', placeholder: '通知メッセージ' },
      },
    },
    {
      value: 'SEND_SLACK',
      label: 'Slack通知',
      labelEn: 'Send Slack',
      description: 'Slackチャンネルに通知',
      configSchema: {
        message: { type: 'textarea', placeholder: 'メッセージ' },
        channel: { type: 'text', placeholder: '#channel（オプション）' },
      },
    },
    {
      value: 'UPDATE_STATUS',
      label: 'ステータス更新',
      labelEn: 'Update Status',
      description: 'エンティティのステータスを更新',
      configSchema: {
        entityType: { type: 'select', options: ['order', 'listing', 'product'] },
        newStatus: { type: 'text', placeholder: '新しいステータス' },
      },
    },
    {
      value: 'CREATE_TASK',
      label: 'タスク作成',
      labelEn: 'Create Task',
      description: 'タスクを作成',
      configSchema: {
        title: { type: 'text', placeholder: 'タスクタイトル' },
        description: { type: 'textarea', placeholder: 'タスク説明' },
        taskType: { type: 'text', placeholder: 'タスクタイプ' },
        priority: { type: 'select', options: ['low', 'normal', 'high'] },
      },
    },
    {
      value: 'TRIGGER_JOB',
      label: 'ジョブ実行',
      labelEn: 'Trigger Job',
      description: 'BullMQジョブをトリガー',
      configSchema: {
        queueName: { type: 'text', placeholder: 'キュー名' },
        jobName: { type: 'text', placeholder: 'ジョブ名' },
      },
    },
    {
      value: 'WEBHOOK',
      label: 'Webhook呼び出し',
      labelEn: 'Call Webhook',
      description: '外部URLにHTTPリクエストを送信',
      configSchema: {
        url: { type: 'text', placeholder: 'https://...' },
        method: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      },
    },
    {
      value: 'LOG',
      label: 'ログ記録',
      labelEn: 'Log',
      description: 'ログメッセージを記録',
      configSchema: {
        message: { type: 'textarea', placeholder: 'ログメッセージ' },
      },
    },
  ];

  res.json({ success: true, data: actionTypes });
});

/**
 * 条件演算子一覧を取得
 * GET /api/workflow-rules/operators
 */
router.get('/operators', (_req, res) => {
  const operators = [
    { value: 'equals', label: '等しい', labelEn: 'Equals' },
    { value: 'not_equals', label: '等しくない', labelEn: 'Not Equals' },
    { value: 'contains', label: '含む', labelEn: 'Contains' },
    { value: 'not_contains', label: '含まない', labelEn: 'Does Not Contain' },
    { value: 'greater_than', label: 'より大きい', labelEn: 'Greater Than' },
    { value: 'less_than', label: 'より小さい', labelEn: 'Less Than' },
    { value: 'greater_or_equal', label: '以上', labelEn: 'Greater or Equal' },
    { value: 'less_or_equal', label: '以下', labelEn: 'Less or Equal' },
    { value: 'in', label: 'いずれかに含まれる', labelEn: 'In' },
    { value: 'not_in', label: 'いずれにも含まれない', labelEn: 'Not In' },
    { value: 'is_null', label: '空である', labelEn: 'Is Null' },
    { value: 'is_not_null', label: '空でない', labelEn: 'Is Not Null' },
  ];

  res.json({ success: true, data: operators });
});

/**
 * ワークフロールール一覧を取得
 * GET /api/workflow-rules
 */
router.get('/', async (req, res) => {
  try {
    const { triggerType, isActive, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};
    if (triggerType) where.triggerType = triggerType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [rules, total] = await Promise.all([
      prisma.workflowRule.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.workflowRule.count({ where }),
    ]);

    res.json({ success: true, data: { rules, total } });
  } catch (error) {
    console.error('Error fetching workflow rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow rules',
    });
  }
});

/**
 * ワークフロールール詳細を取得
 * GET /api/workflow-rules/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.workflowRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Workflow rule not found',
      });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error fetching workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow rule',
    });
  }
});

/**
 * ワークフロールールを作成
 * POST /api/workflow-rules
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      cronExpression,
      timezone,
      maxExecutionsPerDay,
      cooldownMinutes,
      priority,
    } = req.body;

    if (!name || !triggerType || !actions || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name, triggerType, and actions are required',
      });
    }

    const rule = await createWorkflowRule({
      name,
      description,
      triggerType: triggerType as WorkflowTriggerType,
      triggerConfig,
      conditions,
      actions,
      cronExpression,
      timezone,
      maxExecutionsPerDay,
      cooldownMinutes,
      priority,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error('Error creating workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow rule',
    });
  }
});

/**
 * ワークフロールールを更新
 * PATCH /api/workflow-rules/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await updateWorkflowRule(id, req.body);

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error updating workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow rule',
    });
  }
});

/**
 * ワークフロールールを削除
 * DELETE /api/workflow-rules/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 実行履歴も削除
    await prisma.workflowExecution.deleteMany({
      where: { ruleId: id },
    });

    await prisma.workflowRule.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Workflow rule deleted' });
  } catch (error) {
    console.error('Error deleting workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow rule',
    });
  }
});

/**
 * ワークフロールールを有効/無効に切り替え
 * PATCH /api/workflow-rules/:id/toggle
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.workflowRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Workflow rule not found',
      });
    }

    const updated = await prisma.workflowRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error toggling workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle workflow rule',
    });
  }
});

/**
 * ワークフロー実行履歴を取得
 * GET /api/workflow-rules/executions
 */
router.get('/executions/list', async (req, res) => {
  try {
    const { ruleId, status, limit = '50', offset = '0' } = req.query;

    const result = await getExecutionHistory({
      ruleId: ruleId as string | undefined,
      status: status as WorkflowExecutionStatus | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow executions',
    });
  }
});

/**
 * ワークフロー実行詳細を取得
 * GET /api/workflow-rules/executions/:id
 */
router.get('/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: { rule: { select: { name: true, triggerType: true } } },
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({ success: true, data: execution });
  } catch (error) {
    console.error('Error fetching workflow execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow execution',
    });
  }
});

/**
 * ワークフローを手動でトリガー
 * POST /api/workflow-rules/trigger
 */
router.post('/trigger', async (req, res) => {
  try {
    const { triggerType, entityType, entityId, data } = req.body;

    if (!triggerType) {
      return res.status(400).json({
        success: false,
        error: 'triggerType is required',
      });
    }

    const result = await triggerWorkflows({
      triggerType: triggerType as WorkflowTriggerType,
      entityType,
      entityId,
      data: data || {},
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error triggering workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger workflows',
    });
  }
});

/**
 * ワークフロールールをテスト実行
 * POST /api/workflow-rules/:id/test
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { testData } = req.body;

    const rule = await prisma.workflowRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Workflow rule not found',
      });
    }

    // テスト実行
    const result = await triggerWorkflows({
      triggerType: rule.triggerType,
      data: testData || {},
    });

    res.json({
      success: true,
      data: {
        wouldTrigger: result.results.some(r => r.ruleId === id && r.status !== 'SKIPPED'),
        result: result.results.find(r => r.ruleId === id),
      },
    });
  } catch (error) {
    console.error('Error testing workflow rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test workflow rule',
    });
  }
});

/**
 * デフォルトワークフロールールをセットアップ
 * POST /api/workflow-rules/setup-defaults
 */
router.post('/setup-defaults', async (_req, res) => {
  try {
    const result = await setupDefaultWorkflowRules();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error setting up default workflow rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup default workflow rules',
    });
  }
});

/**
 * 利用可能な変数一覧を取得
 * GET /api/workflow-rules/variables
 */
router.get('/variables/list', (_req, res) => {
  const variables = {
    order: [
      { name: 'orderId', description: '注文ID' },
      { name: 'marketplace', description: 'マーケットプレイス' },
      { name: 'totalAmount', description: '合計金額' },
      { name: 'buyerName', description: '購入者名' },
      { name: 'buyerEmail', description: '購入者メール' },
      { name: 'status', description: 'ステータス' },
    ],
    listing: [
      { name: 'listingId', description: '出品ID' },
      { name: 'productTitle', description: '商品タイトル' },
      { name: 'listingPrice', description: '出品価格' },
      { name: 'marketplace', description: 'マーケットプレイス' },
    ],
    product: [
      { name: 'productId', description: '商品ID' },
      { name: 'productTitle', description: '商品タイトル' },
      { name: 'price', description: '価格' },
      { name: 'brand', description: 'ブランド' },
      { name: 'category', description: 'カテゴリ' },
    ],
    job: [
      { name: 'jobId', description: 'ジョブID' },
      { name: 'jobName', description: 'ジョブ名' },
      { name: 'queueName', description: 'キュー名' },
      { name: 'error', description: 'エラーメッセージ' },
    ],
  };

  res.json({ success: true, data: variables });
});

export default router;

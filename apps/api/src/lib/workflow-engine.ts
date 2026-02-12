/**
 * ワークフロー自動化エンジン
 * Phase 73: イベント駆動型ワークフロー実行システム
 */

import { PrismaClient, WorkflowTriggerType, WorkflowExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// 条件演算子
type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

// 条件定義
interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'AND' | 'OR'; // 次の条件との論理演算
}

// アクションタイプ
type WorkflowActionType =
  | 'SEND_NOTIFICATION'
  | 'SEND_EMAIL'
  | 'SEND_SLACK'
  | 'UPDATE_STATUS'
  | 'CREATE_TASK'
  | 'TRIGGER_JOB'
  | 'WEBHOOK'
  | 'LOG'
  | 'DELAY'
  | 'CONDITIONAL_BRANCH';

// アクション定義
interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

// アクション実行結果
interface ActionResult {
  action: WorkflowAction;
  status: 'success' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration?: number;
}

// トリガーコンテキスト
interface TriggerContext {
  triggerType: WorkflowTriggerType;
  entityType?: string;
  entityId?: string;
  data: Record<string, unknown>;
}

/**
 * 条件を評価する
 */
function evaluateCondition(
  condition: WorkflowCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(context, condition.field);

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;
    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return !fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value);
      }
      return true;
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(condition.value);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(condition.value);
    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue);
      }
      return false;
    case 'not_in':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(fieldValue);
      }
      return true;
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;
    default:
      return false;
  }
}

/**
 * ネストしたオブジェクトから値を取得
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * 全条件を評価する
 */
function evaluateConditions(
  conditions: WorkflowCondition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;

  let result = evaluateCondition(conditions[0], context);

  for (let i = 1; i < conditions.length; i++) {
    const prevLogic = conditions[i - 1].logic || 'AND';
    const currentResult = evaluateCondition(conditions[i], context);

    if (prevLogic === 'AND') {
      result = result && currentResult;
    } else {
      result = result || currentResult;
    }
  }

  return result;
}

/**
 * アクションを実行する
 */
async function executeAction(
  action: WorkflowAction,
  context: TriggerContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    let result: unknown;

    switch (action.type) {
      case 'SEND_NOTIFICATION': {
        // 通知を作成
        const notification = await prisma.notification.create({
          data: {
            type: (action.config.notificationType as string) || 'INFO',
            title: replaceVariables(action.config.title as string, context.data),
            message: replaceVariables(action.config.message as string, context.data),
            data: context.data as object,
          },
        });
        result = { notificationId: notification.id };
        break;
      }

      case 'SEND_SLACK': {
        // Slack通知（既存のalertManagerを使用）
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (webhookUrl) {
          const message = replaceVariables(action.config.message as string, context.data);
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message,
              channel: action.config.channel || undefined,
            }),
          });
          result = { sent: true };
        } else {
          throw new Error('SLACK_WEBHOOK_URL not configured');
        }
        break;
      }

      case 'UPDATE_STATUS': {
        // ステータス更新
        const { entityType, entityId, newStatus } = action.config as {
          entityType: string;
          entityId?: string;
          newStatus: string;
        };
        const targetId = entityId || context.entityId;

        if (!targetId) {
          throw new Error('Entity ID not specified');
        }

        switch (entityType) {
          case 'order':
            await prisma.order.update({
              where: { id: targetId },
              data: { status: newStatus as never },
            });
            break;
          case 'listing':
            await prisma.listing.update({
              where: { id: targetId },
              data: { status: newStatus as never },
            });
            break;
          case 'product':
            await prisma.product.update({
              where: { id: targetId },
              data: { status: newStatus as never },
            });
            break;
          default:
            throw new Error(`Unknown entity type: ${entityType}`);
        }
        result = { updated: true, entityType, entityId: targetId, newStatus };
        break;
      }

      case 'CREATE_TASK': {
        // タスク（通知として）を作成
        const notification = await prisma.notification.create({
          data: {
            type: 'TASK',
            title: replaceVariables(action.config.title as string, context.data),
            message: replaceVariables(action.config.description as string, context.data),
            data: {
              ...context.data,
              taskType: action.config.taskType,
              priority: action.config.priority || 'normal',
            } as object,
          },
        });
        result = { taskId: notification.id };
        break;
      }

      case 'TRIGGER_JOB': {
        // BullMQジョブをトリガー
        // 注: 実際の実装ではqueue packageを使用
        const { queueName, jobName, jobData } = action.config as {
          queueName: string;
          jobName: string;
          jobData?: Record<string, unknown>;
        };
        const mergedData = { ...context.data, ...jobData };

        // ジョブログを記録
        const jobLog = await prisma.jobLog.create({
          data: {
            queueName,
            jobType: jobName,
            status: 'QUEUED',
            input: mergedData,
          },
        });
        result = { jobLogId: jobLog.id, queueName, jobName };
        break;
      }

      case 'WEBHOOK': {
        // 外部Webhookを呼び出す
        const { url, method, headers, body } = action.config as {
          url: string;
          method?: string;
          headers?: Record<string, string>;
          body?: unknown;
        };
        const response = await fetch(url, {
          method: method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(replaceVariablesInObject(body, context.data)) : undefined,
        });
        result = { status: response.status, ok: response.ok };
        break;
      }

      case 'LOG': {
        // ログを記録
        const message = replaceVariables(action.config.message as string, context.data);
        console.log(`[Workflow] ${message}`);
        result = { logged: true, message };
        break;
      }

      case 'DELAY': {
        // 遅延（同期的には実行せず、スケジュール情報を返す）
        const delayMs = (action.config.delayMs as number) || 0;
        result = { delayed: true, delayMs, executeAt: new Date(Date.now() + delayMs) };
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    return {
      action,
      status: 'success',
      result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      action,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 変数を置換する
 */
function replaceVariables(template: string, data: Record<string, unknown>): string {
  if (!template) return '';

  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const value = getNestedValue(data, key);
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * オブジェクト内の変数を再帰的に置換
 */
function replaceVariablesInObject(obj: unknown, data: Record<string, unknown>): unknown {
  if (typeof obj === 'string') {
    return replaceVariables(obj, data);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceVariablesInObject(item, data));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceVariablesInObject(value, data);
    }
    return result;
  }
  return obj;
}

/**
 * ワークフロールールを取得してトリガーにマッチするものを実行
 */
export async function triggerWorkflows(context: TriggerContext): Promise<{
  triggered: number;
  executed: number;
  results: Array<{
    ruleId: string;
    ruleName: string;
    status: WorkflowExecutionStatus;
    actionResults: ActionResult[];
  }>;
}> {
  // アクティブなルールを取得（優先度順）
  const rules = await prisma.workflowRule.findMany({
    where: {
      isActive: true,
      triggerType: context.triggerType,
    },
    orderBy: { priority: 'desc' },
  });

  const results: Array<{
    ruleId: string;
    ruleName: string;
    status: WorkflowExecutionStatus;
    actionResults: ActionResult[];
  }> = [];

  let executed = 0;

  for (const rule of rules) {
    // 実行制限チェック
    if (rule.maxExecutionsPerDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayExecutions = await prisma.workflowExecution.count({
        where: {
          ruleId: rule.id,
          createdAt: { gte: today },
          status: 'COMPLETED',
        },
      });
      if (todayExecutions >= rule.maxExecutionsPerDay) {
        continue; // 制限に達している
      }
    }

    // クールダウンチェック
    if (rule.cooldownMinutes && context.entityId) {
      const cooldownTime = new Date(Date.now() - rule.cooldownMinutes * 60 * 1000);
      const recentExecution = await prisma.workflowExecution.findFirst({
        where: {
          ruleId: rule.id,
          entityId: context.entityId,
          createdAt: { gte: cooldownTime },
        },
      });
      if (recentExecution) {
        continue; // クールダウン中
      }
    }

    // 条件評価
    const conditions = rule.conditions as WorkflowCondition[];
    const conditionsMet = evaluateConditions(conditions, context.data);

    // 実行記録を作成
    const execution = await prisma.workflowExecution.create({
      data: {
        ruleId: rule.id,
        triggerType: context.triggerType,
        triggerData: context.data,
        entityType: context.entityType,
        entityId: context.entityId,
        status: conditionsMet ? 'RUNNING' : 'SKIPPED',
        startedAt: conditionsMet ? new Date() : undefined,
      },
    });

    if (!conditionsMet) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'SKIPPED',
        actionResults: [],
      });
      continue;
    }

    // アクション実行
    const actions = rule.actions as WorkflowAction[];
    const actionResults: ActionResult[] = [];
    let hasError = false;

    for (const action of actions) {
      const result = await executeAction(action, context);
      actionResults.push(result);

      if (result.status === 'failed') {
        hasError = true;
        // エラー時に中断するかどうかは設定で変更可能
        break;
      }
    }

    // 実行記録を更新
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: hasError ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        duration: Date.now() - execution.createdAt.getTime(),
        actionResults: actionResults as unknown as object[],
        error: hasError ? actionResults.find(r => r.error)?.error : undefined,
      },
    });

    // ルールの統計を更新
    await prisma.workflowRule.update({
      where: { id: rule.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
        lastError: hasError ? actionResults.find(r => r.error)?.error : null,
      },
    });

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      status: hasError ? 'FAILED' : 'COMPLETED',
      actionResults,
    });

    executed++;
  }

  return {
    triggered: rules.length,
    executed,
    results,
  };
}

/**
 * ワークフロールールを作成
 */
export async function createWorkflowRule(data: {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  cronExpression?: string;
  timezone?: string;
  maxExecutionsPerDay?: number;
  cooldownMinutes?: number;
  priority?: number;
}) {
  return prisma.workflowRule.create({
    data: {
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      conditions: data.conditions || [],
      actions: data.actions,
      cronExpression: data.cronExpression,
      timezone: data.timezone,
      maxExecutionsPerDay: data.maxExecutionsPerDay,
      cooldownMinutes: data.cooldownMinutes,
      priority: data.priority || 0,
    },
  });
}

/**
 * ワークフロールールを更新
 */
export async function updateWorkflowRule(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    triggerType: WorkflowTriggerType;
    triggerConfig: Record<string, unknown>;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    cronExpression: string;
    timezone: string;
    maxExecutionsPerDay: number;
    cooldownMinutes: number;
    priority: number;
  }>
) {
  return prisma.workflowRule.update({
    where: { id },
    data,
  });
}

/**
 * ワークフロー統計を取得
 */
export async function getWorkflowStats() {
  const [totalRules, activeRules, recentExecutions, failedExecutions] = await Promise.all([
    prisma.workflowRule.count(),
    prisma.workflowRule.count({ where: { isActive: true } }),
    prisma.workflowExecution.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.workflowExecution.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // トリガータイプ別統計
  const byTriggerType = await prisma.workflowExecution.groupBy({
    by: ['triggerType'],
    _count: { id: true },
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  // ステータス別統計
  const byStatus = await prisma.workflowExecution.groupBy({
    by: ['status'],
    _count: { id: true },
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  return {
    totalRules,
    activeRules,
    inactiveRules: totalRules - activeRules,
    recentExecutions,
    failedExecutions,
    successRate: recentExecutions > 0
      ? ((recentExecutions - failedExecutions) / recentExecutions * 100).toFixed(1)
      : '100.0',
    byTriggerType: byTriggerType.map(item => ({
      triggerType: item.triggerType,
      count: item._count.id,
    })),
    byStatus: byStatus.map(item => ({
      status: item.status,
      count: item._count.id,
    })),
  };
}

/**
 * 実行履歴を取得
 */
export async function getExecutionHistory(options?: {
  ruleId?: string;
  status?: WorkflowExecutionStatus;
  limit?: number;
  offset?: number;
}) {
  const { ruleId, status, limit = 50, offset = 0 } = options || {};

  const where: Record<string, unknown> = {};
  if (ruleId) where.ruleId = ruleId;
  if (status) where.status = status;

  const [executions, total] = await Promise.all([
    prisma.workflowExecution.findMany({
      where,
      include: { rule: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.workflowExecution.count({ where }),
  ]);

  return { executions, total };
}

/**
 * デフォルトワークフロールールをセットアップ
 */
export async function setupDefaultWorkflowRules() {
  const defaults = [
    {
      name: '新規注文通知',
      description: '新規注文を受信したらSlack通知を送信',
      triggerType: WorkflowTriggerType.ORDER_CREATED,
      conditions: [],
      actions: [
        {
          type: 'SEND_SLACK' as WorkflowActionType,
          config: {
            message: '🛒 新規注文: {{orderId}} ({{marketplace}}) - {{totalAmount}}円',
          },
        },
        {
          type: 'SEND_NOTIFICATION' as WorkflowActionType,
          config: {
            notificationType: 'ORDER',
            title: '新規注文',
            message: '注文ID: {{orderId}}、金額: {{totalAmount}}円',
          },
        },
      ],
      priority: 10,
    },
    {
      name: '在庫切れアラート',
      description: '在庫切れ時に緊急通知を送信',
      triggerType: WorkflowTriggerType.OUT_OF_STOCK,
      conditions: [],
      actions: [
        {
          type: 'SEND_SLACK' as WorkflowActionType,
          config: {
            message: '⚠️ 在庫切れ: {{productTitle}} ({{productId}})',
          },
        },
        {
          type: 'CREATE_TASK' as WorkflowActionType,
          config: {
            title: '在庫補充が必要',
            description: '{{productTitle}}の在庫が切れました。仕入れを検討してください。',
            taskType: 'RESTOCK',
            priority: 'high',
          },
        },
      ],
      priority: 20,
    },
    {
      name: 'ジョブ失敗通知',
      description: 'ジョブ失敗時に通知',
      triggerType: WorkflowTriggerType.JOB_FAILED,
      conditions: [],
      actions: [
        {
          type: 'SEND_SLACK' as WorkflowActionType,
          config: {
            message: '❌ ジョブ失敗: {{jobName}} ({{queueName}}) - {{error}}',
          },
        },
      ],
      cooldownMinutes: 5, // 同じジョブの連続失敗通知を抑制
      priority: 15,
    },
  ];

  const created = [];
  for (const rule of defaults) {
    const existing = await prisma.workflowRule.findFirst({
      where: { name: rule.name },
    });
    if (!existing) {
      const newRule = await createWorkflowRule(rule);
      created.push(newRule);
    }
  }

  return { created: created.length, rules: created };
}

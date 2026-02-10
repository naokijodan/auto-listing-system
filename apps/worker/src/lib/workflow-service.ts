/**
 * Phase 35: ワークフロー自動化サービス
 *
 * 機能:
 * - ワークフロー定義・実行
 * - 承認フロー管理
 * - 自動化ルールエンジン
 * - 条件評価・アクション実行
 */

import { PrismaClient } from '@prisma/client';
import type {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  WorkflowStepExecution,
  ApprovalRequest,
  ApprovalAction,
  AutomationRule,
  AutomationExecution,
  WorkflowTriggerType,
  WorkflowTriggerSource,
  WorkflowStepType,
  WorkflowExecutionStatus,
  WorkflowStepStatus,
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalActionType,
  ConditionLogic,
  AutomationExecutionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// 型定義
// ========================================

interface WorkflowCreateInput {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  priority?: number;
  timeout?: number;
  maxRetries?: number;
  createdById?: string;
  steps: WorkflowStepInput[];
}

interface WorkflowStepInput {
  name: string;
  description?: string;
  order: number;
  stepType: WorkflowStepType;
  config?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  onSuccess?: string;
  onFailure?: string;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface WorkflowTriggerInput {
  workflowId: string;
  triggeredBy: WorkflowTriggerSource;
  triggeredById?: string;
  triggerData?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}

interface ApprovalRequestInput {
  title: string;
  description?: string;
  requestType: ApprovalRequestType;
  entityType: string;
  entityId: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  changeReason?: string;
  requiredApprovers?: number;
  approverRoleIds?: string[];
  approverUserIds?: string[];
  deadline?: Date;
  escalationEnabled?: boolean;
  escalationDelay?: number;
  executionId?: string;
}

interface AutomationRuleInput {
  name: string;
  description?: string;
  triggerEvent: string;
  priority?: number;
  conditions: ConditionInput[];
  conditionLogic?: ConditionLogic;
  actions: ActionInput[];
  rateLimit?: number;
  rateLimitPeriod?: number;
  cooldownPeriod?: number;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  notifyUserIds?: string[];
  createdById?: string;
}

interface ConditionInput {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'notIn' | 'exists' | 'regex';
  value: unknown;
}

interface ActionInput {
  type: string;
  config: Record<string, unknown>;
}

interface ConditionResult {
  condition: ConditionInput;
  met: boolean;
  actualValue: unknown;
}

// ========================================
// ワークフローサービス
// ========================================

export class WorkflowService {
  /**
   * ワークフロー作成
   */
  static async createWorkflow(input: WorkflowCreateInput): Promise<Workflow> {
    const { steps, ...workflowData } = input;

    const workflow = await prisma.workflow.create({
      data: {
        ...workflowData,
        triggerConfig: (input.triggerConfig ?? {}) as any,
        steps: {
          create: steps.map((step) => ({
            ...step,
            config: (step.config ?? {}) as any,
            condition: step.condition as any,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return workflow;
  }

  /**
   * ワークフロー取得
   */
  static async getWorkflow(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * ワークフロー一覧取得
   */
  static async listWorkflows(options: {
    triggerType?: WorkflowTriggerType;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ workflows: Workflow[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.triggerType) where.triggerType = options.triggerType;
    if (options.isActive !== undefined) where.isActive = options.isActive;

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          steps: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.workflow.count({ where }),
    ]);

    return { workflows, total };
  }

  /**
   * ワークフロー実行開始
   */
  static async triggerWorkflow(input: WorkflowTriggerInput): Promise<WorkflowExecution> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${input.workflowId}`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow is not active: ${input.workflowId}`);
    }

    const firstStep = workflow.steps[0];

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: input.workflowId,
        triggeredBy: input.triggeredBy,
        triggeredById: input.triggeredById,
        triggerData: (input.triggerData ?? {}) as any,
        entityType: input.entityType,
        entityId: input.entityId,
        status: 'RUNNING',
        currentStepId: firstStep?.id,
        startedAt: new Date(),
        context: {},
      },
      include: {
        workflow: true,
      },
    });

    // ワークフロー統計更新
    await prisma.workflow.update({
      where: { id: input.workflowId },
      data: {
        totalExecutions: { increment: 1 },
      },
    });

    // 最初のステップを非同期で実行
    if (firstStep) {
      setImmediate(() => {
        this.executeStep(execution.id, firstStep.id).catch(console.error);
      });
    }

    return execution;
  }

  /**
   * ワークフローステップ実行
   */
  static async executeStep(executionId: string, stepId: string): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!execution || execution.status !== 'RUNNING') {
      return;
    }

    const step = execution.workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    // ステップ実行レコード作成
    const stepExecution = await prisma.workflowStepExecution.create({
      data: {
        executionId,
        stepId,
        status: 'RUNNING',
        startedAt: new Date(),
        input: execution.context as any,
      },
    });

    try {
      // 条件チェック
      if (step.condition) {
        const conditionMet = this.evaluateCondition(
          step.condition as Record<string, unknown>,
          execution.context as Record<string, unknown>
        );

        if (!conditionMet) {
          await this.completeStepExecution(stepExecution.id, 'SKIPPED', {});
          await this.advanceToNextStep(executionId, step, false);
          return;
        }
      }

      // ステップタイプ別の処理
      let output: Record<string, unknown> = {};

      switch (step.stepType) {
        case 'ACTION':
          output = await this.executeAction(step.config as Record<string, unknown>, execution.context as Record<string, unknown>);
          break;

        case 'CONDITION':
          const result = this.evaluateCondition(
            step.config as Record<string, unknown>,
            execution.context as Record<string, unknown>
          );
          output = { result };
          break;

        case 'APPROVAL':
          await this.createApprovalFromStep(execution, step);
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: { status: 'WAITING_APPROVAL' },
          });
          await this.completeStepExecution(stepExecution.id, 'WAITING', {});
          return;

        case 'DELAY':
          const delayMs = (step.config as Record<string, unknown>).delayMs as number ?? 60000;
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 300000)));
          output = { delayed: true, delayMs };
          break;

        case 'NOTIFICATION':
          await this.sendNotification(step.config as Record<string, unknown>, execution.context as Record<string, unknown>);
          output = { notified: true };
          break;

        case 'AI':
          output = await this.executeAiStep(step.config as Record<string, unknown>, execution.context as Record<string, unknown>);
          break;

        default:
          output = { executed: true };
      }

      // ステップ完了
      await this.completeStepExecution(stepExecution.id, 'COMPLETED', output);

      // コンテキスト更新
      const newContext = {
        ...(execution.context as Record<string, unknown>),
        [`step_${step.order}_output`]: output,
      };
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { context: newContext as any },
      });

      // 次のステップへ
      await this.advanceToNextStep(executionId, step, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // リトライ判定
      if (step.retryOnError && stepExecution.retryCount < step.maxRetries) {
        await prisma.workflowStepExecution.update({
          where: { id: stepExecution.id },
          data: { retryCount: { increment: 1 } },
        });

        setTimeout(() => {
          this.executeStep(executionId, stepId).catch(console.error);
        }, step.retryDelay);
        return;
      }

      await this.completeStepExecution(stepExecution.id, 'FAILED', {}, errorMessage);

      // 失敗時の遷移先があれば遷移
      if (step.onFailure) {
        await this.executeStep(executionId, step.onFailure);
      } else {
        await this.failWorkflowExecution(executionId, errorMessage);
      }
    }
  }

  /**
   * 次のステップへ進む
   */
  private static async advanceToNextStep(
    executionId: string,
    currentStep: WorkflowStep,
    success: boolean
  ): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!execution) return;

    // 次のステップを決定
    let nextStepId: string | null = null;

    if (success && currentStep.onSuccess) {
      nextStepId = currentStep.onSuccess;
    } else if (!success && currentStep.onFailure) {
      nextStepId = currentStep.onFailure;
    } else {
      // デフォルト: 次の順序のステップ
      const currentIndex = execution.workflow.steps.findIndex((s) => s.id === currentStep.id);
      const nextStep = execution.workflow.steps[currentIndex + 1];
      nextStepId = nextStep?.id ?? null;
    }

    if (nextStepId) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { currentStepId: nextStepId },
      });
      await this.executeStep(executionId, nextStepId);
    } else {
      // ワークフロー完了
      await this.completeWorkflowExecution(executionId);
    }
  }

  /**
   * ステップ実行完了
   */
  private static async completeStepExecution(
    stepExecutionId: string,
    status: WorkflowStepStatus,
    output: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    const stepExecution = await prisma.workflowStepExecution.findUnique({
      where: { id: stepExecutionId },
    });

    if (!stepExecution) return;

    const completedAt = new Date();
    const duration = stepExecution.startedAt
      ? completedAt.getTime() - stepExecution.startedAt.getTime()
      : null;

    await prisma.workflowStepExecution.update({
      where: { id: stepExecutionId },
      data: {
        status,
        output: output as any,
        completedAt,
        duration,
        errorMessage,
      },
    });
  }

  /**
   * ワークフロー実行完了
   */
  private static async completeWorkflowExecution(executionId: string): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) return;

    const completedAt = new Date();
    const duration = execution.startedAt
      ? completedAt.getTime() - execution.startedAt.getTime()
      : null;

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt,
        duration,
      },
    });

    await prisma.workflow.update({
      where: { id: execution.workflowId },
      data: {
        successfulExecutions: { increment: 1 },
      },
    });
  }

  /**
   * ワークフロー実行失敗
   */
  private static async failWorkflowExecution(
    executionId: string,
    errorMessage: string
  ): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) return;

    const completedAt = new Date();
    const duration = execution.startedAt
      ? completedAt.getTime() - execution.startedAt.getTime()
      : null;

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        completedAt,
        duration,
        errorMessage,
      },
    });

    await prisma.workflow.update({
      where: { id: execution.workflowId },
      data: {
        failedExecutions: { increment: 1 },
      },
    });
  }

  /**
   * 条件評価
   */
  private static evaluateCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    const { field, operator, value } = condition as unknown as ConditionInput;
    const actualValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'eq':
        return actualValue === value;
      case 'ne':
        return actualValue !== value;
      case 'gt':
        return typeof actualValue === 'number' && actualValue > (value as number);
      case 'gte':
        return typeof actualValue === 'number' && actualValue >= (value as number);
      case 'lt':
        return typeof actualValue === 'number' && actualValue < (value as number);
      case 'lte':
        return typeof actualValue === 'number' && actualValue <= (value as number);
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(value as string);
      case 'in':
        return Array.isArray(value) && value.includes(actualValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(actualValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'regex':
        return typeof actualValue === 'string' && new RegExp(value as string).test(actualValue);
      default:
        return false;
    }
  }

  /**
   * ネストした値を取得
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * アクション実行
   */
  private static async executeAction(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const actionType = config.type as string;

    switch (actionType) {
      case 'updateEntity':
        return this.executeUpdateEntity(config, context);
      case 'createEntity':
        return this.executeCreateEntity(config, context);
      case 'sendEmail':
        return this.executeSendEmail(config, context);
      case 'webhook':
        return this.executeWebhook(config, context);
      case 'queue':
        return this.executeQueueJob(config, context);
      default:
        return { actionType, executed: true };
    }
  }

  private static async executeUpdateEntity(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 実際の実装ではPrismaを使ってエンティティを更新
    return { updated: true, entityType: config.entityType, entityId: config.entityId };
  }

  private static async executeCreateEntity(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return { created: true, entityType: config.entityType };
  }

  private static async executeSendEmail(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 実際の実装ではメール送信
    return { sent: true, to: config.to };
  }

  private static async executeWebhook(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = config.url as string;
    const method = (config.method as string) ?? 'POST';
    const body = config.body ?? context;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return {
      webhookSent: true,
      status: response.status,
      ok: response.ok,
    };
  }

  private static async executeQueueJob(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 実際の実装ではBullMQにジョブを追加
    return { queued: true, queueName: config.queueName, jobType: config.jobType };
  }

  /**
   * 通知送信
   */
  private static async sendNotification(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<void> {
    // 実際の実装では通知サービスを呼び出す
    console.log('Notification sent:', config);
  }

  /**
   * AI ステップ実行
   */
  private static async executeAiStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 実際の実装ではOpenAI APIを呼び出す
    return { aiProcessed: true, model: config.model };
  }

  /**
   * 承認ステップから承認リクエスト作成
   */
  private static async createApprovalFromStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<ApprovalRequest> {
    const config = step.config as Record<string, unknown>;

    return prisma.approvalRequest.create({
      data: {
        executionId: execution.id,
        title: (config.title as string) ?? step.name,
        description: config.description as string,
        requestType: (config.requestType as ApprovalRequestType) ?? 'CUSTOM',
        entityType: execution.entityType ?? 'workflow',
        entityId: execution.entityId ?? execution.id,
        currentValue: (execution.context as any)?.currentValue,
        proposedValue: (execution.context as any)?.proposedValue,
        changeReason: (execution.context as any)?.changeReason,
        requiredApprovers: (config.requiredApprovers as number) ?? 1,
        approverRoleIds: (config.approverRoleIds as string[]) ?? [],
        approverUserIds: (config.approverUserIds as string[]) ?? [],
        deadline: config.deadline ? new Date(config.deadline as string) : undefined,
        escalationEnabled: (config.escalationEnabled as boolean) ?? false,
        escalationDelay: config.escalationDelay as number,
        status: 'PENDING',
      },
    });
  }
}

// ========================================
// 承認サービス
// ========================================

export class ApprovalService {
  /**
   * 承認リクエスト作成
   */
  static async createApprovalRequest(input: ApprovalRequestInput): Promise<ApprovalRequest> {
    return prisma.approvalRequest.create({
      data: {
        ...input,
        currentValue: input.currentValue as any,
        proposedValue: input.proposedValue as any,
        approverRoleIds: input.approverRoleIds ?? [],
        approverUserIds: input.approverUserIds ?? [],
        status: 'PENDING',
      },
    });
  }

  /**
   * 承認リクエスト取得
   */
  static async getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
    return prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        actions: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        execution: {
          include: {
            workflow: true,
          },
        },
      },
    });
  }

  /**
   * 承認リクエスト一覧（ユーザー用）
   */
  static async listPendingApprovals(userId: string, roleIds: string[]): Promise<ApprovalRequest[]> {
    return prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { approverUserIds: { has: userId } },
          { approverRoleIds: { hasSome: roleIds } },
        ],
      },
      include: {
        actions: true,
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * 承認アクション実行
   */
  static async performApprovalAction(
    requestId: string,
    userId: string,
    action: ApprovalActionType,
    comment?: string,
    conditions?: Record<string, unknown>
  ): Promise<ApprovalAction> {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Approval request is not pending: ${request.status}`);
    }

    // アクション記録
    const approvalAction = await prisma.approvalAction.create({
      data: {
        requestId,
        userId,
        action,
        comment,
        conditions: conditions as any,
      },
    });

    // 承認/却下カウント更新
    if (action === 'APPROVE') {
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { approvalCount: { increment: 1 } },
      });

      // 必要承認数に達したかチェック
      const updatedRequest = await prisma.approvalRequest.findUnique({
        where: { id: requestId },
      });

      if (updatedRequest && updatedRequest.approvalCount >= updatedRequest.requiredApprovers) {
        await this.completeApproval(requestId, 'APPROVED');
      }
    } else if (action === 'REJECT') {
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          rejectionCount: { increment: 1 },
          status: 'REJECTED',
        },
      });

      await this.handleRejection(requestId);
    } else if (action === 'ESCALATE') {
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: 'ESCALATED',
          escalatedAt: new Date(),
        },
      });
    }

    return approvalAction;
  }

  /**
   * 承認完了処理
   */
  private static async completeApproval(requestId: string, status: ApprovalStatus): Promise<void> {
    const request = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status },
      include: { execution: true },
    });

    // ワークフロー実行を再開
    if (request.executionId) {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: request.executionId },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (execution && execution.status === 'WAITING_APPROVAL' && execution.currentStepId) {
        await prisma.workflowExecution.update({
          where: { id: request.executionId },
          data: { status: 'RUNNING' },
        });

        // 現在のステップの次へ進む
        const currentStep = execution.workflow.steps.find((s) => s.id === execution.currentStepId);
        if (currentStep) {
          const currentIndex = execution.workflow.steps.findIndex((s) => s.id === currentStep.id);
          const nextStep = execution.workflow.steps[currentIndex + 1];

          if (nextStep) {
            await WorkflowService.executeStep(request.executionId, nextStep.id);
          } else {
            await prisma.workflowExecution.update({
              where: { id: request.executionId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            });
          }
        }
      }
    }
  }

  /**
   * 却下処理
   */
  private static async handleRejection(requestId: string): Promise<void> {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (request?.executionId) {
      await prisma.workflowExecution.update({
        where: { id: request.executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: 'Approval rejected',
        },
      });
    }
  }

  /**
   * 期限切れチェック
   */
  static async checkExpiredApprovals(): Promise<number> {
    const result = await prisma.approvalRequest.updateMany({
      where: {
        status: 'PENDING',
        deadline: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * エスカレーションチェック
   */
  static async checkEscalations(): Promise<number> {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        escalationEnabled: true,
        escalatedAt: null,
        escalationDelay: { not: null },
      },
    });

    let escalatedCount = 0;

    for (const request of requests) {
      const createdTime = request.createdAt.getTime();
      const now = Date.now();
      const delay = request.escalationDelay ?? 0;

      if (now - createdTime > delay) {
        await prisma.approvalRequest.update({
          where: { id: request.id },
          data: {
            status: 'ESCALATED',
            escalatedAt: new Date(),
          },
        });
        escalatedCount++;
      }
    }

    return escalatedCount;
  }
}

// ========================================
// 自動化ルールサービス
// ========================================

export class AutomationService {
  /**
   * 自動化ルール作成
   */
  static async createRule(input: AutomationRuleInput): Promise<AutomationRule> {
    return prisma.automationRule.create({
      data: {
        ...input,
        conditions: input.conditions as any,
        actions: input.actions as any,
        notifyUserIds: input.notifyUserIds ?? [],
      },
    });
  }

  /**
   * 自動化ルール取得
   */
  static async getRule(id: string): Promise<AutomationRule | null> {
    return prisma.automationRule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * 自動化ルール一覧
   */
  static async listRules(options: {
    triggerEvent?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ rules: AutomationRule[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.triggerEvent) where.triggerEvent = options.triggerEvent;
    if (options.isActive !== undefined) where.isActive = options.isActive;

    const [rules, total] = await Promise.all([
      prisma.automationRule.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.automationRule.count({ where }),
    ]);

    return { rules, total };
  }

  /**
   * イベント発火時のルール実行
   */
  static async triggerEvent(
    eventName: string,
    eventData: Record<string, unknown>,
    entityType?: string,
    entityId?: string
  ): Promise<AutomationExecution[]> {
    const rules = await prisma.automationRule.findMany({
      where: {
        triggerEvent: eventName,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    const executions: AutomationExecution[] = [];

    for (const rule of rules) {
      // レート制限チェック
      if (rule.rateLimit && rule.rateLimitPeriod) {
        const recentCount = await prisma.automationExecution.count({
          where: {
            ruleId: rule.id,
            createdAt: {
              gte: new Date(Date.now() - rule.rateLimitPeriod * 1000),
            },
          },
        });

        if (recentCount >= rule.rateLimit) {
          continue;
        }
      }

      // クールダウンチェック
      if (rule.cooldownPeriod && rule.lastExecutedAt) {
        const cooldownEnd = new Date(rule.lastExecutedAt.getTime() + rule.cooldownPeriod * 1000);
        if (new Date() < cooldownEnd) {
          continue;
        }
      }

      const execution = await this.executeRule(rule, eventData, entityType, entityId);
      executions.push(execution);
    }

    return executions;
  }

  /**
   * ルール実行
   */
  private static async executeRule(
    rule: AutomationRule,
    eventData: Record<string, unknown>,
    entityType?: string,
    entityId?: string
  ): Promise<AutomationExecution> {
    const startedAt = new Date();
    const conditions = rule.conditions as unknown as ConditionInput[];
    const conditionResults: ConditionResult[] = [];

    // 条件評価
    let conditionsMet = true;
    for (const condition of conditions) {
      const met = this.evaluateCondition(condition, eventData);
      conditionResults.push({
        condition,
        met,
        actualValue: this.getNestedValue(eventData, condition.field),
      });

      if (rule.conditionLogic === 'AND' && !met) {
        conditionsMet = false;
        break;
      }
      if (rule.conditionLogic === 'OR' && met) {
        conditionsMet = true;
        break;
      }
    }

    if (rule.conditionLogic === 'AND') {
      conditionsMet = conditionResults.every((r) => r.met);
    } else {
      conditionsMet = conditionResults.some((r) => r.met);
    }

    // 条件を満たさない場合はスキップ
    if (!conditionsMet) {
      return prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          triggerEvent: rule.triggerEvent,
          triggerData: eventData as any,
          entityType,
          entityId,
          conditionsMet: false,
          conditionResults: conditionResults as any,
          actionsExecuted: [],
          status: 'SKIPPED',
          startedAt,
          completedAt: new Date(),
          duration: Date.now() - startedAt.getTime(),
        },
      });
    }

    // アクション実行
    const actions = rule.actions as unknown as ActionInput[];
    const actionsExecuted: Array<{ action: ActionInput; result: unknown; success: boolean }> = [];
    let hasFailure = false;

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, eventData);
        actionsExecuted.push({ action, result, success: true });
      } catch (error) {
        hasFailure = true;
        actionsExecuted.push({
          action,
          result: { error: error instanceof Error ? error.message : String(error) },
          success: false,
        });
      }
    }

    const completedAt = new Date();
    const status: AutomationExecutionStatus = hasFailure
      ? actionsExecuted.some((a) => a.success)
        ? 'PARTIAL_SUCCESS'
        : 'FAILED'
      : 'SUCCESS';

    // 実行ログ作成
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId: rule.id,
        triggerEvent: rule.triggerEvent,
        triggerData: eventData as any,
        entityType,
        entityId,
        conditionsMet: true,
        conditionResults: conditionResults as any,
        actionsExecuted: actionsExecuted as any,
        status,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      },
    });

    // ルール統計更新
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        totalExecutions: { increment: 1 },
        successfulExecutions: status === 'SUCCESS' ? { increment: 1 } : undefined,
        failedExecutions: status === 'FAILED' ? { increment: 1 } : undefined,
        lastExecutedAt: new Date(),
      },
    });

    return execution;
  }

  /**
   * 条件評価
   */
  private static evaluateCondition(
    condition: ConditionInput,
    data: Record<string, unknown>
  ): boolean {
    const actualValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
        return actualValue === condition.value;
      case 'ne':
        return actualValue !== condition.value;
      case 'gt':
        return typeof actualValue === 'number' && actualValue > (condition.value as number);
      case 'gte':
        return typeof actualValue === 'number' && actualValue >= (condition.value as number);
      case 'lt':
        return typeof actualValue === 'number' && actualValue < (condition.value as number);
      case 'lte':
        return typeof actualValue === 'number' && actualValue <= (condition.value as number);
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(condition.value as string);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'regex':
        return typeof actualValue === 'string' && new RegExp(condition.value as string).test(actualValue);
      default:
        return false;
    }
  }

  /**
   * ネストした値を取得
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * アクション実行
   */
  private static async executeAction(
    action: ActionInput,
    data: Record<string, unknown>
  ): Promise<unknown> {
    switch (action.type) {
      case 'updateEntity':
        return this.executeUpdateEntity(action.config, data);
      case 'sendNotification':
        return this.executeSendNotification(action.config, data);
      case 'webhook':
        return this.executeWebhook(action.config, data);
      case 'createApproval':
        return this.executeCreateApproval(action.config, data);
      case 'triggerWorkflow':
        return this.executeTriggerWorkflow(action.config, data);
      case 'queueJob':
        return this.executeQueueJob(action.config, data);
      default:
        return { executed: true, type: action.type };
    }
  }

  private static async executeUpdateEntity(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // 実装: エンティティ更新
    return { updated: true };
  }

  private static async executeSendNotification(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // 実装: 通知送信
    return { sent: true };
  }

  private static async executeWebhook(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const url = config.url as string;
    const method = (config.method as string) ?? 'POST';

    const bodyData = typeof config.body === 'object' && config.body !== null
      ? { ...data, ...(config.body as Record<string, unknown>) }
      : data;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    return { status: response.status, ok: response.ok };
  }

  private static async executeCreateApproval(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const approval = await ApprovalService.createApprovalRequest({
      title: (config.title as string) ?? 'Automated Approval Request',
      description: config.description as string,
      requestType: (config.requestType as ApprovalRequestType) ?? 'CUSTOM',
      entityType: (data.entityType as string) ?? 'unknown',
      entityId: (data.entityId as string) ?? 'unknown',
      proposedValue: data,
      requiredApprovers: config.requiredApprovers as number,
      approverRoleIds: config.approverRoleIds as string[],
      approverUserIds: config.approverUserIds as string[],
    });

    return { approvalId: approval.id };
  }

  private static async executeTriggerWorkflow(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const execution = await WorkflowService.triggerWorkflow({
      workflowId: config.workflowId as string,
      triggeredBy: 'AUTOMATION',
      triggerData: data,
      entityType: data.entityType as string,
      entityId: data.entityId as string,
    });

    return { executionId: execution.id };
  }

  private static async executeQueueJob(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // 実装: BullMQジョブキュー
    return { queued: true, queueName: config.queueName };
  }
}

export default {
  WorkflowService,
  ApprovalService,
  AutomationService,
};

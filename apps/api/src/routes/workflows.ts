
/**
 * Phase 35: ワークフロー自動化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  WorkflowTriggerType,
  WorkflowTriggerSource,
  WorkflowStepType,
  ApprovalRequestType,
  ApprovalActionType,
  ConditionLogic,
} from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ========================================
// ワークフロー CRUD
// ========================================

/**
 * ワークフロー一覧取得
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const {
      triggerType,
      isActive,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (triggerType) where.triggerType = triggerType as WorkflowTriggerType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          steps: {
            orderBy: { order: 'asc' },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.workflow.count({ where }),
    ]);

    res.json({ workflows, total });
  } catch (error) {
    console.error('Failed to list workflows:', error);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

/**
 * ワークフロー取得
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        WorkflowExecution: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Failed to get workflow:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

/**
 * ワークフロー作成
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      priority,
      timeout,
      maxRetries,
      createdById,
      steps,
    } = req.body;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        triggerType: triggerType as WorkflowTriggerType,
        triggerConfig: triggerConfig ?? {},
        priority: priority ?? 0,
        timeout: timeout ?? 3600000,
        maxRetries: maxRetries ?? 3,
        createdById,
        steps: {
          create: (steps ?? []).map((step: {
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
          }) => ({
            name: step.name,
            description: step.description,
            order: step.order,
            stepType: step.stepType,
            config: step.config ?? {},
            condition: step.condition,
            onSuccess: step.onSuccess,
            onFailure: step.onFailure,
            retryOnError: step.retryOnError ?? true,
            maxRetries: step.maxRetries ?? 3,
            retryDelay: step.retryDelay ?? 60000,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Failed to create workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * ワークフロー更新
 */
router.patch('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      priority,
      timeout,
      maxRetries,
      isActive,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (triggerType !== undefined) data.triggerType = triggerType;
    if (triggerConfig !== undefined) data.triggerConfig = triggerConfig;
    if (priority !== undefined) data.priority = priority;
    if (timeout !== undefined) data.timeout = timeout;
    if (maxRetries !== undefined) data.maxRetries = maxRetries;
    if (isActive !== undefined) data.isActive = isActive;

    const workflow = await prisma.workflow.update({
      where: { id },
      data,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(workflow);
  } catch (error) {
    console.error('Failed to update workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * ワークフロー削除
 */
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.workflow.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ========================================
// ワークフロー実行
// ========================================

/**
 * ワークフロー実行開始
 */
router.post('/workflows/:id/trigger', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      triggeredBy = 'USER',
      triggeredById,
      triggerData,
      entityType,
      entityId,
    } = req.body;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (!workflow.isActive) {
      return res.status(400).json({ error: 'Workflow is not active' });
    }

    const firstStep = workflow.steps[0];

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        triggeredBy: triggeredBy as WorkflowTriggerSource,
        triggeredById,
        triggerData: triggerData ?? {},
        entityType,
        entityId,
        status: 'PENDING',
        currentStepId: firstStep?.id,
        context: {},
      },
      include: {
        workflow: true,
      },
    });

    // 統計更新
    await prisma.workflow.update({
      where: { id },
      data: {
        totalExecutions: { increment: 1 },
      },
    });

    res.status(201).json(execution);
  } catch (error) {
    console.error('Failed to trigger workflow:', error);
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

/**
 * ワークフロー実行一覧
 */
router.get('/workflows/:id/executions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = { workflowId: id };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        include: {
          stepExecutions: {
            include: {
              step: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    res.json({ executions, total });
  } catch (error) {
    console.error('Failed to list executions:', error);
    res.status(500).json({ error: 'Failed to list executions' });
  }
});

/**
 * ワークフロー実行詳細
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        stepExecutions: {
          include: {
            step: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        approvalRequests: {
          include: {
            actions: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json(execution);
  } catch (error) {
    console.error('Failed to get execution:', error);
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

/**
 * ワークフロー実行キャンセル
 */
router.post('/executions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (!['PENDING', 'RUNNING', 'WAITING_APPROVAL', 'PAUSED'].includes(execution.status)) {
      return res.status(400).json({ error: 'Cannot cancel execution in current status' });
    }

    const updated = await prisma.workflowExecution.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to cancel execution:', error);
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

// ========================================
// 承認リクエスト
// ========================================

/**
 * 承認リクエスト一覧
 */
router.get('/approvals', async (req: Request, res: Response) => {
  try {
    const {
      status,
      requestType,
      entityType,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (requestType) where.requestType = requestType;
    if (entityType) where.entityType = entityType;

    const [approvals, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
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
              workflow: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    res.json({ approvals, total });
  } catch (error) {
    console.error('Failed to list approvals:', error);
    res.status(500).json({ error: 'Failed to list approvals' });
  }
});

/**
 * 承認リクエスト取得
 */
router.get('/approvals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const approval = await prisma.approvalRequest.findUnique({
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

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    res.json(approval);
  } catch (error) {
    console.error('Failed to get approval:', error);
    res.status(500).json({ error: 'Failed to get approval' });
  }
});

/**
 * 承認リクエスト作成
 */
router.post('/approvals', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      requestType,
      entityType,
      entityId,
      currentValue,
      proposedValue,
      changeReason,
      requiredApprovers,
      approverRoleIds,
      approverUserIds,
      deadline,
      escalationEnabled,
      escalationDelay,
      executionId,
    } = req.body;

    const approval = await prisma.approvalRequest.create({
      data: {
        title,
        description,
        requestType: requestType as ApprovalRequestType,
        entityType,
        entityId,
        currentValue,
        proposedValue,
        changeReason,
        requiredApprovers: requiredApprovers ?? 1,
        approverRoleIds: approverRoleIds ?? [],
        approverUserIds: approverUserIds ?? [],
        deadline: deadline ? new Date(deadline) : undefined,
        escalationEnabled: escalationEnabled ?? false,
        escalationDelay,
        executionId,
        status: 'PENDING',
      },
    });

    res.status(201).json(approval);
  } catch (error) {
    console.error('Failed to create approval:', error);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

/**
 * 承認アクション実行
 */
router.post('/approvals/:id/action', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, action, comment, conditions } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action are required' });
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ error: 'Approval request is not pending' });
    }

    // アクション記録
    const approvalAction = await prisma.approvalAction.create({
      data: {
        requestId: id,
        userId,
        action: action as ApprovalActionType,
        comment,
        conditions,
      },
    });

    // ステータス更新
    if (action === 'APPROVE') {
      await prisma.approvalRequest.update({
        where: { id },
        data: { approvalCount: { increment: 1 } },
      });

      const updatedApproval = await prisma.approvalRequest.findUnique({
        where: { id },
      });

      if (updatedApproval && updatedApproval.approvalCount >= updatedApproval.requiredApprovers) {
        await prisma.approvalRequest.update({
          where: { id },
          data: { status: 'APPROVED' },
        });

        // ワークフロー実行を再開
        if (updatedApproval.executionId) {
          await prisma.workflowExecution.update({
            where: { id: updatedApproval.executionId },
            data: { status: 'RUNNING' },
          });
        }
      }
    } else if (action === 'REJECT') {
      await prisma.approvalRequest.update({
        where: { id },
        data: {
          rejectionCount: { increment: 1 },
          status: 'REJECTED',
        },
      });

      if (approval.executionId) {
        await prisma.workflowExecution.update({
          where: { id: approval.executionId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: 'Approval rejected',
          },
        });
      }
    } else if (action === 'ESCALATE') {
      await prisma.approvalRequest.update({
        where: { id },
        data: {
          status: 'ESCALATED',
          escalatedAt: new Date(),
        },
      });
    }

    res.status(201).json(approvalAction);
  } catch (error) {
    console.error('Failed to perform approval action:', error);
    res.status(500).json({ error: 'Failed to perform approval action' });
  }
});

// ========================================
// 自動化ルール
// ========================================

/**
 * 自動化ルール一覧
 */
router.get('/automation/rules', async (req: Request, res: Response) => {
  try {
    const {
      triggerEvent,
      isActive,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (triggerEvent) where.triggerEvent = triggerEvent;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [rules, total] = await Promise.all([
      prisma.automationRule.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.automationRule.count({ where }),
    ]);

    res.json({ rules, total });
  } catch (error) {
    console.error('Failed to list automation rules:', error);
    res.status(500).json({ error: 'Failed to list automation rules' });
  }
});

/**
 * 自動化ルール取得
 */
router.get('/automation/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(rule);
  } catch (error) {
    console.error('Failed to get automation rule:', error);
    res.status(500).json({ error: 'Failed to get automation rule' });
  }
});

/**
 * 自動化ルール作成
 */
router.post('/automation/rules', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      triggerEvent,
      priority,
      conditions,
      conditionLogic,
      actions,
      rateLimit,
      rateLimitPeriod,
      cooldownPeriod,
      notifyOnSuccess,
      notifyOnFailure,
      notifyUserIds,
      createdById,
    } = req.body;

    const rule = await prisma.automationRule.create({
      data: {
        name,
        description,
        triggerEvent,
        priority: priority ?? 0,
        conditions: conditions ?? [],
        conditionLogic: (conditionLogic as ConditionLogic) ?? 'AND',
        actions: actions ?? [],
        rateLimit,
        rateLimitPeriod,
        cooldownPeriod,
        notifyOnSuccess: notifyOnSuccess ?? false,
        notifyOnFailure: notifyOnFailure ?? true,
        notifyUserIds: notifyUserIds ?? [],
        createdById,
        isActive: true,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Failed to create automation rule:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

/**
 * 自動化ルール更新
 */
router.patch('/automation/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      triggerEvent,
      priority,
      conditions,
      conditionLogic,
      actions,
      rateLimit,
      rateLimitPeriod,
      cooldownPeriod,
      notifyOnSuccess,
      notifyOnFailure,
      notifyUserIds,
      isActive,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (triggerEvent !== undefined) data.triggerEvent = triggerEvent;
    if (priority !== undefined) data.priority = priority;
    if (conditions !== undefined) data.conditions = conditions;
    if (conditionLogic !== undefined) data.conditionLogic = conditionLogic;
    if (actions !== undefined) data.actions = actions;
    if (rateLimit !== undefined) data.rateLimit = rateLimit;
    if (rateLimitPeriod !== undefined) data.rateLimitPeriod = rateLimitPeriod;
    if (cooldownPeriod !== undefined) data.cooldownPeriod = cooldownPeriod;
    if (notifyOnSuccess !== undefined) data.notifyOnSuccess = notifyOnSuccess;
    if (notifyOnFailure !== undefined) data.notifyOnFailure = notifyOnFailure;
    if (notifyUserIds !== undefined) data.notifyUserIds = notifyUserIds;
    if (isActive !== undefined) data.isActive = isActive;

    const rule = await prisma.automationRule.update({
      where: { id },
      data,
    });

    res.json(rule);
  } catch (error) {
    console.error('Failed to update automation rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

/**
 * 自動化ルール削除
 */
router.delete('/automation/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.automationRule.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete automation rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

/**
 * 自動化ルール実行ログ
 */
router.get('/automation/rules/:id/executions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = { ruleId: id };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.automationExecution.count({ where }),
    ]);

    res.json({ executions, total });
  } catch (error) {
    console.error('Failed to list automation executions:', error);
    res.status(500).json({ error: 'Failed to list automation executions' });
  }
});

/**
 * イベント発火（自動化ルール実行）
 */
router.post('/automation/trigger', async (req: Request, res: Response) => {
  try {
    const { eventName, eventData, entityType, entityId } = req.body;

    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    const rules = await prisma.automationRule.findMany({
      where: {
        triggerEvent: eventName,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    const executions = [];

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

      // 条件評価（簡易版）
      const conditions = rule.conditions as Array<{
        field: string;
        operator: string;
        value: unknown;
      }>;

      let conditionsMet = true;
      for (const condition of conditions) {
        const actualValue = (eventData as Record<string, unknown>)?.[condition.field];
        if (condition.operator === 'eq' && actualValue !== condition.value) {
          conditionsMet = false;
          break;
        }
      }

      const execution = await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          triggerEvent: eventName,
          triggerData: eventData ?? {},
          entityType,
          entityId,
          conditionsMet,
          conditionResults: conditions.map((c) => ({
            condition: c,
            met: true,
            actualValue: (eventData as Record<string, unknown>)?.[c.field],
          })) as any,
          actionsExecuted: (conditionsMet ? rule.actions : []) as any,
          status: conditionsMet ? 'SUCCESS' : 'SKIPPED',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // ルール統計更新
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          totalExecutions: { increment: 1 },
          successfulExecutions: conditionsMet ? { increment: 1 } : undefined,
          lastExecutedAt: new Date(),
        },
      });

      executions.push(execution);
    }

    res.json({ triggered: executions.length, executions });
  } catch (error) {
    console.error('Failed to trigger automation:', error);
    res.status(500).json({ error: 'Failed to trigger automation' });
  }
});

export default router;

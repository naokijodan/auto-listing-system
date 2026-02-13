import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const automationRulesRouter = Router();

// GET /api/automation-rules/stats - 自動化統計
automationRulesRouter.get('/stats', async (_req, res) => {
  try {
    const [
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      todayExecutions,
    ] = await Promise.all([
      prisma.automationRule.count(),
      prisma.automationRule.count({ where: { isActive: true } }),
      prisma.automationExecution.count(),
      prisma.automationExecution.count({ where: { status: 'COMPLETED' } }),
      prisma.automationExecution.count({ where: { status: 'FAILED' } }),
      prisma.automationExecution.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 0;

    const recentExecutions = await prisma.automationExecution.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { rule: { select: { name: true } } },
    });

    res.json({
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      todayExecutions,
      recentExecutions,
    });
  } catch (error) {
    logger.error('Failed to get automation stats', error);
    res.status(500).json({ error: 'Failed to get automation stats' });
  }
});

// GET /api/automation-rules/rules - ルール一覧
automationRulesRouter.get('/rules', async (req, res) => {
  try {
    const { active, trigger } = req.query;

    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';
    if (trigger) where.trigger = trigger;

    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { executions: true } },
      },
    });

    res.json(rules);
  } catch (error) {
    logger.error('Failed to get automation rules', error);
    res.status(500).json({ error: 'Failed to get automation rules' });
  }
});

// POST /api/automation-rules/rules - ルール作成
automationRulesRouter.post('/rules', async (req, res) => {
  try {
    const {
      name,
      description,
      trigger,
      triggerConfig = {},
      conditions = [],
      conditionLogic = 'AND',
      action,
      actionConfig = {},
      scheduleType = 'MANUAL',
      cronExpression,
      requiresConfirmation = true,
      maxExecutionsPerDay = 100,
      cooldownMinutes = 60,
      priority = 0,
    } = req.body;

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: 'default',
        name,
        description,
        trigger,
        triggerConfig,
        conditions,
        conditionLogic,
        action,
        actionConfig,
        scheduleType,
        cronExpression,
        requiresConfirmation,
        maxExecutionsPerDay,
        cooldownMinutes,
        priority,
        isActive: false, // 初期状態は無効
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    logger.error('Failed to create automation rule', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// PUT /api/automation-rules/rules/:id - ルール更新
automationRulesRouter.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await prisma.automationRule.update({
      where: { id },
      data: updateData,
    });

    res.json(rule);
  } catch (error) {
    logger.error('Failed to update automation rule', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// DELETE /api/automation-rules/rules/:id - ルール削除
automationRulesRouter.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.automationRule.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete automation rule', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

// PATCH /api/automation-rules/rules/:id/toggle - 有効/無効切り替え
automationRulesRouter.patch('/rules/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // 安全設定チェック
    if (!rule.isActive) {
      const safetySettings = await prisma.safetySettings.findUnique({
        where: { organizationId: 'default' },
      });

      if (safetySettings?.emergencyStopEnabled) {
        return res.status(400).json({
          error: 'Emergency stop is enabled. Cannot activate rules.',
        });
      }
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to toggle automation rule', error);
    res.status(500).json({ error: 'Failed to toggle automation rule' });
  }
});

// POST /api/automation-rules/rules/:id/test - テスト実行（ドライラン）
automationRulesRouter.post('/rules/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // ドライラン実行を作成
    const execution = await prisma.automationExecution.create({
      data: {
        organizationId: 'default',
        ruleId: id,
        status: 'RUNNING',
        triggeredBy: 'USER',
        triggerReason: 'Manual test (dry run)',
        isDryRun: true,
        startedAt: new Date(),
      },
    });

    // シミュレーション: 対象出品を検索
    const mockTargets = await prisma.listingPerformance.findMany({
      where: { isLowPerformer: true },
      take: 10,
    });

    // ドライラン結果
    const results = mockTargets.map((listing) => ({
      listingId: listing.id,
      title: listing.title,
      wouldApply: true,
      action: rule.action,
      reason: `Would ${rule.action} based on trigger ${rule.trigger}`,
    }));

    // 実行完了
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'DRY_RUN_COMPLETED',
        completedAt: new Date(),
        targetCount: mockTargets.length,
        processedCount: mockTargets.length,
        successCount: mockTargets.length,
        targetListings: mockTargets.map((l) => l.id),
        results,
        durationMs: Math.floor(Math.random() * 1000) + 500,
      },
    });

    res.json({
      success: true,
      execution: await prisma.automationExecution.findUnique({
        where: { id: execution.id },
      }),
      affectedListings: mockTargets.length,
      results,
    });
  } catch (error) {
    logger.error('Failed to test automation rule', error);
    res.status(500).json({ error: 'Failed to test automation rule' });
  }
});

// POST /api/automation-rules/rules/:id/execute - 実行
automationRulesRouter.post('/rules/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // 安全設定チェック
    const safetySettings = await prisma.safetySettings.findUnique({
      where: { organizationId: 'default' },
    });

    if (safetySettings?.emergencyStopEnabled && !force) {
      return res.status(400).json({
        error: 'Emergency stop is enabled',
      });
    }

    // 実行を作成
    const execution = await prisma.automationExecution.create({
      data: {
        organizationId: 'default',
        ruleId: id,
        status: 'RUNNING',
        triggeredBy: 'USER',
        triggerReason: 'Manual execution',
        isDryRun: false,
        startedAt: new Date(),
      },
    });

    // シミュレーション: 非同期で実行
    setTimeout(async () => {
      const targetCount = Math.floor(Math.random() * 20) + 5;
      const successCount = Math.floor(targetCount * 0.9);

      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          targetCount,
          processedCount: targetCount,
          successCount,
          failedCount: targetCount - successCount,
          durationMs: Math.floor(Math.random() * 5000) + 1000,
        },
      });

      // ルールの実行カウント更新
      await prisma.automationRule.update({
        where: { id },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
          successCount: { increment: successCount },
          failureCount: { increment: targetCount - successCount },
        },
      });

      logger.info(`Automation rule ${id} executed: ${successCount}/${targetCount} success`);
    }, 2000);

    res.status(201).json(execution);
  } catch (error) {
    logger.error('Failed to execute automation rule', error);
    res.status(500).json({ error: 'Failed to execute automation rule' });
  }
});

// GET /api/automation-rules/executions - 実行履歴
automationRulesRouter.get('/executions', async (req, res) => {
  try {
    const { ruleId, status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (ruleId) where.ruleId = ruleId;
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          rule: { select: { name: true, action: true, trigger: true } },
        },
      }),
      prisma.automationExecution.count({ where }),
    ]);

    res.json({ executions, total });
  } catch (error) {
    logger.error('Failed to get executions', error);
    res.status(500).json({ error: 'Failed to get executions' });
  }
});

// GET /api/automation-rules/safety-settings - 安全設定取得
automationRulesRouter.get('/safety-settings', async (_req, res) => {
  try {
    let settings = await prisma.safetySettings.findUnique({
      where: { organizationId: 'default' },
    });

    if (!settings) {
      settings = await prisma.safetySettings.create({
        data: { organizationId: 'default' },
      });
    }

    res.json(settings);
  } catch (error) {
    logger.error('Failed to get safety settings', error);
    res.status(500).json({ error: 'Failed to get safety settings' });
  }
});

// PUT /api/automation-rules/safety-settings - 安全設定更新
automationRulesRouter.put('/safety-settings', async (req, res) => {
  try {
    const updateData = req.body;

    const settings = await prisma.safetySettings.upsert({
      where: { organizationId: 'default' },
      update: updateData,
      create: {
        organizationId: 'default',
        ...updateData,
      },
    });

    res.json(settings);
  } catch (error) {
    logger.error('Failed to update safety settings', error);
    res.status(500).json({ error: 'Failed to update safety settings' });
  }
});

// POST /api/automation-rules/emergency-stop - 緊急停止
automationRulesRouter.post('/emergency-stop', async (req, res) => {
  try {
    const { enable } = req.body;

    const settings = await prisma.safetySettings.upsert({
      where: { organizationId: 'default' },
      update: {
        emergencyStopEnabled: enable,
        emergencyStopAt: enable ? new Date() : null,
      },
      create: {
        organizationId: 'default',
        emergencyStopEnabled: enable,
        emergencyStopAt: enable ? new Date() : null,
      },
    });

    if (enable) {
      // 全てのアクティブルールを無効化
      await prisma.automationRule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    res.json({
      success: true,
      emergencyStopEnabled: enable,
      settings,
    });
  } catch (error) {
    logger.error('Failed to toggle emergency stop', error);
    res.status(500).json({ error: 'Failed to toggle emergency stop' });
  }
});

export default automationRulesRouter;

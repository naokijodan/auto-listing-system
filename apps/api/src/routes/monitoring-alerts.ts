import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const monitoringAlertsRouter = Router();

// GET /api/monitoring-alerts/stats - アラート統計
monitoringAlertsRouter.get('/stats', async (_req, res) => {
  try {
    const [
      totalRules,
      activeRules,
      totalIncidents,
      openIncidents,
      acknowledgedIncidents,
      resolvedIncidents,
      criticalIncidents,
      totalChannels,
      activeChannels,
    ] = await Promise.all([
      prisma.alertRule.count(),
      prisma.alertRule.count({ where: { isActive: true } }),
      prisma.alertIncident.count(),
      prisma.alertIncident.count({ where: { status: 'OPEN' } }),
      prisma.alertIncident.count({ where: { status: 'ACKNOWLEDGED' } }),
      prisma.alertIncident.count({ where: { status: 'RESOLVED' } }),
      prisma.alertIncident.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      prisma.alertNotificationChannel.count(),
      prisma.alertNotificationChannel.count({ where: { isActive: true } }),
    ]);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incidentsLast24h = await prisma.alertIncident.count({
      where: { triggeredAt: { gte: last24Hours } },
    });

    res.json({
      totalRules,
      activeRules,
      totalIncidents,
      openIncidents,
      acknowledgedIncidents,
      resolvedIncidents,
      criticalIncidents,
      incidentsLast24h,
      totalChannels,
      activeChannels,
    });
  } catch (error) {
    logger.error('Failed to get alert stats', error);
    res.status(500).json({ error: 'Failed to get alert stats' });
  }
});

// GET /api/monitoring-alerts/rules - ルール一覧
monitoringAlertsRouter.get('/rules', async (req, res) => {
  try {
    const { active, severity } = req.query;

    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';
    if (severity) where.severity = severity;

    const rules = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { incidents: true, escalations: true } },
      },
    });

    res.json(rules);
  } catch (error) {
    logger.error('Failed to get alert rules', error);
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

// POST /api/monitoring-alerts/rules - ルール作成
monitoringAlertsRouter.post('/rules', async (req, res) => {
  try {
    const {
      name,
      description,
      metricName,
      condition = 'GREATER_THAN',
      threshold,
      thresholdUnit,
      windowMinutes = 5,
      evaluationPeriods = 1,
      severity = 'WARNING',
      cooldownMinutes = 30,
      notificationChannels = [],
      tags = [],
    } = req.body;

    const rule = await prisma.alertRule.create({
      data: {
        organizationId: 'default',
        name,
        description,
        metricName,
        condition,
        threshold,
        thresholdUnit,
        windowMinutes,
        evaluationPeriods,
        severity,
        cooldownMinutes,
        notificationChannels,
        tags,
        isActive: true,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    logger.error('Failed to create alert rule', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// PUT /api/monitoring-alerts/rules/:id - ルール更新
monitoringAlertsRouter.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await prisma.alertRule.update({
      where: { id },
      data: updateData,
    });

    res.json(rule);
  } catch (error) {
    logger.error('Failed to update alert rule', error);
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

// DELETE /api/monitoring-alerts/rules/:id - ルール削除
monitoringAlertsRouter.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.alertRule.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete alert rule', error);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

// PATCH /api/monitoring-alerts/rules/:id/toggle - ルール有効/無効切り替え
monitoringAlertsRouter.patch('/rules/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.alertRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to toggle alert rule', error);
    res.status(500).json({ error: 'Failed to toggle alert rule' });
  }
});

// GET /api/monitoring-alerts/incidents - インシデント一覧
monitoringAlertsRouter.get('/incidents', async (req, res) => {
  try {
    const { status, severity, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      prisma.alertIncident.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          rule: { select: { name: true, metricName: true } },
          _count: { select: { notifications: true } },
        },
      }),
      prisma.alertIncident.count({ where }),
    ]);

    res.json({ incidents, total });
  } catch (error) {
    logger.error('Failed to get alert incidents', error);
    res.status(500).json({ error: 'Failed to get alert incidents' });
  }
});

// PATCH /api/monitoring-alerts/incidents/:id/acknowledge - インシデント確認
monitoringAlertsRouter.patch('/incidents/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const incident = await prisma.alertIncident.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || 'system',
      },
    });

    res.json(incident);
  } catch (error) {
    logger.error('Failed to acknowledge incident', error);
    res.status(500).json({ error: 'Failed to acknowledge incident' });
  }
});

// PATCH /api/monitoring-alerts/incidents/:id/resolve - インシデント解決
monitoringAlertsRouter.patch('/incidents/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, rootCause, resolution } = req.body;

    const incident = await prisma.alertIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'system',
        rootCause,
        resolution,
      },
    });

    res.json(incident);
  } catch (error) {
    logger.error('Failed to resolve incident', error);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
});

// GET /api/monitoring-alerts/escalations - エスカレーション設定
monitoringAlertsRouter.get('/escalations', async (req, res) => {
  try {
    const { ruleId } = req.query;

    const where: any = {};
    if (ruleId) where.ruleId = ruleId;

    const escalations = await prisma.alertEscalation.findMany({
      where,
      orderBy: [{ ruleId: 'asc' }, { level: 'asc' }],
      include: {
        rule: { select: { name: true } },
      },
    });

    res.json(escalations);
  } catch (error) {
    logger.error('Failed to get escalations', error);
    res.status(500).json({ error: 'Failed to get escalations' });
  }
});

// POST /api/monitoring-alerts/escalations - エスカレーション作成
monitoringAlertsRouter.post('/escalations', async (req, res) => {
  try {
    const {
      ruleId,
      level = 1,
      delayMinutes = 15,
      notificationChannels = [],
      assignees = [],
    } = req.body;

    const escalation = await prisma.alertEscalation.create({
      data: {
        organizationId: 'default',
        ruleId,
        level,
        delayMinutes,
        notificationChannels,
        assignees,
        isActive: true,
      },
    });

    res.status(201).json(escalation);
  } catch (error) {
    logger.error('Failed to create escalation', error);
    res.status(500).json({ error: 'Failed to create escalation' });
  }
});

// GET /api/monitoring-alerts/channels - 通知チャンネル一覧
monitoringAlertsRouter.get('/channels', async (req, res) => {
  try {
    const { active } = req.query;

    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';

    const channels = await prisma.alertNotificationChannel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(channels);
  } catch (error) {
    logger.error('Failed to get notification channels', error);
    res.status(500).json({ error: 'Failed to get notification channels' });
  }
});

// POST /api/monitoring-alerts/channels - 通知チャンネル作成
monitoringAlertsRouter.post('/channels', async (req, res) => {
  try {
    const {
      name,
      description,
      channelType,
      configuration = {},
      isDefault = false,
    } = req.body;

    const channel = await prisma.alertNotificationChannel.create({
      data: {
        organizationId: 'default',
        name,
        description,
        channelType,
        configuration,
        isDefault,
        isActive: true,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    logger.error('Failed to create notification channel', error);
    res.status(500).json({ error: 'Failed to create notification channel' });
  }
});

// POST /api/monitoring-alerts/channels/:id/test - チャンネルテスト
monitoringAlertsRouter.post('/channels/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.alertNotificationChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // シミュレーション: テスト送信
    const success = Math.random() > 0.2;

    await prisma.alertNotificationChannel.update({
      where: { id },
      data: {
        testStatus: success ? 'SUCCESS' : 'FAILED',
        lastTestedAt: new Date(),
        lastErrorMessage: success ? null : 'Connection timeout',
      },
    });

    res.json({
      success,
      message: success ? 'Test notification sent successfully' : 'Test notification failed',
    });
  } catch (error) {
    logger.error('Failed to test notification channel', error);
    res.status(500).json({ error: 'Failed to test notification channel' });
  }
});

// POST /api/monitoring-alerts/test - テストアラート送信
monitoringAlertsRouter.post('/test', async (req, res) => {
  try {
    const { ruleId, severity = 'INFO' } = req.body;

    let rule;
    if (ruleId) {
      rule = await prisma.alertRule.findUnique({ where: { id: ruleId } });
    }

    const incident = await prisma.alertIncident.create({
      data: {
        organizationId: 'default',
        ruleId: rule?.id || 'test-rule',
        title: 'Test Alert',
        description: 'This is a test alert to verify the alerting system.',
        severity,
        status: 'OPEN',
        triggeredAt: new Date(),
        metricValue: 100,
        threshold: 80,
        affectedResources: ['test-resource'],
        impactScope: 'Low',
      },
    });

    res.status(201).json({
      success: true,
      incident,
      message: 'Test alert created successfully',
    });
  } catch (error) {
    logger.error('Failed to create test alert', error);
    res.status(500).json({ error: 'Failed to create test alert' });
  }
});

// POST /api/monitoring-alerts/trigger - アラートトリガー（内部用）
monitoringAlertsRouter.post('/trigger', async (req, res) => {
  try {
    const { metricName, value, metadata = {} } = req.body;

    // マッチするルールを検索
    const rules = await prisma.alertRule.findMany({
      where: {
        metricName,
        isActive: true,
      },
    });

    const triggeredIncidents = [];

    for (const rule of rules) {
      let shouldTrigger = false;

      switch (rule.condition) {
        case 'GREATER_THAN':
          shouldTrigger = value > rule.threshold;
          break;
        case 'LESS_THAN':
          shouldTrigger = value < rule.threshold;
          break;
        case 'EQUALS':
          shouldTrigger = value === rule.threshold;
          break;
        case 'NOT_EQUALS':
          shouldTrigger = value !== rule.threshold;
          break;
        default:
          shouldTrigger = value > rule.threshold;
      }

      if (shouldTrigger) {
        // クールダウンチェック
        if (rule.lastTriggeredAt) {
          const cooldownEnd = new Date(
            rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000
          );
          if (new Date() < cooldownEnd) {
            continue;
          }
        }

        const incident = await prisma.alertIncident.create({
          data: {
            organizationId: 'default',
            ruleId: rule.id,
            title: `${rule.name} triggered`,
            description: `Metric ${metricName} value ${value} exceeded threshold ${rule.threshold}`,
            severity: rule.severity,
            status: 'OPEN',
            triggeredAt: new Date(),
            metricValue: value,
            threshold: rule.threshold,
            metadata,
          },
        });

        await prisma.alertRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date() },
        });

        triggeredIncidents.push(incident);
      }
    }

    res.json({
      triggered: triggeredIncidents.length,
      incidents: triggeredIncidents,
    });
  } catch (error) {
    logger.error('Failed to trigger alert', error);
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

export default monitoringAlertsRouter;

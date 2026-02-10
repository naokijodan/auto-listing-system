import { Router } from 'express';
import {
  prisma,
  MetricCategory,
  MetricType,
  MetricAlertCondition,
  MetricAlertComparison,
  MetricAlertSeverity,
  MetricAlertStatus,
  HealthStatus,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'metrics' });

/**
 * メトリクス定義一覧取得
 */
router.get('/definitions', async (req, res, next) => {
  try {
    const { category, isActive } = req.query;

    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const metrics = await prisma.metricDefinition.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メトリクス定義作成
 */
router.post('/definitions', async (req, res, next) => {
  try {
    const {
      name,
      displayName,
      description,
      unit,
      category,
      metricType = 'GAUGE',
      collectInterval = 60,
      retentionDays = 30,
      tags = [],
    } = req.body;

    if (!name || !displayName || !category) {
      throw new AppError(400, 'name, displayName, and category are required', 'INVALID_INPUT');
    }

    const validCategories = Object.values(MetricCategory);
    if (!validCategories.includes(category)) {
      throw new AppError(400, `Invalid category: ${category}`, 'INVALID_INPUT');
    }

    const metric = await prisma.metricDefinition.create({
      data: {
        name,
        displayName,
        description,
        unit,
        category,
        metricType,
        collectInterval,
        retentionDays,
        tags,
      },
    });

    log.info({ metricId: metric.id, name }, 'Metric definition created');

    res.status(201).json({
      success: true,
      data: metric,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メトリクスデータ取得
 */
router.get('/data/:metricName', async (req, res, next) => {
  try {
    const { startTime, endTime, limit = '1000' } = req.query;

    const metric = await prisma.metricDefinition.findUnique({
      where: { name: req.params.metricName },
    });

    if (!metric) {
      throw new AppError(404, 'Metric not found', 'NOT_FOUND');
    }

    const where: any = { metricId: metric.id };
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = new Date(startTime as string);
      if (endTime) where.timestamp.lte = new Date(endTime as string);
    }

    const snapshots = await prisma.metricSnapshot.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: {
        metric,
        snapshots,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メトリクスデータ記録
 */
router.post('/data', async (req, res, next) => {
  try {
    const { metricName, value, labels, timestamp } = req.body;

    if (!metricName || value === undefined) {
      throw new AppError(400, 'metricName and value are required', 'INVALID_INPUT');
    }

    const metric = await prisma.metricDefinition.findUnique({
      where: { name: metricName },
    });

    if (!metric) {
      throw new AppError(404, 'Metric not found', 'NOT_FOUND');
    }

    const snapshot = await prisma.metricSnapshot.create({
      data: {
        metricId: metric.id,
        value,
        labels: labels || {},
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラートルール一覧取得
 */
router.get('/alert-rules', async (req, res, next) => {
  try {
    const { severity, isActive } = req.query;

    const where: any = {};
    if (severity) where.severity = severity;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.metricAlertRule.findMany({
      where,
      include: {
        metric: { select: { name: true, displayName: true, unit: true } },
        _count: { select: { alerts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラートルール作成
 */
router.post('/alert-rules', async (req, res, next) => {
  try {
    const {
      name,
      description,
      metricId,
      condition,
      threshold,
      duration = 60,
      comparison,
      severity,
      channelIds = [],
      notifyInterval = 300,
      maxNotifications = 5,
      playbookUrl,
      runbook,
    } = req.body;

    if (!name || !metricId || !condition || threshold === undefined || !comparison || !severity) {
      throw new AppError(
        400,
        'name, metricId, condition, threshold, comparison, and severity are required',
        'INVALID_INPUT'
      );
    }

    const rule = await prisma.metricAlertRule.create({
      data: {
        name,
        description,
        metricId,
        condition,
        threshold,
        duration,
        comparison,
        severity,
        channelIds,
        notifyInterval,
        maxNotifications,
        playbookUrl,
        runbook: runbook || undefined,
      },
    });

    log.info({ ruleId: rule.id, name }, 'Alert rule created');

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラートルール更新
 */
router.patch('/alert-rules/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      condition,
      threshold,
      duration,
      comparison,
      severity,
      channelIds,
      notifyInterval,
      maxNotifications,
      playbookUrl,
      runbook,
      isActive,
    } = req.body;

    const rule = await prisma.metricAlertRule.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(condition !== undefined && { condition }),
        ...(threshold !== undefined && { threshold }),
        ...(duration !== undefined && { duration }),
        ...(comparison !== undefined && { comparison }),
        ...(severity !== undefined && { severity }),
        ...(channelIds !== undefined && { channelIds }),
        ...(notifyInterval !== undefined && { notifyInterval }),
        ...(maxNotifications !== undefined && { maxNotifications }),
        ...(playbookUrl !== undefined && { playbookUrl }),
        ...(runbook !== undefined && { runbook }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート一覧取得
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const { status, severity, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [alerts, total] = await Promise.all([
      prisma.metricAlert.findMany({
        where,
        include: {
          rule: {
            include: {
              metric: { select: { name: true, displayName: true, unit: true } },
            },
          },
        },
        orderBy: { firedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.metricAlert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート詳細取得
 */
router.get('/alerts/:id', async (req, res, next) => {
  try {
    const alert = await prisma.metricAlert.findUnique({
      where: { id: req.params.id },
      include: {
        rule: {
          include: {
            metric: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!alert) {
      throw new AppError(404, 'Alert not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート確認
 */
router.post('/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      throw new AppError(400, 'acknowledgedBy is required', 'INVALID_INPUT');
    }

    const alert = await prisma.metricAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert) {
      throw new AppError(404, 'Alert not found', 'NOT_FOUND');
    }

    if (alert.status !== 'FIRING') {
      throw new AppError(400, 'Only firing alerts can be acknowledged', 'INVALID_OPERATION');
    }

    const updated = await prisma.metricAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });

    await prisma.metricAlertHistory.create({
      data: {
        alertId: req.params.id,
        action: 'ACKNOWLEDGED',
        oldStatus: 'FIRING',
        newStatus: 'ACKNOWLEDGED',
        changedBy: acknowledgedBy,
      },
    });

    log.info({ alertId: req.params.id, acknowledgedBy }, 'Alert acknowledged');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート解決
 */
router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { resolvedBy, resolution } = req.body;

    if (!resolvedBy) {
      throw new AppError(400, 'resolvedBy is required', 'INVALID_INPUT');
    }

    const alert = await prisma.metricAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert) {
      throw new AppError(404, 'Alert not found', 'NOT_FOUND');
    }

    if (alert.status === 'RESOLVED') {
      throw new AppError(400, 'Alert is already resolved', 'INVALID_OPERATION');
    }

    const updated = await prisma.metricAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });

    await prisma.metricAlertHistory.create({
      data: {
        alertId: req.params.id,
        action: 'RESOLVED',
        oldStatus: alert.status as MetricAlertStatus,
        newStatus: 'RESOLVED',
        comment: resolution,
        changedBy: resolvedBy,
      },
    });

    log.info({ alertId: req.params.id, resolvedBy }, 'Alert resolved');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * システムヘルス取得
 */
router.get('/health', async (req, res, next) => {
  try {
    const { component } = req.query;

    // 各コンポーネントの最新ヘルス状態を取得
    const latestHealth = await prisma.systemHealth.findMany({
      where: component ? { component: component as string } : undefined,
      distinct: ['component'],
      orderBy: { recordedAt: 'desc' },
    });

    res.json({
      success: true,
      data: latestHealth,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * システムヘルス履歴取得
 */
router.get('/health/:component/history', async (req, res, next) => {
  try {
    const { limit = '100' } = req.query;

    const history = await prisma.systemHealth.findMany({
      where: { component: req.params.component },
      orderBy: { recordedAt: 'desc' },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 監視統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalMetrics,
      totalAlertRules,
      alerts,
      latestHealth,
    ] = await Promise.all([
      prisma.metricDefinition.count({ where: { isActive: true } }),
      prisma.metricAlertRule.count({ where: { isActive: true } }),
      prisma.metricAlert.findMany({
        where: { status: { not: 'RESOLVED' } },
        select: { status: true, severity: true },
      }),
      prisma.systemHealth.findMany({
        distinct: ['component'],
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    const alertsByStatus: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    for (const alert of alerts) {
      alertsByStatus[alert.status] = (alertsByStatus[alert.status] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    }

    const healthByComponent: Record<string, HealthStatus> = {};
    for (const health of latestHealth) {
      healthByComponent[health.component] = health.status as HealthStatus;
    }

    res.json({
      success: true,
      data: {
        totalMetrics,
        totalAlertRules,
        activeAlerts: alerts.length,
        alertsByStatus,
        alertsBySeverity,
        healthByComponent,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * メトリクスカテゴリ一覧
 */
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = Object.values(MetricCategory).map((cat) => ({
      value: cat,
      label: getCategoryLabel(cat),
    }));

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート重要度一覧
 */
router.get('/severities', async (_req, res, next) => {
  try {
    const severities = Object.values(MetricAlertSeverity).map((sev) => ({
      value: sev,
      label: getSeverityLabel(sev),
    }));

    res.json({
      success: true,
      data: severities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラートステータス一覧
 */
router.get('/alert-statuses', async (_req, res, next) => {
  try {
    const statuses = Object.values(MetricAlertStatus).map((status) => ({
      value: status,
      label: getStatusLabel(status),
    }));

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getCategoryLabel(category: MetricCategory): string {
  const labels: Record<MetricCategory, string> = {
    SYSTEM: 'システム',
    BUSINESS: 'ビジネス',
    PERFORMANCE: 'パフォーマンス',
    SECURITY: 'セキュリティ',
    CUSTOM: 'カスタム',
  };
  return labels[category] || category;
}

function getSeverityLabel(severity: MetricAlertSeverity): string {
  const labels: Record<MetricAlertSeverity, string> = {
    CRITICAL: '緊急',
    WARNING: '警告',
    INFO: '情報',
  };
  return labels[severity] || severity;
}

function getStatusLabel(status: MetricAlertStatus): string {
  const labels: Record<MetricAlertStatus, string> = {
    FIRING: '発火中',
    ACKNOWLEDGED: '確認済み',
    RESOLVED: '解決済み',
    SILENCED: '抑制中',
  };
  return labels[status] || status;
}

export { router as metricsRouter };

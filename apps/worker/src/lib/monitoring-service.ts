/**
 * 監視・アラートサービス
 * Phase 32: メトリクス収集・しきい値アラート
 */

import {
  prisma,
  MetricCategory,
  MetricType,
  MetricAlertCondition,
  MetricAlertComparison,
  MetricAlertSeverity,
  MetricAlertStatus,
  MetricAlertAction,
  HealthStatus,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as os from 'os';

const log = logger.child({ module: 'monitoring-service' });

// メトリクス定義
export interface MetricDefinitionInput {
  name: string;
  displayName: string;
  description?: string;
  unit?: string;
  category: MetricCategory;
  metricType?: MetricType;
  collectInterval?: number;
  retentionDays?: number;
  tags?: string[];
}

// メトリクス値
export interface MetricValue {
  metricName: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

// アラートルール定義
export interface AlertRuleInput {
  name: string;
  description?: string;
  metricId: string;
  condition: MetricAlertCondition;
  threshold: number;
  duration?: number;
  comparison: MetricAlertComparison;
  severity: MetricAlertSeverity;
  channelIds?: string[];
  notifyInterval?: number;
  maxNotifications?: number;
  playbookUrl?: string;
  runbook?: Record<string, unknown>;
}

// システムヘルス
export interface SystemHealthData {
  component: string;
  hostname?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  responseTime?: number;
  requestCount?: number;
  errorCount?: number;
  activeConnections?: number;
  queuedJobs?: number;
}

/**
 * メトリクス定義を作成
 */
export async function createMetricDefinition(
  input: MetricDefinitionInput
): Promise<string> {
  const existing = await prisma.metricDefinition.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    return existing.id;
  }

  const metric = await prisma.metricDefinition.create({
    data: {
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      unit: input.unit,
      category: input.category,
      metricType: input.metricType || 'GAUGE',
      collectInterval: input.collectInterval || 60,
      retentionDays: input.retentionDays || 30,
      tags: input.tags || [],
    },
  });

  log.info({ metricId: metric.id, name: input.name }, 'Metric definition created');
  return metric.id;
}

/**
 * メトリクス値を記録
 */
export async function recordMetric(value: MetricValue): Promise<void> {
  const metric = await prisma.metricDefinition.findUnique({
    where: { name: value.metricName },
  });

  if (!metric) {
    log.warn({ metricName: value.metricName }, 'Metric definition not found');
    return;
  }

  await prisma.metricSnapshot.create({
    data: {
      metricId: metric.id,
      value: value.value,
      labels: (value.labels || {}) as any,
      timestamp: value.timestamp || new Date(),
    },
  });
}

/**
 * 複数メトリクスを一括記録
 */
export async function recordMetrics(values: MetricValue[]): Promise<void> {
  for (const value of values) {
    await recordMetric(value);
  }
}

/**
 * アラートルールを作成
 */
export async function createAlertRule(input: AlertRuleInput): Promise<string> {
  const rule = await prisma.metricAlertRule.create({
    data: {
      name: input.name,
      description: input.description,
      metricId: input.metricId,
      condition: input.condition,
      threshold: input.threshold,
      duration: input.duration || 60,
      comparison: input.comparison,
      severity: input.severity,
      channelIds: input.channelIds || [],
      notifyInterval: input.notifyInterval || 300,
      maxNotifications: input.maxNotifications || 5,
      playbookUrl: input.playbookUrl,
      runbook: input.runbook ? (input.runbook as any) : undefined,
    },
  });

  log.info({ ruleId: rule.id, name: input.name }, 'Alert rule created');
  return rule.id;
}

/**
 * アラートルールを評価
 */
export async function evaluateAlertRules(): Promise<{
  evaluated: number;
  fired: number;
  resolved: number;
}> {
  const rules = await prisma.metricAlertRule.findMany({
    where: { isActive: true },
    include: {
      metric: true,
      alerts: {
        where: { status: 'FIRING' },
      },
    },
  });

  let fired = 0;
  let resolved = 0;

  for (const rule of rules) {
    const recentSnapshots = await prisma.metricSnapshot.findMany({
      where: {
        metricId: rule.metricId,
        timestamp: {
          gte: new Date(Date.now() - rule.duration * 1000),
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentSnapshots.length === 0) continue;

    const avgValue =
      recentSnapshots.reduce((sum, s) => sum + s.value, 0) / recentSnapshots.length;

    const isTriggered = evaluateCondition(
      avgValue,
      rule.threshold,
      rule.comparison
    );

    const existingAlert = rule.alerts[0];

    if (isTriggered && !existingAlert) {
      // 新規アラート発火
      await createAlert(rule, avgValue);
      fired++;
    } else if (!isTriggered && existingAlert) {
      // アラート解決
      await resolveAlert(existingAlert.id, 'Metric returned to normal');
      resolved++;
    }
  }

  log.info({ evaluated: rules.length, fired, resolved }, 'Alert rules evaluated');

  return { evaluated: rules.length, fired, resolved };
}

/**
 * 条件を評価
 */
function evaluateCondition(
  value: number,
  threshold: number,
  comparison: MetricAlertComparison
): boolean {
  switch (comparison) {
    case 'GT':
      return value > threshold;
    case 'GTE':
      return value >= threshold;
    case 'LT':
      return value < threshold;
    case 'LTE':
      return value <= threshold;
    case 'EQ':
      return value === threshold;
    case 'NE':
      return value !== threshold;
    default:
      return false;
  }
}

/**
 * アラートを作成
 */
async function createAlert(
  rule: any,
  currentValue: number
): Promise<string> {
  const alert = await prisma.metricAlert.create({
    data: {
      ruleId: rule.id,
      status: 'FIRING',
      severity: rule.severity,
      currentValue,
      threshold: rule.threshold,
      message: `${rule.metric.displayName} is ${currentValue}${rule.metric.unit || ''}, threshold: ${rule.threshold}${rule.metric.unit || ''}`,
      labels: { metricName: rule.metric.name },
    },
  });

  // 履歴を記録
  await prisma.metricAlertHistory.create({
    data: {
      alertId: alert.id,
      action: 'CREATED',
      newStatus: 'FIRING',
    },
  });

  log.warn(
    { alertId: alert.id, ruleName: rule.name, currentValue, threshold: rule.threshold },
    'Alert fired'
  );

  // 通知を送信（Phase 27の通知チャンネル連携）
  await sendAlertNotification(alert, rule);

  return alert.id;
}

/**
 * アラートを解決
 */
export async function resolveAlert(
  alertId: string,
  resolution?: string,
  resolvedBy?: string
): Promise<void> {
  const alert = await prisma.metricAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert || alert.status === 'RESOLVED') return;

  await prisma.metricAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    },
  });

  await prisma.metricAlertHistory.create({
    data: {
      alertId,
      action: 'RESOLVED',
      oldStatus: alert.status as MetricAlertStatus,
      newStatus: 'RESOLVED',
      comment: resolution,
      changedBy: resolvedBy,
    },
  });

  log.info({ alertId, resolution }, 'Alert resolved');
}

/**
 * アラートを確認
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<void> {
  const alert = await prisma.metricAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert || alert.status !== 'FIRING') return;

  await prisma.metricAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  });

  await prisma.metricAlertHistory.create({
    data: {
      alertId,
      action: 'ACKNOWLEDGED',
      oldStatus: 'FIRING',
      newStatus: 'ACKNOWLEDGED',
      changedBy: acknowledgedBy,
    },
  });

  log.info({ alertId, acknowledgedBy }, 'Alert acknowledged');
}

/**
 * アラート通知を送信
 */
async function sendAlertNotification(alert: any, rule: any): Promise<void> {
  if (!rule.channelIds || rule.channelIds.length === 0) return;

  // Phase 27の通知機能との連携
  // 実際の実装では notification-channel-service を使用
  log.info(
    { alertId: alert.id, channels: rule.channelIds },
    'Sending alert notification'
  );

  await prisma.metricAlert.update({
    where: { id: alert.id },
    data: {
      notificationCount: { increment: 1 },
      lastNotifiedAt: new Date(),
    },
  });

  await prisma.metricAlertHistory.create({
    data: {
      alertId: alert.id,
      action: 'NOTIFIED',
    },
  });
}

/**
 * システムヘルスを記録
 */
export async function recordSystemHealth(data: SystemHealthData): Promise<void> {
  const status = determineHealthStatus(data);

  await prisma.systemHealth.create({
    data: {
      component: data.component,
      hostname: data.hostname || os.hostname(),
      cpuUsage: data.cpuUsage,
      memoryUsage: data.memoryUsage,
      diskUsage: data.diskUsage,
      responseTime: data.responseTime,
      requestCount: data.requestCount,
      errorCount: data.errorCount,
      errorRate: data.errorCount && data.requestCount
        ? (data.errorCount / data.requestCount) * 100
        : undefined,
      activeConnections: data.activeConnections,
      queuedJobs: data.queuedJobs,
      status,
    },
  });
}

/**
 * ヘルスステータスを判定
 */
function determineHealthStatus(data: SystemHealthData): HealthStatus {
  // CPU使用率が90%以上
  if (data.cpuUsage && data.cpuUsage >= 90) return 'UNHEALTHY';
  // メモリ使用率が95%以上
  if (data.memoryUsage && data.memoryUsage >= 95) return 'UNHEALTHY';
  // ディスク使用率が95%以上
  if (data.diskUsage && data.diskUsage >= 95) return 'UNHEALTHY';
  // エラー率が10%以上
  if (data.errorCount && data.requestCount) {
    const errorRate = (data.errorCount / data.requestCount) * 100;
    if (errorRate >= 10) return 'UNHEALTHY';
    if (errorRate >= 5) return 'DEGRADED';
  }
  // CPU使用率が80%以上
  if (data.cpuUsage && data.cpuUsage >= 80) return 'DEGRADED';
  // メモリ使用率が85%以上
  if (data.memoryUsage && data.memoryUsage >= 85) return 'DEGRADED';

  return 'HEALTHY';
}

/**
 * 現在のシステムメトリクスを収集
 */
export async function collectSystemMetrics(): Promise<void> {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const loadAvg = os.loadavg();

  // CPU使用率（簡易計算）
  const cpuUsage = loadAvg[0] / cpus.length * 100;

  // メモリ使用率
  const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

  // メトリクスを記録
  await recordMetrics([
    { metricName: 'system.cpu.usage', value: cpuUsage },
    { metricName: 'system.memory.usage', value: memoryUsage },
    { metricName: 'system.load.1m', value: loadAvg[0] },
    { metricName: 'system.load.5m', value: loadAvg[1] },
    { metricName: 'system.load.15m', value: loadAvg[2] },
  ]);

  // システムヘルスを記録
  await recordSystemHealth({
    component: 'worker',
    cpuUsage,
    memoryUsage,
  });
}

/**
 * アラート一覧を取得
 */
export async function getAlerts(options?: {
  status?: MetricAlertStatus;
  severity?: MetricAlertSeverity;
  limit?: number;
  offset?: number;
}): Promise<{ alerts: any[]; total: number }> {
  const where: any = {};
  if (options?.status) where.status = options.status;
  if (options?.severity) where.severity = options.severity;

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
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.metricAlert.count({ where }),
  ]);

  return { alerts, total };
}

/**
 * メトリクスデータを取得
 */
export async function getMetricData(
  metricName: string,
  options?: {
    startTime?: Date;
    endTime?: Date;
    labels?: Record<string, string>;
    limit?: number;
  }
): Promise<{ snapshots: any[]; metric: any }> {
  const metric = await prisma.metricDefinition.findUnique({
    where: { name: metricName },
  });

  if (!metric) {
    return { snapshots: [], metric: null };
  }

  const where: any = { metricId: metric.id };

  if (options?.startTime || options?.endTime) {
    where.timestamp = {};
    if (options.startTime) where.timestamp.gte = options.startTime;
    if (options.endTime) where.timestamp.lte = options.endTime;
  }

  const snapshots = await prisma.metricSnapshot.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: options?.limit || 1000,
  });

  return { snapshots, metric };
}

/**
 * 監視統計を取得
 */
export async function getMonitoringStats(): Promise<{
  totalMetrics: number;
  totalAlertRules: number;
  activeAlerts: number;
  alertsByStatus: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  healthByComponent: Record<string, HealthStatus>;
}> {
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

  return {
    totalMetrics,
    totalAlertRules,
    activeAlerts: alerts.length,
    alertsByStatus,
    alertsBySeverity,
    healthByComponent,
  };
}

/**
 * デフォルトのシステムメトリクスを初期化
 */
export async function initializeDefaultMetrics(): Promise<void> {
  const defaultMetrics: MetricDefinitionInput[] = [
    { name: 'system.cpu.usage', displayName: 'CPU Usage', unit: '%', category: 'SYSTEM' },
    { name: 'system.memory.usage', displayName: 'Memory Usage', unit: '%', category: 'SYSTEM' },
    { name: 'system.disk.usage', displayName: 'Disk Usage', unit: '%', category: 'SYSTEM' },
    { name: 'system.load.1m', displayName: 'Load Average (1m)', category: 'SYSTEM' },
    { name: 'system.load.5m', displayName: 'Load Average (5m)', category: 'SYSTEM' },
    { name: 'system.load.15m', displayName: 'Load Average (15m)', category: 'SYSTEM' },
    { name: 'api.response.time', displayName: 'API Response Time', unit: 'ms', category: 'PERFORMANCE' },
    { name: 'api.request.count', displayName: 'API Request Count', unit: 'count', category: 'PERFORMANCE', metricType: 'COUNTER' },
    { name: 'api.error.count', displayName: 'API Error Count', unit: 'count', category: 'PERFORMANCE', metricType: 'COUNTER' },
    { name: 'api.error.rate', displayName: 'API Error Rate', unit: '%', category: 'PERFORMANCE' },
    { name: 'business.orders.count', displayName: 'Order Count', unit: 'count', category: 'BUSINESS', metricType: 'COUNTER' },
    { name: 'business.orders.revenue', displayName: 'Order Revenue', unit: 'USD', category: 'BUSINESS' },
    { name: 'business.products.listed', displayName: 'Products Listed', unit: 'count', category: 'BUSINESS' },
    { name: 'business.products.sold', displayName: 'Products Sold', unit: 'count', category: 'BUSINESS', metricType: 'COUNTER' },
  ];

  for (const metric of defaultMetrics) {
    await createMetricDefinition(metric);
  }

  log.info({ count: defaultMetrics.length }, 'Default metrics initialized');
}

/**
 * 古いメトリクスデータをクリーンアップ
 */
export async function cleanupOldMetrics(): Promise<{ deleted: number }> {
  const metrics = await prisma.metricDefinition.findMany();
  let totalDeleted = 0;

  for (const metric of metrics) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - metric.retentionDays);

    const result = await prisma.metricSnapshot.deleteMany({
      where: {
        metricId: metric.id,
        timestamp: { lt: cutoffDate },
      },
    });

    totalDeleted += result.count;
  }

  log.info({ deleted: totalDeleted }, 'Old metrics cleaned up');
  return { deleted: totalDeleted };
}

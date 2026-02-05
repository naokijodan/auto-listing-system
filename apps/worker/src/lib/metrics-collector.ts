import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'metrics-collector' });

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface JobMetrics {
  queueName: string;
  completed: number;
  failed: number;
  active: number;
  waiting: number;
  delayed: number;
  successRate: number;
  avgProcessingTime: number;
  errorsByType: Record<string, number>;
}

export interface SystemMetrics {
  timestamp: number;
  queues: JobMetrics[];
  totalJobs: {
    completed: number;
    failed: number;
    active: number;
    waiting: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'queue_depth' | 'processing_time' | 'consecutive_errors';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  queueName?: string;
  value: number;
  threshold: number;
  createdAt: Date;
  acknowledged: boolean;
}

export interface AlertRule {
  id: string;
  type: 'error_rate' | 'queue_depth' | 'processing_time' | 'consecutive_errors';
  queueName?: string; // null = all queues
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

// デフォルトのアラートルール
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'error_rate_warning',
    type: 'error_rate',
    threshold: 10, // 10%以上でwarning
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'error_rate_critical',
    type: 'error_rate',
    threshold: 25, // 25%以上でcritical
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'queue_depth_warning',
    type: 'queue_depth',
    threshold: 100, // 100件以上でwarning
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'queue_depth_critical',
    type: 'queue_depth',
    threshold: 500, // 500件以上でcritical
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'consecutive_errors',
    type: 'consecutive_errors',
    threshold: 5, // 5回連続エラーでcritical
    severity: 'critical',
    enabled: true,
  },
];

export class MetricsCollector {
  private redis: IORedis;
  private alertRules: AlertRule[];
  private consecutiveErrors: Map<string, number>;

  constructor(redis: IORedis) {
    this.redis = redis;
    this.alertRules = [...DEFAULT_ALERT_RULES];
    this.consecutiveErrors = new Map();
  }

  /**
   * ジョブ完了を記録
   */
  async recordJobCompletion(
    queueName: string,
    jobId: string,
    processingTimeMs: number,
    success: boolean,
    errorType?: string
  ): Promise<void> {
    const now = Date.now();
    const hourKey = Math.floor(now / 3600000); // 1時間単位

    try {
      const multi = this.redis.multi();

      // 成功/失敗カウント
      const statusKey = `rakuda:metrics:${queueName}:${hourKey}:${success ? 'completed' : 'failed'}`;
      multi.incr(statusKey);
      multi.expire(statusKey, 86400 * 7); // 7日間保持

      // 処理時間
      const timeKey = `rakuda:metrics:${queueName}:${hourKey}:processing_time`;
      multi.lpush(timeKey, processingTimeMs);
      multi.ltrim(timeKey, 0, 999); // 最新1000件
      multi.expire(timeKey, 86400 * 7);

      // エラー種別
      if (!success && errorType) {
        const errorKey = `rakuda:metrics:${queueName}:${hourKey}:errors:${errorType}`;
        multi.incr(errorKey);
        multi.expire(errorKey, 86400 * 7);
      }

      await multi.exec();

      // 連続エラーチェック
      const errorCountKey = `${queueName}:consecutive_errors`;
      if (success) {
        this.consecutiveErrors.set(errorCountKey, 0);
      } else {
        const count = (this.consecutiveErrors.get(errorCountKey) || 0) + 1;
        this.consecutiveErrors.set(errorCountKey, count);

        // 連続エラーアラートチェック
        await this.checkConsecutiveErrorAlert(queueName, count);
      }
    } catch (error) {
      log.error('Failed to record job completion', error);
    }
  }

  /**
   * 連続エラーアラートチェック
   */
  private async checkConsecutiveErrorAlert(queueName: string, count: number): Promise<void> {
    const rule = this.alertRules.find(
      (r) => r.type === 'consecutive_errors' && r.enabled
    );

    if (rule && count >= rule.threshold) {
      await this.createAlert({
        type: 'consecutive_errors',
        severity: rule.severity,
        message: `${queueName}で${count}回連続エラーが発生しています`,
        queueName,
        value: count,
        threshold: rule.threshold,
      });
    }
  }

  /**
   * アラートを作成
   */
  async createAlert(params: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...params,
      createdAt: new Date(),
      acknowledged: false,
    };

    try {
      // 最近のアラートを取得
      const recentAlerts = await this.getRecentAlerts(60000); // 1分以内

      // 同じ種類のアラートが既にあれば重複作成しない
      const isDuplicate = recentAlerts.some(
        (a) => a.type === alert.type && a.queueName === alert.queueName && !a.acknowledged
      );

      if (!isDuplicate) {
        await this.redis.lpush('rakuda:alerts', JSON.stringify(alert));
        await this.redis.ltrim('rakuda:alerts', 0, 999); // 最新1000件
        log.warn(`Alert created: ${alert.message}`, { alert });
      }
    } catch (error) {
      log.error('Failed to create alert', error);
    }
  }

  /**
   * 最近のアラートを取得
   */
  async getRecentAlerts(withinMs: number = 3600000): Promise<Alert[]> {
    try {
      const alertsStr = await this.redis.lrange('rakuda:alerts', 0, 99);
      const now = Date.now();
      const cutoff = now - withinMs;

      return alertsStr
        .map((str) => JSON.parse(str) as Alert)
        .filter((a) => new Date(a.createdAt).getTime() > cutoff);
    } catch (error) {
      log.error('Failed to get recent alerts', error);
      return [];
    }
  }

  /**
   * アラートを確認済みにする
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const alertsStr = await this.redis.lrange('rakuda:alerts', 0, 999);
      const alerts = alertsStr.map((str) => JSON.parse(str) as Alert);

      const alertIndex = alerts.findIndex((a) => a.id === alertId);
      if (alertIndex === -1) return false;

      alerts[alertIndex].acknowledged = true;

      // 更新（簡易的に全置換）
      await this.redis.del('rakuda:alerts');
      for (const alert of alerts.reverse()) {
        await this.redis.lpush('rakuda:alerts', JSON.stringify(alert));
      }

      return true;
    } catch (error) {
      log.error('Failed to acknowledge alert', error);
      return false;
    }
  }

  /**
   * キュー別メトリクスを取得
   */
  async getQueueMetrics(queueName: string, hours: number = 24): Promise<JobMetrics> {
    const now = Date.now();
    let completed = 0;
    let failed = 0;
    const processingTimes: number[] = [];
    const errorsByType: Record<string, number> = {};

    try {
      for (let i = 0; i < hours; i++) {
        const hourKey = Math.floor((now - i * 3600000) / 3600000);

        // 完了/失敗カウント
        const completedStr = await this.redis.get(`rakuda:metrics:${queueName}:${hourKey}:completed`);
        const failedStr = await this.redis.get(`rakuda:metrics:${queueName}:${hourKey}:failed`);
        completed += parseInt(completedStr || '0', 10);
        failed += parseInt(failedStr || '0', 10);

        // 処理時間
        const times = await this.redis.lrange(`rakuda:metrics:${queueName}:${hourKey}:processing_time`, 0, -1);
        times.forEach((t) => processingTimes.push(parseInt(t, 10)));

        // エラー種別
        const errorKeys = await this.redis.keys(`rakuda:metrics:${queueName}:${hourKey}:errors:*`);
        for (const key of errorKeys) {
          const errorType = key.split(':').pop()!;
          const count = parseInt((await this.redis.get(key)) || '0', 10);
          errorsByType[errorType] = (errorsByType[errorType] || 0) + count;
        }
      }

      const total = completed + failed;
      const successRate = total > 0 ? (completed / total) * 100 : 100;
      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

      return {
        queueName,
        completed,
        failed,
        active: 0, // BullMQから取得
        waiting: 0,
        delayed: 0,
        successRate: Math.round(successRate * 10) / 10,
        avgProcessingTime: Math.round(avgProcessingTime),
        errorsByType,
      };
    } catch (error) {
      log.error(`Failed to get queue metrics for ${queueName}`, error);
      return {
        queueName,
        completed: 0,
        failed: 0,
        active: 0,
        waiting: 0,
        delayed: 0,
        successRate: 100,
        avgProcessingTime: 0,
        errorsByType: {},
      };
    }
  }

  /**
   * アラートルールを更新
   */
  setAlertRules(rules: AlertRule[]): void {
    this.alertRules = rules;
  }

  /**
   * アラートルールを取得
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * 時系列データを取得（グラフ用）
   */
  async getTimeSeriesData(
    queueName: string,
    metric: 'completed' | 'failed',
    hours: number = 24
  ): Promise<MetricPoint[]> {
    const now = Date.now();
    const points: MetricPoint[] = [];

    try {
      for (let i = hours - 1; i >= 0; i--) {
        const hourKey = Math.floor((now - i * 3600000) / 3600000);
        const timestamp = hourKey * 3600000;
        const valueStr = await this.redis.get(`rakuda:metrics:${queueName}:${hourKey}:${metric}`);
        const value = parseInt(valueStr || '0', 10);
        points.push({ timestamp, value });
      }
    } catch (error) {
      log.error('Failed to get time series data', error);
    }

    return points;
  }
}

// シングルトン
let metricsCollectorInstance: MetricsCollector | null = null;

export function createMetricsCollector(redis: IORedis): MetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollector(redis);
  }
  return metricsCollectorInstance;
}

export function getMetricsCollector(): MetricsCollector | null {
  return metricsCollectorInstance;
}

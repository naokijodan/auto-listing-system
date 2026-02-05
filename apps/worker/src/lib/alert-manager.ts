import { Queue } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import {
  AlertEvent,
  AlertCondition,
  AlertConditionOperator,
  AlertSeverity,
  NotificationChannelName,
  NotificationJobPayload,
} from '@rakuda/schema';
import { getConnection } from './redis';

const THROTTLE_KEY_PREFIX = 'rakuda:alert:throttle:';
const BATCH_KEY_PREFIX = 'rakuda:alert:batch:';
const STATS_KEY_PREFIX = 'rakuda:alert:stats:';

interface AlertRuleInternal {
  id: string;
  name: string;
  eventType: string;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  channels: NotificationChannelName[];
  cooldownMinutes: number;
  batchWindowMinutes: number;
  isActive: boolean;
}

interface PendingAlert {
  id: string;
  ruleId: string | null;
  eventType: string;
  severity: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  channels: string[];
  productId?: string;
  listingId?: string;
}

class AlertManager {
  private notificationQueue: Queue | null = null;
  private log = logger.child({ module: 'AlertManager' });

  /**
   * 通知キューを初期化
   */
  async initialize(): Promise<void> {
    const connection = getConnection();
    this.notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection });
    this.log.info('AlertManager initialized');
  }

  /**
   * イベントを処理してアラートを発火
   */
  async processEvent(event: AlertEvent): Promise<void> {
    this.log.info({ type: 'alert_event_received', eventType: event.type, data: event.data });

    try {
      // マッチするルールを取得
      const matchingRules = await this.checkRules(event);

      if (matchingRules.length === 0) {
        this.log.debug({ type: 'no_matching_rules', eventType: event.type });
        return;
      }

      // 各ルールに対して処理
      for (const rule of matchingRules) {
        await this.processRuleForEvent(rule, event);
      }
    } catch (error) {
      this.log.error({ type: 'alert_process_error', error, event });
    }
  }

  /**
   * イベントにマッチするルールを取得
   */
  async checkRules(event: AlertEvent): Promise<AlertRuleInternal[]> {
    // DBからアクティブなルールを取得
    const rules = await prisma.alertRule.findMany({
      where: {
        eventType: event.type,
        isActive: true,
      },
    });

    // 条件をチェックして絞り込み
    const matchingRules: AlertRuleInternal[] = [];

    for (const rule of rules) {
      const conditions = (rule.conditions as AlertCondition[]) || [];
      if (this.evaluateConditions(conditions, event.data)) {
        matchingRules.push({
          id: rule.id,
          name: rule.name,
          eventType: rule.eventType,
          conditions,
          severity: rule.severity as AlertSeverity,
          channels: rule.channels as NotificationChannelName[],
          cooldownMinutes: rule.cooldownMinutes,
          batchWindowMinutes: rule.batchWindowMinutes,
          isActive: rule.isActive,
        });
      }
    }

    return matchingRules;
  }

  /**
   * 条件を評価
   */
  private evaluateConditions(
    conditions: AlertCondition[],
    data: Record<string, unknown>
  ): boolean {
    // 条件がない場合は常にマッチ
    if (conditions.length === 0) {
      return true;
    }

    // すべての条件がマッチする必要がある（AND条件）
    return conditions.every((condition) => this.evaluateCondition(condition, data));
  }

  /**
   * 単一条件を評価
   */
  private evaluateCondition(
    condition: AlertCondition,
    data: Record<string, unknown>
  ): boolean {
    const value = this.getNestedValue(data, condition.field);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return value === compareValue;
      case 'ne':
        return value !== compareValue;
      case 'gt':
        return typeof value === 'number' && typeof compareValue === 'number' && value > compareValue;
      case 'lt':
        return typeof value === 'number' && typeof compareValue === 'number' && value < compareValue;
      case 'gte':
        return typeof value === 'number' && typeof compareValue === 'number' && value >= compareValue;
      case 'lte':
        return typeof value === 'number' && typeof compareValue === 'number' && value <= compareValue;
      case 'contains':
        return typeof value === 'string' && typeof compareValue === 'string' && value.includes(compareValue);
      default:
        return false;
    }
  }

  /**
   * ネストされた値を取得（例: "product.price"）
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * ルールに対してイベントを処理
   */
  private async processRuleForEvent(rule: AlertRuleInternal, event: AlertEvent): Promise<void> {
    // スロットリングチェック
    if (await this.shouldThrottle(rule.id)) {
      this.log.info({ type: 'alert_throttled', ruleId: rule.id, eventType: event.type });
      await this.recordAlert(rule, event, 'throttled');
      return;
    }

    // バッチウィンドウがある場合はバッファに追加
    if (rule.batchWindowMinutes > 0) {
      await this.addToBatch(rule, event);
      return;
    }

    // 即時送信
    await this.sendAlert(rule, event);
  }

  /**
   * スロットリング判定
   */
  async shouldThrottle(ruleId: string): Promise<boolean> {
    const redis = getConnection();
    const key = `${THROTTLE_KEY_PREFIX}${ruleId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * スロットリングを設定
   */
  private async setThrottle(ruleId: string, cooldownMinutes: number): Promise<void> {
    if (cooldownMinutes <= 0) return;

    const redis = getConnection();
    const key = `${THROTTLE_KEY_PREFIX}${ruleId}`;
    await redis.setex(key, cooldownMinutes * 60, '1');
  }

  /**
   * バッチバッファに追加
   */
  private async addToBatch(rule: AlertRuleInternal, event: AlertEvent): Promise<void> {
    const redis = getConnection();
    const key = `${BATCH_KEY_PREFIX}${rule.eventType}:${rule.id}`;

    const alertData = {
      ruleId: rule.id,
      event,
      timestamp: new Date().toISOString(),
    };

    // バッファに追加
    await redis.rpush(key, JSON.stringify(alertData));

    // TTLを設定（バッチウィンドウの2倍）
    await redis.expire(key, rule.batchWindowMinutes * 60 * 2);

    // バッチ処理ジョブをスケジュール（重複防止）
    const lockKey = `${key}:scheduled`;
    const isScheduled = await redis.exists(lockKey);

    if (!isScheduled) {
      await redis.setex(lockKey, rule.batchWindowMinutes * 60, '1');

      // 遅延ジョブをエンキュー
      if (this.notificationQueue) {
        await this.notificationQueue.add(
          'process-batch',
          {
            ruleId: rule.id,
            eventType: rule.eventType,
            batchKey: key,
          },
          {
            delay: rule.batchWindowMinutes * 60 * 1000,
            jobId: `batch-${rule.id}-${Date.now()}`,
          }
        );
      }
    }

    this.log.info({
      type: 'alert_added_to_batch',
      ruleId: rule.id,
      eventType: event.type,
      batchKey: key,
    });

    // DBにログ記録
    await this.recordAlert(rule, event, 'batched');
  }

  /**
   * バッチを処理
   */
  async processBatch(ruleId: string, eventType: string, batchKey: string): Promise<void> {
    const redis = getConnection();

    // バッファからすべてのアラートを取得
    const rawAlerts = await redis.lrange(batchKey, 0, -1);
    await redis.del(batchKey);
    await redis.del(`${batchKey}:scheduled`);

    if (rawAlerts.length === 0) {
      return;
    }

    const alerts = rawAlerts.map((raw) => JSON.parse(raw));
    const batchId = `batch-${Date.now()}`;

    this.log.info({
      type: 'processing_batch',
      ruleId,
      eventType,
      count: alerts.length,
      batchId,
    });

    // ルールを再取得
    const rule = await prisma.alertRule.findUnique({ where: { id: ruleId } });
    if (!rule || !rule.isActive) {
      return;
    }

    // バッチ通知を送信
    const channels = rule.channels as NotificationChannelName[];

    for (const channel of channels) {
      const payload: NotificationJobPayload = {
        channel,
        template: `${eventType}_BATCH`,
        data: {
          count: alerts.length,
          eventType,
          severity: rule.severity,
          alerts: alerts.map((a) => ({
            ...a.event.data,
            timestamp: a.timestamp,
          })),
        },
        batchId,
      };

      if (this.notificationQueue) {
        await this.notificationQueue.add('send-notification', payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }
    }

    // スロットリングを設定
    await this.setThrottle(ruleId, rule.cooldownMinutes);

    // 統計を更新
    await this.incrementStats('batched', channels.length);
  }

  /**
   * アラートを即時送信
   */
  private async sendAlert(rule: AlertRuleInternal, event: AlertEvent): Promise<void> {
    const title = this.generateTitle(rule, event);
    const message = this.generateMessage(rule, event);

    // DBにアラートログを作成
    const alertLog = await prisma.alertLog.create({
      data: {
        ruleId: rule.id,
        eventType: event.type,
        severity: rule.severity,
        title,
        message,
        metadata: JSON.parse(JSON.stringify(event.data)),
        channels: rule.channels,
        status: 'pending',
      },
    });

    // 各チャネルに通知ジョブをエンキュー
    for (const channel of rule.channels) {
      const deepLink = this.generateDeepLink(event);

      const payload: NotificationJobPayload = {
        channel,
        template: event.type,
        data: {
          title,
          message,
          severity: rule.severity,
          ...event.data,
          productId: event.productId,
          listingId: event.listingId,
        },
        deepLink,
        alertLogId: alertLog.id,
      };

      if (this.notificationQueue) {
        await this.notificationQueue.add('send-notification', payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }
    }

    // スロットリングを設定
    await this.setThrottle(rule.id, rule.cooldownMinutes);

    this.log.info({
      type: 'alert_sent',
      alertLogId: alertLog.id,
      ruleId: rule.id,
      eventType: event.type,
      channels: rule.channels,
    });

    // 統計を更新
    await this.incrementStats('sent', rule.channels.length);
  }

  /**
   * アラートログを記録（スロットル時など）
   */
  private async recordAlert(
    rule: AlertRuleInternal,
    event: AlertEvent,
    status: 'throttled' | 'batched'
  ): Promise<void> {
    await prisma.alertLog.create({
      data: {
        ruleId: rule.id,
        eventType: event.type,
        severity: rule.severity,
        title: this.generateTitle(rule, event),
        message: this.generateMessage(rule, event),
        metadata: JSON.parse(JSON.stringify(event.data)),
        channels: rule.channels,
        status,
      },
    });

    await this.incrementStats(status, 1);
  }

  /**
   * タイトルを生成
   */
  private generateTitle(rule: AlertRuleInternal, event: AlertEvent): string {
    const data = event.data as Record<string, string>;
    const titleMap: Record<string, string> = {
      INVENTORY_OUT_OF_STOCK: `在庫切れ: ${data.title || '商品'}`,
      PRICE_DROP_DETECTED: `価格急変: ${data.title || '商品'}`,
      LISTING_FAILED: `出品失敗: ${data.title || '商品'}`,
      COMPETITOR_PRICE_CHANGE: `競合価格変動: ${data.title || '商品'}`,
      ORDER_RECEIVED: `新規注文: ${data.orderId || ''}`,
      SCRAPE_ERROR: `スクレイプエラー: ${data.source || 'unknown'}`,
    };

    return titleMap[event.type] || `アラート: ${event.type}`;
  }

  /**
   * メッセージを生成
   */
  private generateMessage(rule: AlertRuleInternal, event: AlertEvent): string {
    const data = event.data as Record<string, string | number>;
    const messageMap: Record<string, string> = {
      INVENTORY_OUT_OF_STOCK: `商品「${data.title}」の在庫が切れました。マーケットプレイス: ${data.marketplace}`,
      PRICE_DROP_DETECTED: `商品「${data.title}」の価格が${data.changePercent}%変動しました。`,
      LISTING_FAILED: `商品「${data.title}」の出品に失敗しました。エラー: ${data.error}`,
      COMPETITOR_PRICE_CHANGE: `競合商品の価格が変動しました。新価格: ${data.newPrice}`,
      ORDER_RECEIVED: `新しい注文を受け付けました。注文ID: ${data.orderId}`,
      SCRAPE_ERROR: `スクレイピングでエラーが発生しました。URL: ${data.url}`,
    };

    return messageMap[event.type] || JSON.stringify(data);
  }

  /**
   * Deep Linkを生成
   */
  private generateDeepLink(event: AlertEvent): string {
    const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3001';

    if (event.productId) {
      return `${baseUrl}/products/${event.productId}`;
    }
    if (event.listingId) {
      return `${baseUrl}/listings/${event.listingId}`;
    }

    // イベントタイプ別のデフォルトリンク
    const linkMap: Record<string, string> = {
      INVENTORY_OUT_OF_STOCK: `${baseUrl}/inventory?status=out_of_stock`,
      LISTING_FAILED: `${baseUrl}/listings?status=error`,
      ORDER_RECEIVED: `${baseUrl}/orders`,
      SCRAPE_ERROR: `${baseUrl}/jobs?status=failed`,
    };

    return linkMap[event.type] || baseUrl;
  }

  /**
   * 統計を更新
   */
  private async incrementStats(type: string, count: number): Promise<void> {
    const redis = getConnection();
    const today = new Date().toISOString().split('T')[0];
    const key = `${STATS_KEY_PREFIX}${today}`;

    await redis.hincrby(key, type, count);
    await redis.expire(key, 60 * 60 * 24 * 30); // 30日間保持
  }

  /**
   * 統計を取得
   */
  async getStats(days: number = 7): Promise<Record<string, Record<string, number>>> {
    const redis = getConnection();
    const stats: Record<string, Record<string, number>> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${STATS_KEY_PREFIX}${dateStr}`;

      const dayStats = await redis.hgetall(key);
      if (Object.keys(dayStats).length > 0) {
        stats[dateStr] = Object.fromEntries(
          Object.entries(dayStats).map(([k, v]) => [k, parseInt(v, 10)])
        );
      }
    }

    return stats;
  }

  /**
   * アラートログのステータスを更新
   */
  async updateAlertLogStatus(
    alertLogId: string,
    status: 'sent' | 'failed',
    errorMsg?: string
  ): Promise<void> {
    await prisma.alertLog.update({
      where: { id: alertLogId },
      data: {
        status,
        sentAt: status === 'sent' ? new Date() : undefined,
        errorMsg: errorMsg || undefined,
      },
    });
  }
}

// シングルトンインスタンス
export const alertManager = new AlertManager();

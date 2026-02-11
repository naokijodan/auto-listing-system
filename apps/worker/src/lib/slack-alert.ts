/**
 * Phase 44: Slackアラートサービス
 * ジョブ失敗・キュー詰まり・エラー通知
 */
import { logger } from '@rakuda/logger';
import { getQueueStats } from '@rakuda/queue';
import { QUEUE_NAMES } from '@rakuda/config';

const log = logger.child({ module: 'slack-alert' });

// ========================================
// 型定義
// ========================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: () => Promise<boolean>;
  severity: AlertSeverity;
  message: (context: any) => string;
  cooldown: number; // ミリ秒
}

// ========================================
// Slack Webhook クライアント
// ========================================

export class SlackClient {
  private webhookUrl: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      log.warn({ type: 'slack_disabled', reason: 'SLACK_WEBHOOK_URL not set' });
    }
  }

  /**
   * メッセージを送信
   */
  async send(message: SlackMessage): Promise<boolean> {
    if (!this.enabled) {
      log.debug({ type: 'slack_skipped', message: message.text });
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      log.info({ type: 'slack_sent', text: message.text.slice(0, 100) });
      return true;
    } catch (error: any) {
      log.error({ type: 'slack_error', error: error.message });
      return false;
    }
  }

  /**
   * アラートを送信
   */
  async sendAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    fields?: Array<{ title: string; value: string; short?: boolean }>
  ): Promise<boolean> {
    const color = {
      info: '#36a64f',
      warning: '#ffcc00',
      error: '#ff6600',
      critical: '#ff0000',
    }[severity];

    const emoji = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    }[severity];

    const slackMessage: SlackMessage = {
      text: `${emoji} [${severity.toUpperCase()}] ${title}`,
      attachments: [
        {
          color,
          title,
          text: message,
          fields: fields?.map(f => ({
            title: f.title,
            value: f.value,
            short: f.short ?? true,
          })),
          footer: 'RAKUDA Alert System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    return this.send(slackMessage);
  }
}

// ========================================
// アラートマネージャー
// ========================================

export class AlertManager {
  private slackClient: SlackClient;
  private cooldowns: Map<string, number> = new Map();
  private rules: AlertRule[] = [];

  constructor() {
    this.slackClient = new SlackClient();
    this.initDefaultRules();
  }

  /**
   * デフォルトのアラートルールを初期化
   */
  private initDefaultRules(): void {
    // キュー詰まりアラート
    this.rules.push({
      id: 'queue_backlog',
      name: 'Queue Backlog Alert',
      condition: async () => {
        const enrichmentStats = await getQueueStats(QUEUE_NAMES.ENRICHMENT);
        const joomStats = await getQueueStats(QUEUE_NAMES.JOOM_PUBLISH);
        return enrichmentStats.waiting > 100 || joomStats.waiting > 50;
      },
      severity: 'warning',
      message: (ctx) => `Queue backlog detected: Enrichment=${ctx.enrichment}, Joom=${ctx.joom}`,
      cooldown: 300000, // 5分
    });

    // 連続失敗アラート
    this.rules.push({
      id: 'consecutive_failures',
      name: 'Consecutive Failures Alert',
      condition: async () => {
        const enrichmentStats = await getQueueStats(QUEUE_NAMES.ENRICHMENT);
        const joomStats = await getQueueStats(QUEUE_NAMES.JOOM_PUBLISH);
        return enrichmentStats.failed > 10 || joomStats.failed > 10;
      },
      severity: 'error',
      message: (ctx) => `High failure rate: ${ctx.failed} jobs failed`,
      cooldown: 600000, // 10分
    });

    // ワーカー停止アラート
    this.rules.push({
      id: 'worker_stalled',
      name: 'Worker Stalled Alert',
      condition: async () => {
        const enrichmentStats = await getQueueStats(QUEUE_NAMES.ENRICHMENT);
        const joomStats = await getQueueStats(QUEUE_NAMES.JOOM_PUBLISH);
        const totalWaiting = enrichmentStats.waiting + joomStats.waiting;
        const totalActive = enrichmentStats.active + joomStats.active;
        return totalWaiting > 20 && totalActive === 0;
      },
      severity: 'critical',
      message: () => 'Workers appear to be stalled - jobs waiting but none active',
      cooldown: 180000, // 3分
    });
  }

  /**
   * クールダウンをチェック
   */
  private checkCooldown(ruleId: string, cooldown: number): boolean {
    const lastFired = this.cooldowns.get(ruleId);
    if (lastFired && Date.now() - lastFired < cooldown) {
      return false;
    }
    this.cooldowns.set(ruleId, Date.now());
    return true;
  }

  /**
   * すべてのルールをチェック
   */
  async checkRules(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const shouldAlert = await rule.condition();
        if (shouldAlert && this.checkCooldown(rule.id, rule.cooldown)) {
          const enrichmentStats = await getQueueStats(QUEUE_NAMES.ENRICHMENT);
          const joomStats = await getQueueStats(QUEUE_NAMES.JOOM_PUBLISH);

          const context = {
            enrichment: enrichmentStats.waiting,
            joom: joomStats.waiting,
            failed: enrichmentStats.failed + joomStats.failed,
          };

          await this.slackClient.sendAlert(
            rule.severity,
            rule.name,
            rule.message(context),
            [
              { title: 'Enrichment Queue', value: `Waiting: ${enrichmentStats.waiting}, Failed: ${enrichmentStats.failed}` },
              { title: 'Joom Queue', value: `Waiting: ${joomStats.waiting}, Failed: ${joomStats.failed}` },
            ]
          );

          log.info({
            type: 'alert_fired',
            ruleId: rule.id,
            severity: rule.severity,
          });
        }
      } catch (error: any) {
        log.error({
          type: 'rule_check_error',
          ruleId: rule.id,
          error: error.message,
        });
      }
    }
  }

  /**
   * ジョブ失敗アラートを送信
   */
  async alertJobFailure(
    queueName: string,
    jobId: string,
    jobName: string,
    error: string,
    attemptsMade: number
  ): Promise<void> {
    const ruleId = `job_failure_${jobId}`;
    if (!this.checkCooldown(ruleId, 60000)) return; // 1分のクールダウン

    await this.slackClient.sendAlert(
      attemptsMade >= 3 ? 'error' : 'warning',
      'Job Failure',
      `Job ${jobName} failed after ${attemptsMade} attempts`,
      [
        { title: 'Queue', value: queueName },
        { title: 'Job ID', value: jobId },
        { title: 'Error', value: error.slice(0, 200), short: false },
      ]
    );
  }

  /**
   * 出品成功アラートを送信
   */
  async alertPublishSuccess(
    productTitle: string,
    joomProductId: string,
    price: number
  ): Promise<void> {
    await this.slackClient.sendAlert(
      'info',
      'Joom Publish Success',
      `Product successfully listed on Joom`,
      [
        { title: 'Product', value: productTitle.slice(0, 50) },
        { title: 'Joom ID', value: joomProductId },
        { title: 'Price', value: `$${price.toFixed(2)}` },
      ]
    );
  }

  /**
   * バッチ完了アラートを送信
   */
  async alertBatchComplete(
    batchId: string,
    total: number,
    success: number,
    failed: number
  ): Promise<void> {
    const severity = failed === 0 ? 'info' : failed > success ? 'error' : 'warning';

    await this.slackClient.sendAlert(
      severity,
      'Batch Publish Complete',
      `Batch ${batchId.slice(0, 8)} completed`,
      [
        { title: 'Total', value: total.toString() },
        { title: 'Success', value: success.toString() },
        { title: 'Failed', value: failed.toString() },
        { title: 'Success Rate', value: `${((success / total) * 100).toFixed(1)}%` },
      ]
    );
  }

  /**
   * カスタムアラートを送信
   */
  async sendCustomAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    fields?: Array<{ title: string; value: string }>
  ): Promise<void> {
    await this.slackClient.sendAlert(severity, title, message, fields);
  }
}

// シングルトンインスタンス
export const alertManager = new AlertManager();
export const slackClient = new SlackClient();

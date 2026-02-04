import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'notifications' });

/**
 * 通知タイプ
 */
export type NotificationType =
  | 'inventory_out_of_stock'
  | 'price_changed'
  | 'listing_published'
  | 'listing_error'
  | 'job_failed'
  | 'exchange_rate_updated'
  | 'daily_report';

/**
 * 通知ペイロード
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: Record<string, any>;
  timestamp?: string;
}

/**
 * Slack通知を送信
 */
async function sendSlackNotification(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    log.debug({ type: 'slack_not_configured' });
    return false;
  }

  const colorMap = {
    info: '#2196F3',
    warning: '#FF9800',
    error: '#F44336',
    success: '#4CAF50',
  };

  const slackPayload = {
    attachments: [
      {
        color: colorMap[payload.severity],
        title: payload.title,
        text: payload.message,
        fields: payload.data
          ? Object.entries(payload.data).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            }))
          : [],
        footer: 'Auto Listing System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    log.info({ type: 'slack_notification_sent', title: payload.title });
    return true;
  } catch (error: any) {
    log.error({ type: 'slack_notification_error', error: error.message });
    return false;
  }
}

/**
 * Discord通知を送信
 */
async function sendDiscordNotification(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    log.debug({ type: 'discord_not_configured' });
    return false;
  }

  const colorMap = {
    info: 0x2196f3,
    warning: 0xff9800,
    error: 0xf44336,
    success: 0x4caf50,
  };

  const discordPayload = {
    embeds: [
      {
        title: payload.title,
        description: payload.message,
        color: colorMap[payload.severity],
        fields: payload.data
          ? Object.entries(payload.data).map(([key, value]) => ({
              name: key,
              value: String(value),
              inline: true,
            }))
          : [],
        footer: {
          text: 'Auto Listing System',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    log.info({ type: 'discord_notification_sent', title: payload.title });
    return true;
  } catch (error: any) {
    log.error({ type: 'discord_notification_error', error: error.message });
    return false;
  }
}

/**
 * LINE通知を送信
 */
async function sendLineNotification(payload: NotificationPayload): Promise<boolean> {
  const token = process.env.LINE_NOTIFY_TOKEN;

  if (!token) {
    log.debug({ type: 'line_not_configured' });
    return false;
  }

  const emojiMap = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  };

  const message = `${emojiMap[payload.severity]} ${payload.title}\n\n${payload.message}`;

  try {
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message }),
    });

    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status}`);
    }

    log.info({ type: 'line_notification_sent', title: payload.title });
    return true;
  } catch (error: any) {
    log.error({ type: 'line_notification_error', error: error.message });
    return false;
  }
}

/**
 * 全ての設定済みチャンネルに通知を送信
 */
export async function sendNotification(payload: NotificationPayload): Promise<{
  slack: boolean;
  discord: boolean;
  line: boolean;
}> {
  const finalPayload = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  log.info({
    type: 'sending_notification',
    notificationType: payload.type,
    severity: payload.severity,
  });

  const [slack, discord, line] = await Promise.all([
    sendSlackNotification(finalPayload),
    sendDiscordNotification(finalPayload),
    sendLineNotification(finalPayload),
  ]);

  return { slack, discord, line };
}

/**
 * 在庫切れ通知
 */
export async function notifyOutOfStock(
  productTitle: string,
  sourceUrl: string,
  listingCount: number
): Promise<void> {
  await sendNotification({
    type: 'inventory_out_of_stock',
    title: '在庫切れ検知',
    message: `「${productTitle}」が仕入元で在庫切れになりました。`,
    severity: 'warning',
    data: {
      商品名: productTitle.substring(0, 50),
      仕入元: sourceUrl,
      影響出品数: listingCount,
    },
  });
}

/**
 * 価格変動通知
 */
export async function notifyPriceChanged(
  productTitle: string,
  oldPrice: number,
  newPrice: number,
  changePercent: number
): Promise<void> {
  const direction = newPrice > oldPrice ? '上昇' : '下落';
  const severity = Math.abs(changePercent) > 20 ? 'warning' : 'info';

  await sendNotification({
    type: 'price_changed',
    title: `仕入価格${direction}`,
    message: `「${productTitle}」の仕入価格が${Math.abs(changePercent).toFixed(1)}%${direction}しました。`,
    severity,
    data: {
      商品名: productTitle.substring(0, 50),
      旧価格: `¥${oldPrice.toLocaleString()}`,
      新価格: `¥${newPrice.toLocaleString()}`,
      変動率: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
    },
  });
}

/**
 * 出品成功通知
 */
export async function notifyListingPublished(
  productTitle: string,
  marketplace: string,
  listingUrl: string,
  price: number
): Promise<void> {
  await sendNotification({
    type: 'listing_published',
    title: '出品完了',
    message: `「${productTitle}」を${marketplace}に出品しました。`,
    severity: 'success',
    data: {
      商品名: productTitle.substring(0, 50),
      マーケット: marketplace,
      価格: `$${price.toFixed(2)}`,
      URL: listingUrl,
    },
  });
}

/**
 * 出品エラー通知
 */
export async function notifyListingError(
  productTitle: string,
  marketplace: string,
  errorMessage: string
): Promise<void> {
  await sendNotification({
    type: 'listing_error',
    title: '出品エラー',
    message: `「${productTitle}」の${marketplace}への出品に失敗しました。`,
    severity: 'error',
    data: {
      商品名: productTitle.substring(0, 50),
      マーケット: marketplace,
      エラー: errorMessage.substring(0, 100),
    },
  });
}

/**
 * ジョブ失敗通知
 */
export async function notifyJobFailed(
  jobType: string,
  jobId: string,
  errorMessage: string,
  attempts: number
): Promise<void> {
  await sendNotification({
    type: 'job_failed',
    title: 'ジョブ失敗',
    message: `${jobType}ジョブが${attempts}回試行後に失敗しました。`,
    severity: 'error',
    data: {
      ジョブタイプ: jobType,
      ジョブID: jobId,
      試行回数: attempts,
      エラー: errorMessage.substring(0, 100),
    },
  });
}

/**
 * 為替レート更新通知
 */
export async function notifyExchangeRateUpdated(
  oldRate: number,
  newRate: number
): Promise<void> {
  const oldJpyPerUsd = 1 / oldRate;
  const newJpyPerUsd = 1 / newRate;
  const changePercent = ((newJpyPerUsd - oldJpyPerUsd) / oldJpyPerUsd) * 100;

  // 1%以上の変動時のみ通知
  if (Math.abs(changePercent) < 1) {
    return;
  }

  const direction = changePercent > 0 ? '円安' : '円高';

  await sendNotification({
    type: 'exchange_rate_updated',
    title: `為替レート更新 (${direction})`,
    message: `USD/JPYレートが${Math.abs(changePercent).toFixed(2)}%変動しました。`,
    severity: 'info',
    data: {
      旧レート: `1 USD = ¥${oldJpyPerUsd.toFixed(2)}`,
      新レート: `1 USD = ¥${newJpyPerUsd.toFixed(2)}`,
      変動: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
    },
  });
}

/**
 * 日次レポート通知
 */
export async function notifyDailyReport(stats: {
  newProducts: number;
  publishedListings: number;
  soldListings: number;
  outOfStock: number;
  errors: number;
  revenue?: number;
}): Promise<void> {
  await sendNotification({
    type: 'daily_report',
    title: '日次レポート',
    message: `本日の処理サマリーをお知らせします。`,
    severity: 'info',
    data: {
      新規商品: stats.newProducts,
      出品数: stats.publishedListings,
      売上: stats.soldListings,
      在庫切れ: stats.outOfStock,
      エラー: stats.errors,
      ...(stats.revenue ? { 売上金額: `$${stats.revenue.toFixed(2)}` } : {}),
    },
  });
}

/**
 * 通知設定を確認
 */
export function getNotificationConfig(): {
  slack: boolean;
  discord: boolean;
  line: boolean;
} {
  return {
    slack: !!process.env.SLACK_WEBHOOK_URL,
    discord: !!process.env.DISCORD_WEBHOOK_URL,
    line: !!process.env.LINE_NOTIFY_TOKEN,
  };
}

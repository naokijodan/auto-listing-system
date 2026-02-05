import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'notification-service' });

/**
 * 通知ペイロード
 */
export interface NotificationPayload {
  eventType: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  data?: Record<string, any>;
  orderId?: string;
  productId?: string;
  listingId?: string;
}

/**
 * チャンネル別送信結果
 */
export interface SendResult {
  channelId: string;
  channelType: string;
  success: boolean;
  error?: string;
}

/**
 * Slack通知を送信
 */
async function sendToSlack(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<boolean> {
  const colorMap: Record<string, string> = {
    INFO: '#2196F3',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    SUCCESS: '#4CAF50',
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
        footer: 'RAKUDA 越境EC自動出品システム',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackPayload),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }

  return true;
}

/**
 * Discord通知を送信
 */
async function sendToDiscord(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<boolean> {
  const colorMap: Record<string, number> = {
    INFO: 0x2196f3,
    WARNING: 0xff9800,
    ERROR: 0xf44336,
    SUCCESS: 0x4caf50,
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
          text: 'RAKUDA 越境EC自動出品システム',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload),
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status}`);
  }

  return true;
}

/**
 * LINE通知を送信
 */
async function sendToLine(
  token: string,
  payload: NotificationPayload
): Promise<boolean> {
  const emojiMap: Record<string, string> = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
  };

  let message = `${emojiMap[payload.severity]} ${payload.title}\n\n${payload.message}`;

  if (payload.data) {
    message += '\n\n';
    for (const [key, value] of Object.entries(payload.data)) {
      message += `${key}: ${value}\n`;
    }
  }

  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });

  if (!response.ok) {
    throw new Error(`LINE API error: ${response.status}`);
  }

  return true;
}

/**
 * 通知を送信（データベース設定に基づく）
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  try {
    // アクティブなチャンネルを取得
    const channels = await prisma.notificationChannel.findMany({
      where: {
        isActive: true,
        enabledTypes: {
          has: payload.eventType as any,
        },
      },
    });

    // 重要度フィルタリング
    const severityOrder = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'];
    const filteredChannels = channels.filter((ch) => {
      const channelSeverityIndex = severityOrder.indexOf(ch.minSeverity);
      const payloadSeverityIndex = severityOrder.indexOf(payload.severity);
      // ERRORは常に通知、それ以外は設定に従う
      if (payload.severity === 'ERROR') return true;
      return payloadSeverityIndex >= channelSeverityIndex;
    });

    // 各チャンネルに送信
    for (const channel of filteredChannels) {
      const result: SendResult = {
        channelId: channel.id,
        channelType: channel.channel,
        success: false,
      };

      try {
        switch (channel.channel) {
          case 'SLACK':
            if (channel.webhookUrl) {
              await sendToSlack(channel.webhookUrl, payload);
              result.success = true;
            }
            break;

          case 'DISCORD':
            if (channel.webhookUrl) {
              await sendToDiscord(channel.webhookUrl, payload);
              result.success = true;
            }
            break;

          case 'LINE':
            if (channel.token) {
              await sendToLine(channel.token, payload);
              result.success = true;
            }
            break;
        }

        // 成功時、最終使用日時を更新
        if (result.success) {
          await prisma.notificationChannel.update({
            where: { id: channel.id },
            data: {
              lastUsedAt: new Date(),
              errorCount: 0,
              lastError: null,
            },
          });
        }
      } catch (error: any) {
        result.error = error.message;

        // エラーを記録
        await prisma.notificationChannel.update({
          where: { id: channel.id },
          data: {
            lastError: error.message,
            errorCount: { increment: 1 },
          },
        });

        log.error({
          type: 'notification_channel_error',
          channelId: channel.id,
          channelType: channel.channel,
          error: error.message,
        });
      }

      results.push(result);
    }

    // フォールバック: DBにチャンネルがない場合、環境変数を使用
    if (filteredChannels.length === 0) {
      const envResults = await sendNotificationViaEnv(payload);
      results.push(...envResults);
    }

    log.info({
      type: 'notification_sent',
      eventType: payload.eventType,
      severity: payload.severity,
      channelCount: results.length,
      successCount: results.filter((r) => r.success).length,
    });
  } catch (error: any) {
    log.error({
      type: 'notification_service_error',
      error: error.message,
    });
  }

  return results;
}

/**
 * 環境変数経由で通知送信（フォールバック）
 */
async function sendNotificationViaEnv(
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  // Slack
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      await sendToSlack(slackUrl, payload);
      results.push({ channelId: 'env-slack', channelType: 'SLACK', success: true });
    } catch (error: any) {
      results.push({ channelId: 'env-slack', channelType: 'SLACK', success: false, error: error.message });
    }
  }

  // Discord
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  if (discordUrl) {
    try {
      await sendToDiscord(discordUrl, payload);
      results.push({ channelId: 'env-discord', channelType: 'DISCORD', success: true });
    } catch (error: any) {
      results.push({ channelId: 'env-discord', channelType: 'DISCORD', success: false, error: error.message });
    }
  }

  // LINE
  const lineToken = process.env.LINE_NOTIFY_TOKEN;
  if (lineToken) {
    try {
      await sendToLine(lineToken, payload);
      results.push({ channelId: 'env-line', channelType: 'LINE', success: true });
    } catch (error: any) {
      results.push({ channelId: 'env-line', channelType: 'LINE', success: false, error: error.message });
    }
  }

  return results;
}

// ========================================
// 便利な通知関数
// ========================================

/**
 * 注文受信通知
 */
export async function notifyOrderReceived(
  marketplaceOrderId: string,
  marketplace: string,
  total: number,
  itemCount: number
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_RECEIVED',
    title: '🛒 新規注文受信',
    message: `${marketplace}で新しい注文を受け付けました。`,
    severity: 'SUCCESS',
    data: {
      注文ID: marketplaceOrderId,
      マーケット: marketplace,
      合計金額: `$${total.toFixed(2)}`,
      商品数: itemCount,
    },
  });
}

/**
 * 注文支払完了通知
 */
export async function notifyOrderPaid(
  marketplaceOrderId: string,
  marketplace: string,
  total: number
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_PAID',
    title: '💰 支払い完了',
    message: `${marketplace}注文の支払いが確認されました。`,
    severity: 'SUCCESS',
    data: {
      注文ID: marketplaceOrderId,
      マーケット: marketplace,
      支払金額: `$${total.toFixed(2)}`,
    },
  });
}

/**
 * 注文出荷通知
 */
export async function notifyOrderShipped(
  marketplaceOrderId: string,
  marketplace: string,
  trackingNumber: string,
  carrier: string
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_SHIPPED',
    title: '📦 出荷完了',
    message: `注文を出荷しました。`,
    severity: 'SUCCESS',
    data: {
      注文ID: marketplaceOrderId,
      マーケット: marketplace,
      追跡番号: trackingNumber,
      配送業者: carrier,
    },
  });
}

/**
 * 注文キャンセル通知
 */
export async function notifyOrderCancelled(
  marketplaceOrderId: string,
  marketplace: string,
  reason?: string
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_CANCELLED',
    title: '❌ 注文キャンセル',
    message: `${marketplace}の注文がキャンセルされました。`,
    severity: 'WARNING',
    data: {
      注文ID: marketplaceOrderId,
      マーケット: marketplace,
      ...(reason ? { 理由: reason } : {}),
    },
  });
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
    eventType: 'OUT_OF_STOCK',
    title: '⚠️ 在庫切れ検知',
    message: `「${productTitle}」が仕入元で在庫切れになりました。`,
    severity: 'WARNING',
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
export async function notifyPriceChange(
  productTitle: string,
  oldPrice: number,
  newPrice: number,
  changePercent: number
): Promise<void> {
  const direction = newPrice > oldPrice ? '上昇' : '下落';
  const severity = Math.abs(changePercent) > 20 ? 'WARNING' : 'INFO';

  await sendNotification({
    eventType: 'PRICE_CHANGE',
    title: `💹 仕入価格${direction}`,
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
  listingId: string,
  price: number
): Promise<void> {
  await sendNotification({
    eventType: 'LISTING_PUBLISHED',
    title: '✅ 出品完了',
    message: `「${productTitle}」を${marketplace}に出品しました。`,
    severity: 'SUCCESS',
    data: {
      商品名: productTitle.substring(0, 50),
      マーケット: marketplace,
      出品ID: listingId,
      価格: `$${price.toFixed(2)}`,
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
    eventType: 'LISTING_ERROR',
    title: '❌ 出品エラー',
    message: `「${productTitle}」の${marketplace}への出品に失敗しました。`,
    severity: 'ERROR',
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
    eventType: 'JOB_FAILED',
    title: '🔴 ジョブ失敗',
    message: `${jobType}ジョブが${attempts}回試行後に失敗しました。`,
    severity: 'ERROR',
    data: {
      ジョブタイプ: jobType,
      ジョブID: jobId,
      試行回数: attempts,
      エラー: errorMessage.substring(0, 100),
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
  profit?: number;
}): Promise<void> {
  await sendNotification({
    eventType: 'DAILY_REPORT',
    title: '📊 日次レポート',
    message: `本日の処理サマリーをお知らせします。`,
    severity: 'INFO',
    data: {
      新規商品: stats.newProducts,
      出品数: stats.publishedListings,
      売上件数: stats.soldListings,
      在庫切れ: stats.outOfStock,
      エラー: stats.errors,
      ...(stats.revenue ? { 売上金額: `$${stats.revenue.toFixed(2)}` } : {}),
      ...(stats.profit ? { 利益: `¥${stats.profit.toLocaleString()}` } : {}),
    },
  });
}

/**
 * 為替レート更新通知
 */
export async function notifyExchangeRateUpdate(
  oldRate: number,
  newRate: number
): Promise<void> {
  const changePercent = ((newRate - oldRate) / oldRate) * 100;

  // 1%以上の変動時のみ通知
  if (Math.abs(changePercent) < 1) {
    return;
  }

  const direction = changePercent > 0 ? '円安' : '円高';

  await sendNotification({
    eventType: 'EXCHANGE_RATE',
    title: `💱 為替レート更新 (${direction})`,
    message: `USD/JPYレートが${Math.abs(changePercent).toFixed(2)}%変動しました。`,
    severity: 'INFO',
    data: {
      旧レート: `1 USD = ¥${oldRate.toFixed(2)}`,
      新レート: `1 USD = ¥${newRate.toFixed(2)}`,
      変動: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
    },
  });
}

/**
 * 競合価格変動通知
 */
export async function notifyCompetitorPriceChange(
  productTitle: string,
  competitorSeller: string,
  oldPrice: number,
  newPrice: number,
  myPrice: number,
  currency: string = 'USD'
): Promise<void> {
  const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
  const direction = newPrice > oldPrice ? '上昇' : '下落';
  const severity = Math.abs(changePercent) > 10 ? 'WARNING' : 'INFO';

  // 自分の価格との比較
  const priceDiff = myPrice - newPrice;
  const priceComparison =
    priceDiff > 0
      ? `⚠️ 自分の方が$${priceDiff.toFixed(2)}高い`
      : priceDiff < 0
        ? `✅ 自分の方が$${Math.abs(priceDiff).toFixed(2)}安い`
        : '同価格';

  await sendNotification({
    eventType: 'COMPETITOR_PRICE_CHANGE',
    title: `📊 競合価格${direction}`,
    message: `「${productTitle}」の競合価格が${Math.abs(changePercent).toFixed(1)}%${direction}しました。`,
    severity,
    data: {
      商品名: productTitle.substring(0, 50),
      競合出品者: competitorSeller,
      旧価格: `${currency === 'USD' ? '$' : ''}${oldPrice.toFixed(2)}`,
      新価格: `${currency === 'USD' ? '$' : ''}${newPrice.toFixed(2)}`,
      変動率: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      自分の価格: `${currency === 'USD' ? '$' : ''}${myPrice.toFixed(2)}`,
      価格比較: priceComparison,
    },
  });
}

/**
 * システムエラー通知
 */
export async function notifySystemError(
  component: string,
  errorMessage: string,
  details?: Record<string, any>
): Promise<void> {
  await sendNotification({
    eventType: 'SYSTEM_ERROR',
    title: '🚨 システムエラー',
    message: `${component}でエラーが発生しました。`,
    severity: 'ERROR',
    data: {
      コンポーネント: component,
      エラー: errorMessage.substring(0, 200),
      ...details,
    },
  });
}

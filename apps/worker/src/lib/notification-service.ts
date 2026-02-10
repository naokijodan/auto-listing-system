import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as nodemailer from 'nodemailer';

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
  // Phase 45: マーケットプレイスフィルター用
  marketplace?: 'JOOM' | 'EBAY';
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
 * SMTPトランスポート設定
 */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

function getSmtpTransport(config?: Partial<SmtpConfig>): nodemailer.Transporter {
  const smtpConfig: SmtpConfig = {
    host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: config?.port || parseInt(process.env.SMTP_PORT || '587', 10),
    secure: config?.secure ?? (process.env.SMTP_SECURE === 'true'),
    user: config?.user || process.env.SMTP_USER,
    pass: config?.pass || process.env.SMTP_PASS,
  };

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.user && smtpConfig.pass ? {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    } : undefined,
  });
}

/**
 * メール通知を送信
 */
async function sendToEmail(
  email: string,
  payload: NotificationPayload,
  smtpConfig?: Partial<SmtpConfig>
): Promise<boolean> {
  const severityStyles: Record<string, { color: string; icon: string }> = {
    INFO: { color: '#2196F3', icon: 'ℹ️' },
    WARNING: { color: '#FF9800', icon: '⚠️' },
    ERROR: { color: '#F44336', icon: '❌' },
    SUCCESS: { color: '#4CAF50', icon: '✅' },
  };

  const style = severityStyles[payload.severity] || severityStyles.INFO;

  // HTML形式のメール本文
  let dataTable = '';
  if (payload.data) {
    const rows = Object.entries(payload.data)
      .map(([key, value]) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${key}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${value}</td></tr>`)
      .join('');
    dataTable = `<table style="width: 100%; border-collapse: collapse; margin-top: 16px;">${rows}</table>`;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: ${style.color}; color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; }
    .footer { padding: 16px 20px; background: #f9f9f9; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${style.icon} ${payload.title}</h1>
    </div>
    <div class="content">
      <p>${payload.message}</p>
      ${dataTable}
    </div>
    <div class="footer">
      RAKUDA 越境EC自動出品システム<br>
      ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
    </div>
  </div>
</body>
</html>`;

  // テキスト形式のフォールバック
  let textContent = `${style.icon} ${payload.title}\n\n${payload.message}`;
  if (payload.data) {
    textContent += '\n\n';
    for (const [key, value] of Object.entries(payload.data)) {
      textContent += `${key}: ${value}\n`;
    }
  }
  textContent += `\n\n---\nRAKUDA 越境EC自動出品システム\n${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;

  const transporter = getSmtpTransport(smtpConfig);
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@rakuda.app';

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `[RAKUDA] ${payload.title}`,
    text: textContent,
    html: htmlContent,
  });

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
    let filteredChannels = channels.filter((ch) => {
      const channelSeverityIndex = severityOrder.indexOf(ch.minSeverity);
      const payloadSeverityIndex = severityOrder.indexOf(payload.severity);
      // ERRORは常に通知、それ以外は設定に従う
      if (payload.severity === 'ERROR') return true;
      return payloadSeverityIndex >= channelSeverityIndex;
    });

    // Phase 45: マーケットプレイスフィルタリング
    // 通知にマーケットプレイス情報がある場合、フィルター設定に基づいて絞り込み
    if (payload.marketplace) {
      filteredChannels = filteredChannels.filter((ch) => {
        // marketplaceFilterが空の場合は全マーケットプレイスを許可
        const filter = (ch as any).marketplaceFilter || [];
        if (filter.length === 0) return true;
        // フィルターにマーケットプレイスが含まれている場合のみ許可
        return filter.includes(payload.marketplace);
      });
    }

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

          case 'EMAIL':
            if (channel.email) {
              const smtpConfig = channel.smtpHost ? {
                host: channel.smtpHost,
                port: channel.smtpPort || undefined,
                secure: channel.smtpSecure,
                user: channel.smtpUser || undefined,
                pass: channel.smtpPass || undefined,
              } : undefined;
              await sendToEmail(channel.email, payload, smtpConfig);
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

  // Email
  const emailTo = process.env.NOTIFICATION_EMAIL;
  if (emailTo && process.env.SMTP_USER) {
    try {
      await sendToEmail(emailTo, payload);
      results.push({ channelId: 'env-email', channelType: 'EMAIL', success: true });
    } catch (error: any) {
      results.push({ channelId: 'env-email', channelType: 'EMAIL', success: false, error: error.message });
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
  marketplace: 'JOOM' | 'EBAY',
  total: number,
  itemCount: number
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_RECEIVED',
    title: '🛒 新規注文受信',
    message: `${marketplace}で新しい注文を受け付けました。`,
    severity: 'SUCCESS',
    marketplace,
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
  marketplace: 'JOOM' | 'EBAY',
  total: number
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_PAID',
    title: '💰 支払い完了',
    message: `${marketplace}注文の支払いが確認されました。`,
    severity: 'SUCCESS',
    marketplace,
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
  marketplace: 'JOOM' | 'EBAY',
  trackingNumber: string,
  carrier: string
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_SHIPPED',
    title: '📦 出荷完了',
    message: `注文を出荷しました。`,
    severity: 'SUCCESS',
    marketplace,
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
  marketplace: 'JOOM' | 'EBAY',
  reason?: string
): Promise<void> {
  await sendNotification({
    eventType: 'ORDER_CANCELLED',
    title: '❌ 注文キャンセル',
    message: `${marketplace}の注文がキャンセルされました。`,
    severity: 'WARNING',
    marketplace,
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
  marketplace: 'JOOM' | 'EBAY',
  listingId: string,
  price: number
): Promise<void> {
  await sendNotification({
    eventType: 'LISTING_PUBLISHED',
    title: '✅ 出品完了',
    message: `「${productTitle}」を${marketplace}に出品しました。`,
    severity: 'SUCCESS',
    marketplace,
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
  marketplace: 'JOOM' | 'EBAY',
  errorMessage: string
): Promise<void> {
  await sendNotification({
    eventType: 'LISTING_ERROR',
    title: '❌ 出品エラー',
    message: `「${productTitle}」の${marketplace}への出品に失敗しました。`,
    severity: 'ERROR',
    marketplace,
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

// ========================================
// レポート配信関数（Phase 32）
// ========================================

/**
 * レポートをメールで送信
 */
export async function sendReportByEmail(
  emails: string[],
  subject: string,
  reportContent: string,
  format: 'json' | 'markdown' | 'csv',
  smtpConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; errors: string[] }> {
  const transporter = getSmtpTransport(smtpConfig);
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@rakuda.app';
  const errors: string[] = [];

  // フォーマットに応じたMIMEタイプと拡張子
  const mimeTypes: Record<string, { mime: string; ext: string }> = {
    json: { mime: 'application/json', ext: 'json' },
    markdown: { mime: 'text/markdown', ext: 'md' },
    csv: { mime: 'text/csv', ext: 'csv' },
  };
  const { mime, ext } = mimeTypes[format] || mimeTypes.markdown;

  // 添付ファイル名
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `rakuda-report-${dateStr}.${ext}`;

  // HTML本文（レポートの概要）
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1976D2; color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; }
    .footer { padding: 16px 20px; background: #f9f9f9; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .note { background: #E3F2FD; padding: 12px; border-radius: 4px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${subject}</h1>
    </div>
    <div class="content">
      <p>RAKUDAの定期レポートをお届けします。</p>
      <div class="note">
        <strong>添付ファイル:</strong> ${filename}<br>
        <strong>形式:</strong> ${format.toUpperCase()}
      </div>
    </div>
    <div class="footer">
      RAKUDA 越境EC自動出品システム<br>
      ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
    </div>
  </div>
</body>
</html>`;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `[RAKUDA] ${subject}`,
        html: htmlContent,
        attachments: [
          {
            filename,
            content: reportContent,
            contentType: mime,
          },
        ],
      });
      log.info({ type: 'report_email_sent', email, subject });
    } catch (error: any) {
      log.error({ type: 'report_email_error', email, error: error.message });
      errors.push(`${email}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * スケジュールレポート通知（サマリー）
 */
export async function notifyScheduledReport(
  reportName: string,
  reportType: string,
  recipientCount: number,
  status: 'success' | 'failed',
  error?: string
): Promise<void> {
  await sendNotification({
    eventType: 'SCHEDULED_REPORT',
    title: status === 'success' ? '📊 定期レポート配信完了' : '❌ 定期レポート配信失敗',
    message: status === 'success'
      ? `「${reportName}」を${recipientCount}件の宛先に配信しました。`
      : `「${reportName}」の配信に失敗しました。`,
    severity: status === 'success' ? 'INFO' : 'ERROR',
    data: {
      レポート名: reportName,
      レポートタイプ: reportType,
      配信先数: recipientCount,
      ...(error ? { エラー: error.substring(0, 100) } : {}),
    },
  });
}

// ========================================
// Webhook通知（DB記録 + リトライ付き）
// Phase 45+: NotificationEvent記録機能
// ========================================

/**
 * 通知タイプ定義
 */
export type WebhookNotificationType =
  | 'ORDER_RECEIVED'
  | 'PROFIT_ALERT'
  | 'STOCK_OUT'
  | 'PRICE_CHANGED'
  | 'SYSTEM_ERROR';

/**
 * 通知チャンネル定義
 */
export type WebhookNotificationChannel = 'SLACK' | 'DISCORD' | 'WEBHOOK';

/**
 * Webhook通知ペイロード
 */
export interface WebhookNotificationPayload {
  title: string;
  message: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  color?: string; // hex color
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * リトライ設定
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * 指数バックオフでスリープ
 */
async function sleepWithBackoff(attempt: number, config: RetryConfig): Promise<void> {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // ジッター追加（0.5〜1.5倍）
  const jitteredDelay = delay * (0.5 + Math.random());
  await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
}

/**
 * Webhook URL取得
 */
function getWebhookUrlForChannel(channel: WebhookNotificationChannel): string | null {
  switch (channel) {
    case 'SLACK':
      return process.env.SLACK_WEBHOOK_URL || null;
    case 'DISCORD':
      return process.env.DISCORD_WEBHOOK_URL || null;
    case 'WEBHOOK':
      return process.env.ORDER_NOTIFICATION_WEBHOOK_URL || null;
    default:
      return null;
  }
}

/**
 * Slack形式に変換（Block Kit）
 */
function formatPayloadForSlack(payload: WebhookNotificationPayload): object {
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: payload.title, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: payload.message },
    },
  ];

  if (payload.fields && payload.fields.length > 0) {
    // 2列ずつグループ化
    for (let i = 0; i < payload.fields.length; i += 2) {
      const fieldGroup = payload.fields.slice(i, i + 2);
      blocks.push({
        type: 'section',
        fields: fieldGroup.map((f) => ({
          type: 'mrkdwn',
          text: `*${f.name}*\n${f.value}`,
        })),
      });
    }
  }

  if (payload.actionUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: payload.actionLabel || 'View Details', emoji: true },
          url: payload.actionUrl,
        },
      ],
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `RAKUDA | ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
      },
    ],
  });

  return { blocks };
}

/**
 * Discord形式に変換（Embed）
 */
function formatPayloadForDiscord(payload: WebhookNotificationPayload): object {
  const embed: any = {
    title: payload.title,
    description: payload.message,
    color: payload.color ? parseInt(payload.color.replace('#', ''), 16) : 0x5865f2,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'RAKUDA 越境EC自動出品システム',
    },
  };

  if (payload.fields && payload.fields.length > 0) {
    embed.fields = payload.fields.map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline ?? true,
    }));
  }

  return { embeds: [embed] };
}

/**
 * 汎用Webhook形式に変換
 */
function formatPayloadForGenericWebhook(
  type: WebhookNotificationType,
  payload: WebhookNotificationPayload,
  referenceId?: string,
  referenceType?: string
): object {
  return {
    type,
    title: payload.title,
    message: payload.message,
    fields: payload.fields || [],
    color: payload.color,
    referenceId,
    referenceType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Webhook通知送信（DB記録 + リトライ付き）
 */
export async function sendWebhookNotification(options: {
  type: WebhookNotificationType;
  channel: WebhookNotificationChannel;
  payload: WebhookNotificationPayload;
  referenceId?: string;
  referenceType?: string;
  retryConfig?: Partial<RetryConfig>;
}): Promise<{ success: boolean; eventId: string }> {
  const { type, channel, payload, referenceId, referenceType } = options;
  const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };

  // NotificationEventを作成
  const event = await prisma.notificationEvent.create({
    data: {
      type,
      channel,
      status: 'PENDING',
      payload: payload as any,
      referenceId,
      referenceType,
      retryCount: 0,
    },
  });

  const webhookUrl = getWebhookUrlForChannel(channel);

  if (!webhookUrl) {
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: {
        status: 'FAILED',
        error: `No webhook URL configured for ${channel}`,
      },
    });
    log.warn({ type: 'webhook_notification_no_url', channel, eventId: event.id });
    return { success: false, eventId: event.id };
  }

  let lastError: Error | null = null;

  // リトライループ
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // ペイロードをチャンネルに合わせて変換
      let body: object;
      switch (channel) {
        case 'SLACK':
          body = formatPayloadForSlack(payload);
          break;
        case 'DISCORD':
          body = formatPayloadForDiscord(payload);
          break;
        case 'WEBHOOK':
        default:
          body = formatPayloadForGenericWebhook(type, payload, referenceId, referenceType);
          break;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      // 成功
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          retryCount: attempt,
        },
      });

      log.info({
        type: 'webhook_notification_sent',
        channel,
        notificationType: type,
        eventId: event.id,
        attempts: attempt + 1,
      });

      return { success: true, eventId: event.id };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      log.warn({
        type: 'webhook_notification_retry',
        channel,
        notificationType: type,
        eventId: event.id,
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        error: lastError.message,
      });

      // 最後の試行でなければリトライ待機
      if (attempt < config.maxRetries) {
        await sleepWithBackoff(attempt, config);
      }
    }
  }

  // 全リトライ失敗
  const errorMessage = lastError?.message || 'Unknown error';
  await prisma.notificationEvent.update({
    where: { id: event.id },
    data: {
      status: 'FAILED',
      error: errorMessage,
      retryCount: config.maxRetries,
    },
  });

  log.error({
    type: 'webhook_notification_failed',
    channel,
    notificationType: type,
    eventId: event.id,
    error: errorMessage,
  });

  return { success: false, eventId: event.id };
}

/**
 * 失敗した通知をリトライ（バッチ処理用）
 */
export async function retryFailedNotifications(
  limit: number = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const failedEvents = await prisma.notificationEvent.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: DEFAULT_RETRY_CONFIG.maxRetries },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;

  for (const event of failedEvents) {
    const payload = event.payload as unknown as WebhookNotificationPayload;
    const result = await sendWebhookNotification({
      type: event.type as WebhookNotificationType,
      channel: event.channel as WebhookNotificationChannel,
      payload,
      referenceId: event.referenceId || undefined,
      referenceType: event.referenceType || undefined,
    });

    if (result.success) {
      succeeded++;
      // 古いイベントを更新
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } else {
      failed++;
    }
  }

  log.info({
    type: 'retry_failed_notifications_complete',
    processed: failedEvents.length,
    succeeded,
    failed,
  });

  return { processed: failedEvents.length, succeeded, failed };
}

// ========================================
// 拡張注文通知テンプレート（利益情報付き）
// ========================================

/**
 * 注文アイテム情報
 */
export interface OrderItemDetail {
  title: string;
  price: number;
  costPrice: number;
  profitJpy: number;
  profitRate: number;
  purchaseUrl?: string;
}

/**
 * 利益サマリー
 */
export interface ProfitSummary {
  totalProfitJpy: number;
  isDangerous: boolean;
}

/**
 * 詳細注文通知（利益情報付き）
 */
export async function notifyOrderReceivedWithProfit(order: {
  orderId: string;
  buyerName: string;
  totalAmount: number;
  currency: string;
  items: OrderItemDetail[];
  profitSummary: ProfitSummary;
}): Promise<{ success: boolean; eventId: string }> {
  // チャンネル優先順位: Slack > Discord > 汎用Webhook
  const channel: WebhookNotificationChannel = process.env.SLACK_WEBHOOK_URL
    ? 'SLACK'
    : process.env.DISCORD_WEBHOOK_URL
      ? 'DISCORD'
      : 'WEBHOOK';

  // 商品情報テキスト作成
  const itemsText = order.items
    .map(
      (item, i) =>
        `${i + 1}. ${item.title.substring(0, 30)}${item.title.length > 30 ? '...' : ''}\n` +
        `   売価: ${order.currency}${item.price.toLocaleString()} | 仕入: ¥${item.costPrice.toLocaleString()}\n` +
        `   利益: ¥${item.profitJpy.toLocaleString()} (${item.profitRate.toFixed(1)}%)`
    )
    .join('\n\n');

  const payload: WebhookNotificationPayload = {
    title: order.profitSummary.isDangerous ? '⚠️ 注文受信（赤字リスク）' : '📦 注文受信',
    message:
      `注文ID: ${order.orderId}\n` +
      `購入者: ${order.buyerName}\n` +
      `合計: ${order.currency}${order.totalAmount.toLocaleString()}`,
    fields: [
      { name: '商品', value: itemsText, inline: false },
      { name: '利益合計', value: `¥${order.profitSummary.totalProfitJpy.toLocaleString()}`, inline: true },
      {
        name: 'ステータス',
        value: order.profitSummary.isDangerous ? '❌ 要確認' : '✅ 健全',
        inline: true,
      },
    ],
    color: order.profitSummary.isDangerous ? '#FF0000' : '#00FF00',
  };

  return sendWebhookNotification({
    type: 'ORDER_RECEIVED',
    channel,
    payload,
    referenceId: order.orderId,
    referenceType: 'ORDER',
  });
}

/**
 * 利益アラート通知
 */
export async function notifyProfitAlert(options: {
  orderId: string;
  productTitle: string;
  sellingPrice: number;
  costPrice: number;
  profitJpy: number;
  profitRate: number;
  currency: string;
  reason: string;
}): Promise<{ success: boolean; eventId: string }> {
  const channel: WebhookNotificationChannel = process.env.SLACK_WEBHOOK_URL
    ? 'SLACK'
    : process.env.DISCORD_WEBHOOK_URL
      ? 'DISCORD'
      : 'WEBHOOK';

  const payload: WebhookNotificationPayload = {
    title: '⚠️ 利益アラート',
    message: `注文の利益率が閾値を下回っています。確認が必要です。`,
    fields: [
      { name: '注文ID', value: options.orderId, inline: true },
      { name: '商品', value: options.productTitle.substring(0, 50), inline: false },
      { name: '売価', value: `${options.currency}${options.sellingPrice.toLocaleString()}`, inline: true },
      { name: '仕入価格', value: `¥${options.costPrice.toLocaleString()}`, inline: true },
      { name: '利益', value: `¥${options.profitJpy.toLocaleString()} (${options.profitRate.toFixed(1)}%)`, inline: true },
      { name: '理由', value: options.reason, inline: false },
    ],
    color: '#FFA500',
  };

  return sendWebhookNotification({
    type: 'PROFIT_ALERT',
    channel,
    payload,
    referenceId: options.orderId,
    referenceType: 'ORDER',
  });
}

/**
 * 在庫切れ通知（Webhook版）
 */
export async function notifyStockOutWebhook(product: {
  productId: string;
  title: string;
  listingId?: string;
  marketplace: string;
  sourceUrl?: string;
}): Promise<{ success: boolean; eventId: string }> {
  const channel: WebhookNotificationChannel = process.env.SLACK_WEBHOOK_URL
    ? 'SLACK'
    : process.env.DISCORD_WEBHOOK_URL
      ? 'DISCORD'
      : 'WEBHOOK';

  const payload: WebhookNotificationPayload = {
    title: '🚨 在庫切れ検知',
    message: '商品が在庫切れになりました。出品を一時停止しました。',
    fields: [
      { name: '商品', value: product.title.substring(0, 50), inline: false },
      { name: 'マーケット', value: product.marketplace, inline: true },
      { name: 'ステータス', value: 'PAUSED', inline: true },
      ...(product.sourceUrl
        ? [{ name: '仕入元URL', value: product.sourceUrl, inline: false }]
        : []),
    ],
    color: '#FFA500',
    actionUrl: product.sourceUrl,
    actionLabel: '仕入元を確認',
  };

  return sendWebhookNotification({
    type: 'STOCK_OUT',
    channel,
    payload,
    referenceId: product.productId,
    referenceType: 'PRODUCT',
  });
}

/**
 * 仕入価格変動通知（Webhook版）
 */
export async function notifyPriceChangedWebhook(product: {
  productId: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  marketplace?: string;
}): Promise<{ success: boolean; eventId: string }> {
  const channel: WebhookNotificationChannel = process.env.SLACK_WEBHOOK_URL
    ? 'SLACK'
    : process.env.DISCORD_WEBHOOK_URL
      ? 'DISCORD'
      : 'WEBHOOK';

  const direction = product.newPrice > product.oldPrice ? '上昇' : '下落';
  const isSignificant = Math.abs(product.changePercent) >= 10;

  const payload: WebhookNotificationPayload = {
    title: `💹 仕入価格${direction}${isSignificant ? '（大幅変動）' : ''}`,
    message: `「${product.title.substring(0, 40)}」の仕入価格が変動しました。`,
    fields: [
      { name: '商品', value: product.title.substring(0, 50), inline: false },
      { name: '旧価格', value: `¥${product.oldPrice.toLocaleString()}`, inline: true },
      { name: '新価格', value: `¥${product.newPrice.toLocaleString()}`, inline: true },
      {
        name: '変動率',
        value: `${product.changePercent > 0 ? '+' : ''}${product.changePercent.toFixed(1)}%`,
        inline: true,
      },
      ...(product.marketplace
        ? [{ name: 'マーケット', value: product.marketplace, inline: true }]
        : []),
    ],
    color: isSignificant ? '#FF0000' : '#FFA500',
  };

  return sendWebhookNotification({
    type: 'PRICE_CHANGED',
    channel,
    payload,
    referenceId: product.productId,
    referenceType: 'PRODUCT',
  });
}

/**
 * システムエラー通知（Webhook版）
 */
export async function notifySystemErrorWebhook(options: {
  component: string;
  errorMessage: string;
  stack?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; eventId: string }> {
  const channel: WebhookNotificationChannel = process.env.SLACK_WEBHOOK_URL
    ? 'SLACK'
    : process.env.DISCORD_WEBHOOK_URL
      ? 'DISCORD'
      : 'WEBHOOK';

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'コンポーネント', value: options.component, inline: true },
    { name: 'エラー', value: options.errorMessage.substring(0, 200), inline: false },
  ];

  if (options.stack) {
    fields.push({
      name: 'スタックトレース',
      value: '```\n' + options.stack.substring(0, 300) + '\n```',
      inline: false,
    });
  }

  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      fields.push({
        name: key,
        value: String(value).substring(0, 100),
        inline: true,
      });
    }
  }

  const payload: WebhookNotificationPayload = {
    title: '🚨 システムエラー',
    message: `${options.component}でエラーが発生しました。`,
    fields,
    color: '#FF0000',
  };

  return sendWebhookNotification({
    type: 'SYSTEM_ERROR',
    channel,
    payload,
    referenceId: options.component,
    referenceType: 'SYSTEM',
  });
}

/**
 * NotificationEventのステータス更新（アクション記録用）
 */
export async function recordNotificationAction(
  eventId: string,
  action: string,
  actionBy?: string
): Promise<void> {
  await prisma.notificationEvent.update({
    where: { id: eventId },
    data: {
      status: 'ACTION_TAKEN',
      actionTaken: action,
      actionBy,
      updatedAt: new Date(),
    },
  });

  log.info({
    type: 'notification_action_recorded',
    eventId,
    action,
    actionBy,
  });
}

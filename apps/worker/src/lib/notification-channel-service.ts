/**
 * 通知チャンネル拡張サービス
 * Phase 27: Slack/Discord/LINE/Email連携の実装
 */

import { prisma, NotificationChannelType, NotificationSeverity } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'notification-channel-service' });

// 通知ペイロード
export interface NotificationPayload {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  eventType: string;
  data?: Record<string, unknown>;
}

// チャンネル設定（外部から渡す場合）
export interface ChannelConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
  };
  discord?: {
    webhookUrl: string;
    username?: string;
    avatarUrl?: string;
  };
  line?: {
    channelAccessToken: string;
    userId?: string;
    groupId?: string;
  };
  email?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
    fromName?: string;
  };
}

// 送信結果
export interface SendResult {
  success: boolean;
  dispatchId: string;
  channelType: NotificationChannelType;
  messageId?: string;
  error?: string;
}

/**
 * 通知を送信
 */
export async function sendNotification(
  channelId: string,
  channelType: NotificationChannelType,
  payload: NotificationPayload,
  config?: ChannelConfig
): Promise<SendResult> {
  // ディスパッチレコードを作成
  const dispatch = await prisma.notificationDispatch.create({
    data: {
      channelId,
      channelType,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      severity: payload.severity || 'INFO',
      payload: (payload.data || {}) as any,
      status: 'PENDING',
    },
  });

  try {
    let messageId: string | undefined;

    // チャンネル別の送信処理
    switch (channelType) {
      case 'SLACK':
        messageId = await sendSlackNotification(channelId, payload, config?.slack);
        break;
      case 'DISCORD':
        messageId = await sendDiscordNotification(channelId, payload, config?.discord);
        break;
      case 'LINE':
        messageId = await sendLineNotification(channelId, payload, config?.line);
        break;
      case 'EMAIL':
        messageId = await sendEmailNotification(channelId, payload, config?.email);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channelType}`);
    }

    // 成功時の更新
    await prisma.notificationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'SENT',
        providerMessageId: messageId,
        sentAt: new Date(),
      },
    });

    log.info({ dispatchId: dispatch.id, channelType, eventType: payload.eventType }, 'Notification sent');

    return {
      success: true,
      dispatchId: dispatch.id,
      channelType,
      messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 失敗時の更新
    await prisma.notificationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'FAILED',
        errorMessage,
        attemptCount: { increment: 1 },
      },
    });

    log.error({ dispatchId: dispatch.id, channelType, error: errorMessage }, 'Notification failed');

    return {
      success: false,
      dispatchId: dispatch.id,
      channelType,
      error: errorMessage,
    };
  }
}

/**
 * Slack通知送信
 */
async function sendSlackNotification(
  channelId: string,
  payload: NotificationPayload,
  config?: ChannelConfig['slack']
): Promise<string> {
  const slackPayload = {
    text: payload.title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: payload.title,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
    ],
    ...(config?.channel && { channel: config.channel }),
    ...(config?.username && { username: config.username }),
    ...(config?.iconEmoji && { icon_emoji: config.iconEmoji }),
  };

  // 重要度に応じた色付きアタッチメント
  const colorMap: Record<NotificationSeverity, string> = {
    INFO: '#2196F3',
    SUCCESS: '#36a64f',
    WARNING: '#ff9800',
    ERROR: '#f44336',
  };

  if (payload.severity && payload.severity !== 'INFO') {
    (slackPayload as any).attachments = [
      {
        color: colorMap[payload.severity],
        text: `Severity: ${payload.severity}`,
      },
    ];
  }

  // チャンネル設定からwebhook URLを取得
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const webhookUrl = config?.webhookUrl || channel.webhookUrl;
  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackPayload),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
  }

  return `slack-${Date.now()}`;
}

/**
 * Discord通知送信
 */
async function sendDiscordNotification(
  channelId: string,
  payload: NotificationPayload,
  config?: ChannelConfig['discord']
): Promise<string> {
  const colorMap: Record<NotificationSeverity, number> = {
    INFO: 0x2196f3,
    SUCCESS: 0x36a64f,
    WARNING: 0xff9800,
    ERROR: 0xf44336,
  };

  const discordPayload = {
    ...(config?.username && { username: config.username }),
    ...(config?.avatarUrl && { avatar_url: config.avatarUrl }),
    embeds: [
      {
        title: payload.title,
        description: payload.message,
        color: colorMap[payload.severity || 'INFO'],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'RAKUDA Notification',
        },
      },
    ],
  };

  // チャンネル設定からwebhook URLを取得
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const webhookUrl = config?.webhookUrl || channel.webhookUrl;
  if (!webhookUrl) {
    throw new Error('Discord webhook URL not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload),
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
  }

  return `discord-${Date.now()}`;
}

/**
 * LINE通知送信
 */
async function sendLineNotification(
  channelId: string,
  payload: NotificationPayload,
  config?: ChannelConfig['line']
): Promise<string> {
  // チャンネル設定からアクセストークンを取得
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const channelAccessToken = config?.channelAccessToken || channel.token;
  if (!channelAccessToken) {
    throw new Error('LINE channel access token not configured');
  }

  // LINE Notifyの場合は簡易API使用
  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: new URLSearchParams({
      message: `\n${payload.title}\n\n${payload.message}`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE API error: ${response.status} ${errorBody}`);
  }

  return `line-${Date.now()}`;
}

/**
 * Email通知送信（シミュレーション）
 */
async function sendEmailNotification(
  channelId: string,
  payload: NotificationPayload,
  config?: ChannelConfig['email']
): Promise<string> {
  // チャンネル設定からメール設定を取得
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const toAddress = channel.email;

  // 実際のプロダクションではnodemailerやSendGridを使用
  log.info(
    {
      to: toAddress || 'unknown',
      from: config?.fromAddress || channel.smtpUser,
      subject: payload.title,
    },
    'Email notification simulated'
  );

  // シミュレーション - 実際にはSMTP送信
  await new Promise((resolve) => setTimeout(resolve, 100));

  return `email-${Date.now()}`;
}

/**
 * 複数チャンネルに一括送信
 */
export async function sendMultiChannelNotification(
  channels: { channelId: string; channelType: NotificationChannelType }[],
  payload: NotificationPayload,
  config?: ChannelConfig
): Promise<SendResult[]> {
  const results = await Promise.all(
    channels.map(({ channelId, channelType }) =>
      sendNotification(channelId, channelType, payload, config)
    )
  );

  return results;
}

/**
 * テンプレートを使用して通知を送信
 */
export async function sendTemplatedNotification(
  templateId: string,
  channelId: string,
  channelType: NotificationChannelType,
  variables: Record<string, string>,
  config?: ChannelConfig
): Promise<SendResult> {
  const template = await prisma.notificationTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  if (!template.isActive) {
    throw new Error(`Template is inactive: ${templateId}`);
  }

  // 変数を置換（チャンネル別テンプレート使用）
  let templateContent: any;
  switch (channelType) {
    case 'SLACK':
      templateContent = template.slackTemplate;
      break;
    case 'DISCORD':
      templateContent = template.discordTemplate;
      break;
    case 'LINE':
      templateContent = template.lineTemplate;
      break;
    case 'EMAIL':
      templateContent = template.emailTemplate;
      break;
  }

  if (!templateContent) {
    throw new Error(`Template does not have ${channelType} content`);
  }

  // 簡易的な変数置換
  let contentStr = JSON.stringify(templateContent);
  for (const [key, value] of Object.entries(variables)) {
    contentStr = contentStr.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  const processedContent = JSON.parse(contentStr);

  return sendNotification(
    channelId,
    channelType,
    {
      title: processedContent.title || template.name,
      message: processedContent.message || processedContent.text || '',
      eventType: template.eventType,
      data: { templateId, variables },
    },
    config
  );
}

/**
 * 失敗した通知をリトライ
 */
export async function retryFailedNotifications(
  maxRetries: number = 3,
  config?: ChannelConfig
): Promise<{ retried: number; succeeded: number; failed: number }> {
  const failedDispatches = await prisma.notificationDispatch.findMany({
    where: {
      status: 'FAILED',
      attemptCount: { lt: maxRetries },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  let succeeded = 0;
  let failed = 0;

  for (const dispatch of failedDispatches) {
    // ステータスを更新して再送信
    await prisma.notificationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'SENDING',
        nextRetryAt: null,
      },
    });

    const result = await sendNotification(
      dispatch.channelId,
      dispatch.channelType as NotificationChannelType,
      {
        title: dispatch.title,
        message: dispatch.message,
        severity: dispatch.severity as NotificationSeverity,
        eventType: dispatch.eventType,
        data: (dispatch.payload as Record<string, unknown>) || undefined,
      },
      config
    );

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  log.info(
    { retried: failedDispatches.length, succeeded, failed },
    'Retry completed'
  );

  return { retried: failedDispatches.length, succeeded, failed };
}

/**
 * 通知統計を取得
 */
export async function getNotificationStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byChannelType: Record<string, number>;
  bySeverity: Record<string, number>;
}> {
  const where: any = {};
  if (startDate) where.createdAt = { gte: startDate };
  if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

  const [total, dispatches] = await Promise.all([
    prisma.notificationDispatch.count({ where }),
    prisma.notificationDispatch.findMany({
      where,
      select: {
        status: true,
        channelType: true,
        severity: true,
      },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  const byChannelType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const dispatch of dispatches) {
    byStatus[dispatch.status] = (byStatus[dispatch.status] || 0) + 1;
    byChannelType[dispatch.channelType] = (byChannelType[dispatch.channelType] || 0) + 1;
    bySeverity[dispatch.severity] = (bySeverity[dispatch.severity] || 0) + 1;
  }

  return {
    total,
    byStatus,
    byChannelType,
    bySeverity,
  };
}

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'notification-channels' });

/**
 * 通知チャンネル一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const channels = await prisma.notificationChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // トークン/webhookUrlをマスク
    const maskedChannels = channels.map((ch) => ({
      ...ch,
      webhookUrl: ch.webhookUrl ? maskUrl(ch.webhookUrl) : null,
      token: ch.token ? '***masked***' : null,
    }));

    res.json({
      success: true,
      data: maskedChannels,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知チャンネル詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const channel = await prisma.notificationChannel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'Notification channel not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...channel,
        webhookUrl: channel.webhookUrl ? maskUrl(channel.webhookUrl) : null,
        token: channel.token ? '***masked***' : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知チャンネル作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      channel,
      name,
      webhookUrl,
      token,
      enabledTypes = [],
      minSeverity = 'INFO',
    } = req.body;

    if (!channel || !name) {
      throw new AppError(400, 'channel and name are required', 'INVALID_REQUEST');
    }

    if (!['SLACK', 'DISCORD', 'LINE', 'EMAIL'].includes(channel)) {
      throw new AppError(400, 'Invalid channel type', 'INVALID_REQUEST');
    }

    // チャンネルタイプに応じた必須フィールドチェック
    if ((channel === 'SLACK' || channel === 'DISCORD') && !webhookUrl) {
      throw new AppError(400, 'webhookUrl is required for Slack/Discord', 'INVALID_REQUEST');
    }

    if (channel === 'LINE' && !token) {
      throw new AppError(400, 'token is required for LINE', 'INVALID_REQUEST');
    }

    const newChannel = await prisma.notificationChannel.create({
      data: {
        channel,
        name,
        webhookUrl,
        token,
        enabledTypes,
        minSeverity,
      },
    });

    log.info({
      type: 'notification_channel_created',
      channelId: newChannel.id,
      channelType: channel,
    });

    res.status(201).json({
      success: true,
      data: {
        ...newChannel,
        webhookUrl: newChannel.webhookUrl ? maskUrl(newChannel.webhookUrl) : null,
        token: newChannel.token ? '***masked***' : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知チャンネル更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const channel = await prisma.notificationChannel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'Notification channel not found', 'NOT_FOUND');
    }

    const {
      name,
      webhookUrl,
      token,
      enabledTypes,
      minSeverity,
      isActive,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
    if (token !== undefined) updateData.token = token;
    if (enabledTypes !== undefined) updateData.enabledTypes = enabledTypes;
    if (minSeverity !== undefined) updateData.minSeverity = minSeverity;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedChannel = await prisma.notificationChannel.update({
      where: { id: req.params.id },
      data: updateData,
    });

    log.info({
      type: 'notification_channel_updated',
      channelId: updatedChannel.id,
    });

    res.json({
      success: true,
      data: {
        ...updatedChannel,
        webhookUrl: updatedChannel.webhookUrl ? maskUrl(updatedChannel.webhookUrl) : null,
        token: updatedChannel.token ? '***masked***' : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知チャンネル削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const channel = await prisma.notificationChannel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'Notification channel not found', 'NOT_FOUND');
    }

    await prisma.notificationChannel.delete({
      where: { id: req.params.id },
    });

    log.info({
      type: 'notification_channel_deleted',
      channelId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Notification channel deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知チャンネルテスト
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const channel = await prisma.notificationChannel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'Notification channel not found', 'NOT_FOUND');
    }

    let success = false;
    let error: string | undefined;

    try {
      switch (channel.channel) {
        case 'SLACK':
          if (channel.webhookUrl) {
            await sendTestSlack(channel.webhookUrl);
            success = true;
          }
          break;

        case 'DISCORD':
          if (channel.webhookUrl) {
            await sendTestDiscord(channel.webhookUrl);
            success = true;
          }
          break;

        case 'LINE':
          if (channel.token) {
            await sendTestLine(channel.token);
            success = true;
          }
          break;

        default:
          throw new Error('Unsupported channel type');
      }

      // 成功時、エラーカウントをリセット
      await prisma.notificationChannel.update({
        where: { id: channel.id },
        data: {
          lastUsedAt: new Date(),
          errorCount: 0,
          lastError: null,
        },
      });
    } catch (e: any) {
      error = e.message;

      // エラーを記録
      await prisma.notificationChannel.update({
        where: { id: channel.id },
        data: {
          lastError: e.message,
          errorCount: { increment: 1 },
        },
      });
    }

    log.info({
      type: 'notification_channel_test',
      channelId: channel.id,
      success,
      error,
    });

    res.json({
      success,
      message: success ? 'Test notification sent successfully' : 'Test notification failed',
      error,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なイベントタイプ一覧
 */
router.get('/config/event-types', async (req, res) => {
  const eventTypes = [
    { value: 'JOB_COMPLETE', label: 'ジョブ完了', category: 'job' },
    { value: 'JOB_FAILED', label: 'ジョブ失敗', category: 'job' },
    { value: 'ORDER_RECEIVED', label: '注文受信', category: 'order' },
    { value: 'ORDER_PAID', label: '支払い完了', category: 'order' },
    { value: 'ORDER_SHIPPED', label: '出荷完了', category: 'order' },
    { value: 'ORDER_CANCELLED', label: '注文キャンセル', category: 'order' },
    { value: 'ORDER_REFUNDED', label: '返金', category: 'order' },
    { value: 'OUT_OF_STOCK', label: '在庫切れ', category: 'inventory' },
    { value: 'PRICE_CHANGE', label: '価格変動', category: 'inventory' },
    { value: 'INVENTORY_LOW', label: '在庫低下', category: 'inventory' },
    { value: 'COMPETITOR_PRICE_CHANGE', label: '競合価格変動', category: 'inventory' },
    { value: 'LISTING_PUBLISHED', label: '出品完了', category: 'listing' },
    { value: 'LISTING_ERROR', label: '出品エラー', category: 'listing' },
    { value: 'LISTING_SOLD', label: '商品売却', category: 'listing' },
    { value: 'DAILY_REPORT', label: '日次レポート', category: 'system' },
    { value: 'SYSTEM_ERROR', label: 'システムエラー', category: 'system' },
    { value: 'EXCHANGE_RATE', label: '為替レート更新', category: 'system' },
  ];

  res.json({
    success: true,
    data: eventTypes,
  });
});

/**
 * 通知統計取得
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const channels = await prisma.notificationChannel.findMany();

    const stats = {
      totalChannels: channels.length,
      activeChannels: channels.filter((ch) => ch.isActive).length,
      byType: {
        SLACK: channels.filter((ch) => ch.channel === 'SLACK').length,
        DISCORD: channels.filter((ch) => ch.channel === 'DISCORD').length,
        LINE: channels.filter((ch) => ch.channel === 'LINE').length,
        EMAIL: channels.filter((ch) => ch.channel === 'EMAIL').length,
      },
      channelsWithErrors: channels.filter((ch) => ch.errorCount > 0).length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ヘルパー関数
// ========================================

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.length > 20) {
      return `${parsed.origin}${path.substring(0, 10)}...${path.substring(path.length - 5)}`;
    }
    return url;
  } catch {
    return '***invalid url***';
  }
}

async function sendTestSlack(webhookUrl: string): Promise<void> {
  const payload = {
    attachments: [
      {
        color: '#4CAF50',
        title: '🧪 テスト通知',
        text: 'RAKUDA通知チャンネルのテストです。この通知が見えていれば、設定は正常です。',
        footer: 'RAKUDA 越境EC自動出品システム',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }
}

async function sendTestDiscord(webhookUrl: string): Promise<void> {
  const payload = {
    embeds: [
      {
        title: '🧪 テスト通知',
        description: 'RAKUDA通知チャンネルのテストです。この通知が見えていれば、設定は正常です。',
        color: 0x4caf50,
        footer: { text: 'RAKUDA 越境EC自動出品システム' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status}`);
  }
}

async function sendTestLine(token: string): Promise<void> {
  const message = '🧪 テスト通知\n\nRAKUDA通知チャンネルのテストです。この通知が見えていれば、設定は正常です。';

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
}

export { router as notificationChannelsRouter };

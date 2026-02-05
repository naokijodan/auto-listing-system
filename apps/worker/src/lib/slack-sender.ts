import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'SlackSender' });

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string | { type: string; text: string; emoji?: boolean };
    url?: string;
    action_id?: string;
  }>;
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: {
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    url?: string;
    action_id?: string;
  };
}

interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: Array<{
    color?: string;
    blocks?: SlackBlock[];
  }>;
}

interface SlackResult {
  success: boolean;
  error?: string;
}

/**
 * Slack Webhook URLが設定されているかチェック
 */
export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_WEBHOOK_URL;
}

/**
 * Slack Webhookにメッセージを送信
 */
export async function sendSlackMessage(
  message: SlackMessage
): Promise<SlackResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    log.warn({ type: 'slack_not_configured' });
    return { success: false, error: 'Slack webhook not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    log.info({ type: 'slack_message_sent' });

    return { success: true };
  } catch (error: any) {
    log.error({
      type: 'slack_send_error',
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * テンプレートを使用してSlackメッセージを送信
 */
export async function sendTemplatedSlackMessage(
  template: string,
  data: Record<string, unknown>,
  deepLink?: string
): Promise<SlackResult> {
  const message = generateSlackMessage(template, data, deepLink);
  return sendSlackMessage(message);
}

/**
 * テンプレートからSlackメッセージを生成
 */
function generateSlackMessage(
  template: string,
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const generators: Record<string, () => SlackMessage> = {
    INVENTORY_OUT_OF_STOCK: () => generateInventoryOutOfStockMessage(data, deepLink),
    INVENTORY_OUT_OF_STOCK_BATCH: () => generateBatchMessage('在庫切れ', 'danger', data, deepLink),
    PRICE_DROP_DETECTED: () => generatePriceChangeMessage(data, deepLink),
    PRICE_DROP_DETECTED_BATCH: () => generateBatchMessage('価格変動', 'warning', data, deepLink),
    LISTING_FAILED: () => generateListingFailedMessage(data, deepLink),
    LISTING_FAILED_BATCH: () => generateBatchMessage('出品失敗', 'danger', data, deepLink),
    COMPETITOR_PRICE_CHANGE: () => generateCompetitorPriceMessage(data, deepLink),
    COMPETITOR_PRICE_CHANGE_BATCH: () => generateBatchMessage('競合価格変動', '#439FE0', data, deepLink),
    ORDER_RECEIVED: () => generateOrderReceivedMessage(data, deepLink),
    ORDER_RECEIVED_BATCH: () => generateBatchMessage('新規注文', 'good', data, deepLink),
    SCRAPE_ERROR: () => generateScrapeErrorMessage(data, deepLink),
    SCRAPE_ERROR_BATCH: () => generateBatchMessage('スクレイプエラー', 'warning', data, deepLink),
  };

  const generator = generators[template];
  if (generator) {
    return generator();
  }

  // デフォルトメッセージ
  return generateGenericMessage(template, data, deepLink);
}

// 個別テンプレート生成関数

function generateInventoryOutOfStockMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 在庫切れアラート',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*商品名:*\n${data.title || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*マーケットプレイス:*\n${data.marketplace || '不明'}`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `検出日時: ${new Date().toLocaleString('ja-JP')}`,
        },
      ],
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '商品を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_product',
        },
      ],
    });
  }

  return {
    text: `在庫切れ: ${data.title}`,
    blocks,
  };
}

function generatePriceChangeMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const changePercent = data.changePercent as number;
  const emoji = changePercent > 0 ? '📈' : '📉';

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} 価格変動アラート`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*商品名:*\n${data.title || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*変動率:*\n${changePercent > 0 ? '+' : ''}${changePercent}%`,
        },
        {
          type: 'mrkdwn',
          text: `*旧価格:*\n${data.oldPrice || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*新価格:*\n${data.newPrice || '不明'}`,
        },
      ],
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '詳細を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_details',
        },
      ],
    });
  }

  return {
    text: `価格変動: ${data.title} (${changePercent}%)`,
    blocks,
  };
}

function generateListingFailedMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '❌ 出品失敗',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*商品名:*\n${data.title || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*マーケットプレイス:*\n${data.marketplace || '不明'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*エラー内容:*\n\`\`\`${data.error || '不明なエラー'}\`\`\``,
      },
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '商品を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_product',
        },
      ],
    });
  }

  return {
    text: `出品失敗: ${data.title}`,
    blocks,
  };
}

function generateCompetitorPriceMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '👀 競合価格変動',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*商品名:*\n${data.title || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*競合価格:*\n${data.competitorPrice || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*自社価格:*\n${data.ourPrice || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*価格差:*\n${data.priceDifference || '不明'}`,
        },
      ],
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '価格を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_pricing',
        },
      ],
    });
  }

  return {
    text: `競合価格変動: ${data.title}`,
    blocks,
  };
}

function generateOrderReceivedMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 新規注文',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*注文ID:*\n${data.orderId || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*マーケットプレイス:*\n${data.marketplace || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*金額:*\n${data.total || '不明'} ${data.currency || 'USD'}`,
        },
        {
          type: 'mrkdwn',
          text: `*購入者:*\n${data.buyerUsername || '不明'}`,
        },
      ],
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '注文を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_order',
        },
      ],
    });
  }

  return {
    text: `新規注文: ${data.orderId}`,
    blocks,
  };
}

function generateScrapeErrorMessage(
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚠️ スクレイプエラー',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*ソース:*\n${data.source || '不明'}`,
        },
        {
          type: 'mrkdwn',
          text: `*URL:*\n${data.url || '不明'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*エラー:*\n\`\`\`${data.error || '不明なエラー'}\`\`\``,
      },
    },
  ];

  return {
    text: `スクレイプエラー: ${data.source}`,
    blocks,
  };
}

function generateBatchMessage(
  alertType: string,
  color: string,
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const count = data.count as number;
  const alerts = (data.alerts as Array<Record<string, unknown>>) || [];

  // 最初の5件のみ表示
  const displayAlerts = alerts.slice(0, 5);
  const alertsList = displayAlerts
    .map((a) => `• ${a.title || '不明'}`)
    .join('\n');

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🔔 ${alertType}アラート（${count}件）`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alertsList + (alerts.length > 5 ? `\n_他 ${alerts.length - 5} 件..._` : ''),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `集計期間内のアラート数: ${count}件`,
        },
      ],
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '詳細を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_all',
        },
      ],
    });
  }

  return {
    text: `${alertType}アラート: ${count}件`,
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

function generateGenericMessage(
  template: string,
  data: Record<string, unknown>,
  deepLink?: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📬 ${template}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
      },
    },
  ];

  if (deepLink) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '詳細を確認',
            emoji: true,
          },
          url: deepLink,
          action_id: 'view_details',
        },
      ],
    });
  }

  return {
    text: `アラート: ${template}`,
    blocks,
  };
}

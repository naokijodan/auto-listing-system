import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'message-sender' });

// 設定
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * eBayメッセージ送信
 */
async function sendEbayMessage(
  buyerUsername: string,
  subject: string,
  body: string,
  itemId?: string
): Promise<SendResult> {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'EBAY',
        isActive: true,
      },
    });

    if (!credential) {
      return { success: false, error: 'eBay credentials not configured' };
    }

    const credentials = credential.credentials as any;
    const accessToken = credentials.accessToken;

    if (!accessToken) {
      return { success: false, error: 'eBay access token not available' };
    }

    // eBay Post-Order API - Send Message
    // Note: 実際のAPIエンドポイントは環境により異なる
    const baseUrl = process.env.EBAY_API_BASE_URL || 'https://api.ebay.com';
    const endpoint = `${baseUrl}/post-order/v2/inquiry`;

    // eBay Message API使用（実際の実装はeBay APIドキュメント参照）
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      body: JSON.stringify({
        recipientUsername: buyerUsername,
        subject,
        body,
        itemId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'eBay message API error');

      // 認証エラーはFATAL
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `Authentication error: ${response.status}` };
      }

      return { success: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId || result.id };
  } catch (error) {
    log.error({ error }, 'Failed to send eBay message');
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Joomメッセージ送信
 */
async function sendJoomMessage(
  buyerUsername: string,
  orderId: string,
  subject: string,
  body: string
): Promise<SendResult> {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'JOOM',
        isActive: true,
      },
    });

    if (!credential) {
      return { success: false, error: 'Joom credentials not configured' };
    }

    const credentials = credential.credentials as any;
    const accessToken = credentials.accessToken;

    if (!accessToken) {
      return { success: false, error: 'Joom access token not available' };
    }

    // Joom Merchant API - Send Message
    const baseUrl = process.env.JOOM_API_BASE_URL || 'https://api-merchant.joom.com/api/v3';
    const endpoint = `${baseUrl}/orders/${orderId}/messages`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: body,
        subject,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'Joom message API error');

      // 認証エラーはFATAL
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `Authentication error: ${response.status}` };
      }

      return { success: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.message_id || result.id };
  } catch (error) {
    log.error({ error }, 'Failed to send Joom message');
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * メッセージ送信（マーケットプレイス振り分け）
 */
export async function sendMessage(messageId: string): Promise<SendResult> {
  const message = await prisma.customerMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return { success: false, error: 'Message not found' };
  }

  // 送信中ステータスに更新
  await prisma.customerMessage.update({
    where: { id: messageId },
    data: {
      status: 'SENDING',
      lastAttemptedAt: new Date(),
      sendingAttempts: { increment: 1 },
    },
  });

  let result: SendResult;

  if (message.marketplace === 'EBAY') {
    result = await sendEbayMessage(
      message.buyerUsername,
      message.subject,
      message.body
    );
  } else if (message.marketplace === 'JOOM') {
    result = await sendJoomMessage(
      message.buyerUsername,
      message.orderId || '',
      message.subject,
      message.body
    );
  } else {
    result = { success: false, error: `Unsupported marketplace: ${message.marketplace}` };
  }

  // 結果を記録
  const updatedMessage = await prisma.customerMessage.findUnique({
    where: { id: messageId },
  });

  if (result.success) {
    await prisma.customerMessage.update({
      where: { id: messageId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        marketplaceMessageId: result.messageId,
        marketplaceResponse: { ...result },
        errorMessage: null,
      },
    });

    log.info({ messageId, marketplace: message.marketplace }, 'Message sent successfully');
  } else {
    const attempts = updatedMessage?.sendingAttempts || 1;
    const isFatal = attempts >= MAX_RETRIES ||
      result.error?.includes('Authentication error') ||
      result.error?.includes('not configured');

    await prisma.customerMessage.update({
      where: { id: messageId },
      data: {
        status: isFatal ? 'FATAL' : 'FAILED',
        errorMessage: result.error,
        marketplaceResponse: { ...result },
      },
    });

    log.warn({ messageId, attempts, error: result.error, isFatal }, 'Message send failed');
  }

  return result;
}

/**
 * 保留中のメッセージを処理
 */
export async function processPendingMessages(batchSize: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const messages = await prisma.customerMessage.findMany({
    where: {
      status: 'PENDING',
    },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let successful = 0;
  let failed = 0;

  for (const message of messages) {
    const result = await sendMessage(message.id);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // レート制限対応：メッセージ間に少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    processed: messages.length,
    successful,
    failed,
  };
}

/**
 * 失敗したメッセージをリトライ
 */
export async function retryFailedMessages(batchSize: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const messages = await prisma.customerMessage.findMany({
    where: {
      status: 'FAILED',
      sendingAttempts: { lt: MAX_RETRIES },
    },
    take: batchSize,
    orderBy: { lastAttemptedAt: 'asc' },
  });

  let successful = 0;
  let failed = 0;

  for (const message of messages) {
    // 指数バックオフ
    const delay = BASE_DELAY_MS * Math.pow(2, message.sendingAttempts);
    const timeSinceLastAttempt = message.lastAttemptedAt
      ? Date.now() - message.lastAttemptedAt.getTime()
      : Infinity;

    if (timeSinceLastAttempt < delay) {
      continue; // まだ待機時間が経過していない
    }

    const result = await sendMessage(message.id);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    processed: messages.length,
    successful,
    failed,
  };
}

/**
 * メッセージ送信統計
 */
export async function getMessageStats(): Promise<{
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  fatal: number;
}> {
  const stats = await prisma.customerMessage.groupBy({
    by: ['status'],
    _count: true,
  });

  const statusMap = stats.reduce((acc, item) => {
    acc[item.status.toLowerCase()] = item._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    pending: statusMap.pending || 0,
    sending: statusMap.sending || 0,
    sent: statusMap.sent || 0,
    failed: statusMap.failed || 0,
    fatal: statusMap.fatal || 0,
  };
}

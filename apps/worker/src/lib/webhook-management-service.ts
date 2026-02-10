import { prisma, WebhookDeliveryStatus, WebhookEventType, WebhookAuthType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';

const log = logger.child({ module: 'webhook-management-service' });

interface CreateEndpointOptions {
  name: string;
  url: string;
  description?: string;
  events: WebhookEventType[];
  authType?: WebhookAuthType;
  authConfig?: Record<string, unknown>;
  signatureEnabled?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

interface DeliverPayload {
  eventType: string;
  eventId?: string;
  payload: Record<string, unknown>;
}

/**
 * Webhookエンドポイントを作成
 */
export async function createWebhookEndpoint(options: CreateEndpointOptions): Promise<{
  id: string;
  name: string;
  signatureSecret?: string;
}> {
  const signatureSecret = options.signatureEnabled !== false
    ? crypto.randomBytes(32).toString('hex')
    : null;

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      name: options.name,
      url: options.url,
      description: options.description,
      events: options.events,
      authType: options.authType || 'NONE',
      authConfig: (options.authConfig || {}) as any,
      signatureEnabled: options.signatureEnabled !== false,
      signatureSecret,
      maxRetries: options.maxRetries || 5,
      timeoutMs: options.timeoutMs || 30000,
    },
  });

  log.info({ endpointId: endpoint.id, name: endpoint.name }, 'Webhook endpoint created');

  return {
    id: endpoint.id,
    name: endpoint.name,
    signatureSecret: signatureSecret || undefined,
  };
}

/**
 * Webhookを配信
 */
export async function deliverWebhook(
  endpointId: string,
  event: DeliverPayload
): Promise<{ deliveryId: string; status: WebhookDeliveryStatus }> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    throw new Error(`Endpoint not found: ${endpointId}`);
  }

  if (!endpoint.isActive) {
    throw new Error(`Endpoint is inactive: ${endpointId}`);
  }

  const requestBody = JSON.stringify(event.payload);

  // 署名を生成
  const signature = endpoint.signatureEnabled && endpoint.signatureSecret
    ? generateSignature(requestBody, endpoint.signatureSecret, endpoint.signatureAlgorithm)
    : null;

  // 配信レコードを作成
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId,
      eventType: event.eventType,
      eventId: event.eventId,
      payload: event.payload as any,
      requestHeaders: buildRequestHeaders(endpoint, signature) as any,
      requestBody,
      signature,
      maxAttempts: endpoint.maxRetries,
      status: 'PENDING',
    },
  });

  // 非同期で配信を実行
  setImmediate(() => executeDelivery(delivery.id));

  return { deliveryId: delivery.id, status: 'PENDING' };
}

/**
 * 配信を実行
 */
async function executeDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });

  if (!delivery) {
    log.error({ deliveryId }, 'Delivery not found');
    return;
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: 'SENDING', attemptCount: { increment: 1 } },
  });

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), delivery.endpoint.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RAKUDA-Webhook/1.0',
      'X-Webhook-Delivery-Id': delivery.id,
      'X-Webhook-Event-Type': delivery.eventType,
    };

    // 署名ヘッダーを追加
    if (delivery.signature) {
      headers[delivery.endpoint.signatureHeader] = delivery.signature;
    }

    // 認証ヘッダーを追加
    addAuthHeaders(headers, delivery.endpoint);

    const response = await fetch(delivery.endpoint.url, {
      method: 'POST',
      headers,
      body: delivery.requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text();

    if (response.ok) {
      // 成功
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            responseStatus: response.status,
            responseBody,
            responseTimeMs,
            deliveredAt: new Date(),
          },
        }),
        prisma.webhookEndpoint.update({
          where: { id: delivery.endpointId },
          data: {
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 'success',
            consecutiveFailures: 0,
            totalDeliveries: { increment: 1 },
            successfulDeliveries: { increment: 1 },
          },
        }),
      ]);

      log.info({
        deliveryId,
        endpointId: delivery.endpointId,
        responseStatus: response.status,
        responseTimeMs,
      }, 'Webhook delivered successfully');
    } else {
      // HTTP エラー
      await handleDeliveryFailure(delivery, 'http_error', `HTTP ${response.status}: ${responseBody}`, responseTimeMs, response.status);
    }
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    const errorType = error.name === 'AbortError' ? 'timeout' : 'connection_error';
    await handleDeliveryFailure(delivery, errorType, error.message, responseTimeMs);
  }
}

/**
 * 配信失敗を処理
 */
async function handleDeliveryFailure(
  delivery: any,
  errorType: string,
  errorMessage: string,
  responseTimeMs: number,
  responseStatus?: number
): Promise<void> {
  const attemptCount = delivery.attemptCount + 1;
  const isExhausted = attemptCount >= delivery.maxAttempts;

  const nextRetryAt = isExhausted
    ? null
    : calculateNextRetry(attemptCount, delivery.endpoint.retryDelayMs, delivery.endpoint.retryBackoffMultiplier);

  await prisma.$transaction([
    prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: isExhausted ? 'EXHAUSTED' : 'RETRYING',
        responseStatus,
        responseTimeMs,
        errorType,
        errorMessage,
        nextRetryAt,
      },
    }),
    prisma.webhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'failed',
        consecutiveFailures: { increment: 1 },
        totalDeliveries: { increment: 1 },
        failedDeliveries: { increment: 1 },
      },
    }),
  ]);

  log.warn({
    deliveryId: delivery.id,
    endpointId: delivery.endpointId,
    errorType,
    attemptCount,
    isExhausted,
  }, 'Webhook delivery failed');

  // 連続失敗でエンドポイントを自動無効化
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: delivery.endpointId },
  });

  if (endpoint && endpoint.consecutiveFailures >= 10) {
    await disableEndpoint(endpoint.id, 'Too many consecutive failures');
  }

  // リトライスケジュール
  if (!isExhausted && nextRetryAt) {
    const delay = nextRetryAt.getTime() - Date.now();
    setTimeout(() => executeDelivery(delivery.id), delay);
  }
}

/**
 * 次回リトライ時刻を計算
 */
function calculateNextRetry(
  attemptCount: number,
  baseDelayMs: number,
  backoffMultiplier: number
): Date {
  const delay = baseDelayMs * Math.pow(backoffMultiplier, attemptCount - 1);
  const jitter = Math.random() * 1000; // 0-1秒のジッター
  const nextRetry = new Date();
  nextRetry.setMilliseconds(nextRetry.getMilliseconds() + delay + jitter);
  return nextRetry;
}

/**
 * エンドポイントを無効化
 */
export async function disableEndpoint(endpointId: string, reason: string): Promise<void> {
  await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: {
      isActive: false,
      disabledAt: new Date(),
      disabledReason: reason,
    },
  });

  log.warn({ endpointId, reason }, 'Webhook endpoint disabled');
}

/**
 * エンドポイントを有効化
 */
export async function enableEndpoint(endpointId: string): Promise<void> {
  await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: {
      isActive: true,
      disabledAt: null,
      disabledReason: null,
      consecutiveFailures: 0,
    },
  });

  log.info({ endpointId }, 'Webhook endpoint enabled');
}

/**
 * 受信Webhookの署名を検証
 */
export async function verifyIncomingWebhook(
  provider: string,
  payload: string,
  signature: string,
  timestamp?: string
): Promise<{ valid: boolean; error?: string }> {
  const secret = await prisma.webhookSecret.findUnique({
    where: { provider },
  });

  if (!secret) {
    return { valid: false, error: `No secret configured for provider: ${provider}` };
  }

  if (!secret.isActive) {
    return { valid: false, error: 'Webhook secret is inactive' };
  }

  // タイムスタンプ検証
  if (secret.verifyTimestamp && timestamp) {
    const timestampDate = new Date(parseInt(timestamp) * 1000);
    const now = new Date();
    const diff = Math.abs(now.getTime() - timestampDate.getTime()) / 1000;

    if (diff > secret.timestampToleranceSeconds) {
      return { valid: false, error: 'Timestamp too old' };
    }
  }

  // 署名検証
  const expectedSignature = generateSignature(
    timestamp ? `${timestamp}.${payload}` : payload,
    secret.secret,
    secret.algorithm
  );

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (isValid) {
    await prisma.webhookSecret.update({
      where: { provider },
      data: { lastVerifiedAt: new Date() },
    });
  }

  return { valid: isValid, error: isValid ? undefined : 'Invalid signature' };
}

/**
 * Webhookシークレットを登録/更新
 */
export async function upsertWebhookSecret(options: {
  provider: string;
  secret: string;
  algorithm?: string;
  headerName?: string;
  verifyTimestamp?: boolean;
  timestampToleranceSeconds?: number;
}): Promise<void> {
  await prisma.webhookSecret.upsert({
    where: { provider: options.provider },
    update: {
      secret: options.secret,
      algorithm: options.algorithm || 'sha256',
      headerName: options.headerName || 'X-Webhook-Signature',
      verifyTimestamp: options.verifyTimestamp ?? true,
      timestampToleranceSeconds: options.timestampToleranceSeconds || 300,
      isActive: true,
    },
    create: {
      provider: options.provider,
      secret: options.secret,
      algorithm: options.algorithm || 'sha256',
      headerName: options.headerName || 'X-Webhook-Signature',
      verifyTimestamp: options.verifyTimestamp ?? true,
      timestampToleranceSeconds: options.timestampToleranceSeconds || 300,
    },
  });

  log.info({ provider: options.provider }, 'Webhook secret upserted');
}

/**
 * 失敗した配信をリトライ
 */
export async function retryFailedDeliveries(): Promise<number> {
  const now = new Date();

  const pendingRetries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'RETRYING',
      nextRetryAt: { lte: now },
    },
    take: 100,
  });

  for (const delivery of pendingRetries) {
    setImmediate(() => executeDelivery(delivery.id));
  }

  log.info({ count: pendingRetries.length }, 'Retrying failed deliveries');

  return pendingRetries.length;
}

/**
 * 配信統計を取得
 */
export async function getDeliveryStats(endpointId?: string, days: number = 7): Promise<{
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: string;
  avgResponseTime: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    createdAt: { gte: startDate },
  };

  if (endpointId) {
    where.endpointId = endpointId;
  }

  const [total, successful, failed, avgResponse] = await Promise.all([
    prisma.webhookDelivery.count({ where }),
    prisma.webhookDelivery.count({
      where: { ...where, status: 'DELIVERED' },
    }),
    prisma.webhookDelivery.count({
      where: { ...where, status: { in: ['FAILED', 'EXHAUSTED'] } },
    }),
    prisma.webhookDelivery.aggregate({
      where: { ...where, responseTimeMs: { not: null } },
      _avg: { responseTimeMs: true },
    }),
  ]);

  return {
    totalDeliveries: total,
    successfulDeliveries: successful,
    failedDeliveries: failed,
    successRate: total > 0 ? ((successful / total) * 100).toFixed(1) + '%' : '0%',
    avgResponseTime: avgResponse._avg.responseTimeMs || 0,
  };
}

/**
 * イベントを全登録エンドポイントに配信
 */
export async function broadcastEvent(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
  eventId?: string
): Promise<{ deliveryCount: number; deliveryIds: string[] }> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
      events: { has: eventType },
    },
  });

  const deliveryIds: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const result = await deliverWebhook(endpoint.id, {
        eventType,
        eventId,
        payload,
      });
      deliveryIds.push(result.deliveryId);
    } catch (error) {
      log.error({ endpointId: endpoint.id, error }, 'Failed to queue delivery');
    }
  }

  log.info({
    eventType,
    endpointCount: endpoints.length,
    deliveryCount: deliveryIds.length,
  }, 'Event broadcasted');

  return { deliveryCount: deliveryIds.length, deliveryIds };
}

// ヘルパー関数

function generateSignature(payload: string, secret: string, algorithm: string): string {
  return crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
}

function buildRequestHeaders(
  endpoint: any,
  signature: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'RAKUDA-Webhook/1.0',
  };

  if (signature) {
    headers[endpoint.signatureHeader] = signature;
  }

  return headers;
}

function addAuthHeaders(headers: Record<string, string>, endpoint: any): void {
  const authConfig = endpoint.authConfig as Record<string, string>;

  switch (endpoint.authType) {
    case 'BASIC':
      const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      break;

    case 'BEARER':
      headers['Authorization'] = `Bearer ${authConfig.token}`;
      break;

    case 'API_KEY':
      const headerName = authConfig.headerName || 'X-API-Key';
      headers[headerName] = authConfig.apiKey;
      break;

    case 'HMAC':
      // HMACは別途署名で処理
      break;

    case 'CUSTOM':
      if (authConfig.headers) {
        Object.assign(headers, authConfig.headers);
      }
      break;
  }
}

import { Router } from 'express';
import { prisma, WebhookEventType, WebhookAuthType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import * as crypto from 'crypto';

const router = Router();
const log = logger.child({ module: 'webhook-endpoints' });

/**
 * エンドポイント一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { isActive, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [endpoints, total] = await Promise.all([
      prisma.webhookEndpoint.findMany({
        where,
        select: {
          id: true,
          name: true,
          url: true,
          description: true,
          events: true,
          authType: true,
          signatureEnabled: true,
          isActive: true,
          lastDeliveryAt: true,
          lastDeliveryStatus: true,
          consecutiveFailures: true,
          totalDeliveries: true,
          successfulDeliveries: true,
          failedDeliveries: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookEndpoint.count({ where }),
    ]);

    res.json({
      success: true,
      data: endpoints,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンドポイント詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
      include: {
        deliveries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            eventType: true,
            status: true,
            responseStatus: true,
            responseTimeMs: true,
            attemptCount: true,
            deliveredAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!endpoint) {
      throw new AppError(404, 'Endpoint not found', 'NOT_FOUND');
    }

    // シークレットはマスク
    const safeEndpoint = {
      ...endpoint,
      signatureSecret: endpoint.signatureSecret ? '********' : null,
      authConfig: endpoint.authConfig ? { configured: true } : {},
    };

    res.json({
      success: true,
      data: safeEndpoint,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンドポイント作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      url,
      description,
      events,
      authType = 'NONE',
      authConfig = {},
      signatureEnabled = true,
      maxRetries = 5,
      retryDelayMs = 1000,
      retryBackoffMultiplier = 2.0,
      timeoutMs = 30000,
    } = req.body;

    if (!name || !url) {
      throw new AppError(400, 'name and url are required', 'INVALID_INPUT');
    }

    if (!events || events.length === 0) {
      throw new AppError(400, 'At least one event is required', 'INVALID_INPUT');
    }

    // イベントタイプを検証
    const validEvents = Object.values(WebhookEventType);
    for (const event of events) {
      if (!validEvents.includes(event)) {
        throw new AppError(400, `Invalid event type: ${event}`, 'INVALID_INPUT');
      }
    }

    // 認証タイプを検証
    const validAuthTypes = Object.values(WebhookAuthType);
    if (!validAuthTypes.includes(authType)) {
      throw new AppError(400, `Invalid auth type: ${authType}`, 'INVALID_INPUT');
    }

    const signatureSecret = signatureEnabled
      ? crypto.randomBytes(32).toString('hex')
      : null;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name,
        url,
        description,
        events,
        authType,
        authConfig,
        signatureEnabled,
        signatureSecret,
        maxRetries,
        retryDelayMs,
        retryBackoffMultiplier,
        timeoutMs,
      },
    });

    log.info({ endpointId: endpoint.id, name, url }, 'Webhook endpoint created');

    res.status(201).json({
      success: true,
      data: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
        signatureSecret: signatureSecret, // 一度だけ返す
      },
      message: signatureSecret
        ? 'Save the signature secret securely. It will not be shown again.'
        : undefined,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンドポイント更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      url,
      description,
      events,
      authType,
      authConfig,
      maxRetries,
      retryDelayMs,
      retryBackoffMultiplier,
      timeoutMs,
      isActive,
    } = req.body;

    const existing = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'Endpoint not found', 'NOT_FOUND');
    }

    // イベントタイプを検証
    if (events) {
      const validEvents = Object.values(WebhookEventType);
      for (const event of events) {
        if (!validEvents.includes(event)) {
          throw new AppError(400, `Invalid event type: ${event}`, 'INVALID_INPUT');
        }
      }
    }

    const endpoint = await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(events !== undefined && { events }),
        ...(authType !== undefined && { authType }),
        ...(authConfig !== undefined && { authConfig }),
        ...(maxRetries !== undefined && { maxRetries }),
        ...(retryDelayMs !== undefined && { retryDelayMs }),
        ...(retryBackoffMultiplier !== undefined && { retryBackoffMultiplier }),
        ...(timeoutMs !== undefined && { timeoutMs }),
        ...(isActive !== undefined && {
          isActive,
          ...(isActive && {
            disabledAt: null,
            disabledReason: null,
            consecutiveFailures: 0,
          }),
        }),
      },
    });

    log.info({ endpointId: endpoint.id }, 'Webhook endpoint updated');

    res.json({
      success: true,
      data: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        isActive: endpoint.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンドポイント削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.webhookEndpoint.delete({
      where: { id: req.params.id },
    });

    log.info({ endpointId: req.params.id }, 'Webhook endpoint deleted');

    res.json({
      success: true,
      message: 'Endpoint deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 署名シークレットを再生成
 */
router.post('/:id/rotate-secret', async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
    });

    if (!endpoint) {
      throw new AppError(404, 'Endpoint not found', 'NOT_FOUND');
    }

    if (!endpoint.signatureEnabled) {
      throw new AppError(400, 'Signature is not enabled for this endpoint', 'INVALID_OPERATION');
    }

    const newSecret = crypto.randomBytes(32).toString('hex');

    await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: { signatureSecret: newSecret },
    });

    log.info({ endpointId: req.params.id }, 'Signature secret rotated');

    res.json({
      success: true,
      data: {
        signatureSecret: newSecret,
      },
      message: 'Save the new signature secret securely. It will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テスト配信
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
    });

    if (!endpoint) {
      throw new AppError(404, 'Endpoint not found', 'NOT_FOUND');
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from RAKUDA',
        endpointId: endpoint.id,
        endpointName: endpoint.name,
      },
    };

    const requestBody = JSON.stringify(testPayload);

    // 署名を生成
    const signature = endpoint.signatureEnabled && endpoint.signatureSecret
      ? crypto
          .createHmac(endpoint.signatureAlgorithm, endpoint.signatureSecret)
          .update(requestBody)
          .digest('hex')
      : null;

    // テスト配信を記録
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventType: 'TEST',
        payload: testPayload,
        requestHeaders: {},
        requestBody,
        signature,
        status: 'PENDING',
      },
    });

    // 配信を実行
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RAKUDA-Webhook/1.0',
        'X-Webhook-Delivery-Id': delivery.id,
        'X-Webhook-Event-Type': 'TEST',
      };

      if (signature) {
        headers[endpoint.signatureHeader] = signature;
      }

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseTimeMs = Date.now() - startTime;
      const responseBody = await response.text();

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'DELIVERED' : 'FAILED',
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          responseTimeMs,
          deliveredAt: response.ok ? new Date() : null,
          errorMessage: response.ok ? null : `HTTP ${response.status}`,
        },
      });

      res.json({
        success: response.ok,
        data: {
          deliveryId: delivery.id,
          responseStatus: response.status,
          responseTimeMs,
          responseBody: responseBody.substring(0, 500),
        },
        message: response.ok ? 'Test webhook delivered successfully' : 'Test webhook failed',
      });
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          responseTimeMs,
          errorType: error.name === 'AbortError' ? 'timeout' : 'connection_error',
          errorMessage: error.message,
        },
      });

      res.json({
        success: false,
        data: {
          deliveryId: delivery.id,
          errorType: error.name === 'AbortError' ? 'timeout' : 'connection_error',
          errorMessage: error.message,
          responseTimeMs,
        },
        message: 'Test webhook failed',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 配信履歴取得
 */
router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = { endpointId: req.params.id };
    if (status) where.status = status;

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        select: {
          id: true,
          eventType: true,
          eventId: true,
          status: true,
          attemptCount: true,
          responseStatus: true,
          responseTimeMs: true,
          errorType: true,
          errorMessage: true,
          nextRetryAt: true,
          deliveredAt: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    res.json({
      success: true,
      data: deliveries,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 配信詳細取得
 */
router.get('/:id/deliveries/:deliveryId', async (req, res, next) => {
  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: req.params.deliveryId },
    });

    if (!delivery) {
      throw new AppError(404, 'Delivery not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 失敗した配信をリトライ
 */
router.post('/:id/deliveries/:deliveryId/retry', async (req, res, next) => {
  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: req.params.deliveryId },
      include: { endpoint: true },
    });

    if (!delivery) {
      throw new AppError(404, 'Delivery not found', 'NOT_FOUND');
    }

    if (!['FAILED', 'EXHAUSTED'].includes(delivery.status)) {
      throw new AppError(400, 'Can only retry failed deliveries', 'INVALID_OPERATION');
    }

    // リトライ用に更新
    await prisma.webhookDelivery.update({
      where: { id: req.params.deliveryId },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        maxAttempts: delivery.maxAttempts,
        nextRetryAt: null,
        errorType: null,
        errorMessage: null,
      },
    });

    log.info({ deliveryId: req.params.deliveryId }, 'Delivery queued for retry');

    res.json({
      success: true,
      message: 'Delivery queued for retry',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エンドポイント統計
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
    });

    if (!endpoint) {
      throw new AppError(404, 'Endpoint not found', 'NOT_FOUND');
    }

    const where = {
      endpointId: req.params.id,
      createdAt: { gte: startDate },
    };

    const [total, delivered, failed, avgResponse, byEventType] = await Promise.all([
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
      prisma.webhookDelivery.groupBy({
        by: ['eventType'],
        where,
        _count: true,
        orderBy: { _count: { eventType: 'desc' } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        summary: {
          totalDeliveries: total,
          successfulDeliveries: delivered,
          failedDeliveries: failed,
          successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : '0%',
          avgResponseTime: avgResponse._avg.responseTimeMs?.toFixed(0) || 0,
        },
        byEventType: byEventType.map(e => ({
          eventType: e.eventType,
          count: e._count,
        })),
        endpoint: {
          totalDeliveries: endpoint.totalDeliveries,
          successfulDeliveries: endpoint.successfulDeliveries,
          failedDeliveries: endpoint.failedDeliveries,
          consecutiveFailures: endpoint.consecutiveFailures,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なイベントタイプ一覧
 */
router.get('/meta/event-types', async (_req, res, next) => {
  try {
    const eventTypes = Object.values(WebhookEventType);
    const authTypes = Object.values(WebhookAuthType);

    res.json({
      success: true,
      data: {
        eventTypes,
        authTypes,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhookシークレット管理
 */
router.get('/secrets', async (req, res, next) => {
  try {
    const secrets = await prisma.webhookSecret.findMany({
      select: {
        id: true,
        provider: true,
        algorithm: true,
        headerName: true,
        verifyTimestamp: true,
        timestampToleranceSeconds: true,
        isActive: true,
        lastVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { provider: 'asc' },
    });

    res.json({
      success: true,
      data: secrets,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhookシークレット登録/更新
 */
router.put('/secrets/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const {
      secret,
      algorithm = 'sha256',
      headerName = 'X-Webhook-Signature',
      verifyTimestamp = true,
      timestampToleranceSeconds = 300,
    } = req.body;

    if (!secret) {
      throw new AppError(400, 'secret is required', 'INVALID_INPUT');
    }

    await prisma.webhookSecret.upsert({
      where: { provider },
      update: {
        secret,
        algorithm,
        headerName,
        verifyTimestamp,
        timestampToleranceSeconds,
        isActive: true,
      },
      create: {
        provider,
        secret,
        algorithm,
        headerName,
        verifyTimestamp,
        timestampToleranceSeconds,
      },
    });

    log.info({ provider }, 'Webhook secret upserted');

    res.json({
      success: true,
      message: `Webhook secret for ${provider} saved`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhookシークレット削除
 */
router.delete('/secrets/:provider', async (req, res, next) => {
  try {
    await prisma.webhookSecret.delete({
      where: { provider: req.params.provider },
    });

    log.info({ provider: req.params.provider }, 'Webhook secret deleted');

    res.json({
      success: true,
      message: 'Webhook secret deleted',
    });
  } catch (error) {
    next(error);
  }
});

export { router as webhookEndpointsRouter };

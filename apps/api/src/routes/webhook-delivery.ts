import { Hono } from 'hono';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import crypto from 'crypto';

const app = new Hono();

// ========================================
// スキーマ定義
// ========================================

const createEndpointSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url(),
  events: z.array(z.string()).default([]),
  headers: z.record(z.string()).default({}),
  secret: z.string().optional(),
  retryPolicy: z.enum(['NONE', 'LINEAR', 'EXPONENTIAL', 'FIXED']).default('EXPONENTIAL'),
  maxRetries: z.number().int().min(0).max(10).default(5),
  timeoutMs: z.number().int().min(1000).max(60000).default(30000),
});

const createEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  payloadSchema: z.record(z.any()).default({}),
  samplePayload: z.record(z.any()).default({}),
});

const triggerWebhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.any()),
  endpointIds: z.array(z.string()).optional(),
});

// ========================================
// 統計情報
// ========================================

app.get('/stats', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const [
    totalEndpoints,
    activeEndpoints,
    totalDeliveries,
    pendingDeliveries,
    deliveredCount,
    failedCount,
    totalEvents,
    recentDeliveries,
  ] = await Promise.all([
    prisma.webhookEndpoint.count({ where: { organizationId } }),
    prisma.webhookEndpoint.count({ where: { organizationId, isActive: true } }),
    prisma.webhookDelivery.count({
      where: { endpoint: { organizationId } },
    }),
    prisma.webhookDelivery.count({
      where: { endpoint: { organizationId }, status: 'PENDING' },
    }),
    prisma.webhookDelivery.count({
      where: { endpoint: { organizationId }, status: 'DELIVERED' },
    }),
    prisma.webhookDelivery.count({
      where: { endpoint: { organizationId }, status: { in: ['FAILED', 'EXHAUSTED'] } },
    }),
    prisma.webhookEvent.count({ where: { organizationId } }),
    prisma.webhookDelivery.findMany({
      where: { endpoint: { organizationId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        endpoint: { select: { name: true, url: true } },
      },
    }),
  ]);

  // 成功率
  const successRate = totalDeliveries > 0
    ? ((deliveredCount / totalDeliveries) * 100).toFixed(1)
    : 0;

  // イベント別配信数
  const deliveriesByEvent = await prisma.webhookDelivery.groupBy({
    by: ['event'],
    where: { endpoint: { organizationId } },
    _count: true,
    orderBy: { _count: { event: 'desc' } },
    take: 10,
  });

  return c.json({
    endpoints: {
      total: totalEndpoints,
      active: activeEndpoints,
    },
    deliveries: {
      total: totalDeliveries,
      pending: pendingDeliveries,
      delivered: deliveredCount,
      failed: failedCount,
      successRate,
    },
    events: {
      total: totalEvents,
      byEvent: deliveriesByEvent,
    },
    recentDeliveries,
  });
});

// ========================================
// エンドポイント管理
// ========================================

app.get('/endpoints', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { isActive } = c.req.query();

  const where: any = { organizationId };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const endpoints = await prisma.webhookEndpoint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  });

  return c.json({ endpoints });
});

app.post('/endpoints', zValidator('json', createEndpointSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // シークレット自動生成
  const secret = data.secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      ...data,
      organizationId,
      secret,
    },
  });

  // ログ記録
  await prisma.webhookLog.create({
    data: {
      organizationId,
      endpointId: endpoint.id,
      action: 'ENDPOINT_CREATED',
      level: 'INFO',
      message: `Webhook endpoint "${endpoint.name}" created`,
      details: { url: endpoint.url, events: endpoint.events },
    },
  });

  return c.json({ endpoint }, 201);
});

app.get('/endpoints/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id, organizationId },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!endpoint) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }

  return c.json({ endpoint });
});

app.put('/endpoints/:id', zValidator('json', createEndpointSchema.partial()), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const endpoint = await prisma.webhookEndpoint.update({
    where: { id },
    data,
  });

  await prisma.webhookLog.create({
    data: {
      organizationId,
      endpointId: endpoint.id,
      action: 'ENDPOINT_UPDATED',
      level: 'INFO',
      message: `Webhook endpoint "${endpoint.name}" updated`,
      details: { updates: data },
    },
  });

  return c.json({ endpoint });
});

app.delete('/endpoints/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id, organizationId },
  });

  if (endpoint) {
    await prisma.webhookLog.create({
      data: {
        organizationId,
        action: 'ENDPOINT_DELETED',
        level: 'INFO',
        message: `Webhook endpoint "${endpoint.name}" deleted`,
        details: { endpointId: id },
      },
    });
  }

  await prisma.webhookEndpoint.delete({
    where: { id },
  });

  return c.json({ success: true });
});

app.post('/endpoints/:id/toggle', async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }

  const endpoint = await prisma.webhookEndpoint.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json({ endpoint });
});

app.post('/endpoints/:id/rotate-secret', async (c) => {
  const { id } = c.req.param();

  const newSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  const endpoint = await prisma.webhookEndpoint.update({
    where: { id },
    data: { secret: newSecret },
  });

  return c.json({ endpoint, secret: newSecret });
});

app.post('/endpoints/:id/test', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id, organizationId },
  });

  if (!endpoint) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }

  // テストペイロード
  const testPayload = {
    event: 'test.ping',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook delivery',
      endpointId: endpoint.id,
    },
  };

  // 配信を作成して送信
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event: 'test.ping',
      payload: testPayload,
      status: 'PENDING',
    },
  });

  // 非同期で送信
  deliverWebhook(delivery.id).catch(console.error);

  return c.json({ delivery, message: 'Test webhook queued' });
});

// ========================================
// 配信管理
// ========================================

app.get('/deliveries', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { endpointId, status, event, page = '1', limit = '20' } = c.req.query();

  const where: any = { endpoint: { organizationId } };
  if (endpointId) where.endpointId = endpointId;
  if (status) where.status = status;
  if (event) where.event = event;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        endpoint: { select: { name: true, url: true } },
      },
    }),
    prisma.webhookDelivery.count({ where }),
  ]);

  return c.json({
    deliveries,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.get('/deliveries/:id', async (c) => {
  const { id } = c.req.param();

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id },
    include: {
      endpoint: true,
    },
  });

  if (!delivery) {
    return c.json({ error: 'Delivery not found' }, 404);
  }

  return c.json({ delivery });
});

app.post('/deliveries/:id/retry', async (c) => {
  const { id } = c.req.param();

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id },
  });

  if (!delivery) {
    return c.json({ error: 'Delivery not found' }, 404);
  }

  // リセットしてリトライ
  await prisma.webhookDelivery.update({
    where: { id },
    data: {
      status: 'PENDING',
      attempts: 0,
      nextRetryAt: null,
      errorMessage: null,
    },
  });

  deliverWebhook(id).catch(console.error);

  return c.json({ message: 'Retry queued' });
});

// ========================================
// イベント管理
// ========================================

app.get('/events', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { category, isActive } = c.req.query();

  const where: any = { organizationId };
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const events = await prisma.webhookEvent.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // カテゴリでグループ化
  const grouped = events.reduce((acc: Record<string, typeof events>, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {});

  return c.json({ events, grouped });
});

app.post('/events', zValidator('json', createEventSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const event = await prisma.webhookEvent.create({
    data: {
      ...data,
      organizationId,
    },
  });

  return c.json({ event }, 201);
});

app.get('/events/categories', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const categories = await prisma.webhookEvent.findMany({
    where: { organizationId },
    distinct: ['category'],
    select: { category: true },
  });

  return c.json({ categories: categories.map(c => c.category) });
});

// ========================================
// Webhookトリガー
// ========================================

app.post('/trigger', zValidator('json', triggerWebhookSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // 対象エンドポイントを取得
  let endpoints;
  if (data.endpointIds && data.endpointIds.length > 0) {
    endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        id: { in: data.endpointIds },
        organizationId,
        isActive: true,
      },
    });
  } else {
    endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        organizationId,
        isActive: true,
        events: { array_contains: [data.event] },
      },
    });
  }

  // 各エンドポイントに配信を作成
  const deliveries = await Promise.all(
    endpoints.map(endpoint =>
      prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          event: data.event,
          payload: data.payload,
          status: 'PENDING',
        },
      })
    )
  );

  // 非同期で配信
  deliveries.forEach(delivery => {
    deliverWebhook(delivery.id).catch(console.error);
  });

  return c.json({
    triggered: deliveries.length,
    deliveryIds: deliveries.map(d => d.id),
  });
});

// ========================================
// ログ
// ========================================

app.get('/logs', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { endpointId, level, page = '1', limit = '50' } = c.req.query();

  const where: any = { organizationId };
  if (endpointId) where.endpointId = endpointId;
  if (level) where.level = level;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.webhookLog.count({ where }),
  ]);

  return c.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ========================================
// デフォルトイベント設定
// ========================================

app.post('/setup-defaults', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const defaultEvents = [
    // 注文イベント
    { name: 'order.created', category: 'orders', description: '新規注文作成' },
    { name: 'order.paid', category: 'orders', description: '注文支払い完了' },
    { name: 'order.shipped', category: 'orders', description: '注文発送完了' },
    { name: 'order.delivered', category: 'orders', description: '注文配達完了' },
    { name: 'order.cancelled', category: 'orders', description: '注文キャンセル' },
    // 商品イベント
    { name: 'product.created', category: 'products', description: '商品作成' },
    { name: 'product.updated', category: 'products', description: '商品更新' },
    { name: 'product.deleted', category: 'products', description: '商品削除' },
    // 出品イベント
    { name: 'listing.created', category: 'listings', description: '出品作成' },
    { name: 'listing.published', category: 'listings', description: '出品公開' },
    { name: 'listing.sold', category: 'listings', description: '出品売却' },
    // 在庫イベント
    { name: 'inventory.low', category: 'inventory', description: '在庫低下' },
    { name: 'inventory.out', category: 'inventory', description: '在庫切れ' },
    // システムイベント
    { name: 'test.ping', category: 'system', description: 'テストPing' },
  ];

  let created = 0;
  for (const event of defaultEvents) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { organizationId_name: { organizationId, name: event.name } },
    });
    if (!existing) {
      await prisma.webhookEvent.create({
        data: { ...event, organizationId },
      });
      created++;
    }
  }

  return c.json({ success: true, created });
});

// ========================================
// ヘルパー関数
// ========================================

async function deliverWebhook(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });

  if (!delivery || !delivery.endpoint.isActive) {
    return;
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: 'PROCESSING' },
  });

  const startTime = Date.now();

  try {
    // シグネチャ生成
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(delivery.payload);
    const signaturePayload = `${timestamp}.${payloadString}`;
    const signature = delivery.endpoint.secret
      ? crypto.createHmac('sha256', delivery.endpoint.secret).update(signaturePayload).digest('hex')
      : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Event': delivery.event,
      'X-Webhook-Delivery-Id': delivery.id,
      ...(delivery.endpoint.headers as Record<string, string>),
    };

    // 実際のHTTPリクエスト（シミュレーション）
    // 本番ではfetchやaxiosを使用
    const response = await simulateWebhookRequest(delivery.endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      timeout: delivery.endpoint.timeoutMs,
    });

    const latencyMs = Date.now() - startTime;

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        responseStatus: response.status,
        responseHeaders: response.headers,
        responseBody: response.body,
        latencyMs,
        deliveredAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'DELIVERED',
        successCount: { increment: 1 },
      },
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const attempts = delivery.attempts + 1;

    const shouldRetry = attempts < delivery.endpoint.maxRetries &&
      delivery.endpoint.retryPolicy !== 'NONE';

    let nextRetryAt: Date | null = null;
    if (shouldRetry) {
      const delay = calculateRetryDelay(
        delivery.endpoint.retryPolicy,
        attempts
      );
      nextRetryAt = new Date(Date.now() + delay);
    }

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: shouldRetry ? 'RETRYING' : 'EXHAUSTED',
        errorMessage: error.message,
        latencyMs,
        attempts,
        nextRetryAt,
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: shouldRetry ? 'RETRYING' : 'FAILED',
        failureCount: { increment: 1 },
      },
    });

    // リトライをスケジュール
    if (shouldRetry && nextRetryAt) {
      setTimeout(() => deliverWebhook(deliveryId), nextRetryAt.getTime() - Date.now());
    }
  }
}

async function simulateWebhookRequest(url: string, options: any): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}> {
  // シミュレーション（90%成功）
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  if (Math.random() < 0.9) {
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };
  } else {
    throw new Error('Connection timeout');
  }
}

function calculateRetryDelay(policy: string, attempt: number): number {
  const baseDelay = 1000; // 1秒

  switch (policy) {
    case 'LINEAR':
      return baseDelay * attempt;
    case 'EXPONENTIAL':
      return baseDelay * Math.pow(2, attempt - 1);
    case 'FIXED':
      return baseDelay * 5; // 5秒固定
    default:
      return baseDelay;
  }
}

export const webhookDeliveryRouter = app;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

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
});

// ========================================
// 統計情報
// ========================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      totalEndpoints: 10,
      activeEndpoints: 8,
      totalDeliveries: 50000,
      successfulDeliveries: 48500,
      failedDeliveries: 1500,
      averageLatency: 250,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ========================================
// エンドポイント管理
// ========================================

router.get('/endpoints', async (req: Request, res: Response) => {
  try {
    res.json({
      endpoints: [
        { id: '1', name: 'Order Webhook', url: 'https://example.com/webhook', status: 'ACTIVE', events: ['order.created', 'order.updated'] },
        { id: '2', name: 'Product Webhook', url: 'https://example.com/products', status: 'ACTIVE', events: ['product.created'] },
      ],
      total: 2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

router.post('/endpoints', async (req: Request, res: Response) => {
  try {
    const parsed = createEndpointSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid endpoint', details: parsed.error.issues });
    }

    const secret = parsed.data.secret || crypto.randomBytes(32).toString('hex');

    res.status(201).json({
      id: `endpoint_${Date.now()}`,
      ...parsed.data,
      secret,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

router.get('/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      name: 'Order Webhook',
      url: 'https://example.com/webhook',
      events: ['order.created', 'order.updated'],
      status: 'ACTIVE',
      retryPolicy: 'EXPONENTIAL',
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch endpoint' });
  }
});

router.put('/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = createEndpointSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid update', details: parsed.error.issues });
    }

    res.json({
      id,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

router.delete('/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

router.post('/endpoints/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      statusCode: 200,
      latency: 150,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to test endpoint' });
  }
});

router.post('/endpoints/:id/rotate-secret', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newSecret = crypto.randomBytes(32).toString('hex');

    res.json({
      id,
      secret: newSecret,
      rotatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
});

// ========================================
// 配信履歴
// ========================================

router.get('/deliveries', async (req: Request, res: Response) => {
  try {
    res.json({
      deliveries: [
        { id: '1', endpointId: 'endpoint_1', event: 'order.created', status: 'SUCCESS', statusCode: 200 },
        { id: '2', endpointId: 'endpoint_1', event: 'order.updated', status: 'FAILED', statusCode: 500 },
      ],
      total: 2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

router.get('/deliveries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      endpointId: 'endpoint_1',
      event: 'order.created',
      payload: { orderId: '12345', status: 'confirmed' },
      status: 'SUCCESS',
      statusCode: 200,
      latency: 150,
      attempts: 1,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery' });
  }
});

router.post('/deliveries/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      status: 'PENDING',
      retriedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

// ========================================
// イベントタイプ
// ========================================

router.get('/events', async (req: Request, res: Response) => {
  try {
    res.json({
      events: [
        { name: 'order.created', category: 'orders', description: 'Fired when an order is created' },
        { name: 'order.updated', category: 'orders', description: 'Fired when an order is updated' },
        { name: 'product.created', category: 'products', description: 'Fired when a product is created' },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/events/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    res.json({
      name,
      category: 'orders',
      description: 'Fired when an order is created',
      payloadSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          status: { type: 'string' },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ========================================
// 設定
// ========================================

router.get('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      defaultRetryPolicy: 'EXPONENTIAL',
      defaultMaxRetries: 5,
      defaultTimeoutMs: 30000,
      enableSignatureVerification: true,
      retentionDays: 30,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as webhookDeliveryRouter };

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 161: eBay Webhook Manager（Webhook管理）
// ============================================================

// Webhookエンドポイントモック
const mockWebhooks = [
  {
    id: 'webhook_1',
    name: '注文通知 Webhook',
    url: 'https://api.example.com/webhooks/orders',
    events: ['ORDER_CREATED', 'ORDER_SHIPPED', 'ORDER_DELIVERED'],
    secret: 'whsec_***************',
    status: 'ACTIVE',
    version: 'v1',
    headers: { 'X-Custom-Header': 'value' },
    retryPolicy: { maxRetries: 3, retryInterval: 60 },
    rateLimiting: { requestsPerMinute: 100 },
    lastTriggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    successRate: 98.5,
    totalDeliveries: 1250,
    failedDeliveries: 19,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'webhook_2',
    name: '在庫アラート Webhook',
    url: 'https://api.example.com/webhooks/inventory',
    events: ['INVENTORY_LOW', 'INVENTORY_OUT', 'INVENTORY_REPLENISHED'],
    secret: 'whsec_***************',
    status: 'ACTIVE',
    version: 'v1',
    headers: {},
    retryPolicy: { maxRetries: 5, retryInterval: 120 },
    rateLimiting: { requestsPerMinute: 50 },
    lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    successRate: 99.2,
    totalDeliveries: 456,
    failedDeliveries: 4,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'webhook_3',
    name: 'メッセージ通知',
    url: 'https://slack.com/api/webhooks/xxx',
    events: ['MESSAGE_RECEIVED'],
    secret: 'whsec_***************',
    status: 'PAUSED',
    version: 'v1',
    headers: { 'Content-Type': 'application/json' },
    retryPolicy: { maxRetries: 2, retryInterval: 30 },
    rateLimiting: { requestsPerMinute: 200 },
    lastTriggeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    successRate: 95.0,
    totalDeliveries: 890,
    failedDeliveries: 45,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// 配信ログモック
const mockDeliveryLogs = Array.from({ length: 100 }, (_, i) => ({
  id: `delivery_${100 - i}`,
  webhookId: mockWebhooks[Math.floor(Math.random() * mockWebhooks.length)].id,
  webhookName: mockWebhooks[Math.floor(Math.random() * mockWebhooks.length)].name,
  event: ['ORDER_CREATED', 'ORDER_SHIPPED', 'INVENTORY_LOW', 'MESSAGE_RECEIVED'][Math.floor(Math.random() * 4)],
  status: Math.random() > 0.05 ? 'SUCCESS' : 'FAILED',
  statusCode: Math.random() > 0.05 ? 200 : [400, 500, 502, 503][Math.floor(Math.random() * 4)],
  requestBody: JSON.stringify({ event: 'ORDER_CREATED', data: { orderId: `order_${i}` } }),
  responseBody: Math.random() > 0.05 ? '{"success":true}' : '{"error":"Internal server error"}',
  duration: Math.floor(Math.random() * 500) + 50,
  retryCount: Math.random() > 0.9 ? Math.floor(Math.random() * 3) : 0,
  errorMessage: Math.random() > 0.95 ? 'Connection timeout' : null,
  triggeredAt: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
}));

// イベントタイプ
const eventTypes = [
  { id: 'ORDER_CREATED', name: '注文作成', category: 'orders', description: '新しい注文が作成された時' },
  { id: 'ORDER_SHIPPED', name: '注文発送', category: 'orders', description: '注文が発送された時' },
  { id: 'ORDER_DELIVERED', name: '注文配達完了', category: 'orders', description: '注文が配達された時' },
  { id: 'ORDER_CANCELLED', name: '注文キャンセル', category: 'orders', description: '注文がキャンセルされた時' },
  { id: 'LISTING_CREATED', name: '出品作成', category: 'listings', description: '新しい出品が作成された時' },
  { id: 'LISTING_SOLD', name: '出品売却', category: 'listings', description: '出品が売れた時' },
  { id: 'LISTING_ENDED', name: '出品終了', category: 'listings', description: '出品が終了した時' },
  { id: 'INVENTORY_LOW', name: '在庫低下', category: 'inventory', description: '在庫が閾値を下回った時' },
  { id: 'INVENTORY_OUT', name: '在庫切れ', category: 'inventory', description: '在庫がゼロになった時' },
  { id: 'INVENTORY_REPLENISHED', name: '在庫補充', category: 'inventory', description: '在庫が補充された時' },
  { id: 'MESSAGE_RECEIVED', name: 'メッセージ受信', category: 'messaging', description: 'バイヤーからメッセージを受信した時' },
  { id: 'FEEDBACK_RECEIVED', name: 'フィードバック受信', category: 'feedback', description: 'フィードバックを受け取った時' },
  { id: 'RETURN_REQUESTED', name: '返品リクエスト', category: 'returns', description: '返品リクエストを受け取った時' },
  { id: 'PRICE_CHANGED', name: '価格変更', category: 'pricing', description: '価格が変更された時' },
];

// ============================================================
// エンドポイント
// ============================================================

// 1. Webhook統計
router.get('/stats', async (_req: Request, res: Response) => {
  const activeWebhooks = mockWebhooks.filter(w => w.status === 'ACTIVE').length;
  const totalDeliveries = mockWebhooks.reduce((sum, w) => sum + w.totalDeliveries, 0);
  const failedDeliveries = mockWebhooks.reduce((sum, w) => sum + w.failedDeliveries, 0);

  res.json({
    success: true,
    data: {
      totalWebhooks: mockWebhooks.length,
      activeWebhooks,
      pausedWebhooks: mockWebhooks.filter(w => w.status === 'PAUSED').length,
      totalDeliveries,
      failedDeliveries,
      successRate: ((totalDeliveries - failedDeliveries) / totalDeliveries * 100).toFixed(2),
      deliveriesToday: Math.floor(Math.random() * 200) + 50,
      avgResponseTime: Math.floor(Math.random() * 200) + 100,
      availableEvents: eventTypes.length,
    },
  });
});

// 2. Webhook一覧
router.get('/webhooks', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;

  let filtered = [...mockWebhooks];

  if (status) {
    filtered = filtered.filter(w => w.status === status);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      webhooks: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 3. Webhook詳細
router.get('/webhooks/:id', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  res.json({ success: true, data: webhook });
});

// 4. Webhook作成
router.post('/webhooks', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    headers: z.record(z.string()).optional(),
    retryPolicy: z.object({
      maxRetries: z.number().min(0).max(10),
      retryInterval: z.number().min(10).max(3600),
    }).optional(),
    rateLimiting: z.object({
      requestsPerMinute: z.number().min(1).max(1000),
    }).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newWebhook = {
    id: `webhook_${Date.now()}`,
    name: parsed.data.name,
    url: parsed.data.url,
    events: parsed.data.events,
    secret: `whsec_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`,
    status: 'ACTIVE',
    version: 'v1',
    headers: parsed.data.headers || {},
    retryPolicy: parsed.data.retryPolicy || { maxRetries: 3, retryInterval: 60 },
    rateLimiting: parsed.data.rateLimiting || { requestsPerMinute: 100 },
    lastTriggeredAt: null,
    successRate: 100,
    totalDeliveries: 0,
    failedDeliveries: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockWebhooks.push(newWebhook);

  res.json({
    success: true,
    message: 'Webhookを作成しました',
    data: newWebhook,
  });
});

// 5. Webhook更新
router.put('/webhooks/:id', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  Object.assign(webhook, req.body, { updatedAt: new Date().toISOString() });

  res.json({
    success: true,
    message: 'Webhookを更新しました',
    data: webhook,
  });
});

// 6. Webhook削除
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  const index = mockWebhooks.findIndex(w => w.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  mockWebhooks.splice(index, 1);

  res.json({
    success: true,
    message: 'Webhookを削除しました',
  });
});

// 7. Webhook有効/無効切り替え
router.patch('/webhooks/:id/toggle', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  webhook.status = webhook.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  webhook.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Webhookを${webhook.status === 'ACTIVE' ? '有効' : '無効'}にしました`,
    data: webhook,
  });
});

// 8. Webhookテスト
router.post('/webhooks/:id/test', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  // テストイベント送信シミュレーション
  res.json({
    success: true,
    message: 'テストイベントを送信しました',
    data: {
      webhookId: webhook.id,
      testEvent: webhook.events[0] || 'TEST_EVENT',
      statusCode: 200,
      responseTime: Math.floor(Math.random() * 200) + 50,
      response: '{"success":true}',
    },
  });
});

// 9. シークレット再生成
router.post('/webhooks/:id/rotate-secret', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  const newSecret = `whsec_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`;
  webhook.secret = newSecret;
  webhook.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'シークレットを再生成しました',
    data: { secret: newSecret },
  });
});

// 10. 配信ログ一覧
router.get('/delivery-logs', async (req: Request, res: Response) => {
  const { webhookId, status, event, page = '1', limit = '50' } = req.query;

  let filtered = [...mockDeliveryLogs];

  if (webhookId) {
    filtered = filtered.filter(l => l.webhookId === webhookId);
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }
  if (event) {
    filtered = filtered.filter(l => l.event === event);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      logs: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 11. 配信ログ詳細
router.get('/delivery-logs/:id', async (req: Request, res: Response) => {
  const log = mockDeliveryLogs.find(l => l.id === req.params.id);

  if (!log) {
    return res.status(404).json({ success: false, error: 'Delivery log not found' });
  }

  res.json({ success: true, data: log });
});

// 12. 配信を再試行
router.post('/delivery-logs/:id/retry', async (req: Request, res: Response) => {
  const log = mockDeliveryLogs.find(l => l.id === req.params.id);

  if (!log) {
    return res.status(404).json({ success: false, error: 'Delivery log not found' });
  }

  res.json({
    success: true,
    message: '再試行を開始しました',
    data: {
      originalLogId: log.id,
      retryLogId: `delivery_${Date.now()}`,
      status: 'PENDING',
    },
  });
});

// 13. イベントタイプ一覧
router.get('/event-types', async (req: Request, res: Response) => {
  const { category } = req.query;

  let filtered = [...eventTypes];

  if (category) {
    filtered = filtered.filter(e => e.category === category);
  }

  res.json({
    success: true,
    data: filtered,
  });
});

// 14. イベントカテゴリ一覧
router.get('/event-categories', async (_req: Request, res: Response) => {
  const categories = [...new Set(eventTypes.map(e => e.category))];

  res.json({
    success: true,
    data: categories.map(c => ({
      id: c,
      name: c.charAt(0).toUpperCase() + c.slice(1),
      eventCount: eventTypes.filter(e => e.category === c).length,
    })),
  });
});

// 15. Webhookシグネチャ検証設定
router.get('/signature-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      algorithm: 'HMAC-SHA256',
      headerName: 'X-Webhook-Signature',
      timestampTolerance: 300,
      enabled: true,
    },
  });
});

// 16. シグネチャ検証設定更新
router.put('/signature-settings', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'シグネチャ検証設定を更新しました',
    data: req.body,
  });
});

// 17. Webhook配信統計
router.get('/webhooks/:id/stats', async (req: Request, res: Response) => {
  const webhook = mockWebhooks.find(w => w.id === req.params.id);

  if (!webhook) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  res.json({
    success: true,
    data: {
      webhookId: webhook.id,
      totalDeliveries: webhook.totalDeliveries,
      successfulDeliveries: webhook.totalDeliveries - webhook.failedDeliveries,
      failedDeliveries: webhook.failedDeliveries,
      successRate: webhook.successRate,
      avgResponseTime: Math.floor(Math.random() * 200) + 100,
      byDay: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total: Math.floor(Math.random() * 100) + 20,
        success: Math.floor(Math.random() * 95) + 18,
        failed: Math.floor(Math.random() * 5),
      })),
      byEvent: webhook.events.map(e => ({
        event: e,
        count: Math.floor(Math.random() * 200) + 50,
      })),
    },
  });
});

// 18. バルク操作
router.post('/webhooks/bulk-action', async (req: Request, res: Response) => {
  const schema = z.object({
    webhookIds: z.array(z.string()),
    action: z.enum(['PAUSE', 'RESUME', 'DELETE']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: `${parsed.data.webhookIds.length}件のWebhookに対して${parsed.data.action}を実行しました`,
    data: { affectedCount: parsed.data.webhookIds.length },
  });
});

// 19. IPホワイトリスト取得
router.get('/ip-whitelist', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      ips: ['192.168.1.0/24', '10.0.0.1'],
    },
  });
});

// 20. IPホワイトリスト更新
router.put('/ip-whitelist', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'IPホワイトリストを更新しました',
    data: req.body,
  });
});

export const ebayWebhookManagerRouter = router;

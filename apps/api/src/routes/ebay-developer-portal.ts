import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 178: Developer Portal API
// 開発者ポータル
// ============================================

// --- ダッシュボード ---

// 開発者ダッシュボード
router.get('/dashboard', async (_req, res) => {
  res.json({
    apiCalls: {
      today: 12450,
      thisMonth: 385200,
      limit: 500000,
      percentUsed: 77,
    },
    activeApps: 3,
    webhooks: {
      active: 5,
      deliveryRate: 99.8,
    },
    sandbox: {
      enabled: true,
      lastUsed: '2026-02-15T09:30:00Z',
    },
    recentActivity: [
      { type: 'api_call', endpoint: '/listings', method: 'GET', timestamp: '2026-02-15T10:30:00Z' },
      { type: 'webhook_delivery', event: 'order.created', status: 'delivered', timestamp: '2026-02-15T10:25:00Z' },
      { type: 'app_updated', appName: 'Production App', timestamp: '2026-02-15T10:00:00Z' },
    ],
  });
});

// --- アプリケーション管理 ---

// アプリ一覧
router.get('/apps', async (_req, res) => {
  const apps = [
    { id: 'app_1', name: 'Production App', type: 'production', clientId: 'cli_prod_1234', status: 'active', createdAt: '2026-01-01', apiCalls: 250000 },
    { id: 'app_2', name: 'Development App', type: 'sandbox', clientId: 'cli_dev_5678', status: 'active', createdAt: '2026-01-15', apiCalls: 85000 },
    { id: 'app_3', name: 'Test App', type: 'sandbox', clientId: 'cli_test_9012', status: 'inactive', createdAt: '2026-02-01', apiCalls: 12000 },
  ];

  res.json({ apps, total: apps.length });
});

// アプリ詳細
router.get('/apps/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Production App',
    type: 'production',
    clientId: 'cli_prod_1234',
    clientSecret: '••••••••••••••••',
    status: 'active',
    redirectUris: ['https://myapp.com/callback', 'https://myapp.com/oauth'],
    scopes: ['read:listings', 'write:listings', 'read:orders', 'write:orders'],
    rateLimits: {
      requestsPerSecond: 10,
      requestsPerDay: 100000,
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-02-10',
  });
});

// アプリ作成
router.post('/apps', async (req, res) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['production', 'sandbox']),
    redirectUris: z.array(z.string()).optional(),
    scopes: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `app_${Date.now()}`,
    ...data,
    clientId: `cli_${data.type === 'production' ? 'prod' : 'dev'}_${Date.now()}`,
    clientSecret: `sec_${Date.now()}_xxxxxxxxxxxxx`,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// アプリ更新
router.put('/apps/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    redirectUris: z.array(z.string()).optional(),
    scopes: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// アプリ削除
router.delete('/apps/:id', async (req, res) => {
  res.json({ success: true, appId: req.params.id });
});

// クライアントシークレット再生成
router.post('/apps/:id/regenerate-secret', async (req, res) => {
  res.json({
    appId: req.params.id,
    clientSecret: `sec_${Date.now()}_newxxxxxxxxxxx`,
    regeneratedAt: new Date().toISOString(),
  });
});

// --- APIドキュメント ---

// APIエンドポイント一覧
router.get('/api-docs/endpoints', async (_req, res) => {
  const endpoints = [
    { category: 'Listings', path: '/api/listings', method: 'GET', description: '出品一覧を取得', auth: 'required' },
    { category: 'Listings', path: '/api/listings', method: 'POST', description: '新規出品を作成', auth: 'required' },
    { category: 'Listings', path: '/api/listings/:id', method: 'GET', description: '出品詳細を取得', auth: 'required' },
    { category: 'Listings', path: '/api/listings/:id', method: 'PUT', description: '出品を更新', auth: 'required' },
    { category: 'Listings', path: '/api/listings/:id', method: 'DELETE', description: '出品を削除', auth: 'required' },
    { category: 'Orders', path: '/api/orders', method: 'GET', description: '注文一覧を取得', auth: 'required' },
    { category: 'Orders', path: '/api/orders/:id', method: 'GET', description: '注文詳細を取得', auth: 'required' },
    { category: 'Inventory', path: '/api/inventory', method: 'GET', description: '在庫一覧を取得', auth: 'required' },
    { category: 'Analytics', path: '/api/analytics/sales', method: 'GET', description: '売上分析を取得', auth: 'required' },
  ];

  res.json({ endpoints, total: endpoints.length });
});

// スキーマ定義
router.get('/api-docs/schemas', async (_req, res) => {
  const schemas = [
    {
      name: 'Listing',
      fields: [
        { name: 'id', type: 'string', required: true, description: '出品ID' },
        { name: 'title', type: 'string', required: true, description: 'タイトル' },
        { name: 'price', type: 'number', required: true, description: '価格' },
        { name: 'currency', type: 'string', required: true, description: '通貨コード' },
        { name: 'status', type: 'string', required: true, description: 'ステータス' },
      ],
    },
    {
      name: 'Order',
      fields: [
        { name: 'id', type: 'string', required: true, description: '注文ID' },
        { name: 'listingId', type: 'string', required: true, description: '出品ID' },
        { name: 'buyerId', type: 'string', required: true, description: '購入者ID' },
        { name: 'total', type: 'number', required: true, description: '合計金額' },
        { name: 'status', type: 'string', required: true, description: 'ステータス' },
      ],
    },
  ];

  res.json({ schemas });
});

// 認証ガイド
router.get('/api-docs/auth', async (_req, res) => {
  res.json({
    methods: [
      {
        type: 'oauth2',
        description: 'OAuth 2.0 Authorization Code Flow',
        endpoints: {
          authorize: '/oauth/authorize',
          token: '/oauth/token',
          refresh: '/oauth/refresh',
        },
      },
      {
        type: 'api_key',
        description: 'API Key認証',
        header: 'X-API-Key',
      },
    ],
    scopes: [
      { name: 'read:listings', description: '出品の読み取り' },
      { name: 'write:listings', description: '出品の作成・更新' },
      { name: 'read:orders', description: '注文の読み取り' },
      { name: 'write:orders', description: '注文の更新' },
      { name: 'read:analytics', description: '分析データの読み取り' },
    ],
  });
});

// --- Webhook管理 ---

// Webhook一覧
router.get('/webhooks', async (_req, res) => {
  const webhooks = [
    { id: 'wh_1', url: 'https://myapp.com/webhooks/orders', events: ['order.created', 'order.updated'], status: 'active', createdAt: '2026-01-15' },
    { id: 'wh_2', url: 'https://myapp.com/webhooks/listings', events: ['listing.created', 'listing.sold'], status: 'active', createdAt: '2026-01-20' },
    { id: 'wh_3', url: 'https://myapp.com/webhooks/messages', events: ['message.received'], status: 'inactive', createdAt: '2026-02-01' },
  ];

  res.json({ webhooks, total: webhooks.length });
});

// Webhook詳細
router.get('/webhooks/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    url: 'https://myapp.com/webhooks/orders',
    events: ['order.created', 'order.updated'],
    secret: 'whsec_••••••••••••',
    status: 'active',
    deliveryStats: {
      total: 1250,
      successful: 1248,
      failed: 2,
      successRate: 99.84,
    },
    recentDeliveries: [
      { id: 'del_1', event: 'order.created', status: 'delivered', responseTime: 125, timestamp: '2026-02-15T10:25:00Z' },
      { id: 'del_2', event: 'order.updated', status: 'delivered', responseTime: 98, timestamp: '2026-02-15T10:20:00Z' },
    ],
    createdAt: '2026-01-15',
  });
});

// Webhook作成
router.post('/webhooks', async (req, res) => {
  const schema = z.object({
    url: z.string().url(),
    events: z.array(z.string()),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `wh_${Date.now()}`,
    ...data,
    secret: `whsec_${Date.now()}_xxxxxxxx`,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// Webhook更新
router.put('/webhooks/:id', async (req, res) => {
  const schema = z.object({
    url: z.string().url().optional(),
    events: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// Webhook削除
router.delete('/webhooks/:id', async (req, res) => {
  res.json({ success: true, webhookId: req.params.id });
});

// Webhookテスト
router.post('/webhooks/:id/test', async (req, res) => {
  res.json({
    webhookId: req.params.id,
    testEvent: 'test.ping',
    status: 'delivered',
    responseTime: 145,
    responseCode: 200,
    testedAt: new Date().toISOString(),
  });
});

// イベント一覧
router.get('/webhooks/events', async (_req, res) => {
  const events = [
    { category: 'Orders', events: ['order.created', 'order.updated', 'order.cancelled', 'order.shipped', 'order.delivered'] },
    { category: 'Listings', events: ['listing.created', 'listing.updated', 'listing.ended', 'listing.sold'] },
    { category: 'Messages', events: ['message.received', 'message.sent'] },
    { category: 'Inventory', events: ['inventory.low', 'inventory.out_of_stock', 'inventory.restocked'] },
    { category: 'Feedback', events: ['feedback.received', 'feedback.responded'] },
  ];

  res.json({ events });
});

// --- サンドボックス ---

// サンドボックス状態
router.get('/sandbox', async (_req, res) => {
  res.json({
    enabled: true,
    environment: 'sandbox',
    baseUrl: 'https://api-sandbox.example.com',
    testData: {
      listings: 50,
      orders: 25,
      messages: 10,
    },
    lastReset: '2026-02-14T00:00:00Z',
  });
});

// サンドボックスリセット
router.post('/sandbox/reset', async (_req, res) => {
  res.json({
    success: true,
    resetAt: new Date().toISOString(),
    testData: {
      listings: 50,
      orders: 25,
      messages: 10,
    },
  });
});

// テストデータ生成
router.post('/sandbox/generate-data', async (req, res) => {
  const schema = z.object({
    type: z.enum(['listings', 'orders', 'messages']),
    count: z.number().min(1).max(100),
  });

  const data = schema.parse(req.body);

  res.json({
    type: data.type,
    generated: data.count,
    generatedAt: new Date().toISOString(),
  });
});

// --- API使用状況 ---

// 使用統計
router.get('/usage', async (req, res) => {
  res.json({
    period: req.query.period || 'month',
    apiCalls: {
      total: 385200,
      byEndpoint: [
        { endpoint: '/listings', calls: 125000, percentage: 32.4 },
        { endpoint: '/orders', calls: 95000, percentage: 24.7 },
        { endpoint: '/inventory', calls: 75000, percentage: 19.5 },
        { endpoint: '/analytics', calls: 50000, percentage: 13.0 },
        { endpoint: '/messages', calls: 40200, percentage: 10.4 },
      ],
      byDay: [
        { date: '2026-02-14', calls: 12500 },
        { date: '2026-02-13', calls: 13200 },
        { date: '2026-02-12', calls: 11800 },
      ],
    },
    rateLimits: {
      current: 8,
      limit: 10,
      resetAt: new Date(Date.now() + 60000).toISOString(),
    },
    errors: {
      total: 245,
      byType: [
        { type: '400 Bad Request', count: 120 },
        { type: '401 Unauthorized', count: 45 },
        { type: '429 Rate Limited', count: 50 },
        { type: '500 Server Error', count: 30 },
      ],
    },
  });
});

// 使用履歴
router.get('/usage/history', async (req, res) => {
  const history = [
    { date: '2026-02', calls: 385200, errors: 245, avgResponseTime: 125 },
    { date: '2026-01', calls: 420500, errors: 312, avgResponseTime: 132 },
    { date: '2025-12', calls: 380100, errors: 198, avgResponseTime: 118 },
  ];

  res.json({ history });
});

// --- ログ ---

// APIログ
router.get('/logs', async (req, res) => {
  const logs = [
    { id: 'log_1', timestamp: '2026-02-15T10:30:00Z', method: 'GET', path: '/api/listings', status: 200, duration: 45, ip: '192.168.1.100' },
    { id: 'log_2', timestamp: '2026-02-15T10:29:55Z', method: 'POST', path: '/api/listings', status: 201, duration: 125, ip: '192.168.1.100' },
    { id: 'log_3', timestamp: '2026-02-15T10:29:50Z', method: 'GET', path: '/api/orders', status: 200, duration: 38, ip: '192.168.1.100' },
    { id: 'log_4', timestamp: '2026-02-15T10:29:45Z', method: 'PUT', path: '/api/listings/123', status: 400, duration: 12, ip: '192.168.1.100', error: 'Invalid price format' },
  ];

  res.json({ logs, total: logs.length });
});

// ログ詳細
router.get('/logs/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    timestamp: '2026-02-15T10:30:00Z',
    method: 'GET',
    path: '/api/listings',
    query: { status: 'active', limit: '50' },
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '••••••••',
    },
    status: 200,
    duration: 45,
    ip: '192.168.1.100',
    userAgent: 'MyApp/1.0',
    response: {
      size: 12500,
      itemCount: 50,
    },
  });
});

// --- 設定 ---

// 開発者設定
router.get('/settings', async (_req, res) => {
  res.json({
    notifications: {
      apiErrors: true,
      usageLimits: true,
      webhookFailures: true,
      securityAlerts: true,
    },
    preferences: {
      defaultEnvironment: 'production',
      logRetentionDays: 30,
      timezone: 'Asia/Tokyo',
    },
    team: {
      members: [
        { id: 'user_1', email: 'dev@example.com', role: 'owner' },
        { id: 'user_2', email: 'team@example.com', role: 'developer' },
      ],
    },
  });
});

// 設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    notifications: z.object({
      apiErrors: z.boolean(),
      usageLimits: z.boolean(),
      webhookFailures: z.boolean(),
      securityAlerts: z.boolean(),
    }).optional(),
    preferences: z.object({
      defaultEnvironment: z.enum(['production', 'sandbox']),
      logRetentionDays: z.number(),
      timezone: z.string(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// チームメンバー招待
router.post('/settings/team/invite', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    role: z.enum(['developer', 'viewer']),
  });

  const data = schema.parse(req.body);

  res.json({
    inviteId: `inv_${Date.now()}`,
    email: data.email,
    role: data.role,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

export const ebayDeveloperPortalRouter = router;

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 168: Integration Hub（統合ハブ）
// ============================================

// --- 統合一覧 ---
const integrations = [
  {
    id: 'int_001',
    name: 'Slack',
    type: 'COMMUNICATION',
    category: 'NOTIFICATION',
    description: 'Slackチャンネルへの通知連携',
    icon: 'slack',
    status: 'CONNECTED',
    connectedAt: '2025-06-01T00:00:00Z',
    lastSync: '2026-02-15T09:00:00Z',
    config: {
      workspace: 'rakuda-team',
      channels: ['#sales-alerts', '#inventory-alerts'],
      webhookUrl: 'https://hooks.slack.com/services/xxx',
    },
    features: ['notifications', 'alerts', 'daily_digest'],
  },
  {
    id: 'int_002',
    name: 'Google Sheets',
    type: 'SPREADSHEET',
    category: 'DATA_EXPORT',
    description: 'Googleスプレッドシートへのデータ同期',
    icon: 'google-sheets',
    status: 'CONNECTED',
    connectedAt: '2025-09-15T00:00:00Z',
    lastSync: '2026-02-15T08:00:00Z',
    config: {
      spreadsheetId: '1ABC123xyz',
      syncSchedule: 'HOURLY',
      sheets: ['Sales', 'Inventory', 'Orders'],
    },
    features: ['auto_sync', 'custom_columns', 'formulas'],
  },
  {
    id: 'int_003',
    name: 'Shopify',
    type: 'ECOMMERCE',
    category: 'MARKETPLACE',
    description: 'Shopifyストアとの在庫・注文同期',
    icon: 'shopify',
    status: 'CONNECTED',
    connectedAt: '2025-11-01T00:00:00Z',
    lastSync: '2026-02-15T09:30:00Z',
    config: {
      store: 'my-store.myshopify.com',
      syncInventory: true,
      syncOrders: true,
      syncProducts: false,
    },
    features: ['inventory_sync', 'order_sync', 'product_import'],
  },
  {
    id: 'int_004',
    name: 'QuickBooks',
    type: 'ACCOUNTING',
    category: 'FINANCE',
    description: '会計ソフトとの売上・経費連携',
    icon: 'quickbooks',
    status: 'DISCONNECTED',
    connectedAt: null,
    lastSync: null,
    config: null,
    features: ['invoice_sync', 'expense_tracking', 'tax_reports'],
  },
  {
    id: 'int_005',
    name: 'Shippo',
    type: 'SHIPPING',
    category: 'LOGISTICS',
    description: '配送ラベル作成・追跡連携',
    icon: 'shippo',
    status: 'CONNECTED',
    connectedAt: '2026-01-15T00:00:00Z',
    lastSync: '2026-02-15T10:00:00Z',
    config: {
      carriers: ['USPS', 'FedEx', 'UPS'],
      defaultCarrier: 'USPS',
      autoCreateLabels: true,
    },
    features: ['label_creation', 'tracking', 'rate_comparison'],
  },
  {
    id: 'int_006',
    name: 'Zapier',
    type: 'AUTOMATION',
    category: 'WORKFLOW',
    description: '1000+アプリとの自動連携',
    icon: 'zapier',
    status: 'CONNECTED',
    connectedAt: '2025-08-01T00:00:00Z',
    lastSync: '2026-02-15T09:45:00Z',
    config: {
      zaps: 5,
      triggers: ['new_order', 'low_stock', 'price_change'],
    },
    features: ['triggers', 'actions', 'multi_step'],
  },
];

// 統合一覧取得
router.get('/integrations', (req, res) => {
  const { category, status, search } = req.query;

  let filtered = [...integrations];

  if (category) {
    filtered = filtered.filter(i => i.category === category);
  }
  if (status) {
    filtered = filtered.filter(i => i.status === status);
  }
  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.description.toLowerCase().includes(s)
    );
  }

  res.json({
    integrations: filtered,
    total: filtered.length,
    categories: ['NOTIFICATION', 'DATA_EXPORT', 'MARKETPLACE', 'FINANCE', 'LOGISTICS', 'WORKFLOW'],
    summary: {
      connected: integrations.filter(i => i.status === 'CONNECTED').length,
      disconnected: integrations.filter(i => i.status === 'DISCONNECTED').length,
      error: integrations.filter(i => i.status === 'ERROR').length,
    },
  });
});

// 統合詳細取得
router.get('/integrations/:id', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }
  res.json(integration);
});

// 統合接続
router.post('/integrations/:id/connect', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  res.json({
    integrationId: integration.id,
    authUrl: `https://oauth.${integration.name.toLowerCase()}.com/authorize?client_id=xxx&redirect_uri=xxx`,
    status: 'PENDING_AUTH',
    message: '認証URLにリダイレクトしてください',
  });
});

// 統合切断
router.post('/integrations/:id/disconnect', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  res.json({
    integrationId: integration.id,
    status: 'DISCONNECTED',
    message: '統合を切断しました',
  });
});

// 統合設定更新
router.put('/integrations/:id/config', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  res.json({
    ...integration,
    config: { ...integration.config, ...req.body },
    updatedAt: new Date().toISOString(),
  });
});

// 手動同期
router.post('/integrations/:id/sync', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  res.json({
    integrationId: integration.id,
    syncId: `sync_${Date.now()}`,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    message: '同期を開始しました',
  });
});

// 統合テスト
router.post('/integrations/:id/test', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  res.json({
    integrationId: integration.id,
    testResult: 'SUCCESS',
    latency: 120,
    message: '接続テストに成功しました',
    details: {
      auth: 'OK',
      permissions: 'OK',
      connectivity: 'OK',
    },
  });
});

// --- 同期ログ ---
const syncLogs = [
  {
    id: 'log_001',
    integrationId: 'int_002',
    integrationName: 'Google Sheets',
    type: 'AUTO',
    status: 'SUCCESS',
    startedAt: '2026-02-15T08:00:00Z',
    completedAt: '2026-02-15T08:00:45Z',
    recordsProcessed: 150,
    recordsCreated: 5,
    recordsUpdated: 12,
    recordsFailed: 0,
  },
  {
    id: 'log_002',
    integrationId: 'int_003',
    integrationName: 'Shopify',
    type: 'AUTO',
    status: 'SUCCESS',
    startedAt: '2026-02-15T09:30:00Z',
    completedAt: '2026-02-15T09:31:15Z',
    recordsProcessed: 85,
    recordsCreated: 3,
    recordsUpdated: 8,
    recordsFailed: 0,
  },
  {
    id: 'log_003',
    integrationId: 'int_001',
    integrationName: 'Slack',
    type: 'MANUAL',
    status: 'SUCCESS',
    startedAt: '2026-02-15T09:00:00Z',
    completedAt: '2026-02-15T09:00:02Z',
    recordsProcessed: 1,
    recordsCreated: 1,
    recordsUpdated: 0,
    recordsFailed: 0,
  },
];

router.get('/sync-logs', (req, res) => {
  const { integrationId, status, page = '1', limit = '20' } = req.query;

  let filtered = [...syncLogs];

  if (integrationId) {
    filtered = filtered.filter(l => l.integrationId === integrationId);
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    logs: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

// --- Webhook管理 ---
const webhooks = [
  {
    id: 'wh_001',
    name: '注文通知Webhook',
    url: 'https://my-server.com/webhooks/orders',
    events: ['order.created', 'order.shipped', 'order.delivered'],
    status: 'ACTIVE',
    secret: 'whsec_xxx',
    createdAt: '2025-12-01T00:00:00Z',
    lastTriggered: '2026-02-15T09:30:00Z',
    successRate: 99.5,
  },
  {
    id: 'wh_002',
    name: '在庫アラートWebhook',
    url: 'https://my-server.com/webhooks/inventory',
    events: ['inventory.low', 'inventory.out_of_stock'],
    status: 'ACTIVE',
    secret: 'whsec_yyy',
    createdAt: '2026-01-15T00:00:00Z',
    lastTriggered: '2026-02-15T08:00:00Z',
    successRate: 98.2,
  },
];

router.get('/webhooks', (req, res) => {
  res.json({
    webhooks,
    total: webhooks.length,
  });
});

router.post('/webhooks', (req, res) => {
  const schema = z.object({
    name: z.string(),
    url: z.string().url(),
    events: z.array(z.string()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `wh_${Date.now()}`,
    ...parsed.data,
    status: 'ACTIVE',
    secret: `whsec_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString(),
    lastTriggered: null,
    successRate: 100,
  });
});

router.delete('/webhooks/:id', (req, res) => {
  res.json({ success: true, message: 'Webhook deleted' });
});

router.post('/webhooks/:id/test', (req, res) => {
  res.json({
    webhookId: req.params.id,
    testResult: 'SUCCESS',
    responseCode: 200,
    responseTime: 85,
    message: 'Webhookテストに成功しました',
  });
});

// --- API接続 ---
const apiConnections = [
  {
    id: 'api_001',
    name: 'eBay Trading API',
    type: 'REST',
    baseUrl: 'https://api.ebay.com/ws/api.dll',
    status: 'HEALTHY',
    authType: 'OAUTH2',
    lastCheck: '2026-02-15T10:00:00Z',
    latency: 120,
    uptime: 99.95,
  },
  {
    id: 'api_002',
    name: 'eBay Browse API',
    type: 'REST',
    baseUrl: 'https://api.ebay.com/buy/browse/v1',
    status: 'HEALTHY',
    authType: 'OAUTH2',
    lastCheck: '2026-02-15T10:00:00Z',
    latency: 85,
    uptime: 99.98,
  },
  {
    id: 'api_003',
    name: 'eBay Inventory API',
    type: 'REST',
    baseUrl: 'https://api.ebay.com/sell/inventory/v1',
    status: 'HEALTHY',
    authType: 'OAUTH2',
    lastCheck: '2026-02-15T10:00:00Z',
    latency: 95,
    uptime: 99.92,
  },
];

router.get('/api-connections', (req, res) => {
  res.json({
    connections: apiConnections,
    total: apiConnections.length,
    overallStatus: 'HEALTHY',
  });
});

router.get('/api-connections/:id/health', (req, res) => {
  const connection = apiConnections.find(c => c.id === req.params.id);
  if (!connection) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  res.json({
    connectionId: connection.id,
    status: connection.status,
    latency: connection.latency,
    uptime: connection.uptime,
    lastCheck: connection.lastCheck,
    checks: [
      { type: 'AUTH', status: 'OK', latency: 45 },
      { type: 'ENDPOINT', status: 'OK', latency: 80 },
      { type: 'RATE_LIMIT', status: 'OK', remaining: 4500 },
    ],
  });
});

// --- マーケットプレイス ---
const marketplaces = [
  { id: 'mp_ebay_us', name: 'eBay US', code: 'EBAY_US', status: 'ACTIVE', listingsCount: 1250, ordersCount: 450 },
  { id: 'mp_ebay_uk', name: 'eBay UK', code: 'EBAY_UK', status: 'ACTIVE', listingsCount: 320, ordersCount: 85 },
  { id: 'mp_ebay_de', name: 'eBay Germany', code: 'EBAY_DE', status: 'ACTIVE', listingsCount: 180, ordersCount: 42 },
  { id: 'mp_ebay_au', name: 'eBay Australia', code: 'EBAY_AU', status: 'INACTIVE', listingsCount: 0, ordersCount: 0 },
  { id: 'mp_amazon', name: 'Amazon', code: 'AMAZON', status: 'PENDING', listingsCount: 0, ordersCount: 0 },
];

router.get('/marketplaces', (req, res) => {
  res.json({
    marketplaces,
    total: marketplaces.length,
    active: marketplaces.filter(m => m.status === 'ACTIVE').length,
  });
});

router.post('/marketplaces/:id/activate', (req, res) => {
  const marketplace = marketplaces.find(m => m.id === req.params.id);
  if (!marketplace) {
    return res.status(404).json({ error: 'Marketplace not found' });
  }

  res.json({ ...marketplace, status: 'ACTIVE' });
});

// --- ダッシュボード ---
router.get('/dashboard', (req, res) => {
  res.json({
    summary: {
      totalIntegrations: integrations.length,
      connectedIntegrations: integrations.filter(i => i.status === 'CONNECTED').length,
      totalSyncs24h: 156,
      successRate: 99.2,
    },
    recentActivity: [
      { type: 'SYNC', integration: 'Google Sheets', status: 'SUCCESS', timestamp: '2026-02-15T08:00:00Z' },
      { type: 'SYNC', integration: 'Shopify', status: 'SUCCESS', timestamp: '2026-02-15T09:30:00Z' },
      { type: 'WEBHOOK', integration: 'Orders', status: 'DELIVERED', timestamp: '2026-02-15T09:30:00Z' },
    ],
    healthStatus: {
      apis: 'HEALTHY',
      webhooks: 'HEALTHY',
      syncs: 'HEALTHY',
    },
  });
});

export { router as ebayIntegrationHubRouter };

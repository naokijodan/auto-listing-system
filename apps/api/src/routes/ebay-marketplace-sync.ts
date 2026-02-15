import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 181: Marketplace Sync API
// マーケットプレイス同期
// ============================================

// --- ダッシュボード ---

// 同期概要
router.get('/dashboard', async (_req, res) => {
  res.json({
    connectedMarketplaces: 4,
    totalSyncedListings: 1850,
    lastSyncAt: '2026-02-15T10:30:00Z',
    syncHealth: 'healthy',
    pendingSync: 25,
    syncErrors: 3,
    stats: {
      today: { synced: 125, created: 15, updated: 85, deleted: 5, errors: 2 },
      thisWeek: { synced: 850, created: 120, updated: 580, deleted: 45, errors: 12 },
    },
  });
});

// --- マーケットプレイス管理 ---

// 接続済みマーケットプレイス一覧
router.get('/marketplaces', async (_req, res) => {
  const marketplaces = [
    { id: 'mp_1', name: 'eBay US', platform: 'ebay', region: 'US', status: 'connected', listings: 450, lastSync: '2026-02-15T10:30:00Z', health: 'healthy' },
    { id: 'mp_2', name: 'eBay UK', platform: 'ebay', region: 'UK', status: 'connected', listings: 380, lastSync: '2026-02-15T10:25:00Z', health: 'healthy' },
    { id: 'mp_3', name: 'eBay DE', platform: 'ebay', region: 'DE', status: 'connected', listings: 320, lastSync: '2026-02-15T10:20:00Z', health: 'warning' },
    { id: 'mp_4', name: 'Amazon US', platform: 'amazon', region: 'US', status: 'connected', listings: 280, lastSync: '2026-02-15T10:15:00Z', health: 'healthy' },
    { id: 'mp_5', name: 'Shopify', platform: 'shopify', region: 'global', status: 'disconnected', listings: 0, lastSync: null, health: 'disconnected' },
  ];

  res.json({ marketplaces, total: marketplaces.length });
});

// マーケットプレイス詳細
router.get('/marketplaces/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    name: 'eBay US',
    platform: 'ebay',
    region: 'US',
    status: 'connected',
    credentials: {
      type: 'oauth',
      expiresAt: '2026-03-15T00:00:00Z',
      scopes: ['sell.inventory', 'sell.fulfillment', 'sell.marketing'],
    },
    settings: {
      autoSync: true,
      syncInterval: 15,
      syncInventory: true,
      syncPrices: true,
      syncOrders: true,
    },
    stats: {
      totalListings: 450,
      activeListings: 420,
      pendingListings: 15,
      errorListings: 15,
    },
    lastSync: '2026-02-15T10:30:00Z',
    connectedAt: '2026-01-01T00:00:00Z',
  });
});

// マーケットプレイス接続
router.post('/marketplaces/connect', async (req, res) => {
  const schema = z.object({
    platform: z.enum(['ebay', 'amazon', 'shopify', 'etsy', 'walmart']),
    region: z.string(),
    credentials: z.record(z.string()),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `mp_${Date.now()}`,
    ...data,
    status: 'pending',
    authUrl: `https://auth.${data.platform}.com/oauth?client_id=xxx&redirect_uri=xxx`,
  });
});

// マーケットプレイス切断
router.delete('/marketplaces/:id', async (req, res) => {
  res.json({
    success: true,
    marketplaceId: req.params.id,
    disconnectedAt: new Date().toISOString(),
  });
});

// マーケットプレイス設定更新
router.put('/marketplaces/:id/settings', async (req, res) => {
  const schema = z.object({
    autoSync: z.boolean().optional(),
    syncInterval: z.number().optional(),
    syncInventory: z.boolean().optional(),
    syncPrices: z.boolean().optional(),
    syncOrders: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    marketplaceId: req.params.id,
    settings: data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 同期管理 ---

// 手動同期実行
router.post('/sync', async (req, res) => {
  const schema = z.object({
    marketplaceIds: z.array(z.string()).optional(),
    listingIds: z.array(z.string()).optional(),
    syncType: z.enum(['full', 'incremental', 'inventory', 'prices', 'orders']),
  });

  const data = schema.parse(req.body);

  res.json({
    jobId: `sync_${Date.now()}`,
    syncType: data.syncType,
    marketplaces: data.marketplaceIds || ['all'],
    status: 'started',
    startedAt: new Date().toISOString(),
  });
});

// 同期ジョブ状態
router.get('/sync/jobs/:jobId', async (req, res) => {
  res.json({
    jobId: req.params.jobId,
    syncType: 'incremental',
    status: 'completed',
    progress: {
      total: 125,
      processed: 125,
      success: 122,
      errors: 3,
    },
    startedAt: '2026-02-15T10:30:00Z',
    completedAt: '2026-02-15T10:32:00Z',
    duration: 120,
  });
});

// 同期履歴
router.get('/sync/history', async (req, res) => {
  const history = [
    { id: 'sync_1', type: 'incremental', status: 'completed', processed: 125, errors: 3, startedAt: '2026-02-15T10:30:00Z', duration: 120 },
    { id: 'sync_2', type: 'inventory', status: 'completed', processed: 450, errors: 0, startedAt: '2026-02-15T10:15:00Z', duration: 180 },
    { id: 'sync_3', type: 'prices', status: 'completed', processed: 85, errors: 2, startedAt: '2026-02-15T10:00:00Z', duration: 45 },
    { id: 'sync_4', type: 'full', status: 'completed', processed: 1850, errors: 12, startedAt: '2026-02-15T06:00:00Z', duration: 1200 },
  ];

  res.json({ history, total: history.length });
});

// 同期スケジュール
router.get('/sync/schedule', async (_req, res) => {
  res.json({
    enabled: true,
    schedules: [
      { id: 'sch_1', type: 'incremental', cron: '*/15 * * * *', description: '15分ごと', enabled: true, lastRun: '2026-02-15T10:30:00Z', nextRun: '2026-02-15T10:45:00Z' },
      { id: 'sch_2', type: 'inventory', cron: '0 * * * *', description: '1時間ごと', enabled: true, lastRun: '2026-02-15T10:00:00Z', nextRun: '2026-02-15T11:00:00Z' },
      { id: 'sch_3', type: 'full', cron: '0 6 * * *', description: '毎日6:00', enabled: true, lastRun: '2026-02-15T06:00:00Z', nextRun: '2026-02-16T06:00:00Z' },
    ],
  });
});

// 同期スケジュール更新
router.put('/sync/schedule/:id', async (req, res) => {
  const schema = z.object({
    cron: z.string().optional(),
    enabled: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 出品マッピング ---

// マッピング一覧
router.get('/mappings', async (req, res) => {
  const mappings = [
    { id: 'map_1', localListingId: 'lst_1', marketplace: 'eBay US', externalId: 'ebay_123456', status: 'synced', lastSync: '2026-02-15T10:30:00Z' },
    { id: 'map_2', localListingId: 'lst_1', marketplace: 'eBay UK', externalId: 'ebay_789012', status: 'synced', lastSync: '2026-02-15T10:25:00Z' },
    { id: 'map_3', localListingId: 'lst_2', marketplace: 'eBay US', externalId: 'ebay_345678', status: 'pending', lastSync: null },
    { id: 'map_4', localListingId: 'lst_3', marketplace: 'Amazon US', externalId: 'amz_ASIN123', status: 'error', error: 'Price mismatch', lastSync: '2026-02-15T10:00:00Z' },
  ];

  res.json({ mappings, total: mappings.length });
});

// 出品のマッピング詳細
router.get('/mappings/listing/:listingId', async (req, res) => {
  res.json({
    localListingId: req.params.listingId,
    mappings: [
      { marketplace: 'eBay US', externalId: 'ebay_123456', status: 'synced', url: 'https://ebay.com/itm/123456' },
      { marketplace: 'eBay UK', externalId: 'ebay_789012', status: 'synced', url: 'https://ebay.co.uk/itm/789012' },
      { marketplace: 'eBay DE', externalId: 'ebay_345678', status: 'pending', url: null },
    ],
  });
});

// マッピング作成
router.post('/mappings', async (req, res) => {
  const schema = z.object({
    localListingId: z.string(),
    marketplaceId: z.string(),
    externalId: z.string().optional(),
    createNew: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `map_${Date.now()}`,
    ...data,
    status: data.createNew ? 'pending' : 'mapped',
    createdAt: new Date().toISOString(),
  });
});

// マッピング削除
router.delete('/mappings/:id', async (req, res) => {
  res.json({
    success: true,
    mappingId: req.params.id,
    deletedAt: new Date().toISOString(),
  });
});

// --- 在庫同期 ---

// 在庫同期状態
router.get('/inventory/status', async (_req, res) => {
  res.json({
    totalProducts: 450,
    inSync: 420,
    outOfSync: 25,
    pending: 5,
    byMarketplace: [
      { marketplace: 'eBay US', inSync: 440, outOfSync: 8, pending: 2 },
      { marketplace: 'eBay UK', inSync: 370, outOfSync: 8, pending: 2 },
      { marketplace: 'eBay DE', inSync: 310, outOfSync: 8, pending: 2 },
      { marketplace: 'Amazon US', inSync: 275, outOfSync: 4, pending: 1 },
    ],
  });
});

// 在庫差分
router.get('/inventory/diff', async (_req, res) => {
  const diffs = [
    { listingId: 'lst_1', localQty: 10, marketplaces: [{ name: 'eBay US', qty: 8, diff: -2 }, { name: 'eBay UK', qty: 10, diff: 0 }] },
    { listingId: 'lst_2', localQty: 5, marketplaces: [{ name: 'eBay US', qty: 5, diff: 0 }, { name: 'Amazon US', qty: 3, diff: -2 }] },
    { listingId: 'lst_3', localQty: 0, marketplaces: [{ name: 'eBay US', qty: 2, diff: 2 }] },
  ];

  res.json({ diffs, total: diffs.length });
});

// 在庫強制同期
router.post('/inventory/force-sync', async (req, res) => {
  const schema = z.object({
    listingIds: z.array(z.string()).optional(),
    marketplaceIds: z.array(z.string()).optional(),
    direction: z.enum(['push', 'pull']),
  });

  const data = schema.parse(req.body);

  res.json({
    jobId: `inv_sync_${Date.now()}`,
    direction: data.direction,
    status: 'started',
    startedAt: new Date().toISOString(),
  });
});

// --- 価格同期 ---

// 価格同期状態
router.get('/prices/status', async (_req, res) => {
  res.json({
    totalProducts: 450,
    inSync: 435,
    outOfSync: 12,
    pending: 3,
    priceRules: {
      enabled: true,
      rules: [
        { marketplace: 'eBay UK', adjustment: 'multiply', value: 0.85, currency: 'GBP' },
        { marketplace: 'eBay DE', adjustment: 'multiply', value: 0.95, currency: 'EUR' },
      ],
    },
  });
});

// 価格差分
router.get('/prices/diff', async (_req, res) => {
  const diffs = [
    { listingId: 'lst_1', localPrice: 100, marketplaces: [{ name: 'eBay US', price: 100, diff: 0 }, { name: 'eBay UK', price: 82, expectedPrice: 85, diff: -3 }] },
    { listingId: 'lst_2', localPrice: 50, marketplaces: [{ name: 'eBay US', price: 55, diff: 5 }] },
  ];

  res.json({ diffs, total: diffs.length });
});

// 価格ルール更新
router.put('/prices/rules', async (req, res) => {
  const schema = z.object({
    rules: z.array(z.object({
      marketplace: z.string(),
      adjustment: z.enum(['fixed', 'percentage', 'multiply']),
      value: z.number(),
      currency: z.string().optional(),
    })),
  });

  const data = schema.parse(req.body);

  res.json({
    rules: data.rules,
    updatedAt: new Date().toISOString(),
  });
});

// --- エラー管理 ---

// 同期エラー一覧
router.get('/errors', async (req, res) => {
  const errors = [
    { id: 'err_1', listingId: 'lst_45', marketplace: 'eBay DE', type: 'validation', message: 'Title too long for German marketplace', createdAt: '2026-02-15T10:20:00Z', resolved: false },
    { id: 'err_2', listingId: 'lst_78', marketplace: 'Amazon US', type: 'api_error', message: 'Rate limit exceeded', createdAt: '2026-02-15T10:15:00Z', resolved: true, resolvedAt: '2026-02-15T10:30:00Z' },
    { id: 'err_3', listingId: 'lst_92', marketplace: 'eBay US', type: 'inventory', message: 'Inventory quantity mismatch', createdAt: '2026-02-15T10:00:00Z', resolved: false },
  ];

  res.json({ errors, total: errors.length });
});

// エラー解決
router.post('/errors/:id/resolve', async (req, res) => {
  const schema = z.object({
    action: z.enum(['retry', 'ignore', 'manual']),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    errorId: req.params.id,
    action: data.action,
    resolved: true,
    resolvedAt: new Date().toISOString(),
  });
});

// エラー一括解決
router.post('/errors/bulk-resolve', async (req, res) => {
  const schema = z.object({
    errorIds: z.array(z.string()),
    action: z.enum(['retry', 'ignore']),
  });

  const data = schema.parse(req.body);

  res.json({
    resolved: data.errorIds.length,
    action: data.action,
    resolvedAt: new Date().toISOString(),
  });
});

// --- 設定 ---

// 同期設定
router.get('/settings', async (_req, res) => {
  res.json({
    globalSync: {
      enabled: true,
      defaultInterval: 15,
      retryAttempts: 3,
      retryDelay: 60,
    },
    inventory: {
      syncMode: 'realtime',
      reserveStock: 0,
      lowStockThreshold: 5,
    },
    prices: {
      syncMode: 'scheduled',
      roundPrices: true,
      roundTo: 0.99,
    },
    notifications: {
      onSyncComplete: false,
      onError: true,
      onLowStock: true,
    },
    conflictResolution: {
      inventory: 'local_wins',
      prices: 'local_wins',
    },
  });
});

// 同期設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    globalSync: z.object({
      enabled: z.boolean(),
      defaultInterval: z.number(),
      retryAttempts: z.number(),
      retryDelay: z.number(),
    }).optional(),
    inventory: z.object({
      syncMode: z.enum(['realtime', 'scheduled', 'manual']),
      reserveStock: z.number(),
      lowStockThreshold: z.number(),
    }).optional(),
    prices: z.object({
      syncMode: z.enum(['realtime', 'scheduled', 'manual']),
      roundPrices: z.boolean(),
      roundTo: z.number(),
    }).optional(),
    notifications: z.object({
      onSyncComplete: z.boolean(),
      onError: z.boolean(),
      onLowStock: z.boolean(),
    }).optional(),
    conflictResolution: z.object({
      inventory: z.enum(['local_wins', 'remote_wins', 'manual']),
      prices: z.enum(['local_wins', 'remote_wins', 'manual']),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayMarketplaceSyncRouter = router;

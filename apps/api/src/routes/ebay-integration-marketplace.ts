import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 210: Integration Marketplace（連携マーケットプレイス）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - 連携概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalIntegrations: 45,
    connectedIntegrations: 12,
    availableIntegrations: 33,
    activeConnections: 12,
    dataTransferredToday: '2.5 GB',
    syncSuccessRate: 99.2,
    lastSync: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/connected - 接続済み連携
router.get('/dashboard/connected', async (_req: Request, res: Response) => {
  res.json({
    integrations: [
      { id: '1', name: 'Shopify', category: 'E-commerce', status: 'active', connectedAt: '2025-12-01', lastSync: '2026-02-16 09:55:00', dataTransferred: '500 MB' },
      { id: '2', name: 'QuickBooks', category: 'Accounting', status: 'active', connectedAt: '2026-01-15', lastSync: '2026-02-16 09:50:00', dataTransferred: '150 MB' },
      { id: '3', name: 'Slack', category: 'Communication', status: 'active', connectedAt: '2026-01-20', lastSync: '2026-02-16 10:00:00', dataTransferred: '25 MB' },
      { id: '4', name: 'Google Sheets', category: 'Productivity', status: 'warning', connectedAt: '2026-02-01', lastSync: '2026-02-15 18:00:00', dataTransferred: '100 MB' },
      { id: '5', name: 'Mailchimp', category: 'Marketing', status: 'active', connectedAt: '2026-02-05', lastSync: '2026-02-16 08:00:00', dataTransferred: '50 MB' },
    ],
    total: 12,
  });
});

// GET /dashboard/popular - 人気の連携
router.get('/dashboard/popular', async (_req: Request, res: Response) => {
  res.json({
    integrations: [
      { id: '1', name: 'Shopify', category: 'E-commerce', installs: 15000, rating: 4.8, description: '世界最大のECプラットフォーム' },
      { id: '2', name: 'Amazon', category: 'E-commerce', installs: 12000, rating: 4.7, description: 'Amazon出品連携' },
      { id: '3', name: 'QuickBooks', category: 'Accounting', installs: 8500, rating: 4.6, description: '会計・経理自動化' },
      { id: '4', name: 'Zapier', category: 'Automation', installs: 7200, rating: 4.9, description: 'ワークフロー自動化' },
      { id: '5', name: 'Slack', category: 'Communication', installs: 6800, rating: 4.8, description: 'チーム通知連携' },
    ],
  });
});

// --- 連携管理 ---

// GET /integrations - 連携一覧
router.get('/integrations', async (_req: Request, res: Response) => {
  res.json({
    integrations: [
      { id: '1', name: 'Shopify', category: 'E-commerce', description: '世界最大のECプラットフォーム', status: 'connected', installs: 15000, rating: 4.8, logo: '/logos/shopify.png' },
      { id: '2', name: 'Amazon', category: 'E-commerce', description: 'Amazon出品連携', status: 'available', installs: 12000, rating: 4.7, logo: '/logos/amazon.png' },
      { id: '3', name: 'QuickBooks', category: 'Accounting', description: '会計・経理自動化', status: 'connected', installs: 8500, rating: 4.6, logo: '/logos/quickbooks.png' },
      { id: '4', name: 'Zapier', category: 'Automation', description: 'ワークフロー自動化', status: 'available', installs: 7200, rating: 4.9, logo: '/logos/zapier.png' },
      { id: '5', name: 'Slack', category: 'Communication', description: 'チーム通知連携', status: 'connected', installs: 6800, rating: 4.8, logo: '/logos/slack.png' },
    ],
    total: 45,
    categories: ['E-commerce', 'Accounting', 'Automation', 'Communication', 'Marketing', 'Shipping', 'Analytics', 'CRM'],
  });
});

// GET /integrations/:id - 連携詳細
router.get('/integrations/:id', async (req: Request, res: Response) => {
  res.json({
    integration: {
      id: req.params.id,
      name: 'Shopify',
      category: 'E-commerce',
      description: '世界最大のECプラットフォームとの連携。商品、注文、在庫を自動同期。',
      status: 'connected',
      version: '2.5.0',
      developer: 'RAKUDA Inc.',
      installs: 15000,
      rating: 4.8,
      reviews: 1250,
      features: [
        '商品の自動同期',
        '注文の自動インポート',
        '在庫のリアルタイム更新',
        '価格の自動調整',
        '顧客データの同期',
      ],
      permissions: ['products:read', 'products:write', 'orders:read', 'inventory:write'],
      connection: {
        connectedAt: '2025-12-01',
        lastSync: '2026-02-16 09:55:00',
        syncFrequency: '15分',
        dataTransferred: '500 MB',
        store: 'mystore.myshopify.com',
      },
      syncSettings: {
        products: true,
        orders: true,
        inventory: true,
        customers: false,
        pricing: true,
      },
    },
  });
});

// POST /integrations/:id/connect - 連携接続
router.post('/integrations/:id/connect', async (req: Request, res: Response) => {
  res.json({ success: true, integrationId: req.params.id, authUrl: 'https://accounts.shopify.com/oauth/authorize?client_id=xxx', message: '認証URLにリダイレクトしてください' });
});

// POST /integrations/:id/disconnect - 連携切断
router.post('/integrations/:id/disconnect', async (req: Request, res: Response) => {
  res.json({ success: true, integrationId: req.params.id, message: '連携を切断しました' });
});

// POST /integrations/:id/reconnect - 連携再接続
router.post('/integrations/:id/reconnect', async (req: Request, res: Response) => {
  res.json({ success: true, integrationId: req.params.id, authUrl: 'https://accounts.shopify.com/oauth/authorize?client_id=xxx', message: '再認証URLにリダイレクトしてください' });
});

// POST /integrations/:id/sync - 手動同期
router.post('/integrations/:id/sync', async (req: Request, res: Response) => {
  res.json({ success: true, integrationId: req.params.id, syncId: 'sync_123', message: '同期を開始しました' });
});

// PUT /integrations/:id/settings - 連携設定更新
router.put('/integrations/:id/settings', async (req: Request, res: Response) => {
  res.json({ success: true, integrationId: req.params.id, message: '設定を更新しました' });
});

// --- カテゴリ ---

// GET /categories - カテゴリ一覧
router.get('/categories', async (_req: Request, res: Response) => {
  res.json({
    categories: [
      { id: '1', name: 'E-commerce', description: 'ECプラットフォーム連携', count: 12, icon: 'shopping-cart' },
      { id: '2', name: 'Accounting', description: '会計・経理システム', count: 8, icon: 'calculator' },
      { id: '3', name: 'Automation', description: 'ワークフロー自動化', count: 6, icon: 'zap' },
      { id: '4', name: 'Communication', description: 'コミュニケーションツール', count: 5, icon: 'message-circle' },
      { id: '5', name: 'Marketing', description: 'マーケティングツール', count: 7, icon: 'megaphone' },
      { id: '6', name: 'Shipping', description: '配送・物流サービス', count: 4, icon: 'truck' },
      { id: '7', name: 'Analytics', description: '分析ツール', count: 3, icon: 'bar-chart' },
    ],
  });
});

// GET /categories/:id - カテゴリ詳細
router.get('/categories/:id', async (req: Request, res: Response) => {
  res.json({
    category: {
      id: req.params.id,
      name: 'E-commerce',
      description: 'ECプラットフォームとの連携。商品、注文、在庫を自動同期。',
      integrations: [
        { id: '1', name: 'Shopify', status: 'connected', installs: 15000, rating: 4.8 },
        { id: '2', name: 'Amazon', status: 'available', installs: 12000, rating: 4.7 },
        { id: '3', name: 'Walmart', status: 'available', installs: 5000, rating: 4.5 },
        { id: '4', name: 'Etsy', status: 'available', installs: 4500, rating: 4.6 },
      ],
    },
  });
});

// --- APIログ ---

// GET /logs - ログ一覧
router.get('/logs', async (_req: Request, res: Response) => {
  res.json({
    logs: [
      { id: '1', integrationId: 'shopify', integrationName: 'Shopify', type: 'sync', direction: 'incoming', status: 'success', timestamp: '2026-02-16 09:55:00', dataSize: '2.5 MB', duration: 12 },
      { id: '2', integrationId: 'quickbooks', integrationName: 'QuickBooks', type: 'api_call', direction: 'outgoing', status: 'success', timestamp: '2026-02-16 09:50:00', dataSize: '150 KB', duration: 3 },
      { id: '3', integrationId: 'slack', integrationName: 'Slack', type: 'webhook', direction: 'outgoing', status: 'success', timestamp: '2026-02-16 09:45:00', dataSize: '1 KB', duration: 1 },
      { id: '4', integrationId: 'google-sheets', integrationName: 'Google Sheets', type: 'sync', direction: 'outgoing', status: 'failed', timestamp: '2026-02-16 09:40:00', dataSize: '0', duration: 30, error: 'API rate limit exceeded' },
    ],
    total: 1250,
  });
});

// GET /logs/:id - ログ詳細
router.get('/logs/:id', async (req: Request, res: Response) => {
  res.json({
    log: {
      id: req.params.id,
      integrationId: 'shopify',
      integrationName: 'Shopify',
      type: 'sync',
      direction: 'incoming',
      status: 'success',
      timestamp: '2026-02-16 09:55:00',
      dataSize: '2.5 MB',
      duration: 12,
      request: {
        method: 'GET',
        url: 'https://mystore.myshopify.com/admin/api/2024-01/products.json',
        headers: { 'X-Shopify-Access-Token': '***' },
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{ products: [...] }',
      },
      metadata: {
        productsReceived: 150,
        ordersReceived: 25,
        inventoryUpdated: 75,
      },
    },
  });
});

// GET /logs/stats - ログ統計
router.get('/logs/stats', async (_req: Request, res: Response) => {
  res.json({
    stats: {
      totalRequests: 12500,
      successRate: 99.2,
      avgResponseTime: 45,
      dataTransferred: '2.5 GB',
      byIntegration: [
        { integration: 'Shopify', requests: 5000, successRate: 99.5, avgTime: 42 },
        { integration: 'QuickBooks', requests: 3000, successRate: 98.8, avgTime: 55 },
        { integration: 'Slack', requests: 2500, successRate: 100, avgTime: 15 },
      ],
    },
  });
});

// --- ウェブフック ---

// GET /webhooks - ウェブフック一覧
router.get('/webhooks', async (_req: Request, res: Response) => {
  res.json({
    webhooks: [
      { id: '1', name: '注文作成', integrationId: 'shopify', event: 'order.created', url: 'https://api.rakuda.com/webhooks/shopify/orders', status: 'active', lastTriggered: '2026-02-16 09:30:00' },
      { id: '2', name: '在庫更新', integrationId: 'shopify', event: 'inventory.updated', url: 'https://api.rakuda.com/webhooks/shopify/inventory', status: 'active', lastTriggered: '2026-02-16 08:45:00' },
      { id: '3', name: '支払い受領', integrationId: 'quickbooks', event: 'payment.received', url: 'https://api.rakuda.com/webhooks/quickbooks/payments', status: 'active', lastTriggered: '2026-02-15 18:00:00' },
    ],
    total: 15,
  });
});

// GET /webhooks/:id - ウェブフック詳細
router.get('/webhooks/:id', async (req: Request, res: Response) => {
  res.json({
    webhook: {
      id: req.params.id,
      name: '注文作成',
      integrationId: 'shopify',
      integrationName: 'Shopify',
      event: 'order.created',
      url: 'https://api.rakuda.com/webhooks/shopify/orders',
      status: 'active',
      secret: '***',
      createdAt: '2025-12-01',
      lastTriggered: '2026-02-16 09:30:00',
      totalTriggers: 1250,
      successRate: 99.8,
      history: [
        { timestamp: '2026-02-16 09:30:00', status: 'success', responseTime: 12 },
        { timestamp: '2026-02-16 08:15:00', status: 'success', responseTime: 15 },
        { timestamp: '2026-02-16 07:45:00', status: 'success', responseTime: 10 },
      ],
    },
  });
});

// POST /webhooks/:id/test - ウェブフックテスト
router.post('/webhooks/:id/test', async (req: Request, res: Response) => {
  res.json({ success: true, webhookId: req.params.id, testId: 'test_123', status: 'success', responseTime: 15, message: 'テストが成功しました' });
});

// PUT /webhooks/:id - ウェブフック更新
router.put('/webhooks/:id', async (req: Request, res: Response) => {
  res.json({ success: true, webhookId: req.params.id, message: 'ウェブフックを更新しました' });
});

// DELETE /webhooks/:id - ウェブフック削除
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  res.json({ success: true, webhookId: req.params.id, message: 'ウェブフックを削除しました' });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      defaultSyncInterval: 15,
      maxConcurrentSyncs: 5,
      retryOnFailure: true,
      retryAttempts: 3,
      retryDelay: 60,
      logRetentionDays: 30,
      webhookTimeout: 30,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

// GET /settings/notifications - 通知設定
router.get('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      onSyncSuccess: false,
      onSyncFailure: true,
      onConnectionLost: true,
      onNewIntegration: true,
      dailySummary: true,
      notificationChannel: 'email',
    },
  });
});

// PUT /settings/notifications - 通知設定更新
router.put('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '通知設定を更新しました' });
});

export default router;

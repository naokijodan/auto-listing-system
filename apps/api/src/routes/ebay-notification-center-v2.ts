import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 174: Notification Center v2 API
// 通知センターv2
// ============================================

// --- 通知一覧・管理 ---

// 通知一覧
router.get('/notifications', async (req, res) => {
  const notifications = [
    {
      id: 'notif_1',
      type: 'order',
      category: 'sales',
      title: '新規注文',
      message: '注文 #ORD-2026-0215-001 が入りました。商品: Wireless Earbuds',
      priority: 'high',
      status: 'unread',
      actionUrl: '/ebay/orders/ord_001',
      metadata: { orderId: 'ord_001', amount: 49.99 },
      createdAt: '2026-02-15T10:30:00Z',
    },
    {
      id: 'notif_2',
      type: 'inventory',
      category: 'alert',
      title: '在庫低下アラート',
      message: '「Phone Case Black」の在庫が残り3個になりました',
      priority: 'medium',
      status: 'unread',
      actionUrl: '/ebay/inventory/prod_002',
      metadata: { productId: 'prod_002', currentStock: 3 },
      createdAt: '2026-02-15T10:15:00Z',
    },
    {
      id: 'notif_3',
      type: 'message',
      category: 'communication',
      title: '新着メッセージ',
      message: 'バイヤー john_doe からメッセージが届きました',
      priority: 'medium',
      status: 'read',
      actionUrl: '/ebay/messages/msg_001',
      metadata: { buyerId: 'john_doe', messageId: 'msg_001' },
      createdAt: '2026-02-15T09:45:00Z',
    },
    {
      id: 'notif_4',
      type: 'system',
      category: 'info',
      title: 'システムメンテナンス予定',
      message: '2026年2月20日 02:00-04:00 にシステムメンテナンスを実施します',
      priority: 'low',
      status: 'read',
      actionUrl: null,
      metadata: {},
      createdAt: '2026-02-15T08:00:00Z',
    },
    {
      id: 'notif_5',
      type: 'competitor',
      category: 'alert',
      title: '競合価格変動',
      message: '監視中の競合が「USB Cable」の価格を$2下げました',
      priority: 'medium',
      status: 'unread',
      actionUrl: '/ebay/competitors/comp_001',
      metadata: { competitorId: 'comp_001', priceChange: -2 },
      createdAt: '2026-02-15T07:30:00Z',
    },
  ];

  res.json({ notifications, total: notifications.length, unreadCount: 3 });
});

// 通知詳細
router.get('/notifications/:id', async (req, res) => {
  const notification = {
    id: req.params.id,
    type: 'order',
    category: 'sales',
    title: '新規注文',
    message: '注文 #ORD-2026-0215-001 が入りました。商品: Wireless Earbuds',
    priority: 'high',
    status: 'unread',
    actionUrl: '/ebay/orders/ord_001',
    metadata: {
      orderId: 'ord_001',
      amount: 49.99,
      buyer: 'john_doe',
      items: [{ title: 'Wireless Earbuds', quantity: 1, price: 49.99 }],
    },
    actions: [
      { label: '注文を確認', action: 'view_order', primary: true },
      { label: '発送準備', action: 'prepare_shipment', primary: false },
    ],
    createdAt: '2026-02-15T10:30:00Z',
  };

  res.json(notification);
});

// 通知を既読にする
router.post('/notifications/:id/read', async (req, res) => {
  res.json({
    id: req.params.id,
    status: 'read',
    readAt: new Date().toISOString(),
  });
});

// 複数通知を既読にする
router.post('/notifications/mark-read', async (req, res) => {
  const schema = z.object({
    notificationIds: z.array(z.string()),
  });

  const data = schema.parse(req.body);

  res.json({
    updated: data.notificationIds.length,
    readAt: new Date().toISOString(),
  });
});

// すべて既読にする
router.post('/notifications/mark-all-read', async (req, res) => {
  res.json({
    updated: 15,
    readAt: new Date().toISOString(),
  });
});

// 通知を削除
router.delete('/notifications/:id', async (req, res) => {
  res.json({ success: true, notificationId: req.params.id });
});

// 複数通知を削除
router.post('/notifications/delete-batch', async (req, res) => {
  const schema = z.object({
    notificationIds: z.array(z.string()),
  });

  const data = schema.parse(req.body);

  res.json({ deleted: data.notificationIds.length });
});

// --- 通知設定 ---

// 通知設定取得
router.get('/settings', async (_req, res) => {
  res.json({
    channels: {
      inApp: { enabled: true },
      email: { enabled: true, address: 'user@example.com' },
      push: { enabled: true },
      slack: { enabled: false, webhookUrl: null },
      sms: { enabled: false, phoneNumber: null },
    },
    categories: {
      sales: { inApp: true, email: true, push: true },
      inventory: { inApp: true, email: true, push: false },
      communication: { inApp: true, email: false, push: true },
      competitor: { inApp: true, email: false, push: false },
      system: { inApp: true, email: true, push: false },
      report: { inApp: true, email: true, push: false },
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Tokyo',
      exceptUrgent: true,
    },
    digest: {
      enabled: true,
      frequency: 'daily',
      time: '09:00',
      includeCategories: ['sales', 'inventory', 'report'],
    },
  });
});

// 通知設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    channels: z.any().optional(),
    categories: z.any().optional(),
    quietHours: z.any().optional(),
    digest: z.any().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// チャンネル設定更新
router.put('/settings/channels/:channel', async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    address: z.string().optional(),
    webhookUrl: z.string().optional(),
    phoneNumber: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    channel: req.params.channel,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// カテゴリ設定更新
router.put('/settings/categories/:category', async (req, res) => {
  const schema = z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    slack: z.boolean().optional(),
    sms: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    category: req.params.category,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 通知ルール ---

// ルール一覧
router.get('/rules', async (_req, res) => {
  const rules = [
    {
      id: 'rule_1',
      name: '高額注文アラート',
      description: '$100以上の注文で即座に通知',
      trigger: { type: 'order', condition: 'amount > 100' },
      channels: ['email', 'push', 'slack'],
      priority: 'high',
      enabled: true,
      createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'rule_2',
      name: '在庫切れ警告',
      description: '在庫が0になったら通知',
      trigger: { type: 'inventory', condition: 'quantity == 0' },
      channels: ['email', 'push'],
      priority: 'critical',
      enabled: true,
      createdAt: '2026-01-20T15:00:00Z',
    },
    {
      id: 'rule_3',
      name: '競合価格監視',
      description: '競合が10%以上値下げしたら通知',
      trigger: { type: 'competitor', condition: 'priceChange < -10%' },
      channels: ['inApp'],
      priority: 'medium',
      enabled: true,
      createdAt: '2026-02-01T09:00:00Z',
    },
  ];

  res.json({ rules, total: rules.length });
});

// ルール作成
router.post('/rules', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    trigger: z.object({
      type: z.string(),
      condition: z.string(),
    }),
    channels: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    enabled: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `rule_${Date.now()}`,
    ...data,
    enabled: data.enabled ?? true,
    createdAt: new Date().toISOString(),
  });
});

// ルール更新
router.put('/rules/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    trigger: z.any().optional(),
    channels: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    enabled: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// ルール削除
router.delete('/rules/:id', async (req, res) => {
  res.json({ success: true, ruleId: req.params.id });
});

// --- テンプレート ---

// テンプレート一覧
router.get('/templates', async (_req, res) => {
  const templates = [
    { id: 'tmpl_1', name: '新規注文通知', type: 'order', subject: '新規注文: {{orderId}}', body: '{{buyer}}様から{{amount}}の注文が入りました', variables: ['orderId', 'buyer', 'amount'] },
    { id: 'tmpl_2', name: '在庫アラート', type: 'inventory', subject: '在庫警告: {{productTitle}}', body: '{{productTitle}}の在庫が{{quantity}}個になりました', variables: ['productTitle', 'quantity'] },
    { id: 'tmpl_3', name: 'メッセージ通知', type: 'message', subject: '新着メッセージ', body: '{{buyer}}からメッセージが届きました: {{preview}}', variables: ['buyer', 'preview'] },
  ];

  res.json({ templates });
});

// テンプレート作成
router.post('/templates', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.string(),
    subject: z.string(),
    body: z.string(),
    variables: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `tmpl_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
  });
});

// テンプレート更新
router.put('/templates/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    variables: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 履歴・統計 ---

// 通知履歴
router.get('/history', async (req, res) => {
  const history = [
    { id: 'hist_1', type: 'order', channel: 'email', status: 'delivered', sentAt: '2026-02-15T10:30:00Z', deliveredAt: '2026-02-15T10:30:05Z' },
    { id: 'hist_2', type: 'inventory', channel: 'push', status: 'delivered', sentAt: '2026-02-15T10:15:00Z', deliveredAt: '2026-02-15T10:15:02Z' },
    { id: 'hist_3', type: 'message', channel: 'email', status: 'failed', sentAt: '2026-02-15T09:45:00Z', error: 'Invalid email address' },
    { id: 'hist_4', type: 'system', channel: 'inApp', status: 'delivered', sentAt: '2026-02-15T08:00:00Z', deliveredAt: '2026-02-15T08:00:00Z' },
  ];

  res.json({ history, total: history.length });
});

// 通知統計
router.get('/stats', async (_req, res) => {
  res.json({
    period: 'month',
    sent: {
      total: 1245,
      byChannel: { inApp: 856, email: 234, push: 145, slack: 10 },
      byCategory: { sales: 456, inventory: 234, communication: 189, competitor: 156, system: 210 },
    },
    delivery: {
      delivered: 1198,
      failed: 47,
      deliveryRate: 96.2,
    },
    engagement: {
      opened: 876,
      clicked: 432,
      openRate: 73.1,
      clickRate: 49.3,
    },
    byDay: [
      { date: '2026-02-15', sent: 45, delivered: 43, opened: 32 },
      { date: '2026-02-14', sent: 52, delivered: 50, opened: 38 },
      { date: '2026-02-13', sent: 48, delivered: 47, opened: 35 },
    ],
  });
});

// --- プッシュ通知登録 ---

// デバイス登録
router.post('/devices', async (req, res) => {
  const schema = z.object({
    token: z.string(),
    platform: z.enum(['web', 'ios', 'android']),
    deviceName: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    deviceId: `device_${Date.now()}`,
    ...data,
    registeredAt: new Date().toISOString(),
  });
});

// デバイス一覧
router.get('/devices', async (_req, res) => {
  const devices = [
    { deviceId: 'device_1', platform: 'web', deviceName: 'Chrome on MacBook', lastActive: '2026-02-15T10:00:00Z' },
    { deviceId: 'device_2', platform: 'ios', deviceName: 'iPhone 15', lastActive: '2026-02-15T09:30:00Z' },
  ];

  res.json({ devices });
});

// デバイス削除
router.delete('/devices/:id', async (req, res) => {
  res.json({ success: true, deviceId: req.params.id });
});

// テスト通知送信
router.post('/test', async (req, res) => {
  const schema = z.object({
    channel: z.enum(['inApp', 'email', 'push', 'slack', 'sms']),
  });

  const data = schema.parse(req.body);

  res.json({
    channel: data.channel,
    status: 'sent',
    message: `テスト通知を${data.channel}に送信しました`,
  });
});

export const ebayNotificationCenterV2Router = router;

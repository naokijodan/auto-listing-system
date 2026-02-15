import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

type NotificationType = 'order' | 'message' | 'listing' | 'inventory' | 'payment' | 'shipping' | 'review' | 'policy' | 'system' | 'alert';
type NotificationPriority = 'urgent' | 'high' | 'medium' | 'low';
type NotificationStatus = 'unread' | 'read' | 'archived' | 'deleted';
type ChannelType = 'in_app' | 'email' | 'sms' | 'slack' | 'line' | 'push' | 'webhook';
type DigestFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'disabled';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  channels: ChannelType[];
  deliveredChannels: ChannelType[];
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationPreference {
  id: string;
  type: NotificationType;
  enabled: boolean;
  channels: ChannelType[];
  priority: NotificationPriority;
  digestFrequency: DigestFrequency;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

interface NotificationChannel {
  id: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  verified: boolean;
  lastUsedAt?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
  channels: ChannelType[];
  enabled: boolean;
}

interface NotificationDigest {
  id: string;
  frequency: DigestFrequency;
  lastSentAt: string;
  nextScheduledAt: string;
  notificationCount: number;
  channels: ChannelType[];
}

// ============================================
// モックデータ
// ============================================

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'order',
    priority: 'high',
    status: 'unread',
    title: '新規注文を受信しました',
    message: 'Vintage Seiko Watch の注文（$250.00）を受信しました。発送準備をしてください。',
    data: { orderId: 'order-12345', itemTitle: 'Vintage Seiko Watch', amount: 250.00 },
    actionUrl: '/orders/order-12345',
    actionLabel: '注文を確認',
    channels: ['in_app', 'email', 'slack'],
    deliveredChannels: ['in_app', 'email', 'slack'],
    createdAt: '2026-02-15T10:30:00Z'
  },
  {
    id: 'notif-2',
    type: 'message',
    priority: 'medium',
    status: 'unread',
    title: '購入者からのメッセージ',
    message: 'buyer123さんから商品についての質問があります。',
    data: { buyerId: 'buyer123', messageId: 'msg-456' },
    actionUrl: '/messages/msg-456',
    actionLabel: 'メッセージを見る',
    channels: ['in_app', 'email'],
    deliveredChannels: ['in_app', 'email'],
    createdAt: '2026-02-15T09:45:00Z'
  },
  {
    id: 'notif-3',
    type: 'inventory',
    priority: 'urgent',
    status: 'unread',
    title: '在庫切れ警告',
    message: '5商品の在庫が残り少なくなっています。補充を検討してください。',
    data: { lowStockCount: 5 },
    actionUrl: '/inventory?filter=low_stock',
    actionLabel: '在庫を確認',
    channels: ['in_app', 'email', 'slack'],
    deliveredChannels: ['in_app', 'email', 'slack'],
    createdAt: '2026-02-15T08:00:00Z'
  },
  {
    id: 'notif-4',
    type: 'review',
    priority: 'medium',
    status: 'read',
    title: '新しいレビューが投稿されました',
    message: '★★★★★ 5.0の評価をいただきました！',
    data: { rating: 5, reviewId: 'rev-789' },
    actionUrl: '/reviews/rev-789',
    actionLabel: 'レビューを見る',
    channels: ['in_app'],
    deliveredChannels: ['in_app'],
    readAt: '2026-02-15T07:30:00Z',
    createdAt: '2026-02-15T07:00:00Z'
  },
  {
    id: 'notif-5',
    type: 'shipping',
    priority: 'high',
    status: 'unread',
    title: '発送期限が近づいています',
    message: '3件の注文が発送期限まで24時間を切っています。',
    data: { urgentShipments: 3 },
    actionUrl: '/shipments?filter=urgent',
    actionLabel: '発送を確認',
    channels: ['in_app', 'email', 'sms'],
    deliveredChannels: ['in_app', 'email', 'sms'],
    createdAt: '2026-02-15T06:00:00Z'
  }
];

const mockPreferences: NotificationPreference[] = [
  {
    id: 'pref-1',
    type: 'order',
    enabled: true,
    channels: ['in_app', 'email', 'slack'],
    priority: 'high',
    digestFrequency: 'realtime'
  },
  {
    id: 'pref-2',
    type: 'message',
    enabled: true,
    channels: ['in_app', 'email'],
    priority: 'medium',
    digestFrequency: 'realtime'
  },
  {
    id: 'pref-3',
    type: 'inventory',
    enabled: true,
    channels: ['in_app', 'email', 'slack'],
    priority: 'high',
    digestFrequency: 'hourly'
  },
  {
    id: 'pref-4',
    type: 'shipping',
    enabled: true,
    channels: ['in_app', 'email', 'sms'],
    priority: 'urgent',
    digestFrequency: 'realtime'
  },
  {
    id: 'pref-5',
    type: 'review',
    enabled: true,
    channels: ['in_app'],
    priority: 'low',
    digestFrequency: 'daily'
  },
  {
    id: 'pref-6',
    type: 'system',
    enabled: true,
    channels: ['in_app', 'email'],
    priority: 'medium',
    digestFrequency: 'daily',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Tokyo'
    }
  }
];

const mockChannels: NotificationChannel[] = [
  {
    id: 'ch-1',
    type: 'email',
    name: 'メール',
    enabled: true,
    config: { email: 'seller@example.com' },
    verified: true,
    lastUsedAt: '2026-02-15T10:30:00Z'
  },
  {
    id: 'ch-2',
    type: 'slack',
    name: 'Slack',
    enabled: true,
    config: { webhook: 'https://hooks.slack.com/xxx', channel: '#sales-alerts' },
    verified: true,
    lastUsedAt: '2026-02-15T10:30:00Z'
  },
  {
    id: 'ch-3',
    type: 'sms',
    name: 'SMS',
    enabled: true,
    config: { phone: '+81-90-xxxx-xxxx' },
    verified: true,
    lastUsedAt: '2026-02-15T06:00:00Z'
  },
  {
    id: 'ch-4',
    type: 'line',
    name: 'LINE',
    enabled: false,
    config: {},
    verified: false
  },
  {
    id: 'ch-5',
    type: 'push',
    name: 'プッシュ通知',
    enabled: true,
    config: { deviceToken: 'xxx' },
    verified: true,
    lastUsedAt: '2026-02-15T09:00:00Z'
  }
];

const mockTemplates: NotificationTemplate[] = [
  {
    id: 'tmpl-1',
    name: '新規注文通知',
    type: 'order',
    subject: '【新規注文】{{itemTitle}}',
    body: '{{buyerName}}様から{{itemTitle}}（{{amount}}）の注文を受信しました。',
    variables: ['buyerName', 'itemTitle', 'amount', 'orderId'],
    channels: ['email', 'slack'],
    enabled: true
  },
  {
    id: 'tmpl-2',
    name: '発送期限警告',
    type: 'shipping',
    subject: '【緊急】発送期限が迫っています',
    body: '{{count}}件の注文が発送期限まで{{hours}}時間を切っています。',
    variables: ['count', 'hours'],
    channels: ['email', 'sms'],
    enabled: true
  },
  {
    id: 'tmpl-3',
    name: '在庫アラート',
    type: 'inventory',
    subject: '【在庫警告】{{itemTitle}}',
    body: '{{itemTitle}}の在庫が残り{{quantity}}個です。',
    variables: ['itemTitle', 'quantity', 'sku'],
    channels: ['email', 'slack'],
    enabled: true
  }
];

// ============================================
// スキーマ
// ============================================

const markReadSchema = z.object({
  notificationIds: z.array(z.string())
});

const preferenceSchema = z.object({
  type: z.enum(['order', 'message', 'listing', 'inventory', 'payment', 'shipping', 'review', 'policy', 'system', 'alert']),
  enabled: z.boolean(),
  channels: z.array(z.enum(['in_app', 'email', 'sms', 'slack', 'line', 'push', 'webhook'])),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  digestFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'disabled']),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
    timezone: z.string()
  }).optional()
});

const channelSchema = z.object({
  type: z.enum(['in_app', 'email', 'sms', 'slack', 'line', 'push', 'webhook']),
  name: z.string(),
  enabled: z.boolean(),
  config: z.record(z.any())
});

const templateSchema = z.object({
  name: z.string(),
  type: z.enum(['order', 'message', 'listing', 'inventory', 'payment', 'shipping', 'review', 'policy', 'system', 'alert']),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  channels: z.array(z.enum(['in_app', 'email', 'sms', 'slack', 'line', 'push', 'webhook'])),
  enabled: z.boolean().optional().default(true)
});

const sendTestSchema = z.object({
  channelId: z.string(),
  message: z.string().optional()
});

// ============================================
// エンドポイント
// ============================================

// 通知統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  const stats = {
    unread: mockNotifications.filter(n => n.status === 'unread').length,
    total: mockNotifications.length,
    byType: {
      order: mockNotifications.filter(n => n.type === 'order').length,
      message: mockNotifications.filter(n => n.type === 'message').length,
      inventory: mockNotifications.filter(n => n.type === 'inventory').length,
      shipping: mockNotifications.filter(n => n.type === 'shipping').length,
      review: mockNotifications.filter(n => n.type === 'review').length
    },
    byPriority: {
      urgent: mockNotifications.filter(n => n.priority === 'urgent').length,
      high: mockNotifications.filter(n => n.priority === 'high').length,
      medium: mockNotifications.filter(n => n.priority === 'medium').length,
      low: mockNotifications.filter(n => n.priority === 'low').length
    },
    channels: {
      active: mockChannels.filter(c => c.enabled).length,
      total: mockChannels.length
    },
    todayCount: 12,
    weeklyAvg: 85
  };

  res.json(stats);
});

// 通知一覧取得
router.get('/notifications', async (req: Request, res: Response) => {
  const { type, status, priority, limit, offset } = req.query;

  let filtered = [...mockNotifications];

  if (type) {
    filtered = filtered.filter(n => n.type === String(type));
  }
  if (status) {
    filtered = filtered.filter(n => n.status === String(status));
  }
  if (priority) {
    filtered = filtered.filter(n => n.priority === String(priority));
  }

  // 作成日時で降順ソート
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 20);

  res.json({
    notifications: filtered.slice(start, end),
    total: filtered.length,
    unread: filtered.filter(n => n.status === 'unread').length
  });
});

// 通知詳細取得
router.get('/notifications/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = mockNotifications.find(n => n.id === id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json(notification);
});

// 通知を既読にする
router.post('/notifications/mark-read', async (req: Request, res: Response) => {
  const validation = markReadSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { notificationIds } = validation.data;

  res.json({
    markedRead: notificationIds.length,
    updatedAt: new Date().toISOString()
  });
});

// すべて既読にする
router.post('/notifications/mark-all-read', async (_req: Request, res: Response) => {
  const unreadCount = mockNotifications.filter(n => n.status === 'unread').length;

  res.json({
    markedRead: unreadCount,
    updatedAt: new Date().toISOString()
  });
});

// 通知をアーカイブ
router.post('/notifications/:id/archive', async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = mockNotifications.find(n => n.id === id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ ...notification, status: 'archived' });
});

// 通知を削除
router.delete('/notifications/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = mockNotifications.find(n => n.id === id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ success: true, deletedId: id });
});

// 通知設定一覧
router.get('/preferences', async (_req: Request, res: Response) => {
  res.json({
    preferences: mockPreferences,
    total: mockPreferences.length
  });
});

// 通知設定更新
router.put('/preferences/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const validation = preferenceSchema.safeParse({ type, ...req.body });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const preference = mockPreferences.find(p => p.type === type);
  if (!preference) {
    return res.status(404).json({ error: 'Preference not found' });
  }

  const updated = { ...preference, ...validation.data };
  res.json(updated);
});

// 一括設定更新
router.put('/preferences', async (req: Request, res: Response) => {
  const { preferences } = req.body;

  if (!Array.isArray(preferences)) {
    return res.status(400).json({ error: 'preferences must be an array' });
  }

  res.json({
    updated: preferences.length,
    preferences
  });
});

// 通知チャンネル一覧
router.get('/channels', async (_req: Request, res: Response) => {
  res.json({
    channels: mockChannels,
    total: mockChannels.length
  });
});

// 通知チャンネル追加
router.post('/channels', async (req: Request, res: Response) => {
  const validation = channelSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newChannel: NotificationChannel = {
    id: `ch-${Date.now()}`,
    ...validation.data,
    verified: false
  };

  res.status(201).json(newChannel);
});

// 通知チャンネル更新
router.put('/channels/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = channelSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const channel = mockChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const updated = { ...channel, ...validation.data };
  res.json(updated);
});

// 通知チャンネル削除
router.delete('/channels/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const channel = mockChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({ success: true, deletedId: id });
});

// チャンネル検証
router.post('/channels/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;

  const channel = mockChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    channelId: id,
    verified: true,
    verifiedAt: new Date().toISOString()
  });
});

// テスト通知送信
router.post('/channels/:id/test', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = sendTestSchema.safeParse({ channelId: id, ...req.body });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const channel = mockChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    channelId: id,
    sent: true,
    message: validation.data.message || 'テスト通知',
    sentAt: new Date().toISOString()
  });
});

// テンプレート一覧
router.get('/templates', async (_req: Request, res: Response) => {
  res.json({
    templates: mockTemplates,
    total: mockTemplates.length
  });
});

// テンプレート作成
router.post('/templates', async (req: Request, res: Response) => {
  const validation = templateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newTemplate: NotificationTemplate = {
    id: `tmpl-${Date.now()}`,
    ...validation.data
  };

  res.status(201).json(newTemplate);
});

// テンプレート更新
router.put('/templates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = templateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const template = mockTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const updated = { ...template, ...validation.data };
  res.json(updated);
});

// テンプレート削除
router.delete('/templates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const template = mockTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ success: true, deletedId: id });
});

// テンプレートプレビュー
router.post('/templates/:id/preview', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { variables } = req.body;

  const template = mockTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables || {})) {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  res.json({
    templateId: id,
    preview: {
      subject,
      body
    }
  });
});

// ダイジェスト設定取得
router.get('/digest', async (_req: Request, res: Response) => {
  const digests: NotificationDigest[] = [
    {
      id: 'digest-1',
      frequency: 'daily',
      lastSentAt: '2026-02-14T09:00:00Z',
      nextScheduledAt: '2026-02-16T09:00:00Z',
      notificationCount: 15,
      channels: ['email']
    },
    {
      id: 'digest-2',
      frequency: 'weekly',
      lastSentAt: '2026-02-10T09:00:00Z',
      nextScheduledAt: '2026-02-17T09:00:00Z',
      notificationCount: 85,
      channels: ['email']
    }
  ];

  res.json({
    digests,
    settings: {
      dailyTime: '09:00',
      weeklyDay: 'monday',
      timezone: 'Asia/Tokyo'
    }
  });
});

// ダイジェスト設定更新
router.put('/digest', async (req: Request, res: Response) => {
  const { dailyTime, weeklyDay, timezone, enabled } = req.body;

  res.json({
    settings: {
      dailyTime: dailyTime || '09:00',
      weeklyDay: weeklyDay || 'monday',
      timezone: timezone || 'Asia/Tokyo',
      enabled: enabled !== false
    },
    updatedAt: new Date().toISOString()
  });
});

// 通知履歴取得
router.get('/history', async (req: Request, res: Response) => {
  const { type, channel, startDate, endDate, limit, offset } = req.query;

  res.json({
    history: mockNotifications.map(n => ({
      ...n,
      deliveryStatus: 'delivered',
      deliveredAt: n.createdAt
    })),
    total: mockNotifications.length,
    filters: { type, channel, startDate, endDate }
  });
});

// 配信レポート
router.get('/reports', async (req: Request, res: Response) => {
  const { period } = req.query;

  res.json({
    period: period || 'last_7_days',
    summary: {
      totalSent: 520,
      delivered: 515,
      failed: 5,
      opened: 380,
      clicked: 120
    },
    byChannel: [
      { channel: 'email', sent: 250, delivered: 248, opened: 180, clicked: 45 },
      { channel: 'slack', sent: 150, delivered: 150, opened: 120, clicked: 30 },
      { channel: 'in_app', sent: 100, delivered: 100, opened: 65, clicked: 40 },
      { channel: 'sms', sent: 20, delivered: 17, opened: 15, clicked: 5 }
    ],
    byType: [
      { type: 'order', count: 180, openRate: 85 },
      { type: 'shipping', count: 120, openRate: 78 },
      { type: 'message', count: 95, openRate: 72 },
      { type: 'inventory', count: 65, openRate: 68 },
      { type: 'review', count: 60, openRate: 55 }
    ],
    trends: [
      { date: '2026-02-09', sent: 68, opened: 52 },
      { date: '2026-02-10', sent: 75, opened: 58 },
      { date: '2026-02-11', sent: 82, opened: 61 },
      { date: '2026-02-12', sent: 71, opened: 54 },
      { date: '2026-02-13', sent: 78, opened: 59 },
      { date: '2026-02-14', sent: 85, opened: 63 },
      { date: '2026-02-15', sent: 61, opened: 33 }
    ]
  });
});

export const ebayNotificationCenterRouter = router;

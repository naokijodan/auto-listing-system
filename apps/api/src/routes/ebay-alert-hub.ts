import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// 型定義
// ============================================================

// アラートカテゴリ
type AlertCategory =
  | 'INVENTORY'
  | 'PRICING'
  | 'ORDER'
  | 'SHIPPING'
  | 'REVIEW'
  | 'PERFORMANCE'
  | 'SYSTEM'
  | 'COMPLIANCE';

// アラート重要度
type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT';

// アラートステータス
type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'DISMISSED';

// アラートソース
type AlertSource =
  | 'INVENTORY_ALERTS'
  | 'AUTO_PRICING'
  | 'ORDER_MANAGEMENT'
  | 'SHIPMENT_TRACKING'
  | 'REVIEW_MANAGEMENT'
  | 'SELLER_HUB'
  | 'API_MONITOR'
  | 'SYSTEM';

// 統合アラート
interface UnifiedAlert {
  id: string;
  category: AlertCategory;
  source: AlertSource;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  details: Record<string, unknown>;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  actionLabel?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  snoozedUntil?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// アラートルール
interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  source: AlertSource;
  conditions: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
    value: unknown;
  }[];
  severity: AlertSeverity;
  actions: {
    type: 'NOTIFY' | 'AUTO_RESOLVE' | 'ESCALATE' | 'WEBHOOK';
    config: Record<string, unknown>;
  }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 通知チャンネル
interface NotificationChannel {
  id: string;
  type: 'EMAIL' | 'SLACK' | 'SMS' | 'PUSH' | 'WEBHOOK';
  name: string;
  config: Record<string, unknown>;
  categories: AlertCategory[];
  severities: AlertSeverity[];
  isActive: boolean;
  createdAt: string;
}

// モックデータ
const mockAlerts: UnifiedAlert[] = [
  {
    id: 'alert_001',
    category: 'INVENTORY',
    source: 'INVENTORY_ALERTS',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    title: '在庫切れ: Vintage Watch Collection',
    message: '商品「Vintage Watch Collection - Seiko 5」の在庫が0になりました。',
    details: {
      listingId: 'lst_001',
      sku: 'VW-SEIKO-001',
      currentStock: 0,
      lastSoldAt: '2026-02-15T10:00:00Z',
    },
    relatedEntityId: 'lst_001',
    relatedEntityType: 'LISTING',
    actionUrl: '/ebay/inventory-alerts',
    actionLabel: '在庫を補充',
    tags: ['out_of_stock', 'urgent'],
    metadata: {},
    createdAt: '2026-02-15T10:30:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 'alert_002',
    category: 'PRICING',
    source: 'AUTO_PRICING',
    severity: 'WARNING',
    status: 'ACTIVE',
    title: '価格競争力低下',
    message: '5件の商品が競合より15%以上高くなっています。',
    details: {
      affectedListings: 5,
      averagePriceDiff: 18.5,
      competitorCount: 3,
    },
    actionUrl: '/ebay/auto-pricing',
    actionLabel: '価格を調整',
    tags: ['pricing', 'competitor'],
    metadata: {},
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'alert_003',
    category: 'SHIPPING',
    source: 'SHIPMENT_TRACKING',
    severity: 'URGENT',
    status: 'ACTIVE',
    title: '配送例外: 住所不明',
    message: '注文#EB-2026-001237の配送で住所問題が発生しています。',
    details: {
      orderId: 'ord_004',
      orderNumber: 'EB-2026-001237',
      carrier: 'DHL',
      trackingNumber: 'DH456789012345',
      exceptionType: 'ADDRESS_ISSUE',
    },
    relatedEntityId: 'ship_004',
    relatedEntityType: 'SHIPMENT',
    actionUrl: '/ebay/shipment-tracking',
    actionLabel: '例外を解決',
    tags: ['shipping', 'exception', 'address'],
    metadata: {},
    createdAt: '2026-02-13T12:00:00Z',
    updatedAt: '2026-02-13T12:00:00Z',
  },
  {
    id: 'alert_004',
    category: 'REVIEW',
    source: 'REVIEW_MANAGEMENT',
    severity: 'WARNING',
    status: 'ACKNOWLEDGED',
    title: 'ネガティブレビュー受信',
    message: '2つ星のレビューを受け取りました。対応が必要です。',
    details: {
      reviewId: 'rev_004',
      rating: 2,
      buyerName: 'antique_lover',
      itemTitle: 'Antique Clock - German Cuckoo',
    },
    relatedEntityId: 'rev_004',
    relatedEntityType: 'REVIEW',
    actionUrl: '/ebay/review-management',
    actionLabel: '返信する',
    acknowledgedAt: '2026-02-11T09:00:00Z',
    acknowledgedBy: 'admin',
    tags: ['review', 'negative'],
    metadata: {},
    createdAt: '2026-02-10T14:00:00Z',
    updatedAt: '2026-02-11T09:00:00Z',
  },
  {
    id: 'alert_005',
    category: 'PERFORMANCE',
    source: 'SELLER_HUB',
    severity: 'INFO',
    status: 'ACTIVE',
    title: 'セラーレベル更新',
    message: 'セラーレベルがTop Ratedに昇格しました！',
    details: {
      previousLevel: 'Above Standard',
      newLevel: 'Top Rated',
      effectiveDate: '2026-02-15',
    },
    actionUrl: '/ebay/seller-hub',
    actionLabel: '詳細を見る',
    tags: ['performance', 'level_up'],
    metadata: {},
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'alert_006',
    category: 'ORDER',
    source: 'ORDER_MANAGEMENT',
    severity: 'WARNING',
    status: 'ACTIVE',
    title: '未発送注文: 期限接近',
    message: '3件の注文が発送期限まで24時間を切っています。',
    details: {
      orderCount: 3,
      urgentOrders: ['EB-2026-001240', 'EB-2026-001241', 'EB-2026-001242'],
      deadlineHours: 24,
    },
    actionUrl: '/ebay/orders',
    actionLabel: '注文を処理',
    tags: ['order', 'deadline'],
    metadata: {},
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'alert_007',
    category: 'SYSTEM',
    source: 'API_MONITOR',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    title: 'API接続エラー',
    message: 'eBay APIへの接続が一時的に失敗しました。',
    details: {
      errorCode: 'CONNECTION_TIMEOUT',
      duration: 300, // 秒
      affectedEndpoints: ['inventory', 'orders'],
    },
    resolvedAt: '2026-02-14T16:00:00Z',
    tags: ['api', 'connection'],
    metadata: {},
    createdAt: '2026-02-14T15:55:00Z',
    updatedAt: '2026-02-14T16:00:00Z',
  },
  {
    id: 'alert_008',
    category: 'COMPLIANCE',
    source: 'SYSTEM',
    severity: 'WARNING',
    status: 'SNOOZED',
    title: 'ポリシー違反の可能性',
    message: '2件の出品がeBayポリシーに違反している可能性があります。',
    details: {
      listingIds: ['lst_010', 'lst_011'],
      violationType: 'PROHIBITED_ITEM_DESCRIPTION',
    },
    actionUrl: '/ebay/listings',
    actionLabel: '出品を確認',
    snoozedUntil: '2026-02-16T09:00:00Z',
    tags: ['compliance', 'policy'],
    metadata: {},
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-14T11:00:00Z',
  },
];

const mockRules: AlertRule[] = [
  {
    id: 'rule_001',
    name: '在庫切れ即時通知',
    category: 'INVENTORY',
    source: 'INVENTORY_ALERTS',
    conditions: [
      { field: 'currentStock', operator: 'eq', value: 0 },
    ],
    severity: 'CRITICAL',
    actions: [
      { type: 'NOTIFY', config: { channels: ['email', 'slack'] } },
    ],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'rule_002',
    name: 'ネガティブレビュー通知',
    category: 'REVIEW',
    source: 'REVIEW_MANAGEMENT',
    conditions: [
      { field: 'rating', operator: 'lte', value: 2 },
    ],
    severity: 'WARNING',
    actions: [
      { type: 'NOTIFY', config: { channels: ['email'] } },
      { type: 'ESCALATE', config: { assignTo: 'support_team' } },
    ],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'rule_003',
    name: '配送例外エスカレーション',
    category: 'SHIPPING',
    source: 'SHIPMENT_TRACKING',
    conditions: [
      { field: 'status', operator: 'eq', value: 'EXCEPTION' },
    ],
    severity: 'URGENT',
    actions: [
      { type: 'NOTIFY', config: { channels: ['email', 'sms'] } },
    ],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

const mockChannels: NotificationChannel[] = [
  {
    id: 'ch_001',
    type: 'EMAIL',
    name: 'メイン通知メール',
    config: { address: 'alerts@example.com' },
    categories: ['INVENTORY', 'PRICING', 'ORDER', 'SHIPPING', 'REVIEW', 'PERFORMANCE', 'SYSTEM', 'COMPLIANCE'],
    severities: ['WARNING', 'CRITICAL', 'URGENT'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ch_002',
    type: 'SLACK',
    name: 'Slack #alerts',
    config: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
    categories: ['INVENTORY', 'ORDER', 'SHIPPING'],
    severities: ['CRITICAL', 'URGENT'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ch_003',
    type: 'SMS',
    name: '緊急SMS',
    config: { phoneNumber: '+81-90-xxxx-xxxx' },
    categories: ['SHIPPING', 'SYSTEM'],
    severities: ['URGENT'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// ============================================================
// バリデーションスキーマ
// ============================================================

const listAlertsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.enum(['INVENTORY', 'PRICING', 'ORDER', 'SHIPPING', 'REVIEW', 'PERFORMANCE', 'SYSTEM', 'COMPLIANCE']).optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'URGENT']).optional(),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'DISMISSED']).optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const bulkActionSchema = z.object({
  alertIds: z.array(z.string()),
  action: z.enum(['ACKNOWLEDGE', 'RESOLVE', 'SNOOZE', 'DISMISS']),
  snoozeDuration: z.number().optional(), // 分
  notes: z.string().optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['INVENTORY', 'PRICING', 'ORDER', 'SHIPPING', 'REVIEW', 'PERFORMANCE', 'SYSTEM', 'COMPLIANCE']),
  source: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
    value: z.unknown(),
  })),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'URGENT']),
  actions: z.array(z.object({
    type: z.enum(['NOTIFY', 'AUTO_RESOLVE', 'ESCALATE', 'WEBHOOK']),
    config: z.record(z.unknown()),
  })),
});

// ============================================================
// エンドポイント
// ============================================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  const activeAlerts = mockAlerts.filter(a => a.status === 'ACTIVE');

  const dashboard = {
    summary: {
      total: mockAlerts.length,
      active: activeAlerts.length,
      acknowledged: mockAlerts.filter(a => a.status === 'ACKNOWLEDGED').length,
      resolved: mockAlerts.filter(a => a.status === 'RESOLVED').length,
      snoozed: mockAlerts.filter(a => a.status === 'SNOOZED').length,
    },
    bySeverity: {
      urgent: activeAlerts.filter(a => a.severity === 'URGENT').length,
      critical: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      warning: activeAlerts.filter(a => a.severity === 'WARNING').length,
      info: activeAlerts.filter(a => a.severity === 'INFO').length,
    },
    byCategory: {
      inventory: activeAlerts.filter(a => a.category === 'INVENTORY').length,
      pricing: activeAlerts.filter(a => a.category === 'PRICING').length,
      order: activeAlerts.filter(a => a.category === 'ORDER').length,
      shipping: activeAlerts.filter(a => a.category === 'SHIPPING').length,
      review: activeAlerts.filter(a => a.category === 'REVIEW').length,
      performance: activeAlerts.filter(a => a.category === 'PERFORMANCE').length,
      system: activeAlerts.filter(a => a.category === 'SYSTEM').length,
      compliance: activeAlerts.filter(a => a.category === 'COMPLIANCE').length,
    },
    urgentAlerts: activeAlerts
      .filter(a => a.severity === 'URGENT' || a.severity === 'CRITICAL')
      .slice(0, 5),
    recentAlerts: mockAlerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
    trends: {
      today: 8,
      yesterday: 12,
      thisWeek: 45,
      lastWeek: 38,
      changePercent: 18.4,
    },
    rules: {
      total: mockRules.length,
      active: mockRules.filter(r => r.isActive).length,
    },
    channels: {
      total: mockChannels.length,
      active: mockChannels.filter(c => c.isActive).length,
    },
  };

  res.json(dashboard);
});

// アラート一覧
router.get('/alerts', async (req: Request, res: Response) => {
  const params = listAlertsSchema.parse(req.query);

  let filtered = [...mockAlerts];

  if (params.category) {
    filtered = filtered.filter(a => a.category === params.category);
  }
  if (params.severity) {
    filtered = filtered.filter(a => a.severity === params.severity);
  }
  if (params.status) {
    filtered = filtered.filter(a => a.status === params.status);
  }
  if (params.source) {
    filtered = filtered.filter(a => a.source === params.source);
  }
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(search) ||
      a.message.toLowerCase().includes(search)
    );
  }

  // 重要度順でソート
  const severityOrder: Record<AlertSeverity, number> = { URGENT: 0, CRITICAL: 1, WARNING: 2, INFO: 3 };

  filtered.sort((a, b) => {
    if (params.sortBy === 'severity') {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    if (params.sortBy === 'category') {
      return a.category.localeCompare(b.category);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (params.sortOrder === 'asc' && params.sortBy === 'createdAt') {
    filtered.reverse();
  }

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const alerts = filtered.slice(start, start + params.limit);

  res.json({
    alerts,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    },
  });
});

// アラート詳細
router.get('/alerts/:alertId', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const alert = mockAlerts.find(a => a.id === alertId);

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  // 関連アラートを取得
  const relatedAlerts = mockAlerts
    .filter(a => a.id !== alertId && (
      a.category === alert.category ||
      a.relatedEntityId === alert.relatedEntityId
    ))
    .slice(0, 5);

  res.json({
    alert,
    relatedAlerts,
  });
});

// アラート確認
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { notes } = req.body;

  const alert = mockAlerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({
    success: true,
    alert: {
      ...alert,
      status: 'ACKNOWLEDGED' as AlertStatus,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'current_user',
      metadata: { ...alert.metadata, notes },
      updatedAt: new Date().toISOString(),
    },
  });
});

// アラート解決
router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { resolution, notes } = req.body;

  const alert = mockAlerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({
    success: true,
    alert: {
      ...alert,
      status: 'RESOLVED' as AlertStatus,
      resolvedAt: new Date().toISOString(),
      metadata: { ...alert.metadata, resolution, notes },
      updatedAt: new Date().toISOString(),
    },
  });
});

// アラートスヌーズ
router.post('/alerts/:alertId/snooze', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { duration } = req.body; // 分

  const alert = mockAlerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const snoozedUntil = new Date(Date.now() + (duration || 60) * 60 * 1000).toISOString();

  res.json({
    success: true,
    alert: {
      ...alert,
      status: 'SNOOZED' as AlertStatus,
      snoozedUntil,
      updatedAt: new Date().toISOString(),
    },
  });
});

// アラート却下
router.post('/alerts/:alertId/dismiss', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { reason } = req.body;

  const alert = mockAlerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({
    success: true,
    alert: {
      ...alert,
      status: 'DISMISSED' as AlertStatus,
      metadata: { ...alert.metadata, dismissReason: reason },
      updatedAt: new Date().toISOString(),
    },
  });
});

// 一括アクション
router.post('/alerts/bulk-action', async (req: Request, res: Response) => {
  const data = bulkActionSchema.parse(req.body);

  res.json({
    success: true,
    message: `${data.alertIds.length}件のアラートを${data.action}しました`,
    affected: data.alertIds.length,
  });
});

// ルール一覧
router.get('/rules', async (_req: Request, res: Response) => {
  res.json({
    rules: mockRules,
    total: mockRules.length,
  });
});

// ルール作成
router.post('/rules', async (req: Request, res: Response) => {
  const data = createRuleSchema.parse(req.body);

  const newRule: AlertRule = {
    id: `rule_${Date.now()}`,
    ...data,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    rule: newRule,
  });
});

// ルール更新
router.put('/rules/:ruleId', async (req: Request, res: Response) => {
  const { ruleId } = req.params;
  const data = createRuleSchema.partial().parse(req.body);

  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    success: true,
    rule: {
      ...rule,
      ...data,
      updatedAt: new Date().toISOString(),
    },
  });
});

// ルール削除
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  const { ruleId } = req.params;

  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    success: true,
    message: 'Rule deleted successfully',
  });
});

// ルール有効/無効
router.post('/rules/:ruleId/toggle', async (req: Request, res: Response) => {
  const { ruleId } = req.params;

  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    success: true,
    rule: {
      ...rule,
      isActive: !rule.isActive,
      updatedAt: new Date().toISOString(),
    },
  });
});

// 通知チャンネル一覧
router.get('/channels', async (_req: Request, res: Response) => {
  res.json({
    channels: mockChannels,
    total: mockChannels.length,
  });
});

// 通知チャンネル作成
router.post('/channels', async (req: Request, res: Response) => {
  const { type, name, config, categories, severities } = req.body;

  const newChannel: NotificationChannel = {
    id: `ch_${Date.now()}`,
    type,
    name,
    config,
    categories,
    severities,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    channel: newChannel,
  });
});

// 通知チャンネル更新
router.put('/channels/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const data = req.body;

  const channel = mockChannels.find(c => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    success: true,
    channel: {
      ...channel,
      ...data,
    },
  });
});

// 通知チャンネル削除
router.delete('/channels/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;

  const channel = mockChannels.find(c => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    success: true,
    message: 'Channel deleted successfully',
  });
});

// テスト通知
router.post('/channels/:channelId/test', async (req: Request, res: Response) => {
  const { channelId } = req.params;

  const channel = mockChannels.find(c => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    success: true,
    message: `テスト通知を${channel.name}に送信しました`,
  });
});

// 統計情報
router.get('/stats', async (req: Request, res: Response) => {
  const { period = '30d' } = req.query;

  const stats = {
    period,
    alerts: {
      total: mockAlerts.length,
      active: mockAlerts.filter(a => a.status === 'ACTIVE').length,
      resolved: mockAlerts.filter(a => a.status === 'RESOLVED').length,
      averageResolutionTime: 4.2, // 時間
    },
    byCategory: {
      inventory: mockAlerts.filter(a => a.category === 'INVENTORY').length,
      pricing: mockAlerts.filter(a => a.category === 'PRICING').length,
      order: mockAlerts.filter(a => a.category === 'ORDER').length,
      shipping: mockAlerts.filter(a => a.category === 'SHIPPING').length,
      review: mockAlerts.filter(a => a.category === 'REVIEW').length,
      performance: mockAlerts.filter(a => a.category === 'PERFORMANCE').length,
      system: mockAlerts.filter(a => a.category === 'SYSTEM').length,
      compliance: mockAlerts.filter(a => a.category === 'COMPLIANCE').length,
    },
    bySeverity: {
      urgent: mockAlerts.filter(a => a.severity === 'URGENT').length,
      critical: mockAlerts.filter(a => a.severity === 'CRITICAL').length,
      warning: mockAlerts.filter(a => a.severity === 'WARNING').length,
      info: mockAlerts.filter(a => a.severity === 'INFO').length,
    },
    trends: [
      { date: '2026-02-09', count: 8 },
      { date: '2026-02-10', count: 12 },
      { date: '2026-02-11', count: 6 },
      { date: '2026-02-12', count: 9 },
      { date: '2026-02-13', count: 15 },
      { date: '2026-02-14', count: 7 },
      { date: '2026-02-15', count: 5 },
    ],
  };

  res.json(stats);
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  const settings = {
    notifications: {
      enabled: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      digest: {
        enabled: true,
        frequency: 'DAILY',
        time: '09:00',
      },
    },
    autoActions: {
      autoAcknowledgeInfo: true,
      autoResolveAfterDays: 7,
      autoEscalateUrgent: true,
    },
    display: {
      showResolvedAlerts: false,
      defaultSortBy: 'severity',
      alertsPerPage: 20,
    },
  };

  res.json(settings);
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  const data = req.body;

  res.json({
    success: true,
    message: 'Settings updated successfully',
    settings: data,
  });
});

export { router as ebayAlertHubRouter };

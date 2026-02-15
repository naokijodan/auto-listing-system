import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 175: Customer Support Hub API
// カスタマーサポートハブ
// ============================================

// --- チケット管理 ---

// チケット一覧
router.get('/tickets', async (req, res) => {
  const tickets = [
    {
      id: 'ticket_1',
      subject: '商品が届かない',
      description: '2週間前に注文した商品がまだ届きません',
      status: 'open',
      priority: 'high',
      category: 'shipping',
      customer: { id: 'cust_001', name: 'John Doe', email: 'john@example.com' },
      orderId: 'ord_001',
      assignee: { id: 'agent_1', name: '田中' },
      messages: 3,
      createdAt: '2026-02-14T10:00:00Z',
      updatedAt: '2026-02-15T09:30:00Z',
      dueAt: '2026-02-16T10:00:00Z',
    },
    {
      id: 'ticket_2',
      subject: '返品したい',
      description: 'サイズが合わないので返品したいです',
      status: 'in_progress',
      priority: 'medium',
      category: 'returns',
      customer: { id: 'cust_002', name: 'Jane Smith', email: 'jane@example.com' },
      orderId: 'ord_002',
      assignee: { id: 'agent_2', name: '佐藤' },
      messages: 5,
      createdAt: '2026-02-13T14:00:00Z',
      updatedAt: '2026-02-15T08:00:00Z',
      dueAt: '2026-02-15T14:00:00Z',
    },
    {
      id: 'ticket_3',
      subject: '商品の使い方を教えてください',
      description: '説明書が分かりにくいです',
      status: 'waiting',
      priority: 'low',
      category: 'product_inquiry',
      customer: { id: 'cust_003', name: 'Bob Wilson', email: 'bob@example.com' },
      orderId: null,
      assignee: null,
      messages: 2,
      createdAt: '2026-02-15T08:00:00Z',
      updatedAt: '2026-02-15T08:00:00Z',
      dueAt: '2026-02-17T08:00:00Z',
    },
    {
      id: 'ticket_4',
      subject: '商品が破損していた',
      description: '開封したら中身が壊れていました',
      status: 'resolved',
      priority: 'high',
      category: 'damage',
      customer: { id: 'cust_004', name: 'Alice Brown', email: 'alice@example.com' },
      orderId: 'ord_003',
      assignee: { id: 'agent_1', name: '田中' },
      messages: 8,
      createdAt: '2026-02-10T11:00:00Z',
      updatedAt: '2026-02-14T16:00:00Z',
      resolvedAt: '2026-02-14T16:00:00Z',
      resolution: '交換品を発送済み',
    },
  ];

  res.json({ tickets, total: tickets.length });
});

// チケット詳細
router.get('/tickets/:id', async (req, res) => {
  const ticket = {
    id: req.params.id,
    subject: '商品が届かない',
    description: '2週間前に注文した商品がまだ届きません。追跡番号を確認しましたが、配送中のままです。',
    status: 'open',
    priority: 'high',
    category: 'shipping',
    customer: {
      id: 'cust_001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      purchaseHistory: { totalOrders: 5, totalSpent: 245.50 },
    },
    order: {
      id: 'ord_001',
      items: [{ title: 'Wireless Earbuds', quantity: 1, price: 49.99 }],
      total: 49.99,
      shippedAt: '2026-02-01T10:00:00Z',
      trackingNumber: 'TRK123456789',
      carrier: 'USPS',
    },
    assignee: { id: 'agent_1', name: '田中', email: 'tanaka@company.com' },
    messages: [
      { id: 'msg_1', sender: 'customer', content: '2週間前に注文した商品がまだ届きません。追跡番号を確認しましたが、配送中のままです。', createdAt: '2026-02-14T10:00:00Z' },
      { id: 'msg_2', sender: 'agent', agentName: '田中', content: 'お問い合わせありがとうございます。追跡情報を確認いたします。少々お待ちください。', createdAt: '2026-02-14T10:30:00Z' },
      { id: 'msg_3', sender: 'agent', agentName: '田中', content: '配送業者に確認したところ、配送に遅延が発生しているとのことです。2-3日以内にお届けできる見込みです。', createdAt: '2026-02-15T09:30:00Z' },
    ],
    timeline: [
      { event: 'created', description: 'チケット作成', timestamp: '2026-02-14T10:00:00Z' },
      { event: 'assigned', description: '田中に割り当て', timestamp: '2026-02-14T10:15:00Z' },
      { event: 'message', description: 'エージェントが返信', timestamp: '2026-02-14T10:30:00Z' },
      { event: 'message', description: 'エージェントが返信', timestamp: '2026-02-15T09:30:00Z' },
    ],
    tags: ['shipping_delay', 'usps'],
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-15T09:30:00Z',
    dueAt: '2026-02-16T10:00:00Z',
  };

  res.json(ticket);
});

// チケット作成
router.post('/tickets', async (req, res) => {
  const schema = z.object({
    subject: z.string().min(1),
    description: z.string(),
    category: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    customerId: z.string().optional(),
    orderId: z.string().optional(),
    assigneeId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `ticket_${Date.now()}`,
    ...data,
    status: 'open',
    messages: 0,
    createdAt: new Date().toISOString(),
  });
});

// チケット更新
router.put('/tickets/:id', async (req, res) => {
  const schema = z.object({
    subject: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.string().optional(),
    assigneeId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    resolution: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// チケットにメッセージ追加
router.post('/tickets/:id/messages', async (req, res) => {
  const schema = z.object({
    content: z.string().min(1),
    internal: z.boolean().optional(),
    attachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      type: z.string(),
    })).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `msg_${Date.now()}`,
    ticketId: req.params.id,
    sender: 'agent',
    ...data,
    createdAt: new Date().toISOString(),
  });
});

// チケットを解決済みにする
router.post('/tickets/:id/resolve', async (req, res) => {
  const schema = z.object({
    resolution: z.string(),
    sendNotification: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    status: 'resolved',
    resolution: data.resolution,
    resolvedAt: new Date().toISOString(),
  });
});

// チケットを再開
router.post('/tickets/:id/reopen', async (req, res) => {
  res.json({
    id: req.params.id,
    status: 'open',
    reopenedAt: new Date().toISOString(),
  });
});

// --- エージェント管理 ---

// エージェント一覧
router.get('/agents', async (_req, res) => {
  const agents = [
    { id: 'agent_1', name: '田中', email: 'tanaka@company.com', status: 'online', activeTickets: 5, resolvedToday: 3, avgResponseTime: 15 },
    { id: 'agent_2', name: '佐藤', email: 'sato@company.com', status: 'online', activeTickets: 4, resolvedToday: 5, avgResponseTime: 12 },
    { id: 'agent_3', name: '鈴木', email: 'suzuki@company.com', status: 'away', activeTickets: 2, resolvedToday: 2, avgResponseTime: 20 },
    { id: 'agent_4', name: '山田', email: 'yamada@company.com', status: 'offline', activeTickets: 0, resolvedToday: 4, avgResponseTime: 10 },
  ];

  res.json({ agents, total: agents.length });
});

// エージェント詳細
router.get('/agents/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    name: '田中',
    email: 'tanaka@company.com',
    status: 'online',
    role: 'senior_agent',
    skills: ['shipping', 'returns', 'technical'],
    stats: {
      activeTickets: 5,
      resolvedToday: 3,
      resolvedThisWeek: 25,
      avgResponseTime: 15,
      avgResolutionTime: 120,
      customerSatisfaction: 4.5,
    },
  });
});

// エージェントステータス更新
router.put('/agents/:id/status', async (req, res) => {
  const schema = z.object({
    status: z.enum(['online', 'away', 'busy', 'offline']),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    status: data.status,
    updatedAt: new Date().toISOString(),
  });
});

// --- 返信テンプレート ---

// テンプレート一覧
router.get('/templates', async (_req, res) => {
  const templates = [
    { id: 'tmpl_1', name: '配送遅延のお詫び', category: 'shipping', content: 'お客様、\n\nお問い合わせいただきありがとうございます。\n配送の遅延についてお詫び申し上げます。\n\n現在、配送状況を確認しております。{{tracking_info}}\n\n何かご不明な点がございましたら、お気軽にお問い合わせください。\n\nよろしくお願いいたします。', usageCount: 45 },
    { id: 'tmpl_2', name: '返品手続きのご案内', category: 'returns', content: 'お客様、\n\n返品のご依頼を承りました。\n\n返品手続きの流れ:\n1. 商品を元の梱包に入れてください\n2. 返送先: {{return_address}}\n3. 返金は商品到着後3-5営業日以内に処理されます\n\nご不明な点がございましたら、お気軽にお問い合わせください。', usageCount: 32 },
    { id: 'tmpl_3', name: '破損商品の交換', category: 'damage', content: 'お客様、\n\n商品の破損について、大変申し訳ございません。\n\n新しい商品を本日中に発送いたします。\n追跡番号は発送後にお知らせいたします。\n\n破損した商品の返送は不要です。\n\nご迷惑をおかけしたことをお詫び申し上げます。', usageCount: 28 },
  ];

  res.json({ templates });
});

// テンプレート作成
router.post('/templates', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    category: z.string(),
    content: z.string(),
    variables: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `tmpl_${Date.now()}`,
    ...data,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// テンプレート更新
router.put('/templates/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    content: z.string().optional(),
    variables: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// テンプレート削除
router.delete('/templates/:id', async (req, res) => {
  res.json({ success: true, templateId: req.params.id });
});

// --- ナレッジベース ---

// 記事一覧
router.get('/knowledge', async (req, res) => {
  const articles = [
    { id: 'kb_1', title: '返品ポリシーについて', category: 'policies', views: 234, helpful: 45, notHelpful: 3, updatedAt: '2026-02-01T10:00:00Z' },
    { id: 'kb_2', title: '配送にかかる日数', category: 'shipping', views: 189, helpful: 32, notHelpful: 2, updatedAt: '2026-01-25T14:00:00Z' },
    { id: 'kb_3', title: '商品の返品方法', category: 'returns', views: 156, helpful: 28, notHelpful: 5, updatedAt: '2026-02-10T09:00:00Z' },
    { id: 'kb_4', title: 'お支払い方法について', category: 'payment', views: 145, helpful: 25, notHelpful: 1, updatedAt: '2026-01-15T11:00:00Z' },
  ];

  res.json({ articles, total: articles.length });
});

// 記事詳細
router.get('/knowledge/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    title: '返品ポリシーについて',
    category: 'policies',
    content: '# 返品ポリシー\n\n## 返品可能期間\n商品到着後30日以内であれば返品を受け付けております。\n\n## 返品条件\n- 未使用・未開封の商品\n- タグが付いた状態の商品\n- 元の梱包が保たれている商品\n\n## 返品不可の商品\n- 使用済みの商品\n- カスタマイズされた商品\n- セール品\n\n## 返金について\n- 返品商品到着後3-5営業日以内に処理\n- 元の支払い方法に返金',
    views: 234,
    helpful: 45,
    notHelpful: 3,
    relatedArticles: ['kb_3', 'kb_2'],
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  });
});

// 記事作成
router.post('/knowledge', async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    category: z.string(),
    content: z.string(),
    tags: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `kb_${Date.now()}`,
    ...data,
    views: 0,
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
  });
});

// --- 統計・レポート ---

// サポート統計
router.get('/stats', async (_req, res) => {
  res.json({
    period: 'month',
    tickets: {
      total: 156,
      open: 12,
      inProgress: 8,
      waiting: 5,
      resolved: 115,
      closed: 16,
      avgResponseTime: 18,
      avgResolutionTime: 145,
    },
    satisfaction: {
      score: 4.3,
      responses: 89,
      distribution: { 5: 45, 4: 28, 3: 10, 2: 4, 1: 2 },
    },
    categories: [
      { category: 'shipping', count: 45, percentage: 28.8 },
      { category: 'returns', count: 38, percentage: 24.4 },
      { category: 'product_inquiry', count: 32, percentage: 20.5 },
      { category: 'damage', count: 25, percentage: 16.0 },
      { category: 'other', count: 16, percentage: 10.3 },
    ],
    byDay: [
      { date: '2026-02-15', created: 8, resolved: 6 },
      { date: '2026-02-14', created: 12, resolved: 10 },
      { date: '2026-02-13', created: 10, resolved: 12 },
      { date: '2026-02-12', created: 15, resolved: 14 },
      { date: '2026-02-11', created: 9, resolved: 11 },
    ],
    agentPerformance: [
      { agentId: 'agent_1', name: '田中', resolved: 28, avgTime: 15, satisfaction: 4.5 },
      { agentId: 'agent_2', name: '佐藤', resolved: 35, avgTime: 12, satisfaction: 4.6 },
      { agentId: 'agent_3', name: '鈴木', resolved: 22, avgTime: 20, satisfaction: 4.2 },
      { agentId: 'agent_4', name: '山田', resolved: 30, avgTime: 10, satisfaction: 4.7 },
    ],
  });
});

// SLA レポート
router.get('/sla', async (_req, res) => {
  res.json({
    targets: {
      firstResponseTime: { target: 30, actual: 18, met: true },
      resolutionTime: { target: 240, actual: 145, met: true },
      satisfactionScore: { target: 4.0, actual: 4.3, met: true },
    },
    compliance: {
      overall: 94.5,
      byPriority: {
        urgent: { target: 15, compliance: 98 },
        high: { target: 60, compliance: 95 },
        medium: { target: 120, compliance: 93 },
        low: { target: 240, compliance: 92 },
      },
    },
    violations: [
      { ticketId: 'ticket_45', priority: 'high', targetTime: 60, actualTime: 78, date: '2026-02-14' },
      { ticketId: 'ticket_52', priority: 'medium', targetTime: 120, actualTime: 135, date: '2026-02-13' },
    ],
  });
});

// --- 自動化 ---

// 自動ルール一覧
router.get('/automation/rules', async (_req, res) => {
  const rules = [
    { id: 'auto_1', name: '高優先度チケットの自動割り当て', trigger: 'ticket.created', conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }], actions: [{ type: 'assign', agentId: 'agent_1' }, { type: 'notify', channel: 'slack' }], enabled: true },
    { id: 'auto_2', name: '24時間未応答の警告', trigger: 'ticket.sla_warning', conditions: [{ field: 'responseTime', operator: 'greater_than', value: 1440 }], actions: [{ type: 'escalate' }, { type: 'notify', channel: 'email' }], enabled: true },
    { id: 'auto_3', name: '配送カテゴリの自動タグ付け', trigger: 'ticket.created', conditions: [{ field: 'subject', operator: 'contains', value: '配送' }], actions: [{ type: 'add_tag', tag: 'shipping' }, { type: 'set_category', category: 'shipping' }], enabled: true },
  ];

  res.json({ rules });
});

// 自動ルール作成
router.post('/automation/rules', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    trigger: z.string(),
    conditions: z.array(z.any()),
    actions: z.array(z.any()),
    enabled: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `auto_${Date.now()}`,
    ...data,
    enabled: data.enabled ?? true,
    createdAt: new Date().toISOString(),
  });
});

export const ebayCustomerSupportHubRouter = router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

// メッセージタイプ
const MESSAGE_TYPES = {
  INQUIRY: 'INQUIRY',           // 問い合わせ
  ORDER: 'ORDER',               // 注文関連
  SHIPPING: 'SHIPPING',         // 配送関連
  RETURN: 'RETURN',             // 返品関連
  FEEDBACK: 'FEEDBACK',         // フィードバック関連
  OFFER: 'OFFER',               // オファー関連
  DISPUTE: 'DISPUTE',           // 紛争関連
  GENERAL: 'GENERAL',           // 一般
} as const;

// メッセージステータス
const MESSAGE_STATUSES = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  REPLIED: 'REPLIED',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  FLAGGED: 'FLAGGED',
} as const;

// 優先度
const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

// 感情分析
const SENTIMENTS = {
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE',
  ANGRY: 'ANGRY',
} as const;

// アクションタイプ
const ACTION_TYPES = {
  REPLY: 'REPLY',
  FORWARD: 'FORWARD',
  ESCALATE: 'ESCALATE',
  CLOSE: 'CLOSE',
  SNOOZE: 'SNOOZE',
  TAG: 'TAG',
  ASSIGN: 'ASSIGN',
} as const;

// ============================================
// モックデータ
// ============================================

// メッセージスレッド
const mockThreads: Record<string, any> = {
  'thread-1': {
    id: 'thread-1',
    subject: 'Question about Vintage Seiko Watch',
    buyerId: 'buyer-001',
    buyerName: 'John Smith',
    buyerCountry: 'US',
    type: 'INQUIRY',
    status: 'UNREAD',
    priority: 'MEDIUM',
    sentiment: 'NEUTRAL',
    orderId: null,
    itemId: 'item-seiko-001',
    itemTitle: 'Vintage Seiko 5 Automatic Watch 1970s',
    messageCount: 2,
    lastMessageAt: '2026-02-15T10:30:00Z',
    createdAt: '2026-02-15T09:00:00Z',
    tags: ['pre-sale', 'watch'],
    assignedTo: null,
    snoozedUntil: null,
  },
  'thread-2': {
    id: 'thread-2',
    subject: 'Shipping delay inquiry',
    buyerId: 'buyer-002',
    buyerName: 'Emma Wilson',
    buyerCountry: 'GB',
    type: 'SHIPPING',
    status: 'PENDING',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    orderId: 'order-12345',
    itemId: 'item-camera-001',
    itemTitle: 'Canon EOS R5 Camera Body',
    messageCount: 5,
    lastMessageAt: '2026-02-15T11:00:00Z',
    createdAt: '2026-02-14T08:00:00Z',
    tags: ['shipping', 'urgent'],
    assignedTo: 'agent-1',
    snoozedUntil: null,
  },
  'thread-3': {
    id: 'thread-3',
    subject: 'Return request for damaged item',
    buyerId: 'buyer-003',
    buyerName: 'Hans Mueller',
    buyerCountry: 'DE',
    type: 'RETURN',
    status: 'FLAGGED',
    priority: 'URGENT',
    sentiment: 'ANGRY',
    orderId: 'order-12340',
    itemId: 'item-lens-001',
    itemTitle: 'Canon EF 70-200mm f/2.8L IS III',
    messageCount: 8,
    lastMessageAt: '2026-02-15T09:45:00Z',
    createdAt: '2026-02-13T14:00:00Z',
    tags: ['return', 'damaged', 'escalated'],
    assignedTo: 'agent-2',
    snoozedUntil: null,
  },
  'thread-4': {
    id: 'thread-4',
    subject: 'Thank you for the fast shipping!',
    buyerId: 'buyer-004',
    buyerName: 'Sarah Johnson',
    buyerCountry: 'AU',
    type: 'FEEDBACK',
    status: 'REPLIED',
    priority: 'LOW',
    sentiment: 'POSITIVE',
    orderId: 'order-12338',
    itemId: 'item-watch-002',
    itemTitle: 'Omega Seamaster Professional',
    messageCount: 3,
    lastMessageAt: '2026-02-14T16:00:00Z',
    createdAt: '2026-02-14T14:00:00Z',
    tags: ['feedback', 'positive'],
    assignedTo: null,
    snoozedUntil: null,
  },
};

// メッセージ
const mockMessages: Record<string, any[]> = {
  'thread-1': [
    {
      id: 'msg-1-1',
      threadId: 'thread-1',
      sender: 'buyer',
      senderName: 'John Smith',
      content: 'Hi, I\'m interested in this Seiko watch. Is it still keeping accurate time? Also, can you tell me more about its condition?',
      timestamp: '2026-02-15T09:00:00Z',
      isRead: true,
      attachments: [],
    },
    {
      id: 'msg-1-2',
      threadId: 'thread-1',
      sender: 'buyer',
      senderName: 'John Smith',
      content: 'Also, do you offer combined shipping if I buy multiple items?',
      timestamp: '2026-02-15T10:30:00Z',
      isRead: false,
      attachments: [],
    },
  ],
  'thread-2': [
    {
      id: 'msg-2-1',
      threadId: 'thread-2',
      sender: 'buyer',
      senderName: 'Emma Wilson',
      content: 'Hello, I ordered the Canon R5 a week ago but tracking shows no movement. When will it ship?',
      timestamp: '2026-02-14T08:00:00Z',
      isRead: true,
      attachments: [],
    },
    {
      id: 'msg-2-2',
      threadId: 'thread-2',
      sender: 'seller',
      senderName: 'You',
      content: 'Hi Emma, thank you for your patience. Let me check with our shipping department and get back to you shortly.',
      timestamp: '2026-02-14T10:00:00Z',
      isRead: true,
      attachments: [],
    },
  ],
  'thread-3': [
    {
      id: 'msg-3-1',
      threadId: 'thread-3',
      sender: 'buyer',
      senderName: 'Hans Mueller',
      content: 'The lens arrived with a cracked element! This is unacceptable. I need a full refund immediately.',
      timestamp: '2026-02-13T14:00:00Z',
      isRead: true,
      attachments: [
        { id: 'att-1', name: 'damage_photo1.jpg', url: '/images/damage1.jpg', type: 'image/jpeg' },
        { id: 'att-2', name: 'damage_photo2.jpg', url: '/images/damage2.jpg', type: 'image/jpeg' },
      ],
    },
  ],
};

// テンプレート
const mockTemplates: Record<string, any> = {
  'tpl-1': {
    id: 'tpl-1',
    name: '商品問い合わせ回答',
    category: 'INQUIRY',
    subject: 'Re: Your inquiry about {item_title}',
    content: 'Hi {buyer_name},\n\nThank you for your interest in {item_title}.\n\n{custom_response}\n\nPlease let me know if you have any other questions.\n\nBest regards',
    variables: ['buyer_name', 'item_title', 'custom_response'],
    usageCount: 156,
    lastUsed: '2026-02-15T08:00:00Z',
  },
  'tpl-2': {
    id: 'tpl-2',
    name: '発送通知',
    category: 'SHIPPING',
    subject: 'Your order has been shipped! - {order_id}',
    content: 'Hi {buyer_name},\n\nGreat news! Your order ({order_id}) has been shipped.\n\nTracking number: {tracking_number}\nCarrier: {carrier}\nEstimated delivery: {delivery_date}\n\nYou can track your package here: {tracking_url}\n\nThank you for your purchase!',
    variables: ['buyer_name', 'order_id', 'tracking_number', 'carrier', 'delivery_date', 'tracking_url'],
    usageCount: 423,
    lastUsed: '2026-02-15T10:00:00Z',
  },
  'tpl-3': {
    id: 'tpl-3',
    name: '返品承認',
    category: 'RETURN',
    subject: 'Return Request Approved - {order_id}',
    content: 'Hi {buyer_name},\n\nWe have approved your return request for order {order_id}.\n\nPlease ship the item back to:\n{return_address}\n\nOnce we receive the item, we will process your refund within 3 business days.\n\nIf you have any questions, please don\'t hesitate to ask.',
    variables: ['buyer_name', 'order_id', 'return_address'],
    usageCount: 89,
    lastUsed: '2026-02-14T14:00:00Z',
  },
  'tpl-4': {
    id: 'tpl-4',
    name: 'フィードバックお礼',
    category: 'FEEDBACK',
    subject: 'Thank you for your feedback!',
    content: 'Hi {buyer_name},\n\nThank you so much for your positive feedback! We really appreciate it.\n\nWe hope to serve you again in the future!\n\nBest regards',
    variables: ['buyer_name'],
    usageCount: 234,
    lastUsed: '2026-02-15T06:00:00Z',
  },
};

// 自動応答ルール
const mockAutoRules: Record<string, any> = {
  'rule-1': {
    id: 'rule-1',
    name: '営業時間外自動応答',
    isActive: true,
    trigger: {
      type: 'TIME_BASED',
      conditions: {
        outsideBusinessHours: true,
        businessHours: { start: '09:00', end: '18:00', timezone: 'Asia/Tokyo' },
      },
    },
    action: {
      type: 'AUTO_REPLY',
      templateId: null,
      customMessage: 'Thank you for your message. We are currently outside of business hours (9AM-6PM JST). We will respond to your inquiry as soon as possible during the next business day.',
    },
    stats: {
      triggered: 456,
      lastTriggered: '2026-02-15T07:30:00Z',
    },
  },
  'rule-2': {
    id: 'rule-2',
    name: '緊急エスカレーション',
    isActive: true,
    trigger: {
      type: 'KEYWORD',
      conditions: {
        keywords: ['urgent', 'immediately', 'refund', 'lawsuit', 'report'],
        sentiment: 'ANGRY',
      },
    },
    action: {
      type: 'ESCALATE',
      assignTo: 'supervisor',
      priority: 'URGENT',
      notify: ['email', 'slack'],
    },
    stats: {
      triggered: 23,
      lastTriggered: '2026-02-15T09:45:00Z',
    },
  },
  'rule-3': {
    id: 'rule-3',
    name: '配送問い合わせ自動振り分け',
    isActive: true,
    trigger: {
      type: 'CATEGORY',
      conditions: {
        messageType: 'SHIPPING',
      },
    },
    action: {
      type: 'ASSIGN',
      assignTo: 'shipping-team',
      addTags: ['shipping', 'auto-assigned'],
    },
    stats: {
      triggered: 189,
      lastTriggered: '2026-02-15T11:00:00Z',
    },
  },
};

// 統計
const mockStats = {
  inbox: {
    total: 156,
    unread: 23,
    pending: 18,
    resolved: 115,
  },
  byType: {
    INQUIRY: 45,
    ORDER: 32,
    SHIPPING: 28,
    RETURN: 15,
    FEEDBACK: 20,
    OFFER: 8,
    DISPUTE: 3,
    GENERAL: 5,
  },
  bySentiment: {
    POSITIVE: 42,
    NEUTRAL: 78,
    NEGATIVE: 28,
    ANGRY: 8,
  },
  responseTime: {
    average: 2.4, // hours
    median: 1.8,
    p95: 6.2,
  },
  satisfactionRate: 94.5,
  autoResponseRate: 35.2,
  recentActivity: {
    messagesReceived24h: 45,
    messagesSent24h: 38,
    resolved24h: 32,
  },
};

// エージェント
const mockAgents: any[] = [
  { id: 'agent-1', name: 'Agent 1', status: 'online', activeThreads: 5 },
  { id: 'agent-2', name: 'Agent 2', status: 'online', activeThreads: 3 },
  { id: 'supervisor', name: 'Supervisor', status: 'online', activeThreads: 2 },
  { id: 'shipping-team', name: 'Shipping Team', status: 'online', activeThreads: 8 },
];

// ============================================
// バリデーションスキーマ
// ============================================

const sendMessageSchema = z.object({
  threadId: z.string(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional(),
});

const createThreadSchema = z.object({
  buyerId: z.string(),
  subject: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['INQUIRY', 'ORDER', 'SHIPPING', 'RETURN', 'FEEDBACK', 'OFFER', 'DISPUTE', 'GENERAL']).optional(),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
});

const updateThreadSchema = z.object({
  status: z.enum(['UNREAD', 'READ', 'REPLIED', 'PENDING', 'RESOLVED', 'FLAGGED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  snoozedUntil: z.string().nullable().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['INQUIRY', 'ORDER', 'SHIPPING', 'RETURN', 'FEEDBACK', 'OFFER', 'DISPUTE', 'GENERAL']),
  subject: z.string().min(1),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

const createAutoRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.object({
    type: z.enum(['TIME_BASED', 'KEYWORD', 'CATEGORY', 'SENTIMENT']),
    conditions: z.record(z.any()),
  }),
  action: z.object({
    type: z.enum(['AUTO_REPLY', 'ESCALATE', 'ASSIGN', 'TAG', 'CLOSE']),
    templateId: z.string().nullable().optional(),
    customMessage: z.string().optional(),
    assignTo: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    addTags: z.array(z.string()).optional(),
  }),
});

const searchMessagesSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['INQUIRY', 'ORDER', 'SHIPPING', 'RETURN', 'FEEDBACK', 'OFFER', 'DISPUTE', 'GENERAL']).optional(),
  status: z.enum(['UNREAD', 'READ', 'REPLIED', 'PENDING', 'RESOLVED', 'FLAGGED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANGRY']).optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ============================================
// エンドポイント
// ============================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      stats: mockStats,
      recentThreads: Object.values(mockThreads)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, 5),
      urgentThreads: Object.values(mockThreads).filter(t => t.priority === 'URGENT'),
      agents: mockAgents,
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// スレッド一覧
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const { status, type, priority, assignedTo, search } = req.query;
    let threads = Object.values(mockThreads);

    if (status) {
      threads = threads.filter(t => t.status === status);
    }

    if (type) {
      threads = threads.filter(t => t.type === type);
    }

    if (priority) {
      threads = threads.filter(t => t.priority === priority);
    }

    if (assignedTo) {
      threads = threads.filter(t => t.assignedTo === assignedTo);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      threads = threads.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.buyerName.toLowerCase().includes(q) ||
        t.itemTitle?.toLowerCase().includes(q)
      );
    }

    // 最新順にソート
    threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    res.json({
      threads,
      total: threads.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// スレッド詳細
router.get('/threads/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const thread = mockThreads[threadId];

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messages = mockMessages[threadId] || [];

    res.json({
      ...thread,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// スレッド作成
router.post('/threads', async (req: Request, res: Response) => {
  try {
    const validation = createThreadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;
    const threadId = `thread-${Date.now()}`;

    const newThread = {
      id: threadId,
      subject: data.subject,
      buyerId: data.buyerId,
      buyerName: 'New Buyer', // 実際はバイヤー情報を取得
      buyerCountry: 'US',
      type: data.type || 'GENERAL',
      status: 'UNREAD',
      priority: 'MEDIUM',
      sentiment: 'NEUTRAL',
      orderId: data.orderId || null,
      itemId: data.itemId || null,
      itemTitle: null,
      messageCount: 1,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tags: [],
      assignedTo: null,
      snoozedUntil: null,
    };

    mockThreads[threadId] = newThread;
    mockMessages[threadId] = [{
      id: `msg-${Date.now()}`,
      threadId,
      sender: 'seller',
      senderName: 'You',
      content: data.content,
      timestamp: new Date().toISOString(),
      isRead: true,
      attachments: [],
    }];

    res.status(201).json(newThread);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// スレッド更新
router.put('/threads/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const thread = mockThreads[threadId];

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const validation = updateThreadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const updatedThread = {
      ...thread,
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };

    mockThreads[threadId] = updatedThread;

    res.json(updatedThread);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// メッセージ送信
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { threadId, content, attachments } = validation.data;
    const thread = mockThreads[threadId];

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      threadId,
      sender: 'seller',
      senderName: 'You',
      content,
      timestamp: new Date().toISOString(),
      isRead: true,
      attachments: attachments || [],
    };

    if (!mockMessages[threadId]) {
      mockMessages[threadId] = [];
    }
    mockMessages[threadId].push(newMessage);

    // スレッドを更新
    mockThreads[threadId] = {
      ...thread,
      status: 'REPLIED',
      messageCount: thread.messageCount + 1,
      lastMessageAt: new Date().toISOString(),
    };

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// AI返信提案
router.post('/threads/:threadId/suggest-reply', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const thread = mockThreads[threadId];

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // AI提案をモック生成
    let suggestion = '';

    switch (thread.type) {
      case 'INQUIRY':
        suggestion = `Hi ${thread.buyerName},\n\nThank you for your interest in ${thread.itemTitle || 'our item'}.\n\nI would be happy to answer your questions. The item is in excellent condition and has been carefully tested.\n\nPlease let me know if you have any other questions. I'm here to help!\n\nBest regards`;
        break;
      case 'SHIPPING':
        suggestion = `Hi ${thread.buyerName},\n\nThank you for reaching out about your order.\n\nI apologize for any inconvenience. I have checked with our shipping department and your package is currently in transit. You should receive it within the next 2-3 business days.\n\nPlease don't hesitate to contact me if you have any further questions.\n\nBest regards`;
        break;
      case 'RETURN':
        suggestion = `Hi ${thread.buyerName},\n\nI'm sorry to hear about the issue with your order. I completely understand your frustration.\n\nI would like to resolve this matter as quickly as possible. Please let me know your preferred solution:\n1. Full refund\n2. Replacement item\n3. Partial refund\n\nPlease provide your return address and I will arrange a prepaid shipping label for you.\n\nBest regards`;
        break;
      default:
        suggestion = `Hi ${thread.buyerName},\n\nThank you for your message.\n\n[Your response here]\n\nPlease let me know if you have any other questions.\n\nBest regards`;
    }

    res.json({
      suggestion,
      confidence: 0.85,
      tone: 'professional',
      templates: Object.values(mockTemplates).filter(t => t.category === thread.type).slice(0, 3),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

// メッセージ検索
router.post('/search', async (req: Request, res: Response) => {
  try {
    const validation = searchMessagesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const filters = validation.data;
    let threads = Object.values(mockThreads);

    if (filters.query) {
      const q = filters.query.toLowerCase();
      threads = threads.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.buyerName.toLowerCase().includes(q)
      );
    }

    if (filters.type) {
      threads = threads.filter(t => t.type === filters.type);
    }

    if (filters.status) {
      threads = threads.filter(t => t.status === filters.status);
    }

    if (filters.priority) {
      threads = threads.filter(t => t.priority === filters.priority);
    }

    if (filters.sentiment) {
      threads = threads.filter(t => t.sentiment === filters.sentiment);
    }

    res.json({
      threads,
      total: threads.length,
      filters,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// テンプレート一覧
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let templates = Object.values(mockTemplates);

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    res.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// テンプレート作成
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const validation = createTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const newTemplate = {
      id: `tpl-${Date.now()}`,
      ...validation.data,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
    };

    mockTemplates[newTemplate.id] = newTemplate;

    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// テンプレート更新
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = mockTemplates[templateId];

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedTemplate = {
      ...template,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    mockTemplates[templateId] = updatedTemplate;

    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// テンプレート削除
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    if (!mockTemplates[templateId]) {
      return res.status(404).json({ error: 'Template not found' });
    }

    delete mockTemplates[templateId];

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// 自動応答ルール一覧
router.get('/auto-rules', async (_req: Request, res: Response) => {
  try {
    const rules = Object.values(mockAutoRules);

    res.json({
      rules,
      total: rules.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auto rules' });
  }
});

// 自動応答ルール作成
router.post('/auto-rules', async (req: Request, res: Response) => {
  try {
    const validation = createAutoRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      ...validation.data,
      isActive: true,
      stats: {
        triggered: 0,
        lastTriggered: null,
      },
      createdAt: new Date().toISOString(),
    };

    mockAutoRules[newRule.id] = newRule;

    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create auto rule' });
  }
});

// 自動応答ルール更新
router.put('/auto-rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = mockAutoRules[ruleId];

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updatedRule = {
      ...rule,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    mockAutoRules[ruleId] = updatedRule;

    res.json(updatedRule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// 自動応答ルール削除
router.delete('/auto-rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    if (!mockAutoRules[ruleId]) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    delete mockAutoRules[ruleId];

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// 統計情報
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    res.json(mockStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// エージェント一覧
router.get('/agents', async (_req: Request, res: Response) => {
  try {
    res.json({ agents: mockAgents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 一括アクション
router.post('/bulk-action', async (req: Request, res: Response) => {
  try {
    const { threadIds, action, value } = req.body;

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return res.status(400).json({ error: 'Thread IDs required' });
    }

    let updated = 0;

    for (const threadId of threadIds) {
      const thread = mockThreads[threadId];
      if (thread) {
        switch (action) {
          case 'markRead':
            thread.status = 'READ';
            break;
          case 'markResolved':
            thread.status = 'RESOLVED';
            break;
          case 'setPriority':
            thread.priority = value;
            break;
          case 'assign':
            thread.assignedTo = value;
            break;
          case 'addTag':
            thread.tags = [...new Set([...thread.tags, value])];
            break;
        }
        updated++;
      }
    }

    res.json({
      success: true,
      updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      autoResponseEnabled: true,
      businessHours: {
        enabled: true,
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Tokyo',
        daysOff: ['Saturday', 'Sunday'],
      },
      notifications: {
        email: true,
        slack: true,
        newMessage: true,
        urgentOnly: false,
      },
      aiAssistant: {
        enabled: true,
        autoSuggest: true,
        sentimentAnalysis: true,
        language: 'en',
      },
      signature: 'Best regards,\nYour Seller Name',
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = {
      autoResponseEnabled: updates.autoResponseEnabled ?? true,
      businessHours: updates.businessHours ?? {},
      notifications: updates.notifications ?? {},
      aiAssistant: updates.aiAssistant ?? {},
      signature: updates.signature ?? '',
      updatedAt: new Date().toISOString(),
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export const ebayCustomerCommunicationRouter = router;

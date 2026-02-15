import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// 型定義
// ============================================================

// レビュータイプ
type ReviewType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

// レビューソース
type ReviewSource = 'BUYER' | 'SELLER' | 'SYSTEM';

// レスポンスステータス
type ResponseStatus = 'PENDING' | 'RESPONDED' | 'SKIPPED' | 'ESCALATED';

// レビュー分析タイプ
type AnalysisType = 'SENTIMENT' | 'KEYWORD' | 'TREND' | 'COMPARISON';

// 自動返信トリガー
type AutoReplyTrigger = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'KEYWORD' | 'RATING';

// レビューインターフェース
interface Review {
  id: string;
  orderId: string;
  listingId: string;
  itemTitle: string;
  buyerId: string;
  buyerName: string;
  type: ReviewType;
  rating: number; // 1-5
  comment: string;
  source: ReviewSource;
  responseStatus: ResponseStatus;
  response?: string;
  respondedAt?: string;
  tags: string[];
  sentiment: {
    score: number; // -1 to 1
    keywords: string[];
    topics: string[];
  };
  orderDetails?: {
    orderDate: string;
    itemPrice: number;
    quantity: number;
    shippingDays: number;
  };
  createdAt: string;
  updatedAt: string;
}

// レビュー分析
interface ReviewAnalysis {
  id: string;
  type: AnalysisType;
  period: string;
  totalReviews: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  averageRating: number;
  sentimentScore: number;
  topKeywords: Array<{
    keyword: string;
    count: number;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;
  trends: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    avgRating: number;
  }>;
  createdAt: string;
}

// 返信テンプレート
interface ReplyTemplate {
  id: string;
  name: string;
  type: ReviewType | 'ALL';
  content: string;
  variables: string[];
  useCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 自動返信ルール
interface AutoReplyRule {
  id: string;
  name: string;
  trigger: AutoReplyTrigger;
  conditions: {
    reviewType?: ReviewType[];
    ratingRange?: { min: number; max: number };
    keywords?: string[];
    excludeKeywords?: string[];
  };
  templateId: string;
  delay: number; // 分
  isActive: boolean;
  stats: {
    triggered: number;
    sent: number;
    lastTriggered?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// モックデータ
const mockReviews: Review[] = [
  {
    id: 'rev_001',
    orderId: 'ord_001',
    listingId: 'lst_001',
    itemTitle: 'Vintage Watch Collection - Seiko 5',
    buyerId: 'buyer_001',
    buyerName: 'john_collector',
    type: 'POSITIVE',
    rating: 5,
    comment: 'Excellent condition, fast shipping, great communication. Highly recommended seller!',
    source: 'BUYER',
    responseStatus: 'PENDING',
    tags: ['fast_shipping', 'great_communication', 'excellent_condition'],
    sentiment: {
      score: 0.92,
      keywords: ['excellent', 'fast', 'great', 'recommended'],
      topics: ['condition', 'shipping', 'communication'],
    },
    orderDetails: {
      orderDate: '2026-02-10T10:00:00Z',
      itemPrice: 299.99,
      quantity: 1,
      shippingDays: 3,
    },
    createdAt: '2026-02-14T15:30:00Z',
    updatedAt: '2026-02-14T15:30:00Z',
  },
  {
    id: 'rev_002',
    orderId: 'ord_002',
    listingId: 'lst_002',
    itemTitle: 'Retro Camera - Canon AE-1',
    buyerId: 'buyer_002',
    buyerName: 'photo_enthusiast',
    type: 'POSITIVE',
    rating: 4,
    comment: 'Good camera, works well. Packaging could be better but item arrived safely.',
    source: 'BUYER',
    responseStatus: 'RESPONDED',
    response: 'Thank you for your feedback! We appreciate your purchase and will improve our packaging.',
    respondedAt: '2026-02-13T10:00:00Z',
    tags: ['works_well', 'packaging_issue'],
    sentiment: {
      score: 0.65,
      keywords: ['good', 'works', 'safely'],
      topics: ['functionality', 'packaging'],
    },
    orderDetails: {
      orderDate: '2026-02-05T14:00:00Z',
      itemPrice: 189.99,
      quantity: 1,
      shippingDays: 5,
    },
    createdAt: '2026-02-12T09:00:00Z',
    updatedAt: '2026-02-13T10:00:00Z',
  },
  {
    id: 'rev_003',
    orderId: 'ord_003',
    listingId: 'lst_003',
    itemTitle: 'Vintage Lens - Minolta 50mm f/1.4',
    buyerId: 'buyer_003',
    buyerName: 'lens_hunter',
    type: 'NEUTRAL',
    rating: 3,
    comment: 'Item as described but shipping took longer than expected.',
    source: 'BUYER',
    responseStatus: 'PENDING',
    tags: ['slow_shipping', 'as_described'],
    sentiment: {
      score: 0.1,
      keywords: ['described', 'longer', 'expected'],
      topics: ['accuracy', 'shipping_time'],
    },
    orderDetails: {
      orderDate: '2026-02-01T11:00:00Z',
      itemPrice: 149.99,
      quantity: 1,
      shippingDays: 10,
    },
    createdAt: '2026-02-13T16:00:00Z',
    updatedAt: '2026-02-13T16:00:00Z',
  },
  {
    id: 'rev_004',
    orderId: 'ord_004',
    listingId: 'lst_004',
    itemTitle: 'Antique Clock - German Cuckoo',
    buyerId: 'buyer_004',
    buyerName: 'antique_lover',
    type: 'NEGATIVE',
    rating: 2,
    comment: 'Item arrived damaged. Seller was slow to respond to my inquiry.',
    source: 'BUYER',
    responseStatus: 'ESCALATED',
    tags: ['damaged', 'slow_response', 'needs_attention'],
    sentiment: {
      score: -0.75,
      keywords: ['damaged', 'slow', 'inquiry'],
      topics: ['condition', 'customer_service'],
    },
    orderDetails: {
      orderDate: '2026-01-28T09:00:00Z',
      itemPrice: 459.99,
      quantity: 1,
      shippingDays: 7,
    },
    createdAt: '2026-02-10T14:00:00Z',
    updatedAt: '2026-02-11T09:00:00Z',
  },
];

const mockTemplates: ReplyTemplate[] = [
  {
    id: 'tpl_001',
    name: '高評価お礼',
    type: 'POSITIVE',
    content: '{{buyerName}}様、この度は高評価をいただきありがとうございます！{{itemTitle}}をお気に入りいただけて嬉しいです。またのご利用をお待ちしております。',
    variables: ['buyerName', 'itemTitle'],
    useCount: 45,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'tpl_002',
    name: '中立評価フォローアップ',
    type: 'NEUTRAL',
    content: '{{buyerName}}様、貴重なフィードバックをありがとうございます。{{itemTitle}}についてご満足いただけなかった点があれば、改善のためにお聞かせください。',
    variables: ['buyerName', 'itemTitle'],
    useCount: 12,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'tpl_003',
    name: '低評価対応',
    type: 'NEGATIVE',
    content: '{{buyerName}}様、ご不便をおかけし申し訳ございません。{{itemTitle}}についてのご指摘を真摯に受け止め、解決策をご提案させていただきます。',
    variables: ['buyerName', 'itemTitle'],
    useCount: 8,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

const mockAutoReplyRules: AutoReplyRule[] = [
  {
    id: 'rule_001',
    name: '5つ星自動お礼',
    trigger: 'RATING',
    conditions: {
      ratingRange: { min: 5, max: 5 },
    },
    templateId: 'tpl_001',
    delay: 30, // 30分後に自動返信
    isActive: true,
    stats: {
      triggered: 128,
      sent: 125,
      lastTriggered: '2026-02-14T12:00:00Z',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'rule_002',
    name: 'ネガティブレビュー即時対応',
    trigger: 'NEGATIVE',
    conditions: {
      reviewType: ['NEGATIVE'],
    },
    templateId: 'tpl_003',
    delay: 0, // 即時
    isActive: true,
    stats: {
      triggered: 15,
      sent: 14,
      lastTriggered: '2026-02-10T14:30:00Z',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

// ============================================================
// バリデーションスキーマ
// ============================================================

const listReviewsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).optional(),
  responseStatus: z.enum(['PENDING', 'RESPONDED', 'SKIPPED', 'ESCALATED']).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'rating', 'sentiment']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const respondToReviewSchema = z.object({
  response: z.string().min(1).max(500),
  templateId: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ALL']),
  content: z.string().min(1).max(1000),
  variables: z.array(z.string()).optional(),
});

const createAutoReplyRuleSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'KEYWORD', 'RATING']),
  conditions: z.object({
    reviewType: z.array(z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE'])).optional(),
    ratingRange: z.object({
      min: z.number().min(1).max(5),
      max: z.number().min(1).max(5),
    }).optional(),
    keywords: z.array(z.string()).optional(),
    excludeKeywords: z.array(z.string()).optional(),
  }),
  templateId: z.string(),
  delay: z.number().min(0).max(1440), // 最大24時間
});

const generateReplySchema = z.object({
  reviewId: z.string(),
  tone: z.enum(['PROFESSIONAL', 'FRIENDLY', 'APOLOGETIC', 'GRATEFUL']).default('PROFESSIONAL'),
  includeOffer: z.boolean().default(false),
});

// ============================================================
// エンドポイント
// ============================================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);

  const dashboard = {
    overview: {
      totalReviews: mockReviews.length,
      averageRating: 3.5,
      positivePercentage: 50,
      pendingResponses: mockReviews.filter(r => r.responseStatus === 'PENDING').length,
    },
    byType: {
      positive: mockReviews.filter(r => r.type === 'POSITIVE').length,
      neutral: mockReviews.filter(r => r.type === 'NEUTRAL').length,
      negative: mockReviews.filter(r => r.type === 'NEGATIVE').length,
    },
    byStatus: {
      pending: mockReviews.filter(r => r.responseStatus === 'PENDING').length,
      responded: mockReviews.filter(r => r.responseStatus === 'RESPONDED').length,
      skipped: mockReviews.filter(r => r.responseStatus === 'SKIPPED').length,
      escalated: mockReviews.filter(r => r.responseStatus === 'ESCALATED').length,
    },
    trends: {
      thisMonth: {
        period: thisMonth,
        reviews: 42,
        avgRating: 4.2,
        positiveRate: 75,
        responseRate: 85,
      },
      lastMonth: {
        period: '2026-01',
        reviews: 38,
        avgRating: 4.0,
        positiveRate: 71,
        responseRate: 82,
      },
    },
    recentActivity: mockReviews.slice(0, 5).map(r => ({
      id: r.id,
      itemTitle: r.itemTitle,
      type: r.type,
      rating: r.rating,
      buyerName: r.buyerName,
      responseStatus: r.responseStatus,
      createdAt: r.createdAt,
    })),
    autoReplyStats: {
      totalRules: mockAutoReplyRules.length,
      activeRules: mockAutoReplyRules.filter(r => r.isActive).length,
      repliesSent24h: 8,
      successRate: 96.5,
    },
  };

  res.json(dashboard);
});

// レビュー一覧
router.get('/reviews', async (req: Request, res: Response) => {
  const params = listReviewsSchema.parse(req.query);

  let filtered = [...mockReviews];

  if (params.type) {
    filtered = filtered.filter(r => r.type === params.type);
  }
  if (params.responseStatus) {
    filtered = filtered.filter(r => r.responseStatus === params.responseStatus);
  }
  if (params.rating) {
    filtered = filtered.filter(r => r.rating === params.rating);
  }
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(r =>
      r.comment.toLowerCase().includes(search) ||
      r.itemTitle.toLowerCase().includes(search) ||
      r.buyerName.toLowerCase().includes(search)
    );
  }

  // ソート
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (params.sortBy) {
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'sentiment':
        comparison = a.sentiment.score - b.sentiment.score;
        break;
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return params.sortOrder === 'desc' ? -comparison : comparison;
  });

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const reviews = filtered.slice(start, start + params.limit);

  res.json({
    reviews,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    },
  });
});

// レビュー詳細
router.get('/reviews/:reviewId', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const review = mockReviews.find(r => r.id === reviewId);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  // 同じ購入者の過去レビューを取得
  const buyerHistory = mockReviews
    .filter(r => r.buyerId === review.buyerId && r.id !== reviewId)
    .slice(0, 5);

  // 同じ商品の他のレビュー
  const itemReviews = mockReviews
    .filter(r => r.listingId === review.listingId && r.id !== reviewId)
    .slice(0, 5);

  // AI提案テンプレート
  const suggestedTemplates = mockTemplates
    .filter(t => t.type === review.type || t.type === 'ALL')
    .slice(0, 3);

  res.json({
    review,
    buyerHistory,
    itemReviews,
    suggestedTemplates,
  });
});

// レビューに返信
router.post('/reviews/:reviewId/respond', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const data = respondToReviewSchema.parse(req.body);

  const review = mockReviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({
    success: true,
    message: 'Response submitted successfully',
    review: {
      ...review,
      response: data.response,
      responseStatus: 'RESPONDED' as ResponseStatus,
      respondedAt: new Date().toISOString(),
    },
  });
});

// レビューをスキップ
router.post('/reviews/:reviewId/skip', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { reason } = req.body;

  const review = mockReviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({
    success: true,
    message: 'Review skipped',
    review: {
      ...review,
      responseStatus: 'SKIPPED' as ResponseStatus,
      skipReason: reason,
    },
  });
});

// レビューをエスカレート
router.post('/reviews/:reviewId/escalate', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { priority, notes } = req.body;

  const review = mockReviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({
    success: true,
    message: 'Review escalated for manual handling',
    review: {
      ...review,
      responseStatus: 'ESCALATED' as ResponseStatus,
      escalation: {
        priority: priority || 'NORMAL',
        notes: notes,
        escalatedAt: new Date().toISOString(),
      },
    },
  });
});

// AI返信生成
router.post('/reviews/:reviewId/generate-reply', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const data = generateReplySchema.parse(req.body);

  const review = mockReviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  // AI生成の返信をシミュレート
  const generatedReplies = {
    PROFESSIONAL: `Dear ${review.buyerName}, thank you for your feedback regarding ${review.itemTitle}. We value your input and continuously strive to improve our service. If you have any further questions or concerns, please don't hesitate to reach out.`,
    FRIENDLY: `Hi ${review.buyerName}! Thanks so much for taking the time to leave a review for ${review.itemTitle}! We really appreciate it and hope to see you again soon! 😊`,
    APOLOGETIC: `Dear ${review.buyerName}, we sincerely apologize for any inconvenience you experienced with ${review.itemTitle}. Your satisfaction is our top priority, and we would like to make this right. Please contact us so we can resolve this issue.`,
    GRATEFUL: `Dear ${review.buyerName}, we are truly grateful for your wonderful review of ${review.itemTitle}! Your support means everything to us. Thank you for being such an amazing customer!`,
  };

  res.json({
    success: true,
    generatedReply: generatedReplies[data.tone],
    tone: data.tone,
    alternatives: Object.entries(generatedReplies)
      .filter(([tone]) => tone !== data.tone)
      .map(([tone, reply]) => ({ tone, reply })),
  });
});

// 一括アクション
router.post('/reviews/bulk-action', async (req: Request, res: Response) => {
  const { reviewIds, action, data } = req.body;

  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    return res.status(400).json({ error: 'Review IDs are required' });
  }

  const validActions = ['RESPOND', 'SKIP', 'ESCALATE', 'TAG'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  res.json({
    success: true,
    message: `Bulk ${action.toLowerCase()} completed`,
    affected: reviewIds.length,
    results: reviewIds.map(id => ({
      reviewId: id,
      success: true,
    })),
  });
});

// レビュー分析
router.get('/analysis', async (req: Request, res: Response) => {
  const { period = '30d', type } = req.query;

  const analysis: ReviewAnalysis = {
    id: `analysis_${Date.now()}`,
    type: (type as AnalysisType) || 'SENTIMENT',
    period: period as string,
    totalReviews: mockReviews.length,
    positiveCount: mockReviews.filter(r => r.type === 'POSITIVE').length,
    neutralCount: mockReviews.filter(r => r.type === 'NEUTRAL').length,
    negativeCount: mockReviews.filter(r => r.type === 'NEGATIVE').length,
    averageRating: 3.5,
    sentimentScore: 0.42,
    topKeywords: [
      { keyword: 'fast shipping', count: 28, sentiment: 'POSITIVE' },
      { keyword: 'great condition', count: 25, sentiment: 'POSITIVE' },
      { keyword: 'as described', count: 22, sentiment: 'POSITIVE' },
      { keyword: 'good communication', count: 18, sentiment: 'POSITIVE' },
      { keyword: 'slow delivery', count: 8, sentiment: 'NEGATIVE' },
      { keyword: 'packaging', count: 6, sentiment: 'NEUTRAL' },
    ],
    topIssues: [
      { issue: 'Shipping delays', count: 5, trend: 'DOWN' },
      { issue: 'Packaging quality', count: 4, trend: 'STABLE' },
      { issue: 'Item condition', count: 3, trend: 'DOWN' },
      { issue: 'Communication', count: 2, trend: 'UP' },
    ],
    trends: [
      { date: '2026-02-08', positive: 8, neutral: 2, negative: 1, avgRating: 4.3 },
      { date: '2026-02-09', positive: 6, neutral: 3, negative: 0, avgRating: 4.1 },
      { date: '2026-02-10', positive: 10, neutral: 1, negative: 2, avgRating: 4.0 },
      { date: '2026-02-11', positive: 7, neutral: 2, negative: 1, avgRating: 4.2 },
      { date: '2026-02-12', positive: 9, neutral: 1, negative: 0, avgRating: 4.5 },
      { date: '2026-02-13', positive: 5, neutral: 3, negative: 1, avgRating: 3.8 },
      { date: '2026-02-14', positive: 8, neutral: 2, negative: 0, avgRating: 4.4 },
    ],
    createdAt: new Date().toISOString(),
  };

  res.json(analysis);
});

// 比較分析
router.get('/analysis/comparison', async (req: Request, res: Response) => {
  const { period1, period2 } = req.query;

  const comparison = {
    period1: {
      period: period1 || '2026-01',
      totalReviews: 38,
      averageRating: 4.0,
      positiveRate: 71,
      sentimentScore: 0.35,
    },
    period2: {
      period: period2 || '2026-02',
      totalReviews: 42,
      averageRating: 4.2,
      positiveRate: 75,
      sentimentScore: 0.42,
    },
    changes: {
      totalReviews: { value: 4, percentage: 10.5 },
      averageRating: { value: 0.2, percentage: 5.0 },
      positiveRate: { value: 4, percentage: 5.6 },
      sentimentScore: { value: 0.07, percentage: 20.0 },
    },
    insights: [
      'Positive review rate increased by 4%',
      'Average rating improved from 4.0 to 4.2',
      'Shipping-related complaints decreased by 30%',
      'Customer satisfaction trending upward',
    ],
  };

  res.json(comparison);
});

// テンプレート一覧
router.get('/templates', async (_req: Request, res: Response) => {
  res.json({
    templates: mockTemplates,
    total: mockTemplates.length,
  });
});

// テンプレート作成
router.post('/templates', async (req: Request, res: Response) => {
  const data = createTemplateSchema.parse(req.body);

  const newTemplate: ReplyTemplate = {
    id: `tpl_${Date.now()}`,
    name: data.name,
    type: data.type,
    content: data.content,
    variables: data.variables || [],
    useCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    template: newTemplate,
  });
});

// テンプレート更新
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const data = createTemplateSchema.partial().parse(req.body);

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const updated = {
    ...template,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    template: updated,
  });
});

// テンプレート削除
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  const { templateId } = req.params;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    success: true,
    message: 'Template deleted successfully',
  });
});

// 自動返信ルール一覧
router.get('/auto-reply-rules', async (_req: Request, res: Response) => {
  res.json({
    rules: mockAutoReplyRules,
    total: mockAutoReplyRules.length,
  });
});

// 自動返信ルール作成
router.post('/auto-reply-rules', async (req: Request, res: Response) => {
  const data = createAutoReplyRuleSchema.parse(req.body);

  const newRule: AutoReplyRule = {
    id: `rule_${Date.now()}`,
    name: data.name,
    trigger: data.trigger,
    conditions: data.conditions,
    templateId: data.templateId,
    delay: data.delay,
    isActive: true,
    stats: {
      triggered: 0,
      sent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    rule: newRule,
  });
});

// 自動返信ルール更新
router.put('/auto-reply-rules/:ruleId', async (req: Request, res: Response) => {
  const { ruleId } = req.params;
  const data = createAutoReplyRuleSchema.partial().parse(req.body);

  const rule = mockAutoReplyRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const updated = {
    ...rule,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    rule: updated,
  });
});

// 自動返信ルール削除
router.delete('/auto-reply-rules/:ruleId', async (req: Request, res: Response) => {
  const { ruleId } = req.params;

  const rule = mockAutoReplyRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    success: true,
    message: 'Auto-reply rule deleted successfully',
  });
});

// 自動返信ルール有効/無効切り替え
router.post('/auto-reply-rules/:ruleId/toggle', async (req: Request, res: Response) => {
  const { ruleId } = req.params;

  const rule = mockAutoReplyRules.find(r => r.id === ruleId);
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

// 統計情報
router.get('/stats', async (req: Request, res: Response) => {
  const { period = '30d' } = req.query;

  const stats = {
    period,
    reviews: {
      total: mockReviews.length,
      positive: mockReviews.filter(r => r.type === 'POSITIVE').length,
      neutral: mockReviews.filter(r => r.type === 'NEUTRAL').length,
      negative: mockReviews.filter(r => r.type === 'NEGATIVE').length,
    },
    ratings: {
      average: 3.5,
      distribution: {
        5: 25,
        4: 35,
        3: 20,
        2: 12,
        1: 8,
      },
    },
    responses: {
      total: mockReviews.filter(r => r.responseStatus === 'RESPONDED').length,
      pending: mockReviews.filter(r => r.responseStatus === 'PENDING').length,
      averageResponseTime: 2.5, // 時間
      responseRate: 75,
    },
    autoReplies: {
      sent: 125,
      triggered: 128,
      successRate: 97.7,
    },
    sentiment: {
      averageScore: 0.42,
      trend: 'UP',
    },
  };

  res.json(stats);
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  const settings = {
    autoReply: {
      enabled: true,
      defaultDelay: 30,
      maxDelayMinutes: 1440,
    },
    notifications: {
      negativeReviewAlert: true,
      dailyDigest: true,
      weeklyReport: true,
    },
    responseDefaults: {
      autoTranslate: false,
      includeSignature: true,
      signature: 'Best regards,\nYour Seller Team',
    },
    analysis: {
      sentimentAnalysis: true,
      keywordExtraction: true,
      autoTagging: true,
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

export { router as ebayReviewManagementRouter };

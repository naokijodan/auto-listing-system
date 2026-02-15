import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 160: eBay Help Center（ヘルプセンター）
// ============================================================

// ヘルプ記事モック
const mockArticles = [
  {
    id: 'article_1',
    title: '出品の始め方',
    slug: 'getting-started-listing',
    category: 'getting-started',
    excerpt: '初めてのeBay出品の手順を学びましょう',
    content: `
# 出品の始め方

## 概要
eBayでの出品は簡単です。以下の手順に従って、初めての出品を行いましょう。

## 手順

### 1. 商品を選択
商品一覧から出品したい商品を選択します。

### 2. 出品情報を入力
- タイトル
- 説明
- 価格
- 配送設定

### 3. 出品を公開
「出品」ボタンをクリックして、eBayに公開します。

## ヒント
- 高品質な写真を使用しましょう
- 詳細な説明を書きましょう
- 競争力のある価格を設定しましょう
    `,
    views: 1250,
    helpful: 89,
    notHelpful: 5,
    tags: ['出品', '初心者', 'スタートガイド'],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'article_2',
    title: '価格設定のベストプラクティス',
    slug: 'pricing-best-practices',
    category: 'pricing',
    excerpt: '効果的な価格戦略で売上を最大化しましょう',
    content: `
# 価格設定のベストプラクティス

## 市場調査
競合の価格を調査し、適切な価格帯を見つけましょう。

## 自動価格調整
自動価格機能を使用して、市場の変動に対応しましょう。

## プロモーション
セールやクーポンを活用して、売上を伸ばしましょう。
    `,
    views: 890,
    helpful: 72,
    notHelpful: 8,
    tags: ['価格', '戦略', 'マーケティング'],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'article_3',
    title: '配送設定ガイド',
    slug: 'shipping-guide',
    category: 'shipping',
    excerpt: '効率的な配送設定で顧客満足度を向上',
    content: `
# 配送設定ガイド

## 配送オプション
- 国内配送
- 国際配送
- 送料無料設定

## キャリア選択
最適なキャリアを選択しましょう。
    `,
    views: 650,
    helpful: 58,
    notHelpful: 3,
    tags: ['配送', '物流', '設定'],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// FAQモック
const mockFAQs = [
  {
    id: 'faq_1',
    question: 'eBay出品料はいくらですか？',
    answer: 'eBay出品料は商品カテゴリや出品形式によって異なります。基本的な出品は無料で、販売成立時に手数料が発生します。',
    category: 'fees',
    views: 2500,
    helpful: 180,
    order: 1,
  },
  {
    id: 'faq_2',
    question: '返品ポリシーはどう設定すべきですか？',
    answer: '30日間の返品受付を推奨します。返品を受け付けることで、バイヤーの信頼を得やすくなります。',
    category: 'returns',
    views: 1800,
    helpful: 145,
    order: 2,
  },
  {
    id: 'faq_3',
    question: '国際配送の設定方法は？',
    answer: 'プロフィール設定から国際配送を有効にし、対象国と送料を設定します。GSPプログラムを利用すると簡単に国際発送できます。',
    category: 'shipping',
    views: 1500,
    helpful: 120,
    order: 3,
  },
  {
    id: 'faq_4',
    question: '出品のSEOを改善するには？',
    answer: '適切なキーワードをタイトルに含め、詳細な商品説明を書き、高品質な画像を使用しましょう。',
    category: 'seo',
    views: 1200,
    helpful: 98,
    order: 4,
  },
  {
    id: 'faq_5',
    question: 'バイヤーからのメッセージにはどれくらいで返信すべきですか？',
    answer: '24時間以内の返信を推奨します。迅速な対応がセラー評価の向上につながります。',
    category: 'communication',
    views: 980,
    helpful: 85,
    order: 5,
  },
];

// チュートリアルモック
const mockTutorials = [
  {
    id: 'tutorial_1',
    title: 'クイックスタートガイド',
    description: '10分でRAKUDAの基本機能を学ぶ',
    duration: 10,
    steps: 5,
    completedSteps: 0,
    category: 'getting-started',
    videoUrl: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial_2',
    title: 'バルク出品マスター',
    description: '一括出品機能を使いこなす',
    duration: 15,
    steps: 8,
    completedSteps: 0,
    category: 'advanced',
    videoUrl: 'https://example.com/videos/bulk-listing',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial_3',
    title: '自動化ワークフロー設定',
    description: '作業を自動化して効率アップ',
    duration: 20,
    steps: 10,
    completedSteps: 0,
    category: 'automation',
    videoUrl: 'https://example.com/videos/automation',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// サポートチケットモック
const mockTickets = Array.from({ length: 10 }, (_, i) => ({
  id: `ticket_${10 - i}`,
  subject: ['出品エラーについて', '料金の質問', '機能リクエスト', '技術的な問題', 'その他'][Math.floor(Math.random() * 5)],
  description: 'お問い合わせ内容の詳細がここに表示されます。',
  status: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'][Math.floor(Math.random() * 4)],
  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)],
  category: ['technical', 'billing', 'feature', 'general'][Math.floor(Math.random() * 4)],
  assignedTo: Math.random() > 0.5 ? 'support@example.com' : null,
  messages: [
    {
      id: 'msg_1',
      sender: 'user',
      content: 'お問い合わせ内容',
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    },
    ...(Math.random() > 0.5 ? [{
      id: 'msg_2',
      sender: 'support',
      content: 'ご連絡ありがとうございます。確認いたします。',
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    }] : []),
  ],
  createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
}));

// カテゴリ
const categories = [
  { id: 'getting-started', name: 'スタートガイド', icon: 'play', articleCount: 5 },
  { id: 'listing', name: '出品', icon: 'package', articleCount: 12 },
  { id: 'pricing', name: '価格設定', icon: 'dollar-sign', articleCount: 8 },
  { id: 'shipping', name: '配送', icon: 'truck', articleCount: 10 },
  { id: 'orders', name: '注文管理', icon: 'shopping-cart', articleCount: 7 },
  { id: 'analytics', name: '分析', icon: 'bar-chart', articleCount: 6 },
  { id: 'automation', name: '自動化', icon: 'zap', articleCount: 9 },
  { id: 'integrations', name: '連携', icon: 'link', articleCount: 4 },
];

// ============================================================
// エンドポイント
// ============================================================

// 1. ヘルプセンター概要
router.get('/overview', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: categories.length,
      articles: mockArticles.length,
      faqs: mockFAQs.length,
      tutorials: mockTutorials.length,
      popularArticles: mockArticles.slice(0, 3),
      recentlyUpdated: mockArticles.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, 3),
      openTickets: mockTickets.filter(t => t.status !== 'CLOSED').length,
    },
  });
});

// 2. カテゴリ一覧
router.get('/categories', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: categories,
  });
});

// 3. 記事検索
router.get('/search', async (req: Request, res: Response) => {
  const { q, category, limit = '10' } = req.query;

  let results = [...mockArticles, ...mockFAQs.map(f => ({
    id: f.id,
    title: f.question,
    excerpt: f.answer.slice(0, 100),
    category: f.category,
    type: 'faq',
  }))];

  if (q) {
    const query = (q as string).toLowerCase();
    results = results.filter(r =>
      r.title.toLowerCase().includes(query) ||
      ('excerpt' in r && r.excerpt?.toLowerCase().includes(query))
    );
  }

  if (category) {
    results = results.filter(r => r.category === category);
  }

  res.json({
    success: true,
    data: {
      results: results.slice(0, parseInt(limit as string, 10)),
      total: results.length,
      query: q,
    },
  });
});

// 4. 記事一覧
router.get('/articles', async (req: Request, res: Response) => {
  const { category, page = '1', limit = '10', sortBy = 'views' } = req.query;

  let filtered = [...mockArticles];

  if (category) {
    filtered = filtered.filter(a => a.category === category);
  }

  if (sortBy === 'views') {
    filtered.sort((a, b) => b.views - a.views);
  } else if (sortBy === 'date') {
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      articles: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 5. 記事詳細
router.get('/articles/:slug', async (req: Request, res: Response) => {
  const article = mockArticles.find(a => a.slug === req.params.slug || a.id === req.params.slug);

  if (!article) {
    return res.status(404).json({ success: false, error: 'Article not found' });
  }

  // ビューカウント増加
  article.views += 1;

  res.json({
    success: true,
    data: {
      ...article,
      relatedArticles: mockArticles.filter(a => a.category === article.category && a.id !== article.id).slice(0, 3),
    },
  });
});

// 6. 記事フィードバック
router.post('/articles/:slug/feedback', async (req: Request, res: Response) => {
  const article = mockArticles.find(a => a.slug === req.params.slug || a.id === req.params.slug);

  if (!article) {
    return res.status(404).json({ success: false, error: 'Article not found' });
  }

  const { helpful } = req.body;

  if (helpful) {
    article.helpful += 1;
  } else {
    article.notHelpful += 1;
  }

  res.json({
    success: true,
    message: 'フィードバックありがとうございます',
    data: { helpful: article.helpful, notHelpful: article.notHelpful },
  });
});

// 7. FAQ一覧
router.get('/faqs', async (req: Request, res: Response) => {
  const { category } = req.query;

  let filtered = [...mockFAQs];

  if (category) {
    filtered = filtered.filter(f => f.category === category);
  }

  filtered.sort((a, b) => a.order - b.order);

  res.json({
    success: true,
    data: filtered,
  });
});

// 8. FAQ詳細
router.get('/faqs/:id', async (req: Request, res: Response) => {
  const faq = mockFAQs.find(f => f.id === req.params.id);

  if (!faq) {
    return res.status(404).json({ success: false, error: 'FAQ not found' });
  }

  faq.views += 1;

  res.json({ success: true, data: faq });
});

// 9. FAQフィードバック
router.post('/faqs/:id/feedback', async (req: Request, res: Response) => {
  const faq = mockFAQs.find(f => f.id === req.params.id);

  if (!faq) {
    return res.status(404).json({ success: false, error: 'FAQ not found' });
  }

  const { helpful } = req.body;

  if (helpful) {
    faq.helpful += 1;
  }

  res.json({
    success: true,
    message: 'フィードバックありがとうございます',
  });
});

// 10. チュートリアル一覧
router.get('/tutorials', async (req: Request, res: Response) => {
  const { category } = req.query;

  let filtered = [...mockTutorials];

  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }

  res.json({
    success: true,
    data: filtered,
  });
});

// 11. チュートリアル詳細
router.get('/tutorials/:id', async (req: Request, res: Response) => {
  const tutorial = mockTutorials.find(t => t.id === req.params.id);

  if (!tutorial) {
    return res.status(404).json({ success: false, error: 'Tutorial not found' });
  }

  res.json({
    success: true,
    data: {
      ...tutorial,
      steps: Array.from({ length: tutorial.steps }, (_, i) => ({
        number: i + 1,
        title: `ステップ ${i + 1}`,
        content: `このステップの内容がここに表示されます。`,
        completed: i < tutorial.completedSteps,
      })),
    },
  });
});

// 12. チュートリアル進捗更新
router.post('/tutorials/:id/progress', async (req: Request, res: Response) => {
  const tutorial = mockTutorials.find(t => t.id === req.params.id);

  if (!tutorial) {
    return res.status(404).json({ success: false, error: 'Tutorial not found' });
  }

  const { step } = req.body;

  if (step > tutorial.completedSteps) {
    tutorial.completedSteps = step;
  }

  res.json({
    success: true,
    message: '進捗を更新しました',
    data: { completedSteps: tutorial.completedSteps },
  });
});

// 13. サポートチケット一覧
router.get('/tickets', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '10' } = req.query;

  let filtered = [...mockTickets];

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      tickets: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 14. サポートチケット作成
router.post('/tickets', async (req: Request, res: Response) => {
  const schema = z.object({
    subject: z.string().min(1),
    description: z.string().min(10),
    category: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newTicket = {
    id: `ticket_${Date.now()}`,
    subject: parsed.data.subject,
    description: parsed.data.description,
    status: 'OPEN',
    priority: parsed.data.priority || 'MEDIUM',
    category: parsed.data.category,
    assignedTo: null,
    messages: [{
      id: 'msg_1',
      sender: 'user',
      content: parsed.data.description,
      timestamp: new Date().toISOString(),
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTickets.unshift(newTicket);

  res.json({
    success: true,
    message: 'サポートチケットを作成しました',
    data: newTicket,
  });
});

// 15. サポートチケット詳細
router.get('/tickets/:id', async (req: Request, res: Response) => {
  const ticket = mockTickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  res.json({ success: true, data: ticket });
});

// 16. サポートチケットにメッセージ追加
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  const ticket = mockTickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  const { content } = req.body;

  const newMessage = {
    id: `msg_${Date.now()}`,
    sender: 'user',
    content,
    timestamp: new Date().toISOString(),
  };

  ticket.messages.push(newMessage);
  ticket.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'メッセージを送信しました',
    data: newMessage,
  });
});

// 17. サポートチケットをクローズ
router.post('/tickets/:id/close', async (req: Request, res: Response) => {
  const ticket = mockTickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  ticket.status = 'CLOSED';
  ticket.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'チケットをクローズしました',
    data: ticket,
  });
});

// 18. お知らせ一覧
router.get('/announcements', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'announcement_1',
        title: '新機能: SEO最適化ツールを追加しました',
        content: '出品のSEOを自動的に最適化する新機能を追加しました。',
        type: 'feature',
        important: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'announcement_2',
        title: 'メンテナンスのお知らせ',
        content: '2月20日 AM2:00-4:00 にシステムメンテナンスを行います。',
        type: 'maintenance',
        important: true,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
});

// 19. リリースノート
router.get('/release-notes', async (req: Request, res: Response) => {
  const { limit = '5' } = req.query;

  res.json({
    success: true,
    data: [
      {
        version: '2.1.0',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        changes: [
          { type: 'feature', description: 'SEO最適化ツールを追加' },
          { type: 'feature', description: '品質スコア機能を追加' },
          { type: 'improvement', description: 'ダッシュボードの読み込み速度を改善' },
          { type: 'fix', description: '一括編集時のエラーを修正' },
        ],
      },
      {
        version: '2.0.5',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        changes: [
          { type: 'fix', description: '通知が正しく表示されない問題を修正' },
          { type: 'improvement', description: 'APIレスポンス速度を向上' },
        ],
      },
    ].slice(0, parseInt(limit as string, 10)),
  });
});

// 20. コンタクト情報
router.get('/contact', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      email: 'support@rakuda.example.com',
      hours: '平日 9:00-18:00 (JST)',
      responseTime: '24時間以内',
      channels: [
        { type: 'email', available: true },
        { type: 'chat', available: true },
        { type: 'phone', available: false },
      ],
    },
  });
});

// 21. キーワードサジェスト
router.get('/suggest', async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ success: true, data: [] });
  }

  const suggestions = [
    '出品方法',
    '価格設定',
    '配送設定',
    '返品ポリシー',
    'eBay手数料',
    '売上分析',
    '在庫管理',
    'API連携',
  ].filter(s => s.includes(q as string));

  res.json({
    success: true,
    data: suggestions.slice(0, 5),
  });
});

// 22. 人気の検索キーワード
router.get('/popular-searches', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { keyword: '出品', count: 1250 },
      { keyword: '価格設定', count: 890 },
      { keyword: '配送', count: 780 },
      { keyword: '返品', count: 650 },
      { keyword: '手数料', count: 540 },
    ],
  });
});

export const ebayHelpCenterRouter = router;

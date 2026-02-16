import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 292: eBay Listing Templates V3（出品テンプレートV3）
// 28エンドポイント - テーマカラー: indigo-600
// =============================================================

// スキーマ
const templateSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  content: z.object({
    title: z.string(),
    description: z.string(),
    price: z.number().positive(),
  }),
});

// ========== ダッシュボード (5) ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalTemplates: 150,
    activeTemplates: 120,
    drafts: 30,
    avgUsageRate: 85.5,
    topTemplate: 'Watch Listing Pro',
    lastUpdated: new Date().toISOString(),
  });
});

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  res.json({
    usageByCategory: [
      { category: 'Watches', count: 45, percentage: 30 },
      { category: 'Electronics', count: 35, percentage: 23 },
      { category: 'Collectibles', count: 25, percentage: 17 },
    ],
    monthlyUsage: 2500,
    conversionRate: 12.5,
  });
});

router.get('/dashboard/recent', async (req: Request, res: Response) => {
  res.json({
    recentTemplates: [
      { id: 't1', name: 'Watch Template', usedAt: '2026-02-17', count: 50 },
      { id: 't2', name: 'Electronics Pro', usedAt: '2026-02-16', count: 35 },
    ],
  });
});

router.get('/dashboard/performance', async (req: Request, res: Response) => {
  res.json({
    performance: [
      { templateId: 't1', name: 'Watch Template', views: 5000, sales: 250, rate: 5.0 },
      { templateId: 't2', name: 'Electronics Pro', views: 3000, sales: 180, rate: 6.0 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: 'a1', type: 'warning', message: '3テンプレートの確認が必要です', createdAt: '2026-02-17' },
    ],
  });
});

// ========== テンプレート管理 (6) ==========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 't1', name: 'Watch Listing Pro', category: 'Watches', status: 'active', usageCount: 500 },
      { id: 't2', name: 'Electronics Standard', category: 'Electronics', status: 'active', usageCount: 350 },
      { id: 't3', name: 'Collectibles Special', category: 'Collectibles', status: 'draft', usageCount: 0 },
    ],
    total: 150,
    page: 1,
  });
});

router.get('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Watch Listing Pro',
    category: 'Watches',
    content: { title: '{{brand}} {{model}} Watch', description: 'Premium {{condition}} watch...', price: 0 },
    variables: ['brand', 'model', 'condition'],
    createdAt: '2026-01-01',
    updatedAt: '2026-02-15',
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid template', details: parsed.error.issues });
  }
  res.json({ id: 'new-template-id', ...parsed.data, createdAt: new Date().toISOString() });
});

router.put('/templates/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, updated: true, updatedAt: new Date().toISOString() });
});

router.delete('/templates/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, deleted: true });
});

router.post('/templates/:id/duplicate', async (req: Request, res: Response) => {
  res.json({ id: 'duplicated-template-id', originalId: req.params.id, name: 'Copy of Template' });
});

// ========== カテゴリ (4) ==========
router.get('/categories', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: 'c1', name: 'Watches', templateCount: 45 },
      { id: 'c2', name: 'Electronics', templateCount: 35 },
      { id: 'c3', name: 'Collectibles', templateCount: 25 },
    ],
  });
});

router.post('/categories', async (req: Request, res: Response) => {
  res.json({ id: 'new-category-id', name: req.body.name, templateCount: 0 });
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, updated: true });
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  res.json({ id: req.params.id, deleted: true });
});

// ========== 変数・プレースホルダー (4) ==========
router.get('/variables', async (req: Request, res: Response) => {
  res.json({
    variables: [
      { name: 'brand', type: 'text', description: 'ブランド名' },
      { name: 'model', type: 'text', description: 'モデル名' },
      { name: 'price', type: 'number', description: '価格' },
      { name: 'condition', type: 'select', options: ['New', 'Used', 'Refurbished'] },
    ],
  });
});

router.post('/variables', async (req: Request, res: Response) => {
  res.json({ name: req.body.name, type: req.body.type, created: true });
});

router.put('/variables/:name', async (req: Request, res: Response) => {
  res.json({ name: req.params.name, updated: true });
});

router.delete('/variables/:name', async (req: Request, res: Response) => {
  res.json({ name: req.params.name, deleted: true });
});

// ========== プレビュー・適用 (4) ==========
router.post('/preview', async (req: Request, res: Response) => {
  res.json({
    preview: {
      title: 'Rolex Submariner Watch',
      description: 'Premium Used watch with excellent condition...',
      renderedHtml: '<h1>Rolex Submariner Watch</h1><p>Premium Used watch...</p>',
    },
  });
});

router.post('/apply', async (req: Request, res: Response) => {
  res.json({ applied: true, listingId: 'listing-123', templateId: req.body.templateId });
});

router.post('/bulk-apply', async (req: Request, res: Response) => {
  res.json({ applied: true, count: req.body.listingIds?.length || 0, templateId: req.body.templateId });
});

router.get('/usage-history', async (req: Request, res: Response) => {
  res.json({
    history: [
      { id: 'h1', templateId: 't1', listingId: 'l1', appliedAt: '2026-02-17' },
      { id: 'h2', templateId: 't1', listingId: 'l2', appliedAt: '2026-02-16' },
    ],
  });
});

// ========== 分析 (3) ==========
router.get('/analytics', async (req: Request, res: Response) => {
  res.json({
    totalUsage: 5000,
    avgConversionRate: 8.5,
    topPerformers: [
      { templateId: 't1', name: 'Watch Pro', conversionRate: 12.5 },
    ],
  });
});

router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { date: '2026-02-01', usage: 150 },
      { date: '2026-02-08', usage: 180 },
      { date: '2026-02-15', usage: 200 },
    ],
  });
});

router.get('/analytics/comparison', async (req: Request, res: Response) => {
  res.json({
    comparison: [
      { templateId: 't1', name: 'Template A', views: 1000, sales: 100 },
      { templateId: 't2', name: 'Template B', views: 800, sales: 90 },
    ],
  });
});

// ========== 設定 (2) ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultCategory: 'Watches',
    autoSave: true,
    previewMode: 'live',
    maxTemplates: 500,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({ updated: true, settings: req.body });
});

export default router;

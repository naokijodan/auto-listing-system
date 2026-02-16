import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 277: eBay A/B Testing Platform（A/Bテストプラットフォーム）
// 28エンドポイント - テーマカラー: teal-600
// ============================================================

// スキーマ
const createExperimentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['TITLE', 'PRICE', 'IMAGE', 'DESCRIPTION', 'SHIPPING']),
  hypothesis: z.string(),
  targetMetric: z.enum(['CONVERSION_RATE', 'CTR', 'REVENUE', 'VIEWS']),
  variants: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).min(2),
  trafficSplit: z.record(z.number()).optional(),
  duration: z.number().min(1).default(14),
});

const updateExperimentSchema = createExperimentSchema.partial();

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    activeExperiments: 5,
    completedExperiments: 23,
    totalVariants: 15,
    avgLiftPercent: 12.5,
    topPerformer: { experimentId: 'exp_001', name: 'Title Test A', lift: 25.3 },
    recentWins: 8,
  });
});

router.get('/dashboard/active', async (req: Request, res: Response) => {
  res.json({
    experiments: [
      { id: 'exp_001', name: 'Title Optimization', type: 'TITLE', progress: 65, daysLeft: 5 },
      { id: 'exp_002', name: 'Price Testing', type: 'PRICE', progress: 40, daysLeft: 8 },
      { id: 'exp_003', name: 'Image A/B', type: 'IMAGE', progress: 80, daysLeft: 3 },
    ],
  });
});

router.get('/dashboard/insights', async (req: Request, res: Response) => {
  res.json({
    insights: [
      { type: 'winner', message: 'Title Test Aで25%のコンバージョン改善', experimentId: 'exp_001' },
      { type: 'recommendation', message: '価格テストの継続をお勧めします', experimentId: 'exp_002' },
      { type: 'alert', message: '有意差が検出されました', experimentId: 'exp_003' },
    ],
  });
});

// ========== 実験管理 ==========
router.get('/experiments', async (req: Request, res: Response) => {
  res.json({
    experiments: [
      { id: 'exp_001', name: 'Title Optimization', type: 'TITLE', status: 'RUNNING', startDate: '2026-02-01', variants: 2, traffic: 1000 },
      { id: 'exp_002', name: 'Price Testing', type: 'PRICE', status: 'RUNNING', startDate: '2026-02-05', variants: 3, traffic: 800 },
      { id: 'exp_003', name: 'Image A/B', type: 'IMAGE', status: 'RUNNING', startDate: '2026-02-08', variants: 2, traffic: 1200 },
      { id: 'exp_004', name: 'Description Test', type: 'DESCRIPTION', status: 'COMPLETED', startDate: '2026-01-15', variants: 2, traffic: 2500 },
    ],
    total: 28,
  });
});

router.post('/experiments', async (req: Request, res: Response) => {
  const parsed = createExperimentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid experiment', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `exp_${Date.now()}`,
    ...parsed.data,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
  });
});

router.get('/experiments/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Title Optimization',
    type: 'TITLE',
    hypothesis: 'より詳細なタイトルはCTRを改善する',
    targetMetric: 'CTR',
    status: 'RUNNING',
    variants: [
      { id: 'v1', name: 'Control', value: 'Original title', traffic: 50, conversions: 125, ctr: 2.5 },
      { id: 'v2', name: 'Variant A', value: 'Detailed title with keywords', traffic: 50, conversions: 156, ctr: 3.12 },
    ],
    startDate: '2026-02-01',
    endDate: '2026-02-15',
    progress: 65,
    statisticalSignificance: 95.2,
  });
});

router.put('/experiments/:id', async (req: Request, res: Response) => {
  const parsed = updateExperimentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid update', details: parsed.error.issues });
  }
  res.json({
    id: req.params.id,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/experiments/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

// ========== 実験操作 ==========
router.post('/experiments/:id/start', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
  });
});

router.post('/experiments/:id/stop', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'STOPPED',
    stoppedAt: new Date().toISOString(),
  });
});

router.post('/experiments/:id/complete', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'COMPLETED',
    winner: req.body.winnerId || 'v2',
    completedAt: new Date().toISOString(),
  });
});

router.post('/experiments/:id/apply-winner', async (req: Request, res: Response) => {
  res.json({
    experimentId: req.params.id,
    winnerId: req.body.winnerId,
    appliedToProducts: 150,
    appliedAt: new Date().toISOString(),
  });
});

// ========== バリアント管理 ==========
router.get('/experiments/:id/variants', async (req: Request, res: Response) => {
  res.json({
    variants: [
      { id: 'v1', name: 'Control', value: 'Original', trafficPercent: 50, views: 5000, clicks: 125, conversions: 25, ctr: 2.5, cvr: 0.5 },
      { id: 'v2', name: 'Variant A', value: 'Modified', trafficPercent: 50, views: 5000, clicks: 156, conversions: 35, ctr: 3.12, cvr: 0.7 },
    ],
  });
});

router.post('/experiments/:id/variants', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `var_${Date.now()}`,
    experimentId: req.params.id,
    ...req.body,
    createdAt: new Date().toISOString(),
  });
});

router.put('/experiments/:expId/variants/:varId', async (req: Request, res: Response) => {
  res.json({
    id: req.params.varId,
    experimentId: req.params.expId,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

// ========== 結果・分析 ==========
router.get('/experiments/:id/results', async (req: Request, res: Response) => {
  res.json({
    experimentId: req.params.id,
    status: 'RUNNING',
    duration: 10,
    totalTraffic: 10000,
    variants: [
      { id: 'v1', name: 'Control', visitors: 5000, conversions: 125, cvr: 2.5, revenue: 12500 },
      { id: 'v2', name: 'Variant A', visitors: 5000, conversions: 156, cvr: 3.12, revenue: 15600 },
    ],
    winner: { id: 'v2', name: 'Variant A', lift: 24.8 },
    statisticalSignificance: 95.2,
    confidence: 'high',
  });
});

router.get('/experiments/:id/timeline', async (req: Request, res: Response) => {
  res.json({
    timeline: [
      { date: '2026-02-01', v1: { cvr: 2.3 }, v2: { cvr: 2.8 } },
      { date: '2026-02-05', v1: { cvr: 2.4 }, v2: { cvr: 3.0 } },
      { date: '2026-02-10', v1: { cvr: 2.5 }, v2: { cvr: 3.12 } },
    ],
  });
});

// ========== テンプレート ==========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 't1', name: 'Title A/B Test', type: 'TITLE', description: 'タイトルの最適化テスト', usageCount: 15 },
      { id: 't2', name: 'Price Test', type: 'PRICE', description: '価格帯のテスト', usageCount: 10 },
      { id: 't3', name: 'Image Test', type: 'IMAGE', description: 'メイン画像のテスト', usageCount: 8 },
    ],
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `tpl_${Date.now()}`,
    ...req.body,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// ========== 分析 ==========
router.get('/analytics/overview', async (req: Request, res: Response) => {
  res.json({
    totalExperiments: 28,
    successRate: 65,
    avgLift: 12.5,
    totalRevenueLift: 45000,
    byType: [
      { type: 'TITLE', experiments: 12, avgLift: 15.2 },
      { type: 'PRICE', experiments: 8, avgLift: 10.5 },
      { type: 'IMAGE', experiments: 5, avgLift: 8.3 },
      { type: 'DESCRIPTION', experiments: 3, avgLift: 5.1 },
    ],
  });
});

router.get('/analytics/best-practices', async (req: Request, res: Response) => {
  res.json({
    practices: [
      { category: 'TITLE', finding: '具体的な数字を含むタイトルは平均18%高いCTR', confidence: 'high' },
      { category: 'PRICE', finding: '99円価格帯は端数なしより5%高いコンバージョン', confidence: 'medium' },
      { category: 'IMAGE', finding: '白背景の画像は他の背景より12%高いCTR', confidence: 'high' },
    ],
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    experimentsRun: 8,
    winners: 5,
    totalLift: 15000,
    topExperiment: { name: 'Title Test A', lift: 25.3 },
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-ab-testing/reports/download/ab_test_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultDuration: 14,
    minSampleSize: 1000,
    significanceLevel: 0.95,
    autoStopOnSignificance: true,
    notifyOnCompletion: true,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

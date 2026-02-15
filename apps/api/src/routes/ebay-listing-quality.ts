import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

type QualityDimension = 'completeness' | 'accuracy' | 'presentation' | 'pricing' | 'shipping' | 'trust' | 'compliance';
type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
type IssueType = 'missing' | 'invalid' | 'suboptimal' | 'policy_violation' | 'improvement';
type BenchmarkType = 'category' | 'seller' | 'marketplace' | 'competitor';

interface QualityScore {
  id: string;
  listingId: string;
  listingTitle: string;
  overallScore: number;
  qualityLevel: QualityLevel;
  dimensionScores: DimensionScore[];
  issues: QualityIssue[];
  improvementPotential: number;
  estimatedImpact: {
    visibility: number;
    conversion: number;
    trustScore: number;
  };
  lastEvaluatedAt: string;
  version: number;
}

interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  maxScore: number;
  weight: number;
  status: QualityLevel;
  checksPassed: number;
  checksTotal: number;
}

interface QualityIssue {
  id: string;
  dimension: QualityDimension;
  type: IssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  field?: string;
  currentValue?: string;
  expectedValue?: string;
  fixAction?: string;
  autoFixable: boolean;
}

interface QualityBenchmark {
  id: string;
  type: BenchmarkType;
  name: string;
  category?: string;
  metrics: {
    avgScore: number;
    medianScore: number;
    topQuartile: number;
    bottomQuartile: number;
    sampleSize: number;
  };
  dimensionBenchmarks: {
    dimension: QualityDimension;
    avg: number;
    top10: number;
  }[];
  updatedAt: string;
}

interface QualityCheck {
  id: string;
  name: string;
  dimension: QualityDimension;
  description: string;
  weight: number;
  enabled: boolean;
  condition: string;
  successMessage: string;
  failureMessage: string;
  autoFix?: {
    available: boolean;
    action: string;
  };
}

interface QualityTrend {
  date: string;
  avgScore: number;
  listingsImproved: number;
  listingsDeclined: number;
  topIssues: { issue: string; count: number }[];
}

// ============================================
// モックデータ
// ============================================

const mockQualityScores: QualityScore[] = [
  {
    id: 'qs-1',
    listingId: 'listing-001',
    listingTitle: 'Vintage Seiko Watch 1970s Automatic',
    overallScore: 78,
    qualityLevel: 'good',
    dimensionScores: [
      { dimension: 'completeness', score: 85, maxScore: 100, weight: 20, status: 'good', checksPassed: 17, checksTotal: 20 },
      { dimension: 'accuracy', score: 90, maxScore: 100, weight: 15, status: 'excellent', checksPassed: 9, checksTotal: 10 },
      { dimension: 'presentation', score: 72, maxScore: 100, weight: 20, status: 'good', checksPassed: 14, checksTotal: 20 },
      { dimension: 'pricing', score: 80, maxScore: 100, weight: 15, status: 'good', checksPassed: 8, checksTotal: 10 },
      { dimension: 'shipping', score: 65, maxScore: 100, weight: 10, status: 'fair', checksPassed: 6, checksTotal: 10 },
      { dimension: 'trust', score: 75, maxScore: 100, weight: 10, status: 'good', checksPassed: 7, checksTotal: 10 },
      { dimension: 'compliance', score: 82, maxScore: 100, weight: 10, status: 'good', checksPassed: 8, checksTotal: 10 }
    ],
    issues: [
      {
        id: 'issue-1',
        dimension: 'completeness',
        type: 'missing',
        severity: 'medium',
        title: 'Item Specificsが不完全',
        description: '推奨されるItem Specificsの70%のみ入力されています',
        field: 'itemSpecifics',
        expectedValue: '100%入力',
        fixAction: '残りのItem Specificsを入力してください',
        autoFixable: false
      },
      {
        id: 'issue-2',
        dimension: 'shipping',
        type: 'suboptimal',
        severity: 'high',
        title: '送料無料でない',
        description: '送料無料の出品は検索順位が向上します',
        field: 'shippingCost',
        currentValue: '$15.00',
        expectedValue: 'Free',
        fixAction: '価格に送料を含め、送料無料に設定',
        autoFixable: true
      },
      {
        id: 'issue-3',
        dimension: 'presentation',
        type: 'improvement',
        severity: 'low',
        title: '画像枚数が少ない',
        description: '12枚まで追加可能ですが、5枚のみです',
        field: 'images',
        currentValue: '5枚',
        expectedValue: '8枚以上',
        fixAction: '追加の画像をアップロード',
        autoFixable: false
      }
    ],
    improvementPotential: 22,
    estimatedImpact: {
      visibility: 15,
      conversion: 12,
      trustScore: 8
    },
    lastEvaluatedAt: '2026-02-15T10:00:00Z',
    version: 3
  }
];

const mockBenchmarks: QualityBenchmark[] = [
  {
    id: 'bench-1',
    type: 'category',
    name: 'Watches > Wristwatches',
    category: 'Watches',
    metrics: {
      avgScore: 72,
      medianScore: 74,
      topQuartile: 88,
      bottomQuartile: 58,
      sampleSize: 15420
    },
    dimensionBenchmarks: [
      { dimension: 'completeness', avg: 75, top10: 95 },
      { dimension: 'accuracy', avg: 80, top10: 98 },
      { dimension: 'presentation', avg: 68, top10: 92 },
      { dimension: 'pricing', avg: 72, top10: 90 },
      { dimension: 'shipping', avg: 65, top10: 88 },
      { dimension: 'trust', avg: 78, top10: 96 },
      { dimension: 'compliance', avg: 85, top10: 99 }
    ],
    updatedAt: '2026-02-15T06:00:00Z'
  },
  {
    id: 'bench-2',
    type: 'marketplace',
    name: 'eBay US Overall',
    metrics: {
      avgScore: 68,
      medianScore: 70,
      topQuartile: 85,
      bottomQuartile: 52,
      sampleSize: 2500000
    },
    dimensionBenchmarks: [
      { dimension: 'completeness', avg: 70, top10: 92 },
      { dimension: 'accuracy', avg: 75, top10: 96 },
      { dimension: 'presentation', avg: 65, top10: 90 },
      { dimension: 'pricing', avg: 68, top10: 88 },
      { dimension: 'shipping', avg: 62, top10: 85 },
      { dimension: 'trust', avg: 72, top10: 94 },
      { dimension: 'compliance', avg: 80, top10: 98 }
    ],
    updatedAt: '2026-02-15T06:00:00Z'
  }
];

const mockQualityChecks: QualityCheck[] = [
  {
    id: 'check-1',
    name: 'タイトル文字数',
    dimension: 'completeness',
    description: 'タイトルが60文字以上であること',
    weight: 10,
    enabled: true,
    condition: 'title.length >= 60',
    successMessage: 'タイトルは適切な長さです',
    failureMessage: 'タイトルが短すぎます（60文字以上推奨）',
    autoFix: { available: false, action: '' }
  },
  {
    id: 'check-2',
    name: '必須Item Specifics',
    dimension: 'completeness',
    description: '必須のItem Specificsがすべて入力されていること',
    weight: 15,
    enabled: true,
    condition: 'requiredSpecifics.all(filled)',
    successMessage: '必須Item Specificsが入力されています',
    failureMessage: '必須Item Specificsが不足しています',
    autoFix: { available: false, action: '' }
  },
  {
    id: 'check-3',
    name: '高解像度画像',
    dimension: 'presentation',
    description: 'すべての画像が500x500px以上であること',
    weight: 8,
    enabled: true,
    condition: 'images.all(width >= 500 && height >= 500)',
    successMessage: '画像は適切な解像度です',
    failureMessage: '一部の画像の解像度が低いです',
    autoFix: { available: false, action: '' }
  },
  {
    id: 'check-4',
    name: '送料無料',
    dimension: 'shipping',
    description: '送料無料であること',
    weight: 12,
    enabled: true,
    condition: 'shipping.free === true',
    successMessage: '送料無料に設定されています',
    failureMessage: '送料無料ではありません',
    autoFix: { available: true, action: 'setFreeShipping' }
  },
  {
    id: 'check-5',
    name: '30日返品ポリシー',
    dimension: 'trust',
    description: '30日以上の返品ポリシーがあること',
    weight: 10,
    enabled: true,
    condition: 'returnPolicy.days >= 30',
    successMessage: '返品ポリシーは適切です',
    failureMessage: '返品期間が短いです（30日以上推奨）',
    autoFix: { available: true, action: 'extendReturnPolicy' }
  }
];

const mockTrends: QualityTrend[] = [
  { date: '2026-02-09', avgScore: 65.2, listingsImproved: 45, listingsDeclined: 12, topIssues: [{ issue: '画像不足', count: 89 }] },
  { date: '2026-02-10', avgScore: 66.1, listingsImproved: 52, listingsDeclined: 15, topIssues: [{ issue: '送料設定', count: 78 }] },
  { date: '2026-02-11', avgScore: 67.3, listingsImproved: 63, listingsDeclined: 8, topIssues: [{ issue: 'Item Specifics', count: 65 }] },
  { date: '2026-02-12', avgScore: 68.5, listingsImproved: 71, listingsDeclined: 11, topIssues: [{ issue: 'タイトル最適化', count: 52 }] },
  { date: '2026-02-13', avgScore: 69.8, listingsImproved: 58, listingsDeclined: 9, topIssues: [{ issue: '画像不足', count: 48 }] },
  { date: '2026-02-14', avgScore: 70.2, listingsImproved: 45, listingsDeclined: 14, topIssues: [{ issue: '説明文', count: 42 }] },
  { date: '2026-02-15', avgScore: 71.5, listingsImproved: 38, listingsDeclined: 6, topIssues: [{ issue: '送料設定', count: 35 }] }
];

// ============================================
// スキーマ
// ============================================

const evaluateListingSchema = z.object({
  listingId: z.string(),
  fullEvaluation: z.boolean().optional().default(true)
});

const bulkEvaluateSchema = z.object({
  listingIds: z.array(z.string()).optional(),
  filter: z.object({
    category: z.string().optional(),
    minScore: z.number().optional(),
    maxScore: z.number().optional()
  }).optional(),
  limit: z.number().optional().default(100)
});

const qualityCheckSchema = z.object({
  name: z.string(),
  dimension: z.enum(['completeness', 'accuracy', 'presentation', 'pricing', 'shipping', 'trust', 'compliance']),
  description: z.string(),
  weight: z.number().min(1).max(100),
  enabled: z.boolean().optional().default(true),
  condition: z.string(),
  successMessage: z.string(),
  failureMessage: z.string()
});

const autoFixSchema = z.object({
  listingId: z.string(),
  issueIds: z.array(z.string())
});

// ============================================
// エンドポイント
// ============================================

// 品質統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  const stats = {
    totalListings: 1250,
    evaluatedListings: 1180,
    averageScore: 71.5,
    scoreDistribution: {
      excellent: { range: '90-100', count: 95, percentage: 8 },
      good: { range: '70-89', count: 485, percentage: 41 },
      fair: { range: '50-69', count: 420, percentage: 36 },
      poor: { range: '30-49', count: 150, percentage: 13 },
      critical: { range: '0-29', count: 30, percentage: 2 }
    },
    dimensionAverages: [
      { dimension: 'completeness', avg: 75.2 },
      { dimension: 'accuracy', avg: 82.1 },
      { dimension: 'presentation', avg: 68.5 },
      { dimension: 'pricing', avg: 74.3 },
      { dimension: 'shipping', avg: 62.8 },
      { dimension: 'trust', avg: 78.4 },
      { dimension: 'compliance', avg: 85.6 }
    ],
    topIssues: [
      { issue: '送料無料でない', count: 312, dimension: 'shipping', severity: 'high' },
      { issue: 'Item Specifics不完全', count: 287, dimension: 'completeness', severity: 'medium' },
      { issue: '画像枚数不足', count: 245, dimension: 'presentation', severity: 'medium' },
      { issue: 'タイトル最適化', count: 198, dimension: 'completeness', severity: 'low' },
      { issue: '返品ポリシー未設定', count: 156, dimension: 'trust', severity: 'high' }
    ],
    autoFixableIssues: 423,
    lastFullEvaluation: '2026-02-15T06:00:00Z'
  };

  res.json(stats);
});

// リスティング品質評価
router.post('/evaluate', async (req: Request, res: Response) => {
  const validation = evaluateListingSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { listingId } = validation.data;

  const existingScore = mockQualityScores.find(s => s.listingId === listingId);
  if (existingScore) {
    return res.json(existingScore);
  }

  // 新規評価（モック）
  const newScore: QualityScore = {
    id: `qs-${Date.now()}`,
    listingId,
    listingTitle: 'Evaluated Listing',
    overallScore: Math.floor(Math.random() * 40) + 50,
    qualityLevel: 'fair',
    dimensionScores: [
      { dimension: 'completeness', score: 70, maxScore: 100, weight: 20, status: 'good', checksPassed: 14, checksTotal: 20 },
      { dimension: 'accuracy', score: 80, maxScore: 100, weight: 15, status: 'good', checksPassed: 8, checksTotal: 10 },
      { dimension: 'presentation', score: 65, maxScore: 100, weight: 20, status: 'fair', checksPassed: 13, checksTotal: 20 },
      { dimension: 'pricing', score: 75, maxScore: 100, weight: 15, status: 'good', checksPassed: 7, checksTotal: 10 },
      { dimension: 'shipping', score: 55, maxScore: 100, weight: 10, status: 'fair', checksPassed: 5, checksTotal: 10 },
      { dimension: 'trust', score: 70, maxScore: 100, weight: 10, status: 'good', checksPassed: 7, checksTotal: 10 },
      { dimension: 'compliance', score: 85, maxScore: 100, weight: 10, status: 'good', checksPassed: 8, checksTotal: 10 }
    ],
    issues: [],
    improvementPotential: 25,
    estimatedImpact: { visibility: 18, conversion: 15, trustScore: 10 },
    lastEvaluatedAt: new Date().toISOString(),
    version: 1
  };

  res.json(newScore);
});

// 品質スコア一覧
router.get('/scores', async (req: Request, res: Response) => {
  const { minScore, maxScore, qualityLevel, dimension, sortBy, order, limit, offset } = req.query;

  let filtered = [...mockQualityScores];

  if (minScore) {
    filtered = filtered.filter(s => s.overallScore >= Number(minScore));
  }
  if (maxScore) {
    filtered = filtered.filter(s => s.overallScore <= Number(maxScore));
  }
  if (qualityLevel) {
    filtered = filtered.filter(s => s.qualityLevel === String(qualityLevel));
  }

  // ソート
  if (sortBy === 'score') {
    filtered.sort((a, b) => order === 'asc' ? a.overallScore - b.overallScore : b.overallScore - a.overallScore);
  } else if (sortBy === 'potential') {
    filtered.sort((a, b) => order === 'asc' ? a.improvementPotential - b.improvementPotential : b.improvementPotential - a.improvementPotential);
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 20);

  res.json({
    scores: filtered.slice(start, end),
    total: filtered.length,
    hasMore: end < filtered.length
  });
});

// 一括品質評価
router.post('/bulk-evaluate', async (req: Request, res: Response) => {
  const validation = bulkEvaluateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { listingIds, limit } = validation.data;

  res.json({
    jobId: `job-${Date.now()}`,
    status: 'processing',
    totalListings: listingIds?.length || limit,
    estimatedCompletion: new Date(Date.now() + 120000).toISOString()
  });
});

// 品質スコア詳細取得
router.get('/scores/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  const score = mockQualityScores.find(s => s.listingId === listingId);
  if (!score) {
    return res.status(404).json({ error: 'Quality score not found' });
  }

  res.json(score);
});

// 問題一覧取得
router.get('/issues', async (req: Request, res: Response) => {
  const { dimension, severity, type, autoFixable, limit, offset } = req.query;

  let allIssues = mockQualityScores.flatMap(s =>
    s.issues.map(i => ({ ...i, listingId: s.listingId, listingTitle: s.listingTitle }))
  );

  if (dimension) {
    allIssues = allIssues.filter(i => i.dimension === String(dimension));
  }
  if (severity) {
    allIssues = allIssues.filter(i => i.severity === String(severity));
  }
  if (type) {
    allIssues = allIssues.filter(i => i.type === String(type));
  }
  if (autoFixable === 'true') {
    allIssues = allIssues.filter(i => i.autoFixable);
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 50);

  res.json({
    issues: allIssues.slice(start, end),
    total: allIssues.length
  });
});

// 自動修正実行
router.post('/auto-fix', async (req: Request, res: Response) => {
  const validation = autoFixSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { listingId, issueIds } = validation.data;

  res.json({
    listingId,
    fixedIssues: issueIds.length,
    results: issueIds.map(id => ({
      issueId: id,
      status: 'fixed',
      action: 'Applied auto-fix successfully'
    })),
    newScore: 85,
    previousScore: 78
  });
});

// 一括自動修正
router.post('/bulk-auto-fix', async (req: Request, res: Response) => {
  const { listingIds, issueTypes } = req.body;

  res.json({
    jobId: `autofix-${Date.now()}`,
    status: 'processing',
    targetListings: listingIds?.length || 'all autoFixable',
    issueTypes: issueTypes || ['all'],
    estimatedFixes: 423
  });
});

// ベンチマーク一覧
router.get('/benchmarks', async (req: Request, res: Response) => {
  const { type, category } = req.query;

  let filtered = [...mockBenchmarks];

  if (type) {
    filtered = filtered.filter(b => b.type === String(type));
  }
  if (category) {
    filtered = filtered.filter(b => b.category === String(category));
  }

  res.json({
    benchmarks: filtered,
    total: filtered.length
  });
});

// カテゴリベンチマーク取得
router.get('/benchmarks/category/:category', async (req: Request, res: Response) => {
  const { category } = req.params;

  const benchmark = mockBenchmarks.find(b => b.type === 'category' && b.category === category);
  if (!benchmark) {
    return res.status(404).json({ error: 'Benchmark not found' });
  }

  res.json(benchmark);
});

// リスティングをベンチマークと比較
router.get('/compare/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  const { benchmarkType } = req.query;

  const score = mockQualityScores.find(s => s.listingId === listingId);
  if (!score) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const benchmark = mockBenchmarks.find(b => b.type === (benchmarkType || 'category'));

  res.json({
    listing: {
      id: listingId,
      score: score.overallScore,
      dimensionScores: score.dimensionScores
    },
    benchmark: benchmark?.metrics,
    comparison: {
      vsAvg: score.overallScore - (benchmark?.metrics.avgScore || 0),
      vsMedian: score.overallScore - (benchmark?.metrics.medianScore || 0),
      percentile: 65, // モック
      ranking: 'Above Average'
    },
    dimensionComparison: score.dimensionScores.map(ds => {
      const benchDim = benchmark?.dimensionBenchmarks.find(d => d.dimension === ds.dimension);
      return {
        dimension: ds.dimension,
        yourScore: ds.score,
        categoryAvg: benchDim?.avg || 0,
        top10: benchDim?.top10 || 0,
        gap: ds.score - (benchDim?.avg || 0)
      };
    })
  });
});

// 品質チェック一覧
router.get('/checks', async (_req: Request, res: Response) => {
  res.json({
    checks: mockQualityChecks,
    total: mockQualityChecks.length
  });
});

// 品質チェック作成
router.post('/checks', async (req: Request, res: Response) => {
  const validation = qualityCheckSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newCheck: QualityCheck = {
    id: `check-${Date.now()}`,
    ...validation.data,
    autoFix: { available: false, action: '' }
  };

  res.status(201).json(newCheck);
});

// 品質チェック更新
router.put('/checks/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = qualityCheckSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const check = mockQualityChecks.find(c => c.id === id);
  if (!check) {
    return res.status(404).json({ error: 'Check not found' });
  }

  const updated = { ...check, ...validation.data };
  res.json(updated);
});

// 品質チェック削除
router.delete('/checks/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const check = mockQualityChecks.find(c => c.id === id);
  if (!check) {
    return res.status(404).json({ error: 'Check not found' });
  }

  res.json({ success: true, deletedId: id });
});

// トレンド取得
router.get('/trends', async (req: Request, res: Response) => {
  const { days } = req.query;

  const trendDays = Number(days) || 7;

  res.json({
    trends: mockTrends.slice(-trendDays),
    summary: {
      scoreChange: 6.3,
      totalImproved: 372,
      totalDeclined: 75,
      avgDailyImprovement: 53
    }
  });
});

// 改善履歴
router.get('/history/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  res.json({
    listingId,
    history: [
      { date: '2026-02-15', score: 78, change: 5, actions: ['送料無料に変更', 'Item Specifics追加'] },
      { date: '2026-02-14', score: 73, change: 3, actions: ['画像追加'] },
      { date: '2026-02-13', score: 70, change: 0, actions: [] },
      { date: '2026-02-12', score: 70, change: 8, actions: ['タイトル最適化', '説明文改善'] },
      { date: '2026-02-11', score: 62, change: 0, actions: [] }
    ]
  });
});

// レポート生成
router.post('/reports/generate', async (req: Request, res: Response) => {
  const { listingIds, format, includeBenchmark } = req.body;

  res.json({
    reportId: `qr-${Date.now()}`,
    status: 'generating',
    parameters: {
      listingCount: listingIds?.length || 'all',
      format: format || 'pdf',
      includeBenchmark: includeBenchmark || true
    },
    estimatedCompletion: new Date(Date.now() + 60000).toISOString()
  });
});

// 推奨アクション取得
router.get('/recommendations/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  res.json({
    listingId,
    recommendations: [
      {
        priority: 1,
        action: '送料無料に設定',
        dimension: 'shipping',
        expectedImpact: 15,
        effort: 'low',
        autoFixable: true
      },
      {
        priority: 2,
        action: 'Item Specificsを完全に入力',
        dimension: 'completeness',
        expectedImpact: 10,
        effort: 'medium',
        autoFixable: false
      },
      {
        priority: 3,
        action: '追加の商品画像を撮影',
        dimension: 'presentation',
        expectedImpact: 8,
        effort: 'high',
        autoFixable: false
      },
      {
        priority: 4,
        action: '30日返品ポリシーを設定',
        dimension: 'trust',
        expectedImpact: 5,
        effort: 'low',
        autoFixable: true
      }
    ],
    totalPotentialImprovement: 38
  });
});

export const ebayListingQualityRouter = router;

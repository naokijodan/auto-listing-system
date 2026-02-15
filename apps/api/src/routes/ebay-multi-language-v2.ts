import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 180: Multi-Language Support v2 API
// 多言語対応v2
// ============================================

// --- ダッシュボード ---

// 翻訳概要
router.get('/dashboard', async (_req, res) => {
  res.json({
    supportedLanguages: 12,
    activeTranslations: 4850,
    pendingTranslations: 125,
    autoTranslateEnabled: true,
    qualityScore: 94.5,
    monthlyUsage: {
      characters: 2500000,
      limit: 5000000,
      percentUsed: 50,
    },
    recentActivity: [
      { type: 'batch_translation', count: 50, targetLang: 'de', timestamp: '2026-02-15T10:00:00Z' },
      { type: 'manual_edit', listingId: 'lst_123', lang: 'fr', timestamp: '2026-02-15T09:30:00Z' },
      { type: 'auto_translation', count: 25, targetLang: 'es', timestamp: '2026-02-15T09:00:00Z' },
    ],
  });
});

// --- 言語設定 ---

// サポート言語一覧
router.get('/languages', async (_req, res) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', enabled: true, isDefault: true, listings: 450 },
    { code: 'de', name: 'German', nativeName: 'Deutsch', enabled: true, isDefault: false, listings: 380 },
    { code: 'fr', name: 'French', nativeName: 'Français', enabled: true, isDefault: false, listings: 320 },
    { code: 'es', name: 'Spanish', nativeName: 'Español', enabled: true, isDefault: false, listings: 280 },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', enabled: true, isDefault: false, listings: 220 },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', enabled: true, isDefault: false, listings: 450 },
    { code: 'zh', name: 'Chinese', nativeName: '中文', enabled: false, isDefault: false, listings: 0 },
    { code: 'ko', name: 'Korean', nativeName: '한국어', enabled: false, isDefault: false, listings: 0 },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', enabled: false, isDefault: false, listings: 0 },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', enabled: false, isDefault: false, listings: 0 },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', enabled: false, isDefault: false, listings: 0 },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', enabled: false, isDefault: false, listings: 0 },
  ];

  res.json({ languages, total: languages.length });
});

// 言語有効化/無効化
router.put('/languages/:code', async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    isDefault: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    code: req.params.code,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 翻訳管理 ---

// 出品の翻訳一覧
router.get('/listings/:listingId/translations', async (req, res) => {
  const translations = [
    { lang: 'en', title: 'Vintage Rolex Watch', description: 'Beautiful vintage watch...', status: 'published', quality: 100, isOriginal: true },
    { lang: 'de', title: 'Vintage Rolex Uhr', description: 'Wunderschöne Vintage-Uhr...', status: 'published', quality: 95, isOriginal: false },
    { lang: 'fr', title: 'Montre Rolex Vintage', description: 'Belle montre vintage...', status: 'published', quality: 92, isOriginal: false },
    { lang: 'es', title: 'Reloj Rolex Vintage', description: 'Hermoso reloj vintage...', status: 'draft', quality: 88, isOriginal: false },
  ];

  res.json({ listingId: req.params.listingId, translations });
});

// 翻訳を取得
router.get('/listings/:listingId/translations/:lang', async (req, res) => {
  res.json({
    listingId: req.params.listingId,
    lang: req.params.lang,
    title: 'Vintage Rolex Uhr',
    description: 'Wunderschöne Vintage-Uhr in ausgezeichnetem Zustand...',
    bulletPoints: [
      'Authentische Vintage Rolex',
      'Ausgezeichneter Zustand',
      'Originalbox und Papiere',
    ],
    keywords: ['vintage', 'rolex', 'uhr', 'luxus'],
    status: 'published',
    quality: 95,
    lastTranslated: '2026-02-14T15:00:00Z',
    translatedBy: 'auto',
  });
});

// 翻訳を更新
router.put('/listings/:listingId/translations/:lang', async (req, res) => {
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    bulletPoints: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    status: z.enum(['draft', 'review', 'published']).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    listingId: req.params.listingId,
    lang: req.params.lang,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// 翻訳を削除
router.delete('/listings/:listingId/translations/:lang', async (req, res) => {
  res.json({
    success: true,
    listingId: req.params.listingId,
    lang: req.params.lang,
  });
});

// --- 自動翻訳 ---

// 単一出品を翻訳
router.post('/translate', async (req, res) => {
  const schema = z.object({
    listingId: z.string(),
    sourceLang: z.string(),
    targetLangs: z.array(z.string()),
    fields: z.array(z.enum(['title', 'description', 'bulletPoints', 'keywords'])).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    jobId: `trans_${Date.now()}`,
    listingId: data.listingId,
    targetLangs: data.targetLangs,
    status: 'processing',
    startedAt: new Date().toISOString(),
  });
});

// 一括翻訳
router.post('/translate/batch', async (req, res) => {
  const schema = z.object({
    listingIds: z.array(z.string()),
    sourceLang: z.string(),
    targetLangs: z.array(z.string()),
    priority: z.enum(['low', 'normal', 'high']).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    jobId: `batch_trans_${Date.now()}`,
    totalListings: data.listingIds.length,
    targetLangs: data.targetLangs,
    estimatedTranslations: data.listingIds.length * data.targetLangs.length,
    status: 'queued',
    startedAt: new Date().toISOString(),
  });
});

// 翻訳ジョブ状態
router.get('/translate/jobs/:jobId', async (req, res) => {
  res.json({
    jobId: req.params.jobId,
    status: 'completed',
    progress: {
      total: 50,
      completed: 50,
      failed: 2,
    },
    startedAt: '2026-02-15T09:00:00Z',
    completedAt: '2026-02-15T09:15:00Z',
    errors: [
      { listingId: 'lst_45', lang: 'de', error: 'Content too long' },
      { listingId: 'lst_78', lang: 'fr', error: 'Translation API error' },
    ],
  });
});

// --- 用語集 ---

// 用語集一覧
router.get('/glossary', async (req, res) => {
  const terms = [
    { id: 'term_1', source: 'vintage', translations: { de: 'Vintage', fr: 'vintage', es: 'vintage' }, category: 'general' },
    { id: 'term_2', source: 'authentic', translations: { de: 'authentisch', fr: 'authentique', es: 'auténtico' }, category: 'quality' },
    { id: 'term_3', source: 'mint condition', translations: { de: 'neuwertig', fr: 'état neuf', es: 'como nuevo' }, category: 'condition' },
    { id: 'term_4', source: 'free shipping', translations: { de: 'kostenloser Versand', fr: 'livraison gratuite', es: 'envío gratis' }, category: 'shipping' },
  ];

  res.json({ terms, total: terms.length });
});

// 用語追加
router.post('/glossary', async (req, res) => {
  const schema = z.object({
    source: z.string(),
    translations: z.record(z.string()),
    category: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `term_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
  });
});

// 用語更新
router.put('/glossary/:id', async (req, res) => {
  const schema = z.object({
    source: z.string().optional(),
    translations: z.record(z.string()).optional(),
    category: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// 用語削除
router.delete('/glossary/:id', async (req, res) => {
  res.json({ success: true, termId: req.params.id });
});

// 用語インポート
router.post('/glossary/import', async (req, res) => {
  const schema = z.object({
    format: z.enum(['csv', 'xlsx', 'json']),
    data: z.string(),
  });

  schema.parse(req.body);

  res.json({
    imported: 45,
    skipped: 3,
    errors: 2,
    importedAt: new Date().toISOString(),
  });
});

// --- 翻訳メモリ ---

// 翻訳メモリ検索
router.get('/translation-memory', async (req, res) => {
  const matches = [
    { source: 'Excellent condition', target: 'Ausgezeichneter Zustand', lang: 'de', confidence: 100, usageCount: 45 },
    { source: 'Brand new', target: 'Brandneu', lang: 'de', confidence: 98, usageCount: 32 },
    { source: 'Original packaging', target: 'Originalverpackung', lang: 'de', confidence: 95, usageCount: 28 },
  ];

  res.json({ matches, total: matches.length });
});

// 翻訳メモリに追加
router.post('/translation-memory', async (req, res) => {
  const schema = z.object({
    source: z.string(),
    target: z.string(),
    sourceLang: z.string(),
    targetLang: z.string(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `tm_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
  });
});

// --- 品質管理 ---

// 翻訳品質レポート
router.get('/quality/report', async (req, res) => {
  res.json({
    overallScore: 94.5,
    byLanguage: [
      { lang: 'de', score: 96, translations: 380, issues: 12 },
      { lang: 'fr', score: 94, translations: 320, issues: 18 },
      { lang: 'es', score: 93, translations: 280, issues: 22 },
      { lang: 'it', score: 92, translations: 220, issues: 25 },
    ],
    commonIssues: [
      { type: 'grammar', count: 35, percentage: 45 },
      { type: 'terminology', count: 25, percentage: 32 },
      { type: 'formatting', count: 18, percentage: 23 },
    ],
    trends: [
      { month: '2026-02', score: 94.5 },
      { month: '2026-01', score: 93.2 },
      { month: '2025-12', score: 91.8 },
    ],
  });
});

// 翻訳品質チェック
router.post('/quality/check', async (req, res) => {
  const schema = z.object({
    listingId: z.string(),
    lang: z.string(),
  });

  const data = schema.parse(req.body);

  res.json({
    listingId: data.listingId,
    lang: data.lang,
    score: 92,
    issues: [
      { field: 'title', type: 'grammar', message: '冠詞の使用を確認してください', severity: 'low' },
      { field: 'description', type: 'terminology', message: '用語集の表現を使用することを推奨', severity: 'medium' },
    ],
    checkedAt: new Date().toISOString(),
  });
});

// --- 設定 ---

// 翻訳設定
router.get('/settings', async (_req, res) => {
  res.json({
    autoTranslate: {
      enabled: true,
      newListings: true,
      updatedListings: true,
      defaultTargetLangs: ['de', 'fr', 'es'],
    },
    quality: {
      minScore: 85,
      requireReview: false,
      autoPublish: true,
    },
    api: {
      provider: 'google',
      model: 'nmt',
      customEndpoint: null,
    },
    notifications: {
      onBatchComplete: true,
      onError: true,
      onLowQuality: true,
    },
  });
});

// 翻訳設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    autoTranslate: z.object({
      enabled: z.boolean(),
      newListings: z.boolean(),
      updatedListings: z.boolean(),
      defaultTargetLangs: z.array(z.string()),
    }).optional(),
    quality: z.object({
      minScore: z.number(),
      requireReview: z.boolean(),
      autoPublish: z.boolean(),
    }).optional(),
    api: z.object({
      provider: z.enum(['google', 'deepl', 'azure', 'custom']),
      model: z.string(),
      customEndpoint: z.string().nullable(),
    }).optional(),
    notifications: z.object({
      onBatchComplete: z.boolean(),
      onError: z.boolean(),
      onLowQuality: z.boolean(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

// --- 統計 ---

// 翻訳統計
router.get('/stats', async (req, res) => {
  res.json({
    period: req.query.period || '30d',
    totalTranslations: 4850,
    charactersTranslated: 2500000,
    avgQualityScore: 94.5,
    byLanguage: [
      { lang: 'de', translations: 1250, characters: 650000 },
      { lang: 'fr', translations: 1100, characters: 580000 },
      { lang: 'es', translations: 950, characters: 520000 },
      { lang: 'it', translations: 800, characters: 450000 },
    ],
    byMethod: {
      auto: 4200,
      manual: 650,
    },
    costEstimate: {
      amount: 125.50,
      currency: 'USD',
    },
  });
});

export const ebayMultiLanguageV2Router = router;

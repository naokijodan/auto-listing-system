import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// 型定義
// ============================================================

// テンプレートタイプ
type TemplateType = 'LISTING' | 'VARIATION' | 'BUNDLE' | 'DESCRIPTION' | 'POLICY';

// テンプレートステータス
type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

// フィールドタイプ
type FieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN' | 'IMAGE' | 'RICHTEXT' | 'DATE';

// テンプレートフィールド
interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  placeholder?: string;
  helpText?: string;
  order: number;
}

// テンプレートセクション
interface TemplateSection {
  id: string;
  name: string;
  label: string;
  description?: string;
  fields: TemplateField[];
  order: number;
  collapsible: boolean;
  defaultExpanded: boolean;
}

// テンプレート
interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  status: TemplateStatus;
  sections: TemplateSection[];
  defaultValues: Record<string, unknown>;
  variationConfig?: {
    enabled: boolean;
    attributes: string[];
    pricingType: 'FIXED' | 'RELATIVE' | 'MATRIX';
  };
  bundleConfig?: {
    enabled: boolean;
    minItems: number;
    maxItems: number;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
  };
  abTestConfig?: {
    enabled: boolean;
    testId?: string;
    variants: { id: string; name: string; weight: number }[];
  };
  shippingPolicies: string[];
  returnPolicies: string[];
  paymentPolicies: string[];
  categoryMappings: { categoryId: string; itemSpecifics: Record<string, string> }[];
  useCount: number;
  successRate: number;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// テンプレートプリセット
interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  template: Partial<Template>;
  popularity: number;
}

// モックデータ
const mockTemplates: Template[] = [
  {
    id: 'tpl_001',
    name: 'ヴィンテージ時計 - 標準',
    description: 'ヴィンテージ時計の出品に最適化されたテンプレート',
    type: 'LISTING',
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec_basic',
        name: 'basic',
        label: '基本情報',
        fields: [
          { id: 'f_title', name: 'title', label: 'タイトル', type: 'TEXT', required: true, validation: { maxLength: 80 }, placeholder: '商品タイトルを入力', order: 1 },
          { id: 'f_subtitle', name: 'subtitle', label: 'サブタイトル', type: 'TEXT', required: false, validation: { maxLength: 55 }, order: 2 },
          { id: 'f_condition', name: 'condition', label: 'コンディション', type: 'SELECT', required: true, options: [
            { value: 'NEW', label: '新品' },
            { value: 'USED_EXCELLENT', label: '中古 - 非常に良い' },
            { value: 'USED_GOOD', label: '中古 - 良い' },
            { value: 'USED_FAIR', label: '中古 - 可' },
          ], order: 3 },
        ],
        order: 1,
        collapsible: true,
        defaultExpanded: true,
      },
      {
        id: 'sec_pricing',
        name: 'pricing',
        label: '価格設定',
        fields: [
          { id: 'f_price', name: 'price', label: '販売価格', type: 'NUMBER', required: true, validation: { min: 0.99 }, order: 1 },
          { id: 'f_quantity', name: 'quantity', label: '数量', type: 'NUMBER', required: true, defaultValue: 1, validation: { min: 1 }, order: 2 },
          { id: 'f_best_offer', name: 'bestOffer', label: 'ベストオファー', type: 'BOOLEAN', required: false, defaultValue: true, order: 3 },
        ],
        order: 2,
        collapsible: true,
        defaultExpanded: true,
      },
      {
        id: 'sec_description',
        name: 'description',
        label: '商品説明',
        fields: [
          { id: 'f_desc', name: 'description', label: '説明文', type: 'RICHTEXT', required: true, order: 1 },
        ],
        order: 3,
        collapsible: true,
        defaultExpanded: true,
      },
      {
        id: 'sec_specs',
        name: 'specifications',
        label: '仕様',
        description: '時計固有の仕様を入力',
        fields: [
          { id: 'f_brand', name: 'brand', label: 'ブランド', type: 'TEXT', required: true, order: 1 },
          { id: 'f_model', name: 'model', label: 'モデル', type: 'TEXT', required: false, order: 2 },
          { id: 'f_movement', name: 'movement', label: 'ムーブメント', type: 'SELECT', required: true, options: [
            { value: 'AUTOMATIC', label: '自動巻き' },
            { value: 'MANUAL', label: '手巻き' },
            { value: 'QUARTZ', label: 'クオーツ' },
          ], order: 3 },
          { id: 'f_case_size', name: 'caseSize', label: 'ケースサイズ (mm)', type: 'NUMBER', required: false, order: 4 },
          { id: 'f_year', name: 'year', label: '製造年', type: 'NUMBER', required: false, order: 5 },
        ],
        order: 4,
        collapsible: true,
        defaultExpanded: false,
      },
    ],
    defaultValues: {
      quantity: 1,
      bestOffer: true,
    },
    variationConfig: {
      enabled: false,
      attributes: [],
      pricingType: 'FIXED',
    },
    bundleConfig: {
      enabled: false,
      minItems: 2,
      maxItems: 5,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    },
    abTestConfig: {
      enabled: false,
      variants: [],
    },
    shippingPolicies: ['policy_intl_standard'],
    returnPolicies: ['policy_30day_return'],
    paymentPolicies: ['policy_paypal'],
    categoryMappings: [
      {
        categoryId: '31387',
        itemSpecifics: {
          'Type': 'Wristwatch',
          'Department': 'Unisex Adult',
        },
      },
    ],
    useCount: 156,
    successRate: 87.5,
    tags: ['watch', 'vintage', 'seiko'],
    createdBy: 'admin',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'tpl_002',
    name: 'カメラ・レンズ - バリエーション対応',
    description: 'カメラやレンズの出品用テンプレート（バリエーション対応）',
    type: 'VARIATION',
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec_basic',
        name: 'basic',
        label: '基本情報',
        fields: [
          { id: 'f_title', name: 'title', label: 'タイトル', type: 'TEXT', required: true, order: 1 },
          { id: 'f_brand', name: 'brand', label: 'ブランド', type: 'TEXT', required: true, order: 2 },
        ],
        order: 1,
        collapsible: false,
        defaultExpanded: true,
      },
      {
        id: 'sec_variation',
        name: 'variation',
        label: 'バリエーション設定',
        fields: [
          { id: 'f_color', name: 'color', label: 'カラー', type: 'MULTISELECT', required: false, options: [
            { value: 'BLACK', label: 'ブラック' },
            { value: 'SILVER', label: 'シルバー' },
            { value: 'WHITE', label: 'ホワイト' },
          ], order: 1 },
          { id: 'f_condition', name: 'condition', label: 'コンディション', type: 'MULTISELECT', required: false, options: [
            { value: 'NEW', label: '新品' },
            { value: 'USED_EXCELLENT', label: '中古 - 非常に良い' },
            { value: 'USED_GOOD', label: '中古 - 良い' },
          ], order: 2 },
        ],
        order: 2,
        collapsible: true,
        defaultExpanded: true,
      },
    ],
    defaultValues: {},
    variationConfig: {
      enabled: true,
      attributes: ['color', 'condition'],
      pricingType: 'MATRIX',
    },
    bundleConfig: {
      enabled: false,
      minItems: 2,
      maxItems: 5,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    },
    abTestConfig: {
      enabled: true,
      testId: 'test_camera_titles',
      variants: [
        { id: 'v1', name: 'コントロール', weight: 50 },
        { id: 'v2', name: 'バリアントA', weight: 50 },
      ],
    },
    shippingPolicies: ['policy_intl_express'],
    returnPolicies: ['policy_14day_return'],
    paymentPolicies: ['policy_paypal'],
    categoryMappings: [],
    useCount: 89,
    successRate: 82.3,
    tags: ['camera', 'lens', 'variation'],
    createdBy: 'admin',
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
  {
    id: 'tpl_003',
    name: 'アクセサリーバンドル',
    description: 'アクセサリーのバンドル販売用テンプレート',
    type: 'BUNDLE',
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec_bundle',
        name: 'bundle',
        label: 'バンドル設定',
        fields: [
          { id: 'f_bundle_name', name: 'bundleName', label: 'バンドル名', type: 'TEXT', required: true, order: 1 },
          { id: 'f_bundle_desc', name: 'bundleDescription', label: 'バンドル説明', type: 'RICHTEXT', required: true, order: 2 },
        ],
        order: 1,
        collapsible: false,
        defaultExpanded: true,
      },
    ],
    defaultValues: {},
    variationConfig: {
      enabled: false,
      attributes: [],
      pricingType: 'FIXED',
    },
    bundleConfig: {
      enabled: true,
      minItems: 2,
      maxItems: 10,
      discountType: 'PERCENTAGE',
      discountValue: 15,
    },
    abTestConfig: {
      enabled: false,
      variants: [],
    },
    shippingPolicies: [],
    returnPolicies: [],
    paymentPolicies: [],
    categoryMappings: [],
    useCount: 34,
    successRate: 91.2,
    tags: ['bundle', 'accessories'],
    createdBy: 'admin',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-08T00:00:00Z',
  },
];

const mockPresets: TemplatePreset[] = [
  {
    id: 'preset_001',
    name: '時計・ジュエリー',
    description: '時計やジュエリーの出品に最適',
    type: 'LISTING',
    category: 'Watches',
    template: {
      sections: [],
      variationConfig: { enabled: false, attributes: [], pricingType: 'FIXED' },
    },
    popularity: 95,
  },
  {
    id: 'preset_002',
    name: 'エレクトロニクス',
    description: 'カメラ、オーディオ機器など',
    type: 'LISTING',
    category: 'Electronics',
    template: {
      sections: [],
      variationConfig: { enabled: true, attributes: ['color', 'condition'], pricingType: 'MATRIX' },
    },
    popularity: 88,
  },
  {
    id: 'preset_003',
    name: 'アパレル - マルチバリエーション',
    description: 'サイズ・カラーのバリエーション対応',
    type: 'VARIATION',
    category: 'Clothing',
    template: {
      variationConfig: { enabled: true, attributes: ['size', 'color'], pricingType: 'RELATIVE' },
    },
    popularity: 72,
  },
];

// ============================================================
// バリデーションスキーマ
// ============================================================

const listTemplatesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['LISTING', 'VARIATION', 'BUNDLE', 'DESCRIPTION', 'POLICY']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(['createdAt', 'useCount', 'successRate', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['LISTING', 'VARIATION', 'BUNDLE', 'DESCRIPTION', 'POLICY']),
  sections: z.array(z.object({
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['TEXT', 'NUMBER', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'IMAGE', 'RICHTEXT', 'DATE']),
      required: z.boolean(),
      defaultValue: z.unknown().optional(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      validation: z.record(z.unknown()).optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      order: z.number(),
    })),
    order: z.number(),
    collapsible: z.boolean().default(true),
    defaultExpanded: z.boolean().default(true),
  })),
  defaultValues: z.record(z.unknown()).optional(),
  variationConfig: z.object({
    enabled: z.boolean(),
    attributes: z.array(z.string()),
    pricingType: z.enum(['FIXED', 'RELATIVE', 'MATRIX']),
  }).optional(),
  bundleConfig: z.object({
    enabled: z.boolean(),
    minItems: z.number(),
    maxItems: z.number(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================
// エンドポイント
// ============================================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  const dashboard = {
    summary: {
      total: mockTemplates.length,
      active: mockTemplates.filter(t => t.status === 'ACTIVE').length,
      draft: mockTemplates.filter(t => t.status === 'DRAFT').length,
      archived: mockTemplates.filter(t => t.status === 'ARCHIVED').length,
    },
    byType: {
      listing: mockTemplates.filter(t => t.type === 'LISTING').length,
      variation: mockTemplates.filter(t => t.type === 'VARIATION').length,
      bundle: mockTemplates.filter(t => t.type === 'BUNDLE').length,
      description: mockTemplates.filter(t => t.type === 'DESCRIPTION').length,
      policy: mockTemplates.filter(t => t.type === 'POLICY').length,
    },
    performance: {
      totalUses: mockTemplates.reduce((sum, t) => sum + t.useCount, 0),
      averageSuccessRate: mockTemplates.reduce((sum, t) => sum + t.successRate, 0) / mockTemplates.length,
    },
    topTemplates: mockTemplates
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        useCount: t.useCount,
        successRate: t.successRate,
      })),
    recentTemplates: mockTemplates
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
    presets: mockPresets,
  };

  res.json(dashboard);
});

// テンプレート一覧
router.get('/templates', async (req: Request, res: Response) => {
  const params = listTemplatesSchema.parse(req.query);

  let filtered = [...mockTemplates];

  if (params.type) {
    filtered = filtered.filter(t => t.type === params.type);
  }
  if (params.status) {
    filtered = filtered.filter(t => t.status === params.status);
  }
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search)
    );
  }
  if (params.tags) {
    const tags = params.tags.split(',');
    filtered = filtered.filter(t =>
      tags.some(tag => t.tags.includes(tag))
    );
  }

  // ソート
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (params.sortBy) {
      case 'useCount':
        comparison = a.useCount - b.useCount;
        break;
      case 'successRate':
        comparison = a.successRate - b.successRate;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return params.sortOrder === 'desc' ? -comparison : comparison;
  });

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const templates = filtered.slice(start, start + params.limit);

  res.json({
    templates,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    },
  });
});

// テンプレート詳細
router.get('/templates/:templateId', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const template = mockTemplates.find(t => t.id === templateId);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // 使用履歴
  const usageHistory = [
    { date: '2026-02-08', count: 12 },
    { date: '2026-02-09', count: 8 },
    { date: '2026-02-10', count: 15 },
    { date: '2026-02-11', count: 10 },
    { date: '2026-02-12', count: 18 },
    { date: '2026-02-13', count: 14 },
    { date: '2026-02-14', count: 9 },
  ];

  res.json({
    template,
    usageHistory,
    relatedTemplates: mockTemplates
      .filter(t => t.id !== templateId && t.type === template.type)
      .slice(0, 3),
  });
});

// テンプレート作成
router.post('/templates', async (req: Request, res: Response) => {
  const data = createTemplateSchema.parse(req.body);

  const newTemplate: Template = {
    id: `tpl_${Date.now()}`,
    name: data.name,
    description: data.description || '',
    type: data.type,
    status: 'DRAFT',
    sections: data.sections.map((s, i) => ({
      ...s,
      id: `sec_${i}`,
      fields: s.fields.map((f, j) => ({
        ...f,
        id: `f_${i}_${j}`,
      })),
    })),
    defaultValues: data.defaultValues || {},
    variationConfig: data.variationConfig || {
      enabled: false,
      attributes: [],
      pricingType: 'FIXED',
    },
    bundleConfig: data.bundleConfig || {
      enabled: false,
      minItems: 2,
      maxItems: 5,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    },
    abTestConfig: {
      enabled: false,
      variants: [],
    },
    shippingPolicies: [],
    returnPolicies: [],
    paymentPolicies: [],
    categoryMappings: [],
    useCount: 0,
    successRate: 0,
    tags: data.tags || [],
    createdBy: 'current_user',
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

  res.json({
    success: true,
    template: {
      ...template,
      ...data,
      updatedAt: new Date().toISOString(),
    },
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

// テンプレート複製
router.post('/templates/:templateId/duplicate', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { name } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const duplicated: Template = {
    ...template,
    id: `tpl_${Date.now()}`,
    name: name || `${template.name} (コピー)`,
    status: 'DRAFT',
    useCount: 0,
    successRate: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    template: duplicated,
  });
});

// テンプレートステータス変更
router.post('/templates/:templateId/status', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { status } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    success: true,
    template: {
      ...template,
      status,
      updatedAt: new Date().toISOString(),
    },
  });
});

// テンプレートプレビュー
router.post('/templates/:templateId/preview', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { values } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // プレビューデータを生成
  const preview = {
    title: values?.title || 'Sample Title',
    description: values?.description || 'Sample description...',
    price: values?.price || 99.99,
    images: [],
    itemSpecifics: {},
    variationsPreview: template.variationConfig?.enabled ? {
      attributes: template.variationConfig.attributes,
      combinations: [
        { sku: 'SKU-001', attributes: { color: 'Black' }, price: 99.99, quantity: 5 },
        { sku: 'SKU-002', attributes: { color: 'Silver' }, price: 109.99, quantity: 3 },
      ],
    } : null,
    bundlePreview: template.bundleConfig?.enabled ? {
      items: [],
      originalTotal: 0,
      discountedTotal: 0,
      savings: 0,
    } : null,
  };

  res.json({
    success: true,
    preview,
  });
});

// バリエーション設定更新
router.put('/templates/:templateId/variation-config', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { variationConfig } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    success: true,
    template: {
      ...template,
      variationConfig,
      updatedAt: new Date().toISOString(),
    },
  });
});

// バンドル設定更新
router.put('/templates/:templateId/bundle-config', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { bundleConfig } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    success: true,
    template: {
      ...template,
      bundleConfig,
      updatedAt: new Date().toISOString(),
    },
  });
});

// A/Bテスト設定更新
router.put('/templates/:templateId/ab-test-config', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { abTestConfig } = req.body;

  const template = mockTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({
    success: true,
    template: {
      ...template,
      abTestConfig,
      updatedAt: new Date().toISOString(),
    },
  });
});

// プリセット一覧
router.get('/presets', async (_req: Request, res: Response) => {
  res.json({
    presets: mockPresets,
    total: mockPresets.length,
  });
});

// プリセットからテンプレート作成
router.post('/presets/:presetId/use', async (req: Request, res: Response) => {
  const { presetId } = req.params;
  const { name } = req.body;

  const preset = mockPresets.find(p => p.id === presetId);
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  const newTemplate: Template = {
    id: `tpl_${Date.now()}`,
    name: name || `${preset.name}からの新規テンプレート`,
    description: preset.description,
    type: preset.type,
    status: 'DRAFT',
    sections: [],
    defaultValues: {},
    variationConfig: preset.template.variationConfig || {
      enabled: false,
      attributes: [],
      pricingType: 'FIXED',
    },
    bundleConfig: {
      enabled: false,
      minItems: 2,
      maxItems: 5,
      discountType: 'PERCENTAGE',
      discountValue: 10,
    },
    abTestConfig: {
      enabled: false,
      variants: [],
    },
    shippingPolicies: [],
    returnPolicies: [],
    paymentPolicies: [],
    categoryMappings: [],
    useCount: 0,
    successRate: 0,
    tags: [],
    createdBy: 'current_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    template: newTemplate,
  });
});

// 統計情報
router.get('/stats', async (req: Request, res: Response) => {
  const { period = '30d' } = req.query;

  const stats = {
    period,
    templates: {
      total: mockTemplates.length,
      active: mockTemplates.filter(t => t.status === 'ACTIVE').length,
    },
    usage: {
      total: mockTemplates.reduce((sum, t) => sum + t.useCount, 0),
      averagePerTemplate: mockTemplates.length > 0
        ? mockTemplates.reduce((sum, t) => sum + t.useCount, 0) / mockTemplates.length
        : 0,
    },
    performance: {
      averageSuccessRate: mockTemplates.reduce((sum, t) => sum + t.successRate, 0) / mockTemplates.length,
      topPerforming: mockTemplates
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5)
        .map(t => ({ id: t.id, name: t.name, successRate: t.successRate })),
    },
    byType: {
      listing: { count: mockTemplates.filter(t => t.type === 'LISTING').length, avgSuccess: 85 },
      variation: { count: mockTemplates.filter(t => t.type === 'VARIATION').length, avgSuccess: 82 },
      bundle: { count: mockTemplates.filter(t => t.type === 'BUNDLE').length, avgSuccess: 91 },
    },
    trends: [
      { date: '2026-02-08', uses: 45 },
      { date: '2026-02-09', uses: 52 },
      { date: '2026-02-10', uses: 38 },
      { date: '2026-02-11', uses: 61 },
      { date: '2026-02-12', uses: 48 },
      { date: '2026-02-13', uses: 55 },
      { date: '2026-02-14', uses: 42 },
    ],
  };

  res.json(stats);
});

export { router as ebayTemplatesV2Router };

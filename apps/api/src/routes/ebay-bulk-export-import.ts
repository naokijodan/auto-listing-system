import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'xml';
type ExportType = 'listings' | 'orders' | 'inventory' | 'customers' | 'analytics' | 'templates';
type ImportType = 'listings' | 'inventory' | 'prices' | 'templates' | 'categories';
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type MappingType = 'direct' | 'transform' | 'lookup' | 'default' | 'ignore';

interface ExportJob {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: JobStatus;
  filters?: Record<string, any>;
  columns?: string[];
  totalRecords: number;
  processedRecords: number;
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ImportJob {
  id: string;
  type: ImportType;
  fileName: string;
  fileSize: number;
  status: JobStatus;
  mapping: FieldMapping[];
  validationResults?: ValidationResult;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors?: ImportError[];
  createdAt: string;
  completedAt?: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  mappingType: MappingType;
  transformRule?: string;
  defaultValue?: string;
  required: boolean;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  errors: ValidationError[];
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface ImportError {
  row: number;
  listingId?: string;
  error: string;
  data?: Record<string, any>;
}

interface ExportTemplate {
  id: string;
  name: string;
  type: ExportType;
  format: ExportFormat;
  columns: string[];
  filters: Record<string, any>;
  schedule?: {
    enabled: boolean;
    cron: string;
    recipients: string[];
  };
  createdAt: string;
  lastUsedAt?: string;
}

interface ImportTemplate {
  id: string;
  name: string;
  type: ImportType;
  mapping: FieldMapping[];
  validationRules: Record<string, any>;
  createdAt: string;
  lastUsedAt?: string;
}

// ============================================
// モックデータ
// ============================================

const mockExportJobs: ExportJob[] = [
  {
    id: 'exp-1',
    type: 'listings',
    format: 'csv',
    status: 'completed',
    filters: { status: 'active' },
    columns: ['id', 'title', 'price', 'quantity', 'category'],
    totalRecords: 1250,
    processedRecords: 1250,
    fileUrl: '/exports/listings_2026-02-15.csv',
    fileSize: 524288,
    createdAt: '2026-02-15T09:00:00Z',
    completedAt: '2026-02-15T09:02:30Z'
  },
  {
    id: 'exp-2',
    type: 'orders',
    format: 'xlsx',
    status: 'processing',
    totalRecords: 5420,
    processedRecords: 2150,
    createdAt: '2026-02-15T10:00:00Z'
  }
];

const mockImportJobs: ImportJob[] = [
  {
    id: 'imp-1',
    type: 'inventory',
    fileName: 'inventory_update.csv',
    fileSize: 125000,
    status: 'completed',
    mapping: [
      { sourceField: 'sku', targetField: 'listingId', mappingType: 'direct', required: true },
      { sourceField: 'qty', targetField: 'quantity', mappingType: 'transform', transformRule: 'parseInt', required: true },
      { sourceField: 'price', targetField: 'price', mappingType: 'transform', transformRule: 'parseFloat', required: false }
    ],
    validationResults: {
      valid: true,
      totalRows: 500,
      validRows: 498,
      invalidRows: 2,
      warnings: ['2 rows have empty price fields'],
      errors: [
        { row: 45, field: 'qty', value: 'abc', error: 'Invalid number format' },
        { row: 123, field: 'sku', value: '', error: 'Required field is empty' }
      ]
    },
    totalRecords: 500,
    processedRecords: 500,
    successCount: 498,
    errorCount: 2,
    createdAt: '2026-02-15T08:30:00Z',
    completedAt: '2026-02-15T08:32:15Z'
  }
];

const mockExportTemplates: ExportTemplate[] = [
  {
    id: 'et-1',
    name: 'アクティブ出品一覧',
    type: 'listings',
    format: 'csv',
    columns: ['id', 'title', 'price', 'quantity', 'category', 'condition', 'views'],
    filters: { status: 'active' },
    schedule: {
      enabled: true,
      cron: '0 9 * * 1',
      recipients: ['seller@example.com']
    },
    createdAt: '2026-01-15T00:00:00Z',
    lastUsedAt: '2026-02-15T09:00:00Z'
  },
  {
    id: 'et-2',
    name: '月次売上レポート',
    type: 'orders',
    format: 'xlsx',
    columns: ['orderId', 'orderDate', 'buyerName', 'total', 'status', 'trackingNumber'],
    filters: {},
    createdAt: '2026-01-20T00:00:00Z'
  }
];

const mockImportTemplates: ImportTemplate[] = [
  {
    id: 'it-1',
    name: '在庫更新テンプレート',
    type: 'inventory',
    mapping: [
      { sourceField: 'SKU', targetField: 'listingId', mappingType: 'direct', required: true },
      { sourceField: 'Quantity', targetField: 'quantity', mappingType: 'transform', transformRule: 'parseInt', required: true },
      { sourceField: 'Price', targetField: 'price', mappingType: 'transform', transformRule: 'parseFloat', required: false }
    ],
    validationRules: {
      quantity: { type: 'number', min: 0 },
      price: { type: 'number', min: 0.01 }
    },
    createdAt: '2026-01-10T00:00:00Z',
    lastUsedAt: '2026-02-15T08:30:00Z'
  }
];

const availableColumns: Record<ExportType, string[]> = {
  listings: ['id', 'title', 'description', 'price', 'quantity', 'category', 'condition', 'brand', 'sku', 'views', 'watchers', 'status', 'startDate', 'endDate', 'imageUrls'],
  orders: ['orderId', 'orderDate', 'buyerName', 'buyerEmail', 'shippingAddress', 'items', 'subtotal', 'shipping', 'tax', 'total', 'status', 'trackingNumber', 'paymentMethod'],
  inventory: ['listingId', 'sku', 'title', 'quantity', 'reserved', 'available', 'reorderPoint', 'location', 'lastUpdated'],
  customers: ['customerId', 'name', 'email', 'phone', 'country', 'totalOrders', 'totalSpent', 'lastOrderDate', 'segment'],
  analytics: ['date', 'impressions', 'clicks', 'ctr', 'sales', 'revenue', 'conversionRate', 'avgOrderValue'],
  templates: ['templateId', 'name', 'type', 'category', 'fields', 'createdAt', 'usageCount']
};

// ============================================
// スキーマ
// ============================================

const createExportSchema = z.object({
  type: z.enum(['listings', 'orders', 'inventory', 'customers', 'analytics', 'templates']),
  format: z.enum(['csv', 'xlsx', 'json', 'xml']),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
});

const createImportSchema = z.object({
  type: z.enum(['listings', 'inventory', 'prices', 'templates', 'categories']),
  fileUrl: z.string(),
  mapping: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    mappingType: z.enum(['direct', 'transform', 'lookup', 'default', 'ignore']),
    transformRule: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().optional().default(false)
  })).optional(),
  templateId: z.string().optional(),
  skipValidation: z.boolean().optional().default(false)
});

const exportTemplateSchema = z.object({
  name: z.string(),
  type: z.enum(['listings', 'orders', 'inventory', 'customers', 'analytics', 'templates']),
  format: z.enum(['csv', 'xlsx', 'json', 'xml']),
  columns: z.array(z.string()),
  filters: z.record(z.any()).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    cron: z.string(),
    recipients: z.array(z.string())
  }).optional()
});

const importTemplateSchema = z.object({
  name: z.string(),
  type: z.enum(['listings', 'inventory', 'prices', 'templates', 'categories']),
  mapping: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    mappingType: z.enum(['direct', 'transform', 'lookup', 'default', 'ignore']),
    transformRule: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().optional().default(false)
  })),
  validationRules: z.record(z.any()).optional()
});

const validateFileSchema = z.object({
  fileUrl: z.string(),
  type: z.enum(['listings', 'inventory', 'prices', 'templates', 'categories']),
  mapping: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    mappingType: z.enum(['direct', 'transform', 'lookup', 'default', 'ignore']),
    required: z.boolean().optional().default(false)
  })).optional()
});

// ============================================
// エンドポイント
// ============================================

// 統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  const stats = {
    exports: {
      total: 156,
      thisMonth: 23,
      pending: 2,
      byType: {
        listings: 45,
        orders: 68,
        inventory: 32,
        customers: 8,
        analytics: 3
      }
    },
    imports: {
      total: 89,
      thisMonth: 12,
      pending: 1,
      successRate: 96.5,
      byType: {
        listings: 15,
        inventory: 52,
        prices: 18,
        templates: 4
      }
    },
    storage: {
      used: 2.5, // GB
      limit: 10, // GB
      oldestFile: '2026-01-01',
      fileCount: 245
    },
    scheduledExports: 5
  };

  res.json(stats);
});

// エクスポートジョブ一覧
router.get('/exports', async (req: Request, res: Response) => {
  const { type, status, limit, offset } = req.query;

  let filtered = [...mockExportJobs];

  if (type) {
    filtered = filtered.filter(j => j.type === String(type));
  }
  if (status) {
    filtered = filtered.filter(j => j.status === String(status));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 20);

  res.json({
    jobs: filtered.slice(start, end),
    total: filtered.length
  });
});

// エクスポートジョブ詳細
router.get('/exports/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockExportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }

  res.json(job);
});

// エクスポート作成
router.post('/exports', async (req: Request, res: Response) => {
  const validation = createExportSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { type, format, columns, filters } = validation.data;

  const newJob: ExportJob = {
    id: `exp-${Date.now()}`,
    type,
    format,
    status: 'pending',
    filters,
    columns: columns || availableColumns[type],
    totalRecords: Math.floor(Math.random() * 5000) + 100,
    processedRecords: 0,
    createdAt: new Date().toISOString()
  };

  res.status(201).json(newJob);
});

// エクスポートキャンセル
router.post('/exports/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockExportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
  }

  res.json({ ...job, status: 'cancelled' });
});

// エクスポートダウンロード
router.get('/exports/:id/download', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockExportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }

  if (job.status !== 'completed' || !job.fileUrl) {
    return res.status(400).json({ error: 'Export not ready for download' });
  }

  res.json({
    downloadUrl: job.fileUrl,
    fileName: `export_${job.type}_${new Date().toISOString().split('T')[0]}.${job.format}`,
    fileSize: job.fileSize,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

// 利用可能なカラム取得
router.get('/exports/columns/:type', async (req: Request, res: Response) => {
  const { type } = req.params;

  const columns = availableColumns[type as ExportType];
  if (!columns) {
    return res.status(404).json({ error: 'Invalid export type' });
  }

  res.json({
    type,
    columns: columns.map(c => ({
      name: c,
      required: ['id', 'listingId', 'orderId'].includes(c)
    }))
  });
});

// インポートジョブ一覧
router.get('/imports', async (req: Request, res: Response) => {
  const { type, status, limit, offset } = req.query;

  let filtered = [...mockImportJobs];

  if (type) {
    filtered = filtered.filter(j => j.type === String(type));
  }
  if (status) {
    filtered = filtered.filter(j => j.status === String(status));
  }

  const start = Number(offset) || 0;
  const end = start + (Number(limit) || 20);

  res.json({
    jobs: filtered.slice(start, end),
    total: filtered.length
  });
});

// インポートジョブ詳細
router.get('/imports/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockImportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  res.json(job);
});

// ファイル検証
router.post('/imports/validate', async (req: Request, res: Response) => {
  const validation = validateFileSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { fileUrl, type, mapping } = validation.data;

  // モック検証結果
  const result: ValidationResult = {
    valid: true,
    totalRows: 500,
    validRows: 495,
    invalidRows: 5,
    warnings: [
      '5 rows have empty optional fields',
      'Date format inconsistency detected in 3 rows'
    ],
    errors: [
      { row: 12, field: 'price', value: '-10.00', error: 'Price cannot be negative' },
      { row: 45, field: 'quantity', value: 'abc', error: 'Invalid number format' },
      { row: 89, field: 'sku', value: '', error: 'Required field is empty' },
      { row: 156, field: 'category', value: 'InvalidCat', error: 'Unknown category' },
      { row: 234, field: 'price', value: '999999', error: 'Price exceeds maximum' }
    ]
  };

  res.json({
    fileUrl,
    type,
    validation: result,
    detectedColumns: ['sku', 'title', 'price', 'quantity', 'category'],
    suggestedMapping: mapping || [
      { sourceField: 'sku', targetField: 'listingId', mappingType: 'direct', required: true },
      { sourceField: 'title', targetField: 'title', mappingType: 'direct', required: true },
      { sourceField: 'price', targetField: 'price', mappingType: 'transform', transformRule: 'parseFloat', required: true },
      { sourceField: 'quantity', targetField: 'quantity', mappingType: 'transform', transformRule: 'parseInt', required: true },
      { sourceField: 'category', targetField: 'categoryId', mappingType: 'lookup', required: false }
    ]
  });
});

// インポート作成
router.post('/imports', async (req: Request, res: Response) => {
  const validation = createImportSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { type, fileUrl, mapping, templateId } = validation.data;

  const newJob: ImportJob = {
    id: `imp-${Date.now()}`,
    type,
    fileName: fileUrl.split('/').pop() || 'import.csv',
    fileSize: Math.floor(Math.random() * 500000) + 10000,
    status: 'pending',
    mapping: mapping || [],
    totalRecords: Math.floor(Math.random() * 1000) + 100,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString()
  };

  res.status(201).json(newJob);
});

// インポートキャンセル
router.post('/imports/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockImportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
  }

  res.json({ ...job, status: 'cancelled' });
});

// インポートエラーダウンロード
router.get('/imports/:id/errors', async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = mockImportJobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  res.json({
    jobId: id,
    errors: job.errors || [],
    downloadUrl: `/downloads/import_errors_${id}.csv`
  });
});

// エクスポートテンプレート一覧
router.get('/templates/export', async (_req: Request, res: Response) => {
  res.json({
    templates: mockExportTemplates,
    total: mockExportTemplates.length
  });
});

// エクスポートテンプレート作成
router.post('/templates/export', async (req: Request, res: Response) => {
  const validation = exportTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newTemplate: ExportTemplate = {
    id: `et-${Date.now()}`,
    ...validation.data,
    filters: validation.data.filters || {},
    createdAt: new Date().toISOString()
  };

  res.status(201).json(newTemplate);
});

// エクスポートテンプレート削除
router.delete('/templates/export/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const template = mockExportTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ success: true, deletedId: id });
});

// インポートテンプレート一覧
router.get('/templates/import', async (_req: Request, res: Response) => {
  res.json({
    templates: mockImportTemplates,
    total: mockImportTemplates.length
  });
});

// インポートテンプレート作成
router.post('/templates/import', async (req: Request, res: Response) => {
  const validation = importTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const newTemplate: ImportTemplate = {
    id: `it-${Date.now()}`,
    ...validation.data,
    validationRules: validation.data.validationRules || {},
    createdAt: new Date().toISOString()
  };

  res.status(201).json(newTemplate);
});

// インポートテンプレート削除
router.delete('/templates/import/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const template = mockImportTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ success: true, deletedId: id });
});

// スケジュールエクスポート一覧
router.get('/schedules', async (_req: Request, res: Response) => {
  const scheduled = mockExportTemplates.filter(t => t.schedule?.enabled);

  res.json({
    schedules: scheduled.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      format: t.format,
      cron: t.schedule?.cron,
      recipients: t.schedule?.recipients,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastRun: t.lastUsedAt
    })),
    total: scheduled.length
  });
});

// スケジュール有効/無効切り替え
router.patch('/schedules/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const template = mockExportTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({
    id,
    enabled,
    message: enabled ? 'Schedule enabled' : 'Schedule disabled'
  });
});

// ファイルアップロードURL取得
router.post('/upload-url', async (req: Request, res: Response) => {
  const { fileName, fileType, fileSize } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  res.json({
    uploadUrl: `https://storage.example.com/uploads/${Date.now()}_${fileName}`,
    fileId: `file-${Date.now()}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
});

// ストレージ使用量
router.get('/storage', async (_req: Request, res: Response) => {
  res.json({
    used: 2.5,
    limit: 10,
    unit: 'GB',
    percentage: 25,
    files: {
      exports: { count: 156, size: 1.8 },
      imports: { count: 89, size: 0.7 }
    },
    retention: {
      exportFiles: 30, // days
      importFiles: 7
    }
  });
});

// 古いファイル削除
router.post('/storage/cleanup', async (req: Request, res: Response) => {
  const { olderThanDays } = req.body;

  res.json({
    deleted: 45,
    freedSpace: 0.8,
    unit: 'GB',
    deletedFiles: [
      { type: 'export', count: 30 },
      { type: 'import', count: 15 }
    ]
  });
});

export const ebayBulkExportImportRouter = router;

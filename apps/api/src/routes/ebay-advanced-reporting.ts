import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 165: Advanced Reporting（高度なレポート）
// ============================================

// --- レポートテンプレート ---
const reportTemplates = [
  {
    id: 'tpl_001',
    name: '売上日次レポート',
    description: '日別の売上サマリーと詳細',
    category: 'SALES',
    type: 'DAILY',
    metrics: ['total_sales', 'order_count', 'avg_order_value', 'refund_rate'],
    dimensions: ['date', 'category', 'marketplace'],
    filters: [],
    visualization: 'LINE_CHART',
    isSystem: true,
    createdAt: '2025-01-01T00:00:00Z',
    usageCount: 156,
  },
  {
    id: 'tpl_002',
    name: '在庫パフォーマンス',
    description: '在庫回転率と売れ筋分析',
    category: 'INVENTORY',
    type: 'WEEKLY',
    metrics: ['inventory_turnover', 'stock_level', 'days_of_supply', 'dead_stock_rate'],
    dimensions: ['category', 'brand', 'warehouse'],
    filters: [],
    visualization: 'BAR_CHART',
    isSystem: true,
    createdAt: '2025-01-01T00:00:00Z',
    usageCount: 89,
  },
  {
    id: 'tpl_003',
    name: '顧客分析',
    description: '顧客セグメント別の行動分析',
    category: 'CUSTOMER',
    type: 'MONTHLY',
    metrics: ['new_customers', 'repeat_rate', 'ltv', 'churn_rate'],
    dimensions: ['segment', 'acquisition_channel', 'country'],
    filters: [],
    visualization: 'PIE_CHART',
    isSystem: true,
    createdAt: '2025-01-01T00:00:00Z',
    usageCount: 67,
  },
  {
    id: 'tpl_004',
    name: '利益率分析',
    description: '商品別・カテゴリ別の利益率',
    category: 'FINANCE',
    type: 'MONTHLY',
    metrics: ['gross_profit', 'net_profit', 'margin_rate', 'cost_breakdown'],
    dimensions: ['product', 'category', 'marketplace'],
    filters: [],
    visualization: 'TABLE',
    isSystem: true,
    createdAt: '2025-01-01T00:00:00Z',
    usageCount: 112,
  },
  {
    id: 'tpl_005',
    name: 'カスタムレポート1',
    description: 'ユーザー作成のカスタムレポート',
    category: 'CUSTOM',
    type: 'ADHOC',
    metrics: ['total_sales', 'profit_margin'],
    dimensions: ['brand'],
    filters: [{ field: 'marketplace', operator: 'equals', value: 'ebay' }],
    visualization: 'LINE_CHART',
    isSystem: false,
    createdAt: '2026-02-01T00:00:00Z',
    usageCount: 12,
  },
];

// テンプレート一覧取得
router.get('/templates', (req, res) => {
  const { category, type, search } = req.query;

  let filtered = [...reportTemplates];

  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }
  if (type) {
    filtered = filtered.filter(t => t.type === type);
  }
  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s)
    );
  }

  res.json({
    templates: filtered,
    total: filtered.length,
    categories: ['SALES', 'INVENTORY', 'CUSTOMER', 'FINANCE', 'CUSTOM'],
    types: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ADHOC'],
  });
});

// テンプレート詳細取得
router.get('/templates/:id', (req, res) => {
  const template = reportTemplates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// テンプレート作成
router.post('/templates', (req, res) => {
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.enum(['SALES', 'INVENTORY', 'CUSTOMER', 'FINANCE', 'CUSTOM']),
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ADHOC']),
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in']),
      value: z.any(),
    })).optional(),
    visualization: z.enum(['LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'HEATMAP', 'SCATTER']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `tpl_${Date.now()}`,
    ...parsed.data,
    dimensions: parsed.data.dimensions ?? [],
    filters: parsed.data.filters ?? [],
    visualization: parsed.data.visualization ?? 'TABLE',
    isSystem: false,
    createdAt: new Date().toISOString(),
    usageCount: 0,
  });
});

// テンプレート更新
router.put('/templates/:id', (req, res) => {
  const template = reportTemplates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (template.isSystem) {
    return res.status(400).json({ error: 'System templates cannot be modified' });
  }

  res.json({ ...template, ...req.body, id: template.id, isSystem: template.isSystem });
});

// テンプレート削除
router.delete('/templates/:id', (req, res) => {
  const template = reportTemplates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (template.isSystem) {
    return res.status(400).json({ error: 'System templates cannot be deleted' });
  }

  res.json({ success: true, message: 'Template deleted' });
});

// --- レポート生成・実行 ---
const generatedReports = [
  {
    id: 'rpt_001',
    templateId: 'tpl_001',
    templateName: '売上日次レポート',
    name: '2026年2月15日 売上レポート',
    status: 'COMPLETED',
    period: { start: '2026-02-15', end: '2026-02-15' },
    createdAt: '2026-02-15T09:00:00Z',
    completedAt: '2026-02-15T09:02:00Z',
    createdBy: 'admin@example.com',
    fileSize: 245000,
    rowCount: 1250,
  },
  {
    id: 'rpt_002',
    templateId: 'tpl_002',
    templateName: '在庫パフォーマンス',
    name: '2026年2月第2週 在庫レポート',
    status: 'COMPLETED',
    period: { start: '2026-02-10', end: '2026-02-16' },
    createdAt: '2026-02-14T08:00:00Z',
    completedAt: '2026-02-14T08:05:00Z',
    createdBy: 'manager@example.com',
    fileSize: 523000,
    rowCount: 3420,
  },
  {
    id: 'rpt_003',
    templateId: 'tpl_004',
    templateName: '利益率分析',
    name: '2026年1月 利益率レポート',
    status: 'COMPLETED',
    period: { start: '2026-01-01', end: '2026-01-31' },
    createdAt: '2026-02-01T10:00:00Z',
    completedAt: '2026-02-01T10:15:00Z',
    createdBy: 'admin@example.com',
    fileSize: 1250000,
    rowCount: 8500,
  },
];

// レポート一覧取得
router.get('/reports', (req, res) => {
  const { templateId, status, page = '1', limit = '20' } = req.query;

  let filtered = [...generatedReports];

  if (templateId) {
    filtered = filtered.filter(r => r.templateId === templateId);
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    reports: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

// レポート詳細取得
router.get('/reports/:id', (req, res) => {
  const report = generatedReports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// レポート生成
router.post('/reports/generate', (req, res) => {
  const schema = z.object({
    templateId: z.string(),
    name: z.string().optional(),
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })).optional(),
    format: z.enum(['JSON', 'CSV', 'XLSX', 'PDF']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const template = reportTemplates.find(t => t.id === parsed.data.templateId);

  res.status(202).json({
    id: `rpt_${Date.now()}`,
    templateId: parsed.data.templateId,
    templateName: template?.name ?? 'Unknown',
    name: parsed.data.name ?? `${template?.name} - ${new Date().toISOString().split('T')[0]}`,
    status: 'PROCESSING',
    period: parsed.data.period,
    createdAt: new Date().toISOString(),
    createdBy: 'current_user@example.com',
    estimatedTime: '2-5 minutes',
    message: 'Report generation started',
  });
});

// レポートデータ取得
router.get('/reports/:id/data', (req, res) => {
  const { page = '1', limit = '100' } = req.query;

  // サンプルデータ
  const sampleData = Array.from({ length: 50 }, (_, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    category: ['Electronics', 'Fashion', 'Home'][i % 3],
    marketplace: 'ebay',
    total_sales: Math.round(Math.random() * 10000),
    order_count: Math.round(Math.random() * 100),
    avg_order_value: Math.round(Math.random() * 200),
    refund_rate: (Math.random() * 5).toFixed(2),
  }));

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    data: sampleData.slice(offset, offset + limitNum),
    total: sampleData.length,
    page: pageNum,
    limit: limitNum,
    columns: [
      { key: 'date', label: '日付', type: 'date' },
      { key: 'category', label: 'カテゴリ', type: 'string' },
      { key: 'marketplace', label: 'マーケットプレイス', type: 'string' },
      { key: 'total_sales', label: '売上合計', type: 'currency' },
      { key: 'order_count', label: '注文数', type: 'number' },
      { key: 'avg_order_value', label: '平均注文額', type: 'currency' },
      { key: 'refund_rate', label: '返品率', type: 'percent' },
    ],
  });
});

// レポートエクスポート
router.get('/reports/:id/export', (req, res) => {
  const { format = 'CSV' } = req.query;

  res.json({
    reportId: req.params.id,
    format,
    downloadUrl: `https://example.com/reports/${req.params.id}/download.${(format as string).toLowerCase()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
});

// レポート削除
router.delete('/reports/:id', (req, res) => {
  res.json({ success: true, message: 'Report deleted' });
});

// --- スケジュールレポート ---
const scheduledReports = [
  {
    id: 'sch_001',
    templateId: 'tpl_001',
    templateName: '売上日次レポート',
    name: '日次売上自動レポート',
    schedule: '0 9 * * *', // 毎日9時
    scheduleDescription: '毎日 9:00',
    timezone: 'Asia/Tokyo',
    enabled: true,
    recipients: ['admin@example.com', 'manager@example.com'],
    format: 'XLSX',
    lastRun: '2026-02-15T09:00:00Z',
    nextRun: '2026-02-16T09:00:00Z',
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'sch_002',
    templateId: 'tpl_002',
    templateName: '在庫パフォーマンス',
    name: '週次在庫レポート',
    schedule: '0 8 * * 1', // 毎週月曜8時
    scheduleDescription: '毎週月曜日 8:00',
    timezone: 'Asia/Tokyo',
    enabled: true,
    recipients: ['inventory@example.com'],
    format: 'PDF',
    lastRun: '2026-02-10T08:00:00Z',
    nextRun: '2026-02-17T08:00:00Z',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'sch_003',
    templateId: 'tpl_004',
    templateName: '利益率分析',
    name: '月次利益レポート',
    schedule: '0 10 1 * *', // 毎月1日10時
    scheduleDescription: '毎月1日 10:00',
    timezone: 'Asia/Tokyo',
    enabled: true,
    recipients: ['finance@example.com', 'admin@example.com'],
    format: 'XLSX',
    lastRun: '2026-02-01T10:00:00Z',
    nextRun: '2026-03-01T10:00:00Z',
    createdAt: '2025-03-01T00:00:00Z',
  },
];

// スケジュール一覧取得
router.get('/schedules', (req, res) => {
  const { enabled } = req.query;

  let filtered = [...scheduledReports];

  if (enabled !== undefined) {
    filtered = filtered.filter(s => s.enabled === (enabled === 'true'));
  }

  res.json({
    schedules: filtered,
    total: filtered.length,
  });
});

// スケジュール詳細取得
router.get('/schedules/:id', (req, res) => {
  const schedule = scheduledReports.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  res.json(schedule);
});

// スケジュール作成
router.post('/schedules', (req, res) => {
  const schema = z.object({
    templateId: z.string(),
    name: z.string(),
    schedule: z.string(), // Cron式
    timezone: z.string().optional(),
    recipients: z.array(z.string().email()),
    format: z.enum(['JSON', 'CSV', 'XLSX', 'PDF']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const template = reportTemplates.find(t => t.id === parsed.data.templateId);

  res.status(201).json({
    id: `sch_${Date.now()}`,
    ...parsed.data,
    templateName: template?.name ?? 'Unknown',
    timezone: parsed.data.timezone ?? 'Asia/Tokyo',
    format: parsed.data.format ?? 'XLSX',
    enabled: true,
    scheduleDescription: 'カスタムスケジュール',
    lastRun: null,
    nextRun: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  });
});

// スケジュール更新
router.put('/schedules/:id', (req, res) => {
  const schedule = scheduledReports.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({ ...schedule, ...req.body, id: schedule.id });
});

// スケジュール削除
router.delete('/schedules/:id', (req, res) => {
  res.json({ success: true, message: 'Schedule deleted' });
});

// スケジュール有効/無効切替
router.post('/schedules/:id/toggle', (req, res) => {
  const schedule = scheduledReports.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({ ...schedule, enabled: !schedule.enabled });
});

// スケジュール即時実行
router.post('/schedules/:id/run', (req, res) => {
  const schedule = scheduledReports.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({
    scheduleId: schedule.id,
    reportId: `rpt_${Date.now()}`,
    status: 'PROCESSING',
    message: 'Scheduled report execution started',
  });
});

// --- メトリクス定義 ---
const metrics = [
  { id: 'total_sales', name: '売上合計', description: '期間内の総売上額', category: 'SALES', dataType: 'CURRENCY', aggregation: 'SUM' },
  { id: 'order_count', name: '注文数', description: '期間内の総注文数', category: 'SALES', dataType: 'NUMBER', aggregation: 'COUNT' },
  { id: 'avg_order_value', name: '平均注文額', description: '1注文あたりの平均金額', category: 'SALES', dataType: 'CURRENCY', aggregation: 'AVG' },
  { id: 'refund_rate', name: '返品率', description: '返品された注文の割合', category: 'SALES', dataType: 'PERCENT', aggregation: 'RATE' },
  { id: 'gross_profit', name: '粗利益', description: '売上から原価を引いた金額', category: 'FINANCE', dataType: 'CURRENCY', aggregation: 'SUM' },
  { id: 'net_profit', name: '純利益', description: '粗利益から経費を引いた金額', category: 'FINANCE', dataType: 'CURRENCY', aggregation: 'SUM' },
  { id: 'margin_rate', name: '利益率', description: '売上に対する利益の割合', category: 'FINANCE', dataType: 'PERCENT', aggregation: 'RATE' },
  { id: 'inventory_turnover', name: '在庫回転率', description: '在庫が入れ替わる頻度', category: 'INVENTORY', dataType: 'NUMBER', aggregation: 'AVG' },
  { id: 'stock_level', name: '在庫レベル', description: '現在の在庫数量', category: 'INVENTORY', dataType: 'NUMBER', aggregation: 'SUM' },
  { id: 'days_of_supply', name: '在庫日数', description: '現在の在庫が持続する日数', category: 'INVENTORY', dataType: 'NUMBER', aggregation: 'AVG' },
  { id: 'new_customers', name: '新規顧客数', description: '期間内に獲得した新規顧客数', category: 'CUSTOMER', dataType: 'NUMBER', aggregation: 'COUNT' },
  { id: 'repeat_rate', name: 'リピート率', description: 'リピート購入した顧客の割合', category: 'CUSTOMER', dataType: 'PERCENT', aggregation: 'RATE' },
  { id: 'ltv', name: 'LTV', description: '顧客生涯価値', category: 'CUSTOMER', dataType: 'CURRENCY', aggregation: 'AVG' },
  { id: 'churn_rate', name: '離脱率', description: '顧客が離脱した割合', category: 'CUSTOMER', dataType: 'PERCENT', aggregation: 'RATE' },
];

router.get('/metrics', (req, res) => {
  const { category } = req.query;

  let filtered = [...metrics];
  if (category) {
    filtered = filtered.filter(m => m.category === category);
  }

  res.json({
    metrics: filtered,
    total: filtered.length,
    categories: ['SALES', 'FINANCE', 'INVENTORY', 'CUSTOMER'],
  });
});

// --- ディメンション定義 ---
const dimensions = [
  { id: 'date', name: '日付', description: '日付単位の集計', dataType: 'DATE' },
  { id: 'week', name: '週', description: '週単位の集計', dataType: 'DATE' },
  { id: 'month', name: '月', description: '月単位の集計', dataType: 'DATE' },
  { id: 'category', name: 'カテゴリ', description: '商品カテゴリ別', dataType: 'STRING' },
  { id: 'brand', name: 'ブランド', description: 'ブランド別', dataType: 'STRING' },
  { id: 'product', name: '商品', description: '商品別', dataType: 'STRING' },
  { id: 'marketplace', name: 'マーケットプレイス', description: '販売チャネル別', dataType: 'STRING' },
  { id: 'country', name: '国', description: '国別', dataType: 'STRING' },
  { id: 'segment', name: '顧客セグメント', description: '顧客セグメント別', dataType: 'STRING' },
  { id: 'warehouse', name: '倉庫', description: '倉庫別', dataType: 'STRING' },
];

router.get('/dimensions', (req, res) => {
  res.json({
    dimensions,
    total: dimensions.length,
  });
});

// --- ダッシュボード ---
router.get('/dashboard', (req, res) => {
  res.json({
    summary: {
      totalTemplates: reportTemplates.length,
      totalReports: generatedReports.length,
      activeSchedules: scheduledReports.filter(s => s.enabled).length,
      reportsThisMonth: 45,
    },
    popularTemplates: reportTemplates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => ({ id: t.id, name: t.name, usageCount: t.usageCount })),
    recentReports: generatedReports
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    upcomingSchedules: scheduledReports
      .filter(s => s.enabled && s.nextRun)
      .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())
      .slice(0, 5)
      .map(s => ({ id: s.id, name: s.name, nextRun: s.nextRun })),
    storageUsage: {
      used: 2500000000, // 2.5GB
      total: 10000000000, // 10GB
      percent: 25,
    },
  });
});

// --- レポートビルダー（クエリ実行）---
router.post('/query', (req, res) => {
  const schema = z.object({
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })).optional(),
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
    orderBy: z.object({
      field: z.string(),
      direction: z.enum(['ASC', 'DESC']),
    }).optional(),
    limit: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  // サンプル結果を生成
  const rows = Array.from({ length: 10 }, (_, i) => {
    const row: Record<string, any> = {};

    if (parsed.data.dimensions) {
      parsed.data.dimensions.forEach(dim => {
        if (dim === 'date') {
          row[dim] = `2026-02-${String(i + 1).padStart(2, '0')}`;
        } else if (dim === 'category') {
          row[dim] = ['Electronics', 'Fashion', 'Home'][i % 3];
        } else {
          row[dim] = `${dim}_${i}`;
        }
      });
    }

    parsed.data.metrics.forEach(metric => {
      if (metric.includes('rate') || metric.includes('margin')) {
        row[metric] = (Math.random() * 30).toFixed(2);
      } else if (metric.includes('count')) {
        row[metric] = Math.round(Math.random() * 100);
      } else {
        row[metric] = Math.round(Math.random() * 10000);
      }
    });

    return row;
  });

  res.json({
    data: rows,
    total: rows.length,
    executionTime: Math.round(Math.random() * 500) + 100,
    query: parsed.data,
  });
});

export { router as ebayAdvancedReportingRouter };

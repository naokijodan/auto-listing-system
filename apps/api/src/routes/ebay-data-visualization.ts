import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 166: Data Visualization Dashboard（データ可視化ダッシュボード）
// ============================================

// --- ダッシュボード ---
const dashboards = [
  {
    id: 'dash_001',
    name: 'メインダッシュボード',
    description: '売上・在庫・注文の総合ビュー',
    type: 'MAIN',
    isDefault: true,
    layout: 'GRID',
    widgets: ['widget_001', 'widget_002', 'widget_003', 'widget_004'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
    createdBy: 'admin@example.com',
    shared: true,
  },
  {
    id: 'dash_002',
    name: '売上分析',
    description: '売上トレンドと予測',
    type: 'SALES',
    isDefault: false,
    layout: 'MASONRY',
    widgets: ['widget_005', 'widget_006', 'widget_007'],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-02-14T15:00:00Z',
    createdBy: 'manager@example.com',
    shared: true,
  },
  {
    id: 'dash_003',
    name: '在庫モニター',
    description: '在庫レベルとアラート',
    type: 'INVENTORY',
    isDefault: false,
    layout: 'GRID',
    widgets: ['widget_008', 'widget_009'],
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: '2026-02-13T09:00:00Z',
    createdBy: 'inventory@example.com',
    shared: false,
  },
];

// ダッシュボード一覧取得
router.get('/dashboards', (req, res) => {
  const { type, shared } = req.query;

  let filtered = [...dashboards];

  if (type) {
    filtered = filtered.filter(d => d.type === type);
  }
  if (shared !== undefined) {
    filtered = filtered.filter(d => d.shared === (shared === 'true'));
  }

  res.json({
    dashboards: filtered,
    total: filtered.length,
  });
});

// ダッシュボード詳細取得
router.get('/dashboards/:id', (req, res) => {
  const dashboard = dashboards.find(d => d.id === req.params.id);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }
  res.json(dashboard);
});

// ダッシュボード作成
router.post('/dashboards', (req, res) => {
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.enum(['MAIN', 'SALES', 'INVENTORY', 'ORDERS', 'CUSTOMERS', 'CUSTOM']),
    layout: z.enum(['GRID', 'MASONRY', 'FREEFORM']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `dash_${Date.now()}`,
    ...parsed.data,
    description: parsed.data.description ?? '',
    layout: parsed.data.layout ?? 'GRID',
    isDefault: false,
    widgets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'current_user@example.com',
    shared: false,
  });
});

// ダッシュボード更新
router.put('/dashboards/:id', (req, res) => {
  const dashboard = dashboards.find(d => d.id === req.params.id);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }

  res.json({ ...dashboard, ...req.body, id: dashboard.id, updatedAt: new Date().toISOString() });
});

// ダッシュボード削除
router.delete('/dashboards/:id', (req, res) => {
  res.json({ success: true, message: 'Dashboard deleted' });
});

// ダッシュボード複製
router.post('/dashboards/:id/duplicate', (req, res) => {
  const dashboard = dashboards.find(d => d.id === req.params.id);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }

  res.status(201).json({
    ...dashboard,
    id: `dash_${Date.now()}`,
    name: `${dashboard.name} (コピー)`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'current_user@example.com',
  });
});

// デフォルト設定
router.post('/dashboards/:id/set-default', (req, res) => {
  const dashboard = dashboards.find(d => d.id === req.params.id);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }

  res.json({ ...dashboard, isDefault: true });
});

// --- ウィジェット ---
const widgets = [
  {
    id: 'widget_001',
    name: '売上サマリー',
    type: 'KPI',
    chartType: null,
    dataSource: 'sales',
    config: {
      metric: 'total_revenue',
      comparison: 'previous_period',
      format: 'currency',
    },
    position: { x: 0, y: 0, w: 3, h: 2 },
    refreshInterval: 300,
  },
  {
    id: 'widget_002',
    name: '売上トレンド',
    type: 'CHART',
    chartType: 'LINE',
    dataSource: 'sales',
    config: {
      metrics: ['revenue', 'orders'],
      dimension: 'date',
      period: 'last_30_days',
    },
    position: { x: 3, y: 0, w: 6, h: 4 },
    refreshInterval: 600,
  },
  {
    id: 'widget_003',
    name: 'カテゴリ別売上',
    type: 'CHART',
    chartType: 'PIE',
    dataSource: 'sales',
    config: {
      metric: 'revenue',
      dimension: 'category',
      limit: 5,
    },
    position: { x: 9, y: 0, w: 3, h: 4 },
    refreshInterval: 600,
  },
  {
    id: 'widget_004',
    name: '在庫アラート',
    type: 'TABLE',
    chartType: null,
    dataSource: 'inventory',
    config: {
      columns: ['product', 'stock', 'threshold', 'status'],
      filter: { status: 'LOW' },
      limit: 10,
    },
    position: { x: 0, y: 2, w: 6, h: 4 },
    refreshInterval: 300,
  },
  {
    id: 'widget_005',
    name: '日別売上',
    type: 'CHART',
    chartType: 'BAR',
    dataSource: 'sales',
    config: {
      metric: 'revenue',
      dimension: 'date',
      period: 'last_7_days',
    },
    position: { x: 0, y: 0, w: 6, h: 4 },
    refreshInterval: 600,
  },
  {
    id: 'widget_006',
    name: '売上予測',
    type: 'CHART',
    chartType: 'AREA',
    dataSource: 'forecast',
    config: {
      metric: 'predicted_revenue',
      period: 'next_30_days',
      showConfidence: true,
    },
    position: { x: 6, y: 0, w: 6, h: 4 },
    refreshInterval: 3600,
  },
];

// ウィジェット一覧取得
router.get('/widgets', (req, res) => {
  const { type, dashboardId } = req.query;

  let filtered = [...widgets];

  if (type) {
    filtered = filtered.filter(w => w.type === type);
  }
  if (dashboardId) {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      filtered = filtered.filter(w => dashboard.widgets.includes(w.id));
    }
  }

  res.json({
    widgets: filtered,
    total: filtered.length,
  });
});

// ウィジェット詳細取得
router.get('/widgets/:id', (req, res) => {
  const widget = widgets.find(w => w.id === req.params.id);
  if (!widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }
  res.json(widget);
});

// ウィジェット作成
router.post('/widgets', (req, res) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['KPI', 'CHART', 'TABLE', 'MAP', 'GAUGE', 'TEXT']),
    chartType: z.enum(['LINE', 'BAR', 'PIE', 'AREA', 'SCATTER', 'HEATMAP', 'FUNNEL']).optional(),
    dataSource: z.string(),
    config: z.record(z.any()),
    position: z.object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    }).optional(),
    refreshInterval: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `widget_${Date.now()}`,
    ...parsed.data,
    position: parsed.data.position ?? { x: 0, y: 0, w: 3, h: 2 },
    refreshInterval: parsed.data.refreshInterval ?? 600,
  });
});

// ウィジェット更新
router.put('/widgets/:id', (req, res) => {
  const widget = widgets.find(w => w.id === req.params.id);
  if (!widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }

  res.json({ ...widget, ...req.body, id: widget.id });
});

// ウィジェット削除
router.delete('/widgets/:id', (req, res) => {
  res.json({ success: true, message: 'Widget deleted' });
});

// ウィジェットデータ取得
router.get('/widgets/:id/data', (req, res) => {
  const widget = widgets.find(w => w.id === req.params.id);
  if (!widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }

  // サンプルデータ生成
  let data: any;

  if (widget.type === 'KPI') {
    data = {
      value: 125340.50,
      previousValue: 118230.25,
      change: 6.01,
      changeType: 'increase',
    };
  } else if (widget.type === 'CHART') {
    if (widget.chartType === 'LINE' || widget.chartType === 'BAR' || widget.chartType === 'AREA') {
      data = {
        labels: Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        }),
        datasets: [
          {
            label: '売上',
            data: [4500, 5200, 4800, 6100, 5900, 7200, 6800],
          },
        ],
      };
    } else if (widget.chartType === 'PIE') {
      data = {
        labels: ['Electronics', 'Fashion', 'Home', 'Sports', 'Other'],
        values: [35, 25, 20, 12, 8],
      };
    }
  } else if (widget.type === 'TABLE') {
    data = {
      columns: ['商品名', '在庫数', '閾値', 'ステータス'],
      rows: [
        ['商品A', 5, 10, 'LOW'],
        ['商品B', 3, 10, 'CRITICAL'],
        ['商品C', 8, 15, 'LOW'],
      ],
    };
  }

  res.json({
    widgetId: widget.id,
    data,
    generatedAt: new Date().toISOString(),
  });
});

// --- チャートテンプレート ---
const chartTemplates = [
  { id: 'tpl_line', name: '折れ線グラフ', type: 'LINE', description: 'トレンド表示に最適', thumbnail: '/charts/line.png' },
  { id: 'tpl_bar', name: '棒グラフ', type: 'BAR', description: '比較表示に最適', thumbnail: '/charts/bar.png' },
  { id: 'tpl_pie', name: '円グラフ', type: 'PIE', description: '構成比表示に最適', thumbnail: '/charts/pie.png' },
  { id: 'tpl_area', name: '面グラフ', type: 'AREA', description: '累積トレンドに最適', thumbnail: '/charts/area.png' },
  { id: 'tpl_scatter', name: '散布図', type: 'SCATTER', description: '相関分析に最適', thumbnail: '/charts/scatter.png' },
  { id: 'tpl_heatmap', name: 'ヒートマップ', type: 'HEATMAP', description: '密度表示に最適', thumbnail: '/charts/heatmap.png' },
  { id: 'tpl_funnel', name: 'ファネルチャート', type: 'FUNNEL', description: 'コンバージョン分析に最適', thumbnail: '/charts/funnel.png' },
  { id: 'tpl_gauge', name: 'ゲージ', type: 'GAUGE', description: 'KPI達成度表示に最適', thumbnail: '/charts/gauge.png' },
];

router.get('/chart-templates', (req, res) => {
  res.json({
    templates: chartTemplates,
    total: chartTemplates.length,
  });
});

// --- データソース ---
const dataSources = [
  { id: 'ds_sales', name: '売上データ', type: 'INTERNAL', tables: ['orders', 'order_items'], refreshRate: 300 },
  { id: 'ds_inventory', name: '在庫データ', type: 'INTERNAL', tables: ['products', 'inventory'], refreshRate: 300 },
  { id: 'ds_customers', name: '顧客データ', type: 'INTERNAL', tables: ['customers', 'addresses'], refreshRate: 600 },
  { id: 'ds_forecast', name: '予測データ', type: 'ML', tables: ['ml_predictions'], refreshRate: 3600 },
  { id: 'ds_external', name: '外部API', type: 'EXTERNAL', endpoint: 'https://api.example.com/data', refreshRate: 900 },
];

router.get('/data-sources', (req, res) => {
  res.json({
    dataSources,
    total: dataSources.length,
  });
});

router.get('/data-sources/:id', (req, res) => {
  const ds = dataSources.find(d => d.id === req.params.id);
  if (!ds) {
    return res.status(404).json({ error: 'Data source not found' });
  }
  res.json(ds);
});

// --- フィルター ---
router.get('/filters', (req, res) => {
  res.json({
    filters: [
      { id: 'date_range', name: '期間', type: 'DATE_RANGE', options: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'] },
      { id: 'category', name: 'カテゴリ', type: 'SELECT', options: ['Electronics', 'Fashion', 'Home', 'Sports', 'Other'] },
      { id: 'marketplace', name: 'マーケットプレイス', type: 'MULTI_SELECT', options: ['ebay_us', 'ebay_uk', 'ebay_de', 'ebay_jp'] },
      { id: 'status', name: 'ステータス', type: 'SELECT', options: ['active', 'sold', 'ended', 'draft'] },
    ],
  });
});

// --- エクスポート ---
router.post('/dashboards/:id/export', (req, res) => {
  const schema = z.object({
    format: z.enum(['PNG', 'PDF', 'XLSX']),
    includeData: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    dashboardId: req.params.id,
    format: parsed.data.format,
    downloadUrl: `https://example.com/exports/dash_${req.params.id}.${parsed.data.format.toLowerCase()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
});

// --- スナップショット ---
router.get('/dashboards/:id/snapshots', (req, res) => {
  res.json({
    snapshots: [
      { id: 'snap_001', dashboardId: req.params.id, name: '2026年2月レポート', createdAt: '2026-02-01T00:00:00Z' },
      { id: 'snap_002', dashboardId: req.params.id, name: '2026年1月レポート', createdAt: '2026-01-01T00:00:00Z' },
    ],
    total: 2,
  });
});

router.post('/dashboards/:id/snapshots', (req, res) => {
  const schema = z.object({
    name: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `snap_${Date.now()}`,
    dashboardId: req.params.id,
    name: parsed.data.name,
    createdAt: new Date().toISOString(),
  });
});

// --- リアルタイム更新 ---
router.get('/realtime/status', (req, res) => {
  res.json({
    connected: true,
    lastUpdate: new Date().toISOString(),
    activeWidgets: 5,
    updateInterval: 5000,
  });
});

// --- ダッシュボードサマリー ---
router.get('/summary', (req, res) => {
  res.json({
    dashboardCount: dashboards.length,
    widgetCount: widgets.length,
    activeUsers: 12,
    lastUpdated: new Date().toISOString(),
    popularDashboards: dashboards.slice(0, 3).map(d => ({ id: d.id, name: d.name, views: Math.floor(Math.random() * 1000) })),
    recentActivity: [
      { type: 'DASHBOARD_CREATED', user: 'admin@example.com', timestamp: '2026-02-15T10:00:00Z' },
      { type: 'WIDGET_UPDATED', user: 'manager@example.com', timestamp: '2026-02-15T09:30:00Z' },
    ],
  });
});

export { router as ebayDataVisualizationRouter };

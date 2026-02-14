import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ダッシュボードウィジェットタイプ
const WIDGET_TYPES = {
  SALES_OVERVIEW: {
    id: 'SALES_OVERVIEW',
    name: '売上概要',
    description: '売上、注文数、平均注文額の概要',
    size: 'large',
  },
  LISTING_STATUS: {
    id: 'LISTING_STATUS',
    name: '出品ステータス',
    description: 'アクティブ、下書き、エラーの分布',
    size: 'medium',
  },
  INVENTORY_ALERTS: {
    id: 'INVENTORY_ALERTS',
    name: '在庫アラート',
    description: '低在庫・欠品アラート',
    size: 'small',
  },
  TOP_SELLERS: {
    id: 'TOP_SELLERS',
    name: 'トップセラー',
    description: '売上上位商品',
    size: 'medium',
  },
  RECENT_ORDERS: {
    id: 'RECENT_ORDERS',
    name: '最近の注文',
    description: '直近の注文一覧',
    size: 'large',
  },
  PERFORMANCE_METRICS: {
    id: 'PERFORMANCE_METRICS',
    name: 'パフォーマンス指標',
    description: 'コンバージョン率、クリック率など',
    size: 'medium',
  },
  CUSTOMER_INSIGHTS: {
    id: 'CUSTOMER_INSIGHTS',
    name: '顧客インサイト',
    description: '顧客セグメント分布',
    size: 'medium',
  },
  MESSAGES_PENDING: {
    id: 'MESSAGES_PENDING',
    name: '未対応メッセージ',
    description: '返信待ちメッセージ数',
    size: 'small',
  },
  RETURNS_PENDING: {
    id: 'RETURNS_PENDING',
    name: '返品対応中',
    description: '処理待ち返品リクエスト',
    size: 'small',
  },
  FEEDBACK_SCORE: {
    id: 'FEEDBACK_SCORE',
    name: 'フィードバックスコア',
    description: '評価スコアとトレンド',
    size: 'small',
  },
  REVENUE_CHART: {
    id: 'REVENUE_CHART',
    name: '売上チャート',
    description: '日別・週別売上推移',
    size: 'large',
  },
  COMPETITOR_PRICE: {
    id: 'COMPETITOR_PRICE',
    name: '競合価格比較',
    description: '競合との価格差',
    size: 'medium',
  },
  PROMOTION_STATUS: {
    id: 'PROMOTION_STATUS',
    name: 'プロモーション状況',
    description: 'アクティブなキャンペーン',
    size: 'small',
  },
  FORECAST_SUMMARY: {
    id: 'FORECAST_SUMMARY',
    name: '売上予測',
    description: '今月・来月の売上予測',
    size: 'medium',
  },
  QUICK_ACTIONS: {
    id: 'QUICK_ACTIONS',
    name: 'クイックアクション',
    description: 'よく使う操作へのショートカット',
    size: 'medium',
  },
} as const;

// クイックアクション
const QUICK_ACTIONS = [
  { id: 'create_listing', name: '新規出品', icon: 'Plus', href: '/products' },
  { id: 'bulk_edit', name: '一括編集', icon: 'Edit3', href: '/ebay/bulk-editor' },
  { id: 'sync_prices', name: '価格同期', icon: 'RefreshCw', action: 'sync_prices' },
  { id: 'view_orders', name: '注文確認', icon: 'ShoppingCart', href: '/ebay/orders' },
  { id: 'check_messages', name: 'メッセージ', icon: 'MessageSquare', href: '/ebay/messages' },
  { id: 'run_optimization', name: 'AI最適化', icon: 'Sparkles', action: 'run_optimization' },
  { id: 'generate_report', name: 'レポート生成', icon: 'FileText', href: '/ebay/reports' },
  { id: 'view_analytics', name: '分析', icon: 'BarChart3', href: '/ebay/analytics' },
];

// ダッシュボード概要
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    // モックデータ
    const overview = {
      // 売上サマリー
      sales: {
        today: 1250.00,
        todayChange: 15.5,
        thisWeek: 8750.00,
        weekChange: 8.3,
        thisMonth: 35200.00,
        monthChange: 12.7,
        thisYear: 425000.00,
        yearChange: 22.1,
      },
      // 注文サマリー
      orders: {
        today: 12,
        pending: 8,
        shipped: 145,
        delivered: 1250,
        cancelled: 15,
      },
      // 出品サマリー
      listings: {
        total: 856,
        active: 742,
        draft: 45,
        ended: 54,
        error: 15,
        pendingPublish: 12,
      },
      // パフォーマンス
      performance: {
        conversionRate: 3.8,
        conversionChange: 0.5,
        clickThroughRate: 2.4,
        ctrChange: -0.2,
        averageOrderValue: 78.50,
        aovChange: 5.2,
        returnRate: 2.1,
        returnChange: -0.3,
      },
      // 顧客
      customers: {
        total: 3250,
        newThisMonth: 145,
        repeatRate: 35.2,
        averageLtv: 215.00,
      },
      // アラート
      alerts: {
        lowStock: 12,
        priceAlerts: 5,
        pendingMessages: 8,
        pendingReturns: 3,
        feedbackNeeded: 4,
      },
      // スコア
      scores: {
        sellerLevel: 'Top Rated',
        feedbackScore: 99.2,
        feedbackPositive: 1245,
        feedbackNeutral: 12,
        feedbackNegative: 3,
        defectRate: 0.3,
        lateShipmentRate: 1.2,
        trackingUploadRate: 98.5,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(overview);
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// ウィジェット一覧
router.get('/widgets', async (_req: Request, res: Response) => {
  try {
    const widgets = Object.values(WIDGET_TYPES);
    res.json(widgets);
  } catch (error) {
    console.error('Widgets error:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// ウィジェット設定取得
router.get('/widget-config', async (_req: Request, res: Response) => {
  try {
    // デフォルトのウィジェット配置
    const config = {
      layouts: {
        lg: [
          { i: 'SALES_OVERVIEW', x: 0, y: 0, w: 8, h: 3 },
          { i: 'QUICK_ACTIONS', x: 8, y: 0, w: 4, h: 3 },
          { i: 'LISTING_STATUS', x: 0, y: 3, w: 4, h: 3 },
          { i: 'PERFORMANCE_METRICS', x: 4, y: 3, w: 4, h: 3 },
          { i: 'FEEDBACK_SCORE', x: 8, y: 3, w: 4, h: 3 },
          { i: 'REVENUE_CHART', x: 0, y: 6, w: 8, h: 4 },
          { i: 'TOP_SELLERS', x: 8, y: 6, w: 4, h: 4 },
          { i: 'RECENT_ORDERS', x: 0, y: 10, w: 6, h: 4 },
          { i: 'INVENTORY_ALERTS', x: 6, y: 10, w: 3, h: 2 },
          { i: 'MESSAGES_PENDING', x: 9, y: 10, w: 3, h: 2 },
          { i: 'RETURNS_PENDING', x: 6, y: 12, w: 3, h: 2 },
          { i: 'PROMOTION_STATUS', x: 9, y: 12, w: 3, h: 2 },
        ],
        md: [
          { i: 'SALES_OVERVIEW', x: 0, y: 0, w: 6, h: 3 },
          { i: 'QUICK_ACTIONS', x: 6, y: 0, w: 4, h: 3 },
          { i: 'LISTING_STATUS', x: 0, y: 3, w: 5, h: 3 },
          { i: 'PERFORMANCE_METRICS', x: 5, y: 3, w: 5, h: 3 },
          { i: 'REVENUE_CHART', x: 0, y: 6, w: 10, h: 4 },
          { i: 'TOP_SELLERS', x: 0, y: 10, w: 5, h: 4 },
          { i: 'RECENT_ORDERS', x: 5, y: 10, w: 5, h: 4 },
        ],
        sm: [
          { i: 'SALES_OVERVIEW', x: 0, y: 0, w: 6, h: 3 },
          { i: 'QUICK_ACTIONS', x: 0, y: 3, w: 6, h: 3 },
          { i: 'LISTING_STATUS', x: 0, y: 6, w: 6, h: 3 },
          { i: 'REVENUE_CHART', x: 0, y: 9, w: 6, h: 4 },
        ],
      },
      enabledWidgets: [
        'SALES_OVERVIEW',
        'QUICK_ACTIONS',
        'LISTING_STATUS',
        'PERFORMANCE_METRICS',
        'FEEDBACK_SCORE',
        'REVENUE_CHART',
        'TOP_SELLERS',
        'RECENT_ORDERS',
        'INVENTORY_ALERTS',
        'MESSAGES_PENDING',
        'RETURNS_PENDING',
        'PROMOTION_STATUS',
      ],
      refreshInterval: 60000, // 1分
      theme: 'auto',
    };

    res.json(config);
  } catch (error) {
    console.error('Widget config error:', error);
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// ウィジェット設定保存
router.put('/widget-config', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      layouts: z.record(z.array(z.object({
        i: z.string(),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }))).optional(),
      enabledWidgets: z.array(z.string()).optional(),
      refreshInterval: z.number().optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
    });

    const data = schema.parse(req.body);

    // 設定を保存（実際にはDBに保存）
    res.json({
      success: true,
      message: 'Widget configuration saved',
      config: data,
    });
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// 売上チャートデータ
router.get('/sales-chart', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // 期間に応じたデータポイント生成
    const dataPoints = [];
    const now = new Date();
    let days = 7;

    if (period === '30d') days = 30;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      dataPoints.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 2000) + 500,
        orders: Math.floor(Math.random() * 20) + 5,
        profit: Math.floor(Math.random() * 800) + 200,
      });
    }

    const summary = {
      totalRevenue: dataPoints.reduce((sum, d) => sum + d.revenue, 0),
      totalOrders: dataPoints.reduce((sum, d) => sum + d.orders, 0),
      totalProfit: dataPoints.reduce((sum, d) => sum + d.profit, 0),
      averageDaily: dataPoints.reduce((sum, d) => sum + d.revenue, 0) / days,
    };

    res.json({
      period,
      dataPoints,
      summary,
    });
  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({ error: 'Failed to fetch sales chart' });
  }
});

// トップセラー
router.get('/top-sellers', async (req: Request, res: Response) => {
  try {
    const { limit = '10', period = '30d' } = req.query;

    // モックデータ
    const topSellers = Array.from({ length: Number(limit) }, (_, i) => ({
      id: `prod-${i + 1}`,
      title: `Top Selling Product ${i + 1}`,
      sku: `SKU-${1000 + i}`,
      imageUrl: `https://placehold.co/64x64/3b82f6/white?text=${i + 1}`,
      totalSales: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 5000) + 500,
      avgPrice: Math.floor(Math.random() * 100) + 20,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: (Math.random() * 20 - 10).toFixed(1),
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      period,
      topSellers,
      totalProducts: 856,
    });
  } catch (error) {
    console.error('Top sellers error:', error);
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
});

// 最近の注文
router.get('/recent-orders', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    // モックデータ
    const recentOrders = Array.from({ length: Number(limit) }, (_, i) => {
      const statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      return {
        id: `order-${Date.now() - i * 100000}`,
        orderNumber: `EB-${Math.floor(Math.random() * 900000) + 100000}`,
        buyerName: `Buyer ${i + 1}`,
        buyerCountry: ['US', 'UK', 'DE', 'JP', 'AU'][Math.floor(Math.random() * 5)],
        items: Math.floor(Math.random() * 3) + 1,
        total: (Math.random() * 200 + 20).toFixed(2),
        status,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      };
    });

    res.json({
      orders: recentOrders,
      totalPending: 8,
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// クイックアクション一覧
router.get('/quick-actions', async (_req: Request, res: Response) => {
  try {
    res.json(QUICK_ACTIONS);
  } catch (error) {
    console.error('Quick actions error:', error);
    res.status(500).json({ error: 'Failed to fetch quick actions' });
  }
});

// クイックアクション実行
router.post('/quick-actions/:actionId', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const results: Record<string, { success: boolean; message: string; data?: unknown }> = {
      sync_prices: {
        success: true,
        message: '価格同期を開始しました',
        data: { jobId: `job-${Date.now()}`, estimatedItems: 742 },
      },
      run_optimization: {
        success: true,
        message: 'AI最適化を開始しました',
        data: { jobId: `job-${Date.now()}`, targetListings: 45 },
      },
    };

    const result = results[actionId];
    if (!result) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

// KPIサマリー
router.get('/kpi-summary', async (_req: Request, res: Response) => {
  try {
    const kpis = [
      {
        id: 'revenue',
        name: '売上',
        value: 35200,
        unit: 'USD',
        change: 12.7,
        changeType: 'percent',
        trend: 'up',
        target: 40000,
        progress: 88,
      },
      {
        id: 'orders',
        name: '注文数',
        value: 456,
        unit: '件',
        change: 45,
        changeType: 'absolute',
        trend: 'up',
        target: 500,
        progress: 91.2,
      },
      {
        id: 'conversion',
        name: 'コンバージョン率',
        value: 3.8,
        unit: '%',
        change: 0.5,
        changeType: 'absolute',
        trend: 'up',
        target: 4.0,
        progress: 95,
      },
      {
        id: 'aov',
        name: '平均注文額',
        value: 78.5,
        unit: 'USD',
        change: 5.2,
        changeType: 'percent',
        trend: 'up',
        target: 80,
        progress: 98.1,
      },
      {
        id: 'feedback',
        name: 'フィードバックスコア',
        value: 99.2,
        unit: '%',
        change: 0.1,
        changeType: 'absolute',
        trend: 'stable',
        target: 99.5,
        progress: 99.7,
      },
      {
        id: 'defect_rate',
        name: '不良率',
        value: 0.3,
        unit: '%',
        change: -0.1,
        changeType: 'absolute',
        trend: 'down',
        target: 0.5,
        progress: 100,
      },
    ];

    res.json({
      kpis,
      period: 'this_month',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('KPI summary error:', error);
    res.status(500).json({ error: 'Failed to fetch KPI summary' });
  }
});

// アラートサマリー
router.get('/alerts-summary', async (_req: Request, res: Response) => {
  try {
    const alerts = [
      {
        type: 'low_stock',
        severity: 'warning',
        count: 12,
        message: '12商品が低在庫です',
        href: '/ebay/auto-restock',
      },
      {
        type: 'price_alert',
        severity: 'info',
        count: 5,
        message: '5商品で競合価格変動を検出',
        href: '/ebay/competitors',
      },
      {
        type: 'pending_messages',
        severity: 'warning',
        count: 8,
        message: '8件の未読メッセージ',
        href: '/ebay/messages',
      },
      {
        type: 'pending_returns',
        severity: 'warning',
        count: 3,
        message: '3件の返品リクエスト待ち',
        href: '/ebay/returns',
      },
      {
        type: 'listing_errors',
        severity: 'error',
        count: 15,
        message: '15件の出品エラー',
        href: '/ebay',
      },
      {
        type: 'optimization_suggestions',
        severity: 'info',
        count: 28,
        message: '28商品でAI最適化が推奨',
        href: '/ebay/optimization',
      },
    ];

    const critical = alerts.filter(a => a.severity === 'error').reduce((sum, a) => sum + a.count, 0);
    const warnings = alerts.filter(a => a.severity === 'warning').reduce((sum, a) => sum + a.count, 0);
    const info = alerts.filter(a => a.severity === 'info').reduce((sum, a) => sum + a.count, 0);

    res.json({
      alerts,
      summary: {
        critical,
        warnings,
        info,
        total: critical + warnings + info,
      },
    });
  } catch (error) {
    console.error('Alerts summary error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// 機能リンク一覧
router.get('/feature-links', async (_req: Request, res: Response) => {
  try {
    const featureLinks = [
      { id: 'listings', name: '出品管理', icon: 'Package', href: '/ebay', count: 742 },
      { id: 'templates', name: 'テンプレート', icon: 'FileStack', href: '/ebay/templates', count: 15 },
      { id: 'inventory', name: '在庫監視', icon: 'Package', href: '/ebay/inventory', count: 12 },
      { id: 'sales', name: '売上レポート', icon: 'TrendingUp', href: '/ebay/sales' },
      { id: 'messages', name: 'メッセージ', icon: 'MessageSquare', href: '/ebay/messages', count: 8 },
      { id: 'orders', name: '注文管理', icon: 'ShoppingCart', href: '/ebay/orders', count: 8 },
      { id: 'returns', name: '返品・返金', icon: 'RotateCcw', href: '/ebay/returns', count: 3 },
      { id: 'feedback', name: 'フィードバック', icon: 'Star', href: '/ebay/feedback' },
      { id: 'analytics', name: '分析', icon: 'BarChart3', href: '/ebay/analytics' },
      { id: 'bulk-editor', name: '一括編集', icon: 'Edit3', href: '/ebay/bulk-editor' },
      { id: 'competitors', name: '競合分析', icon: 'Users', href: '/ebay/competitors', count: 5 },
      { id: 'auto-pricing', name: '自動価格', icon: 'Zap', href: '/ebay/auto-pricing' },
      { id: 'scheduled', name: 'スケジュール', icon: 'CalendarClock', href: '/ebay/scheduled', count: 12 },
      { id: 'auto-restock', name: '在庫補充', icon: 'PackagePlus', href: '/ebay/auto-restock', count: 12 },
      { id: 'optimization', name: 'AI最適化', icon: 'Sparkles', href: '/ebay/optimization', count: 28 },
      { id: 'ab-tests', name: 'A/Bテスト', icon: 'Beaker', href: '/ebay/ab-tests' },
      { id: 'multilingual', name: '多言語', icon: 'Languages', href: '/ebay/multilingual' },
      { id: 'promotions', name: 'プロモーション', icon: 'Tag', href: '/ebay/promotions' },
      { id: 'reports', name: 'レポート', icon: 'FileText', href: '/ebay/reports' },
      { id: 'ads', name: '広告', icon: 'Megaphone', href: '/ebay/ads' },
      { id: 'auto-messages', name: '自動応答', icon: 'Bot', href: '/ebay/auto-messages' },
      { id: 'feedback-analysis', name: '評価分析', icon: 'TrendingUp', href: '/ebay/feedback-analysis' },
      { id: 'logistics', name: '物流', icon: 'Globe', href: '/ebay/logistics' },
      { id: 'recommendations', name: '推奨', icon: 'Sparkles', href: '/ebay/recommendations' },
      { id: 'buyer-segments', name: '顧客分析', icon: 'UserCircle', href: '/ebay/buyer-segments' },
      { id: 'sales-forecast', name: '売上予測', icon: 'LineChart', href: '/ebay/sales-forecast' },
      { id: 'inventory-optimization', name: '在庫最適化', icon: 'Warehouse', href: '/ebay/inventory-optimization' },
      { id: 'customer-lifecycle', name: '顧客ライフサイクル', icon: 'Heart', href: '/ebay/customer-lifecycle' },
    ];

    res.json(featureLinks);
  } catch (error) {
    console.error('Feature links error:', error);
    res.status(500).json({ error: 'Failed to fetch feature links' });
  }
});

// 実績サマリー（今日/今週/今月）
router.get('/performance-summary', async (_req: Request, res: Response) => {
  try {
    const summary = {
      today: {
        revenue: 1250.00,
        orders: 12,
        newListings: 5,
        messages: 15,
        returns: 1,
      },
      thisWeek: {
        revenue: 8750.00,
        orders: 89,
        newListings: 32,
        messages: 78,
        returns: 5,
      },
      thisMonth: {
        revenue: 35200.00,
        orders: 456,
        newListings: 125,
        messages: 312,
        returns: 18,
      },
      comparison: {
        revenueVsLastMonth: 12.7,
        ordersVsLastMonth: 8.3,
        listingsVsLastMonth: 15.2,
      },
    };

    res.json(summary);
  } catch (error) {
    console.error('Performance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch performance summary' });
  }
});

// ダッシュボード設定
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      refreshInterval: 60000,
      defaultPeriod: '30d',
      timezone: 'Asia/Tokyo',
      currency: 'USD',
      showNotifications: true,
      emailDigest: 'daily',
      alertThresholds: {
        lowStockThreshold: 5,
        priceChangeThreshold: 10,
        conversionAlertThreshold: 2,
      },
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ダッシュボード設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      refreshInterval: z.number().optional(),
      defaultPeriod: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      showNotifications: z.boolean().optional(),
      emailDigest: z.enum(['none', 'daily', 'weekly']).optional(),
      alertThresholds: z.object({
        lowStockThreshold: z.number().optional(),
        priceChangeThreshold: z.number().optional(),
        conversionAlertThreshold: z.number().optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

    res.json({
      success: true,
      message: 'Settings updated',
      settings: data,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as ebayDashboardRouter };

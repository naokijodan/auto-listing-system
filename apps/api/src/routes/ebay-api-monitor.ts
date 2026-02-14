import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// APIエンドポイントカテゴリ
const API_CATEGORIES = {
  TRADING: { id: 'TRADING', name: 'Trading API', description: '出品・注文管理' },
  FINDING: { id: 'FINDING', name: 'Finding API', description: '商品検索' },
  BROWSE: { id: 'BROWSE', name: 'Browse API', description: '商品閲覧' },
  INVENTORY: { id: 'INVENTORY', name: 'Inventory API', description: '在庫管理' },
  FULFILLMENT: { id: 'FULFILLMENT', name: 'Fulfillment API', description: '注文処理' },
  ANALYTICS: { id: 'ANALYTICS', name: 'Analytics API', description: '分析データ' },
  MARKETING: { id: 'MARKETING', name: 'Marketing API', description: 'プロモーション' },
  ACCOUNT: { id: 'ACCOUNT', name: 'Account API', description: 'アカウント管理' },
} as const;

// アラートレベル
const ALERT_LEVELS = {
  INFO: { id: 'INFO', name: '情報', color: 'blue' },
  WARNING: { id: 'WARNING', name: '警告', color: 'amber' },
  ERROR: { id: 'ERROR', name: 'エラー', color: 'red' },
  CRITICAL: { id: 'CRITICAL', name: 'クリティカル', color: 'red' },
} as const;

// モックAPIステータスデータ
const mockApiStatus = [
  {
    id: 'trading-add-item',
    category: 'TRADING',
    endpoint: 'AddItem',
    status: 'operational',
    latency: 245,
    successRate: 99.8,
    callsToday: 156,
    callsLimit: 5000,
    lastCall: new Date(Date.now() - 60000).toISOString(),
    lastError: null,
  },
  {
    id: 'trading-revise-item',
    category: 'TRADING',
    endpoint: 'ReviseItem',
    status: 'operational',
    latency: 189,
    successRate: 99.5,
    callsToday: 423,
    callsLimit: 5000,
    lastCall: new Date(Date.now() - 120000).toISOString(),
    lastError: null,
  },
  {
    id: 'trading-get-orders',
    category: 'TRADING',
    endpoint: 'GetOrders',
    status: 'operational',
    latency: 312,
    successRate: 100,
    callsToday: 1250,
    callsLimit: 5000,
    lastCall: new Date(Date.now() - 30000).toISOString(),
    lastError: null,
  },
  {
    id: 'inventory-update',
    category: 'INVENTORY',
    endpoint: 'updateInventory',
    status: 'degraded',
    latency: 856,
    successRate: 95.2,
    callsToday: 890,
    callsLimit: 5000,
    lastCall: new Date(Date.now() - 180000).toISOString(),
    lastError: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit temporarily exceeded',
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
  },
  {
    id: 'fulfillment-ship',
    category: 'FULFILLMENT',
    endpoint: 'createShippingFulfillment',
    status: 'operational',
    latency: 198,
    successRate: 99.9,
    callsToday: 234,
    callsLimit: 5000,
    lastCall: new Date(Date.now() - 300000).toISOString(),
    lastError: null,
  },
  {
    id: 'analytics-traffic',
    category: 'ANALYTICS',
    endpoint: 'getTrafficReport',
    status: 'operational',
    latency: 1250,
    successRate: 98.5,
    callsToday: 45,
    callsLimit: 500,
    lastCall: new Date(Date.now() - 3600000).toISOString(),
    lastError: null,
  },
];

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const operational = mockApiStatus.filter(a => a.status === 'operational').length;
    const degraded = mockApiStatus.filter(a => a.status === 'degraded').length;
    const down = mockApiStatus.filter(a => a.status === 'down').length;

    const totalCalls = mockApiStatus.reduce((sum, a) => sum + a.callsToday, 0);
    const avgLatency = Math.round(mockApiStatus.reduce((sum, a) => sum + a.latency, 0) / mockApiStatus.length);
    const avgSuccessRate = (mockApiStatus.reduce((sum, a) => sum + a.successRate, 0) / mockApiStatus.length).toFixed(1);

    const dashboard = {
      summary: {
        totalEndpoints: mockApiStatus.length,
        operational,
        degraded,
        down,
        overallHealth: down > 0 ? 'critical' : degraded > 0 ? 'warning' : 'healthy',
      },
      metrics: {
        totalCallsToday: totalCalls,
        averageLatency: avgLatency,
        averageSuccessRate: avgSuccessRate,
        peakCallsHour: 1250,
        errorCount24h: 12,
      },
      rateLimits: {
        tradingApi: { used: 2829, limit: 5000, percentage: 56.6 },
        inventoryApi: { used: 890, limit: 5000, percentage: 17.8 },
        fulfillmentApi: { used: 234, limit: 5000, percentage: 4.7 },
        analyticsApi: { used: 45, limit: 500, percentage: 9.0 },
      },
      recentErrors: [
        {
          endpoint: 'updateInventory',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit temporarily exceeded',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          count: 3,
        },
        {
          endpoint: 'AddItem',
          code: 'INVALID_CATEGORY',
          message: 'Category ID not found',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          count: 2,
        },
      ],
      uptime: {
        today: 99.95,
        week: 99.89,
        month: 99.92,
      },
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// APIステータス一覧
router.get('/status', async (_req: Request, res: Response) => {
  try {
    res.json({
      apis: mockApiStatus,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// カテゴリ別ステータス
router.get('/status/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const apis = mockApiStatus.filter(a => a.category === category.toUpperCase());

    if (apis.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      category: API_CATEGORIES[category.toUpperCase() as keyof typeof API_CATEGORIES],
      apis,
      summary: {
        total: apis.length,
        operational: apis.filter(a => a.status === 'operational').length,
        degraded: apis.filter(a => a.status === 'degraded').length,
        down: apis.filter(a => a.status === 'down').length,
      },
    });
  } catch (error) {
    console.error('Category status error:', error);
    res.status(500).json({ error: 'Failed to fetch category status' });
  }
});

// レート制限状況
router.get('/rate-limits', async (_req: Request, res: Response) => {
  try {
    const rateLimits = {
      overall: {
        used: 3998,
        limit: 20500,
        percentage: 19.5,
        resetsAt: new Date(Date.now() + 3600000).toISOString(),
      },
      byCategory: Object.entries(API_CATEGORIES).map(([key, cat]) => {
        const apis = mockApiStatus.filter(a => a.category === key);
        const used = apis.reduce((sum, a) => sum + a.callsToday, 0);
        const limit = apis.reduce((sum, a) => sum + a.callsLimit, 0);
        return {
          category: cat.id,
          name: cat.name,
          used,
          limit,
          percentage: limit > 0 ? ((used / limit) * 100).toFixed(1) : 0,
          status: (used / limit) > 0.9 ? 'critical' : (used / limit) > 0.7 ? 'warning' : 'normal',
        };
      }),
      history: Array.from({ length: 24 }, (_, i) => ({
        hour: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        calls: Math.floor(Math.random() * 500) + 100,
        limit: 1000,
      })),
    };

    res.json(rateLimits);
  } catch (error) {
    console.error('Rate limits error:', error);
    res.status(500).json({ error: 'Failed to fetch rate limits' });
  }
});

// エラーログ
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const { category, level, from, to, limit = '50' } = req.query;

    // モックエラーログ
    const errors = Array.from({ length: Number(limit) }, (_, i) => {
      const errorTypes = [
        { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded', level: 'WARNING' },
        { code: 'INVALID_TOKEN', message: 'Access token expired', level: 'ERROR' },
        { code: 'INVALID_CATEGORY', message: 'Category ID not found', level: 'WARNING' },
        { code: 'SERVICE_UNAVAILABLE', message: 'eBay service temporarily unavailable', level: 'CRITICAL' },
        { code: 'TIMEOUT', message: 'Request timeout', level: 'ERROR' },
        { code: 'VALIDATION_ERROR', message: 'Request validation failed', level: 'WARNING' },
      ];

      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const categories = Object.keys(API_CATEGORIES);
      const endpoints = ['AddItem', 'ReviseItem', 'GetOrders', 'updateInventory', 'createShippingFulfillment'];

      return {
        id: `error-${Date.now() - i * 100000}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        code: errorType.code,
        message: errorType.message,
        level: errorType.level,
        timestamp: new Date(Date.now() - i * 300000).toISOString(),
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
        details: {
          httpStatus: Math.random() > 0.5 ? 429 : 500,
          responseTime: Math.floor(Math.random() * 5000) + 100,
        },
      };
    });

    const summary = {
      total: errors.length,
      byLevel: {
        CRITICAL: errors.filter(e => e.level === 'CRITICAL').length,
        ERROR: errors.filter(e => e.level === 'ERROR').length,
        WARNING: errors.filter(e => e.level === 'WARNING').length,
      },
      byCode: errors.reduce((acc, e) => {
        acc[e.code] = (acc[e.code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({
      errors,
      summary,
      pagination: {
        limit: Number(limit),
        total: 150,
      },
    });
  } catch (error) {
    console.error('Errors error:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// レイテンシ履歴
router.get('/latency', async (req: Request, res: Response) => {
  try {
    const { period = '24h', endpoint } = req.query;

    const dataPoints = period === '24h' ? 24 : period === '7d' ? 168 : 720;

    const history = Array.from({ length: Math.min(dataPoints, 100) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      average: Math.floor(Math.random() * 500) + 100,
      p50: Math.floor(Math.random() * 300) + 80,
      p95: Math.floor(Math.random() * 800) + 200,
      p99: Math.floor(Math.random() * 1500) + 500,
    })).reverse();

    const stats = {
      current: history[history.length - 1].average,
      average: Math.round(history.reduce((sum, h) => sum + h.average, 0) / history.length),
      min: Math.min(...history.map(h => h.average)),
      max: Math.max(...history.map(h => h.average)),
      p50: Math.round(history.reduce((sum, h) => sum + h.p50, 0) / history.length),
      p95: Math.round(history.reduce((sum, h) => sum + h.p95, 0) / history.length),
      p99: Math.round(history.reduce((sum, h) => sum + h.p99, 0) / history.length),
    };

    res.json({
      period,
      endpoint: endpoint || 'all',
      history,
      stats,
    });
  } catch (error) {
    console.error('Latency error:', error);
    res.status(500).json({ error: 'Failed to fetch latency' });
  }
});

// ヘルスチェック実行
router.post('/health-check', async (req: Request, res: Response) => {
  try {
    const { endpoints } = req.body;

    // 指定されたエンドポイントをチェック
    const targetEndpoints = endpoints || mockApiStatus.map(a => a.id);

    const results = targetEndpoints.map((id: string) => {
      const api = mockApiStatus.find(a => a.id === id);
      if (!api) {
        return { id, status: 'unknown', error: 'Endpoint not found' };
      }

      return {
        id: api.id,
        endpoint: api.endpoint,
        category: api.category,
        status: api.status,
        latency: api.latency + Math.floor(Math.random() * 50) - 25,
        checkedAt: new Date().toISOString(),
      };
    });

    const healthy = results.filter((r: { status: string }) => r.status === 'operational').length;
    const total = results.length;

    res.json({
      success: true,
      message: `ヘルスチェック完了: ${healthy}/${total} 正常`,
      results,
      summary: {
        total,
        healthy,
        degraded: results.filter((r: { status: string }) => r.status === 'degraded').length,
        down: results.filter((r: { status: string }) => r.status === 'down').length,
        unknown: results.filter((r: { status: string }) => r.status === 'unknown').length,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

// アラート一覧
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const alerts = [
      {
        id: 'alert-1',
        level: 'WARNING',
        title: 'Inventory APIのレイテンシ上昇',
        message: 'updateInventoryエンドポイントのレイテンシが通常の2倍を超えています',
        endpoint: 'updateInventory',
        category: 'INVENTORY',
        metric: 'latency',
        threshold: 500,
        currentValue: 856,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        acknowledged: false,
      },
      {
        id: 'alert-2',
        level: 'INFO',
        title: 'Trading APIの使用率70%超過',
        message: 'Trading APIの日次使用量が70%を超えました',
        endpoint: null,
        category: 'TRADING',
        metric: 'rate_limit',
        threshold: 70,
        currentValue: 72.5,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: true,
      },
      {
        id: 'alert-3',
        level: 'ERROR',
        title: '認証エラーの増加',
        message: '過去1時間で5件以上の認証エラーが発生しています',
        endpoint: 'multiple',
        category: null,
        metric: 'error_rate',
        threshold: 5,
        currentValue: 8,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        acknowledged: false,
      },
    ];

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.level === 'CRITICAL').length,
        error: alerts.filter(a => a.level === 'ERROR').length,
        warning: alerts.filter(a => a.level === 'WARNING').length,
        info: alerts.filter(a => a.level === 'INFO').length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
      },
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// アラート確認
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    res.json({
      success: true,
      message: 'アラートを確認しました',
      alertId,
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// アラートルール一覧
router.get('/alert-rules', async (_req: Request, res: Response) => {
  try {
    const rules = [
      {
        id: 'rule-1',
        name: 'レイテンシアラート',
        description: '平均レイテンシが閾値を超えた場合',
        metric: 'latency',
        condition: 'greater_than',
        threshold: 500,
        duration: 5, // minutes
        level: 'WARNING',
        enabled: true,
        channels: ['email', 'slack'],
      },
      {
        id: 'rule-2',
        name: 'エラー率アラート',
        description: 'エラー率が閾値を超えた場合',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 5,
        duration: 15,
        level: 'ERROR',
        enabled: true,
        channels: ['email', 'slack', 'pagerduty'],
      },
      {
        id: 'rule-3',
        name: 'レート制限アラート',
        description: 'API使用率が閾値を超えた場合',
        metric: 'rate_limit_usage',
        condition: 'greater_than',
        threshold: 80,
        duration: 0,
        level: 'WARNING',
        enabled: true,
        channels: ['email'],
      },
      {
        id: 'rule-4',
        name: 'サービスダウンアラート',
        description: 'APIエンドポイントがダウンした場合',
        metric: 'availability',
        condition: 'equals',
        threshold: 0,
        duration: 1,
        level: 'CRITICAL',
        enabled: true,
        channels: ['email', 'slack', 'pagerduty', 'sms'],
      },
    ];

    res.json(rules);
  } catch (error) {
    console.error('Alert rules error:', error);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

// アラートルール更新
router.put('/alert-rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    const schema = z.object({
      name: z.string().optional(),
      threshold: z.number().optional(),
      duration: z.number().optional(),
      level: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
      enabled: z.boolean().optional(),
      channels: z.array(z.string()).optional(),
    });

    const data = schema.parse(req.body);

    res.json({
      success: true,
      message: 'アラートルールを更新しました',
      ruleId,
      updates: data,
    });
  } catch (error) {
    console.error('Update alert rule error:', error);
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

// API使用統計
router.get('/usage-stats', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const stats = {
      period,
      totalCalls: days * 3500,
      successfulCalls: days * 3450,
      failedCalls: days * 50,
      successRate: 98.6,
      dailyAverage: 3500,
      peakDay: {
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        calls: 5200,
      },
      byCategory: Object.entries(API_CATEGORIES).map(([key, cat]) => ({
        category: cat.id,
        name: cat.name,
        calls: Math.floor(Math.random() * days * 1000) + days * 200,
        percentage: (Math.random() * 30 + 5).toFixed(1),
      })),
      byEndpoint: mockApiStatus.map(api => ({
        endpoint: api.endpoint,
        category: api.category,
        calls: api.callsToday * days,
        avgLatency: api.latency,
        successRate: api.successRate,
      })),
      trend: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
        calls: Math.floor(Math.random() * 2000) + 2500,
        errors: Math.floor(Math.random() * 20) + 5,
      })),
    };

    res.json(stats);
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      monitoring: {
        enabled: true,
        interval: 60, // seconds
        retentionDays: 30,
      },
      alerts: {
        enabled: true,
        channels: {
          email: { enabled: true, recipients: ['admin@example.com'] },
          slack: { enabled: true, webhook: 'https://hooks.slack.com/...' },
          pagerduty: { enabled: false, serviceKey: '' },
          sms: { enabled: false, phoneNumbers: [] },
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Tokyo',
        },
      },
      thresholds: {
        latencyWarning: 500,
        latencyCritical: 2000,
        errorRateWarning: 5,
        errorRateCritical: 15,
        rateLimitWarning: 70,
        rateLimitCritical: 90,
      },
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    res.json({
      success: true,
      message: '設定を更新しました',
      settings: data,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// カテゴリ一覧
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    res.json(Object.values(API_CATEGORIES));
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export { router as ebayApiMonitorRouter };

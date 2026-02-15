import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 158: eBay Performance Monitor（パフォーマンスモニター）
// ============================================================

// メトリクスタイプ
type MetricType = 'API_RESPONSE_TIME' | 'DATABASE_QUERY_TIME' | 'QUEUE_WAIT_TIME' |
                  'MEMORY_USAGE' | 'CPU_USAGE' | 'DISK_USAGE' | 'NETWORK_IO' |
                  'ACTIVE_CONNECTIONS' | 'ERROR_RATE' | 'THROUGHPUT';

// ステータス
type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

// モックメトリクスデータ生成
function generateMetricHistory(hours: number = 24): Array<{ timestamp: string; value: number }> {
  return Array.from({ length: hours * 4 }, (_, i) => ({
    timestamp: new Date(Date.now() - (hours * 4 - i - 1) * 15 * 60 * 1000).toISOString(),
    value: Math.random() * 100 + (Math.sin(i / 10) * 20) + 50,
  }));
}

// APIエンドポイントメトリクス
const mockApiMetrics = [
  { endpoint: '/api/ebay-listings', method: 'GET', avgResponseTime: 145, p95ResponseTime: 320, p99ResponseTime: 580, requestCount: 15420, errorRate: 0.3, successRate: 99.7 },
  { endpoint: '/api/ebay-listings/publish', method: 'POST', avgResponseTime: 2340, p95ResponseTime: 4500, p99ResponseTime: 6800, requestCount: 3210, errorRate: 1.2, successRate: 98.8 },
  { endpoint: '/api/ebay-orders', method: 'GET', avgResponseTime: 89, p95ResponseTime: 180, p99ResponseTime: 340, requestCount: 8940, errorRate: 0.1, successRate: 99.9 },
  { endpoint: '/api/ebay-messages', method: 'GET', avgResponseTime: 112, p95ResponseTime: 240, p99ResponseTime: 420, requestCount: 5680, errorRate: 0.4, successRate: 99.6 },
  { endpoint: '/api/ebay-analytics', method: 'GET', avgResponseTime: 890, p95ResponseTime: 1800, p99ResponseTime: 3200, requestCount: 2340, errorRate: 0.8, successRate: 99.2 },
];

// システムメトリクス
const mockSystemMetrics = {
  cpu: { current: 42, avg1h: 38, avg24h: 35, peak: 78, history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 60 + 20 })) },
  memory: { current: 68, avg1h: 65, avg24h: 62, peak: 85, total: 16384, used: 11141, history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 30 + 55 })) },
  disk: { current: 54, total: 512000, used: 276480, readIops: 1250, writeIops: 890, history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 10 + 50 })) },
  network: { inbound: 125.4, outbound: 89.2, connections: 342, history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 100 + 50 })) },
};

// サービスヘルスチェック
const mockServiceHealth = [
  { name: 'API Server', status: 'HEALTHY' as HealthStatus, uptime: 99.98, lastCheck: new Date().toISOString(), responseTime: 12, details: { version: '2.1.0', instances: 3 } },
  { name: 'Database (PostgreSQL)', status: 'HEALTHY' as HealthStatus, uptime: 99.99, lastCheck: new Date().toISOString(), responseTime: 3, details: { connections: 45, maxConnections: 100 } },
  { name: 'Redis Cache', status: 'HEALTHY' as HealthStatus, uptime: 99.97, lastCheck: new Date().toISOString(), responseTime: 1, details: { memory: '2.1GB', keys: 125000 } },
  { name: 'BullMQ Worker', status: 'HEALTHY' as HealthStatus, uptime: 99.95, lastCheck: new Date().toISOString(), responseTime: 8, details: { activeJobs: 12, pendingJobs: 45 } },
  { name: 'eBay API', status: 'HEALTHY' as HealthStatus, uptime: 99.80, lastCheck: new Date().toISOString(), responseTime: 245, details: { rateLimit: '5000/day', used: 3420 } },
  { name: 'S3 Storage', status: 'HEALTHY' as HealthStatus, uptime: 99.99, lastCheck: new Date().toISOString(), responseTime: 35, details: { buckets: 3, totalSize: '45.2GB' } },
];

// アラート設定
const mockAlertSettings = [
  { id: 'alert_1', metric: 'API_RESPONSE_TIME', condition: 'GREATER_THAN', threshold: 5000, severity: 'CRITICAL', enabled: true, notifyChannels: ['email', 'slack'] },
  { id: 'alert_2', metric: 'ERROR_RATE', condition: 'GREATER_THAN', threshold: 5, severity: 'WARNING', enabled: true, notifyChannels: ['slack'] },
  { id: 'alert_3', metric: 'CPU_USAGE', condition: 'GREATER_THAN', threshold: 80, severity: 'WARNING', enabled: true, notifyChannels: ['email'] },
  { id: 'alert_4', metric: 'MEMORY_USAGE', condition: 'GREATER_THAN', threshold: 90, severity: 'CRITICAL', enabled: true, notifyChannels: ['email', 'slack', 'pagerduty'] },
  { id: 'alert_5', metric: 'DISK_USAGE', condition: 'GREATER_THAN', threshold: 85, severity: 'WARNING', enabled: false, notifyChannels: ['email'] },
];

// アクティブアラート
const mockActiveAlerts = [
  { id: 'incident_1', alertId: 'alert_2', metric: 'ERROR_RATE', currentValue: 5.8, threshold: 5, severity: 'WARNING', startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), acknowledged: false },
];

// ============================================================
// エンドポイント
// ============================================================

// 1. パフォーマンス概要
router.get('/overview', async (_req: Request, res: Response) => {
  const overallHealth = mockServiceHealth.every(s => s.status === 'HEALTHY') ? 'HEALTHY' :
                        mockServiceHealth.some(s => s.status === 'UNHEALTHY') ? 'UNHEALTHY' : 'DEGRADED';

  res.json({
    success: true,
    data: {
      overallHealth,
      healthyServices: mockServiceHealth.filter(s => s.status === 'HEALTHY').length,
      totalServices: mockServiceHealth.length,
      activeAlerts: mockActiveAlerts.length,
      avgResponseTime: Math.round(mockApiMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / mockApiMetrics.length),
      totalRequests24h: mockApiMetrics.reduce((sum, m) => sum + m.requestCount, 0),
      errorRate: (mockApiMetrics.reduce((sum, m) => sum + m.errorRate, 0) / mockApiMetrics.length).toFixed(2),
      cpu: { current: mockSystemMetrics.cpu.current, status: mockSystemMetrics.cpu.current > 80 ? 'WARNING' : 'OK' },
      memory: { current: mockSystemMetrics.memory.current, status: mockSystemMetrics.memory.current > 85 ? 'WARNING' : 'OK' },
      disk: { current: mockSystemMetrics.disk.current, status: mockSystemMetrics.disk.current > 80 ? 'WARNING' : 'OK' },
      uptime: '15d 8h 32m',
      lastUpdated: new Date().toISOString(),
    },
  });
});

// 2. サービスヘルス一覧
router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockServiceHealth,
  });
});

// 3. 個別サービスヘルス
router.get('/health/:service', async (req: Request, res: Response) => {
  const service = mockServiceHealth.find(s => s.name.toLowerCase().includes(req.params.service.toLowerCase()));

  if (!service) {
    return res.status(404).json({ success: false, error: 'Service not found' });
  }

  res.json({
    success: true,
    data: {
      ...service,
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.02 ? 'HEALTHY' : 'DEGRADED',
        responseTime: Math.floor(Math.random() * 50) + 5,
      })),
    },
  });
});

// 4. APIメトリクス
router.get('/api-metrics', async (req: Request, res: Response) => {
  const { sortBy = 'requestCount', order = 'desc' } = req.query;

  const sorted = [...mockApiMetrics].sort((a, b) => {
    const aVal = a[sortBy as keyof typeof a] as number;
    const bVal = b[sortBy as keyof typeof b] as number;
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });

  res.json({
    success: true,
    data: {
      metrics: sorted,
      summary: {
        totalEndpoints: mockApiMetrics.length,
        avgResponseTime: Math.round(mockApiMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / mockApiMetrics.length),
        totalRequests: mockApiMetrics.reduce((sum, m) => sum + m.requestCount, 0),
        overallSuccessRate: (mockApiMetrics.reduce((sum, m) => sum + m.successRate, 0) / mockApiMetrics.length).toFixed(2),
      },
    },
  });
});

// 5. 特定エンドポイントの詳細
router.get('/api-metrics/:endpoint', async (req: Request, res: Response) => {
  const endpoint = decodeURIComponent(req.params.endpoint);
  const metric = mockApiMetrics.find(m => m.endpoint === endpoint);

  if (!metric) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }

  res.json({
    success: true,
    data: {
      ...metric,
      responseTimeHistory: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 200 + 50 })),
      errorHistory: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 2 })),
      requestCountHistory: generateMetricHistory(24).map(h => ({ ...h, value: Math.floor(Math.random() * 1000) })),
    },
  });
});

// 6. システムメトリクス
router.get('/system-metrics', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockSystemMetrics,
  });
});

// 7. 特定メトリクスの履歴
router.get('/system-metrics/:metric', async (req: Request, res: Response) => {
  const metricName = req.params.metric.toLowerCase();
  const metric = mockSystemMetrics[metricName as keyof typeof mockSystemMetrics];

  if (!metric) {
    return res.status(404).json({ success: false, error: 'Metric not found' });
  }

  res.json({
    success: true,
    data: metric,
  });
});

// 8. キューメトリクス
router.get('/queue-metrics', async (_req: Request, res: Response) => {
  const queues = [
    { name: 'ebay-publish', waiting: 23, active: 5, completed: 15420, failed: 180, delayed: 8, paused: false },
    { name: 'ebay-sync', waiting: 12, active: 3, completed: 8940, failed: 45, delayed: 2, paused: false },
    { name: 'image-processing', waiting: 45, active: 10, completed: 32100, failed: 320, delayed: 15, paused: false },
    { name: 'notification', waiting: 5, active: 2, completed: 12340, failed: 12, delayed: 0, paused: false },
    { name: 'analytics', waiting: 120, active: 8, completed: 5680, failed: 89, delayed: 45, paused: true },
  ];

  res.json({
    success: true,
    data: {
      queues,
      summary: {
        totalWaiting: queues.reduce((sum, q) => sum + q.waiting, 0),
        totalActive: queues.reduce((sum, q) => sum + q.active, 0),
        totalCompleted: queues.reduce((sum, q) => sum + q.completed, 0),
        totalFailed: queues.reduce((sum, q) => sum + q.failed, 0),
      },
    },
  });
});

// 9. データベースメトリクス
router.get('/database-metrics', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      connections: { active: 45, idle: 23, total: 68, max: 100 },
      queries: {
        totalQueries: 125680,
        avgQueryTime: 12.5,
        slowQueries: 23,
        slowQueryThreshold: 1000,
      },
      tables: [
        { name: 'listings', rowCount: 125000, sizeBytes: 512 * 1024 * 1024, indexSize: 128 * 1024 * 1024 },
        { name: 'orders', rowCount: 45000, sizeBytes: 256 * 1024 * 1024, indexSize: 64 * 1024 * 1024 },
        { name: 'products', rowCount: 89000, sizeBytes: 380 * 1024 * 1024, indexSize: 96 * 1024 * 1024 },
      ],
      replication: { status: 'HEALTHY', lag: 0.5, lastSync: new Date().toISOString() },
    },
  });
});

// 10. キャッシュメトリクス
router.get('/cache-metrics', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      redis: {
        memoryUsed: 2.1 * 1024 * 1024 * 1024,
        memoryTotal: 8 * 1024 * 1024 * 1024,
        keys: 125000,
        hitRate: 94.5,
        missRate: 5.5,
        evictions: 1234,
        connections: 45,
        ops: { get: 45000, set: 12000, del: 3400 },
      },
      localCache: {
        size: 512,
        maxSize: 1000,
        hitRate: 89.2,
        entries: 892,
      },
    },
  });
});

// 11. 外部APIメトリクス
router.get('/external-api-metrics', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ebay: {
        status: 'HEALTHY',
        avgResponseTime: 245,
        successRate: 99.2,
        rateLimit: { limit: 5000, used: 3420, remaining: 1580, resetsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
        lastError: null,
        history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 300 + 150 })),
      },
      openai: {
        status: 'HEALTHY',
        avgResponseTime: 1250,
        successRate: 99.8,
        rateLimit: { limit: 10000, used: 2340, remaining: 7660, resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
        lastError: null,
        history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 1000 + 800 })),
      },
    },
  });
});

// 12. アラート設定一覧
router.get('/alert-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockAlertSettings,
  });
});

// 13. アラート設定作成
router.post('/alert-settings', async (req: Request, res: Response) => {
  const schema = z.object({
    metric: z.string(),
    condition: z.enum(['GREATER_THAN', 'LESS_THAN', 'EQUALS']),
    threshold: z.number(),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    enabled: z.boolean().optional(),
    notifyChannels: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newAlert = {
    id: `alert_${Date.now()}`,
    ...parsed.data,
    enabled: parsed.data.enabled ?? true,
    notifyChannels: parsed.data.notifyChannels ?? ['email'],
  };

  mockAlertSettings.push(newAlert);

  res.json({
    success: true,
    message: 'アラート設定を作成しました',
    data: newAlert,
  });
});

// 14. アラート設定更新
router.put('/alert-settings/:id', async (req: Request, res: Response) => {
  const alert = mockAlertSettings.find(a => a.id === req.params.id);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert setting not found' });
  }

  Object.assign(alert, req.body);

  res.json({
    success: true,
    message: 'アラート設定を更新しました',
    data: alert,
  });
});

// 15. アラート設定削除
router.delete('/alert-settings/:id', async (req: Request, res: Response) => {
  const index = mockAlertSettings.findIndex(a => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Alert setting not found' });
  }

  mockAlertSettings.splice(index, 1);

  res.json({
    success: true,
    message: 'アラート設定を削除しました',
  });
});

// 16. アクティブアラート一覧
router.get('/active-alerts', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockActiveAlerts,
  });
});

// 17. アラート確認（Acknowledge）
router.post('/active-alerts/:id/acknowledge', async (req: Request, res: Response) => {
  const alert = mockActiveAlerts.find(a => a.id === req.params.id);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Active alert not found' });
  }

  alert.acknowledged = true;

  res.json({
    success: true,
    message: 'アラートを確認済みにしました',
    data: alert,
  });
});

// 18. アラート解決
router.post('/active-alerts/:id/resolve', async (req: Request, res: Response) => {
  const index = mockActiveAlerts.findIndex(a => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Active alert not found' });
  }

  mockActiveAlerts.splice(index, 1);

  res.json({
    success: true,
    message: 'アラートを解決しました',
  });
});

// 19. リアルタイムメトリクス（SSE向け）
router.get('/realtime', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      cpu: Math.random() * 30 + 30,
      memory: Math.random() * 20 + 60,
      requestsPerSecond: Math.floor(Math.random() * 100) + 50,
      activeConnections: Math.floor(Math.random() * 50) + 300,
      avgResponseTime: Math.floor(Math.random() * 100) + 100,
      errorRate: Math.random() * 2,
    },
  });
});

// 20. パフォーマンスレポート生成
router.post('/generate-report', async (req: Request, res: Response) => {
  const schema = z.object({
    period: z.enum(['hour', 'day', 'week', 'month']),
    includeMetrics: z.array(z.string()).optional(),
    format: z.enum(['PDF', 'HTML', 'JSON']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: 'レポート生成を開始しました',
    data: {
      reportId: `report_${Date.now()}`,
      period: parsed.data.period,
      format: parsed.data.format || 'PDF',
      status: 'GENERATING',
      estimatedCompletionTime: new Date(Date.now() + 30 * 1000).toISOString(),
    },
  });
});

// 21. スループットメトリクス
router.get('/throughput', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      current: { requestsPerSecond: 125, bytesPerSecond: 2.5 * 1024 * 1024 },
      peak: { requestsPerSecond: 450, bytesPerSecond: 8.2 * 1024 * 1024, timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      average: { requestsPerSecond: 85, bytesPerSecond: 1.8 * 1024 * 1024 },
      history: generateMetricHistory(24).map(h => ({ ...h, requestsPerSecond: Math.floor(Math.random() * 200) + 50 })),
    },
  });
});

// 22. エラーレートの詳細
router.get('/error-analysis', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalErrors24h: 234,
      byType: {
        '4xx': 156,
        '5xx': 78,
      },
      byEndpoint: mockApiMetrics.map(m => ({
        endpoint: m.endpoint,
        errorCount: Math.floor(m.requestCount * m.errorRate / 100),
        errorRate: m.errorRate,
      })),
      topErrors: [
        { code: 404, message: 'Not Found', count: 89, percentage: 38 },
        { code: 500, message: 'Internal Server Error', count: 45, percentage: 19 },
        { code: 429, message: 'Too Many Requests', count: 34, percentage: 14.5 },
        { code: 400, message: 'Bad Request', count: 28, percentage: 12 },
        { code: 503, message: 'Service Unavailable', count: 18, percentage: 7.7 },
      ],
      history: generateMetricHistory(24).map(h => ({ ...h, value: Math.random() * 20 })),
    },
  });
});

export const ebayPerformanceMonitorRouter = router;

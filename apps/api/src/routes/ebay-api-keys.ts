import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 162: eBay API Key Management（APIキー管理）
// ============================================================

// APIキーモック
const mockApiKeys = [
  {
    id: 'key_1',
    name: 'Production API Key',
    keyPrefix: 'pk_live_',
    keyHash: '*'.repeat(32),
    environment: 'PRODUCTION',
    permissions: ['read:listings', 'write:listings', 'read:orders', 'write:orders', 'read:analytics'],
    rateLimit: { requestsPerMinute: 1000, requestsPerDay: 100000 },
    status: 'ACTIVE',
    lastUsedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    usageCount: 125680,
    createdBy: 'admin@example.com',
    expiresAt: null,
    ipRestrictions: ['192.168.1.0/24'],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key_2',
    name: 'Development API Key',
    keyPrefix: 'pk_test_',
    keyHash: '*'.repeat(32),
    environment: 'DEVELOPMENT',
    permissions: ['read:listings', 'write:listings', 'read:orders'],
    rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
    status: 'ACTIVE',
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    usageCount: 8940,
    createdBy: 'dev@example.com',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ipRestrictions: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key_3',
    name: 'Read-Only Analytics Key',
    keyPrefix: 'pk_readonly_',
    keyHash: '*'.repeat(32),
    environment: 'PRODUCTION',
    permissions: ['read:analytics', 'read:reports'],
    rateLimit: { requestsPerMinute: 500, requestsPerDay: 50000 },
    status: 'ACTIVE',
    lastUsedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    usageCount: 45230,
    createdBy: 'analyst@example.com',
    expiresAt: null,
    ipRestrictions: [],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key_4',
    name: 'Expired Test Key',
    keyPrefix: 'pk_test_',
    keyHash: '*'.repeat(32),
    environment: 'DEVELOPMENT',
    permissions: ['read:listings'],
    rateLimit: { requestsPerMinute: 50, requestsPerDay: 5000 },
    status: 'EXPIRED',
    lastUsedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 1200,
    createdBy: 'test@example.com',
    expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ipRestrictions: [],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// 使用ログモック
const mockUsageLogs = Array.from({ length: 100 }, (_, i) => ({
  id: `usage_${100 - i}`,
  keyId: mockApiKeys[Math.floor(Math.random() * mockApiKeys.length)].id,
  endpoint: ['/api/listings', '/api/orders', '/api/analytics', '/api/products'][Math.floor(Math.random() * 4)],
  method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
  statusCode: Math.random() > 0.05 ? 200 : [400, 401, 403, 500][Math.floor(Math.random() * 4)],
  responseTime: Math.floor(Math.random() * 500) + 50,
  ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
  userAgent: 'Mozilla/5.0',
  requestId: `req_${Date.now()}_${i}`,
  timestamp: new Date(Date.now() - i * 2 * 60 * 1000).toISOString(),
}));

// 権限スコープ
const permissionScopes = [
  { id: 'read:listings', name: '出品読み取り', category: 'listings' },
  { id: 'write:listings', name: '出品書き込み', category: 'listings' },
  { id: 'delete:listings', name: '出品削除', category: 'listings' },
  { id: 'read:orders', name: '注文読み取り', category: 'orders' },
  { id: 'write:orders', name: '注文書き込み', category: 'orders' },
  { id: 'read:analytics', name: '分析読み取り', category: 'analytics' },
  { id: 'read:reports', name: 'レポート読み取り', category: 'reports' },
  { id: 'read:messages', name: 'メッセージ読み取り', category: 'messages' },
  { id: 'write:messages', name: 'メッセージ送信', category: 'messages' },
  { id: 'admin:all', name: '全権限', category: 'admin' },
];

// ============================================================
// エンドポイント
// ============================================================

// 1. APIキー統計
router.get('/stats', async (_req: Request, res: Response) => {
  const activeKeys = mockApiKeys.filter(k => k.status === 'ACTIVE').length;
  const totalUsage = mockApiKeys.reduce((sum, k) => sum + k.usageCount, 0);

  res.json({
    success: true,
    data: {
      totalKeys: mockApiKeys.length,
      activeKeys,
      expiredKeys: mockApiKeys.filter(k => k.status === 'EXPIRED').length,
      revokedKeys: mockApiKeys.filter(k => k.status === 'REVOKED').length,
      totalUsage,
      usageToday: Math.floor(Math.random() * 5000) + 1000,
      avgResponseTime: Math.floor(Math.random() * 150) + 80,
      errorRate: (Math.random() * 2).toFixed(2),
      productionKeys: mockApiKeys.filter(k => k.environment === 'PRODUCTION').length,
      developmentKeys: mockApiKeys.filter(k => k.environment === 'DEVELOPMENT').length,
    },
  });
});

// 2. APIキー一覧
router.get('/keys', async (req: Request, res: Response) => {
  const { status, environment, page = '1', limit = '20' } = req.query;

  let filtered = [...mockApiKeys];

  if (status) {
    filtered = filtered.filter(k => k.status === status);
  }
  if (environment) {
    filtered = filtered.filter(k => k.environment === environment);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      keys: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 3. APIキー詳細
router.get('/keys/:id', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  res.json({ success: true, data: key });
});

// 4. APIキー作成
router.post('/keys', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    environment: z.enum(['PRODUCTION', 'DEVELOPMENT', 'STAGING']),
    permissions: z.array(z.string()).min(1),
    rateLimit: z.object({
      requestsPerMinute: z.number().min(1).max(10000),
      requestsPerDay: z.number().min(1).max(1000000),
    }).optional(),
    expiresAt: z.string().optional(),
    ipRestrictions: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const prefix = parsed.data.environment === 'PRODUCTION' ? 'pk_live_' : 'pk_test_';
  const fullKey = `${prefix}${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`;

  const newKey = {
    id: `key_${Date.now()}`,
    name: parsed.data.name,
    keyPrefix: prefix,
    keyHash: '*'.repeat(32),
    environment: parsed.data.environment,
    permissions: parsed.data.permissions,
    rateLimit: parsed.data.rateLimit || { requestsPerMinute: 100, requestsPerDay: 10000 },
    status: 'ACTIVE',
    lastUsedAt: null,
    usageCount: 0,
    createdBy: 'user@example.com',
    expiresAt: parsed.data.expiresAt || null,
    ipRestrictions: parsed.data.ipRestrictions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockApiKeys.push(newKey);

  res.json({
    success: true,
    message: 'APIキーを作成しました',
    data: {
      ...newKey,
      fullKey, // 作成時のみフルキーを返す
    },
  });
});

// 5. APIキー更新
router.put('/keys/:id', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  Object.assign(key, req.body, { updatedAt: new Date().toISOString() });

  res.json({
    success: true,
    message: 'APIキーを更新しました',
    data: key,
  });
});

// 6. APIキー削除
router.delete('/keys/:id', async (req: Request, res: Response) => {
  const index = mockApiKeys.findIndex(k => k.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  mockApiKeys.splice(index, 1);

  res.json({
    success: true,
    message: 'APIキーを削除しました',
  });
});

// 7. APIキー取り消し
router.post('/keys/:id/revoke', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  key.status = 'REVOKED';
  key.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'APIキーを取り消しました',
    data: key,
  });
});

// 8. APIキーローテーション
router.post('/keys/:id/rotate', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  const newFullKey = `${key.keyPrefix}${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`;
  key.keyHash = '*'.repeat(32);
  key.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'APIキーをローテーションしました',
    data: {
      ...key,
      newKey: newFullKey, // ローテーション時のみ新しいキーを返す
    },
  });
});

// 9. 使用ログ一覧
router.get('/usage-logs', async (req: Request, res: Response) => {
  const { keyId, status, endpoint, page = '1', limit = '50' } = req.query;

  let filtered = [...mockUsageLogs];

  if (keyId) {
    filtered = filtered.filter(l => l.keyId === keyId);
  }
  if (status) {
    const statusNum = parseInt(status as string, 10);
    filtered = filtered.filter(l => l.statusCode === statusNum);
  }
  if (endpoint) {
    filtered = filtered.filter(l => l.endpoint.includes(endpoint as string));
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      logs: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 10. キー別使用統計
router.get('/keys/:id/stats', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  res.json({
    success: true,
    data: {
      keyId: key.id,
      totalRequests: key.usageCount,
      requestsToday: Math.floor(Math.random() * 1000) + 100,
      avgResponseTime: Math.floor(Math.random() * 200) + 50,
      errorRate: (Math.random() * 3).toFixed(2),
      byEndpoint: [
        { endpoint: '/api/listings', count: Math.floor(Math.random() * 5000) },
        { endpoint: '/api/orders', count: Math.floor(Math.random() * 3000) },
        { endpoint: '/api/analytics', count: Math.floor(Math.random() * 2000) },
      ],
      byDay: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 1000) + 200,
        errors: Math.floor(Math.random() * 20),
      })),
    },
  });
});

// 11. 権限スコープ一覧
router.get('/scopes', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: permissionScopes,
  });
});

// 12. レート制限設定取得
router.get('/rate-limit-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      defaultProduction: { requestsPerMinute: 1000, requestsPerDay: 100000 },
      defaultDevelopment: { requestsPerMinute: 100, requestsPerDay: 10000 },
      maxAllowed: { requestsPerMinute: 10000, requestsPerDay: 1000000 },
    },
  });
});

// 13. レート制限設定更新
router.put('/rate-limit-settings', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'レート制限設定を更新しました',
    data: req.body,
  });
});

// 14. IP制限追加
router.post('/keys/:id/ip-restrictions', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  const { ip } = req.body;
  if (!key.ipRestrictions.includes(ip)) {
    key.ipRestrictions.push(ip);
  }

  res.json({
    success: true,
    message: 'IP制限を追加しました',
    data: { ipRestrictions: key.ipRestrictions },
  });
});

// 15. IP制限削除
router.delete('/keys/:id/ip-restrictions/:ip', async (req: Request, res: Response) => {
  const key = mockApiKeys.find(k => k.id === req.params.id);

  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  const ip = decodeURIComponent(req.params.ip);
  key.ipRestrictions = key.ipRestrictions.filter(i => i !== ip);

  res.json({
    success: true,
    message: 'IP制限を削除しました',
    data: { ipRestrictions: key.ipRestrictions },
  });
});

// 16. キーの検証
router.post('/verify', async (req: Request, res: Response) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'API key required' });
  }

  // シミュレーション
  const isValid = apiKey.startsWith('pk_');

  res.json({
    success: true,
    data: {
      valid: isValid,
      environment: apiKey.includes('live') ? 'PRODUCTION' : 'DEVELOPMENT',
      permissions: isValid ? ['read:listings', 'read:orders'] : [],
    },
  });
});

// 17. 一括操作
router.post('/keys/bulk-action', async (req: Request, res: Response) => {
  const schema = z.object({
    keyIds: z.array(z.string()),
    action: z.enum(['REVOKE', 'DELETE']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: `${parsed.data.keyIds.length}件のAPIキーに対して${parsed.data.action}を実行しました`,
    data: { affectedCount: parsed.data.keyIds.length },
  });
});

// 18. 使用状況アラート設定
router.get('/alert-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      usageThresholdPercent: 80,
      errorRateThreshold: 5,
      notifyOnExpiration: true,
      notifyDaysBeforeExpiration: 7,
      notifyChannels: ['email'],
    },
  });
});

// 19. 使用状況アラート設定更新
router.put('/alert-settings', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'アラート設定を更新しました',
    data: req.body,
  });
});

// 20. キーエクスポート
router.post('/export', async (req: Request, res: Response) => {
  const { format = 'JSON' } = req.body;

  res.json({
    success: true,
    message: `APIキー情報を${format}形式でエクスポートしました`,
    data: {
      exportId: `export_${Date.now()}`,
      format,
      keyCount: mockApiKeys.length,
    },
  });
});

export const ebayApiKeysRouter = router;

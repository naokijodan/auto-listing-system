import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ========================================
// スキーマ定義
// ========================================

const createApiKeySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  scopes: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).default(1000),
  rateLimitWindow: z.number().int().min(60).default(3600),
  expiresAt: z.string().datetime().optional(),
  ipWhitelist: z.array(z.string()).default([]),
});

const createRateLimitRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target: z.enum(['GLOBAL', 'ORGANIZATION', 'API_KEY', 'IP_ADDRESS', 'ENDPOINT', 'USER']),
  targetValue: z.string().optional(),
  limit: z.number().int().min(1),
  windowSeconds: z.number().int().min(1),
});

// ========================================
// 統計情報
// ========================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      totalRequests: 1000000,
      requestsToday: 50000,
      activeApiKeys: 25,
      averageLatency: 120,
      errorRate: 0.02,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/stats/requests', async (req: Request, res: Response) => {
  try {
    res.json({
      byDay: [
        { date: '2026-02-16', count: 50000 },
        { date: '2026-02-15', count: 48000 },
        { date: '2026-02-14', count: 52000 },
      ],
      byEndpoint: [
        { endpoint: '/api/products', count: 20000 },
        { endpoint: '/api/orders', count: 15000 },
        { endpoint: '/api/listings', count: 10000 },
      ],
      byMethod: { GET: 35000, POST: 10000, PUT: 3000, DELETE: 2000 },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request stats' });
  }
});

// ========================================
// APIキー管理
// ========================================

router.get('/keys', async (req: Request, res: Response) => {
  try {
    res.json({
      keys: [
        { id: '1', name: 'Production Key', prefix: 'rk_live_', status: 'ACTIVE', lastUsed: new Date().toISOString() },
        { id: '2', name: 'Development Key', prefix: 'rk_test_', status: 'ACTIVE', lastUsed: new Date().toISOString() },
      ],
      total: 2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/keys', async (req: Request, res: Response) => {
  try {
    const parsed = createApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid API key', details: parsed.error.issues });
    }

    const keyValue = `rk_live_${crypto.randomBytes(24).toString('hex')}`;

    res.status(201).json({
      id: `key_${Date.now()}`,
      ...parsed.data,
      key: keyValue,
      prefix: 'rk_live_',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.get('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      name: 'Production Key',
      prefix: 'rk_live_',
      permissions: ['read', 'write'],
      scopes: ['products', 'orders'],
      rateLimit: 1000,
      status: 'ACTIVE',
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API key' });
  }
});

router.put('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = createApiKeySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid update', details: parsed.error.issues });
    }

    res.json({
      id,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

router.post('/keys/:id/rotate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newKey = `rk_live_${crypto.randomBytes(24).toString('hex')}`;

    res.json({
      id,
      key: newKey,
      rotatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

router.post('/keys/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ========================================
// レート制限
// ========================================

router.get('/rate-limits', async (req: Request, res: Response) => {
  try {
    res.json({
      rules: [
        { id: '1', name: 'Global Rate Limit', target: 'GLOBAL', limit: 10000, windowSeconds: 3600 },
        { id: '2', name: 'Per-Key Limit', target: 'API_KEY', limit: 1000, windowSeconds: 3600 },
      ],
      total: 2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rate limits' });
  }
});

router.post('/rate-limits', async (req: Request, res: Response) => {
  try {
    const parsed = createRateLimitRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid rate limit rule', details: parsed.error.issues });
    }

    res.status(201).json({
      id: `rule_${Date.now()}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rate limit rule' });
  }
});

router.get('/rate-limits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      name: 'Global Rate Limit',
      target: 'GLOBAL',
      limit: 10000,
      windowSeconds: 3600,
      currentUsage: 5000,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rate limit rule' });
  }
});

router.put('/rate-limits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = createRateLimitRuleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid update', details: parsed.error.issues });
    }

    res.json({
      id,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rate limit rule' });
  }
});

router.delete('/rate-limits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rate limit rule' });
  }
});

// ========================================
// 使用量レポート
// ========================================

router.get('/reports/usage', async (req: Request, res: Response) => {
  try {
    res.json({
      period: { start: '2026-02-01', end: '2026-02-16' },
      totalRequests: 750000,
      successfulRequests: 735000,
      failedRequests: 15000,
      averageLatency: 125,
      peakRequests: 5000,
      peakTime: '2026-02-15T14:00:00Z',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch usage report' });
  }
});

router.get('/reports/errors', async (req: Request, res: Response) => {
  try {
    res.json({
      totalErrors: 15000,
      byStatusCode: { 400: 5000, 401: 3000, 404: 4000, 500: 3000 },
      topEndpoints: [
        { endpoint: '/api/orders', errors: 5000 },
        { endpoint: '/api/products', errors: 4000 },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch error report' });
  }
});

// ========================================
// 設定
// ========================================

router.get('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      defaultRateLimit: 1000,
      defaultRateLimitWindow: 3600,
      enableApiKeyExpiration: true,
      defaultKeyExpirationDays: 365,
      enableIpWhitelist: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as apiUsageRouter };

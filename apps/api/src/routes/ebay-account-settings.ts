import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 204: Account Settings（アカウント設定）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - アカウント概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    accountStatus: 'active',
    accountType: 'Business',
    sellerId: 'seller_12345',
    registeredAt: '2020-01-15',
    verificationStatus: 'verified',
    sellerLevel: 'Top Rated',
    feedbackScore: 4567,
    positiveFeedback: 99.8,
    accountHealth: 95,
    activeListings: 2345,
    pendingActions: 3,
    lastLogin: '2026-02-16 09:30:00',
  });
});

// GET /dashboard/activity - アカウントアクティビティ
router.get('/dashboard/activity', async (_req: Request, res: Response) => {
  res.json({
    recentActivity: [
      { id: '1', type: 'login', description: 'ログイン', timestamp: '2026-02-16 09:30:00', location: 'Tokyo, Japan' },
      { id: '2', type: 'listing', description: '商品出品 (10件)', timestamp: '2026-02-16 08:00:00' },
      { id: '3', type: 'settings', description: '配送設定変更', timestamp: '2026-02-15 18:00:00' },
      { id: '4', type: 'payment', description: '出金リクエスト', timestamp: '2026-02-15 14:00:00', amount: 50000 },
      { id: '5', type: 'message', description: 'バイヤーメッセージ対応', timestamp: '2026-02-15 10:00:00', count: 5 },
    ],
    loginHistory: [
      { date: '2026-02-16', count: 3, locations: ['Tokyo'] },
      { date: '2026-02-15', count: 5, locations: ['Tokyo', 'Osaka'] },
      { date: '2026-02-14', count: 2, locations: ['Tokyo'] },
    ],
  });
});

// GET /dashboard/stats - アカウント統計
router.get('/dashboard/stats', async (_req: Request, res: Response) => {
  res.json({
    thisMonth: {
      sales: 156,
      revenue: 2500000,
      newBuyers: 89,
      repeatBuyers: 67,
    },
    lastMonth: {
      sales: 142,
      revenue: 2200000,
      newBuyers: 78,
      repeatBuyers: 64,
    },
    growth: {
      salesGrowth: 9.9,
      revenueGrowth: 13.6,
      buyerGrowth: 14.1,
    },
  });
});

// --- プロフィール管理 ---

// GET /profile - プロフィール取得
router.get('/profile', async (_req: Request, res: Response) => {
  res.json({
    profile: {
      id: 'profile_1',
      businessName: 'Sample Store',
      displayName: 'SampleStore',
      email: 'seller@example.com',
      phone: '+81-90-1234-5678',
      website: 'https://samplestore.com',
      description: '高品質な商品を提供するプロフェッショナルセラーです。',
      logo: '/images/logo.png',
      banner: '/images/banner.jpg',
      address: {
        country: 'Japan',
        prefecture: 'Tokyo',
        city: 'Shibuya',
        address1: '1-2-3 Example',
        postalCode: '150-0001',
      },
      socialLinks: {
        twitter: '@samplestore',
        instagram: '@samplestore',
        facebook: 'samplestore',
      },
    },
  });
});

// PUT /profile - プロフィール更新
const updateProfileSchema = z.object({
  businessName: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
});

router.put('/profile', async (req: Request, res: Response) => {
  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  res.json({ success: true, message: 'プロフィールを更新しました' });
});

// GET /profile/verification - 認証ステータス
router.get('/profile/verification', async (_req: Request, res: Response) => {
  res.json({
    verification: {
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      addressVerified: true,
      bankVerified: true,
      businessVerified: true,
    },
    documents: [
      { id: '1', type: 'identity', name: '本人確認書類', status: 'approved', uploadedAt: '2024-01-15' },
      { id: '2', type: 'business', name: '法人登記簿', status: 'approved', uploadedAt: '2024-01-15' },
      { id: '3', type: 'address', name: '住所確認書類', status: 'approved', uploadedAt: '2024-01-15' },
    ],
  });
});

// POST /profile/upload-document - 書類アップロード
router.post('/profile/upload-document', async (_req: Request, res: Response) => {
  res.json({ success: true, documentId: 'doc_new_123', message: '書類をアップロードしました' });
});

// --- セキュリティ設定 ---

// GET /security - セキュリティ設定取得
router.get('/security', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      twoFactorEnabled: true,
      twoFactorMethod: 'authenticator',
      loginNotifications: true,
      suspiciousActivityAlerts: true,
      sessionTimeout: 30,
      trustedDevices: 3,
    },
    sessions: [
      { id: '1', device: 'MacBook Pro', browser: 'Chrome', location: 'Tokyo', lastActive: '2026-02-16 09:30:00', current: true },
      { id: '2', device: 'iPhone 14', browser: 'Safari', location: 'Tokyo', lastActive: '2026-02-15 22:00:00', current: false },
    ],
  });
});

// PUT /security - セキュリティ設定更新
const updateSecuritySchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  loginNotifications: z.boolean().optional(),
  suspiciousActivityAlerts: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
});

router.put('/security', async (req: Request, res: Response) => {
  const validation = updateSecuritySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  res.json({ success: true, message: 'セキュリティ設定を更新しました' });
});

// POST /security/change-password - パスワード変更
router.post('/security/change-password', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'パスワードを変更しました' });
});

// POST /security/enable-2fa - 2FA有効化
router.post('/security/enable-2fa', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    qrCode: 'data:image/png;base64,QR_CODE_DATA',
    secret: 'JBSWY3DPEHPK3PXP',
    backupCodes: ['123456', '234567', '345678', '456789', '567890'],
  });
});

// DELETE /security/sessions/:id - セッション削除
router.delete('/security/sessions/:id', async (req: Request, res: Response) => {
  res.json({ success: true, sessionId: req.params.id, message: 'セッションを終了しました' });
});

// --- 支払い設定 ---

// GET /payment - 支払い設定取得
router.get('/payment', async (_req: Request, res: Response) => {
  res.json({
    paymentMethods: [
      { id: '1', type: 'bank', name: '三菱UFJ銀行', accountLast4: '1234', primary: true, verified: true },
      { id: '2', type: 'paypal', name: 'PayPal', email: 'seller@example.com', primary: false, verified: true },
    ],
    payoutSchedule: 'weekly',
    minimumPayout: 10000,
    currentBalance: 125000,
    pendingBalance: 45000,
    nextPayout: {
      date: '2026-02-20',
      estimatedAmount: 125000,
    },
  });
});

// POST /payment/methods - 支払い方法追加
router.post('/payment/methods', async (_req: Request, res: Response) => {
  res.json({ success: true, methodId: 'pm_new_123', message: '支払い方法を追加しました' });
});

// DELETE /payment/methods/:id - 支払い方法削除
router.delete('/payment/methods/:id', async (req: Request, res: Response) => {
  res.json({ success: true, methodId: req.params.id, message: '支払い方法を削除しました' });
});

// PUT /payment/schedule - 出金スケジュール更新
router.put('/payment/schedule', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '出金スケジュールを更新しました' });
});

// POST /payment/request-payout - 出金リクエスト
router.post('/payment/request-payout', async (_req: Request, res: Response) => {
  res.json({ success: true, payoutId: 'payout_123', amount: 125000, estimatedArrival: '2026-02-18' });
});

// --- 通知設定 ---

// GET /notifications - 通知設定取得
router.get('/notifications', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      email: {
        orderReceived: true,
        orderShipped: true,
        paymentReceived: true,
        buyerMessage: true,
        promotions: false,
        newsletter: false,
      },
      push: {
        orderReceived: true,
        orderShipped: false,
        paymentReceived: true,
        buyerMessage: true,
      },
      sms: {
        urgentAlerts: true,
        securityAlerts: true,
      },
    },
    frequency: 'immediate',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
  });
});

// PUT /notifications - 通知設定更新
router.put('/notifications', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '通知設定を更新しました' });
});

// --- API & 連携 ---

// GET /api-keys - APIキー一覧
router.get('/api-keys', async (_req: Request, res: Response) => {
  res.json({
    apiKeys: [
      { id: '1', name: 'Production API', keyPrefix: 'rk_prod_', createdAt: '2025-01-01', lastUsed: '2026-02-16', status: 'active' },
      { id: '2', name: 'Development API', keyPrefix: 'rk_dev_', createdAt: '2025-06-01', lastUsed: '2026-02-10', status: 'active' },
    ],
    usageStats: {
      thisMonth: 15000,
      lastMonth: 12000,
      limit: 50000,
    },
  });
});

// POST /api-keys - APIキー作成
router.post('/api-keys', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    apiKey: {
      id: 'key_new_123',
      name: 'New API Key',
      key: 'rk_prod_xxxxxxxxxxxxxxxxxxxx',
      createdAt: new Date().toISOString(),
    },
    message: 'このキーは一度だけ表示されます。安全に保管してください。',
  });
});

// DELETE /api-keys/:id - APIキー削除
router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  res.json({ success: true, keyId: req.params.id, message: 'APIキーを削除しました' });
});

// GET /integrations - 連携サービス一覧
router.get('/integrations', async (_req: Request, res: Response) => {
  res.json({
    integrations: [
      { id: '1', service: 'Google Analytics', status: 'connected', connectedAt: '2025-01-15' },
      { id: '2', service: 'Slack', status: 'connected', connectedAt: '2025-03-01' },
      { id: '3', service: 'Zapier', status: 'disconnected', connectedAt: null },
      { id: '4', service: 'QuickBooks', status: 'connected', connectedAt: '2025-06-01' },
    ],
  });
});

// POST /integrations/:service/connect - サービス連携
router.post('/integrations/:service/connect', async (req: Request, res: Response) => {
  res.json({ success: true, service: req.params.service, authUrl: 'https://oauth.example.com/authorize' });
});

// DELETE /integrations/:service/disconnect - サービス連携解除
router.delete('/integrations/:service/disconnect', async (req: Request, res: Response) => {
  res.json({ success: true, service: req.params.service, message: '連携を解除しました' });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      language: 'ja',
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      measurementUnit: 'metric',
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '一般設定を更新しました' });
});

export default router;

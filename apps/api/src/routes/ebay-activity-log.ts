import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 156: eBay Activity Log（アクティビティログ）
// ============================================================

// アクティビティタイプ
type ActivityType =
  | 'LISTING_CREATED'
  | 'LISTING_PUBLISHED'
  | 'LISTING_UPDATED'
  | 'LISTING_ENDED'
  | 'LISTING_SOLD'
  | 'PRICE_CHANGED'
  | 'INVENTORY_UPDATED'
  | 'ORDER_RECEIVED'
  | 'ORDER_SHIPPED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'FEEDBACK_RECEIVED'
  | 'RETURN_REQUESTED'
  | 'REFUND_ISSUED'
  | 'API_CALL'
  | 'ERROR_OCCURRED'
  | 'BULK_OPERATION'
  | 'SETTINGS_CHANGED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT';

// 重要度
type ActivitySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

// アクティビティカテゴリ
type ActivityCategory =
  | 'LISTING'
  | 'ORDER'
  | 'MESSAGING'
  | 'INVENTORY'
  | 'PRICING'
  | 'FEEDBACK'
  | 'RETURNS'
  | 'API'
  | 'SYSTEM'
  | 'USER';

// モックデータ
const mockActivities = Array.from({ length: 200 }, (_, i) => {
  const types: ActivityType[] = [
    'LISTING_CREATED', 'LISTING_PUBLISHED', 'LISTING_UPDATED', 'LISTING_ENDED',
    'LISTING_SOLD', 'PRICE_CHANGED', 'INVENTORY_UPDATED', 'ORDER_RECEIVED',
    'ORDER_SHIPPED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'FEEDBACK_RECEIVED',
    'RETURN_REQUESTED', 'REFUND_ISSUED', 'API_CALL', 'ERROR_OCCURRED',
    'BULK_OPERATION', 'SETTINGS_CHANGED', 'USER_LOGIN', 'USER_LOGOUT'
  ];
  const type = types[Math.floor(Math.random() * types.length)];

  const categoryMap: Record<ActivityType, ActivityCategory> = {
    LISTING_CREATED: 'LISTING', LISTING_PUBLISHED: 'LISTING', LISTING_UPDATED: 'LISTING',
    LISTING_ENDED: 'LISTING', LISTING_SOLD: 'LISTING', PRICE_CHANGED: 'PRICING',
    INVENTORY_UPDATED: 'INVENTORY', ORDER_RECEIVED: 'ORDER', ORDER_SHIPPED: 'ORDER',
    MESSAGE_SENT: 'MESSAGING', MESSAGE_RECEIVED: 'MESSAGING', FEEDBACK_RECEIVED: 'FEEDBACK',
    RETURN_REQUESTED: 'RETURNS', REFUND_ISSUED: 'RETURNS', API_CALL: 'API',
    ERROR_OCCURRED: 'SYSTEM', BULK_OPERATION: 'SYSTEM', SETTINGS_CHANGED: 'SYSTEM',
    USER_LOGIN: 'USER', USER_LOGOUT: 'USER'
  };

  const severityMap: Record<ActivityType, ActivitySeverity> = {
    LISTING_CREATED: 'SUCCESS', LISTING_PUBLISHED: 'SUCCESS', LISTING_UPDATED: 'INFO',
    LISTING_ENDED: 'WARNING', LISTING_SOLD: 'SUCCESS', PRICE_CHANGED: 'INFO',
    INVENTORY_UPDATED: 'INFO', ORDER_RECEIVED: 'SUCCESS', ORDER_SHIPPED: 'SUCCESS',
    MESSAGE_SENT: 'INFO', MESSAGE_RECEIVED: 'INFO', FEEDBACK_RECEIVED: 'INFO',
    RETURN_REQUESTED: 'WARNING', REFUND_ISSUED: 'WARNING', API_CALL: 'INFO',
    ERROR_OCCURRED: 'ERROR', BULK_OPERATION: 'INFO', SETTINGS_CHANGED: 'INFO',
    USER_LOGIN: 'INFO', USER_LOGOUT: 'INFO'
  };

  const descriptions: Record<ActivityType, string[]> = {
    LISTING_CREATED: ['出品「Vintage Watch」を作成しました', '出品「Camera Lens」を下書きとして保存しました'],
    LISTING_PUBLISHED: ['出品「Vintage Watch」をeBayに公開しました', '出品「Camera Lens」を公開しました'],
    LISTING_UPDATED: ['出品「Vintage Watch」のタイトルを更新しました', '出品「Camera Lens」の説明を変更しました'],
    LISTING_ENDED: ['出品「Vintage Watch」を終了しました', '有効期限切れで出品が終了しました'],
    LISTING_SOLD: ['出品「Vintage Watch」が$299.99で売却されました', '出品「Camera Lens」が落札されました'],
    PRICE_CHANGED: ['出品価格を$199.99から$179.99に変更しました', '自動価格調整により価格が更新されました'],
    INVENTORY_UPDATED: ['在庫数を5から3に更新しました', '低在庫アラートがトリガーされました'],
    ORDER_RECEIVED: ['新しい注文#12345を受信しました', 'バイヤーから注文が確定しました'],
    ORDER_SHIPPED: ['注文#12345を発送しました', '追跡番号を更新しました'],
    MESSAGE_SENT: ['バイヤーに発送通知を送信しました', 'カスタマーサポートメッセージを送信しました'],
    MESSAGE_RECEIVED: ['バイヤーから問い合わせを受信しました', '商品に関する質問を受け取りました'],
    FEEDBACK_RECEIVED: ['ポジティブフィードバックを受け取りました', 'バイヤーから5つ星評価を獲得しました'],
    RETURN_REQUESTED: ['注文#12345の返品リクエストを受け取りました', '商品不良による返品申請がありました'],
    REFUND_ISSUED: ['$99.99の返金を処理しました', '部分返金を実行しました'],
    API_CALL: ['eBay Trading APIを呼び出しました', 'GetMyeBaySelling APIリクエストを実行'],
    ERROR_OCCURRED: ['API呼び出しがタイムアウトしました', 'データベース接続エラーが発生しました'],
    BULK_OPERATION: ['50件の出品を一括更新しました', '価格一括変更ジョブが完了しました'],
    SETTINGS_CHANGED: ['配送設定を更新しました', '自動価格調整ルールを変更しました'],
    USER_LOGIN: ['ユーザーがログインしました', 'セッションを開始しました'],
    USER_LOGOUT: ['ユーザーがログアウトしました', 'セッションを終了しました']
  };

  const descriptionList = descriptions[type];
  const description = descriptionList[Math.floor(Math.random() * descriptionList.length)];

  return {
    id: `activity_${200 - i}`,
    type,
    category: categoryMap[type],
    severity: severityMap[type],
    description,
    entityType: type.includes('LISTING') ? 'LISTING' : type.includes('ORDER') ? 'ORDER' : 'SYSTEM',
    entityId: type.includes('LISTING') ? `listing_${Math.floor(Math.random() * 1000)}` :
              type.includes('ORDER') ? `order_${Math.floor(Math.random() * 1000)}` : null,
    userId: 'user_1',
    userName: 'System',
    ipAddress: Math.random() > 0.5 ? '192.168.1.' + Math.floor(Math.random() * 255) : null,
    userAgent: Math.random() > 0.7 ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' : null,
    metadata: {
      ...(type === 'PRICE_CHANGED' && { oldPrice: 199.99, newPrice: 179.99, changePercent: -10 }),
      ...(type === 'LISTING_SOLD' && { soldPrice: 299.99, buyerId: 'buyer_123' }),
      ...(type === 'API_CALL' && { endpoint: '/trading/GetMyeBaySelling', duration: 234 }),
      ...(type === 'BULK_OPERATION' && { operationType: 'PRICE_UPDATE', affectedCount: 50 }),
    },
    timestamp: new Date(Date.now() - i * 15 * 60 * 1000).toISOString(), // 15分間隔
    isRead: Math.random() > 0.3,
  };
});

// 監査トレイルモック
const mockAuditTrails = Array.from({ length: 50 }, (_, i) => ({
  id: `audit_${50 - i}`,
  action: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'][Math.floor(Math.random() * 5)],
  resourceType: ['LISTING', 'ORDER', 'USER', 'SETTINGS', 'REPORT'][Math.floor(Math.random() * 5)],
  resourceId: `resource_${Math.floor(Math.random() * 1000)}`,
  userId: 'user_1',
  userName: 'admin@example.com',
  changes: {
    before: { status: 'DRAFT', price: 199.99 },
    after: { status: 'ACTIVE', price: 179.99 },
  },
  ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  success: Math.random() > 0.1,
  errorMessage: Math.random() > 0.9 ? 'Permission denied' : null,
}));

// セッションログモック
const mockSessionLogs = Array.from({ length: 30 }, (_, i) => ({
  id: `session_${30 - i}`,
  userId: 'user_1',
  userName: 'admin@example.com',
  loginTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  logoutTime: Math.random() > 0.2
    ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + Math.random() * 8 * 60 * 60 * 1000).toISOString()
    : null,
  ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  location: ['Tokyo, Japan', 'Osaka, Japan', 'New York, US'][Math.floor(Math.random() * 3)],
  deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
  activityCount: Math.floor(Math.random() * 100),
  isActive: i === 0 && Math.random() > 0.5,
}));

// エラーログモック
const mockErrorLogs = Array.from({ length: 40 }, (_, i) => ({
  id: `error_${40 - i}`,
  errorType: ['API_ERROR', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'TIMEOUT_ERROR', 'AUTHENTICATION_ERROR'][Math.floor(Math.random() * 5)],
  errorCode: ['E001', 'E002', 'E003', 'E004', 'E005'][Math.floor(Math.random() * 5)],
  message: [
    'eBay API rate limit exceeded',
    'Database connection timeout',
    'Invalid listing data format',
    'Request timeout after 30 seconds',
    'Invalid authentication token'
  ][Math.floor(Math.random() * 5)],
  stackTrace: 'Error: Something went wrong\n  at processListing (listing.js:42)\n  at async handler (api.js:128)',
  context: {
    endpoint: '/api/ebay-listings/publish',
    method: 'POST',
    listingId: `listing_${Math.floor(Math.random() * 1000)}`,
  },
  severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)] as string,
  isResolved: Math.random() > 0.4,
  resolvedAt: Math.random() > 0.6
    ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    : null,
  resolvedBy: Math.random() > 0.6 ? 'admin@example.com' : null,
  timestamp: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
}));

// ============================================================
// エンドポイント
// ============================================================

// 1. アクティビティ統計
router.get('/stats', async (_req: Request, res: Response) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayActivities = mockActivities.filter(a => new Date(a.timestamp) >= today);
  const weekActivities = mockActivities.filter(a => new Date(a.timestamp) >= thisWeek);

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};

  mockActivities.forEach(a => {
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    byType[a.type] = (byType[a.type] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      totalActivities: mockActivities.length,
      todayCount: todayActivities.length,
      weekCount: weekActivities.length,
      unreadCount: mockActivities.filter(a => !a.isRead).length,
      errorCount: mockActivities.filter(a => a.severity === 'ERROR').length,
      byCategory,
      bySeverity,
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      recentErrors: mockErrorLogs.slice(0, 5),
      activeSessions: mockSessionLogs.filter(s => s.isActive).length,
    },
  });
});

// 2. アクティビティ一覧
router.get('/activities', async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '50',
    category,
    severity,
    type,
    search,
    startDate,
    endDate,
    unreadOnly,
  } = req.query;

  let filtered = [...mockActivities];

  if (category) {
    filtered = filtered.filter(a => a.category === category);
  }
  if (severity) {
    filtered = filtered.filter(a => a.severity === severity);
  }
  if (type) {
    filtered = filtered.filter(a => a.type === type);
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filtered = filtered.filter(a =>
      a.description.toLowerCase().includes(searchLower) ||
      a.type.toLowerCase().includes(searchLower)
    );
  }
  if (startDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(endDate as string));
  }
  if (unreadOnly === 'true') {
    filtered = filtered.filter(a => !a.isRead);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      activities: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 3. アクティビティ詳細
router.get('/activities/:id', async (req: Request, res: Response) => {
  const activity = mockActivities.find(a => a.id === req.params.id);

  if (!activity) {
    return res.status(404).json({ success: false, error: 'Activity not found' });
  }

  res.json({ success: true, data: activity });
});

// 4. アクティビティを既読にする
router.post('/activities/:id/read', async (req: Request, res: Response) => {
  const activity = mockActivities.find(a => a.id === req.params.id);

  if (!activity) {
    return res.status(404).json({ success: false, error: 'Activity not found' });
  }

  activity.isRead = true;

  res.json({ success: true, data: activity });
});

// 5. 全て既読にする
router.post('/activities/mark-all-read', async (_req: Request, res: Response) => {
  const unreadCount = mockActivities.filter(a => !a.isRead).length;
  mockActivities.forEach(a => { a.isRead = true; });

  res.json({
    success: true,
    message: `${unreadCount}件のアクティビティを既読にしました`,
    data: { markedCount: unreadCount },
  });
});

// 6. 監査トレイル一覧
router.get('/audit-trails', async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    action,
    resourceType,
    userId,
    startDate,
    endDate,
    successOnly,
  } = req.query;

  let filtered = [...mockAuditTrails];

  if (action) {
    filtered = filtered.filter(a => a.action === action);
  }
  if (resourceType) {
    filtered = filtered.filter(a => a.resourceType === resourceType);
  }
  if (userId) {
    filtered = filtered.filter(a => a.userId === userId);
  }
  if (startDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(endDate as string));
  }
  if (successOnly === 'true') {
    filtered = filtered.filter(a => a.success);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      auditTrails: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 7. 監査トレイル詳細
router.get('/audit-trails/:id', async (req: Request, res: Response) => {
  const audit = mockAuditTrails.find(a => a.id === req.params.id);

  if (!audit) {
    return res.status(404).json({ success: false, error: 'Audit trail not found' });
  }

  res.json({ success: true, data: audit });
});

// 8. セッションログ一覧
router.get('/sessions', async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    userId,
    activeOnly,
    startDate,
    endDate,
  } = req.query;

  let filtered = [...mockSessionLogs];

  if (userId) {
    filtered = filtered.filter(s => s.userId === userId);
  }
  if (activeOnly === 'true') {
    filtered = filtered.filter(s => s.isActive);
  }
  if (startDate) {
    filtered = filtered.filter(s => new Date(s.loginTime) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(s => new Date(s.loginTime) <= new Date(endDate as string));
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      sessions: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 9. セッション詳細
router.get('/sessions/:id', async (req: Request, res: Response) => {
  const session = mockSessionLogs.find(s => s.id === req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({ success: true, data: session });
});

// 10. セッションを終了（強制ログアウト）
router.post('/sessions/:id/terminate', async (req: Request, res: Response) => {
  const session = mockSessionLogs.find(s => s.id === req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  session.isActive = false;
  session.logoutTime = new Date().toISOString();

  res.json({
    success: true,
    message: 'Session terminated',
    data: session,
  });
});

// 11. エラーログ一覧
router.get('/errors', async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    errorType,
    severity,
    unresolvedOnly,
    startDate,
    endDate,
  } = req.query;

  let filtered = [...mockErrorLogs];

  if (errorType) {
    filtered = filtered.filter(e => e.errorType === errorType);
  }
  if (severity) {
    filtered = filtered.filter(e => e.severity === severity);
  }
  if (unresolvedOnly === 'true') {
    filtered = filtered.filter(e => !e.isResolved);
  }
  if (startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate as string));
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      errors: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 12. エラーログ詳細
router.get('/errors/:id', async (req: Request, res: Response) => {
  const error = mockErrorLogs.find(e => e.id === req.params.id);

  if (!error) {
    return res.status(404).json({ success: false, error: 'Error log not found' });
  }

  res.json({ success: true, data: error });
});

// 13. エラーを解決済みにする
router.post('/errors/:id/resolve', async (req: Request, res: Response) => {
  const error = mockErrorLogs.find(e => e.id === req.params.id);

  if (!error) {
    return res.status(404).json({ success: false, error: 'Error log not found' });
  }

  error.isResolved = true;
  error.resolvedAt = new Date().toISOString();
  error.resolvedBy = 'admin@example.com';

  res.json({
    success: true,
    message: 'Error marked as resolved',
    data: error,
  });
});

// 14. タイムライン取得
router.get('/timeline', async (req: Request, res: Response) => {
  const { entityType, entityId, limit = '50' } = req.query;

  let filtered = [...mockActivities];

  if (entityType) {
    filtered = filtered.filter(a => a.entityType === entityType);
  }
  if (entityId) {
    filtered = filtered.filter(a => a.entityId === entityId);
  }

  const timeline = filtered.slice(0, parseInt(limit as string, 10));

  res.json({
    success: true,
    data: {
      timeline,
      entityType,
      entityId,
    },
  });
});

// 15. アクティビティサマリー
router.get('/summary', async (req: Request, res: Response) => {
  const { period = 'day' } = req.query;

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const periodActivities = mockActivities.filter(a => new Date(a.timestamp) >= startDate);

  const summary = {
    period,
    totalActivities: periodActivities.length,
    byHour: Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - (23 - hour), 0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      return {
        hour: hourStart.getHours(),
        count: periodActivities.filter(a => {
          const ts = new Date(a.timestamp);
          return ts >= hourStart && ts < hourEnd;
        }).length,
      };
    }),
    topTypes: Object.entries(
      periodActivities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count })),
    errorRate: (periodActivities.filter(a => a.severity === 'ERROR').length / Math.max(periodActivities.length, 1) * 100).toFixed(2),
  };

  res.json({ success: true, data: summary });
});

// 16. エクスポート
router.post('/export', async (req: Request, res: Response) => {
  const exportSchema = z.object({
    format: z.enum(['CSV', 'JSON', 'EXCEL']),
    dataType: z.enum(['activities', 'audit', 'sessions', 'errors']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    filters: z.record(z.string()).optional(),
  });

  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const { format, dataType } = parsed.data;

  res.json({
    success: true,
    message: `${dataType}データを${format}形式でエクスポートしています`,
    data: {
      exportId: `export_${Date.now()}`,
      status: 'PROCESSING',
      estimatedRecords: dataType === 'activities' ? mockActivities.length :
                        dataType === 'audit' ? mockAuditTrails.length :
                        dataType === 'sessions' ? mockSessionLogs.length :
                        mockErrorLogs.length,
    },
  });
});

// 17. リテンション設定取得
router.get('/retention-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      activities: { retentionDays: 90, autoDelete: true },
      auditTrails: { retentionDays: 365, autoDelete: false },
      sessions: { retentionDays: 30, autoDelete: true },
      errors: { retentionDays: 180, autoDelete: true },
    },
  });
});

// 18. リテンション設定更新
router.put('/retention-settings', async (req: Request, res: Response) => {
  const schema = z.object({
    activities: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }).optional(),
    auditTrails: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }).optional(),
    sessions: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }).optional(),
    errors: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: 'リテンション設定を更新しました',
    data: parsed.data,
  });
});

// 19. アラート設定取得
router.get('/alert-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      errorThreshold: 10,
      errorTimeWindowMinutes: 60,
      notifyOnCriticalError: true,
      notifyOnSessionAnomaly: true,
      notifyChannels: ['email', 'slack'],
      enabled: true,
    },
  });
});

// 20. アラート設定更新
router.put('/alert-settings', async (req: Request, res: Response) => {
  const schema = z.object({
    errorThreshold: z.number().optional(),
    errorTimeWindowMinutes: z.number().optional(),
    notifyOnCriticalError: z.boolean().optional(),
    notifyOnSessionAnomaly: z.boolean().optional(),
    notifyChannels: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: 'アラート設定を更新しました',
    data: parsed.data,
  });
});

// 21. データクリーンアップ
router.post('/cleanup', async (req: Request, res: Response) => {
  const schema = z.object({
    dataType: z.enum(['activities', 'audit', 'sessions', 'errors']),
    olderThanDays: z.number().min(1),
    dryRun: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const { dataType, olderThanDays, dryRun } = parsed.data;
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  let affectedCount = 0;
  if (dataType === 'activities') {
    affectedCount = mockActivities.filter(a => new Date(a.timestamp) < cutoffDate).length;
  } else if (dataType === 'audit') {
    affectedCount = mockAuditTrails.filter(a => new Date(a.timestamp) < cutoffDate).length;
  } else if (dataType === 'sessions') {
    affectedCount = mockSessionLogs.filter(s => new Date(s.loginTime) < cutoffDate).length;
  } else {
    affectedCount = mockErrorLogs.filter(e => new Date(e.timestamp) < cutoffDate).length;
  }

  res.json({
    success: true,
    message: dryRun
      ? `${affectedCount}件のレコードが削除対象です（ドライラン）`
      : `${affectedCount}件のレコードを削除しました`,
    data: {
      dataType,
      olderThanDays,
      affectedCount,
      dryRun: dryRun ?? false,
    },
  });
});

// 22. リアルタイムフィード（ロングポーリング）
router.get('/realtime-feed', async (req: Request, res: Response) => {
  const { since } = req.query;

  let newActivities = mockActivities.slice(0, 5);

  if (since) {
    newActivities = mockActivities.filter(a => new Date(a.timestamp) > new Date(since as string)).slice(0, 10);
  }

  res.json({
    success: true,
    data: {
      activities: newActivities,
      lastTimestamp: newActivities.length > 0 ? newActivities[0].timestamp : null,
    },
  });
});

export const ebayActivityLogRouter = router;

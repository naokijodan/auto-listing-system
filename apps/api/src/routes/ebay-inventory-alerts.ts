import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

// アラートタイプ
const ALERT_TYPES = {
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  OVERSTOCK: 'OVERSTOCK',
  SLOW_MOVING: 'SLOW_MOVING',
  EXPIRING: 'EXPIRING',
  PRICE_DROP: 'PRICE_DROP',
  REORDER_POINT: 'REORDER_POINT',
  SYNC_ERROR: 'SYNC_ERROR',
} as const;

// アラート重要度
const SEVERITIES = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  URGENT: 'URGENT',
} as const;

// アラートステータス
const ALERT_STATUSES = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  SNOOZED: 'SNOOZED',
  DISMISSED: 'DISMISSED',
} as const;

// 通知チャネル
const NOTIFICATION_CHANNELS = {
  EMAIL: 'EMAIL',
  SLACK: 'SLACK',
  SMS: 'SMS',
  PUSH: 'PUSH',
  WEBHOOK: 'WEBHOOK',
} as const;

// ============================================
// モックデータ
// ============================================

// アラート
const mockAlerts: Record<string, any> = {
  'alert-1': {
    id: 'alert-1',
    type: 'LOW_STOCK',
    severity: 'WARNING',
    status: 'ACTIVE',
    itemId: 'item-seiko-001',
    itemTitle: 'Vintage Seiko 5 Automatic Watch 1970s',
    sku: 'SEIKO-5-1970',
    currentStock: 2,
    threshold: 5,
    message: '在庫が残り2点です。補充をご検討ください。',
    recommendation: '過去30日の販売ペース（15点/月）から、3日以内に在庫切れの可能性があります。',
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-15T08:00:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
    snoozedUntil: null,
  },
  'alert-2': {
    id: 'alert-2',
    type: 'OUT_OF_STOCK',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    itemId: 'item-camera-001',
    itemTitle: 'Canon EOS R5 Camera Body',
    sku: 'CANON-R5-BODY',
    currentStock: 0,
    threshold: 3,
    message: '在庫切れです。出品が自動停止されました。',
    recommendation: '早急な補充が必要です。仕入れ先への発注をご検討ください。',
    createdAt: '2026-02-15T06:00:00Z',
    updatedAt: '2026-02-15T06:00:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
    snoozedUntil: null,
  },
  'alert-3': {
    id: 'alert-3',
    type: 'OVERSTOCK',
    severity: 'INFO',
    status: 'ACTIVE',
    itemId: 'item-lens-002',
    itemTitle: 'Canon EF 50mm f/1.8 STM Lens',
    sku: 'CANON-50-18',
    currentStock: 45,
    threshold: 20,
    message: '在庫が過剰です（45点）。保管コストにご注意ください。',
    recommendation: 'プロモーションや価格調整で販売促進をご検討ください。',
    createdAt: '2026-02-14T12:00:00Z',
    updatedAt: '2026-02-14T12:00:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
    snoozedUntil: null,
  },
  'alert-4': {
    id: 'alert-4',
    type: 'SLOW_MOVING',
    severity: 'WARNING',
    status: 'ACKNOWLEDGED',
    itemId: 'item-watch-003',
    itemTitle: 'Citizen Eco-Drive AW1361-10H',
    sku: 'CITIZEN-ECO-01',
    currentStock: 12,
    threshold: null,
    message: '30日間販売なし。滞留在庫の可能性があります。',
    recommendation: '価格見直しまたは他チャネルでの販売をご検討ください。',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
    acknowledgedAt: '2026-02-15T09:00:00Z',
    resolvedAt: null,
    snoozedUntil: null,
  },
  'alert-5': {
    id: 'alert-5',
    type: 'REORDER_POINT',
    severity: 'WARNING',
    status: 'ACTIVE',
    itemId: 'item-seiko-002',
    itemTitle: 'Seiko Presage SRPB41J1',
    sku: 'SEIKO-PRESAGE-01',
    currentStock: 3,
    threshold: 5,
    reorderQuantity: 10,
    message: '再発注点に達しました。発注をご検討ください。',
    recommendation: '推奨発注数: 10点（リードタイム: 7日）',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
    snoozedUntil: null,
  },
  'alert-6': {
    id: 'alert-6',
    type: 'SYNC_ERROR',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    itemId: 'item-watch-004',
    itemTitle: 'Omega Seamaster Diver 300M',
    sku: 'OMEGA-SM-300',
    currentStock: null,
    threshold: null,
    message: 'eBayとの在庫同期に失敗しました。',
    recommendation: '手動で在庫を確認し、再同期してください。',
    errorCode: 'SYNC_TIMEOUT',
    errorDetails: 'eBay API response timeout after 30s',
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-02-15T11:00:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
    snoozedUntil: null,
  },
};

// アラートルール
const mockRules: Record<string, any> = {
  'rule-1': {
    id: 'rule-1',
    name: '低在庫アラート（デフォルト）',
    type: 'LOW_STOCK',
    isActive: true,
    conditions: {
      threshold: 5,
      applyToAll: true,
      excludeCategories: [],
    },
    actions: {
      severity: 'WARNING',
      notifications: ['EMAIL', 'SLACK'],
      autoReorder: false,
    },
    triggeredCount: 156,
    lastTriggered: '2026-02-15T08:00:00Z',
  },
  'rule-2': {
    id: 'rule-2',
    name: '在庫切れアラート',
    type: 'OUT_OF_STOCK',
    isActive: true,
    conditions: {
      threshold: 0,
      applyToAll: true,
      excludeCategories: [],
    },
    actions: {
      severity: 'CRITICAL',
      notifications: ['EMAIL', 'SLACK', 'SMS'],
      autoEndListing: true,
    },
    triggeredCount: 45,
    lastTriggered: '2026-02-15T06:00:00Z',
  },
  'rule-3': {
    id: 'rule-3',
    name: '過剰在庫アラート',
    type: 'OVERSTOCK',
    isActive: true,
    conditions: {
      threshold: 30,
      daysWithoutSale: 14,
      applyToAll: false,
      categories: ['Watches', 'Cameras'],
    },
    actions: {
      severity: 'INFO',
      notifications: ['EMAIL'],
      suggestPromotion: true,
    },
    triggeredCount: 23,
    lastTriggered: '2026-02-14T12:00:00Z',
  },
  'rule-4': {
    id: 'rule-4',
    name: '滞留在庫アラート',
    type: 'SLOW_MOVING',
    isActive: true,
    conditions: {
      daysWithoutSale: 30,
      minStock: 5,
      applyToAll: true,
    },
    actions: {
      severity: 'WARNING',
      notifications: ['EMAIL'],
      suggestPriceReduction: true,
    },
    triggeredCount: 67,
    lastTriggered: '2026-02-10T00:00:00Z',
  },
  'rule-5': {
    id: 'rule-5',
    name: '再発注ポイント',
    type: 'REORDER_POINT',
    isActive: true,
    conditions: {
      useAutoCalculation: true,
      safetyStockDays: 7,
      leadTimeDays: 7,
    },
    actions: {
      severity: 'WARNING',
      notifications: ['EMAIL', 'SLACK'],
      autoCreatePO: false,
    },
    triggeredCount: 89,
    lastTriggered: '2026-02-15T10:00:00Z',
  },
};

// 通知設定
const mockNotificationSettings = {
  channels: {
    EMAIL: {
      enabled: true,
      recipients: ['seller@example.com', 'inventory@example.com'],
      frequency: 'IMMEDIATE',
    },
    SLACK: {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      channel: '#inventory-alerts',
      frequency: 'IMMEDIATE',
    },
    SMS: {
      enabled: true,
      phoneNumbers: ['+81901234567'],
      frequency: 'CRITICAL_ONLY',
    },
    PUSH: {
      enabled: false,
    },
    WEBHOOK: {
      enabled: false,
    },
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'Asia/Tokyo',
    exceptCritical: true,
  },
  digestSettings: {
    enabled: true,
    frequency: 'DAILY',
    time: '09:00',
    includeResolved: false,
  },
};

// 統計
const mockStats = {
  summary: {
    total: 45,
    active: 23,
    acknowledged: 12,
    resolved: 8,
    snoozed: 2,
  },
  byType: {
    LOW_STOCK: 15,
    OUT_OF_STOCK: 5,
    OVERSTOCK: 8,
    SLOW_MOVING: 12,
    REORDER_POINT: 3,
    SYNC_ERROR: 2,
  },
  bySeverity: {
    INFO: 10,
    WARNING: 25,
    CRITICAL: 8,
    URGENT: 2,
  },
  trends: {
    last7Days: [12, 15, 8, 23, 18, 20, 23],
    averageResolutionTime: 4.5, // hours
    autoResolvedPercent: 35,
  },
  topAffectedItems: [
    { itemId: 'item-seiko-001', title: 'Vintage Seiko 5', alertCount: 5 },
    { itemId: 'item-camera-001', title: 'Canon EOS R5', alertCount: 4 },
    { itemId: 'item-lens-002', title: 'Canon EF 50mm', alertCount: 3 },
  ],
};

// ============================================
// バリデーションスキーマ
// ============================================

const createRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'SLOW_MOVING', 'EXPIRING', 'PRICE_DROP', 'REORDER_POINT', 'SYNC_ERROR']),
  conditions: z.object({
    threshold: z.number().optional(),
    daysWithoutSale: z.number().optional(),
    minStock: z.number().optional(),
    applyToAll: z.boolean().optional(),
    categories: z.array(z.string()).optional(),
    excludeCategories: z.array(z.string()).optional(),
    useAutoCalculation: z.boolean().optional(),
    safetyStockDays: z.number().optional(),
    leadTimeDays: z.number().optional(),
  }),
  actions: z.object({
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'URGENT']),
    notifications: z.array(z.enum(['EMAIL', 'SLACK', 'SMS', 'PUSH', 'WEBHOOK'])),
    autoReorder: z.boolean().optional(),
    autoEndListing: z.boolean().optional(),
    suggestPromotion: z.boolean().optional(),
    suggestPriceReduction: z.boolean().optional(),
    autoCreatePO: z.boolean().optional(),
  }),
});

const updateAlertSchema = z.object({
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'DISMISSED']).optional(),
  snoozedUntil: z.string().nullable().optional(),
  note: z.string().optional(),
});

const bulkActionSchema = z.object({
  alertIds: z.array(z.string()).min(1),
  action: z.enum(['acknowledge', 'resolve', 'dismiss', 'snooze']),
  snoozeDuration: z.number().optional(), // minutes
});

// ============================================
// エンドポイント
// ============================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const activeAlerts = Object.values(mockAlerts).filter(a => a.status === 'ACTIVE');
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'URGENT');

    const dashboard = {
      stats: mockStats,
      criticalAlerts,
      recentAlerts: Object.values(mockAlerts)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
      rules: Object.values(mockRules).filter(r => r.isActive),
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// アラート一覧
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { type, severity, status, limit = '50' } = req.query;
    let alerts = Object.values(mockAlerts);

    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    // 最新順にソート
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    alerts = alerts.slice(0, parseInt(limit as string));

    res.json({
      alerts,
      total: alerts.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// アラート詳細
router.get('/alerts/:alertId', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const alert = mockAlerts[alertId];

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// アラート更新
router.put('/alerts/:alertId', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const alert = mockAlerts[alertId];

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const validation = updateAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const updates = validation.data;
    const now = new Date().toISOString();

    const updatedAlert = {
      ...alert,
      ...updates,
      updatedAt: now,
    };

    if (updates.status === 'ACKNOWLEDGED') {
      updatedAlert.acknowledgedAt = now;
    } else if (updates.status === 'RESOLVED') {
      updatedAlert.resolvedAt = now;
    }

    mockAlerts[alertId] = updatedAlert;

    res.json(updatedAlert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// 一括アクション
router.post('/alerts/bulk-action', async (req: Request, res: Response) => {
  try {
    const validation = bulkActionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { alertIds, action, snoozeDuration } = validation.data;
    const now = new Date().toISOString();
    let updated = 0;

    for (const alertId of alertIds) {
      const alert = mockAlerts[alertId];
      if (alert) {
        switch (action) {
          case 'acknowledge':
            alert.status = 'ACKNOWLEDGED';
            alert.acknowledgedAt = now;
            break;
          case 'resolve':
            alert.status = 'RESOLVED';
            alert.resolvedAt = now;
            break;
          case 'dismiss':
            alert.status = 'DISMISSED';
            break;
          case 'snooze':
            alert.status = 'SNOOZED';
            if (snoozeDuration) {
              alert.snoozedUntil = new Date(Date.now() + snoozeDuration * 60 * 1000).toISOString();
            }
            break;
        }
        alert.updatedAt = now;
        updated++;
      }
    }

    res.json({
      success: true,
      updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ルール一覧
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    const rules = Object.values(mockRules);

    res.json({
      rules,
      total: rules.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// ルール作成
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const validation = createRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      ...validation.data,
      isActive: true,
      triggeredCount: 0,
      lastTriggered: null,
      createdAt: new Date().toISOString(),
    };

    mockRules[newRule.id] = newRule;

    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// ルール更新
router.put('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = mockRules[ruleId];

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updatedRule = {
      ...rule,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    mockRules[ruleId] = updatedRule;

    res.json(updatedRule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// ルール削除
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    if (!mockRules[ruleId]) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    delete mockRules[ruleId];

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// ルール有効/無効切り替え
router.post('/rules/:ruleId/toggle', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = mockRules[ruleId];

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date().toISOString();

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// ルールテスト
router.post('/rules/:ruleId/test', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = mockRules[ruleId];

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // ルールテスト結果をモック
    const testResult = {
      rule,
      matchingItems: [
        { itemId: 'item-test-1', title: 'Test Item 1', currentStock: 3 },
        { itemId: 'item-test-2', title: 'Test Item 2', currentStock: 2 },
      ],
      alertsWouldCreate: 2,
      notificationsWouldSend: rule.actions.notifications.length * 2,
    };

    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

// 通知設定取得
router.get('/notifications/settings', async (_req: Request, res: Response) => {
  try {
    res.json(mockNotificationSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// 通知設定更新
router.put('/notifications/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updatedSettings = {
      ...mockNotificationSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// 通知テスト送信
router.post('/notifications/test', async (req: Request, res: Response) => {
  try {
    const { channel } = req.body;

    // テスト通知送信（モック）
    const result = {
      channel,
      success: true,
      message: `Test notification sent to ${channel}`,
      sentAt: new Date().toISOString(),
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// 統計情報
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    res.json(mockStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// アラート履歴
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { days = '30', type } = req.query;

    // 履歴データをモック生成
    const history: any[] = [];
    const now = new Date();
    const daysNum = parseInt(days as string);

    for (let i = 0; i < daysNum; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString().split('T')[0],
        created: Math.floor(Math.random() * 20) + 5,
        resolved: Math.floor(Math.random() * 15) + 3,
        byType: {
          LOW_STOCK: Math.floor(Math.random() * 8),
          OUT_OF_STOCK: Math.floor(Math.random() * 3),
          OVERSTOCK: Math.floor(Math.random() * 5),
          SLOW_MOVING: Math.floor(Math.random() * 6),
        },
      });
    }

    res.json({
      history: history.reverse(),
      period: `${days} days`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 在庫チェック実行
router.post('/check', async (_req: Request, res: Response) => {
  try {
    // 在庫チェックを実行（モック）
    const checkResult = {
      success: true,
      checkedItems: 156,
      newAlerts: 3,
      resolvedAlerts: 2,
      checkedAt: new Date().toISOString(),
      nextScheduledCheck: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    res.json(checkResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run inventory check' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      checkInterval: 60, // minutes
      autoResolve: {
        enabled: true,
        resolveWhenStockRestored: true,
        resolveWhenSold: true,
      },
      escalation: {
        enabled: true,
        escalateAfterHours: 24,
        escalateTo: 'supervisor',
      },
      integrations: {
        syncWithEbay: true,
        syncInterval: 15, // minutes
      },
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = {
      checkInterval: updates.checkInterval ?? 60,
      autoResolve: updates.autoResolve ?? {},
      escalation: updates.escalation ?? {},
      integrations: updates.integrations ?? {},
      updatedAt: new Date().toISOString(),
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export const ebayInventoryAlertsRouter = router;

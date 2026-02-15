import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 159: eBay User Preferences（ユーザー設定）
// ============================================================

// モック設定データ
const mockPreferences = {
  // UI設定
  ui: {
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'ja',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h' as '12h' | '24h',
    currency: 'USD',
    currencyDisplay: 'symbol' as 'symbol' | 'code' | 'name',
    sidebarCollapsed: false,
    compactMode: false,
    animationsEnabled: true,
    showTooltips: true,
  },

  // 通知設定
  notifications: {
    email: {
      enabled: true,
      digest: 'daily' as 'instant' | 'hourly' | 'daily' | 'weekly',
      types: ['order', 'message', 'alert', 'report'],
    },
    push: {
      enabled: true,
      types: ['order', 'message', 'urgent'],
    },
    inApp: {
      enabled: true,
      sound: true,
      desktop: true,
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
  },

  // デフォルト値設定
  defaults: {
    listing: {
      duration: 30,
      format: 'FIXED_PRICE' as 'AUCTION' | 'FIXED_PRICE',
      condition: 'NEW',
      returnsAccepted: true,
      returnPeriod: 30,
      shippingService: 'ECONOMY',
      handlingTime: 3,
      bestOfferEnabled: true,
      bestOfferAutoAcceptPrice: 0,
      bestOfferAutoDeclinePrice: 0,
    },
    pricing: {
      marginPercent: 30,
      roundingRule: 'NEAREST' as 'UP' | 'DOWN' | 'NEAREST',
      roundingPrecision: 0.99,
      includeTax: false,
      includeShipping: true,
    },
    shipping: {
      defaultCarrier: 'USPS',
      defaultService: 'PRIORITY',
      freeShippingThreshold: 50,
      handlingFee: 0,
      packagingCost: 2.5,
    },
  },

  // ショートカット設定
  shortcuts: {
    enabled: true,
    customBindings: {
      'ctrl+n': 'new_listing',
      'ctrl+s': 'save',
      'ctrl+p': 'publish',
      'ctrl+shift+d': 'duplicate',
      'ctrl+/': 'search',
      'esc': 'cancel',
    },
  },

  // 表示設定
  display: {
    listingsPerPage: 25,
    ordersPerPage: 20,
    messagesPerPage: 50,
    showThumbnails: true,
    thumbnailSize: 'medium' as 'small' | 'medium' | 'large',
    tableColumns: {
      listings: ['image', 'title', 'price', 'quantity', 'status', 'watchers', 'actions'],
      orders: ['orderNumber', 'buyer', 'items', 'total', 'status', 'date', 'actions'],
      messages: ['from', 'subject', 'date', 'status', 'actions'],
    },
    defaultSortOrder: {
      listings: { field: 'createdAt', direction: 'desc' },
      orders: { field: 'orderDate', direction: 'desc' },
      messages: { field: 'date', direction: 'desc' },
    },
  },

  // データエクスポート設定
  export: {
    defaultFormat: 'CSV' as 'CSV' | 'EXCEL' | 'JSON',
    includeHeaders: true,
    dateRange: 'last30days',
    encoding: 'UTF-8',
  },

  // APIと連携設定
  integrations: {
    autoSync: {
      enabled: true,
      interval: 15, // minutes
      syncListings: true,
      syncOrders: true,
      syncMessages: true,
      syncFeedback: true,
    },
    webhooks: {
      enabled: false,
      endpoints: [],
    },
  },

  // プライバシー設定
  privacy: {
    shareAnalytics: true,
    shareErrorReports: true,
    marketingEmails: false,
    twoFactorEnabled: true,
    sessionTimeout: 60, // minutes
  },
};

// プリセット
const mockPresets = [
  {
    id: 'preset_1',
    name: 'デフォルト設定',
    description: '標準的な設定プリセット',
    isDefault: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preset_2',
    name: '高速モード',
    description: 'パフォーマンス重視の設定',
    isDefault: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// アクティビティ履歴
const mockActivityHistory = Array.from({ length: 20 }, (_, i) => ({
  id: `activity_${20 - i}`,
  action: ['settings_updated', 'preset_applied', 'notification_toggled', 'shortcut_changed'][Math.floor(Math.random() * 4)],
  description: ['UI設定を更新しました', 'プリセット「デフォルト設定」を適用しました', 'メール通知を有効にしました', 'ショートカットを変更しました'][Math.floor(Math.random() * 4)],
  timestamp: new Date(Date.now() - i * 6 * 60 * 60 * 1000).toISOString(),
}));

// ============================================================
// エンドポイント
// ============================================================

// 1. 全設定取得
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences,
  });
});

// 2. UI設定取得
router.get('/ui', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.ui,
  });
});

// 3. UI設定更新
router.put('/ui', async (req: Request, res: Response) => {
  const schema = z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    currency: z.string().optional(),
    currencyDisplay: z.enum(['symbol', 'code', 'name']).optional(),
    sidebarCollapsed: z.boolean().optional(),
    compactMode: z.boolean().optional(),
    animationsEnabled: z.boolean().optional(),
    showTooltips: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  Object.assign(mockPreferences.ui, parsed.data);

  res.json({
    success: true,
    message: 'UI設定を更新しました',
    data: mockPreferences.ui,
  });
});

// 4. 通知設定取得
router.get('/notifications', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.notifications,
  });
});

// 5. 通知設定更新
router.put('/notifications', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.notifications, req.body);

  res.json({
    success: true,
    message: '通知設定を更新しました',
    data: mockPreferences.notifications,
  });
});

// 6. デフォルト値設定取得
router.get('/defaults', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.defaults,
  });
});

// 7. デフォルト値設定更新
router.put('/defaults', async (req: Request, res: Response) => {
  const { category, settings } = req.body;

  if (category && mockPreferences.defaults[category as keyof typeof mockPreferences.defaults]) {
    Object.assign(mockPreferences.defaults[category as keyof typeof mockPreferences.defaults], settings);
  } else {
    Object.assign(mockPreferences.defaults, req.body);
  }

  res.json({
    success: true,
    message: 'デフォルト値設定を更新しました',
    data: mockPreferences.defaults,
  });
});

// 8. ショートカット設定取得
router.get('/shortcuts', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.shortcuts,
  });
});

// 9. ショートカット設定更新
router.put('/shortcuts', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.shortcuts, req.body);

  res.json({
    success: true,
    message: 'ショートカット設定を更新しました',
    data: mockPreferences.shortcuts,
  });
});

// 10. 個別ショートカット追加
router.post('/shortcuts/binding', async (req: Request, res: Response) => {
  const schema = z.object({
    key: z.string(),
    action: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  mockPreferences.shortcuts.customBindings[parsed.data.key] = parsed.data.action;

  res.json({
    success: true,
    message: 'ショートカットを追加しました',
    data: mockPreferences.shortcuts,
  });
});

// 11. 個別ショートカット削除
router.delete('/shortcuts/binding/:key', async (req: Request, res: Response) => {
  const key = decodeURIComponent(req.params.key);
  delete mockPreferences.shortcuts.customBindings[key];

  res.json({
    success: true,
    message: 'ショートカットを削除しました',
    data: mockPreferences.shortcuts,
  });
});

// 12. 表示設定取得
router.get('/display', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.display,
  });
});

// 13. 表示設定更新
router.put('/display', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.display, req.body);

  res.json({
    success: true,
    message: '表示設定を更新しました',
    data: mockPreferences.display,
  });
});

// 14. エクスポート設定取得
router.get('/export', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.export,
  });
});

// 15. エクスポート設定更新
router.put('/export', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.export, req.body);

  res.json({
    success: true,
    message: 'エクスポート設定を更新しました',
    data: mockPreferences.export,
  });
});

// 16. 連携設定取得
router.get('/integrations', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.integrations,
  });
});

// 17. 連携設定更新
router.put('/integrations', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.integrations, req.body);

  res.json({
    success: true,
    message: '連携設定を更新しました',
    data: mockPreferences.integrations,
  });
});

// 18. プライバシー設定取得
router.get('/privacy', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPreferences.privacy,
  });
});

// 19. プライバシー設定更新
router.put('/privacy', async (req: Request, res: Response) => {
  Object.assign(mockPreferences.privacy, req.body);

  res.json({
    success: true,
    message: 'プライバシー設定を更新しました',
    data: mockPreferences.privacy,
  });
});

// 20. プリセット一覧
router.get('/presets', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPresets,
  });
});

// 21. プリセット作成
router.post('/presets', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newPreset = {
    id: `preset_${Date.now()}`,
    name: parsed.data.name,
    description: parsed.data.description || '',
    isDefault: false,
    createdAt: new Date().toISOString(),
    settings: { ...mockPreferences },
  };

  mockPresets.push(newPreset);

  res.json({
    success: true,
    message: 'プリセットを作成しました',
    data: newPreset,
  });
});

// 22. プリセット適用
router.post('/presets/:id/apply', async (req: Request, res: Response) => {
  const preset = mockPresets.find(p => p.id === req.params.id);

  if (!preset) {
    return res.status(404).json({ success: false, error: 'Preset not found' });
  }

  res.json({
    success: true,
    message: `プリセット「${preset.name}」を適用しました`,
    data: mockPreferences,
  });
});

// 23. プリセット削除
router.delete('/presets/:id', async (req: Request, res: Response) => {
  const index = mockPresets.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Preset not found' });
  }

  if (mockPresets[index].isDefault) {
    return res.status(400).json({ success: false, error: 'Cannot delete default preset' });
  }

  mockPresets.splice(index, 1);

  res.json({
    success: true,
    message: 'プリセットを削除しました',
  });
});

// 24. 設定をエクスポート
router.get('/export-settings', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      exportData: JSON.stringify(mockPreferences, null, 2),
      exportedAt: new Date().toISOString(),
    },
  });
});

// 25. 設定をインポート
router.post('/import-settings', async (req: Request, res: Response) => {
  const { settings } = req.body;

  if (!settings) {
    return res.status(400).json({ success: false, error: 'No settings provided' });
  }

  try {
    const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
    Object.assign(mockPreferences, parsed);

    res.json({
      success: true,
      message: '設定をインポートしました',
      data: mockPreferences,
    });
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid settings format' });
  }
});

// 26. 設定をリセット
router.post('/reset', async (req: Request, res: Response) => {
  const { category } = req.body;

  if (category && mockPreferences[category as keyof typeof mockPreferences]) {
    res.json({
      success: true,
      message: `${category}設定をリセットしました`,
    });
  } else {
    res.json({
      success: true,
      message: '全設定をリセットしました',
    });
  }
});

// 27. 設定変更履歴
router.get('/history', async (req: Request, res: Response) => {
  const { limit = '20' } = req.query;

  const history = mockActivityHistory.slice(0, parseInt(limit as string, 10));

  res.json({
    success: true,
    data: history,
  });
});

// 28. 利用可能なタイムゾーン一覧
router.get('/timezones', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'Pacific/Honolulu', label: 'ハワイ (GMT-10)', offset: -10 },
      { id: 'America/Los_Angeles', label: 'ロサンゼルス (GMT-8)', offset: -8 },
      { id: 'America/Denver', label: 'デンバー (GMT-7)', offset: -7 },
      { id: 'America/Chicago', label: 'シカゴ (GMT-6)', offset: -6 },
      { id: 'America/New_York', label: 'ニューヨーク (GMT-5)', offset: -5 },
      { id: 'Europe/London', label: 'ロンドン (GMT+0)', offset: 0 },
      { id: 'Europe/Paris', label: 'パリ (GMT+1)', offset: 1 },
      { id: 'Asia/Tokyo', label: '東京 (GMT+9)', offset: 9 },
      { id: 'Australia/Sydney', label: 'シドニー (GMT+11)', offset: 11 },
    ],
  });
});

// 29. 利用可能な言語一覧
router.get('/languages', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ko', name: '한국어' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
    ],
  });
});

// 30. 利用可能な通貨一覧
router.get('/currencies', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    ],
  });
});

export const ebayUserPreferencesRouter = router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ストアステータス
const STORE_STATUSES = {
  ACTIVE: { id: 'ACTIVE', name: 'アクティブ', color: 'emerald' },
  SUSPENDED: { id: 'SUSPENDED', name: '停止中', color: 'red' },
  PENDING: { id: 'PENDING', name: '認証待ち', color: 'amber' },
  LIMITED: { id: 'LIMITED', name: '制限中', color: 'orange' },
} as const;

// サブスクリプションレベル
const SUBSCRIPTION_LEVELS = {
  STARTER: { id: 'STARTER', name: 'スターター', listingLimit: 250, monthlyFee: 7.95 },
  BASIC: { id: 'BASIC', name: 'ベーシック', listingLimit: 1000, monthlyFee: 27.95 },
  PREMIUM: { id: 'PREMIUM', name: 'プレミアム', listingLimit: 10000, monthlyFee: 74.95 },
  ANCHOR: { id: 'ANCHOR', name: 'アンカー', listingLimit: 25000, monthlyFee: 349.95 },
  ENTERPRISE: { id: 'ENTERPRISE', name: 'エンタープライズ', listingLimit: 100000, monthlyFee: 2999.95 },
} as const;

// モックストアデータ
const mockStores = [
  {
    id: 'store-1',
    name: 'Main Store',
    ebayUserId: 'seller_main_2024',
    email: 'main@example.com',
    country: 'US',
    status: 'ACTIVE',
    subscriptionLevel: 'PREMIUM',
    feedbackScore: 99.5,
    feedbackCount: 2450,
    sellerLevel: 'Top Rated',
    totalListings: 742,
    activeListings: 685,
    monthlySales: 45200,
    monthlyOrders: 578,
    lastSync: new Date(Date.now() - 300000).toISOString(),
    isPrimary: true,
    createdAt: '2023-01-15T00:00:00Z',
  },
  {
    id: 'store-2',
    name: 'EU Store',
    ebayUserId: 'seller_eu_2024',
    email: 'eu@example.com',
    country: 'DE',
    status: 'ACTIVE',
    subscriptionLevel: 'BASIC',
    feedbackScore: 98.2,
    feedbackCount: 856,
    sellerLevel: 'Above Standard',
    totalListings: 325,
    activeListings: 298,
    monthlySales: 18500,
    monthlyOrders: 245,
    lastSync: new Date(Date.now() - 600000).toISOString(),
    isPrimary: false,
    createdAt: '2023-06-20T00:00:00Z',
  },
  {
    id: 'store-3',
    name: 'UK Store',
    ebayUserId: 'seller_uk_2024',
    email: 'uk@example.com',
    country: 'GB',
    status: 'LIMITED',
    subscriptionLevel: 'STARTER',
    feedbackScore: 97.8,
    feedbackCount: 412,
    sellerLevel: 'Standard',
    totalListings: 185,
    activeListings: 156,
    monthlySales: 8200,
    monthlyOrders: 112,
    lastSync: new Date(Date.now() - 1200000).toISOString(),
    isPrimary: false,
    createdAt: '2024-02-10T00:00:00Z',
  },
];

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const totalStores = mockStores.length;
    const activeStores = mockStores.filter(s => s.status === 'ACTIVE').length;
    const totalListings = mockStores.reduce((sum, s) => sum + s.totalListings, 0);
    const totalActiveListings = mockStores.reduce((sum, s) => sum + s.activeListings, 0);
    const totalMonthlySales = mockStores.reduce((sum, s) => sum + s.monthlySales, 0);
    const totalMonthlyOrders = mockStores.reduce((sum, s) => sum + s.monthlyOrders, 0);

    const dashboard = {
      summary: {
        totalStores,
        activeStores,
        totalListings,
        totalActiveListings,
        totalMonthlySales,
        totalMonthlyOrders,
        averageFeedback: (mockStores.reduce((sum, s) => sum + s.feedbackScore, 0) / totalStores).toFixed(1),
      },
      storesByStatus: {
        active: mockStores.filter(s => s.status === 'ACTIVE').length,
        suspended: mockStores.filter(s => s.status === 'SUSPENDED').length,
        pending: mockStores.filter(s => s.status === 'PENDING').length,
        limited: mockStores.filter(s => s.status === 'LIMITED').length,
      },
      storesByCountry: mockStores.reduce((acc, s) => {
        acc[s.country] = (acc[s.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topPerformingStore: mockStores.reduce((best, s) =>
        s.monthlySales > best.monthlySales ? s : best
      ),
      recentActivity: [
        { type: 'sync', store: 'Main Store', message: '在庫同期完了', timestamp: new Date(Date.now() - 300000).toISOString() },
        { type: 'order', store: 'EU Store', message: '新規注文 5件', timestamp: new Date(Date.now() - 900000).toISOString() },
        { type: 'listing', store: 'UK Store', message: '出品 3件追加', timestamp: new Date(Date.now() - 1800000).toISOString() },
        { type: 'alert', store: 'Main Store', message: '価格アラート 2件', timestamp: new Date(Date.now() - 3600000).toISOString() },
      ],
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ストア一覧
router.get('/stores', async (_req: Request, res: Response) => {
  try {
    res.json({
      stores: mockStores,
      total: mockStores.length,
    });
  } catch (error) {
    console.error('Stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ストア詳細
router.get('/stores/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = mockStores.find(s => s.id === storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // 詳細情報を追加
    const storeDetail = {
      ...store,
      metrics: {
        listingsByStatus: {
          active: store.activeListings,
          draft: Math.floor(store.totalListings * 0.05),
          ended: Math.floor(store.totalListings * 0.08),
          error: Math.floor(store.totalListings * 0.02),
        },
        salesTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
          sales: Math.floor(Math.random() * 3000) + 1000,
          orders: Math.floor(Math.random() * 30) + 10,
        })),
        topCategories: [
          { name: 'Electronics', listings: 120, sales: 15000 },
          { name: 'Clothing', listings: 85, sales: 8500 },
          { name: 'Home & Garden', listings: 65, sales: 6200 },
        ],
      },
      settings: {
        autoSync: true,
        syncInterval: 30, // minutes
        priceSync: true,
        inventorySync: true,
        orderSync: true,
        notifications: {
          email: true,
          slack: false,
          lowStock: true,
          newOrders: true,
        },
      },
    };

    res.json(storeDetail);
  } catch (error) {
    console.error('Store detail error:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// 新規ストア追加
router.post('/stores', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      ebayUserId: z.string().min(1),
      email: z.string().email(),
      country: z.string().length(2),
      subscriptionLevel: z.enum(['STARTER', 'BASIC', 'PREMIUM', 'ANCHOR', 'ENTERPRISE']),
    });

    const data = schema.parse(req.body);

    const newStore = {
      id: `store-${Date.now()}`,
      ...data,
      status: 'PENDING',
      feedbackScore: 0,
      feedbackCount: 0,
      sellerLevel: 'New',
      totalListings: 0,
      activeListings: 0,
      monthlySales: 0,
      monthlyOrders: 0,
      lastSync: null,
      isPrimary: false,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: 'ストアを追加しました。eBay認証が必要です。',
      store: newStore,
      authUrl: `https://auth.ebay.com/oauth2/authorize?client_id=...&scope=...`,
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// ストア更新
router.put('/stores/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = mockStores.find(s => s.id === storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      subscriptionLevel: z.enum(['STARTER', 'BASIC', 'PREMIUM', 'ANCHOR', 'ENTERPRISE']).optional(),
      isPrimary: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const updatedStore = {
      ...store,
      ...data,
    };

    res.json({
      success: true,
      message: 'ストアを更新しました',
      store: updatedStore,
    });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// ストア削除
router.delete('/stores/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = mockStores.find(s => s.id === storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (store.isPrimary) {
      return res.status(400).json({ error: 'プライマリストアは削除できません' });
    }

    res.json({
      success: true,
      message: 'ストアを削除しました',
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// ストア同期
router.post('/stores/:storeId/sync', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { syncType = 'all' } = req.body;

    const store = mockStores.find(s => s.id === storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({
      success: true,
      message: `${store.name}の${syncType === 'all' ? '全データ' : syncType}同期を開始しました`,
      jobId: `sync-${Date.now()}`,
      syncType,
      estimatedTime: '2-5分',
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// 全ストア同期
router.post('/sync-all', async (req: Request, res: Response) => {
  try {
    const { syncType = 'all' } = req.body;

    res.json({
      success: true,
      message: '全ストアの同期を開始しました',
      jobId: `sync-all-${Date.now()}`,
      stores: mockStores.map(s => s.id),
      syncType,
      estimatedTime: '5-10分',
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// ストア間在庫移動
router.post('/transfer-inventory', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sourceStoreId: z.string(),
      targetStoreId: z.string(),
      listings: z.array(z.object({
        listingId: z.string(),
        quantity: z.number().int().positive(),
      })),
    });

    const data = schema.parse(req.body);

    const sourceStore = mockStores.find(s => s.id === data.sourceStoreId);
    const targetStore = mockStores.find(s => s.id === data.targetStoreId);

    if (!sourceStore || !targetStore) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({
      success: true,
      message: `${sourceStore.name}から${targetStore.name}への在庫移動を開始しました`,
      transferId: `transfer-${Date.now()}`,
      itemCount: data.listings.length,
      totalQuantity: data.listings.reduce((sum, l) => sum + l.quantity, 0),
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer inventory' });
  }
});

// ストア間出品コピー
router.post('/copy-listings', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sourceStoreId: z.string(),
      targetStoreId: z.string(),
      listingIds: z.array(z.string()),
      options: z.object({
        copyImages: z.boolean().default(true),
        copyDescription: z.boolean().default(true),
        adjustPrice: z.number().optional(), // percentage adjustment
        translateTitle: z.boolean().default(false),
        targetLanguage: z.string().optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

    const sourceStore = mockStores.find(s => s.id === data.sourceStoreId);
    const targetStore = mockStores.find(s => s.id === data.targetStoreId);

    if (!sourceStore || !targetStore) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({
      success: true,
      message: `${data.listingIds.length}件の出品を${targetStore.name}にコピーします`,
      jobId: `copy-${Date.now()}`,
      sourceStore: sourceStore.name,
      targetStore: targetStore.name,
      listingCount: data.listingIds.length,
    });
  } catch (error) {
    console.error('Copy listings error:', error);
    res.status(500).json({ error: 'Failed to copy listings' });
  }
});

// ストア比較
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { storeIds } = req.query;
    const ids = typeof storeIds === 'string' ? storeIds.split(',') : [];

    const stores = mockStores.filter(s => ids.includes(s.id));

    if (stores.length < 2) {
      return res.status(400).json({ error: '比較には2つ以上のストアが必要です' });
    }

    const comparison = {
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        country: s.country,
      })),
      metrics: {
        monthlySales: stores.map(s => ({ storeId: s.id, value: s.monthlySales })),
        monthlyOrders: stores.map(s => ({ storeId: s.id, value: s.monthlyOrders })),
        activeListings: stores.map(s => ({ storeId: s.id, value: s.activeListings })),
        feedbackScore: stores.map(s => ({ storeId: s.id, value: s.feedbackScore })),
        averageOrderValue: stores.map(s => ({
          storeId: s.id,
          value: s.monthlyOrders > 0 ? (s.monthlySales / s.monthlyOrders).toFixed(2) : 0
        })),
      },
      trends: {
        salesGrowth: stores.map(s => ({ storeId: s.id, value: (Math.random() * 20 - 5).toFixed(1) })),
        orderGrowth: stores.map(s => ({ storeId: s.id, value: (Math.random() * 15 - 3).toFixed(1) })),
      },
    };

    res.json(comparison);
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Failed to compare stores' });
  }
});

// 統合レポート
router.get('/consolidated-report', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const report = {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: mockStores.reduce((sum, s) => sum + s.monthlySales, 0),
        totalOrders: mockStores.reduce((sum, s) => sum + s.monthlyOrders, 0),
        totalListings: mockStores.reduce((sum, s) => sum + s.totalListings, 0),
        averageFeedback: (mockStores.reduce((sum, s) => sum + s.feedbackScore, 0) / mockStores.length).toFixed(1),
      },
      byStore: mockStores.map(s => ({
        storeId: s.id,
        storeName: s.name,
        country: s.country,
        revenue: s.monthlySales,
        orders: s.monthlyOrders,
        listings: s.totalListings,
        feedbackScore: s.feedbackScore,
        revenueShare: ((s.monthlySales / mockStores.reduce((sum, st) => sum + st.monthlySales, 0)) * 100).toFixed(1),
      })),
      trends: {
        revenueByDay: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
          total: Math.floor(Math.random() * 5000) + 2000,
          byStore: mockStores.map(s => ({
            storeId: s.id,
            value: Math.floor(Math.random() * 2000) + 500,
          })),
        })),
      },
      topProducts: Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        productId: `prod-${i}`,
        title: `Top Product ${i + 1}`,
        totalSales: Math.floor(Math.random() * 50) + 10,
        totalRevenue: Math.floor(Math.random() * 5000) + 500,
        stores: mockStores.slice(0, Math.floor(Math.random() * mockStores.length) + 1).map(s => s.name),
      })),
    };

    res.json(report);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      defaultStore: 'store-1',
      globalSync: {
        enabled: true,
        interval: 30, // minutes
        priceSync: true,
        inventorySync: true,
        orderSync: true,
      },
      notifications: {
        email: true,
        slack: false,
        lowStockThreshold: 5,
        priceDifferenceThreshold: 10, // percent
      },
      crossListing: {
        enabled: true,
        autoTranslate: true,
        priceAdjustmentByCountry: {
          US: 0,
          GB: 5,
          DE: 8,
          AU: 10,
        },
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
    const schema = z.object({
      defaultStore: z.string().optional(),
      globalSync: z.object({
        enabled: z.boolean().optional(),
        interval: z.number().min(5).max(1440).optional(),
        priceSync: z.boolean().optional(),
        inventorySync: z.boolean().optional(),
        orderSync: z.boolean().optional(),
      }).optional(),
      notifications: z.object({
        email: z.boolean().optional(),
        slack: z.boolean().optional(),
        lowStockThreshold: z.number().optional(),
        priceDifferenceThreshold: z.number().optional(),
      }).optional(),
      crossListing: z.object({
        enabled: z.boolean().optional(),
        autoTranslate: z.boolean().optional(),
        priceAdjustmentByCountry: z.record(z.number()).optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

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

// ストアステータス一覧
router.get('/statuses', async (_req: Request, res: Response) => {
  try {
    res.json(Object.values(STORE_STATUSES));
  } catch (error) {
    console.error('Statuses error:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// サブスクリプションレベル一覧
router.get('/subscription-levels', async (_req: Request, res: Response) => {
  try {
    res.json(Object.values(SUBSCRIPTION_LEVELS));
  } catch (error) {
    console.error('Subscription levels error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription levels' });
  }
});

export { router as ebayMultiStoreRouter };

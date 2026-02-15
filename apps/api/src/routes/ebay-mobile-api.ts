import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 169: Mobile API Support（モバイルAPI対応）
// ============================================

// --- モバイルダッシュボード ---
router.get('/dashboard', (req, res) => {
  res.json({
    summary: {
      todaySales: 3250.50,
      todayOrders: 12,
      activeListings: 1250,
      pendingActions: 5,
    },
    salesTrend: {
      change: 15.5,
      direction: 'UP',
      period: 'vs_yesterday',
    },
    alerts: [
      { id: 'alert_001', type: 'LOW_STOCK', message: '3商品が在庫不足です', priority: 'HIGH' },
      { id: 'alert_002', type: 'NEW_ORDER', message: '新しい注文が3件あります', priority: 'MEDIUM' },
      { id: 'alert_003', type: 'MESSAGE', message: '未読メッセージが2件あります', priority: 'LOW' },
    ],
    quickStats: [
      { label: '本日の売上', value: '$3,250', icon: 'dollar' },
      { label: '出品中', value: '1,250', icon: 'package' },
      { label: '処理待ち', value: '5', icon: 'clock' },
      { label: '評価', value: '4.9', icon: 'star' },
    ],
  });
});

// --- モバイル用出品一覧（軽量版）---
router.get('/listings', (req, res) => {
  const { status, page = '1', limit = '20', sort = 'updatedAt' } = req.query;

  const listings = Array.from({ length: 20 }, (_, i) => ({
    id: `listing_${i + 1}`,
    title: `商品 ${i + 1}`,
    price: 29.99 + i * 10,
    currency: 'USD',
    status: ['ACTIVE', 'SOLD', 'ENDED'][i % 3],
    imageUrl: `https://picsum.photos/200/200?random=${i}`,
    views: Math.floor(Math.random() * 500),
    watchers: Math.floor(Math.random() * 50),
    quantity: Math.floor(Math.random() * 10) + 1,
    updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  let filtered = [...listings];
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    listings: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    hasMore: offset + limitNum < filtered.length,
  });
});

// --- モバイル用出品詳細 ---
router.get('/listings/:id', (req, res) => {
  res.json({
    id: req.params.id,
    title: 'Vintage Watch Collection Item',
    description: 'Beautiful vintage watch in excellent condition...',
    price: 299.99,
    currency: 'USD',
    status: 'ACTIVE',
    images: [
      'https://picsum.photos/400/400?random=1',
      'https://picsum.photos/400/400?random=2',
      'https://picsum.photos/400/400?random=3',
    ],
    category: 'Watches',
    condition: 'Used - Excellent',
    quantity: 1,
    views: 245,
    watchers: 12,
    bids: 0,
    shipping: {
      method: 'Standard Shipping',
      cost: 9.99,
      estimatedDelivery: '5-7 business days',
    },
    seller: {
      feedback: 99.5,
      sales: 1250,
    },
    listedAt: '2026-02-01T00:00:00Z',
    endsAt: '2026-02-28T23:59:59Z',
    marketplaceUrl: 'https://www.ebay.com/itm/12345',
  });
});

// --- クイック価格更新 ---
router.post('/listings/:id/price', (req, res) => {
  const schema = z.object({
    price: z.number().positive(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    listingId: req.params.id,
    oldPrice: 299.99,
    newPrice: parsed.data.price,
    updatedAt: new Date().toISOString(),
    message: '価格を更新しました',
  });
});

// --- クイック在庫更新 ---
router.post('/listings/:id/quantity', (req, res) => {
  const schema = z.object({
    quantity: z.number().int().min(0),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    listingId: req.params.id,
    oldQuantity: 5,
    newQuantity: parsed.data.quantity,
    updatedAt: new Date().toISOString(),
    message: '在庫数を更新しました',
  });
});

// --- モバイル用注文一覧 ---
router.get('/orders', (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;

  const orders = Array.from({ length: 15 }, (_, i) => ({
    id: `order_${i + 1}`,
    orderNumber: `ORD-2026-${String(i + 1).padStart(5, '0')}`,
    buyerName: `Buyer ${i + 1}`,
    total: 49.99 + i * 20,
    currency: 'USD',
    status: ['PAID', 'SHIPPED', 'DELIVERED', 'PENDING'][i % 4],
    itemCount: Math.floor(Math.random() * 3) + 1,
    itemTitle: `商品 ${i + 1}`,
    itemImage: `https://picsum.photos/100/100?random=${i}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    shippingAddress: {
      city: 'New York',
      country: 'US',
    },
  }));

  let filtered = [...orders];
  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    orders: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    hasMore: offset + limitNum < filtered.length,
    summary: {
      pending: orders.filter(o => o.status === 'PENDING').length,
      paid: orders.filter(o => o.status === 'PAID').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
    },
  });
});

// --- 注文詳細 ---
router.get('/orders/:id', (req, res) => {
  res.json({
    id: req.params.id,
    orderNumber: 'ORD-2026-00001',
    status: 'PAID',
    buyer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
      feedbackScore: 125,
    },
    items: [
      {
        id: 'item_001',
        title: 'Vintage Watch',
        price: 299.99,
        quantity: 1,
        image: 'https://picsum.photos/200/200?random=1',
      },
    ],
    subtotal: 299.99,
    shipping: 9.99,
    tax: 25.50,
    total: 335.48,
    currency: 'USD',
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    tracking: null,
    createdAt: '2026-02-15T10:00:00Z',
    paidAt: '2026-02-15T10:05:00Z',
    shippedAt: null,
    deliveredAt: null,
  });
});

// --- 注文ステータス更新 ---
router.post('/orders/:id/ship', (req, res) => {
  const schema = z.object({
    carrier: z.string(),
    trackingNumber: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    orderId: req.params.id,
    status: 'SHIPPED',
    tracking: {
      carrier: parsed.data.carrier,
      trackingNumber: parsed.data.trackingNumber,
      trackingUrl: `https://track.${parsed.data.carrier.toLowerCase()}.com/${parsed.data.trackingNumber}`,
    },
    shippedAt: new Date().toISOString(),
    message: '発送完了を記録しました',
  });
});

// --- モバイル用メッセージ ---
router.get('/messages', (req, res) => {
  const { unreadOnly, page = '1', limit = '20' } = req.query;

  const messages = Array.from({ length: 10 }, (_, i) => ({
    id: `msg_${i + 1}`,
    threadId: `thread_${i + 1}`,
    subject: `商品についての質問 #${i + 1}`,
    preview: 'こんにちは、この商品について質問があります...',
    sender: {
      name: `Buyer ${i + 1}`,
      avatar: `https://picsum.photos/50/50?random=${i}`,
    },
    isRead: i > 2,
    hasAttachment: i % 3 === 0,
    relatedItem: {
      id: `item_${i + 1}`,
      title: `商品 ${i + 1}`,
    },
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  let filtered = [...messages];
  if (unreadOnly === 'true') {
    filtered = filtered.filter(m => !m.isRead);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    messages: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    unreadCount: messages.filter(m => !m.isRead).length,
    hasMore: offset + limitNum < filtered.length,
  });
});

// --- メッセージ送信 ---
router.post('/messages/:threadId/reply', (req, res) => {
  const schema = z.object({
    body: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    messageId: `msg_${Date.now()}`,
    threadId: req.params.threadId,
    body: parsed.data.body,
    sentAt: new Date().toISOString(),
    message: 'メッセージを送信しました',
  });
});

// --- プッシュ通知設定 ---
router.get('/push-settings', (req, res) => {
  res.json({
    enabled: true,
    deviceToken: 'xxx',
    settings: {
      newOrders: true,
      orderUpdates: true,
      messages: true,
      lowStock: true,
      priceAlerts: false,
      dailySummary: true,
      marketingUpdates: false,
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Tokyo',
    },
  });
});

router.put('/push-settings', (req, res) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
    message: '通知設定を更新しました',
  });
});

router.post('/push-settings/register', (req, res) => {
  const schema = z.object({
    deviceToken: z.string(),
    platform: z.enum(['IOS', 'ANDROID']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    deviceId: `device_${Date.now()}`,
    deviceToken: parsed.data.deviceToken,
    platform: parsed.data.platform,
    registeredAt: new Date().toISOString(),
    message: 'デバイスを登録しました',
  });
});

// --- クイックアクション ---
router.get('/quick-actions', (req, res) => {
  res.json({
    actions: [
      { id: 'scan_barcode', label: 'バーコードスキャン', icon: 'barcode', enabled: true },
      { id: 'quick_list', label: 'クイック出品', icon: 'plus', enabled: true },
      { id: 'price_check', label: '価格チェック', icon: 'search', enabled: true },
      { id: 'ship_order', label: '発送処理', icon: 'truck', enabled: true },
      { id: 'reply_message', label: 'メッセージ返信', icon: 'message', enabled: true },
      { id: 'sync_now', label: '今すぐ同期', icon: 'refresh', enabled: true },
    ],
  });
});

// --- バーコードスキャン ---
router.post('/scan', (req, res) => {
  const schema = z.object({
    barcode: z.string(),
    type: z.enum(['UPC', 'EAN', 'ISBN', 'QR']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    barcode: parsed.data.barcode,
    found: true,
    product: {
      id: 'prod_123',
      title: 'Sample Product',
      brand: 'Brand Name',
      category: 'Electronics',
      suggestedPrice: 49.99,
      marketPrice: {
        low: 35.00,
        average: 45.00,
        high: 55.00,
      },
      images: ['https://picsum.photos/200/200?random=1'],
    },
  });
});

// --- オフライン同期 ---
router.post('/sync', (req, res) => {
  const schema = z.object({
    lastSyncAt: z.string().optional(),
    changes: z.array(z.object({
      type: z.string(),
      action: z.string(),
      data: z.any(),
    })).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({
    syncedAt: new Date().toISOString(),
    changesApplied: parsed.data.changes?.length ?? 0,
    newData: {
      listings: 5,
      orders: 3,
      messages: 2,
    },
    conflicts: [],
    message: '同期が完了しました',
  });
});

// --- アプリ設定 ---
router.get('/settings', (req, res) => {
  res.json({
    app: {
      version: '2.1.0',
      buildNumber: 1025,
      minSupportedVersion: '2.0.0',
    },
    features: {
      barcodeScanner: true,
      voiceInput: true,
      darkMode: true,
      biometricAuth: true,
      offlineMode: true,
    },
    user: {
      defaultCurrency: 'USD',
      defaultShippingCarrier: 'USPS',
      language: 'ja',
      timezone: 'Asia/Tokyo',
    },
    sync: {
      autoSync: true,
      syncInterval: 300,
      syncOnWifiOnly: false,
    },
  });
});

router.put('/settings', (req, res) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
    message: '設定を更新しました',
  });
});

// --- ヘルスチェック ---
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      api: 'OK',
      database: 'OK',
      ebay: 'OK',
      push: 'OK',
    },
    latency: 45,
  });
});

export { router as ebayMobileApiRouter };

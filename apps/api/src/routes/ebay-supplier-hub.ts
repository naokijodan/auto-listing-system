import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 222: Supplier Hub（サプライヤーハブ）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - サプライヤー概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalSuppliers: 85,
    activeSuppliers: 72,
    totalOrders: 1250,
    pendingOrders: 45,
    totalSpend: 85000000,
    avgLeadTime: 12.5,
    onTimeDelivery: 94.5,
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/recent - 最近の活動
router.get('/dashboard/recent', async (_req: Request, res: Response) => {
  res.json({
    activities: [
      { id: 'act_001', type: 'order_placed', supplier: 'Seiko Japan', orderId: 'PO-001', amount: 850000, createdAt: '2026-02-16 09:30:00' },
      { id: 'act_002', type: 'shipment_received', supplier: 'Casio Direct', orderId: 'PO-002', items: 50, createdAt: '2026-02-16 09:00:00' },
      { id: 'act_003', type: 'invoice_paid', supplier: 'Orient Supply', orderId: 'PO-003', amount: 450000, createdAt: '2026-02-15 18:00:00' },
    ],
  });
});

// GET /dashboard/performance - パフォーマンス
router.get('/dashboard/performance', async (_req: Request, res: Response) => {
  res.json({
    topSuppliers: [
      { supplier: 'Seiko Japan', orders: 250, spend: 25000000, rating: 4.9 },
      { supplier: 'Casio Direct', orders: 180, spend: 15000000, rating: 4.8 },
      { supplier: 'Orient Supply', orders: 120, spend: 12000000, rating: 4.7 },
    ],
    metrics: {
      avgOrderValue: 680000,
      avgLeadTime: 12.5,
      defectRate: 0.5,
    },
  });
});

// --- サプライヤー管理 ---

// GET /suppliers - サプライヤー一覧
router.get('/suppliers', async (_req: Request, res: Response) => {
  res.json({
    suppliers: [
      { id: '1', name: 'Seiko Japan', type: 'manufacturer', country: 'JP', status: 'active', rating: 4.9, totalOrders: 250, totalSpend: 25000000 },
      { id: '2', name: 'Casio Direct', type: 'manufacturer', country: 'JP', status: 'active', rating: 4.8, totalOrders: 180, totalSpend: 15000000 },
      { id: '3', name: 'Orient Supply', type: 'distributor', country: 'JP', status: 'active', rating: 4.7, totalOrders: 120, totalSpend: 12000000 },
      { id: '4', name: 'Citizen Corp', type: 'manufacturer', country: 'JP', status: 'inactive', rating: 4.5, totalOrders: 80, totalSpend: 8000000 },
    ],
    total: 85,
    types: ['manufacturer', 'distributor', 'wholesaler'],
    statuses: ['active', 'inactive', 'pending'],
  });
});

// GET /suppliers/:id - サプライヤー詳細
router.get('/suppliers/:id', async (req: Request, res: Response) => {
  res.json({
    supplier: {
      id: req.params.id,
      name: 'Seiko Japan',
      type: 'manufacturer',
      status: 'active',
      contact: {
        name: '田中太郎',
        email: 'tanaka@seiko.co.jp',
        phone: '+81-3-1234-5678',
      },
      address: {
        street: '銀座1-2-3',
        city: '東京',
        country: 'JP',
        postalCode: '100-0001',
      },
      payment: {
        terms: 'Net 30',
        currency: 'JPY',
        bankAccount: '***1234',
      },
      metrics: {
        totalOrders: 250,
        totalSpend: 25000000,
        avgLeadTime: 10,
        onTimeDelivery: 96.5,
        defectRate: 0.3,
        rating: 4.9,
      },
      createdAt: '2023-01-15',
    },
  });
});

// POST /suppliers - サプライヤー作成
router.post('/suppliers', async (_req: Request, res: Response) => {
  res.json({ success: true, supplierId: 'supplier_new_001', message: 'サプライヤーを作成しました' });
});

// PUT /suppliers/:id - サプライヤー更新
router.put('/suppliers/:id', async (req: Request, res: Response) => {
  res.json({ success: true, supplierId: req.params.id, message: 'サプライヤーを更新しました' });
});

// DELETE /suppliers/:id - サプライヤー削除
router.delete('/suppliers/:id', async (req: Request, res: Response) => {
  res.json({ success: true, supplierId: req.params.id, message: 'サプライヤーを削除しました' });
});

// --- 発注管理 ---

// GET /orders - 発注一覧
router.get('/orders', async (_req: Request, res: Response) => {
  res.json({
    orders: [
      { id: 'PO-001', supplierId: '1', supplierName: 'Seiko Japan', items: 25, total: 850000, status: 'pending', orderDate: '2026-02-16', expectedDate: '2026-02-28' },
      { id: 'PO-002', supplierId: '2', supplierName: 'Casio Direct', items: 50, total: 600000, status: 'shipped', orderDate: '2026-02-14', expectedDate: '2026-02-24' },
      { id: 'PO-003', supplierId: '3', supplierName: 'Orient Supply', items: 30, total: 450000, status: 'delivered', orderDate: '2026-02-10', expectedDate: '2026-02-20' },
    ],
    total: 1250,
    statuses: ['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  });
});

// GET /orders/:id - 発注詳細
router.get('/orders/:id', async (req: Request, res: Response) => {
  res.json({
    order: {
      id: req.params.id,
      supplier: { id: '1', name: 'Seiko Japan' },
      items: [
        { productId: 'prod_001', name: 'Seiko Prospex SBDC089', quantity: 10, unitPrice: 50000, total: 500000 },
        { productId: 'prod_002', name: 'Seiko Presage SRPG15', quantity: 15, unitPrice: 23333, total: 350000 },
      ],
      subtotal: 850000,
      shipping: 0,
      tax: 85000,
      total: 935000,
      status: 'pending',
      orderDate: '2026-02-16',
      expectedDate: '2026-02-28',
      timeline: [
        { date: '2026-02-16 09:30:00', event: 'created', message: '発注書を作成しました' },
        { date: '2026-02-16 10:00:00', event: 'sent', message: 'サプライヤーに送信しました' },
      ],
    },
  });
});

// POST /orders - 発注作成
router.post('/orders', async (_req: Request, res: Response) => {
  res.json({ success: true, orderId: 'PO-new-001', message: '発注書を作成しました' });
});

// PUT /orders/:id - 発注更新
router.put('/orders/:id', async (req: Request, res: Response) => {
  res.json({ success: true, orderId: req.params.id, message: '発注書を更新しました' });
});

// POST /orders/:id/send - 発注送信
router.post('/orders/:id/send', async (req: Request, res: Response) => {
  res.json({ success: true, orderId: req.params.id, message: 'サプライヤーに送信しました' });
});

// POST /orders/:id/cancel - 発注キャンセル
router.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  res.json({ success: true, orderId: req.params.id, message: '発注をキャンセルしました' });
});

// --- 商品カタログ ---

// GET /catalog - カタログ一覧
router.get('/catalog', async (_req: Request, res: Response) => {
  res.json({
    products: [
      { id: 'cat_001', supplierId: '1', supplierName: 'Seiko Japan', sku: 'SBDC089', name: 'Seiko Prospex', price: 50000, stock: 100, leadTime: 10 },
      { id: 'cat_002', supplierId: '2', supplierName: 'Casio Direct', sku: 'GA-2100', name: 'G-Shock', price: 12000, stock: 500, leadTime: 7 },
      { id: 'cat_003', supplierId: '3', supplierName: 'Orient Supply', sku: 'BAMBINO3', name: 'Orient Bambino', price: 18000, stock: 200, leadTime: 14 },
    ],
    total: 2500,
  });
});

// GET /catalog/:id - カタログ商品詳細
router.get('/catalog/:id', async (req: Request, res: Response) => {
  res.json({
    product: {
      id: req.params.id,
      supplier: { id: '1', name: 'Seiko Japan' },
      sku: 'SBDC089',
      name: 'Seiko Prospex SBDC089',
      description: 'Japanese automatic diver watch with 200m water resistance',
      price: 50000,
      moq: 5,
      stock: 100,
      leadTime: 10,
      images: ['/images/sbdc089_1.jpg', '/images/sbdc089_2.jpg'],
    },
  });
});

// POST /catalog/import - カタログインポート
router.post('/catalog/import', async (_req: Request, res: Response) => {
  res.json({ success: true, imported: 150, message: 'カタログをインポートしました' });
});

// --- レポート ---

// GET /reports/spend - 支出レポート
router.get('/reports/spend', async (_req: Request, res: Response) => {
  res.json({
    summary: {
      totalSpend: 85000000,
      monthlyAvg: 7000000,
      topCategory: '時計',
    },
    bySupplier: [
      { supplier: 'Seiko Japan', spend: 25000000, percentage: 29.4 },
      { supplier: 'Casio Direct', spend: 15000000, percentage: 17.6 },
      { supplier: 'Orient Supply', spend: 12000000, percentage: 14.1 },
    ],
    monthly: [
      { month: '2025-09', spend: 6500000 },
      { month: '2025-10', spend: 7200000 },
      { month: '2025-11', spend: 8000000 },
      { month: '2025-12', spend: 9500000 },
      { month: '2026-01', spend: 7800000 },
      { month: '2026-02', spend: 6500000 },
    ],
  });
});

// GET /reports/performance - パフォーマンスレポート
router.get('/reports/performance', async (_req: Request, res: Response) => {
  res.json({
    overall: {
      onTimeDelivery: 94.5,
      defectRate: 0.5,
      avgLeadTime: 12.5,
    },
    bySupplier: [
      { supplier: 'Seiko Japan', onTimeDelivery: 96.5, defectRate: 0.3, avgLeadTime: 10 },
      { supplier: 'Casio Direct', onTimeDelivery: 95.0, defectRate: 0.4, avgLeadTime: 8 },
      { supplier: 'Orient Supply', onTimeDelivery: 92.0, defectRate: 0.6, avgLeadTime: 14 },
    ],
  });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      defaultPaymentTerms: 'Net 30',
      defaultCurrency: 'JPY',
      autoReorder: false,
      reorderThreshold: 10,
      notifyOnLowStock: true,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

// GET /settings/notifications - 通知設定
router.get('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      onOrderConfirmed: true,
      onShipmentUpdate: true,
      onDelivery: true,
      onInvoice: true,
      digestFrequency: 'daily',
    },
  });
});

// PUT /settings/notifications - 通知設定更新
router.put('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '通知設定を更新しました' });
});

export default router;

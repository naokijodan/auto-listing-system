import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// Phase 189: Supplier Management（サプライヤー管理）
// ========================================

// ----------------------------------------
// ダッシュボード
// ----------------------------------------

// サプライヤーダッシュボード取得
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalSuppliers: 45,
      activeSuppliers: 38,
      totalProducts: 4580,
      pendingOrders: 12,
      lastUpdated: new Date().toISOString(),
    },
    performance: {
      avgLeadTime: 5.2,
      avgQualityScore: 4.5,
      onTimeDeliveryRate: 94.5,
      defectRate: 1.2,
    },
    spending: {
      thisMonth: 125000,
      lastMonth: 118000,
      thisYear: 980000,
      change: 5.9,
    },
    topSuppliers: [
      { id: 'SUP-1001', name: 'Premium Suppliers Inc.', products: 450, spending: 45000, rating: 4.8 },
      { id: 'SUP-1002', name: 'Global Trade Co.', products: 380, spending: 38000, rating: 4.6 },
      { id: 'SUP-1003', name: 'Quality Goods Ltd.', products: 320, spending: 32000, rating: 4.5 },
      { id: 'SUP-1004', name: 'Fast Shipping Partners', products: 280, spending: 28000, rating: 4.4 },
    ],
    recentActivity: [
      { type: 'order_placed', supplierId: 'SUP-1001', amount: 5200, date: new Date().toISOString() },
      { type: 'shipment_received', supplierId: 'SUP-1002', quantity: 500, date: new Date(Date.now() - 86400000).toISOString() },
      { type: 'supplier_added', supplierId: 'SUP-1045', name: 'New Supplier LLC', date: new Date(Date.now() - 172800000).toISOString() },
    ],
    alerts: [
      { type: 'warning', message: '3つの発注が遅延しています' },
      { type: 'info', message: '5つのサプライヤーの評価更新が必要です' },
    ],
  };
  res.json(dashboard);
});

// ----------------------------------------
// サプライヤー管理
// ----------------------------------------

// サプライヤー一覧
router.get('/suppliers', async (req, res) => {
  const { status, rating, search } = req.query;
  const suppliers = Array.from({ length: 20 }, (_, i) => ({
    id: `SUP-${1000 + i}`,
    name: `Supplier ${i + 1}`,
    code: `SP${String(i + 1).padStart(4, '0')}`,
    type: ['manufacturer', 'wholesaler', 'distributor', 'dropshipper'][i % 4],
    country: ['US', 'CN', 'JP', 'DE', 'UK'][i % 5],
    contactName: `Contact ${i + 1}`,
    contactEmail: `contact${i + 1}@supplier.com`,
    products: 50 + i * 10,
    avgLeadTime: 3 + (i % 5),
    rating: 3.5 + (i % 15) / 10,
    status: i % 10 < 8 ? 'active' : i % 10 < 9 ? 'inactive' : 'pending',
    lastOrder: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - i * 86400000 * 30).toISOString(),
  }));
  res.json({
    suppliers,
    total: 45,
    filters: { status, rating, search },
  });
});

// サプライヤー詳細
router.get('/suppliers/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  const supplier = {
    id: supplierId,
    name: 'Premium Suppliers Inc.',
    code: 'SP0001',
    type: 'manufacturer',
    description: '高品質な電子製品を製造するメーカー',
    website: 'https://premiumsuppliers.com',
    address: {
      street: '123 Industrial Way',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
    },
    contacts: [
      { name: 'John Smith', title: 'Sales Manager', email: 'john@premiumsuppliers.com', phone: '+1-555-123-4567', primary: true },
      { name: 'Jane Doe', title: 'Account Manager', email: 'jane@premiumsuppliers.com', phone: '+1-555-234-5678', primary: false },
    ],
    paymentTerms: {
      method: 'net30',
      currency: 'USD',
      creditLimit: 50000,
      currentBalance: 12500,
    },
    performance: {
      rating: 4.8,
      onTimeDelivery: 96.5,
      qualityScore: 4.7,
      responseTime: 2.5,
      defectRate: 0.8,
      totalOrders: 245,
      totalSpending: 580000,
    },
    products: {
      count: 450,
      categories: ['Electronics', 'Accessories', 'Cables'],
      avgCost: 25.50,
    },
    certifications: [
      { name: 'ISO 9001', issueDate: '2024-01-15', expirationDate: '2027-01-15' },
      { name: 'CE Certified', issueDate: '2023-06-01', expirationDate: '2026-06-01' },
    ],
    notes: '優先サプライヤー。大量注文時に5%割引あり。',
    status: 'active',
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2026-02-10T14:00:00Z',
  };
  res.json(supplier);
});

// サプライヤー作成
const supplierSchema = z.object({
  name: z.string(),
  code: z.string().optional(),
  type: z.enum(['manufacturer', 'wholesaler', 'distributor', 'dropshipper']),
  country: z.string(),
  contactName: z.string(),
  contactEmail: z.string().email(),
  website: z.string().optional(),
});

router.post('/suppliers', async (req, res) => {
  const body = supplierSchema.parse(req.body);
  res.status(201).json({
    id: `SUP-${Date.now()}`,
    ...body,
    code: body.code || `SP${Date.now().toString().slice(-6)}`,
    status: 'pending',
    rating: 0,
    products: 0,
    createdAt: new Date().toISOString(),
  });
});

// サプライヤー更新
router.put('/suppliers/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  const body = req.body;
  res.json({
    id: supplierId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// サプライヤー削除
router.delete('/suppliers/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  res.json({ success: true, deletedId: supplierId });
});

// サプライヤー評価
router.post('/suppliers/:supplierId/rate', async (req, res) => {
  const { supplierId } = req.params;
  const { rating, comment, categories } = req.body;
  res.json({
    supplierId,
    rating,
    comment,
    categories,
    ratedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 商品管理
// ----------------------------------------

// サプライヤー商品一覧
router.get('/suppliers/:supplierId/products', async (req, res) => {
  const { supplierId } = req.params;
  const products = Array.from({ length: 20 }, (_, i) => ({
    id: `SPROD-${1000 + i}`,
    supplierId,
    sku: `SP-SKU-${2000 + i}`,
    name: `Supplier Product ${i + 1}`,
    category: ['Electronics', 'Accessories', 'Cables'][i % 3],
    cost: 10.00 + i * 2,
    moq: 10 + (i % 5) * 5,
    leadTime: 3 + (i % 7),
    inStock: true,
    linkedProductId: i % 3 === 0 ? `PROD-${4000 + i}` : null,
    lastOrdered: new Date(Date.now() - i * 86400000 * 5).toISOString(),
  }));
  res.json({
    products,
    total: 450,
    supplierId,
  });
});

// 商品リンク
router.post('/suppliers/:supplierId/products/:productId/link', async (req, res) => {
  const { supplierId, productId } = req.params;
  const { catalogProductId } = req.body;
  res.json({
    supplierId,
    supplierProductId: productId,
    catalogProductId,
    linkedAt: new Date().toISOString(),
  });
});

// 商品リンク解除
router.delete('/suppliers/:supplierId/products/:productId/link', async (req, res) => {
  const { supplierId, productId } = req.params;
  res.json({
    supplierId,
    supplierProductId: productId,
    unlinkedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 発注管理
// ----------------------------------------

// 発注一覧
router.get('/orders', async (req, res) => {
  const { supplierId, status } = req.query;
  const orders = Array.from({ length: 20 }, (_, i) => ({
    id: `PO-${1000 + i}`,
    supplierId: `SUP-${1000 + (i % 5)}`,
    supplierName: `Supplier ${(i % 5) + 1}`,
    orderDate: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    expectedDate: new Date(Date.now() + (10 - i) * 86400000).toISOString(),
    items: 5 + (i % 10),
    totalQuantity: 50 + i * 10,
    totalAmount: 500 + i * 100,
    status: ['draft', 'pending', 'confirmed', 'shipped', 'received', 'cancelled'][i % 6],
    paymentStatus: ['unpaid', 'partial', 'paid'][i % 3],
  }));
  res.json({
    orders,
    total: 85,
    filters: { supplierId, status },
  });
});

// 発注詳細
router.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const order = {
    id: orderId,
    supplierId: 'SUP-1001',
    supplierName: 'Premium Suppliers Inc.',
    orderNumber: 'PO-2026-0001',
    orderDate: '2026-02-10T10:00:00Z',
    expectedDate: '2026-02-20',
    shippingAddress: {
      name: 'Main Warehouse',
      street: '456 Storage Ave',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90002',
      country: 'US',
    },
    items: [
      { productId: 'SPROD-1001', sku: 'SP-SKU-2001', name: 'Product A', quantity: 100, unitCost: 10.00, total: 1000 },
      { productId: 'SPROD-1002', sku: 'SP-SKU-2002', name: 'Product B', quantity: 50, unitCost: 20.00, total: 1000 },
      { productId: 'SPROD-1003', sku: 'SP-SKU-2003', name: 'Product C', quantity: 75, unitCost: 15.00, total: 1125 },
    ],
    subtotal: 3125,
    shipping: 150,
    tax: 0,
    discount: 125,
    total: 3150,
    status: 'confirmed',
    paymentStatus: 'unpaid',
    paymentTerms: 'Net 30',
    notes: '急ぎの注文です',
    timeline: [
      { date: '2026-02-10T10:00:00Z', status: 'created', note: '発注作成' },
      { date: '2026-02-10T14:00:00Z', status: 'sent', note: 'サプライヤーに送信' },
      { date: '2026-02-11T09:00:00Z', status: 'confirmed', note: 'サプライヤーが確認' },
    ],
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-11T09:00:00Z',
  };
  res.json(order);
});

// 発注作成
const orderSchema = z.object({
  supplierId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    unitCost: z.number(),
  })),
  expectedDate: z.string(),
  notes: z.string().optional(),
});

router.post('/orders', async (req, res) => {
  const body = orderSchema.parse(req.body);
  const total = body.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  res.status(201).json({
    id: `PO-${Date.now()}`,
    ...body,
    orderNumber: `PO-2026-${Date.now().toString().slice(-6)}`,
    orderDate: new Date().toISOString(),
    total,
    status: 'draft',
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
  });
});

// 発注更新
router.put('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const body = req.body;
  res.json({
    id: orderId,
    ...body,
    updatedAt: new Date().toISOString(),
  });
});

// 発注ステータス更新
router.patch('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;
  res.json({
    id: orderId,
    status,
    note,
    updatedAt: new Date().toISOString(),
  });
});

// 発注キャンセル
router.post('/orders/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  res.json({
    id: orderId,
    status: 'cancelled',
    reason,
    cancelledAt: new Date().toISOString(),
  });
});

// 発注送信
router.post('/orders/:orderId/send', async (req, res) => {
  const { orderId } = req.params;
  res.json({
    id: orderId,
    status: 'pending',
    sentAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// 入荷管理
// ----------------------------------------

// 入荷一覧
router.get('/receipts', async (req, res) => {
  const { orderId, status } = req.query;
  const receipts = Array.from({ length: 15 }, (_, i) => ({
    id: `RCV-${1000 + i}`,
    orderId: `PO-${1000 + (i % 10)}`,
    supplierId: `SUP-${1000 + (i % 5)}`,
    supplierName: `Supplier ${(i % 5) + 1}`,
    receivedDate: new Date(Date.now() - i * 86400000).toISOString(),
    items: 3 + (i % 5),
    totalQuantity: 100 + i * 20,
    status: ['pending', 'inspecting', 'completed', 'partial'][i % 4],
    qualityIssues: i % 5 === 0 ? 2 : 0,
  }));
  res.json({
    receipts,
    total: 45,
    filters: { orderId, status },
  });
});

// 入荷詳細
router.get('/receipts/:receiptId', async (req, res) => {
  const { receiptId } = req.params;
  const receipt = {
    id: receiptId,
    orderId: 'PO-1001',
    orderNumber: 'PO-2026-0001',
    supplierId: 'SUP-1001',
    supplierName: 'Premium Suppliers Inc.',
    receivedDate: '2026-02-15T10:00:00Z',
    receivedBy: 'John Warehouse',
    items: [
      { productId: 'SPROD-1001', sku: 'SP-SKU-2001', name: 'Product A', ordered: 100, received: 100, accepted: 98, rejected: 2, reason: '破損' },
      { productId: 'SPROD-1002', sku: 'SP-SKU-2002', name: 'Product B', ordered: 50, received: 50, accepted: 50, rejected: 0, reason: null },
      { productId: 'SPROD-1003', sku: 'SP-SKU-2003', name: 'Product C', ordered: 75, received: 75, accepted: 75, rejected: 0, reason: null },
    ],
    totalOrdered: 225,
    totalReceived: 225,
    totalAccepted: 223,
    totalRejected: 2,
    status: 'completed',
    qualityNotes: '2個の破損品あり、交換を依頼',
    attachments: [
      { name: 'receipt-photo-1.jpg', url: '/attachments/rcv-1001-1.jpg' },
    ],
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z',
  };
  res.json(receipt);
});

// 入荷登録
const receiptSchema = z.object({
  orderId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    received: z.number(),
    accepted: z.number(),
    rejected: z.number(),
    reason: z.string().optional(),
  })),
  notes: z.string().optional(),
});

router.post('/receipts', async (req, res) => {
  const body = receiptSchema.parse(req.body);
  res.status(201).json({
    id: `RCV-${Date.now()}`,
    ...body,
    receivedDate: new Date().toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
});

// 入荷検品完了
router.post('/receipts/:receiptId/complete', async (req, res) => {
  const { receiptId } = req.params;
  res.json({
    id: receiptId,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
});

// ----------------------------------------
// レポート
// ----------------------------------------

// サプライヤーレポート
router.get('/reports/suppliers', async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json({
    period: { startDate, endDate },
    summary: {
      totalSuppliers: 45,
      activeSuppliers: 38,
      newSuppliers: 3,
      inactiveSuppliers: 4,
    },
    spending: {
      total: 980000,
      bySupplier: [
        { supplierId: 'SUP-1001', name: 'Premium Suppliers Inc.', amount: 245000, percentage: 25 },
        { supplierId: 'SUP-1002', name: 'Global Trade Co.', amount: 196000, percentage: 20 },
        { supplierId: 'SUP-1003', name: 'Quality Goods Ltd.', amount: 147000, percentage: 15 },
      ],
    },
    performance: {
      avgRating: 4.5,
      avgLeadTime: 5.2,
      onTimeDelivery: 94.5,
      defectRate: 1.2,
    },
  });
});

// 発注レポート
router.get('/reports/orders', async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json({
    period: { startDate, endDate },
    summary: {
      totalOrders: 85,
      totalAmount: 425000,
      avgOrderValue: 5000,
    },
    byStatus: [
      { status: 'completed', count: 62, amount: 310000 },
      { status: 'in_progress', count: 15, amount: 75000 },
      { status: 'cancelled', count: 8, amount: 40000 },
    ],
    trends: Array.from({ length: 12 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orders: 5 + Math.floor(Math.random() * 10),
      amount: 30000 + Math.floor(Math.random() * 20000),
    })),
  });
});

// ----------------------------------------
// 設定
// ----------------------------------------

// サプライヤー設定取得
router.get('/settings', async (_req, res) => {
  const settings = {
    general: {
      defaultPaymentTerms: 'net30',
      defaultCurrency: 'USD',
      autoGenerateCode: true,
      codePrefix: 'SP',
    },
    orders: {
      requireApproval: true,
      approvalThreshold: 5000,
      autoSendOnApproval: true,
      defaultLeadTime: 7,
    },
    receiving: {
      requireInspection: true,
      allowPartialReceiving: true,
      autoUpdateInventory: true,
    },
    notifications: {
      orderConfirmation: true,
      shipmentNotification: true,
      deliveryReminder: true,
      reminderDays: 3,
    },
    evaluation: {
      autoEvaluationEnabled: true,
      evaluationFrequency: 'monthly',
      criteria: ['quality', 'delivery', 'communication', 'pricing'],
    },
  };
  res.json(settings);
});

// サプライヤー設定更新
router.put('/settings', async (req, res) => {
  const settings = req.body;
  res.json({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
});

export const ebaySupplierManagementRouter = router;

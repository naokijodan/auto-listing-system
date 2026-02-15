import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 182: Inventory Hub API
// 在庫ハブ
// ============================================

// --- ダッシュボード ---

// 在庫概要
router.get('/dashboard', async (_req, res) => {
  res.json({
    totalProducts: 1250,
    totalUnits: 8500,
    totalValue: 425000.00,
    lowStock: 45,
    outOfStock: 12,
    overStock: 28,
    pendingRestock: 15,
    warehouses: 3,
    avgTurnover: 4.2,
    healthScore: 85,
  });
});

// 在庫アラートサマリー
router.get('/alerts/summary', async (_req, res) => {
  res.json({
    critical: 12,
    warning: 33,
    info: 18,
    recent: [
      { id: 'alert_1', type: 'out_of_stock', product: 'Vintage Watch A', severity: 'critical', createdAt: '2026-02-15T10:00:00Z' },
      { id: 'alert_2', type: 'low_stock', product: 'Designer Bag B', severity: 'warning', threshold: 5, current: 3, createdAt: '2026-02-15T09:30:00Z' },
      { id: 'alert_3', type: 'overstock', product: 'Antique Vase C', severity: 'info', recommended: 10, current: 35, createdAt: '2026-02-15T09:00:00Z' },
    ],
  });
});

// --- 在庫一覧 ---

// 商品在庫一覧
router.get('/products', async (req, res) => {
  const products = [
    { id: 'prod_1', sku: 'VW-001', title: 'Vintage Watch A', quantity: 0, reserved: 0, available: 0, reorderPoint: 5, warehouse: 'Tokyo', status: 'out_of_stock', value: 5000.00 },
    { id: 'prod_2', sku: 'DB-002', title: 'Designer Bag B', quantity: 3, reserved: 1, available: 2, reorderPoint: 5, warehouse: 'Tokyo', status: 'low_stock', value: 4500.00 },
    { id: 'prod_3', sku: 'AV-003', title: 'Antique Vase C', quantity: 35, reserved: 2, available: 33, reorderPoint: 10, warehouse: 'Osaka', status: 'overstock', value: 21000.00 },
    { id: 'prod_4', sku: 'VC-004', title: 'Vintage Camera D', quantity: 15, reserved: 3, available: 12, reorderPoint: 8, warehouse: 'Tokyo', status: 'normal', value: 4500.00 },
    { id: 'prod_5', sku: 'JW-005', title: 'Jewelry Watch E', quantity: 8, reserved: 0, available: 8, reorderPoint: 5, warehouse: 'Fukuoka', status: 'normal', value: 12000.00 },
  ];

  res.json({ products, total: products.length });
});

// 商品在庫詳細
router.get('/products/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    sku: 'VW-001',
    title: 'Vintage Watch A',
    quantity: 15,
    reserved: 3,
    available: 12,
    reorderPoint: 5,
    maxStock: 30,
    safetyStock: 3,
    leadTime: 7,
    costPrice: 150.00,
    sellingPrice: 299.99,
    totalValue: 4500.00,
    warehouse: {
      id: 'wh_1',
      name: 'Tokyo Warehouse',
      location: 'Tokyo, Japan',
    },
    locations: [
      { zone: 'A', rack: '12', shelf: '3', quantity: 10 },
      { zone: 'B', rack: '5', shelf: '1', quantity: 5 },
    ],
    history: [
      { type: 'sale', quantity: -2, date: '2026-02-15', reference: 'ORD-123' },
      { type: 'restock', quantity: 10, date: '2026-02-10', reference: 'PO-456' },
      { type: 'adjustment', quantity: -1, date: '2026-02-08', reason: 'Damaged' },
    ],
  });
});

// 在庫数量更新
router.put('/products/:id/quantity', async (req, res) => {
  const schema = z.object({
    quantity: z.number(),
    reason: z.string().optional(),
    reference: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: req.params.id,
    previousQuantity: 15,
    newQuantity: data.quantity,
    adjustment: data.quantity - 15,
    reason: data.reason,
    updatedAt: new Date().toISOString(),
  });
});

// --- 倉庫管理 ---

// 倉庫一覧
router.get('/warehouses', async (_req, res) => {
  const warehouses = [
    { id: 'wh_1', name: 'Tokyo Warehouse', location: 'Tokyo, Japan', products: 450, units: 3500, capacity: 5000, utilization: 70, status: 'active' },
    { id: 'wh_2', name: 'Osaka Warehouse', location: 'Osaka, Japan', products: 320, units: 2800, capacity: 4000, utilization: 70, status: 'active' },
    { id: 'wh_3', name: 'Fukuoka Warehouse', location: 'Fukuoka, Japan', products: 180, units: 1200, capacity: 2000, utilization: 60, status: 'active' },
  ];

  res.json({ warehouses, total: warehouses.length });
});

// 倉庫詳細
router.get('/warehouses/:id', async (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Tokyo Warehouse',
    location: 'Tokyo, Japan',
    address: '1-1-1 Shibuya, Shibuya-ku, Tokyo',
    products: 450,
    units: 3500,
    capacity: 5000,
    utilization: 70,
    zones: [
      { id: 'zone_A', name: 'Zone A', racks: 20, products: 200, utilization: 80 },
      { id: 'zone_B', name: 'Zone B', racks: 15, products: 150, utilization: 65 },
      { id: 'zone_C', name: 'Zone C', racks: 10, products: 100, utilization: 55 },
    ],
    status: 'active',
    createdAt: '2025-01-01',
  });
});

// 倉庫作成
router.post('/warehouses', async (req, res) => {
  const schema = z.object({
    name: z.string(),
    location: z.string(),
    address: z.string().optional(),
    capacity: z.number().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `wh_${Date.now()}`,
    ...data,
    products: 0,
    units: 0,
    utilization: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

// 倉庫間移動
router.post('/transfers', async (req, res) => {
  const schema = z.object({
    productId: z.string(),
    fromWarehouse: z.string(),
    toWarehouse: z.string(),
    quantity: z.number(),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `transfer_${Date.now()}`,
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
    estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

// 移動履歴
router.get('/transfers', async (_req, res) => {
  const transfers = [
    { id: 'tr_1', productId: 'prod_1', productTitle: 'Vintage Watch A', from: 'Tokyo', to: 'Osaka', quantity: 5, status: 'completed', createdAt: '2026-02-14' },
    { id: 'tr_2', productId: 'prod_2', productTitle: 'Designer Bag B', from: 'Osaka', to: 'Fukuoka', quantity: 3, status: 'in_transit', createdAt: '2026-02-15' },
  ];

  res.json({ transfers, total: transfers.length });
});

// --- 補充管理 ---

// 補充推奨
router.get('/restock/recommendations', async (_req, res) => {
  const recommendations = [
    { productId: 'prod_1', sku: 'VW-001', title: 'Vintage Watch A', current: 0, reorderPoint: 5, recommended: 20, supplier: 'Supplier A', estimatedCost: 3000.00, priority: 'critical' },
    { productId: 'prod_2', sku: 'DB-002', title: 'Designer Bag B', current: 3, reorderPoint: 5, recommended: 15, supplier: 'Supplier B', estimatedCost: 2250.00, priority: 'high' },
    { productId: 'prod_6', sku: 'LB-006', title: 'Leather Belt F', current: 6, reorderPoint: 10, recommended: 20, supplier: 'Supplier A', estimatedCost: 400.00, priority: 'medium' },
  ];

  res.json({ recommendations, total: recommendations.length });
});

// 発注書作成
router.post('/restock/orders', async (req, res) => {
  const schema = z.object({
    supplierId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
    })),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `po_${Date.now()}`,
    supplierId: data.supplierId,
    items: data.items,
    totalAmount: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    status: 'draft',
    createdAt: new Date().toISOString(),
  });
});

// 発注書一覧
router.get('/restock/orders', async (_req, res) => {
  const orders = [
    { id: 'po_1', supplier: 'Supplier A', items: 5, totalAmount: 5250.00, status: 'pending', createdAt: '2026-02-15', expectedDelivery: '2026-02-22' },
    { id: 'po_2', supplier: 'Supplier B', items: 3, totalAmount: 3800.00, status: 'shipped', createdAt: '2026-02-12', expectedDelivery: '2026-02-17' },
    { id: 'po_3', supplier: 'Supplier A', items: 8, totalAmount: 8500.00, status: 'delivered', createdAt: '2026-02-05', deliveredAt: '2026-02-10' },
  ];

  res.json({ orders, total: orders.length });
});

// 入荷処理
router.post('/restock/receive', async (req, res) => {
  const schema = z.object({
    orderId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      receivedQuantity: z.number(),
      condition: z.enum(['good', 'damaged', 'partial']).optional(),
    })),
    warehouseId: z.string(),
  });

  const data = schema.parse(req.body);

  res.json({
    orderId: data.orderId,
    receivedAt: new Date().toISOString(),
    items: data.items,
    status: 'received',
  });
});

// --- 棚卸 ---

// 棚卸開始
router.post('/stocktake', async (req, res) => {
  const schema = z.object({
    warehouseId: z.string(),
    type: z.enum(['full', 'partial', 'cycle']),
    zones: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `st_${Date.now()}`,
    warehouseId: data.warehouseId,
    type: data.type,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    expectedProducts: 150,
    countedProducts: 0,
  });
});

// 棚卸カウント登録
router.post('/stocktake/:id/count', async (req, res) => {
  const schema = z.object({
    productId: z.string(),
    countedQuantity: z.number(),
    location: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    stocktakeId: req.params.id,
    productId: data.productId,
    systemQuantity: 15,
    countedQuantity: data.countedQuantity,
    variance: data.countedQuantity - 15,
    recordedAt: new Date().toISOString(),
  });
});

// 棚卸完了
router.post('/stocktake/:id/complete', async (req, res) => {
  const schema = z.object({
    adjustInventory: z.boolean(),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    stocktakeId: req.params.id,
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary: {
      totalProducts: 150,
      matched: 140,
      variance: 10,
      adjustmentsApplied: data.adjustInventory,
    },
  });
});

// 棚卸履歴
router.get('/stocktake/history', async (_req, res) => {
  const history = [
    { id: 'st_1', warehouse: 'Tokyo', type: 'full', status: 'completed', products: 450, variance: 12, completedAt: '2026-02-01' },
    { id: 'st_2', warehouse: 'Osaka', type: 'cycle', status: 'completed', products: 50, variance: 2, completedAt: '2026-02-10' },
  ];

  res.json({ history, total: history.length });
});

// --- レポート ---

// 在庫レポート
router.get('/reports/inventory', async (req, res) => {
  res.json({
    summary: {
      totalProducts: 1250,
      totalUnits: 8500,
      totalValue: 425000.00,
      avgValue: 340.00,
    },
    byStatus: [
      { status: 'normal', products: 1165, units: 7500, percentage: 93.2 },
      { status: 'low_stock', products: 45, units: 180, percentage: 3.6 },
      { status: 'out_of_stock', products: 12, units: 0, percentage: 0.96 },
      { status: 'overstock', products: 28, units: 820, percentage: 2.24 },
    ],
    byWarehouse: [
      { warehouse: 'Tokyo', products: 450, units: 3500, value: 175000.00 },
      { warehouse: 'Osaka', products: 320, units: 2800, value: 140000.00 },
      { warehouse: 'Fukuoka', products: 180, units: 1200, value: 60000.00 },
    ],
    byCategory: [
      { category: 'Watches', products: 250, units: 1800, value: 150000.00 },
      { category: 'Bags', products: 180, units: 1200, value: 85000.00 },
      { category: 'Jewelry', products: 150, units: 900, value: 95000.00 },
    ],
  });
});

// 在庫回転率レポート
router.get('/reports/turnover', async (req, res) => {
  res.json({
    overall: {
      turnoverRate: 4.2,
      avgDaysToSell: 87,
    },
    byCategory: [
      { category: 'Watches', turnoverRate: 5.2, avgDaysToSell: 70 },
      { category: 'Bags', turnoverRate: 4.8, avgDaysToSell: 76 },
      { category: 'Jewelry', turnoverRate: 3.5, avgDaysToSell: 104 },
    ],
    trends: [
      { month: '2026-02', turnoverRate: 4.2 },
      { month: '2026-01', turnoverRate: 4.0 },
      { month: '2025-12', turnoverRate: 5.1 },
    ],
  });
});

// --- 設定 ---

// 在庫設定
router.get('/settings', async (_req, res) => {
  res.json({
    alerts: {
      lowStockThreshold: 5,
      criticalStockThreshold: 2,
      overstockThreshold: 150,
      emailNotifications: true,
      pushNotifications: true,
    },
    reorder: {
      autoReorder: false,
      defaultLeadTime: 7,
      safetyStockDays: 3,
    },
    tracking: {
      trackByLocation: true,
      requireBatchNumber: false,
      requireSerialNumber: false,
    },
    valuation: {
      method: 'fifo',
      currency: 'USD',
    },
  });
});

// 設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    alerts: z.object({
      lowStockThreshold: z.number(),
      criticalStockThreshold: z.number(),
      overstockThreshold: z.number(),
      emailNotifications: z.boolean(),
      pushNotifications: z.boolean(),
    }).optional(),
    reorder: z.object({
      autoReorder: z.boolean(),
      defaultLeadTime: z.number(),
      safetyStockDays: z.number(),
    }).optional(),
    tracking: z.object({
      trackByLocation: z.boolean(),
      requireBatchNumber: z.boolean(),
      requireSerialNumber: z.boolean(),
    }).optional(),
    valuation: z.object({
      method: z.enum(['fifo', 'lifo', 'average']),
      currency: z.string(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayInventoryHubRouter = router;

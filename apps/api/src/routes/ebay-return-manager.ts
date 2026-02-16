import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 287: eBay Return Manager（返品管理）
// 28エンドポイント - テーマカラー: purple-600
// =============================================================

// スキーマ
const returnRequestSchema = z.object({
  orderId: z.string(),
  reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER']),
  description: z.string().optional(),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalReturns: 150,
    pendingReturns: 12,
    returnRate: 2.5,
    avgResolutionTime: 3.2,
    refundsIssued: 4500,
    customerSatisfaction: 92,
  });
});

router.get('/dashboard/by-reason', async (req: Request, res: Response) => {
  res.json({
    reasons: [
      { reason: 'DEFECTIVE', count: 45, percent: 30 },
      { reason: 'WRONG_ITEM', count: 30, percent: 20 },
      { reason: 'NOT_AS_DESCRIBED', count: 45, percent: 30 },
      { reason: 'CHANGED_MIND', count: 22, percent: 15 },
      { reason: 'OTHER', count: 8, percent: 5 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'overdue', message: '4件返品処理期限超過', severity: 'high' },
      { id: '2', type: 'high_rate', message: 'SKU005の返品率が高い', severity: 'warning' },
      { id: '3', type: 'approval_needed', message: '3件の返品れ承認待ち', severity: 'info' },
    ],
  });
});

// ========== 返品管理 ==========
router.get('/returns', async (req: Request, res: Response) => {
  res.json({
    returns: [
      { id: 'r1', orderId: 'ORD001', sku: 'SKU001', reason: 'DEFECTIVE', status: 'PENDING', createdAt: '2026-02-15' },
      { id: 'r2', orderId: 'ORD002', sku: 'SKU002', reason: 'WRONG_ITEM', status: 'APPROVED', createdAt: '2026-02-14' },
      { id: 'r3', orderId: 'ORD003', sku: 'SKU003', reason: 'CHANGED_MIND', status: 'RECEIVED', createdAt: '2026-02-13' },
    ],
    total: 150,
  });
});

router.post('/returns', async (req: Request, res: Response) => {
  const parsed = returnRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid return request', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `return_${Date.now()}`,
    ...parsed.data,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });
});

router.get('/returns/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    orderId: 'ORD001',
    sku: 'SKU001',
    title: 'Seiko 5 Sports',
    reason: 'DEFECTIVE',
    description: 'Watch stopped working after 2 days',
    status: 'PENDING',
    originalPrice: 200,
    refundAmount: null,
    trackingNumber: null,
    createdAt: '2026-02-15T10:00:00Z',
    timeline: [
      { action: 'REQUESTED', timestamp: '2026-02-15T10:00:00Z' },
    ],
  });
});

router.put('/returns/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.post('/returns/:id/approve', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'APPROVED',
    approvedAt: new Date().toISOString(),
    returnLabel: 'https://labels.example.com/return123.pdf',
  });
});

router.post('/returns/:id/reject', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'REJECTED',
    reason: req.body.reason,
    rejectedAt: new Date().toISOString(),
  });
});

router.post('/returns/:id/receive', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'RECEIVED',
    condition: req.body.condition,
    receivedAt: new Date().toISOString(),
  });
});

router.post('/returns/:id/refund', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'REFUNDED',
    refundAmount: req.body.amount,
    refundedAt: new Date().toISOString(),
  });
});

// ========== ポリシー ==========
router.get('/policies', async (req: Request, res: Response) => {
  res.json({
    policies: [
      { id: 'p1', name: 'Standard 30-day', days: 30, restockFee: 0, isDefault: true },
      { id: 'p2', name: 'Extended 60-day', days: 60, restockFee: 10, isDefault: false },
      { id: 'p3', name: 'No Returns', days: 0, restockFee: 0, isDefault: false },
    ],
    total: 3,
  });
});

router.get('/policies/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Standard 30-day',
    days: 30,
    restockFee: 0,
    shippingPaidBy: 'SELLER',
    conditions: ['Unused', 'Original packaging'],
    exclusions: ['Final sale items'],
    productsApplied: 500,
  });
});

router.post('/policies', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `policy_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  });
});

router.put('/policies/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

// ========== 分析 ==========
router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    trends: [
      { date: '2026-02-10', returns: 8, refunds: 250 },
      { date: '2026-02-13', returns: 5, refunds: 150 },
      { date: '2026-02-16', returns: 6, refunds: 180 },
    ],
    avgReturnsPerDay: 5,
  });
});

router.get('/analytics/products', async (req: Request, res: Response) => {
  res.json({
    topReturned: [
      { sku: 'SKU005', title: 'Casio G-Shock', returns: 15, rate: 8.5 },
      { sku: 'SKU012', title: 'Tissot PRX', returns: 10, rate: 5.2 },
      { sku: 'SKU008', title: 'Orient Kamasu', returns: 8, rate: 4.0 },
    ],
  });
});

router.get('/analytics/cost', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalRefunds: 4500,
    shippingCosts: 350,
    restockingFeesCollected: 120,
    netLoss: 4730,
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalReturns: 150,
    approved: 120,
    rejected: 15,
    pending: 15,
    avgResolutionTime: 3.2,
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-return-manager/reports/download/returns_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 设定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    autoApproveEnabled: true,
    autoApproveThreshold: 50,
    defaultPolicyId: 'p1',
    notifyOnReturn: true,
    notifyOnReceive: true,
    requirePhotos: false,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
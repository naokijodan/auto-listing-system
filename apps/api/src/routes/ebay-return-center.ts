import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ===== ダッシュボード =====

// 返品ダッシュボード概要
router.get('/dashboard', async (_req, res) => {
  const dashboard = {
    overview: {
      totalReturns: 156,
      pendingReturns: 23,
      processingReturns: 12,
      completedReturns: 121,
      returnRate: 2.8,
      avgProcessingDays: 3.2,
    },
    byStatus: [
      { status: 'pending', count: 23, percentage: 14.7 },
      { status: 'approved', count: 8, percentage: 5.1 },
      { status: 'shipped', count: 12, percentage: 7.7 },
      { status: 'received', count: 15, percentage: 9.6 },
      { status: 'refunded', count: 98, percentage: 62.8 },
    ],
    byReason: [
      { reason: 'not_as_described', count: 52, percentage: 33.3 },
      { reason: 'defective', count: 38, percentage: 24.4 },
      { reason: 'changed_mind', count: 31, percentage: 19.9 },
      { reason: 'wrong_item', count: 22, percentage: 14.1 },
      { reason: 'other', count: 13, percentage: 8.3 },
    ],
    recentReturns: [
      { id: 'ret-001', orderId: 'ord-123', product: 'Sony WH-1000XM5', status: 'pending', amount: 299.99, createdAt: '2026-02-16' },
      { id: 'ret-002', orderId: 'ord-124', product: 'Apple AirPods Pro', status: 'approved', amount: 249.99, createdAt: '2026-02-15' },
    ],
  };
  res.json(dashboard);
});

// 返品トレンド
router.get('/dashboard/trends', async (req, res) => {
  const { period = '30d' } = req.query;
  const trends = {
    period,
    data: [
      { date: '2026-02-01', returns: 5, refunds: 4, disputes: 1 },
      { date: '2026-02-08', returns: 8, refunds: 6, disputes: 0 },
      { date: '2026-02-15', returns: 6, refunds: 5, disputes: 2 },
    ],
    comparison: {
      returns: { current: 19, previous: 22, change: -13.6 },
      refunds: { current: 15, previous: 18, change: -16.7 },
      disputes: { current: 3, previous: 5, change: -40.0 },
    },
  };
  res.json(trends);
});

// 財務インパクト
router.get('/dashboard/financial-impact', async (_req, res) => {
  const impact = {
    totalRefunds: 4567.89,
    avgRefundAmount: 45.23,
    restockingFees: 234.56,
    shippingCosts: 123.45,
    netLoss: 4209.88,
    byCategory: [
      { category: 'Electronics', refunds: 2345.67, count: 28 },
      { category: 'Clothing', refunds: 1234.56, count: 42 },
      { category: 'Home', refunds: 987.66, count: 31 },
    ],
  };
  res.json(impact);
});

// ===== 返品管理 =====

// 返品一覧
router.get('/returns', async (req, res) => {
  const { status, reason, page = 1, limit = 20 } = req.query;
  const returns = {
    items: [
      {
        id: 'ret-001',
        orderId: 'ord-123',
        orderNumber: 'ORD-2026-0123',
        product: { id: 'prod-001', title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5', image: '/images/headphones.jpg' },
        buyer: { id: 'buyer-001', username: 'audiophile123', email: 'buyer@example.com' },
        reason: 'not_as_described',
        reasonDetail: 'Color differs from listing photos',
        status: 'pending',
        amount: 299.99,
        shippingPaid: 'seller',
        returnLabel: null,
        trackingNumber: null,
        requestedAt: '2026-02-15T10:00:00Z',
        approvedAt: null,
        receivedAt: null,
        refundedAt: null,
      },
    ],
    total: 156,
    page: Number(page),
    limit: Number(limit),
    filters: { status, reason },
  };
  res.json(returns);
});

// 返品詳細
router.get('/returns/:id', async (req, res) => {
  const { id } = req.params;
  const returnItem = {
    id,
    orderId: 'ord-123',
    orderNumber: 'ORD-2026-0123',
    product: { id: 'prod-001', title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5', image: '/images/headphones.jpg', price: 299.99 },
    buyer: { id: 'buyer-001', username: 'audiophile123', email: 'buyer@example.com', totalOrders: 5, returnRate: 10.0 },
    reason: 'not_as_described',
    reasonDetail: 'Color differs from listing photos',
    buyerPhotos: ['/images/return-photo-1.jpg', '/images/return-photo-2.jpg'],
    status: 'pending',
    timeline: [
      { event: 'return_requested', date: '2026-02-15T10:00:00Z', note: 'Buyer requested return' },
    ],
    suggestedAction: 'approve',
    suggestedReason: 'First return from this buyer, valid reason',
  };
  res.json(returnItem);
});

// 返品承認
const approveReturnSchema = z.object({
  returnLabel: z.boolean().optional(),
  shippingPaidBy: z.enum(['buyer', 'seller']).optional(),
  note: z.string().optional(),
});

router.post('/returns/:id/approve', async (req, res) => {
  const { id } = req.params;
  const data = approveReturnSchema.parse(req.body);
  res.json({ success: true, returnId: id, status: 'approved', ...data });
});

// 返品拒否
const rejectReturnSchema = z.object({
  reason: z.string(),
  escalateToEbay: z.boolean().optional(),
});

router.post('/returns/:id/reject', async (req, res) => {
  const { id } = req.params;
  const data = rejectReturnSchema.parse(req.body);
  res.json({ success: true, returnId: id, status: 'rejected', ...data });
});

// 返品受領確認
const receiveReturnSchema = z.object({
  condition: z.enum(['as_expected', 'damaged', 'wrong_item', 'missing_parts']),
  photos: z.array(z.string()).optional(),
  note: z.string().optional(),
});

router.post('/returns/:id/receive', async (req, res) => {
  const { id } = req.params;
  const data = receiveReturnSchema.parse(req.body);
  res.json({ success: true, returnId: id, status: 'received', receivedAt: new Date().toISOString(), ...data });
});

// 一括返品処理
const bulkReturnSchema = z.object({
  returnIds: z.array(z.string()),
  action: z.enum(['approve', 'reject', 'receive']),
  params: z.record(z.unknown()).optional(),
});

router.post('/returns/bulk', async (req, res) => {
  const data = bulkReturnSchema.parse(req.body);
  res.json({ success: true, processed: data.returnIds.length, action: data.action });
});

// ===== 返金管理 =====

// 返金一覧
router.get('/refunds', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const refunds = {
    items: [
      {
        id: 'ref-001',
        returnId: 'ret-001',
        orderId: 'ord-123',
        type: 'full',
        amount: 299.99,
        method: 'original_payment',
        status: 'pending',
        reason: 'return_received',
        initiatedAt: '2026-02-16T10:00:00Z',
        completedAt: null,
      },
    ],
    total: 98,
    page: Number(page),
    limit: Number(limit),
    filters: { status, type },
  };
  res.json(refunds);
});

// 返金実行
const processRefundSchema = z.object({
  returnId: z.string(),
  type: z.enum(['full', 'partial']),
  amount: z.number().optional(),
  restockingFee: z.number().optional(),
  shippingRefund: z.boolean().optional(),
  note: z.string().optional(),
});

router.post('/refunds', async (req, res) => {
  const data = processRefundSchema.parse(req.body);
  res.json({
    success: true,
    refundId: `ref-${Date.now()}`,
    status: 'processing',
    ...data,
  });
});

// 返金詳細
router.get('/refunds/:id', async (req, res) => {
  const { id } = req.params;
  const refund = {
    id,
    returnId: 'ret-001',
    orderId: 'ord-123',
    orderNumber: 'ORD-2026-0123',
    product: { title: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5' },
    buyer: { username: 'audiophile123' },
    type: 'full',
    originalAmount: 299.99,
    refundAmount: 299.99,
    restockingFee: 0,
    shippingRefund: true,
    method: 'original_payment',
    status: 'completed',
    initiatedAt: '2026-02-16T10:00:00Z',
    completedAt: '2026-02-16T10:05:00Z',
    transactionId: 'txn-12345',
  };
  res.json(refund);
});

// ===== 紛争管理 =====

// 紛争一覧
router.get('/disputes', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const disputes = {
    items: [
      {
        id: 'disp-001',
        orderId: 'ord-125',
        type: 'item_not_received',
        status: 'open',
        escalatedToEbay: false,
        buyerClaim: 'Item not received after 2 weeks',
        sellerResponse: null,
        deadline: '2026-02-20T23:59:59Z',
        amount: 149.99,
        openedAt: '2026-02-14T10:00:00Z',
      },
    ],
    total: 8,
    page: Number(page),
    limit: Number(limit),
    filters: { status, type },
  };
  res.json(disputes);
});

// 紛争詳細
router.get('/disputes/:id', async (req, res) => {
  const { id } = req.params;
  const dispute = {
    id,
    orderId: 'ord-125',
    orderNumber: 'ORD-2026-0125',
    product: { title: 'Vintage Camera', sku: 'CAM-VTG-001' },
    buyer: { username: 'collector99', totalOrders: 12, disputeRate: 8.3 },
    type: 'item_not_received',
    status: 'open',
    timeline: [
      { event: 'dispute_opened', date: '2026-02-14T10:00:00Z', actor: 'buyer', note: 'Item not received after 2 weeks' },
    ],
    evidence: {
      tracking: { carrier: 'USPS', number: '9400111899223456789012', status: 'in_transit', lastUpdate: '2026-02-13' },
      deliveryConfirmation: false,
      buyerMessages: ['When will I receive my item?', 'It has been 2 weeks now'],
    },
    suggestedAction: 'provide_tracking',
    deadline: '2026-02-20T23:59:59Z',
  };
  res.json(dispute);
});

// 紛争に応答
const respondDisputeSchema = z.object({
  response: z.string(),
  evidence: z.array(z.string()).optional(),
  offerRefund: z.boolean().optional(),
  refundAmount: z.number().optional(),
});

router.post('/disputes/:id/respond', async (req, res) => {
  const { id } = req.params;
  const data = respondDisputeSchema.parse(req.body);
  res.json({ success: true, disputeId: id, status: 'responded', ...data });
});

// 紛争をエスカレート
router.post('/disputes/:id/escalate', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, disputeId: id, status: 'escalated_to_ebay', escalatedAt: new Date().toISOString() });
});

// ===== クレーム管理 =====

// クレーム一覧
router.get('/claims', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const claims = {
    items: [
      {
        id: 'clm-001',
        orderId: 'ord-126',
        type: 'money_back_guarantee',
        status: 'open',
        amount: 89.99,
        buyerReason: 'Item significantly not as described',
        ebayDecision: null,
        openedAt: '2026-02-15T10:00:00Z',
        deadline: '2026-02-22T23:59:59Z',
      },
    ],
    total: 3,
    page: Number(page),
    limit: Number(limit),
    filters: { status, type },
  };
  res.json(claims);
});

// クレーム詳細
router.get('/claims/:id', async (req, res) => {
  const { id } = req.params;
  const claim = {
    id,
    orderId: 'ord-126',
    orderNumber: 'ORD-2026-0126',
    type: 'money_back_guarantee',
    status: 'open',
    amount: 89.99,
    product: { title: 'Designer Sunglasses', sku: 'SUN-DSG-001' },
    buyer: { username: 'fashionista22' },
    timeline: [
      { event: 'claim_opened', date: '2026-02-15T10:00:00Z', actor: 'ebay' },
    ],
    evidence: {
      buyerPhotos: ['/images/claim-photo-1.jpg'],
      listingPhotos: ['/images/listing-photo-1.jpg'],
      messages: ['The sunglasses look different from the listing'],
    },
    sellerOptions: ['accept_return', 'offer_partial_refund', 'provide_evidence'],
    deadline: '2026-02-22T23:59:59Z',
  };
  res.json(claim);
});

// クレームに応答
const respondClaimSchema = z.object({
  action: z.enum(['accept', 'counter', 'provide_evidence']),
  counterOffer: z.number().optional(),
  evidence: z.array(z.string()).optional(),
  note: z.string().optional(),
});

router.post('/claims/:id/respond', async (req, res) => {
  const { id } = req.params;
  const data = respondClaimSchema.parse(req.body);
  res.json({ success: true, claimId: id, action: data.action, respondedAt: new Date().toISOString() });
});

// ===== 自動化ルール =====

// ルール一覧
router.get('/automation/rules', async (_req, res) => {
  const rules = [
    {
      id: 'rule-001',
      name: 'Auto-approve first-time returns',
      type: 'auto_approve',
      conditions: { buyerReturnCount: { max: 0 }, returnReason: ['changed_mind'] },
      actions: { approve: true, shippingPaidBy: 'buyer' },
      enabled: true,
      stats: { triggered: 45, lastTriggered: '2026-02-15T10:00:00Z' },
    },
    {
      id: 'rule-002',
      name: 'Flag high-value returns',
      type: 'flag_review',
      conditions: { amount: { min: 200 } },
      actions: { flag: true, assignTo: 'returns_team' },
      enabled: true,
      stats: { triggered: 12, lastTriggered: '2026-02-14T15:00:00Z' },
    },
  ];
  res.json(rules);
});

// ルール作成
const createRuleSchema = z.object({
  name: z.string(),
  type: z.enum(['auto_approve', 'auto_reject', 'flag_review', 'auto_refund']),
  conditions: z.record(z.unknown()),
  actions: z.record(z.unknown()),
  enabled: z.boolean().optional(),
});

router.post('/automation/rules', async (req, res) => {
  const data = createRuleSchema.parse(req.body);
  res.json({ success: true, ruleId: `rule-${Date.now()}`, ...data });
});

// ルール更新
router.put('/automation/rules/:id', async (req, res) => {
  const { id } = req.params;
  const data = createRuleSchema.partial().parse(req.body);
  res.json({ success: true, ruleId: id, ...data });
});

// ルール削除
router.delete('/automation/rules/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, ruleId: id, deleted: true });
});

// ===== 設定 =====

// 一般設定取得
router.get('/settings/general', async (_req, res) => {
  const settings = {
    returnPolicy: {
      acceptReturns: true,
      returnWindow: 30,
      restockingFee: 15,
      shippingPaidBy: 'buyer',
      excludedCategories: ['digital_goods', 'custom_items'],
    },
    autoProcess: {
      autoApproveFirstTime: true,
      autoApproveUnder: 50,
      autoRefundAfterDays: 3,
    },
    notifications: {
      newReturn: true,
      disputeOpened: true,
      claimFiled: true,
      deadlineReminder: true,
      reminderDaysBefore: 2,
    },
  };
  res.json(settings);
});

// 一般設定更新
router.put('/settings/general', async (req, res) => {
  const settings = req.body;
  res.json({ success: true, settings });
});

// 返品ポリシー設定
router.get('/settings/policies', async (_req, res) => {
  const policies = {
    categories: [
      { categoryId: 'cat-001', name: 'Electronics', returnWindow: 30, restockingFee: 0 },
      { categoryId: 'cat-002', name: 'Clothing', returnWindow: 60, restockingFee: 0 },
      { categoryId: 'cat-003', name: 'Collectibles', returnWindow: 14, restockingFee: 20 },
    ],
    international: {
      acceptReturns: true,
      returnWindow: 60,
      shippingPaidBy: 'buyer',
    },
    holidayExtension: {
      enabled: true,
      extendDays: 30,
      startDate: '2025-11-01',
      endDate: '2026-01-15',
    },
  };
  res.json(policies);
});

// 返品ポリシー更新
router.put('/settings/policies', async (req, res) => {
  const policies = req.body;
  res.json({ success: true, policies });
});

export const ebayReturnCenterRouter = router;

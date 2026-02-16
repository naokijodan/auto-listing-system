import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 255: Supplier Invoice Manager（仕入れ請求書管理）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - 概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalInvoices: 450,
    pendingPayment: 28,
    overdueInvoices: 5,
    monthlyPayments: 4500000,
    outstandingBalance: 1250000,
    paidThisMonth: 3200000,
    avgPaymentTime: '12.5 days',
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/upcoming - 支払い予定
router.get('/dashboard/upcoming', async (_req: Request, res: Response) => {
  res.json({
    payments: [
      { id: 'inv_001', supplier: 'Tokyo Watches', amount: 450000, dueDate: '2026-02-20', daysUntil: 4 },
      { id: 'inv_002', supplier: 'Casio Direct', amount: 320000, dueDate: '2026-02-22', daysUntil: 6 },
      { id: 'inv_003', supplier: 'Orient Store', amount: 180000, dueDate: '2026-02-25', daysUntil: 9 },
    ],
  });
});

// GET /dashboard/overdue - 延滞請求書
router.get('/dashboard/overdue', async (_req: Request, res: Response) => {
  res.json({
    invoices: [
      { id: 'inv_010', supplier: 'Shenzhen Parts', amount: 85000, dueDate: '2026-02-10', daysOverdue: 6, status: 'overdue' },
      { id: 'inv_011', supplier: 'Osaka Electronics', amount: 120000, dueDate: '2026-02-08', daysOverdue: 8, status: 'overdue' },
    ],
  });
});

// --- 請求書管理 ---

// GET /invoices - 請求書一覧
router.get('/invoices', async (req: Request, res: Response) => {
  res.json({
    invoices: [
      { id: 'inv_001', number: 'INV-2026-0145', supplier: 'Tokyo Watches', amount: 450000, issued: '2026-02-10', due: '2026-02-20', status: 'pending' },
      { id: 'inv_002', number: 'INV-2026-0146', supplier: 'Casio Direct', amount: 320000, issued: '2026-02-12', due: '2026-02-22', status: 'pending' },
      { id: 'inv_003', number: 'INV-2026-0140', supplier: 'Orient Store', amount: 280000, issued: '2026-02-05', due: '2026-02-15', status: 'paid', paidAt: '2026-02-14' },
    ],
    total: 450,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
});

// GET /invoices/:id - 請求書詳細
router.get('/invoices/:id', async (req: Request, res: Response) => {
  res.json({
    invoice: {
      id: req.params.id,
      number: 'INV-2026-0145',
      supplier: {
        id: 'sup_001',
        name: 'Tokyo Watches',
        bankAccount: '三菱UFJ銀行 渋谷支店 1234567',
        paymentTerms: 'Net 30',
      },
      items: [
        { product: 'Seiko SBDC089', sku: 'TW-SBDC089', quantity: 10, unitPrice: 25000, total: 250000 },
        { product: 'Seiko Presage', sku: 'TW-PRESAGE', quantity: 5, unitPrice: 35000, total: 175000 },
        { product: 'Shipping', quantity: 1, unitPrice: 2500, total: 2500 },
      ],
      subtotal: 427500,
      tax: 42750,
      total: 470250,
      currency: 'JPY',
      issued: '2026-02-10',
      due: '2026-02-20',
      status: 'pending',
      notes: 'Monthly order - February 2026',
      attachments: [
        { name: 'invoice.pdf', url: '/uploads/inv_001.pdf', size: '125KB' },
      ],
      purchaseOrders: ['PO-2026-0085', 'PO-2026-0086'],
    },
  });
});

// POST /invoices - 請求書作成
router.post('/invoices', async (_req: Request, res: Response) => {
  res.json({ success: true, invoiceId: 'inv_004', message: '請求書を作成しました' });
});

// PUT /invoices/:id - 請求書更新
router.put('/invoices/:id', async (req: Request, res: Response) => {
  res.json({ success: true, invoiceId: req.params.id, message: '請求書を更新しました' });
});

// DELETE /invoices/:id - 請求書削除
router.delete('/invoices/:id', async (req: Request, res: Response) => {
  res.json({ success: true, invoiceId: req.params.id, message: '請求書を削除しました' });
});

// POST /invoices/:id/pay - 支払い処理
router.post('/invoices/:id/pay', async (req: Request, res: Response) => {
  res.json({ success: true, invoiceId: req.params.id, paymentId: 'pay_001', message: '支払いを処理しました' });
});

// POST /invoices/:id/approve - 承認
router.post('/invoices/:id/approve', async (req: Request, res: Response) => {
  res.json({ success: true, invoiceId: req.params.id, message: '請求書を承認しました' });
});

// POST /invoices/upload - 請求書アップロード（OCR）
router.post('/invoices/upload', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    extracted: {
      supplier: 'Tokyo Watches',
      invoiceNumber: 'INV-2026-0147',
      amount: 385000,
      dueDate: '2026-02-28',
      items: [
        { product: 'Seiko SBDC089', quantity: 8, unitPrice: 25000 },
        { product: 'Seiko 5 Sports', quantity: 10, unitPrice: 15000 },
      ],
    },
    message: '請求書を解析しました。確認してください。',
  });
});

// --- 支払い管理 ---

// GET /payments - 支払い履歴
router.get('/payments', async (req: Request, res: Response) => {
  res.json({
    payments: [
      { id: 'pay_001', invoice: 'INV-2026-0140', supplier: 'Orient Store', amount: 280000, method: 'bank_transfer', status: 'completed', paidAt: '2026-02-14' },
      { id: 'pay_002', invoice: 'INV-2026-0138', supplier: 'Tokyo Watches', amount: 520000, method: 'bank_transfer', status: 'completed', paidAt: '2026-02-10' },
      { id: 'pay_003', invoice: 'INV-2026-0135', supplier: 'Casio Direct', amount: 380000, method: 'credit_card', status: 'completed', paidAt: '2026-02-08' },
    ],
    total: 285,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
});

// GET /payments/:id - 支払い詳細
router.get('/payments/:id', async (req: Request, res: Response) => {
  res.json({
    payment: {
      id: req.params.id,
      invoice: {
        id: 'inv_003',
        number: 'INV-2026-0140',
        supplier: 'Orient Store',
        amount: 280000,
      },
      method: 'bank_transfer',
      bankAccount: {
        bank: 'りそな銀行',
        branch: '新宿支店',
        accountNumber: '7654321',
        accountName: 'オリエント時計株式会社',
      },
      amount: 280000,
      reference: 'TRF-20260214-001',
      status: 'completed',
      paidAt: '2026-02-14 14:30:00',
      confirmedAt: '2026-02-14 15:45:00',
    },
  });
});

// POST /payments/batch - 一括支払い
router.post('/payments/batch', async (_req: Request, res: Response) => {
  res.json({ success: true, processed: 5, totalAmount: 1250000, message: '一括支払いを処理しました' });
});

// --- サプライヤー別 ---

// GET /suppliers - サプライヤー別サマリー
router.get('/suppliers', async (_req: Request, res: Response) => {
  res.json({
    suppliers: [
      { id: 'sup_001', name: 'Tokyo Watches', totalInvoices: 45, outstanding: 450000, paid: 2850000, avgPaymentDays: 12 },
      { id: 'sup_002', name: 'Casio Direct', totalInvoices: 38, outstanding: 320000, paid: 2100000, avgPaymentDays: 10 },
      { id: 'sup_003', name: 'Orient Store', totalInvoices: 25, outstanding: 180000, paid: 1450000, avgPaymentDays: 14 },
    ],
  });
});

// GET /suppliers/:id - サプライヤー詳細
router.get('/suppliers/:id', async (req: Request, res: Response) => {
  res.json({
    supplier: {
      id: req.params.id,
      name: 'Tokyo Watches',
      paymentTerms: 'Net 30',
      bankDetails: {
        bank: '三菱UFJ銀行',
        branch: '渋谷支店',
        accountNumber: '1234567',
        accountName: '東京時計株式会社',
      },
      statistics: {
        totalInvoices: 45,
        outstanding: 450000,
        paid: 2850000,
        avgPaymentDays: 12,
        onTimeRate: 95.5,
      },
      recentInvoices: [
        { id: 'inv_001', number: 'INV-2026-0145', amount: 450000, status: 'pending' },
        { id: 'inv_005', number: 'INV-2026-0138', amount: 520000, status: 'paid' },
      ],
    },
  });
});

// --- 分析 ---

// GET /analytics/cashflow - キャッシュフロー分析
router.get('/analytics/cashflow', async (_req: Request, res: Response) => {
  res.json({
    forecast: [
      { week: '2026-W08', outgoing: 1250000, balance: 2850000 },
      { week: '2026-W09', outgoing: 850000, balance: 2000000 },
      { week: '2026-W10', outgoing: 1500000, balance: 500000 },
      { week: '2026-W11', outgoing: 600000, balance: -100000 },
    ],
    summary: {
      currentBalance: 3500000,
      totalOutstanding: 1250000,
      avgWeeklyPayments: 850000,
      projectedShortfall: 100000,
      shortfallDate: '2026-W11',
    },
    recommendations: [
      'Consider delaying non-urgent payments in Week 10',
      'Negotiate extended terms with Orient Store',
    ],
  });
});

// GET /analytics/spending - 支出分析
router.get('/analytics/spending', async (_req: Request, res: Response) => {
  res.json({
    bySupplier: [
      { supplier: 'Tokyo Watches', amount: 2850000, percentage: 42.5 },
      { supplier: 'Casio Direct', amount: 2100000, percentage: 31.3 },
      { supplier: 'Orient Store', amount: 1450000, percentage: 21.6 },
      { supplier: 'Others', amount: 300000, percentage: 4.5 },
    ],
    byCategory: [
      { category: 'Watches', amount: 5500000, percentage: 82 },
      { category: 'Parts', amount: 800000, percentage: 11.9 },
      { category: 'Shipping', amount: 350000, percentage: 5.2 },
      { category: 'Others', amount: 50000, percentage: 0.7 },
    ],
    trend: [
      { month: '2025-09', amount: 3800000 },
      { month: '2025-10', amount: 4200000 },
      { month: '2025-11', amount: 4500000 },
      { month: '2025-12', amount: 5800000 },
      { month: '2026-01', amount: 4800000 },
      { month: '2026-02', amount: 4500000 },
    ],
  });
});

// GET /analytics/aging - 支払期限分析
router.get('/analytics/aging', async (_req: Request, res: Response) => {
  res.json({
    aging: {
      current: { count: 15, amount: 650000 },
      days1to30: { count: 8, amount: 420000 },
      days31to60: { count: 3, amount: 150000 },
      days61to90: { count: 1, amount: 50000 },
      over90: { count: 1, amount: 30000 },
    },
    totalOutstanding: 1300000,
  });
});

// --- レポート ---

// GET /reports/summary - サマリーレポート
router.get('/reports/summary', async (_req: Request, res: Response) => {
  res.json({
    report: {
      period: '2026-02',
      totalInvoices: 32,
      totalAmount: 4500000,
      paidAmount: 3200000,
      pendingAmount: 1250000,
      overdueAmount: 50000,
      avgPaymentDays: 12.5,
      onTimeRate: 94.2,
      topSuppliers: [
        { supplier: 'Tokyo Watches', amount: 1450000 },
        { supplier: 'Casio Direct', amount: 980000 },
      ],
    },
  });
});

// POST /reports/export - レポートエクスポート
router.post('/reports/export', async (_req: Request, res: Response) => {
  res.json({ success: true, downloadUrl: '/downloads/invoice-report-202602.xlsx', message: 'レポートを作成しました' });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      defaultPaymentTerms: 30,
      autoApproveThreshold: 100000,
      notifyOnNewInvoice: true,
      notifyOnDue: true,
      notifyDaysBefore: 3,
      notifyOnOverdue: true,
      currency: 'JPY',
      fiscalYearStart: '04-01',
      ocrEnabled: true,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

export { router as ebaySupplierInvoiceManagerRouter };

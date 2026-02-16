import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 280: eBay Bulk Lister（一括出品ツール）
// 28エンドポイント - テーマカラー: lime-600
// ============================================================

// スキーマ
const bulkListingSchema = z.object({
  templateId: z.string().optional(),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    categoryId: z.string(),
    condition: z.string(),
    images: z.array(z.string()).min(1),
    shippingProfileId: z.string().optional(),
  })).min(1),
  scheduleAt: z.string().datetime().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1),
  defaults: z.object({
    condition: z.string().optional(),
    shippingProfileId: z.string().optional(),
    returnPolicy: z.string().optional(),
    paymentPolicy: z.string().optional(),
  }),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalListed: 5000,
    pendingListings: 150,
    scheduledListings: 50,
    failedListings: 5,
    successRate: 99.0,
    todayListed: 75,
  });
});

router.get('/dashboard/recent', async (req: Request, res: Response) => {
  res.json({
    recent: [
      { id: 'b1', name: 'Batch 2026-02-16 #1', items: 50, status: 'COMPLETED', createdAt: '2026-02-16T10:00:00Z' },
      { id: 'b2', name: 'Batch 2026-02-16 #2', items: 25, status: 'PROCESSING', createdAt: '2026-02-16T11:00:00Z' },
      { id: 'b3', name: 'Scheduled Batch', items: 50, status: 'SCHEDULED', scheduledAt: '2026-02-17T09:00:00Z' },
    ],
  });
});

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  res.json({
    byCategory: [
      { category: 'Watches', count: 2000, percent: 40 },
      { category: 'Electronics', count: 1500, percent: 30 },
      { category: 'Collectibles', count: 1000, percent: 20 },
      { category: 'Other', count: 500, percent: 10 },
    ],
    byDay: [
      { date: '2026-02-14', count: 80 },
      { date: '2026-02-15', count: 65 },
      { date: '2026-02-16', count: 75 },
    ],
  });
});

// ========== バッチ管理 ==========
router.get('/batches', async (req: Request, res: Response) => {
  res.json({
    batches: [
      { id: 'b1', name: 'Batch 2026-02-16 #1', items: 50, completed: 50, failed: 0, status: 'COMPLETED' },
      { id: 'b2', name: 'Batch 2026-02-16 #2', items: 25, completed: 15, failed: 1, status: 'PROCESSING' },
      { id: 'b3', name: 'Scheduled Batch', items: 50, completed: 0, failed: 0, status: 'SCHEDULED' },
    ],
    total: 100,
  });
});

router.post('/batches', async (req: Request, res: Response) => {
  const parsed = bulkListingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid batch', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `batch_${Date.now()}`,
    name: `Batch ${new Date().toISOString().split('T')[0]}`,
    items: parsed.data.items.length,
    status: parsed.data.scheduleAt ? 'SCHEDULED' : 'PENDING',
    createdAt: new Date().toISOString(),
  });
});

router.get('/batches/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Batch 2026-02-16 #1',
    items: 50,
    completed: 48,
    failed: 2,
    status: 'COMPLETED',
    listings: [
      { id: 'l1', title: 'Seiko 5 Sports...', status: 'ACTIVE', ebayId: 'EB123456' },
      { id: 'l2', title: 'Citizen Eco-Drive...', status: 'ACTIVE', ebayId: 'EB123457' },
      { id: 'l3', title: 'Orient Bambino...', status: 'FAILED', error: 'Invalid category' },
    ],
    createdAt: '2026-02-16T10:00:00Z',
    completedAt: '2026-02-16T10:15:00Z',
  });
});

router.delete('/batches/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

router.post('/batches/:id/retry', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    retriedItems: 2,
    status: 'PROCESSING',
    retriedAt: new Date().toISOString(),
  });
});

router.post('/batches/:id/cancel', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    status: 'CANCELLED',
    cancelledAt: new Date().toISOString(),
  });
});

// ========== テンプレート ==========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 't1', name: 'Watch Listing Template', usageCount: 150, lastUsed: '2026-02-15' },
      { id: 't2', name: 'Electronics Template', usageCount: 80, lastUsed: '2026-02-14' },
      { id: 't3', name: 'Quick List Template', usageCount: 200, lastUsed: '2026-02-16' },
    ],
    total: 10,
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid template', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `tpl_${Date.now()}`,
    ...parsed.data,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Watch Listing Template',
    defaults: {
      condition: 'NEW',
      shippingProfileId: 'ship_001',
      returnPolicy: '30_DAYS',
      paymentPolicy: 'IMMEDIATE',
    },
    usageCount: 150,
    createdAt: '2025-12-01',
  });
});

router.put('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/templates/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

// ========== CSVインポート ==========
router.post('/import/csv', async (req: Request, res: Response) => {
  res.json({
    importId: `imp_${Date.now()}`,
    rowsDetected: 100,
    validRows: 95,
    invalidRows: 5,
    status: 'VALIDATED',
  });
});

router.get('/import/:id/preview', async (req: Request, res: Response) => {
  res.json({
    importId: req.params.id,
    preview: [
      { row: 1, title: 'Seiko 5 Sports', price: 200, valid: true },
      { row: 2, title: 'Citizen Eco-Drive', price: 250, valid: true },
      { row: 3, title: 'Invalid Item', price: -100, valid: false, error: 'Invalid price' },
    ],
    totalRows: 100,
    validRows: 95,
  });
});

router.post('/import/:id/confirm', async (req: Request, res: Response) => {
  res.json({
    importId: req.params.id,
    batchId: `batch_${Date.now()}`,
    itemsQueued: 95,
    status: 'PROCESSING',
  });
});

// ========== スケジュール ==========
router.get('/scheduled', async (req: Request, res: Response) => {
  res.json({
    scheduled: [
      { id: 's1', batchId: 'b3', items: 50, scheduledAt: '2026-02-17T09:00:00Z' },
      { id: 's2', batchId: 'b4', items: 30, scheduledAt: '2026-02-18T09:00:00Z' },
    ],
    total: 5,
  });
});

router.post('/scheduled', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `sch_${Date.now()}`,
    batchId: req.body.batchId,
    scheduledAt: req.body.scheduledAt,
    createdAt: new Date().toISOString(),
  });
});

router.delete('/scheduled/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

// ========== 分析 ==========
router.get('/analytics/performance', async (req: Request, res: Response) => {
  res.json({
    avgListingTime: 2.5,
    successRate: 99.0,
    avgBatchSize: 45,
    peakHours: [9, 10, 14, 15],
    byDay: [
      { day: 'Mon', listings: 120 },
      { day: 'Tue', listings: 110 },
      { day: 'Wed', listings: 100 },
      { day: 'Thu', listings: 130 },
      { day: 'Fri', listings: 90 },
    ],
  });
});

router.get('/analytics/errors', async (req: Request, res: Response) => {
  res.json({
    errors: [
      { type: 'Invalid Category', count: 15, percent: 30 },
      { type: 'Missing Images', count: 10, percent: 20 },
      { type: 'Price Out of Range', count: 10, percent: 20 },
      { type: 'Description Too Long', count: 8, percent: 16 },
      { type: 'Other', count: 7, percent: 14 },
    ],
    totalErrors: 50,
    errorRate: 1.0,
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalListed: 1500,
    successRate: 99.0,
    avgBatchSize: 45,
    topCategories: ['Watches', 'Electronics', 'Collectibles'],
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-bulk-lister/reports/download/bulk_listing_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultTemplateId: 't1',
    batchSize: 50,
    autoRetry: true,
    retryAttempts: 3,
    notifyOnComplete: true,
    notifyOnError: true,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;

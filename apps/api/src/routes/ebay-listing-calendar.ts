import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 226: Listing Calendar（出品カレンダー）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - カレンダー概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalScheduled: 156,
    todayListings: 12,
    weekListings: 45,
    monthListings: 156,
    completedToday: 8,
    failedToday: 1,
    pendingApproval: 5,
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/today - 今日の予定
router.get('/dashboard/today', async (_req: Request, res: Response) => {
  res.json({
    listings: [
      { id: 'sched_001', title: 'Seiko Prospex SBDC089', scheduledTime: '10:00', status: 'completed', marketplace: 'eBay US' },
      { id: 'sched_002', title: 'Casio G-Shock DW-5600', scheduledTime: '11:00', status: 'completed', marketplace: 'eBay UK' },
      { id: 'sched_003', title: 'Orient Bambino V4', scheduledTime: '14:00', status: 'pending', marketplace: 'eBay DE' },
      { id: 'sched_004', title: 'Citizen Eco-Drive BN0150', scheduledTime: '16:00', status: 'pending', marketplace: 'eBay AU' },
    ],
  });
});

// GET /dashboard/upcoming - 今後の予定
router.get('/dashboard/upcoming', async (_req: Request, res: Response) => {
  res.json({
    days: [
      { date: '2026-02-17', count: 15, statuses: { pending: 12, approved: 3 } },
      { date: '2026-02-18', count: 18, statuses: { pending: 15, approved: 3 } },
      { date: '2026-02-19', count: 12, statuses: { pending: 10, approved: 2 } },
      { date: '2026-02-20', count: 20, statuses: { pending: 18, approved: 2 } },
    ],
  });
});

// --- カレンダー ---

// GET /calendar/month - 月間カレンダー
router.get('/calendar/month', async (req: Request, res: Response) => {
  res.json({
    month: req.query.month || '2026-02',
    days: [
      { date: '2026-02-01', listings: 8, completed: 8, pending: 0, failed: 0 },
      { date: '2026-02-02', listings: 5, completed: 5, pending: 0, failed: 0 },
      { date: '2026-02-16', listings: 12, completed: 8, pending: 3, failed: 1 },
      { date: '2026-02-17', listings: 15, completed: 0, pending: 15, failed: 0 },
      { date: '2026-02-28', listings: 10, completed: 0, pending: 10, failed: 0 },
    ],
    summary: {
      totalScheduled: 156,
      totalCompleted: 78,
      totalPending: 75,
      totalFailed: 3,
    },
  });
});

// GET /calendar/week - 週間カレンダー
router.get('/calendar/week', async (req: Request, res: Response) => {
  res.json({
    weekStart: req.query.start || '2026-02-16',
    days: [
      { date: '2026-02-16', dayOfWeek: 'Sun', listings: [
        { id: 'sched_001', title: 'Seiko Prospex', time: '10:00', status: 'completed' },
        { id: 'sched_002', title: 'Casio G-Shock', time: '14:00', status: 'pending' },
      ]},
      { date: '2026-02-17', dayOfWeek: 'Mon', listings: [
        { id: 'sched_003', title: 'Orient Bambino', time: '09:00', status: 'pending' },
      ]},
    ],
  });
});

// GET /calendar/day/:date - 日別詳細
router.get('/calendar/day/:date', async (req: Request, res: Response) => {
  res.json({
    date: req.params.date,
    listings: [
      { id: 'sched_001', title: 'Seiko Prospex SBDC089', scheduledTime: '10:00', status: 'completed', marketplace: 'eBay US', price: 450.00 },
      { id: 'sched_002', title: 'Casio G-Shock DW-5600', scheduledTime: '11:00', status: 'completed', marketplace: 'eBay UK', price: 85.00 },
      { id: 'sched_003', title: 'Orient Bambino V4', scheduledTime: '14:00', status: 'pending', marketplace: 'eBay DE', price: 180.00 },
    ],
    summary: {
      total: 12,
      completed: 8,
      pending: 3,
      failed: 1,
    },
  });
});

// --- スケジュール管理 ---

// GET /schedules - スケジュール一覧
router.get('/schedules', async (_req: Request, res: Response) => {
  res.json({
    schedules: [
      { id: 'sched_001', title: 'Seiko Prospex SBDC089', scheduledAt: '2026-02-16 10:00:00', status: 'completed', marketplace: 'eBay US', listingId: 'listing_001' },
      { id: 'sched_002', title: 'Casio G-Shock DW-5600', scheduledAt: '2026-02-16 14:00:00', status: 'pending', marketplace: 'eBay UK', listingId: null },
      { id: 'sched_003', title: 'Orient Bambino V4', scheduledAt: '2026-02-17 09:00:00', status: 'pending', marketplace: 'eBay DE', listingId: null },
    ],
    total: 156,
    statuses: ['pending', 'approved', 'completed', 'failed', 'cancelled'],
  });
});

// GET /schedules/:id - スケジュール詳細
router.get('/schedules/:id', async (req: Request, res: Response) => {
  res.json({
    schedule: {
      id: req.params.id,
      title: 'Seiko Prospex SBDC089',
      description: 'JDM限定モデル、新品未使用',
      scheduledAt: '2026-02-16 10:00:00',
      status: 'completed',
      marketplace: 'eBay US',
      listingId: 'listing_001',
      product: {
        id: 'prod_001',
        sku: 'SEIKO-SBDC089',
        images: ['image1.jpg', 'image2.jpg'],
      },
      pricing: {
        startPrice: 450.00,
        buyItNowPrice: 500.00,
        currency: 'USD',
      },
      result: {
        completedAt: '2026-02-16 10:00:05',
        listingUrl: 'https://www.ebay.com/itm/123456789',
      },
      createdAt: '2026-02-14 09:00:00',
      updatedAt: '2026-02-16 10:00:05',
    },
  });
});

// POST /schedules - スケジュール作成
router.post('/schedules', async (_req: Request, res: Response) => {
  res.json({ success: true, scheduleId: 'sched_new_001', message: 'スケジュールを作成しました' });
});

// PUT /schedules/:id - スケジュール更新
router.put('/schedules/:id', async (req: Request, res: Response) => {
  res.json({ success: true, scheduleId: req.params.id, message: 'スケジュールを更新しました' });
});

// DELETE /schedules/:id - スケジュール削除
router.delete('/schedules/:id', async (req: Request, res: Response) => {
  res.json({ success: true, scheduleId: req.params.id, message: 'スケジュールを削除しました' });
});

// PUT /schedules/:id/reschedule - 再スケジュール
router.put('/schedules/:id/reschedule', async (req: Request, res: Response) => {
  res.json({ success: true, scheduleId: req.params.id, message: '再スケジュールしました' });
});

// PUT /schedules/:id/approve - 承認
router.put('/schedules/:id/approve', async (req: Request, res: Response) => {
  res.json({ success: true, scheduleId: req.params.id, message: 'スケジュールを承認しました' });
});

// POST /schedules/:id/execute - 即時実行
router.post('/schedules/:id/execute', async (req: Request, res: Response) => {
  res.json({ success: true, scheduleId: req.params.id, listingId: 'listing_new_001', message: '出品を実行しました' });
});

// --- 一括操作 ---

// POST /bulk/schedule - 一括スケジュール
router.post('/bulk/schedule', async (_req: Request, res: Response) => {
  res.json({ success: true, scheduled: 15, message: '15件の出品をスケジュールしました' });
});

// PUT /bulk/reschedule - 一括再スケジュール
router.put('/bulk/reschedule', async (_req: Request, res: Response) => {
  res.json({ success: true, rescheduled: 10, message: '10件を再スケジュールしました' });
});

// DELETE /bulk/cancel - 一括キャンセル
router.delete('/bulk/cancel', async (_req: Request, res: Response) => {
  res.json({ success: true, cancelled: 5, message: '5件をキャンセルしました' });
});

// --- テンプレート ---

// GET /templates - スケジュールテンプレート一覧
router.get('/templates', async (_req: Request, res: Response) => {
  res.json({
    templates: [
      { id: '1', name: '平日朝出品', schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '09:00' }, usageCount: 120 },
      { id: '2', name: '週末午後出品', schedule: { days: ['sat', 'sun'], time: '14:00' }, usageCount: 80 },
      { id: '3', name: '毎日夕方', schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], time: '18:00' }, usageCount: 200 },
    ],
  });
});

// POST /templates - テンプレート作成
router.post('/templates', async (_req: Request, res: Response) => {
  res.json({ success: true, templateId: 'template_new_001', message: 'テンプレートを作成しました' });
});

// PUT /templates/:id - テンプレート更新
router.put('/templates/:id', async (req: Request, res: Response) => {
  res.json({ success: true, templateId: req.params.id, message: 'テンプレートを更新しました' });
});

// DELETE /templates/:id - テンプレート削除
router.delete('/templates/:id', async (req: Request, res: Response) => {
  res.json({ success: true, templateId: req.params.id, message: 'テンプレートを削除しました' });
});

// --- 最適時間 ---

// GET /optimal-times - 最適出品時間
router.get('/optimal-times', async (_req: Request, res: Response) => {
  res.json({
    recommendations: [
      { marketplace: 'eBay US', optimalTime: '10:00 PST', reason: '米国西海岸の朝、閲覧数が最も多い', score: 95 },
      { marketplace: 'eBay UK', optimalTime: '19:00 GMT', reason: '英国の夕方、購買意欲が高い', score: 92 },
      { marketplace: 'eBay DE', optimalTime: '20:00 CET', reason: 'ドイツの夜、アクティブユーザーが多い', score: 88 },
    ],
    byCategory: [
      { category: '時計', bestDay: '日曜日', bestTime: '14:00-18:00', avgViews: 450 },
      { category: 'カメラ', bestDay: '土曜日', bestTime: '10:00-14:00', avgViews: 380 },
    ],
  });
});

// GET /optimal-times/analysis - 時間帯分析
router.get('/optimal-times/analysis', async (_req: Request, res: Response) => {
  res.json({
    hourlyData: [
      { hour: '06:00', views: 150, sales: 5, conversionRate: 3.3 },
      { hour: '09:00', views: 320, sales: 18, conversionRate: 5.6 },
      { hour: '12:00', views: 450, sales: 28, conversionRate: 6.2 },
      { hour: '18:00', views: 580, sales: 42, conversionRate: 7.2 },
      { hour: '21:00', views: 420, sales: 35, conversionRate: 8.3 },
    ],
    dailyData: [
      { day: '月曜日', avgViews: 2500, avgSales: 85 },
      { day: '土曜日', avgViews: 4200, avgSales: 145 },
      { day: '日曜日', avgViews: 4800, avgSales: 168 },
    ],
  });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      defaultMarketplace: 'eBay US',
      defaultScheduleTime: '10:00',
      timezone: 'Asia/Tokyo',
      autoApprove: false,
      bufferMinutes: 5,
      maxConcurrentListings: 10,
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
      onScheduleComplete: true,
      onScheduleFail: true,
      onApprovalNeeded: true,
      dailyDigest: true,
      digestTime: '09:00',
    },
  });
});

// PUT /settings/notifications - 通知設定更新
router.put('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '通知設定を更新しました' });
});

export default router;

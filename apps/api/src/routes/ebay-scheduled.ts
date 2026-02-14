/**
 * Phase 116: eBayスケジュール出品 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-scheduled' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const listingQueue = new Queue(QUEUE_NAMES.LISTING, { connection: redisConnection });

// バリデーション
const createScheduleSchema = z.object({
  listingId: z.string(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

const bulkScheduleSchema = z.object({
  listingIds: z.array(z.string()),
  scheduledAt: z.string().datetime(),
  intervalMinutes: z.number().optional(), // 複数出品の間隔
});

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalPending,
      todayCount,
      weekCount,
      recentCompleted,
      upcomingSchedules,
    ] = await Promise.all([
      // 待機中の総数
      prisma.scheduledListing.count({ where: { status: 'PENDING' } }),
      // 今日の予定
      prisma.scheduledListing.count({
        where: { scheduledAt: { gte: today, lt: tomorrow }, status: 'PENDING' },
      }),
      // 今週の予定
      prisma.scheduledListing.count({
        where: { scheduledAt: { gte: today, lt: weekLater }, status: 'PENDING' },
      }),
      // 最近の完了
      prisma.scheduledListing.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { executedAt: 'desc' },
        take: 5,
        include: {
          listing: {
            include: { product: { select: { title: true, titleEn: true } } },
          },
        },
      }),
      // 次の予定
      prisma.scheduledListing.findMany({
        where: { status: 'PENDING', scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        include: {
          listing: {
            include: { product: { select: { title: true, titleEn: true, images: true } } },
          },
        },
      }),
    ]);

    res.json({
      summary: {
        totalPending,
        todayCount,
        weekCount,
      },
      recentCompleted: recentCompleted.map(s => ({
        id: s.id,
        listingId: s.listingId,
        productTitle: s.listing?.product?.titleEn || s.listing?.product?.title,
        scheduledAt: s.scheduledAt,
        executedAt: s.executedAt,
      })),
      upcomingSchedules: upcomingSchedules.map(s => ({
        id: s.id,
        listingId: s.listingId,
        productTitle: s.listing?.product?.titleEn || s.listing?.product?.title,
        productImage: s.listing?.product?.images?.[0],
        scheduledAt: s.scheduledAt,
        status: s.status,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// スケジュール一覧
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, from, to, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (from || to) {
      where.scheduledAt = {};
      if (from) (where.scheduledAt as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.scheduledAt as Record<string, unknown>).lte = new Date(to as string);
    }

    const [schedules, total] = await Promise.all([
      prisma.scheduledListing.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          listing: {
            include: { product: { select: { title: true, titleEn: true, images: true } } },
          },
        },
      }),
      prisma.scheduledListing.count({ where }),
    ]);

    res.json({
      schedules: schedules.map(s => ({
        id: s.id,
        listingId: s.listingId,
        productTitle: s.listing?.product?.titleEn || s.listing?.product?.title,
        productImage: s.listing?.product?.images?.[0],
        listingPrice: s.listing?.listingPrice,
        scheduledAt: s.scheduledAt,
        status: s.status,
        executedAt: s.executedAt,
        error: s.error,
        createdAt: s.createdAt,
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

// カレンダー用データ
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year as string, 10) || new Date().getFullYear();
    const m = parseInt(month as string, 10) || new Date().getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const schedules = await prisma.scheduledListing.findMany({
      where: {
        scheduledAt: { gte: startDate, lte: endDate },
      },
      include: {
        listing: {
          include: { product: { select: { title: true, titleEn: true } } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 日付ごとにグループ化
    const byDate: Record<string, typeof schedules> = {};
    for (const s of schedules) {
      const dateKey = s.scheduledAt.toISOString().split('T')[0];
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(s);
    }

    res.json({
      year: y,
      month: m,
      schedules: Object.entries(byDate).map(([date, items]) => ({
        date,
        count: items.length,
        items: items.map(s => ({
          id: s.id,
          productTitle: s.listing?.product?.titleEn || s.listing?.product?.title,
          scheduledAt: s.scheduledAt,
          status: s.status,
        })),
      })),
    });
  } catch (error) {
    log.error({ type: 'calendar_error', error });
    res.status(500).json({ error: 'Failed to get calendar' });
  }
});

// スケジュール作成
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createScheduleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingId, scheduledAt, notes } = validation.data;

    // リスティング確認
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, marketplace: Marketplace.EBAY, status: 'DRAFT' },
    });
    if (!listing) {
      return res.status(404).json({ error: 'Draft listing not found' });
    }

    const schedule = await prisma.scheduledListing.create({
      data: {
        listingId,
        scheduledAt: new Date(scheduledAt),
        status: 'PENDING',
        metadata: notes ? { notes } : {},
      },
    });

    // BullMQで遅延ジョブを追加
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      await listingQueue.add(
        'publish-scheduled-listing',
        { scheduleId: schedule.id, listingId },
        { delay, jobId: `schedule-${schedule.id}` }
      );
    }

    log.info({ type: 'schedule_created', scheduleId: schedule.id, listingId, scheduledAt });
    res.status(201).json({ message: 'Schedule created', schedule });
  } catch (error) {
    log.error({ type: 'create_error', error });
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// 一括スケジュール
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const validation = bulkScheduleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingIds, scheduledAt, intervalMinutes = 5 } = validation.data;

    // リスティング確認
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds }, marketplace: Marketplace.EBAY, status: 'DRAFT' },
    });

    if (listings.length === 0) {
      return res.status(404).json({ error: 'No draft listings found' });
    }

    const schedules = [];
    let currentTime = new Date(scheduledAt).getTime();

    for (const listing of listings) {
      const schedule = await prisma.scheduledListing.create({
        data: {
          listingId: listing.id,
          scheduledAt: new Date(currentTime),
          status: 'PENDING',
        },
      });

      const delay = currentTime - Date.now();
      if (delay > 0) {
        await listingQueue.add(
          'publish-scheduled-listing',
          { scheduleId: schedule.id, listingId: listing.id },
          { delay, jobId: `schedule-${schedule.id}` }
        );
      }

      schedules.push(schedule);
      currentTime += intervalMinutes * 60 * 1000;
    }

    log.info({ type: 'bulk_schedule_created', count: schedules.length });
    res.status(201).json({
      message: 'Bulk schedule created',
      count: schedules.length,
      schedules: schedules.map(s => ({ id: s.id, scheduledAt: s.scheduledAt })),
    });
  } catch (error) {
    log.error({ type: 'bulk_create_error', error });
    res.status(500).json({ error: 'Failed to create bulk schedule' });
  }
});

// スケジュールキャンセル
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.scheduledListing.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    if (schedule.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending schedules can be cancelled' });
    }

    // BullMQジョブをキャンセル
    const job = await listingQueue.getJob(`schedule-${schedule.id}`);
    if (job) await job.remove();

    await prisma.scheduledListing.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Schedule cancelled' });
  } catch (error) {
    log.error({ type: 'cancel_error', error });
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// スケジュール削除
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.scheduledListing.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    // PENDINGならジョブもキャンセル
    if (schedule.status === 'PENDING') {
      const job = await listingQueue.getJob(`schedule-${schedule.id}`);
      if (job) await job.remove();
    }

    await prisma.scheduledListing.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    log.error({ type: 'delete_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 即時実行
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.scheduledListing.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    if (schedule.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending schedules can be executed' });
    }

    // 既存の遅延ジョブをキャンセル
    const existingJob = await listingQueue.getJob(`schedule-${schedule.id}`);
    if (existingJob) await existingJob.remove();

    // 即時実行ジョブを追加
    await listingQueue.add(
      'publish-scheduled-listing',
      { scheduleId: schedule.id, listingId: schedule.listingId },
      { priority: 1 }
    );

    res.json({ message: 'Execution queued' });
  } catch (error) {
    log.error({ type: 'execute_error', error });
    res.status(500).json({ error: 'Failed to execute' });
  }
});

// 時間変更
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt required' });

    const schedule = await prisma.scheduledListing.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    if (schedule.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending schedules can be updated' });
    }

    // 既存ジョブをキャンセル
    const existingJob = await listingQueue.getJob(`schedule-${schedule.id}`);
    if (existingJob) await existingJob.remove();

    // 新しい時刻で更新
    const updated = await prisma.scheduledListing.update({
      where: { id: req.params.id },
      data: { scheduledAt: new Date(scheduledAt) },
    });

    // 新しい遅延ジョブを追加
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      await listingQueue.add(
        'publish-scheduled-listing',
        { scheduleId: schedule.id, listingId: schedule.listingId },
        { delay, jobId: `schedule-${schedule.id}` }
      );
    }

    res.json({ message: 'Schedule updated', schedule: updated });
  } catch (error) {
    log.error({ type: 'update_error', error });
    res.status(500).json({ error: 'Failed to update' });
  }
});

// 統計
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [byStatus, completedCount, cancelledCount] = await Promise.all([
      prisma.scheduledListing.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.scheduledListing.count({
        where: { status: 'COMPLETED', executedAt: { gte: since } },
      }),
      prisma.scheduledListing.count({
        where: { status: 'CANCELLED', updatedAt: { gte: since } },
      }),
    ]);

    res.json({
      stats: {
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        completedInPeriod: completedCount,
        cancelledInPeriod: cancelledCount,
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

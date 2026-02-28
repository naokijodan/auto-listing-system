
/**
 * Phase 114: eBay競合分析 API
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
const log = logger.child({ module: 'ebay-competitors' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const competitorQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const addCompetitorSchema = z.object({
  listingId: z.string(),
  competitorUrl: z.string().url(),
  competitorIdentifier: z.string().optional(),
  notes: z.string().optional(),
});

const trackKeywordSchema = z.object({
  keyword: z.string().min(1),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      trackedCount,
      recentChanges,
      topCompetitors,
    ] = await Promise.all([
      // 追跡中の競合数
      prisma.competitorTracker.count(),
      // 最近の価格変動
      prisma.competitorPriceLog.findMany({
        orderBy: { recordedAt: 'desc' },
        take: 10,
        include: {
          tracker: true,
        },
      }),
      // 頻出競合マーケットプレイス
      prisma.competitorTracker.groupBy({
        by: ['marketplace'],
        _count: true,
        orderBy: { _count: { marketplace: 'desc' } },
        take: 5,
      }),
    ]);

    res.json({
      summary: {
        trackedCount,
      },
      recentChanges: recentChanges.map((c: any) => ({
        id: c.id,
        competitorIdentifier: c.competitorIdentifier,
        price: c.price,
        priceChange: c.priceChange,
        priceChangePercent: c.priceChangePercent,
        recordedAt: c.recordedAt,
      })),
      topCompetitors: topCompetitors.map((c: any) => ({
        marketplace: c.marketplace,
        count: c._count,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// 競合一覧
router.get('/', async (req: Request, res: Response) => {
  try {
    const { listingId, marketplace, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = {};
    if (listingId) where.listingId = listingId;
    if (marketplace) where.marketplace = { contains: marketplace as string, mode: 'insensitive' };

    const [competitors, total] = await Promise.all([
      prisma.competitorTracker.findMany({
        where,
        include: {
          priceLogs: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastCheckedAt: 'asc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.competitorTracker.count({ where }),
    ]);

    res.json({
      competitors: competitors.map((c: any) => ({
        id: c.id,
        listingId: c.listingId,
        competitorIdentifier: c.competitorIdentifier,
        marketplace: c.marketplace,
        url: c.url,
        title: c.title,
        lastPrice: c.lastPrice,
        lastCheckedAt: c.lastCheckedAt,
        isActive: c.isActive,
        latestPriceLog: c.priceLogs?.[0] || null,
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list competitors' });
  }
});

// 競合追加
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = addCompetitorSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingId, competitorUrl, competitorIdentifier, notes } = validation.data;

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, marketplace: Marketplace.EBAY },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const competitor = await prisma.competitorTracker.create({
      data: {
        listingId,
        competitorIdentifier: competitorIdentifier || competitorUrl,
        marketplace: 'EBAY',
        url: competitorUrl,
      },
    });

    // 価格チェックジョブ
    await competitorQueue.add('check-competitor-price', { competitorId: competitor.id }, { priority: 2 });

    log.info({ type: 'competitor_added', competitorId: competitor.id, listingId });
    res.status(201).json({ message: 'Competitor added', competitor });
  } catch (error) {
    log.error({ type: 'add_error', error });
    res.status(500).json({ error: 'Failed to add competitor' });
  }
});

// 競合削除
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.competitorTracker.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    log.error({ type: 'delete_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 価格履歴
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const history = await prisma.competitorPriceLog.findMany({
      where: { trackerId: req.params.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });

    res.json({ history });
  } catch (error) {
    log.error({ type: 'history_error', error });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// 価格チェック実行
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { competitorIds } = req.body;
    const ids = competitorIds || (await prisma.competitorTracker.findMany({ select: { id: true } })).map((c: any) => c.id);

    for (const id of ids) {
      await competitorQueue.add('check-competitor-price', { competitorId: id }, { priority: 3 });
    }

    res.status(202).json({ message: 'Price check queued', count: ids.length });
  } catch (error) {
    log.error({ type: 'check_error', error });
    res.status(500).json({ error: 'Failed to queue check' });
  }
});

// 価格アラート一覧(lastPriceが設定されているトラッカーを返す)
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const alerts = await prisma.competitorTracker.findMany({
      where: { alertOnPriceDrop: true, lastPrice: { not: null } },
      include: {
        priceLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastCheckedAt: 'desc' },
    });

    res.json({
      alerts: alerts.map((a: any) => ({
        id: a.id,
        listingId: a.listingId,
        competitorIdentifier: a.competitorIdentifier,
        marketplace: a.marketplace,
        url: a.url,
        lastPrice: a.lastPrice,
        alertThresholdPercent: a.alertThresholdPercent,
        lastCheckedAt: a.lastCheckedAt,
        latestPriceLog: a.priceLogs?.[0] || null,
      })),
      count: alerts.length,
    });
  } catch (error) {
    log.error({ type: 'alerts_error', error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// 統計
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [total, activeTrackers, priceChanges, avgPrice] = await Promise.all([
      prisma.competitorTracker.count(),
      prisma.competitorTracker.count({ where: { isActive: true } }),
      prisma.competitorPriceLog.count({ where: { recordedAt: { gte: since } } }),
      prisma.competitorTracker.aggregate({ _avg: { lastPrice: true } }),
    ]);

    res.json({
      summary: {
        totalTracked: total,
        activeTrackers,
        priceChangesInPeriod: priceChanges,
        avgLastPrice: avgPrice._avg?.lastPrice?.toFixed(2) || '0',
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

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
  competitorSeller: z.string().optional(),
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
      priceAlerts,
      avgPriceDiff,
      recentChanges,
      topCompetitors,
    ] = await Promise.all([
      // 追跡中の競合数
      prisma.competitorListing.count(),
      // 価格アラート（自社より安い）
      prisma.competitorListing.count({
        where: { priceDiff: { lt: 0 } },
      }),
      // 平均価格差
      prisma.competitorListing.aggregate({
        _avg: { priceDiffPercent: true },
      }),
      // 最近の価格変動
      prisma.competitorPriceHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          competitor: {
            include: { listing: { include: { product: { select: { title: true } } } } },
          },
        },
      }),
      // 頻出競合セラー
      prisma.competitorListing.groupBy({
        by: ['competitorSeller'],
        where: { competitorSeller: { not: null } },
        _count: true,
        orderBy: { _count: { competitorSeller: 'desc' } },
        take: 5,
      }),
    ]);

    res.json({
      summary: {
        trackedCount,
        priceAlerts,
        avgPriceDiff: avgPriceDiff._avg.priceDiffPercent?.toFixed(1) || '0',
      },
      recentChanges: recentChanges.map(c => ({
        id: c.id,
        productTitle: c.competitor?.listing?.product?.title,
        oldPrice: c.oldPrice,
        newPrice: c.newPrice,
        changePercent: ((c.newPrice - c.oldPrice) / c.oldPrice * 100).toFixed(1),
        createdAt: c.createdAt,
      })),
      topCompetitors: topCompetitors.map(c => ({
        seller: c.competitorSeller,
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
    const { listingId, seller, hasAlert, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = {};
    if (listingId) where.listingId = listingId;
    if (seller) where.competitorSeller = { contains: seller as string, mode: 'insensitive' };
    if (hasAlert === 'true') where.priceDiff = { lt: 0 };

    const [competitors, total] = await Promise.all([
      prisma.competitorListing.findMany({
        where,
        include: {
          listing: {
            include: { product: { select: { title: true, titleEn: true, images: true } } },
          },
        },
        orderBy: { priceDiffPercent: 'asc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.competitorListing.count({ where }),
    ]);

    res.json({
      competitors: competitors.map(c => ({
        id: c.id,
        listingId: c.listingId,
        productTitle: c.listing?.product?.titleEn || c.listing?.product?.title,
        productImage: c.listing?.product?.images?.[0],
        myPrice: c.listing?.listingPrice,
        competitorPrice: c.competitorPrice,
        priceDiff: c.priceDiff,
        priceDiffPercent: c.priceDiffPercent,
        competitorUrl: c.competitorUrl,
        competitorSeller: c.competitorSeller,
        lastChecked: c.lastChecked,
        isAlert: (c.priceDiff || 0) < 0,
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

    const { listingId, competitorUrl, competitorSeller, notes } = validation.data;

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, marketplace: Marketplace.EBAY },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const competitor = await prisma.competitorListing.create({
      data: {
        listingId,
        competitorUrl,
        competitorSeller,
        competitorPrice: 0, // 初回チェックで更新
        priceDiff: 0,
        priceDiffPercent: 0,
        metadata: notes ? { notes } : {},
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
    await prisma.competitorListing.delete({ where: { id: req.params.id } });
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

    const history = await prisma.competitorPriceHistory.findMany({
      where: { competitorId: req.params.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
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
    const ids = competitorIds || (await prisma.competitorListing.findMany({ select: { id: true } })).map(c => c.id);

    for (const id of ids) {
      await competitorQueue.add('check-competitor-price', { competitorId: id }, { priority: 3 });
    }

    res.status(202).json({ message: 'Price check queued', count: ids.length });
  } catch (error) {
    log.error({ type: 'check_error', error });
    res.status(500).json({ error: 'Failed to queue check' });
  }
});

// 価格アラート一覧
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const alerts = await prisma.competitorListing.findMany({
      where: { priceDiff: { lt: 0 } },
      include: {
        listing: {
          include: { product: { select: { title: true, titleEn: true } } },
        },
      },
      orderBy: { priceDiffPercent: 'asc' },
    });

    res.json({
      alerts: alerts.map(a => ({
        id: a.id,
        listingId: a.listingId,
        productTitle: a.listing?.product?.titleEn || a.listing?.product?.title,
        myPrice: a.listing?.listingPrice,
        competitorPrice: a.competitorPrice,
        priceDiff: a.priceDiff,
        priceDiffPercent: a.priceDiffPercent,
        competitorSeller: a.competitorSeller,
        suggestion: a.competitorPrice ? `$${(a.competitorPrice * 0.95).toFixed(2)}に値下げ推奨` : null,
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

    const [total, withAlerts, priceChanges, avgDiff] = await Promise.all([
      prisma.competitorListing.count(),
      prisma.competitorListing.count({ where: { priceDiff: { lt: 0 } } }),
      prisma.competitorPriceHistory.count({ where: { createdAt: { gte: since } } }),
      prisma.competitorListing.aggregate({ _avg: { priceDiffPercent: true } }),
    ]);

    res.json({
      summary: {
        totalTracked: total,
        withAlerts,
        priceChangesInPeriod: priceChanges,
        avgPriceDiffPercent: avgDiff._avg.priceDiffPercent?.toFixed(1) || '0',
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

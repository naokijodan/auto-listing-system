/**
 * Phase 111: eBayフィードバック管理 API
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
const log = logger.child({ module: 'ebay-feedback' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const feedbackQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const leaveFeedbackSchema = z.object({
  orderId: z.string(),
  rating: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  comment: z.string().min(1).max(80),
  syncToEbay: z.boolean().default(true),
});

const respondFeedbackSchema = z.object({
  response: z.string().min(1).max(500),
  syncToEbay: z.boolean().default(true),
});

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, positive, neutral, negative, received, given, recent] = await Promise.all([
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY } }),
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY, rating: 'POSITIVE' } }),
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY, rating: 'NEUTRAL' } }),
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY, rating: 'NEGATIVE' } }),
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY, direction: 'RECEIVED' } }),
      prisma.feedback.count({ where: { marketplace: Marketplace.EBAY, direction: 'GIVEN' } }),
      prisma.feedback.findMany({
        where: { marketplace: Marketplace.EBAY },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { order: { select: { marketplaceOrderId: true, buyerUsername: true } } },
      }),
    ]);

    const positiveRate = total > 0 ? ((positive / total) * 100).toFixed(1) : '0';

    res.json({
      summary: { total, positive, neutral, negative, received, given, positiveRate: `${positiveRate}%` },
      recentFeedback: recent.map(f => ({
        id: f.id,
        orderId: f.orderId,
        marketplaceOrderId: f.order?.marketplaceOrderId,
        buyerUsername: f.order?.buyerUsername,
        rating: f.rating,
        direction: f.direction,
        comment: f.comment,
        response: f.response,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// 一覧
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rating, direction, hasResponse, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = { marketplace: Marketplace.EBAY };
    if (rating) where.rating = rating;
    if (direction) where.direction = direction;
    if (hasResponse === 'true') where.response = { not: null };
    if (hasResponse === 'false') where.response = null;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: { order: { select: { marketplaceOrderId: true, buyerUsername: true } } },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({ feedback, total });
  } catch (error) {
    log.error({ type: 'list_error', error });
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

// 詳細
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findFirst({
      where: { id: req.params.id, marketplace: Marketplace.EBAY },
      include: { order: { include: { sales: true } } },
    });
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    res.json(feedback);
  } catch (error) {
    log.error({ type: 'get_error', error });
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// フィードバック送信
router.post('/leave', async (req: Request, res: Response) => {
  try {
    const validation = leaveFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { orderId, rating, comment, syncToEbay } = validation.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, marketplace: Marketplace.EBAY },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 既存チェック
    const existing = await prisma.feedback.findFirst({
      where: { orderId, direction: 'GIVEN' },
    });
    if (existing) return res.status(400).json({ error: 'Feedback already left for this order' });

    const feedback = await prisma.feedback.create({
      data: {
        marketplace: Marketplace.EBAY,
        orderId,
        direction: 'GIVEN',
        rating,
        comment,
      },
    });

    if (syncToEbay && order.marketplaceOrderId) {
      await feedbackQueue.add('ebay-leave-feedback', {
        feedbackId: feedback.id,
        marketplaceOrderId: order.marketplaceOrderId,
        rating,
        comment,
      }, { priority: 2 });
    }

    log.info({ type: 'feedback_left', feedbackId: feedback.id, orderId });
    res.status(201).json({ message: 'Feedback left', feedback });
  } catch (error) {
    log.error({ type: 'leave_error', error });
    res.status(500).json({ error: 'Failed to leave feedback' });
  }
});

// フィードバック返信
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const validation = respondFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { response, syncToEbay } = validation.data;

    const feedback = await prisma.feedback.findFirst({
      where: { id: req.params.id, marketplace: Marketplace.EBAY },
      include: { order: true },
    });
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    if (feedback.response) return res.status(400).json({ error: 'Already responded' });

    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { response, respondedAt: new Date() },
    });

    if (syncToEbay && feedback.order?.marketplaceOrderId) {
      await feedbackQueue.add('ebay-respond-feedback', {
        feedbackId: req.params.id,
        response,
      }, { priority: 2 });
    }

    log.info({ type: 'feedback_responded', feedbackId: req.params.id });
    res.json({ message: 'Response added', feedback: updated });
  } catch (error) {
    log.error({ type: 'respond_error', error });
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// 未対応ネガティブ
router.get('/negative/unresponded', async (_req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        direction: 'RECEIVED',
        rating: { in: ['NEGATIVE', 'NEUTRAL'] },
        response: null,
      },
      orderBy: { createdAt: 'asc' },
      include: { order: { select: { marketplaceOrderId: true, buyerUsername: true } } },
    });

    res.json({ feedback, count: feedback.length });
  } catch (error) {
    log.error({ type: 'unresponded_error', error });
    res.status(500).json({ error: 'Failed to get unresponded feedback' });
  }
});

// 統計
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [byRating, byDirection, responseRate] = await Promise.all([
      prisma.feedback.groupBy({
        by: ['rating'],
        where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.feedback.groupBy({
        by: ['direction'],
        where: { marketplace: Marketplace.EBAY, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.feedback.aggregate({
        where: {
          marketplace: Marketplace.EBAY,
          direction: 'RECEIVED',
          createdAt: { gte: since },
        },
        _count: { id: true, response: true },
      }),
    ]);

    const total = byRating.reduce((sum, r) => sum + r._count, 0);
    const positive = byRating.find(r => r.rating === 'POSITIVE')?._count || 0;

    res.json({
      period: { days: parseInt(days as string, 10), since: since.toISOString() },
      summary: {
        total,
        positiveRate: total > 0 ? `${((positive / total) * 100).toFixed(1)}%` : 'N/A',
        responseRate: responseRate._count.id > 0
          ? `${((responseRate._count.response / responseRate._count.id) * 100).toFixed(1)}%`
          : 'N/A',
      },
      byRating: byRating.reduce((acc, i) => ({ ...acc, [i.rating]: i._count }), {}),
      byDirection: byDirection.reduce((acc, i) => ({ ...acc, [i.direction]: i._count }), {}),
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 同期
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const job = await feedbackQueue.add('ebay-feedback-sync', {}, { priority: 3 });
    res.status(202).json({ message: 'Sync queued', jobId: job.id });
  } catch (error) {
    log.error({ type: 'sync_error', error });
    res.status(500).json({ error: 'Failed to queue sync' });
  }
});

export default router;

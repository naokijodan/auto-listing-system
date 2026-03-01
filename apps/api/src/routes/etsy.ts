/**
 * Etsy出品管理 API
 * 
 * Etsy listings management routes (NOT auth - auth is in etsy-auth.ts)
 * Handles listing CRUD, publishing, inventory sync, orders, and batch operations.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';
import type { EtsyListingStatus } from '@prisma/client';

const router = Router();
const log = logger.child({ module: 'etsy-listings' });

// Lazy-init queue to avoid connection issues at import time
let etsyPublishQueue: Queue | null = null;

const etsyRedis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

function getEtsyPublishQueue(): Queue {
  if (!etsyPublishQueue) {
    etsyPublishQueue = new Queue(QUEUE_NAMES.ETSY_PUBLISH, {
      connection: etsyRedis,
    });
  }
  return etsyPublishQueue;
}

// ========================================
// Etsy出品管理
// ========================================

/**
 * GET /listings - Etsy出品一覧（ページネーション・ステータスフィルター付き）
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as EtsyListingStatus;

    const [listings, total] = await Promise.all([
      prisma.etsyListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sourceUrl: true,
              images: true,
            },
          },
        },
      }),
      prisma.etsyListing.count({ where }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    log.error({ error }, 'Failed to list Etsy listings');
    res.status(500).json({ error: 'Failed to list Etsy listings' });
  }
});

/**
 * GET /listings/:id - Etsy出品詳細
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.etsyListing.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    log.error({ error }, 'Failed to get Etsy listing');
    res.status(500).json({ error: 'Failed to get Etsy listing' });
  }
});

/**
 * POST /listings/:id/publish - 出品ジョブをキューに追加
 */
router.post('/listings/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.etsyListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!['DRAFT', 'READY', 'ERROR'].includes(listing.status)) {
      return res.status(400).json({
        error: `Cannot publish listing in status: ${listing.status}`,
      });
    }

    // ステータスを更新
    await prisma.etsyListing.update({
      where: { id },
      data: { status: 'PUBLISHING' },
    });

    // ジョブキューに追加
    const queue = getEtsyPublishQueue();
    const job = await queue.add('etsy-publish', {
      listingId: id,
      action: 'publish',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info({ listingId: id, jobId: job.id }, 'Etsy publish job queued');

    res.json({
      message: 'Publishing started',
      listingId: id,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to publish Etsy listing');
    res.status(500).json({ error: 'Failed to publish Etsy listing' });
  }
});

/**
 * POST /listings/:id/sync - 在庫同期ジョブをキューに追加
 */
router.post('/listings/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.etsyListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!listing.etsyListingId) {
      return res.status(400).json({
        error: 'Listing has not been published to Etsy yet',
      });
    }

    // ジョブキューに追加
    const queue = getEtsyPublishQueue();
    const job = await queue.add('etsy-inventory-sync', {
      listingId: id,
      etsyListingId: listing.etsyListingId,
      action: 'sync-inventory',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info({ listingId: id, jobId: job.id }, 'Etsy inventory sync job queued');

    res.json({
      message: 'Inventory sync started',
      listingId: id,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to sync Etsy listing inventory');
    res.status(500).json({ error: 'Failed to sync Etsy listing inventory' });
  }
});

// ========================================
// Etsy注文管理
// ========================================

/**
 * GET /orders - Etsy注文一覧（Ordersテーブルからmarketplace=ETSYでフィルター）
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      marketplace: 'ETSY',
    };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { orderedAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total });
  } catch (error) {
    log.error({ error }, 'Failed to list Etsy orders');
    res.status(500).json({ error: 'Failed to list Etsy orders' });
  }
});

// ========================================
// Etsyインテグレーションステータス
// ========================================

/**
 * GET /status - Etsy統合ステータス（認証状態、出品数、同期状態）
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 認証状態を確認
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'ETSY' },
      select: {
        id: true,
        isActive: true,
        tokenExpiresAt: true,
        updatedAt: true,
      },
    });

    const isAuthenticated = !!(credential?.isActive);
    const tokenExpiry = credential?.tokenExpiresAt || null;
    const isTokenExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : true;

    // 出品ステータス別カウント
    const [
      totalListings,
      draftCount,
      readyCount,
      publishingCount,
      activeCount,
      inactiveCount,
      expiredCount,
      errorCount,
    ] = await Promise.all([
      prisma.etsyListing.count(),
      prisma.etsyListing.count({ where: { status: 'DRAFT' } }),
      prisma.etsyListing.count({ where: { status: 'READY' } }),
      prisma.etsyListing.count({ where: { status: 'PUBLISHING' } }),
      prisma.etsyListing.count({ where: { status: 'ACTIVE' } }),
      prisma.etsyListing.count({ where: { status: 'INACTIVE' } }),
      prisma.etsyListing.count({ where: { status: 'EXPIRED' } }),
      prisma.etsyListing.count({ where: { status: 'ERROR' } }),
    ]);

    // Etsy注文数
    const totalOrders = await prisma.order.count({
      where: { marketplace: 'ETSY' },
    });

    // 最新の同期時刻
    const lastSyncedListing = await prisma.etsyListing.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    res.json({
      auth: {
        isAuthenticated,
        tokenExpiry,
        isTokenExpired,
      },
      listings: {
        total: totalListings,
        draft: draftCount,
        ready: readyCount,
        publishing: publishingCount,
        active: activeCount,
        inactive: inactiveCount,
        expired: expiredCount,
        error: errorCount,
      },
      orders: {
        total: totalOrders,
      },
      sync: {
        lastSyncedAt: lastSyncedListing?.updatedAt || null,
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get Etsy status');
    res.status(500).json({ error: 'Failed to get Etsy integration status' });
  }
});

// ========================================
// バッチ出品
// ========================================

/**
 * POST /batch-publish - 複数出品をバッチでキューに追加
 */
router.post('/batch-publish', async (req: Request, res: Response) => {
  try {
    const { listingIds } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    // 対象リスティングの存在・ステータス確認
    const listings = await prisma.etsyListing.findMany({
      where: {
        id: { in: listingIds },
        status: { in: ['DRAFT', 'READY', 'ERROR'] },
      },
      select: { id: true, status: true },
    });

    if (listings.length === 0) {
      return res.status(400).json({
        error: 'No publishable listings found',
        detail: 'All specified listings are either not found or not in a publishable status (DRAFT, READY, ERROR)',
      });
    }

    const publishableIds = listings.map((l) => l.id);
    const skippedIds = listingIds.filter((id: string) => !publishableIds.includes(id));

    // ステータスを一括更新
    await prisma.etsyListing.updateMany({
      where: { id: { in: publishableIds } },
      data: { status: 'PUBLISHING' },
    });

    // ジョブキューにバッチジョブを追加
    const queue = getEtsyPublishQueue();
    const job = await queue.add('etsy-batch-publish', {
      listingIds: publishableIds,
      action: 'batch-publish',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info(
      { publishableCount: publishableIds.length, skippedCount: skippedIds.length, jobId: job.id },
      'Etsy batch publish job queued',
    );

    res.json({
      message: 'Batch publish started',
      jobId: job.id,
      publishable: publishableIds.length,
      skipped: skippedIds.length,
      skippedIds,
    });
  } catch (error) {
    log.error({ error }, 'Failed to batch publish Etsy listings');
    res.status(500).json({ error: 'Failed to batch publish Etsy listings' });
  }
});

export default router;

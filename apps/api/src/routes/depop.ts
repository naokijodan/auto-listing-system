/**
 * Depop出品管理 API
 *
 * Depop listings management routes.
 * Handles listing CRUD, publishing, inventory sync, orders, and settings.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import type { DepopListingStatus } from '@prisma/client';

const router = Router();
const log = logger.child({ module: 'depop-routes' });

// Lazy-init queue
let depopPublishQueue: Queue | null = null;

function getDepopPublishQueue(): Queue {
  if (!depopPublishQueue) {
    depopPublishQueue = new Queue('depop-publish', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    });
  }
  return depopPublishQueue;
}

// ========================================
// Depop出品管理
// ========================================

/**
 * GET /listings - Depop出品一覧
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as DepopListingStatus;

    const [listings, total] = await Promise.all([
      prisma.depopListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          product: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              sourceUrl: true,
              images: true,
              price: true,
              brand: true,
              condition: true,
            },
          },
        },
      }),
      prisma.depopListing.count({ where }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    log.error({ error }, 'Failed to list Depop listings');
    res.status(500).json({ error: 'Failed to list Depop listings' });
  }
});

/**
 * GET /listings/:id - Depop出品詳細
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.depopListing.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Depop listing not found' });
    }

    res.json(listing);
  } catch (error) {
    log.error({ error }, 'Failed to get Depop listing');
    res.status(500).json({ error: 'Failed to get Depop listing' });
  }
});

/**
 * POST /publish - 商品をDepopに出品
 */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // BullMQジョブをキューに追加
    const queue = getDepopPublishQueue();
    const job = await queue.add('depop-publish', {
      productId,
      action: 'publish',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    // DepopListing作成（DRAFT）
    const existing = await prisma.depopListing.findFirst({
      where: { productId },
    });

    if (!existing) {
      await prisma.depopListing.create({
        data: {
          productId,
          status: 'PUBLISHING',
        },
      });
    } else {
      await prisma.depopListing.update({
        where: { id: existing.id },
        data: { status: 'PUBLISHING' },
      });
    }

    res.json({
      message: 'Depop publish job queued',
      jobId: job.id,
      productId,
    });
  } catch (error) {
    log.error({ error }, 'Failed to queue Depop publish');
    res.status(500).json({ error: 'Failed to queue Depop publish' });
  }
});

/**
 * POST /publish/batch - バッチ出品
 */
router.post('/publish/batch', async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    if (productIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 products per batch' });
    }

    const queue = getDepopPublishQueue();
    const jobs = await Promise.all(
      productIds.map((productId: string) =>
        queue.add('depop-publish', {
          productId,
          action: 'publish',
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      ),
    );

    res.json({
      message: `${jobs.length} Depop publish jobs queued`,
      jobIds: jobs.map((j) => j.id),
    });
  } catch (error) {
    log.error({ error }, 'Failed to queue batch Depop publish');
    res.status(500).json({ error: 'Failed to queue batch Depop publish' });
  }
});

/**
 * DELETE /listings/:id - Depop出品を削除
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.depopListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Depop listing not found' });
    }

    // Depop APIから削除（SKUがある場合）
    if (listing.sku) {
      const queue = getDepopPublishQueue();
      await queue.add('depop-delete', {
        sku: listing.sku,
        listingId: id,
      });
    }

    await prisma.depopListing.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    res.json({ message: 'Depop listing deletion queued' });
  } catch (error) {
    log.error({ error }, 'Failed to delete Depop listing');
    res.status(500).json({ error: 'Failed to delete Depop listing' });
  }
});

// ========================================
// 注文管理
// ========================================

/**
 * GET /orders - Depop注文一覧（Depop APIから取得）
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    // Depop APIから注文を取得
    const { DepopApiClient } = await import('../../worker/src/lib/depop-api');
    const client = new DepopApiClient();
    const orders = await client.getOrders(
      status as string | undefined,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10),
    );

    res.json(orders);
  } catch (error) {
    log.error({ error }, 'Failed to fetch Depop orders');
    res.status(500).json({ error: 'Failed to fetch Depop orders' });
  }
});

// ========================================
// 設定・接続テスト
// ========================================

/**
 * GET /settings - Depop設定情報
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'DEPOP', isActive: true },
    });

    res.json({
      configured: !!credential,
      marketplace: 'DEPOP',
      authType: 'API_KEY',
      hasApiKey: !!credential,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get Depop settings');
    res.status(500).json({ error: 'Failed to get Depop settings' });
  }
});

/**
 * POST /settings/api-key - APIキーを設定
 */
router.post('/settings/api-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    // 既存のクレデンシャルを無効化
    await prisma.marketplaceCredential.updateMany({
      where: { marketplace: 'DEPOP' },
      data: { isActive: false },
    });

    // 新しいクレデンシャルを作成
    await prisma.marketplaceCredential.create({
      data: {
        marketplace: 'DEPOP',
        credentials: { apiKey },
        isActive: true,
      },
    });

    res.json({ message: 'Depop API key saved successfully' });
  } catch (error) {
    log.error({ error }, 'Failed to save Depop API key');
    res.status(500).json({ error: 'Failed to save Depop API key' });
  }
});

/**
 * POST /settings/test-connection - 接続テスト
 */
router.post('/settings/test-connection', async (req: Request, res: Response) => {
  try {
    const { DepopApiClient } = await import('../../worker/src/lib/depop-api');
    const client = new DepopApiClient();
    const connected = await client.testConnection();

    res.json({
      connected,
      message: connected ? 'Depop API connection successful' : 'Depop API connection failed',
    });
  } catch (error) {
    log.error({ error }, 'Depop connection test failed');
    res.json({ connected: false, message: 'Connection test failed' });
  }
});

/**
 * GET /stats - Depop出品統計
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, active, draft, error, publishing] = await Promise.all([
      prisma.depopListing.count(),
      prisma.depopListing.count({ where: { status: 'ACTIVE' } }),
      prisma.depopListing.count({ where: { status: 'DRAFT' } }),
      prisma.depopListing.count({ where: { status: 'ERROR' } }),
      prisma.depopListing.count({ where: { status: 'PUBLISHING' } }),
    ]);

    res.json({
      total,
      active,
      draft,
      error,
      publishing,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get Depop stats');
    res.status(500).json({ error: 'Failed to get Depop stats' });
  }
});

export default router;

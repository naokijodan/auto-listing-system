/**
 * Shopify商品管理API
 * 商品同期・出品・在庫管理・注文管理・販売チャネル管理
 *
 * 注意: OAuth認証ルートは shopify-auth.ts に分離済み（/api/shopify）
 * このファイルは /api/shopify-products にマウントされる
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

const router = Router();
const log = logger.child({ module: 'shopify-products' });

// BullMQキュー
const shopifyRedis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const shopifySyncQueue = new Queue(QUEUE_NAMES.SHOPIFY_SYNC, {
  connection: shopifyRedis,
});

// ========================================
// 商品管理
// ========================================

/**
 * Shopify商品一覧
 * GET /products?status=ACTIVE&limit=50&offset=0
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as string;

    const [products, total] = await Promise.all([
      prisma.shopifyProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.shopifyProduct.count({ where }),
    ]);

    res.json({ products, total });
  } catch (error) {
    log.error({ error }, 'Failed to list Shopify products');
    res.status(500).json({ error: 'Failed to list Shopify products' });
  }
});

/**
 * Shopify商品詳細
 * GET /products/:id
 */
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.shopifyProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Shopify product not found' });
    }

    res.json(product);
  } catch (error) {
    log.error({ error }, 'Failed to get Shopify product');
    res.status(500).json({ error: 'Failed to get Shopify product' });
  }
});

/**
 * 商品出品（ジョブキュー経由）
 * POST /products/:id/publish
 */
router.post('/products/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.shopifyProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Shopify product not found' });
    }

    if (!['PENDING', 'ERROR'].includes(product.status)) {
      return res.status(400).json({
        error: `Cannot publish product in status: ${product.status}`,
      });
    }

    // ステータスを更新
    await prisma.shopifyProduct.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    // ジョブキューに追加
    const job = await shopifySyncQueue.add('shopify-publish', {
      type: 'publish',
      shopifyProductId: id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info({ productId: id, jobId: job.id }, 'Shopify publish job queued');

    res.json({
      message: 'Publishing started',
      productId: id,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to publish Shopify product');
    res.status(500).json({ error: 'Failed to publish Shopify product' });
  }
});

/**
 * RAKUDA商品からShopify出品（フルフロー）
 * POST /publish-product/:productId
 * enrichmentTask → ShopifyProduct作成 → 画像処理 → Shopify出品
 */
router.post('/publish-product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // 商品存在確認
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // EnrichmentTask確認
    const task = await prisma.enrichmentTask.findUnique({ where: { productId } });
    if (!task) {
      return res.status(400).json({ error: 'EnrichmentTask not found. Run enrichment first.' });
    }
    if (task.status !== 'APPROVED' && task.status !== 'PUBLISHED') {
      return res.status(400).json({ error: `EnrichmentTask not approved: ${task.status}` });
    }

    // 既存のShopify出品チェック
    const existingListing = await prisma.listing.findFirst({
      where: { productId, marketplace: 'SHOPIFY', status: 'ACTIVE' },
    });
    if (existingListing) {
      return res.status(400).json({ error: 'Product already listed on Shopify', listingId: existingListing.id });
    }

    // Shopify出品ジョブをキューに追加
    const job = await shopifySyncQueue.add('shopify-publish', {
      type: 'publish',
      enrichmentTaskId: task.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info({ productId, enrichmentTaskId: task.id, jobId: job.id }, 'Shopify publish-product job queued');

    res.json({
      message: 'Shopify publishing started',
      productId,
      enrichmentTaskId: task.id,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to trigger Shopify publish-product');
    res.status(500).json({ error: 'Failed to trigger Shopify publish' });
  }
});

/**
 * 在庫同期（ジョブキュー経由）
 * POST /products/:id/sync-inventory
 */
router.post('/products/:id/sync-inventory', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.shopifyProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Shopify product not found' });
    }

    if (!product.syncInventory) {
      return res.status(400).json({
        error: 'Inventory sync is disabled for this product',
      });
    }

    // ジョブキューに追加
    const job = await shopifySyncQueue.add('shopify-inventory-sync', {
      type: 'inventory-sync',
      shopifyProductId: id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info({ productId: id, jobId: job.id }, 'Shopify inventory sync job queued');

    res.json({
      message: 'Inventory sync started',
      productId: id,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to sync Shopify inventory');
    res.status(500).json({ error: 'Failed to sync Shopify inventory' });
  }
});

// ========================================
// 注文管理
// ========================================

/**
 * Shopify注文一覧
 * GET /orders?status=PENDING&limit=50&offset=0
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const {
      status,
      sourceChannel,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      marketplace: 'SHOPIFY',
    };
    if (status) where.status = status as string;
    if (sourceChannel) where.sourceChannel = sourceChannel as string;

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
    log.error({ error }, 'Failed to list Shopify orders');
    res.status(500).json({ error: 'Failed to list Shopify orders' });
  }
});

// ========================================
// ステータス・統計
// ========================================

/**
 * Shopify連携ステータス
 * GET /status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 認証ステータス
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'SHOPIFY',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const isAuthenticated = !!credential;
    const tokenExpiresAt = credential?.tokenExpiresAt || null;

    // 商品統計
    const [
      totalProducts,
      pendingProducts,
      activeProducts,
      pausedProducts,
      errorProducts,
    ] = await Promise.all([
      prisma.shopifyProduct.count(),
      prisma.shopifyProduct.count({ where: { status: 'PENDING' } }),
      prisma.shopifyProduct.count({ where: { status: 'ACTIVE' } }),
      prisma.shopifyProduct.count({ where: { status: 'PAUSED' } }),
      prisma.shopifyProduct.count({ where: { status: 'ERROR' } }),
    ]);

    // 注文統計
    const [totalOrders, pendingOrders, shippedOrders] = await Promise.all([
      prisma.order.count({ where: { marketplace: 'SHOPIFY' } }),
      prisma.order.count({ where: { marketplace: 'SHOPIFY', status: 'PENDING' } }),
      prisma.order.count({ where: { marketplace: 'SHOPIFY', status: 'SHIPPED' } }),
    ]);

    // 最後の同期日時
    const lastSync = await prisma.shopifyProduct.findFirst({
      where: { lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    // 接続チャネル情報（Shopify Hub経由）
    const channels = [
      {
        id: 'shopify-online-store',
        name: 'Shopify Online Store',
        type: 'SHOPIFY',
        status: isAuthenticated ? 'CONNECTED' : 'DISCONNECTED',
      },
      {
        id: 'instagram-shop',
        name: 'Instagram Shop',
        type: 'INSTAGRAM',
        status: 'PLANNED', // M-7予定
      },
      {
        id: 'tiktok-shop',
        name: 'TikTok Shop',
        type: 'TIKTOK',
        status: 'PLANNED', // M-8予定
      },
    ];

    res.json({
      auth: {
        isAuthenticated,
        tokenExpiresAt,
      },
      products: {
        total: totalProducts,
        pending: pendingProducts,
        active: activeProducts,
        paused: pausedProducts,
        error: errorProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        shipped: shippedOrders,
      },
      sync: {
        lastSyncAt: lastSync?.lastSyncAt || null,
      },
      channels,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get Shopify status');
    res.status(500).json({ error: 'Failed to get Shopify status' });
  }
});

// ========================================
// バッチ出品
// ========================================

/**
 * バッチ出品（複数商品を一括出品）
 * POST /batch-publish
 * Body: { productIds: string[] }
 */
router.post('/batch-publish', async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // 対象商品を検証
    const products = await prisma.shopifyProduct.findMany({
      where: {
        id: { in: productIds },
        status: { in: ['PENDING', 'ERROR'] },
      },
    });

    if (products.length === 0) {
      return res.status(400).json({
        error: 'No eligible products found for publishing',
      });
    }

    const eligibleIds = products.map((p) => p.id);

    // ステータスを一括更新
    await prisma.shopifyProduct.updateMany({
      where: { id: { in: eligibleIds } },
      data: { status: 'ACTIVE' },
    });

    // バッチジョブをキューに追加
    const job = await shopifySyncQueue.add('shopify-batch-publish', {
      type: 'batch-publish',
      productIds: eligibleIds,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    log.info(
      { productCount: eligibleIds.length, jobId: job.id },
      'Shopify batch publish job queued',
    );

    res.json({
      message: 'Batch publishing started',
      totalRequested: productIds.length,
      eligibleCount: eligibleIds.length,
      skippedCount: productIds.length - eligibleIds.length,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to batch publish Shopify products');
    res.status(500).json({ error: 'Failed to batch publish Shopify products' });
  }
});

// ========================================
// 販売チャネル
// ========================================

/**
 * 接続チャネル一覧
 * GET /channels
 * Shopify Hub経由の販売チャネル（Shopify, Instagram Shop, TikTok Shop）
 */
router.get('/channels', async (req: Request, res: Response) => {
  try {
    // Shopify認証ステータス確認
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'SHOPIFY',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const isShopifyConnected = !!credential;

    // Shopify Hub経由の全チャネル
    const channels = [
      {
        id: 'shopify-online-store',
        name: 'Shopify Online Store',
        type: 'SHOPIFY',
        description: '自社ECサイト',
        status: isShopifyConnected ? 'CONNECTED' : 'DISCONNECTED',
        productCount: isShopifyConnected
          ? await prisma.shopifyProduct.count({ where: { status: 'ACTIVE' } })
          : 0,
        features: ['直接販売', 'SEO最適化', 'Schema.org構造化データ'],
      },
      {
        id: 'instagram-shop',
        name: 'Instagram Shop',
        type: 'INSTAGRAM',
        description: 'Shopify「Facebook & Instagram」チャネル経由',
        status: 'PLANNED',
        productCount: 0,
        features: ['ビジュアルコマース', 'ストーリーズ販売', 'リール連携'],
        milestone: 'M-7',
      },
      {
        id: 'tiktok-shop',
        name: 'TikTok Shop',
        type: 'TIKTOK',
        description: 'Phase 1: Shopify経由、Phase 2: 直接API',
        status: 'PLANNED',
        productCount: 0,
        features: ['ライブコマース', 'ショートビデオ販売', 'アフィリエイト'],
        milestone: 'M-8',
      },
    ];

    res.json({ channels });
  } catch (error) {
    log.error({ error }, 'Failed to list sales channels');
    res.status(500).json({ error: 'Failed to list sales channels' });
  }
});

export default router;

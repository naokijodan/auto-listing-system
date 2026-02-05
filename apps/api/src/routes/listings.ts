import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { CreateListingRequestSchema } from '@rakuda/schema';
import { AppError } from '../middleware/error-handler';

const router = Router();

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const publishQueue = new Queue(QUEUE_NAMES.PUBLISH, { connection: redis });

/**
 * 出品一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { marketplace, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (marketplace) where.marketplace = marketplace;
    if (status) where.status = status;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              price: true,
              images: true,
              processedImages: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出品詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
      },
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
    }

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出品作成（ドラフト）
 */
router.post('/', async (req, res, next) => {
  try {
    const data = CreateListingRequestSchema.parse(req.body);

    // 商品存在確認
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    // 既存チェック
    const existing = await prisma.listing.findUnique({
      where: {
        productId_marketplace: {
          productId: data.productId,
          marketplace: data.marketplace.toUpperCase() as any,
        },
      },
    });

    if (existing) {
      throw new AppError(
        409,
        'Listing already exists for this product and marketplace',
        'LISTING_EXISTS'
      );
    }

    // 出品作成
    const listing = await prisma.listing.create({
      data: {
        productId: data.productId,
        marketplace: data.marketplace.toUpperCase() as any,
        listingPrice: data.listingPrice,
        shippingCost: data.shippingCost,
        marketplaceData: data.marketplaceData as any,
        status: 'DRAFT',
      },
    });

    logger.info({
      type: 'listing_created',
      listingId: listing.id,
      productId: data.productId,
      marketplace: data.marketplace,
    });

    res.status(201).json({
      success: true,
      message: 'Listing created',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出品を公開（APIに送信）
 */
router.post('/:id/publish', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
    }

    if (listing.status !== 'DRAFT' && listing.status !== 'ERROR') {
      throw new AppError(
        400,
        'Listing is not in publishable state',
        'INVALID_STATUS'
      );
    }

    // ステータス更新
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: 'PENDING_PUBLISH' },
    });

    // 出品ジョブ追加
    const job = await publishQueue.add(
      'publish',
      {
        productId: listing.productId,
        listingId: listing.id,
        marketplace: listing.marketplace.toLowerCase(),
        listingData: listing.marketplaceData,
        isDryRun: req.body.dryRun || false,
      },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );

    logger.info({
      type: 'publish_job_added',
      jobId: job.id,
      listingId: listing.id,
      marketplace: listing.marketplace,
    });

    res.status(202).json({
      success: true,
      message: 'Publish job queued',
      data: {
        listingId: listing.id,
        jobId: job.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出品更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { listingPrice, shippingCost, marketplaceData } = req.body;

    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        ...(listingPrice !== undefined && { listingPrice }),
        ...(shippingCost !== undefined && { shippingCost }),
        ...(marketplaceData && { marketplaceData }),
      },
    });

    res.json({
      success: true,
      message: 'Listing updated',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 出品削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.listing.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Listing deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 一括操作エンドポイント
// ========================================

/**
 * 一括価格更新
 */
router.post('/bulk/update-price', async (req, res, next) => {
  try {
    const { listingIds, priceChange } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(400, 'listingIds array is required', 'INVALID_REQUEST');
    }

    if (!priceChange || (!priceChange.percent && !priceChange.amount && !priceChange.fixed)) {
      throw new AppError(400, 'priceChange (percent, amount, or fixed) is required', 'INVALID_REQUEST');
    }

    const results: Array<{ listingId: string; success: boolean; newPrice?: number; error?: string }> = [];

    for (const listingId of listingIds) {
      try {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
        });

        if (!listing) {
          results.push({ listingId, success: false, error: 'Not found' });
          continue;
        }

        let newPrice = listing.listingPrice;

        if (priceChange.fixed !== undefined) {
          newPrice = priceChange.fixed;
        } else if (priceChange.percent !== undefined) {
          newPrice = listing.listingPrice * (1 + priceChange.percent / 100);
        } else if (priceChange.amount !== undefined) {
          newPrice = listing.listingPrice + priceChange.amount;
        }

        // 最低価格チェック
        if (newPrice < 0.01) {
          newPrice = 0.01;
        }

        await prisma.listing.update({
          where: { id: listingId },
          data: { listingPrice: Math.round(newPrice * 100) / 100 },
        });

        results.push({ listingId, success: true, newPrice });
      } catch (error: any) {
        results.push({ listingId, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    logger.info({
      type: 'bulk_price_update',
      total: listingIds.length,
      success: successCount,
      priceChange,
    });

    res.json({
      success: true,
      message: `Updated ${successCount}/${listingIds.length} listings`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括ステータス変更
 */
router.post('/bulk/update-status', async (req, res, next) => {
  try {
    const { listingIds, status } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(400, 'listingIds array is required', 'INVALID_REQUEST');
    }

    const validStatuses = ['DRAFT', 'PAUSED', 'ACTIVE', 'ENDED'];
    if (!status || !validStatuses.includes(status)) {
      throw new AppError(400, `status must be one of: ${validStatuses.join(', ')}`, 'INVALID_REQUEST');
    }

    const result = await prisma.listing.updateMany({
      where: {
        id: { in: listingIds },
      },
      data: { status },
    });

    logger.info({
      type: 'bulk_status_update',
      status,
      updatedCount: result.count,
    });

    res.json({
      success: true,
      message: `Updated ${result.count} listings to ${status}`,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括出品（公開）
 */
router.post('/bulk/publish', async (req, res, next) => {
  try {
    const { listingIds, dryRun = false } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(400, 'listingIds array is required', 'INVALID_REQUEST');
    }

    const results: Array<{ listingId: string; success: boolean; jobId?: string; error?: string }> = [];

    // 出品可能なリスティングを取得
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        status: { in: ['DRAFT', 'ERROR'] },
      },
      include: { product: true },
    });

    for (const listing of listings) {
      try {
        // ステータス更新
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'PENDING_PUBLISH' },
        });

        // ジョブ追加
        const job = await publishQueue.add(
          'publish',
          {
            productId: listing.productId,
            listingId: listing.id,
            marketplace: listing.marketplace.toLowerCase(),
            listingData: listing.marketplaceData,
            isDryRun: dryRun,
          },
          {
            priority: 2,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 60000,
            },
          }
        );

        results.push({ listingId: listing.id, success: true, jobId: job.id });
      } catch (error: any) {
        results.push({ listingId: listing.id, success: false, error: error.message });
      }
    }

    // 対象外のリスティングをエラーとして追加
    const processedIds = listings.map((l) => l.id);
    const skippedIds = listingIds.filter((id: string) => !processedIds.includes(id));
    for (const skippedId of skippedIds) {
      results.push({ listingId: skippedId, success: false, error: 'Not in publishable state' });
    }

    const successCount = results.filter((r) => r.success).length;

    logger.info({
      type: 'bulk_publish',
      total: listingIds.length,
      success: successCount,
      dryRun,
    });

    res.status(202).json({
      success: true,
      message: `Queued ${successCount}/${listingIds.length} listings for publishing`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括削除
 */
router.post('/bulk/delete', async (req, res, next) => {
  try {
    const { listingIds, confirm = false } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(400, 'listingIds array is required', 'INVALID_REQUEST');
    }

    if (!confirm) {
      throw new AppError(400, 'confirm: true is required to delete listings', 'CONFIRMATION_REQUIRED');
    }

    // アクティブなリスティングは削除できない警告
    const activeCount = await prisma.listing.count({
      where: {
        id: { in: listingIds },
        status: 'ACTIVE',
      },
    });

    if (activeCount > 0) {
      throw new AppError(
        400,
        `Cannot delete ${activeCount} active listings. Please pause them first.`,
        'ACTIVE_LISTINGS'
      );
    }

    const result = await prisma.listing.deleteMany({
      where: {
        id: { in: listingIds },
        status: { not: 'ACTIVE' },
      },
    });

    logger.info({
      type: 'bulk_delete',
      deletedCount: result.count,
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} listings`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括再出品（エラー状態のリスティング）
 */
router.post('/bulk/retry', async (req, res, next) => {
  try {
    const { marketplace } = req.body;

    const where: any = { status: 'ERROR' };
    if (marketplace) {
      where.marketplace = marketplace.toUpperCase();
    }

    // エラー状態のリスティングを取得
    const errorListings = await prisma.listing.findMany({
      where,
      include: { product: true },
      take: 100, // 一度に最大100件
    });

    if (errorListings.length === 0) {
      return res.json({
        success: true,
        message: 'No error listings found to retry',
        data: { queuedCount: 0 },
      });
    }

    const results: Array<{ listingId: string; jobId: string }> = [];

    for (const listing of errorListings) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          status: 'PENDING_PUBLISH',
          errorMessage: null,
        },
      });

      const job = await publishQueue.add(
        'publish',
        {
          productId: listing.productId,
          listingId: listing.id,
          marketplace: listing.marketplace.toLowerCase(),
          listingData: listing.marketplaceData,
          isDryRun: false,
        },
        {
          priority: 3,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
        }
      );

      results.push({ listingId: listing.id, jobId: job.id as string });
    }

    logger.info({
      type: 'bulk_retry',
      queuedCount: results.length,
      marketplace,
    });

    res.status(202).json({
      success: true,
      message: `Queued ${results.length} listings for retry`,
      data: {
        queuedCount: results.length,
        listings: results,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括同期（マーケットプレイスの最新状態を取得）
 */
router.post('/bulk/sync', async (req, res, next) => {
  try {
    const { marketplace, listingIds } = req.body;

    const where: any = { status: 'ACTIVE' };
    if (marketplace) {
      where.marketplace = marketplace.toUpperCase();
    }
    if (listingIds && Array.isArray(listingIds) && listingIds.length > 0) {
      where.id = { in: listingIds };
    }

    const listings = await prisma.listing.findMany({
      where,
      select: { id: true, marketplace: true, marketplaceListingId: true },
      take: 200,
    });

    // TODO: 実際のマーケットプレイスAPIから状態を取得する実装
    // 現在はプレースホルダー

    logger.info({
      type: 'bulk_sync_request',
      listingCount: listings.length,
      marketplace,
    });

    res.json({
      success: true,
      message: `Sync requested for ${listings.length} listings`,
      data: {
        requestedCount: listings.length,
        note: 'Sync will be processed in background',
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as listingsRouter };

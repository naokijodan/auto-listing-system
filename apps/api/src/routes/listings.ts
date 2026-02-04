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

export { router as listingsRouter };

import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { QUEUE_NAMES } from '@als/config';
import {
  ScrapedProductSchema,
  parseScrapedProduct,
  generateSourceHash,
} from '@als/schema';
import { AppError } from '../middleware/error-handler';

const router = Router();

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });
const imageQueue = new Queue(QUEUE_NAMES.IMAGE, { connection: redis });
const translateQueue = new Queue(QUEUE_NAMES.TRANSLATE, { connection: redis });

/**
 * 商品一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = status ? { status: status as any } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          source: true,
          listings: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
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
 * 商品詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        listings: true,
        jobLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * スクレイピングリクエスト（URLから商品取得）
 */
router.post('/scrape', async (req, res, next) => {
  try {
    const { url, sourceType, priority = 0 } = req.body;

    if (!url || !sourceType) {
      throw new AppError(400, 'url and sourceType are required', 'INVALID_REQUEST');
    }

    // ジョブ追加
    const job = await scrapeQueue.add(
      'scrape',
      {
        url,
        sourceType,
        priority,
        retryCount: 0,
      },
      {
        priority,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      }
    );

    logger.info({
      type: 'scrape_job_added',
      jobId: job.id,
      url,
      sourceType,
    });

    res.status(202).json({
      success: true,
      message: 'Scrape job queued',
      data: {
        jobId: job.id,
        url,
        sourceType,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 商品手動登録（スクレイピング済みデータ）
 */
router.post('/', async (req, res, next) => {
  try {
    const data = parseScrapedProduct(req.body);
    const sourceHash = generateSourceHash(data);

    // ソース取得または作成
    let source = await prisma.source.findFirst({
      where: { type: data.sourceType.toUpperCase() as any },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          type: data.sourceType.toUpperCase() as any,
          name: data.sourceType,
        },
      });
    }

    // 既存チェック
    const existing = await prisma.product.findUnique({
      where: {
        sourceId_sourceItemId: {
          sourceId: source.id,
          sourceItemId: data.sourceItemId,
        },
      },
    });

    if (existing) {
      // ハッシュ比較で変更チェック
      if (existing.sourceHash === sourceHash) {
        return res.json({
          success: true,
          message: 'Product already exists (no changes)',
          data: existing,
        });
      }

      // 更新
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          images: data.images,
          category: data.category,
          brand: data.brand,
          condition: data.condition,
          weight: data.weight,
          sourceHash,
          scrapedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'Product updated',
        data: updated,
      });
    }

    // 新規作成
    const product = await prisma.product.create({
      data: {
        sourceId: source.id,
        sourceItemId: data.sourceItemId,
        sourceUrl: data.sourceUrl,
        sourceHash,
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        category: data.category,
        brand: data.brand,
        condition: data.condition,
        weight: data.weight,
        sellerId: data.sellerId,
        sellerName: data.sellerName,
        scrapedAt: new Date(),
      },
    });

    // 画像処理キューに追加
    await imageQueue.add(
      'process-images',
      {
        productId: product.id,
        imageUrls: product.images,
        removeBackground: true,
      },
      { priority: 4 }
    );

    // 翻訳キューに追加
    await translateQueue.add(
      'translate',
      {
        productId: product.id,
        title: product.title,
        description: product.description,
        extractAttributes: true,
      },
      { priority: 3 }
    );

    logger.info({
      type: 'product_created',
      productId: product.id,
      sourceType: data.sourceType,
    });

    res.status(201).json({
      success: true,
      message: 'Product created',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 商品削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'DELETED' },
    });

    res.json({
      success: true,
      message: 'Product deleted',
    });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };

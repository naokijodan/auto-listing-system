import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import {
  ScrapedProductSchema,
  parseScrapedProduct,
  generateSourceHash,
} from '@rakuda/schema';
import { AppError } from '../middleware/error-handler';
import { parseCsv, rowToProduct, productsToCsv } from '../utils/csv';

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
 * 商品エクスポート（CSV）
 * 注意: /:id より前に定義する必要がある
 */
router.get('/export', async (req, res, next) => {
  try {
    const { status, ids } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }
    if (ids) {
      const idArray = (ids as string).split(',');
      where.id = { in: idArray };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        source: true,
        listings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csv = productsToCsv(products);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products_${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
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
 * Chrome拡張から呼び出される
 */
router.post('/scrape', async (req, res, next) => {
  try {
    const { url, source, sourceType, marketplace = ['joom'], options = {}, priority = 0 } = req.body;

    const resolvedSource = source || sourceType;
    if (!url || !resolvedSource) {
      throw new AppError(400, 'url and source are required', 'INVALID_REQUEST');
    }

    // ジョブ追加
    const job = await scrapeQueue.add(
      'scrape',
      {
        url,
        sourceType: resolvedSource,
        marketplace: Array.isArray(marketplace) ? marketplace : [marketplace],
        options: {
          processImages: options.processImages ?? true,
          translate: options.translate ?? true,
          removeBackground: options.removeBackground ?? true,
        },
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
      source: resolvedSource,
      marketplace,
    });

    res.status(202).json({
      success: true,
      message: 'Scrape job queued',
      jobId: job.id,
      data: {
        jobId: job.id,
        url,
        source: resolvedSource,
        marketplace,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * セラー一括スクレイピング
 * セラーページのURLから全商品を取得
 */
router.post('/scrape-seller', async (req, res, next) => {
  try {
    const { url, source, marketplace = ['joom'], options = {}, priority = 0 } = req.body;

    if (!url || !source) {
      throw new AppError(400, 'url and source are required', 'INVALID_REQUEST');
    }

    const limit = options.limit || 50;

    // セラー一括スクレイピングジョブ追加
    const job = await scrapeQueue.add(
      'scrape-seller',
      {
        url,
        sourceType: source,
        marketplace: Array.isArray(marketplace) ? marketplace : [marketplace],
        options: {
          processImages: options.processImages ?? true,
          translate: options.translate ?? true,
          removeBackground: options.removeBackground ?? true,
          limit,
        },
        priority,
        retryCount: 0,
      },
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );

    logger.info({
      type: 'scrape_seller_job_added',
      jobId: job.id,
      url,
      source,
      limit,
    });

    res.status(202).json({
      success: true,
      message: 'Seller scrape job queued',
      jobId: job.id,
      count: limit,
      data: {
        jobId: job.id,
        url,
        source,
        marketplace,
        limit,
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

/**
 * 商品インポート（CSV）
 */
router.post('/import', async (req, res, next) => {
  try {
    const { csv, sourceType = 'OTHER' } = req.body;

    if (!csv) {
      throw new AppError(400, 'CSV data is required', 'INVALID_REQUEST');
    }

    const rows = parseCsv(csv);
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // ソース取得または作成
    let source = await prisma.source.findFirst({
      where: { type: sourceType.toUpperCase() as any },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          type: sourceType.toUpperCase() as any,
          name: sourceType,
        },
      });
    }

    for (let i = 0; i < rows.length; i++) {
      try {
        const productData = rowToProduct(rows[i]);

        if (!productData.title) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: title is required`);
          continue;
        }

        // sourceItemIdを生成（URLまたはタイトルのハッシュ）
        const sourceItemId =
          productData.sourceUrl ||
          Buffer.from(productData.title).toString('base64').slice(0, 20);

        // 既存チェック
        const existing = await prisma.product.findUnique({
          where: {
            sourceId_sourceItemId: {
              sourceId: source.id,
              sourceItemId,
            },
          },
        });

        if (existing) {
          // 更新
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              title: productData.title,
              titleEn: productData.titleEn,
              price: productData.price,
              brand: productData.brand,
              category: productData.category,
              condition: productData.condition,
              description: productData.description || '',
              images: productData.images || [],
            },
          });
          results.updated++;
        } else {
          // 新規作成
          await prisma.product.create({
            data: {
              sourceId: source.id,
              sourceItemId,
              sourceUrl: productData.sourceUrl || '',
              title: productData.title,
              titleEn: productData.titleEn,
              price: productData.price,
              brand: productData.brand,
              category: productData.category,
              condition: productData.condition,
              description: productData.description || '',
              images: productData.images || [],
              status: 'SCRAPED',
              scrapedAt: new Date(),
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    logger.info({
      type: 'products_imported',
      ...results,
    });

    res.json({
      success: true,
      message: 'Import completed',
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括削除
 */
router.delete('/bulk', async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, 'ids array is required', 'INVALID_REQUEST');
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: 'DELETED' },
    });

    logger.info({
      type: 'products_bulk_deleted',
      count: result.count,
      ids,
    });

    res.json({
      success: true,
      message: `${result.count} products deleted`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括更新
 */
router.patch('/bulk', async (req, res, next) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, 'ids array is required', 'INVALID_REQUEST');
    }

    if (!updates || typeof updates !== 'object') {
      throw new AppError(400, 'updates object is required', 'INVALID_REQUEST');
    }

    // 許可されたフィールドのみ更新
    const allowedFields = ['status', 'brand', 'category', 'condition', 'price'];
    const safeUpdates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new AppError(400, 'No valid updates provided', 'INVALID_REQUEST');
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: safeUpdates,
    });

    logger.info({
      type: 'products_bulk_updated',
      count: result.count,
      updates: safeUpdates,
    });

    res.json({
      success: true,
      message: `${result.count} products updated`,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括出品
 */
router.post('/bulk/publish', async (req, res, next) => {
  try {
    const { ids, marketplace = 'JOOM', listingPrice } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, 'ids array is required', 'INVALID_REQUEST');
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: { not: 'DELETED' } },
    });

    const createdListings = [];

    for (const product of products) {
      // 既存の出品がなければ作成
      const existingListing = await prisma.listing.findUnique({
        where: {
          productId_marketplace: {
            productId: product.id,
            marketplace: marketplace as any,
          },
        },
      });

      if (!existingListing) {
        const listing = await prisma.listing.create({
          data: {
            productId: product.id,
            marketplace: marketplace as any,
            listingPrice: listingPrice || product.price / 150, // Simple conversion
            status: 'PENDING_PUBLISH',
          },
        });
        createdListings.push(listing);
      }
    }

    logger.info({
      type: 'products_bulk_publish',
      count: createdListings.length,
      marketplace,
    });

    res.json({
      success: true,
      message: `${createdListings.length} listings created`,
      data: { createdCount: createdListings.length },
    });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };

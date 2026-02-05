import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES, EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';
import {
  ScrapedProductSchema,
  parseScrapedProduct,
  generateSourceHash,
} from '@rakuda/schema';
import { AppError } from '../middleware/error-handler';
import { parseCsv, rowToProduct, productsToCsv, validateAndParseCsv, generateCsvTemplate } from '../utils/csv';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

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
 * @openapi
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: 商品一覧取得
 *     description: フィルタリング、検索、ソート機能付きの商品一覧を取得します
 *     parameters:
 *       - name: status
 *         in: query
 *         description: 商品ステータスでフィルター
 *         schema:
 *           type: string
 *           enum: [PENDING_SCRAPE, PROCESSING_IMAGE, TRANSLATING, READY_TO_REVIEW, APPROVED, PUBLISHING, ACTIVE, SOLD, OUT_OF_STOCK, ERROR, DELETED]
 *       - name: search
 *         in: query
 *         description: 全文検索（タイトル、説明、ブランド）
 *         schema:
 *           type: string
 *       - name: brand
 *         in: query
 *         description: ブランドでフィルター
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         description: カテゴリでフィルター
 *         schema:
 *           type: string
 *       - name: sourceType
 *         in: query
 *         description: 仕入れ元でフィルター
 *         schema:
 *           type: string
 *           enum: [mercari, yahoo_auction, yahoo_flea, rakuma, rakuten, amazon]
 *       - name: minPrice
 *         in: query
 *         description: 最低価格
 *         schema:
 *           type: number
 *       - name: maxPrice
 *         in: query
 *         description: 最高価格
 *         schema:
 *           type: number
 *       - name: sortBy
 *         in: query
 *         description: ソートフィールド
 *         schema:
 *           type: string
 *           enum: [createdAt, price, title, updatedAt, scrapedAt]
 *           default: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: ソート順
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - name: limit
 *         in: query
 *         description: 取得件数
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         description: オフセット
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 商品一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      status,
      limit = 50,
      offset = 0,
      search,
      brand,
      category,
      sourceType,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // 検索条件を構築
    const where: any = {};

    // ステータスフィルター
    if (status) {
      where.status = status as string;
    }

    // 全文検索（タイトル、説明、英語タイトル）
    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { titleEn: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { sourceItemId: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // ブランドフィルター
    if (brand) {
      where.brand = { contains: brand as string, mode: 'insensitive' };
    }

    // カテゴリフィルター
    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    // ソースタイプフィルター
    if (sourceType) {
      where.source = { type: (sourceType as string).toUpperCase() };
    }

    // 価格範囲フィルター
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    // ソート設定
    const allowedSortFields = ['createdAt', 'price', 'title', 'updatedAt', 'scrapedAt'];
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const orderBy = { [sortField as string]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy,
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
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: 商品詳細取得
 *     description: 指定したIDの商品詳細を取得します
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 商品ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 商品詳細
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @openapi
 * /api/products/scrape:
 *   post:
 *     tags:
 *       - Products
 *     summary: スクレイピングリクエスト
 *     description: |
 *       URLから商品情報をスクレイピングしてデータベースに登録します。
 *       Chrome拡張からも呼び出されます。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - source
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: スクレイピング対象のURL
 *                 example: https://www.mercari.com/jp/items/m12345678/
 *               source:
 *                 type: string
 *                 description: ソースタイプ
 *                 enum: [mercari, yahoo_auction, yahoo_flea, rakuma, rakuten, amazon]
 *               marketplace:
 *                 type: array
 *                 description: 出品先マーケットプレイス
 *                 items:
 *                   type: string
 *                   enum: [joom, ebay]
 *                 default: [joom]
 *               options:
 *                 type: object
 *                 properties:
 *                   processImages:
 *                     type: boolean
 *                     default: true
 *                   translate:
 *                     type: boolean
 *                     default: true
 *                   removeBackground:
 *                     type: boolean
 *                     default: true
 *               priority:
 *                 type: integer
 *                 description: ジョブ優先度（0が最高）
 *                 default: 0
 *     responses:
 *       202:
 *         description: ジョブがキューに追加されました
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scrape job queued
 *                 jobId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     url:
 *                       type: string
 *                     source:
 *                       type: string
 *                     marketplace:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 * @openapi
 * /api/products/import/template:
 *   get:
 *     tags:
 *       - Products
 *     summary: CSVテンプレート取得
 *     description: インポート用のCSVテンプレートをダウンロードします
 *     responses:
 *       200:
 *         description: CSVテンプレート
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/import/template', (_req, res) => {
  const template = generateCsvTemplate();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="import_template.csv"');
  res.send(template);
});

/**
 * @openapi
 * /api/products/import/validate:
 *   post:
 *     tags:
 *       - Products
 *     summary: CSVバリデーション
 *     description: インポート前にCSVをバリデーションします
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csv
 *             properties:
 *               csv:
 *                 type: string
 *                 description: CSVデータ（文字列）
 *     responses:
 *       200:
 *         description: バリデーション結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       column:
 *                         type: string
 *                       message:
 *                         type: string
 *                       value:
 *                         type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalRows:
 *                       type: integer
 *                     validRows:
 *                       type: integer
 *                     invalidRows:
 *                       type: integer
 *                     skippedRows:
 *                       type: integer
 */
router.post('/import/validate', async (req, res, next) => {
  try {
    const { csv } = req.body;

    if (!csv) {
      throw new AppError(400, 'CSV data is required', 'INVALID_REQUEST');
    }

    const validationResult = validateAndParseCsv(csv);

    res.json({
      success: true,
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      stats: validationResult.stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/products/import:
 *   post:
 *     tags:
 *       - Products
 *     summary: 商品インポート（CSV）
 *     description: CSVファイルから商品を一括インポートします
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csv
 *             properties:
 *               csv:
 *                 type: string
 *                 description: CSVデータ（文字列）
 *               sourceType:
 *                 type: string
 *                 description: ソースタイプ
 *                 default: OTHER
 *     responses:
 *       200:
 *         description: インポート結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                     updated:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/import', async (req, res, next) => {
  try {
    const { csv, sourceType = 'OTHER' } = req.body;

    if (!csv) {
      throw new AppError(400, 'CSV data is required', 'INVALID_REQUEST');
    }

    // まずバリデーション
    const validationResult = validateAndParseCsv(csv);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'CSV validation failed',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        stats: validationResult.stats,
      });
    }

    const rows = validationResult.data || [];
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
            listingPrice: listingPrice || product.price / DEFAULT_USD_TO_JPY,
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

/**
 * 削除を取り消し（復元）
 */
router.post('/restore', async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, 'ids array is required', 'INVALID_REQUEST');
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, status: 'DELETED' },
      data: { status: 'SCRAPED' },
    });

    logger.info({
      type: 'products_restored',
      count: result.count,
      ids,
    });

    res.json({
      success: true,
      message: `${result.count} products restored`,
      data: { restoredCount: result.count },
    });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };

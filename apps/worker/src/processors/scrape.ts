import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { ScrapeJobPayload, ScrapeJobResult, generateSourceHash } from '@rakuda/schema';
import { scrapeProduct, scrapeSellerProducts, SourceType } from '../lib/scrapers';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const imageQueue = new Queue(QUEUE_NAMES.IMAGE, { connection: redis });
const translateQueue = new Queue(QUEUE_NAMES.TRANSLATE, { connection: redis });

/**
 * スクレイピングジョブプロセッサー
 */
export async function processScrapeJob(
  job: Job<ScrapeJobPayload>
): Promise<ScrapeJobResult> {
  const { url, sourceType, isBulkScrape, sellerId } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'scrape' });

  log.info({ type: 'scrape_start', url, sourceType });

  // ジョブ名でセラー一括か単品か判定
  const isSellerScrape = job.name === 'scrape-seller';

  if (isSellerScrape) {
    return processSellerScrape(job, log as any);
  }

  return processSingleScrape(job, log as any);
}

/**
 * 単一商品スクレイピング
 */
async function processSingleScrape(
  job: Job<ScrapeJobPayload>,
  log: ReturnType<typeof logger.child>
): Promise<ScrapeJobResult> {
  const { url, sourceType, marketplace = ['joom'], options = {} } = job.data as any;

  try {
    // スクレイピング実行
    const result = await scrapeProduct(url, sourceType as SourceType);

    if (!result.success || !result.product) {
      log.error({ type: 'scrape_failed', error: result.error });
      throw new Error(result.error || 'Scraping failed');
    }

    const scrapedProduct = result.product;
    const sourceHash = generateSourceHash(scrapedProduct);

    // ソース取得
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

    // 既存商品チェック
    const existing = await prisma.product.findUnique({
      where: {
        sourceId_sourceItemId: {
          sourceId: source.id,
          sourceItemId: scrapedProduct.sourceItemId,
        },
      },
    });

    let product;

    if (existing) {
      // ハッシュ比較
      if (existing.sourceHash === sourceHash) {
        log.info({ type: 'product_unchanged', productId: existing.id });
        return {
          success: true,
          message: 'Product already exists (no changes)',
          productId: existing.id,
          timestamp: new Date().toISOString(),
        };
      }

      // 更新
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: scrapedProduct.title,
          description: scrapedProduct.description,
          price: scrapedProduct.price,
          images: scrapedProduct.images,
          category: scrapedProduct.category,
          brand: scrapedProduct.brand,
          condition: scrapedProduct.condition,
          sourceHash,
          scrapedAt: new Date(),
          status: 'SCRAPED',
        },
      });

      log.info({ type: 'product_updated', productId: product.id });
    } else {
      // 新規作成
      product = await prisma.product.create({
        data: {
          sourceId: source.id,
          sourceItemId: scrapedProduct.sourceItemId,
          sourceUrl: scrapedProduct.sourceUrl,
          sourceHash,
          title: scrapedProduct.title,
          description: scrapedProduct.description,
          price: scrapedProduct.price,
          images: scrapedProduct.images,
          category: scrapedProduct.category,
          brand: scrapedProduct.brand,
          condition: scrapedProduct.condition,
          sellerId: scrapedProduct.sellerId,
          sellerName: scrapedProduct.sellerName,
          scrapedAt: new Date(),
          status: 'SCRAPED',
        },
      });

      log.info({ type: 'product_created', productId: product.id });
    }

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `scrape-${Date.now()}`,
        queueName: 'scrape',
        jobType: 'SCRAPE',
        status: 'COMPLETED',
        productId: product.id,
        result: { sourceType, url },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 画像処理キューに追加
    if (options.processImages !== false) {
      await imageQueue.add(
        'process-images',
        {
          productId: product.id,
          imageUrls: product.images,
          removeBackground: options.removeBackground ?? true,
        },
        { priority: 4 }
      );
      log.info({ type: 'image_job_queued', productId: product.id });
    }

    // 翻訳キューに追加
    if (options.translate !== false) {
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
      log.info({ type: 'translate_job_queued', productId: product.id });
    }

    return {
      success: true,
      message: 'Product scraped successfully',
      productId: product.id,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'scrape_error', error: error.message });

    // エラーログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `scrape-${Date.now()}`,
        queueName: 'scrape',
        jobType: 'SCRAPE',
        status: 'FAILED',
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * セラー一括スクレイピング
 */
async function processSellerScrape(
  job: Job<ScrapeJobPayload>,
  log: ReturnType<typeof logger.child>
): Promise<ScrapeJobResult> {
  const { url, sourceType, options = {} } = job.data as any;
  const limit = options.limit || 50;

  try {
    log.info({ type: 'seller_scrape_start', url, limit });

    // セラーページから商品一覧をスクレイピング
    const result = await scrapeSellerProducts(url, sourceType as SourceType, limit);

    if (!result.success || !result.products) {
      log.error({ type: 'seller_scrape_failed', error: result.error });
      throw new Error(result.error || 'Seller scraping failed');
    }

    const products = result.products;
    log.info({ type: 'seller_products_found', count: products.length });

    // 各商品を処理
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const scrapedProduct of products) {
      const sourceHash = generateSourceHash(scrapedProduct);

      // ソース取得
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

      // 既存チェック
      const existing = await prisma.product.findUnique({
        where: {
          sourceId_sourceItemId: {
            sourceId: source.id,
            sourceItemId: scrapedProduct.sourceItemId,
          },
        },
      });

      let product;

      if (existing) {
        if (existing.sourceHash === sourceHash) {
          skippedCount++;
          continue;
        }

        product = await prisma.product.update({
          where: { id: existing.id },
          data: {
            title: scrapedProduct.title,
            description: scrapedProduct.description,
            price: scrapedProduct.price,
            images: scrapedProduct.images,
            sourceHash,
            scrapedAt: new Date(),
            status: 'SCRAPED',
          },
        });
        updatedCount++;
      } else {
        product = await prisma.product.create({
          data: {
            sourceId: source.id,
            sourceItemId: scrapedProduct.sourceItemId,
            sourceUrl: scrapedProduct.sourceUrl,
            sourceHash,
            title: scrapedProduct.title,
            description: scrapedProduct.description,
            price: scrapedProduct.price,
            images: scrapedProduct.images,
            category: scrapedProduct.category,
            brand: scrapedProduct.brand,
            condition: scrapedProduct.condition,
            sellerId: scrapedProduct.sellerId,
            sellerName: scrapedProduct.sellerName,
            scrapedAt: new Date(),
            status: 'SCRAPED',
          },
        });
        createdCount++;
      }

      // 画像処理・翻訳キューに追加
      if (options.processImages !== false) {
        await imageQueue.add(
          'process-images',
          {
            productId: product.id,
            imageUrls: product.images,
            removeBackground: options.removeBackground ?? true,
          },
          { priority: 4 }
        );
      }

      if (options.translate !== false) {
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
      }
    }

    log.info({
      type: 'seller_scrape_complete',
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
    });

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `scrape-seller-${Date.now()}`,
        queueName: 'scrape',
        jobType: 'SCRAPE',
        status: 'COMPLETED',
        result: {
          sourceType,
          url,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Seller scrape completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`,
      itemCount: createdCount + updatedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'seller_scrape_error', error: error.message });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `scrape-seller-${Date.now()}`,
        queueName: 'scrape',
        jobType: 'SCRAPE',
        status: 'FAILED',
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

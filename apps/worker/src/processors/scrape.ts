import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { ScrapeJobPayload, ScrapeJobResult, generateSourceHash } from '@rakuda/schema';
import { scrapeProduct, scrapeSellerProducts, SourceType } from '../lib/scrapers';
import { alertManager } from '../lib/alert-manager';
import { SourceType as PrismaSourceType } from '@prisma/client';
import { canScrape, incrementDailyCount } from '../lib/scraping-daily-limit';
import { isCircuitOpen, recordScrapeSuccess, recordScrapeError, recordScrapeCaptcha, recordScrapeBan } from '../lib/scraping-circuit-breaker';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const imageQueue = new Queue(QUEUE_NAMES.IMAGE, { connection: redis });
const translateQueue = new Queue(QUEUE_NAMES.TRANSLATE, { connection: redis });

// バッチ処理設定
const BATCH_SIZE = 10; // 並列処理数
const BATCH_DELAY_MS = 1000; // バッチ間の遅延

/**
 * 進捗状況をRedisに保存
 */
async function updateJobProgress(
  jobId: string,
  progress: {
    total: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }
): Promise<void> {
  const key = `rakuda:job:${jobId}:progress`;
  await redis.set(key, JSON.stringify(progress), 'EX', 3600);
}

/**
 * 進捗状況を取得
 */
export async function getJobProgress(jobId: string): Promise<{
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
} | null> {
  const key = `rakuda:job:${jobId}:progress`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * スクレイピングジョブプロセッサー
 */
export async function processScrapeJob(
  job: Job<ScrapeJobPayload>
): Promise<ScrapeJobResult> {
  const { url, sourceType, isBulkScrape, sellerId } = job.data as any;
  const log = logger.child({ jobId: job.id, processor: 'scrape' });

  log.info({ type: 'scrape_start', url, sourceType });

  // ジョブ名でセラー一括か単品か判定
  const isSellerScrape = job.name === 'scrape-seller';

  // ebay-taxonomy-sync ジョブ
  if (job.name === 'ebay-taxonomy-sync' || (job.data as any)?.type === 'ebay-taxonomy-sync') {
    const { EbayApiClient } = await import('../lib/ebay-api');
    const client = new EbayApiClient();
    const marketplaceIds: string[] = (job.data as any).marketplaceIds || ['EBAY_US'];
    const categoryIds: string[] | undefined = (job.data as any).categoryIds;

    for (const marketplaceId of marketplaceIds) {
      // アクティブなEbayCategoryMappingを取得
      const mappings = categoryIds && categoryIds.length > 0
        ? await prisma.ebayCategoryMapping.findMany({
            where: { isActive: true, ebayCategoryId: { in: categoryIds } },
            select: { ebayCategoryId: true },
          })
        : await prisma.ebayCategoryMapping.findMany({
            where: { isActive: true },
            select: { ebayCategoryId: true },
          });

      let updated = 0;
      for (const mapping of mappings) {
        try {
          await client.fetchAndCacheItemAspects(mapping.ebayCategoryId, marketplaceId);
          updated++;
        } catch (err: any) {
          log.warn({ type: 'taxonomy_sync_category_error', categoryId: mapping.ebayCategoryId, error: err.message });
        }
      }
      log.info({ type: 'ebay_taxonomy_sync_completed', marketplaceId, updated, total: mappings.length });
    }
    return { success: true } as any;
  }

  // ebay-policy-sync ジョブ
  if (job.name === 'ebay-policy-sync' || (job.data as any)?.type === 'ebay-policy-sync') {
    const { EbayApiClient } = await import('../lib/ebay-api');
    const client = new EbayApiClient();
    const marketplaceIds: string[] = (job.data as any).marketplaceIds || ['EBAY_US'];

    for (const marketplaceId of marketplaceIds) {
      const result = await client.syncPolicies(marketplaceId);
      log.info({ type: 'ebay_policy_sync_completed', marketplaceId, result });
    }
    return { success: true } as any;
  }

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
  const { url, sourceType } = job.data;
  const marketplace = (job.data as any).marketplace ?? ['joom'];
  const options = (job.data as any).options ?? {};

  try {
    // Circuit Breaker チェック（スクレイピング実行前）
    const preCircuit = await isCircuitOpen((sourceType as string).toLowerCase());
    if (preCircuit.open) {
      log.warn({ type: 'circuit_open', sourceType, reason: preCircuit.reason });
      throw new Error(`Scraping halted for ${sourceType}: ${preCircuit.reason}`);
    }

    // Daily Limit チェック
    const dailyStatus = await canScrape();
    if (!dailyStatus.allowed) {
      log.warn({
        type: 'daily_limit_reached',
        currentCount: dailyStatus.currentCount,
        dailyLimit: dailyStatus.dailyLimit,
        phase: dailyStatus.phase,
      });
      throw new Error(`Daily scraping limit reached (${dailyStatus.currentCount}/${dailyStatus.dailyLimit})`);
    }

    // スクレイピング実行
    // Scrapers expect lowercase identifiers
    const scraperSourceType = (sourceType as string).toLowerCase() as SourceType;
    const result = await scrapeProduct(url, scraperSourceType);

    // Circuit Breaker: 結果記録
    if (result.captchaDetected) {
      await recordScrapeCaptcha((sourceType as string).toLowerCase());
    }
    if (result.blocked) {
      await recordScrapeBan((sourceType as string).toLowerCase());
    }

    if (!result.success || !result.product) {
      log.error({ type: 'scrape_failed', error: result.error });
      throw new Error(result.error || 'Scraping failed');
    }

    await recordScrapeSuccess((sourceType as string).toLowerCase());

    const scrapedProduct = result.product;
    const sourceHash = generateSourceHash(scrapedProduct);

    // ソース取得
    let source = await prisma.source.findFirst({
      where: { type: (sourceType as string).toUpperCase() as PrismaSourceType },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          type: (sourceType as string).toUpperCase() as PrismaSourceType,
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
        // 成功扱いとしてカウント（変更なしでもアクセスは発生）
        await incrementDailyCount();
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

    // 成功したので日次カウントを1増加
    await incrementDailyCount();

    return {
      success: true,
      message: 'Product scraped successfully',
      productId: product.id,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'scrape_error', error: error.message });
    // Circuit Breaker: エラー記録
    try {
      await recordScrapeError((sourceType as string).toLowerCase(), error.message);
    } catch {}

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

    // Phase 26: AlertManager経由のアラート発火
    await alertManager.processEvent({
      type: 'SCRAPE_ERROR',
      data: {
        source: sourceType,
        url,
        error: error.message,
      },
      timestamp: new Date().toISOString(),
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
  const { url, sourceType } = job.data;
  const options = (job.data as any).options ?? {};
  const limit = options.limit || 50;
  const batchSize = options.batchSize || BATCH_SIZE;

  try {
    // Daily Limit チェック
    const dailyStatus = await canScrape();
    if (!dailyStatus.allowed) {
      log.warn({
        type: 'daily_limit_reached',
        currentCount: dailyStatus.currentCount,
        dailyLimit: dailyStatus.dailyLimit,
        phase: dailyStatus.phase,
      });
      throw new Error(`Daily scraping limit reached (${dailyStatus.currentCount}/${dailyStatus.dailyLimit})`);
    }

    log.info({ type: 'seller_scrape_start', url, limit, batchSize });

    // セラーページから商品一覧をスクレイピング
    const scraperSourceType = (sourceType as string).toLowerCase() as SourceType;

    // Circuit Breaker チェック（実行前）
    const preCircuit = await isCircuitOpen((sourceType as string).toLowerCase());
    if (preCircuit.open) {
      log.warn({ type: 'circuit_open', sourceType, reason: preCircuit.reason });
      throw new Error(`Scraping halted for ${sourceType}: ${preCircuit.reason}`);
    }

    const result = await scrapeSellerProducts(url, scraperSourceType, limit);

    // Circuit Breaker: 結果記録
    if (result.captchaDetected) {
      await recordScrapeCaptcha((sourceType as string).toLowerCase());
    }
    if (result.blocked) {
      await recordScrapeBan((sourceType as string).toLowerCase());
    }

    if (!result.success || !result.products) {
      log.error({ type: 'seller_scrape_failed', error: result.error });
      throw new Error(result.error || 'Seller scraping failed');
    }

    await recordScrapeSuccess((sourceType as string).toLowerCase());

    const products = result.products;
    log.info({ type: 'seller_products_found', count: products.length });

    // 進捗追跡用
    const progress = {
      total: products.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    // 初期進捗を保存
    if (job.id) {
      await updateJobProgress(job.id, progress);
      await job.updateProgress(0);
    }

    // バッチ処理で各商品を処理
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      await Promise.all(batch.map(async (scrapedProduct) => {
        try {
          const processResult = await processSingleProductFromBatch(
            scrapedProduct,
            sourceType,
            options,
            log
          );

          if (processResult === 'created') {
            progress.created++;
          } else if (processResult === 'updated') {
            progress.updated++;
          } else {
            progress.skipped++;
          }
        } catch (error) {
          progress.failed++;
          log.warn({ type: 'batch_item_failed', error: (error as Error).message });
        }
        progress.processed++;
      }));

      // 進捗を更新
      if (job.id) {
        await updateJobProgress(job.id, progress);
        await job.updateProgress(Math.round((progress.processed / progress.total) * 100));
      }

      // バッチ間の遅延
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    log.info({
      type: 'seller_scrape_complete',
      created: progress.created,
      updated: progress.updated,
      skipped: progress.skipped,
      failed: progress.failed,
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
          ...progress,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 商品単位のカウントを加算（作成+更新分）
    await incrementDailyCount(progress.created + progress.updated);

    return {
      success: true,
      message: `Seller scrape completed: ${progress.created} created, ${progress.updated} updated, ${progress.skipped} skipped, ${progress.failed} failed`,
      itemCount: progress.created + progress.updated,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'seller_scrape_error', error: error.message });
    // Circuit Breaker: エラー記録
    try {
      await recordScrapeError((sourceType as string).toLowerCase(), error.message);
    } catch {}

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

    // Phase 26: AlertManager経由のアラート発火
    await alertManager.processEvent({
      type: 'SCRAPE_ERROR',
      data: {
        source: sourceType,
        url,
        error: error.message,
        isBulkScrape: true,
      },
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * バッチ内の単一商品を処理
 */
async function processSingleProductFromBatch(
  scrapedProduct: any,
  sourceType: string,
  options: any,
  log: ReturnType<typeof logger.child>
): Promise<'created' | 'updated' | 'skipped'> {
  const sourceHash = generateSourceHash(scrapedProduct);

  // ソース取得
  let source = await prisma.source.findFirst({
    where: { type: (sourceType as string).toUpperCase() as PrismaSourceType },
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        type: (sourceType as string).toUpperCase() as PrismaSourceType,
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
  let result: 'created' | 'updated' | 'skipped';

  if (existing) {
    if (existing.sourceHash === sourceHash) {
      return 'skipped';
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
    result = 'updated';
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
    result = 'created';
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

  return result;
}

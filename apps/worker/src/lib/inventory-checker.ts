import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@als/config';
import { scrapeMercari } from './scrapers/mercari';
import { scrapeYahooAuction } from './scrapers/yahoo-auction';
import crypto from 'crypto';

const log = logger.child({ module: 'inventory-checker' });

/**
 * 在庫チェック結果
 */
export interface InventoryCheckResult {
  productId: string;
  isAvailable: boolean;
  currentPrice: number | null;
  priceChanged: boolean;
  hashChanged: boolean;
  newHash: string | null;
  action: 'none' | 'update_price' | 'mark_out_of_stock' | 'delist';
  error?: string;
}

/**
 * バッチ在庫チェック設定
 */
export interface BatchCheckConfig {
  batchSize: number;
  delayBetweenChecks: number; // ミリ秒
  maxConcurrent: number;
}

const DEFAULT_BATCH_CONFIG: BatchCheckConfig = {
  batchSize: 50,
  delayBetweenChecks: 3000, // 3秒
  maxConcurrent: 2,
};

/**
 * 単一商品の在庫チェック
 */
export async function checkSingleProductInventory(
  productId: string
): Promise<InventoryCheckResult> {
  log.info({ type: 'single_inventory_check_start', productId });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      source: true,
      listings: true,
    },
  });

  if (!product) {
    return {
      productId,
      isAvailable: false,
      currentPrice: null,
      priceChanged: false,
      hashChanged: false,
      newHash: null,
      action: 'none',
      error: 'Product not found',
    };
  }

  try {
    // ソースタイプに応じたスクレイピング
    let scrapeResult;
    switch (product.source.type) {
      case 'MERCARI':
        scrapeResult = await scrapeMercari(product.sourceUrl);
        break;
      case 'YAHOO_AUCTION':
        scrapeResult = await scrapeYahooAuction(product.sourceUrl);
        break;
      default:
        log.warn({ type: 'unsupported_source', sourceType: product.source.type });
        return {
          productId,
          isAvailable: true,
          currentPrice: product.price,
          priceChanged: false,
          hashChanged: false,
          newHash: null,
          action: 'none',
          error: `Unsupported source type: ${product.source.type}`,
        };
    }

    if (!scrapeResult.success) {
      log.error({ type: 'scrape_failed', productId, error: scrapeResult.error });
      return {
        productId,
        isAvailable: false,
        currentPrice: null,
        priceChanged: false,
        hashChanged: false,
        newHash: null,
        action: 'none',
        error: scrapeResult.error,
      };
    }

    const scrapedProduct = scrapeResult.product!;
    const isAvailable = scrapedProduct.isAvailable ?? true;
    const currentPrice = scrapedProduct.price;
    const priceChanged = currentPrice !== product.price;

    // ハッシュ計算（タイトル、説明、価格、在庫状況）
    const contentForHash = `${scrapedProduct.title}|${scrapedProduct.description}|${currentPrice}|${isAvailable}`;
    const newHash = crypto.createHash('md5').update(contentForHash).digest('hex');
    const hashChanged = newHash !== product.sourceHash;

    // アクション決定
    let action: InventoryCheckResult['action'] = 'none';
    if (!isAvailable) {
      action = 'mark_out_of_stock';
    } else if (priceChanged) {
      action = 'update_price';
    }

    // DB更新
    await prisma.product.update({
      where: { id: productId },
      data: {
        sourceHash: newHash,
        price: currentPrice,
        status: isAvailable ? product.status : 'OUT_OF_STOCK',
        updatedAt: new Date(),
      },
    });

    // 出品中の商品がある場合、在庫切れなら取り下げ
    if (!isAvailable && product.listings.length > 0) {
      const activeListings = product.listings.filter(l => l.status === 'ACTIVE');
      if (activeListings.length > 0) {
        action = 'delist';
        // 出品ステータス更新
        await prisma.listing.updateMany({
          where: {
            productId,
            status: 'ACTIVE',
          },
          data: {
            status: 'ENDED',
            updatedAt: new Date(),
          },
        });
      }
    }

    log.info({
      type: 'single_inventory_check_complete',
      productId,
      isAvailable,
      priceChanged,
      hashChanged,
      action,
    });

    return {
      productId,
      isAvailable,
      currentPrice,
      priceChanged,
      hashChanged,
      newHash,
      action,
    };
  } catch (error: any) {
    log.error({ type: 'inventory_check_error', productId, error: error.message });
    return {
      productId,
      isAvailable: false,
      currentPrice: null,
      priceChanged: false,
      hashChanged: false,
      newHash: null,
      action: 'none',
      error: error.message,
    };
  }
}

/**
 * バッチ在庫チェック - アクティブな商品全てをチェック
 */
export async function runBatchInventoryCheck(
  config: Partial<BatchCheckConfig> = {}
): Promise<{
  total: number;
  checked: number;
  outOfStock: number;
  priceChanged: number;
  errors: number;
}> {
  const finalConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
  log.info({ type: 'batch_inventory_check_start', config: finalConfig });

  // アクティブな商品を取得（出品中またはREADY_TO_REVIEW以降）
  const products = await prisma.product.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'],
      },
    },
    select: {
      id: true,
    },
    take: finalConfig.batchSize,
    orderBy: {
      updatedAt: 'asc', // 古い順にチェック
    },
  });

  const stats = {
    total: products.length,
    checked: 0,
    outOfStock: 0,
    priceChanged: 0,
    errors: 0,
  };

  // バッチ処理
  for (const product of products) {
    try {
      const result = await checkSingleProductInventory(product.id);
      stats.checked++;

      if (!result.isAvailable) {
        stats.outOfStock++;
      }
      if (result.priceChanged) {
        stats.priceChanged++;
      }
      if (result.error) {
        stats.errors++;
      }

      // レート制限: 次のチェックまで待機
      await new Promise(resolve => setTimeout(resolve, finalConfig.delayBetweenChecks));
    } catch (error: any) {
      stats.errors++;
      log.error({ type: 'batch_check_item_error', productId: product.id, error: error.message });
    }
  }

  log.info({ type: 'batch_inventory_check_complete', stats });
  return stats;
}

/**
 * 在庫チェックジョブをキューに追加
 */
export async function queueInventoryChecks(productIds?: string[]): Promise<number> {
  const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });

  let products;
  if (productIds && productIds.length > 0) {
    // 指定された商品のみ
    products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sourceUrl: true, sourceHash: true },
    });
  } else {
    // 全アクティブ商品
    products = await prisma.product.findMany({
      where: {
        status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] },
      },
      select: { id: true, sourceUrl: true, sourceHash: true },
    });
  }

  let queuedCount = 0;
  for (const product of products) {
    await inventoryQueue.add(
      'inventory-check',
      {
        productId: product.id,
        sourceUrl: product.sourceUrl,
        currentHash: product.sourceHash,
        checkPrice: true,
        checkStock: true,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    queuedCount++;
  }

  await inventoryQueue.close();
  await redis.quit();

  log.info({ type: 'inventory_checks_queued', count: queuedCount });
  return queuedCount;
}

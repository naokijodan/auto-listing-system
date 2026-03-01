import { prisma, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  QUEUE_NAMES,
  processBatch,
  BatchProcessorConfig,
  BatchProgressInfo,
} from '@rakuda/config';
import { scrapeMercari } from './scrapers/mercari';
import { scrapeYahooAuction } from './scrapers/yahoo-auction';
import { scrapePayPayFlea } from './scrapers/paypay-flea';
import { scrapeRakuma } from './scrapers/rakuma';
import { scrapeRakuten } from './scrapers/rakuten';
import { scrapeAmazon } from './scrapers/amazon';
import { notifyOutOfStock, notifyPriceChanged } from './notifications';
import { alertManager } from './alert-manager';
import { eventBus } from './event-bus';
import { syncListingInventory } from '../processors/inventory-sync';
import crypto from 'crypto';

const log = logger.child({ module: 'inventory-checker' });

/**
 * アラート設定
 */
export interface AlertSettings {
  priceChangeThresholdPercent: number; // 価格変動通知閾値 (%)
  priceChangeNotifyEnabled: boolean;
  outOfStockNotifyEnabled: boolean;
  maxRetries: number;
  retryDelayMs: number; // 初期リトライ遅延
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  priceChangeThresholdPercent: 10, // 10%以上の変動で通知
  priceChangeNotifyEnabled: true,
  outOfStockNotifyEnabled: true,
  maxRetries: 3,
  retryDelayMs: 5000,
};

/**
 * アラート設定を取得（環境変数またはデフォルト）
 */
export function getAlertSettings(): AlertSettings {
  return {
    priceChangeThresholdPercent: parseInt(process.env.PRICE_CHANGE_THRESHOLD_PERCENT || '10'),
    priceChangeNotifyEnabled: process.env.PRICE_CHANGE_NOTIFY !== 'false',
    outOfStockNotifyEnabled: process.env.OUT_OF_STOCK_NOTIFY !== 'false',
    maxRetries: parseInt(process.env.INVENTORY_MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.INVENTORY_RETRY_DELAY_MS || '5000'),
  };
}

/**
 * 指数バックオフでリトライ
 */
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 5000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        log.warn({
          type: 'retry_with_backoff',
          attempt: attempt + 1,
          maxRetries,
          delayMs: Math.round(delay),
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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
  /** 進捗コールバック */
  onProgress?: (info: BatchProgressInfo<string, InventoryCheckResult>) => void;
  /** 最大エラー数（これを超えると停止） */
  maxErrors?: number;
}

const DEFAULT_BATCH_CONFIG: BatchCheckConfig = {
  batchSize: 50,
  delayBetweenChecks: 3000, // 3秒
  maxConcurrent: 2,
  maxErrors: 20,
};

/**
 * 単一商品の在庫チェック
 */
export async function checkSingleProductInventory(
  productId: string,
  alertSettings?: Partial<AlertSettings>
): Promise<InventoryCheckResult> {
  const settings = { ...getAlertSettings(), ...alertSettings };
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
    // ソースタイプに応じたスクレイピング（指数バックオフ付きリトライ）
    // 未対応はクラッシュさせずスキップ（楽観的に在庫あり）
    let scrapeFn: ((url: string) => Promise<{ success: boolean; product?: any; error?: string }>) | null = null;
    switch (product.source.type) {
      case 'MERCARI':
        scrapeFn = scrapeMercari;
        break;
      case 'YAHOO_AUCTION':
        scrapeFn = scrapeYahooAuction;
        break;
      case 'YAHOO_FLEA':
        scrapeFn = scrapePayPayFlea;
        break;
      case 'RAKUMA':
        scrapeFn = scrapeRakuma;
        break;
      case 'RAKUTEN':
        scrapeFn = scrapeRakuten;
        break;
      case 'AMAZON':
        scrapeFn = scrapeAmazon;
        break;
      case 'TAKAYAMA':
      case 'JOSHIN':
      case 'OTHER':
        log.warn({ sourceType: product.source.type, productId: product.id },
          'Inventory check not yet implemented for this source type, skipping');
        return {
          productId,
          isAvailable: true,
          currentPrice: product.price ?? null,
          priceChanged: false,
          hashChanged: false,
          newHash: null,
          action: 'none',
        };
      default:
        log.warn({ sourceType: product.source.type, productId: product.id },
          'Unknown source type for inventory check, skipping');
        return {
          productId,
          isAvailable: true,
          currentPrice: product.price ?? null,
          priceChanged: false,
          hashChanged: false,
          newHash: null,
          action: 'none',
        };
    }

    const scrapeResult = await withExponentialBackoff(
      async () => {
        return await scrapeFn!(product.sourceUrl);
      },
      settings.maxRetries,
      settings.retryDelayMs
    );

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

    // 価格変動率の計算
    const priceChangePercent = product.price > 0
      ? ((currentPrice - product.price) / product.price) * 100
      : 0;

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
    const activeListings = product.listings.filter(l => l.status === 'ACTIVE');
    if (!isAvailable && activeListings.length > 0) {
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

      // Joom/eBay出品の在庫を0に同期（Phase 41-G/41-H）
      const marketplaceListings = activeListings.filter(
        l => (l.marketplace === 'JOOM' || l.marketplace === 'EBAY') && l.marketplaceListingId
      );
      for (const listing of marketplaceListings) {
        try {
          const syncResult = await syncListingInventory(listing.id, 0);
          if (syncResult.success) {
            log.info({
              type: 'marketplace_inventory_synced_on_out_of_stock',
              listingId: listing.id,
              marketplace: listing.marketplace,
              productId,
            });
          } else {
            log.warn({
              type: 'marketplace_inventory_sync_failed',
              listingId: listing.id,
              marketplace: listing.marketplace,
              productId,
              error: syncResult.error,
            });
          }
        } catch (syncError: any) {
          log.error({
            type: 'marketplace_inventory_sync_error',
            listingId: listing.id,
            marketplace: listing.marketplace,
            productId,
            error: syncError.message,
          });
        }
      }
    }

    // 通知作成とアラート送信
    if (!isAvailable && settings.outOfStockNotifyEnabled) {
      // DB通知作成
      await prisma.notification.create({
        data: {
          type: 'OUT_OF_STOCK',
          title: '在庫切れ検知',
          message: `「${product.title}」が仕入元で在庫切れになりました。`,
          severity: 'WARNING',
          productId,
          metadata: {
            sourceUrl: product.sourceUrl,
            affectedListings: activeListings.length,
          },
        },
      });

      // 外部通知（Slack/Discord/LINE）
      await notifyOutOfStock(product.title, product.sourceUrl, activeListings.length);

      // Phase 26: AlertManager経由のアラート発火
      await alertManager.processEvent({
        type: 'INVENTORY_OUT_OF_STOCK',
        productId,
        listingId: activeListings[0]?.id,
        data: {
          title: product.title,
          sourceUrl: product.sourceUrl,
          marketplace: activeListings[0]?.marketplace || 'unknown',
          affectedListings: activeListings.length,
        },
        timestamp: new Date().toISOString(),
      });

      // Phase 27: リアルタイムイベント発火
      await eventBus.publishInventoryChange(productId, 'updated', {
        status: 'out_of_stock',
        title: product.title,
        affectedListings: activeListings.length,
      });
    }

    // 価格変動通知（閾値を超えた場合のみ）
    if (
      priceChanged &&
      settings.priceChangeNotifyEnabled &&
      Math.abs(priceChangePercent) >= settings.priceChangeThresholdPercent
    ) {
      // DB通知作成
      await prisma.notification.create({
        data: {
          type: 'PRICE_CHANGE',
          title: `仕入価格${priceChangePercent > 0 ? '上昇' : '下落'}`,
          message: `「${product.title}」の仕入価格が${Math.abs(priceChangePercent).toFixed(1)}%${priceChangePercent > 0 ? '上昇' : '下落'}しました。`,
          severity: Math.abs(priceChangePercent) > 20 ? 'WARNING' : 'INFO',
          productId,
          metadata: {
            oldPrice: product.price,
            newPrice: currentPrice,
            changePercent: priceChangePercent,
          },
        },
      });

      // 外部通知
      await notifyPriceChanged(product.title, product.price, currentPrice, priceChangePercent);

      // Phase 26: AlertManager経由のアラート発火（20%以上の変動）
      if (Math.abs(priceChangePercent) >= 20) {
        await alertManager.processEvent({
          type: 'PRICE_DROP_DETECTED',
          productId,
          data: {
            title: product.title,
            oldPrice: product.price,
            newPrice: currentPrice,
            changePercent: priceChangePercent,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Phase 27: リアルタイムイベント発火
      await eventBus.publishPriceChange(productId, {
        oldPrice: product.price,
        newPrice: currentPrice,
        changePercent: priceChangePercent,
        title: product.title,
      });
    }

    log.info({
      type: 'single_inventory_check_complete',
      productId,
      isAvailable,
      priceChanged,
      priceChangePercent: priceChanged ? priceChangePercent.toFixed(1) : 0,
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
 * Phase 46: 並列処理対応版
 */
export async function runBatchInventoryCheck(
  config: Partial<BatchCheckConfig> = {}
): Promise<{
  total: number;
  checked: number;
  outOfStock: number;
  priceChanged: number;
  errors: number;
  duration: number;
  itemsPerMinute: number;
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

  if (products.length === 0) {
    log.info({ type: 'batch_inventory_check_no_products' });
    return {
      total: 0,
      checked: 0,
      outOfStock: 0,
      priceChanged: 0,
      errors: 0,
      duration: 0,
      itemsPerMinute: 0,
    };
  }

  const productIds = products.map(p => p.id);

  // 並列バッチ処理を実行
  const batchResult = await processBatch<string, InventoryCheckResult>(
    productIds,
    async (productId) => {
      return checkSingleProductInventory(productId);
    },
    {
      config: {
        concurrency: finalConfig.maxConcurrent,
        chunkSize: Math.min(finalConfig.batchSize, 20),
        delayBetweenItems: finalConfig.delayBetweenChecks,
        delayBetweenChunks: 5000,
        continueOnError: true,
        maxErrors: finalConfig.maxErrors || 20,
        itemTimeout: 60000,
        retryCount: 2,
        retryDelay: 5000,
        useExponentialBackoff: true,
      },
      onProgress: finalConfig.onProgress,
      onItemStart: (productId, index) => {
        log.debug({
          type: 'inventory_check_item_start',
          productId,
          index,
          total: productIds.length,
        });
      },
      onItemComplete: (result) => {
        if (result.success && result.result) {
          log.debug({
            type: 'inventory_check_item_complete',
            productId: result.item,
            isAvailable: result.result.isAvailable,
            priceChanged: result.result.priceChanged,
            duration: result.duration,
          });
        }
      },
      onError: (productId, error, index) => {
        log.error({
          type: 'inventory_check_item_error',
          productId,
          index,
          error: error.message,
        });
      },
      logger: (message, data) => {
        log.debug({ type: message, ...data });
      },
    }
  );

  // 結果を集計
  let outOfStock = 0;
  let priceChanged = 0;

  for (const result of batchResult.results) {
    if (result.success && result.result) {
      if (!result.result.isAvailable) {
        outOfStock++;
      }
      if (result.result.priceChanged) {
        priceChanged++;
      }
    }
  }

  const stats = {
    total: productIds.length,
    checked: batchResult.stats.processed,
    outOfStock,
    priceChanged,
    errors: batchResult.stats.failed,
    duration: batchResult.stats.duration,
    itemsPerMinute: batchResult.stats.itemsPerSecond * 60,
  };

  log.info({
    type: 'batch_inventory_check_complete',
    stats,
    aborted: batchResult.aborted,
  });

  return stats;
}

/**
 * 並列在庫同期（Phase 46）
 * マーケットプレイスの在庫を並列で同期
 */
export async function runParallelInventorySync(
  marketplace: 'joom' | 'ebay',
  options: {
    maxListings?: number;
    concurrency?: number;
    onProgress?: (info: BatchProgressInfo<string, { success: boolean; error?: string }>) => void;
  } = {}
): Promise<{
  total: number;
  synced: number;
  failed: number;
  duration: number;
}> {
  const maxListings = options.maxListings || 100;
  const concurrency = options.concurrency || 3;

  log.info({
    type: 'parallel_inventory_sync_start',
    marketplace,
    maxListings,
    concurrency,
  });

  // アクティブなリスティングを取得
  const listings = await prisma.listing.findMany({
    where: {
      marketplace: marketplace.toUpperCase() as any,
      status: 'ACTIVE',
      marketplaceListingId: { not: null },
    },
    take: maxListings,
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
  });

  if (listings.length === 0) {
    log.info({ type: 'parallel_inventory_sync_no_listings', marketplace });
    return { total: 0, synced: 0, failed: 0, duration: 0 };
  }

  const listingIds = listings.map(l => l.id);

  // 並列バッチ処理
  const batchResult = await processBatch<string, { success: boolean; error?: string }>(
    listingIds,
    async (listingId) => {
      try {
        const result = await syncListingInventory(listingId, 1);
        return { success: result.success, error: result.error };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    {
      config: {
        concurrency,
        chunkSize: 20,
        delayBetweenItems: 500,
        delayBetweenChunks: 2000,
        continueOnError: true,
        maxErrors: 20,
        itemTimeout: 30000,
        retryCount: 1,
        retryDelay: 2000,
        useExponentialBackoff: true,
      },
      onProgress: options.onProgress,
      logger: (message, data) => {
        log.debug({ type: message, ...data });
      },
    }
  );

  const result = {
    total: listingIds.length,
    synced: batchResult.stats.succeeded,
    failed: batchResult.stats.failed,
    duration: batchResult.stats.duration,
  };

  log.info({
    type: 'parallel_inventory_sync_complete',
    ...result,
    itemsPerMinute: (batchResult.stats.itemsPerSecond * 60).toFixed(2),
  });

  return result;
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

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';
import { scrapeMercari } from './scrapers/mercari';
import { scrapeYahooAuction } from './scrapers/yahoo-auction';
import { notifyOutOfStock, notifyPriceChanged } from './notifications';
import { alertManager } from './alert-manager';
import { eventBus } from './event-bus';
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
    const scrapeResult = await withExponentialBackoff(
      async () => {
        switch (product.source.type) {
          case 'MERCARI':
            return await scrapeMercari(product.sourceUrl);
          case 'YAHOO_AUCTION':
            return await scrapeYahooAuction(product.sourceUrl);
          default:
            throw new Error(`Unsupported source type: ${product.source.type}`);
        }
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

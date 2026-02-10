import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { notifyStockOutWebhook, notifyPriceChangedWebhook } from './notification-service';

const log = logger.child({ module: 'inventory-sync' });

interface InventorySyncResult {
  productId: string;
  isAvailable: boolean;
  currentPrice: number | null;
  priceChanged: boolean;
  stockChanged: boolean;
  source: string;
  error?: string;
}

// ソース別のスクレイピング設定
const SOURCE_CONFIGS: Record<string, {
  checkAvailability: (url: string) => Promise<{ available: boolean; price: number | null }>;
  rateLimit: number; // ms between requests
}> = {
  MERCARI: {
    checkAvailability: async (url) => {
      // メルカリの在庫チェック（実装はモック）
      // 実際にはPuppeteer/Playwrightでスクレイピング
      return { available: true, price: null };
    },
    rateLimit: 5000,
  },
  YAHOO_AUCTION: {
    checkAvailability: async (url) => {
      // ヤフオクの在庫チェック
      return { available: true, price: null };
    },
    rateLimit: 3000,
  },
  AMAZON_JP: {
    checkAvailability: async (url) => {
      // Amazon JPの在庫チェック
      return { available: true, price: null };
    },
    rateLimit: 2000,
  },
};

/**
 * 単一商品の在庫同期
 */
export async function syncProductInventory(productId: string): Promise<InventorySyncResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      listings: { where: { status: 'ACTIVE' } },
      source: true,
    },
  });

  if (!product) {
    return {
      productId,
      isAvailable: false,
      currentPrice: null,
      priceChanged: false,
      stockChanged: false,
      source: 'UNKNOWN',
      error: 'Product not found',
    };
  }

  const sourceType = product.source?.type || 'UNKNOWN';
  const sourceUrl = product.sourceUrl;

  if (!sourceUrl) {
    return {
      productId,
      isAvailable: false,
      currentPrice: null,
      priceChanged: false,
      stockChanged: false,
      source: sourceType,
      error: 'No source URL',
    };
  }

  try {
    const config = SOURCE_CONFIGS[sourceType];
    if (!config) {
      log.warn({ type: 'unknown_source', sourceType });
      return {
        productId,
        isAvailable: true, // 不明なソースは在庫ありとして扱う
        currentPrice: product.price,
        priceChanged: false,
        stockChanged: false,
        source: sourceType,
      };
    }

    const result = await config.checkAvailability(sourceUrl);
    const priceChanged = result.price !== null && result.price !== product.price;
    const stockChanged = !result.available;

    // InventoryLogに記録
    await prisma.inventoryLog.create({
      data: {
        productId,
        listingId: product.listings[0]?.id,
        price: result.price || product.price,
        stock: result.available ? 1 : 0,
        isAvailable: result.available,
        priceChanged,
        stockChanged,
        previousPrice: product.price,
        previousStock: 1,
        sourceUrl,
        metadata: {
          source: sourceType,
          syncedBy: 'inventory-sync',
        },
      },
    });

    // 在庫切れ通知
    if (!result.available && product.listings.length > 0) {
      await notifyStockOutWebhook({
        productId,
        title: product.titleEn || product.title || 'Unknown',
        listingId: product.listings[0].id,
        marketplace: product.listings[0].marketplace,
        sourceUrl,
      });

      // リスティングをPAUSEDに
      for (const listing of product.listings) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'PAUSED' },
        });
      }
    }

    // 価格変動通知
    if (priceChanged && result.price) {
      const changePercent = ((result.price - product.price) / product.price) * 100;
      await notifyPriceChangedWebhook({
        productId,
        title: product.titleEn || product.title || 'Unknown',
        oldPrice: product.price,
        newPrice: result.price,
        changePercent,
        marketplace: product.listings[0]?.marketplace,
      });

      // 商品価格を更新
      await prisma.product.update({
        where: { id: productId },
        data: { price: result.price },
      });
    }

    return {
      productId,
      isAvailable: result.available,
      currentPrice: result.price,
      priceChanged,
      stockChanged,
      source: sourceType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ type: 'sync_error', productId, error: errorMessage });
    return {
      productId,
      isAvailable: true, // エラー時は在庫ありとして扱う（安全側）
      currentPrice: null,
      priceChanged: false,
      stockChanged: false,
      source: sourceType,
      error: errorMessage,
    };
  }
}

/**
 * バッチ在庫同期
 */
export async function runBatchInventorySync(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  limit?: number;
  delayMs?: number;
}): Promise<{
  total: number;
  synced: number;
  outOfStock: number;
  priceChanged: number;
  errors: number;
}> {
  const limit = options?.limit || 50;
  const delayMs = options?.delayMs || 3000;
  const marketplace = options?.marketplace;

  log.info({ type: 'batch_sync_start', limit, marketplace });

  // ACTIVEリスティングを持つ商品を取得
  const whereClause: Record<string, unknown> = { status: 'ACTIVE' };
  if (marketplace) {
    whereClause.marketplace = marketplace;
  }

  const listings = await prisma.listing.findMany({
    where: whereClause,
    include: { product: true },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  const stats = {
    total: listings.length,
    synced: 0,
    outOfStock: 0,
    priceChanged: 0,
    errors: 0,
  };

  for (const listing of listings) {
    const result = await syncProductInventory(listing.productId);
    stats.synced++;

    if (!result.isAvailable) stats.outOfStock++;
    if (result.priceChanged) stats.priceChanged++;
    if (result.error) stats.errors++;

    // レート制限
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  log.info({ type: 'batch_sync_complete', stats });
  return stats;
}

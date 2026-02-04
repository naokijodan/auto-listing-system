import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { calculatePrice, PriceCalculationInput } from './price-calculator';
import { getLatestExchangeRate } from './exchange-rate';
import { joomApi, isJoomConfigured } from './joom-api';
import { ebayApi, isEbayConfigured } from './ebay-api';

const log = logger.child({ module: 'price-sync' });

/**
 * 価格同期結果
 */
export interface PriceSyncResult {
  listingId: string;
  marketplace: string;
  oldPrice: number;
  newPrice: number;
  priceChanged: boolean;
  apiUpdated: boolean;
  error?: string;
}

/**
 * 単一の出品の価格を再計算して同期
 */
export async function syncListingPrice(listingId: string): Promise<PriceSyncResult> {
  log.info({ type: 'price_sync_start', listingId });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      product: {
        include: { source: true },
      },
    },
  });

  if (!listing) {
    return {
      listingId,
      marketplace: 'unknown',
      oldPrice: 0,
      newPrice: 0,
      priceChanged: false,
      apiUpdated: false,
      error: 'Listing not found',
    };
  }

  const oldPrice = listing.listingPrice;

  try {
    // マーケットプレイスを小文字に変換
    const marketplace = listing.marketplace.toLowerCase() as 'joom' | 'ebay';

    // 価格再計算
    const input: PriceCalculationInput = {
      sourcePrice: listing.product.price,
      weight: listing.product.weight || 200,
      category: listing.product.category || undefined,
      marketplace,
      region: 'US',
    };

    const calculation = await calculatePrice(input);
    const newPrice = calculation.listingPrice;

    // 価格変動があるかチェック（1%以上の変動）
    const priceChanged = Math.abs(newPrice - oldPrice) / oldPrice > 0.01;

    if (!priceChanged) {
      log.info({
        type: 'price_sync_no_change',
        listingId,
        oldPrice,
        newPrice,
      });

      return {
        listingId,
        marketplace: listing.marketplace,
        oldPrice,
        newPrice,
        priceChanged: false,
        apiUpdated: false,
      };
    }

    // DB更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        listingPrice: newPrice,
        shippingCost: calculation.shippingCost,
        updatedAt: new Date(),
      },
    });

    // マーケットプレイスAPIで価格更新（アクティブな出品のみ）
    let apiUpdated = false;
    if (listing.status === 'ACTIVE' && listing.marketplaceListingId) {
      try {
        if (listing.marketplace === 'JOOM' && await isJoomConfigured()) {
          // Joom updatePrice takes (productId, sku, price)
          const marketplaceDataJoom = listing.marketplaceData as { sku?: string };
          if (marketplaceDataJoom.sku) {
            await joomApi.updatePrice(
              listing.marketplaceListingId,
              marketplaceDataJoom.sku,
              newPrice
            );
            apiUpdated = true;
          }
        } else if (listing.marketplace === 'EBAY' && await isEbayConfigured()) {
          // eBayはofferIdを使って価格更新
          const marketplaceData = listing.marketplaceData as { offerId?: string };
          if (marketplaceData.offerId) {
            await ebayApi.updatePrice(marketplaceData.offerId, newPrice, 'USD');
            apiUpdated = true;
          }
        }
      } catch (apiError: any) {
        log.error({
          type: 'price_sync_api_error',
          listingId,
          marketplace: listing.marketplace,
          error: apiError.message,
        });
      }
    }

    log.info({
      type: 'price_sync_complete',
      listingId,
      marketplace: listing.marketplace,
      oldPrice,
      newPrice,
      priceChanged: true,
      apiUpdated,
    });

    return {
      listingId,
      marketplace: listing.marketplace,
      oldPrice,
      newPrice,
      priceChanged: true,
      apiUpdated,
    };
  } catch (error: any) {
    log.error({ type: 'price_sync_error', listingId, error: error.message });
    return {
      listingId,
      marketplace: listing.marketplace,
      oldPrice,
      newPrice: oldPrice,
      priceChanged: false,
      apiUpdated: false,
      error: error.message,
    };
  }
}

/**
 * 全アクティブ出品の価格を同期
 */
export async function syncAllPrices(options: {
  marketplace?: 'JOOM' | 'EBAY';
  batchSize?: number;
} = {}): Promise<{
  success: boolean;
  total: number;
  updated: number;
  apiUpdated: number;
  errors: number;
}> {
  const { marketplace, batchSize = 100 } = options;
  log.info({ type: 'sync_all_prices_start', marketplace, batchSize });

  const whereClause: any = {
    status: 'ACTIVE',
  };

  if (marketplace) {
    whereClause.marketplace = marketplace;
  }

  const listings = await prisma.listing.findMany({
    where: whereClause,
    select: { id: true },
    take: batchSize,
    orderBy: { updatedAt: 'asc' },
  });

  const stats = {
    total: listings.length,
    updated: 0,
    apiUpdated: 0,
    errors: 0,
  };

  for (const listing of listings) {
    try {
      const result = await syncListingPrice(listing.id);

      if (result.priceChanged) stats.updated++;
      if (result.apiUpdated) stats.apiUpdated++;
      if (result.error) stats.errors++;

      // レート制限
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      stats.errors++;
      log.error({
        type: 'sync_all_prices_item_error',
        listingId: listing.id,
        error: error.message,
      });
    }
  }

  log.info({ type: 'sync_all_prices_complete', stats });

  return {
    success: stats.errors === 0,
    ...stats,
  };
}

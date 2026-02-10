import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'price-adjuster' });

/**
 * 価格調整結果
 */
export interface PriceAdjustmentResult {
  listingId: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  adjusted: boolean;
}

/**
 * 為替レート取得（DBまたはデフォルト値）
 */
async function getExchangeRate(from: string, to: string): Promise<number> {
  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: from, toCurrency: to },
    orderBy: { fetchedAt: 'desc' },
  });
  return rate?.rate || 150; // デフォルト150円/USD
}

/**
 * 利益率計算
 *
 * @param sellingPriceUsd 販売価格（USD）
 * @param costPriceJpy 仕入価格（円）
 * @param exchangeRate 為替レート（円/USD）
 * @param feeRate プラットフォーム手数料率（デフォルト15%）
 */
function calculateProfitRate(
  sellingPriceUsd: number,
  costPriceJpy: number,
  exchangeRate: number,
  feeRate: number = 0.15
): { profitJpy: number; profitRate: number } {
  const sellingPriceJpy = sellingPriceUsd * exchangeRate;
  const fee = sellingPriceJpy * feeRate;
  const netRevenue = sellingPriceJpy - fee;
  const profitJpy = netRevenue - costPriceJpy;
  const profitRate = costPriceJpy > 0 ? (profitJpy / costPriceJpy) * 100 : 0;
  return { profitJpy, profitRate };
}

/**
 * 最適価格を計算
 * 目標利益率を達成するための販売価格を逆算
 *
 * @param costPriceJpy 仕入価格（円）
 * @param exchangeRate 為替レート（円/USD）
 * @param targetProfitRate 目標利益率（%）
 * @param feeRate プラットフォーム手数料率
 */
function calculateOptimalPrice(
  costPriceJpy: number,
  exchangeRate: number,
  targetProfitRate: number = 15,
  feeRate: number = 0.15
): number {
  // netRevenue = costPriceJpy * (1 + targetProfitRate/100)
  // sellingPriceJpy * (1 - feeRate) = netRevenue
  // sellingPriceUsd = sellingPriceJpy / exchangeRate
  const targetNetRevenue = costPriceJpy * (1 + targetProfitRate / 100);
  const sellingPriceJpy = targetNetRevenue / (1 - feeRate);
  const sellingPriceUsd = sellingPriceJpy / exchangeRate;
  return Math.ceil(sellingPriceUsd * 100) / 100; // 小数点2位で切り上げ
}

/**
 * 単一リスティングの価格調整
 */
export async function adjustListingPrice(
  listingId: string,
  options?: {
    targetProfitRate?: number;
    minProfitRate?: number;
    maxPriceChangePercent?: number;
  }
): Promise<PriceAdjustmentResult> {
  const targetProfitRate = options?.targetProfitRate || 15;
  const minProfitRate = options?.minProfitRate || 10;
  const maxPriceChangePercent = options?.maxPriceChangePercent || 20;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: true },
  });

  if (!listing || !listing.product) {
    return {
      listingId,
      productId: '',
      oldPrice: 0,
      newPrice: 0,
      reason: 'Listing not found',
      adjusted: false,
    };
  }

  const costPriceJpy = listing.product.price;
  const currentPriceUsd = listing.listingPrice;
  const exchangeRate = await getExchangeRate('USD', 'JPY');

  // 現在の利益率を計算
  const current = calculateProfitRate(currentPriceUsd, costPriceJpy, exchangeRate);

  // 最適価格を計算
  const optimalPriceUsd = calculateOptimalPrice(costPriceJpy, exchangeRate, targetProfitRate);

  // 価格変更幅チェック
  const priceChangePercent = currentPriceUsd > 0
    ? Math.abs((optimalPriceUsd - currentPriceUsd) / currentPriceUsd) * 100
    : 100;

  let newPrice = currentPriceUsd;
  let reason = '';
  let adjusted = false;

  if (current.profitRate < minProfitRate) {
    // 利益率が最低閾値を下回っている場合は価格上げ
    newPrice = Math.min(optimalPriceUsd, currentPriceUsd * (1 + maxPriceChangePercent / 100));
    reason = `Profit rate too low (${current.profitRate.toFixed(1)}% < ${minProfitRate}%)`;
    adjusted = true;
  } else if (priceChangePercent > 5 && current.profitRate > targetProfitRate * 1.5) {
    // 利益率が高すぎる場合は競争力のため価格下げ
    newPrice = Math.max(optimalPriceUsd, currentPriceUsd * (1 - maxPriceChangePercent / 100));
    reason = `Price optimization for competitiveness`;
    adjusted = true;
  }

  if (adjusted) {
    // リスティング価格更新
    await prisma.listing.update({
      where: { id: listingId },
      data: { listingPrice: newPrice },
    });

    // 価格履歴記録（ShadowLogを使用）
    await prisma.shadowLog.create({
      data: {
        service: 'price-adjuster',
        operation: 'adjust_price',
        input: {
          listingId,
          costPriceJpy,
          exchangeRate,
          currentPriceUsd,
          currentProfitRate: current.profitRate,
        },
        output: {
          newPriceUsd: newPrice,
          newProfitRate: calculateProfitRate(newPrice, costPriceJpy, exchangeRate).profitRate,
          reason,
        },
        decision: adjusted ? 'ADJUSTED' : 'NO_CHANGE',
        decisionReason: reason,
        isDryRun: false,
      },
    });

    log.info({
      type: 'price_adjusted',
      listingId,
      oldPrice: currentPriceUsd,
      newPrice,
      reason,
    });
  }

  return {
    listingId,
    productId: listing.productId,
    oldPrice: currentPriceUsd,
    newPrice,
    reason: reason || 'Price is optimal',
    adjusted,
  };
}

/**
 * バッチ価格調整
 * 指定したマーケットプレイスのアクティブな出品を一括調整
 */
export async function runBatchPriceAdjustment(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  limit?: number;
  targetProfitRate?: number;
  minProfitRate?: number;
  maxPriceChangePercent?: number;
}): Promise<{
  total: number;
  adjusted: number;
  unchanged: number;
  errors: number;
}> {
  const limit = options?.limit || 50;
  const marketplace = options?.marketplace || 'JOOM';

  log.info({ type: 'batch_price_adjustment_start', marketplace, limit });

  const listings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      marketplace,
    },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  const stats = {
    total: listings.length,
    adjusted: 0,
    unchanged: 0,
    errors: 0,
  };

  for (const listing of listings) {
    try {
      const result = await adjustListingPrice(listing.id, {
        targetProfitRate: options?.targetProfitRate,
        minProfitRate: options?.minProfitRate,
        maxPriceChangePercent: options?.maxPriceChangePercent,
      });
      if (result.adjusted) {
        stats.adjusted++;
      } else {
        stats.unchanged++;
      }
    } catch (error) {
      stats.errors++;
      log.error({ type: 'price_adjustment_error', listingId: listing.id, error });
    }
  }

  log.info({ type: 'batch_price_adjustment_complete', stats });
  return stats;
}

/**
 * 手動で価格調整をトリガー（外部呼び出し用）
 */
export async function triggerPriceAdjustment(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  listingId?: string;
  limit?: number;
  targetProfitRate?: number;
  minProfitRate?: number;
}): Promise<{
  success: boolean;
  result: PriceAdjustmentResult | { total: number; adjusted: number; unchanged: number; errors: number };
}> {
  try {
    if (options?.listingId) {
      // 単一リスティング
      const result = await adjustListingPrice(options.listingId, {
        targetProfitRate: options.targetProfitRate,
        minProfitRate: options.minProfitRate,
      });
      return { success: true, result };
    } else {
      // バッチ処理
      const result = await runBatchPriceAdjustment({
        marketplace: options?.marketplace,
        limit: options?.limit,
        targetProfitRate: options?.targetProfitRate,
        minProfitRate: options?.minProfitRate,
      });
      return { success: true, result };
    }
  } catch (error: any) {
    log.error({ type: 'trigger_price_adjustment_error', error: error.message });
    return {
      success: false,
      result: { total: 0, adjusted: 0, unchanged: 0, errors: 1 },
    };
  }
}

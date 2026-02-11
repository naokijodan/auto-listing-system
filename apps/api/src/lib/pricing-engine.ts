/**
 * Phase 61-62: 価格最適化エンジン
 *
 * 動的価格調整と競合分析:
 * - 競合価格分析
 * - 利益最大化価格計算
 * - 価格推奨生成
 * - 自動価格調整
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'pricing-engine' });

// 価格戦略タイプ
export type PricingStrategy =
  | 'COMPETITIVE' // 競合対抗（最安値付近）
  | 'PROFIT_MAXIMIZE' // 利益最大化
  | 'MARKET_AVERAGE' // 市場平均
  | 'PENETRATION' // 浸透価格（低価格）
  | 'PREMIUM'; // プレミアム価格

// 価格調整ルール
export interface PricingRule {
  id: string;
  name: string;
  strategy: PricingStrategy;
  minMargin: number; // 最低利益率（%）
  maxMargin: number; // 最大利益率（%）
  competitorOffset: number; // 競合との価格差（%）
  isActive: boolean;
}

// 価格推奨結果
export interface PriceRecommendation {
  listingId: string;
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  costPrice: number;
  currentMargin: number;
  recommendedMargin: number;
  competitorAvgPrice: number | null;
  competitorMinPrice: number | null;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  strategy: PricingStrategy;
}

// デフォルト設定
const DEFAULT_CONFIG = {
  minMargin: 15, // 最低利益率 15%
  maxMargin: 50, // 最大利益率 50%
  targetMargin: 25, // 目標利益率 25%
  competitorOffset: -3, // 競合より3%安く
  exchangeRate: 150, // JPY/USD
  platformFeeRate: 0.15, // プラットフォーム手数料 15%
  shippingCostUsd: 5, // 送料 $5
};

/**
 * 商品の原価からUSD販売価格を計算
 */
export function calculateSellingPrice(
  costPriceJpy: number,
  targetMargin: number = DEFAULT_CONFIG.targetMargin,
  exchangeRate: number = DEFAULT_CONFIG.exchangeRate
): {
  sellingPriceUsd: number;
  costUsd: number;
  margin: number;
  breakdown: {
    costUsd: number;
    platformFee: number;
    shippingCost: number;
    profit: number;
  };
} {
  const costUsd = costPriceJpy / exchangeRate;
  const shippingCost = DEFAULT_CONFIG.shippingCostUsd;
  const totalCost = costUsd + shippingCost;

  // 目標マージンを達成する価格を計算
  // sellingPrice = totalCost / (1 - platformFeeRate - targetMargin/100)
  const denominator = 1 - DEFAULT_CONFIG.platformFeeRate - targetMargin / 100;
  const sellingPriceUsd = totalCost / denominator;

  const platformFee = sellingPriceUsd * DEFAULT_CONFIG.platformFeeRate;
  const profit = sellingPriceUsd - totalCost - platformFee;
  const actualMargin = (profit / sellingPriceUsd) * 100;

  return {
    sellingPriceUsd: Math.round(sellingPriceUsd * 100) / 100,
    costUsd: Math.round(costUsd * 100) / 100,
    margin: Math.round(actualMargin * 10) / 10,
    breakdown: {
      costUsd: Math.round(costUsd * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      shippingCost,
      profit: Math.round(profit * 100) / 100,
    },
  };
}

/**
 * 価格から利益率を計算
 */
export function calculateMargin(
  sellingPriceUsd: number,
  costPriceJpy: number,
  exchangeRate: number = DEFAULT_CONFIG.exchangeRate
): number {
  const costUsd = costPriceJpy / exchangeRate;
  const shippingCost = DEFAULT_CONFIG.shippingCostUsd;
  const platformFee = sellingPriceUsd * DEFAULT_CONFIG.platformFeeRate;
  const profit = sellingPriceUsd - costUsd - shippingCost - platformFee;
  return (profit / sellingPriceUsd) * 100;
}

/**
 * 競合価格を分析
 */
export async function analyzeCompetitorPrices(productId: string): Promise<{
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  priceCount: number;
  lastUpdated: Date | null;
}> {
  const competitorPrices = await prisma.competitorPrice.findMany({
    where: {
      productId,
      collectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 過去7日
      },
    },
    orderBy: { collectedAt: 'desc' },
  });

  if (competitorPrices.length === 0) {
    return {
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      priceCount: 0,
      lastUpdated: null,
    };
  }

  const prices = competitorPrices.map((p) => p.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    avgPrice: Math.round(avgPrice * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    priceCount: competitorPrices.length,
    lastUpdated: competitorPrices[0].collectedAt,
  };
}

/**
 * 価格推奨を生成
 */
export async function generatePriceRecommendation(
  listingId: string,
  strategy: PricingStrategy = 'PROFIT_MAXIMIZE'
): Promise<PriceRecommendation | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      product: true,
    },
  });

  if (!listing || !listing.product) {
    return null;
  }

  const product = listing.product;
  const currentPrice = listing.listingPrice;
  const costPriceJpy = product.price;

  // 為替レート取得
  const exchangeRateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });
  const exchangeRate = exchangeRateRecord?.rate
    ? 1 / exchangeRateRecord.rate
    : DEFAULT_CONFIG.exchangeRate;

  // 競合価格分析
  const competitorAnalysis = await analyzeCompetitorPrices(product.id);

  // 現在のマージン計算
  const currentMargin = calculateMargin(currentPrice, costPriceJpy, exchangeRate);

  // 戦略に基づく推奨価格計算
  let recommendedPrice: number;
  let targetMargin: number;
  let reason: string;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  switch (strategy) {
    case 'COMPETITIVE':
      if (competitorAnalysis.minPrice) {
        // 競合最安値より少し安く
        recommendedPrice = competitorAnalysis.minPrice * (1 + DEFAULT_CONFIG.competitorOffset / 100);
        targetMargin = calculateMargin(recommendedPrice, costPriceJpy, exchangeRate);
        reason = `競合最安値 $${competitorAnalysis.minPrice} より ${Math.abs(DEFAULT_CONFIG.competitorOffset)}% 安く設定`;
        confidence = 'HIGH';
      } else {
        // 競合データなし：市場平均を推定
        const calc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.targetMargin, exchangeRate);
        recommendedPrice = calc.sellingPriceUsd;
        targetMargin = calc.margin;
        reason = '競合データなし：目標利益率で設定';
        confidence = 'LOW';
      }
      break;

    case 'MARKET_AVERAGE':
      if (competitorAnalysis.avgPrice) {
        recommendedPrice = competitorAnalysis.avgPrice;
        targetMargin = calculateMargin(recommendedPrice, costPriceJpy, exchangeRate);
        reason = `市場平均価格 $${competitorAnalysis.avgPrice} に合わせて設定`;
        confidence = 'MEDIUM';
      } else {
        const calc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.targetMargin, exchangeRate);
        recommendedPrice = calc.sellingPriceUsd;
        targetMargin = calc.margin;
        reason = '競合データなし：目標利益率で設定';
        confidence = 'LOW';
      }
      break;

    case 'PENETRATION':
      // 最低利益率で最安値を目指す
      const penetrationCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.minMargin, exchangeRate);
      recommendedPrice = penetrationCalc.sellingPriceUsd;
      targetMargin = penetrationCalc.margin;
      reason = `浸透価格戦略：最低利益率 ${DEFAULT_CONFIG.minMargin}% で設定`;
      confidence = 'MEDIUM';
      break;

    case 'PREMIUM':
      // 最大利益率でプレミアム価格
      const premiumCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.maxMargin, exchangeRate);
      recommendedPrice = premiumCalc.sellingPriceUsd;
      targetMargin = premiumCalc.margin;
      reason = `プレミアム価格戦略：高マージン ${DEFAULT_CONFIG.maxMargin}% で設定`;
      confidence = 'MEDIUM';
      break;

    case 'PROFIT_MAXIMIZE':
    default:
      // 利益最大化：競合データがあれば考慮、なければ目標マージン
      if (competitorAnalysis.avgPrice && competitorAnalysis.minPrice) {
        // 競合平均と最低利益の間で最適化
        const avgPriceMargin = calculateMargin(competitorAnalysis.avgPrice, costPriceJpy, exchangeRate);

        if (avgPriceMargin >= DEFAULT_CONFIG.minMargin) {
          recommendedPrice = competitorAnalysis.avgPrice;
          targetMargin = avgPriceMargin;
          reason = `市場平均 $${competitorAnalysis.avgPrice} で ${Math.round(avgPriceMargin)}% の利益率`;
          confidence = 'HIGH';
        } else {
          // 市場平均では利益が出ない場合、最低利益率を確保
          const minMarginCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.minMargin, exchangeRate);
          recommendedPrice = minMarginCalc.sellingPriceUsd;
          targetMargin = minMarginCalc.margin;
          reason = `市場平均では利益不足：最低利益率 ${DEFAULT_CONFIG.minMargin}% を確保`;
          confidence = 'MEDIUM';
        }
      } else {
        const defaultCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.targetMargin, exchangeRate);
        recommendedPrice = defaultCalc.sellingPriceUsd;
        targetMargin = defaultCalc.margin;
        reason = `目標利益率 ${DEFAULT_CONFIG.targetMargin}% で設定`;
        confidence = 'MEDIUM';
      }
      break;
  }

  // 最小・最大価格を計算
  const minPriceCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.minMargin, exchangeRate);
  const maxPriceCalc = calculateSellingPrice(costPriceJpy, DEFAULT_CONFIG.maxMargin, exchangeRate);

  return {
    listingId,
    productId: product.id,
    currentPrice,
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    minPrice: minPriceCalc.sellingPriceUsd,
    maxPrice: maxPriceCalc.sellingPriceUsd,
    costPrice: costPriceJpy,
    currentMargin: Math.round(currentMargin * 10) / 10,
    recommendedMargin: Math.round(targetMargin * 10) / 10,
    competitorAvgPrice: competitorAnalysis.avgPrice,
    competitorMinPrice: competitorAnalysis.minPrice,
    reason,
    confidence,
    strategy,
  };
}

/**
 * 複数リスティングの価格推奨を一括生成
 */
export async function generateBulkRecommendations(
  options: {
    marketplace?: 'JOOM' | 'EBAY';
    status?: string;
    limit?: number;
    strategy?: PricingStrategy;
  } = {}
): Promise<PriceRecommendation[]> {
  const { marketplace, status = 'ACTIVE', limit = 100, strategy = 'PROFIT_MAXIMIZE' } = options;

  const where: any = { status };
  if (marketplace) {
    where.marketplace = marketplace;
  }

  const listings = await prisma.listing.findMany({
    where,
    include: { product: true },
    take: limit,
  });

  const recommendations: PriceRecommendation[] = [];

  for (const listing of listings) {
    try {
      const recommendation = await generatePriceRecommendation(listing.id, strategy);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    } catch (error) {
      log.error({ listingId: listing.id, error }, 'Failed to generate recommendation');
    }
  }

  return recommendations;
}

/**
 * 価格変更が必要なリスティングを検出
 */
export async function detectPriceAdjustments(
  threshold: number = 5 // 価格差が5%以上なら調整推奨
): Promise<PriceRecommendation[]> {
  const recommendations = await generateBulkRecommendations({ status: 'ACTIVE' });

  return recommendations.filter((rec) => {
    const priceDiff = Math.abs(rec.currentPrice - rec.recommendedPrice) / rec.currentPrice * 100;
    return priceDiff >= threshold;
  });
}

/**
 * 価格を自動調整（注意：実際のAPI呼び出しは含まない）
 */
export async function applyPriceAdjustment(
  listingId: string,
  newPrice: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    // 価格履歴を記録
    await prisma.priceHistory.create({
      data: {
        listingId,
        price: newPrice,
        currency: 'USD',
        source: 'ai',
        metadata: {
          oldPrice: listing.listingPrice,
          reason,
          engine: 'PRICING_ENGINE',
        },
      },
    });

    // リスティング価格を更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        listingPrice: newPrice,
      },
    });

    log.info({
      type: 'price_adjusted',
      listingId,
      oldPrice: listing.listingPrice,
      newPrice,
      reason,
    });

    return { success: true };
  } catch (error) {
    log.error({ listingId, error }, 'Failed to apply price adjustment');
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 価格最適化統計を取得
 */
export async function getPricingStats(): Promise<{
  totalListings: number;
  adjustmentNeeded: number;
  avgMargin: number;
  lowMarginCount: number;
  highMarginCount: number;
  byStrategy: Record<string, number>;
}> {
  const activeListings = await prisma.listing.findMany({
    where: { status: 'ACTIVE' },
    include: { product: true },
  });

  const exchangeRateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });
  const exchangeRate = exchangeRateRecord?.rate
    ? 1 / exchangeRateRecord.rate
    : DEFAULT_CONFIG.exchangeRate;

  let totalMargin = 0;
  let lowMarginCount = 0;
  let highMarginCount = 0;
  let adjustmentNeeded = 0;

  for (const listing of activeListings) {
    if (!listing.product) continue;

    const margin = calculateMargin(listing.listingPrice, listing.product.price, exchangeRate);
    totalMargin += margin;

    if (margin < DEFAULT_CONFIG.minMargin) {
      lowMarginCount++;
      adjustmentNeeded++;
    } else if (margin > DEFAULT_CONFIG.maxMargin) {
      highMarginCount++;
    }
  }

  return {
    totalListings: activeListings.length,
    adjustmentNeeded,
    avgMargin: activeListings.length > 0 ? Math.round(totalMargin / activeListings.length * 10) / 10 : 0,
    lowMarginCount,
    highMarginCount,
    byStrategy: {
      COMPETITIVE: 0,
      PROFIT_MAXIMIZE: 0,
      MARKET_AVERAGE: 0,
      PENETRATION: 0,
      PREMIUM: 0,
    },
  };
}

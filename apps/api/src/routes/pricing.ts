import { Router } from 'express';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

const router = Router();
const log = logger.child({ module: 'pricing' });

// Redis client
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const PRICE_RULES_KEY = 'rakuda:price-rules';

// Price sync queue (uses scrape queue for processing)
const priceSyncQueue = new Queue('scrape-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

// Default price rules
const DEFAULT_PRICE_RULES = {
  stale30DaysDiscount: 5,
  stale60DaysDiscount: 15,
  stale90DaysDiscount: 25,
  lowViewsDiscount: 10,
  lowViewsThreshold: 10,
  minProfitMargin: 10,
};

interface PriceRecommendation {
  id: string;
  listingId: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number;
  recommendedPrice: number;
  reason: string;
  reasonCode: 'stale_30' | 'stale_60' | 'stale_90' | 'low_views' | 'competitive' | 'profit_optimize';
  expectedProfitChange: number;
  discountPercent: number;
  daysSinceListed: number;
  views: number;
  costPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

/**
 * 価格提案生成ルール
 */
function generateRecommendation(listing: {
  id: string;
  productId: string;
  listingPrice: number;
  listedAt: Date | null;
  marketplaceData: unknown;
  product: {
    id: string;
    title: string;
    price: number;
    images: string[];
  } | null;
}): PriceRecommendation | null {
  const now = Date.now();
  const listedAt = listing.listedAt ? new Date(listing.listedAt).getTime() : now;
  const daysSinceListed = Math.floor((now - listedAt) / (24 * 60 * 60 * 1000));
  const marketplaceData = listing.marketplaceData as Record<string, unknown> || {};
  const views = (marketplaceData.views as number) || 0;
  const currentPrice = listing.listingPrice;
  const costPrice = (listing.product?.price || 0) / DEFAULT_USD_TO_JPY; // USD換算

  let recommendedPrice = currentPrice;
  let reason = '';
  let reasonCode: PriceRecommendation['reasonCode'] = 'stale_30';
  let discountPercent = 0;

  // ルールベースの価格提案
  if (daysSinceListed >= 90) {
    // 90日以上滞留 → 25%値下げ
    discountPercent = 25;
    recommendedPrice = Math.round(currentPrice * 0.75 * 100) / 100;
    reason = '出品から90日以上経過しています。大幅な値下げで在庫回転を促進しましょう。';
    reasonCode = 'stale_90';
  } else if (daysSinceListed >= 60) {
    // 60日以上滞留 → 15%値下げ
    discountPercent = 15;
    recommendedPrice = Math.round(currentPrice * 0.85 * 100) / 100;
    reason = '出品から60日以上経過しています。値下げで販売を加速させましょう。';
    reasonCode = 'stale_60';
  } else if (daysSinceListed >= 30) {
    // 30日以上滞留 → 5%値下げ
    discountPercent = 5;
    recommendedPrice = Math.round(currentPrice * 0.95 * 100) / 100;
    reason = '出品から30日以上経過しています。小幅な値下げで注目を集めましょう。';
    reasonCode = 'stale_30';
  } else if (views < 10 && daysSinceListed >= 14) {
    // ビューが少ない → 10%値下げ
    discountPercent = 10;
    recommendedPrice = Math.round(currentPrice * 0.90 * 100) / 100;
    reason = `閲覧数が${views}回と少ないです。価格調整で露出を増やしましょう。`;
    reasonCode = 'low_views';
  } else {
    // 提案なし
    return null;
  }

  // 最低利益を確保（原価割れしない）
  const minPrice = Math.ceil(costPrice * 1.1 * 100) / 100; // 最低10%マージン
  if (recommendedPrice < minPrice) {
    recommendedPrice = minPrice;
    discountPercent = Math.round((1 - recommendedPrice / currentPrice) * 100);
  }

  const expectedProfitChange = (recommendedPrice - currentPrice);

  return {
    id: `rec_${listing.id}_${Date.now()}`,
    listingId: listing.id,
    productId: listing.productId,
    title: listing.product?.title || '',
    imageUrl: listing.product?.images?.[0] || null,
    currentPrice,
    recommendedPrice,
    reason,
    reasonCode,
    expectedProfitChange,
    discountPercent,
    daysSinceListed,
    views,
    costPrice,
    status: 'pending',
    createdAt: new Date(),
  };
}

/**
 * 価格提案一覧取得
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const {
      status = 'pending',
      sortBy = 'daysSinceListed',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = req.query;

    // アクティブな出品を取得（14日以上経過したもの）
    const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const listings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        listedAt: { lte: cutoffDate },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          },
        },
      },
      orderBy: {
        listedAt: 'asc',
      },
    });

    // 提案を生成
    let recommendations: PriceRecommendation[] = [];
    for (const listing of listings) {
      const rec = generateRecommendation(listing);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // ソート
    const sortField = String(sortBy) as keyof PriceRecommendation;
    recommendations.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });

    // 統計
    const stats = {
      total: recommendations.length,
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + Math.abs(r.expectedProfitChange), 0),
      byReason: {
        stale_30: recommendations.filter((r) => r.reasonCode === 'stale_30').length,
        stale_60: recommendations.filter((r) => r.reasonCode === 'stale_60').length,
        stale_90: recommendations.filter((r) => r.reasonCode === 'stale_90').length,
        low_views: recommendations.filter((r) => r.reasonCode === 'low_views').length,
      },
    };

    // ページネーション
    const paginatedRecs = recommendations.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedRecs,
      pagination: {
        total: recommendations.length,
        limit: Number(limit),
        offset: Number(offset),
      },
      stats,
    });
  } catch (error) {
    log.error('Failed to get price recommendations', error);
    next(error);
  }
});

/**
 * 価格シミュレーション
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { listingId, newPrice } = req.body;

    if (!listingId || typeof newPrice !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'listingId and newPrice are required',
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        product: {
          select: {
            price: true,
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    const currentPrice = listing.listingPrice;
    const costPrice = (listing.product?.price || 0) / DEFAULT_USD_TO_JPY;
    const currentProfit = currentPrice - costPrice;
    const newProfit = newPrice - costPrice;
    const profitChange = newProfit - currentProfit;
    const profitMarginCurrent = currentPrice > 0 ? (currentProfit / currentPrice) * 100 : 0;
    const profitMarginNew = newPrice > 0 ? (newProfit / newPrice) * 100 : 0;

    res.json({
      success: true,
      data: {
        listingId,
        currentPrice,
        newPrice,
        costPrice: Math.round(costPrice * 100) / 100,
        currentProfit: Math.round(currentProfit * 100) / 100,
        newProfit: Math.round(newProfit * 100) / 100,
        profitChange: Math.round(profitChange * 100) / 100,
        profitMarginCurrent: Math.round(profitMarginCurrent * 10) / 10,
        profitMarginNew: Math.round(profitMarginNew * 10) / 10,
        priceChangePercent: Math.round(((newPrice - currentPrice) / currentPrice) * 100 * 10) / 10,
        isBelowCost: newPrice < costPrice,
        isLowMargin: profitMarginNew < 10,
      },
    });
  } catch (error) {
    log.error('Failed to simulate price', error);
    next(error);
  }
});

/**
 * 価格提案を承認（価格を更新）
 */
router.post('/recommendations/:listingId/approve', async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { newPrice } = req.body;

    if (typeof newPrice !== 'number' || newPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid newPrice is required',
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    const oldPrice = listing.listingPrice;

    // 価格を更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        listingPrice: newPrice,
        updatedAt: new Date(),
      },
    });

    log.info(`Price updated for listing ${listingId}: $${oldPrice} -> $${newPrice}`);

    // マーケットプレイスAPIで価格を同期（非同期ジョブ）
    if (listing.marketplaceListingId) {
      await priceSyncQueue.add('sync-price', {
        listingId,
        marketplace: listing.marketplace,
        externalId: listing.marketplaceListingId,
        newPrice,
        currency: listing.currency,
      });
      log.info(`Price sync job queued for listing ${listingId}`);
    }

    res.json({
      success: true,
      data: {
        listingId,
        oldPrice,
        newPrice,
        updatedAt: new Date().toISOString(),
        syncQueued: !!listing.marketplaceListingId,
      },
    });
  } catch (error) {
    log.error('Failed to approve price recommendation', error);
    next(error);
  }
});

/**
 * 一括価格更新
 */
router.post('/recommendations/bulk-approve', async (req, res, next) => {
  try {
    const { recommendations } = req.body;

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recommendations array is required',
      });
    }

    const updates = recommendations.map((rec: { listingId: string; newPrice: number }) =>
      prisma.listing.update({
        where: { id: rec.listingId },
        data: {
          listingPrice: rec.newPrice,
          updatedAt: new Date(),
        },
      })
    );

    await Promise.all(updates);

    log.info(`Bulk price update for ${recommendations.length} listings`);

    res.json({
      success: true,
      data: {
        updated: recommendations.length,
      },
    });
  } catch (error) {
    log.error('Failed to bulk approve price recommendations', error);
    next(error);
  }
});

/**
 * 価格ルール設定取得
 */
router.get('/rules', async (req, res, next) => {
  try {
    const rulesStr = await redis.get(PRICE_RULES_KEY);
    const rules = rulesStr ? JSON.parse(rulesStr) : DEFAULT_PRICE_RULES;

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 価格ルール設定更新
 */
router.put('/rules', async (req, res, next) => {
  try {
    const rules = req.body;

    // Validate rules
    const validatedRules = {
      stale30DaysDiscount: Number(rules.stale30DaysDiscount) || DEFAULT_PRICE_RULES.stale30DaysDiscount,
      stale60DaysDiscount: Number(rules.stale60DaysDiscount) || DEFAULT_PRICE_RULES.stale60DaysDiscount,
      stale90DaysDiscount: Number(rules.stale90DaysDiscount) || DEFAULT_PRICE_RULES.stale90DaysDiscount,
      lowViewsDiscount: Number(rules.lowViewsDiscount) || DEFAULT_PRICE_RULES.lowViewsDiscount,
      lowViewsThreshold: Number(rules.lowViewsThreshold) || DEFAULT_PRICE_RULES.lowViewsThreshold,
      minProfitMargin: Number(rules.minProfitMargin) || DEFAULT_PRICE_RULES.minProfitMargin,
    };

    // Save to Redis
    await redis.set(PRICE_RULES_KEY, JSON.stringify(validatedRules));
    log.info('Price rules updated', validatedRules);

    res.json({
      success: true,
      data: validatedRules,
    });
  } catch (error) {
    next(error);
  }
});

export { router as pricingRouter };

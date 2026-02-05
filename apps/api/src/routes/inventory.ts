import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

const router = Router();
const log = logger.child({ module: 'inventory' });

interface StaleInventoryItem {
  productId: string;
  listingId: string;
  title: string;
  daysSinceListed: number;
  views: number;
  watchers: number;
  currentPrice: number;
  costPrice: number;
  profitMargin: number;
  staleScore: number;
  recommendedAction: 'price_drop' | 'relist' | 'delete' | 'keep';
  listedAt: Date;
  category: string | null;
  brand: string | null;
  imageUrl: string | null;
}

/**
 * 滞留スコア計算
 * スコア = 在庫日数 × (1 - 利益率) × 重み係数
 */
function calculateStaleScore(daysSinceListed: number, profitMargin: number): number {
  const weight = 1.5;
  const score = daysSinceListed * (1 - Math.max(0, Math.min(1, profitMargin))) * weight;
  return Math.round(score * 10) / 10;
}

/**
 * 推奨アクション判定
 */
function getRecommendedAction(
  daysSinceListed: number,
  profitMargin: number,
  views: number
): 'price_drop' | 'relist' | 'delete' | 'keep' {
  // 90日以上 → 削除推奨
  if (daysSinceListed >= 90) {
    return 'delete';
  }
  // 60日以上 → 利益率低いなら削除、高いなら大幅値下げ
  if (daysSinceListed >= 60) {
    return profitMargin < 0.1 ? 'delete' : 'price_drop';
  }
  // 30日以上 → ビュー少ないなら再出品、多いなら値下げ
  if (daysSinceListed >= 30) {
    return views < 10 ? 'relist' : 'price_drop';
  }
  // 30日未満 → 保持
  return 'keep';
}

/**
 * 滞留在庫一覧取得
 */
router.get('/stale', async (req, res, next) => {
  try {
    const {
      minDays = 30,
      maxDays,
      category,
      brand,
      minProfit,
      maxProfit,
      sortBy = 'daysSinceListed',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = req.query;

    const minDaysNum = Number(minDays);
    const cutoffDate = new Date(Date.now() - minDaysNum * 24 * 60 * 60 * 1000);

    // 滞留在庫を取得
    const listings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        listedAt: {
          lte: cutoffDate,
          ...(maxDays ? { gte: new Date(Date.now() - Number(maxDays) * 24 * 60 * 60 * 1000) } : {}),
        },
        product: {
          ...(category ? { category: String(category) } : {}),
          ...(brand ? { brand: String(brand) } : {}),
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            category: true,
            brand: true,
            images: true,
          },
        },
      },
      orderBy: {
        listedAt: 'asc',
      },
    }) as Array<{
      id: string;
      productId: string;
      listingPrice: number;
      listedAt: Date | null;
      marketplaceData: unknown;
      product: {
        id: string;
        title: string;
        price: number;
        category: string | null;
        brand: string | null;
        images: string[];
      } | null;
    }>;

    // 滞留在庫アイテムに変換
    const now = Date.now();
    let staleItems: StaleInventoryItem[] = listings.map((listing) => {
      const daysSinceListed = Math.floor(
        (now - new Date(listing.listedAt || now).getTime()) / (24 * 60 * 60 * 1000)
      );
      const costPrice = listing.product?.price || 0;
      const currentPrice = listing.listingPrice;
      const profitMargin = currentPrice > 0 ? (currentPrice - costPrice / DEFAULT_USD_TO_JPY) / currentPrice : 0;
      // marketplaceDataからviews/watchersを取得（存在すれば）
      const marketplaceData = listing.marketplaceData as Record<string, unknown> || {};
      const views = (marketplaceData.views as number) || 0;
      const watchers = (marketplaceData.watchers as number) || 0;

      return {
        productId: listing.productId,
        listingId: listing.id,
        title: listing.product?.title || '',
        daysSinceListed,
        views,
        watchers,
        currentPrice,
        costPrice: costPrice / DEFAULT_USD_TO_JPY, // USD換算
        profitMargin: Math.round(profitMargin * 100) / 100,
        staleScore: calculateStaleScore(daysSinceListed, profitMargin),
        recommendedAction: getRecommendedAction(daysSinceListed, profitMargin, views),
        listedAt: listing.listedAt || new Date(),
        category: listing.product?.category || null,
        brand: listing.product?.brand || null,
        imageUrl: listing.product?.images?.[0] || null,
      };
    });

    // 利益率フィルター
    if (minProfit !== undefined) {
      staleItems = staleItems.filter((item) => item.profitMargin >= Number(minProfit) / 100);
    }
    if (maxProfit !== undefined) {
      staleItems = staleItems.filter((item) => item.profitMargin <= Number(maxProfit) / 100);
    }

    // ソート
    const sortField = String(sortBy) as keyof StaleInventoryItem;
    staleItems.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });

    // ページネーション
    const total = staleItems.length;
    const paginatedItems = staleItems.slice(Number(offset), Number(offset) + Number(limit));

    // 統計
    const stats = {
      total,
      totalValue: staleItems.reduce((sum, item) => sum + item.currentPrice, 0),
      avgDaysSinceListed: total > 0 ? Math.round(staleItems.reduce((sum, item) => sum + item.daysSinceListed, 0) / total) : 0,
      byAction: {
        price_drop: staleItems.filter((item) => item.recommendedAction === 'price_drop').length,
        relist: staleItems.filter((item) => item.recommendedAction === 'relist').length,
        delete: staleItems.filter((item) => item.recommendedAction === 'delete').length,
        keep: staleItems.filter((item) => item.recommendedAction === 'keep').length,
      },
    };

    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
      stats,
    });
  } catch (error) {
    log.error('Failed to fetch stale inventory', error);
    next(error);
  }
});

/**
 * 滞留在庫のカテゴリ・ブランド一覧（フィルター用）
 */
router.get('/stale/filters', async (req, res, next) => {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: {
          listings: {
            some: {
              status: 'ACTIVE',
              listedAt: { lte: cutoffDate },
            },
          },
        },
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.product.findMany({
        where: {
          listings: {
            some: {
              status: 'ACTIVE',
              listedAt: { lte: cutoffDate },
            },
          },
        },
        select: { brand: true },
        distinct: ['brand'],
      }),
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map((c) => c.category).filter(Boolean),
        brands: brands.map((b) => b.brand).filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括削除（出品停止）
 */
router.post('/stale/bulk-delete', async (req, res, next) => {
  try {
    const { listingIds } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'listingIds is required',
      });
    }

    // ステータスをENDEDに更新
    const result = await prisma.listing.updateMany({
      where: {
        id: { in: listingIds },
        status: 'ACTIVE',
      },
      data: {
        status: 'ENDED',
        updatedAt: new Date(),
      },
    });

    log.info(`Bulk deleted ${result.count} stale listings`);

    res.json({
      success: true,
      data: {
        deleted: result.count,
      },
    });
  } catch (error) {
    log.error('Failed to bulk delete stale inventory', error);
    next(error);
  }
});

/**
 * 一括値下げ
 */
router.post('/stale/bulk-price-drop', async (req, res, next) => {
  try {
    const { listingIds, discountPercent } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'listingIds is required',
      });
    }

    if (typeof discountPercent !== 'number' || discountPercent <= 0 || discountPercent > 50) {
      return res.status(400).json({
        success: false,
        error: 'discountPercent must be between 1 and 50',
      });
    }

    // 各リスティングの価格を更新
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        listingPrice: true,
      },
    });

    const updates = listings.map((listing) => {
      const newPrice = Math.round(listing.listingPrice * (1 - discountPercent / 100) * 100) / 100;
      return prisma.listing.update({
        where: { id: listing.id },
        data: {
          listingPrice: newPrice,
          updatedAt: new Date(),
        },
      });
    });

    await Promise.all(updates);

    log.info(`Bulk price drop ${discountPercent}% for ${listings.length} listings`);

    res.json({
      success: true,
      data: {
        updated: listings.length,
        discountPercent,
      },
    });
  } catch (error) {
    log.error('Failed to bulk price drop', error);
    next(error);
  }
});

/**
 * 一括再出品
 */
router.post('/stale/bulk-relist', async (req, res, next) => {
  try {
    const { listingIds } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'listingIds is required',
      });
    }

    // listedAtを更新して再出品扱いにする
    const result = await prisma.listing.updateMany({
      where: {
        id: { in: listingIds },
        status: 'ACTIVE',
      },
      data: {
        listedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    log.info(`Bulk relisted ${result.count} listings`);

    res.json({
      success: true,
      data: {
        relisted: result.count,
      },
    });
  } catch (error) {
    log.error('Failed to bulk relist', error);
    next(error);
  }
});

export { router as inventoryRouter };

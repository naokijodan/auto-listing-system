import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'competitors' });

// メモリ内ストレージ（本格実装ではDBに保存）
interface CompetitorProduct {
  id: string;
  listingId: string; // 自社出品のID
  competitorUrl: string;
  competitorTitle: string;
  competitorPrice: number;
  competitorSeller: string;
  lastChecked: Date;
  priceHistory: { price: number; date: Date }[];
  createdAt: Date;
}

const competitorProducts: Map<string, CompetitorProduct> = new Map();

/**
 * 競合商品一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { listingId, limit = 50, offset = 0 } = req.query;

    let items = Array.from(competitorProducts.values());

    // リスティングIDでフィルター
    if (listingId) {
      items = items.filter((item) => item.listingId === String(listingId));
    }

    // ソート（最終チェック日時の新しい順）
    items.sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());

    // ページネーション
    const total = items.length;
    const paginatedItems = items.slice(Number(offset), Number(offset) + Number(limit));

    // 自社出品情報を付与
    const listingIds = [...new Set(paginatedItems.map((item) => item.listingId))];
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        product: {
          select: {
            title: true,
            images: true,
          },
        },
      },
    });
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const enrichedItems = paginatedItems.map((item) => {
      const listing = listingMap.get(item.listingId);
      return {
        ...item,
        myTitle: listing?.product?.title || '',
        myPrice: listing?.listingPrice || 0,
        myImageUrl: listing?.product?.images?.[0] || null,
        priceDiff: listing ? item.competitorPrice - listing.listingPrice : 0,
      };
    });

    res.json({
      success: true,
      data: enrichedItems,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    log.error('Failed to fetch competitors', error);
    next(error);
  }
});

/**
 * 競合商品を登録
 */
router.post('/', async (req, res, next) => {
  try {
    const { listingId, competitorUrl, competitorTitle, competitorPrice, competitorSeller } = req.body;

    if (!listingId || !competitorUrl) {
      return res.status(400).json({
        success: false,
        error: 'listingId and competitorUrl are required',
      });
    }

    // 自社出品の存在確認
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    const competitor: CompetitorProduct = {
      id,
      listingId,
      competitorUrl,
      competitorTitle: competitorTitle || '',
      competitorPrice: competitorPrice || 0,
      competitorSeller: competitorSeller || '',
      lastChecked: now,
      priceHistory: competitorPrice ? [{ price: competitorPrice, date: now }] : [],
      createdAt: now,
    };

    competitorProducts.set(id, competitor);

    log.info(`Competitor registered: ${id} for listing ${listingId}`);

    res.json({
      success: true,
      data: competitor,
    });
  } catch (error) {
    log.error('Failed to register competitor', error);
    next(error);
  }
});

/**
 * 競合商品の価格を更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { competitorPrice, competitorTitle, competitorSeller } = req.body;

    const competitor = competitorProducts.get(id);
    if (!competitor) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found',
      });
    }

    const now = new Date();

    if (competitorPrice !== undefined) {
      competitor.competitorPrice = competitorPrice;
      competitor.priceHistory.push({ price: competitorPrice, date: now });
    }
    if (competitorTitle !== undefined) {
      competitor.competitorTitle = competitorTitle;
    }
    if (competitorSeller !== undefined) {
      competitor.competitorSeller = competitorSeller;
    }
    competitor.lastChecked = now;

    competitorProducts.set(id, competitor);

    res.json({
      success: true,
      data: competitor,
    });
  } catch (error) {
    log.error('Failed to update competitor', error);
    next(error);
  }
});

/**
 * 競合商品を削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!competitorProducts.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found',
      });
    }

    competitorProducts.delete(id);

    res.json({
      success: true,
      data: { deleted: id },
    });
  } catch (error) {
    log.error('Failed to delete competitor', error);
    next(error);
  }
});

/**
 * 競合価格の統計
 */
router.get('/stats', async (req, res, next) => {
  try {
    const items = Array.from(competitorProducts.values());

    // 自社出品情報を取得
    const listingIds = [...new Set(items.map((item) => item.listingId))];
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      select: { id: true, listingPrice: true },
    });
    const listingMap = new Map(listings.map((l) => [l.id, l.listingPrice]));

    let lowerCount = 0;
    let higherCount = 0;
    let equalCount = 0;
    let totalDiff = 0;

    for (const item of items) {
      const myPrice = listingMap.get(item.listingId) || 0;
      const diff = item.competitorPrice - myPrice;
      totalDiff += diff;

      if (diff < -1) {
        lowerCount++;
      } else if (diff > 1) {
        higherCount++;
      } else {
        equalCount++;
      }
    }

    res.json({
      success: true,
      data: {
        total: items.length,
        lowerThanMe: lowerCount, // 競合の方が安い
        higherThanMe: higherCount, // 競合の方が高い
        similar: equalCount,
        avgPriceDiff: items.length > 0 ? Math.round(totalDiff / items.length * 100) / 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as competitorsRouter };

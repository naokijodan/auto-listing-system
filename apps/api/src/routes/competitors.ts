import { Router } from 'express';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'competitors' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 競合キュー
const competitorQueue = new Queue('competitor', { connection: redis });

// Redisベースのストレージに変更
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

/**
 * 競合商品一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { listingId, limit = 50, offset = 0 } = req.query;

    // Redisから全競合商品を取得
    const allCompetitors = await redis.hgetall('rakuda:competitors');
    let items: CompetitorProduct[] = Object.values(allCompetitors).map((str) => JSON.parse(str));

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

    await redis.hset('rakuda:competitors', id, JSON.stringify(competitor));

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

    const competitorStr = await redis.hget('rakuda:competitors', id);
    if (!competitorStr) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found',
      });
    }

    const competitor: CompetitorProduct = JSON.parse(competitorStr);
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

    await redis.hset('rakuda:competitors', id, JSON.stringify(competitor));

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

    const exists = await redis.hexists('rakuda:competitors', id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found',
      });
    }

    await redis.hdel('rakuda:competitors', id);

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
    const allCompetitors = await redis.hgetall('rakuda:competitors');
    const items: CompetitorProduct[] = Object.values(allCompetitors).map((str) => JSON.parse(str));

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

/**
 * 競合商品を自動検索（ジョブをキューに追加）
 */
router.post('/search', async (req, res, next) => {
  try {
    const { listingId, searchQuery } = req.body;

    if (!listingId && !searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'listingId or searchQuery is required',
      });
    }

    let query = searchQuery;

    // listingIdが指定された場合、商品タイトルを取得
    if (listingId && !searchQuery) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          product: {
            select: { title: true },
          },
        },
      });

      if (!listing) {
        return res.status(404).json({
          success: false,
          error: 'Listing not found',
        });
      }

      query = listing.product?.title;
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine search query',
      });
    }

    // 検索ジョブをキューに追加
    const job = await competitorQueue.add(
      'search-competitors',
      {
        type: 'search',
        listingId,
        searchQuery: query,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      }
    );

    log.info(`Competitor search job queued: ${job.id}`);

    res.json({
      success: true,
      data: {
        jobId: job.id,
        searchQuery: query,
        status: 'queued',
      },
    });
  } catch (error) {
    log.error('Failed to queue competitor search', error);
    next(error);
  }
});

/**
 * 検索結果を取得
 */
router.get('/search-results/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const resultStr = await redis.get(`rakuda:competitor-search:${listingId}`);
    if (!resultStr) {
      return res.json({
        success: true,
        data: null,
        message: 'No search results found. Search may still be in progress.',
      });
    }

    const result = JSON.parse(resultStr);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Failed to get search results', error);
    next(error);
  }
});

/**
 * 全競合の価格を更新（バッチジョブをキューに追加）
 */
router.post('/update-all', async (req, res, next) => {
  try {
    const competitorIds = await redis.hkeys('rakuda:competitors');

    if (competitorIds.length === 0) {
      return res.json({
        success: true,
        data: { queued: 0 },
      });
    }

    // 各競合に対して更新ジョブを追加
    const jobs = await Promise.all(
      competitorIds.map((competitorId, index) =>
        competitorQueue.add(
          'update-price',
          { type: 'update', competitorId },
          {
            delay: index * 5000, // 5秒間隔でスタガー
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 30000,
            },
          }
        )
      )
    );

    log.info(`Queued ${jobs.length} competitor update jobs`);

    res.json({
      success: true,
      data: {
        queued: jobs.length,
        jobIds: jobs.map((j) => j.id),
      },
    });
  } catch (error) {
    log.error('Failed to queue competitor updates', error);
    next(error);
  }
});

/**
 * 価格変動アラートの設定
 */
router.get('/alert-settings', async (req, res, next) => {
  try {
    const settingsStr = await redis.get('rakuda:competitor-alert-settings');
    const settings = settingsStr
      ? JSON.parse(settingsStr)
      : {
          enabled: true,
          priceDropThreshold: 5, // 5%以上の値下げで通知
          priceRiseThreshold: 10, // 10%以上の値上げで通知
          checkInterval: 3600000, // 1時間ごと
        };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 価格変動アラートの設定を更新
 */
router.put('/alert-settings', async (req, res, next) => {
  try {
    const settings = req.body;

    await redis.set('rakuda:competitor-alert-settings', JSON.stringify(settings));

    log.info('Competitor alert settings updated', settings);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    log.error('Failed to update alert settings', error);
    next(error);
  }
});

export { router as competitorsRouter };

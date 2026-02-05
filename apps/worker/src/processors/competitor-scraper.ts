import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';
import { createRateLimiter, RateLimiter } from '../lib/rate-limiter';

const log = logger.child({ module: 'competitor-scraper' });

export interface CompetitorSearchJob {
  type: 'search' | 'update';
  listingId?: string;
  competitorId?: string;
  searchQuery?: string;
  productTitle?: string;
}

export interface CompetitorSearchResult {
  url: string;
  title: string;
  price: number;
  currency: string;
  seller: string;
  condition: string;
  itemId: string;
  imageUrl?: string;
  matchScore: number;
}

/**
 * eBay検索結果をパース（簡易版）
 * 本格実装では Playwright や専用API を使用
 */
async function searchEbay(
  query: string,
  rateLimiter: RateLimiter
): Promise<CompetitorSearchResult[]> {
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=15&LH_BIN=1`;

  log.info(`Searching eBay: ${query}`);

  // レート制限を適用
  await rateLimiter.waitForRateLimit(searchUrl);

  // 注: 実際の実装では fetch + HTML パース or Playwright を使用
  // ここではモックデータを返す
  const mockResults: CompetitorSearchResult[] = [
    {
      url: `https://www.ebay.com/itm/mock-${Date.now()}`,
      title: `${query} - Similar Item 1`,
      price: Math.round(Math.random() * 100 + 50),
      currency: 'USD',
      seller: 'mock_seller_1',
      condition: 'New',
      itemId: `mock-${Date.now()}-1`,
      matchScore: 0.85,
    },
    {
      url: `https://www.ebay.com/itm/mock-${Date.now() + 1}`,
      title: `${query} - Similar Item 2`,
      price: Math.round(Math.random() * 100 + 50),
      currency: 'USD',
      seller: 'mock_seller_2',
      condition: 'Used',
      itemId: `mock-${Date.now()}-2`,
      matchScore: 0.72,
    },
  ];

  // 実際のスクレイピング実装例（コメントアウト）:
  /*
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    const html = await response.text();

    // HTMLをパースして商品情報を抽出
    // cheerio や jsdom を使用

  } catch (error) {
    log.error('eBay search failed', error);
    throw error;
  }
  */

  return mockResults;
}

/**
 * 競合価格を更新
 */
async function updateCompetitorPrice(
  competitorId: string,
  rateLimiter: RateLimiter,
  redis: IORedis
): Promise<{ price: number; updated: boolean }> {
  // Redisから競合情報を取得
  const competitorStr = await redis.hget('rakuda:competitors', competitorId);
  if (!competitorStr) {
    throw new Error(`Competitor not found: ${competitorId}`);
  }

  const competitor = JSON.parse(competitorStr);
  const url = competitor.competitorUrl;

  log.info(`Updating competitor price: ${competitorId}`);

  // レート制限を適用
  await rateLimiter.waitForRateLimit(url);

  // 注: 実際の実装では fetch + HTML パース を使用
  // ここではモック価格を返す
  const newPrice = competitor.competitorPrice * (0.95 + Math.random() * 0.1); // ±5%変動

  // 価格履歴を更新
  competitor.priceHistory = competitor.priceHistory || [];
  competitor.priceHistory.push({
    price: Math.round(newPrice * 100) / 100,
    date: new Date().toISOString(),
  });
  competitor.competitorPrice = Math.round(newPrice * 100) / 100;
  competitor.lastChecked = new Date().toISOString();

  // Redisに保存
  await redis.hset('rakuda:competitors', competitorId, JSON.stringify(competitor));

  return {
    price: competitor.competitorPrice,
    updated: true,
  };
}

/**
 * 競合スクレイパーワーカーを作成
 */
export function createCompetitorScraperWorker(redis: IORedis): Worker {
  const rateLimiter = createRateLimiter(redis);

  const worker = new Worker<CompetitorSearchJob>(
    'competitor',
    async (job: Job<CompetitorSearchJob>) => {
      const { type, listingId, competitorId, searchQuery, productTitle } = job.data;

      log.info(`Processing competitor job: ${type}`, { jobId: job.id, data: job.data });

      try {
        if (type === 'search') {
          // 検索ジョブ
          const query = searchQuery || productTitle;
          if (!query) {
            throw new Error('Search query is required');
          }

          const results = await searchEbay(query, rateLimiter);

          // 結果をRedisに一時保存（後でUIから確認）
          if (listingId) {
            await redis.setex(
              `rakuda:competitor-search:${listingId}`,
              3600, // 1時間保持
              JSON.stringify({
                query,
                results,
                searchedAt: new Date().toISOString(),
              })
            );
          }

          return { type: 'search', results, count: results.length };
        } else if (type === 'update') {
          // 価格更新ジョブ
          if (!competitorId) {
            throw new Error('Competitor ID is required');
          }

          const result = await updateCompetitorPrice(competitorId, rateLimiter, redis);

          // 価格変動が大きい場合は通知を作成
          // TODO: 通知ロジックを追加

          return { type: 'update', ...result };
        }

        throw new Error(`Unknown job type: ${type}`);
      } catch (error) {
        log.error(`Competitor job failed: ${job.id}`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // 競合取得は低速で確実に
      limiter: {
        max: 5,
        duration: 60000, // 1分間に5件まで
      },
    }
  );

  worker.on('completed', (job) => {
    log.info(`Competitor job completed: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    log.error(`Competitor job failed: ${job?.id}`, error);
  });

  return worker;
}

/**
 * 定期更新ジョブをスケジュール
 */
export async function scheduleCompetitorUpdates(redis: IORedis): Promise<void> {
  const { Queue } = await import('bullmq');
  const competitorQueue = new Queue('competitor', { connection: redis });

  // 全競合商品を取得して更新ジョブを追加
  const competitorIds = await redis.hkeys('rakuda:competitors');

  for (const competitorId of competitorIds) {
    await competitorQueue.add(
      'update-price',
      { type: 'update', competitorId },
      {
        delay: Math.random() * 60000, // 0-60秒のランダム遅延
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      }
    );
  }

  log.info(`Scheduled ${competitorIds.length} competitor update jobs`);
}

import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { ScrapeJobPayload, ScrapeJobResult } from '@als/schema';

/**
 * スクレイピングジョブプロセッサー
 *
 * TODO Phase 2で実装:
 * - Puppeteer によるスクレイピング
 * - 住宅用プロキシ経由のアクセス
 * - サイト別パーサー
 */
export async function processScrapeJob(
  job: Job<ScrapeJobPayload>
): Promise<ScrapeJobResult> {
  const { url, sourceType, isBulkScrape, sellerId } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'scrape' });

  log.info({ type: 'scrape_start', url, sourceType });

  // TODO: Phase 2で実装
  // 現在はプレースホルダー

  if (isBulkScrape && sellerId) {
    // セラー一括取得
    log.info({ type: 'bulk_scrape', sellerId });

    // TODO: セラーページから全商品URLを取得
    // TODO: 各商品を個別にスクレイピング

    return {
      success: true,
      message: 'Bulk scrape placeholder',
      itemCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // 単一商品スクレイピング
  // TODO: Puppeteer で商品ページにアクセス
  // TODO: サイト別パーサーでデータ抽出
  // TODO: DBに保存

  return {
    success: true,
    message: 'Scrape placeholder - implementation pending',
    timestamp: new Date().toISOString(),
  };
}

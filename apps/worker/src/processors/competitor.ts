/**
 * 競合価格チェックワーカー（Phase 29）
 *
 * 競合商品の価格を定期的にチェック
 */

import { Job } from 'bullmq';
import { logger } from '@rakuda/logger';
import { competitorMonitor } from '../lib/competitor/competitor-monitor';
import { competitorScraper } from '../lib/competitor/competitor-scraper';

const log = logger.child({ processor: 'competitor' });

export interface CompetitorJobData {
  type: 'check_all' | 'check_single' | 'health_check';
  trackerId?: string;
  batchSize?: number;
}

export interface CompetitorJobResult {
  success: boolean;
  checked?: number;
  succeeded?: number;
  failed?: number;
  alertsTriggered?: number;
  errors?: string[];
}

/**
 * 競合チェックジョブのプロセッサ
 */
export async function competitorProcessor(job: Job<CompetitorJobData>): Promise<CompetitorJobResult> {
  const { type } = job.data;

  log.info({
    type: 'competitor_job_start',
    jobId: job.id,
    jobType: type,
  });

  try {
    switch (type) {
      case 'check_all':
        return await checkAllTrackers(job.data.batchSize || 50);
      case 'check_single':
        return await checkSingleTracker(job.data.trackerId!);
      case 'health_check':
        return await runHealthCheck();
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    log.error({
      type: 'competitor_job_error',
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 全トラッカーをチェック
 */
async function checkAllTrackers(batchSize: number): Promise<CompetitorJobResult> {
  const trackers = await competitorMonitor.getTrackersToCheck(batchSize);

  if (trackers.length === 0) {
    log.info({ type: 'no_trackers_to_check' });
    return {
      success: true,
      checked: 0,
      succeeded: 0,
      failed: 0,
      alertsTriggered: 0,
    };
  }

  let succeeded = 0;
  let failed = 0;
  let alertsTriggered = 0;
  const errors: string[] = [];

  for (const tracker of trackers) {
    try {
      // スクレイピング実行
      const scrapeResult = await competitorScraper.scrape(tracker.url, tracker.marketplace);

      if (scrapeResult.success && scrapeResult.price !== undefined) {
        // 価格チェック結果を記録
        const checkResult = await competitorMonitor.recordPriceCheck(
          tracker.id,
          scrapeResult.price,
          {
            title: scrapeResult.title,
            conditionRank: scrapeResult.conditionRank,
            sellerRating: scrapeResult.sellerRating,
            stockStatus: scrapeResult.stockStatus,
            shippingCost: scrapeResult.shippingCost,
          }
        );

        succeeded++;
        if (checkResult.alertTriggered) {
          alertsTriggered++;
        }

        log.debug({
          type: 'tracker_checked',
          trackerId: tracker.id,
          price: scrapeResult.price,
          alertTriggered: checkResult.alertTriggered,
        });
      } else {
        // エラーを記録
        await competitorMonitor.recordError(tracker.id, scrapeResult.error || 'Unknown error');
        failed++;
        errors.push(`${tracker.id}: ${scrapeResult.error}`);
      }

      // レート制限のための遅延
      await delay(1000 + Math.random() * 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await competitorMonitor.recordError(tracker.id, errorMessage);
      failed++;
      errors.push(`${tracker.id}: ${errorMessage}`);
    }
  }

  log.info({
    type: 'check_all_complete',
    checked: trackers.length,
    succeeded,
    failed,
    alertsTriggered,
  });

  return {
    success: true,
    checked: trackers.length,
    succeeded,
    failed,
    alertsTriggered,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 単一トラッカーをチェック
 */
async function checkSingleTracker(trackerId: string): Promise<CompetitorJobResult> {
  const trackers = await competitorMonitor.getTrackersToCheck(100);
  const tracker = trackers.find(t => t.id === trackerId);

  if (!tracker) {
    return {
      success: false,
      errors: [`Tracker not found or not active: ${trackerId}`],
    };
  }

  try {
    const scrapeResult = await competitorScraper.scrape(tracker.url, tracker.marketplace);

    if (scrapeResult.success && scrapeResult.price !== undefined) {
      const checkResult = await competitorMonitor.recordPriceCheck(
        tracker.id,
        scrapeResult.price,
        {
          title: scrapeResult.title,
          conditionRank: scrapeResult.conditionRank,
          sellerRating: scrapeResult.sellerRating,
          stockStatus: scrapeResult.stockStatus,
          shippingCost: scrapeResult.shippingCost,
        }
      );

      return {
        success: true,
        checked: 1,
        succeeded: 1,
        failed: 0,
        alertsTriggered: checkResult.alertTriggered ? 1 : 0,
      };
    } else {
      await competitorMonitor.recordError(tracker.id, scrapeResult.error || 'Unknown error');
      return {
        success: false,
        checked: 1,
        succeeded: 0,
        failed: 1,
        errors: [scrapeResult.error || 'Unknown error'],
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await competitorMonitor.recordError(trackerId, errorMessage);
    return {
      success: false,
      checked: 1,
      succeeded: 0,
      failed: 1,
      errors: [errorMessage],
    };
  }
}

/**
 * ヘルスチェック
 */
async function runHealthCheck(): Promise<CompetitorJobResult> {
  const trackers = await competitorMonitor.getTrackersToCheck(100);

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  // サンプルチェック（最大10件）
  const sample = trackers.slice(0, 10);

  for (const tracker of sample) {
    const result = await competitorScraper.healthCheck(tracker.url);

    if (result.accessible) {
      succeeded++;
    } else {
      failed++;
      errors.push(`${tracker.id}: ${result.error}`);
    }

    await delay(500);
  }

  log.info({
    type: 'health_check_complete',
    checked: sample.length,
    succeeded,
    failed,
  });

  return {
    success: true,
    checked: sample.length,
    succeeded,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 遅延
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

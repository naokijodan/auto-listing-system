import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger, captureJobFailure, initSentry, flushSentry } from '@rakuda/logger';
import { QUEUE_NAMES, QUEUE_CONFIG } from '@rakuda/config';

import { processScrapeJob } from '../processors/scrape';
import { processImageJob } from '../processors/image';
import { processTranslateJob } from '../processors/translate';
import { processPublishJob, processAutoPublishJob } from '../processors/publish';
import { processInventoryJob, processScheduledInventoryCheck, processSyncListingStatus } from '../processors/inventory';
import { processNotificationJob } from '../processors/notification';
import { pricingProcessor } from '../processors/pricing';
import { competitorProcessor } from '../processors/competitor';
import { processOrderSyncJob } from '../processors/order-sync';
import { processPriceSyncJob } from '../processors/price-sync';
import { processInventorySyncJob } from '../processors/inventory-sync';
// Phase 41: エンリッチメント・Joom出品
import { processEnrichmentJob, processFullWorkflow } from '../processors/enrichment';
import { processJoomPublishJob, processFullJoomWorkflow, processAutoJoomPublish } from '../processors/joom-publish';
// Phase 103: eBay出品
import { processEbayPublishJob, processFullEbayWorkflow } from '../processors/ebay-publish';
// Phase 105-C: eBay自動再出品
import { processEbayAutoRelistJob } from '../processors/ebay-auto-relist';
// v3.0: Etsy出品・Shopify同期
import { processEtsyPublishJob, processFullEtsyWorkflow } from '../processors/etsy-publish';
import { processShopifyPublishJob, processFullShopifyWorkflow } from '../processors/shopify-publish';
// Phase 51: 注文処理
import { processOrderJob, processDeadlineCheckJob } from '../processors/order';
// Phase 52: 発送処理
import { processShipmentJob } from '../processors/shipment';
import { runActiveInventoryCheck } from './scheduler';
import { JoomApiClient } from './joom-api';
import { EbayApiClient } from './ebay-api';
import { alertManager } from './alert-manager';
import { updateExchangeRate } from './exchange-rate';
import { syncAllPrices } from './price-sync';
import { sendDailyReportNotification, generateDailyReport } from './daily-report';
import { runDailyReportJob, runWeeklyReportJob } from './report-generator';
import { notifyHealthIssues, checkSystemHealth, recordError } from './error-monitor';
import { notifyExchangeRateUpdated } from './notifications';
import { processScheduledResumes } from './inventory-alert-service';

const workers: Worker[] = [];
let deadLetterQueue: Queue | null = null;

/**
 * 全ワーカーを起動
 */
export async function startWorkers(connection: IORedis): Promise<void> {
  // Sentry初期化（DSNが設定されている場合のみ有効化）
  initSentry({
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION || '1.0.0',
  });

  // Dead Letter Queue
  deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection });

  // スクレイピングワーカー
  const scrapeWorker = createWorker(
    QUEUE_NAMES.SCRAPE,
    async (job) => {
      // 為替レート更新ジョブ
      if (job.name === 'update-exchange-rate') {
        return handleExchangeRateUpdate(job);
      }
      // 価格同期ジョブ
      if (job.name === 'sync-prices' || job.name === 'manual-price-sync' || job.name === 'sync-price') {
        return handlePriceSync(job);
      }
      // 日次レポートジョブ
      if (job.name === 'daily-report') {
        return handleDailyReport(job);
      }
      // 売上レポートジョブ（日次・週次）
      if (job.name === 'daily-sales-report' || job.name === 'weekly-sales-report') {
        return handleSalesReport(job);
      }
      // ヘルスチェックジョブ
      if (job.name === 'health-check') {
        return handleHealthCheck(job);
      }
      // トークン更新ジョブ（Phase 46）
      if (job.name === 'token-refresh') {
        return handleTokenRefresh(job);
      }
      // メッセージ送信ジョブ（Phase 16）
      if (job.name === 'message-sending') {
        return handleMessageSending(job);
      }
      // Webhookイベント処理ジョブ（Phase 15）
      if (job.name === 'webhook-processing') {
        return handleWebhookProcessing(job);
      }
      // 通常のスクレイピング
      return processScrapeJob(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.SCRAPE]
  );
  workers.push(scrapeWorker);

  // 画像処理ワーカー
  const imageWorker = createWorker(
    QUEUE_NAMES.IMAGE,
    processImageJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.IMAGE]
  );
  workers.push(imageWorker);

  // 翻訳ワーカー
  const translateWorker = createWorker(
    QUEUE_NAMES.TRANSLATE,
    processTranslateJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.TRANSLATE]
  );
  workers.push(translateWorker);

  // 出品ワーカー
  const publishWorker = createWorker(
    QUEUE_NAMES.PUBLISH,
    async (job) => {
      // 自動出品ジョブ（Phase 50: 本番運用）
      if (job.name === 'auto-publish') {
        return processAutoPublishJob(job);
      }
      // 通常の出品ジョブ
      return processPublishJob(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.PUBLISH]
  );
  workers.push(publishWorker);

  // 在庫監視ワーカー
  const inventoryWorker = createWorker(
    QUEUE_NAMES.INVENTORY,
    async (job) => {
      // 注文同期ジョブ
      if (job.name === 'order-sync' || job.name === 'sync-orders') {
        return processOrderSyncJob(job);
      }
      // 在庫同期ジョブ（Phase 41-F）
      if (job.name === 'inventory-sync' || job.name === 'sync-inventory') {
        return processInventorySyncJob(job);
      }
      // 出荷通知ジョブ（Phase 41-E）
      if (job.name === 'ship-to-marketplace') {
        return handleShipToMarketplace(job);
      }
      // 出品状態同期
      if (job.name === 'sync-listing-status') {
        return processSyncListingStatus(job);
      }
      // Active商品の高頻度在庫監視（Phase 52）
      if (job.name === 'active-inventory-check') {
        return handleActiveInventoryCheck(job);
      }
      // eBay自動再出品（Phase 105-C）
      if (job.name === 'ebay-auto-relist' || job.name === 'auto-relist') {
        return processEbayAutoRelistJob(job);
      }
      // スケジュールされた在庫チェック
      if (job.name === 'scheduled-inventory-check' || job.name === 'manual-inventory-check') {
        return processScheduledInventoryCheck(job);
      }
      // 在庫アラート処理（Phase 17）
      if (job.name === 'inventory-alert-processing') {
        return handleInventoryAlertProcessing(job);
      }
      // 個別の在庫チェック
      return processInventoryJob(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.INVENTORY]
  );
  workers.push(inventoryWorker);

  // 通知ワーカー（Phase 26）
  const notificationWorker = createWorker(
    QUEUE_NAMES.NOTIFICATION,
    processNotificationJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.NOTIFICATION]
  );
  workers.push(notificationWorker);

  // 価格最適化ワーカー（Phase 28）
  const pricingWorker = createWorker(
    QUEUE_NAMES.PRICING,
    async (job) => {
      // 価格同期ジョブ（Phase 41-C）
      if (job.name === 'price-sync' || job.name === 'sync-prices') {
        return processPriceSyncJob(job);
      }
      // 通常の価格最適化
      return pricingProcessor(job);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.PRICING]
  );
  workers.push(pricingWorker);

  // 競合モニタリングワーカー（Phase 29）
  const competitorWorker = createWorker(
    QUEUE_NAMES.COMPETITOR,
    competitorProcessor,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.COMPETITOR]
  );
  workers.push(competitorWorker);

  // エンリッチメントワーカー（Phase 41）
  const enrichmentWorker = createWorker(
    QUEUE_NAMES.ENRICHMENT,
    async (job) => {
      // 完全ワークフロー
      if (job.name === 'full-workflow') {
        return processFullWorkflow(job as any);
      }
      // 通常のエンリッチメントジョブ
      return processEnrichmentJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.ENRICHMENT]
  );
  workers.push(enrichmentWorker);

  // Joom出品ワーカー（Phase 41）
  const joomPublishWorker = createWorker(
    QUEUE_NAMES.JOOM_PUBLISH,
    async (job) => {
      // 完全ワークフロー
      if (job.name === 'full-joom-workflow') {
        return processFullJoomWorkflow(job as any);
      }
      // 自動出品
      if (job.name === 'auto-joom-publish') {
        return processAutoJoomPublish(job as any);
      }
      // 通常のJoom出品ジョブ
      return processJoomPublishJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.JOOM_PUBLISH]
  );
  workers.push(joomPublishWorker);

  // eBay出品ワーカー（Phase 103）
  const ebayPublishWorker = createWorker(
    QUEUE_NAMES.EBAY_PUBLISH,
    async (job) => {
      // 完全ワークフロー（インベントリ→オファー→公開）
      if (job.name === 'full-ebay-workflow') {
        return processFullEbayWorkflow(job as any);
      }
      // 通常のeBay出品ジョブ
      return processEbayPublishJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.EBAY_PUBLISH]
  );
  workers.push(ebayPublishWorker);

  // Etsy出品ワーカー（v3.0）
  const etsyPublishWorker = createWorker(
    QUEUE_NAMES.ETSY_PUBLISH,
    async (job) => {
      // 完全ワークフロー（リスティング作成→画像処理→出品）
      if (job.name === 'full-etsy-workflow') {
        return processFullEtsyWorkflow(job as any);
      }
      // 通常のEtsy出品ジョブ
      return processEtsyPublishJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.ETSY_PUBLISH]
  );
  workers.push(etsyPublishWorker);

  // Shopify同期ワーカー（v3.0）
  const shopifySyncWorker = createWorker(
    QUEUE_NAMES.SHOPIFY_SYNC,
    async (job) => {
      // 完全ワークフロー（リスティング作成→画像処理→出品）
      if (job.name === 'full-shopify-workflow') {
        return processFullShopifyWorkflow(job as any);
      }
      // 通常のShopify同期ジョブ
      return processShopifyPublishJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.SHOPIFY_SYNC]
  );
  workers.push(shopifySyncWorker);

  // 注文処理ワーカー（Phase 51）
  const orderWorker = createWorker(
    QUEUE_NAMES.ORDER,
    async (job) => {
      // 発送期限チェック
      if (job.name === 'deadline-check') {
        return processDeadlineCheckJob(job as any);
      }
      // 通常の注文処理
      return processOrderJob(job as any);
    },
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.ORDER]
  );
  workers.push(orderWorker);

  // 発送処理ワーカー（Phase 52）
  const shipmentWorker = createWorker(
    QUEUE_NAMES.SHIPMENT,
    processShipmentJob,
    connection,
    QUEUE_CONFIG[QUEUE_NAMES.SHIPMENT]
  );
  workers.push(shipmentWorker);

  // AlertManager初期化
  await alertManager.initialize();

  logger.info(`Started ${workers.length} workers`);
}

/**
 * 為替レート更新ジョブのハンドラー
 */
async function handleExchangeRateUpdate(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'exchange-rate' });

  log.info({ type: 'exchange_rate_update_job_start' });

  try {
    const result = await updateExchangeRate();

    log.info({
      type: 'exchange_rate_update_job_complete',
      oldRate: result.oldRate,
      newRate: result.newRate,
      source: result.source,
    });

    // 変動があれば通知
    if (result.success && result.oldRate !== result.newRate) {
      await notifyExchangeRateUpdated(result.oldRate, result.newRate);
    }

    return {
      success: result.success,
      oldRate: result.oldRate,
      newRate: result.newRate,
      source: result.source,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'exchange_rate_update_job_error', error: error.message });
    await recordError('EXCHANGE_RATE', job.id, error.message, job.attemptsMade);
    throw error;
  }
}

/**
 * 価格同期ジョブのハンドラー
 */
async function handlePriceSync(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'price-sync' });

  log.info({ type: 'price_sync_job_start', data: job.data });

  try {
    const { listingIds, listingId, marketplace, externalId, newPrice, currency } = job.data;

    let result;

    // 単一出品の直接価格更新（APIからの推奨価格適用）
    if (listingId && externalId && newPrice !== undefined) {
      const { ebayApi, isEbayConfigured } = await import('./ebay-api');
      const { joomApi, isJoomConfigured } = await import('./joom-api');

      let apiUpdated = false;
      let error: string | undefined;

      try {
        if (marketplace === 'EBAY' && await isEbayConfigured()) {
          await ebayApi.updatePrice(externalId, newPrice, currency || 'USD');
          apiUpdated = true;
        } else if (marketplace === 'JOOM' && await isJoomConfigured()) {
          // Joomは productId と sku が必要
          const listing = await (await import('@rakuda/database')).prisma.listing.findUnique({
            where: { id: listingId },
          });
          const marketplaceData = listing?.marketplaceData as { sku?: string };
          if (marketplaceData?.sku) {
            await joomApi.updatePrice(externalId, marketplaceData.sku, newPrice);
            apiUpdated = true;
          }
        }
      } catch (apiError: any) {
        error = apiError.message;
        log.error({ type: 'price_sync_api_error', listingId, error });
      }

      result = {
        success: apiUpdated,
        listingId,
        marketplace,
        newPrice,
        apiUpdated,
        error,
      };
    } else if (listingIds && listingIds.length > 0) {
      // 特定の出品のみ再計算して同期
      const results = [];
      for (const id of listingIds) {
        const { syncListingPrice } = await import('./price-sync');
        results.push(await syncListingPrice(id));
      }
      result = {
        success: true,
        total: results.length,
        updated: results.filter(r => r.priceChanged).length,
        apiUpdated: results.filter(r => r.apiUpdated).length,
        errors: results.filter(r => r.error).length,
      };
    } else {
      // 全アクティブ出品を同期
      result = await syncAllPrices();
    }

    log.info({ type: 'price_sync_job_complete', result });

    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'price_sync_job_error', error: error.message });
    await recordError('PRICE_SYNC', job.id, error.message, job.attemptsMade);
    throw error;
  }
}

/**
 * 日次レポートジョブのハンドラー
 */
async function handleDailyReport(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'daily-report' });

  log.info({ type: 'daily_report_job_start' });

  try {
    const report = await generateDailyReport();
    await sendDailyReportNotification();

    log.info({
      type: 'daily_report_job_complete',
      date: report.date,
      newProducts: report.products.new,
      published: report.listings.published,
    });

    return {
      success: true,
      report,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'daily_report_job_error', error: error.message });
    throw error;
  }
}

/**
 * 売上レポートジョブのハンドラー（日次・週次）
 */
async function handleSalesReport(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'sales-report' });
  const { type, date, saveToDb, exportCsv, csvDir } = job.data;
  const isWeekly = type === 'weekly' || job.name === 'weekly-sales-report';

  log.info({ type: 'sales_report_job_start', reportType: isWeekly ? 'weekly' : 'daily' });

  try {
    const options = {
      saveToDb: saveToDb ?? true,
      exportCsv: exportCsv ?? false,
      csvDir: csvDir || '/tmp/reports',
    };

    let result;
    if (isWeekly) {
      const weekStart = date ? new Date(date) : undefined;
      result = await runWeeklyReportJob(weekStart, options);
    } else {
      const targetDate = date ? new Date(date) : undefined;
      result = await runDailyReportJob(targetDate, options);
    }

    log.info({
      type: 'sales_report_job_complete',
      reportType: isWeekly ? 'weekly' : 'daily',
      savedTo: result.savedTo?.id,
      csvPath: result.csvPath,
    });

    return {
      success: true,
      reportType: isWeekly ? 'weekly' : 'daily',
      report: result.report,
      savedTo: result.savedTo,
      csvPath: result.csvPath,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'sales_report_job_error', error: error.message });
    throw error;
  }
}

/**
 * ヘルスチェックジョブのハンドラー
 */
async function handleHealthCheck(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'health-check' });

  log.info({ type: 'health_check_job_start' });

  try {
    const health = await checkSystemHealth();

    if (!health.healthy) {
      await notifyHealthIssues();
    }

    log.info({
      type: 'health_check_job_complete',
      healthy: health.healthy,
      issues: health.checks.filter(c => c.status !== 'ok').length,
    });

    return {
      success: true,
      healthy: health.healthy,
      checks: health.checks,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'health_check_job_error', error: error.message });
    throw error;
  }
}

/**
 * トークン更新ジョブのハンドラー（Phase 46）
 * OAuth トークンの有効期限を監視し、自動更新・警告通知を行う
 */
async function handleTokenRefresh(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'token-refresh' });
  const { refreshBeforeExpiry, warnBeforeExpiry, marketplace, manual } = job.data;

  log.info({
    type: 'token_refresh_job_start',
    marketplace: marketplace || 'all',
    manual: !!manual,
  });

  try {
    const { checkTokenExpiry } = await import('./scheduler');
    const result = await checkTokenExpiry({
      refreshBeforeExpiry,
      warnBeforeExpiry,
      marketplace,
    });

    log.info({
      type: 'token_refresh_job_complete',
      checked: result.checked,
      refreshed: result.refreshed,
      warnings: result.warnings.length,
      errors: result.errors.length,
    });

    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'token_refresh_job_error', error: error.message });
    throw error;
  }
}

/**
 * マーケットプレイスへの出荷通知ジョブのハンドラー（Phase 41-E）
 */
async function handleShipToMarketplace(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'ship-to-marketplace' });
  const { orderId, marketplaceOrderId, marketplace, trackingNumber, trackingCarrier } = job.data;

  log.info({
    type: 'ship_to_marketplace_start',
    orderId,
    marketplace,
    trackingNumber,
  });

  try {
    if (marketplace === 'JOOM') {
      const joomClient = new JoomApiClient();
      const result = await joomClient.shipOrder(marketplaceOrderId, {
        trackingNumber,
        carrier: trackingCarrier,
      });

      if (result.success) {
        log.info({
          type: 'ship_to_marketplace_success',
          orderId,
          marketplace: 'JOOM',
        });

        return {
          success: true,
          orderId,
          marketplace,
          synced: true,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to sync shipment to Joom');
      }
    }

    if (marketplace === 'EBAY') {
      const ebayClient = new EbayApiClient();

      // eBay注文を取得してlineItemIdを確認
      const orderResult = await ebayClient.getOrder(marketplaceOrderId);
      if (!orderResult.success || !orderResult.data) {
        throw new Error(orderResult.error?.message || 'Failed to get eBay order');
      }

      const lineItem = orderResult.data.lineItems?.[0];
      if (!lineItem) {
        throw new Error('No line items found in eBay order');
      }

      const result = await ebayClient.shipOrder(marketplaceOrderId, lineItem.lineItemId, {
        trackingNumber,
        shippingCarrier: trackingCarrier,
      });

      if (result.success) {
        log.info({
          type: 'ship_to_marketplace_success',
          orderId,
          marketplace: 'EBAY',
        });

        return {
          success: true,
          orderId,
          marketplace,
          synced: true,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to sync shipment to eBay');
      }
    }

    return {
      success: false,
      orderId,
      marketplace,
      error: `Marketplace ${marketplace} not supported`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'ship_to_marketplace_error',
      orderId,
      marketplace,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Active商品の高頻度在庫監視ジョブのハンドラー（Phase 52）
 * ACTIVE状態のリスティングを持つ商品の在庫をチェックし、
 * 在庫切れ検知時に即時停止・アラート送信
 */
async function handleActiveInventoryCheck(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'active-inventory-check' });
  const { batchSize, delayBetweenChecks, marketplace, manual } = job.data;

  log.info({
    type: 'active_inventory_check_job_start',
    batchSize,
    delayBetweenChecks,
    marketplace: marketplace || 'JOOM',
    manual: !!manual,
  });

  try {
    const result = await runActiveInventoryCheck({
      batchSize: batchSize || 50,
      delayBetweenChecks: delayBetweenChecks || 3000,
      marketplace: marketplace || 'JOOM',
    });

    log.info({
      type: 'active_inventory_check_job_complete',
      total: result.total,
      checked: result.checked,
      outOfStock: result.outOfStock,
      priceChanged: result.priceChanged,
      errors: result.errors,
    });

    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'active_inventory_check_job_error', error: error.message });
    throw error;
  }
}

/**
 * メッセージ送信ジョブのハンドラー（Phase 16）
 * 未送信の通知をバッチ処理する
 */
async function handleMessageSending(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'message-sending' });
  const { batchSize = 10 } = job.data;

  log.info({ type: 'message_sending_start', batchSize });

  try {
    const { prisma } = await import('@rakuda/database');

    // 未読の通知を取得してログ出力（将来のDiscord/Email送信用）
    const pendingNotifications = await prisma.notification.findMany({
      where: { isRead: false },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });

    log.info({ type: 'message_sending_complete', processed: pendingNotifications.length });

    return {
      success: true,
      processed: pendingNotifications.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'message_sending_error', error: error.message });
    throw error;
  }
}

/**
 * Webhookイベント処理ジョブのハンドラー（Phase 15）
 * 受信したWebhookイベントをバッチ処理する
 */
async function handleWebhookProcessing(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'webhook-processing' });
  const { batchSize = 20 } = job.data;

  log.info({ type: 'webhook_processing_start', batchSize });

  try {
    // Webhookイベント処理のプレースホルダー
    // Shopify Webhook基盤構築後に実装予定
    log.info({ type: 'webhook_processing_complete', processed: 0 });

    return {
      success: true,
      processed: 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'webhook_processing_error', error: error.message });
    throw error;
  }
}

/**
 * 在庫アラート処理ジョブのハンドラー（Phase 17）
 * 在庫切れで停止したリスティングの自動再開を処理する
 */
async function handleInventoryAlertProcessing(job: any): Promise<any> {
  const log = logger.child({ jobId: job.id, processor: 'inventory-alert-processing' });

  log.info({ type: 'inventory_alert_processing_start' });

  try {
    const result = await processScheduledResumes();

    log.info({
      type: 'inventory_alert_processing_complete',
      processed: result.processed,
      resumed: result.resumed,
      failed: result.failed,
    });

    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({ type: 'inventory_alert_processing_error', error: error.message });
    throw error;
  }
}

/**
 * ワーカーを作成
 */
function createWorker(
  queueName: string,
  processor: (job: any) => Promise<any>,
  connection: IORedis,
  config: any
): Worker {
  const worker = new Worker(
    queueName,
    async (job) => {
      const log = logger.child({ jobId: job.id, queueName, jobName: job.name });
      const startTime = Date.now();

      log.info({ type: 'job_start', data: job.data });

      try {
        const result = await processor(job);
        const duration = Date.now() - startTime;

        log.info({
          type: 'job_complete',
          duration,
          result,
        });

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;

        log.error({
          type: 'job_error',
          duration,
          error: error.message,
          stack: error.stack,
        });

        // エラーモニタリング
        await recordError(
          job.name || queueName,
          job.id || 'unknown',
          error.message,
          job.attemptsMade || 1
        );

        throw error;
      }
    },
    {
      connection,
      concurrency: config.concurrency || 1,
      limiter: config.rateLimit
        ? {
            max: config.rateLimit.max,
            duration: config.rateLimit.duration,
          }
        : undefined,
    }
  );

  // イベントハンドラー
  worker.on('completed', (job) => {
    logger.debug({
      type: 'worker_job_completed',
      queueName,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', async (job, err) => {
    logger.warn({
      type: 'worker_job_failed',
      queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });

    // Phase 43-44: ジョブ失敗をDBに記録（リカバリー用）
    if (job) {
      try {
        const { recordFailedJob } = await import('./job-recovery');
        await recordFailedJob(job, err);
      } catch (recordErr) {
        logger.error({ type: 'failed_to_record_job', error: (recordErr as Error).message });
      }

      // Phase 44: Slackアラート送信
      try {
        const { alertManager: slackAlertManager } = await import('./slack-alert');
        await slackAlertManager.alertJobFailure(
          queueName,
          job.id || 'unknown',
          job.name,
          err.message,
          job.attemptsMade
        );
      } catch (alertErr) {
        logger.error({ type: 'failed_to_send_slack_alert', error: (alertErr as Error).message });
      }
    }

    // 最大リトライ回数超過時はDLQへ
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDeadLetter(job, err);
    }
  });

  worker.on('error', (err) => {
    logger.error({
      type: 'worker_error',
      queueName,
      error: err.message,
    });
  });

  return worker;
}

/**
 * Dead Letter Queueに移動
 */
async function moveToDeadLetter(job: any, error: Error): Promise<void> {
  if (!deadLetterQueue) return;

  try {
    await deadLetterQueue.add('dead-letter', {
      originalQueue: job.queueName,
      originalJobId: job.id,
      originalJobName: job.name,
      payload: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
    });

    // Sentryに通知（リトライ上限超過 = 本当の失敗）
    const eventId = captureJobFailure(
      job.id || 'unknown',
      job.name || 'unknown',
      job.queueName || 'unknown',
      error,
      job.attemptsMade || 1,
      job.opts?.attempts || 3,
      job.data
    );

    logger.warn({
      type: 'moved_to_dlq',
      originalQueue: job.queueName,
      jobId: job.id,
      jobName: job.name,
      sentryEventId: eventId,
    });
  } catch (err) {
    logger.error('Failed to move job to DLQ', err);
  }
}

/**
 * 全ワーカーを停止
 */
export async function stopWorkers(): Promise<void> {
  logger.info('Stopping all workers...');

  // 新規ジョブの受付停止
  await Promise.all(workers.map((w) => w.pause()));

  // 処理中のジョブ完了を待機
  await Promise.all(workers.map((w) => w.close()));

  // DLQを閉じる
  if (deadLetterQueue) {
    await deadLetterQueue.close();
  }

  // Sentryの未送信イベントをフラッシュ
  await flushSentry();

  workers.length = 0;
  logger.info('All workers stopped');
}

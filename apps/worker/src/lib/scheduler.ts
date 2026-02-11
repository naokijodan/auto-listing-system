import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import {
  QUEUE_NAMES,
  processBatch,
  processBatchGroups,
  BatchProgressInfo,
} from '@rakuda/config';
import { prisma, Marketplace } from '@rakuda/database';
import { checkSingleProductInventory, InventoryCheckResult } from './inventory-checker';

const log = logger.child({ module: 'scheduler' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });
const pricingQueue = new Queue(QUEUE_NAMES.PRICING, { connection: redis });
const competitorQueue = new Queue(QUEUE_NAMES.COMPETITOR, { connection: redis });
const publishQueue = new Queue(QUEUE_NAMES.PUBLISH, { connection: redis });
const orderQueue = new Queue(QUEUE_NAMES.ORDER, { connection: redis });

/**
 * スケジューラー設定
 */
export interface SchedulerConfig {
  // 在庫チェック
  inventoryCheck: {
    enabled: boolean;
    timesPerDay: number; // 1日の回数
    startHour: number;   // 開始時刻（時）
  };
  // 為替レート更新
  exchangeRate: {
    enabled: boolean;
    cronExpression: string; // cron形式
  };
  // 価格同期
  priceSync: {
    enabled: boolean;
    cronExpression: string;
  };
  // 日次レポート（運用統計）
  dailyReport: {
    enabled: boolean;
    cronExpression: string;
  };
  // 売上レポート（日次/週次売上サマリー）
  salesReport: {
    enabled: boolean;
    dailyCron: string;      // 日次売上レポートのcron
    weeklyCron: string;     // 週次売上レポートのcron
    saveToDb: boolean;      // DBに保存するか
    exportCsv: boolean;     // CSV出力するか
    csvDir: string;         // CSV出力先ディレクトリ
  };
  // ヘルスチェック
  healthCheck: {
    enabled: boolean;
    cronExpression: string;
  };
  // 価格最適化（Phase 28）
  pricingOptimization: {
    enabled: boolean;
    evaluateCron: string;     // 価格評価
    processExpiredCron: string; // 期限切れ処理
    processApprovedCron: string; // 承認済み適用
  };
  // 競合モニタリング（Phase 29）
  competitorMonitoring: {
    enabled: boolean;
    checkCron: string;        // 競合価格チェック
    healthCheckCron: string;  // ヘルスチェック
  };
  // 注文同期（Phase 41-E）
  orderSync: {
    enabled: boolean;
    cronExpression: string;
    sinceDays: number;        // 何日前までの注文を取得
    maxOrders: number;        // 最大取得件数
  };
  // 在庫同期（Phase 41-F）
  inventorySync: {
    enabled: boolean;
    cronExpression: string;
    maxListings: number;      // 最大同期件数
  };
  // トークン自動更新（Phase 46）
  tokenRefresh: {
    enabled: boolean;
    cronExpression: string;   // チェック間隔
    refreshBeforeExpiry: number;  // 有効期限の何ミリ秒前に更新するか
    warnBeforeExpiry: number;     // 有効期限の何ミリ秒前に警告するか
  };
  // 自動出品（Phase 50: 本番運用）
  autoPublish: {
    enabled: boolean;
    cronExpression: string;   // 新商品チェック間隔
    maxListingsPerRun: number;  // 1回の実行で出品する最大数
    marketplace: 'joom' | 'ebay' | 'all';  // 対象マーケットプレイス
  };
  // Active商品の高頻度在庫監視（Phase 52）
  activeInventoryMonitor: {
    enabled: boolean;
    cronExpression: string;   // チェック間隔（デフォルト: 毎時0分）
    batchSize: number;        // 1回の実行でチェックする最大数
    delayBetweenChecks: number; // チェック間の待機時間（ミリ秒）
  };
  // PAUSED商品再評価（Phase 4拡張ルール対応）
  pausedReEvaluation: {
    enabled: boolean;
    cronExpression: string;   // 日次実行（デフォルト: 毎日3時）
  };
  // マルチソース在庫同期（Phase 53: 強化版）
  batchInventorySync: {
    enabled: boolean;
    cronExpression: string;   // 実行間隔（デフォルト: 6時間ごと）
    limit: number;            // 1回の実行で処理する最大数
    delayMs: number;          // チェック間の待機時間（ミリ秒）
    marketplace?: 'JOOM' | 'EBAY'; // 対象マーケットプレイス（未指定で全て）
  };
  // 自動価格調整エンジン（Phase 54）
  priceAdjustment: {
    enabled: boolean;
    cronExpression: string;   // 実行間隔（デフォルト: 4時間ごと）
    limit: number;            // 1回の実行で処理する最大数
    targetProfitRate: number; // 目標利益率（%）
    minProfitRate: number;    // 最低利益率（%）
    maxPriceChangePercent: number; // 最大価格変更率（%）
  };
  // 顧客メッセージ送信（Phase 16）
  messageSending: {
    enabled: boolean;
    cronExpression: string;   // メッセージ送信間隔（デフォルト: 5分ごと）
    batchSize: number;        // 1回の実行で送信する最大数
  };
  // Webhookイベント処理（Phase 15）
  webhookProcessing: {
    enabled: boolean;
    cronExpression: string;   // 処理間隔（デフォルト: 1分ごと）
    batchSize: number;        // 1回の実行で処理する最大数
  };
  // 在庫アラート・自動再開処理（Phase 17）
  inventoryAlertProcessing: {
    enabled: boolean;
    cronExpression: string;   // 処理間隔（デフォルト: 10分ごと）
  };
  // 売上サマリー計算（Phase 18）
  salesSummaryCalculation: {
    enabled: boolean;
    dailyCron: string;        // 日次サマリー計算（デフォルト: 毎日1時）
    weeklyCron: string;       // 週次サマリー計算（デフォルト: 毎週月曜2時）
  };
  // 発送期限チェック（Phase 51-52）
  shipmentDeadlineCheck: {
    enabled: boolean;
    cronExpression: string;   // チェック間隔（デフォルト: 6時間ごと）
    urgentHours: number;      // 緊急アラートの閾値（時間）
  };
}

const DEFAULT_CONFIG: SchedulerConfig = {
  inventoryCheck: {
    enabled: true,
    timesPerDay: 3,
    startHour: 9, // 朝9時から開始
  },
  exchangeRate: {
    enabled: true,
    cronExpression: '0 0 * * *', // 毎日0時
  },
  priceSync: {
    enabled: true,
    cronExpression: '0 */6 * * *', // 6時間ごと
  },
  dailyReport: {
    enabled: true,
    cronExpression: '0 23 * * *', // 毎日23時
  },
  salesReport: {
    enabled: true,
    dailyCron: '0 23 * * *',      // 毎日23時に日次売上レポート
    weeklyCron: '0 9 * * 1',      // 毎週月曜9時に週次売上レポート
    saveToDb: true,               // DBに保存
    exportCsv: false,             // CSV出力しない（デフォルト）
    csvDir: '/tmp/reports',       // CSV出力先
  },
  healthCheck: {
    enabled: true,
    cronExpression: '0 */3 * * *', // 3時間ごと
  },
  pricingOptimization: {
    enabled: true,
    evaluateCron: '0 */4 * * *',      // 4時間ごとに価格評価
    processExpiredCron: '0 */2 * * *', // 2時間ごとに期限切れ処理
    processApprovedCron: '*/30 * * * *', // 30分ごとに承認済み適用
  },
  competitorMonitoring: {
    enabled: true,
    checkCron: '0 */2 * * *',         // 2時間ごとに競合チェック
    healthCheckCron: '0 6 * * *',     // 毎日6時にヘルスチェック
  },
  orderSync: {
    enabled: true,
    cronExpression: '0 */4 * * *',    // 4時間ごとに注文同期
    sinceDays: 7,                      // 7日前までの注文
    maxOrders: 100,                    // 最大100件
  },
  inventorySync: {
    enabled: true,
    cronExpression: '30 */6 * * *',   // 6時間ごとに在庫同期（毎時30分）
    maxListings: 100,                  // 最大100件
  },
  tokenRefresh: {
    enabled: true,
    cronExpression: '0 * * * *',       // 毎時0分にチェック
    refreshBeforeExpiry: 3600000,      // 1時間前に更新
    warnBeforeExpiry: 86400000,        // 24時間前に警告
  },
  autoPublish: {
    enabled: true,
    cronExpression: '0 * * * *',       // 毎時0分に新商品チェック
    maxListingsPerRun: 20,             // 1回の実行で最大20件出品
    marketplace: 'all',                // 全マーケットプレイス対象
  },
  activeInventoryMonitor: {
    enabled: true,
    cronExpression: '0 * * * *',       // 毎時0分にActive商品チェック
    batchSize: 50,                     // 1回の実行で最大50件チェック
    delayBetweenChecks: 3000,          // チェック間3秒待機
  },
  pausedReEvaluation: {
    enabled: true,
    cronExpression: '0 3 * * *',       // 毎日3時にPAUSED商品を再評価
  },
  batchInventorySync: {
    enabled: true,
    cronExpression: '0 */6 * * *',     // 6時間ごとにマルチソース在庫同期
    limit: 50,                          // 1回の実行で最大50件
    delayMs: 3000,                      // チェック間3秒待機
  },
  priceAdjustment: {
    enabled: true,
    cronExpression: '0 */4 * * *',     // 4時間ごとに価格調整
    limit: 50,                          // 1回の実行で最大50件
    targetProfitRate: 15,               // 目標利益率15%
    minProfitRate: 10,                  // 最低利益率10%
    maxPriceChangePercent: 20,          // 最大価格変更率20%
  },
  messageSending: {
    enabled: true,
    cronExpression: '*/5 * * * *',     // 5分ごとにメッセージ送信
    batchSize: 10,                      // 1回の実行で最大10件送信
  },
  webhookProcessing: {
    enabled: true,
    cronExpression: '* * * * *',       // 毎分Webhookイベント処理
    batchSize: 20,                      // 1回の実行で最大20件処理
  },
  inventoryAlertProcessing: {
    enabled: true,
    cronExpression: '*/10 * * * *',    // 10分ごとに在庫アラート・自動再開処理
  },
  salesSummaryCalculation: {
    enabled: true,
    dailyCron: '0 1 * * *',            // 毎日1時に日次サマリー計算
    weeklyCron: '0 2 * * 1',           // 毎週月曜2時に週次サマリー計算
  },
  shipmentDeadlineCheck: {
    enabled: true,
    cronExpression: '0 */6 * * *',     // 6時間ごとに発送期限チェック
    urgentHours: 24,                    // 24時間以内が緊急
  },
};

/**
 * 在庫チェックジョブをスケジュール
 */
async function scheduleInventoryChecks(config: SchedulerConfig['inventoryCheck']) {
  if (!config.enabled) {
    log.info({ type: 'inventory_check_disabled' });
    return;
  }

  const { timesPerDay, startHour } = config;
  const intervalHours = Math.floor(24 / timesPerDay);

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'scheduled-inventory-check') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // 新しいリピートジョブを追加
  for (let i = 0; i < timesPerDay; i++) {
    const hour = (startHour + i * intervalHours) % 24;
    const cronExpression = `0 ${hour} * * *`; // 毎日 hour 時に実行

    await inventoryQueue.add(
      'scheduled-inventory-check',
      {
        scheduledAt: new Date().toISOString(),
        checkType: 'all',
        batchSize: 50,
      },
      {
        repeat: {
          pattern: cronExpression,
        },
        jobId: `inventory-check-${i}`,
      }
    );

    log.info({
      type: 'inventory_check_scheduled',
      cronExpression,
      hour,
    });
  }
}

/**
 * 為替レート更新ジョブをスケジュール
 */
async function scheduleExchangeRateUpdate(config: SchedulerConfig['exchangeRate']) {
  if (!config.enabled) {
    log.info({ type: 'exchange_rate_update_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'update-exchange-rate') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await scrapeQueue.add(
    'update-exchange-rate',
    {
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'exchange-rate-update',
    }
  );

  log.info({
    type: 'exchange_rate_update_scheduled',
    cronExpression: config.cronExpression,
  });
}

/**
 * 価格同期ジョブをスケジュール
 * 為替レート変動に基づく価格自動更新
 */
async function schedulePriceSync(config: SchedulerConfig['priceSync']) {
  if (!config.enabled) {
    log.info({ type: 'price_sync_disabled' });
    return;
  }

  // 既存のリピートジョブを削除（旧scrapeQueue）
  const scrapeRepeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of scrapeRepeatableJobs) {
    if (job.name === 'sync-prices') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  // 既存のリピートジョブを削除（pricingQueue）
  const pricingRepeatableJobs = await pricingQueue.getRepeatableJobs();
  for (const job of pricingRepeatableJobs) {
    if (job.name === 'price-sync') {
      await pricingQueue.removeRepeatableByKey(job.key);
    }
  }

  // pricingQueueにジョブを追加（price-syncプロセッサーで処理）
  await pricingQueue.add(
    'price-sync',
    {
      type: 'price-sync',
      scheduledAt: new Date().toISOString(),
      priceChangeThreshold: 2, // 2%以上の変動で更新
      maxListings: 100,
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'price-sync-scheduled',
    }
  );

  log.info({
    type: 'price_sync_scheduled',
    cronExpression: config.cronExpression,
  });
}

/**
 * 日次レポートジョブをスケジュール
 */
async function scheduleDailyReport(config: SchedulerConfig['dailyReport']) {
  if (!config.enabled) {
    log.info({ type: 'daily_report_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-report') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await scrapeQueue.add(
    'daily-report',
    {
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'daily-report',
    }
  );

  log.info({
    type: 'daily_report_scheduled',
    cronExpression: config.cronExpression,
  });
}

/**
 * 売上レポートジョブをスケジュール（日次・週次）
 */
async function scheduleSalesReport(config: SchedulerConfig['salesReport']) {
  if (!config.enabled) {
    log.info({ type: 'sales_report_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-sales-report' || job.name === 'weekly-sales-report') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  // 日次売上レポートジョブを追加
  await scrapeQueue.add(
    'daily-sales-report',
    {
      type: 'daily',
      saveToDb: config.saveToDb,
      exportCsv: config.exportCsv,
      csvDir: config.csvDir,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.dailyCron,
      },
      jobId: 'daily-sales-report',
    }
  );

  // 週次売上レポートジョブを追加
  await scrapeQueue.add(
    'weekly-sales-report',
    {
      type: 'weekly',
      saveToDb: config.saveToDb,
      exportCsv: config.exportCsv,
      csvDir: config.csvDir,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.weeklyCron,
      },
      jobId: 'weekly-sales-report',
    }
  );

  log.info({
    type: 'sales_report_scheduled',
    dailyCron: config.dailyCron,
    weeklyCron: config.weeklyCron,
    saveToDb: config.saveToDb,
    exportCsv: config.exportCsv,
  });
}

/**
 * ヘルスチェックジョブをスケジュール
 */
async function scheduleHealthCheck(config: SchedulerConfig['healthCheck']) {
  if (!config.enabled) {
    log.info({ type: 'health_check_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'health-check') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await scrapeQueue.add(
    'health-check',
    {
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'health-check',
    }
  );

  log.info({
    type: 'health_check_scheduled',
    cronExpression: config.cronExpression,
  });
}

/**
 * 価格最適化ジョブをスケジュール（Phase 28）
 */
async function schedulePricingOptimization(config: SchedulerConfig['pricingOptimization']) {
  if (!config.enabled) {
    log.info({ type: 'pricing_optimization_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await pricingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await pricingQueue.removeRepeatableByKey(job.key);
  }

  // 価格評価ジョブ
  await pricingQueue.add(
    'evaluate',
    {
      type: 'evaluate',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.evaluateCron,
      },
      jobId: 'pricing-evaluate',
    }
  );

  // 期限切れ処理ジョブ
  await pricingQueue.add(
    'process-expired',
    {
      type: 'process_expired',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.processExpiredCron,
      },
      jobId: 'pricing-process-expired',
    }
  );

  // 承認済み適用ジョブ
  await pricingQueue.add(
    'process-approved',
    {
      type: 'process_approved',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.processApprovedCron,
      },
      jobId: 'pricing-process-approved',
    }
  );

  log.info({
    type: 'pricing_optimization_scheduled',
    evaluateCron: config.evaluateCron,
    processExpiredCron: config.processExpiredCron,
    processApprovedCron: config.processApprovedCron,
  });
}

/**
 * 競合モニタリングジョブをスケジュール（Phase 29）
 */
async function scheduleCompetitorMonitoring(config: SchedulerConfig['competitorMonitoring']) {
  if (!config.enabled) {
    log.info({ type: 'competitor_monitoring_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await competitorQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await competitorQueue.removeRepeatableByKey(job.key);
  }

  // 競合価格チェックジョブ
  await competitorQueue.add(
    'check-all',
    {
      type: 'check_all',
      batchSize: 50,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.checkCron,
      },
      jobId: 'competitor-check-all',
    }
  );

  // ヘルスチェックジョブ
  await competitorQueue.add(
    'health-check',
    {
      type: 'health_check',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.healthCheckCron,
      },
      jobId: 'competitor-health-check',
    }
  );

  log.info({
    type: 'competitor_monitoring_scheduled',
    checkCron: config.checkCron,
    healthCheckCron: config.healthCheckCron,
  });
}

/**
 * 注文同期ジョブをスケジュール（Phase 41-E/41-I）
 * Joom/eBay両対応
 */
async function scheduleOrderSync(config: SchedulerConfig['orderSync']) {
  if (!config.enabled) {
    log.info({ type: 'order_sync_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'order-sync' || job.name === 'order-sync-joom' || job.name === 'order-sync-ebay') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // Joom注文同期ジョブを追加
  await inventoryQueue.add(
    'order-sync',
    {
      marketplace: 'joom',
      sinceDays: config.sinceDays,
      maxOrders: config.maxOrders,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'order-sync-joom-scheduled',
    }
  );

  // eBay注文同期ジョブを追加（30分後にずらして実行）
  const ebayOffset = config.cronExpression.replace(/^(\d+)/, (match) => {
    const minute = parseInt(match, 10);
    return String((minute + 30) % 60);
  });

  await inventoryQueue.add(
    'order-sync',
    {
      marketplace: 'ebay',
      sinceDays: config.sinceDays,
      maxOrders: config.maxOrders,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: ebayOffset,
      },
      jobId: 'order-sync-ebay-scheduled',
    }
  );

  log.info({
    type: 'order_sync_scheduled',
    joomCron: config.cronExpression,
    ebayCron: ebayOffset,
    sinceDays: config.sinceDays,
  });
}

/**
 * バッチ在庫同期ジョブをスケジュール（Phase 53: 強化版マルチソース対応）
 * メルカリ、ヤフオク、Amazon JPからの在庫・価格変動を検知
 */
async function scheduleBatchInventorySync(config: SchedulerConfig['batchInventorySync']) {
  if (!config.enabled) {
    log.info({ type: 'batch_inventory_sync_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'batch-inventory-sync') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // バッチ在庫同期ジョブを追加
  await inventoryQueue.add(
    'batch-inventory-sync',
    {
      type: 'batch-inventory-sync',
      limit: config.limit,
      delayMs: config.delayMs,
      marketplace: config.marketplace,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'batch-inventory-sync-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'batch_inventory_sync_scheduled',
    cronExpression: config.cronExpression,
    limit: config.limit,
    delayMs: config.delayMs,
    marketplace: config.marketplace || 'all',
  });
}

/**
 * スケジューラーを初期化
 */
export async function initializeScheduler(config: Partial<SchedulerConfig> = {}) {
  const finalConfig: SchedulerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    inventoryCheck: { ...DEFAULT_CONFIG.inventoryCheck, ...config.inventoryCheck },
    exchangeRate: { ...DEFAULT_CONFIG.exchangeRate, ...config.exchangeRate },
    priceSync: { ...DEFAULT_CONFIG.priceSync, ...config.priceSync },
    dailyReport: { ...DEFAULT_CONFIG.dailyReport, ...config.dailyReport },
    salesReport: { ...DEFAULT_CONFIG.salesReport, ...config.salesReport },
    healthCheck: { ...DEFAULT_CONFIG.healthCheck, ...config.healthCheck },
    pricingOptimization: { ...DEFAULT_CONFIG.pricingOptimization, ...config.pricingOptimization },
    competitorMonitoring: { ...DEFAULT_CONFIG.competitorMonitoring, ...config.competitorMonitoring },
    orderSync: { ...DEFAULT_CONFIG.orderSync, ...config.orderSync },
    inventorySync: { ...DEFAULT_CONFIG.inventorySync, ...config.inventorySync },
    tokenRefresh: { ...DEFAULT_CONFIG.tokenRefresh, ...config.tokenRefresh },
    autoPublish: { ...DEFAULT_CONFIG.autoPublish, ...config.autoPublish },
    activeInventoryMonitor: { ...DEFAULT_CONFIG.activeInventoryMonitor, ...config.activeInventoryMonitor },
    pausedReEvaluation: { ...DEFAULT_CONFIG.pausedReEvaluation, ...config.pausedReEvaluation },
    batchInventorySync: { ...DEFAULT_CONFIG.batchInventorySync, ...config.batchInventorySync },
    priceAdjustment: { ...DEFAULT_CONFIG.priceAdjustment, ...config.priceAdjustment },
    messageSending: { ...DEFAULT_CONFIG.messageSending, ...config.messageSending },
    webhookProcessing: { ...DEFAULT_CONFIG.webhookProcessing, ...config.webhookProcessing },
    inventoryAlertProcessing: { ...DEFAULT_CONFIG.inventoryAlertProcessing, ...config.inventoryAlertProcessing },
    salesSummaryCalculation: { ...DEFAULT_CONFIG.salesSummaryCalculation, ...config.salesSummaryCalculation },
    shipmentDeadlineCheck: { ...DEFAULT_CONFIG.shipmentDeadlineCheck, ...config.shipmentDeadlineCheck },
  };

  log.info({ type: 'scheduler_initializing', config: finalConfig });

  await scheduleInventoryChecks(finalConfig.inventoryCheck);
  await scheduleExchangeRateUpdate(finalConfig.exchangeRate);
  await schedulePriceSync(finalConfig.priceSync);
  await scheduleDailyReport(finalConfig.dailyReport);
  await scheduleSalesReport(finalConfig.salesReport);
  await scheduleHealthCheck(finalConfig.healthCheck);
  await schedulePricingOptimization(finalConfig.pricingOptimization);
  await scheduleCompetitorMonitoring(finalConfig.competitorMonitoring);
  await scheduleOrderSync(finalConfig.orderSync);
  await scheduleInventorySync(finalConfig.inventorySync);
  await scheduleTokenRefresh(finalConfig.tokenRefresh);
  await scheduleAutoPublish(finalConfig.autoPublish);
  await scheduleActiveInventoryMonitor(finalConfig.activeInventoryMonitor);
  await schedulePausedReEvaluation(finalConfig.pausedReEvaluation);
  await scheduleBatchInventorySync(finalConfig.batchInventorySync);
  await schedulePriceAdjustment(finalConfig.priceAdjustment);
  await scheduleMessageSending(finalConfig.messageSending);
  await scheduleWebhookProcessing(finalConfig.webhookProcessing);
  await scheduleInventoryAlertProcessing(finalConfig.inventoryAlertProcessing);
  await scheduleSalesSummaryCalculation(finalConfig.salesSummaryCalculation);
  await scheduleShipmentDeadlineCheck(finalConfig.shipmentDeadlineCheck);

  log.info({ type: 'scheduler_initialized' });
}

/**
 * 手動で在庫チェックをトリガー
 */
export async function triggerInventoryCheck(productIds?: string[]) {
  const job = await inventoryQueue.add(
    'manual-inventory-check',
    {
      triggeredAt: new Date().toISOString(),
      productIds,
      checkType: productIds ? 'specific' : 'all',
      batchSize: 50,
    },
    {
      priority: 1, // 高優先度
    }
  );

  log.info({
    type: 'manual_inventory_check_triggered',
    jobId: job.id,
    productCount: productIds?.length || 'all',
  });

  return job.id;
}

/**
 * 手動で価格同期をトリガー
 * 為替レート変動に基づく価格自動更新
 */
export async function triggerPriceSync(options?: {
  marketplace?: 'joom' | 'ebay';
  forceUpdate?: boolean;
  maxListings?: number;
  priceChangeThreshold?: number;
}) {
  const job = await pricingQueue.add(
    'price-sync',
    {
      type: 'price-sync',
      triggeredAt: new Date().toISOString(),
      marketplace: options?.marketplace,
      forceUpdate: options?.forceUpdate || false,
      maxListings: options?.maxListings || 100,
      priceChangeThreshold: options?.priceChangeThreshold || 2,
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_price_sync_triggered',
    jobId: job.id,
    options,
  });

  return job.id;
}

/**
 * 手動で日次レポートをトリガー
 */
export async function triggerDailyReport() {
  const job = await scrapeQueue.add(
    'daily-report',
    {
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_daily_report_triggered',
    jobId: job.id,
  });

  return job.id;
}

/**
 * 手動で売上レポートをトリガー
 * @param type 'daily' | 'weekly'
 * @param options オプション
 */
export async function triggerSalesReport(
  type: 'daily' | 'weekly',
  options?: {
    date?: Date;
    saveToDb?: boolean;
    exportCsv?: boolean;
    csvDir?: string;
  }
) {
  const jobName = type === 'daily' ? 'daily-sales-report' : 'weekly-sales-report';

  const job = await scrapeQueue.add(
    jobName,
    {
      type,
      date: options?.date?.toISOString(),
      saveToDb: options?.saveToDb ?? true,
      exportCsv: options?.exportCsv ?? false,
      csvDir: options?.csvDir || '/tmp/reports',
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_sales_report_triggered',
    jobId: job.id,
    reportType: type,
    options,
  });

  return job.id;
}

/**
 * 手動でヘルスチェックをトリガー
 */
export async function triggerHealthCheck() {
  const job = await scrapeQueue.add(
    'health-check',
    {
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_health_check_triggered',
    jobId: job.id,
  });

  return job.id;
}

/**
 * 手動で価格評価をトリガー（Phase 28）
 */
export async function triggerPricingEvaluation(listingIds?: string[], ruleIds?: string[]) {
  const job = await pricingQueue.add(
    'evaluate',
    {
      type: 'evaluate',
      triggeredAt: new Date().toISOString(),
      listingIds,
      ruleIds,
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_pricing_evaluation_triggered',
    jobId: job.id,
    listingCount: listingIds?.length || 'all',
  });

  return job.id;
}

/**
 * 手動で価格推奨適用をトリガー（Phase 28）
 */
export async function triggerPricingApply(recommendationId: string) {
  const job = await pricingQueue.add(
    'apply',
    {
      type: 'apply',
      recommendationId,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_pricing_apply_triggered',
    jobId: job.id,
    recommendationId,
  });

  return job.id;
}

/**
 * 手動で競合価格チェックをトリガー（Phase 29）
 */
export async function triggerCompetitorCheck(trackerId?: string) {
  const job = await competitorQueue.add(
    trackerId ? 'check-single' : 'check-all',
    {
      type: trackerId ? 'check_single' : 'check_all',
      trackerId,
      batchSize: 50,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_competitor_check_triggered',
    jobId: job.id,
    trackerId: trackerId || 'all',
  });

  return job.id;
}

/**
 * 手動で注文同期をトリガー（Phase 41-E）
 */
export async function triggerOrderSync(options?: {
  marketplace?: 'joom' | 'ebay';
  sinceDays?: number;
  maxOrders?: number;
}) {
  const job = await inventoryQueue.add(
    'order-sync',
    {
      marketplace: options?.marketplace || 'joom',
      sinceDays: options?.sinceDays || 7,
      maxOrders: options?.maxOrders || 100,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_order_sync_triggered',
    jobId: job.id,
    options,
  });

  return job.id;
}

/**
 * 手動でバッチ在庫同期をトリガー（Phase 53）
 * マルチソース対応：メルカリ、ヤフオク、Amazon JPの在庫を一括チェック
 */
export async function triggerBatchInventorySync(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  limit?: number;
  delayMs?: number;
}): Promise<string> {
  const job = await inventoryQueue.add(
    'batch-inventory-sync',
    {
      type: 'batch-inventory-sync',
      marketplace: options?.marketplace,
      limit: options?.limit || 50,
      delayMs: options?.delayMs || 3000,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_batch_inventory_sync_triggered',
    jobId: job.id,
    options,
  });

  return job.id || '';
}

/**
 * 在庫同期ジョブをスケジュール（Phase 41-F/41-H）
 * Joom/eBay両対応
 */
async function scheduleInventorySync(config: SchedulerConfig['inventorySync']) {
  if (!config.enabled) {
    log.info({ type: 'inventory_sync_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'inventory-sync' || job.name === 'inventory-sync-joom' || job.name === 'inventory-sync-ebay') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // Joom在庫同期ジョブを追加
  await inventoryQueue.add(
    'inventory-sync',
    {
      marketplace: 'joom',
      maxListings: config.maxListings,
      syncOutOfStock: true,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'inventory-sync-joom-scheduled',
    }
  );

  // eBay在庫同期ジョブを追加（15分後にずらして実行）
  // 例: '30 */6 * * *' → '45 */6 * * *'
  const ebayOffset = config.cronExpression.replace(/^(\d+)/, (match) => {
    const minute = parseInt(match, 10);
    return String((minute + 15) % 60);
  });

  await inventoryQueue.add(
    'inventory-sync',
    {
      marketplace: 'ebay',
      maxListings: config.maxListings,
      syncOutOfStock: true,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: ebayOffset,
      },
      jobId: 'inventory-sync-ebay-scheduled',
    }
  );

  log.info({
    type: 'inventory_sync_scheduled',
    joomCron: config.cronExpression,
    ebayCron: ebayOffset,
    maxListings: config.maxListings,
  });
}

/**
 * トークン更新ジョブをスケジュール（Phase 46）
 * OAuth トークンの有効期限を監視し、自動更新・警告通知を行う
 */
async function scheduleTokenRefresh(config: SchedulerConfig['tokenRefresh']) {
  if (!config.enabled) {
    log.info({ type: 'token_refresh_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'token-refresh') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await scrapeQueue.add(
    'token-refresh',
    {
      refreshBeforeExpiry: config.refreshBeforeExpiry,
      warnBeforeExpiry: config.warnBeforeExpiry,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'token-refresh-scheduled',
    }
  );

  log.info({
    type: 'token_refresh_scheduled',
    cronExpression: config.cronExpression,
    refreshBeforeExpiry: config.refreshBeforeExpiry,
    warnBeforeExpiry: config.warnBeforeExpiry,
  });
}

/**
 * 自動出品ジョブをスケジュール（Phase 50: 本番運用）
 * PENDING_PUBLISHステータスの商品を自動的に出品
 */
async function scheduleAutoPublish(config: SchedulerConfig['autoPublish']) {
  if (!config.enabled) {
    log.info({ type: 'auto_publish_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await publishQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'auto-publish') {
      await publishQueue.removeRepeatableByKey(job.key);
    }
  }

  // Joom自動出品ジョブを追加
  if (config.marketplace === 'all' || config.marketplace === 'joom') {
    await publishQueue.add(
      'auto-publish',
      {
        marketplace: 'joom',
        maxListings: config.maxListingsPerRun,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: config.cronExpression,
        },
        jobId: 'auto-publish-joom-scheduled',
      }
    );
  }

  // eBay自動出品ジョブを追加（30分後にずらして実行）
  if (config.marketplace === 'all' || config.marketplace === 'ebay') {
    const ebayOffset = config.cronExpression.replace(/^(\d+)/, (match) => {
      const minute = parseInt(match, 10);
      return String((minute + 30) % 60);
    });

    await publishQueue.add(
      'auto-publish',
      {
        marketplace: 'ebay',
        maxListings: config.maxListingsPerRun,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: ebayOffset,
        },
        jobId: 'auto-publish-ebay-scheduled',
      }
    );
  }

  log.info({
    type: 'auto_publish_scheduled',
    cronExpression: config.cronExpression,
    maxListingsPerRun: config.maxListingsPerRun,
    marketplace: config.marketplace,
  });
}

/**
 * 手動で自動出品をトリガー（Phase 50）
 */
export async function triggerAutoPublish(options?: {
  marketplace?: 'joom' | 'ebay';
  maxListings?: number;
  isDryRun?: boolean;
}) {
  const job = await publishQueue.add(
    'auto-publish',
    {
      marketplace: options?.marketplace || 'joom',
      maxListings: options?.maxListings || 20,
      isDryRun: options?.isDryRun || false,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_auto_publish_triggered',
    jobId: job.id,
    options,
  });

  return job.id;
}

/**
 * 手動でトークン更新をトリガー（Phase 46）
 */
export async function triggerTokenRefresh(marketplace?: 'joom' | 'ebay') {
  const job = await scrapeQueue.add(
    'token-refresh',
    {
      marketplace,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_token_refresh_triggered',
    jobId: job.id,
    marketplace: marketplace || 'all',
  });

  return job.id;
}

/**
 * トークンの有効期限をチェック（Phase 46）
 * ワーカーから呼び出される
 */
export async function checkTokenExpiry(options: {
  refreshBeforeExpiry?: number;
  warnBeforeExpiry?: number;
  marketplace?: 'joom' | 'ebay';
}): Promise<{
  checked: number;
  refreshed: number;
  warnings: Array<{ marketplace: string; expiresAt: Date; message: string }>;
  errors: Array<{ marketplace: string; error: string }>;
}> {
  const refreshThreshold = options.refreshBeforeExpiry || 3600000; // 1時間
  const warnThreshold = options.warnBeforeExpiry || 86400000;      // 24時間
  const now = new Date();

  const result = {
    checked: 0,
    refreshed: 0,
    warnings: [] as Array<{ marketplace: string; expiresAt: Date; message: string }>,
    errors: [] as Array<{ marketplace: string; error: string }>,
  };

  // マーケットプレイス認証情報を取得
  const whereClause = options.marketplace
    ? { marketplace: options.marketplace.toUpperCase() as Marketplace, isActive: true }
    : { isActive: true };

  const credentials = await prisma.marketplaceCredential.findMany({
    where: whereClause,
  });

  for (const cred of credentials) {
    result.checked++;

    // トークン有効期限がない場合はスキップ
    if (!cred.tokenExpiresAt) {
      continue;
    }

    const expiresAt = new Date(cred.tokenExpiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    // 既に期限切れ
    if (timeUntilExpiry <= 0) {
      result.warnings.push({
        marketplace: cred.marketplace,
        expiresAt,
        message: `Token has already expired`,
      });
      continue;
    }

    // 更新が必要（期限まで refreshThreshold 以内）
    if (timeUntilExpiry <= refreshThreshold) {
      log.info({
        type: 'token_refresh_needed',
        marketplace: cred.marketplace,
        expiresAt,
        timeUntilExpiry,
      });

      if (cred.marketplace === 'EBAY') {
        try {
          // eBayはリフレッシュトークンで更新可能
          const { ebayApi } = await import('./ebay-api');
          // ensureAccessToken を呼ぶと自動的にリフレッシュされる
          // 内部でrefreshAccessTokenが呼ばれる
          await (ebayApi as any).ensureAccessToken();
          result.refreshed++;
          log.info({
            type: 'token_refreshed',
            marketplace: cred.marketplace,
          });
        } catch (error: any) {
          result.errors.push({
            marketplace: cred.marketplace,
            error: error.message,
          });
          log.error({
            type: 'token_refresh_failed',
            marketplace: cred.marketplace,
            error: error.message,
          });
        }
      } else if (cred.marketplace === 'JOOM') {
        try {
          // Phase 48: Joomもリフレッシュトークンで自動更新
          const { refreshJoomToken } = await import('./joom-api');
          const refreshResult = await refreshJoomToken();

          if (refreshResult.success) {
            result.refreshed++;
            log.info({
              type: 'token_refreshed',
              marketplace: cred.marketplace,
              expiresAt: refreshResult.expiresAt,
            });
          } else {
            // リフレッシュ失敗時は警告として記録
            result.warnings.push({
              marketplace: cred.marketplace,
              expiresAt,
              message: refreshResult.error || 'Token refresh failed. Re-authorization may be required.',
            });
          }
        } catch (error: any) {
          result.errors.push({
            marketplace: cred.marketplace,
            error: error.message,
          });
          log.error({
            type: 'token_refresh_failed',
            marketplace: cred.marketplace,
            error: error.message,
          });
        }
      }
    }
    // 警告が必要（期限まで warnThreshold 以内）
    else if (timeUntilExpiry <= warnThreshold) {
      const daysLeft = Math.floor(timeUntilExpiry / 86400000);
      const hoursLeft = Math.floor((timeUntilExpiry % 86400000) / 3600000);

      result.warnings.push({
        marketplace: cred.marketplace,
        expiresAt,
        message: `Token will expire in ${daysLeft} days and ${hoursLeft} hours`,
      });
    }
  }

  // 警告がある場合は通知を送信
  if (result.warnings.length > 0) {
    try {
      const { sendNotification } = await import('./notification-service');
      const warningMessages = result.warnings
        .map(w => `${w.marketplace}: ${w.message} (expires: ${w.expiresAt.toISOString()})`)
        .join('\n');

      await sendNotification({
        eventType: 'SYSTEM_ALERT',
        severity: 'WARNING',
        title: 'OAuth Token Expiry Warning',
        message: `The following tokens require attention:\n\n${warningMessages}`,
        data: {
          tokenCount: result.warnings.length,
          marketplaces: result.warnings.map(w => w.marketplace).join(', '),
        },
      });
    } catch (notifyError: any) {
      log.warn({
        type: 'token_expiry_notification_failed',
        error: notifyError.message,
      });
    }
  }

  log.info({
    type: 'token_expiry_check_completed',
    ...result,
  });

  return result;
}

/**
 * 手動で在庫同期をトリガー（Phase 41-F）
 */
export async function triggerInventorySync(options?: {
  marketplace?: 'joom' | 'ebay';
  listingIds?: string[];
  syncOutOfStock?: boolean;
  maxListings?: number;
}) {
  const job = await inventoryQueue.add(
    'inventory-sync',
    {
      marketplace: options?.marketplace || 'joom',
      listingIds: options?.listingIds,
      syncOutOfStock: options?.syncOutOfStock ?? true,
      maxListings: options?.maxListings || 100,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_inventory_sync_triggered',
    jobId: job.id,
    options,
  });

  return job.id;
}

// ========================================
// DBから同期設定を読み込み
// ========================================

interface SyncSettingFromDB {
  marketplace: string;
  syncType: string;
  cronExpression: string;
  isEnabled: boolean;
}

/**
 * DBから同期設定を読み込む
 */
export async function loadSyncSettingsFromDB(): Promise<SyncSettingFromDB[]> {
  try {
    const settings = await prisma.marketplaceSyncSetting.findMany({
      where: { isEnabled: true },
    });
    return settings;
  } catch (error) {
    log.error({ type: 'load_sync_settings_error', error });
    return [];
  }
}

/**
 * DB設定を使ってスケジューラーを初期化
 * DBに設定がない場合はデフォルト設定を使用
 */
export async function initializeSchedulerFromDB() {
  log.info({ type: 'scheduler_initializing_from_db' });

  const dbSettings = await loadSyncSettingsFromDB();

  // DB設定をSchedulerConfig形式に変換
  const configOverrides: Partial<SchedulerConfig> = {};

  for (const setting of dbSettings) {
    const marketplace = setting.marketplace.toLowerCase();
    const syncType = setting.syncType.toLowerCase();

    // 注文同期設定
    if (syncType === 'order') {
      if (!configOverrides.orderSync) {
        configOverrides.orderSync = { ...DEFAULT_CONFIG.orderSync };
      }
      configOverrides.orderSync.cronExpression = setting.cronExpression;
      configOverrides.orderSync.enabled = setting.isEnabled;
    }

    // 在庫同期設定
    if (syncType === 'inventory') {
      if (!configOverrides.inventorySync) {
        configOverrides.inventorySync = { ...DEFAULT_CONFIG.inventorySync };
      }
      configOverrides.inventorySync.cronExpression = setting.cronExpression;
      configOverrides.inventorySync.enabled = setting.isEnabled;
    }

    // 価格同期設定
    if (syncType === 'price') {
      if (!configOverrides.priceSync) {
        configOverrides.priceSync = { ...DEFAULT_CONFIG.priceSync };
      }
      configOverrides.priceSync.cronExpression = setting.cronExpression;
      configOverrides.priceSync.enabled = setting.isEnabled;
    }
  }

  log.info({
    type: 'db_settings_loaded',
    count: dbSettings.length,
    settings: dbSettings.map((s) => ({
      marketplace: s.marketplace,
      syncType: s.syncType,
      cronExpression: s.cronExpression,
    })),
  });

  // 通常の初期化関数を呼び出し
  await initializeScheduler(configOverrides);

  log.info({ type: 'scheduler_initialized_from_db' });
}

/**
 * デフォルトの同期設定をDBに挿入（シード用）
 */
export async function seedDefaultSyncSettings(): Promise<void> {
  const defaultSettings = [
    { marketplace: 'JOOM', syncType: 'INVENTORY', cronExpression: '0 */6 * * *' },
    { marketplace: 'JOOM', syncType: 'ORDER', cronExpression: '0 */4 * * *' },
    { marketplace: 'JOOM', syncType: 'PRICE', cronExpression: '0 */6 * * *' },
    { marketplace: 'EBAY', syncType: 'INVENTORY', cronExpression: '0 */6 * * *' },
    { marketplace: 'EBAY', syncType: 'ORDER', cronExpression: '0 */4 * * *' },
    { marketplace: 'EBAY', syncType: 'PRICE', cronExpression: '0 */6 * * *' },
  ];

  for (const setting of defaultSettings) {
    await prisma.marketplaceSyncSetting.upsert({
      where: {
        marketplace_syncType: {
          marketplace: setting.marketplace,
          syncType: setting.syncType,
        },
      },
      update: {}, // 既存の場合は更新しない
      create: {
        marketplace: setting.marketplace,
        syncType: setting.syncType,
        cronExpression: setting.cronExpression,
        isEnabled: true,
      },
    });
  }

  log.info({
    type: 'default_sync_settings_seeded',
    count: defaultSettings.length,
  });
}

/**
 * 次回実行日時を更新
 */
export async function updateNextRunAt(
  marketplace: string,
  syncType: string,
  nextRunAt: Date
): Promise<void> {
  try {
    await prisma.marketplaceSyncSetting.update({
      where: {
        marketplace_syncType: {
          marketplace: marketplace.toUpperCase(),
          syncType: syncType.toUpperCase(),
        },
      },
      data: {
        nextRunAt,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    log.error({
      type: 'update_next_run_at_error',
      marketplace,
      syncType,
      error,
    });
  }
}

/**
 * 最終実行日時を更新
 */
export async function updateLastRunAt(
  marketplace: string,
  syncType: string
): Promise<void> {
  try {
    await prisma.marketplaceSyncSetting.update({
      where: {
        marketplace_syncType: {
          marketplace: marketplace.toUpperCase(),
          syncType: syncType.toUpperCase(),
        },
      },
      data: {
        lastRunAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    log.error({
      type: 'update_last_run_at_error',
      marketplace,
      syncType,
      error,
    });
  }
}

// ========================================
// Phase 46: 並列バッチ処理
// ========================================

/**
 * 並列スケジュール実行結果
 */
export interface ParallelScheduleResult {
  scheduleName: string;
  success: boolean;
  duration: number;
  itemsProcessed: number;
  errors: number;
  error?: string;
}

/**
 * 複数のスケジュールジョブを並列実行
 *
 * @param schedules 実行するスケジュール設定
 * @param options オプション
 * @returns 実行結果
 *
 * @example
 * ```typescript
 * const results = await runParallelSchedules([
 *   { name: 'inventory-sync-joom', fn: () => triggerInventorySync({ marketplace: 'joom' }) },
 *   { name: 'inventory-sync-ebay', fn: () => triggerInventorySync({ marketplace: 'ebay' }) },
 *   { name: 'order-sync', fn: () => triggerOrderSync() },
 * ], { concurrency: 2 });
 * ```
 */
export async function runParallelSchedules(
  schedules: Array<{
    name: string;
    fn: () => Promise<any>;
    priority?: number;
  }>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
    timeout?: number;
    onProgress?: (info: BatchProgressInfo<string, any>) => void;
  } = {}
): Promise<ParallelScheduleResult[]> {
  const concurrency = options.concurrency || 2;
  const continueOnError = options.continueOnError ?? true;
  const timeout = options.timeout || 300000; // 5分

  log.info({
    type: 'parallel_schedules_start',
    scheduleCount: schedules.length,
    concurrency,
    schedules: schedules.map(s => s.name),
  });

  // 優先度でソート（高い順）
  const sortedSchedules = [...schedules].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  const scheduleNames = sortedSchedules.map(s => s.name);

  // 並列バッチ処理
  const batchResult = await processBatch<string, { result: any; duration: number }>(
    scheduleNames,
    async (scheduleName, index) => {
      const schedule = sortedSchedules[index];
      const startTime = Date.now();

      try {
        const result = await Promise.race([
          schedule.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Schedule timeout after ${timeout}ms`)), timeout)
          ),
        ]);

        return {
          result,
          duration: Date.now() - startTime,
        };
      } catch (error: any) {
        throw error;
      }
    },
    {
      config: {
        concurrency,
        chunkSize: schedules.length,
        delayBetweenItems: 100,
        delayBetweenChunks: 0,
        continueOnError,
        maxErrors: schedules.length,
        itemTimeout: timeout,
        retryCount: 0,
        retryDelay: 0,
        useExponentialBackoff: false,
      },
      onProgress: options.onProgress,
      onItemComplete: (result) => {
        log.info({
          type: 'schedule_completed',
          name: result.item,
          success: result.success,
          duration: result.result?.duration || result.duration,
        });
      },
      onError: (scheduleName, error) => {
        log.error({
          type: 'schedule_error',
          name: scheduleName,
          error: error.message,
        });
      },
      logger: (message, data) => {
        log.debug({ type: message, ...data });
      },
    }
  );

  // 結果を整形
  const results: ParallelScheduleResult[] = batchResult.results.map(r => ({
    scheduleName: r.item,
    success: r.success,
    duration: r.result?.duration || r.duration,
    itemsProcessed: r.result?.result?.processed || r.result?.result?.count || 0,
    errors: r.success ? 0 : 1,
    error: r.error?.message,
  }));

  log.info({
    type: 'parallel_schedules_complete',
    totalDuration: batchResult.stats.duration,
    succeeded: batchResult.stats.succeeded,
    failed: batchResult.stats.failed,
  });

  return results;
}

/**
 * マーケットプレイス別に並列でスケジュール実行
 *
 * @param syncType 同期タイプ
 * @param options オプション
 * @returns 実行結果
 */
export async function runParallelMarketplaceSync(
  syncType: 'inventory' | 'order' | 'price',
  options: {
    marketplaces?: Array<'joom' | 'ebay'>;
    concurrency?: number;
    maxItems?: number;
  } = {}
): Promise<ParallelScheduleResult[]> {
  const marketplaces = options.marketplaces || ['joom', 'ebay'];
  const concurrency = options.concurrency || 2;
  const maxItems = options.maxItems || 100;

  log.info({
    type: 'parallel_marketplace_sync_start',
    syncType,
    marketplaces,
    concurrency,
    maxItems,
  });

  const schedules = marketplaces.map(marketplace => ({
    name: `${syncType}-sync-${marketplace}`,
    fn: async () => {
      switch (syncType) {
        case 'inventory':
          return triggerInventorySync({ marketplace, maxListings: maxItems });
        case 'order':
          return triggerOrderSync({ marketplace, maxOrders: maxItems });
        case 'price':
          return triggerPriceSync({ marketplace, maxListings: maxItems });
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }
    },
    priority: marketplace === 'joom' ? 2 : 1,
  }));

  return runParallelSchedules(schedules, { concurrency });
}

/**
 * 全同期ジョブを並列実行（毎日のバッチ処理用）
 *
 * @param options オプション
 * @returns 実行結果
 */
export async function runDailyParallelSync(options: {
  marketplaces?: Array<'joom' | 'ebay'>;
  inventoryConcurrency?: number;
  orderConcurrency?: number;
  priceConcurrency?: number;
} = {}): Promise<{
  inventory: ParallelScheduleResult[];
  order: ParallelScheduleResult[];
  price: ParallelScheduleResult[];
  totalDuration: number;
}> {
  const startTime = Date.now();
  const marketplaces = options.marketplaces || ['joom', 'ebay'];

  log.info({
    type: 'daily_parallel_sync_start',
    marketplaces,
  });

  // 順次実行（在庫 -> 注文 -> 価格）
  // ただし各同期タイプ内はマーケットプレイス並列

  const inventoryResults = await runParallelMarketplaceSync('inventory', {
    marketplaces,
    concurrency: options.inventoryConcurrency || 2,
  });

  const orderResults = await runParallelMarketplaceSync('order', {
    marketplaces,
    concurrency: options.orderConcurrency || 2,
  });

  const priceResults = await runParallelMarketplaceSync('price', {
    marketplaces,
    concurrency: options.priceConcurrency || 2,
  });

  const totalDuration = Date.now() - startTime;

  const result = {
    inventory: inventoryResults,
    order: orderResults,
    price: priceResults,
    totalDuration,
  };

  log.info({
    type: 'daily_parallel_sync_complete',
    totalDuration,
    inventorySuccess: inventoryResults.filter(r => r.success).length,
    orderSuccess: orderResults.filter(r => r.success).length,
    priceSuccess: priceResults.filter(r => r.success).length,
  });

  return result;
}

/**
 * 並列ジョブキュー投入
 * 複数のジョブを並列でキューに追加
 */
export async function queueParallelJobs<T>(
  queue: Queue,
  jobs: Array<{
    name: string;
    data: T;
    options?: { priority?: number; delay?: number };
  }>,
  options: {
    concurrency?: number;
  } = {}
): Promise<{
  queued: number;
  failed: number;
  jobIds: string[];
}> {
  const concurrency = options.concurrency || 5;

  log.info({
    type: 'queue_parallel_jobs_start',
    queueName: queue.name,
    jobCount: jobs.length,
    concurrency,
  });

  const jobIds: string[] = [];
  let failed = 0;

  const batchResult = await processBatch(
    jobs,
    async (job) => {
      const addedJob = await queue.add(job.name, job.data, {
        priority: job.options?.priority,
        delay: job.options?.delay,
      });
      return addedJob.id;
    },
    {
      config: {
        concurrency,
        chunkSize: 50,
        delayBetweenItems: 10,
        delayBetweenChunks: 100,
        continueOnError: true,
        maxErrors: jobs.length,
        itemTimeout: 10000,
        retryCount: 2,
        retryDelay: 500,
        useExponentialBackoff: true,
      },
      onItemComplete: (result) => {
        if (result.success && result.result) {
          jobIds.push(result.result);
        }
      },
      onError: (job, error) => {
        failed++;
        log.error({
          type: 'queue_job_error',
          jobName: job.name,
          error: error.message,
        });
      },
    }
  );

  log.info({
    type: 'queue_parallel_jobs_complete',
    queued: jobIds.length,
    failed,
    duration: batchResult.stats.duration,
  });

  return {
    queued: jobIds.length,
    failed,
    jobIds,
  };
}

// ========================================
// Phase 52: Active商品の高頻度在庫監視
// ========================================

/**
 * Active商品の高頻度在庫監視ジョブをスケジュール（Phase 52）
 * 1時間毎にACTIVEステータスの出品を持つ商品の在庫をチェック
 */
async function scheduleActiveInventoryMonitor(config: SchedulerConfig['activeInventoryMonitor']) {
  if (!config.enabled) {
    log.info({ type: 'active_inventory_monitor_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'active-inventory-check') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // 高頻度在庫監視ジョブを追加
  await inventoryQueue.add(
    'active-inventory-check',
    {
      type: 'inventory-check',
      target: 'active',
      batchSize: config.batchSize,
      delayBetweenChecks: config.delayBetweenChecks,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'active-inventory-check-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'active_inventory_monitor_scheduled',
    cronExpression: config.cronExpression,
    batchSize: config.batchSize,
    delayBetweenChecks: config.delayBetweenChecks,
  });
}

/**
 * 高頻度在庫監視スケジュールをセットアップ（外部から呼び出し可能）
 */
export async function setupInventoryMonitorSchedule(): Promise<void> {
  const scheduler = inventoryQueue;

  // 既存のリピートジョブを削除
  const repeatableJobs = await scheduler.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'active-inventory-check') {
      await scheduler.removeRepeatableByKey(job.key);
    }
  }

  // 1時間毎のActive商品監視
  await scheduler.add(
    'active-inventory-check',
    {
      type: 'inventory-check',
      target: 'active',
      batchSize: 50,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: '0 * * * *', // 毎時0分
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({ type: 'inventory_monitor_schedule_setup' });
}

/**
 * Active商品の在庫監視を実行（Phase 52）
 * ACTIVE状態のリスティングを持つ商品の在庫をチェックし、
 * 在庫切れの場合は即座に停止してアラートを送信
 */
export async function runActiveInventoryCheck(options?: {
  batchSize?: number;
  delayBetweenChecks?: number;
  marketplace?: 'JOOM' | 'EBAY';
}): Promise<{
  total: number;
  checked: number;
  outOfStock: number;
  priceChanged: number;
  errors: number;
}> {
  const checkLog = logger.child({ module: 'active-inventory-check' });
  const batchSize = options?.batchSize || 50;
  const delayBetweenChecks = options?.delayBetweenChecks || 3000;
  const marketplace = options?.marketplace;

  checkLog.info({
    type: 'active_inventory_check_start',
    batchSize,
    delayBetweenChecks,
    marketplace: marketplace || 'all',
  });

  // Active状態のリスティングを持つ商品を取得
  const whereClause: any = {
    status: 'ACTIVE',
  };

  // マーケットプレイスフィルター（指定がある場合）
  if (marketplace) {
    whereClause.marketplace = marketplace;
  } else {
    // デフォルトはJoomを優先
    whereClause.marketplace = 'JOOM';
  }

  const activeListings = await prisma.listing.findMany({
    where: whereClause,
    include: {
      product: {
        select: {
          id: true,
          sourceUrl: true,
          price: true,
          title: true,
        },
      },
    },
    take: batchSize,
    orderBy: { updatedAt: 'asc' },
  });

  const stats = {
    total: activeListings.length,
    checked: 0,
    outOfStock: 0,
    priceChanged: 0,
    errors: 0,
  };

  if (activeListings.length === 0) {
    checkLog.info({ type: 'active_inventory_check_no_listings' });
    return stats;
  }

  for (const listing of activeListings) {
    try {
      const result = await checkSingleProductInventory(listing.product.id);
      stats.checked++;

      // InventoryLogに記録
      await prisma.inventoryLog.create({
        data: {
          productId: listing.product.id,
          listingId: listing.id,
          price: result.currentPrice || listing.product.price,
          stock: result.isAvailable ? 1 : 0,
          isAvailable: result.isAvailable,
          priceChanged: result.priceChanged,
          stockChanged: !result.isAvailable,
          previousPrice: listing.product.price,
          previousStock: 1,
          sourceUrl: listing.product.sourceUrl,
          metadata: {
            action: result.action,
            hash: result.newHash,
            checkedBy: 'active-inventory-monitor',
          },
        },
      });

      if (!result.isAvailable) {
        stats.outOfStock++;

        // リスティングをPAUSEDに変更（即時停止）
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'PAUSED',
            updatedAt: new Date(),
          },
        });

        checkLog.warn({
          type: 'active_listing_out_of_stock',
          listingId: listing.id,
          productId: listing.product.id,
          title: listing.product.title,
          marketplace: listing.marketplace,
        });
      }

      if (result.priceChanged) {
        stats.priceChanged++;
      }

      // レート制限: 指定された待機時間
      await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));

    } catch (error: any) {
      stats.errors++;
      checkLog.error({
        type: 'active_inventory_check_item_error',
        listingId: listing.id,
        productId: listing.product.id,
        error: error.message,
      });
    }
  }

  checkLog.info({
    type: 'active_inventory_check_complete',
    stats,
  });

  return stats;
}

/**
 * 手動でActive商品の在庫監視をトリガー（Phase 52）
 */
export async function triggerActiveInventoryCheck(options?: {
  batchSize?: number;
  delayBetweenChecks?: number;
  marketplace?: 'JOOM' | 'EBAY';
}): Promise<string> {
  const job = await inventoryQueue.add(
    'active-inventory-check',
    {
      type: 'inventory-check',
      target: 'active',
      batchSize: options?.batchSize || 50,
      delayBetweenChecks: options?.delayBetweenChecks || 3000,
      marketplace: options?.marketplace,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_active_inventory_check_triggered',
    jobId: job.id,
    options,
  });

  return job.id || '';
}

// ========================================
// Phase 4拡張: PAUSED商品の再評価
// ========================================

/**
 * ブランドホワイトリスト
 * これらのブランドは除外キーワードを無視
 */
const BRAND_WHITELIST = [
  'g-shock', 'gshock', 'casio',
  'sony', 'nikon', 'canon',
  'nintendo', 'switch',
  'bose', 'jbl',
];

/**
 * 除外キーワード（危険な商品を除外）
 */
const EXCLUDED_KEYWORDS = [
  // リチウムバッテリー単体は除外
  'リチウムイオン電池', 'lithium ion battery', 'li-ion battery',
  'バッテリーパック', 'battery pack',
  // 武器・危険物
  'ナイフ', 'knife', '刃物', 'blade',
  '武器', 'weapon', '銃', 'gun',
  '火薬', '爆発', 'explosive',
  // 規制品
  '医薬品', 'medicine', '薬',
  '化粧品', 'cosmetic',
  '食品', 'food',
  '液体', 'liquid',
  // 偽物
  '偽', 'fake', 'レプリカ', 'replica',
];

/**
 * Joom出品価格上限（円）
 */
const JOOM_PRICE_LIMIT_JPY = 900000;

/**
 * 商品の安全性を評価（canary-release.tsのロジックを共通化）
 */
function evaluateProductSafety(product: {
  title?: string | null;
  titleEn?: string | null;
  brand?: string | null;
}): boolean {
  const title = (product.titleEn || product.title || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();

  // ブランドホワイトリストチェック
  const isWhitelisted = BRAND_WHITELIST.some(b =>
    title.includes(b) || brand.includes(b)
  );

  // 除外キーワードチェック（ホワイトリスト商品は免除）
  if (!isWhitelisted) {
    for (const keyword of EXCLUDED_KEYWORDS) {
      if (title.includes(keyword.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * PAUSED商品の再評価
 * Phase 4で拡張されたルールに基づき、再出品可能な商品を検出
 */
export async function runPausedReEvaluation(): Promise<{
  total: number;
  reactivated: number;
  stillPaused: number;
}> {
  const revalLog = logger.child({ module: 'paused-reevaluation' });

  revalLog.info({ type: 'reevaluation_start' });

  // PAUSEDリスティングを取得
  const pausedListings = await prisma.listing.findMany({
    where: {
      status: 'PAUSED',
      marketplace: 'JOOM',
    },
    include: {
      product: true,
    },
  });

  const stats = {
    total: pausedListings.length,
    reactivated: 0,
    stillPaused: 0,
  };

  for (const listing of pausedListings) {
    const product = listing.product;

    // 価格チェック（¥900,000以下のみ）
    if (product.price > JOOM_PRICE_LIMIT_JPY) {
      stats.stillPaused++;
      continue;
    }

    // 新しいカテゴリルールで再評価
    const isSafe = evaluateProductSafety(product);

    if (isSafe) {
      // リスティングをACTIVEに戻す
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          status: 'ACTIVE',
          marketplaceData: {
            ...(listing.marketplaceData as object || {}),
            reactivatedAt: new Date().toISOString(),
            reactivatedBy: 'paused-reevaluation-job',
          },
        },
      });

      stats.reactivated++;
      revalLog.info({
        type: 'listing_reactivated',
        listingId: listing.id,
        productTitle: product.titleEn || product.title,
      });
    } else {
      stats.stillPaused++;
    }
  }

  revalLog.info({ type: 'reevaluation_complete', stats });
  return stats;
}

/**
 * PAUSED商品再評価ジョブをスケジュール
 */
async function schedulePausedReEvaluation(config: SchedulerConfig['pausedReEvaluation']) {
  if (!config.enabled) {
    log.info({ type: 'paused_reevaluation_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'paused-reevaluation') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // PAUSED再評価ジョブを追加
  await inventoryQueue.add(
    'paused-reevaluation',
    {
      type: 'paused-reevaluation',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'paused-reevaluation-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'paused_reevaluation_scheduled',
    cronExpression: config.cronExpression,
  });
}

/**
 * 手動でPAUSED商品再評価をトリガー
 */
export async function triggerPausedReEvaluation(): Promise<string> {
  const job = await inventoryQueue.add(
    'paused-reevaluation',
    {
      type: 'paused-reevaluation',
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_paused_reevaluation_triggered',
    jobId: job.id,
  });

  return job.id || '';
}

// ========================================
// Phase 54: 自動価格調整エンジン
// ========================================

/**
 * 価格調整ジョブをスケジュール（Phase 54）
 * 為替レート連動・利益率ベースの自動価格調整
 */
async function schedulePriceAdjustment(config: SchedulerConfig['priceAdjustment']) {
  if (!config.enabled) {
    log.info({ type: 'price_adjustment_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await pricingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'price-adjustment') {
      await pricingQueue.removeRepeatableByKey(job.key);
    }
  }

  // 価格調整ジョブを追加（4時間ごと）
  await pricingQueue.add(
    'price-adjustment',
    {
      type: 'price-adjustment',
      limit: config.limit,
      targetProfitRate: config.targetProfitRate,
      minProfitRate: config.minProfitRate,
      maxPriceChangePercent: config.maxPriceChangePercent,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'price-adjustment-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'price_adjustment_scheduled',
    cronExpression: config.cronExpression,
    limit: config.limit,
    targetProfitRate: config.targetProfitRate,
    minProfitRate: config.minProfitRate,
    maxPriceChangePercent: config.maxPriceChangePercent,
  });
}

/**
 * 手動で価格調整をトリガー（Phase 54）
 */
export async function triggerScheduledPriceAdjustment(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  limit?: number;
  targetProfitRate?: number;
  minProfitRate?: number;
  maxPriceChangePercent?: number;
}): Promise<string> {
  const job = await pricingQueue.add(
    'price-adjustment',
    {
      type: 'price-adjustment',
      marketplace: options?.marketplace,
      limit: options?.limit || 50,
      targetProfitRate: options?.targetProfitRate || 15,
      minProfitRate: options?.minProfitRate || 10,
      maxPriceChangePercent: options?.maxPriceChangePercent || 20,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_price_adjustment_triggered',
    jobId: job.id,
    options,
  });

  return job.id || '';
}

// ========================================
// Phase 16: 顧客メッセージ送信
// ========================================

/**
 * メッセージ送信ジョブをスケジュール（Phase 16）
 */
async function scheduleMessageSending(config: SchedulerConfig['messageSending']) {
  if (!config.enabled) {
    log.info({ type: 'message_sending_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'message-sending') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  // メッセージ送信ジョブを追加（5分ごと）
  await scrapeQueue.add(
    'message-sending',
    {
      type: 'message-sending',
      batchSize: config.batchSize,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'message-sending-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'message_sending_scheduled',
    cronExpression: config.cronExpression,
    batchSize: config.batchSize,
  });
}

// ========================================
// Phase 15: Webhookイベント処理
// ========================================

/**
 * Webhookイベント処理ジョブをスケジュール（Phase 15）
 */
async function scheduleWebhookProcessing(config: SchedulerConfig['webhookProcessing']) {
  if (!config.enabled) {
    log.info({ type: 'webhook_processing_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'webhook-processing') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  // Webhookイベント処理ジョブを追加（毎分）
  await scrapeQueue.add(
    'webhook-processing',
    {
      type: 'webhook-processing',
      batchSize: config.batchSize,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'webhook-processing-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'webhook_processing_scheduled',
    cronExpression: config.cronExpression,
    batchSize: config.batchSize,
  });
}

// ========================================
// Phase 17: 在庫アラート・自動再開処理
// ========================================

/**
 * 在庫アラート・自動再開処理ジョブをスケジュール（Phase 17）
 * - 在庫切れで一時停止したリスティングの自動再開
 * - resumeAt時刻を過ぎたリスティングの再アクティベーション
 */
async function scheduleInventoryAlertProcessing(config: SchedulerConfig['inventoryAlertProcessing']) {
  if (!config.enabled) {
    log.info({ type: 'inventory_alert_processing_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await inventoryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'inventory-alert-processing') {
      await inventoryQueue.removeRepeatableByKey(job.key);
    }
  }

  // 在庫アラート処理ジョブを追加（10分ごと）
  await inventoryQueue.add(
    'inventory-alert-processing',
    {
      type: 'inventory-alert-processing',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'inventory-alert-processing-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'inventory_alert_processing_scheduled',
    cronExpression: config.cronExpression,
  });
}

// ========================================
// Phase 18: 売上サマリー計算
// ========================================

/**
 * 売上サマリー計算ジョブをスケジュール（Phase 18）
 * - 日次サマリー: 毎日1時に前日分を計算
 * - 週次サマリー: 毎週月曜2時に前週分を計算
 */
async function scheduleSalesSummaryCalculation(config: SchedulerConfig['salesSummaryCalculation']) {
  if (!config.enabled) {
    log.info({ type: 'sales_summary_calculation_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'sales-summary-daily' || job.name === 'sales-summary-weekly') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  // 日次サマリー計算ジョブ（毎日1時）
  await scrapeQueue.add(
    'sales-summary-daily',
    {
      type: 'sales-summary-calculation',
      periodType: 'DAILY',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.dailyCron,
      },
      jobId: 'sales-summary-daily-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  // 週次サマリー計算ジョブ（毎週月曜2時）
  await scrapeQueue.add(
    'sales-summary-weekly',
    {
      type: 'sales-summary-calculation',
      periodType: 'WEEKLY',
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.weeklyCron,
      },
      jobId: 'sales-summary-weekly-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'sales_summary_calculation_scheduled',
    dailyCron: config.dailyCron,
    weeklyCron: config.weeklyCron,
  });
}

/**
 * 発送期限チェックをスケジュール（Phase 51-52）
 */
async function scheduleShipmentDeadlineCheck(config: SchedulerConfig['shipmentDeadlineCheck']) {
  if (!config.enabled) {
    log.info({ type: 'shipment_deadline_check_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await orderQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'deadline-check') {
      await orderQueue.removeRepeatableByKey(job.key);
    }
  }

  // 発送期限チェックジョブ
  await orderQueue.add(
    'deadline-check',
    {
      type: 'deadline-check',
      urgentHours: config.urgentHours,
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'shipment-deadline-check-scheduled',
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  log.info({
    type: 'shipment_deadline_check_scheduled',
    cronExpression: config.cronExpression,
    urgentHours: config.urgentHours,
  });
}

/**
 * 手動でメッセージ送信をトリガー（Phase 16）
 */
export async function triggerMessageSending(batchSize?: number): Promise<string> {
  const job = await scrapeQueue.add(
    'message-sending',
    {
      type: 'message-sending',
      batchSize: batchSize || 10,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_message_sending_triggered',
    jobId: job.id,
    batchSize,
  });

  return job.id || '';
}

/**
 * 手動でWebhook処理をトリガー（Phase 15）
 */
export async function triggerWebhookProcessing(batchSize?: number): Promise<string> {
  const job = await scrapeQueue.add(
    'webhook-processing',
    {
      type: 'webhook-processing',
      batchSize: batchSize || 20,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_webhook_processing_triggered',
    jobId: job.id,
    batchSize,
  });

  return job.id || '';
}

/**
 * 手動で在庫アラート処理をトリガー（Phase 17）
 */
export async function triggerInventoryAlertProcessing(): Promise<string> {
  const job = await inventoryQueue.add(
    'inventory-alert-processing',
    {
      type: 'inventory-alert-processing',
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_inventory_alert_processing_triggered',
    jobId: job.id,
  });

  return job.id || '';
}

/**
 * 手動で売上サマリー計算をトリガー（Phase 18）
 */
export async function triggerSalesSummaryCalculation(
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY',
  marketplace?: 'JOOM' | 'EBAY'
): Promise<string> {
  const job = await scrapeQueue.add(
    `sales-summary-${periodType.toLowerCase()}`,
    {
      type: 'sales-summary-calculation',
      periodType,
      marketplace,
      triggeredAt: new Date().toISOString(),
      manual: true,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_sales_summary_calculation_triggered',
    jobId: job.id,
    periodType,
    marketplace,
  });

  return job.id || '';
}

// レポートキュー追加
const reportQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection: redis });

/**
 * スケジュールされたレポートを実行（Phase 65）
 */
export async function runScheduledReports(): Promise<{ processed: number; errors: number }> {
  log.info({ type: 'scheduled_reports_start' }, 'Starting scheduled report execution');

  const now = new Date();
  let processed = 0;
  let errors = 0;

  try {
    // 実行予定時刻を過ぎたアクティブなスケジュールを取得
    const dueSchedules = await prisma.reportScheduleConfig.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        template: true,
      },
    });

    log.info({ count: dueSchedules.length }, 'Found due report schedules');

    for (const schedule of dueSchedules) {
      try {
        // レポートレコードを作成
        const report = await prisma.report.create({
          data: {
            name: `${schedule.name} - ${now.toLocaleDateString('ja-JP')}`,
            description: schedule.description || undefined,
            reportType: schedule.template?.reportType || 'CUSTOM',
            templateId: schedule.templateId,
            parameters: schedule.parameters as any,
            format: schedule.format,
            status: 'PENDING',
          },
        });

        // ジョブをキューに追加
        await reportQueue.add(
          'generate-report',
          {
            reportId: report.id,
            scheduleId: schedule.id,
          },
          {
            priority: 2,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 30000,
            },
          }
        );

        // 次回実行時刻を計算して更新
        const { CronExpressionParser } = await import('cron-parser');
        try {
          const interval = CronExpressionParser.parse(schedule.cronExpression, {
            currentDate: now,
          });
          const nextRun = interval.next().toDate();

          await prisma.reportScheduleConfig.update({
            where: { id: schedule.id },
            data: { nextRunAt: nextRun },
          });
        } catch (cronError) {
          log.warn(
            { scheduleId: schedule.id, cronExpression: schedule.cronExpression },
            'Failed to parse cron expression'
          );
        }

        processed++;
        log.info(
          { scheduleId: schedule.id, reportId: report.id, scheduleName: schedule.name },
          'Scheduled report queued'
        );
      } catch (scheduleError) {
        errors++;
        log.error(
          { scheduleId: schedule.id, error: scheduleError },
          'Failed to queue scheduled report'
        );
      }
    }

    log.info({ processed, errors }, 'Scheduled reports execution completed');
    return { processed, errors };
  } catch (error) {
    log.error({ error }, 'Failed to run scheduled reports');
    throw error;
  }
}

/**
 * 手動でレポート生成をトリガー（Phase 65）
 */
export async function triggerReportGeneration(reportId: string): Promise<string> {
  const job = await reportQueue.add(
    'generate-report',
    {
      reportId,
      manual: true,
    },
    {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
    }
  );

  log.info({
    type: 'manual_report_generation_triggered',
    jobId: job.id,
    reportId,
  });

  return job.id || '';
}

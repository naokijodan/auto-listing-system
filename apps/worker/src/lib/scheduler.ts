import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';

const log = logger.child({ module: 'scheduler' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });
const pricingQueue = new Queue(QUEUE_NAMES.PRICING, { connection: redis });
const competitorQueue = new Queue(QUEUE_NAMES.COMPETITOR, { connection: redis });

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
  // 日次レポート
  dailyReport: {
    enabled: boolean;
    cronExpression: string;
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
    cronExpression: '0 21 * * *', // 毎日21時
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
    healthCheck: { ...DEFAULT_CONFIG.healthCheck, ...config.healthCheck },
    pricingOptimization: { ...DEFAULT_CONFIG.pricingOptimization, ...config.pricingOptimization },
    competitorMonitoring: { ...DEFAULT_CONFIG.competitorMonitoring, ...config.competitorMonitoring },
    orderSync: { ...DEFAULT_CONFIG.orderSync, ...config.orderSync },
    inventorySync: { ...DEFAULT_CONFIG.inventorySync, ...config.inventorySync },
  };

  log.info({ type: 'scheduler_initializing', config: finalConfig });

  await scheduleInventoryChecks(finalConfig.inventoryCheck);
  await scheduleExchangeRateUpdate(finalConfig.exchangeRate);
  await schedulePriceSync(finalConfig.priceSync);
  await scheduleDailyReport(finalConfig.dailyReport);
  await scheduleHealthCheck(finalConfig.healthCheck);
  await schedulePricingOptimization(finalConfig.pricingOptimization);
  await scheduleCompetitorMonitoring(finalConfig.competitorMonitoring);
  await scheduleOrderSync(finalConfig.orderSync);
  await scheduleInventorySync(finalConfig.inventorySync);

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

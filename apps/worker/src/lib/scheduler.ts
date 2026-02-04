import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@als/logger';
import { QUEUE_NAMES } from '@als/config';

const log = logger.child({ module: 'scheduler' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });

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
 */
async function schedulePriceSync(config: SchedulerConfig['priceSync']) {
  if (!config.enabled) {
    log.info({ type: 'price_sync_disabled' });
    return;
  }

  // 既存のリピートジョブを削除
  const repeatableJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'sync-prices') {
      await scrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await scrapeQueue.add(
    'sync-prices',
    {
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: config.cronExpression,
      },
      jobId: 'price-sync',
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
  };

  log.info({ type: 'scheduler_initializing', config: finalConfig });

  await scheduleInventoryChecks(finalConfig.inventoryCheck);
  await scheduleExchangeRateUpdate(finalConfig.exchangeRate);
  await schedulePriceSync(finalConfig.priceSync);
  await scheduleDailyReport(finalConfig.dailyReport);
  await scheduleHealthCheck(finalConfig.healthCheck);

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
 */
export async function triggerPriceSync(listingIds?: string[]) {
  const job = await scrapeQueue.add(
    'manual-price-sync',
    {
      triggeredAt: new Date().toISOString(),
      listingIds,
    },
    {
      priority: 1,
    }
  );

  log.info({
    type: 'manual_price_sync_triggered',
    jobId: job.id,
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

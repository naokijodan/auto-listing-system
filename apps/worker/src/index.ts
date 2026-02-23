import 'dotenv/config';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';

import { createConnection, closeConnection } from './lib/redis';
import { startWorkers, stopWorkers } from './lib/worker-manager';
import { setupGracefulShutdown } from './lib/graceful-shutdown';
import { initializeScheduler } from './lib/scheduler';
import { eventBus } from './lib/event-bus';

async function main() {
  logger.info('🚀 Starting worker process...');

  try {
    // DB接続確認
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Redis接続
    const connection = createConnection();
    await connection.ping();
    logger.info('✅ Redis connected');

    // EventBus初期化（Phase 27: リアルタイムイベント）
    await eventBus.initialize();
    logger.info('✅ EventBus initialized');

    // ワーカー起動
    await startWorkers(connection);
    logger.info('✅ Workers started');

    // 環境変数からスケジューラー設定を読み込み
    const schedulerConfig = {
      inventoryCheck: {
        enabled: process.env.INVENTORY_CHECK_ENABLED !== 'false',
        timesPerDay: parseInt(process.env.INVENTORY_CHECK_TIMES_PER_DAY || '3', 10),
        startHour: 9, // JST 9:00開始 (UTC 0:00)
      },
      exchangeRate: {
        enabled: true,
        cronExpression: '0 0 * * *', // 毎日0時
      },
      priceSync: {
        enabled: process.env.PRICE_SYNC_ENABLED !== 'false',
        cronExpression: process.env.PRICE_SYNC_CRON || '0 */6 * * *',
      },
      orderSync: {
        enabled: process.env.ORDER_SYNC_ENABLED !== 'false',
        cronExpression: process.env.ORDER_SYNC_CRON || '0 */4 * * *',
        sinceDays: 7,
        maxOrders: 100,
      },
      inventorySync: {
        enabled: process.env.INVENTORY_SYNC_ENABLED !== 'false',
        cronExpression: process.env.INVENTORY_SYNC_CRON || '30 */6 * * *',
        maxListings: 100,
      },
      tokenRefresh: {
        enabled: process.env.TOKEN_REFRESH_ENABLED !== 'false',
        cronExpression: process.env.TOKEN_REFRESH_CRON || '0 * * * *',
        refreshBeforeExpiry: 3600000,
        warnBeforeExpiry: 86400000,
      },
      autoPublish: {
        enabled: process.env.AUTO_PUBLISH_ENABLED !== 'false',
        cronExpression: process.env.AUTO_PUBLISH_CRON || '0 * * * *',
        maxListingsPerRun: parseInt(process.env.AUTO_PUBLISH_MAX_PER_RUN || '20', 10),
        marketplace: (process.env.AUTO_PUBLISH_MARKETPLACE as 'joom' | 'ebay' | 'etsy' | 'shopify' | 'all') || 'all',
      },
      activeInventoryMonitor: {
        enabled: process.env.ACTIVE_INVENTORY_MONITOR_ENABLED !== 'false',
        cronExpression: process.env.ACTIVE_INVENTORY_MONITOR_CRON || '0 * * * *',
        batchSize: parseInt(process.env.ACTIVE_INVENTORY_MONITOR_BATCH_SIZE || '50', 10),
        delayBetweenChecks: parseInt(process.env.ACTIVE_INVENTORY_MONITOR_DELAY || '3000', 10),
      },
      salesReport: {
        enabled: process.env.SALES_REPORT_ENABLED !== 'false',
        dailyCron: process.env.SALES_REPORT_DAILY_CRON || '0 23 * * *',
        weeklyCron: process.env.SALES_REPORT_WEEKLY_CRON || '0 9 * * 1',
        saveToDb: process.env.SALES_REPORT_SAVE_TO_DB !== 'false',
        exportCsv: process.env.SALES_REPORT_EXPORT_CSV === 'true',
        csvDir: process.env.SALES_REPORT_CSV_DIR || '/tmp/reports',
      },
    };

    // スケジューラー初期化
    await initializeScheduler(schedulerConfig);
    logger.info('✅ Scheduler initialized');

    // Graceful Shutdown設定
    setupGracefulShutdown(async () => {
      logger.info('Stopping workers...');
      await stopWorkers();
      await eventBus.close();
      await closeConnection();
      await prisma.$disconnect();
      logger.info('✅ Cleanup completed');
    });

    logger.info('🎉 Worker process ready');
    logger.info('📅 Scheduled jobs:');
    logger.info(`   - Inventory check: ${schedulerConfig.inventoryCheck.enabled ? `${schedulerConfig.inventoryCheck.timesPerDay}x/day` : 'DISABLED'}`);
    logger.info('   - Exchange rate update: daily at 00:00');
    logger.info(`   - Price sync: ${schedulerConfig.priceSync.enabled ? schedulerConfig.priceSync.cronExpression : 'DISABLED'}`);
    logger.info(`   - Order sync: ${schedulerConfig.orderSync.enabled ? schedulerConfig.orderSync.cronExpression : 'DISABLED'}`);
    logger.info(`   - Inventory sync: ${schedulerConfig.inventorySync.enabled ? schedulerConfig.inventorySync.cronExpression : 'DISABLED'}`);
    logger.info(`   - Token refresh: ${schedulerConfig.tokenRefresh.enabled ? schedulerConfig.tokenRefresh.cronExpression : 'DISABLED'}`);
    logger.info(`   - Auto publish: ${schedulerConfig.autoPublish.enabled ? `${schedulerConfig.autoPublish.cronExpression} (max ${schedulerConfig.autoPublish.maxListingsPerRun}/run, ${schedulerConfig.autoPublish.marketplace})` : 'DISABLED'}`);
    logger.info(`   - Active inventory monitor: ${schedulerConfig.activeInventoryMonitor.enabled ? `${schedulerConfig.activeInventoryMonitor.cronExpression} (batch ${schedulerConfig.activeInventoryMonitor.batchSize})` : 'DISABLED'}`);
    logger.info(`   - Sales report (daily): ${schedulerConfig.salesReport.enabled ? schedulerConfig.salesReport.dailyCron : 'DISABLED'}`);
    logger.info(`   - Sales report (weekly): ${schedulerConfig.salesReport.enabled ? schedulerConfig.salesReport.weeklyCron : 'DISABLED'}`);
  } catch (error) {
    logger.error('Failed to start worker process', error);
    process.exit(1);
  }
}

main();

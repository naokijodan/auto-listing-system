import 'dotenv/config';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';

import { createConnection, closeConnection } from './lib/redis';
import { startWorkers, stopWorkers } from './lib/worker-manager';
import { setupGracefulShutdown } from './lib/graceful-shutdown';
import { initializeScheduler } from './lib/scheduler';

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

    // ワーカー起動
    await startWorkers(connection);
    logger.info('✅ Workers started');

    // スケジューラー初期化
    await initializeScheduler({
      inventoryCheck: {
        enabled: true,
        timesPerDay: 3,
        startHour: 9, // JST 9:00開始 (UTC 0:00)
      },
      exchangeRate: {
        enabled: true,
        cronExpression: '0 0 * * *', // 毎日0時
      },
      priceSync: {
        enabled: true,
        cronExpression: '0 */6 * * *', // 6時間ごと
      },
    });
    logger.info('✅ Scheduler initialized');

    // Graceful Shutdown設定
    setupGracefulShutdown(async () => {
      logger.info('Stopping workers...');
      await stopWorkers();
      await closeConnection();
      await prisma.$disconnect();
      logger.info('✅ Cleanup completed');
    });

    logger.info('🎉 Worker process ready');
    logger.info('📅 Scheduled jobs:');
    logger.info('   - Inventory check: 3x/day (9:00, 17:00, 01:00 JST)');
    logger.info('   - Exchange rate update: daily at 00:00');
    logger.info('   - Price sync: every 6 hours');
  } catch (error) {
    logger.error('Failed to start worker process', error);
    process.exit(1);
  }
}

main();

import 'dotenv/config';
import { logger } from '@als/logger';
import { prisma } from '@als/database';

import { createConnection, closeConnection } from './lib/redis';
import { startWorkers, stopWorkers } from './lib/worker-manager';
import { setupGracefulShutdown } from './lib/graceful-shutdown';

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

    // Graceful Shutdown設定
    setupGracefulShutdown(async () => {
      logger.info('Stopping workers...');
      await stopWorkers();
      await closeConnection();
      await prisma.$disconnect();
      logger.info('✅ Cleanup completed');
    });

    logger.info('🎉 Worker process ready');
  } catch (error) {
    logger.error('Failed to start worker process', error);
    process.exit(1);
  }
}

main();

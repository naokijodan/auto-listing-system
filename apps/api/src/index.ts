import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { logger } from '@als/logger';
import { QUEUE_NAMES } from '@als/config';
import { prisma } from '@als/database';

import { productsRouter } from './routes/products';
import { listingsRouter } from './routes/listings';
import { jobsRouter } from './routes/jobs';
import { healthRouter } from './routes/health';
import { adminRouter } from './routes/admin';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = express();
const PORT = process.env.API_PORT || 3000;
const BULL_BOARD_PORT = process.env.BULL_BOARD_PORT || 3001;

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// BullMQキュー
const queues = Object.values(QUEUE_NAMES).map(
  (name) => new Queue(name, { connection: redis })
);

// Bull Board セットアップ
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(q) as any),
  serverAdapter,
});

// ミドルウェア
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// ルート
app.use('/api/health', healthRouter);
app.use('/api/products', productsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/admin', adminRouter);

// Bull Board（管理UI）
app.use('/admin/queues', serverAdapter.getRouter());

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
async function start() {
  try {
    // DB接続確認
    await prisma.$connect();
    logger.info('Database connected');

    // Redis接続確認
    await redis.ping();
    logger.info('Redis connected');

    // APIサーバー起動
    app.listen(PORT, () => {
      logger.info(`API server running on http://localhost:${PORT}`);
      logger.info(`Bull Board running on http://localhost:${PORT}/admin/queues`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();

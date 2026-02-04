import IORedis from 'ioredis';
import { logger } from '@als/logger';

let connection: IORedis | null = null;

/**
 * Redis接続を作成
 */
export function createConnection(): IORedis {
  if (connection) return connection;

  connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection retry in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  connection.on('error', (err) => {
    logger.error('Redis connection error', err);
  });

  connection.on('connect', () => {
    logger.debug('Redis connected');
  });

  connection.on('ready', () => {
    logger.debug('Redis ready');
  });

  return connection;
}

/**
 * Redis接続を取得
 */
export function getConnection(): IORedis {
  if (!connection) {
    throw new Error('Redis connection not initialized');
  }
  return connection;
}

/**
 * Redis接続を閉じる
 */
export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

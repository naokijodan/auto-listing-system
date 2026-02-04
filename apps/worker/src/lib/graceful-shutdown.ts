import { logger } from '@als/logger';

type ShutdownHandler = () => Promise<void>;

let isShuttingDown = false;
let shutdownHandler: ShutdownHandler | null = null;

/**
 * Graceful Shutdownをセットアップ
 */
export function setupGracefulShutdown(handler: ShutdownHandler): void {
  shutdownHandler = handler;

  // SIGTERM: Kubernetesなどからの終了シグナル
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // SIGINT: Ctrl+C
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // 未処理のPromise rejection
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
  });

  // 未キャッチの例外
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    handleShutdown('uncaughtException');
  });
}

/**
 * シャットダウン処理
 */
async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // タイムアウト設定（30秒）
  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    if (shutdownHandler) {
      await shutdownHandler();
    }

    clearTimeout(timeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

/**
 * シャットダウン中かどうか
 */
export function isShuttingDownNow(): boolean {
  return isShuttingDown;
}

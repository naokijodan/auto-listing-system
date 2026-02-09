import * as Sentry from '@sentry/node';
import { logger } from './index';

/**
 * Sentry設定オプション
 */
interface SentryOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

/**
 * Sentry初期化状態
 */
let isInitialized = false;

/**
 * Sentryを初期化
 * DSNが設定されている場合のみ有効化
 */
export function initSentry(options: SentryOptions = {}): boolean {
  const dsn = options.dsn || process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info('Sentry DSN not configured, skipping initialization');
    return false;
  }

  if (isInitialized) {
    logger.warn('Sentry already initialized');
    return true;
  }

  try {
    Sentry.init({
      dsn,
      environment: options.environment || process.env.NODE_ENV || 'development',
      release: options.release || process.env.APP_VERSION || '1.0.0',
      sampleRate: options.sampleRate ?? 1.0,
      tracesSampleRate: options.tracesSampleRate ?? 0.1,

      // BullMQジョブ処理のトランザクション名を改善
      beforeSendTransaction: (event) => {
        if (event.transaction?.startsWith('bullmq:')) {
          event.transaction = event.transaction.replace('bullmq:', 'job:');
        }
        return event;
      },

      // エラー送信前のフィルタリング
      beforeSend: (event, hint) => {
        // 開発環境ではSentryに送信しない
        if (process.env.NODE_ENV === 'development') {
          logger.debug({ type: 'sentry_skipped_dev', error: hint?.originalException });
          return null;
        }

        // 一時的なネットワークエラーは無視
        const error = hint?.originalException;
        if (error instanceof Error) {
          const ignoredMessages = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'socket hang up',
          ];

          if (ignoredMessages.some((msg) => error.message.includes(msg))) {
            logger.debug({ type: 'sentry_filtered', error: error.message });
            return null;
          }
        }

        return event;
      },

      // 機密情報のマスク
      integrations: [
        Sentry.extraErrorDataIntegration({ depth: 5 }),
      ],
    });

    isInitialized = true;
    logger.info({ type: 'sentry_initialized', environment: options.environment || process.env.NODE_ENV });
    return true;
  } catch (error) {
    logger.error({ type: 'sentry_init_error', error });
    return false;
  }
}

/**
 * エラーをSentryに送信
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    logger.debug({ type: 'sentry_not_initialized', error });
    return undefined;
  }

  try {
    const eventId = Sentry.captureException(error, {
      extra: context,
    });

    logger.debug({
      type: 'sentry_exception_captured',
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });

    return eventId;
  } catch (captureError) {
    logger.error({ type: 'sentry_capture_error', error: captureError });
    return undefined;
  }
}

/**
 * メッセージをSentryに送信
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  try {
    const eventId = Sentry.captureMessage(message, {
      level,
      extra: context,
    });

    return eventId;
  } catch (error) {
    logger.error({ type: 'sentry_capture_message_error', error });
    return undefined;
  }
}

/**
 * BullMQジョブ失敗時のSentry通知
 * リトライ上限超過（DLQ行き）時のみ通知
 */
export function captureJobFailure(
  jobId: string,
  jobName: string,
  queueName: string,
  error: Error,
  attemptsMade: number,
  maxAttempts: number,
  jobData?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  // リトライ上限超過時のみ通知
  if (attemptsMade < maxAttempts) {
    logger.debug({
      type: 'sentry_job_failure_skipped',
      jobId,
      attemptsMade,
      maxAttempts,
      reason: 'will_retry',
    });
    return undefined;
  }

  return Sentry.withScope((scope) => {
    scope.setTag('queue', queueName);
    scope.setTag('job_name', jobName);
    scope.setTag('job_id', jobId);
    scope.setLevel('error');

    scope.setContext('job', {
      id: jobId,
      name: jobName,
      queue: queueName,
      attemptsMade,
      maxAttempts,
      data: sanitizeJobData(jobData),
    });

    const eventId = Sentry.captureException(error);

    logger.info({
      type: 'sentry_job_failure_captured',
      eventId,
      jobId,
      jobName,
      queueName,
      error: error.message,
    });

    return eventId;
  });
}

/**
 * ジョブデータから機密情報を除去
 */
function sanitizeJobData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'authorization',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeJobData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sentryフラッシュ（シャットダウン時に呼び出し）
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!isInitialized) {
    return true;
  }

  try {
    return await Sentry.close(timeout);
  } catch (error) {
    logger.error({ type: 'sentry_flush_error', error });
    return false;
  }
}

/**
 * Sentryが初期化済みかどうか
 */
export function isSentryInitialized(): boolean {
  return isInitialized;
}

export { Sentry };

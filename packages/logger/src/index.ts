import pino from 'pino';

/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ロガー設定オプション
 */
interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  redact?: string[];
}

/**
 * シークレットをマスクするパス一覧
 */
const DEFAULT_REDACT_PATHS = [
  'PROXY_PASS',
  'S3_SECRET_KEY',
  'OPENAI_API_KEY',
  'EBAY_CLIENT_SECRET',
  'JOOM_API_KEY',
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  '*.password',
  '*.secret',
  '*.token',
  '*.apiKey',
  '*.api_key',
];

/**
 * Pinoロガーを作成
 */
export function createLogger(options: LoggerOptions = {}) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return pino({
    name: options.name || 'rakuda',
    level: options.level || process.env.LOG_LEVEL || 'info',

    // シークレットのマスク
    redact: {
      paths: [...DEFAULT_REDACT_PATHS, ...(options.redact || [])],
      censor: '[REDACTED]',
    },

    // タイムスタンプフォーマット
    timestamp: pino.stdTimeFunctions.isoTime,

    // 開発環境ではpino-prettyで見やすく
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

    // 本番環境ではJSON形式
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

/**
 * デフォルトロガー
 */
export const logger = createLogger();

/**
 * 子ロガーを作成（コンテキスト付き）
 */
export function createChildLogger(
  context: Record<string, unknown>,
  options?: LoggerOptions
) {
  const baseLogger = options ? createLogger(options) : logger;
  return baseLogger.child(context);
}

/**
 * ジョブ用ロガーを作成
 */
export function createJobLogger(jobId: string, queueName: string) {
  return logger.child({
    jobId,
    queueName,
  });
}

/**
 * リクエスト用ロガーを作成
 */
export function createRequestLogger(requestId: string, path: string) {
  return logger.child({
    requestId,
    path,
  });
}

export default logger;

// Log Aggregator exports
export {
  LogAggregator,
  getLogAggregator,
  createPinoTransport,
  type LogEntry,
  type LogSearchOptions,
  type LogSearchResult,
  type LogStats,
  type LogRotationConfig,
} from './log-aggregator';

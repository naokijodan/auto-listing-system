import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'api-utils' });

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ミリ秒
  maxDelay: number; // ミリ秒
  backoffMultiplier: number;
  retryableStatuses: number[];
}

/**
 * デフォルトリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * レート制限トラッカー
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * レート制限をチェックし、必要なら待機
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // 古いリクエストを削除
    this.requestTimes = this.requestTimes.filter(
      (time) => now - time < this.windowMs
    );

    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        log.debug({
          type: 'rate_limit_wait',
          waitMs: waitTime,
        });
        await sleep(waitTime);
      }
    }

    this.requestTimes.push(Date.now());
  }

  /**
   * リセット
   */
  reset(): void {
    this.requestTimes = [];
  }
}

/**
 * スリープ
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフでリトライ
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = finalConfig.initialDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // リトライ可能かチェック
      const isRetryable = isRetryableError(error, finalConfig.retryableStatuses);

      if (!isRetryable || attempt >= finalConfig.maxRetries) {
        log.error({
          type: 'retry_exhausted',
          attempt,
          maxRetries: finalConfig.maxRetries,
          error: error.message,
        });
        throw error;
      }

      log.warn({
        type: 'retry_attempt',
        attempt: attempt + 1,
        maxRetries: finalConfig.maxRetries,
        delay,
        error: error.message,
      });

      await sleep(delay);
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  throw lastError;
}

/**
 * リトライ可能なエラーかどうか判定
 */
function isRetryableError(error: any, retryableStatuses: number[]): boolean {
  // ネットワークエラー
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // HTTPステータスコード
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }

  // fetch APIのレスポンス
  if (error.response?.status && retryableStatuses.includes(error.response.status)) {
    return true;
  }

  return false;
}

/**
 * APIエラー
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT');
  }
}

/**
 * レスポンスからエラーを作成
 */
export async function createApiError(response: Response): Promise<ApiError> {
  let details: any;

  try {
    details = await response.json();
  } catch {
    details = await response.text();
  }

  const message = details?.errors?.[0]?.message || details?.message || response.statusText;
  const code = details?.errors?.[0]?.errorId || details?.code;

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    return new RateLimitError(message, retryAfter ? parseInt(retryAfter) : undefined);
  }

  return new ApiError(message, response.status, code, details);
}

/**
 * 安全なfetch（タイムアウト付き）
 */
export async function safeFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * APIリクエストをレート制限とリトライ付きで実行
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  rateLimiter?: RateLimiter,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return withRetry(async () => {
    if (rateLimiter) {
      await rateLimiter.acquire();
    }

    const response = await safeFetch(url, options);

    if (!response.ok) {
      throw await createApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }, retryConfig);
}

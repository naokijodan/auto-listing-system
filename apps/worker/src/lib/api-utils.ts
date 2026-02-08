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
  jitter: boolean; // ジッター追加（サンダリングハード回避）
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
  jitter: true,
};

// ========================================
// サーキットブレーカー
// ========================================

/**
 * サーキットブレーカーの状態
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * サーキットブレーカー設定
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;     // オープンになるまでの失敗回数
  successThreshold: number;     // クローズに戻るまでの成功回数
  timeout: number;              // オープン状態のタイムアウト（ミリ秒）
  resetTimeout: number;         // 失敗カウントリセットまでの時間（ミリ秒）
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,        // 1分
  resetTimeout: 300000,  // 5分
};

/**
 * サーキットブレーカー実装（Phase 45）
 * 連続失敗時にリクエストを一時的にブロックしてシステムを保護
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private openTime?: Date;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  /**
   * 現在の状態を取得
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  /**
   * サーキットが開いているか（リクエストをブロックすべきか）
   */
  isOpen(): boolean {
    this.checkStateTransition();
    return this.state === 'OPEN';
  }

  /**
   * 関数を実行（サーキットブレーカー付き）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkStateTransition();

    if (this.state === 'OPEN') {
      log.warn({
        type: 'circuit_breaker_blocked',
        name: this.name,
        failureCount: this.failureCount,
      });
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for ${this.name}. Try again later.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功時の処理
   */
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        log.info({
          type: 'circuit_breaker_closed',
          name: this.name,
        });
      }
    } else if (this.state === 'CLOSED') {
      // 成功したら失敗カウントをリセット
      this.failureCount = 0;
    }
  }

  /**
   * 失敗時の処理
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      // HALF_OPENで失敗したら即座にOPENに戻る
      this.state = 'OPEN';
      this.openTime = new Date();
      this.successCount = 0;
      log.warn({
        type: 'circuit_breaker_reopened',
        name: this.name,
        failureCount: this.failureCount,
      });
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.openTime = new Date();
      log.warn({
        type: 'circuit_breaker_opened',
        name: this.name,
        failureCount: this.failureCount,
        timeout: this.config.timeout,
      });
    }
  }

  /**
   * 状態遷移のチェック
   */
  private checkStateTransition(): void {
    const now = Date.now();

    // OPEN -> HALF_OPEN: タイムアウト経過後
    if (this.state === 'OPEN' && this.openTime) {
      if (now - this.openTime.getTime() >= this.config.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        log.info({
          type: 'circuit_breaker_half_open',
          name: this.name,
        });
      }
    }

    // CLOSED: 長時間成功が続いたら失敗カウントをリセット
    if (this.state === 'CLOSED' && this.lastFailureTime) {
      if (now - this.lastFailureTime.getTime() >= this.config.resetTimeout) {
        this.failureCount = 0;
        this.lastFailureTime = undefined;
      }
    }
  }

  /**
   * 手動リセット
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.openTime = undefined;
    log.info({
      type: 'circuit_breaker_reset',
      name: this.name,
    });
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    name: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    openTime?: Date;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      openTime: this.openTime,
    };
  }
}

/**
 * サーキットブレーカーエラー
 */
export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// グローバルサーキットブレーカーインスタンス
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * サーキットブレーカーを取得または作成
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, config));
  }
  return circuitBreakers.get(name)!;
}

/**
 * 全サーキットブレーカーの統計を取得
 */
export function getAllCircuitBreakerStats(): Array<{
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
}> {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
}

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
 * ジッター付きの遅延を計算
 * 指数バックオフ + 乱数でサンダリングハード問題を回避
 */
function calculateDelayWithJitter(
  baseDelay: number,
  maxDelay: number,
  jitter: boolean
): number {
  if (!jitter) {
    return Math.min(baseDelay, maxDelay);
  }

  // フルジッター: 0 から baseDelay の間でランダム
  const jitteredDelay = Math.random() * baseDelay;
  return Math.min(jitteredDelay, maxDelay);
}

/**
 * 指数バックオフでリトライ（ジッター対応）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let baseDelay = finalConfig.initialDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // サーキットブレーカーエラーはリトライしない
      if (error instanceof CircuitBreakerError) {
        throw error;
      }

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

      // ジッター付き遅延を計算
      const delay = calculateDelayWithJitter(
        baseDelay,
        finalConfig.maxDelay,
        finalConfig.jitter
      );

      log.warn({
        type: 'retry_attempt',
        attempt: attempt + 1,
        maxRetries: finalConfig.maxRetries,
        baseDelay,
        actualDelay: Math.round(delay),
        jitter: finalConfig.jitter,
        error: error.message,
      });

      await sleep(delay);
      baseDelay = Math.min(baseDelay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  throw lastError;
}

/**
 * サーキットブレーカー付きリトライ
 */
export async function withRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreakerName: string,
  retryConfig?: Partial<RetryConfig>,
  circuitConfig?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const circuitBreaker = getCircuitBreaker(circuitBreakerName, circuitConfig);

  return circuitBreaker.execute(() => withRetry(fn, retryConfig));
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

/**
 * サーキットブレーカー付きAPIリクエスト
 */
export async function apiRequestWithCircuitBreaker<T>(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  circuitBreakerName: string,
  rateLimiter?: RateLimiter,
  retryConfig?: Partial<RetryConfig>,
  circuitConfig?: Partial<CircuitBreakerConfig>
): Promise<T> {
  return withRetryAndCircuitBreaker(
    async () => {
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
    },
    circuitBreakerName,
    retryConfig,
    circuitConfig
  );
}

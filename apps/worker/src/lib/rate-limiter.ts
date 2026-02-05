import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'rate-limiter' });

export interface RateLimitConfig {
  domain: string;
  requestsPerWindow: number;
  windowMs: number;
  minDelayMs: number;
}

// デフォルトのレート制限設定
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'mercari.com': {
    domain: 'mercari.com',
    requestsPerWindow: 10,
    windowMs: 60000, // 1分
    minDelayMs: 5000, // 5秒間隔
  },
  'yahoo.co.jp': {
    domain: 'yahoo.co.jp',
    requestsPerWindow: 15,
    windowMs: 60000,
    minDelayMs: 3000,
  },
  'ebay.com': {
    domain: 'ebay.com',
    requestsPerWindow: 20,
    windowMs: 60000,
    minDelayMs: 2000,
  },
  'rakuten.co.jp': {
    domain: 'rakuten.co.jp',
    requestsPerWindow: 12,
    windowMs: 60000,
    minDelayMs: 4000,
  },
  default: {
    domain: 'default',
    requestsPerWindow: 10,
    windowMs: 60000,
    minDelayMs: 3000,
  },
};

export class RateLimiter {
  private redis: IORedis;
  private configs: Map<string, RateLimitConfig>;
  private lastRequestTime: Map<string, number>;

  constructor(redis: IORedis) {
    this.redis = redis;
    this.configs = new Map();
    this.lastRequestTime = new Map();

    // デフォルト設定をロード
    Object.values(DEFAULT_RATE_LIMITS).forEach((config) => {
      this.configs.set(config.domain, config);
    });
  }

  /**
   * ドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      // サブドメインを除去してメインドメインを取得
      const parts = urlObj.hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return urlObj.hostname;
    } catch {
      return 'default';
    }
  }

  /**
   * ドメインの設定を取得
   */
  getConfig(url: string): RateLimitConfig {
    const domain = this.extractDomain(url);
    return this.configs.get(domain) || this.configs.get('default')!;
  }

  /**
   * 設定を更新
   */
  setConfig(domain: string, config: Partial<RateLimitConfig>): void {
    const existing = this.configs.get(domain) || DEFAULT_RATE_LIMITS.default;
    this.configs.set(domain, { ...existing, domain, ...config });
    log.info(`Rate limit config updated for ${domain}`, config);
  }

  /**
   * 全設定を取得
   */
  getAllConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Redisからカスタム設定をロード
   */
  async loadConfigsFromRedis(): Promise<void> {
    try {
      const configStr = await this.redis.get('rakuda:rate-limits:configs');
      if (configStr) {
        const configs = JSON.parse(configStr) as RateLimitConfig[];
        configs.forEach((config) => {
          this.configs.set(config.domain, config);
        });
        log.info(`Loaded ${configs.length} rate limit configs from Redis`);
      }
    } catch (error) {
      log.error('Failed to load rate limit configs from Redis', error);
    }
  }

  /**
   * 設定をRedisに保存
   */
  async saveConfigsToRedis(): Promise<void> {
    try {
      const configs = Array.from(this.configs.values());
      await this.redis.set('rakuda:rate-limits:configs', JSON.stringify(configs));
      log.info('Rate limit configs saved to Redis');
    } catch (error) {
      log.error('Failed to save rate limit configs to Redis', error);
    }
  }

  /**
   * レート制限をチェック（スライディングウィンドウ）
   * @returns 待機が必要な場合はミリ秒数、不要な場合は0
   */
  async checkRateLimit(url: string): Promise<number> {
    const domain = this.extractDomain(url);
    const config = this.getConfig(url);
    const key = `rakuda:rate-limit:${domain}`;
    const now = Date.now();

    try {
      // 最小遅延チェック
      const lastTime = this.lastRequestTime.get(domain) || 0;
      const timeSinceLastRequest = now - lastTime;
      if (timeSinceLastRequest < config.minDelayMs) {
        const waitTime = config.minDelayMs - timeSinceLastRequest;
        log.debug(`Min delay wait for ${domain}: ${waitTime}ms`);
        return waitTime;
      }

      // スライディングウィンドウカウンター
      const windowStart = now - config.windowMs;

      // 古いエントリを削除し、カウント
      const multi = this.redis.multi();
      multi.zremrangebyscore(key, '-inf', windowStart);
      multi.zcard(key);
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.expire(key, Math.ceil(config.windowMs / 1000) + 10);

      const results = await multi.exec();
      const currentCount = (results?.[1]?.[1] as number) || 0;

      if (currentCount >= config.requestsPerWindow) {
        // ウィンドウ内の最も古いリクエストの時刻を取得
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        if (oldest.length >= 2) {
          const oldestTime = parseInt(oldest[1], 10);
          const waitTime = oldestTime + config.windowMs - now;
          if (waitTime > 0) {
            log.warn(`Rate limit exceeded for ${domain}, wait: ${waitTime}ms`);
            return waitTime;
          }
        }
      }

      // 成功 - 最終リクエスト時刻を記録
      this.lastRequestTime.set(domain, now);
      return 0;
    } catch (error) {
      log.error(`Rate limit check failed for ${domain}`, error);
      // エラー時は安全のためデフォルト遅延を返す
      return config.minDelayMs;
    }
  }

  /**
   * 待機してからリクエストを実行
   */
  async waitForRateLimit(url: string): Promise<void> {
    const waitTime = await this.checkRateLimit(url);
    if (waitTime > 0) {
      log.debug(`Waiting ${waitTime}ms for rate limit...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      // 再チェック（他のワーカーとの競合対策）
      await this.waitForRateLimit(url);
    }
  }

  /**
   * レート制限付きでリクエストを実行
   */
  async executeWithRateLimit<T>(
    url: string,
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const domain = this.extractDomain(url);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await this.waitForRateLimit(url);

      try {
        const result = await fn();
        return result;
      } catch (error: any) {
        // 429 Too Many Requests の場合はバックオフ
        if (error?.response?.status === 429 || error?.status === 429) {
          const backoffMs = Math.pow(2, attempt + 1) * 10000; // 20s, 40s, 80s
          log.warn(`429 received for ${domain}, backing off for ${backoffMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Rate limit retries exhausted for ${domain}`);
  }

  /**
   * 現在のレート制限状態を取得
   */
  async getStatus(url: string): Promise<{
    domain: string;
    config: RateLimitConfig;
    currentCount: number;
    windowMs: number;
    canRequest: boolean;
  }> {
    const domain = this.extractDomain(url);
    const config = this.getConfig(url);
    const key = `rakuda:rate-limit:${domain}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      await this.redis.zremrangebyscore(key, '-inf', windowStart);
      const currentCount = await this.redis.zcard(key);

      return {
        domain,
        config,
        currentCount,
        windowMs: config.windowMs,
        canRequest: currentCount < config.requestsPerWindow,
      };
    } catch (error) {
      log.error(`Failed to get rate limit status for ${domain}`, error);
      return {
        domain,
        config,
        currentCount: 0,
        windowMs: config.windowMs,
        canRequest: true,
      };
    }
  }

  /**
   * 全ドメインの状態を取得
   */
  async getAllStatus(): Promise<Array<{
    domain: string;
    config: RateLimitConfig;
    currentCount: number;
    canRequest: boolean;
  }>> {
    const domains = Array.from(this.configs.keys());
    const statuses = await Promise.all(
      domains.map((domain) => this.getStatus(`https://${domain}`))
    );
    return statuses;
  }
}

// シングルトンインスタンス用
let rateLimiterInstance: RateLimiter | null = null;

export function createRateLimiter(redis: IORedis): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(redis);
  }
  return rateLimiterInstance;
}

export function getRateLimiter(): RateLimiter | null {
  return rateLimiterInstance;
}

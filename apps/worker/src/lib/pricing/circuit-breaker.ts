/**
 * 価格サーキットブレーカー（Phase 28）
 *
 * 異常な価格変更を防止する安全装置
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import IORedis from 'ioredis';

const log = logger.child({ module: 'CircuitBreaker' });

export interface CircuitBreakerConfig {
  maxPriceDropPercent: number;    // 1回の最大値下げ率 (デフォルト: 20%)
  maxPriceRisePercent: number;    // 1回の最大値上げ率 (デフォルト: 30%)
  minPriceFloor: number;          // 絶対最低価格 (USD)
  dailyChangeLimit: number;       // 1日の最大変更回数
  cooldownMinutes: number;        // 連続変更の冷却期間
  alertThresholdPercent: number;  // アラート発火の閾値
}

export interface CircuitBreakerResult {
  allowed: boolean;
  reason?: string;
  suggestedPrice?: number;
  alertTriggered?: boolean;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxPriceDropPercent: 20,
  maxPriceRisePercent: 30,
  minPriceFloor: 1.0,
  dailyChangeLimit: 3,
  cooldownMinutes: 60,
  alertThresholdPercent: 15,
};

class PricingCircuitBreaker {
  private redis: IORedis | null = null;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Redisを初期化
   */
  async initialize(): Promise<void> {
    if (this.redis) return;

    this.redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    await this.redis.ping();
    log.info({ type: 'circuit_breaker_initialized' });
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 価格変更が許可されるか確認
   */
  async canApply(
    listingId: string,
    currentPrice: number,
    newPrice: number
  ): Promise<CircuitBreakerResult> {
    await this.initialize();

    const checks: Array<() => Promise<CircuitBreakerResult | null>> = [
      () => this.checkPriceFloor(newPrice),
      () => this.checkPriceDropLimit(currentPrice, newPrice),
      () => this.checkPriceRiseLimit(currentPrice, newPrice),
      () => this.checkDailyLimit(listingId),
      () => this.checkCooldown(listingId),
    ];

    for (const check of checks) {
      const result = await check();
      if (result && !result.allowed) {
        log.warn({
          type: 'circuit_breaker_blocked',
          listingId,
          currentPrice,
          newPrice,
          reason: result.reason,
        });
        return result;
      }
    }

    // アラート閾値チェック
    const changePercent = ((newPrice - currentPrice) / currentPrice) * 100;
    const alertTriggered = Math.abs(changePercent) >= this.config.alertThresholdPercent;

    if (alertTriggered) {
      log.info({
        type: 'circuit_breaker_alert',
        listingId,
        changePercent,
        threshold: this.config.alertThresholdPercent,
      });
    }

    return {
      allowed: true,
      alertTriggered,
    };
  }

  /**
   * 絶対最低価格チェック
   */
  private async checkPriceFloor(newPrice: number): Promise<CircuitBreakerResult | null> {
    if (newPrice < this.config.minPriceFloor) {
      return {
        allowed: false,
        reason: `Price below minimum floor ($${this.config.minPriceFloor})`,
        suggestedPrice: this.config.minPriceFloor,
      };
    }
    return null;
  }

  /**
   * 最大値下げ率チェック
   */
  private async checkPriceDropLimit(
    currentPrice: number,
    newPrice: number
  ): Promise<CircuitBreakerResult | null> {
    if (newPrice >= currentPrice) return null;

    const dropPercent = ((currentPrice - newPrice) / currentPrice) * 100;
    if (dropPercent > this.config.maxPriceDropPercent) {
      const suggestedPrice = currentPrice * (1 - this.config.maxPriceDropPercent / 100);
      return {
        allowed: false,
        reason: `Price drop (${dropPercent.toFixed(1)}%) exceeds limit (${this.config.maxPriceDropPercent}%)`,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      };
    }
    return null;
  }

  /**
   * 最大値上げ率チェック
   */
  private async checkPriceRiseLimit(
    currentPrice: number,
    newPrice: number
  ): Promise<CircuitBreakerResult | null> {
    if (newPrice <= currentPrice) return null;

    const risePercent = ((newPrice - currentPrice) / currentPrice) * 100;
    if (risePercent > this.config.maxPriceRisePercent) {
      const suggestedPrice = currentPrice * (1 + this.config.maxPriceRisePercent / 100);
      return {
        allowed: false,
        reason: `Price rise (${risePercent.toFixed(1)}%) exceeds limit (${this.config.maxPriceRisePercent}%)`,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      };
    }
    return null;
  }

  /**
   * 1日の変更回数チェック
   */
  private async checkDailyLimit(listingId: string): Promise<CircuitBreakerResult | null> {
    if (!this.redis) return null;

    const key = `rakuda:pricing:daily:${listingId}`;
    const count = await this.redis.get(key);
    const currentCount = parseInt(count || '0', 10);

    if (currentCount >= this.config.dailyChangeLimit) {
      return {
        allowed: false,
        reason: `Daily change limit reached (${this.config.dailyChangeLimit} changes/day)`,
      };
    }
    return null;
  }

  /**
   * クールダウンチェック
   */
  private async checkCooldown(listingId: string): Promise<CircuitBreakerResult | null> {
    if (!this.redis || this.config.cooldownMinutes <= 0) return null;

    const key = `rakuda:pricing:cooldown:${listingId}`;
    const lastChange = await this.redis.get(key);

    if (lastChange) {
      const lastChangeTime = parseInt(lastChange, 10);
      const elapsedMinutes = (Date.now() - lastChangeTime) / (1000 * 60);

      if (elapsedMinutes < this.config.cooldownMinutes) {
        const remainingMinutes = Math.ceil(this.config.cooldownMinutes - elapsedMinutes);
        return {
          allowed: false,
          reason: `Cooldown period active (${remainingMinutes} minutes remaining)`,
        };
      }
    }
    return null;
  }

  /**
   * 価格変更を記録
   */
  async recordChange(
    listingId: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    await this.initialize();
    if (!this.redis) return;

    const now = Date.now();
    const dailyKey = `rakuda:pricing:daily:${listingId}`;
    const cooldownKey = `rakuda:pricing:cooldown:${listingId}`;

    // 日次カウンターをインクリメント
    await this.redis.incr(dailyKey);
    // 日付が変わったらリセット（24時間後に期限切れ）
    await this.redis.expire(dailyKey, 24 * 60 * 60);

    // クールダウンを設定
    await this.redis.set(cooldownKey, now.toString());
    await this.redis.expire(cooldownKey, this.config.cooldownMinutes * 60);

    log.debug({
      type: 'price_change_recorded',
      listingId,
      oldPrice,
      newPrice,
    });
  }

  /**
   * 1日の変更回数を取得
   */
  async getDailyChangeCount(listingId: string): Promise<number> {
    await this.initialize();
    if (!this.redis) return 0;

    const key = `rakuda:pricing:daily:${listingId}`;
    const count = await this.redis.get(key);
    return parseInt(count || '0', 10);
  }

  /**
   * クールダウン残り時間を取得（分）
   */
  async getCooldownRemaining(listingId: string): Promise<number> {
    await this.initialize();
    if (!this.redis) return 0;

    const key = `rakuda:pricing:cooldown:${listingId}`;
    const lastChange = await this.redis.get(key);

    if (!lastChange) return 0;

    const lastChangeTime = parseInt(lastChange, 10);
    const elapsedMinutes = (Date.now() - lastChangeTime) / (1000 * 60);
    const remaining = this.config.cooldownMinutes - elapsedMinutes;

    return remaining > 0 ? Math.ceil(remaining) : 0;
  }

  /**
   * リスティングの制限状態を取得
   */
  async getStatus(listingId: string): Promise<{
    dailyChanges: number;
    dailyLimit: number;
    cooldownRemaining: number;
    cooldownMinutes: number;
    isBlocked: boolean;
    blockReason?: string;
  }> {
    const dailyChanges = await this.getDailyChangeCount(listingId);
    const cooldownRemaining = await this.getCooldownRemaining(listingId);

    let isBlocked = false;
    let blockReason: string | undefined;

    if (dailyChanges >= this.config.dailyChangeLimit) {
      isBlocked = true;
      blockReason = 'Daily limit reached';
    } else if (cooldownRemaining > 0) {
      isBlocked = true;
      blockReason = `Cooldown: ${cooldownRemaining} minutes`;
    }

    return {
      dailyChanges,
      dailyLimit: this.config.dailyChangeLimit,
      cooldownRemaining,
      cooldownMinutes: this.config.cooldownMinutes,
      isBlocked,
      blockReason,
    };
  }

  /**
   * 制限をリセット（管理者用）
   */
  async resetLimits(listingId: string): Promise<void> {
    await this.initialize();
    if (!this.redis) return;

    const dailyKey = `rakuda:pricing:daily:${listingId}`;
    const cooldownKey = `rakuda:pricing:cooldown:${listingId}`;

    await this.redis.del(dailyKey, cooldownKey);

    log.info({
      type: 'limits_reset',
      listingId,
    });
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// 環境変数から設定を読み込む
function loadConfigFromEnv(): Partial<CircuitBreakerConfig> {
  return {
    maxPriceDropPercent: process.env.PRICING_MAX_DROP_PERCENT
      ? parseInt(process.env.PRICING_MAX_DROP_PERCENT, 10)
      : undefined,
    minPriceFloor: process.env.PRICING_MIN_FLOOR
      ? parseFloat(process.env.PRICING_MIN_FLOOR)
      : undefined,
    dailyChangeLimit: process.env.PRICING_DAILY_CHANGE_LIMIT
      ? parseInt(process.env.PRICING_DAILY_CHANGE_LIMIT, 10)
      : undefined,
    cooldownMinutes: process.env.PRICING_COOLDOWN_MINUTES
      ? parseInt(process.env.PRICING_COOLDOWN_MINUTES, 10)
      : undefined,
  };
}

// シングルトンインスタンス
export const pricingCircuitBreaker = new PricingCircuitBreaker(loadConfigFromEnv());

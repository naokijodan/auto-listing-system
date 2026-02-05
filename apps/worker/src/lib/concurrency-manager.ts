import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'concurrency-manager' });

export interface QueueConcurrencyConfig {
  queueName: string;
  concurrency: number;
  priority: number; // 高い方が優先
  enabled: boolean;
}

// デフォルトの並列度設定
export const DEFAULT_CONCURRENCY_CONFIGS: Record<string, QueueConcurrencyConfig> = {
  scrape: {
    queueName: 'scrape',
    concurrency: 2, // スクレイピングは低速に
    priority: 1,
    enabled: true,
  },
  translate: {
    queueName: 'translate',
    concurrency: 5, // API呼び出しは並列可
    priority: 2,
    enabled: true,
  },
  image: {
    queueName: 'image',
    concurrency: 3, // 画像処理は中程度
    priority: 2,
    enabled: true,
  },
  publish: {
    queueName: 'publish',
    concurrency: 2, // 出品は慎重に
    priority: 3,
    enabled: true,
  },
  inventory: {
    queueName: 'inventory',
    concurrency: 1, // 在庫チェックは順次
    priority: 4, // 最優先
    enabled: true,
  },
  competitor: {
    queueName: 'competitor',
    concurrency: 1, // 競合取得は低速
    priority: 1,
    enabled: true,
  },
};

export class ConcurrencyManager {
  private redis: IORedis;
  private configs: Map<string, QueueConcurrencyConfig>;

  constructor(redis: IORedis) {
    this.redis = redis;
    this.configs = new Map();

    // デフォルト設定をロード
    Object.values(DEFAULT_CONCURRENCY_CONFIGS).forEach((config) => {
      this.configs.set(config.queueName, config);
    });
  }

  /**
   * Redisから設定をロード
   */
  async loadConfigs(): Promise<void> {
    try {
      const configStr = await this.redis.get('rakuda:concurrency:configs');
      if (configStr) {
        const configs = JSON.parse(configStr) as QueueConcurrencyConfig[];
        configs.forEach((config) => {
          this.configs.set(config.queueName, config);
        });
        log.info(`Loaded ${configs.length} concurrency configs`);
      }
    } catch (error) {
      log.error('Failed to load concurrency configs', error);
    }
  }

  /**
   * 設定をRedisに保存
   */
  async saveConfigs(): Promise<void> {
    try {
      const configs = Array.from(this.configs.values());
      await this.redis.set('rakuda:concurrency:configs', JSON.stringify(configs));
      log.info('Concurrency configs saved');
    } catch (error) {
      log.error('Failed to save concurrency configs', error);
    }
  }

  /**
   * キューの並列度を取得
   */
  getConcurrency(queueName: string): number {
    const config = this.configs.get(queueName);
    return config?.enabled ? config.concurrency : 0;
  }

  /**
   * キューの優先度を取得
   */
  getPriority(queueName: string): number {
    const config = this.configs.get(queueName);
    return config?.priority || 1;
  }

  /**
   * キューが有効か確認
   */
  isEnabled(queueName: string): boolean {
    const config = this.configs.get(queueName);
    return config?.enabled ?? true;
  }

  /**
   * 設定を更新
   */
  setConfig(queueName: string, updates: Partial<QueueConcurrencyConfig>): void {
    const existing = this.configs.get(queueName) || {
      queueName,
      concurrency: 1,
      priority: 1,
      enabled: true,
    };
    this.configs.set(queueName, { ...existing, ...updates });
  }

  /**
   * 全設定を取得
   */
  getAllConfigs(): QueueConcurrencyConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 優先度順にキューをソート
   */
  getQueuesByPriority(): string[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([name]) => name);
  }

  /**
   * 現在のワーカー状態を取得
   */
  async getWorkerStatus(): Promise<Record<string, { active: number; max: number }>> {
    const status: Record<string, { active: number; max: number }> = {};

    for (const [queueName, config] of this.configs) {
      // Redisから現在のアクティブジョブ数を取得
      const activeKey = `rakuda:worker:${queueName}:active`;
      const activeStr = await this.redis.get(activeKey);
      const active = parseInt(activeStr || '0', 10);

      status[queueName] = {
        active,
        max: config.concurrency,
      };
    }

    return status;
  }

  /**
   * アクティブジョブ数を記録
   */
  async recordActiveJob(queueName: string, delta: number): Promise<void> {
    const activeKey = `rakuda:worker:${queueName}:active`;
    if (delta > 0) {
      await this.redis.incr(activeKey);
    } else {
      await this.redis.decr(activeKey);
    }
    await this.redis.expire(activeKey, 300); // 5分でリセット
  }

  /**
   * システム全体の並列度を取得
   */
  getTotalConcurrency(): number {
    let total = 0;
    for (const config of this.configs.values()) {
      if (config.enabled) {
        total += config.concurrency;
      }
    }
    return total;
  }

  /**
   * 推奨並列度を計算（システムリソースに基づく）
   */
  getRecommendedConcurrency(): Record<string, number> {
    // 簡易的な推奨値（本格実装ではCPU/メモリを考慮）
    return {
      scrape: 2, // 外部アクセスは控えめ
      translate: 5, // API並列OK
      image: 3, // CPUバウンド
      publish: 2, // 外部アクセス
      inventory: 1, // 順次処理
      competitor: 1, // 低速
    };
  }
}

// シングルトン
let concurrencyManagerInstance: ConcurrencyManager | null = null;

export function createConcurrencyManager(redis: IORedis): ConcurrencyManager {
  if (!concurrencyManagerInstance) {
    concurrencyManagerInstance = new ConcurrencyManager(redis);
  }
  return concurrencyManagerInstance;
}

export function getConcurrencyManager(): ConcurrencyManager | null {
  return concurrencyManagerInstance;
}

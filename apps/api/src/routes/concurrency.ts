import { Router } from 'express';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'concurrency' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface QueueConcurrencyConfig {
  queueName: string;
  concurrency: number;
  priority: number;
  enabled: boolean;
}

// デフォルト設定
const DEFAULT_CONFIGS: Record<string, QueueConcurrencyConfig> = {
  scrape: { queueName: 'scrape', concurrency: 2, priority: 1, enabled: true },
  translate: { queueName: 'translate', concurrency: 5, priority: 2, enabled: true },
  image: { queueName: 'image', concurrency: 3, priority: 2, enabled: true },
  publish: { queueName: 'publish', concurrency: 2, priority: 3, enabled: true },
  inventory: { queueName: 'inventory', concurrency: 1, priority: 4, enabled: true },
  competitor: { queueName: 'competitor', concurrency: 1, priority: 1, enabled: true },
};

/**
 * 並列度設定を取得
 */
router.get('/', async (req, res, next) => {
  try {
    const configStr = await redis.get('rakuda:concurrency:configs');
    let configs = Object.values(DEFAULT_CONFIGS);

    if (configStr) {
      const customConfigs = JSON.parse(configStr) as QueueConcurrencyConfig[];
      const configMap = new Map<string, QueueConcurrencyConfig>();
      configs.forEach((c) => configMap.set(c.queueName, c));
      customConfigs.forEach((c) => configMap.set(c.queueName, c));
      configs = Array.from(configMap.values());
    }

    // 現在のアクティブジョブ数を取得
    const withStatus = await Promise.all(
      configs.map(async (config) => {
        const activeKey = `rakuda:worker:${config.queueName}:active`;
        const activeStr = await redis.get(activeKey);
        const active = parseInt(activeStr || '0', 10);

        return {
          ...config,
          activeJobs: active,
          utilization: config.concurrency > 0 ? Math.round((active / config.concurrency) * 100) : 0,
        };
      })
    );

    res.json({
      success: true,
      data: withStatus,
    });
  } catch (error) {
    log.error('Failed to get concurrency configs', error);
    next(error);
  }
});

/**
 * 並列度設定を更新
 */
router.put('/:queueName', async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { concurrency, priority, enabled } = req.body;

    // 既存設定を取得
    const configStr = await redis.get('rakuda:concurrency:configs');
    let configs: QueueConcurrencyConfig[] = [];

    if (configStr) {
      configs = JSON.parse(configStr);
    }

    // 設定を更新または追加
    const existingIndex = configs.findIndex((c) => c.queueName === queueName);
    const defaultConfig = DEFAULT_CONFIGS[queueName] || {
      queueName,
      concurrency: 1,
      priority: 1,
      enabled: true,
    };

    const newConfig: QueueConcurrencyConfig = {
      queueName,
      concurrency: concurrency ?? defaultConfig.concurrency,
      priority: priority ?? defaultConfig.priority,
      enabled: enabled ?? defaultConfig.enabled,
    };

    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }

    await redis.set('rakuda:concurrency:configs', JSON.stringify(configs));

    log.info(`Concurrency config updated for ${queueName}`, newConfig);

    res.json({
      success: true,
      data: newConfig,
    });
  } catch (error) {
    log.error('Failed to update concurrency config', error);
    next(error);
  }
});

/**
 * 並列度設定をリセット
 */
router.delete('/:queueName', async (req, res, next) => {
  try {
    const { queueName } = req.params;

    const configStr = await redis.get('rakuda:concurrency:configs');
    if (!configStr) {
      return res.json({ success: true, data: { reset: false } });
    }

    let configs: QueueConcurrencyConfig[] = JSON.parse(configStr);
    configs = configs.filter((c) => c.queueName !== queueName);

    await redis.set('rakuda:concurrency:configs', JSON.stringify(configs));

    log.info(`Concurrency config reset for ${queueName}`);

    res.json({
      success: true,
      data: { reset: true, queueName },
    });
  } catch (error) {
    log.error('Failed to reset concurrency config', error);
    next(error);
  }
});

/**
 * 推奨設定を取得
 */
router.get('/recommended', async (req, res, next) => {
  try {
    // 簡易的な推奨値
    const recommended = {
      scrape: { concurrency: 2, reason: '外部サイトへのアクセスは控えめに' },
      translate: { concurrency: 5, reason: 'API呼び出しは並列処理可能' },
      image: { concurrency: 3, reason: 'CPU処理のため中程度' },
      publish: { concurrency: 2, reason: 'eBay APIのレート制限を考慮' },
      inventory: { concurrency: 1, reason: '順次処理で確実に' },
      competitor: { concurrency: 1, reason: 'スクレイピングは低速で' },
    };

    res.json({
      success: true,
      data: recommended,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 全キューを一時停止
 */
router.post('/pause-all', async (req, res, next) => {
  try {
    const configStr = await redis.get('rakuda:concurrency:configs');
    let configs: QueueConcurrencyConfig[] = configStr
      ? JSON.parse(configStr)
      : Object.values(DEFAULT_CONFIGS);

    configs = configs.map((c) => ({ ...c, enabled: false }));

    await redis.set('rakuda:concurrency:configs', JSON.stringify(configs));

    log.warn('All queues paused');

    res.json({
      success: true,
      data: { paused: configs.length },
    });
  } catch (error) {
    log.error('Failed to pause all queues', error);
    next(error);
  }
});

/**
 * 全キューを再開
 */
router.post('/resume-all', async (req, res, next) => {
  try {
    const configStr = await redis.get('rakuda:concurrency:configs');
    let configs: QueueConcurrencyConfig[] = configStr
      ? JSON.parse(configStr)
      : Object.values(DEFAULT_CONFIGS);

    configs = configs.map((c) => ({ ...c, enabled: true }));

    await redis.set('rakuda:concurrency:configs', JSON.stringify(configs));

    log.info('All queues resumed');

    res.json({
      success: true,
      data: { resumed: configs.length },
    });
  } catch (error) {
    log.error('Failed to resume all queues', error);
    next(error);
  }
});

export { router as concurrencyRouter };

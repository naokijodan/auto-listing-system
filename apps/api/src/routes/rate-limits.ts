import { Router } from 'express';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'rate-limits' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface RateLimitConfig {
  domain: string;
  requestsPerWindow: number;
  windowMs: number;
  minDelayMs: number;
}

// デフォルト設定
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'mercari.com': {
    domain: 'mercari.com',
    requestsPerWindow: 10,
    windowMs: 60000,
    minDelayMs: 5000,
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

/**
 * レート制限設定を取得
 */
router.get('/', async (req, res, next) => {
  try {
    // Redisからカスタム設定を取得
    const configStr = await redis.get('rakuda:rate-limits:configs');
    let configs: RateLimitConfig[] = Object.values(DEFAULT_RATE_LIMITS);

    if (configStr) {
      const customConfigs = JSON.parse(configStr) as RateLimitConfig[];
      // カスタム設定をマージ
      const configMap = new Map<string, RateLimitConfig>();
      configs.forEach((c) => configMap.set(c.domain, c));
      customConfigs.forEach((c) => configMap.set(c.domain, c));
      configs = Array.from(configMap.values());
    }

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    log.error('Failed to get rate limit configs', error);
    next(error);
  }
});

/**
 * レート制限設定を更新
 */
router.put('/:domain', async (req, res, next) => {
  try {
    const { domain } = req.params;
    const { requestsPerWindow, windowMs, minDelayMs } = req.body;

    // 既存設定を取得
    const configStr = await redis.get('rakuda:rate-limits:configs');
    let configs: RateLimitConfig[] = [];

    if (configStr) {
      configs = JSON.parse(configStr);
    }

    // 設定を更新または追加
    const existingIndex = configs.findIndex((c) => c.domain === domain);
    const defaultConfig = DEFAULT_RATE_LIMITS[domain] || DEFAULT_RATE_LIMITS.default;

    const newConfig: RateLimitConfig = {
      domain,
      requestsPerWindow: requestsPerWindow ?? defaultConfig.requestsPerWindow,
      windowMs: windowMs ?? defaultConfig.windowMs,
      minDelayMs: minDelayMs ?? defaultConfig.minDelayMs,
    };

    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }

    // Redisに保存
    await redis.set('rakuda:rate-limits:configs', JSON.stringify(configs));

    log.info(`Rate limit config updated for ${domain}`, newConfig);

    res.json({
      success: true,
      data: newConfig,
    });
  } catch (error) {
    log.error('Failed to update rate limit config', error);
    next(error);
  }
});

/**
 * レート制限設定をリセット
 */
router.delete('/:domain', async (req, res, next) => {
  try {
    const { domain } = req.params;

    const configStr = await redis.get('rakuda:rate-limits:configs');
    if (!configStr) {
      return res.json({ success: true, data: { reset: false } });
    }

    let configs: RateLimitConfig[] = JSON.parse(configStr);
    configs = configs.filter((c) => c.domain !== domain);

    await redis.set('rakuda:rate-limits:configs', JSON.stringify(configs));

    log.info(`Rate limit config reset for ${domain}`);

    res.json({
      success: true,
      data: { reset: true, domain },
    });
  } catch (error) {
    log.error('Failed to reset rate limit config', error);
    next(error);
  }
});

/**
 * 現在のレート制限状態を取得
 */
router.get('/status', async (req, res, next) => {
  try {
    const domains = ['mercari.com', 'yahoo.co.jp', 'ebay.com', 'rakuten.co.jp', 'default'];
    const now = Date.now();

    const statuses = await Promise.all(
      domains.map(async (domain) => {
        const key = `rakuda:rate-limit:${domain}`;

        // 設定を取得
        const configStr = await redis.get('rakuda:rate-limits:configs');
        let config = DEFAULT_RATE_LIMITS[domain] || DEFAULT_RATE_LIMITS.default;

        if (configStr) {
          const configs = JSON.parse(configStr) as RateLimitConfig[];
          const customConfig = configs.find((c) => c.domain === domain);
          if (customConfig) {
            config = customConfig;
          }
        }

        // 古いエントリを削除してカウント
        const windowStart = now - config.windowMs;
        await redis.zremrangebyscore(key, '-inf', windowStart);
        const currentCount = await redis.zcard(key);

        return {
          domain,
          config,
          currentCount,
          limit: config.requestsPerWindow,
          remaining: Math.max(0, config.requestsPerWindow - currentCount),
          canRequest: currentCount < config.requestsPerWindow,
          resetMs: config.windowMs,
        };
      })
    );

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    log.error('Failed to get rate limit status', error);
    next(error);
  }
});

/**
 * レート制限カウンターをリセット
 */
router.post('/reset/:domain', async (req, res, next) => {
  try {
    const { domain } = req.params;
    const key = `rakuda:rate-limit:${domain}`;

    await redis.del(key);

    log.info(`Rate limit counter reset for ${domain}`);

    res.json({
      success: true,
      data: { reset: true, domain },
    });
  } catch (error) {
    log.error('Failed to reset rate limit counter', error);
    next(error);
  }
});

export { router as rateLimitsRouter };

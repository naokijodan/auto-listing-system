import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES, EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

const router = Router();
const log = logger.child({ module: 'admin-api' });

// 通知設定のチェック
function getNotificationConfig() {
  return {
    slack: !!process.env.SLACK_WEBHOOK_URL,
    discord: !!process.env.DISCORD_WEBHOOK_URL,
    line: !!process.env.LINE_NOTIFY_TOKEN,
  };
}

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// キュー
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });

/**
 * 手動で在庫チェックをトリガー
 * POST /api/admin/trigger/inventory-check
 */
router.post('/trigger/inventory-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;

    const job = await inventoryQueue.add(
      'manual-inventory-check',
      {
        triggeredAt: new Date().toISOString(),
        productIds,
        checkType: productIds?.length ? 'specific' : 'all',
        batchSize: 50,
      },
      {
        priority: 1,
      }
    );

    log.info({
      type: 'manual_inventory_check_triggered',
      jobId: job.id,
      productCount: productIds?.length || 'all',
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Inventory check triggered for ${productIds?.length || 'all'} products`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 手動で価格同期をトリガー
 * POST /api/admin/trigger/price-sync
 */
router.post('/trigger/price-sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingIds, marketplace } = req.body;

    const job = await scrapeQueue.add(
      'manual-price-sync',
      {
        triggeredAt: new Date().toISOString(),
        listingIds,
        marketplace,
      },
      {
        priority: 1,
      }
    );

    log.info({
      type: 'manual_price_sync_triggered',
      jobId: job.id,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Price sync triggered',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 手動で為替レート更新をトリガー
 * POST /api/admin/trigger/exchange-rate
 */
router.post('/trigger/exchange-rate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await scrapeQueue.add(
      'update-exchange-rate',
      {
        triggeredAt: new Date().toISOString(),
      },
      {
        priority: 1,
      }
    );

    log.info({
      type: 'manual_exchange_rate_update_triggered',
      jobId: job.id,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Exchange rate update triggered',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * スケジューラー設定を取得
 * GET /api/admin/scheduler
 */
router.get('/scheduler', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 各キューのリピートジョブを取得
    const inventoryRepeatableJobs = await inventoryQueue.getRepeatableJobs();
    const scrapeRepeatableJobs = await scrapeQueue.getRepeatableJobs();

    res.json({
      inventoryCheck: inventoryRepeatableJobs.filter(j => j.name === 'scheduled-inventory-check'),
      exchangeRate: scrapeRepeatableJobs.filter(j => j.name === 'update-exchange-rate'),
      priceSync: scrapeRepeatableJobs.filter(j => j.name === 'sync-prices'),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 価格設定一覧を取得
 * GET /api/admin/price-settings
 */
router.get('/price-settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.priceSetting.findMany({
      orderBy: { marketplace: 'asc' },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * 価格設定を更新
 * PUT /api/admin/price-settings/:id
 */
router.put('/price-settings/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      platformFeeRate,
      paymentFeeRate,
      targetProfitRate,
      adRate,
      exchangeRate,
      exchangeBuffer,
    } = req.body;

    const setting = await prisma.priceSetting.update({
      where: { id },
      data: {
        ...(platformFeeRate !== undefined && { platformFeeRate }),
        ...(paymentFeeRate !== undefined && { paymentFeeRate }),
        ...(targetProfitRate !== undefined && { targetProfitRate }),
        ...(adRate !== undefined && { adRate }),
        ...(exchangeRate !== undefined && { exchangeRate }),
        ...(exchangeBuffer !== undefined && { exchangeBuffer }),
      },
    });

    log.info({
      type: 'price_setting_updated',
      settingId: id,
    });

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプト一覧を取得
 * GET /api/admin/translation-prompts
 */
router.get('/translation-prompts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prompts = await prisma.translationPrompt.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { priority: 'desc' },
        { category: 'asc' },
      ],
    });

    res.json(prompts);
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプトを更新
 * PUT /api/admin/translation-prompts/:id
 */
router.put('/translation-prompts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      marketplace,
      systemPrompt,
      userPrompt,
      extractAttributes,
      additionalInstructions,
      seoKeywords,
      priority,
      isActive,
      isDefault,
    } = req.body;

    const prompt = await prisma.translationPrompt.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(marketplace !== undefined && { marketplace }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(userPrompt !== undefined && { userPrompt }),
        ...(extractAttributes !== undefined && { extractAttributes }),
        ...(additionalInstructions !== undefined && { additionalInstructions }),
        ...(seoKeywords !== undefined && { seoKeywords }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    log.info({
      type: 'translation_prompt_updated',
      promptId: id,
    });

    res.json(prompt);
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプトを作成
 * POST /api/admin/translation-prompts
 */
router.post('/translation-prompts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      category,
      marketplace,
      systemPrompt,
      userPrompt,
      extractAttributes,
      additionalInstructions,
      seoKeywords,
      priority,
    } = req.body;

    const prompt = await prisma.translationPrompt.create({
      data: {
        name,
        category,
        marketplace,
        systemPrompt,
        userPrompt,
        extractAttributes: extractAttributes || [],
        additionalInstructions,
        seoKeywords: seoKeywords || [],
        priority: priority || 0,
        isActive: true,
        isDefault: false,
      },
    });

    log.info({
      type: 'translation_prompt_created',
      promptId: prompt.id,
      name,
    });

    res.status(201).json(prompt);
  } catch (error) {
    next(error);
  }
});

/**
 * シッピングポリシー一覧を取得
 * GET /api/admin/shipping-policies
 */
router.get('/shipping-policies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await prisma.shippingPolicy.findMany({
      orderBy: [
        { region: 'asc' },
        { carrier: 'asc' },
      ],
    });

    res.json(policies);
  } catch (error) {
    next(error);
  }
});

/**
 * シッピングポリシーを更新
 * PUT /api/admin/shipping-policies/:id
 */
router.put('/shipping-policies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      shippingTable,
      fuelSurcharge,
      dutyThreshold,
      dutyRate,
      handlingTime,
      isActive,
    } = req.body;

    const policy = await prisma.shippingPolicy.update({
      where: { id },
      data: {
        ...(shippingTable !== undefined && { shippingTable }),
        ...(fuelSurcharge !== undefined && { fuelSurcharge }),
        ...(dutyThreshold !== undefined && { dutyThreshold }),
        ...(dutyRate !== undefined && { dutyRate }),
        ...(handlingTime !== undefined && { handlingTime }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    log.info({
      type: 'shipping_policy_updated',
      policyId: id,
    });

    res.json(policy);
  } catch (error) {
    next(error);
  }
});

/**
 * 為替レート履歴を取得
 * GET /api/admin/exchange-rates
 */
router.get('/exchange-rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;

    const rates = await prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
      },
      orderBy: { fetchedAt: 'desc' },
      take: Number(limit),
    });

    // 最新のUSD/JPYレートも計算
    const latestRate = rates[0];
    const usdToJpy = latestRate ? 1 / latestRate.rate : DEFAULT_USD_TO_JPY;

    res.json({
      currentRate: {
        jpyToUsd: latestRate?.rate || EXCHANGE_RATE_DEFAULTS.JPY_TO_USD,
        usdToJpy,
        fetchedAt: latestRate?.fetchedAt || null,
        source: latestRate?.source || 'none',
      },
      history: rates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード統計を取得
 * GET /api/admin/stats
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalListings,
      activeListings,
      recentJobs,
      failedJobs,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.jobLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.jobLog.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      listings: {
        total: totalListings,
        active: activeListings,
      },
      jobs: {
        last24Hours: recentJobs,
        failed: failedJobs,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 日次レポートをトリガー
 * POST /api/admin/trigger/daily-report
 */
router.post('/trigger/daily-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await scrapeQueue.add(
      'daily-report',
      {
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
      {
        priority: 1,
      }
    );

    log.info({
      type: 'manual_daily_report_triggered',
      jobId: job.id,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Daily report triggered',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ヘルスチェックをトリガー
 * POST /api/admin/trigger/health-check
 */
router.post('/trigger/health-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await scrapeQueue.add(
      'health-check',
      {
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
      {
        priority: 1,
      }
    );

    log.info({
      type: 'manual_health_check_triggered',
      jobId: job.id,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Health check triggered',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通知設定を取得
 * GET /api/admin/notifications/config
 */
router.get('/notifications/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getNotificationConfig();
    const anyConfigured = config.slack || config.discord || config.line;

    res.json({
      configured: anyConfigured,
      channels: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テスト通知を送信
 * POST /api/admin/notifications/test
 */
router.post('/notifications/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getNotificationConfig();
    const anyConfigured = config.slack || config.discord || config.line;

    if (!anyConfigured) {
      res.status(400).json({
        success: false,
        message: 'No notification channels configured',
        hint: 'Set SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL, or LINE_NOTIFY_TOKEN in .env',
      });
      return;
    }

    // テスト通知ジョブをキューに追加
    const job = await scrapeQueue.add(
      'test-notification',
      {
        triggeredAt: new Date().toISOString(),
        testMessage: req.body.message || 'Test notification from Auto Listing System',
      },
      {
        priority: 1,
      }
    );

    res.json({
      success: true,
      jobId: job.id,
      message: 'Test notification queued',
      channels: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 詳細な日次レポートを取得
 * GET /api/admin/reports/daily
 */
router.get('/reports/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      newProducts,
      publishedListings,
      soldListings,
      outOfStockProducts,
      completedJobs,
      failedJobs,
    ] = await Promise.all([
      prisma.product.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.listing.count({
        where: { listedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.listing.count({
        where: { soldAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.product.count({
        where: {
          status: 'OUT_OF_STOCK',
          updatedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.jobLog.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.jobLog.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    // ジョブタイプ別統計
    const jobsByType = await prisma.jobLog.groupBy({
      by: ['jobType', 'status'],
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _count: true,
    });

    res.json({
      date: startOfDay.toISOString().split('T')[0],
      products: {
        new: newProducts,
        outOfStock: outOfStockProducts,
      },
      listings: {
        published: publishedListings,
        sold: soldListings,
      },
      jobs: {
        completed: completedJobs,
        failed: failedJobs,
        byType: jobsByType,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 週次サマリーを取得
 * GET /api/admin/reports/weekly
 */
router.get('/reports/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const dailyStats = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [newProducts, published, sold, failed] = await Promise.all([
        prisma.product.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.listing.count({
          where: {
            listedAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.listing.count({
          where: {
            soldAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.jobLog.count({
          where: {
            status: 'FAILED',
            createdAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        newProducts,
        published,
        sold,
        failed,
      });
    }

    // 週間合計
    const totals = dailyStats.reduce(
      (acc, day) => ({
        newProducts: acc.newProducts + day.newProducts,
        published: acc.published + day.published,
        sold: acc.sold + day.sold,
        failed: acc.failed + day.failed,
      }),
      { newProducts: 0, published: 0, sold: 0, failed: 0 }
    );

    res.json({
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      totals,
      daily: dailyStats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * システムヘルス状態を取得
 * GET /api/admin/health
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 基本的なヘルスチェック
    const checks = [];

    // DB接続チェック
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'Database', status: 'ok', message: 'Connected' });
    } catch {
      checks.push({ name: 'Database', status: 'error', message: 'Connection failed' });
    }

    // Redis接続チェック
    try {
      await redis.ping();
      checks.push({ name: 'Redis', status: 'ok', message: 'Connected' });
    } catch {
      checks.push({ name: 'Redis', status: 'error', message: 'Connection failed' });
    }

    // 直近1時間のジョブ成功率
    const recentJobs = await prisma.jobLog.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { status: true },
    });

    if (recentJobs.length > 0) {
      const failedCount = recentJobs.filter(j => j.status === 'FAILED').length;
      const successRate = ((recentJobs.length - failedCount) / recentJobs.length) * 100;

      checks.push({
        name: 'Job Success Rate',
        status: successRate > 80 ? 'ok' : successRate > 50 ? 'warning' : 'error',
        message: `${successRate.toFixed(1)}% (${recentJobs.length} jobs)`,
      });
    }

    // エラー状態の商品数
    const errorProducts = await prisma.product.count({
      where: { status: 'ERROR' },
    });

    checks.push({
      name: 'Error Products',
      status: errorProducts === 0 ? 'ok' : errorProducts < 10 ? 'warning' : 'error',
      message: `${errorProducts} products in error state`,
    });

    // 通知設定
    const notificationConfig = getNotificationConfig();
    const anyNotificationConfigured = notificationConfig.slack || notificationConfig.discord || notificationConfig.line;

    checks.push({
      name: 'Notifications',
      status: anyNotificationConfigured ? 'ok' : 'warning',
      message: anyNotificationConfigured
        ? `Configured: ${Object.entries(notificationConfig).filter(([, v]) => v).map(([k]) => k).join(', ')}`
        : 'No notification channels configured',
    });

    const healthy = !checks.some(c => c.status === 'error');

    res.json({
      healthy,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * パフォーマンスメトリクスを取得
 * GET /api/admin/performance
 */
router.get('/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    // ========================================
    // 1. サーキットブレーカー状態
    // ========================================
    const circuitBreakerKeys = await redis.keys('rakuda:circuit:*');
    const circuitBreakers: Array<{
      name: string;
      state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      failureCount: number;
      lastFailure?: string;
      lastStateChange?: string;
    }> = [];

    for (const key of circuitBreakerKeys) {
      const data = await redis.hgetall(key);
      const name = key.replace('rakuda:circuit:', '');
      circuitBreakers.push({
        name,
        state: (data.state as 'CLOSED' | 'OPEN' | 'HALF_OPEN') || 'CLOSED',
        failureCount: parseInt(data.failureCount || '0', 10),
        lastFailure: data.lastFailure,
        lastStateChange: data.lastStateChange,
      });
    }

    // デフォルトサーキットブレーカー名を追加（存在しない場合）
    const defaultCircuitBreakers = ['joom-api', 'ebay-api', 'openai-api', 'translation'];
    for (const name of defaultCircuitBreakers) {
      if (!circuitBreakers.find(cb => cb.name === name)) {
        circuitBreakers.push({
          name,
          state: 'CLOSED',
          failureCount: 0,
        });
      }
    }

    // ========================================
    // 2. ジョブ成功率
    // ========================================
    const [
      jobsLastHour,
      failedJobsLastHour,
      jobsLastDay,
      failedJobsLastDay,
    ] = await Promise.all([
      prisma.jobLog.count({
        where: { createdAt: { gte: oneHourAgo } },
      }),
      prisma.jobLog.count({
        where: { status: 'FAILED', createdAt: { gte: oneHourAgo } },
      }),
      prisma.jobLog.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.jobLog.count({
        where: { status: 'FAILED', createdAt: { gte: oneDayAgo } },
      }),
    ]);

    const successRateLastHour = jobsLastHour > 0
      ? ((jobsLastHour - failedJobsLastHour) / jobsLastHour) * 100
      : 100;
    const successRateLastDay = jobsLastDay > 0
      ? ((jobsLastDay - failedJobsLastDay) / jobsLastDay) * 100
      : 100;

    // ========================================
    // 3. API応答時間（Redis からメトリクス取得）
    // ========================================
    const responseTimeKeys = await redis.keys('rakuda:api:response_time:*');
    const responseTimes: number[] = [];

    for (const key of responseTimeKeys) {
      const times = await redis.lrange(key, 0, -1);
      times.forEach(t => responseTimes.push(parseInt(t, 10)));
    }

    // 応答時間がない場合はJobLogのdurationから取得
    if (responseTimes.length === 0) {
      const recentJobs = await prisma.jobLog.findMany({
        where: {
          createdAt: { gte: oneHourAgo },
          duration: { not: null },
        },
        select: { duration: true },
        take: 1000,
      });
      recentJobs.forEach(job => {
        if (job.duration) responseTimes.push(job.duration);
      });
    }

    let avgResponseTime = 0;
    let p95ResponseTime = 0;
    let p99ResponseTime = 0;

    if (responseTimes.length > 0) {
      const sorted = [...responseTimes].sort((a, b) => a - b);
      avgResponseTime = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
      p95ResponseTime = Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0);
      p99ResponseTime = Math.round(sorted[Math.floor(sorted.length * 0.99)] || 0);
    }

    // ========================================
    // 4. エラー率トレンド（過去24時間を時間単位で）
    // ========================================
    const errorTrend: Array<{
      hour: string;
      totalJobs: number;
      failedJobs: number;
      errorRate: number;
    }> = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now - i * 60 * 60 * 1000);

      const [total, failed] = await Promise.all([
        prisma.jobLog.count({
          where: { createdAt: { gte: hourStart, lt: hourEnd } },
        }),
        prisma.jobLog.count({
          where: { status: 'FAILED', createdAt: { gte: hourStart, lt: hourEnd } },
        }),
      ]);

      errorTrend.push({
        hour: hourStart.toISOString(),
        totalJobs: total,
        failedJobs: failed,
        errorRate: total > 0 ? (failed / total) * 100 : 0,
      });
    }

    // ========================================
    // 5. Dead Letter Queue件数
    // ========================================
    const dlqQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection: redis });
    const [dlqWaiting, dlqFailed] = await Promise.all([
      dlqQueue.getWaitingCount(),
      dlqQueue.getFailedCount(),
    ]);
    const dlqCount = dlqWaiting + dlqFailed;

    // 最近のDLQジョブ詳細
    const dlqJobs = await dlqQueue.getJobs(['waiting', 'failed'], 0, 10);
    const dlqDetails = dlqJobs.map(job => ({
      id: job.id,
      name: job.name,
      originalQueue: job.data?.originalQueue,
      failedReason: job.data?.error || job.failedReason,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
    }));

    // ========================================
    // 6. キュー別処理状況
    // ========================================
    const queueStats = await Promise.all(
      Object.values(QUEUE_NAMES).map(async (queueName) => {
        const queue = new Queue(queueName, { connection: redis });
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        const total = completed + failed;
        const successRate = total > 0 ? ((completed) / total) * 100 : 100;

        return {
          name: queueName,
          waiting,
          active,
          completed,
          failed,
          delayed,
          successRate: Math.round(successRate * 10) / 10,
        };
      })
    );

    // ========================================
    // 7. システムヘルスサマリー
    // ========================================
    const openCircuitBreakers = circuitBreakers.filter(cb => cb.state === 'OPEN').length;
    const halfOpenCircuitBreakers = circuitBreakers.filter(cb => cb.state === 'HALF_OPEN').length;

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const healthIssues: string[] = [];

    if (openCircuitBreakers > 0) {
      healthStatus = 'critical';
      healthIssues.push(`${openCircuitBreakers}個のサーキットブレーカーがOPEN`);
    }
    if (halfOpenCircuitBreakers > 0 && healthStatus === 'healthy') {
      healthStatus = 'degraded';
      healthIssues.push(`${halfOpenCircuitBreakers}個のサーキットブレーカーがHALF_OPEN`);
    }
    if (successRateLastHour < 80) {
      healthStatus = 'critical';
      healthIssues.push(`直近1時間の成功率が${successRateLastHour.toFixed(1)}%`);
    } else if (successRateLastHour < 95 && healthStatus === 'healthy') {
      healthStatus = 'degraded';
      healthIssues.push(`直近1時間の成功率が${successRateLastHour.toFixed(1)}%`);
    }
    if (dlqCount > 10) {
      if (healthStatus === 'healthy') healthStatus = 'degraded';
      healthIssues.push(`DLQに${dlqCount}件のジョブ`);
    }
    if (dlqCount > 50) {
      healthStatus = 'critical';
    }

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        health: {
          status: healthStatus,
          issues: healthIssues,
        },
        circuitBreakers,
        jobSuccessRate: {
          lastHour: {
            total: jobsLastHour,
            failed: failedJobsLastHour,
            successRate: Math.round(successRateLastHour * 10) / 10,
          },
          lastDay: {
            total: jobsLastDay,
            failed: failedJobsLastDay,
            successRate: Math.round(successRateLastDay * 10) / 10,
          },
        },
        responseTime: {
          sampleCount: responseTimes.length,
          avg: avgResponseTime,
          p95: p95ResponseTime,
          p99: p99ResponseTime,
        },
        errorTrend,
        deadLetterQueue: {
          count: dlqCount,
          waiting: dlqWaiting,
          failed: dlqFailed,
          recentJobs: dlqDetails,
        },
        queueStats,
      },
    });
  } catch (error) {
    log.error('Failed to get performance metrics', error);
    next(error);
  }
});

/**
 * サーキットブレーカーをリセット
 * POST /api/admin/performance/circuit-breaker/:name/reset
 */
router.post('/performance/circuit-breaker/:name/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const key = `rakuda:circuit:${name}`;

    await redis.hset(key, {
      state: 'CLOSED',
      failureCount: '0',
      lastStateChange: new Date().toISOString(),
    });

    log.info({
      type: 'circuit_breaker_manual_reset',
      name,
    });

    res.json({
      success: true,
      message: `Circuit breaker "${name}" has been reset to CLOSED`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Dead Letter Queueのジョブを再試行
 * POST /api/admin/performance/dlq/retry
 */
router.post('/performance/dlq/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobIds } = req.body;
    const dlqQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection: redis });

    if (!jobIds || !Array.isArray(jobIds)) {
      // 全てのDLQジョブを再試行
      const jobs = await dlqQueue.getJobs(['waiting', 'failed'], 0, 100);
      let retriedCount = 0;

      for (const job of jobs) {
        if (job.data?.originalQueue) {
          const originalQueue = new Queue(job.data.originalQueue, { connection: redis });
          await originalQueue.add(job.name, job.data.payload || job.data, {
            attempts: 3,
          });
          await job.remove();
          retriedCount++;
        }
      }

      log.info({
        type: 'dlq_retry_all',
        retriedCount,
      });

      res.json({
        success: true,
        data: { retriedCount },
      });
    } else {
      // 特定のジョブのみ再試行
      let retriedCount = 0;
      for (const jobId of jobIds) {
        const job = await dlqQueue.getJob(jobId);
        if (job && job.data?.originalQueue) {
          const originalQueue = new Queue(job.data.originalQueue, { connection: redis });
          await originalQueue.add(job.name, job.data.payload || job.data, {
            attempts: 3,
          });
          await job.remove();
          retriedCount++;
        }
      }

      log.info({
        type: 'dlq_retry_specific',
        jobIds,
        retriedCount,
      });

      res.json({
        success: true,
        data: { retriedCount },
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Dead Letter Queueのジョブを削除
 * DELETE /api/admin/performance/dlq
 */
router.delete('/performance/dlq', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobIds } = req.body;
    const dlqQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, { connection: redis });

    if (!jobIds || !Array.isArray(jobIds)) {
      // 全てのDLQジョブを削除
      await dlqQueue.drain();
      await dlqQueue.clean(0, 0, 'failed');

      log.info({ type: 'dlq_clear_all' });

      res.json({
        success: true,
        message: 'All DLQ jobs have been cleared',
      });
    } else {
      // 特定のジョブのみ削除
      let deletedCount = 0;
      for (const jobId of jobIds) {
        const job = await dlqQueue.getJob(jobId);
        if (job) {
          await job.remove();
          deletedCount++;
        }
      }

      log.info({
        type: 'dlq_delete_specific',
        jobIds,
        deletedCount,
      });

      res.json({
        success: true,
        data: { deletedCount },
      });
    }
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };

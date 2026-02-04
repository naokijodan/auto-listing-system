import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { QUEUE_NAMES } from '@als/config';

const router = Router();
const log = logger.child({ module: 'admin-api' });

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
    const usdToJpy = latestRate ? 1 / latestRate.rate : 150;

    res.json({
      currentRate: {
        jpyToUsd: latestRate?.rate || 0.0067,
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

export { router as adminRouter };

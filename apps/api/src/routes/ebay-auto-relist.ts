
/**
 * Phase 105-C: eBay自動再出品 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma, Marketplace } from '@prisma/client';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-auto-relist' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const relistQueue = new Queue('ebay-auto-relist', { connection: redis });

// ========================================
// 設定取得
// ========================================

router.get('/config', async (_req: Request, res: Response) => {
  try {
    // 設定を取得（なければ作成）
    let config = await prisma.ebayAutoRelistConfig.findFirst();

    if (!config) {
      config = await prisma.ebayAutoRelistConfig.create({
        data: {
          enabled: false,
          maxRelistCount: 3,
          priceAdjustment: 0,
          minPrice: null,
          excludeCategories: [],
          excludeBrands: [],
          runHour: 9,
          runDays: [1, 2, 3, 4, 5],
        },
      });
    }

    res.json(config);
  } catch (error) {
    log.error({ type: 'get_config_error', error });
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// ========================================
// 設定更新
// ========================================

router.put('/config', async (req: Request, res: Response) => {
  try {
    const {
      enabled,
      maxRelistCount,
      priceAdjustment,
      minPrice,
      excludeCategories,
      excludeBrands,
      runHour,
      runDays,
    } = req.body;

    // バリデーション
    if (maxRelistCount !== undefined && (maxRelistCount < 1 || maxRelistCount > 10)) {
      return res.status(400).json({ error: 'maxRelistCount must be between 1 and 10' });
    }

    if (priceAdjustment !== undefined && (priceAdjustment < -50 || priceAdjustment > 50)) {
      return res.status(400).json({ error: 'priceAdjustment must be between -50 and 50' });
    }

    if (runHour !== undefined && (runHour < 0 || runHour > 23)) {
      return res.status(400).json({ error: 'runHour must be between 0 and 23' });
    }

    // 既存の設定を取得またはIDを特定
    let config = await prisma.ebayAutoRelistConfig.findFirst();

    if (!config) {
      config = await prisma.ebayAutoRelistConfig.create({
        data: {
          enabled: enabled ?? false,
          maxRelistCount: maxRelistCount ?? 3,
          priceAdjustment: priceAdjustment ?? 0,
          minPrice: minPrice ?? null,
          excludeCategories: excludeCategories ?? [],
          excludeBrands: excludeBrands ?? [],
          runHour: runHour ?? 9,
          runDays: runDays ?? [1, 2, 3, 4, 5],
        },
      });
    } else {
      config = await prisma.ebayAutoRelistConfig.update({
        where: { id: config.id },
        data: {
          ...(enabled !== undefined && { enabled }),
          ...(maxRelistCount !== undefined && { maxRelistCount }),
          ...(priceAdjustment !== undefined && { priceAdjustment }),
          ...(minPrice !== undefined && { minPrice }),
          ...(excludeCategories !== undefined && { excludeCategories }),
          ...(excludeBrands !== undefined && { excludeBrands }),
          ...(runHour !== undefined && { runHour }),
          ...(runDays !== undefined && { runDays }),
        },
      });
    }

    log.info({
      type: 'config_updated',
      enabled: config.enabled,
      maxRelistCount: config.maxRelistCount,
      priceAdjustment: config.priceAdjustment,
    });

    res.json(config);
  } catch (error) {
    log.error({ type: 'update_config_error', error });
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// ========================================
// 手動実行
// ========================================

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { dryRun = false, limit = 50 } = req.body;

    const config = await prisma.ebayAutoRelistConfig.findFirst();

    if (!config) {
      return res.status(400).json({ error: 'No auto-relist config found' });
    }

    // 終了した出品を取得
    const endedListings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        status: 'ENDED',
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category: true,
            brand: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    if (endedListings.length === 0) {
      return res.json({
        message: 'No ended listings to relist',
        eligibleCount: 0,
        results: [],
      });
    }

    // フィルタリング
    const eligibleListings = endedListings.filter((listing) => {
      // 再出品回数チェック
      const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
      const relistCount = (marketplaceData.relistCount as number) || 0;
      if (relistCount >= config.maxRelistCount) {
        return false;
      }

      // カテゴリ除外チェック
      if (
        config.excludeCategories.length > 0 &&
        listing.product?.category &&
        config.excludeCategories.includes(listing.product.category)
      ) {
        return false;
      }

      // ブランド除外チェック
      if (
        config.excludeBrands.length > 0 &&
        listing.product?.brand &&
        config.excludeBrands.includes(listing.product.brand)
      ) {
        return false;
      }

      // 最低価格チェック
      if (config.minPrice !== null) {
        const newPrice = listing.listingPrice * (1 + config.priceAdjustment / 100);
        if (newPrice < config.minPrice) {
          return false;
        }
      }

      return true;
    });

    if (dryRun) {
      // ドライラン: 対象リストを返す
      const preview = eligibleListings.slice(0, 20).map((listing) => {
        const newPrice = Math.max(
          0.01,
          Math.round(listing.listingPrice * (1 + config.priceAdjustment / 100) * 100) / 100
        );
        return {
          listingId: listing.id,
          productTitle: listing.product?.title || 'Unknown',
          currentPrice: listing.listingPrice,
          newPrice,
          priceChange: config.priceAdjustment,
        };
      });

      return res.json({
        dryRun: true,
        message: `Would relist ${eligibleListings.length} listings`,
        eligibleCount: eligibleListings.length,
        totalEnded: endedListings.length,
        filteredOut: endedListings.length - eligibleListings.length,
        config: {
          priceAdjustment: config.priceAdjustment,
          maxRelistCount: config.maxRelistCount,
          minPrice: config.minPrice,
        },
        preview,
      });
    }

    // 実際の再出品処理
    const results: Array<{ listingId: string; status: string; newPrice?: number; error?: string }> =
      [];
    let successCount = 0;
    let failureCount = 0;

    for (const listing of eligibleListings) {
      try {
        const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
        const currentRelistCount = (marketplaceData.relistCount as number) || 0;

        const newPrice = Math.max(
          0.01,
          Math.round(listing.listingPrice * (1 + config.priceAdjustment / 100) * 100) / 100
        );

        // ステータスをDRAFTに戻して再出品準備
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'DRAFT',
            listingPrice: newPrice,
            listedAt: null,
            marketplaceData: {
              ...marketplaceData,
              relistCount: currentRelistCount + 1,
              relistedAt: new Date().toISOString(),
              previousPrice: listing.listingPrice,
            },
          },
        });

        results.push({
          listingId: listing.id,
          status: 'relisted',
          newPrice,
        });
        successCount++;
      } catch (error: any) {
        results.push({
          listingId: listing.id,
          status: 'error',
          error: error.message,
        });
        failureCount++;
      }
    }

    log.info({
      type: 'auto_relist_complete',
      successCount,
      failureCount,
      totalProcessed: eligibleListings.length,
    });

    res.json({
      message: `Relisted ${successCount} listings`,
      successCount,
      failureCount,
      totalProcessed: eligibleListings.length,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'run_auto_relist_error', error });
    res.status(500).json({ error: 'Failed to run auto-relist' });
  }
});

// ========================================
// 統計情報取得
// ========================================

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [endedCount, recentRelists, config] = await Promise.all([
      // 終了した出品数
      prisma.listing.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'ENDED',
        },
      }),
      // 最近の再出品（過去7日間）
      prisma.listing.count({
        where: {
          marketplace: Marketplace.EBAY,
          marketplaceData: {
            path: ['relistedAt'],
            not: Prisma.AnyNull,
          },
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // 設定
      prisma.ebayAutoRelistConfig.findFirst(),
    ]);

    res.json({
      endedListings: endedCount,
      recentRelists,
      config: config
        ? {
            enabled: config.enabled,
            maxRelistCount: config.maxRelistCount,
            priceAdjustment: config.priceAdjustment,
            runHour: config.runHour,
            runDays: config.runDays,
          }
        : null,
    });
  } catch (error) {
    log.error({ type: 'get_stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ========================================
// ジョブ追加（スケジューラーから呼び出し用）
// ========================================

router.post('/schedule', async (_req: Request, res: Response) => {
  try {
    const config = await prisma.ebayAutoRelistConfig.findFirst();

    if (!config || !config.enabled) {
      return res.json({ message: 'Auto-relist is disabled', scheduled: false });
    }

    // ジョブをキューに追加
    const job = await relistQueue.add(
      'auto-relist',
      {
        configId: config.id,
        scheduledAt: new Date().toISOString(),
      },
      {
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    log.info({ type: 'auto_relist_scheduled', jobId: job.id });

    res.json({
      message: 'Auto-relist job scheduled',
      scheduled: true,
      jobId: job.id,
    });
  } catch (error) {
    log.error({ type: 'schedule_error', error });
    res.status(500).json({ error: 'Failed to schedule auto-relist' });
  }
});

export default router;

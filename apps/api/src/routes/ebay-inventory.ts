/**
 * Phase 106: eBay在庫監視 API
 *
 * eBay出品の在庫状態を監視し、自動対応を行うAPIエンドポイント
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace, ListingStatus } from '@prisma/client';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-inventory' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const inventoryQueue = new Queue('inventory', { connection: redis });

// ========================================
// 在庫ダッシュボード
// ========================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalListings,
      activeListings,
      pausedByInventory,
      outOfStockCount,
      lowStockCount,
      recentAlerts,
      lastCheckTime,
    ] = await Promise.all([
      // 総出品数
      prisma.listing.count({
        where: { marketplace: Marketplace.EBAY },
      }),
      // アクティブ出品数
      prisma.listing.count({
        where: { marketplace: Marketplace.EBAY, status: 'ACTIVE' },
      }),
      // 在庫による一時停止数
      prisma.listing.count({
        where: { marketplace: Marketplace.EBAY, pausedByInventory: true },
      }),
      // 在庫切れ数（仕入れ元が在庫切れ）
      prisma.listing.count({
        where: {
          marketplace: Marketplace.EBAY,
          product: { status: 'OUT_OF_STOCK' },
        },
      }),
      // 低在庫数（要監視）
      prisma.listing.count({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'ACTIVE',
          product: { status: 'ACTIVE' },
        },
      }),
      // 直近のアラート（過去24時間）
      prisma.inventoryAlert.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          listing: { marketplace: Marketplace.EBAY },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          listing: {
            select: {
              id: true,
              status: true,
              product: { select: { title: true } },
            },
          },
        },
      }),
      // 最後のチェック時刻
      prisma.jobLog.findFirst({
        where: {
          jobType: { contains: 'inventory' },
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ]);

    // 在庫状態の分布
    const statusDistribution = await prisma.listing.groupBy({
      by: ['status'],
      where: { marketplace: Marketplace.EBAY },
      _count: true,
    });

    const byStatus = statusDistribution.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      summary: {
        totalListings,
        activeListings,
        pausedByInventory,
        outOfStockCount,
        lowStockCount,
        healthScore: totalListings > 0
          ? Math.round(((activeListings - outOfStockCount) / totalListings) * 100)
          : 100,
      },
      byStatus,
      recentAlerts: recentAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        listingId: alert.listingId,
        productTitle: alert.listing?.product?.title || 'Unknown',
        actionTaken: alert.actionTaken,
        createdAt: alert.createdAt,
      })),
      lastCheckTime: lastCheckTime?.completedAt || null,
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get inventory dashboard' });
  }
});

// ========================================
// 在庫チェック実行
// ========================================

router.post('/check', async (req: Request, res: Response) => {
  try {
    const {
      listingIds,
      checkAll = false,
      limit = 50,
    } = req.body;

    if (!checkAll && (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0)) {
      return res.status(400).json({ error: 'listingIds array or checkAll=true required' });
    }

    // 対象出品を取得
    const where: Record<string, unknown> = {
      marketplace: Marketplace.EBAY,
      status: { in: ['ACTIVE', 'DRAFT'] },
    };

    if (!checkAll && listingIds) {
      where.id = { in: listingIds };
    }

    const listings = await prisma.listing.findMany({
      where,
      take: limit,
      select: {
        id: true,
        productId: true,
        status: true,
        product: { select: { title: true, sourceUrl: true } },
      },
    });

    if (listings.length === 0) {
      return res.json({ message: 'No listings to check', count: 0 });
    }

    // 在庫チェックジョブを追加
    const job = await inventoryQueue.add(
      'scheduled-inventory-check',
      {
        productIds: listings.map(l => l.productId),
        checkType: 'specific',
        source: 'manual',
        triggeredAt: new Date().toISOString(),
      },
      {
        priority: 1,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    log.info({
      type: 'inventory_check_triggered',
      jobId: job.id,
      listingCount: listings.length,
    });

    res.json({
      message: `Inventory check started for ${listings.length} listings`,
      jobId: job.id,
      count: listings.length,
    });
  } catch (error) {
    log.error({ type: 'check_error', error });
    res.status(500).json({ error: 'Failed to start inventory check' });
  }
});

// ========================================
// 在庫設定取得・更新
// ========================================

interface InventorySettings {
  autoStatusEnabled: boolean;
  pauseOnOutOfStock: boolean;
  resumeOnRestock: boolean;
  checkIntervalHours: number;
  lowStockThreshold: number;
  notifyOnOutOfStock: boolean;
  notifyOnRestock: boolean;
}

const DEFAULT_SETTINGS: InventorySettings = {
  autoStatusEnabled: true,
  pauseOnOutOfStock: true,
  resumeOnRestock: true,
  checkIntervalHours: 6,
  lowStockThreshold: 1,
  notifyOnOutOfStock: true,
  notifyOnRestock: true,
};

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    // システム設定から在庫監視設定を取得
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ebay_inventory_settings' },
    });

    const settings: InventorySettings = setting?.value
      ? { ...DEFAULT_SETTINGS, ...(setting.value as Record<string, unknown>) }
      : DEFAULT_SETTINGS;

    res.json(settings);
  } catch (error) {
    log.error({ type: 'get_settings_error', error });
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // バリデーション
    if (updates.checkIntervalHours !== undefined) {
      if (updates.checkIntervalHours < 1 || updates.checkIntervalHours > 24) {
        return res.status(400).json({ error: 'checkIntervalHours must be between 1 and 24' });
      }
    }

    // 既存設定を取得
    const existing = await prisma.systemSetting.findUnique({
      where: { key: 'ebay_inventory_settings' },
    });

    const currentSettings: InventorySettings = existing?.value
      ? { ...DEFAULT_SETTINGS, ...(existing.value as Record<string, unknown>) }
      : DEFAULT_SETTINGS;

    const newSettings = { ...currentSettings, ...updates };

    // 設定を保存
    await prisma.systemSetting.upsert({
      where: { key: 'ebay_inventory_settings' },
      create: {
        key: 'ebay_inventory_settings',
        value: newSettings,
        description: 'eBay在庫監視設定',
      },
      update: { value: newSettings },
    });

    log.info({ type: 'settings_updated', settings: newSettings });

    res.json(newSettings);
  } catch (error) {
    log.error({ type: 'update_settings_error', error });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ========================================
// 在庫アラート一覧（eBay専用）
// ========================================

router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const {
      severity,
      alertType,
      acknowledged,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      listing: { marketplace: Marketplace.EBAY },
    };
    if (severity) where.severity = severity;
    if (alertType) where.alertType = alertType;
    if (acknowledged !== undefined) where.suppressed = acknowledged === 'true';

    const [alerts, total] = await Promise.all([
      prisma.inventoryAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          listing: {
            select: {
              id: true,
              status: true,
              listingPrice: true,
              product: { select: { title: true, sourceUrl: true } },
            },
          },
        },
      }),
      prisma.inventoryAlert.count({ where }),
    ]);

    res.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        listing: {
          id: alert.listing?.id,
          status: alert.listing?.status,
          price: alert.listing?.listingPrice,
          productTitle: alert.listing?.product?.title,
          sourceUrl: alert.listing?.product?.sourceUrl,
        },
        actionTaken: alert.actionTaken,
        acknowledged: alert.suppressed,
        createdAt: alert.createdAt,
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'get_alerts_error', error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// ========================================
// アラートを確認済みにする
// ========================================

router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.inventoryAlert.update({
      where: { id },
      data: { suppressed: true },
    });

    log.info({ type: 'alert_acknowledged', alertId: id });

    res.json({ message: 'Alert acknowledged', id: alert.id });
  } catch (error) {
    log.error({ type: 'acknowledge_error', error });
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// ========================================
// 在庫切れ出品の一時停止
// ========================================

router.post('/pause-out-of-stock', async (req: Request, res: Response) => {
  try {
    const { dryRun = false } = req.body;

    // 在庫切れ商品の出品を取得
    const listings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        status: 'ACTIVE',
        product: { status: 'OUT_OF_STOCK' },
      },
      include: {
        product: { select: { title: true } },
      },
    });

    if (listings.length === 0) {
      return res.json({ message: 'No out-of-stock listings to pause', count: 0 });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Would pause ${listings.length} listings`,
        listings: listings.slice(0, 20).map(l => ({
          id: l.id,
          title: l.product?.title,
        })),
      });
    }

    // 一時停止処理
    const results: Array<{ listingId: string; status: string }> = [];
    let successCount = 0;

    for (const listing of listings) {
      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'DRAFT',
            pausedByInventory: true,
          },
        });

        // アラート作成
        await prisma.inventoryAlert.create({
          data: {
            listingId: listing.id,
            alertType: 'OUT_OF_STOCK',
            severity: 'HIGH',
            message: `在庫切れにより一時停止: ${listing.product?.title || 'Unknown'}`,
            actionTaken: 'PAUSED',
          },
        });

        results.push({ listingId: listing.id, status: 'paused' });
        successCount++;
      } catch {
        results.push({ listingId: listing.id, status: 'error' });
      }
    }

    log.info({
      type: 'out_of_stock_paused',
      count: successCount,
    });

    res.json({
      message: `Paused ${successCount} out-of-stock listings`,
      count: successCount,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'pause_error', error });
    res.status(500).json({ error: 'Failed to pause listings' });
  }
});

// ========================================
// 在庫復活出品の再開
// ========================================

router.post('/resume-restocked', async (req: Request, res: Response) => {
  try {
    const { dryRun = false } = req.body;

    // 在庫復活した一時停止出品を取得
    const listings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.EBAY,
        pausedByInventory: true,
        product: { status: 'ACTIVE' },
      },
      include: {
        product: { select: { title: true } },
      },
    });

    if (listings.length === 0) {
      return res.json({ message: 'No restocked listings to resume', count: 0 });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Would resume ${listings.length} listings`,
        listings: listings.slice(0, 20).map(l => ({
          id: l.id,
          title: l.product?.title,
        })),
      });
    }

    // 再開処理
    const results: Array<{ listingId: string; status: string }> = [];
    let successCount = 0;

    for (const listing of listings) {
      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'DRAFT',
            pausedByInventory: false,
          },
        });

        // アラート作成
        await prisma.inventoryAlert.create({
          data: {
            listingId: listing.id,
            alertType: 'RESTOCKED',
            severity: 'INFO',
            message: `在庫復活により再開準備: ${listing.product?.title || 'Unknown'}`,
            actionTaken: 'RESUMED',
          },
        });

        results.push({ listingId: listing.id, status: 'resumed' });
        successCount++;
      } catch {
        results.push({ listingId: listing.id, status: 'error' });
      }
    }

    log.info({
      type: 'restocked_resumed',
      count: successCount,
    });

    res.json({
      message: `Resumed ${successCount} restocked listings`,
      count: successCount,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'resume_error', error });
    res.status(500).json({ error: 'Failed to resume listings' });
  }
});

// ========================================
// 在庫状態サマリー（マーケットプレイス別）
// ========================================

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [
      byProductStatus,
      byListingStatus,
      pausedByInventoryCount,
      recentChanges,
    ] = await Promise.all([
      // 商品ステータス別
      prisma.listing.groupBy({
        by: ['productId'],
        where: { marketplace: Marketplace.EBAY },
        _count: true,
      }).then(async (groups) => {
        const productIds = groups.map(g => g.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, status: true },
        });
        const statusMap = new Map(products.map(p => [p.id, p.status]));

        const counts: Record<string, number> = {};
        for (const group of groups) {
          const status = statusMap.get(group.productId) || 'UNKNOWN';
          counts[status] = (counts[status] || 0) + group._count;
        }
        return counts;
      }),
      // 出品ステータス別
      prisma.listing.groupBy({
        by: ['status'],
        where: { marketplace: Marketplace.EBAY },
        _count: true,
      }),
      // 在庫停止数
      prisma.listing.count({
        where: { marketplace: Marketplace.EBAY, pausedByInventory: true },
      }),
      // 直近の在庫変更（過去7日間）
      prisma.inventoryAlert.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          listing: { marketplace: Marketplace.EBAY },
        },
      }),
    ]);

    res.json({
      byProductStatus,
      byListingStatus: byListingStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      pausedByInventoryCount,
      recentChanges,
    });
  } catch (error) {
    log.error({ type: 'summary_error', error });
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'inventory-alerts' });

/**
 * アラート一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      productId,
      listingId,
      alertType,
      severity,
      actionTaken,
      suppressed,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (productId) where.productId = productId;
    if (listingId) where.listingId = listingId;
    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    if (actionTaken) where.actionTaken = actionTaken;
    if (suppressed !== undefined) where.suppressed = suppressed === 'true';

    const [alerts, total] = await Promise.all([
      prisma.inventoryAlert.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              marketplace: true,
              status: true,
              autoStatusEnabled: true,
              product: { select: { title: true } },
            },
          },
        },
      }),
      prisma.inventoryAlert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await prisma.inventoryAlert.findUnique({
      where: { id: req.params.id },
      include: {
        listing: {
          include: {
            product: { select: { title: true, sourceUrl: true } },
          },
        },
      },
    });

    if (!alert) {
      throw new AppError(404, 'Alert not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アラート統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const [typeCounts, severityCounts, actionCounts, suppressed, total, pausedListings] = await Promise.all([
      prisma.inventoryAlert.groupBy({
        by: ['alertType'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.inventoryAlert.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.inventoryAlert.groupBy({
        by: ['actionTaken'],
        where: { createdAt: { gte: since }, actionTaken: { not: null } },
        _count: true,
      }),
      prisma.inventoryAlert.count({
        where: { createdAt: { gte: since }, suppressed: true },
      }),
      prisma.inventoryAlert.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.listing.count({
        where: { pausedByInventory: true },
      }),
    ]);

    const byType = typeCounts.reduce((acc, item) => {
      acc[item.alertType] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = severityCounts.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const actionsTaken = actionCounts.reduce((acc, item) => {
      if (item.actionTaken) {
        acc[item.actionTaken] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), since },
        total,
        byType,
        bySeverity,
        actionsTaken,
        suppressedCount: suppressed,
        currentPausedListings: pausedListings,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 在庫切れで停止中のリスティング一覧
 */
router.get('/paused-listings', async (req, res, next) => {
  try {
    const { marketplace, limit = '50', offset = '0' } = req.query;

    const where: any = { pausedByInventory: true };
    if (marketplace) where.marketplace = marketplace;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { updatedAt: 'desc' },
        include: {
          product: { select: { title: true, sourceUrl: true, price: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リスティングの自動制御ON/OFF
 */
router.patch('/listings/:listingId/auto-status', async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      throw new AppError(400, 'enabled must be a boolean', 'INVALID_INPUT');
    }

    const listing = await prisma.listing.findUnique({
      where: { id: req.params.listingId },
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    const updated = await prisma.listing.update({
      where: { id: req.params.listingId },
      data: { autoStatusEnabled: enabled },
    });

    log.info({ listingId: updated.id, enabled }, 'Auto status control toggled');

    res.json({
      success: true,
      data: {
        id: updated.id,
        autoStatusEnabled: updated.autoStatusEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リスティングを手動で強制再開
 */
router.post('/listings/:listingId/force-resume', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.listingId },
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    if (!listing.pausedByInventory) {
      throw new AppError(400, 'Listing is not paused by inventory', 'INVALID_STATE');
    }

    await prisma.$transaction([
      prisma.listing.update({
        where: { id: req.params.listingId },
        data: {
          status: 'ACTIVE',
          pausedByInventory: false,
          resumeAt: null,
        },
      }),
      prisma.inventoryAlert.create({
        data: {
          listingId: req.params.listingId,
          productId: listing.productId,
          alertType: 'LISTING_RESUMED',
          severity: 'LOW',
          reason: '手動による強制再開',
          actionTaken: 'RESUME_LISTING',
          actionDetails: { manual: true, resumedAt: new Date().toISOString() },
        },
      }),
    ]);

    log.info({ listingId: req.params.listingId }, 'Listing force resumed');

    res.json({
      success: true,
      message: 'Listing resumed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 一括で自動再開をスケジュール
 */
router.post('/bulk/schedule-resume', async (req, res, next) => {
  try {
    const { listingIds, delayHours = 24 } = req.body;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(400, 'listingIds must be a non-empty array', 'INVALID_INPUT');
    }

    const resumeAt = new Date();
    resumeAt.setHours(resumeAt.getHours() + delayHours);

    const result = await prisma.listing.updateMany({
      where: {
        id: { in: listingIds },
        pausedByInventory: true,
      },
      data: { resumeAt },
    });

    log.info({ count: result.count, resumeAt, delayHours }, 'Bulk resume scheduled');

    res.json({
      success: true,
      data: {
        scheduled: result.count,
        resumeAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as inventoryAlertsRouter };

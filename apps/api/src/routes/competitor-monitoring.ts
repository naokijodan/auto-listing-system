/**
 * 競合モニタリングAPI（Phase 29）
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ route: 'competitor-monitoring' });

// ========================================
// トラッカー管理API
// ========================================

/**
 * @swagger
 * /api/competitor-monitoring/trackers:
 *   get:
 *     tags: [Competitor]
 *     summary: トラッカー一覧
 *     parameters:
 *       - name: listingId
 *         in: query
 *         schema:
 *           type: string
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get('/trackers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId, isActive, limit = '50', offset = '0' } = req.query;

    const trackers = await prisma.competitorTracker.findMany({
      where: {
        ...(listingId ? { listingId: listingId as string } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    const total = await prisma.competitorTracker.count({
      where: {
        ...(listingId ? { listingId: listingId as string } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
    });

    res.json({
      success: true,
      data: trackers,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/trackers:
 *   post:
 *     tags: [Competitor]
 *     summary: トラッカー作成
 */
router.post('/trackers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      listingId,
      productId,
      competitorIdentifier,
      marketplace,
      url,
      title,
      matchMethod,
      matchConfidence,
      checkInterval,
      alertOnPriceDrop,
      alertOnPriceRise,
      alertThresholdPercent,
      autoAdjustPrice,
    } = req.body;

    if (!competitorIdentifier || !marketplace || !url) {
      return res.status(400).json({
        success: false,
        error: 'competitorIdentifier, marketplace, and url are required',
      });
    }

    const tracker = await prisma.competitorTracker.create({
      data: {
        listingId,
        productId,
        competitorIdentifier,
        marketplace,
        url,
        title,
        matchMethod: matchMethod || 'manual',
        matchConfidence: matchConfidence || 1.0,
        checkInterval: checkInterval || 360,
        alertOnPriceDrop: alertOnPriceDrop ?? true,
        alertOnPriceRise: alertOnPriceRise ?? false,
        alertThresholdPercent: alertThresholdPercent || 5.0,
        autoAdjustPrice: autoAdjustPrice ?? false,
      },
    });

    log.info({
      type: 'tracker_created',
      trackerId: tracker.id,
    });

    res.status(201).json({
      success: true,
      data: tracker,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/trackers/{id}:
 *   get:
 *     tags: [Competitor]
 *     summary: トラッカー詳細
 */
router.get('/trackers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tracker = await prisma.competitorTracker.findUnique({
      where: { id: req.params.id },
    });

    if (!tracker) {
      return res.status(404).json({
        success: false,
        error: 'Tracker not found',
      });
    }

    // 最新の価格履歴を取得
    const recentPrices = await prisma.competitorPriceLog.findMany({
      where: { trackerId: tracker.id },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        ...tracker,
        recentPrices,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/trackers/{id}:
 *   put:
 *     tags: [Competitor]
 *     summary: トラッカー更新
 */
router.put('/trackers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.competitorTracker.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tracker not found',
      });
    }

    const {
      isActive,
      isVerified,
      verifiedBy,
      checkInterval,
      alertOnPriceDrop,
      alertOnPriceRise,
      alertThresholdPercent,
      autoAdjustPrice,
    } = req.body;

    const tracker = await prisma.competitorTracker.update({
      where: { id: req.params.id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isVerified !== undefined ? {
          isVerified,
          verifiedBy: isVerified ? verifiedBy : null,
          verifiedAt: isVerified ? new Date() : null,
        } : {}),
        ...(checkInterval !== undefined ? { checkInterval } : {}),
        ...(alertOnPriceDrop !== undefined ? { alertOnPriceDrop } : {}),
        ...(alertOnPriceRise !== undefined ? { alertOnPriceRise } : {}),
        ...(alertThresholdPercent !== undefined ? { alertThresholdPercent } : {}),
        ...(autoAdjustPrice !== undefined ? { autoAdjustPrice } : {}),
      },
    });

    log.info({
      type: 'tracker_updated',
      trackerId: tracker.id,
    });

    res.json({
      success: true,
      data: tracker,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/trackers/{id}:
 *   delete:
 *     tags: [Competitor]
 *     summary: トラッカー削除
 */
router.delete('/trackers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.competitorTracker.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tracker not found',
      });
    }

    await prisma.competitorTracker.delete({
      where: { id: req.params.id },
    });

    log.info({
      type: 'tracker_deleted',
      trackerId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Tracker deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 価格履歴API
// ========================================

/**
 * @swagger
 * /api/competitor-monitoring/prices:
 *   get:
 *     tags: [Competitor]
 *     summary: 競合価格履歴
 */
router.get('/prices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackerId, listingId, days = '30', limit = '100' } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string, 10));

    const prices = await prisma.competitorPriceLog.findMany({
      where: {
        recordedAt: { gte: since },
        ...(trackerId ? { trackerId: trackerId as string } : {}),
        ...(listingId ? { listingId: listingId as string } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// アラートAPI
// ========================================

/**
 * @swagger
 * /api/competitor-monitoring/alerts:
 *   get:
 *     tags: [Competitor]
 *     summary: アラート一覧
 */
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, listingId, alertType, limit = '50', offset = '0' } = req.query;

    const alerts = await prisma.competitorAlert.findMany({
      where: {
        ...(status ? { status: status as string } : {}),
        ...(listingId ? { listingId: listingId as string } : {}),
        ...(alertType ? { alertType: alertType as string } : {}),
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    const total = await prisma.competitorAlert.count({
      where: {
        ...(status ? { status: status as string } : {}),
        ...(listingId ? { listingId: listingId as string } : {}),
        ...(alertType ? { alertType: alertType as string } : {}),
      },
    });

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/alerts/{id}/acknowledge:
 *   post:
 *     tags: [Competitor]
 *     summary: アラート確認
 */
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { acknowledgedBy } = req.body;

    const alert = await prisma.competitorAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    await prisma.competitorAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/alerts/{id}/resolve:
 *   post:
 *     tags: [Competitor]
 *     summary: アラート解決
 */
router.post('/alerts/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.competitorAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    await prisma.competitorAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Alert resolved',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/competitor-monitoring/alerts/{id}/dismiss:
 *   post:
 *     tags: [Competitor]
 *     summary: アラート却下
 */
router.post('/alerts/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.competitorAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    await prisma.competitorAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'dismissed',
      },
    });

    res.json({
      success: true,
      message: 'Alert dismissed',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 統計API
// ========================================

/**
 * @swagger
 * /api/competitor-monitoring/stats:
 *   get:
 *     tags: [Competitor]
 *     summary: 競合モニタリング統計
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTrackers,
      activeTrackers,
      verifiedTrackers,
      totalAlerts,
      pendingAlerts,
      priceChecksToday,
      recentLogs,
    ] = await Promise.all([
      prisma.competitorTracker.count(),
      prisma.competitorTracker.count({ where: { isActive: true } }),
      prisma.competitorTracker.count({ where: { isVerified: true } }),
      prisma.competitorAlert.count({ where: { createdAt: { gte: since } } }),
      prisma.competitorAlert.count({ where: { status: 'pending' } }),
      prisma.competitorPriceLog.count({ where: { recordedAt: { gte: today } } }),
      prisma.competitorPriceLog.findMany({
        where: {
          recordedAt: { gte: since },
          priceChangePercent: { not: null },
        },
        select: { priceChangePercent: true },
      }),
    ]);

    const avgPriceChange = recentLogs.length > 0
      ? recentLogs.reduce((sum, l) => sum + (l.priceChangePercent || 0), 0) / recentLogs.length
      : 0;

    // アラート種別の集計
    const alertsByType = await prisma.competitorAlert.groupBy({
      by: ['alertType'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    const alertTypeStats: Record<string, number> = {};
    alertsByType.forEach(a => {
      alertTypeStats[a.alertType] = a._count;
    });

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          from: since.toISOString(),
          to: new Date().toISOString(),
        },
        trackers: {
          total: totalTrackers,
          active: activeTrackers,
          verified: verifiedTrackers,
        },
        alerts: {
          total: totalAlerts,
          pending: pendingAlerts,
          byType: alertTypeStats,
        },
        priceChecks: {
          today: priceChecksToday,
          avgPriceChange: Math.round(avgPriceChange * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as competitorMonitoringRouter };

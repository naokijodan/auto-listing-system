import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const listingPerformanceRouter = Router();

// GET /api/listing-performance/stats - パフォーマンス統計
listingPerformanceRouter.get('/stats', async (_req, res) => {
  try {
    const [
      totalListings,
      lowPerformers,
      avgViews,
      avgWatchers,
      totalFlags,
      activeFlags,
      totalThresholds,
      activeThresholds,
      totalBenchmarks,
    ] = await Promise.all([
      prisma.listingPerformance.count(),
      prisma.listingPerformance.count({ where: { isLowPerformer: true } }),
      prisma.listingPerformance.aggregate({ _avg: { views: true } }),
      prisma.listingPerformance.aggregate({ _avg: { watchers: true } }),
      prisma.lowPerformanceFlag.count(),
      prisma.lowPerformanceFlag.count({ where: { status: 'ACTIVE' } }),
      prisma.performanceThreshold.count(),
      prisma.performanceThreshold.count({ where: { isActive: true } }),
      prisma.categoryBenchmark.count(),
    ]);

    const lowPerformerRate = totalListings > 0
      ? Math.round((lowPerformers / totalListings) * 100)
      : 0;

    res.json({
      totalListings,
      lowPerformers,
      lowPerformerRate,
      avgViews: Math.round(avgViews._avg.views || 0),
      avgWatchers: Math.round(avgWatchers._avg.watchers || 0),
      totalFlags,
      activeFlags,
      totalThresholds,
      activeThresholds,
      totalBenchmarks,
    });
  } catch (error) {
    logger.error('Failed to get performance stats', error);
    res.status(500).json({ error: 'Failed to get performance stats' });
  }
});

// GET /api/listing-performance/listings - 出品一覧（スコア付き）
listingPerformanceRouter.get('/listings', async (req, res) => {
  try {
    const {
      lowPerformer,
      category,
      sortBy = 'performanceScore',
      order = 'asc',
      limit = '50',
      offset = '0'
    } = req.query;

    const where: any = {};
    if (lowPerformer !== undefined) where.isLowPerformer = lowPerformer === 'true';
    if (category) where.categoryId = category;

    const orderBy: any = {};
    orderBy[sortBy as string] = order;

    const [listings, total] = await Promise.all([
      prisma.listingPerformance.findMany({
        where,
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          _count: { select: { flags: true, suggestions: true } },
        },
      }),
      prisma.listingPerformance.count({ where }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    logger.error('Failed to get listings', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

// GET /api/listing-performance/low-performers - 低パフォーマンス出品
listingPerformanceRouter.get('/low-performers', async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const [listings, total] = await Promise.all([
      prisma.listingPerformance.findMany({
        where: { isLowPerformer: true },
        orderBy: { performanceScore: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          flags: { where: { status: 'ACTIVE' }, take: 1 },
          suggestions: { where: { status: 'PENDING' }, take: 3 },
        },
      }),
      prisma.listingPerformance.count({ where: { isLowPerformer: true } }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    logger.error('Failed to get low performers', error);
    res.status(500).json({ error: 'Failed to get low performers' });
  }
});

// POST /api/listing-performance/sync - eBay APIから同期（シミュレーション）
listingPerformanceRouter.post('/sync', async (req, res) => {
  try {
    // シミュレーション: eBay APIからデータ取得してListingPerformanceを更新
    const mockListings = Array.from({ length: 20 }, (_, i) => ({
      organizationId: 'default',
      listingId: `listing-${Date.now()}-${i}`,
      ebayItemId: `ebay-${Math.random().toString(36).substring(2, 12)}`,
      title: `Sample Product ${i + 1}`,
      price: Math.floor(Math.random() * 500) + 10,
      currency: 'USD',
      category: ['Electronics', 'Clothing', 'Home', 'Sports'][Math.floor(Math.random() * 4)],
      categoryId: `cat-${Math.floor(Math.random() * 4) + 1}`,
      views: Math.floor(Math.random() * 500),
      watchers: Math.floor(Math.random() * 50),
      impressions: Math.floor(Math.random() * 2000),
      clicks: Math.floor(Math.random() * 100),
      daysListed: Math.floor(Math.random() * 60) + 1,
      listingDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000),
      lastSyncedAt: new Date(),
    }));

    // CTR計算とスコアリング
    const processedListings = mockListings.map(listing => {
      const ctr = listing.impressions > 0
        ? (listing.clicks / listing.impressions) * 100
        : 0;

      // パフォーマンススコア計算（0-100、高いほど良い）
      const viewsScore = Math.min(listing.views / 100, 1) * 30;
      const watchersScore = Math.min(listing.watchers / 10, 1) * 30;
      const ctrScore = Math.min(ctr / 5, 1) * 20;
      const freshnessScore = Math.max(0, (60 - listing.daysListed) / 60) * 20;
      const performanceScore = viewsScore + watchersScore + ctrScore + freshnessScore;

      const isLowPerformer = performanceScore < 30 ||
        (listing.daysListed > 30 && listing.views < 10);

      return {
        ...listing,
        ctr,
        performanceScore,
        isLowPerformer,
        lowPerformerReason: isLowPerformer
          ? `Score: ${performanceScore.toFixed(1)}, Views: ${listing.views}, Days: ${listing.daysListed}`
          : null,
      };
    });

    // バッチ作成
    const created = await prisma.listingPerformance.createMany({
      data: processedListings,
      skipDuplicates: true,
    });

    // 低パフォーマンス出品にフラグを立てる
    const lowPerformers = processedListings.filter(l => l.isLowPerformer);
    for (const listing of lowPerformers) {
      const existing = await prisma.listingPerformance.findUnique({
        where: { listingId: listing.listingId },
      });
      if (existing) {
        await prisma.lowPerformanceFlag.create({
          data: {
            organizationId: 'default',
            listingId: existing.id,
            reason: 'Low performance detected during sync',
            score: listing.performanceScore,
            metrics: {
              views: listing.views,
              watchers: listing.watchers,
              ctr: listing.ctr,
              daysListed: listing.daysListed,
            },
            suggestedActions: ['PRICE_REDUCE', 'IMPROVE_TITLE', 'ADD_PHOTOS'],
            status: 'ACTIVE',
          },
        });
      }
    }

    res.json({
      success: true,
      synced: created.count,
      lowPerformersDetected: lowPerformers.length,
    });
  } catch (error) {
    logger.error('Failed to sync listings', error);
    res.status(500).json({ error: 'Failed to sync listings' });
  }
});

// GET /api/listing-performance/thresholds - 閾値設定一覧
listingPerformanceRouter.get('/thresholds', async (req, res) => {
  try {
    const { active } = req.query;

    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';

    const thresholds = await prisma.performanceThreshold.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    res.json(thresholds);
  } catch (error) {
    logger.error('Failed to get thresholds', error);
    res.status(500).json({ error: 'Failed to get thresholds' });
  }
});

// POST /api/listing-performance/thresholds - 閾値作成
listingPerformanceRouter.post('/thresholds', async (req, res) => {
  try {
    const {
      name,
      description,
      metric,
      operator = 'LESS_THAN',
      absoluteValue,
      relativePercentile,
      daysListedMin,
      actionOnMatch = 'FLAG',
      priority = 0,
    } = req.body;

    const threshold = await prisma.performanceThreshold.create({
      data: {
        organizationId: 'default',
        name,
        description,
        metric,
        operator,
        absoluteValue,
        relativePercentile,
        daysListedMin,
        actionOnMatch,
        priority,
        isActive: true,
      },
    });

    res.status(201).json(threshold);
  } catch (error) {
    logger.error('Failed to create threshold', error);
    res.status(500).json({ error: 'Failed to create threshold' });
  }
});

// PUT /api/listing-performance/thresholds/:id - 閾値更新
listingPerformanceRouter.put('/thresholds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const threshold = await prisma.performanceThreshold.update({
      where: { id },
      data: updateData,
    });

    res.json(threshold);
  } catch (error) {
    logger.error('Failed to update threshold', error);
    res.status(500).json({ error: 'Failed to update threshold' });
  }
});

// DELETE /api/listing-performance/thresholds/:id - 閾値削除
listingPerformanceRouter.delete('/thresholds/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.performanceThreshold.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete threshold', error);
    res.status(500).json({ error: 'Failed to delete threshold' });
  }
});

// GET /api/listing-performance/trends - トレンド分析
listingPerformanceRouter.get('/trends', async (req, res) => {
  try {
    const { listingId, days = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const where: any = {
      date: { gte: startDate },
    };
    if (listingId) where.listingId = listingId;

    const snapshots = await prisma.performanceSnapshot.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        listing: { select: { title: true } },
      },
    });

    // 日別集計
    const dailyStats = snapshots.reduce((acc: any, snapshot) => {
      const dateKey = snapshot.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { views: 0, watchers: 0, impressions: 0, clicks: 0, count: 0 };
      }
      acc[dateKey].views += snapshot.views;
      acc[dateKey].watchers += snapshot.watchers;
      acc[dateKey].impressions += snapshot.impressions;
      acc[dateKey].clicks += snapshot.clicks;
      acc[dateKey].count += 1;
      return acc;
    }, {});

    const trends = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      avgViews: Math.round(stats.views / stats.count),
      avgWatchers: Math.round(stats.watchers / stats.count),
      totalImpressions: stats.impressions,
      totalClicks: stats.clicks,
    }));

    res.json(trends);
  } catch (error) {
    logger.error('Failed to get trends', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// GET /api/listing-performance/category-benchmark - カテゴリベンチマーク
listingPerformanceRouter.get('/category-benchmark', async (req, res) => {
  try {
    const benchmarks = await prisma.categoryBenchmark.findMany({
      where: { organizationId: 'default' },
      orderBy: { sampleSize: 'desc' },
    });

    res.json(benchmarks);
  } catch (error) {
    logger.error('Failed to get category benchmarks', error);
    res.status(500).json({ error: 'Failed to get category benchmarks' });
  }
});

// POST /api/listing-performance/calculate-benchmarks - ベンチマーク計算
listingPerformanceRouter.post('/calculate-benchmarks', async (_req, res) => {
  try {
    // カテゴリ別に集計
    const categories = await prisma.listingPerformance.groupBy({
      by: ['categoryId', 'category'],
      _avg: {
        views: true,
        watchers: true,
        impressions: true,
        ctr: true,
        daysListed: true,
      },
      _count: true,
    });

    const benchmarks = [];
    for (const cat of categories) {
      if (!cat.categoryId) continue;

      const benchmark = await prisma.categoryBenchmark.upsert({
        where: {
          organizationId_categoryId: {
            organizationId: 'default',
            categoryId: cat.categoryId,
          },
        },
        update: {
          categoryName: cat.category || 'Unknown',
          avgViews: cat._avg.views || 0,
          avgWatchers: cat._avg.watchers || 0,
          avgImpressions: cat._avg.impressions || 0,
          avgCtr: cat._avg.ctr || 0,
          avgDaysToSell: cat._avg.daysListed || 0,
          sampleSize: cat._count,
          calculatedAt: new Date(),
        },
        create: {
          organizationId: 'default',
          categoryId: cat.categoryId,
          categoryName: cat.category || 'Unknown',
          avgViews: cat._avg.views || 0,
          avgWatchers: cat._avg.watchers || 0,
          avgImpressions: cat._avg.impressions || 0,
          avgCtr: cat._avg.ctr || 0,
          avgDaysToSell: cat._avg.daysListed || 0,
          sampleSize: cat._count,
        },
      });
      benchmarks.push(benchmark);
    }

    res.json({ success: true, benchmarks });
  } catch (error) {
    logger.error('Failed to calculate benchmarks', error);
    res.status(500).json({ error: 'Failed to calculate benchmarks' });
  }
});

// GET /api/listing-performance/flags - フラグ一覧
listingPerformanceRouter.get('/flags', async (req, res) => {
  try {
    const { status = 'ACTIVE', limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [flags, total] = await Promise.all([
      prisma.lowPerformanceFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          listing: { select: { title: true, views: true, watchers: true, price: true } },
        },
      }),
      prisma.lowPerformanceFlag.count({ where }),
    ]);

    res.json({ flags, total });
  } catch (error) {
    logger.error('Failed to get flags', error);
    res.status(500).json({ error: 'Failed to get flags' });
  }
});

// PATCH /api/listing-performance/flags/:id/dismiss - フラグ却下
listingPerformanceRouter.patch('/flags/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const flag = await prisma.lowPerformanceFlag.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
        dismissedBy: 'user',
        dismissReason: reason,
      },
    });

    res.json(flag);
  } catch (error) {
    logger.error('Failed to dismiss flag', error);
    res.status(500).json({ error: 'Failed to dismiss flag' });
  }
});

export default listingPerformanceRouter;

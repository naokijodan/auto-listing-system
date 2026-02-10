/**
 * Phase 37: データ可視化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  ChartType,
  ChartDataSource,
  DataGranularity,
  WidgetCategory,
  FeedbackTargetType,
  FeedbackType,
  FeedbackStatus,
  PredictionFeedbackType,
} from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ========================================
// グラフ設定 API
// ========================================

/**
 * グラフ設定一覧
 */
router.get('/charts', async (req: Request, res: Response) => {
  try {
    const {
      chartType,
      dataSource,
      isPublic,
      isActive,
      createdById,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (chartType) where.chartType = chartType as ChartType;
    if (dataSource) where.dataSource = dataSource as ChartDataSource;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (createdById) where.createdById = createdById;

    const [charts, total] = await Promise.all([
      prisma.chartConfig.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.chartConfig.count({ where }),
    ]);

    res.json({ charts, total });
  } catch (error) {
    console.error('Failed to list charts:', error);
    res.status(500).json({ error: 'Failed to list charts' });
  }
});

/**
 * グラフ設定取得
 */
router.get('/charts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chart = await prisma.chartConfig.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        dataPoints: {
          orderBy: { cachedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    res.json(chart);
  } catch (error) {
    console.error('Failed to get chart:', error);
    res.status(500).json({ error: 'Failed to get chart' });
  }
});

/**
 * グラフ設定作成
 */
router.post('/charts', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      chartType,
      dataSource,
      query,
      options,
      colors,
      showLegend,
      showTooltip,
      animated,
      refreshInterval,
      cacheTimeout,
      defaultFilters,
      createdById,
      isPublic,
    } = req.body;

    const chart = await prisma.chartConfig.create({
      data: {
        name,
        description,
        chartType: chartType as ChartType,
        dataSource: dataSource as ChartDataSource,
        query: query ?? {},
        options: options ?? {},
        colors: colors ?? ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        showLegend: showLegend ?? true,
        showTooltip: showTooltip ?? true,
        animated: animated ?? true,
        refreshInterval,
        cacheTimeout,
        defaultFilters: defaultFilters ?? {},
        createdById,
        isPublic: isPublic ?? false,
        isActive: true,
      },
    });

    res.status(201).json(chart);
  } catch (error) {
    console.error('Failed to create chart:', error);
    res.status(500).json({ error: 'Failed to create chart' });
  }
});

/**
 * グラフ設定更新
 */
router.patch('/charts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: Record<string, unknown> = {};

    const fields = [
      'name', 'description', 'chartType', 'dataSource', 'query',
      'options', 'colors', 'showLegend', 'showTooltip', 'animated',
      'refreshInterval', 'cacheTimeout', 'defaultFilters', 'isPublic', 'isActive',
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const chart = await prisma.chartConfig.update({
      where: { id },
      data: updateData,
    });

    res.json(chart);
  } catch (error) {
    console.error('Failed to update chart:', error);
    res.status(500).json({ error: 'Failed to update chart' });
  }
});

/**
 * グラフ設定削除
 */
router.delete('/charts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.chartConfig.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete chart:', error);
    res.status(500).json({ error: 'Failed to delete chart' });
  }
});

// ========================================
// グラフデータ API
// ========================================

/**
 * グラフデータ取得
 */
router.get('/charts/:id/data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      periodStart,
      periodEnd,
      granularity = 'DAILY',
      refresh,
    } = req.query;

    const chart = await prisma.chartConfig.findUnique({
      where: { id },
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const start = periodStart
      ? new Date(periodStart as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd
      ? new Date(periodEnd as string)
      : new Date();

    // キャッシュチェック
    if (refresh !== 'true') {
      const cached = await prisma.chartData.findFirst({
        where: {
          chartId: id,
          periodStart: { lte: start },
          periodEnd: { gte: end },
          granularity: granularity as DataGranularity,
          expiresAt: { gt: new Date() },
        },
        orderBy: { cachedAt: 'desc' },
      });

      if (cached) {
        return res.json(cached);
      }
    }

    // データ生成（簡易版）
    const cacheTimeout = chart.cacheTimeout ?? 300;
    const expiresAt = new Date(Date.now() + cacheTimeout * 1000);

    const chartData = await prisma.chartData.create({
      data: {
        chartId: id,
        periodStart: start,
        periodEnd: end,
        granularity: granularity as DataGranularity,
        labels: [],
        datasets: [],
        totalRecords: 0,
        expiresAt,
      },
    });

    res.json(chartData);
  } catch (error) {
    console.error('Failed to get chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

/**
 * グラフキャッシュクリア
 */
router.delete('/charts/:id/cache', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.chartData.deleteMany({
      where: { chartId: id },
    });

    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Failed to clear chart cache:', error);
    res.status(500).json({ error: 'Failed to clear chart cache' });
  }
});

// ========================================
// ダッシュボードグラフ API
// ========================================

/**
 * ダッシュボードのグラフ一覧
 */
router.get('/dashboards/:dashboardId/charts', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;

    const chartItems = await prisma.dashboardChartItem.findMany({
      where: { dashboardId, isVisible: true },
      include: {
        chart: true,
      },
      orderBy: { position: 'asc' },
    });

    res.json(chartItems);
  } catch (error) {
    console.error('Failed to get dashboard charts:', error);
    res.status(500).json({ error: 'Failed to get dashboard charts' });
  }
});

/**
 * ダッシュボードにグラフ追加
 */
router.post('/dashboards/:dashboardId/charts', async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { chartId, position, width, height, title, overrides } = req.body;

    const existingCount = await prisma.dashboardChartItem.count({
      where: { dashboardId },
    });

    const chartItem = await prisma.dashboardChartItem.create({
      data: {
        dashboardId,
        chartId,
        position: position ?? existingCount,
        width: width ?? 6,
        height: height ?? 4,
        title,
        overrides: overrides ?? {},
        isVisible: true,
      },
      include: {
        chart: true,
      },
    });

    res.status(201).json(chartItem);
  } catch (error) {
    console.error('Failed to add chart to dashboard:', error);
    res.status(500).json({ error: 'Failed to add chart to dashboard' });
  }
});

/**
 * ダッシュボードグラフ更新
 */
router.patch('/dashboard-charts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position, width, height, title, overrides, isVisible } = req.body;

    const data: Record<string, unknown> = {};
    if (position !== undefined) data.position = position;
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;
    if (title !== undefined) data.title = title;
    if (overrides !== undefined) data.overrides = overrides;
    if (isVisible !== undefined) data.isVisible = isVisible;

    const chartItem = await prisma.dashboardChartItem.update({
      where: { id },
      data,
    });

    res.json(chartItem);
  } catch (error) {
    console.error('Failed to update dashboard chart:', error);
    res.status(500).json({ error: 'Failed to update dashboard chart' });
  }
});

/**
 * ダッシュボードからグラフ削除
 */
router.delete('/dashboard-charts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.dashboardChartItem.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to remove chart from dashboard:', error);
    res.status(500).json({ error: 'Failed to remove chart from dashboard' });
  }
});

// ========================================
// ウィジェットプリセット API
// ========================================

/**
 * プリセット一覧
 */
router.get('/widget-presets', async (req: Request, res: Response) => {
  try {
    const { category, isPublic, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category as WidgetCategory;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';

    const [presets, total] = await Promise.all([
      prisma.widgetPreset.findMany({
        where,
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.widgetPreset.count({ where }),
    ]);

    res.json({ presets, total });
  } catch (error) {
    console.error('Failed to list widget presets:', error);
    res.status(500).json({ error: 'Failed to list widget presets' });
  }
});

/**
 * プリセット作成
 */
router.post('/widget-presets', async (req: Request, res: Response) => {
  try {
    const { name, description, category, widgetType, config, thumbnail, isSystem, isPublic } = req.body;

    const preset = await prisma.widgetPreset.create({
      data: {
        name,
        description,
        category: category as WidgetCategory,
        widgetType,
        config: config ?? {},
        thumbnail,
        isSystem: isSystem ?? false,
        isPublic: isPublic ?? true,
      },
    });

    res.status(201).json(preset);
  } catch (error) {
    console.error('Failed to create widget preset:', error);
    res.status(500).json({ error: 'Failed to create widget preset' });
  }
});

/**
 * プリセット使用
 */
router.post('/widget-presets/:id/use', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const preset = await prisma.widgetPreset.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    res.json(preset);
  } catch (error) {
    console.error('Failed to use widget preset:', error);
    res.status(500).json({ error: 'Failed to use widget preset' });
  }
});

// ========================================
// フィードバック API
// ========================================

/**
 * フィードバック一覧
 */
router.get('/feedbacks', async (req: Request, res: Response) => {
  try {
    const {
      targetType,
      targetId,
      feedbackType,
      status,
      userId,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (targetType) where.targetType = targetType as FeedbackTargetType;
    if (targetId) where.targetId = targetId;
    if (feedbackType) where.feedbackType = feedbackType as FeedbackType;
    if (status) where.status = status as FeedbackStatus;
    if (userId) where.userId = userId;

    const [feedbacks, total] = await Promise.all([
      prisma.userFeedback.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.userFeedback.count({ where }),
    ]);

    res.json({ feedbacks, total });
  } catch (error) {
    console.error('Failed to list feedbacks:', error);
    res.status(500).json({ error: 'Failed to list feedbacks' });
  }
});

/**
 * フィードバック作成
 */
router.post('/feedbacks', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      sessionId,
      targetType,
      targetId,
      feedbackType,
      rating,
      comment,
      context,
      userAgent,
      ipAddress,
    } = req.body;

    const feedback = await prisma.userFeedback.create({
      data: {
        userId,
        sessionId,
        targetType: targetType as FeedbackTargetType,
        targetId,
        feedbackType: feedbackType as FeedbackType,
        rating,
        comment,
        context: context ?? {},
        userAgent,
        ipAddress,
        status: 'NEW',
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Failed to create feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

/**
 * フィードバックステータス更新
 */
router.patch('/feedbacks/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolvedBy } = req.body;

    const feedback = await prisma.userFeedback.update({
      where: { id },
      data: {
        status: status as FeedbackStatus,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
        resolvedBy,
      },
    });

    res.json(feedback);
  } catch (error) {
    console.error('Failed to update feedback status:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// ========================================
// 予測フィードバック API
// ========================================

/**
 * 予測フィードバック作成
 */
router.post('/prediction-feedbacks', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      predictionType,
      predictionId,
      isHelpful,
      actualOutcome,
      comment,
      predictedValue,
      actualValue,
    } = req.body;

    // 精度計算
    let accuracy: number | undefined;
    if (predictedValue !== undefined && actualValue !== undefined) {
      const diff = Math.abs(predictedValue - actualValue);
      accuracy = 1 - diff / Math.max(predictedValue, actualValue, 1);
    }

    const feedback = await prisma.predictionFeedback.create({
      data: {
        userId,
        predictionType: predictionType as PredictionFeedbackType,
        predictionId,
        isHelpful,
        actualOutcome,
        comment,
        predictedValue,
        actualValue,
        accuracy,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Failed to create prediction feedback:', error);
    res.status(500).json({ error: 'Failed to create prediction feedback' });
  }
});

/**
 * 予測フィードバック統計
 */
router.get('/prediction-feedbacks/stats', async (req: Request, res: Response) => {
  try {
    const { predictionType } = req.query;

    if (!predictionType) {
      return res.status(400).json({ error: 'predictionType is required' });
    }

    const feedbacks = await prisma.predictionFeedback.findMany({
      where: { predictionType: predictionType as PredictionFeedbackType },
      select: {
        isHelpful: true,
        accuracy: true,
      },
    });

    const total = feedbacks.length;
    const helpful = feedbacks.filter((f) => f.isHelpful).length;
    const notHelpful = total - helpful;
    const helpfulRate = total > 0 ? helpful / total : 0;

    const accuracies = feedbacks
      .map((f) => f.accuracy)
      .filter((a): a is number => a !== null);
    const averageAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
        : null;

    res.json({
      total,
      helpful,
      notHelpful,
      helpfulRate,
      averageAccuracy,
    });
  } catch (error) {
    console.error('Failed to get prediction feedback stats:', error);
    res.status(500).json({ error: 'Failed to get prediction feedback stats' });
  }
});

export default router;

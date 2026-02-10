import { Router } from 'express';
import { prisma, WidgetType, KpiType, KpiPeriodType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'dashboards' });

/**
 * ダッシュボード一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId, isPublic } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';

    const dashboards = await prisma.dashboard.findMany({
      where,
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: dashboards.map(d => ({
        ...d,
        widgetCount: d._count.items,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード詳細取得（スラッグ）
 */
router.get('/by-slug/:slug', async (req, res, next) => {
  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { slug: req.params.slug },
      include: {
        items: {
          include: {
            widget: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!dashboard) {
      throw new AppError(404, 'Dashboard not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード詳細取得（ID）
 */
router.get('/:id', async (req, res, next) => {
  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            widget: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!dashboard) {
      throw new AppError(404, 'Dashboard not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード作成
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, slug, userId, isDefault = false, isPublic = false } = req.body;

    if (!name || !slug) {
      throw new AppError(400, 'name and slug are required', 'INVALID_INPUT');
    }

    // スラッグの重複チェック
    const existing = await prisma.dashboard.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new AppError(409, 'Slug already exists', 'CONFLICT');
    }

    // デフォルトダッシュボードの場合、既存のデフォルトを解除
    if (isDefault) {
      await prisma.dashboard.updateMany({
        where: { isDefault: true, userId },
        data: { isDefault: false },
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name,
        description,
        slug,
        userId,
        isDefault,
        isPublic,
      },
    });

    log.info({ dashboardId: dashboard.id, slug }, 'Dashboard created');

    res.status(201).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, description, isDefault, isPublic, layout, theme } = req.body;

    const existing = await prisma.dashboard.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'Dashboard not found', 'NOT_FOUND');
    }

    // デフォルトダッシュボードの場合、既存のデフォルトを解除
    if (isDefault) {
      await prisma.dashboard.updateMany({
        where: { isDefault: true, userId: existing.userId, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const dashboard = await prisma.dashboard.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isPublic !== undefined && { isPublic }),
        ...(layout !== undefined && { layout }),
        ...(theme !== undefined && { theme }),
      },
    });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボード削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.dashboard.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Dashboard deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボードにウィジェットを追加
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const { widgetId, x = 0, y = 0, width = 4, height = 3, customTitle, customOptions } = req.body;

    if (!widgetId) {
      throw new AppError(400, 'widgetId is required', 'INVALID_INPUT');
    }

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: req.params.id },
    });

    if (!dashboard) {
      throw new AppError(404, 'Dashboard not found', 'NOT_FOUND');
    }

    const widget = await prisma.dashboardWidget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      throw new AppError(404, 'Widget not found', 'NOT_FOUND');
    }

    // 最大orderを取得
    const maxOrder = await prisma.dashboardItem.aggregate({
      where: { dashboardId: req.params.id },
      _max: { order: true },
    });

    const item = await prisma.dashboardItem.create({
      data: {
        dashboardId: req.params.id,
        widgetId,
        x,
        y,
        width,
        height,
        customTitle,
        customOptions: (customOptions || {}) as any,
        order: (maxOrder._max.order || 0) + 1,
      },
      include: { widget: true },
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボードアイテム更新
 */
router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { x, y, width, height, customTitle, customOptions, order } = req.body;

    const item = await prisma.dashboardItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(customTitle !== undefined && { customTitle }),
        ...(customOptions !== undefined && { customOptions: customOptions as any }),
        ...(order !== undefined && { order }),
      },
      include: { widget: true },
    });

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ダッシュボードアイテム削除
 */
router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    await prisma.dashboardItem.delete({
      where: { id: req.params.itemId },
    });

    res.json({
      success: true,
      message: 'Item removed from dashboard',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ウィジェット一覧取得
 */
router.get('/widgets/all', async (req, res, next) => {
  try {
    const { widgetType, isActive } = req.query;

    const where: any = {};
    if (widgetType) where.widgetType = widgetType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const widgets = await prisma.dashboardWidget.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    res.json({
      success: true,
      data: widgets,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ウィジェット詳細取得
 */
router.get('/widgets/:widgetId', async (req, res, next) => {
  try {
    const widget = await prisma.dashboardWidget.findUnique({
      where: { id: req.params.widgetId },
    });

    if (!widget) {
      throw new AppError(404, 'Widget not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ウィジェット作成
 */
router.post('/widgets', async (req, res, next) => {
  try {
    const {
      name,
      description,
      widgetType,
      title,
      subtitle,
      icon,
      color,
      dataSource,
      query,
      aggregation,
      timeRange,
      displayOptions,
      refreshInterval,
      thresholds,
    } = req.body;

    if (!name || !widgetType || !title || !dataSource) {
      throw new AppError(400, 'name, widgetType, title, and dataSource are required', 'INVALID_INPUT');
    }

    // ウィジェットタイプを検証
    const validTypes = Object.values(WidgetType);
    if (!validTypes.includes(widgetType)) {
      throw new AppError(400, `Invalid widget type: ${widgetType}`, 'INVALID_INPUT');
    }

    const widget = await prisma.dashboardWidget.create({
      data: {
        name,
        description,
        widgetType,
        title,
        subtitle,
        icon,
        color,
        dataSource,
        query: (query || {}) as any,
        aggregation,
        timeRange,
        displayOptions: (displayOptions || {}) as any,
        refreshInterval,
        thresholds: (thresholds || []) as any,
      },
    });

    log.info({ widgetId: widget.id, name, widgetType }, 'Widget created');

    res.status(201).json({
      success: true,
      data: widget,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ウィジェット更新
 */
router.patch('/widgets/:widgetId', async (req, res, next) => {
  try {
    const existing = await prisma.dashboardWidget.findUnique({
      where: { id: req.params.widgetId },
    });

    if (!existing) {
      throw new AppError(404, 'Widget not found', 'NOT_FOUND');
    }

    if (existing.isSystem) {
      throw new AppError(403, 'Cannot modify system widget', 'FORBIDDEN');
    }

    const {
      name, title, subtitle, icon, color, dataSource,
      query, timeRange, displayOptions, refreshInterval, thresholds, isActive,
    } = req.body;

    const widget = await prisma.dashboardWidget.update({
      where: { id: req.params.widgetId },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(dataSource !== undefined && { dataSource }),
        ...(query !== undefined && { query: query as any }),
        ...(timeRange !== undefined && { timeRange }),
        ...(displayOptions !== undefined && { displayOptions: displayOptions as any }),
        ...(refreshInterval !== undefined && { refreshInterval }),
        ...(thresholds !== undefined && { thresholds: thresholds as any }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ウィジェットデータ取得
 */
router.get('/widgets/:widgetId/data', async (req, res, next) => {
  try {
    const widget = await prisma.dashboardWidget.findUnique({
      where: { id: req.params.widgetId },
    });

    if (!widget) {
      throw new AppError(404, 'Widget not found', 'NOT_FOUND');
    }

    // キャッシュチェック
    const cached = await prisma.widgetData.findUnique({
      where: {
        widgetType_dataKey: {
          widgetType: widget.widgetType,
          dataKey: req.params.widgetId,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      res.json({
        success: true,
        data: {
          value: cached.value,
          metadata: cached.metadata,
          calculatedAt: cached.calculatedAt,
          cached: true,
        },
      });
      return;
    }

    // キャッシュがない場合は再計算が必要（実際はworkerで計算）
    res.json({
      success: true,
      data: {
        value: null,
        message: 'Data is being calculated. Please retry in a few seconds.',
        cached: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * KPIスナップショット取得
 */
router.get('/kpi/:kpiType', async (req, res, next) => {
  try {
    const { kpiType } = req.params;
    const { periodType = 'DAILY', limit = '30' } = req.query;

    // KPIタイプを検証
    const validKpiTypes = Object.values(KpiType);
    if (!validKpiTypes.includes(kpiType as KpiType)) {
      throw new AppError(400, `Invalid KPI type: ${kpiType}`, 'INVALID_INPUT');
    }

    const snapshots = await prisma.kpiSnapshot.findMany({
      where: {
        kpiType: kpiType as KpiType,
        periodType: periodType as KpiPeriodType,
      },
      orderBy: { periodStart: 'desc' },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なウィジェットタイプ一覧
 */
router.get('/meta/widget-types', async (_req, res, next) => {
  try {
    const widgetTypes = Object.values(WidgetType);
    const kpiTypes = Object.values(KpiType);
    const periodTypes = Object.values(KpiPeriodType);

    res.json({
      success: true,
      data: {
        widgetTypes,
        kpiTypes,
        periodTypes,
        dataSources: [
          'orders.count',
          'orders.revenue',
          'orders.byStatus',
          'listings.active',
          'listings.byMarketplace',
          'products.count',
          'products.byStatus',
          'inventory.outOfStock',
          'sales.topProducts',
          'sales.byCategory',
          'api.requests',
          'api.errorRate',
          'system.alerts',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デフォルトウィジェット初期化
 */
router.post('/widgets/initialize', async (req, res, next) => {
  try {
    const defaultWidgets = [
      {
        name: 'total_orders',
        widgetType: 'METRIC' as WidgetType,
        title: '注文数',
        icon: 'shopping-cart',
        color: '#3B82F6',
        dataSource: 'orders.count',
        timeRange: 'last_24h',
        isSystem: true,
      },
      {
        name: 'total_revenue',
        widgetType: 'METRIC' as WidgetType,
        title: '売上',
        icon: 'dollar-sign',
        color: '#10B981',
        dataSource: 'orders.revenue',
        timeRange: 'last_24h',
        isSystem: true,
      },
      {
        name: 'active_listings',
        widgetType: 'COUNTER' as WidgetType,
        title: 'アクティブ出品数',
        icon: 'list',
        color: '#8B5CF6',
        dataSource: 'listings.active',
        isSystem: true,
      },
      {
        name: 'out_of_stock',
        widgetType: 'GAUGE' as WidgetType,
        title: '在庫切れ',
        icon: 'alert-triangle',
        color: '#EF4444',
        dataSource: 'inventory.outOfStock',
        isSystem: true,
      },
      {
        name: 'orders_by_status',
        widgetType: 'PIE_CHART' as WidgetType,
        title: '注文ステータス別',
        dataSource: 'orders.byStatus',
        timeRange: 'last_7d',
        isSystem: true,
      },
      {
        name: 'top_products',
        widgetType: 'LEADERBOARD' as WidgetType,
        title: 'トップ商品',
        dataSource: 'sales.topProducts',
        timeRange: 'last_7d',
        isSystem: true,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const widgetDef of defaultWidgets) {
      const existing = await prisma.dashboardWidget.findFirst({
        where: { name: widgetDef.name },
      });

      if (!existing) {
        await prisma.dashboardWidget.create({
          data: widgetDef,
        });
        created++;
      } else {
        skipped++;
      }
    }

    log.info({ created, skipped }, 'Default widgets initialized');

    res.json({
      success: true,
      data: { created, skipped },
      message: `Created ${created} widgets, skipped ${skipped} existing`,
    });
  } catch (error) {
    next(error);
  }
});

export { router as dashboardsRouter };

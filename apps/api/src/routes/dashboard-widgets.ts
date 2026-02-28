
/**
 * ダッシュボードウィジェットAPI
 * Phase 70: カスタマイズ可能なダッシュボードウィジェット
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'dashboard-widgets' });

// ウィジェットタイプ定義
const WIDGET_TYPES = {
  SALES_SUMMARY: {
    name: '売上サマリー',
    description: '今日・今週・今月の売上を表示',
    defaultConfig: { period: 'today' },
    minWidth: 2,
    minHeight: 1,
  },
  ORDER_STATUS: {
    name: '注文ステータス',
    description: '注文のステータス別集計',
    defaultConfig: {},
    minWidth: 2,
    minHeight: 2,
  },
  INVENTORY_ALERT: {
    name: '在庫アラート',
    description: '在庫切れ・在庫僅少の商品',
    defaultConfig: { limit: 5 },
    minWidth: 2,
    minHeight: 2,
  },
  RECENT_ORDERS: {
    name: '最近の注文',
    description: '直近の注文一覧',
    defaultConfig: { limit: 5 },
    minWidth: 2,
    minHeight: 2,
  },
  TOP_PRODUCTS: {
    name: '人気商品',
    description: '売れ筋商品ランキング',
    defaultConfig: { limit: 5, period: 'week' },
    minWidth: 2,
    minHeight: 2,
  },
  PROFIT_CHART: {
    name: '利益チャート',
    description: '利益推移グラフ',
    defaultConfig: { period: '30d' },
    minWidth: 3,
    minHeight: 2,
  },
  MARKETPLACE_COMPARISON: {
    name: 'マーケットプレイス比較',
    description: 'Joom/eBayの売上比較',
    defaultConfig: { period: 'month' },
    minWidth: 2,
    minHeight: 2,
  },
  SHIPMENT_STATUS: {
    name: '発送ステータス',
    description: '未発送・発送済みの件数',
    defaultConfig: {},
    minWidth: 2,
    minHeight: 1,
  },
  FORECAST_SUMMARY: {
    name: '売上予測',
    description: '今後30日の売上予測',
    defaultConfig: { forecastDays: 30 },
    minWidth: 2,
    minHeight: 2,
  },
  JOB_QUEUE_STATUS: {
    name: 'ジョブキュー',
    description: 'バックグラウンドジョブの状態',
    defaultConfig: {},
    minWidth: 2,
    minHeight: 1,
  },
  QUICK_ACTIONS: {
    name: 'クイックアクション',
    description: 'よく使う操作へのショートカット',
    defaultConfig: { actions: ['new_product', 'view_orders', 'shipments'] },
    minWidth: 2,
    minHeight: 1,
  },
  CUSTOM: {
    name: 'カスタム',
    description: 'カスタムウィジェット',
    defaultConfig: {},
    minWidth: 1,
    minHeight: 1,
  },
};

/**
 * ウィジェットタイプ一覧を取得
 * GET /api/dashboard-widgets/types
 */
router.get('/types', async (_req, res) => {
  const types = Object.entries(WIDGET_TYPES).map(([key, value]) => ({
    type: key,
    ...value,
  }));

  res.json({
    success: true,
    data: types,
  });
});

/**
 * ウィジェット一覧を取得
 * GET /api/dashboard-widgets
 */
router.get('/', async (req, res, next) => {
  try {
    const { isActive } = req.query;

    const widgets = await prisma.dashboardWidget.findMany({
      where: {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      orderBy: [
        { createdAt: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: widgets,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get widgets');
    next(error);
  }
});

/**
 * ウィジェットを作成
 * POST /api/dashboard-widgets
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      widgetType,
      description,
      title,
      dataSource = 'default',
      query = {},
      displayOptions = {},
      refreshInterval = 300,
    } = req.body;

    // タイプ検証
    const typeKey = widgetType || 'METRIC';

    const widget = await prisma.dashboardWidget.create({
      data: {
        name: name || 'New Widget',
        widgetType: typeKey,
        title: title || name || 'Widget',
        description,
        dataSource,
        query,
        displayOptions,
        refreshInterval,
      },
    });

    log.info({ widgetId: widget.id, widgetType: widget.widgetType }, 'Widget created');

    res.status(201).json({
      success: true,
      data: widget,
    });
  } catch (error) {
    log.error({ error }, 'Failed to create widget');
    next(error);
  }
});

/**
 * ウィジェットを更新
 * PATCH /api/dashboard-widgets/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      title,
      description,
      dataSource,
      query,
      displayOptions,
      refreshInterval,
      isActive,
    } = req.body;

    const existing = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'Widget not found', 'WIDGET_NOT_FOUND');
    }

    const widget = await prisma.dashboardWidget.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dataSource !== undefined && { dataSource }),
        ...(query !== undefined && { query }),
        ...(displayOptions !== undefined && { displayOptions }),
        ...(refreshInterval !== undefined && { refreshInterval }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    log.info({ widgetId: id }, 'Widget updated');

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    log.error({ error }, 'Failed to update widget');
    next(error);
  }
});

/**
 * ウィジェットを削除
 * DELETE /api/dashboard-widgets/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'Widget not found', 'WIDGET_NOT_FOUND');
    }

    await prisma.dashboardWidget.delete({
      where: { id },
    });

    log.info({ widgetId: id }, 'Widget deleted');

    res.json({
      success: true,
      message: 'Widget deleted',
    });
  } catch (error) {
    log.error({ error }, 'Failed to delete widget');
    next(error);
  }
});

/**
 * ウィジェットの順序を一括更新(displayOptionsで管理)
 * PATCH /api/dashboard-widgets/reorder
 */
router.patch('/reorder', async (req, res, next) => {
  try {
    const { widgets } = req.body; // [{id, displayOptions}]

    if (!Array.isArray(widgets)) {
      throw new AppError(400, 'widgets must be an array', 'INVALID_INPUT');
    }

    // トランザクションで一括更新
    await prisma.$transaction(
      widgets.map((w: { id: string; displayOptions?: Record<string, unknown> }) =>
        prisma.dashboardWidget.update({
          where: { id: w.id },
          data: {
            ...(w.displayOptions !== undefined && { displayOptions: w.displayOptions as any }),
          },
        })
      )
    );

    log.info({ count: widgets.length }, 'Widgets reordered');

    res.json({
      success: true,
      message: `${widgets.length} widgets reordered`,
    });
  } catch (error) {
    log.error({ error }, 'Failed to reorder widgets');
    next(error);
  }
});

/**
 * ウィジェットデータを取得
 * GET /api/dashboard-widgets/:id/data
 */
router.get('/:id/data', async (req, res, next) => {
  try {
    const { id } = req.params;

    const widget = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!widget) {
      throw new AppError(404, 'Widget not found', 'WIDGET_NOT_FOUND');
    }

    // ウィジェットタイプに応じてデータを取得
    const data = await getWidgetData(widget.widgetType, widget.query as Record<string, unknown>);

    res.json({
      success: true,
      data: {
        widget,
        content: data,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get widget data');
    next(error);
  }
});

/**
 * 全ウィジェットのデータを一括取得
 * GET /api/dashboard-widgets/data/all
 */
router.get('/data/all', async (req, res, next) => {
  try {
    const widgets = await prisma.dashboardWidget.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const widgetData = await Promise.all(
      widgets.map(async (widget) => {
        try {
          const content = await getWidgetData(widget.widgetType, widget.query as Record<string, unknown>);
          return {
            id: widget.id,
            widgetType: widget.widgetType,
            name: widget.name,
            title: widget.title,
            content,
            error: null,
          };
        } catch (error) {
          return {
            id: widget.id,
            widgetType: widget.widgetType,
            name: widget.name,
            title: widget.title,
            content: null,
            error: (error as Error).message,
          };
        }
      })
    );

    res.json({
      success: true,
      data: widgetData,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error({ error }, 'Failed to get all widget data');
    next(error);
  }
});

/**
 * デフォルトウィジェットをセットアップ
 * POST /api/dashboard-widgets/setup-defaults
 */
router.post('/setup-defaults', async (req, res, next) => {
  try {
    // 既存のシステムウィジェットを削除
    await prisma.dashboardWidget.deleteMany({
      where: { isSystem: true },
    });

    // デフォルトウィジェットを作成
    const defaultWidgets = [
      { widgetType: 'METRIC' as const, dataSource: 'sales_summary', title: '売上サマリー' },
      { widgetType: 'TABLE' as const, dataSource: 'order_status', title: '注文ステータス' },
      { widgetType: 'LIST' as const, dataSource: 'recent_orders', title: '最近の注文' },
      { widgetType: 'TABLE' as const, dataSource: 'top_products', title: '人気商品' },
      { widgetType: 'COUNTER' as const, dataSource: 'shipment_status', title: '発送ステータス' },
      { widgetType: 'METRIC' as const, dataSource: 'forecast_summary', title: '売上予測' },
      { widgetType: 'LIST' as const, dataSource: 'inventory_alert', title: '在庫アラート' },
      { widgetType: 'COUNTER' as const, dataSource: 'job_queue_status', title: 'ジョブキュー' },
    ];

    const widgets = await prisma.$transaction(
      defaultWidgets.map((w) => {
        return prisma.dashboardWidget.create({
          data: {
            name: w.title,
            widgetType: w.widgetType,
            title: w.title,
            dataSource: w.dataSource,
            isSystem: true,
          },
        });
      })
    );

    log.info({ count: widgets.length }, 'Default widgets created');

    res.json({
      success: true,
      data: widgets,
      message: `${widgets.length} default widgets created`,
    });
  } catch (error) {
    log.error({ error }, 'Failed to setup default widgets');
    next(error);
  }
});

// ウィジェットタイプに応じたデータ取得
async function getWidgetData(
  type: string,
  config: Record<string, unknown>
): Promise<unknown> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (type) {
    case 'SALES_SUMMARY': {
      const [todaySales, weekSales, monthSales] = await Promise.all([
        prisma.sale.aggregate({
          _sum: { totalPrice: true },
          _count: true,
          where: { createdAt: { gte: today } },
        }),
        prisma.sale.aggregate({
          _sum: { totalPrice: true },
          _count: true,
          where: { createdAt: { gte: weekAgo } },
        }),
        prisma.sale.aggregate({
          _sum: { totalPrice: true },
          _count: true,
          where: { createdAt: { gte: monthAgo } },
        }),
      ]);

      return {
        today: {
          revenue: todaySales._sum.totalPrice || 0,
          orders: todaySales._count,
        },
        week: {
          revenue: weekSales._sum.totalPrice || 0,
          orders: weekSales._count,
        },
        month: {
          revenue: monthSales._sum.totalPrice || 0,
          orders: monthSales._count,
        },
      };
    }

    case 'ORDER_STATUS': {
      const orders = await prisma.order.groupBy({
        by: ['status'],
        _count: true,
      });

      return orders.reduce((acc, o) => {
        acc[o.status] = o._count;
        return acc;
      }, {} as Record<string, number>);
    }

    case 'INVENTORY_ALERT': {
      const limit = (config.limit as number) || 5;
      const alerts = await prisma.inventoryAlert.findMany({
        where: {
          alertType: { in: ['STOCK_OUT', 'STOCK_LOW'] },
          createdAt: { gte: weekAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          alertType: true,
          severity: true,
          reason: true,
          productId: true,
          createdAt: true,
        },
      });

      return alerts;
    }

    case 'RECENT_ORDERS': {
      const limit = (config.limit as number) || 5;
      const orders = await prisma.order.findMany({
        orderBy: { orderedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          marketplace: true,
          marketplaceOrderId: true,
          buyerUsername: true,
          total: true,
          currency: true,
          status: true,
          orderedAt: true,
        },
      });

      return orders;
    }

    case 'TOP_PRODUCTS': {
      const limit = (config.limit as number) || 5;
      const period = config.period === 'month' ? monthAgo : weekAgo;

      const topProducts = await prisma.sale.groupBy({
        by: ['productId', 'title'],
        _sum: { totalPrice: true, quantity: true },
        _count: true,
        where: {
          createdAt: { gte: period },
          productId: { not: null },
        },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: limit,
      });

      return topProducts.map(p => ({
        productId: p.productId,
        title: p.title,
        revenue: p._sum.totalPrice || 0,
        quantity: p._sum.quantity || 0,
        orders: p._count,
      }));
    }

    case 'SHIPMENT_STATUS': {
      const [pending, urgent, shipped] = await Promise.all([
        prisma.order.count({
          where: { fulfillmentStatus: 'UNFULFILLED' },
        }),
        prisma.order.count({
          where: {
            fulfillmentStatus: 'UNFULFILLED',
            orderedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.order.count({
          where: {
            fulfillmentStatus: 'FULFILLED',
            shippedAt: { gte: today },
          },
        }),
      ]);

      return { pending, urgent, shippedToday: shipped };
    }

    case 'JOB_QUEUE_STATUS': {
      const jobs = await prisma.jobLog.groupBy({
        by: ['queueName', 'status'],
        _count: true,
        where: { createdAt: { gte: today } },
      });

      const byQueue: Record<string, Record<string, number>> = {};
      jobs.forEach(j => {
        if (!byQueue[j.queueName]) {
          byQueue[j.queueName] = {};
        }
        byQueue[j.queueName][j.status] = j._count;
      });

      return byQueue;
    }

    case 'FORECAST_SUMMARY': {
      // 簡易予測サマリー
      const recentSales = await prisma.sale.aggregate({
        _sum: { totalPrice: true },
        _count: true,
        where: { createdAt: { gte: weekAgo } },
      });

      const dailyAvg = (recentSales._sum.totalPrice || 0) / 7;
      const forecastDays = (config.forecastDays as number) || 30;

      return {
        dailyAverage: Math.round(dailyAvg * 100) / 100,
        forecast30d: Math.round(dailyAvg * forecastDays * 100) / 100,
        trend: dailyAvg > 0 ? 'stable' : 'no_data',
      };
    }

    case 'MARKETPLACE_COMPARISON': {
      const period = config.period === 'week' ? weekAgo : monthAgo;

      const sales = await prisma.order.groupBy({
        by: ['marketplace'],
        _sum: { total: true },
        _count: true,
        where: { orderedAt: { gte: period } },
      });

      return sales.reduce((acc, s) => {
        acc[s.marketplace] = {
          revenue: s._sum.total || 0,
          orders: s._count,
        };
        return acc;
      }, {} as Record<string, { revenue: number; orders: number }>);
    }

    case 'QUICK_ACTIONS': {
      const actions = (config.actions as string[]) || [];
      return {
        actions: actions.map(a => ({
          id: a,
          label: getActionLabel(a),
          href: getActionHref(a),
        })),
      };
    }

    default:
      return { message: 'No data available for this widget type' };
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    new_product: '商品追加',
    view_orders: '注文一覧',
    shipments: '発送処理',
    reports: 'レポート',
    settings: '設定',
    inventory: '在庫管理',
  };
  return labels[action] || action;
}

function getActionHref(action: string): string {
  const hrefs: Record<string, string> = {
    new_product: '/products/new',
    view_orders: '/orders',
    shipments: '/shipments',
    reports: '/reports',
    settings: '/settings',
    inventory: '/inventory',
  };
  return hrefs[action] || '/';
}

export { router as dashboardWidgetsRouter };

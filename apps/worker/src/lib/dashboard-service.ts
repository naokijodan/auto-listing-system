import { prisma, WidgetType, KpiType, KpiPeriodType } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'dashboard-service' });

// キャッシュTTL（秒）
const CACHE_TTL: Record<WidgetType, number> = {
  METRIC: 60,
  COUNTER: 30,
  GAUGE: 60,
  PROGRESS: 30,
  LINE_CHART: 300,
  BAR_CHART: 300,
  PIE_CHART: 300,
  AREA_CHART: 300,
  TABLE: 120,
  LIST: 120,
  LEADERBOARD: 300,
  MAP: 600,
  HEATMAP: 600,
  TIMELINE: 120,
  STATUS: 30,
  ALERT: 30,
};

interface WidgetDataResult {
  value: any;
  metadata?: Record<string, any>;
  calculatedAt: Date;
}

/**
 * ダッシュボードを作成
 */
export async function createDashboard(options: {
  name: string;
  description?: string;
  slug: string;
  userId?: string;
  isDefault?: boolean;
  isPublic?: boolean;
}): Promise<{ id: string; slug: string }> {
  const dashboard = await prisma.dashboard.create({
    data: {
      name: options.name,
      description: options.description,
      slug: options.slug,
      userId: options.userId,
      isDefault: options.isDefault ?? false,
      isPublic: options.isPublic ?? false,
    },
  });

  log.info({ dashboardId: dashboard.id, slug: dashboard.slug }, 'Dashboard created');

  return { id: dashboard.id, slug: dashboard.slug };
}

/**
 * ウィジェットを作成
 */
export async function createWidget(options: {
  name: string;
  description?: string;
  widgetType: WidgetType;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  dataSource: string;
  query?: Record<string, any>;
  aggregation?: string;
  timeRange?: string;
  displayOptions?: Record<string, any>;
  refreshInterval?: number;
  thresholds?: Array<{ value: number; color: string; label: string }>;
}): Promise<{ id: string }> {
  const widget = await prisma.dashboardWidget.create({
    data: {
      name: options.name,
      description: options.description,
      widgetType: options.widgetType,
      title: options.title,
      subtitle: options.subtitle,
      icon: options.icon,
      color: options.color,
      dataSource: options.dataSource,
      query: (options.query || {}) as any,
      aggregation: options.aggregation,
      timeRange: options.timeRange,
      displayOptions: (options.displayOptions || {}) as any,
      refreshInterval: options.refreshInterval || CACHE_TTL[options.widgetType],
      thresholds: (options.thresholds || []) as any,
    },
  });

  log.info({ widgetId: widget.id, name: widget.name, type: widget.widgetType }, 'Widget created');

  return { id: widget.id };
}

/**
 * ウィジェットデータを取得（キャッシュ付き）
 */
export async function getWidgetData(widgetId: string): Promise<WidgetDataResult> {
  const widget = await prisma.dashboardWidget.findUnique({
    where: { id: widgetId },
  });

  if (!widget) {
    throw new Error(`Widget not found: ${widgetId}`);
  }

  // キャッシュチェック
  const cached = await prisma.widgetData.findUnique({
    where: {
      widgetType_dataKey: {
        widgetType: widget.widgetType,
        dataKey: widgetId,
      },
    },
  });

  if (cached && cached.expiresAt > new Date()) {
    return {
      value: cached.value,
      metadata: cached.metadata as Record<string, any>,
      calculatedAt: cached.calculatedAt,
    };
  }

  // データを計算
  const result = await calculateWidgetData(widget);

  // キャッシュに保存
  const ttl = widget.refreshInterval || CACHE_TTL[widget.widgetType];
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + ttl);

  await prisma.widgetData.upsert({
    where: {
      widgetType_dataKey: {
        widgetType: widget.widgetType,
        dataKey: widgetId,
      },
    },
    update: {
      value: result.value as any,
      metadata: (result.metadata || {}) as any,
      calculatedAt: new Date(),
      expiresAt,
    },
    create: {
      widgetType: widget.widgetType,
      dataKey: widgetId,
      value: result.value as any,
      metadata: (result.metadata || {}) as any,
      expiresAt,
    },
  });

  return result;
}

/**
 * ウィジェットデータを計算
 */
async function calculateWidgetData(widget: any): Promise<WidgetDataResult> {
  const dataSource = widget.dataSource;
  const query = widget.query as Record<string, any>;
  const timeRange = widget.timeRange || 'last_24h';

  const { startDate, endDate } = getTimeRange(timeRange);

  switch (dataSource) {
    case 'orders.count':
      return calculateOrderCount(startDate, endDate, query);

    case 'orders.revenue':
      return calculateRevenue(startDate, endDate, query);

    case 'orders.byStatus':
      return calculateOrdersByStatus(startDate, endDate);

    case 'listings.active':
      return calculateActiveListings();

    case 'listings.byMarketplace':
      return calculateListingsByMarketplace();

    case 'products.count':
      return calculateProductCount(query);

    case 'products.byStatus':
      return calculateProductsByStatus();

    case 'inventory.outOfStock':
      return calculateOutOfStock();

    case 'sales.topProducts':
      return calculateTopProducts(startDate, endDate, query.limit || 10);

    case 'sales.byCategory':
      return calculateSalesByCategory(startDate, endDate);

    case 'api.requests':
      return calculateApiRequests(startDate, endDate);

    case 'api.errorRate':
      return calculateApiErrorRate(startDate, endDate);

    case 'system.alerts':
      return getRecentAlerts(query.limit || 10);

    default:
      return { value: null, calculatedAt: new Date() };
  }
}

// データ計算関数

async function calculateOrderCount(
  startDate: Date,
  endDate: Date,
  query: Record<string, any>
): Promise<WidgetDataResult> {
  const where: any = {
    orderedAt: { gte: startDate, lte: endDate },
  };

  if (query.marketplace) {
    where.marketplace = query.marketplace;
  }

  const count = await prisma.order.count({ where });

  // 前期比較
  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const diff = endDate.getTime() - startDate.getTime();
  prevStart.setTime(prevStart.getTime() - diff);
  prevEnd.setTime(prevEnd.getTime() - diff);

  const prevCount = await prisma.order.count({
    where: { ...where, orderedAt: { gte: prevStart, lte: prevEnd } },
  });

  const changePercent = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0;

  return {
    value: count,
    metadata: { previousValue: prevCount, changePercent },
    calculatedAt: new Date(),
  };
}

async function calculateRevenue(
  startDate: Date,
  endDate: Date,
  query: Record<string, any>
): Promise<WidgetDataResult> {
  const where: any = {
    orderedAt: { gte: startDate, lte: endDate },
    paymentStatus: 'PAID',
  };

  if (query.marketplace) {
    where.marketplace = query.marketplace;
  }

  const result = await prisma.order.aggregate({
    where,
    _sum: { total: true },
  });

  const revenue = result._sum.total || 0;

  return {
    value: revenue,
    metadata: { currency: 'USD' },
    calculatedAt: new Date(),
  };
}

async function calculateOrdersByStatus(
  startDate: Date,
  endDate: Date
): Promise<WidgetDataResult> {
  const groups = await prisma.order.groupBy({
    by: ['status'],
    where: {
      orderedAt: { gte: startDate, lte: endDate },
    },
    _count: true,
  });

  const data = groups.map(g => ({
    status: g.status,
    count: g._count,
  }));

  return {
    value: data,
    calculatedAt: new Date(),
  };
}

async function calculateActiveListings(): Promise<WidgetDataResult> {
  const count = await prisma.listing.count({
    where: { status: 'ACTIVE' },
  });

  return {
    value: count,
    calculatedAt: new Date(),
  };
}

async function calculateListingsByMarketplace(): Promise<WidgetDataResult> {
  const groups = await prisma.listing.groupBy({
    by: ['marketplace'],
    where: { status: 'ACTIVE' },
    _count: true,
  });

  const data = groups.map(g => ({
    marketplace: g.marketplace,
    count: g._count,
  }));

  return {
    value: data,
    calculatedAt: new Date(),
  };
}

async function calculateProductCount(query: Record<string, any>): Promise<WidgetDataResult> {
  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }

  const count = await prisma.product.count({ where });

  return {
    value: count,
    calculatedAt: new Date(),
  };
}

async function calculateProductsByStatus(): Promise<WidgetDataResult> {
  const groups = await prisma.product.groupBy({
    by: ['status'],
    _count: true,
  });

  const data = groups.map(g => ({
    status: g.status,
    count: g._count,
  }));

  return {
    value: data,
    calculatedAt: new Date(),
  };
}

async function calculateOutOfStock(): Promise<WidgetDataResult> {
  const count = await prisma.listing.count({
    where: { pausedByInventory: true },
  });

  return {
    value: count,
    calculatedAt: new Date(),
  };
}

async function calculateTopProducts(
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<WidgetDataResult> {
  const sales = await prisma.sale.groupBy({
    by: ['productId'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { totalPrice: true, quantity: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: limit,
  });

  const productIds = sales.map(s => s.productId).filter(Boolean) as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });

  const productMap = new Map(products.map(p => [p.id, p.title]));

  const data = sales.map(s => ({
    productId: s.productId,
    title: s.productId ? productMap.get(s.productId) : 'Unknown',
    revenue: s._sum.totalPrice || 0,
    quantity: s._sum.quantity || 0,
  }));

  return {
    value: data,
    calculatedAt: new Date(),
  };
}

async function calculateSalesByCategory(
  startDate: Date,
  endDate: Date
): Promise<WidgetDataResult> {
  // カテゴリ別売上を計算
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      listing: {
        include: {
          product: {
            select: { category: true },
          },
        },
      },
    },
  });

  const categoryMap = new Map<string, number>();

  for (const sale of sales) {
    const category = sale.listing?.product?.category || 'Unknown';
    const current = categoryMap.get(category) || 0;
    categoryMap.set(category, current + sale.totalPrice);
  }

  const data = Array.from(categoryMap.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    value: data,
    calculatedAt: new Date(),
  };
}

async function calculateApiRequests(
  startDate: Date,
  endDate: Date
): Promise<WidgetDataResult> {
  const count = await prisma.apiUsageLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  return {
    value: count,
    calculatedAt: new Date(),
  };
}

async function calculateApiErrorRate(
  startDate: Date,
  endDate: Date
): Promise<WidgetDataResult> {
  const [total, errors] = await Promise.all([
    prisma.apiUsageLog.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.apiUsageLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        statusCode: { gte: 400 },
      },
    }),
  ]);

  const errorRate = total > 0 ? (errors / total) * 100 : 0;

  return {
    value: errorRate,
    metadata: { total, errors },
    calculatedAt: new Date(),
  };
}

async function getRecentAlerts(limit: number): Promise<WidgetDataResult> {
  const alerts = await prisma.alertLog.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      eventType: true,
      severity: true,
      title: true,
      message: true,
      createdAt: true,
    },
  });

  return {
    value: alerts,
    calculatedAt: new Date(),
  };
}

/**
 * KPIスナップショットを計算・保存
 */
export async function calculateKpiSnapshot(
  kpiType: KpiType,
  periodType: KpiPeriodType
): Promise<void> {
  const { startDate, endDate } = getPeriodRange(periodType);

  let value: number;
  let previousValue: number | null = null;

  switch (kpiType) {
    case 'TOTAL_REVENUE':
      const revenue = await prisma.order.aggregate({
        where: {
          orderedAt: { gte: startDate, lte: endDate },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      });
      value = revenue._sum.total || 0;
      break;

    case 'ORDER_COUNT':
      value = await prisma.order.count({
        where: { orderedAt: { gte: startDate, lte: endDate } },
      });
      break;

    case 'ACTIVE_LISTINGS':
      value = await prisma.listing.count({
        where: { status: 'ACTIVE' },
      });
      break;

    case 'OUT_OF_STOCK_COUNT':
      value = await prisma.listing.count({
        where: { pausedByInventory: true },
      });
      break;

    case 'API_REQUESTS':
      value = await prisma.apiUsageLog.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      break;

    default:
      value = 0;
  }

  // 前期値を取得
  const prevSnapshot = await prisma.kpiSnapshot.findFirst({
    where: {
      kpiType,
      periodType,
      periodStart: { lt: startDate },
    },
    orderBy: { periodStart: 'desc' },
  });

  if (prevSnapshot) {
    previousValue = prevSnapshot.value;
  }

  const changePercent = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  await prisma.kpiSnapshot.upsert({
    where: {
      periodType_periodStart_kpiType: {
        periodType,
        periodStart: startDate,
        kpiType,
      },
    },
    update: {
      value,
      previousValue,
      changePercent,
      periodEnd: endDate,
    },
    create: {
      periodType,
      periodStart: startDate,
      periodEnd: endDate,
      kpiType,
      value,
      previousValue,
      changePercent,
    },
  });

  log.info({ kpiType, periodType, value, changePercent }, 'KPI snapshot calculated');
}

/**
 * デフォルトウィジェットを初期化
 */
export async function initializeDefaultWidgets(): Promise<void> {
  const defaultWidgets = [
    {
      name: 'total_orders',
      widgetType: 'METRIC' as WidgetType,
      title: '注文数',
      icon: 'shopping-cart',
      color: '#3B82F6',
      dataSource: 'orders.count',
      timeRange: 'last_24h',
    },
    {
      name: 'total_revenue',
      widgetType: 'METRIC' as WidgetType,
      title: '売上',
      icon: 'dollar-sign',
      color: '#10B981',
      dataSource: 'orders.revenue',
      timeRange: 'last_24h',
    },
    {
      name: 'active_listings',
      widgetType: 'COUNTER' as WidgetType,
      title: 'アクティブ出品数',
      icon: 'list',
      color: '#8B5CF6',
      dataSource: 'listings.active',
    },
    {
      name: 'out_of_stock',
      widgetType: 'GAUGE' as WidgetType,
      title: '在庫切れ',
      icon: 'alert-triangle',
      color: '#EF4444',
      dataSource: 'inventory.outOfStock',
    },
    {
      name: 'orders_by_status',
      widgetType: 'PIE_CHART' as WidgetType,
      title: '注文ステータス別',
      dataSource: 'orders.byStatus',
      timeRange: 'last_7d',
    },
    {
      name: 'top_products',
      widgetType: 'LEADERBOARD' as WidgetType,
      title: 'トップ商品',
      dataSource: 'sales.topProducts',
      timeRange: 'last_7d',
    },
  ];

  for (const widgetDef of defaultWidgets) {
    const existing = await prisma.dashboardWidget.findFirst({
      where: { name: widgetDef.name },
    });

    if (!existing) {
      await prisma.dashboardWidget.create({
        data: {
          name: widgetDef.name,
          widgetType: widgetDef.widgetType,
          title: widgetDef.title,
          icon: widgetDef.icon,
          color: widgetDef.color,
          dataSource: widgetDef.dataSource,
          timeRange: widgetDef.timeRange,
          isSystem: true,
        },
      });

      log.info({ name: widgetDef.name }, 'Default widget created');
    }
  }
}

/**
 * キャッシュをクリア
 */
export async function clearWidgetCache(widgetId?: string): Promise<void> {
  if (widgetId) {
    await prisma.widgetData.deleteMany({
      where: { dataKey: widgetId },
    });
  } else {
    await prisma.widgetData.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  log.info({ widgetId }, 'Widget cache cleared');
}

// ヘルパー関数

function getTimeRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case 'last_1h':
      startDate.setHours(startDate.getHours() - 1);
      break;
    case 'last_24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case 'last_7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'last_30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'last_90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'this_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setHours(startDate.getHours() - 24);
  }

  return { startDate, endDate };
}

function getPeriodRange(periodType: KpiPeriodType): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case 'HOURLY':
      startDate = new Date(now);
      startDate.setMinutes(0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      break;
    case 'DAILY':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'WEEKLY':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'MONTHLY':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
  }

  return { startDate, endDate };
}

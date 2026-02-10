/**
 * Phase 37: データ可視化サービス
 *
 * 機能:
 * - グラフ設定管理
 * - データ取得・集計
 * - キャッシュ管理
 * - ユーザーフィードバック
 */

import { PrismaClient } from '@prisma/client';
import type {
  ChartConfig,
  ChartData,
  DashboardChartItem,
  WidgetPreset,
  UserFeedback,
  PredictionFeedback,
  ChartType,
  ChartDataSource,
  DataGranularity,
  AggregationType,
  WidgetCategory,
  FeedbackTargetType,
  FeedbackType,
  FeedbackStatus,
  PredictionFeedbackType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// 型定義
// ========================================

interface ChartConfigInput {
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: ChartDataSource;
  query: Record<string, unknown>;
  options?: Record<string, unknown>;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  refreshInterval?: number;
  cacheTimeout?: number;
  defaultFilters?: Record<string, unknown>;
  createdById?: string;
  isPublic?: boolean;
}

interface ChartDataInput {
  chartId: string;
  periodStart: Date;
  periodEnd: Date;
  granularity: DataGranularity;
}

interface DataPoint {
  label: string;
  value: number;
  metadata?: Record<string, unknown>;
}

interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

interface FeedbackInput {
  userId?: string;
  sessionId?: string;
  targetType: FeedbackTargetType;
  targetId: string;
  feedbackType: FeedbackType;
  rating?: number;
  comment?: string;
  context?: Record<string, unknown>;
  userAgent?: string;
  ipAddress?: string;
}

interface PredictionFeedbackInput {
  userId: string;
  predictionType: PredictionFeedbackType;
  predictionId: string;
  isHelpful: boolean;
  actualOutcome?: string;
  comment?: string;
  predictedValue?: number;
  actualValue?: number;
}

// ========================================
// グラフ設定サービス
// ========================================

export class ChartConfigService {
  /**
   * グラフ設定作成
   */
  static async createChart(input: ChartConfigInput): Promise<ChartConfig> {
    return prisma.chartConfig.create({
      data: {
        ...input,
        query: input.query as any,
        options: (input.options ?? {}) as any,
        colors: input.colors ?? ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        defaultFilters: (input.defaultFilters ?? {}) as any,
        showLegend: input.showLegend ?? true,
        showTooltip: input.showTooltip ?? true,
        animated: input.animated ?? true,
        isActive: true,
      },
    });
  }

  /**
   * グラフ設定取得
   */
  static async getChart(id: string): Promise<ChartConfig | null> {
    return prisma.chartConfig.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * グラフ設定一覧
   */
  static async listCharts(options: {
    chartType?: ChartType;
    dataSource?: ChartDataSource;
    isPublic?: boolean;
    isActive?: boolean;
    createdById?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ charts: ChartConfig[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.chartType) where.chartType = options.chartType;
    if (options.dataSource) where.dataSource = options.dataSource;
    if (options.isPublic !== undefined) where.isPublic = options.isPublic;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.createdById) where.createdById = options.createdById;

    const [charts, total] = await Promise.all([
      prisma.chartConfig.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.chartConfig.count({ where }),
    ]);

    return { charts, total };
  }

  /**
   * グラフ設定更新
   */
  static async updateChart(
    id: string,
    data: Partial<ChartConfigInput>
  ): Promise<ChartConfig> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.chartType !== undefined) updateData.chartType = data.chartType;
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource;
    if (data.query !== undefined) updateData.query = data.query;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.colors !== undefined) updateData.colors = data.colors;
    if (data.showLegend !== undefined) updateData.showLegend = data.showLegend;
    if (data.showTooltip !== undefined) updateData.showTooltip = data.showTooltip;
    if (data.animated !== undefined) updateData.animated = data.animated;
    if (data.refreshInterval !== undefined) updateData.refreshInterval = data.refreshInterval;
    if (data.cacheTimeout !== undefined) updateData.cacheTimeout = data.cacheTimeout;
    if (data.defaultFilters !== undefined) updateData.defaultFilters = data.defaultFilters;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    return prisma.chartConfig.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * グラフ設定削除
   */
  static async deleteChart(id: string): Promise<void> {
    await prisma.chartConfig.delete({
      where: { id },
    });
  }
}

// ========================================
// グラフデータサービス
// ========================================

export class ChartDataService {
  /**
   * グラフデータ取得（キャッシュ優先）
   */
  static async getChartData(input: ChartDataInput): Promise<ChartData | null> {
    // キャッシュチェック
    const cached = await prisma.chartData.findFirst({
      where: {
        chartId: input.chartId,
        periodStart: { lte: input.periodStart },
        periodEnd: { gte: input.periodEnd },
        granularity: input.granularity,
        expiresAt: { gt: new Date() },
      },
      orderBy: { cachedAt: 'desc' },
    });

    if (cached) {
      return cached;
    }

    // キャッシュがない場合はデータ生成
    return this.generateChartData(input);
  }

  /**
   * グラフデータ生成
   */
  static async generateChartData(input: ChartDataInput): Promise<ChartData> {
    const chart = await prisma.chartConfig.findUnique({
      where: { id: input.chartId },
    });

    if (!chart) {
      throw new Error(`Chart not found: ${input.chartId}`);
    }

    // データソースに応じたデータ取得
    const { labels, datasets, totalRecords, aggregationType } = await this.fetchData(
      chart.dataSource,
      chart.query as Record<string, unknown>,
      input.periodStart,
      input.periodEnd,
      input.granularity
    );

    // キャッシュ有効期限
    const cacheTimeout = chart.cacheTimeout ?? 300; // デフォルト5分
    const expiresAt = new Date(Date.now() + cacheTimeout * 1000);

    // データ保存
    return prisma.chartData.create({
      data: {
        chartId: input.chartId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        granularity: input.granularity,
        labels,
        datasets: datasets as any,
        totalRecords,
        aggregationType,
        expiresAt,
      },
    });
  }

  /**
   * データソースからデータ取得
   */
  private static async fetchData(
    dataSource: ChartDataSource,
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    switch (dataSource) {
      case 'SALES':
        return this.fetchSalesData(query, periodStart, periodEnd, granularity);
      case 'ORDERS':
        return this.fetchOrdersData(query, periodStart, periodEnd, granularity);
      case 'PRODUCTS':
        return this.fetchProductsData(query, periodStart, periodEnd, granularity);
      case 'PREDICTIONS':
        return this.fetchPredictionsData(query, periodStart, periodEnd, granularity);
      default:
        return this.fetchCustomData(query, periodStart, periodEnd, granularity);
    }
  }

  /**
   * 売上データ取得
   */
  private static async fetchSalesData(
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        createdAt: true,
        totalPrice: true,
        quantity: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = this.groupByPeriod(
      sales.map((s) => ({
        date: s.createdAt,
        value: s.totalPrice,
        quantity: s.quantity,
      })),
      granularity
    );

    const labels = Object.keys(grouped);
    const revenueData = labels.map((label) =>
      grouped[label].reduce((sum, item) => sum + item.value, 0)
    );
    const quantityData = labels.map((label) =>
      grouped[label].reduce((sum, item) => sum + item.quantity, 0)
    );

    return {
      labels,
      datasets: [
        {
          label: '売上金額',
          data: revenueData,
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
        },
        {
          label: '販売数',
          data: quantityData,
          backgroundColor: '#10B981',
          borderColor: '#10B981',
        },
      ],
      totalRecords: sales.length,
      aggregationType: 'SUM',
    };
  }

  /**
   * 注文データ取得
   */
  private static async fetchOrdersData(
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        createdAt: true,
        total: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = this.groupByPeriod(
      orders.map((o) => ({
        date: o.createdAt,
        value: o.total,
        status: o.status,
      })),
      granularity
    );

    const labels = Object.keys(grouped);
    const orderCountData = labels.map((label) => grouped[label].length);
    const orderValueData = labels.map((label) =>
      grouped[label].reduce((sum, item) => sum + item.value, 0)
    );

    return {
      labels,
      datasets: [
        {
          label: '注文件数',
          data: orderCountData,
          backgroundColor: '#F59E0B',
          borderColor: '#F59E0B',
        },
        {
          label: '注文金額',
          data: orderValueData,
          backgroundColor: '#8B5CF6',
          borderColor: '#8B5CF6',
        },
      ],
      totalRecords: orders.length,
      aggregationType: 'COUNT',
    };
  }

  /**
   * 商品データ取得
   */
  private static async fetchProductsData(
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    const products = await prisma.product.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        createdAt: true,
        status: true,
        category: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ステータス別集計
    const statusCounts: Record<string, number> = {};
    for (const product of products) {
      const status = product.status;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    return {
      labels,
      datasets: [
        {
          label: '商品数',
          data,
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        },
      ],
      totalRecords: products.length,
      aggregationType: 'COUNT',
    };
  }

  /**
   * 予測データ取得
   */
  private static async fetchPredictionsData(
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    const predictions = await prisma.pricePrediction.findMany({
      where: {
        predictedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        predictedAt: true,
        currentPrice: true,
        predictedPrice: true,
        confidence: true,
        wasAccurate: true,
      },
      orderBy: { predictedAt: 'asc' },
    });

    const grouped = this.groupByPeriod(
      predictions.map((p) => ({
        date: p.predictedAt,
        currentPrice: p.currentPrice,
        predictedPrice: p.predictedPrice,
        confidence: p.confidence,
      })),
      granularity
    );

    const labels = Object.keys(grouped);
    const avgConfidenceData = labels.map((label) => {
      const items = grouped[label];
      return items.length > 0
        ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
        : 0;
    });
    const predictionCountData = labels.map((label) => grouped[label].length);

    return {
      labels,
      datasets: [
        {
          label: '平均信頼度',
          data: avgConfidenceData.map((v) => Math.round(v * 100)),
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
        },
        {
          label: '予測件数',
          data: predictionCountData,
          backgroundColor: '#10B981',
          borderColor: '#10B981',
        },
      ],
      totalRecords: predictions.length,
      aggregationType: 'AVG',
    };
  }

  /**
   * カスタムデータ取得
   */
  private static async fetchCustomData(
    query: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date,
    granularity: DataGranularity
  ): Promise<{
    labels: string[];
    datasets: Dataset[];
    totalRecords: number;
    aggregationType: AggregationType;
  }> {
    // カスタムクエリの実装
    return {
      labels: [],
      datasets: [],
      totalRecords: 0,
      aggregationType: 'COUNT',
    };
  }

  /**
   * 期間でグループ化
   */
  private static groupByPeriod<T extends { date: Date }>(
    items: T[],
    granularity: DataGranularity
  ): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};

    for (const item of items) {
      const key = this.getPeriodKey(item.date, granularity);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  /**
   * 期間キー生成
   */
  private static getPeriodKey(date: Date, granularity: DataGranularity): string {
    const d = new Date(date);

    switch (granularity) {
      case 'HOURLY':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      case 'DAILY':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'WEEKLY':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
      case 'MONTHLY':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'QUARTERLY':
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
      case 'YEARLY':
        return `${d.getFullYear()}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * キャッシュクリア
   */
  static async clearCache(chartId?: string): Promise<number> {
    const where: Record<string, unknown> = {};
    if (chartId) {
      where.chartId = chartId;
    } else {
      where.expiresAt = { lt: new Date() };
    }

    const result = await prisma.chartData.deleteMany({ where });
    return result.count;
  }
}

// ========================================
// ウィジェットプリセットサービス
// ========================================

export class WidgetPresetService {
  /**
   * プリセット作成
   */
  static async createPreset(input: {
    name: string;
    description?: string;
    category: WidgetCategory;
    widgetType: string;
    config: Record<string, unknown>;
    thumbnail?: string;
    isSystem?: boolean;
    isPublic?: boolean;
  }): Promise<WidgetPreset> {
    return prisma.widgetPreset.create({
      data: {
        ...input,
        config: input.config as any,
        isSystem: input.isSystem ?? false,
        isPublic: input.isPublic ?? true,
      },
    });
  }

  /**
   * プリセット一覧
   */
  static async listPresets(options: {
    category?: WidgetCategory;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ presets: WidgetPreset[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.category) where.category = options.category;
    if (options.isPublic !== undefined) where.isPublic = options.isPublic;

    const [presets, total] = await Promise.all([
      prisma.widgetPreset.findMany({
        where,
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.widgetPreset.count({ where }),
    ]);

    return { presets, total };
  }

  /**
   * プリセット使用
   */
  static async usePreset(id: string): Promise<WidgetPreset> {
    return prisma.widgetPreset.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }
}

// ========================================
// フィードバックサービス
// ========================================

export class FeedbackService {
  /**
   * フィードバック作成
   */
  static async createFeedback(input: FeedbackInput): Promise<UserFeedback> {
    return prisma.userFeedback.create({
      data: {
        ...input,
        context: (input.context ?? {}) as any,
        status: 'NEW',
      },
    });
  }

  /**
   * フィードバック一覧
   */
  static async listFeedbacks(options: {
    targetType?: FeedbackTargetType;
    targetId?: string;
    feedbackType?: FeedbackType;
    status?: FeedbackStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ feedbacks: UserFeedback[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.targetType) where.targetType = options.targetType;
    if (options.targetId) where.targetId = options.targetId;
    if (options.feedbackType) where.feedbackType = options.feedbackType;
    if (options.status) where.status = options.status;
    if (options.userId) where.userId = options.userId;

    const [feedbacks, total] = await Promise.all([
      prisma.userFeedback.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.userFeedback.count({ where }),
    ]);

    return { feedbacks, total };
  }

  /**
   * フィードバックステータス更新
   */
  static async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    resolvedBy?: string
  ): Promise<UserFeedback> {
    return prisma.userFeedback.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
        resolvedBy,
      },
    });
  }

  /**
   * 予測フィードバック作成
   */
  static async createPredictionFeedback(
    input: PredictionFeedbackInput
  ): Promise<PredictionFeedback> {
    // 精度計算
    let accuracy: number | undefined;
    if (input.predictedValue !== undefined && input.actualValue !== undefined) {
      const diff = Math.abs(input.predictedValue - input.actualValue);
      accuracy = 1 - diff / Math.max(input.predictedValue, input.actualValue, 1);
    }

    return prisma.predictionFeedback.create({
      data: {
        ...input,
        accuracy,
      },
    });
  }

  /**
   * 予測フィードバック統計
   */
  static async getPredictionFeedbackStats(
    predictionType: PredictionFeedbackType
  ): Promise<{
    total: number;
    helpful: number;
    notHelpful: number;
    helpfulRate: number;
    averageAccuracy: number | null;
  }> {
    const feedbacks = await prisma.predictionFeedback.findMany({
      where: { predictionType },
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

    return {
      total,
      helpful,
      notHelpful,
      helpfulRate,
      averageAccuracy,
    };
  }
}

// ========================================
// ダッシュボードグラフサービス
// ========================================

export class DashboardChartService {
  /**
   * ダッシュボードにグラフ追加
   */
  static async addChartToDashboard(input: {
    dashboardId: string;
    chartId: string;
    position?: number;
    width?: number;
    height?: number;
    title?: string;
    overrides?: Record<string, unknown>;
  }): Promise<DashboardChartItem> {
    // 位置を自動計算
    const existingItems = await prisma.dashboardChartItem.count({
      where: { dashboardId: input.dashboardId },
    });

    return prisma.dashboardChartItem.create({
      data: {
        dashboardId: input.dashboardId,
        chartId: input.chartId,
        position: input.position ?? existingItems,
        width: input.width ?? 6,
        height: input.height ?? 4,
        title: input.title,
        overrides: (input.overrides ?? {}) as any,
        isVisible: true,
      },
    });
  }

  /**
   * ダッシュボードのグラフ一覧
   */
  static async getDashboardCharts(
    dashboardId: string
  ): Promise<DashboardChartItem[]> {
    return prisma.dashboardChartItem.findMany({
      where: { dashboardId, isVisible: true },
      include: {
        chart: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * グラフ配置更新
   */
  static async updateChartPosition(
    id: string,
    position: number,
    width?: number,
    height?: number
  ): Promise<DashboardChartItem> {
    const data: Record<string, unknown> = { position };
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;

    return prisma.dashboardChartItem.update({
      where: { id },
      data,
    });
  }

  /**
   * ダッシュボードからグラフ削除
   */
  static async removeChartFromDashboard(id: string): Promise<void> {
    await prisma.dashboardChartItem.delete({
      where: { id },
    });
  }
}

export default {
  ChartConfigService,
  ChartDataService,
  WidgetPresetService,
  FeedbackService,
  DashboardChartService,
};

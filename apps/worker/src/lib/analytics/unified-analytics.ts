/**
 * 統合分析サービス（Phase 30）
 *
 * 価格・競合・在庫データを統合した分析機能
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'UnifiedAnalytics' });

export interface DashboardSummary {
  period: { from: Date; to: Date; days: number };
  overview: {
    totalProducts: number;
    activeListings: number;
    totalRevenue: number;
    totalProfit: number;
    avgMarginPercent: number;
  };
  pricing: {
    recommendationsGenerated: number;
    recommendationsApplied: number;
    avgPriceChange: number;
    priceIncreases: number;
    priceDecreases: number;
  };
  competitors: {
    trackersActive: number;
    alertsPending: number;
    avgCompetitorPriceChange: number;
    priceAdvantage: number; // 競合より安い商品の割合
  };
  inventory: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    staleItems: number; // 30日以上売れていない
  };
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface PricingTrend {
  period: { from: Date; to: Date };
  priceChanges: TrendData[];
  recommendations: TrendData[];
  avgMargin: TrendData[];
}

export interface CompetitorTrend {
  period: { from: Date; to: Date };
  priceGap: TrendData[]; // 自社価格 - 競合価格の平均
  alertCount: TrendData[];
  checkCount: TrendData[];
}

export interface SalesTrend {
  period: { from: Date; to: Date };
  salesCount: TrendData[];
  revenue: TrendData[];
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  topProducts: Array<{ id: string; title: string; count: number; revenue: number }>;
}

class UnifiedAnalyticsService {
  /**
   * ダッシュボードサマリーを取得
   */
  async getDashboardSummary(days: number = 7): Promise<DashboardSummary> {
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    log.debug({ type: 'get_dashboard_summary', days });

    // 並列でデータを取得
    const [
      totalProducts,
      activeListings,
      listings,
      priceRecommendations,
      priceChangeLogs,
      competitorTrackers,
      competitorAlerts,
      competitorPriceLogs,
      orders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.findMany({
        where: { status: 'ACTIVE' },
        include: { product: true },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from } },
      }),
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from } },
      }),
      prisma.competitorTracker.findMany({
        where: { isActive: true },
      }),
      prisma.competitorAlert.findMany({
        where: { status: 'pending' },
      }),
      prisma.competitorPriceLog.findMany({
        where: { recordedAt: { gte: from } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: from } },
        include: { sales: true },
      }),
    ]);

    // 収益・利益計算
    let totalRevenue = 0;
    let totalProfit = 0;
    for (const order of orders) {
      totalRevenue += order.total;
      // 利益はSaleのprofitJpyから計算
      for (const sale of order.sales) {
        if (sale.profitJpy) {
          totalProfit += sale.profitJpy;
        }
      }
    }

    // 平均利益率
    const avgMarginPercent = listings.length > 0
      ? listings.reduce((sum, l) => {
          const cost = l.product?.price || 0;
          const margin = l.listingPrice > 0 ? ((l.listingPrice - cost) / l.listingPrice) * 100 : 0;
          return sum + margin;
        }, 0) / listings.length
      : 0;

    // 価格変更統計
    const priceIncreases = priceChangeLogs.filter(l => l.newPrice > l.oldPrice).length;
    const priceDecreases = priceChangeLogs.filter(l => l.newPrice < l.oldPrice).length;
    const avgPriceChange = priceChangeLogs.length > 0
      ? priceChangeLogs.reduce((sum, l) => sum + ((l.newPrice - l.oldPrice) / l.oldPrice) * 100, 0) / priceChangeLogs.length
      : 0;

    // 競合価格優位性
    let priceAdvantageCount = 0;
    for (const tracker of competitorTrackers) {
      if (tracker.listingId && tracker.lastPrice) {
        const listing = listings.find(l => l.id === tracker.listingId);
        if (listing && listing.listingPrice < tracker.lastPrice) {
          priceAdvantageCount++;
        }
      }
    }
    const priceAdvantage = competitorTrackers.length > 0
      ? (priceAdvantageCount / competitorTrackers.length) * 100
      : 0;

    // 競合価格変動
    const avgCompetitorPriceChange = competitorPriceLogs.length > 0
      ? competitorPriceLogs
          .filter(l => l.priceChangePercent !== null)
          .reduce((sum, l) => sum + (l.priceChangePercent || 0), 0) / competitorPriceLogs.length
      : 0;

    // 在庫状況（簡易）
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 30);
    const staleItems = listings.filter(l => l.createdAt < staleThreshold).length;

    return {
      period: { from, to: now, days },
      overview: {
        totalProducts,
        activeListings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgMarginPercent: Math.round(avgMarginPercent * 100) / 100,
      },
      pricing: {
        recommendationsGenerated: priceRecommendations.length,
        recommendationsApplied: priceRecommendations.filter(r => r.status === 'APPLIED').length,
        avgPriceChange: Math.round(avgPriceChange * 100) / 100,
        priceIncreases,
        priceDecreases,
      },
      competitors: {
        trackersActive: competitorTrackers.length,
        alertsPending: competitorAlerts.length,
        avgCompetitorPriceChange: Math.round(avgCompetitorPriceChange * 100) / 100,
        priceAdvantage: Math.round(priceAdvantage * 100) / 100,
      },
      inventory: {
        inStock: listings.filter(l => l.status === 'ACTIVE').length,
        lowStock: 0, // TODO: 在庫レベル実装後
        outOfStock: listings.filter(l => l.status === 'SOLD' || l.status === 'ENDED').length,
        staleItems,
      },
    };
  }

  /**
   * 価格トレンドを取得
   */
  async getPricingTrend(days: number = 30): Promise<PricingTrend> {
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [priceChanges, recommendations] = await Promise.all([
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 日別に集計
    const priceChangesByDay = this.groupByDay(priceChanges, 'createdAt', (items) => ({
      value: items.reduce((sum, i) => sum + ((i.newPrice - i.oldPrice) / i.oldPrice) * 100, 0) / items.length,
    }));

    const recommendationsByDay = this.groupByDay(recommendations, 'createdAt', (items) => ({
      value: items.length,
    }));

    return {
      period: { from, to: now },
      priceChanges: priceChangesByDay,
      recommendations: recommendationsByDay,
      avgMargin: [], // TODO: 実装
    };
  }

  /**
   * 競合トレンドを取得
   */
  async getCompetitorTrend(days: number = 30): Promise<CompetitorTrend> {
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [priceLogs, alerts] = await Promise.all([
      prisma.competitorPriceLog.findMany({
        where: { recordedAt: { gte: from } },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.competitorAlert.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const priceGapByDay = this.groupByDay(priceLogs, 'recordedAt', (items) => ({
      value: items
        .filter(i => i.priceChangePercent !== null)
        .reduce((sum, i) => sum + (i.priceChangePercent || 0), 0) / items.length || 0,
    }));

    const alertsByDay = this.groupByDay(alerts, 'createdAt', (items) => ({
      value: items.length,
    }));

    const checksByDay = this.groupByDay(priceLogs, 'recordedAt', (items) => ({
      value: items.length,
    }));

    return {
      period: { from, to: now },
      priceGap: priceGapByDay,
      alertCount: alertsByDay,
      checkCount: checksByDay,
    };
  }

  /**
   * 売上トレンドを取得
   */
  async getSalesTrend(days: number = 30): Promise<SalesTrend> {
    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
      include: {
        sales: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const salesByDay = this.groupByDay(orders, 'createdAt', (items) => ({
      value: items.length,
    }));

    const revenueByDay = this.groupByDay(orders, 'createdAt', (items) => ({
      value: items.reduce((sum, o) => sum + o.total, 0),
    }));

    // マーケットプレイス別集計
    const categoryStats = new Map<string, { count: number; revenue: number }>();
    for (const order of orders) {
      const category = order.marketplace || 'Unknown';
      const existing = categoryStats.get(category) || { count: 0, revenue: 0 };
      categoryStats.set(category, {
        count: existing.count + 1,
        revenue: existing.revenue + order.total,
      });
    }

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // SKU別集計（Saleから）
    const productStats = new Map<string, { id: string; title: string; count: number; revenue: number }>();
    for (const order of orders) {
      for (const sale of order.sales) {
        const sku = sale.sku;
        const title = sale.title;
        const existing = productStats.get(sku) || { id: sku, title, count: 0, revenue: 0 };
        productStats.set(sku, {
          ...existing,
          count: existing.count + 1,
          revenue: existing.revenue + sale.totalPrice,
        });
      }
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      period: { from, to: now },
      salesCount: salesByDay,
      revenue: revenueByDay,
      topCategories,
      topProducts,
    };
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  async getPerformanceMetrics(days: number = 7): Promise<{
    conversionRate: number;
    avgOrderValue: number;
    returnRate: number;
    listingSuccessRate: number;
    priceOptimizationImpact: number;
  }> {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [orders, listings, publishedListings, priceChanges] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: from } } }),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.count({ where: { createdAt: { gte: from } } }),
      prisma.priceChangeLog.findMany({
        where: { createdAt: { gte: from } },
      }),
    ]);

    // コンバージョン率（簡易）
    const conversionRate = listings > 0 ? (orders.length / listings) * 100 : 0;

    // 平均注文額
    const avgOrderValue = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
      : 0;

    // 出品成功率（公開された出品 / 作成された出品）
    const listingSuccessRate = publishedListings > 0 ? 100 : 0; // TODO: 実際の実装

    // 価格最適化の効果（価格変更後の売上への影響）
    // 簡易計算：価格を下げた商品の売上増加率
    const priceOptimizationImpact = 0; // TODO: 実装

    return {
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      returnRate: 0, // TODO: 返品データ実装後
      listingSuccessRate,
      priceOptimizationImpact,
    };
  }

  /**
   * 日別にグループ化
   */
  private groupByDay<T>(
    items: T[],
    dateField: keyof T,
    aggregator: (items: T[]) => { value: number }
  ): TrendData[] {
    const grouped = new Map<string, T[]>();

    for (const item of items) {
      const date = new Date(item[dateField] as any);
      const dateKey = date.toISOString().split('T')[0];
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, item]);
    }

    return Array.from(grouped.entries())
      .map(([date, dayItems]) => ({
        date,
        ...aggregator(dayItems),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

// シングルトンインスタンス
export const unifiedAnalytics = new UnifiedAnalyticsService();

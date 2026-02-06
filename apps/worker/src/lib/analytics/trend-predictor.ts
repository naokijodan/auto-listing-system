/**
 * トレンド予測サービス（Phase 30B）
 *
 * 過去データから将来のトレンドを予測
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'TrendPredictor' });

export interface PredictionResult {
  predictedValue: number;
  confidence: number; // 0-1
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface SalesForecast {
  date: string;
  predictedOrders: number;
  predictedRevenue: number;
  confidence: number;
}

export interface PriceTrend {
  listingId: string;
  currentPrice: number;
  recommendedPrice: number;
  expectedImpact: {
    salesChange: number; // %
    revenueChange: number; // %
  };
  confidence: number;
}

class TrendPredictorService {
  /**
   * 売上予測（次の7日間）
   */
  async forecastSales(days: number = 7): Promise<SalesForecast[]> {
    log.debug({ type: 'forecast_sales', days });

    // 過去30日のデータを取得
    const historicalDays = 30;
    const from = new Date();
    from.setDate(from.getDate() - historicalDays);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: 'asc' },
    });

    // 日別に集計
    const dailyStats = this.groupByDay(orders);
    const dailyValues = Object.values(dailyStats);

    if (dailyValues.length < 7) {
      log.warn({ type: 'insufficient_data', days: dailyValues.length });
      return [];
    }

    // 単純移動平均法で予測
    const forecasts: SalesForecast[] = [];
    const recentDays = dailyValues.slice(-7);
    const avgOrders = recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length;
    const avgRevenue = recentDays.reduce((sum, d) => sum + d.revenue, 0) / recentDays.length;

    // トレンド係数（上昇/下降傾向）
    const trendFactor = this.calculateTrendFactor(dailyValues);

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);

      // 曜日による補正
      const dayOfWeek = futureDate.getDay();
      const weekdayFactor = this.getWeekdayFactor(dayOfWeek, dailyValues);

      // 予測値計算
      const predictedOrders = Math.max(0, Math.round(
        avgOrders * (1 + trendFactor * i / 7) * weekdayFactor
      ));
      const predictedRevenue = Math.max(0,
        avgRevenue * (1 + trendFactor * i / 7) * weekdayFactor
      );

      // 信頼度（遠い未来ほど低下）
      const confidence = Math.max(0.3, 1 - (i / days) * 0.5);

      forecasts.push({
        date: futureDate.toISOString().split('T')[0],
        predictedOrders,
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return forecasts;
  }

  /**
   * 価格トレンド分析
   */
  async analyzePriceTrends(listingIds?: string[]): Promise<PriceTrend[]> {
    log.debug({ type: 'analyze_price_trends' });

    const where = listingIds?.length
      ? { id: { in: listingIds }, status: 'ACTIVE' as const }
      : { status: 'ACTIVE' as const };

    const listings = await prisma.listing.findMany({
      where,
      include: { product: true },
      take: 100,
    });

    // 過去30日の価格変更履歴
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const priceChanges = await prisma.priceChangeLog.findMany({
      where: {
        listingId: { in: listings.map(l => l.id) },
        createdAt: { gte: from },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 過去30日の売上データ
    const sales = await prisma.sale.findMany({
      where: {
        listingId: { in: listings.map(l => l.id) },
        order: {
          createdAt: { gte: from },
        },
      },
    });

    const trends: PriceTrend[] = [];

    for (const listing of listings) {
      const listingPriceChanges = priceChanges.filter(p => p.listingId === listing.id);
      const listingSales = sales.filter(s => s.listingId === listing.id);

      // 価格弾力性を推定（簡易版）
      const priceElasticity = this.estimatePriceElasticity(
        listingPriceChanges,
        listingSales
      );

      // 最適価格を推定
      const currentPrice = listing.listingPrice;
      const cost = listing.product?.price || 0;
      const margin = currentPrice > 0 ? (currentPrice - cost) / currentPrice : 0;

      // 推奨価格計算
      let recommendedPrice = currentPrice;
      let expectedSalesChange = 0;
      let expectedRevenueChange = 0;

      if (margin > 0.4 && priceElasticity > 1) {
        // 利益率が高く価格弾力性も高い場合、値下げ推奨
        recommendedPrice = currentPrice * 0.95;
        expectedSalesChange = priceElasticity * 5;
        expectedRevenueChange = expectedSalesChange - 5;
      } else if (margin < 0.2 && priceElasticity < 0.5) {
        // 利益率が低く価格弾力性も低い場合、値上げ推奨
        recommendedPrice = currentPrice * 1.05;
        expectedSalesChange = -priceElasticity * 5;
        expectedRevenueChange = 5 + expectedSalesChange;
      }

      trends.push({
        listingId: listing.id,
        currentPrice,
        recommendedPrice: Math.round(recommendedPrice * 100) / 100,
        expectedImpact: {
          salesChange: Math.round(expectedSalesChange * 100) / 100,
          revenueChange: Math.round(expectedRevenueChange * 100) / 100,
        },
        confidence: listingPriceChanges.length > 3 ? 0.7 : 0.4,
      });
    }

    return trends;
  }

  /**
   * 季節性分析
   */
  async analyzeSeasonality(): Promise<{
    weekdayPattern: Record<string, number>;
    monthlyPattern: Record<string, number>;
    hourlyPattern: Record<string, number>;
  }> {
    log.debug({ type: 'analyze_seasonality' });

    // 過去90日のデータを分析
    const from = new Date();
    from.setDate(from.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
    });

    // 曜日別パターン
    const weekdayPattern: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // 月別パターン
    const monthlyPattern: Record<string, number> = {};

    // 時間帯別パターン
    const hourlyPattern: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyPattern[`${i.toString().padStart(2, '0')}:00`] = 0;
    }

    for (const order of orders) {
      const date = new Date(order.createdAt);

      // 曜日
      weekdayPattern[weekdays[date.getDay()]]++;

      // 月
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyPattern[monthKey] = (monthlyPattern[monthKey] || 0) + 1;

      // 時間帯
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      hourlyPattern[hourKey]++;
    }

    // 正規化（合計を100にする）
    const normalizePattern = (pattern: Record<string, number>) => {
      const total = Object.values(pattern).reduce((sum, v) => sum + v, 0);
      if (total === 0) return pattern;
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(pattern)) {
        result[key] = Math.round((value / total) * 100 * 100) / 100;
      }
      return result;
    };

    return {
      weekdayPattern: normalizePattern(weekdayPattern),
      monthlyPattern: normalizePattern(monthlyPattern),
      hourlyPattern: normalizePattern(hourlyPattern),
    };
  }

  /**
   * 競合価格トレンド予測
   */
  async forecastCompetitorPrices(trackerId: string): Promise<{
    currentPrice: number;
    predictedPrice: number;
    priceDirection: 'up' | 'down' | 'stable';
    confidence: number;
  } | null> {
    log.debug({ type: 'forecast_competitor_prices', trackerId });

    const tracker = await prisma.competitorTracker.findUnique({
      where: { id: trackerId },
    });

    if (!tracker) {
      return null;
    }

    // 過去30日の価格履歴
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const priceLogs = await prisma.competitorPriceLog.findMany({
      where: {
        trackerId,
        recordedAt: { gte: from },
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (priceLogs.length < 5) {
      return null;
    }

    const prices = priceLogs.map(p => p.price);
    const currentPrice = prices[prices.length - 1];

    // 線形回帰で傾向を計算
    const trend = this.calculateLinearTrend(prices);
    const predictedPrice = currentPrice * (1 + trend);

    let priceDirection: 'up' | 'down' | 'stable' = 'stable';
    if (trend > 0.02) {
      priceDirection = 'up';
    } else if (trend < -0.02) {
      priceDirection = 'down';
    }

    return {
      currentPrice,
      predictedPrice: Math.round(predictedPrice * 100) / 100,
      priceDirection,
      confidence: Math.min(0.8, priceLogs.length / 30),
    };
  }

  /**
   * 日別に注文を集計
   */
  private groupByDay(orders: { createdAt: Date; total: number }[]): Record<string, { count: number; revenue: number }> {
    const grouped: Record<string, { count: number; revenue: number }> = {};

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { count: 0, revenue: 0 };
      }
      grouped[dateKey].count++;
      grouped[dateKey].revenue += order.total;
    }

    return grouped;
  }

  /**
   * トレンド係数を計算
   */
  private calculateTrendFactor(dailyValues: { count: number; revenue: number }[]): number {
    if (dailyValues.length < 14) return 0;

    const firstHalf = dailyValues.slice(0, Math.floor(dailyValues.length / 2));
    const secondHalf = dailyValues.slice(Math.floor(dailyValues.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length;

    if (firstAvg === 0) return 0;

    return (secondAvg - firstAvg) / firstAvg;
  }

  /**
   * 曜日補正係数を計算
   */
  private getWeekdayFactor(dayOfWeek: number, dailyValues: { count: number; revenue: number }[]): number {
    // 簡易的な曜日補正（週末は高め）
    const weekdayFactors = [
      1.2,  // 日曜
      0.9,  // 月曜
      0.9,  // 火曜
      1.0,  // 水曜
      1.0,  // 木曜
      1.1,  // 金曜
      1.2,  // 土曜
    ];
    return weekdayFactors[dayOfWeek];
  }

  /**
   * 価格弾力性を推定
   */
  private estimatePriceElasticity(
    priceChanges: { oldPrice: number; newPrice: number }[],
    sales: { totalPrice: number }[]
  ): number {
    if (priceChanges.length === 0 || sales.length === 0) {
      return 1.0; // デフォルト値
    }

    // 簡易的な推定（価格変更前後の売上変化から）
    // 実際にはより複雑な回帰分析が必要
    const avgPriceChange = priceChanges.reduce(
      (sum, p) => sum + ((p.newPrice - p.oldPrice) / p.oldPrice),
      0
    ) / priceChanges.length;

    // 弾力性 = 売上変化率 / 価格変化率
    // 簡易的に1.0を基準に調整
    if (avgPriceChange > 0) {
      return 0.8; // 値上げ時は弾力性低め
    } else if (avgPriceChange < 0) {
      return 1.2; // 値下げ時は弾力性高め
    }

    return 1.0;
  }

  /**
   * 線形トレンドを計算
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    if (denominator === 0) return 0;

    const slope = numerator / denominator;

    // 傾きを変化率に変換
    return yMean !== 0 ? slope / yMean : 0;
  }
}

// シングルトンインスタンス
export const trendPredictor = new TrendPredictorService();

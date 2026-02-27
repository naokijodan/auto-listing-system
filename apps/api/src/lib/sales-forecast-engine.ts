/**
 * 売上予測エンジン
 * Phase 67: 過去データ分析、需要予測、季節性分析
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'sales-forecast-engine' });

// 型定義
export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

export interface ForecastResult {
  date: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface SeasonalityPattern {
  dayOfWeek: Record<number, number>; // 0-6: 日曜-土曜
  weekOfMonth: Record<number, number>; // 1-4: 第1週-第4週
  monthOfYear: Record<number, number>; // 1-12: 1月-12月
}

export interface CategoryForecast {
  category: string;
  currentRevenue: number;
  predictedRevenue: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

export interface ProductForecast {
  productId: string;
  title: string;
  currentSales: number;
  predictedSales: number;
  demandTrend: 'increasing' | 'decreasing' | 'stable';
  restockRecommendation: boolean;
  recommendedQuantity: number;
}

export interface InventoryRecommendation {
  productId: string;
  title: string;
  currentStock: number;
  predictedDemand: number;
  daysOfStock: number;
  action: 'restock_urgent' | 'restock_soon' | 'sufficient' | 'overstock';
  recommendedQuantity: number;
  urgency: 'high' | 'medium' | 'low';
}

export interface ForecastSummary {
  period: { start: Date; end: Date };
  forecastPeriod: { start: Date; end: Date };
  totalPredictedRevenue: number;
  totalPredictedOrders: number;
  averageConfidence: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  seasonality: SeasonalityPattern;
  dailyForecasts: ForecastResult[];
  categoryForecasts: CategoryForecast[];
  topGrowthProducts: ProductForecast[];
  inventoryRecommendations: InventoryRecommendation[];
}

// 過去の売上データを取得
export async function getHistoricalSalesData(
  days: number = 90
): Promise<DailySalesData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate },
      status: { in: ['SHIPPED', 'DELIVERED'] },
    },
    include: {
      sales: { select: { quantity: true } },
    },
  });

  // 日別に集計
  const dailyMap = new Map<string, DailySalesData>();

  orders.forEach((order) => {
    const dateKey = order.orderedAt.toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey) || {
      date: dateKey,
      revenue: 0,
      orders: 0,
      items: 0,
    };
    existing.revenue += order.total || 0;
    existing.orders += 1;
    existing.items += order.sales.reduce((sum: number, s: any) => sum + (s.quantity || 1), 0);
    dailyMap.set(dateKey, existing);
  });

  // 日付順にソート
  const result = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // 欠損日を0で埋める
  const filledResult: DailySalesData[] = [];
  const current = new Date(startDate);
  const today = new Date();

  while (current <= today) {
    const dateKey = current.toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey);
    filledResult.push(
      existing || { date: dateKey, revenue: 0, orders: 0, items: 0 }
    );
    current.setDate(current.getDate() + 1);
  }

  return filledResult;
}

// 移動平均を計算
export function calculateMovingAverage(
  data: number[],
  window: number
): number[] {
  if (data.length < window) {
    return data;
  }

  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // ウィンドウサイズ未満は利用可能なデータで計算
      const slice = data.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return result;
}

// 指数平滑化を計算
export function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): number[] {
  if (data.length === 0) return [];

  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// 季節性パターンを検出
export function detectSeasonality(data: DailySalesData[]): SeasonalityPattern {
  const dayOfWeek: Record<number, number[]> = {};
  const weekOfMonth: Record<number, number[]> = {};
  const monthOfYear: Record<number, number[]> = {};

  // 初期化
  for (let i = 0; i < 7; i++) dayOfWeek[i] = [];
  for (let i = 1; i <= 4; i++) weekOfMonth[i] = [];
  for (let i = 1; i <= 12; i++) monthOfYear[i] = [];

  data.forEach((d) => {
    const date = new Date(d.date);
    const dow = date.getDay();
    const wom = Math.ceil(date.getDate() / 7);
    const moy = date.getMonth() + 1;

    dayOfWeek[dow].push(d.revenue);
    if (wom <= 4) weekOfMonth[wom].push(d.revenue);
    monthOfYear[moy].push(d.revenue);
  });

  // 平均を計算して正規化
  const avgRevenue =
    data.reduce((sum, d) => sum + d.revenue, 0) / data.length || 1;

  const normalize = (values: number[]): number => {
    if (values.length === 0) return 1;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg / avgRevenue || 1;
  };

  return {
    dayOfWeek: Object.fromEntries(
      Object.entries(dayOfWeek).map(([k, v]) => [k, normalize(v)])
    ),
    weekOfMonth: Object.fromEntries(
      Object.entries(weekOfMonth).map(([k, v]) => [k, normalize(v)])
    ),
    monthOfYear: Object.fromEntries(
      Object.entries(monthOfYear).map(([k, v]) => [k, normalize(v)])
    ),
  };
}

// トレンドを計算（線形回帰）
export function calculateTrend(data: number[]): {
  slope: number;
  intercept: number;
  direction: 'up' | 'down' | 'stable';
} {
  const n = data.length;
  if (n < 2) {
    return { slope: 0, intercept: data[0] || 0, direction: 'stable' };
  }

  // 線形回帰
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // トレンド方向を判定
  const avgValue = sumY / n;
  const threshold = avgValue * 0.02; // 2%以上の変化でトレンドあり

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (slope > threshold) direction = 'up';
  else if (slope < -threshold) direction = 'down';

  return { slope, intercept, direction };
}

// 将来の売上を予測
export function forecastFutureSales(
  historicalData: DailySalesData[],
  forecastDays: number = 30,
  seasonality: SeasonalityPattern
): ForecastResult[] {
  if (historicalData.length < 7) {
    log.warn('Insufficient historical data for forecasting');
    return [];
  }

  const revenues = historicalData.map((d) => d.revenue);
  const orders = historicalData.map((d) => d.orders);

  // トレンド計算
  const revenueTrend = calculateTrend(revenues);
  const orderTrend = calculateTrend(orders);

  // 移動平均（7日）
  const revenueMA = calculateMovingAverage(revenues, 7);
  const orderMA = calculateMovingAverage(orders, 7);

  // 最近のベースライン
  const recentRevenue = revenueMA[revenueMA.length - 1] || 0;
  const recentOrders = orderMA[orderMA.length - 1] || 0;

  const forecasts: ForecastResult[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);

  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    const dateStr = forecastDate.toISOString().split('T')[0];
    const dow = forecastDate.getDay();
    const moy = forecastDate.getMonth() + 1;

    // 季節性係数を適用
    const seasonalFactor =
      (seasonality.dayOfWeek[dow] || 1) * (seasonality.monthOfYear[moy] || 1);

    // トレンドを適用
    const trendAdjustment =
      revenueTrend.slope * (historicalData.length + i);

    // 予測値を計算
    let predictedRevenue = (recentRevenue + trendAdjustment) * seasonalFactor;
    let predictedOrders =
      (recentOrders + orderTrend.slope * (historicalData.length + i)) *
      seasonalFactor;

    // 負の値を防ぐ
    predictedRevenue = Math.max(0, predictedRevenue);
    predictedOrders = Math.max(0, Math.round(predictedOrders));

    // 信頼度を計算（遠い将来ほど低下）
    const confidence = Math.max(0.5, 0.95 - i * 0.01);

    // 信頼区間
    const stdDev = calculateStdDev(revenues);
    const margin = stdDev * (1 + i * 0.05);
    const lowerBound = Math.max(0, predictedRevenue - margin);
    const upperBound = predictedRevenue + margin;

    forecasts.push({
      date: dateStr,
      predictedRevenue: Math.round(predictedRevenue),
      predictedOrders,
      confidence,
      lowerBound: Math.round(lowerBound),
      upperBound: Math.round(upperBound),
    });
  }

  return forecasts;
}

// 標準偏差を計算
function calculateStdDev(data: number[]): number {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map((x) => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(variance);
}

// カテゴリ別予測
export async function forecastByCategory(
  historicalDays: number = 90,
  forecastDays: number = 30
): Promise<CategoryForecast[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const midDate = new Date();
  midDate.setDate(midDate.getDate() - Math.floor(historicalDays / 2));

  // 前半と後半のデータを取得
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate },
      status: { in: ['SHIPPED', 'DELIVERED'] },
    },
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  // カテゴリ別に集計
  const categoryData = new Map<
    string,
    { firstHalf: number; secondHalf: number }
  >();

  orders.forEach((order) => {
    const category = order.sales[0]?.listing?.product?.category || 'その他';
    const existing = categoryData.get(category) || {
      firstHalf: 0,
      secondHalf: 0,
    };

    if (order.orderedAt < midDate) {
      existing.firstHalf += order.total || 0;
    } else {
      existing.secondHalf += order.total || 0;
    }
    categoryData.set(category, existing);
  });

  const forecasts: CategoryForecast[] = [];

  categoryData.forEach((data, category) => {
    const growthRate =
      data.firstHalf > 0
        ? ((data.secondHalf - data.firstHalf) / data.firstHalf) * 100
        : 0;

    const trend: 'up' | 'down' | 'stable' =
      growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable';

    // 将来予測
    const dailyAvg = data.secondHalf / (historicalDays / 2);
    const growthFactor = 1 + growthRate / 100;
    const predictedRevenue = dailyAvg * forecastDays * growthFactor;

    forecasts.push({
      category,
      currentRevenue: data.secondHalf,
      predictedRevenue: Math.round(predictedRevenue),
      growthRate: Math.round(growthRate * 10) / 10,
      trend,
      confidence: 0.8,
    });
  });

  // 売上順にソート
  return forecasts.sort((a, b) => b.currentRevenue - a.currentRevenue);
}

// 商品別需要予測
export async function forecastProductDemand(
  historicalDays: number = 90,
  limit: number = 20
): Promise<ProductForecast[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const midDate = new Date();
  midDate.setDate(midDate.getDate() - Math.floor(historicalDays / 2));

  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate },
      status: { in: ['SHIPPED', 'DELIVERED'] },
    },
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  // 商品別に集計
  const productData = new Map<
    string,
    {
      title: string;
      firstHalf: number;
      secondHalf: number;
    }
  >();

  orders.forEach((order) => {
    order.sales.forEach((sale) => {
      const productId = sale.listing?.productId;
      if (!productId) return;

      const existing = productData.get(productId) || {
        title: sale.listing?.product?.title || 'Unknown',
        firstHalf: 0,
        secondHalf: 0,
      };

      const qty = sale.quantity || 1;
      if (order.orderedAt < midDate) {
        existing.firstHalf += qty;
      } else {
        existing.secondHalf += qty;
      }
      productData.set(productId, existing);
    });
  });

  const forecasts: ProductForecast[] = [];

  productData.forEach((data, productId) => {
    const growthRate =
      data.firstHalf > 0
        ? ((data.secondHalf - data.firstHalf) / data.firstHalf) * 100
        : data.secondHalf > 0
        ? 100
        : 0;

    const demandTrend: 'increasing' | 'decreasing' | 'stable' =
      growthRate > 10 ? 'increasing' : growthRate < -10 ? 'decreasing' : 'stable';

    // 将来予測
    const dailyAvg = data.secondHalf / (historicalDays / 2);
    const growthFactor = 1 + growthRate / 100;
    const predictedSales = Math.round(dailyAvg * 30 * growthFactor);

    // 補充推奨
    const restockRecommendation = demandTrend !== 'decreasing' && predictedSales > 5;

    forecasts.push({
      productId,
      title: data.title,
      currentSales: data.secondHalf,
      predictedSales,
      demandTrend,
      restockRecommendation,
      recommendedQuantity: restockRecommendation ? predictedSales : 0,
    });
  });

  // 販売数順にソートして上位を返す
  return forecasts
    .sort((a, b) => b.currentSales - a.currentSales)
    .slice(0, limit);
}

// 在庫補充推奨
export async function getInventoryRecommendations(
  forecastDays: number = 30
): Promise<InventoryRecommendation[]> {
  // 在庫のある商品を取得
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      listings: {
        include: {
          sales: {
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      },
    },
  });

  const recommendations: InventoryRecommendation[] = [];

  products.forEach((product) => {
    // 過去30日の販売数
    const totalSales = product.listings.reduce(
      (sum: number, listing: any) =>
        sum +
        listing.sales.reduce((saleSum: number, sale: any) => saleSum + (sale.quantity || 1), 0),
      0
    );

    // 日次販売率
    const dailySalesRate = totalSales / 30;

    // 予測需要
    const predictedDemand = Math.ceil(dailySalesRate * forecastDays);

    // 現在の在庫（仮定: 1商品1在庫）
    const currentStock = 1;

    // 在庫日数
    const daysOfStock = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;

    // アクション決定
    let action: InventoryRecommendation['action'];
    let urgency: InventoryRecommendation['urgency'];

    if (daysOfStock < 7) {
      action = 'restock_urgent';
      urgency = 'high';
    } else if (daysOfStock < 14) {
      action = 'restock_soon';
      urgency = 'medium';
    } else if (daysOfStock > 60) {
      action = 'overstock';
      urgency = 'low';
    } else {
      action = 'sufficient';
      urgency = 'low';
    }

    // 推奨補充数
    const recommendedQuantity =
      action === 'restock_urgent' || action === 'restock_soon'
        ? Math.max(predictedDemand - currentStock, 0)
        : 0;

    if (dailySalesRate > 0 || action !== 'sufficient') {
      recommendations.push({
        productId: product.id,
        title: product.title,
        currentStock,
        predictedDemand,
        daysOfStock: Math.round(daysOfStock),
        action,
        recommendedQuantity,
        urgency,
      });
    }
  });

  // 緊急度順にソート
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
}

// メインの予測サマリーを生成
export async function generateForecastSummary(
  historicalDays: number = 90,
  forecastDays: number = 30
): Promise<ForecastSummary> {
  log.info(
    { historicalDays, forecastDays },
    'Generating sales forecast summary'
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const forecastStart = new Date();
  forecastStart.setDate(forecastStart.getDate() + 1);

  const forecastEnd = new Date();
  forecastEnd.setDate(forecastEnd.getDate() + forecastDays);

  // 過去データを取得
  const historicalData = await getHistoricalSalesData(historicalDays);

  // 季節性を検出
  const seasonality = detectSeasonality(historicalData);

  // 将来予測
  const dailyForecasts = forecastFutureSales(
    historicalData,
    forecastDays,
    seasonality
  );

  // カテゴリ別予測
  const categoryForecasts = await forecastByCategory(
    historicalDays,
    forecastDays
  );

  // 商品別予測
  const topGrowthProducts = await forecastProductDemand(historicalDays, 10);

  // 在庫推奨
  const inventoryRecommendations = await getInventoryRecommendations(
    forecastDays
  );

  // サマリー計算
  const totalPredictedRevenue = dailyForecasts.reduce(
    (sum, f) => sum + f.predictedRevenue,
    0
  );
  const totalPredictedOrders = dailyForecasts.reduce(
    (sum, f) => sum + f.predictedOrders,
    0
  );
  const averageConfidence =
    dailyForecasts.reduce((sum, f) => sum + f.confidence, 0) /
      dailyForecasts.length || 0;

  // 過去の実績と比較
  const recentRevenue = historicalData
    .slice(-forecastDays)
    .reduce((sum, d) => sum + d.revenue, 0);
  const growthRate =
    recentRevenue > 0
      ? ((totalPredictedRevenue - recentRevenue) / recentRevenue) * 100
      : 0;

  const trend: 'up' | 'down' | 'stable' =
    growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable';

  log.info(
    {
      totalPredictedRevenue,
      totalPredictedOrders,
      growthRate,
      trend,
    },
    'Forecast summary generated'
  );

  return {
    period: { start: startDate, end: new Date() },
    forecastPeriod: { start: forecastStart, end: forecastEnd },
    totalPredictedRevenue,
    totalPredictedOrders,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    growthRate: Math.round(growthRate * 10) / 10,
    trend,
    seasonality,
    dailyForecasts,
    categoryForecasts,
    topGrowthProducts,
    inventoryRecommendations,
  };
}

// 予測精度を評価（バックテスト）
export async function evaluateForecastAccuracy(
  testDays: number = 14
): Promise<{
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  accuracy: number;
}> {
  // 過去データで予測をテスト
  const fullData = await getHistoricalSalesData(90);

  if (fullData.length < testDays + 30) {
    return { mape: 0, rmse: 0, accuracy: 0 };
  }

  const trainingData = fullData.slice(0, -testDays);
  const testData = fullData.slice(-testDays);

  const seasonality = detectSeasonality(trainingData);
  const forecasts = forecastFutureSales(trainingData, testDays, seasonality);

  // 誤差計算
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let validCount = 0;

  for (let i = 0; i < testDays; i++) {
    const actual = testData[i]?.revenue || 0;
    const predicted = forecasts[i]?.predictedRevenue || 0;

    if (actual > 0) {
      sumAbsPercentError += Math.abs((actual - predicted) / actual);
      validCount++;
    }
    sumSquaredError += Math.pow(actual - predicted, 2);
  }

  const mape = validCount > 0 ? (sumAbsPercentError / validCount) * 100 : 0;
  const rmse = Math.sqrt(sumSquaredError / testDays);
  const accuracy = Math.max(0, 100 - mape);

  return {
    mape: Math.round(mape * 10) / 10,
    rmse: Math.round(rmse),
    accuracy: Math.round(accuracy * 10) / 10,
  };
}

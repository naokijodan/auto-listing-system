import { prisma, Prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'sales-analytics-service' });

interface SalesSummaryInput {
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodStart: Date;
  periodEnd: Date;
  marketplace?: 'JOOM' | 'EBAY' | null;
  category?: string | null;
}

interface TopProduct {
  productId: string;
  title: string;
  quantity: number;
  revenue: number;
}

interface TopCategory {
  category: string;
  quantity: number;
  revenue: number;
}

/**
 * 売上サマリーを計算・保存
 */
export async function calculateSalesSummary(input: SalesSummaryInput): Promise<any> {
  const { periodType, periodStart, periodEnd, marketplace, category } = input;

  const orderWhere: any = {
    orderedAt: {
      gte: periodStart,
      lt: periodEnd,
    },
    status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
  };

  if (marketplace) {
    orderWhere.marketplace = marketplace;
  }

  // 注文データ取得
  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: { select: { category: true } },
            },
          },
        },
      },
    },
  });

  // カテゴリフィルター適用
  let filteredOrders = orders;
  if (category) {
    filteredOrders = orders.filter(order =>
      order.sales.some(sale => sale.listing?.product?.category === category)
    );
  }

  // 集計
  let orderCount = filteredOrders.length;
  let itemCount = 0;
  let grossRevenue = 0;
  let shippingTotal = 0;
  let feeTotal = 0;
  let costTotal = 0;
  let profitTotal = 0;

  const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};
  const categorySales: Record<string, { quantity: number; revenue: number }> = {};

  for (const order of filteredOrders) {
    grossRevenue += order.subtotal;
    shippingTotal += order.shippingCost;
    feeTotal += order.marketplaceFee + order.paymentFee;

    for (const sale of order.sales) {
      // カテゴリフィルター
      if (category && sale.listing?.product?.category !== category) {
        continue;
      }

      itemCount += sale.quantity;

      // 利益計算
      if (sale.costPrice) {
        costTotal += sale.costPrice * sale.quantity;
        if (sale.profitJpy) {
          profitTotal += sale.profitJpy;
        }
      }

      // 商品別集計
      const productId = sale.productId || sale.sku;
      if (!productSales[productId]) {
        productSales[productId] = {
          title: sale.title,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[productId].quantity += sale.quantity;
      productSales[productId].revenue += sale.totalPrice;

      // カテゴリ別集計
      const cat = sale.listing?.product?.category || 'その他';
      if (!categorySales[cat]) {
        categorySales[cat] = { quantity: 0, revenue: 0 };
      }
      categorySales[cat].quantity += sale.quantity;
      categorySales[cat].revenue += sale.totalPrice;
    }
  }

  const netRevenue = grossRevenue - feeTotal;
  const profitRate = costTotal > 0 ? (profitTotal / costTotal) * 100 : null;

  // ベストセラー（上位10件）
  const topProducts: TopProduct[] = Object.entries(productSales)
    .map(([productId, data]) => ({
      productId,
      title: data.title,
      quantity: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topCategories: TopCategory[] = Object.entries(categorySales)
    .map(([cat, data]) => ({
      category: cat,
      quantity: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // サマリーを保存（型アサーションでPrismaの制約を回避）
  const uniqueKey = {
    periodType,
    periodStart,
    marketplace: marketplace || null,
    category: category || null,
  };

  const summary = await prisma.salesSummary.upsert({
    where: {
      periodType_periodStart_marketplace_category: uniqueKey as any,
    },
    update: {
      periodEnd,
      orderCount,
      itemCount,
      grossRevenue,
      shippingTotal,
      feeTotal,
      netRevenue,
      costTotal: costTotal > 0 ? costTotal : null,
      profitTotal: profitTotal > 0 ? profitTotal : null,
      profitRate,
      topProducts: topProducts as any,
      topCategories: topCategories as any,
      calculatedAt: new Date(),
      isComplete: true,
    },
    create: {
      periodType,
      periodStart,
      periodEnd,
      marketplace: marketplace || null,
      category: category || null,
      orderCount,
      itemCount,
      grossRevenue,
      shippingTotal,
      feeTotal,
      netRevenue,
      costTotal: costTotal > 0 ? costTotal : null,
      profitTotal: profitTotal > 0 ? profitTotal : null,
      profitRate,
      topProducts: topProducts as any,
      topCategories: topCategories as any,
      calculatedAt: new Date(),
      isComplete: true,
    },
  });

  log.info({
    periodType,
    periodStart,
    periodEnd,
    marketplace,
    orderCount,
    grossRevenue,
  }, 'Sales summary calculated');

  return summary;
}

/**
 * 日次サマリーを計算
 */
export async function calculateDailySummary(date: Date, marketplace?: 'JOOM' | 'EBAY'): Promise<any> {
  const periodStart = new Date(date);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 1);

  return calculateSalesSummary({
    periodType: 'DAILY',
    periodStart,
    periodEnd,
    marketplace,
  });
}

/**
 * 週次サマリーを計算（月曜始まり）
 */
export async function calculateWeeklySummary(date: Date, marketplace?: 'JOOM' | 'EBAY'): Promise<any> {
  const periodStart = new Date(date);
  const dayOfWeek = periodStart.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  periodStart.setDate(periodStart.getDate() - diff);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 7);

  return calculateSalesSummary({
    periodType: 'WEEKLY',
    periodStart,
    periodEnd,
    marketplace,
  });
}

/**
 * 月次サマリーを計算
 */
export async function calculateMonthlySummary(year: number, month: number, marketplace?: 'JOOM' | 'EBAY'): Promise<any> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);

  return calculateSalesSummary({
    periodType: 'MONTHLY',
    periodStart,
    periodEnd,
    marketplace,
  });
}

/**
 * リアルタイム売上サマリー（キャッシュなし）
 */
export async function getRealtimeSalesSummary(options: {
  startDate: Date;
  endDate: Date;
  marketplace?: 'JOOM' | 'EBAY';
  category?: string;
}): Promise<{
  orderCount: number;
  itemCount: number;
  grossRevenue: number;
  netRevenue: number;
  topProducts: TopProduct[];
}> {
  const { startDate, endDate, marketplace, category } = options;

  const orderWhere: any = {
    orderedAt: { gte: startDate, lt: endDate },
    status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
  };

  if (marketplace) {
    orderWhere.marketplace = marketplace;
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: { select: { category: true } },
            },
          },
        },
      },
    },
  });

  let orderCount = orders.length;
  let itemCount = 0;
  let grossRevenue = 0;
  let feeTotal = 0;

  const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};

  for (const order of orders) {
    grossRevenue += order.subtotal;
    feeTotal += order.marketplaceFee + order.paymentFee;

    for (const sale of order.sales) {
      if (category && sale.listing?.product?.category !== category) {
        continue;
      }

      itemCount += sale.quantity;

      const productId = sale.productId || sale.sku;
      if (!productSales[productId]) {
        productSales[productId] = {
          title: sale.title,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[productId].quantity += sale.quantity;
      productSales[productId].revenue += sale.totalPrice;
    }
  }

  const topProducts: TopProduct[] = Object.entries(productSales)
    .map(([productId, data]) => ({
      productId,
      title: data.title,
      quantity: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    orderCount,
    itemCount,
    grossRevenue,
    netRevenue: grossRevenue - feeTotal,
    topProducts,
  };
}

/**
 * 売上トレンドデータを取得
 */
export async function getSalesTrend(options: {
  days: number;
  marketplace?: 'JOOM' | 'EBAY';
  groupBy: 'day' | 'week';
}): Promise<Array<{
  date: string;
  orderCount: number;
  revenue: number;
  itemCount: number;
}>> {
  const { days, marketplace, groupBy } = options;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 日次サマリーを取得
  const summaries = await prisma.salesSummary.findMany({
    where: {
      periodType: groupBy === 'day' ? 'DAILY' : 'WEEKLY',
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
      marketplace: marketplace || null,
      category: null,
    },
    orderBy: { periodStart: 'asc' },
  });

  return summaries.map(s => ({
    date: s.periodStart.toISOString().split('T')[0],
    orderCount: s.orderCount,
    revenue: s.grossRevenue,
    itemCount: s.itemCount,
  }));
}

/**
 * バッチで過去のサマリーを計算
 */
export async function backfillSalesSummaries(days: number = 30): Promise<{
  calculated: number;
  errors: number;
}> {
  let calculated = 0;
  let errors = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    try {
      await calculateDailySummary(date);
      await calculateDailySummary(date, 'JOOM');
      await calculateDailySummary(date, 'EBAY');
      calculated += 3;
    } catch (error) {
      log.error({ date, error }, 'Failed to calculate daily summary');
      errors++;
    }
  }

  log.info({ calculated, errors, days }, 'Backfill completed');

  return { calculated, errors };
}

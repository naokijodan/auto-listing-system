import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';
import { notifyDailyReport } from './notifications';

// 為替レートのデフォルト値（USD/JPY）
const DEFAULT_USD_TO_JPY = 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

const log = logger.child({ module: 'daily-report' });

/**
 * 日次レポートデータ
 */
export interface DailyReportData {
  date: string;
  products: {
    total: number;
    new: number;
    active: number;
    outOfStock: number;
    error: number;
  };
  listings: {
    total: number;
    published: number;
    active: number;
    sold: number;
    ended: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    byType: Record<string, { completed: number; failed: number }>;
  };
  inventoryChecks: {
    total: number;
    outOfStockDetected: number;
    priceChangesDetected: number;
  };
  exchangeRate: {
    current: number;
    previousDay: number;
    change: number;
  };
  errors: Array<{
    type: string;
    count: number;
    lastError: string;
  }>;
}

/**
 * 日次レポートを生成
 */
export async function generateDailyReport(date?: Date): Promise<DailyReportData> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const previousDay = new Date(startOfDay);
  previousDay.setDate(previousDay.getDate() - 1);

  log.info({ type: 'generating_daily_report', date: startOfDay.toISOString() });

  // 商品統計
  const [
    totalProducts,
    newProducts,
    activeProducts,
    outOfStockProducts,
    errorProducts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'OUT_OF_STOCK' } }),
    prisma.product.count({ where: { status: 'ERROR' } }),
  ]);

  // 出品統計
  const [
    totalListings,
    publishedListings,
    activeListings,
    soldListings,
    endedListings,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({
      where: { listedAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({
      where: { soldAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.listing.count({
      where: {
        status: 'ENDED',
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
  ]);

  // ジョブ統計
  const jobLogs = await prisma.jobLog.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    select: {
      jobType: true,
      status: true,
    },
  });

  const jobStats = {
    total: jobLogs.length,
    completed: jobLogs.filter(j => j.status === 'COMPLETED').length,
    failed: jobLogs.filter(j => j.status === 'FAILED').length,
    byType: {} as Record<string, { completed: number; failed: number }>,
  };

  for (const job of jobLogs) {
    if (!jobStats.byType[job.jobType]) {
      jobStats.byType[job.jobType] = { completed: 0, failed: 0 };
    }
    if (job.status === 'COMPLETED') {
      jobStats.byType[job.jobType].completed++;
    } else if (job.status === 'FAILED') {
      jobStats.byType[job.jobType].failed++;
    }
  }

  // 在庫チェック統計
  const inventoryLogs = await prisma.jobLog.findMany({
    where: {
      jobType: 'INVENTORY_CHECK',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      result: true,
    },
  });

  let outOfStockDetected = 0;
  let priceChangesDetected = 0;

  for (const log of inventoryLogs) {
    const result = log.result as any;
    if (result?.isAvailable === false) outOfStockDetected++;
    if (result?.priceChanged === true) priceChangesDetected++;
  }

  // 為替レート
  const [currentRate, previousRate] = await Promise.all([
    prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    }),
    prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        fetchedAt: { lt: startOfDay },
      },
      orderBy: { fetchedAt: 'desc' },
    }),
  ]);

  const currentJpyPerUsd = currentRate ? 1 / currentRate.rate : DEFAULT_USD_TO_JPY;
  const previousJpyPerUsd = previousRate ? 1 / previousRate.rate : currentJpyPerUsd;
  const rateChange = ((currentJpyPerUsd - previousJpyPerUsd) / previousJpyPerUsd) * 100;

  // エラーサマリー
  const errorLogs = await prisma.jobLog.findMany({
    where: {
      status: 'FAILED',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      jobType: true,
      errorMessage: true,
    },
  });

  const errorSummary: Record<string, { count: number; lastError: string }> = {};
  for (const error of errorLogs) {
    if (!errorSummary[error.jobType]) {
      errorSummary[error.jobType] = { count: 0, lastError: '' };
    }
    errorSummary[error.jobType].count++;
    errorSummary[error.jobType].lastError = error.errorMessage || 'Unknown error';
  }

  const errors = Object.entries(errorSummary).map(([type, data]) => ({
    type,
    count: data.count,
    lastError: data.lastError,
  }));

  const report: DailyReportData = {
    date: startOfDay.toISOString().split('T')[0],
    products: {
      total: totalProducts,
      new: newProducts,
      active: activeProducts,
      outOfStock: outOfStockProducts,
      error: errorProducts,
    },
    listings: {
      total: totalListings,
      published: publishedListings,
      active: activeListings,
      sold: soldListings,
      ended: endedListings,
    },
    jobs: jobStats,
    inventoryChecks: {
      total: inventoryLogs.length,
      outOfStockDetected,
      priceChangesDetected,
    },
    exchangeRate: {
      current: currentJpyPerUsd,
      previousDay: previousJpyPerUsd,
      change: rateChange,
    },
    errors,
  };

  log.info({ type: 'daily_report_generated', date: report.date });

  return report;
}

/**
 * 日次レポートを生成して通知
 */
export async function sendDailyReportNotification(): Promise<void> {
  const report = await generateDailyReport();

  await notifyDailyReport({
    newProducts: report.products.new,
    publishedListings: report.listings.published,
    soldListings: report.listings.sold,
    outOfStock: report.inventoryChecks.outOfStockDetected,
    errors: report.jobs.failed,
  });
}

/**
 * 週次サマリーを生成
 */
export async function generateWeeklySummary(): Promise<{
  week: string;
  totalNewProducts: number;
  totalPublished: number;
  totalSold: number;
  totalErrors: number;
  avgDailyProducts: number;
  topErrors: Array<{ type: string; count: number }>;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [newProducts, published, sold, errorLogs] = await Promise.all([
    prisma.product.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.listing.count({
      where: { listedAt: { gte: startDate, lte: endDate } },
    }),
    prisma.listing.count({
      where: { soldAt: { gte: startDate, lte: endDate } },
    }),
    prisma.jobLog.findMany({
      where: {
        status: 'FAILED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { jobType: true },
    }),
  ]);

  const errorCounts: Record<string, number> = {};
  for (const log of errorLogs) {
    errorCounts[log.jobType] = (errorCounts[log.jobType] || 0) + 1;
  }

  const topErrors = Object.entries(errorCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    week: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    totalNewProducts: newProducts,
    totalPublished: published,
    totalSold: sold,
    totalErrors: errorLogs.length,
    avgDailyProducts: Math.round(newProducts / 7),
    topErrors,
  };
}

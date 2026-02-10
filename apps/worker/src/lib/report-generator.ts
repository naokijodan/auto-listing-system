import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as fs from 'fs';
import * as path from 'path';

const log = logger.child({ module: 'report-generator' });

// ========================================
// 型定義
// ========================================

interface DailyReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  averageProfit: number;
  activeListings: number;
  newListings: number;
  soldItems: number;
  topProducts: Array<{
    title: string;
    sales: number;
    profit: number;
  }>;
}

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  dailyReports: DailyReport[];
  summary: {
    totalSales: number;
    totalOrders: number;
    totalProfit: number;
    profitMargin: number;
    bestDay: string;
    worstDay: string;
  };
}

interface ReportSaveResult {
  id: string;
  date: string;
  type: 'daily' | 'weekly';
}

// ========================================
// 日次売上レポート生成
// ========================================

/**
 * 日次売上レポートを生成
 * @param date 対象日（省略時は当日）
 */
export async function generateDailySalesReport(date?: Date): Promise<DailyReport> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dateStr = startOfDay.toISOString().split('T')[0];

  log.info({ type: 'daily_sales_report_start', date: dateStr });

  // 注文データ集計
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      sales: true,
    },
  });

  let totalSales = 0;
  let totalProfit = 0;
  const productSales: Record<string, { title: string; sales: number; profit: number }> = {};

  // 為替レート取得（最新）
  const exchangeRateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });
  const exchangeRate = exchangeRateRecord ? 1 / exchangeRateRecord.rate : 150;

  for (const order of orders) {
    totalSales += order.total || 0;

    for (const sale of order.sales) {
      const saleUsd = sale.totalPrice || 0;
      const costJpy = sale.costPrice || 0;

      // 利益計算: (売上USD * 為替レート * 手数料控除後) - 仕入原価
      // プラットフォーム手数料を約15%として計算
      const profit = sale.profitJpy || ((saleUsd * exchangeRate * 0.85) - costJpy);
      totalProfit += profit;

      const key = sale.sku;
      if (!productSales[key]) {
        productSales[key] = {
          title: sale.title || 'Unknown',
          sales: 0,
          profit: 0,
        };
      }
      productSales[key].sales += saleUsd;
      productSales[key].profit += profit;
    }
  }

  // リスティング統計
  const [activeListings, newListings, soldItems] = await Promise.all([
    prisma.listing.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.listing.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.listing.count({
      where: {
        status: 'SOLD',
        soldAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
  ]);

  // トップ商品（利益順）
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const report: DailyReport = {
    date: dateStr,
    totalSales,
    totalOrders: orders.length,
    totalProfit,
    averageProfit: orders.length > 0 ? totalProfit / orders.length : 0,
    activeListings,
    newListings,
    soldItems,
    topProducts,
  };

  log.info({
    type: 'daily_sales_report_complete',
    date: dateStr,
    totalOrders: orders.length,
    totalSales,
    totalProfit,
  });

  return report;
}

// ========================================
// 週次利益レポート生成
// ========================================

/**
 * 週次利益レポートを生成
 * @param weekStart 週の開始日（省略時は直近の月曜日）
 */
export async function generateWeeklySalesReport(weekStart?: Date): Promise<WeeklyReport> {
  const start = weekStart || getLastMonday();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  log.info({
    type: 'weekly_sales_report_start',
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
  });

  const dailyReports: DailyReport[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const report = await generateDailySalesReport(day);
    dailyReports.push(report);
  }

  const totalSales = dailyReports.reduce((sum, r) => sum + r.totalSales, 0);
  const totalOrders = dailyReports.reduce((sum, r) => sum + r.totalOrders, 0);
  const totalProfit = dailyReports.reduce((sum, r) => sum + r.totalProfit, 0);

  // 最高/最低利益日を取得（注文がある日のみ）
  const daysWithOrders = dailyReports.filter(r => r.totalOrders > 0);

  let bestDay = dailyReports[0];
  let worstDay = dailyReports[0];

  if (daysWithOrders.length > 0) {
    bestDay = daysWithOrders.reduce((best, r) => r.totalProfit > best.totalProfit ? r : best);
    worstDay = daysWithOrders.reduce((worst, r) => r.totalProfit < worst.totalProfit ? r : worst);
  }

  const report: WeeklyReport = {
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
    dailyReports,
    summary: {
      totalSales,
      totalOrders,
      totalProfit,
      profitMargin: totalSales > 0 ? (totalProfit / (totalSales * 150)) * 100 : 0,
      bestDay: bestDay.date,
      worstDay: worstDay.date,
    },
  };

  log.info({
    type: 'weekly_sales_report_complete',
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    totalOrders,
    totalSales,
    totalProfit,
  });

  return report;
}

// ========================================
// CSV出力機能
// ========================================

/**
 * レポートをCSVファイルに出力
 * @param report 日次または週次レポート
 * @param filePath 出力先パス
 */
export function exportReportToCSV(report: DailyReport | WeeklyReport, filePath: string): void {
  let csv = '';

  if ('dailyReports' in report) {
    // 週次レポート
    csv = 'Date,Sales (USD),Orders,Profit (JPY),Active Listings,New Listings,Sold Items\n';
    for (const day of report.dailyReports) {
      csv += `${day.date},${day.totalSales.toFixed(2)},${day.totalOrders},${day.totalProfit.toFixed(0)},${day.activeListings},${day.newListings},${day.soldItems}\n`;
    }
    csv += '\nWeekly Summary\n';
    csv += `Period,${report.weekStart} - ${report.weekEnd}\n`;
    csv += `Total Sales (USD),${report.summary.totalSales.toFixed(2)}\n`;
    csv += `Total Orders,${report.summary.totalOrders}\n`;
    csv += `Total Profit (JPY),${report.summary.totalProfit.toFixed(0)}\n`;
    csv += `Profit Margin,${report.summary.profitMargin.toFixed(2)}%\n`;
    csv += `Best Day,${report.summary.bestDay}\n`;
    csv += `Worst Day,${report.summary.worstDay}\n`;
  } else {
    // 日次レポート
    csv = 'Metric,Value\n';
    csv += `Date,${report.date}\n`;
    csv += `Total Sales (USD),${report.totalSales.toFixed(2)}\n`;
    csv += `Total Orders,${report.totalOrders}\n`;
    csv += `Total Profit (JPY),${report.totalProfit.toFixed(0)}\n`;
    csv += `Average Profit (JPY),${report.averageProfit.toFixed(0)}\n`;
    csv += `Active Listings,${report.activeListings}\n`;
    csv += `New Listings,${report.newListings}\n`;
    csv += `Sold Items,${report.soldItems}\n`;

    if (report.topProducts.length > 0) {
      csv += '\nTop Products by Profit\n';
      csv += 'Rank,Title,Sales (USD),Profit (JPY)\n';
      report.topProducts.forEach((product, index) => {
        csv += `${index + 1},"${product.title.replace(/"/g, '""')}",${product.sales.toFixed(2)},${product.profit.toFixed(0)}\n`;
      });
    }
  }

  // ディレクトリが存在しない場合は作成
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, csv, 'utf-8');
  log.info({ type: 'csv_exported', filePath, reportType: 'dailyReports' in report ? 'weekly' : 'daily' });
}

// ========================================
// レポート保存（DB）
// ========================================

/**
 * レポートをDBに保存
 * @param report 日次または週次レポート
 * @param type レポートタイプ
 */
export async function saveReportToDb(
  report: DailyReport | WeeklyReport,
  type: 'daily' | 'weekly'
): Promise<ReportSaveResult> {
  const reportDate = 'dailyReports' in report ? report.weekStart : report.date;

  // ShadowLogに保存（レポート履歴として活用）
  const shadowLog = await prisma.shadowLog.create({
    data: {
      service: 'report-generator',
      operation: `${type}_report`,
      input: { date: reportDate, type },
      output: JSON.parse(JSON.stringify(report)),
      decision: 'GENERATED',
      isDryRun: false,
    },
  });

  log.info({
    type: 'report_saved_to_db',
    shadowLogId: shadowLog.id,
    reportType: type,
    reportDate,
  });

  return {
    id: shadowLog.id,
    date: reportDate,
    type,
  };
}

/**
 * 保存済みレポートを取得
 * @param type レポートタイプ
 * @param date 対象日
 */
export async function getSavedReport(
  type: 'daily' | 'weekly',
  date: string
): Promise<DailyReport | WeeklyReport | null> {
  const shadowLog = await prisma.shadowLog.findFirst({
    where: {
      service: 'report-generator',
      operation: `${type}_report`,
      input: {
        path: ['date'],
        equals: date,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!shadowLog) {
    return null;
  }

  return shadowLog.output as unknown as DailyReport | WeeklyReport;
}

/**
 * 期間内のレポート一覧を取得
 * @param type レポートタイプ
 * @param startDate 開始日
 * @param endDate 終了日
 */
export async function getReportHistory(
  type: 'daily' | 'weekly',
  startDate: Date,
  endDate: Date
): Promise<Array<{ id: string; date: string; createdAt: Date }>> {
  const shadowLogs = await prisma.shadowLog.findMany({
    where: {
      service: 'report-generator',
      operation: `${type}_report`,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      input: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return shadowLogs.map(log => ({
    id: log.id,
    date: (log.input as { date?: string })?.date || 'unknown',
    createdAt: log.createdAt,
  }));
}

// ========================================
// 統合レポート生成関数
// ========================================

/**
 * 日次レポートを生成・保存・CSV出力（オールインワン）
 * @param date 対象日（省略時は当日）
 * @param options オプション
 */
export async function runDailyReportJob(
  date?: Date,
  options?: {
    saveToDb?: boolean;
    exportCsv?: boolean;
    csvDir?: string;
  }
): Promise<{
  report: DailyReport;
  savedTo?: ReportSaveResult;
  csvPath?: string;
}> {
  const saveToDb = options?.saveToDb ?? true;
  const exportCsv = options?.exportCsv ?? false;
  const csvDir = options?.csvDir || '/tmp/reports';

  log.info({ type: 'daily_report_job_start', date: date?.toISOString() || 'today' });

  // レポート生成
  const report = await generateDailySalesReport(date);

  const result: {
    report: DailyReport;
    savedTo?: ReportSaveResult;
    csvPath?: string;
  } = { report };

  // DB保存
  if (saveToDb) {
    result.savedTo = await saveReportToDb(report, 'daily');
  }

  // CSV出力
  if (exportCsv) {
    const csvPath = path.join(csvDir, `daily-report-${report.date}.csv`);
    exportReportToCSV(report, csvPath);
    result.csvPath = csvPath;
  }

  log.info({ type: 'daily_report_job_complete', date: report.date });

  return result;
}

/**
 * 週次レポートを生成・保存・CSV出力（オールインワン）
 * @param weekStart 週の開始日（省略時は直近の月曜日）
 * @param options オプション
 */
export async function runWeeklyReportJob(
  weekStart?: Date,
  options?: {
    saveToDb?: boolean;
    exportCsv?: boolean;
    csvDir?: string;
  }
): Promise<{
  report: WeeklyReport;
  savedTo?: ReportSaveResult;
  csvPath?: string;
}> {
  const saveToDb = options?.saveToDb ?? true;
  const exportCsv = options?.exportCsv ?? false;
  const csvDir = options?.csvDir || '/tmp/reports';

  log.info({ type: 'weekly_report_job_start', weekStart: weekStart?.toISOString() || 'last monday' });

  // レポート生成
  const report = await generateWeeklySalesReport(weekStart);

  const result: {
    report: WeeklyReport;
    savedTo?: ReportSaveResult;
    csvPath?: string;
  } = { report };

  // DB保存
  if (saveToDb) {
    result.savedTo = await saveReportToDb(report, 'weekly');
  }

  // CSV出力
  if (exportCsv) {
    const csvPath = path.join(csvDir, `weekly-report-${report.weekStart}.csv`);
    exportReportToCSV(report, csvPath);
    result.csvPath = csvPath;
  }

  log.info({ type: 'weekly_report_job_complete', weekStart: report.weekStart });

  return result;
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 直近の月曜日を取得
 */
function getLastMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  return monday;
}

// 型エクスポート
export type { DailyReport, WeeklyReport, ReportSaveResult };

/**
 * レポート機能強化サービス
 * Phase 28: PDF/Excel出力、グラフ生成
 */

import { prisma, ReportFormat, ReportStatus, ReportType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as fs from 'fs';
import * as path from 'path';

const log = logger.child({ module: 'report-service' });

// レポート生成オプション
export interface ReportOptions {
  name: string;
  description?: string;
  reportType: ReportType;
  format: ReportFormat;
  templateId?: string;
  parameters?: Record<string, unknown>;
  timeRange?: string;
  orientation?: string;
  paperSize?: string;
}

// レポートデータ
export interface ReportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  summary?: Record<string, number>;
  charts?: ChartData[];
}

// チャートデータ
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

// レポート生成結果
export interface ReportResult {
  id: string;
  status: ReportStatus;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

/**
 * レポートを生成
 */
export async function generateReport(
  options: ReportOptions,
  generatedBy?: string
): Promise<ReportResult> {
  // レポートレコードを作成
  const report = await prisma.report.create({
    data: {
      name: options.name,
      description: options.description,
      reportType: options.reportType,
      format: options.format,
      templateId: options.templateId,
      parameters: (options.parameters || {}) as any,
      timeRange: options.timeRange,
      orientation: options.orientation || 'portrait',
      paperSize: options.paperSize || 'A4',
      generatedBy,
      status: 'PENDING',
    },
  });

  log.info({ reportId: report.id, name: options.name, reportType: options.reportType, format: options.format }, 'Report generation started');

  try {
    // レポートデータを収集
    const data = await collectReportData(options);

    // ステータスを処理中に更新
    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'GENERATING', startedAt: new Date() },
    });

    // フォーマットに応じてファイルを生成
    let fileName: string;
    let filePath: string;
    let fileSize: number;
    let mimeType: string;

    switch (options.format) {
      case 'PDF':
        ({ fileName, filePath, fileSize, mimeType } = await generatePdfReport(report.id, options, data));
        break;
      case 'EXCEL':
        ({ fileName, filePath, fileSize, mimeType } = await generateExcelReport(report.id, options, data));
        break;
      case 'CSV':
        ({ fileName, filePath, fileSize, mimeType } = await generateCsvReport(report.id, options, data));
        break;
      case 'HTML':
        ({ fileName, filePath, fileSize, mimeType } = await generateHtmlReport(report.id, options, data));
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // 成功時の更新
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        fileName,
        filePath,
        fileSize,
        mimeType,
        completedAt: new Date(),
      },
    });

    log.info({ reportId: report.id, fileName, fileSize }, 'Report generated successfully');

    return {
      id: report.id,
      status: 'COMPLETED',
      fileName,
      filePath,
      fileSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    });

    log.error({ reportId: report.id, error: errorMessage }, 'Report generation failed');

    return {
      id: report.id,
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

/**
 * レポートデータを収集
 */
async function collectReportData(options: ReportOptions): Promise<ReportData> {
  const { reportType, parameters } = options;

  const where: any = {};
  if (parameters?.startDate) {
    where.createdAt = { gte: new Date(parameters.startDate as string) };
  }
  if (parameters?.endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(parameters.endDate as string) };
  }

  switch (reportType) {
    case 'SALES_SUMMARY':
      return collectSalesData(where, parameters);
    case 'INVENTORY_STATUS':
      return collectInventoryData(where, parameters);
    case 'PRODUCT_PERFORMANCE':
      return collectProductsData(where, parameters);
    case 'ORDER_DETAIL':
      return collectOrdersData(where, parameters);
    case 'CUSTOMER_ANALYSIS':
      return collectCustomersData(where, parameters);
    case 'PROFIT_ANALYSIS':
      return collectProfitData(where, parameters);
    case 'MARKETPLACE_COMPARISON':
      return collectMarketplaceData(where, parameters);
    case 'AUDIT_REPORT':
      return collectAuditData(where, parameters);
    case 'CUSTOM':
      return collectCustomData(options);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * 売上データを収集
 */
async function collectSalesData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const salesWhere: any = {};
  if (params?.marketplace) {
    salesWhere.marketplace = params.marketplace;
  }

  const summaries = await prisma.salesSummary.findMany({
    where: salesWhere,
    orderBy: { periodStart: 'desc' },
    take: 1000,
  });

  const headers = ['期間', 'マーケットプレイス', '売上', '注文数', '純売上', '利益', '利益率'];
  const rows = summaries.map((s) => [
    s.periodStart.toISOString().split('T')[0],
    s.marketplace || 'ALL',
    s.grossRevenue,
    s.orderCount,
    s.netRevenue,
    s.profitTotal ?? 0,
    `${(s.profitRate ?? 0).toFixed(1)}%`,
  ]);

  const summary = {
    totalRevenue: summaries.reduce((sum, s) => sum + s.grossRevenue, 0),
    totalOrders: summaries.reduce((sum, s) => sum + s.orderCount, 0),
    totalProfit: summaries.reduce((sum, s) => sum + (s.profitTotal ?? 0), 0),
  };

  return { headers, rows, summary };
}

/**
 * 在庫データを収集
 */
async function collectInventoryData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const inventoryWhere: any = { ...where };
  if (params?.status) {
    inventoryWhere.status = params.status;
  }

  const products = await prisma.product.findMany({
    where: inventoryWhere,
    select: {
      id: true,
      title: true,
      sourceItemId: true,
      price: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  });

  const headers = ['商品ID', '商品名', '価格', 'ステータス', '最終更新'];
  const rows = products.map((p) => [
    p.sourceItemId || 'N/A',
    p.title,
    Number(p.price),
    p.status,
    p.updatedAt.toISOString().split('T')[0],
  ]);

  const summary = {
    totalProducts: products.length,
  };

  return { headers, rows, summary };
}

/**
 * 商品パフォーマンスデータを収集
 */
async function collectProductsData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      title: true,
      sourceItemId: true,
      price: true,
      status: true,
      source: { select: { type: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const headers = ['商品ID', '商品名', '価格', 'ソース', 'ステータス', '登録日'];
  const rows = products.map((p) => [
    p.sourceItemId || 'N/A',
    p.title,
    Number(p.price),
    p.source.type,
    p.status,
    p.createdAt.toISOString().split('T')[0],
  ]);

  return { headers, rows };
}

/**
 * 注文データを収集
 */
async function collectOrdersData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const orderWhere: any = { ...where };
  if (params?.status) {
    orderWhere.status = params.status;
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: {
      id: true,
      marketplaceOrderId: true,
      marketplace: true,
      buyerName: true,
      buyerUsername: true,
      total: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      orderedAt: true,
    },
    orderBy: { orderedAt: 'desc' },
    take: 1000,
  });

  const headers = ['注文番号', 'マーケットプレイス', '購入者', '合計金額', 'ステータス', '支払状況', '配送状況', '注文日'];
  const rows = orders.map((o) => [
    o.marketplaceOrderId,
    o.marketplace,
    o.buyerName || o.buyerUsername || 'N/A',
    Number(o.total),
    o.status,
    o.paymentStatus,
    o.fulfillmentStatus,
    o.orderedAt.toISOString().split('T')[0],
  ]);

  const summary = {
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + Number(o.total), 0),
  };

  return { headers, rows, summary };
}

/**
 * 顧客データを収集（プライバシー配慮）
 */
async function collectCustomersData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  // 集計データのみを返す
  const orders = await prisma.order.groupBy({
    by: ['marketplace'],
    _count: { id: true },
    _sum: { total: true },
    where,
  });

  const headers = ['マーケットプレイス', '注文数', '総売上'];
  const rows = orders.map((o) => [o.marketplace, o._count.id, Number(o._sum.total || 0)]);

  return { headers, rows };
}

/**
 * 利益分析データを収集
 */
async function collectProfitData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const summaries = await prisma.salesSummary.findMany({
    orderBy: { periodStart: 'asc' },
    take: 365,
  });

  const headers = ['期間', '売上', '原価', '粗利', '手数料', '純利益', '利益率'];
  const rows = summaries.map((s) => {
    const grossProfit = s.grossRevenue - (s.costTotal ?? 0);
    const netProfit = s.netRevenue - (s.costTotal ?? 0);
    const profitMargin = s.grossRevenue > 0 ? (netProfit / s.grossRevenue) * 100 : 0;
    return [
      s.periodStart.toISOString().split('T')[0],
      s.grossRevenue,
      s.costTotal ?? 0,
      grossProfit,
      s.feeTotal,
      netProfit,
      `${profitMargin.toFixed(1)}%`,
    ];
  });

  return { headers, rows };
}

/**
 * マーケットプレイス比較データを収集
 */
async function collectMarketplaceData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const summaries = await prisma.salesSummary.groupBy({
    by: ['marketplace'],
    _sum: { grossRevenue: true, profitTotal: true, orderCount: true },
    _avg: { profitRate: true },
  });

  const headers = ['マーケットプレイス', '売上', '利益', '注文数', '平均利益率'];
  const rows = summaries.map((s) => [
    s.marketplace || 'N/A',
    Number(s._sum?.grossRevenue || 0),
    Number(s._sum?.profitTotal || 0),
    s._sum?.orderCount || 0,
    `${Number(s._avg?.profitRate || 0).toFixed(1)}%`,
  ]);

  return { headers, rows };
}

/**
 * 監査データを収集
 */
async function collectAuditData(where: any, params?: Record<string, unknown>): Promise<ReportData> {
  const auditWhere: any = { ...where };
  if (params?.action) {
    auditWhere.action = params.action;
  }

  const logs = await prisma.auditLog.findMany({
    where: auditWhere,
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const headers = ['日時', 'アクター', 'アクション', 'エンティティタイプ', 'エンティティID', 'IPアドレス'];
  const rows = logs.map((l) => [
    l.createdAt.toISOString(),
    l.actorName || l.actorId || 'system',
    l.action,
    l.entityType,
    l.entityId || 'N/A',
    l.ipAddress || 'N/A',
  ]);

  return { headers, rows };
}

/**
 * カスタムデータを収集
 */
async function collectCustomData(options: ReportOptions): Promise<ReportData> {
  // カスタムクエリはパラメータから取得
  const { parameters } = options;
  if (!parameters?.query) {
    throw new Error('Custom report requires query parameter');
  }

  // セキュリティ上、プリセットクエリのみ許可
  const presetQueries: Record<string, () => Promise<ReportData>> = {
    top_products: async () => {
      const products = await prisma.product.findMany({
        orderBy: { price: 'desc' },
        take: 10,
        select: { title: true, price: true, status: true },
      });
      return {
        headers: ['商品名', '価格', 'ステータス'],
        rows: products.map((p) => [p.title, Number(p.price), p.status]),
      };
    },
  };

  const queryName = String(parameters.query);
  if (!presetQueries[queryName]) {
    throw new Error(`Unknown preset query: ${queryName}`);
  }

  return presetQueries[queryName]();
}

/**
 * PDFレポートを生成
 */
async function generatePdfReport(
  reportId: string,
  options: ReportOptions,
  data: ReportData
): Promise<{ fileName: string; filePath: string; fileSize: number; mimeType: string }> {
  const fileName = `report_${reportId}.pdf`;
  const filePath = path.join('/tmp/reports', fileName);

  // ディレクトリを作成
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  // PDF生成（シミュレーション）
  // 実際のプロダクションではpdfkit, puppeteer, またはpdfmakeを使用
  const pdfContent = generatePdfContent(options, data);
  await fs.promises.writeFile(filePath, Buffer.from(pdfContent));

  const stats = await fs.promises.stat(filePath);

  log.info({ reportId, fileName }, 'PDF report generated');

  return { fileName, filePath, fileSize: stats.size, mimeType: 'application/pdf' };
}

/**
 * PDFコンテンツを生成（シミュレーション）
 */
function generatePdfContent(options: ReportOptions, data: ReportData): string {
  const content = [
    `%PDF-1.4`,
    `% RAKUDA Report: ${options.name}`,
    `% Generated: ${new Date().toISOString()}`,
    ``,
    `Headers: ${data.headers.join(', ')}`,
    `Rows: ${data.rows.length}`,
  ];

  if (data.summary) {
    content.push(`Summary: ${JSON.stringify(data.summary)}`);
  }

  return content.join('\n');
}

/**
 * Excelレポートを生成
 */
async function generateExcelReport(
  reportId: string,
  options: ReportOptions,
  data: ReportData
): Promise<{ fileName: string; filePath: string; fileSize: number; mimeType: string }> {
  const fileName = `report_${reportId}.xlsx`;
  const filePath = path.join('/tmp/reports', fileName);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const excelContent = generateExcelContent(options, data);
  await fs.promises.writeFile(filePath, Buffer.from(excelContent));

  const stats = await fs.promises.stat(filePath);

  log.info({ reportId, fileName }, 'Excel report generated');

  return {
    fileName,
    filePath,
    fileSize: stats.size,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Excelコンテンツを生成（シミュレーション）
 */
function generateExcelContent(options: ReportOptions, data: ReportData): string {
  const lines = [
    data.headers.join('\t'),
    ...data.rows.map((row) => row.map((cell) => String(cell ?? '')).join('\t')),
  ];
  return lines.join('\n');
}

/**
 * CSVレポートを生成
 */
async function generateCsvReport(
  reportId: string,
  options: ReportOptions,
  data: ReportData
): Promise<{ fileName: string; filePath: string; fileSize: number; mimeType: string }> {
  const fileName = `report_${reportId}.csv`;
  const filePath = path.join('/tmp/reports', fileName);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const csvContent = [
    data.headers.map((h) => `"${h}"`).join(','),
    ...data.rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null) return '';
          if (typeof cell === 'string') return `"${cell.replace(/"/g, '""')}"`;
          return String(cell);
        })
        .join(',')
    ),
  ].join('\n');

  await fs.promises.writeFile(filePath, '\uFEFF' + csvContent, 'utf8');

  const stats = await fs.promises.stat(filePath);

  log.info({ reportId, fileName }, 'CSV report generated');

  return { fileName, filePath, fileSize: stats.size, mimeType: 'text/csv' };
}

/**
 * HTMLレポートを生成
 */
async function generateHtmlReport(
  reportId: string,
  options: ReportOptions,
  data: ReportData
): Promise<{ fileName: string; filePath: string; fileSize: number; mimeType: string }> {
  const fileName = `report_${reportId}.html`;
  const filePath = path.join('/tmp/reports', fileName);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.name} - RAKUDA Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #007bff; color: white; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    .summary { background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary h3 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>${options.name}</h1>
  <div class="meta">
    <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
    ${options.description ? `<p>${options.description}</p>` : ''}
  </div>

  ${
    data.summary
      ? `
  <div class="summary">
    <h3>サマリー</h3>
    <ul>
      ${Object.entries(data.summary)
        .map(([key, value]) => `<li><strong>${key}:</strong> ${typeof value === 'number' ? value.toLocaleString() : value}</li>`)
        .join('')}
    </ul>
  </div>
  `
      : ''
  }

  <table>
    <thead>
      <tr>
        ${data.headers.map((h) => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows
        .map(
          (row) => `
        <tr>
          ${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <footer style="margin-top: 40px; color: #666; font-size: 12px;">
    Generated by RAKUDA Report System
  </footer>
</body>
</html>
  `.trim();

  await fs.promises.writeFile(filePath, htmlContent, 'utf8');

  const stats = await fs.promises.stat(filePath);

  log.info({ reportId, fileName }, 'HTML report generated');

  return { fileName, filePath, fileSize: stats.size, mimeType: 'text/html' };
}

/**
 * スケジュールされたレポートを実行
 */
export async function executeScheduledReports(): Promise<{ executed: number; succeeded: number; failed: number }> {
  const now = new Date();

  const schedules = await prisma.reportScheduleConfig.findMany({
    where: {
      isActive: true,
      OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
    },
    include: {
      template: true,
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      const execution = await prisma.reportExecution.create({
        data: {
          scheduleId: schedule.id,
          status: 'GENERATING',
          startedAt: now,
        },
      });

      const result = await generateReport({
        name: schedule.template.name,
        description: schedule.template.description || undefined,
        reportType: schedule.template.reportType,
        format: schedule.format,
        templateId: schedule.templateId,
        parameters: (schedule.parameters as Record<string, unknown>) || undefined,
      });

      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          reportId: result.id,
          completedAt: new Date(),
          errorMessage: result.error,
        },
      });

      const nextRunAt = calculateNextRunTime(schedule.cronExpression);
      await prisma.reportScheduleConfig.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastRunStatus: result.status,
          nextRunAt,
        },
      });

      if (result.status === 'COMPLETED') {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      log.error({ scheduleId: schedule.id, error }, 'Scheduled report execution failed');
      failed++;
    }
  }

  log.info({ executed: schedules.length, succeeded, failed }, 'Scheduled reports executed');

  return { executed: schedules.length, succeeded, failed };
}

/**
 * 次回実行時刻を計算（簡易実装）
 */
function calculateNextRunTime(cronExpression: string): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * レポートをダウンロード可能か確認
 */
export async function getReportDownloadInfo(reportId: string): Promise<{
  available: boolean;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  expiresAt?: Date;
}> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report || report.status !== 'COMPLETED' || !report.filePath) {
    return { available: false };
  }

  try {
    await fs.promises.access(report.filePath);
    return {
      available: true,
      fileName: report.fileName || undefined,
      filePath: report.filePath,
      fileSize: report.fileSize || undefined,
      expiresAt: report.expiresAt || undefined,
    };
  } catch {
    return { available: false };
  }
}

/**
 * 古いレポートをクリーンアップ
 */
export async function cleanupOldReports(retentionDays: number = 30): Promise<{ deleted: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldReports = await prisma.report.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: 'COMPLETED',
    },
    select: { id: true, filePath: true },
  });

  let deleted = 0;

  for (const report of oldReports) {
    try {
      if (report.filePath) {
        await fs.promises.unlink(report.filePath).catch(() => {});
      }
      await prisma.report.delete({ where: { id: report.id } });
      deleted++;
    } catch (error) {
      log.error({ reportId: report.id, error }, 'Failed to delete old report');
    }
  }

  log.info({ deleted, retentionDays }, 'Old reports cleaned up');

  return { deleted };
}

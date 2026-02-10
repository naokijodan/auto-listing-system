import { prisma, ExportType, ExportFormat, ExportJobStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as fs from 'fs';
import * as path from 'path';

const log = logger.child({ module: 'export-service' });

const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/exports';

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  marketplace?: 'JOOM' | 'EBAY';
  status?: string;
  category?: string;
  [key: string]: any;
}

interface ExportResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  totalRows: number;
}

/**
 * エクスポートジョブを作成
 */
export async function createExportJob(options: {
  exportType: ExportType;
  format?: ExportFormat;
  filters?: ExportFilters;
  requestedBy?: string;
}): Promise<string> {
  const job = await prisma.exportJob.create({
    data: {
      exportType: options.exportType,
      format: options.format || 'CSV',
      filters: options.filters as any || {},
      status: 'PENDING',
      requestedBy: options.requestedBy,
    },
  });

  log.info({
    jobId: job.id,
    exportType: options.exportType,
    format: options.format,
  }, 'Export job created');

  return job.id;
}

/**
 * エクスポートジョブを実行
 */
export async function executeExportJob(jobId: string): Promise<ExportResult> {
  const job = await prisma.exportJob.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new Error(`Export job not found: ${jobId}`);
  }

  // ステータスを更新
  await prisma.exportJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', progress: 0 },
  });

  try {
    // ディレクトリ確認
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const filters = job.filters as ExportFilters;
    let result: ExportResult;

    switch (job.exportType) {
      case 'ORDERS':
        result = await exportOrders(jobId, job.format, filters);
        break;
      case 'PRODUCTS':
        result = await exportProducts(jobId, job.format, filters);
        break;
      case 'LISTINGS':
        result = await exportListings(jobId, job.format, filters);
        break;
      case 'SALES_SUMMARY':
        result = await exportSalesSummary(jobId, job.format, filters);
        break;
      case 'INVENTORY':
        result = await exportInventory(jobId, job.format, filters);
        break;
      case 'AUDIT_LOG':
        result = await exportAuditLogs(jobId, job.format, filters);
        break;
      case 'CUSTOMER_MESSAGES':
        result = await exportCustomerMessages(jobId, job.format, filters);
        break;
      default:
        throw new Error(`Unsupported export type: ${job.exportType}`);
    }

    // 成功時にジョブを更新
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24時間後に期限切れ

    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        totalRows: result.totalRows,
        processedRows: result.totalRows,
        expiresAt,
        completedAt: new Date(),
      },
    });

    log.info({
      jobId,
      exportType: job.exportType,
      totalRows: result.totalRows,
      fileSize: result.fileSize,
    }, 'Export job completed');

    return result;
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    log.error({ jobId, error }, 'Export job failed');
    throw error;
  }
}

/**
 * 注文データをエクスポート
 */
async function exportOrders(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.orderedAt = {};
    if (filters.startDate) where.orderedAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.orderedAt.lte = new Date(filters.endDate);
  }
  if (filters.marketplace) where.marketplace = filters.marketplace;
  if (filters.status) where.status = filters.status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      sales: true,
    },
    orderBy: { orderedAt: 'desc' },
  });

  const rows = orders.map(order => ({
    注文ID: order.id,
    マーケットプレイス注文ID: order.marketplaceOrderId,
    マーケットプレイス: order.marketplace,
    ステータス: order.status,
    購入者名: order.buyerName,
    購入者メール: order.buyerEmail,
    小計: order.subtotal,
    送料: order.shippingCost,
    合計: order.total,
    通貨: order.currency,
    手数料: order.marketplaceFee,
    決済手数料: order.paymentFee,
    商品数: order.sales.length,
    注文日時: order.orderedAt?.toISOString(),
    支払日時: order.paidAt?.toISOString(),
    作成日時: order.createdAt.toISOString(),
  }));

  return writeExportFile(jobId, 'orders', format, rows);
}

/**
 * 商品データをエクスポート
 */
async function exportProducts(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;

  const products = await prisma.product.findMany({
    where,
    include: {
      listings: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = products.map(product => ({
    商品ID: product.id,
    タイトル: product.title,
    カテゴリ: product.category,
    ソースID: product.sourceId,
    ソースURL: product.sourceUrl,
    価格_円: product.price,
    状態: product.condition,
    ステータス: product.status,
    翻訳ステータス: product.translationStatus,
    出品数: product.listings.length,
    作成日時: product.createdAt.toISOString(),
    更新日時: product.updatedAt.toISOString(),
  }));

  return writeExportFile(jobId, 'products', format, rows);
}

/**
 * 出品データをエクスポート
 */
async function exportListings(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.marketplace) where.marketplace = filters.marketplace;
  if (filters.status) where.status = filters.status;

  const listings = await prisma.listing.findMany({
    where,
    include: {
      product: { select: { title: true, category: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = listings.map(listing => ({
    出品ID: listing.id,
    商品ID: listing.productId,
    商品タイトル: listing.product.title,
    カテゴリ: listing.product.category,
    マーケットプレイス: listing.marketplace,
    マーケットプレイス出品ID: listing.marketplaceListingId,
    出品価格_USD: listing.listingPrice,
    送料_USD: listing.shippingCost,
    通貨: listing.currency,
    ステータス: listing.status,
    自動制御有効: listing.autoStatusEnabled ? 'はい' : 'いいえ',
    在庫停止中: listing.pausedByInventory ? 'はい' : 'いいえ',
    出品日時: listing.listedAt?.toISOString(),
    作成日時: listing.createdAt.toISOString(),
  }));

  return writeExportFile(jobId, 'listings', format, rows);
}

/**
 * 売上サマリーをエクスポート
 */
async function exportSalesSummary(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.periodStart = {};
    if (filters.startDate) where.periodStart.gte = new Date(filters.startDate);
    if (filters.endDate) where.periodStart.lte = new Date(filters.endDate);
  }
  if (filters.marketplace) where.marketplace = filters.marketplace;

  const summaries = await prisma.salesSummary.findMany({
    where,
    orderBy: { periodStart: 'desc' },
  });

  const rows = summaries.map(s => ({
    期間タイプ: s.periodType,
    期間開始: s.periodStart.toISOString().split('T')[0],
    期間終了: s.periodEnd.toISOString().split('T')[0],
    マーケットプレイス: s.marketplace || '全体',
    カテゴリ: s.category || '全体',
    注文数: s.orderCount,
    商品数: s.itemCount,
    総売上: s.grossRevenue,
    送料合計: s.shippingTotal,
    手数料合計: s.feeTotal,
    純売上: s.netRevenue,
    原価合計: s.costTotal,
    利益合計: s.profitTotal,
    利益率: s.profitRate ? `${s.profitRate.toFixed(1)}%` : '',
    計算日時: s.calculatedAt.toISOString(),
  }));

  return writeExportFile(jobId, 'sales_summary', format, rows);
}

/**
 * 在庫データをエクスポート
 */
async function exportInventory(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const products = await prisma.product.findMany({
    where: filters.category ? { category: filters.category } : {},
    include: {
      listings: {
        select: {
          marketplace: true,
          status: true,
          pausedByInventory: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const rows = products.map(product => ({
    商品ID: product.id,
    タイトル: product.title,
    カテゴリ: product.category,
    ソースID: product.sourceId,
    価格_円: product.price,
    ステータス: product.status,
    JOOM出品: product.listings.find(l => l.marketplace === 'JOOM')?.status || '未出品',
    EBAY出品: product.listings.find(l => l.marketplace === 'EBAY')?.status || '未出品',
    在庫停止中: product.listings.some(l => l.pausedByInventory) ? 'はい' : 'いいえ',
    更新日時: product.updatedAt.toISOString(),
  }));

  return writeExportFile(jobId, 'inventory', format, rows);
}

/**
 * 監査ログをエクスポート
 */
async function exportAuditLogs(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000, // 最大1万件
  });

  const rows = logs.map(log => ({
    ログID: log.id,
    日時: log.createdAt.toISOString(),
    操作者タイプ: log.actorType,
    操作者ID: log.actorId,
    操作者名: log.actorName,
    IPアドレス: log.ipAddress,
    対象タイプ: log.entityType,
    対象ID: log.entityId,
    対象名: log.entityName,
    操作: log.action,
    説明: log.description,
    重要度: log.severity,
    変更フィールド: log.changedFields.join(', '),
  }));

  return writeExportFile(jobId, 'audit_logs', format, rows);
}

/**
 * 顧客メッセージをエクスポート
 */
async function exportCustomerMessages(
  jobId: string,
  format: ExportFormat,
  filters: ExportFilters
): Promise<ExportResult> {
  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  if (filters.marketplace) where.marketplace = filters.marketplace;

  const messages = await prisma.customerMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const rows = messages.map(msg => ({
    メッセージID: msg.id,
    注文ID: msg.orderId,
    マーケットプレイス: msg.marketplace,
    購入者名: msg.buyerUsername,
    購入者メール: msg.buyerEmail,
    件名: msg.subject,
    ステータス: msg.status,
    送信試行回数: msg.sendingAttempts,
    送信日時: msg.sentAt?.toISOString(),
    エラー: msg.errorMessage,
    作成日時: msg.createdAt.toISOString(),
  }));

  return writeExportFile(jobId, 'customer_messages', format, rows);
}

/**
 * ファイルに書き込み
 */
async function writeExportFile(
  jobId: string,
  prefix: string,
  format: ExportFormat,
  rows: Record<string, any>[]
): Promise<ExportResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = format === 'EXCEL' ? 'xlsx' : format === 'JSON' ? 'json' : 'csv';
  const fileName = `${prefix}_${timestamp}.${extension}`;
  const filePath = path.join(EXPORT_DIR, fileName);

  let content: string;

  if (format === 'JSON') {
    content = JSON.stringify(rows, null, 2);
  } else if (format === 'CSV') {
    content = convertToCSV(rows);
  } else {
    // Excel形式は簡易的にCSVとして出力（本格実装時はexceljsを使用）
    content = convertToCSV(rows);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const stats = fs.statSync(filePath);

  // 進捗更新
  await prisma.exportJob.update({
    where: { id: jobId },
    data: { processedRows: rows.length },
  });

  return {
    fileName,
    filePath,
    fileSize: stats.size,
    totalRows: rows.length,
  };
}

/**
 * CSVに変換
 */
function convertToCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(h => `"${h}"`).join(',');

  const dataLines = rows.map(row => {
    return headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

/**
 * 期限切れのエクスポートファイルをクリーンアップ
 */
export async function cleanupExpiredExports(): Promise<number> {
  const expiredJobs = await prisma.exportJob.findMany({
    where: {
      status: 'COMPLETED',
      expiresAt: { lt: new Date() },
    },
  });

  let cleanedCount = 0;

  for (const job of expiredJobs) {
    if (job.filePath && fs.existsSync(job.filePath)) {
      fs.unlinkSync(job.filePath);
      cleanedCount++;
    }

    await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'CANCELLED',
        filePath: null,
        downloadUrl: null,
      },
    });
  }

  log.info({ cleanedCount }, 'Expired export files cleaned up');

  return cleanedCount;
}

/**
 * 定期エクスポートをスケジュール
 */
export async function scheduleExport(options: {
  exportType: ExportType;
  format?: ExportFormat;
  filters?: ExportFilters;
  cronExpression: string;
  requestedBy?: string;
}): Promise<string> {
  const nextRun = calculateNextRun(options.cronExpression);

  const job = await prisma.exportJob.create({
    data: {
      exportType: options.exportType,
      format: options.format || 'CSV',
      filters: options.filters as any || {},
      status: 'PENDING',
      isScheduled: true,
      cronExpression: options.cronExpression,
      nextRunAt: nextRun,
      requestedBy: options.requestedBy,
    },
  });

  log.info({
    jobId: job.id,
    exportType: options.exportType,
    cronExpression: options.cronExpression,
    nextRunAt: nextRun,
  }, 'Scheduled export created');

  return job.id;
}

/**
 * 次の実行時刻を計算（簡易版）
 */
function calculateNextRun(cronExpression: string): Date {
  // 簡易実装：24時間後を返す
  const next = new Date();
  next.setHours(next.getHours() + 24);
  return next;
}

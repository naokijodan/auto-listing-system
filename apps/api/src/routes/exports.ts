import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const log = logger.child({ module: 'exports' });

const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/exports';

/**
 * エクスポートジョブ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      exportType,
      status,
      isScheduled,
      limit = '20',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (exportType) where.exportType = exportType;
    if (status) where.status = status;
    if (isScheduled !== undefined) where.isScheduled = isScheduled === 'true';

    const [jobs, total] = await Promise.all([
      prisma.exportJob.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exportJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポートジョブ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.exportJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      throw new AppError(404, 'Export job not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポートジョブ作成（非同期実行）
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      exportType,
      format = 'CSV',
      filters = {},
    } = req.body;

    if (!exportType) {
      throw new AppError(400, 'exportType is required', 'INVALID_INPUT');
    }

    const validTypes = ['ORDERS', 'PRODUCTS', 'LISTINGS', 'SALES_SUMMARY', 'INVENTORY', 'AUDIT_LOG', 'CUSTOMER_MESSAGES'];
    if (!validTypes.includes(exportType)) {
      throw new AppError(400, `Invalid exportType. Must be one of: ${validTypes.join(', ')}`, 'INVALID_INPUT');
    }

    const validFormats = ['CSV', 'EXCEL', 'JSON'];
    if (!validFormats.includes(format)) {
      throw new AppError(400, `Invalid format. Must be one of: ${validFormats.join(', ')}`, 'INVALID_INPUT');
    }

    const job = await prisma.exportJob.create({
      data: {
        exportType,
        format,
        filters: filters as any,
        status: 'PENDING',
        requestedBy: req.headers['x-api-key'] as string || 'anonymous',
      },
    });

    log.info({ jobId: job.id, exportType, format }, 'Export job created');

    res.status(201).json({
      success: true,
      data: job,
      message: 'Export job created. Use GET /api/exports/:id to check status.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポートジョブを即時実行（同期）
 */
router.post('/execute', async (req, res, next) => {
  try {
    const {
      exportType,
      format = 'CSV',
      filters = {},
    } = req.body;

    if (!exportType) {
      throw new AppError(400, 'exportType is required', 'INVALID_INPUT');
    }

    // ディレクトリ確認
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const job = await prisma.exportJob.create({
      data: {
        exportType,
        format,
        filters: filters as any,
        status: 'PROCESSING',
        requestedBy: req.headers['x-api-key'] as string || 'anonymous',
      },
    });

    try {
      const result = await executeExport(job.id, exportType, format, filters);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.exportJob.update({
        where: { id: job.id },
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

      res.json({
        success: true,
        data: {
          jobId: job.id,
          ...result,
          downloadUrl: `/api/exports/${job.id}/download`,
        },
      });
    } catch (error) {
      await prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポートファイルダウンロード
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const job = await prisma.exportJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      throw new AppError(404, 'Export job not found', 'NOT_FOUND');
    }

    if (job.status !== 'COMPLETED') {
      throw new AppError(400, 'Export is not completed yet', 'INVALID_STATE');
    }

    if (!job.filePath || !fs.existsSync(job.filePath)) {
      throw new AppError(404, 'Export file not found', 'FILE_NOT_FOUND');
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new AppError(410, 'Export file has expired', 'FILE_EXPIRED');
    }

    const contentType = getContentType(job.format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
    res.setHeader('Content-Length', job.fileSize || 0);

    const fileStream = fs.createReadStream(job.filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポートジョブをキャンセル
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const job = await prisma.exportJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      throw new AppError(404, 'Export job not found', 'NOT_FOUND');
    }

    if (!['PENDING', 'PROCESSING'].includes(job.status)) {
      throw new AppError(400, 'Cannot cancel job with status: ' + job.status, 'INVALID_STATE');
    }

    await prisma.exportJob.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({
      success: true,
      message: 'Export job cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 定期エクスポートをスケジュール
 */
router.post('/schedule', async (req, res, next) => {
  try {
    const {
      exportType,
      format = 'CSV',
      filters = {},
      cronExpression,
    } = req.body;

    if (!exportType || !cronExpression) {
      throw new AppError(400, 'exportType and cronExpression are required', 'INVALID_INPUT');
    }

    const nextRunAt = new Date();
    nextRunAt.setHours(nextRunAt.getHours() + 24); // 簡易実装

    const job = await prisma.exportJob.create({
      data: {
        exportType,
        format,
        filters: filters as any,
        status: 'PENDING',
        isScheduled: true,
        cronExpression,
        nextRunAt,
        requestedBy: req.headers['x-api-key'] as string || 'anonymous',
      },
    });

    log.info({ jobId: job.id, exportType, cronExpression }, 'Scheduled export created');

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * エクスポート統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { days = '7' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [total, byType, byStatus, byFormat, recentCompleted] = await Promise.all([
      prisma.exportJob.count({ where: { createdAt: { gte: startDate } } }),
      prisma.exportJob.groupBy({
        by: ['exportType'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.exportJob.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.exportJob.groupBy({
        by: ['format'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.exportJob.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        take: 10,
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          exportType: true,
          format: true,
          fileName: true,
          fileSize: true,
          totalRows: true,
          completedAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days: Number(days), startDate },
        total,
        byType: byType.reduce((acc, item) => {
          acc[item.exportType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byFormat: byFormat.reduce((acc, item) => {
          acc[item.format] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数

async function executeExport(
  jobId: string,
  exportType: string,
  format: string,
  filters: any
): Promise<{ fileName: string; filePath: string; fileSize: number; totalRows: number }> {
  let rows: Record<string, any>[] = [];

  const dateFilter: any = {};
  if (filters.startDate || filters.endDate) {
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
  }

  switch (exportType) {
    case 'ORDERS':
      const orders = await prisma.order.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { orderedAt: dateFilter } : {}),
          ...(filters.marketplace ? { marketplace: filters.marketplace } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        include: { sales: true },
        orderBy: { orderedAt: 'desc' },
      });
      rows = orders.map(o => ({
        注文ID: o.id,
        マーケットプレイス注文ID: o.marketplaceOrderId,
        マーケットプレイス: o.marketplace,
        ステータス: o.status,
        購入者名: o.buyerName,
        小計: o.subtotal,
        送料: o.shippingCost,
        合計: o.total,
        手数料: o.marketplaceFee,
        商品数: o.sales.length,
        注文日時: o.orderedAt?.toISOString(),
      }));
      break;

    case 'PRODUCTS':
      const products = await prisma.product.findMany({
        where: {
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      rows = products.map(p => ({
        商品ID: p.id,
        タイトル: p.title,
        カテゴリ: p.category,
        ソースID: p.sourceId,
        ソースURL: p.sourceUrl,
        価格_円: p.price,
        ステータス: p.status,
        翻訳ステータス: p.translationStatus,
        作成日時: p.createdAt.toISOString(),
      }));
      break;

    case 'LISTINGS':
      const listings = await prisma.listing.findMany({
        where: {
          ...(filters.marketplace ? { marketplace: filters.marketplace } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        include: { product: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      });
      rows = listings.map(l => ({
        出品ID: l.id,
        商品タイトル: l.product.title,
        マーケットプレイス: l.marketplace,
        出品価格: l.listingPrice,
        ステータス: l.status,
        作成日時: l.createdAt.toISOString(),
      }));
      break;

    case 'SALES_SUMMARY':
      const summaries = await prisma.salesSummary.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { periodStart: dateFilter } : {}),
          ...(filters.marketplace ? { marketplace: filters.marketplace } : {}),
        },
        orderBy: { periodStart: 'desc' },
      });
      rows = summaries.map(s => ({
        期間タイプ: s.periodType,
        期間開始: s.periodStart.toISOString().split('T')[0],
        注文数: s.orderCount,
        売上: s.grossRevenue,
        純売上: s.netRevenue,
      }));
      break;

    case 'AUDIT_LOG':
      const logs = await prisma.auditLog.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      rows = logs.map(l => ({
        日時: l.createdAt.toISOString(),
        操作者: l.actorName || l.actorType,
        対象: l.entityType,
        操作: l.action,
        説明: l.description,
        重要度: l.severity,
      }));
      break;

    default:
      throw new Error(`Unsupported export type: ${exportType}`);
  }

  // ファイル生成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = format === 'JSON' ? 'json' : 'csv';
  const fileName = `${exportType.toLowerCase()}_${timestamp}.${extension}`;
  const filePath = path.join(EXPORT_DIR, fileName);

  let content: string;
  if (format === 'JSON') {
    content = JSON.stringify(rows, null, 2);
  } else {
    content = convertToCSV(rows);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const stats = fs.statSync(filePath);

  return {
    fileName,
    filePath,
    fileSize: stats.size,
    totalRows: rows.length,
  };
}

function convertToCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const dataLines = rows.map(row => {
    return headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [headerLine, ...dataLines].join('\n');
}

function getContentType(format: string): string {
  switch (format) {
    case 'JSON': return 'application/json';
    case 'EXCEL': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'text/csv';
  }
}

export { router as exportsRouter };

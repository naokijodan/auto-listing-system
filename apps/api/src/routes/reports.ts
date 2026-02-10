import { Router } from 'express';
import { prisma, ReportFormat, ReportType, ReportStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'reports' });

/**
 * レポート一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, reportType, format, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (reportType) where.reportType = reportType;
    if (format) where.format = format;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          reportType: true,
          format: true,
          status: true,
          progress: true,
          fileName: true,
          fileSize: true,
          generatedBy: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポート詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        template: true,
      },
    });

    if (!report) {
      throw new AppError(404, 'Report not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポート生成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      reportType,
      templateId,
      parameters,
      timeRange,
      format = 'PDF',
      orientation = 'portrait',
      paperSize = 'A4',
    } = req.body;

    if (!name || !reportType) {
      throw new AppError(400, 'name and reportType are required', 'INVALID_INPUT');
    }

    const validTypes = Object.values(ReportType);
    if (!validTypes.includes(reportType)) {
      throw new AppError(400, `Invalid report type: ${reportType}`, 'INVALID_INPUT');
    }

    const validFormats = Object.values(ReportFormat);
    if (!validFormats.includes(format)) {
      throw new AppError(400, `Invalid format: ${format}`, 'INVALID_INPUT');
    }

    const report = await prisma.report.create({
      data: {
        name,
        description,
        reportType,
        templateId,
        parameters: (parameters || {}) as any,
        timeRange,
        format,
        orientation,
        paperSize,
        generatedBy: req.headers['x-api-key'] as string,
        status: 'PENDING',
      },
    });

    log.info({ reportId: report.id, name, reportType, format }, 'Report generation started');

    res.status(201).json({
      success: true,
      data: {
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        status: report.status,
      },
      message: 'Report generation started. Use GET /api/reports/:id to check progress.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポート削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      throw new AppError(404, 'Report not found', 'NOT_FOUND');
    }

    await prisma.report.delete({
      where: { id: req.params.id },
    });

    log.info({ reportId: req.params.id }, 'Report deleted');

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートダウンロード情報取得
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      throw new AppError(404, 'Report not found', 'NOT_FOUND');
    }

    if (report.status !== 'COMPLETED') {
      throw new AppError(400, 'Report is not completed', 'INVALID_OPERATION');
    }

    if (!report.filePath) {
      throw new AppError(404, 'Report file not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        fileName: report.fileName,
        filePath: report.filePath,
        fileSize: report.fileSize,
        format: report.format,
        mimeType: report.mimeType,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートテンプレート一覧取得
 */
router.get('/templates', async (req, res, next) => {
  try {
    const { reportType, isActive } = req.query;

    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.reportTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートテンプレート作成
 */
router.post('/templates', async (req, res, next) => {
  try {
    const {
      name,
      description,
      reportType,
      layout,
      sections,
      header,
      footer,
      theme = 'default',
      customStyles,
      logoUrl,
      dataSources,
      charts,
    } = req.body;

    if (!name || !reportType) {
      throw new AppError(400, 'name and reportType are required', 'INVALID_INPUT');
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description,
        reportType,
        layout: (layout || {}) as any,
        sections: (sections || []) as any,
        header: header || null,
        footer: footer || null,
        theme,
        customStyles: (customStyles || {}) as any,
        logoUrl,
        dataSources: (dataSources || []) as any,
        charts: (charts || []) as any,
        isActive: true,
      },
    });

    log.info({ templateId: template.id, name }, 'Report template created');

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートテンプレート更新
 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      layout,
      sections,
      header,
      footer,
      theme,
      customStyles,
      logoUrl,
      dataSources,
      charts,
      isActive,
    } = req.body;

    const template = await prisma.reportTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(layout !== undefined && { layout: layout as any }),
        ...(sections !== undefined && { sections: sections as any }),
        ...(header !== undefined && { header }),
        ...(footer !== undefined && { footer }),
        ...(theme !== undefined && { theme }),
        ...(customStyles !== undefined && { customStyles: customStyles as any }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(dataSources !== undefined && { dataSources: dataSources as any }),
        ...(charts !== undefined && { charts: charts as any }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートテンプレート削除
 */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    await prisma.reportTemplate.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートスケジュール一覧取得
 */
router.get('/schedules', async (req, res, next) => {
  try {
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const schedules = await prisma.reportScheduleConfig.findMany({
      where,
      include: {
        template: {
          select: { name: true, reportType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートスケジュール作成
 */
router.post('/schedules', async (req, res, next) => {
  try {
    const {
      templateId,
      name,
      description,
      cronExpression,
      timezone = 'Asia/Tokyo',
      format = 'PDF',
      parameters,
      recipients = [],
      channels = [],
      uploadToStorage = true,
      retentionDays = 30,
    } = req.body;

    if (!templateId || !name || !cronExpression) {
      throw new AppError(400, 'templateId, name, and cronExpression are required', 'INVALID_INPUT');
    }

    // テンプレートの存在確認
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    const schedule = await prisma.reportScheduleConfig.create({
      data: {
        templateId,
        name,
        description,
        cronExpression,
        timezone,
        format,
        parameters: (parameters || {}) as any,
        recipients,
        channels,
        uploadToStorage,
        retentionDays,
        isActive: true,
      },
    });

    log.info({ scheduleId: schedule.id, name, templateId }, 'Report schedule created');

    res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートスケジュール更新
 */
router.patch('/schedules/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      cronExpression,
      timezone,
      format,
      parameters,
      recipients,
      channels,
      uploadToStorage,
      retentionDays,
      isActive,
    } = req.body;

    const schedule = await prisma.reportScheduleConfig.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(timezone !== undefined && { timezone }),
        ...(format !== undefined && { format }),
        ...(parameters !== undefined && { parameters: parameters as any }),
        ...(recipients !== undefined && { recipients }),
        ...(channels !== undefined && { channels }),
        ...(uploadToStorage !== undefined && { uploadToStorage }),
        ...(retentionDays !== undefined && { retentionDays }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポートスケジュール削除
 */
router.delete('/schedules/:id', async (req, res, next) => {
  try {
    await prisma.reportScheduleConfig.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * スケジュール実行履歴取得
 */
router.get('/schedules/:id/executions', async (req, res, next) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const [executions, total] = await Promise.all([
      prisma.reportExecution.findMany({
        where: { scheduleId: req.params.id },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.reportExecution.count({ where: { scheduleId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * レポート統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [total, completed, failed, sizeAgg, byType, byFormat] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.report.count({ where: { ...where, status: 'FAILED' } }),
      prisma.report.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { fileSize: true },
      }),
      prisma.report.groupBy({
        by: ['reportType'],
        _count: true,
        where,
      }),
      prisma.report.groupBy({
        by: ['format'],
        _count: true,
        where,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalReports: total,
        completedReports: completed,
        failedReports: failed,
        successRate: total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '0%',
        totalFileSize: sizeAgg._sum?.fileSize || 0,
        byType: Object.fromEntries(byType.map((t) => [t.reportType, t._count])),
        byFormat: Object.fromEntries(byFormat.map((f) => [f.format, f._count])),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なレポートタイプ一覧
 */
router.get('/types', async (_req, res, next) => {
  try {
    const types = Object.values(ReportType).map((type) => ({
      value: type,
      label: getTypeLabel(type),
      description: getTypeDescription(type),
    }));

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なフォーマット一覧
 */
router.get('/formats', async (_req, res, next) => {
  try {
    const formats = Object.values(ReportFormat).map((format) => ({
      value: format,
      label: format,
      extension: getFormatExtension(format),
      mimeType: getFormatMimeType(format),
    }));

    res.json({
      success: true,
      data: formats,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getTypeLabel(type: ReportType): string {
  const labels: Record<ReportType, string> = {
    SALES_SUMMARY: '売上サマリー',
    ORDER_DETAIL: '注文詳細',
    INVENTORY_STATUS: '在庫状況',
    PRODUCT_PERFORMANCE: '商品パフォーマンス',
    PROFIT_ANALYSIS: '利益分析',
    CUSTOMER_ANALYSIS: '顧客分析',
    MARKETPLACE_COMPARISON: 'マーケットプレイス比較',
    AUDIT_REPORT: '監査レポート',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

function getTypeDescription(type: ReportType): string {
  const descriptions: Record<ReportType, string> = {
    SALES_SUMMARY: '売上、収益、利益の分析',
    ORDER_DETAIL: '注文履歴と詳細情報',
    INVENTORY_STATUS: '在庫状況と補充推奨',
    PRODUCT_PERFORMANCE: '商品ごとの売上パフォーマンス',
    PROFIT_ANALYSIS: '利益率と収益性の分析',
    CUSTOMER_ANALYSIS: '顧客統計（集計データのみ）',
    MARKETPLACE_COMPARISON: 'マーケットプレイス間の比較分析',
    AUDIT_REPORT: '操作履歴と監査ログ',
    CUSTOM: 'カスタムクエリによるレポート',
  };
  return descriptions[type] || '';
}

function getFormatExtension(format: ReportFormat): string {
  const extensions: Record<ReportFormat, string> = {
    PDF: '.pdf',
    EXCEL: '.xlsx',
    CSV: '.csv',
    HTML: '.html',
  };
  return extensions[format] || '';
}

function getFormatMimeType(format: ReportFormat): string {
  const mimeTypes: Record<ReportFormat, string> = {
    PDF: 'application/pdf',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV: 'text/csv',
    HTML: 'text/html',
  };
  return mimeTypes[format] || 'application/octet-stream';
}

export { router as reportsRouter };

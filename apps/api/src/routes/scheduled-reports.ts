/**
 * スケジュールレポートAPI
 *
 * Phase 32: 定期レポート配信・拡張通知機能
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { CronExpressionParser } from 'cron-parser';

const router = Router();
const log = logger.child({ route: 'scheduled-reports' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// レポートキュー
const reportQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection: redis });

// ========================================
// バリデーションスキーマ
// ========================================

const CreateScheduledReportSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  cronExpression: z.string().refine((val) => {
    try {
      CronExpressionParser.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid cron expression' }),
  timezone: z.string().default('Asia/Tokyo'),
  format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
  includeCharts: z.boolean().default(false),
  customQuery: z.any().optional(),
  deliveryChannels: z.array(z.string()).default([]),
  emailRecipients: z.array(z.string().email()).default([]),
  emailSubject: z.string().optional(),
  isActive: z.boolean().default(true),
});

const UpdateScheduledReportSchema = CreateScheduledReportSchema.partial();

// ========================================
// ヘルパー関数
// ========================================

/**
 * 次回実行時刻を計算
 */
function calculateNextRunAt(cronExpression: string, _timezone: string): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch {
    // フォールバック: 1時間後
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

/**
 * Cron式を人間可読形式に変換
 */
function describeCronExpression(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // 毎日
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `毎日 ${hour}:${minute.padStart(2, '0')}`;
  }

  // 毎週
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayNum = parseInt(dayOfWeek, 10);
    if (dayNum >= 0 && dayNum <= 6) {
      return `毎週${days[dayNum]}曜日 ${hour}:${minute.padStart(2, '0')}`;
    }
  }

  // 毎月
  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    return `毎月${dayOfMonth}日 ${hour}:${minute.padStart(2, '0')}`;
  }

  return cron;
}

// ========================================
// 静的エンドポイント（:id より前に定義）
// ========================================

/**
 * @swagger
 * /api/scheduled-reports/templates:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: レポートテンプレート一覧
 *     responses:
 *       200:
 *         description: テンプレート一覧
 */
router.get('/templates', async (_req: Request, res: Response) => {
  const templates = [
    {
      id: 'daily-summary',
      name: '日次サマリー',
      reportType: 'daily',
      cronExpression: '0 9 * * *',
      description: '毎日9時に前日の売上・出品状況をレポート',
      format: 'markdown',
    },
    {
      id: 'weekly-performance',
      name: '週次パフォーマンス',
      reportType: 'weekly',
      cronExpression: '0 9 * * 1',
      description: '毎週月曜9時に週間実績をレポート',
      format: 'markdown',
    },
    {
      id: 'monthly-analysis',
      name: '月次分析',
      reportType: 'monthly',
      cronExpression: '0 10 1 * *',
      description: '毎月1日10時に月間分析をレポート',
      format: 'csv',
    },
    {
      id: 'competitor-alert',
      name: '競合価格モニタリング',
      reportType: 'custom',
      cronExpression: '0 8,14,20 * * *',
      description: '1日3回（8時/14時/20時）競合価格変動をレポート',
      format: 'json',
    },
  ];

  res.json({
    success: true,
    data: templates,
  });
});

/**
 * @swagger
 * /api/scheduled-reports/stats:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: レポート実行統計を取得
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: 統計情報
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [totalReports, activeReports, logs, upcomingReports] = await Promise.all([
      prisma.scheduledReport.count(),
      prisma.scheduledReport.count({ where: { isActive: true } }),
      prisma.scheduledReportLog.findMany({
        where: { startedAt: { gte: fromDate } },
        select: { status: true, duration: true },
      }),
      prisma.scheduledReport.findMany({
        where: {
          isActive: true,
          nextRunAt: { gte: new Date() },
        },
        orderBy: { nextRunAt: 'asc' },
        take: 5,
        select: {
          id: true,
          name: true,
          reportType: true,
          nextRunAt: true,
          cronExpression: true,
        },
      }),
    ]);

    // ステータス別集計
    const statusCounts: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    logs.forEach((log) => {
      statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    });

    const successRate = logs.length > 0
      ? ((statusCounts['success'] || 0) / logs.length) * 100
      : 100;

    const avgDuration = durationCount > 0
      ? Math.round(totalDuration / durationCount)
      : 0;

    res.json({
      success: true,
      data: {
        totalReports,
        activeReports,
        executionsInPeriod: logs.length,
        successCount: statusCounts['success'] || 0,
        failedCount: statusCounts['failed'] || 0,
        successRate: Math.round(successRate * 100) / 100,
        avgDurationMs: avgDuration,
        upcomingReports: upcomingReports.map((r) => ({
          ...r,
          cronDescription: describeCronExpression(r.cronExpression),
        })),
        period: {
          from: fromDate.toISOString(),
          to: new Date().toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// CRUD エンドポイント
// ========================================

/**
 * @swagger
 * /api/scheduled-reports:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: スケジュールレポート一覧を取得
 *     parameters:
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: reportType
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: レポート一覧
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, reportType } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (reportType) where.reportType = reportType;

    const reports = await prisma.scheduledReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // 人間可読形式のスケジュール説明を追加
    const reportsWithDescription = reports.map((r) => ({
      ...r,
      cronDescription: describeCronExpression(r.cronExpression),
    }));

    res.json({
      success: true,
      data: reportsWithDescription,
      count: reports.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/scheduled-reports:
 *   post:
 *     tags: [Scheduled Reports]
 *     summary: スケジュールレポートを作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 作成されたレポート
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateScheduledReportSchema.parse(req.body);

    const nextRunAt = calculateNextRunAt(validated.cronExpression, validated.timezone);

    const report = await prisma.scheduledReport.create({
      data: {
        name: validated.name,
        reportType: validated.reportType,
        cronExpression: validated.cronExpression,
        timezone: validated.timezone,
        format: validated.format,
        includeCharts: validated.includeCharts,
        customQuery: validated.customQuery,
        deliveryChannels: validated.deliveryChannels,
        emailRecipients: validated.emailRecipients,
        emailSubject: validated.emailSubject,
        isActive: validated.isActive,
        nextRunAt,
      },
    });

    log.info({ type: 'scheduled_report_created', reportId: report.id, name: report.name });

    res.status(201).json({
      success: true,
      data: {
        ...report,
        cronDescription: describeCronExpression(report.cronExpression),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/scheduled-reports/{id}:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: スケジュールレポート詳細を取得
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: レポート詳細
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    // 実行ログも取得
    const recentLogs = await prisma.scheduledReportLog.findMany({
      where: { reportId: id },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        ...report,
        cronDescription: describeCronExpression(report.cronExpression),
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/scheduled-reports/{id}:
 *   put:
 *     tags: [Scheduled Reports]
 *     summary: スケジュールレポートを更新
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新されたレポート
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = UpdateScheduledReportSchema.parse(req.body);

    const existing = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    // cronが変更された場合は次回実行時刻を再計算
    let nextRunAt = existing.nextRunAt;
    if (validated.cronExpression) {
      nextRunAt = calculateNextRunAt(
        validated.cronExpression,
        validated.timezone || existing.timezone
      );
    }

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: {
        ...validated,
        nextRunAt,
      },
    });

    log.info({ type: 'scheduled_report_updated', reportId: report.id, name: report.name });

    res.json({
      success: true,
      data: {
        ...report,
        cronDescription: describeCronExpression(report.cronExpression),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/scheduled-reports/{id}:
 *   delete:
 *     tags: [Scheduled Reports]
 *     summary: スケジュールレポートを削除
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 削除成功
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    // ログも削除
    await prisma.scheduledReportLog.deleteMany({
      where: { reportId: id },
    });

    await prisma.scheduledReport.delete({
      where: { id },
    });

    log.info({ type: 'scheduled_report_deleted', reportId: id });

    res.json({
      success: true,
      message: 'Scheduled report deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 実行・テスト
// ========================================

/**
 * @swagger
 * /api/scheduled-reports/{id}/run:
 *   post:
 *     tags: [Scheduled Reports]
 *     summary: レポートを即時実行
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 実行開始
 */
router.post('/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    // キューにジョブを追加
    const job = await reportQueue.add('run-scheduled-report', {
      reportId: id,
      manual: true,
    });

    log.info({ type: 'scheduled_report_manual_run', reportId: id, jobId: job.id });

    res.json({
      success: true,
      message: 'Report execution started',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/scheduled-reports/{id}/preview:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: レポートのプレビューを生成
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: プレビュー
 */
router.get('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    // レポートタイプに応じたプレビューデータを生成
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let previewData: any;

    switch (report.reportType) {
      case 'daily':
        previewData = {
          type: 'daily',
          date: yesterday.toISOString().split('T')[0],
          summary: {
            newProducts: 0,
            publishedListings: 0,
            soldListings: 0,
            revenue: 0,
            profit: 0,
          },
          note: 'これはプレビューです。実際のデータは実行時に取得されます。',
        };
        break;

      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        previewData = {
          type: 'weekly',
          period: {
            from: weekStart.toISOString().split('T')[0],
            to: yesterday.toISOString().split('T')[0],
          },
          note: 'これはプレビューです。実際のデータは実行時に取得されます。',
        };
        break;

      case 'monthly':
        const monthStart = new Date(now);
        monthStart.setMonth(monthStart.getMonth() - 1);
        previewData = {
          type: 'monthly',
          period: {
            from: monthStart.toISOString().split('T')[0],
            to: yesterday.toISOString().split('T')[0],
          },
          note: 'これはプレビューです。実際のデータは実行時に取得されます。',
        };
        break;

      default:
        previewData = {
          type: 'custom',
          customQuery: report.customQuery,
          note: 'これはプレビューです。実際のデータは実行時に取得されます。',
        };
    }

    res.json({
      success: true,
      data: {
        report: {
          id: report.id,
          name: report.name,
          format: report.format,
          deliveryChannels: report.deliveryChannels,
          emailRecipients: report.emailRecipients,
        },
        preview: previewData,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 実行ログ
// ========================================

/**
 * @swagger
 * /api/scheduled-reports/{id}/logs:
 *   get:
 *     tags: [Scheduled Reports]
 *     summary: レポート実行ログを取得
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 実行ログ一覧
 */
router.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const report = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled report not found',
      });
    }

    const logs = await prisma.scheduledReportLog.findMany({
      where: { reportId: id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    next(error);
  }
});

export { router as scheduledReportsRouter };

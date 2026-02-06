/**
 * スケジュールレポート実行サービス
 *
 * Phase 32: 定期レポート配信
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { CronExpressionParser } from 'cron-parser';
import { reportGenerator } from '../analytics/report-generator';
import {
  sendNotification,
  sendReportByEmail,
  notifyScheduledReport,
} from '../notification-service';

const log = logger.child({ module: 'report-scheduler' });

/**
 * スケジュールレポートランナー
 */
export class ReportScheduler {
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * スケジューラーを開始
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      log.warn({ type: 'scheduler_already_running' });
      return;
    }

    this.isRunning = true;
    log.info({ type: 'scheduler_started', intervalMs });

    // 即時実行
    this.checkAndRunDueReports();

    // 定期チェック
    this.checkInterval = setInterval(() => {
      this.checkAndRunDueReports();
    }, intervalMs);
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    log.info({ type: 'scheduler_stopped' });
  }

  /**
   * 期限が来たレポートをチェックして実行
   */
  async checkAndRunDueReports(): Promise<void> {
    try {
      const now = new Date();

      // 実行時刻が過ぎているアクティブなレポートを取得
      const dueReports = await prisma.scheduledReport.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
      });

      if (dueReports.length === 0) {
        return;
      }

      log.info({
        type: 'due_reports_found',
        count: dueReports.length,
        reportIds: dueReports.map((r) => r.id),
      });

      // 各レポートを実行
      for (const report of dueReports) {
        await this.runReport(report.id);
      }
    } catch (error: any) {
      log.error({
        type: 'scheduler_check_error',
        error: error.message,
      });
    }
  }

  /**
   * 特定のレポートを実行
   */
  async runReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();

    // 実行ログを作成
    const logEntry = await prisma.scheduledReportLog.create({
      data: {
        reportId,
        status: 'running',
      },
    });

    try {
      const report = await prisma.scheduledReport.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      log.info({
        type: 'report_execution_started',
        reportId,
        name: report.name,
        reportType: report.reportType,
      });

      // レポートを生成
      const reportData = await this.generateReport(report);

      // フォーマット変換
      let content: string;
      switch (report.format) {
        case 'json':
          content = JSON.stringify(reportData, null, 2);
          break;
        case 'csv':
          content = reportGenerator.formatAsCsv(reportData);
          break;
        case 'markdown':
        default:
          content = reportGenerator.formatAsMarkdown(reportData);
          break;
      }

      // 配信
      await this.deliverReport(report, content);

      // 次回実行時刻を計算
      const nextRunAt = this.calculateNextRunAt(report.cronExpression, report.timezone);

      // レポートを更新
      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'success',
          lastRunError: null,
          nextRunAt,
        },
      });

      // ログを更新
      const duration = Date.now() - startTime;
      await prisma.scheduledReportLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'success',
          endedAt: new Date(),
          duration,
          metadata: {
            reportType: report.reportType,
            format: report.format,
            recipientCount: report.emailRecipients.length + report.deliveryChannels.length,
          },
        },
      });

      log.info({
        type: 'report_execution_success',
        reportId,
        name: report.name,
        durationMs: duration,
      });

      // 成功通知
      await notifyScheduledReport(
        report.name,
        report.reportType,
        report.emailRecipients.length + report.deliveryChannels.length,
        'success'
      );

      return { success: true };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // エラーを記録
      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'failed',
          lastRunError: error.message,
        },
      });

      await prisma.scheduledReportLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'failed',
          endedAt: new Date(),
          duration,
          error: error.message,
        },
      });

      log.error({
        type: 'report_execution_failed',
        reportId,
        error: error.message,
        durationMs: duration,
      });

      // 失敗通知
      const report = await prisma.scheduledReport.findUnique({
        where: { id: reportId },
      });
      if (report) {
        await notifyScheduledReport(
          report.name,
          report.reportType,
          0,
          'failed',
          error.message
        );
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * レポートを生成
   */
  private async generateReport(report: any): Promise<any> {
    switch (report.reportType) {
      case 'daily':
        return reportGenerator.generateDailyReport();

      case 'weekly':
        return reportGenerator.generateWeeklyReport();

      case 'monthly':
        return reportGenerator.generateMonthlyReport();

      case 'custom':
        // カスタムクエリがある場合
        if (report.customQuery) {
          // TODO: カスタムクエリの実行
          return {
            type: 'custom',
            query: report.customQuery,
            generatedAt: new Date().toISOString(),
          };
        }
        return reportGenerator.generateDailyReport();

      default:
        return reportGenerator.generateDailyReport();
    }
  }

  /**
   * レポートを配信
   */
  private async deliverReport(report: any, content: string): Promise<void> {
    const subject = report.emailSubject || `${report.name} - ${new Date().toLocaleDateString('ja-JP')}`;
    const errors: string[] = [];

    // メール配信
    if (report.emailRecipients.length > 0) {
      const emailResult = await sendReportByEmail(
        report.emailRecipients,
        subject,
        content,
        report.format
      );
      if (!emailResult.success) {
        errors.push(...emailResult.errors);
      }
    }

    // 通知チャンネル配信（サマリーのみ）
    if (report.deliveryChannels.length > 0) {
      await sendNotification({
        eventType: 'SCHEDULED_REPORT',
        title: `📊 ${report.name}`,
        message: `${report.reportType}レポートが生成されました。`,
        severity: 'INFO',
        data: {
          レポートタイプ: report.reportType,
          フォーマット: report.format,
          生成日時: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        },
      });
    }

    if (errors.length > 0) {
      log.warn({
        type: 'report_delivery_partial_failure',
        reportId: report.id,
        errors,
      });
    }
  }

  /**
   * 次回実行時刻を計算
   */
  private calculateNextRunAt(cronExpression: string, _timezone: string): Date {
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
}

// シングルトンインスタンス
let schedulerInstance: ReportScheduler | null = null;

export function getReportScheduler(): ReportScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ReportScheduler();
  }
  return schedulerInstance;
}

export function startReportScheduler(intervalMs?: number): void {
  const scheduler = getReportScheduler();
  scheduler.start(intervalMs);
}

export function stopReportScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}

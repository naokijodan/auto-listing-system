/**
 * レポート生成プロセッサ
 * Phase 65: BullMQワーカーでレポートを生成
 * レポート生成はAPIサーバーのHTTPエンドポイント経由で実行
 */

import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
const log = logger.child({ processor: 'report' });

const API_BASE = process.env.API_URL || 'http://localhost:3000';

export interface ReportJobData {
  reportId: string;
  scheduleId?: string;
  manual?: boolean;
}

async function generateReportViaApi(reportId: string): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}/generate`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Report generation API failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const { reportId, scheduleId, manual } = job.data;

  log.info({ jobId: job.id, reportId, scheduleId, manual }, 'Processing report job');

  try {
    // レポート生成（API経由）
    const result = await generateReportViaApi(reportId);

    log.info(
      { jobId: job.id, reportId, filePath: result.filePath, fileSize: result.fileSize },
      'Report generated successfully'
    );

    // スケジュール実行の場合、実行履歴を記録
    if (scheduleId) {
      await prisma.reportExecution.create({
        data: {
          scheduleId,
          reportId,
          status: 'COMPLETED',
          startedAt: job.timestamp ? new Date(job.timestamp) : new Date(),
          completedAt: new Date(),
          duration: Date.now() - (job.timestamp || Date.now()),
          filePath: result.filePath,
          fileSize: result.fileSize,
        },
      });

      // スケジュール設定を更新
      await prisma.reportScheduleConfig.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'success',
        },
      });
    }

    // 通知送信
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (report) {
      log.info({
        type: 'report_completed',
        reportId,
        reportName: report.name,
        fileName: result.fileName,
        fileSize: result.fileSize,
      }, `レポート「${report.name}」の生成が完了しました`);
    }
  } catch (error) {
    log.error({ jobId: job.id, reportId, error }, 'Report generation failed');

    // スケジュール実行の場合、失敗を記録
    if (scheduleId) {
      await prisma.reportExecution.create({
        data: {
          scheduleId,
          reportId,
          status: 'FAILED',
          startedAt: job.timestamp ? new Date(job.timestamp) : new Date(),
          completedAt: new Date(),
          duration: Date.now() - (job.timestamp || Date.now()),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      await prisma.reportScheduleConfig.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'failed',
        },
      });
    }

    // エラー通知
    log.error({
      type: 'report_failed',
      reportId,
      scheduleId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }, 'レポート生成に失敗しました');

    throw error;
  }
}

export default processReportJob;

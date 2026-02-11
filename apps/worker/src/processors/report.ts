/**
 * レポート生成プロセッサ
 * Phase 65: BullMQワーカーでレポートを生成
 */

import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { generateReport } from '../../../api/src/lib/report-generator';
import { alertManager } from '../lib/alert-manager';

const log = logger.child({ processor: 'report' });

export interface ReportJobData {
  reportId: string;
  scheduleId?: string;
  manual?: boolean;
}

export async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const { reportId, scheduleId, manual } = job.data;

  log.info({ jobId: job.id, reportId, scheduleId, manual }, 'Processing report job');

  try {
    // レポート生成
    const result = await generateReport(reportId);

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
      await alertManager.sendCustomAlert({
        type: 'success',
        title: 'レポート生成完了',
        message: `「${report.name}」の生成が完了しました（${(result.fileSize / 1024).toFixed(1)}KB）`,
        metadata: {
          reportId,
          fileName: result.fileName,
          fileSize: result.fileSize,
        },
      });
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
    await alertManager.sendCustomAlert({
      type: 'error',
      title: 'レポート生成失敗',
      message: `レポート生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { reportId, scheduleId },
    });

    throw error;
  }
}

export default processReportJob;

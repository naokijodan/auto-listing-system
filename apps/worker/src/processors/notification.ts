import { Job } from 'bullmq';
import { logger } from '@rakuda/logger';
import { NotificationJobPayload } from '@rakuda/schema';
import { sendTemplatedEmail, isEmailConfigured } from '../lib/email-sender';
import { sendTemplatedSlackMessage, isSlackConfigured } from '../lib/slack-sender';
import { alertManager } from '../lib/alert-manager';

const log = logger.child({ processor: 'notification' });

/**
 * 通知ジョブを処理
 */
export async function processNotificationJob(job: Job): Promise<any> {
  log.info({
    type: 'notification_job_start',
    jobId: job.id,
    jobName: job.name,
    data: job.data,
  });

  try {
    // バッチ処理ジョブ
    if (job.name === 'process-batch') {
      return processBatchJob(job);
    }

    // 通常の通知送信ジョブ
    if (job.name === 'send-notification') {
      return sendNotification(job);
    }

    throw new Error(`Unknown notification job type: ${job.name}`);
  } catch (error: any) {
    log.error({
      type: 'notification_job_error',
      jobId: job.id,
      jobName: job.name,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 通知を送信
 */
async function sendNotification(job: Job): Promise<{
  success: boolean;
  channel: string;
  error?: string;
}> {
  const payload = job.data as NotificationJobPayload;
  const { channel, template, data, deepLink, alertLogId } = payload;

  let result: { success: boolean; error?: string };

  switch (channel) {
    case 'email':
      if (!isEmailConfigured()) {
        log.warn({ type: 'email_not_configured', jobId: job.id });
        result = { success: false, error: 'Email not configured' };
      } else {
        result = await sendTemplatedEmail(template, { ...data, deepLink });
      }
      break;

    case 'slack':
      if (!isSlackConfigured()) {
        log.warn({ type: 'slack_not_configured', jobId: job.id });
        result = { success: false, error: 'Slack not configured' };
      } else {
        result = await sendTemplatedSlackMessage(template, data, deepLink);
      }
      break;

    default:
      result = { success: false, error: `Unknown channel: ${channel}` };
  }

  // アラートログのステータスを更新
  if (alertLogId) {
    await alertManager.updateAlertLogStatus(
      alertLogId,
      result.success ? 'sent' : 'failed',
      result.error
    );
  }

  log.info({
    type: 'notification_sent',
    jobId: job.id,
    channel,
    template,
    success: result.success,
    error: result.error,
  });

  return {
    success: result.success,
    channel,
    error: result.error,
  };
}

/**
 * バッチ処理ジョブを実行
 */
async function processBatchJob(job: Job): Promise<{
  success: boolean;
  processed: number;
}> {
  const { ruleId, eventType, batchKey } = job.data;

  log.info({
    type: 'batch_job_start',
    jobId: job.id,
    ruleId,
    eventType,
    batchKey,
  });

  await alertManager.processBatch(ruleId, eventType, batchKey);

  log.info({
    type: 'batch_job_complete',
    jobId: job.id,
    ruleId,
    eventType,
  });

  return {
    success: true,
    processed: 1,
  };
}

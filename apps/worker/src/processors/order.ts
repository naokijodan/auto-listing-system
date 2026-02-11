/**
 * Phase 51: 注文処理プロセッサ
 *
 * BullMQジョブとして注文を処理
 */

import { Job } from 'bullmq';
import { logger } from '@rakuda/logger';
import { processOrder, sendDeadlineAlerts, updateSourcingStatus } from '../lib/order-processor';

const log = logger.child({ processor: 'order' });

export interface OrderJobData {
  orderId: string;
  marketplace?: 'JOOM' | 'EBAY';
  type?: 'process' | 'deadline-check' | 'sourcing-update';
  sourcingStatus?: 'CONFIRMED' | 'ORDERED' | 'RECEIVED' | 'UNAVAILABLE';
  sourcingNotes?: string;
}

export interface OrderJobResult {
  success: boolean;
  orderId?: string;
  actions?: {
    inventoryUpdated: boolean;
    sourcingRequested: boolean;
    slackNotified: boolean;
    shipmentDeadlineSet: boolean;
  };
  errors?: string[];
  alertsSent?: number;
}

/**
 * 注文処理ジョブ
 */
export async function processOrderJob(job: Job<OrderJobData>): Promise<OrderJobResult> {
  const { orderId, type, sourcingStatus, sourcingNotes } = job.data;

  log.info({
    type: 'order_job_start',
    jobId: job.id,
    orderId,
    jobType: type || 'process',
  });

  try {
    // 発送期限チェック
    if (type === 'deadline-check') {
      await sendDeadlineAlerts();
      return {
        success: true,
      };
    }

    // 仕入れステータス更新
    if (type === 'sourcing-update' && orderId && sourcingStatus) {
      await updateSourcingStatus(orderId, sourcingStatus, sourcingNotes);
      return {
        success: true,
        orderId,
      };
    }

    // 通常の注文処理
    if (!orderId) {
      throw new Error('orderId is required');
    }

    const result = await processOrder(orderId);

    log.info({
      type: 'order_job_complete',
      jobId: job.id,
      orderId,
      result,
    });

    return result;
  } catch (error) {
    log.error({
      type: 'order_job_error',
      jobId: job.id,
      orderId,
      error: (error as Error).message,
    });

    throw error;
  }
}

/**
 * 発送期限チェックジョブ
 */
export async function processDeadlineCheckJob(job: Job): Promise<OrderJobResult> {
  log.info({
    type: 'deadline_check_job_start',
    jobId: job.id,
  });

  try {
    await sendDeadlineAlerts();

    return {
      success: true,
    };
  } catch (error) {
    log.error({
      type: 'deadline_check_job_error',
      jobId: job.id,
      error: (error as Error).message,
    });

    throw error;
  }
}

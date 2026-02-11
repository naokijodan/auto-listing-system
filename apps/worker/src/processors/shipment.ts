/**
 * Phase 52: 発送処理プロセッサ
 *
 * BullMQジョブとして発送処理を実行
 */

import { Job } from 'bullmq';
import { logger } from '@rakuda/logger';
import {
  processShipment,
  processBatchShipment,
  ShipmentInput,
} from '../lib/shipment-service';
import { sendDeadlineAlerts } from '../lib/order-processor';

const log = logger.child({ processor: 'shipment' });

export interface ShipmentJobData {
  type: 'single' | 'batch' | 'deadline-alert';
  shipment?: ShipmentInput;
  shipments?: ShipmentInput[];
}

export interface ShipmentJobResult {
  success: boolean;
  type: string;
  results?: any;
}

/**
 * 発送処理ジョブ
 */
export async function processShipmentJob(job: Job<ShipmentJobData>): Promise<ShipmentJobResult> {
  const { type, shipment, shipments } = job.data;

  log.info({
    type: 'shipment_job_start',
    jobId: job.id,
    jobType: type,
  });

  try {
    switch (type) {
      case 'single':
        if (!shipment) {
          throw new Error('shipment data is required for single type');
        }
        const singleResult = await processShipment(shipment);
        return {
          success: singleResult.success,
          type: 'single',
          results: singleResult,
        };

      case 'batch':
        if (!shipments || shipments.length === 0) {
          throw new Error('shipments array is required for batch type');
        }
        const batchResult = await processBatchShipment(shipments);
        return {
          success: batchResult.failed === 0,
          type: 'batch',
          results: batchResult,
        };

      case 'deadline-alert':
        await sendDeadlineAlerts();
        return {
          success: true,
          type: 'deadline-alert',
        };

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    log.error({
      type: 'shipment_job_error',
      jobId: job.id,
      error: (error as Error).message,
    });

    throw error;
  }
}

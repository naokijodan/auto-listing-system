/**
 * Phase 41: Joom出品ワーカープロセッサー
 * Joom出品をBullMQジョブとして非同期処理
 */
import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import type { JoomPublishJobData, JoomPublishJobType } from '@rakuda/queue';
import {
  joomPublishService,
  batchPublishService,
  imagePipelineService,
} from '../lib/joom-publish-service';

const log = logger.child({ module: 'joom-publish-processor' });

// Re-export types for backward compatibility
export type { JoomPublishJobType, JoomPublishJobData };

/**
 * Joom出品ジョブプロセッサー
 */
export async function processJoomPublishJob(job: Job<JoomPublishJobData>): Promise<any> {
  const { type, taskId, joomListingId, batchId, productIds, options } = job.data;

  log.info({
    type: 'job_start',
    jobId: job.id,
    jobType: type,
    taskId,
    joomListingId,
    batchId,
  });

  try {
    switch (type) {
      case 'create-listing':
        return await processCreateListing(taskId!);

      case 'process-images':
        return await processImagesForListing(joomListingId!);

      case 'publish':
        return await processPublish(joomListingId!);

      case 'batch-publish':
        return await processBatchPublish(batchId!);

      case 'dry-run':
        return await processDryRun(taskId!);

      case 'sync-status':
        return await processSyncStatus(joomListingId!);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error: any) {
    log.error({
      type: 'job_error',
      jobId: job.id,
      jobType: type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 出品作成処理
 */
async function processCreateListing(taskId: string): Promise<any> {
  const joomListingId = await joomPublishService.createJoomListing(taskId);

  log.info({
    type: 'create_listing_complete',
    taskId,
    joomListingId,
  });

  return {
    taskId,
    joomListingId,
    status: 'DRAFT',
  };
}

/**
 * 画像処理
 */
async function processImagesForListing(joomListingId: string): Promise<any> {
  await joomPublishService.processImagesForListing(joomListingId);

  const listing = await prisma.joomListing.findUnique({
    where: { id: joomListingId },
  });

  log.info({
    type: 'process_images_complete',
    joomListingId,
    imageCount: listing?.joomImages.length || 0,
  });

  return {
    joomListingId,
    status: listing?.status,
    imageCount: listing?.joomImages.length || 0,
  };
}

/**
 * Joom出品実行
 */
async function processPublish(joomListingId: string): Promise<any> {
  const result = await joomPublishService.publishToJoom(joomListingId);

  log.info({
    type: 'publish_complete',
    joomListingId,
    success: result.success,
    joomProductId: result.joomProductId,
  });

  return {
    joomListingId,
    success: result.success,
    joomProductId: result.joomProductId,
    joomListingUrl: result.joomListingUrl,
    error: result.error,
  };
}

/**
 * バッチ出品処理
 */
async function processBatchPublish(batchId: string): Promise<any> {
  const result = await batchPublishService.executeBatch(batchId);

  log.info({
    type: 'batch_publish_complete',
    batchId,
    total: result.total,
    success: result.success,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

/**
 * Dry-Run処理
 */
async function processDryRun(taskId: string): Promise<any> {
  const result = await joomPublishService.dryRun(taskId);

  log.info({
    type: 'dry_run_complete',
    taskId,
    estimatedVisibility: result.estimatedVisibility,
    warningCount: result.validation.warnings.length,
  });

  return result;
}

/**
 * ステータス同期処理
 */
async function processSyncStatus(joomListingId: string): Promise<any> {
  const listing = await prisma.joomListing.findUnique({
    where: { id: joomListingId },
  });

  if (!listing || !listing.joomProductId) {
    return { joomListingId, synced: false, reason: 'No Joom product ID' };
  }

  // TODO: Joom APIから最新状態を取得して同期
  // const joomProduct = await joomClient.getProduct(listing.joomProductId);

  await prisma.joomListing.update({
    where: { id: joomListingId },
    data: { lastSyncedAt: new Date() },
  });

  log.info({
    type: 'sync_status_complete',
    joomListingId,
  });

  return {
    joomListingId,
    synced: true,
  };
}

/**
 * 完全ワークフロー処理（タスク→出品）
 */
export async function processFullJoomWorkflow(
  job: Job<{ taskId: string; skipImages?: boolean }>
): Promise<any> {
  const { taskId, skipImages = false } = job.data;

  log.info({
    type: 'full_joom_workflow_start',
    jobId: job.id,
    taskId,
  });

  try {
    // タスク確認
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'APPROVED') {
      return {
        taskId,
        success: false,
        error: `Task not approved: ${task.status}`,
      };
    }

    // 1. 出品作成
    const joomListingId = await joomPublishService.createJoomListing(taskId);

    // 2. 画像処理（スキップオプションなし）
    if (!skipImages) {
      await joomPublishService.processImagesForListing(joomListingId);
    }

    // 3. 出品実行
    const result = await joomPublishService.publishToJoom(joomListingId);

    log.info({
      type: 'full_joom_workflow_complete',
      jobId: job.id,
      taskId,
      joomListingId,
      success: result.success,
      joomProductId: result.joomProductId,
    });

    return {
      taskId,
      joomListingId,
      success: result.success,
      joomProductId: result.joomProductId,
      joomListingUrl: result.joomListingUrl,
      error: result.error,
    };
  } catch (error: any) {
    log.error({
      type: 'full_joom_workflow_error',
      jobId: job.id,
      taskId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 承認済みタスクの自動出品処理
 */
export async function processAutoJoomPublish(
  job: Job<{ limit?: number }>
): Promise<any> {
  const { limit = 10 } = job.data;

  log.info({
    type: 'auto_joom_publish_start',
    jobId: job.id,
    limit,
  });

  // 承認済みタスクを取得
  const approvedTasks = await prisma.enrichmentTask.findMany({
    where: {
      status: 'APPROVED',
      joomListing: null,
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  const results: Array<{
    taskId: string;
    success: boolean;
    joomProductId?: string;
    error?: string;
  }> = [];

  for (const task of approvedTasks) {
    try {
      const joomListingId = await joomPublishService.createJoomListing(task.id);
      await joomPublishService.processImagesForListing(joomListingId);
      const result = await joomPublishService.publishToJoom(joomListingId);

      results.push({
        taskId: task.id,
        success: result.success,
        joomProductId: result.joomProductId,
        error: result.error,
      });
    } catch (error: any) {
      results.push({
        taskId: task.id,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  log.info({
    type: 'auto_joom_publish_complete',
    jobId: job.id,
    total: approvedTasks.length,
    success: successCount,
    failed: failedCount,
  });

  return {
    total: approvedTasks.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

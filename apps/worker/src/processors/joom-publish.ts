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
import { JoomApiClient } from '../lib/joom-api';

const log = logger.child({ module: 'joom-publish-processor' });

// Re-export types for backward compatibility
export type { JoomPublishJobType, JoomPublishJobData };

// APIクライアントのシングルトン
let joomClient: JoomApiClient | null = null;
function getJoomClient(): JoomApiClient {
  if (!joomClient) {
    joomClient = new JoomApiClient();
  }
  return joomClient;
}

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

      case 'delete-product' as any:
        // joomProductId は型定義外のため any キャストで取得
        return await processDeleteProduct((job.data as any).joomProductId, joomListingId!);

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

  const listing = await prisma.listing.findUnique({
    where: { id: joomListingId },
  });

  log.info({
    type: 'process_images_complete',
    joomListingId,
    imageCount: ((listing?.marketplaceData as any)?.joomImages || []).length || 0,
  });

  return {
    joomListingId,
    status: listing?.status,
    imageCount: ((listing?.marketplaceData as any)?.joomImages || []).length || 0,
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

  // Phase 44: 出品成功時のSlackアラート
  if (result.success && result.joomProductId) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: joomListingId },
      });
      if (listing) {
        const { alertManager: slackAlertManager } = await import('../lib/slack-alert');
        await slackAlertManager.alertPublishSuccess(
          ((listing.marketplaceData as any)?.title as string) || 'Unknown Product',
          result.joomProductId,
          (listing as any).listingPrice || 0
        );
      }
    } catch (alertErr) {
      log.error({ type: 'failed_to_send_publish_alert', error: (alertErr as Error).message });
    }
  }

  return {
    joomListingId,
    success: result.success,
    joomProductId: result.joomProductId,
    joomListingUrl: result.joomListingUrl,
    error: result.error,
  };
}

/**
 * 商品削除処理（Joom API）
 * 既にDB上のJoomListingは削除済みの前提のため、DB操作は不要
 */
async function processDeleteProduct(joomProductId: string, joomListingId?: string): Promise<any> {
  const client = getJoomClient();
  const resp = await client.deleteProduct(joomProductId);

  if (resp.success) {
    log.info({
      type: 'delete_product_complete',
      joomProductId,
      joomListingId,
      success: true,
    });
  } else {
    log.error({
      type: 'delete_product_failed',
      joomProductId,
      joomListingId,
      success: false,
      error: resp.error?.message,
    });
  }

  return {
    joomProductId,
    joomListingId,
    success: resp.success,
    error: resp.error?.message,
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

  // Phase 44: バッチ完了時のSlackアラート
  try {
    const { alertManager: slackAlertManager } = await import('../lib/slack-alert');
    await slackAlertManager.alertBatchComplete(
      batchId,
      result.total,
      result.success,
      result.failed
    );
  } catch (alertErr) {
    log.error({ type: 'failed_to_send_batch_alert', error: (alertErr as Error).message });
  }

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
  const listing = await prisma.listing.findUnique({
    where: { id: joomListingId },
  });

  const currentData = (listing?.marketplaceData as any) || {};
  const joomProductId = currentData?.joomProductId as string | undefined;

  if (!listing || !joomProductId) {
    return { joomListingId, synced: false, reason: 'No Joom product ID' };
  }

  try {
    const client = getJoomClient();
    const resp = await client.getProduct(joomProductId);

    let updateData: any = { lastSyncedAt: new Date() };
    let resolvedStatus: string | undefined;
    let notFound = false;

    if (resp.success && resp.data) {
      const data: any = resp.data as any;

      // Joom側のステータスに応じて更新
      const enabled = data?.enabled ?? (typeof data?.status === 'string' ? ['enabled', 'ENABLED', 'active', 'ACTIVE'].includes(data.status) : undefined);
      const disabled = data?.disabled ?? (typeof data?.status === 'string' ? ['disabled', 'DISABLED', 'paused', 'PAUSED'].includes(data.status) : undefined);

      if (enabled === true) {
        resolvedStatus = 'ACTIVE';
      } else if (disabled === true || enabled === false) {
        resolvedStatus = 'PAUSED';
      }

      if (resolvedStatus) {
        updateData.status = resolvedStatus as any;
      }
    } else {
      // 404 Not Found → ENDED
      const msg = resp.error?.message?.toLowerCase() || '';
      if (msg.includes('not found') || msg.includes('404')) {
        notFound = true;
        updateData.status = 'ENDED';
      } else {
        // それ以外のエラーは記録のみ（marketplaceDataにマージ）
        const cur = (listing.marketplaceData as any) || {};
        updateData.marketplaceData = {
          ...cur,
          errorCount: (cur.errorCount || 0) + 1,
          lastError: resp.error?.message || 'Unknown error from Joom API',
        };
      }
    }

    await prisma.listing.update({
      where: { id: joomListingId },
      data: updateData,
    });

    log.info({
      type: 'sync_status_complete',
      joomListingId,
      joomProductId,
      status: updateData.status,
      notFound,
      success: true,
    });

    return {
      joomListingId,
      synced: true,
      status: updateData.status,
      notFound,
    };
  } catch (error: any) {
    // エラー時はerrorCount++, lastError, lastSyncedAtを記録
    const cur = (listing?.marketplaceData as any) || {};
    await prisma.listing.update({
      where: { id: joomListingId },
      data: {
        lastSyncedAt: new Date(),
        marketplaceData: {
          ...cur,
          errorCount: (cur.errorCount || 0) + 1,
          lastError: error.message || String(error),
        },
      },
    });

    log.error({
      type: 'sync_status_error',
      joomListingId,
      joomProductId,
      error: error.message,
    });

    return {
      joomListingId,
      synced: false,
      error: error.message,
    };
  }
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

  // 承認済みタスクを取得（Listing未作成フィルタは後段で実施）
  const approvedTasks = await prisma.enrichmentTask.findMany({
    where: {
      status: 'APPROVED',
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: { product: true },
  });

  // 既にJOOMのListingがあるタスクを除外
  const tasksWithoutListing: typeof approvedTasks = [];
  for (const task of approvedTasks) {
    const existingListing = await prisma.listing.findFirst({
      where: { productId: task.productId, marketplace: 'JOOM' as any },
    });
    if (!existingListing) tasksWithoutListing.push(task);
  }

  const results: Array<{
    taskId: string;
    success: boolean;
    joomProductId?: string;
    error?: string;
  }> = [];

  for (const task of tasksWithoutListing) {
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
    total: tasksWithoutListing.length,
    success: successCount,
    failed: failedCount,
  });

  return {
    total: tasksWithoutListing.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * Phase 41: エンリッチメントワーカープロセッサー
 * 翻訳・属性抽出・コンテンツ検証をBullMQジョブとして非同期処理
 */
import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import type { EnrichmentJobData, EnrichmentJobType } from '@rakuda/queue';
import {
  enrichmentTaskManager,
  translatorService,
  priceCalculatorService,
  contentValidatorService,
} from '../lib/enrichment-service';
import { imagePipelineService } from '../lib/joom-publish-service';

const log = logger.child({ module: 'enrichment-processor' });

// Re-export types for backward compatibility
export type { EnrichmentJobType, EnrichmentJobData };

/**
 * エンリッチメントジョブプロセッサー
 */
export async function processEnrichmentJob(job: Job<EnrichmentJobData>): Promise<any> {
  const { type, productId, taskId, productIds, priority } = job.data;

  log.info({
    type: 'job_start',
    jobId: job.id,
    jobType: type,
    productId,
    taskId,
  });

  try {
    switch (type) {
      case 'enrich-product':
        return await processEnrichProduct(productId!, priority);

      case 'enrich-batch':
        return await processEnrichBatch(productIds!, priority);

      case 'process-images':
        return await processImages(taskId!);

      case 'validate-content':
        return await validateContent(taskId!);

      case 'calculate-price':
        return await calculatePrice(taskId!);

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
 * 商品エンリッチメント処理
 */
async function processEnrichProduct(productId: string, priority: number = 0): Promise<any> {
  // タスク作成
  const taskId = await enrichmentTaskManager.createTask(productId, priority);

  // タスク実行
  await enrichmentTaskManager.executeTask(taskId);

  const task = await prisma.enrichmentTask.findUnique({
    where: { id: taskId },
    include: { product: true },
  });

  log.info({
    type: 'enrich_product_complete',
    taskId,
    productId,
    status: task?.status,
  });

  return {
    taskId,
    productId,
    status: task?.status,
    validationResult: task?.validationResult,
  };
}

/**
 * バッチエンリッチメント処理
 */
async function processEnrichBatch(productIds: string[], priority: number = 0): Promise<any> {
  const results: Array<{ productId: string; success: boolean; taskId?: string; error?: string }> = [];

  for (const productId of productIds) {
    try {
      const taskId = await enrichmentTaskManager.createTask(productId, priority);
      await enrichmentTaskManager.executeTask(taskId);
      results.push({ productId, success: true, taskId });
    } catch (error: any) {
      results.push({ productId, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  log.info({
    type: 'enrich_batch_complete',
    total: productIds.length,
    success: successCount,
    failed: failedCount,
  });

  return {
    total: productIds.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 画像処理
 */
async function processImages(taskId: string): Promise<any> {
  const task = await prisma.enrichmentTask.findUnique({
    where: { id: taskId },
    include: { product: true },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // 画像処理
  const imageResult = await imagePipelineService.processImages(
    task.productId,
    task.product.images
  );

  // タスク更新
  await prisma.enrichmentTask.update({
    where: { id: taskId },
    data: {
      bufferedImages: imageResult.buffered,
      optimizedImages: imageResult.optimized,
      imageStatus: 'COMPLETED',
    },
  });

  log.info({
    type: 'process_images_complete',
    taskId,
    imageCount: imageResult.optimized.length,
  });

  return {
    taskId,
    bufferedCount: imageResult.buffered.length,
    optimizedCount: imageResult.optimized.length,
  };
}

/**
 * コンテンツ検証
 */
async function validateContent(taskId: string): Promise<any> {
  const task = await prisma.enrichmentTask.findUnique({
    where: { id: taskId },
    include: { product: true },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // 検証実行
  const validation = await contentValidatorService.validateWithAI(
    task.product.title,
    task.product.description,
    task.product.price
  );

  // 検証結果をマッピング
  let validationResult: string;
  if (validation.severity === 'critical' || validation.severity === 'high') {
    validationResult = 'REJECTED';
  } else if (validation.severity === 'medium' || validation.flags.length > 0) {
    validationResult = 'REVIEW_REQUIRED';
  } else {
    validationResult = 'APPROVED';
  }

  // タスク更新
  await prisma.enrichmentTask.update({
    where: { id: taskId },
    data: {
      validation: validation as any,
      validationResult: validationResult as any,
      validationStatus: 'COMPLETED',
    },
  });

  log.info({
    type: 'validate_content_complete',
    taskId,
    passed: validation.passed,
    flags: validation.flags,
    validationResult,
  });

  return {
    taskId,
    passed: validation.passed,
    flags: validation.flags,
    severity: validation.severity,
    validationResult,
  };
}

/**
 * 価格計算
 */
async function calculatePrice(taskId: string): Promise<any> {
  const task = await prisma.enrichmentTask.findUnique({
    where: { id: taskId },
    include: { product: true },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // 価格計算
  const pricing = await priceCalculatorService.calculatePrice(task.product.price);

  // タスク更新
  await prisma.enrichmentTask.update({
    where: { id: taskId },
    data: {
      pricing: pricing as any,
    },
  });

  log.info({
    type: 'calculate_price_complete',
    taskId,
    costJpy: pricing.costJpy,
    finalPriceUsd: pricing.finalPriceUsd,
  });

  return {
    taskId,
    pricing,
  };
}

/**
 * 完全ワークフロー処理（エンリッチメント→画像→出品準備）
 */
export async function processFullWorkflow(job: Job<{ productId: string; autoPublish?: boolean }>): Promise<any> {
  const { productId, autoPublish = false } = job.data;

  log.info({
    type: 'full_workflow_start',
    jobId: job.id,
    productId,
    autoPublish,
  });

  try {
    // 1. エンリッチメント
    const enrichResult = await processEnrichProduct(productId, 10);

    if (enrichResult.status === 'REJECTED') {
      return {
        productId,
        status: 'REJECTED',
        message: 'Product rejected during enrichment',
      };
    }

    // 2. 画像処理
    if (enrichResult.taskId) {
      await processImages(enrichResult.taskId);
    }

    // 3. 自動出品フラグがあり、承認済みの場合
    if (autoPublish && enrichResult.status === 'APPROVED') {
      // Joom出品ジョブをキューに追加（別のキューで処理）
      // ここでは準備完了のステータスを返すのみ
      return {
        productId,
        taskId: enrichResult.taskId,
        status: 'READY_TO_PUBLISH',
        message: 'Ready for Joom publishing',
      };
    }

    return {
      productId,
      taskId: enrichResult.taskId,
      status: enrichResult.status,
    };
  } catch (error: any) {
    log.error({
      type: 'full_workflow_error',
      jobId: job.id,
      productId,
      error: error.message,
    });
    throw error;
  }
}

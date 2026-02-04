import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { ImageJobPayload, ImageJobResult } from '@rakuda/schema';
import { processImages } from '../lib/image-processor';

/**
 * 画像処理ジョブプロセッサー
 */
export async function processImageJob(
  job: Job<ImageJobPayload>
): Promise<ImageJobResult> {
  const { productId, imageUrls, removeBackground } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'image' });

  log.info({
    type: 'image_processing_start',
    productId,
    imageCount: imageUrls.length,
    removeBackground,
  });

  // ステータス更新
  await prisma.product.update({
    where: { id: productId },
    data: {
      imageStatus: 'PROCESSING',
      status: 'PROCESSING_IMAGES',
    },
  });

  try {
    // 画像処理実行
    const processedImages = await processImages(
      imageUrls,
      productId,
      removeBackground ?? true,
      3 // 並列数
    );

    // 処理済み画像URLを保存
    const processedUrls = processedImages.map((img) => img.processedUrl);
    const failedUrls = imageUrls.filter(
      (url) => !processedImages.find((img) => img.originalUrl === url)
    );

    await prisma.product.update({
      where: { id: productId },
      data: {
        processedImages: processedUrls,
        imageStatus: 'COMPLETED',
        status: 'READY_TO_REVIEW',
      },
    });

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `image-${Date.now()}`,
        queueName: 'image',
        jobType: 'IMAGE',
        status: 'COMPLETED',
        productId,
        result: {
          originalCount: imageUrls.length,
          processedCount: processedImages.length,
          failedCount: failedUrls.length,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'image_processing_complete',
      productId,
      processedCount: processedImages.length,
      failedCount: failedUrls.length,
    });

    return {
      success: true,
      message: `Processed ${processedImages.length} images`,
      processedUrls,
      failedUrls,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'image_processing_error',
      productId,
      error: error.message,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        imageStatus: 'ERROR',
        status: 'ERROR',
        lastError: error.message,
      },
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `image-${Date.now()}`,
        queueName: 'image',
        jobType: 'IMAGE',
        status: 'FAILED',
        productId,
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

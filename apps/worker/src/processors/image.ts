import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { ImageJobPayload, ImageJobResult } from '@als/schema';

/**
 * 画像処理ジョブプロセッサー
 *
 * TODO Phase 2で実装:
 * - 画像ダウンロード
 * - rembg による背景除去
 * - リサイズ
 * - MinIO/S3 へのアップロード
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
    },
  });

  try {
    // TODO: Phase 2で実装
    // 1. 各画像をダウンロード
    // 2. rembg で背景除去（removeBackground が true の場合）
    // 3. リサイズ
    // 4. MinIO/S3 にアップロード
    // 5. 新しいURLをDBに保存

    const processedUrls: string[] = [];
    const failedUrls: string[] = [];

    // プレースホルダー: 元のURLをそのまま返す
    for (const url of imageUrls) {
      processedUrls.push(url);
    }

    // ステータス更新
    await prisma.product.update({
      where: { id: productId },
      data: {
        processedImages: processedUrls,
        imageStatus: 'COMPLETED',
      },
    });

    log.info({
      type: 'image_processing_complete',
      productId,
      processed: processedUrls.length,
      failed: failedUrls.length,
    });

    return {
      success: true,
      message: 'Image processing placeholder',
      processedUrls,
      failedUrls,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    // エラー時はステータス更新
    await prisma.product.update({
      where: { id: productId },
      data: {
        imageStatus: 'ERROR',
        lastError: error.message,
      },
    });

    throw error;
  }
}

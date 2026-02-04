import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { TranslateJobPayload, TranslateJobResult } from '@als/schema';

/**
 * 翻訳ジョブプロセッサー
 *
 * TODO Phase 2で実装:
 * - OpenAI / Claude API による翻訳
 * - AI属性抽出
 */
export async function processTranslateJob(
  job: Job<TranslateJobPayload>
): Promise<TranslateJobResult> {
  const { productId, title, description, extractAttributes } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'translate' });

  log.info({
    type: 'translate_start',
    productId,
    titleLength: title.length,
    descriptionLength: description.length,
    extractAttributes,
  });

  // ステータス更新
  await prisma.product.update({
    where: { id: productId },
    data: {
      translationStatus: 'PROCESSING',
      status: 'TRANSLATING',
    },
  });

  try {
    // TODO: Phase 2で実装
    // 1. OpenAI / Claude API を呼び出し
    // 2. タイトルと説明文を翻訳
    // 3. extractAttributes が true なら属性も抽出
    // 4. DBに保存

    // プレースホルダー: 簡易的な処理
    const titleEn = `[EN] ${title}`;
    const descriptionEn = `[EN] ${description}`;
    const attributes = extractAttributes
      ? {
          brand: null,
          model: null,
          color: null,
          confidence: 0,
          extractedBy: 'ai' as const,
        }
      : {};

    // DB更新
    await prisma.product.update({
      where: { id: productId },
      data: {
        titleEn,
        descriptionEn,
        attributes,
        translationStatus: 'COMPLETED',
        status: 'READY_TO_REVIEW',
      },
    });

    log.info({
      type: 'translate_complete',
      productId,
    });

    return {
      success: true,
      message: 'Translation placeholder',
      titleEn,
      descriptionEn,
      attributes,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        translationStatus: 'ERROR',
        status: 'ERROR',
        lastError: error.message,
      },
    });

    throw error;
  }
}

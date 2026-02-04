import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { TranslateJobPayload, TranslateJobResult } from '@rakuda/schema';
import { translateProduct, isOpenAIConfigured } from '../lib/openai';

/**
 * 翻訳ジョブプロセッサー
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
    let result: TranslateJobResult;

    if (isOpenAIConfigured()) {
      // OpenAI APIで翻訳
      const translation = await translateProduct(
        title,
        description,
        { extractAttributes: extractAttributes ?? true }
      );

      // DB更新
      await prisma.product.update({
        where: { id: productId },
        data: {
          titleEn: translation.titleEn,
          descriptionEn: translation.descriptionEn,
          attributes: translation.attributes || {},
          translationStatus: 'COMPLETED',
          status: 'READY_TO_REVIEW',
        },
      });

      result = {
        success: true,
        message: 'Translation completed',
        titleEn: translation.titleEn,
        descriptionEn: translation.descriptionEn,
        attributes: translation.attributes,
        tokensUsed: translation.tokensUsed,
        timestamp: new Date().toISOString(),
      };
    } else {
      // OpenAI未設定: プレースホルダー
      log.warn({ type: 'openai_not_configured' });

      const titleEn = `[EN] ${title}`;
      const descriptionEn = `[EN] ${description}`;
      const attributes = extractAttributes
        ? {
            brand: null,
            model: null,
            color: null,
            confidence: 0,
            extractedBy: 'placeholder' as const,
          }
        : undefined;

      await prisma.product.update({
        where: { id: productId },
        data: {
          titleEn,
          descriptionEn,
          attributes: attributes || {},
          translationStatus: 'COMPLETED',
          status: 'READY_TO_REVIEW',
        },
      });

      result = {
        success: true,
        message: 'Translation placeholder (OpenAI not configured)',
        titleEn,
        descriptionEn,
        attributes,
        tokensUsed: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `translate-${Date.now()}`,
        queueName: 'translate',
        jobType: 'TRANSLATE',
        status: 'COMPLETED',
        productId,
        result: {
          tokensUsed: result.tokensUsed,
          hasAttributes: !!result.attributes,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'translate_complete',
      productId,
      tokensUsed: result.tokensUsed,
    });

    return result;
  } catch (error: any) {
    log.error({
      type: 'translate_error',
      productId,
      error: error.message,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        translationStatus: 'ERROR',
        status: 'ERROR',
        lastError: error.message,
      },
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `translate-${Date.now()}`,
        queueName: 'translate',
        jobType: 'TRANSLATE',
        status: 'FAILED',
        productId,
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

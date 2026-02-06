import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { TranslateJobPayload, TranslateJobResult } from '@rakuda/schema';
import { translateProduct, isOpenAIConfigured } from '../lib/openai';
import { enrichProductFull, quickValidate } from '@rakuda/enrichment';

/**
 * Phase 40-A: 拡張翻訳ジョブペイロード
 */
export interface EnrichmentJobPayload extends TranslateJobPayload {
  useEnrichment?: boolean;  // Phase 40エンリッチメントを使用
  includeRussian?: boolean; // ロシア語翻訳を含める
  validateContent?: boolean; // 禁制品チェックを行う
}

/**
 * Phase 40-A: 拡張翻訳ジョブ結果
 */
export interface EnrichmentJobResult extends TranslateJobResult {
  titleRu?: string;
  descriptionRu?: string;
  validation?: {
    status: 'approved' | 'rejected' | 'review_required';
    flags: string[];
    reviewNotes?: string;
  };
}

/**
 * 翻訳ジョブプロセッサー（Phase 40対応）
 */
export async function processTranslateJob(
  job: Job<EnrichmentJobPayload>
): Promise<EnrichmentJobResult> {
  const {
    productId,
    title,
    description,
    extractAttributes,
    useEnrichment = true,  // デフォルトでPhase 40エンリッチメント使用
    includeRussian = true,
    validateContent = true,
  } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'translate' });

  log.info({
    type: 'translate_start',
    productId,
    titleLength: title.length,
    descriptionLength: description.length,
    extractAttributes,
    useEnrichment,
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
    let result: EnrichmentJobResult;

    // Phase 40: エンリッチメントエンジンを使用
    if (useEnrichment) {
      // 事前の禁制品チェック（高速）
      if (validateContent) {
        const quickCheck = quickValidate(title, description);
        if (!quickCheck.canProcess) {
          log.warn({
            type: 'content_rejected_early',
            flags: quickCheck.flags,
          });

          await prisma.product.update({
            where: { id: productId },
            data: {
              translationStatus: 'COMPLETED',
              status: 'ERROR',
              lastError: `禁制品検出: ${quickCheck.flags.join(', ')}`,
            },
          });

          return {
            success: false,
            message: `Content rejected: ${quickCheck.flags.join(', ')}`,
            titleEn: title,
            descriptionEn: description,
            tokensUsed: 0,
            validation: {
              status: 'rejected',
              flags: quickCheck.flags,
            },
            timestamp: new Date().toISOString(),
          };
        }
      }

      // 完全なエンリッチメント実行
      const enrichment = await enrichProductFull(title, description);

      // 検証結果に基づくステータス決定
      type ProductStatusType = 'ERROR' | 'READY_TO_REVIEW' | 'APPROVED';
      let newStatus: ProductStatusType;
      if (enrichment.validation.status === 'rejected') {
        newStatus = 'ERROR';
      } else if (enrichment.validation.status === 'review_required') {
        newStatus = 'READY_TO_REVIEW';
      } else {
        newStatus = 'APPROVED';
      }

      // 属性をJSON互換形式に変換
      const attributesJson = {
        brand: enrichment.attributes.brand ?? null,
        model: enrichment.attributes.model ?? null,
        color: enrichment.attributes.color ?? null,
        size: enrichment.attributes.size ?? null,
        material: enrichment.attributes.material ?? null,
        condition: enrichment.attributes.condition ?? null,
        category: enrichment.attributes.category ?? null,
        itemSpecifics: enrichment.attributes.itemSpecifics,
        confidence: enrichment.attributes.confidence,
        // ロシア語翻訳を属性に含める
        ...(includeRussian && enrichment.translations.ru ? {
          titleRu: enrichment.translations.ru.title,
          descriptionRu: enrichment.translations.ru.description,
        } : {}),
        // 検証結果
        validation: {
          status: enrichment.validation.status,
          passed: enrichment.validation.passed,
          flags: enrichment.validation.flags,
          reviewNotes: enrichment.validation.reviewNotes ?? null,
          riskScore: enrichment.validation.riskScore,
        },
      };

      // DB更新
      await prisma.product.update({
        where: { id: productId },
        data: {
          titleEn: enrichment.translations.en.title,
          descriptionEn: enrichment.translations.en.description,
          attributes: attributesJson,
          translationStatus: 'COMPLETED',
          status: newStatus,
          lastError: enrichment.validation.status === 'rejected'
            ? `禁制品検出: ${enrichment.validation.flags.join(', ')}`
            : null,
        },
      });

      result = {
        success: enrichment.validation.status !== 'rejected',
        message: `Enrichment completed (${enrichment.validation.status})`,
        titleEn: enrichment.translations.en.title,
        descriptionEn: enrichment.translations.en.description,
        titleRu: enrichment.translations.ru?.title,
        descriptionRu: enrichment.translations.ru?.description,
        attributes: {
          brand: enrichment.attributes.brand,
          model: enrichment.attributes.model,
          color: enrichment.attributes.color,
          size: enrichment.attributes.size,
          material: enrichment.attributes.material,
          condition: enrichment.attributes.condition,
          confidence: enrichment.attributes.confidence,
        },
        validation: {
          status: enrichment.validation.status,
          flags: enrichment.validation.flags,
          reviewNotes: enrichment.validation.reviewNotes,
        },
        tokensUsed: enrichment.tokensUsed,
        timestamp: new Date().toISOString(),
      };
    }
    // 従来の翻訳処理（後方互換性）
    else if (isOpenAIConfigured()) {
      const translation = await translateProduct(
        title,
        description,
        { extractAttributes: extractAttributes ?? true }
      );

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
          validationStatus: result.validation?.status,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'translate_complete',
      productId,
      tokensUsed: result.tokensUsed,
      validationStatus: result.validation?.status,
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

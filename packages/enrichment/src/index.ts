/**
 * Phase 40-A: Content Enrichment Engine
 * 翻訳・属性抽出・禁制品チェックの統合エンジン
 *
 * Phase 45: eBayカテゴリマッピング追加
 */
export * from './translator';
export * from './attribute-extractor';
export * from './content-validator';
export * from './ebay-category-mapper';

import { enrichProduct, EnrichmentResult, isOpenAIConfigured } from './translator';
import { extractAttributes, mergeAttributes, ExtractedAttributes } from './attribute-extractor';
import { validateContent, mergeValidation, ValidationResult } from './content-validator';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'enrichment' });

/**
 * 完全なエンリッチメント結果
 */
export interface FullEnrichmentResult {
  translations: {
    en: { title: string; description: string };
    ru?: { title: string; description: string };
  };
  attributes: ExtractedAttributes;
  validation: ValidationResult;
  tokensUsed: number;
  processingTime: number;
}

/**
 * 商品データを完全にエンリッチする
 * 1. ルールベースの属性抽出（高速）
 * 2. ルールベースの禁制品チェック（高速）
 * 3. AI翻訳・属性抽出・検証（低速だが高精度）
 * 4. 結果のマージ
 */
export async function enrichProductFull(
  title: string,
  description: string,
  category?: string
): Promise<FullEnrichmentResult> {
  const startTime = Date.now();

  log.info({
    type: 'enrichment_full_start',
    titleLength: title.length,
    descriptionLength: description.length,
    category,
  });

  // 1. ルールベースの属性抽出（高速）
  const ruleAttributes = extractAttributes(title, description, category);

  // 2. ルールベースの禁制品チェック（高速）
  const ruleValidation = validateContent(title, description, category);

  // 禁制品判定された場合、AI処理をスキップ
  if (ruleValidation.status === 'rejected') {
    log.warn({
      type: 'enrichment_rejected_early',
      flags: ruleValidation.flags,
    });

    const processingTime = Date.now() - startTime;
    return {
      translations: {
        en: { title: `[EN] ${title}`, description: `[EN] ${description}` },
      },
      attributes: ruleAttributes,
      validation: ruleValidation,
      tokensUsed: 0,
      processingTime,
    };
  }

  // 3. AI翻訳・属性抽出・検証
  let aiResult: EnrichmentResult | null = null;
  let tokensUsed = 0;

  if (isOpenAIConfigured()) {
    try {
      aiResult = await enrichProduct(title, description, category);
      tokensUsed = aiResult.tokensUsed;
    } catch (error: any) {
      log.error({
        type: 'ai_enrichment_failed',
        error: error.message,
      });
    }
  }

  // 4. 結果のマージ
  let finalAttributes: ExtractedAttributes;
  let finalValidation: ValidationResult;
  let translations: FullEnrichmentResult['translations'];

  if (aiResult) {
    finalAttributes = mergeAttributes(aiResult.attributes, ruleAttributes);
    finalValidation = mergeValidation(
      {
        status: aiResult.validation.status,
        flags: aiResult.validation.flags,
        reviewNotes: aiResult.validation.reviewNotes,
        riskScore: aiResult.validation.isSafe ? 0 : 50,
      },
      ruleValidation
    );
    translations = {
      en: aiResult.translations.en,
      ru: aiResult.translations.ru,
    };
  } else {
    finalAttributes = ruleAttributes;
    finalValidation = ruleValidation;
    translations = {
      en: { title: `[EN] ${title}`, description: `[EN] ${description}` },
    };
  }

  const processingTime = Date.now() - startTime;

  log.info({
    type: 'enrichment_full_complete',
    processingTime,
    tokensUsed,
    validationStatus: finalValidation.status,
    attributeConfidence: finalAttributes.confidence,
  });

  return {
    translations,
    attributes: finalAttributes,
    validation: finalValidation,
    tokensUsed,
    processingTime,
  };
}

/**
 * 高速バリデーションのみ（キーワードベース）
 * キュー投入前の事前チェックに使用
 */
export function quickValidate(
  title: string,
  description: string,
  category?: string
): { canProcess: boolean; flags: string[] } {
  const validation = validateContent(title, description, category);
  return {
    canProcess: validation.status !== 'rejected',
    flags: validation.flags,
  };
}

import { PrismaClient } from '@prisma/client';
import { extractByRules, type RuleExtractionResult } from './rule-extractor';
import { extractByAI, type AIExtractionResult } from './ai-extractor';
import { getFieldsForCategory, resolveCategory } from './field-definitions';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'item-specifics' });

export interface ItemSpecificsResult {
  category: string;
  specifics: Record<string, string>;
  source: Record<string, 'rule' | 'ai' | 'default'>;
  coverage: { filled: number; total: number; ratio: number };
}

const prisma = new PrismaClient();

/**
 * 2段階でItem Specificsを抽出
 * Step 1: ルールベース（Brand, Country, Type等）
 * Step 2: AI抽出（残りの項目）
 */
export async function extractItemSpecifics(params: {
  title: string;
  description: string;
  tag?: string;
  category?: string;
}): Promise<ItemSpecificsResult> {
  const { title, description, tag } = params;

  // 1. カテゴリ判定
  const category = params.category || await resolveCategory(tag || '', prisma);
  if (!category) {
    log.warn({ type: 'category_unknown', tag, title: title.substring(0, 50) });
    return {
      category: 'Unknown',
      specifics: {},
      source: {},
      coverage: { filled: 0, total: 0, ratio: 0 },
    };
  }

  // 2. カテゴリ別フィールド定義取得
  const fields = await getFieldsForCategory(category, prisma);

  // 3. Step 1: ルールベース抽出
  const ruleResult = await extractByRules({ title, description, tag: tag || '', category, fields, prisma });

  // 4. Step 2: AI抽出（未入力フィールドのみ）
  const emptyFields = fields.filter(f => !ruleResult.specifics[f.fieldName]);
  let aiResult: AIExtractionResult = { specifics: {}, source: {} };

  if (emptyFields.length > 0) {
    try {
      aiResult = await extractByAI({
        title,
        description,
        category,
        fields: emptyFields,
        existingData: ruleResult.specifics,
      });
    } catch (error: any) {
      log.error({ type: 'ai_extraction_failed', error: error.message });
    }
  }

  // 5. マージ（ルールベースが優先）
  const merged: Record<string, string> = { ...aiResult.specifics, ...ruleResult.specifics };
  const sources: Record<string, 'rule' | 'ai' | 'default'> = { ...aiResult.source, ...ruleResult.source };

  // 6. カバレッジ計算
  const totalFields = fields.length;
  const filledFields = Object.values(merged).filter(v => v && v !== '' && v !== 'Does not apply').length;

  return {
    category,
    specifics: merged,
    source: sources,
    coverage: {
      filled: filledFields,
      total: totalFields,
      ratio: totalFields > 0 ? filledFields / totalFields : 0,
    },
  };
}

export { extractByRules } from './rule-extractor';
export { extractByAI } from './ai-extractor';
export { getFieldsForCategory, resolveCategory } from './field-definitions';


/**
 * Phase 40-A: 翻訳エンジン
 * GPT-4oを使用した日英露翻訳
 */
import OpenAI from 'openai';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'enrichment/translator' });

// OpenAIクライアント
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * 翻訳結果
 */
export interface TranslationResult {
  en: {
    title: string;
    description: string;
  };
  ru?: {
    title: string;
    description: string;
  };
  tokensUsed: number;
}

/**
 * 統合翻訳結果（翻訳+属性+検証を含む）
 */
export interface EnrichmentResult {
  translations: TranslationResult;
  attributes: {
    brand?: string;
    color?: string;
    size?: string;
    material?: string;
    condition?: 'new' | 'like_new' | 'good' | 'fair';
    category?: string;
    itemSpecifics: Record<string, string>;
    confidence: number;
  };
  validation: {
    isSafe: boolean;
    status: 'approved' | 'rejected' | 'review_required';
    flags: string[];
    reviewNotes?: string;
  };
  tokensUsed: number;
}

/**
 * 翻訳・属性抽出・検証を一括で実行するプロンプト
 */
const ENRICHMENT_SYSTEM_PROMPT = `あなたは越境EC商品データの専門家です。
日本語の商品情報を分析し、以下の3つのタスクを同時に実行してください。

1. **翻訳**: 自然で商品説明として適切な英語・ロシア語に翻訳
2. **属性抽出**: 商品の構造化属性を抽出
3. **禁制品チェック**: 国際配送における禁制品・リスクを判定

【注意事項】
- 翻訳は直訳ではなく、海外バイヤーに魅力的に伝わる表現を心がける
- ブランド名は原文のまま維持
- 日本語特有の表現は適切に意訳
- SEOを意識したキーワードを含める
- 禁制品判定は厳格に行う（電池、危険物、ワシントン条約対象、偽ブランド品）`;

const ENRICHMENT_USER_PROMPT = `以下の日本語商品情報を分析してください。

【商品情報】
タイトル: {{title}}

説明文:
{{description}}

カテゴリ: {{category}}

【出力形式（JSON）】
{
  "translations": {
    "en": { "title": "英語タイトル", "description": "英語説明文" },
    "ru": { "title": "ロシア語タイトル", "description": "ロシア語説明文" }
  },
  "attributes": {
    "brand": "ブランド名（推測できる場合）",
    "color": "色",
    "size": "サイズ",
    "material": "素材",
    "condition": "new|like_new|good|fair",
    "category": "推定カテゴリ",
    "itemSpecifics": {
      "Type": "商品タイプ",
      "Style": "スタイル"
    },
    "confidence": 0.85
  },
  "validation": {
    "isSafe": true,
    "status": "approved|rejected|review_required",
    "flags": ["検出されたリスク"],
    "reviewNotes": "人間確認が必要な場合のメモ"
  }
}

【禁制品判定基準】
- rejected: 電池含有、リチウムイオン、可燃物、スプレー缶、象牙・べっ甲、武器類、アダルト
- review_required: 商標侵害リスク、医薬品・サプリメント、高額ブランド品
- approved: 上記に該当しない`;

/**
 * 商品情報の翻訳・属性抽出・検証を一括実行
 */
export async function enrichProduct(
  title: string,
  description: string,
  category?: string
): Promise<EnrichmentResult> {
  // OpenAI APIキーが設定されていない場合はフォールバック
  if (!openai) {
    log.warn({ type: 'openai_not_configured' });
    return createFallbackResult(title, description);
  }

  const userPrompt = ENRICHMENT_USER_PROMPT
    .replace('{{title}}', title)
    .replace('{{description}}', description)
    .replace('{{category}}', category || '不明');

  try {
    log.info({
      type: 'enrichment_start',
      titleLength: title.length,
      descriptionLength: description.length,
      model: MODEL,
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    const tokensUsed = response.usage?.total_tokens || 0;

    log.info({
      type: 'enrichment_complete',
      tokensUsed,
      validationStatus: parsed.validation?.status,
      flags: parsed.validation?.flags,
    });

    return {
      translations: {
        en: parsed.translations?.en || { title: `[EN] ${title}`, description: `[EN] ${description}` },
        ru: parsed.translations?.ru,
        tokensUsed,
      },
      attributes: {
        brand: parsed.attributes?.brand,
        color: parsed.attributes?.color,
        size: parsed.attributes?.size,
        material: parsed.attributes?.material,
        condition: parsed.attributes?.condition,
        category: parsed.attributes?.category,
        itemSpecifics: parsed.attributes?.itemSpecifics || {},
        confidence: parsed.attributes?.confidence || 0.5,
      },
      validation: {
        isSafe: parsed.validation?.isSafe ?? true,
        status: parsed.validation?.status || 'review_required',
        flags: parsed.validation?.flags || [],
        reviewNotes: parsed.validation?.reviewNotes,
      },
      tokensUsed,
    };
  } catch (error: any) {
    log.error({
      type: 'enrichment_error',
      error: error.message,
    });

    return createFallbackResult(title, description);
  }
}

/**
 * 英語のみの翻訳（軽量版）
 */
export async function translateToEnglish(
  title: string,
  description: string
): Promise<{ title: string; description: string; tokensUsed: number }> {
  if (!openai) {
    return {
      title: `[EN] ${title}`,
      description: `[EN] ${description}`,
      tokensUsed: 0,
    };
  }

  const prompt = `Translate the following Japanese product information to natural, SEO-friendly English:

Title: ${title}

Description:
${description}

Return JSON: {"title": "...", "description": "..."}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are an expert e-commerce product translator.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const parsed = JSON.parse(content);
    return {
      title: parsed.title || title,
      description: parsed.description || description,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error: any) {
    log.error({ type: 'translate_en_error', error: error.message });
    return {
      title: `[EN] ${title}`,
      description: `[EN] ${description}`,
      tokensUsed: 0,
    };
  }
}

/**
 * フォールバック結果を生成
 */
function createFallbackResult(title: string, description: string): EnrichmentResult {
  return {
    translations: {
      en: { title: `[EN] ${title}`, description: `[EN] ${description}` },
      tokensUsed: 0,
    },
    attributes: {
      itemSpecifics: {},
      confidence: 0,
    },
    validation: {
      isSafe: true,
      status: 'review_required',
      flags: ['openai_not_configured'],
      reviewNotes: 'OpenAI APIが設定されていないため、手動確認が必要です',
    },
    tokensUsed: 0,
  };
}

/**
 * OpenAI APIキーが設定されているか確認
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

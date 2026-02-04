import OpenAI from 'openai';
import { logger } from '@als/logger';

const log = logger.child({ module: 'openai' });

// OpenAIクライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// モデル設定
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export interface TranslationResult {
  titleEn: string;
  descriptionEn: string;
  attributes?: {
    brand?: string;
    model?: string;
    color?: string;
    material?: string;
    size?: string;
    condition?: string;
    confidence: number;
  };
  tokensUsed: number;
}

/**
 * 商品タイトルと説明文を翻訳し、属性を抽出
 */
export async function translateProduct(
  title: string,
  description: string,
  extractAttributes: boolean = true
): Promise<TranslationResult> {
  const systemPrompt = `You are a professional translator specializing in e-commerce product listings.
Your task is to translate Japanese product information into natural, SEO-friendly English suitable for international marketplaces like eBay and Joom.

Guidelines:
- Use clear, concise language
- Keep brand names in original form
- Convert Japanese sizes to international equivalents when possible
- Remove Japanese-specific phrases that don't translate well
- Optimize for search visibility`;

  const attributeInstructions = extractAttributes
    ? `

Also extract product attributes from the text if present:
- brand: Brand name (if mentioned)
- model: Model number or name
- color: Color(s)
- material: Material(s)
- size: Size information
- condition: Product condition

Return a JSON object with this structure:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description",
  "attributes": {
    "brand": "...",
    "model": "...",
    "color": "...",
    "material": "...",
    "size": "...",
    "condition": "...",
    "confidence": 0.8
  }
}

Set confidence to a value between 0 and 1 indicating how confident you are in the extracted attributes.
Only include attributes that are clearly stated in the text.`
    : `

Return a JSON object with this structure:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description"
}`;

  const userPrompt = `Translate the following Japanese product information to English:

Title: ${title}

Description:
${description}
${attributeInstructions}`;

  try {
    log.info({
      type: 'translation_start',
      titleLength: title.length,
      descriptionLength: description.length,
      model: MODEL,
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
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
      type: 'translation_complete',
      tokensUsed,
      hasAttributes: !!parsed.attributes,
    });

    return {
      titleEn: parsed.titleEn || title,
      descriptionEn: parsed.descriptionEn || description,
      attributes: parsed.attributes,
      tokensUsed,
    };
  } catch (error: any) {
    log.error({
      type: 'translation_error',
      error: error.message,
    });

    // フォールバック: プレフィックス付きで返す
    return {
      titleEn: `[EN] ${title}`,
      descriptionEn: `[EN] ${description}`,
      tokensUsed: 0,
    };
  }
}

/**
 * APIキーが設定されているか確認
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

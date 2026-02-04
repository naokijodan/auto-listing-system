import OpenAI from 'openai';
import { prisma } from '@als/database';
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
    [key: string]: any;
  };
  tokensUsed: number;
}

export interface TranslationPromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  extractAttributes: string[];
  additionalInstructions?: string;
  seoKeywords?: string[];
}

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = `You are a professional translator specializing in e-commerce product listings.
Your task is to translate Japanese product information into natural, SEO-friendly English suitable for international marketplaces like eBay and Joom.

Guidelines:
- Use clear, concise language
- Keep brand names in original form
- Convert Japanese sizes to international equivalents when possible
- Remove Japanese-specific phrases that don't translate well
- Optimize for search visibility`;

// デフォルトのユーザープロンプトテンプレート
const DEFAULT_USER_PROMPT_TEMPLATE = `Translate the following Japanese product information to English:

Title: {{title}}

Description:
{{description}}`;

/**
 * カテゴリに応じた翻訳プロンプトを取得
 */
async function getPromptConfig(
  category?: string,
  marketplace?: string
): Promise<TranslationPromptConfig> {
  // カテゴリ・マーケットプレイス指定でプロンプトを検索
  let prompt = null;

  if (category) {
    prompt = await prisma.translationPrompt.findFirst({
      where: {
        category,
        marketplace: marketplace || null,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });
  }

  // カテゴリ別がなければマーケットプレイス別を検索
  if (!prompt && marketplace) {
    prompt = await prisma.translationPrompt.findFirst({
      where: {
        category: null,
        marketplace,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });
  }

  // どちらもなければデフォルトを検索
  if (!prompt) {
    prompt = await prisma.translationPrompt.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    });
  }

  // DBにもなければハードコードのデフォルトを使用
  if (!prompt) {
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
      extractAttributes: ['brand', 'model', 'color', 'material', 'size', 'condition'],
    };
  }

  return {
    systemPrompt: prompt.systemPrompt,
    userPromptTemplate: prompt.userPrompt,
    extractAttributes: prompt.extractAttributes,
    additionalInstructions: prompt.additionalInstructions || undefined,
    seoKeywords: prompt.seoKeywords,
  };
}

/**
 * 属性抽出の指示を生成
 */
function buildAttributeInstructions(
  extractAttributes: string[],
  additionalInstructions?: string,
  seoKeywords?: string[]
): string {
  if (extractAttributes.length === 0) {
    return `

Return a JSON object with this structure:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description"
}`;
  }

  const attributeList = extractAttributes
    .map((attr) => `- ${attr}: ${getAttributeDescription(attr)}`)
    .join('\n');

  const attributeFields = extractAttributes
    .map((attr) => `    "${attr}": "..."`)
    .join(',\n');

  let instructions = `

Also extract product attributes from the text if present:
${attributeList}

Return a JSON object with this structure:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description",
  "attributes": {
${attributeFields},
    "confidence": 0.8
  }
}

Set confidence to a value between 0 and 1 indicating how confident you are in the extracted attributes.
Only include attributes that are clearly stated in the text.`;

  if (additionalInstructions) {
    instructions += `\n\nAdditional instructions:\n${additionalInstructions}`;
  }

  if (seoKeywords && seoKeywords.length > 0) {
    instructions += `\n\nRecommended SEO keywords to include when appropriate: ${seoKeywords.join(', ')}`;
  }

  return instructions;
}

/**
 * 属性の説明を取得
 */
function getAttributeDescription(attr: string): string {
  const descriptions: Record<string, string> = {
    brand: 'Brand name (if mentioned)',
    model: 'Model number or name',
    color: 'Color(s)',
    material: 'Material(s)',
    size: 'Size information',
    condition: 'Product condition',
    movement: 'Watch movement type (automatic, quartz, etc.)',
    caseSize: 'Watch case diameter in mm',
    waterResistance: 'Water resistance rating',
    scale: 'Figure scale (1/7, 1/8, etc.)',
    character: 'Character name',
    series: 'Series or franchise name',
    year: 'Year of manufacture or release',
    gender: 'Target gender (mens, womens, unisex)',
  };

  return descriptions[attr] || `${attr} information`;
}

/**
 * 商品タイトルと説明文を翻訳し、属性を抽出
 */
export async function translateProduct(
  title: string,
  description: string,
  options: {
    extractAttributes?: boolean;
    category?: string;
    marketplace?: string;
  } = {}
): Promise<TranslationResult> {
  const { extractAttributes = true, category, marketplace } = options;

  // プロンプト設定を取得
  const promptConfig = await getPromptConfig(category, marketplace);

  // ユーザープロンプトを構築
  let userPrompt = promptConfig.userPromptTemplate
    .replace('{{title}}', title)
    .replace('{{description}}', description);

  // 属性抽出の指示を追加
  if (extractAttributes) {
    userPrompt += buildAttributeInstructions(
      promptConfig.extractAttributes,
      promptConfig.additionalInstructions,
      promptConfig.seoKeywords
    );
  } else {
    userPrompt += `

Return a JSON object with this structure:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description"
}`;
  }

  try {
    log.info({
      type: 'translation_start',
      titleLength: title.length,
      descriptionLength: description.length,
      category,
      marketplace,
      model: MODEL,
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: promptConfig.systemPrompt },
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

/**
 * 利用可能なプロンプト一覧を取得
 */
export async function getAvailablePrompts() {
  return prisma.translationPrompt.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  });
}

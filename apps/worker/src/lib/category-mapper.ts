/**
 * Phase 49: Joomカテゴリマッピングサービス
 * OpenAI GPT-4oを使用して商品情報からJoomカテゴリを自動選択
 */
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const log = logger.child({ module: 'category-mapper' });

// OpenAIクライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========================================
// 型定義
// ========================================

export interface ProductInfo {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category?: string;
  brand?: string;
  attributes?: Record<string, any>;
}

export interface CategorySuggestion {
  joomCategoryId: string;
  joomCategoryName: string;
  joomCategoryPath: string;
  confidence: number;
  requiredAttributes: Record<string, any>;
  recommendedAttributes: Record<string, any>;
  reasoning: string;
}

export interface CategoryMappingResult {
  success: boolean;
  suggestion?: CategorySuggestion;
  existingMapping?: {
    id: string;
    joomCategoryId: string;
    joomCategoryName: string;
    joomCategoryPath: string;
    requiredAttributes: Record<string, any>;
  };
  error?: string;
}

// ========================================
// Joomカテゴリ一覧（主要カテゴリ）
// ========================================
const JOOM_CATEGORIES = [
  { id: '1', name: 'Electronics', path: 'Electronics' },
  { id: '1-1', name: 'Smartphones', path: 'Electronics > Smartphones' },
  { id: '1-2', name: 'Tablets', path: 'Electronics > Tablets' },
  { id: '1-3', name: 'Laptops', path: 'Electronics > Laptops' },
  { id: '1-4', name: 'Smart Watches', path: 'Electronics > Wearables > Smart Watches' },
  { id: '1-5', name: 'Headphones', path: 'Electronics > Audio > Headphones' },
  { id: '1-6', name: 'Cameras', path: 'Electronics > Cameras' },
  { id: '2', name: 'Fashion', path: 'Fashion' },
  { id: '2-1', name: 'Men Clothing', path: 'Fashion > Men > Clothing' },
  { id: '2-2', name: 'Women Clothing', path: 'Fashion > Women > Clothing' },
  { id: '2-3', name: 'Watches', path: 'Fashion > Accessories > Watches' },
  { id: '2-4', name: 'Jewelry', path: 'Fashion > Accessories > Jewelry' },
  { id: '2-5', name: 'Bags', path: 'Fashion > Accessories > Bags' },
  { id: '2-6', name: 'Shoes', path: 'Fashion > Shoes' },
  { id: '3', name: 'Home & Garden', path: 'Home & Garden' },
  { id: '3-1', name: 'Kitchen', path: 'Home & Garden > Kitchen' },
  { id: '3-2', name: 'Home Decor', path: 'Home & Garden > Home Decor' },
  { id: '3-3', name: 'Furniture', path: 'Home & Garden > Furniture' },
  { id: '4', name: 'Beauty & Health', path: 'Beauty & Health' },
  { id: '4-1', name: 'Skincare', path: 'Beauty & Health > Skincare' },
  { id: '4-2', name: 'Makeup', path: 'Beauty & Health > Makeup' },
  { id: '4-3', name: 'Health Care', path: 'Beauty & Health > Health Care' },
  { id: '5', name: 'Toys & Hobbies', path: 'Toys & Hobbies' },
  { id: '5-1', name: 'Action Figures', path: 'Toys & Hobbies > Action Figures' },
  { id: '5-2', name: 'Model Kits', path: 'Toys & Hobbies > Model Kits' },
  { id: '5-3', name: 'Trading Cards', path: 'Toys & Hobbies > Trading Cards' },
  { id: '6', name: 'Sports & Outdoors', path: 'Sports & Outdoors' },
  { id: '6-1', name: 'Fitness', path: 'Sports & Outdoors > Fitness' },
  { id: '6-2', name: 'Camping', path: 'Sports & Outdoors > Camping' },
  { id: '7', name: 'Collectibles', path: 'Collectibles' },
  { id: '7-1', name: 'Vintage', path: 'Collectibles > Vintage' },
  { id: '7-2', name: 'Antiques', path: 'Collectibles > Antiques' },
  { id: '8', name: 'Musical Instruments', path: 'Musical Instruments' },
  { id: '9', name: 'Automotive', path: 'Automotive' },
  { id: '10', name: 'Pet Supplies', path: 'Pet Supplies' },
];

// カテゴリ別の必須属性定義
const CATEGORY_REQUIRED_ATTRIBUTES: Record<string, Record<string, any>> = {
  '1-4': { // Smart Watches
    brand: 'string',
    model: 'string',
    display_type: ['LCD', 'OLED', 'AMOLED', 'E-Ink'],
    water_resistance: 'string',
    battery_life: 'string',
  },
  '2-3': { // Watches
    brand: 'string',
    movement_type: ['Automatic', 'Quartz', 'Mechanical', 'Solar'],
    case_material: ['Stainless Steel', 'Titanium', 'Gold', 'Silver', 'Ceramic', 'Plastic'],
    band_material: ['Leather', 'Metal', 'Rubber', 'Fabric', 'Silicone'],
    water_resistance: 'string',
  },
  '2-4': { // Jewelry
    material: ['Gold', 'Silver', 'Platinum', 'Stainless Steel', 'Titanium'],
    gemstone: 'string',
    size: 'string',
  },
  '2-5': { // Bags
    brand: 'string',
    material: ['Leather', 'Canvas', 'Nylon', 'Polyester', 'Cotton'],
    size: ['Small', 'Medium', 'Large'],
    color: 'string',
  },
  '5-1': { // Action Figures
    brand: 'string',
    character: 'string',
    scale: 'string',
    material: 'string',
  },
};

// ========================================
// AIカテゴリ推定
// ========================================

const CATEGORY_PROMPT = `あなたはEコマースカテゴリ分類の専門家です。
以下の商品情報を分析し、最も適切なJoomカテゴリを選択してください。

【商品情報】
タイトル: {title}
説明文: {description}
カテゴリ: {category}
ブランド: {brand}

【利用可能なカテゴリ】
{categories}

【出力形式】JSON
{
  "categoryId": "カテゴリID",
  "categoryName": "カテゴリ名",
  "categoryPath": "カテゴリパス",
  "confidence": 0.0-1.0,
  "reasoning": "選択理由",
  "requiredAttributes": {
    "属性名": "推奨値または型"
  },
  "recommendedAttributes": {
    "属性名": "推奨値"
  }
}

【注意事項】
- 商品の特性を正確に把握してください
- 曖昧な場合は親カテゴリを選択
- 信頼度は適切に設定（0.9以上は明確な場合のみ）
- 必須属性は商品情報から推測して埋める`;

/**
 * AIを使用してカテゴリを推定
 */
export async function suggestCategoryWithAI(
  product: ProductInfo
): Promise<CategorySuggestion | null> {
  const title = product.titleEn || product.title;
  const description = product.descriptionEn || product.description;

  const categoriesText = JOOM_CATEGORIES
    .map(c => `${c.id}: ${c.path}`)
    .join('\n');

  const prompt = CATEGORY_PROMPT
    .replace('{title}', title)
    .replace('{description}', description.substring(0, 500))
    .replace('{category}', product.category || 'N/A')
    .replace('{brand}', product.brand || 'N/A')
    .replace('{categories}', categoriesText);

  try {
    log.debug({ type: 'ai_category_request', title });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an e-commerce category classification expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      log.warn({ type: 'ai_category_empty_response' });
      return null;
    }

    const result = JSON.parse(content);

    // カテゴリIDの検証
    const category = JOOM_CATEGORIES.find(c => c.id === result.categoryId);
    if (!category) {
      log.warn({ type: 'ai_category_invalid_id', categoryId: result.categoryId });
      return null;
    }

    // 必須属性をマージ
    const defaultRequired = CATEGORY_REQUIRED_ATTRIBUTES[result.categoryId] || {};
    const requiredAttributes = { ...defaultRequired, ...result.requiredAttributes };

    log.info({
      type: 'ai_category_success',
      categoryId: result.categoryId,
      categoryPath: category.path,
      confidence: result.confidence,
    });

    return {
      joomCategoryId: result.categoryId,
      joomCategoryName: category.name,
      joomCategoryPath: category.path,
      confidence: result.confidence,
      requiredAttributes,
      recommendedAttributes: result.recommendedAttributes || {},
      reasoning: result.reasoning,
    };
  } catch (error: any) {
    log.error({ type: 'ai_category_error', error: error.message });
    return null;
  }
}

// ========================================
// カテゴリマッピングサービス
// ========================================

/**
 * 既存のマッピングから検索
 */
export async function findExistingMapping(
  product: ProductInfo
): Promise<CategoryMappingResult['existingMapping'] | null> {
  const keywords = [
    product.title,
    product.category,
    product.brand,
  ].filter(Boolean).map(k => k!.toLowerCase());

  // キーワードマッチングでマッピングを検索
  const mappings = await prisma.joomCategoryMapping.findMany({
    where: {
      isActive: true,
      OR: [
        { sourceKeywords: { hasSome: keywords } },
        { sourceBrand: product.brand?.toLowerCase() },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { usageCount: 'desc' },
    ],
    take: 1,
  });

  if (mappings.length === 0) {
    return null;
  }

  const mapping = mappings[0];
  return {
    id: mapping.id,
    joomCategoryId: mapping.joomCategoryId,
    joomCategoryName: mapping.joomCategoryName,
    joomCategoryPath: mapping.joomCategoryPath,
    requiredAttributes: mapping.requiredAttributes as Record<string, any>,
  };
}

/**
 * 商品のカテゴリマッピングを取得（既存 or AI推定）
 */
export async function getCategoryMapping(
  product: ProductInfo,
  options: { useAI?: boolean; saveMapping?: boolean } = {}
): Promise<CategoryMappingResult> {
  const { useAI = true, saveMapping = true } = options;

  try {
    // 1. 既存マッピングを検索
    const existingMapping = await findExistingMapping(product);
    if (existingMapping) {
      // 使用統計を更新
      await prisma.joomCategoryMapping.update({
        where: { id: existingMapping.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      log.info({
        type: 'category_mapping_found',
        mappingId: existingMapping.id,
        categoryId: existingMapping.joomCategoryId,
      });

      return {
        success: true,
        existingMapping,
      };
    }

    // 2. AIで推定
    if (useAI) {
      const suggestion = await suggestCategoryWithAI(product);
      if (suggestion && suggestion.confidence >= 0.7) {
        // 高信頼度の場合、マッピングを保存
        if (saveMapping && suggestion.confidence >= 0.85) {
          const keywords = [
            product.title.toLowerCase(),
            product.category?.toLowerCase(),
          ].filter(Boolean) as string[];

          await prisma.joomCategoryMapping.create({
            data: {
              sourceKeywords: keywords,
              sourceBrand: product.brand?.toLowerCase(),
              joomCategoryId: suggestion.joomCategoryId,
              joomCategoryName: suggestion.joomCategoryName,
              joomCategoryPath: suggestion.joomCategoryPath,
              requiredAttributes: suggestion.requiredAttributes,
              recommendedAttributes: suggestion.recommendedAttributes,
              aiConfidence: suggestion.confidence,
              aiSuggested: true,
              usageCount: 1,
              lastUsedAt: new Date(),
            },
          });

          log.info({
            type: 'category_mapping_created',
            categoryId: suggestion.joomCategoryId,
            confidence: suggestion.confidence,
          });
        }

        return {
          success: true,
          suggestion,
        };
      }
    }

    // 3. マッピングが見つからない
    log.warn({
      type: 'category_mapping_not_found',
      title: product.title,
    });

    return {
      success: false,
      error: 'No suitable category mapping found',
    };
  } catch (error: any) {
    log.error({ type: 'category_mapping_error', error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 商品属性を自動補完
 */
export async function fillRequiredAttributes(
  product: ProductInfo,
  categoryMapping: CategoryMappingResult
): Promise<Record<string, any>> {
  const requiredAttrs = categoryMapping.existingMapping?.requiredAttributes
    || categoryMapping.suggestion?.requiredAttributes
    || {};

  const filledAttributes: Record<string, any> = {};
  const productAttrs = product.attributes || {};

  // 既存の属性をコピー
  for (const [key, value] of Object.entries(productAttrs)) {
    filledAttributes[key] = value;
  }

  // 必須属性のうち、未設定のものをAIで推定
  const missingAttrs = Object.keys(requiredAttrs).filter(
    key => !filledAttributes[key]
  );

  if (missingAttrs.length === 0) {
    return filledAttributes;
  }

  // AIで属性を推定
  try {
    const prompt = `以下の商品情報から、指定された属性を推定してください。

商品タイトル: ${product.titleEn || product.title}
商品説明: ${(product.descriptionEn || product.description).substring(0, 500)}
ブランド: ${product.brand || 'N/A'}

必要な属性:
${missingAttrs.map(attr => `- ${attr}: ${JSON.stringify(requiredAttrs[attr])}`).join('\n')}

JSON形式で出力してください:
{
  "attributes": {
    "属性名": "推定値"
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a product attribute extraction expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const result = JSON.parse(content);
      for (const [key, value] of Object.entries(result.attributes || {})) {
        if (!filledAttributes[key]) {
          filledAttributes[key] = value;
        }
      }
    }
  } catch (error: any) {
    log.warn({ type: 'attribute_fill_error', error: error.message });
  }

  return filledAttributes;
}

/**
 * カテゴリマッピングを手動で作成
 */
export async function createCategoryMapping(data: {
  sourceKeywords: string[];
  sourceBrand?: string;
  joomCategoryId: string;
  joomCategoryName: string;
  joomCategoryPath: string;
  requiredAttributes?: Record<string, any>;
  recommendedAttributes?: Record<string, any>;
  priority?: number;
}): Promise<{ id: string }> {
  const mapping = await prisma.joomCategoryMapping.create({
    data: {
      sourceKeywords: data.sourceKeywords.map(k => k.toLowerCase()),
      sourceBrand: data.sourceBrand?.toLowerCase(),
      joomCategoryId: data.joomCategoryId,
      joomCategoryName: data.joomCategoryName,
      joomCategoryPath: data.joomCategoryPath,
      requiredAttributes: data.requiredAttributes || {},
      recommendedAttributes: data.recommendedAttributes || {},
      aiSuggested: false,
      priority: data.priority || 0,
    },
  });

  log.info({
    type: 'category_mapping_manual_created',
    id: mapping.id,
    categoryId: data.joomCategoryId,
  });

  return { id: mapping.id };
}

/**
 * カテゴリマッピングを検証
 */
export async function verifyCategoryMapping(
  mappingId: string,
  verifiedBy: string
): Promise<void> {
  await prisma.joomCategoryMapping.update({
    where: { id: mappingId },
    data: {
      verifiedAt: new Date(),
      verifiedBy,
      aiConfidence: 1.0, // 検証済みは信頼度1.0
    },
  });

  log.info({
    type: 'category_mapping_verified',
    id: mappingId,
    verifiedBy,
  });
}

/**
 * 利用可能なJoomカテゴリ一覧を取得
 */
export function getAvailableCategories(): typeof JOOM_CATEGORIES {
  return JOOM_CATEGORIES;
}

/**
 * カテゴリの必須属性を取得
 */
export function getCategoryRequiredAttributes(
  categoryId: string
): Record<string, any> {
  return CATEGORY_REQUIRED_ATTRIBUTES[categoryId] || {};
}

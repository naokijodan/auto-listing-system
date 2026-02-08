/**
 * Phase 45: eBay カテゴリマッピングエンジン
 *
 * 日本語カテゴリ → eBayカテゴリIDへのマッピングを高精度で実行
 * - ルールベースの高速マッチング
 * - 曖昧マッチング（類似度計算）
 * - AIによるカテゴリ推定（OpenAI）
 * - DBマッピングとの連携
 */

import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const log = logger.child({ module: 'enrichment/ebay-category-mapper' });

// OpenAIクライアント（オプショナル）
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * eBayカテゴリ情報
 */
export interface EbayCategory {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  itemSpecifics?: Record<string, string[]>;
}

/**
 * カテゴリマッピング結果
 */
export interface CategoryMappingResult {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  confidence: number;  // 0-1
  source: 'exact' | 'alias' | 'fuzzy' | 'ai' | 'fallback';
  itemSpecifics?: Record<string, string[]>;
}

/**
 * 日本語カテゴリ → eBayカテゴリのマッピングテーブル
 * 頻出カテゴリを網羅
 */
export const EBAY_CATEGORY_MAP: Record<string, EbayCategory> = {
  // =============== 時計関連 ===============
  '腕時計': {
    categoryId: '31387',
    categoryName: 'Wristwatches',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Wristwatches',
    itemSpecifics: {
      'Type': ['Wristwatch'],
      'Department': ['Unisex Adults'],
    },
  },
  '時計': {
    categoryId: '31387',
    categoryName: 'Wristwatches',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Wristwatches',
  },
  'ウォッチ': {
    categoryId: '31387',
    categoryName: 'Wristwatches',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Wristwatches',
  },
  '時計パーツ': {
    categoryId: '260324',
    categoryName: 'Parts',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Parts, Tools & Guides > Parts',
  },
  '時計ベルト': {
    categoryId: '10327',
    categoryName: 'Watch Bands',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Parts, Tools & Guides > Watchbands',
  },
  '懐中時計': {
    categoryId: '3937',
    categoryName: 'Pocket Watches',
    categoryPath: 'Jewelry & Watches > Watches, Parts & Accessories > Pocket Watches',
  },

  // =============== アニメ・コレクティブル ===============
  'アニメグッズ': {
    categoryId: '14324',
    categoryName: 'Other Japanese Anime Items',
    categoryPath: 'Collectibles > Animation Art & Merchandise > Japanese, Anime',
    itemSpecifics: {
      'Country/Region of Manufacture': ['Japan'],
    },
  },
  'アニメフィギュア': {
    categoryId: '158666',
    categoryName: 'Anime & Manga Action Figures',
    categoryPath: 'Collectibles > Animation Art & Merchandise > Japanese, Anime > Action Figures',
    itemSpecifics: {
      'Type': ['Action Figure'],
      'Country/Region of Manufacture': ['Japan'],
    },
  },
  'フィギュア': {
    categoryId: '183454',
    categoryName: 'Action Figures',
    categoryPath: 'Toys & Hobbies > Action Figures & Accessories > Action Figures',
  },
  'プライズフィギュア': {
    categoryId: '158666',
    categoryName: 'Anime & Manga Action Figures',
    categoryPath: 'Collectibles > Animation Art & Merchandise > Japanese, Anime > Action Figures',
  },
  'ねんどろいど': {
    categoryId: '158666',
    categoryName: 'Anime & Manga Action Figures',
    categoryPath: 'Collectibles > Animation Art & Merchandise > Japanese, Anime > Action Figures',
    itemSpecifics: {
      'Brand': ['Good Smile Company'],
      'Type': ['Nendoroid'],
    },
  },

  // =============== ゲーム関連 ===============
  'ゲームソフト': {
    categoryId: '139973',
    categoryName: 'Video Games',
    categoryPath: 'Video Games & Consoles > Video Games',
  },
  'ゲーム': {
    categoryId: '139973',
    categoryName: 'Video Games',
    categoryPath: 'Video Games & Consoles > Video Games',
  },
  'トレーディングカード': {
    categoryId: '183454',
    categoryName: 'CCG Individual Cards',
    categoryPath: 'Toys & Hobbies > Collectible Card Games > CCG Individual Cards',
  },
  'ポケモンカード': {
    categoryId: '183454',
    categoryName: 'Pokemon TCG Cards',
    categoryPath: 'Toys & Hobbies > Collectible Card Games > CCG Individual Cards',
    itemSpecifics: {
      'Game': ['Pokémon TCG'],
      'Country/Region of Manufacture': ['Japan'],
    },
  },
  '遊戯王カード': {
    categoryId: '183454',
    categoryName: 'Yu-Gi-Oh! TCG Cards',
    categoryPath: 'Toys & Hobbies > Collectible Card Games > CCG Individual Cards',
    itemSpecifics: {
      'Game': ['Yu-Gi-Oh! TCG'],
      'Country/Region of Manufacture': ['Japan'],
    },
  },

  // =============== ファッション ===============
  'バッグ': {
    categoryId: '169291',
    categoryName: 'Bags & Handbags',
    categoryPath: 'Clothing, Shoes & Accessories > Women > Bags & Handbags',
  },
  '財布': {
    categoryId: '45258',
    categoryName: 'Wallets',
    categoryPath: 'Clothing, Shoes & Accessories > Unisex > Wallets',
  },
  '靴': {
    categoryId: '63889',
    categoryName: 'Athletic Shoes',
    categoryPath: 'Clothing, Shoes & Accessories > Men > Shoes',
  },
  '服': {
    categoryId: '11450',
    categoryName: 'Clothing, Shoes & Accessories',
    categoryPath: 'Clothing, Shoes & Accessories',
  },
  '衣類': {
    categoryId: '11450',
    categoryName: 'Clothing, Shoes & Accessories',
    categoryPath: 'Clothing, Shoes & Accessories',
  },

  // =============== ジュエリー ===============
  'ネックレス': {
    categoryId: '164329',
    categoryName: 'Necklaces & Pendants',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Necklaces & Pendants',
  },
  '指輪': {
    categoryId: '164332',
    categoryName: 'Rings',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Rings',
  },
  'リング': {
    categoryId: '164332',
    categoryName: 'Rings',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Rings',
  },
  'ブレスレット': {
    categoryId: '164315',
    categoryName: 'Bracelets',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Bracelets',
  },
  'ピアス': {
    categoryId: '164321',
    categoryName: 'Earrings',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Earrings',
  },
  'イヤリング': {
    categoryId: '164321',
    categoryName: 'Earrings',
    categoryPath: 'Jewelry & Watches > Fine Jewelry > Earrings',
  },

  // =============== 電子機器 ===============
  'カメラ': {
    categoryId: '31388',
    categoryName: 'Digital Cameras',
    categoryPath: 'Cameras & Photo > Digital Cameras',
  },
  'レンズ': {
    categoryId: '78997',
    categoryName: 'Camera Lenses',
    categoryPath: 'Cameras & Photo > Lenses & Filters > Lenses',
  },
  'オーディオ': {
    categoryId: '14969',
    categoryName: 'Portable Audio & Headphones',
    categoryPath: 'Consumer Electronics > Portable Audio & Headphones',
  },
  'イヤホン': {
    categoryId: '112529',
    categoryName: 'Headphones',
    categoryPath: 'Consumer Electronics > Portable Audio & Headphones > Headphones',
  },
  'ヘッドホン': {
    categoryId: '112529',
    categoryName: 'Headphones',
    categoryPath: 'Consumer Electronics > Portable Audio & Headphones > Headphones',
  },

  // =============== おもちゃ・ホビー ===============
  'おもちゃ': {
    categoryId: '220',
    categoryName: 'Toys & Hobbies',
    categoryPath: 'Toys & Hobbies',
  },
  'プラモデル': {
    categoryId: '1188',
    categoryName: 'Models & Kits',
    categoryPath: 'Toys & Hobbies > Models & Kits',
    itemSpecifics: {
      'Type': ['Model Kit'],
      'Country/Region of Manufacture': ['Japan'],
    },
  },
  'ガンプラ': {
    categoryId: '158627',
    categoryName: 'Gundam Models',
    categoryPath: 'Toys & Hobbies > Models & Kits > Gundam',
    itemSpecifics: {
      'Brand': ['Bandai'],
      'Type': ['Gundam'],
      'Country/Region of Manufacture': ['Japan'],
    },
  },
  'ミニカー': {
    categoryId: '222',
    categoryName: 'Diecast & Toy Vehicles',
    categoryPath: 'Toys & Hobbies > Diecast & Toy Vehicles',
  },

  // =============== 楽器 ===============
  '楽器': {
    categoryId: '619',
    categoryName: 'Musical Instruments & Gear',
    categoryPath: 'Musical Instruments & Gear',
  },
  'ギター': {
    categoryId: '33034',
    categoryName: 'Electric Guitars',
    categoryPath: 'Musical Instruments & Gear > Guitars & Basses > Electric Guitars',
  },
  'キーボード': {
    categoryId: '180061',
    categoryName: 'Synthesizers',
    categoryPath: 'Musical Instruments & Gear > Pianos, Keyboards & Organs > Synthesizers',
  },

  // =============== コレクティブル ===============
  'アンティーク': {
    categoryId: '20081',
    categoryName: 'Antiques',
    categoryPath: 'Antiques',
  },
  '骨董品': {
    categoryId: '20081',
    categoryName: 'Antiques',
    categoryPath: 'Antiques',
  },
  '美術品': {
    categoryId: '550',
    categoryName: 'Art',
    categoryPath: 'Art',
  },
  '切手': {
    categoryId: '260',
    categoryName: 'Stamps',
    categoryPath: 'Stamps',
  },
  'コイン': {
    categoryId: '11116',
    categoryName: 'Coins & Paper Money',
    categoryPath: 'Coins & Paper Money',
  },

  // =============== スポーツ ===============
  'スポーツ用品': {
    categoryId: '888',
    categoryName: 'Sporting Goods',
    categoryPath: 'Sporting Goods',
  },
  'ゴルフ': {
    categoryId: '1513',
    categoryName: 'Golf',
    categoryPath: 'Sporting Goods > Golf',
  },
  '釣り': {
    categoryId: '1492',
    categoryName: 'Fishing',
    categoryPath: 'Sporting Goods > Fishing',
  },

  // =============== ホーム・キッチン ===============
  'キッチン用品': {
    categoryId: '20625',
    categoryName: 'Kitchen, Dining & Bar',
    categoryPath: 'Home & Garden > Kitchen, Dining & Bar',
  },
  '家電': {
    categoryId: '20710',
    categoryName: 'Home Appliances',
    categoryPath: 'Home & Garden > Major Appliances',
  },
  'インテリア': {
    categoryId: '10033',
    categoryName: 'Home Decor',
    categoryPath: 'Home & Garden > Home Decor',
  },
};

/**
 * カテゴリエイリアス（類似キーワード）
 */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  '腕時計': ['ウォッチ', 'watch', 'WATCH', '時計', 'メンズ腕時計', 'レディース腕時計'],
  'アニメフィギュア': ['フィギア', 'figure', 'FIGURE', 'スケールフィギュア', '美少女フィギュア'],
  'ゲームソフト': ['ゲーム', 'ビデオゲーム', 'テレビゲーム', 'PS5', 'PS4', 'Switch', 'ニンテンドー'],
  'トレーディングカード': ['トレカ', 'TCG', 'カードゲーム', 'コレクションカード'],
  'バッグ': ['鞄', 'かばん', 'ハンドバッグ', 'ショルダーバッグ', 'トートバッグ', 'リュック', 'バックパック'],
  'カメラ': ['デジカメ', 'デジタルカメラ', 'ミラーレス', '一眼レフ', 'DSLR'],
};

/**
 * ブランド → カテゴリ推定マッピング
 */
export const BRAND_CATEGORY_HINTS: Record<string, string> = {
  'SEIKO': '腕時計',
  'CITIZEN': '腕時計',
  'CASIO': '腕時計',
  'ORIENT': '腕時計',
  'OMEGA': '腕時計',
  'ROLEX': '腕時計',
  'TAG HEUER': '腕時計',
  'TISSOT': '腕時計',
  'HAMILTON': '腕時計',
  'GUCCI': 'バッグ',
  'LOUIS VUITTON': 'バッグ',
  'CHANEL': 'バッグ',
  'HERMES': 'バッグ',
  'PRADA': 'バッグ',
  'COACH': 'バッグ',
  'BANDAI': 'フィギュア',
  'GOOD SMILE': 'アニメフィギュア',
  'KOTOBUKIYA': 'アニメフィギュア',
  'ALTER': 'アニメフィギュア',
  'SONY': '電子機器',
  'CANON': 'カメラ',
  'NIKON': 'カメラ',
  'FUJIFILM': 'カメラ',
  'OLYMPUS': 'カメラ',
  'NIKE': '靴',
  'ADIDAS': '靴',
  'POKEMON': 'ポケモンカード',
};

/**
 * 文字列の類似度を計算（Levenshtein距離ベース）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein距離の簡易計算
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const dp: number[][] = Array(s1.length + 1).fill(null).map(() =>
    Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - dp[s1.length][s2.length] / maxLen;
}

/**
 * テキストからカテゴリを推定（ルールベース）
 */
export function inferCategoryFromText(
  title: string,
  description: string = ''
): { category: string | null; confidence: number; hints: string[] } {
  const combinedText = `${title} ${description}`.toUpperCase();
  const hints: string[] = [];

  // 1. ブランドからカテゴリを推定
  for (const [brand, category] of Object.entries(BRAND_CATEGORY_HINTS)) {
    if (combinedText.includes(brand.toUpperCase())) {
      hints.push(`Brand detected: ${brand}`);
      return { category, confidence: 0.7, hints };
    }
  }

  // 2. 直接キーワードマッチ
  for (const category of Object.keys(EBAY_CATEGORY_MAP)) {
    if (combinedText.includes(category.toUpperCase()) ||
        title.includes(category)) {
      hints.push(`Direct match: ${category}`);
      return { category, confidence: 0.9, hints };
    }
  }

  // 3. エイリアスマッチ
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (combinedText.includes(alias.toUpperCase())) {
        hints.push(`Alias match: ${alias} -> ${category}`);
        return { category, confidence: 0.75, hints };
      }
    }
  }

  return { category: null, confidence: 0, hints };
}

/**
 * 曖昧マッチングでカテゴリを検索
 */
export function fuzzyMatchCategory(
  query: string,
  threshold: number = 0.6
): { category: string | null; similarity: number } {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  // カテゴリ名と比較
  for (const category of Object.keys(EBAY_CATEGORY_MAP)) {
    const similarity = calculateSimilarity(query, category);
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = category;
    }
  }

  // エイリアスとも比較
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const similarity = calculateSimilarity(query, alias);
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = category;
      }
    }
  }

  return { category: bestMatch, similarity: bestSimilarity };
}

/**
 * AIを使用してカテゴリを推定
 */
export async function inferCategoryWithAI(
  title: string,
  description: string = ''
): Promise<{ category: string | null; confidence: number; reasoning: string }> {
  if (!openai) {
    return { category: null, confidence: 0, reasoning: 'OpenAI not configured' };
  }

  const availableCategories = Object.keys(EBAY_CATEGORY_MAP).join(', ');

  const prompt = `あなたはeBay出品のカテゴリ分類エキスパートです。

以下の商品情報を分析し、最も適切なカテゴリを選択してください。

商品タイトル: ${title}
商品説明: ${description.substring(0, 500)}

利用可能なカテゴリ:
${availableCategories}

回答はJSON形式で返してください:
{
  "category": "選択したカテゴリ名（上記リストから選択。該当なしの場合はnull）",
  "confidence": 信頼度（0.0-1.0の数値）,
  "reasoning": "選択理由の簡潔な説明"
}`;

  try {
    log.info({ type: 'ai_category_inference_start', titlePreview: title.substring(0, 50) });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { category: null, confidence: 0, reasoning: 'Empty response from AI' };
    }

    const result = JSON.parse(content);

    log.info({
      type: 'ai_category_inference_complete',
      category: result.category,
      confidence: result.confidence,
    });

    return {
      category: result.category,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || '',
    };
  } catch (error: any) {
    log.error({ type: 'ai_category_inference_error', error: error.message });
    return { category: null, confidence: 0, reasoning: error.message };
  }
}

/**
 * カテゴリをマッピング（メイン関数）
 *
 * 優先順位:
 * 1. 完全一致
 * 2. エイリアスマッチ
 * 3. 曖昧マッチング
 * 4. AI推定
 * 5. フォールバック
 */
export async function mapToEbayCategory(
  sourceCategory: string | null | undefined,
  title: string,
  description: string = '',
  useAI: boolean = true
): Promise<CategoryMappingResult> {
  log.debug({
    type: 'category_mapping_start',
    sourceCategory,
    titlePreview: title.substring(0, 50),
  });

  // 1. 完全一致チェック
  if (sourceCategory && EBAY_CATEGORY_MAP[sourceCategory]) {
    const category = EBAY_CATEGORY_MAP[sourceCategory];
    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryPath: category.categoryPath,
      confidence: 1.0,
      source: 'exact',
      itemSpecifics: category.itemSpecifics,
    };
  }

  // 2. エイリアスマッチ
  if (sourceCategory) {
    for (const [mainCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (aliases.some(alias =>
        alias.toLowerCase() === sourceCategory.toLowerCase()
      )) {
        const category = EBAY_CATEGORY_MAP[mainCategory];
        if (category) {
          return {
            categoryId: category.categoryId,
            categoryName: category.categoryName,
            categoryPath: category.categoryPath,
            confidence: 0.9,
            source: 'alias',
            itemSpecifics: category.itemSpecifics,
          };
        }
      }
    }
  }

  // 3. テキストからカテゴリ推定（ルールベース）
  const textInference = inferCategoryFromText(title, description);
  if (textInference.category && EBAY_CATEGORY_MAP[textInference.category]) {
    const category = EBAY_CATEGORY_MAP[textInference.category];
    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryPath: category.categoryPath,
      confidence: textInference.confidence,
      source: 'fuzzy',
      itemSpecifics: category.itemSpecifics,
    };
  }

  // 4. 曖昧マッチング
  if (sourceCategory) {
    const fuzzyResult = fuzzyMatchCategory(sourceCategory);
    if (fuzzyResult.category && EBAY_CATEGORY_MAP[fuzzyResult.category]) {
      const category = EBAY_CATEGORY_MAP[fuzzyResult.category];
      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryPath: category.categoryPath,
        confidence: fuzzyResult.similarity * 0.8,
        source: 'fuzzy',
        itemSpecifics: category.itemSpecifics,
      };
    }
  }

  // 5. AI推定
  if (useAI && openai) {
    const aiResult = await inferCategoryWithAI(title, description);
    if (aiResult.category && EBAY_CATEGORY_MAP[aiResult.category]) {
      const category = EBAY_CATEGORY_MAP[aiResult.category];
      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryPath: category.categoryPath,
        confidence: aiResult.confidence,
        source: 'ai',
        itemSpecifics: category.itemSpecifics,
      };
    }
  }

  // 6. フォールバック: その他
  log.warn({
    type: 'category_mapping_fallback',
    sourceCategory,
    titlePreview: title.substring(0, 50),
  });

  return {
    categoryId: '99',
    categoryName: 'Everything Else',
    categoryPath: 'Everything Else',
    confidence: 0.1,
    source: 'fallback',
  };
}

/**
 * カテゴリ候補を取得（サジェスト用）
 */
export function suggestCategories(
  query: string,
  limit: number = 5
): Array<{ category: string; categoryId: string; similarity: number }> {
  const results: Array<{ category: string; categoryId: string; similarity: number }> = [];

  for (const [category, info] of Object.entries(EBAY_CATEGORY_MAP)) {
    const similarity = calculateSimilarity(query, category);
    if (similarity > 0.3) {
      results.push({
        category,
        categoryId: info.categoryId,
        similarity,
      });
    }
  }

  // エイリアスも検索
  for (const [mainCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const similarity = calculateSimilarity(query, alias);
      if (similarity > 0.4) {
        const info = EBAY_CATEGORY_MAP[mainCategory];
        if (info) {
          // 重複チェック
          if (!results.some(r => r.categoryId === info.categoryId)) {
            results.push({
              category: mainCategory,
              categoryId: info.categoryId,
              similarity: similarity * 0.9,
            });
          }
        }
      }
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * カテゴリ一覧を取得
 */
export function getAllCategories(): Array<{
  category: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
}> {
  return Object.entries(EBAY_CATEGORY_MAP).map(([category, info]) => ({
    category,
    categoryId: info.categoryId,
    categoryName: info.categoryName,
    categoryPath: info.categoryPath,
  }));
}

/**
 * カテゴリIDからItemSpecificsを取得
 */
export function getItemSpecificsForCategory(
  categoryId: string
): Record<string, string[]> | undefined {
  for (const info of Object.values(EBAY_CATEGORY_MAP)) {
    if (info.categoryId === categoryId) {
      return info.itemSpecifics;
    }
  }
  return undefined;
}

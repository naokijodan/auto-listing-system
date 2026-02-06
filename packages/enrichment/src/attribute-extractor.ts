/**
 * Phase 40-A: 属性抽出エンジン
 * 商品タイトル・説明文から構造化属性を抽出
 */
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'enrichment/attribute-extractor' });

/**
 * 抽出された属性
 */
export interface ExtractedAttributes {
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  material?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair';
  category?: string;
  weight?: number;
  year?: number;
  gender?: 'mens' | 'womens' | 'unisex';
  itemSpecifics: Record<string, string>;
  confidence: number;
}

/**
 * Joomカテゴリマッピング
 */
const JOOM_CATEGORY_MAP: Record<string, string> = {
  '時計': 'Watches',
  '腕時計': 'Watches',
  'ウォッチ': 'Watches',
  'アクセサリー': 'Jewelry & Accessories',
  'ジュエリー': 'Jewelry & Accessories',
  '指輪': 'Rings',
  'リング': 'Rings',
  'ネックレス': 'Necklaces',
  'ブレスレット': 'Bracelets',
  'イヤリング': 'Earrings',
  'ピアス': 'Earrings',
  'バッグ': 'Bags',
  '財布': 'Wallets',
  '衣類': 'Clothing',
  '服': 'Clothing',
  'フィギュア': 'Collectibles',
  'おもちゃ': 'Toys & Hobbies',
  '電子機器': 'Electronics',
  '家電': 'Electronics',
  'カメラ': 'Cameras',
  '本': 'Books',
  '漫画': 'Comics',
  'CD': 'Music',
  'DVD': 'Movies',
  'ゲーム': 'Video Games',
  '楽器': 'Musical Instruments',
  'スポーツ': 'Sports & Outdoors',
  '美容': 'Beauty & Health',
  '化粧品': 'Beauty & Health',
  'キッチン': 'Home & Kitchen',
  '家具': 'Home & Kitchen',
  'インテリア': 'Home & Kitchen',
  '工具': 'Tools & Hardware',
  '車': 'Automotive',
  'バイク': 'Automotive',
  'ペット': 'Pet Supplies',
};

/**
 * ブランド名パターン（よく見かけるブランド）
 */
const BRAND_PATTERNS: string[] = [
  // 時計ブランド
  'SEIKO', 'セイコー', 'CITIZEN', 'シチズン', 'CASIO', 'カシオ',
  'ORIENT', 'オリエント', 'OMEGA', 'オメガ', 'ROLEX', 'ロレックス',
  'TAG HEUER', 'タグホイヤー', 'TISSOT', 'ティソ', 'HAMILTON', 'ハミルトン',
  // ファッションブランド
  'GUCCI', 'グッチ', 'LOUIS VUITTON', 'ルイヴィトン', 'LV',
  'CHANEL', 'シャネル', 'HERMES', 'エルメス', 'PRADA', 'プラダ',
  'COACH', 'コーチ', 'MICHAEL KORS', 'マイケルコース',
  // 電機メーカー
  'SONY', 'ソニー', 'PANASONIC', 'パナソニック', 'SHARP', 'シャープ',
  'CANON', 'キャノン', 'NIKON', 'ニコン', 'OLYMPUS', 'オリンパス',
  // その他
  'NIKE', 'ナイキ', 'ADIDAS', 'アディダス', 'UNIQLO', 'ユニクロ',
];

/**
 * 色パターン
 */
const COLOR_PATTERNS: Record<string, string> = {
  '黒': 'Black',
  'ブラック': 'Black',
  '白': 'White',
  'ホワイト': 'White',
  '赤': 'Red',
  'レッド': 'Red',
  '青': 'Blue',
  'ブルー': 'Blue',
  '緑': 'Green',
  'グリーン': 'Green',
  '黄': 'Yellow',
  'イエロー': 'Yellow',
  'ピンク': 'Pink',
  'オレンジ': 'Orange',
  '紫': 'Purple',
  'パープル': 'Purple',
  'グレー': 'Gray',
  '灰色': 'Gray',
  '茶': 'Brown',
  'ブラウン': 'Brown',
  'ゴールド': 'Gold',
  '金': 'Gold',
  'シルバー': 'Silver',
  '銀': 'Silver',
  'ネイビー': 'Navy',
  '紺': 'Navy',
  'ベージュ': 'Beige',
};

/**
 * コンディションパターン
 */
const CONDITION_PATTERNS: Record<string, 'new' | 'like_new' | 'good' | 'fair'> = {
  '新品': 'new',
  '未使用': 'new',
  '未開封': 'new',
  'タグ付き': 'new',
  'ほぼ新品': 'like_new',
  '美品': 'like_new',
  '極美品': 'like_new',
  '良品': 'good',
  '目立った傷や汚れなし': 'good',
  'やや傷や汚れあり': 'fair',
  '傷あり': 'fair',
  '汚れあり': 'fair',
  'ジャンク': 'fair',
};

/**
 * 素材パターン（より長いパターンを先に定義）
 */
const MATERIAL_PATTERNS: Record<string, string> = {
  '本革': 'Genuine Leather',
  '合皮': 'Faux Leather',
  '革': 'Leather',
  'レザー': 'Leather',
  'ステンレス': 'Stainless Steel',
  'SS': 'Stainless Steel',
  'チタン': 'Titanium',
  'ゴールド': 'Gold',
  '金': 'Gold',
  'シルバー': 'Silver',
  '銀': 'Silver',
  'プラチナ': 'Platinum',
  '綿': 'Cotton',
  'コットン': 'Cotton',
  '麻': 'Linen',
  'リネン': 'Linen',
  'シルク': 'Silk',
  '絹': 'Silk',
  'ウール': 'Wool',
  '毛': 'Wool',
  'ポリエステル': 'Polyester',
  'ナイロン': 'Nylon',
  'セラミック': 'Ceramic',
  '木': 'Wood',
  '木製': 'Wood',
  'プラスチック': 'Plastic',
  '樹脂': 'Resin',
  'アクリル': 'Acrylic',
  'ガラス': 'Glass',
};

/**
 * テキストからブランドを抽出
 */
export function extractBrand(text: string): string | undefined {
  const upperText = text.toUpperCase();

  for (const brand of BRAND_PATTERNS) {
    if (text.includes(brand) || upperText.includes(brand.toUpperCase())) {
      // 英語名を優先して返す
      const index = BRAND_PATTERNS.indexOf(brand);
      if (index % 2 === 1) {
        // 日本語名の場合、前の英語名を返す
        return BRAND_PATTERNS[index - 1];
      }
      return brand;
    }
  }

  return undefined;
}

/**
 * テキストから色を抽出
 */
export function extractColor(text: string): string | undefined {
  for (const [pattern, englishColor] of Object.entries(COLOR_PATTERNS)) {
    if (text.includes(pattern)) {
      return englishColor;
    }
  }
  return undefined;
}

/**
 * テキストからコンディションを抽出
 */
export function extractCondition(text: string): 'new' | 'like_new' | 'good' | 'fair' | undefined {
  for (const [pattern, condition] of Object.entries(CONDITION_PATTERNS)) {
    if (text.includes(pattern)) {
      return condition;
    }
  }
  return undefined;
}

/**
 * テキストから素材を抽出
 */
export function extractMaterial(text: string): string | undefined {
  for (const [pattern, englishMaterial] of Object.entries(MATERIAL_PATTERNS)) {
    if (text.includes(pattern)) {
      return englishMaterial;
    }
  }
  return undefined;
}

/**
 * テキストからカテゴリを推定
 */
export function inferCategory(text: string): string | undefined {
  for (const [jpCategory, enCategory] of Object.entries(JOOM_CATEGORY_MAP)) {
    if (text.includes(jpCategory)) {
      return enCategory;
    }
  }
  return undefined;
}

/**
 * テキストからサイズを抽出
 */
export function extractSize(text: string): string | undefined {
  // ケースサイズ（時計）
  const caseSizeMatch = text.match(/(\d{2,3})\s*mm/i);
  if (caseSizeMatch) {
    return `${caseSizeMatch[1]}mm`;
  }

  // 服のサイズ
  const clothingSizeMatch = text.match(/サイズ[:：]?\s*(XS|S|M|L|XL|XXL|XXXL|[0-9]+)/i);
  if (clothingSizeMatch) {
    return clothingSizeMatch[1].toUpperCase();
  }

  // 寸法
  const dimensionMatch = text.match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?\s*(cm|mm)?/i);
  if (dimensionMatch) {
    const unit = dimensionMatch[4] || 'cm';
    if (dimensionMatch[3]) {
      return `${dimensionMatch[1]}x${dimensionMatch[2]}x${dimensionMatch[3]}${unit}`;
    }
    return `${dimensionMatch[1]}x${dimensionMatch[2]}${unit}`;
  }

  return undefined;
}

/**
 * 商品テキストから属性を一括抽出
 */
export function extractAttributes(
  title: string,
  description: string,
  sourceCategory?: string
): ExtractedAttributes {
  const combinedText = `${title} ${description}`;

  const brand = extractBrand(combinedText);
  const color = extractColor(combinedText);
  const condition = extractCondition(combinedText);
  const material = extractMaterial(combinedText);
  const size = extractSize(combinedText);
  const category = inferCategory(combinedText) || sourceCategory;

  // 抽出された属性の数から信頼度を計算
  const extractedCount = [brand, color, condition, material, size, category]
    .filter(Boolean).length;
  const confidence = Math.min(0.3 + (extractedCount * 0.1), 0.9);

  // Joom用のitemSpecificsを構築
  const itemSpecifics: Record<string, string> = {};
  if (brand) itemSpecifics['Brand'] = brand;
  if (color) itemSpecifics['Color'] = color;
  if (material) itemSpecifics['Material'] = material;
  if (size) itemSpecifics['Size'] = size;
  if (condition) {
    itemSpecifics['Condition'] = {
      'new': 'New',
      'like_new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
    }[condition];
  }

  log.debug({
    type: 'attributes_extracted',
    brand,
    color,
    condition,
    material,
    size,
    category,
    confidence,
  });

  return {
    brand,
    color,
    condition,
    material,
    size,
    category,
    itemSpecifics,
    confidence,
  };
}

/**
 * AI抽出結果とルールベース抽出結果をマージ
 */
export function mergeAttributes(
  aiAttributes: Partial<ExtractedAttributes>,
  ruleAttributes: ExtractedAttributes
): ExtractedAttributes {
  return {
    brand: aiAttributes.brand || ruleAttributes.brand,
    model: aiAttributes.model,
    color: aiAttributes.color || ruleAttributes.color,
    size: aiAttributes.size || ruleAttributes.size,
    material: aiAttributes.material || ruleAttributes.material,
    condition: (aiAttributes.condition as any) || ruleAttributes.condition,
    category: aiAttributes.category || ruleAttributes.category,
    weight: aiAttributes.weight,
    year: aiAttributes.year,
    gender: aiAttributes.gender,
    itemSpecifics: {
      ...ruleAttributes.itemSpecifics,
      ...aiAttributes.itemSpecifics,
    },
    // AI抽出があれば高い信頼度を使用
    confidence: aiAttributes.confidence || ruleAttributes.confidence,
  };
}

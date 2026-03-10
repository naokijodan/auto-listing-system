/**
 * Phase 40-A: 属性抽出エンジン
 * 商品タイトル・説明文から構造化属性を抽出
 */
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';

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
  // 追加フィールド（Joom強化）
  weightGrams?: number;        // 推定重量（グラム）
  movementType?: string;       // 時計: Automatic, Quartz, Mechanical, Solar
  caseMaterial?: string;       // 時計: Stainless Steel, Titanium, Gold etc
  bandMaterial?: string;       // 時計: Leather, Metal, Rubber etc
  waterResistance?: string;    // 時計: 30m, 50m, 100m, 200m etc
  displayType?: string;        // スマートウォッチ: LCD, OLED, AMOLED
  gender?: string;             // mens, womens, unisex
  countryOfOrigin?: string;    // 製造国: Japan, Switzerland etc
  year?: number;
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
 * ブランドキャッシュとフォールバック
 */
type BrandPattern = { pattern: string; canonical: string; isAscii: boolean };

let brandCache: { patterns: BrandPattern[]; expiresAt: number } | null = null;
let brandLoadInFlight: Promise<void> | null = null;

// 最低限のフォールバック（DBが使えない場合）
// 既存テスト互換のため一部は大文字表記を維持
const FALLBACK_BRANDS: BrandPattern[] = (() => {
  const entries: Array<[string, string]> = [
    // Watches (tests expect uppercase for these)
    ['SEIKO', 'SEIKO'], ['セイコー', 'SEIKO'],
    ['CITIZEN', 'CITIZEN'], ['シチズン', 'CITIZEN'],
    ['CASIO', 'CASIO'], ['カシオ', 'CASIO'],
    ['ORIENT', 'Orient'], ['オリエント', 'Orient'],
    ['OMEGA', 'Omega'], ['オメガ', 'Omega'],
    ['ROLEX', 'Rolex'], ['ロレックス', 'Rolex'],
    ['TAG HEUER', 'Tag Heuer'], ['タグホイヤー', 'Tag Heuer'],
    ['TISSOT', 'Tissot'], ['ティソ', 'Tissot'],
    ['HAMILTON', 'Hamilton'], ['ハミルトン', 'Hamilton'],
    ['LONGINES', 'Longines'], ['ロンジン', 'Longines'],
  ];
  const toPattern = (p: [string, string]): BrandPattern => ({
    pattern: p[0],
    canonical: p[1],
    isAscii: /[A-Za-z]/.test(p[0]),
  });
  return entries.map(toPattern).sort((a, b) => b.pattern.length - a.pattern.length);
})();

async function loadBrandsFromDB(): Promise<BrandPattern[]> {
  try {
    const brands = await prisma.brand.findMany({
      select: { name: true, jpNames: true },
    });
    const seen = new Set<string>();
    const patterns: BrandPattern[] = [];
    for (const b of brands) {
      if (!b || !b.name) continue;
      const canonical = b.name;
      const add = (pattern: string) => {
        const key = pattern.trim();
        if (!key) return;
        const norm = key.toLowerCase();
        if (seen.has(norm)) return;
        seen.add(norm);
        patterns.push({ pattern: key, canonical, isAscii: /[A-Za-z]/.test(key) });
      };
      add(b.name);
      for (const jp of b.jpNames ?? []) add(jp);
    }
    // 長い名称から先にマッチ
    patterns.sort((a, b) => b.pattern.length - a.pattern.length);
    return patterns;
  } catch (err) {
    log.warn({ err }, 'brand_load_failed_fallback');
    // フォールバック
    return FALLBACK_BRANDS;
  }
}

async function refreshBrandCache(): Promise<void> {
  const patterns = await loadBrandsFromDB();
  // 5分キャッシュ
  const expiresAt = Date.now() + 5 * 60 * 1000;
  brandCache = { patterns: [...patterns], expiresAt };
  log.debug({ count: patterns.length, expiresAt }, 'brand_cache_refreshed');
}

function ensureBrandPatterns(): BrandPattern[] {
  const now = Date.now();
  if (!brandCache || now >= brandCache.expiresAt) {
    if (!brandLoadInFlight) {
      brandLoadInFlight = refreshBrandCache()
        .catch((err) => log.error({ err }, 'brand_cache_refresh_error'))
        .finally(() => {
          brandLoadInFlight = null;
        });
    }
  }
  // キャッシュが有効ならそれを返す。未初期化時はフォールバック。
  return brandCache?.patterns ?? FALLBACK_BRANDS;
}

// 起動時ロード（バックグラウンド）
void (async () => {
  try {
    await refreshBrandCache();
  } catch (e) {
    // 初期ロード失敗時はログのみ。フォールバック使用。
    log.warn('initial_brand_cache_load_failed');
  }
})();

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
  const patterns = ensureBrandPatterns();
  if (!text) return undefined;
  const upperText = text.toUpperCase();

  for (const p of patterns) {
    if (p.isAscii) {
      // 英字は大文字・小文字を無視
      if (upperText.includes(p.pattern.toUpperCase())) return p.canonical;
    } else {
      // 日本語はそのまま一致
      if (text.includes(p.pattern)) return p.canonical;
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
 * テキスト・カテゴリから重量（グラム）を推定
 */
export function estimateWeight(text: string, category?: string): number | undefined {
  // 明示的な重量表記
  const weightMatch = text.match(/(?:重さ|重量|weight)[：:\s]*?(?:約)?\s*(\d+)\s*(g|kg|グラム)\b/i);
  if (weightMatch) {
    const value = parseInt(weightMatch[1], 10);
    const unit = weightMatch[2].toLowerCase();
    if (Number.isFinite(value)) {
      return unit === 'kg' ? value * 1000 : value;
    }
  }

  // カテゴリベースのデフォルト重量（グラム）
  const categoryWeights: Record<string, number> = {
    'Watches': 150,
    'Jewelry & Accessories': 50,
    'Bags': 500,
    'Clothing': 300,
    'Electronics': 400,
    'Collectibles': 200,
    'Toys & Hobbies': 300,
    'Musical Instruments': 2000,
    'Cameras': 500,
  };
  if (category && categoryWeights[category]) {
    return categoryWeights[category];
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
  const weightGrams = estimateWeight(combinedText, category);

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
    weightGrams,
    confidence,
  });

  return {
    brand,
    color,
    condition,
    material,
    size,
    category,
    weightGrams,
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
    weightGrams: aiAttributes.weightGrams || ruleAttributes.weightGrams,
    year: aiAttributes.year,
    movementType: aiAttributes.movementType || ruleAttributes.movementType,
    caseMaterial: aiAttributes.caseMaterial || ruleAttributes.caseMaterial,
    bandMaterial: aiAttributes.bandMaterial || ruleAttributes.bandMaterial,
    waterResistance: aiAttributes.waterResistance || ruleAttributes.waterResistance,
    displayType: aiAttributes.displayType || ruleAttributes.displayType,
    gender: aiAttributes.gender || ruleAttributes.gender,
    countryOfOrigin: aiAttributes.countryOfOrigin || ruleAttributes.countryOfOrigin,
    itemSpecifics: {
      ...ruleAttributes.itemSpecifics,
      ...aiAttributes.itemSpecifics,
    },
    // AI抽出があれば高い信頼度を使用
    confidence: aiAttributes.confidence || ruleAttributes.confidence,
  };
}

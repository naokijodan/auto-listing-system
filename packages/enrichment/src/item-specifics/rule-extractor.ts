import type { PrismaClient } from '@prisma/client';
import type { FieldDefinition } from './field-definitions';

export interface RuleExtractionResult {
  specifics: Record<string, string>;
  source: Record<string, 'rule'>;
}

interface BrandMatch {
  name: string;
  country: string;
  subBrand?: string;
}

// 素材パターン（ルールベース）
const METAL_PATTERNS: Array<{ keywords: string[]; value: string }> = [
  { keywords: ['K18', '18K', '18金', '750'], value: '18K Gold' },
  { keywords: ['K14', '14K', '14金', '585'], value: '14K Gold' },
  { keywords: ['K10', '10K', '10金'], value: '10K Gold' },
  { keywords: ['K24', '24K', '24金', '999'], value: '24K Gold' },
  { keywords: ['Pt950', 'プラチナ950', 'Pt 950'], value: 'Platinum' },
  { keywords: ['Pt900', 'プラチナ', 'Pt 900'], value: 'Platinum' },
  { keywords: ['SV925', 'シルバー925', 'Sterling', 'スターリング', 'Ag925', '925'], value: 'Sterling Silver' },
  { keywords: ['チタン', 'Titanium', 'TITANIUM', 'titanium'], value: 'Titanium' },
  { keywords: ['ステンレス', 'Stainless', 'STAINLESS', 'SS'], value: 'Stainless Steel' },
  { keywords: ['セラミック', 'Ceramic', 'CERAMIC'], value: 'Ceramic' },
  { keywords: ['レザー', 'Leather', 'LEATHER', '革', '本革'], value: 'Leather' },
  { keywords: ['ラバー', 'Rubber', 'RUBBER', 'シリコン', 'Silicon'], value: 'Rubber' },
  { keywords: ['ナイロン', 'Nylon', 'NYLON', 'NATO'], value: 'Nylon' },
];

const MOVEMENT_PATTERNS: Array<{ keywords: string[]; value: string }> = [
  { keywords: ['自動巻', 'Automatic', 'AUTOMATIC', 'オートマチック', 'Cal.'], value: 'Automatic' },
  { keywords: ['手巻', 'Manual', 'MANUAL', '手巻き'], value: 'Manual' },
  { keywords: ['クォーツ', 'Quartz', 'QUARTZ', 'クオーツ', 'QUARTS'], value: 'Quartz' },
  { keywords: ['ソーラー', 'Solar', 'SOLAR', 'エコドライブ', 'Eco-Drive'], value: 'Solar' },
  { keywords: ['キネティック', 'Kinetic', 'KINETIC'], value: 'Kinetic' },
];

const COLOR_PATTERNS: Array<{ keywords: string[]; value: string }> = [
  { keywords: ['ブラック', 'Black', 'BLACK', '黒'], value: 'Black' },
  { keywords: ['ホワイト', 'White', 'WHITE', '白'], value: 'White' },
  { keywords: ['シルバー', 'Silver', 'SILVER', '銀色'], value: 'Silver' },
  { keywords: ['ゴールド', 'Gold', 'GOLD', '金色'], value: 'Gold' },
  { keywords: ['ブルー', 'Blue', 'BLUE', '青'], value: 'Blue' },
  { keywords: ['レッド', 'Red', 'RED', '赤'], value: 'Red' },
  { keywords: ['グリーン', 'Green', 'GREEN', '緑'], value: 'Green' },
  { keywords: ['ブラウン', 'Brown', 'BROWN', '茶'], value: 'Brown' },
  { keywords: ['ピンク', 'Pink', 'PINK'], value: 'Pink' },
  { keywords: ['グレー', 'Gray', 'Grey', 'GRAY', 'GREY'], value: 'Gray' },
  { keywords: ['ネイビー', 'Navy', 'NAVY', '紺'], value: 'Navy' },
  { keywords: ['パープル', 'Purple', 'PURPLE', '紫'], value: 'Purple' },
  { keywords: ['イエロー', 'Yellow', 'YELLOW', '黄'], value: 'Yellow' },
  { keywords: ['オレンジ', 'Orange', 'ORANGE'], value: 'Orange' },
  { keywords: ['ベージュ', 'Beige', 'BEIGE'], value: 'Beige' },
];

const TAG_TYPE_MAP: Record<string, string> = {
  '時計': 'Wrist Watch', '腕時計': 'Wrist Watch', 'ウォッチ': 'Wrist Watch',
  '懐中時計': 'Pocket Watch',
  'リング': 'Ring', '指輪': 'Ring',
  'ネックレス': 'Necklace', 'ペンダント': 'Pendant',
  'ブレスレット': 'Bracelet', 'バングル': 'Bangle',
  'ピアス': 'Stud', 'イヤリング': 'Clip-On',
  'バッグ': 'Bag', 'ハンドバッグ': 'Handbag', 'ショルダーバッグ': 'Shoulder Bag',
  'トートバッグ': 'Tote', 'リュック': 'Backpack', 'ボストンバッグ': 'Duffel',
  'スニーカー': 'Sneakers', 'ブーツ': 'Boots', 'サンダル': 'Sandals',
  'パンプス': 'Pumps', 'ローファー': 'Loafers',
};

function matchFromPatterns(text: string, patterns: Array<{ keywords: string[]; value: string }>): string {
  for (const p of patterns) {
    for (const kw of p.keywords) {
      if (text.includes(kw)) return p.value;
    }
  }
  return '';
}

function matchAllColors(text: string): string {
  const found: string[] = [];
  for (const p of COLOR_PATTERNS) {
    for (const kw of p.keywords) {
      if (text.includes(kw) && !found.includes(p.value)) {
        found.push(p.value);
        break;
      }
    }
  }
  return found.join(', ');
}

async function matchBrand(title: string, category: string, prisma: PrismaClient): Promise<BrandMatch | null> {
  const brands = await prisma.brand.findMany();
  const t = title.toLowerCase();

  let bestMatch: BrandMatch | null = null;
  let bestLen = 0;

  for (const brand of brands) {
    // カテゴリ制限チェック
    if (brand.categories.length > 0 && !brand.categories.some(c => c.toLowerCase() === category.toLowerCase())) {
      continue;
    }
    if (brand.isMaterial) continue; // 素材ブランドはスキップ

    // 英語名チェック
    if (t.includes(brand.name.toLowerCase()) && brand.name.length > bestLen) {
      bestMatch = {
        name: brand.parentBrand || brand.name,
        country: brand.country || '',
        subBrand: brand.parentBrand ? brand.name : undefined,
      };
      bestLen = brand.name.length;
    }

    // 日本語名チェック
    for (const jp of brand.jpNames) {
      if (jp && t.includes(jp.toLowerCase()) && jp.length > bestLen) {
        bestMatch = {
          name: brand.parentBrand || brand.name,
          country: brand.country || '',
          subBrand: brand.parentBrand ? brand.name : undefined,
        };
        bestLen = jp.length;
      }
    }
  }

  return bestMatch;
}

function matchCaseSize(title: string): string {
  const t = title;
  // パターン1: 数字+mm（20-60mmの範囲）
  let m = t.match(/(\d{2,3})\s*(?:mm|MM|ＭＭ)/);
  if (m) {
    const size = parseInt(m[1], 10);
    if (size >= 20 && size <= 60) return `${size} mm`;
  }
  // パターン2: 数字+ミリ
  m = t.match(/(\d{2,3})\s*ミリ/);
  if (m) {
    const size = parseInt(m[1], 10);
    if (size >= 20 && size <= 60) return `${size} mm`;
  }
  return '';
}

export async function extractByRules(params: {
  title: string;
  description: string;
  tag: string;
  category: string;
  fields: FieldDefinition[];
  prisma: PrismaClient;
}): Promise<RuleExtractionResult> {
  const { title, description, tag, category, fields, prisma: db } = params;
  const specifics: Record<string, string> = {};
  const source: Record<string, 'rule'> = {};

  const brandInfo = await matchBrand(title, category, db);
  const combinedText = `${title} ${description}`;

  for (const field of fields) {
    let value = '';

    switch (field.fieldName) {
      case 'Brand':
        value = brandInfo?.name || '';
        break;
      case 'Country/Region of Manufacture':
      case 'Country of Origin':
        value = brandInfo?.country || '';
        break;
      case 'Model':
        value = brandInfo?.subBrand || '';
        break;
      case 'Type':
        value = TAG_TYPE_MAP[tag] || '';
        break;
      case 'Metal':
      case 'Case Material':
      case 'Band Material':
        value = matchFromPatterns(combinedText, METAL_PATTERNS);
        break;
      case 'Metal Purity': {
        const metal = matchFromPatterns(combinedText, METAL_PATTERNS);
        // Only set purity if it's a precious metal
        if (metal.includes('Gold') || metal === 'Platinum' || metal === 'Sterling Silver') {
          value = metal.replace('Gold', '').replace('Platinum', 'Pt950').replace('Sterling Silver', '925').trim() || metal;
        }
        break;
      }
      case 'Movement':
        value = matchFromPatterns(combinedText, MOVEMENT_PATTERNS);
        break;
      case 'Display': {
        const movement = matchFromPatterns(combinedText, MOVEMENT_PATTERNS);
        if (movement === 'Automatic' || movement === 'Manual') value = 'Analog';
        else if (combinedText.includes('デジタル') || combinedText.includes('Digital')) value = 'Digital';
        else if (movement) value = 'Analog';
        break;
      }
      case 'Color':
      case 'Exterior Color':
      case 'Dial Color':
        value = matchAllColors(combinedText);
        break;
      case 'Material':
      case 'Exterior Material':
        value = matchFromPatterns(combinedText, METAL_PATTERNS);
        break;
      case 'Department':
        if (combinedText.match(/メンズ|Men|MEN|男性/)) value = 'Men';
        else if (combinedText.match(/レディース|Women|WOMEN|女性/)) value = 'Women';
        else if (combinedText.match(/ユニセックス|Unisex|UNISEX/)) value = 'Unisex';
        break;
      case 'Case Size':
        value = matchCaseSize(combinedText);
        break;
      case 'Language':
        value = 'Japanese';
        break;
      case 'Graded':
        if (combinedText.match(/PSA|BGS|CGC|SGC|ARS|グレード/)) value = 'Yes';
        else value = 'No';
        break;
      case 'Game':
        if (combinedText.match(/ポケモン|Pokemon|POKEMON|ポケカ/)) value = 'Pokemon';
        else if (combinedText.match(/遊戯王|Yu-Gi-Oh|YUGIOH/)) value = 'Yu-Gi-Oh!';
        else if (combinedText.match(/MTG|Magic|マジック/)) value = 'Magic: The Gathering';
        else if (combinedText.match(/ワンピース|One Piece|ONE PIECE/)) value = 'One Piece';
        break;
      default:
        break;
    }

    if (value) {
      specifics[field.fieldName] = value;
      source[field.fieldName] = 'rule';
    }
  }

  return { specifics, source };
}


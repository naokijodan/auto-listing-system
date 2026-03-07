import type { PrismaClient } from '@prisma/client';

export interface FieldDefinition {
  fieldName: string;
  fieldType: 'required' | 'recommended';
  priority: number;
  notes: string;
}

// タグ→カテゴリのデフォルトマッピング（DBが空の場合のフォールバック）
const TAG_CATEGORY_MAP: Record<string, string> = {
  '時計': 'Watches', '腕時計': 'Watches', 'ウォッチ': 'Watches', '懐中時計': 'Watches',
  'リング': 'Rings', '指輪': 'Rings',
  'ネックレス': 'Necklaces & Pendants', 'ペンダント': 'Necklaces & Pendants',
  'ブレスレット': 'Bracelets', 'バングル': 'Bracelets',
  'ピアス': 'Earrings', 'イヤリング': 'Earrings',
  'バッグ': 'Handbags', 'ハンドバッグ': 'Handbags', 'ショルダーバッグ': 'Handbags',
  'トートバッグ': 'Handbags', 'リュック': 'Handbags',
  '衣類': 'Clothing', '服': 'Clothing', 'ジャケット': 'Clothing', 'コート': 'Clothing',
  'カメラ': 'Cameras', 'デジカメ': 'Cameras', '一眼レフ': 'Cameras',
  '電子機器': 'Electronics', '家電': 'Electronics', 'オーディオ': 'Electronics',
  'トレカ': 'Trading Cards', 'ポケカ': 'Trading Cards', '遊戯王': 'Trading Cards',
  '靴': 'Shoes', 'スニーカー': 'Shoes', 'ブーツ': 'Shoes',
  'フィギュア': 'Collectibles', 'コレクティブル': 'Collectibles',
  'ウォッチパーツ': 'Watch Parts', '時計パーツ': 'Watch Parts',
};

/**
 * 日本語タグからeBayカテゴリ名を解決
 * DBのItemSpecificsFieldのtagJpから検索 → フォールバックでハードコードマップ
 */
export async function resolveCategory(tag: string, prisma: PrismaClient): Promise<string> {
  if (!tag) return '';

  const trimmed = tag.trim();

  // 1. DBから検索（tagJpにカンマ区切りで含まれるか）
  const dbFields = await prisma.itemSpecificsField.findMany({
    select: { category: true, tagJp: true },
    distinct: ['category'],
  });

  for (const field of dbFields) {
    const tags = field.tagJp.split(/[，,、]/).map((t: string) => t.trim());
    // 完全一致
    if (tags.includes(trimmed)) return field.category;
  }

  for (const field of dbFields) {
    const tags = field.tagJp.split(/[，,、]/).map((t: string) => t.trim());
    // 部分一致（長いタグを優先するためソート）
    const sortedTags = [...tags].sort((a, b) => b.length - a.length);
    for (const t of sortedTags) {
      if (t && (trimmed.includes(t) || t.includes(trimmed))) return field.category;
    }
  }

  // 2. ハードコードフォールバック
  if (TAG_CATEGORY_MAP[trimmed]) return TAG_CATEGORY_MAP[trimmed];

  // 部分一致
  const keys = Object.keys(TAG_CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (trimmed.includes(key)) return TAG_CATEGORY_MAP[key];
  }

  return '';
}

/**
 * カテゴリに対応するフィールド定義をDBから取得
 */
export async function getFieldsForCategory(category: string, prisma: PrismaClient): Promise<FieldDefinition[]> {
  const dbFields = await prisma.itemSpecificsField.findMany({
    where: { category },
    orderBy: [
      { fieldType: 'asc' }, // required first
      { priority: 'asc' },
    ],
  });

  if (dbFields.length > 0) {
    return dbFields.map(f => ({
      fieldName: f.fieldName,
      fieldType: f.fieldType as 'required' | 'recommended',
      priority: f.priority,
      notes: f.notes || '',
    }));
  }

  // フォールバック: 基本3項目
  return [
    { fieldName: 'Brand', fieldType: 'required', priority: 1, notes: '' },
    { fieldName: 'Type', fieldType: 'required', priority: 2, notes: '' },
    { fieldName: 'Country/Region of Manufacture', fieldType: 'recommended', priority: 3, notes: '' },
  ];
}


/**
 * CSV処理ユーティリティ
 */

export interface CsvParseOptions {
  delimiter?: string;
  skipHeader?: boolean;
}

export interface CsvProductRow {
  title: string;
  titleEn?: string;
  price: number;
  brand?: string;
  category?: string;
  condition?: string;
  sourceUrl?: string;
  description?: string;
  images?: string[];
}

/**
 * CSV文字列をパースして行の配列を返す
 */
export function parseCsv(
  csvString: string,
  options: CsvParseOptions = {}
): Record<string, string>[] {
  const { delimiter = ',', skipHeader = false } = options;

  const lines = csvString
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行を取得
  const headers = parseRow(lines[0], delimiter);
  const startIndex = skipHeader ? 0 : 1;

  const rows: Record<string, string>[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseRow(lines[i], delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * カンマ区切りの行をパース（クォート対応）
 */
function parseRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * CSVの行データを商品データに変換
 */
export function rowToProduct(row: Record<string, string>): CsvProductRow {
  const price = parseInt(row.price || row['仕入価格'] || '0', 10);

  return {
    title: row.title || row['商品名'] || '',
    titleEn: row.titleEn || row.title_en || row['英語タイトル'] || undefined,
    price: isNaN(price) ? 0 : price,
    brand: row.brand || row['ブランド'] || undefined,
    category: row.category || row['カテゴリ'] || undefined,
    condition: row.condition || row['コンディション'] || undefined,
    sourceUrl: row.sourceUrl || row.source_url || row['仕入元URL'] || undefined,
    description: row.description || row['説明'] || undefined,
    images: row.images ? row.images.split(';') : undefined,
  };
}

/**
 * 商品データをCSV文字列に変換
 */
export function productsToCsv(
  products: Array<{
    id: string;
    title: string;
    titleEn?: string | null;
    price: number;
    brand?: string | null;
    category?: string | null;
    condition?: string | null;
    sourceUrl: string;
    description: string;
    images: string[];
    status: string;
    source?: { type: string; name: string } | null;
    listings?: Array<{ listingPrice: number; marketplace: string }>;
    createdAt: Date;
  }>
): string {
  const headers = [
    'id',
    'title',
    'titleEn',
    'price',
    'brand',
    'category',
    'condition',
    'sourceUrl',
    'sourceType',
    'status',
    'listingPrice',
    'marketplace',
    'images',
    'createdAt',
  ];

  const rows = products.map((product) => {
    const listing = product.listings?.[0];

    return [
      product.id,
      escapeField(product.title),
      escapeField(product.titleEn || ''),
      product.price.toString(),
      escapeField(product.brand || ''),
      escapeField(product.category || ''),
      escapeField(product.condition || ''),
      product.sourceUrl,
      product.source?.type || '',
      product.status,
      listing?.listingPrice?.toString() || '',
      listing?.marketplace || '',
      product.images.join(';'),
      product.createdAt.toISOString(),
    ];
  });

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * CSVフィールドをエスケープ
 */
function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

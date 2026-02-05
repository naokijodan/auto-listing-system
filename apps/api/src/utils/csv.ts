/**
 * CSV処理ユーティリティ
 */
import { z } from 'zod';

export interface CsvParseOptions {
  delimiter?: string;
  skipHeader?: boolean;
  maxRows?: number;
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

export interface CsvValidationResult {
  valid: boolean;
  data?: Record<string, string>[];
  errors: CsvValidationError[];
  warnings: string[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    skippedRows: number;
  };
}

export interface CsvValidationError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

// CSVフィールドバリデーションスキーマ
const productRowSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(500, 'タイトルは500文字以内です'),
  titleEn: z.string().max(500, '英語タイトルは500文字以内です').optional(),
  price: z.number().min(0, '価格は0以上です').max(100000000, '価格が大きすぎます'),
  brand: z.string().max(200, 'ブランドは200文字以内です').optional(),
  category: z.string().max(200, 'カテゴリは200文字以内です').optional(),
  condition: z.string().max(50, 'コンディションは50文字以内です').optional(),
  sourceUrl: z.string().url('URLの形式が正しくありません').optional().or(z.literal('')),
  description: z.string().max(10000, '説明は10000文字以内です').optional(),
  images: z.array(z.string().url('画像URLの形式が正しくありません')).optional(),
});

// 必須ヘッダーとエイリアスのマッピング
const HEADER_ALIASES: Record<string, string[]> = {
  title: ['title', '商品名', 'タイトル', 'product_name', 'name'],
  titleEn: ['titleEn', 'title_en', '英語タイトル', 'english_title'],
  price: ['price', '仕入価格', '価格', 'cost', 'cost_price'],
  brand: ['brand', 'ブランド', 'maker', 'メーカー'],
  category: ['category', 'カテゴリ', 'カテゴリー'],
  condition: ['condition', 'コンディション', '状態', 'state'],
  sourceUrl: ['sourceUrl', 'source_url', '仕入元URL', 'url', 'product_url'],
  description: ['description', '説明', '商品説明', 'desc'],
  images: ['images', '画像', '画像URL', 'image_urls'],
};

/**
 * CSVをパースしてバリデーション
 */
export function validateAndParseCsv(
  csvString: string,
  options: CsvParseOptions = {}
): CsvValidationResult {
  const { delimiter = ',', maxRows = 10000 } = options;
  const errors: CsvValidationError[] = [];
  const warnings: string[] = [];

  // 空チェック
  if (!csvString || csvString.trim() === '') {
    return {
      valid: false,
      errors: [{ row: 0, message: 'CSVデータが空です' }],
      warnings: [],
      stats: { totalRows: 0, validRows: 0, invalidRows: 0, skippedRows: 0 },
    };
  }

  const lines = csvString
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return {
      valid: false,
      errors: [{ row: 0, message: 'CSVデータが空です' }],
      warnings: [],
      stats: { totalRows: 0, validRows: 0, invalidRows: 0, skippedRows: 0 },
    };
  }

  if (lines.length === 1) {
    return {
      valid: false,
      errors: [{ row: 0, message: 'ヘッダー行のみでデータがありません' }],
      warnings: [],
      stats: { totalRows: 0, validRows: 0, invalidRows: 0, skippedRows: 0 },
    };
  }

  // ヘッダー行を取得してノーマライズ
  const rawHeaders = parseRow(lines[0], delimiter);
  const headerMapping = normalizeHeaders(rawHeaders);

  // 必須フィールドのチェック
  if (!headerMapping.title) {
    errors.push({
      row: 1,
      column: 'title',
      message: 'タイトル列が見つかりません（title, 商品名 など）',
    });
  }

  if (!headerMapping.price) {
    warnings.push('価格列が見つかりません。価格は0として処理されます');
  }

  // 行数チェック
  const dataLines = lines.slice(1);
  let skippedRows = 0;

  if (dataLines.length > maxRows) {
    warnings.push(`最大行数(${maxRows})を超えています。${maxRows}行目までを処理します`);
    skippedRows = dataLines.length - maxRows;
  }

  const linesToProcess = dataLines.slice(0, maxRows);
  const validRows: Record<string, string>[] = [];
  let invalidRowCount = 0;

  for (let i = 0; i < linesToProcess.length; i++) {
    const rowNumber = i + 2; // 1-indexed, ヘッダーが1行目
    const values = parseRow(linesToProcess[i], delimiter);

    // 空行スキップ
    if (values.every((v) => v.trim() === '')) {
      skippedRows++;
      continue;
    }

    // 列数チェック
    if (values.length !== rawHeaders.length) {
      warnings.push(`行${rowNumber}: 列数が一致しません（${values.length}/${rawHeaders.length}）`);
    }

    // 行データを構築
    const row: Record<string, string> = {};
    rawHeaders.forEach((header, index) => {
      const normalizedKey = findNormalizedKey(header);
      if (normalizedKey) {
        row[normalizedKey] = values[index]?.trim() || '';
      }
      // 元のヘッダー名でも保持
      row[header.trim()] = values[index]?.trim() || '';
    });

    // バリデーション
    const rowErrors = validateRow(row, rowNumber);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      invalidRowCount++;
    } else {
      validRows.push(row);
    }
  }

  return {
    valid: errors.length === 0,
    data: validRows,
    errors,
    warnings,
    stats: {
      totalRows: dataLines.length,
      validRows: validRows.length,
      invalidRows: invalidRowCount,
      skippedRows,
    },
  };
}

/**
 * ヘッダーをノーマライズ
 */
function normalizeHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toLowerCase();

    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((alias) => alias.toLowerCase() === normalizedHeader)) {
        mapping[key] = index;
        break;
      }
    }
  });

  return mapping;
}

/**
 * ヘッダー名からノーマライズされたキーを探す
 */
function findNormalizedKey(header: string): string | null {
  const normalizedHeader = header.trim().toLowerCase();

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === normalizedHeader)) {
      return key;
    }
  }

  return null;
}

/**
 * 行のバリデーション
 */
function validateRow(row: Record<string, string>, rowNumber: number): CsvValidationError[] {
  const errors: CsvValidationError[] = [];

  // タイトルチェック
  const title = row.title || row['商品名'] || row['タイトル'] || '';
  if (!title || title.trim() === '') {
    errors.push({
      row: rowNumber,
      column: 'title',
      message: 'タイトルは必須です',
      value: title,
    });
  } else if (title.length > 500) {
    errors.push({
      row: rowNumber,
      column: 'title',
      message: 'タイトルは500文字以内です',
      value: title.substring(0, 50) + '...',
    });
  }

  // 価格チェック
  const priceStr = row.price || row['仕入価格'] || row['価格'] || '0';
  const price = parseInt(priceStr.replace(/[,円¥$]/g, ''), 10);
  if (isNaN(price)) {
    errors.push({
      row: rowNumber,
      column: 'price',
      message: '価格は数値で入力してください',
      value: priceStr,
    });
  } else if (price < 0) {
    errors.push({
      row: rowNumber,
      column: 'price',
      message: '価格は0以上です',
      value: priceStr,
    });
  } else if (price > 100000000) {
    errors.push({
      row: rowNumber,
      column: 'price',
      message: '価格が大きすぎます（1億円以下）',
      value: priceStr,
    });
  }

  // URL形式チェック（ある場合）
  const sourceUrl = row.sourceUrl || row.source_url || row['仕入元URL'] || '';
  if (sourceUrl && sourceUrl.trim() !== '') {
    try {
      new URL(sourceUrl);
    } catch {
      errors.push({
        row: rowNumber,
        column: 'sourceUrl',
        message: 'URLの形式が正しくありません',
        value: sourceUrl,
      });
    }
  }

  return errors;
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
  const priceStr = row.price || row['仕入価格'] || row['価格'] || '0';
  const price = parseInt(priceStr.replace(/[,円¥$]/g, ''), 10);

  return {
    title: row.title || row['商品名'] || row['タイトル'] || '',
    titleEn: row.titleEn || row.title_en || row['英語タイトル'] || undefined,
    price: isNaN(price) ? 0 : price,
    brand: row.brand || row['ブランド'] || undefined,
    category: row.category || row['カテゴリ'] || undefined,
    condition: row.condition || row['コンディション'] || row['状態'] || undefined,
    sourceUrl: row.sourceUrl || row.source_url || row['仕入元URL'] || undefined,
    description: row.description || row['説明'] || row['商品説明'] || undefined,
    images: row.images ? row.images.split(';').filter((url) => url.trim() !== '') : undefined,
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

/**
 * CSVテンプレートを生成
 */
export function generateCsvTemplate(): string {
  const headers = [
    'title',
    'titleEn',
    'price',
    'brand',
    'category',
    'condition',
    'sourceUrl',
    'description',
    'images',
  ];

  const example = [
    'サンプル商品名',
    'Sample Product',
    '1000',
    'ブランド名',
    'カテゴリ',
    '新品',
    'https://example.com/product',
    '商品の説明文',
    'https://example.com/image1.jpg;https://example.com/image2.jpg',
  ];

  return [
    headers.join(','),
    example.map(escapeField).join(','),
  ].join('\n');
}

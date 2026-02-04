import { z } from 'zod';

/**
 * ソースタイプ（仕入元）
 */
export const SourceTypeSchema = z.enum([
  'mercari',
  'yahoo_auction',
  'yahoo_flea',
  'rakuma',
  'rakuten',
  'amazon',
  'takayama',
  'joshin',
  'other',
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

/**
 * 商品コンディション
 */
export const ConditionSchema = z.enum([
  'new',
  'like_new',
  'good',
  'fair',
  'poor',
]);
export type Condition = z.infer<typeof ConditionSchema>;

/**
 * 商品ステータス
 */
export const ProductStatusSchema = z.enum([
  'pending_scrape',
  'processing_image',
  'translating',
  'ready_to_review',
  'approved',
  'publishing',
  'active',
  'sold',
  'out_of_stock',
  'error',
  'deleted',
]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/**
 * 処理ステータス
 */
export const ProcessStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'error',
]);
export type ProcessStatus = z.infer<typeof ProcessStatusSchema>;

/**
 * AI抽出属性スキーマ
 * 抽出元と信頼度を含む
 */
export const ExtractedAttributesSchema = z.object({
  // 基本属性
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  year: z.number().optional(),
  gender: z.enum(['mens', 'womens', 'unisex']).optional(),

  // eBay Item Specifics用
  itemSpecifics: z.record(z.string()).optional(),

  // 抽出メタデータ
  confidence: z.number().min(0).max(1).optional(),
  extractedBy: z.enum(['ai', 'manual', 'source']).optional(),
  extractedAt: z.string().datetime().optional(),
});
export type ExtractedAttributes = z.infer<typeof ExtractedAttributesSchema>;

/**
 * 統一商品モデル（スクレイピング入力用）
 * 外部データを受け取る際に使用
 */
export const ScrapedProductSchema = z.object({
  // ソース情報
  sourceType: SourceTypeSchema,
  sourceUrl: z.string().url(),
  sourceItemId: z.string().min(1),

  // 基本情報（原文）
  title: z.string().min(1).max(500),
  description: z.string(),
  price: z.number().positive(),

  // 商品属性（スクレイピング時点）
  category: z.string().optional(),
  brand: z.string().optional(),
  condition: z.string().optional(), // 元サイトの状態表記（後でマッピング）
  weight: z.number().positive().optional(),
  isAvailable: z.boolean().optional(), // 在庫状況

  // 画像URL（元サイト）
  images: z.array(z.string().url()).min(1).max(20),

  // セラー情報（オプション）
  sellerId: z.string().optional(),
  sellerName: z.string().optional(),

  // スクレイピングメタデータ
  scrapedAt: z.string().datetime().optional(),
});
export type ScrapedProduct = z.infer<typeof ScrapedProductSchema>;

/**
 * 統一商品モデル（内部用完全版）
 */
export const UniversalProductSchema = ScrapedProductSchema.extend({
  // ID
  id: z.string().cuid().optional(),

  // 差分検知用ハッシュ
  sourceHash: z.string().optional(),

  // 翻訳済み情報
  titleEn: z.string().optional(),
  descriptionEn: z.string().optional(),

  // 処理済み画像（MinIO/S3）
  processedImages: z.array(z.string().url()).default([]),

  // AI抽出属性
  attributes: ExtractedAttributesSchema.default({}),

  // ステータス
  status: ProductStatusSchema.default('pending_scrape'),
  translationStatus: ProcessStatusSchema.default('pending'),
  imageStatus: ProcessStatusSchema.default('pending'),

  // エラー情報
  lastError: z.string().optional(),

  // タイムスタンプ
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type UniversalProduct = z.infer<typeof UniversalProductSchema>;

/**
 * 商品更新用スキーマ（部分更新）
 */
export const ProductUpdateSchema = UniversalProductSchema.partial().omit({
  id: true,
  sourceType: true,
  sourceUrl: true,
  sourceItemId: true,
  createdAt: true,
});
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

// ========================================
// バリデーション関数
// ========================================

/**
 * スクレイピング結果をパース
 */
export function parseScrapedProduct(data: unknown): ScrapedProduct {
  return ScrapedProductSchema.parse(data);
}

/**
 * スクレイピング結果を安全にパース
 */
export function safeParseScrapedProduct(data: unknown) {
  return ScrapedProductSchema.safeParse(data);
}

/**
 * 完全な商品データをパース
 */
export function parseProduct(data: unknown): UniversalProduct {
  return UniversalProductSchema.parse(data);
}

/**
 * 完全な商品データを安全にパース
 */
export function safeParseProduct(data: unknown) {
  return UniversalProductSchema.safeParse(data);
}

/**
 * ソースハッシュを生成
 * 主要フィールドのハッシュで変更検知に使用
 */
export function generateSourceHash(product: ScrapedProduct): string {
  const hashSource = JSON.stringify({
    title: product.title,
    price: product.price,
    description: product.description.slice(0, 500), // 先頭500文字
    images: product.images.slice(0, 3), // 最初の3画像
  });

  // 簡易ハッシュ（本番ではcryptoを使用）
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

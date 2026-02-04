import { z } from 'zod';
import { SourceTypeSchema } from './product';
import { MarketplaceSchema } from './listing';

/**
 * ジョブステータス
 */
export const JobStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'dead_letter',
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

/**
 * ジョブ結果ベース
 */
export const JobResultBaseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  duration: z.number().optional(), // ミリ秒
  timestamp: z.string().datetime(),
});

// ========================================
// スクレイピングジョブ
// ========================================

export const ScrapeJobPayloadSchema = z.object({
  url: z.string().url(),
  sourceType: SourceTypeSchema,
  priority: z.number().default(0),
  retryCount: z.number().default(0),

  // セラー一括取得の場合
  isBulkScrape: z.boolean().default(false),
  sellerId: z.string().optional(),
});
export type ScrapeJobPayload = z.infer<typeof ScrapeJobPayloadSchema>;

export const ScrapeJobResultSchema = JobResultBaseSchema.extend({
  productId: z.string().optional(),
  sourceHash: z.string().optional(),
  itemCount: z.number().optional(), // バルクの場合
});
export type ScrapeJobResult = z.infer<typeof ScrapeJobResultSchema>;

// ========================================
// 画像処理ジョブ
// ========================================

export const ImageJobPayloadSchema = z.object({
  productId: z.string(),
  imageUrls: z.array(z.string().url()),
  removeBackground: z.boolean().default(true),
  resize: z.boolean().default(true),
  maxWidth: z.number().default(1600),
  maxHeight: z.number().default(1600),
});
export type ImageJobPayload = z.infer<typeof ImageJobPayloadSchema>;

export const ImageJobResultSchema = JobResultBaseSchema.extend({
  processedUrls: z.array(z.string().url()).optional(),
  failedUrls: z.array(z.string().url()).optional(),
});
export type ImageJobResult = z.infer<typeof ImageJobResultSchema>;

// ========================================
// 翻訳ジョブ
// ========================================

export const TranslateJobPayloadSchema = z.object({
  productId: z.string(),
  title: z.string(),
  description: z.string(),
  extractAttributes: z.boolean().default(true),
  targetLanguage: z.string().default('en'),
});
export type TranslateJobPayload = z.infer<typeof TranslateJobPayloadSchema>;

export const TranslateJobResultSchema = JobResultBaseSchema.extend({
  titleEn: z.string().optional(),
  descriptionEn: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  tokensUsed: z.number().optional(),
});
export type TranslateJobResult = z.infer<typeof TranslateJobResultSchema>;

// ========================================
// 出品ジョブ
// ========================================

export const PublishJobPayloadSchema = z.object({
  productId: z.string(),
  listingId: z.string().optional(),
  marketplace: MarketplaceSchema,
  listingData: z.record(z.unknown()),
  isDryRun: z.boolean().default(false), // テスト用
});
export type PublishJobPayload = z.infer<typeof PublishJobPayloadSchema>;

export const PublishJobResultSchema = JobResultBaseSchema.extend({
  marketplaceListingId: z.string().optional(),
  listingUrl: z.string().url().optional(),
});
export type PublishJobResult = z.infer<typeof PublishJobResultSchema>;

// ========================================
// 在庫監視ジョブ
// ========================================

export const InventoryJobPayloadSchema = z.object({
  productId: z.string(),
  sourceUrl: z.string().url(),
  currentHash: z.string().optional(),
  checkPrice: z.boolean().default(true),
  checkStock: z.boolean().default(true),
});
export type InventoryJobPayload = z.infer<typeof InventoryJobPayloadSchema>;

export const InventoryJobResultSchema = JobResultBaseSchema.extend({
  isAvailable: z.boolean().optional(),
  currentPrice: z.number().optional(),
  priceChanged: z.boolean().optional(),
  hashChanged: z.boolean().optional(),
  newHash: z.string().optional(),
  action: z.enum(['none', 'update_price', 'mark_out_of_stock', 'delist']).optional(),
});
export type InventoryJobResult = z.infer<typeof InventoryJobResultSchema>;

// ========================================
// Dead Letter ジョブ
// ========================================

export const DeadLetterJobPayloadSchema = z.object({
  originalQueue: z.string(),
  originalJobId: z.string(),
  payload: z.record(z.unknown()),
  error: z.string(),
  failedAt: z.string().datetime(),
  attemptsMade: z.number(),
});
export type DeadLetterJobPayload = z.infer<typeof DeadLetterJobPayloadSchema>;

// ========================================
// ジョブログ
// ========================================

export const JobLogSchema = z.object({
  id: z.string().cuid().optional(),
  productId: z.string().optional(),
  jobId: z.string(),
  queueName: z.string(),
  jobType: z.string(),
  status: JobStatusSchema,
  payload: z.record(z.unknown()).default({}),
  result: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});
export type JobLog = z.infer<typeof JobLogSchema>;

// ========================================
// バリデーション関数
// ========================================

export function parseScrapeJobPayload(data: unknown): ScrapeJobPayload {
  return ScrapeJobPayloadSchema.parse(data);
}

export function parseImageJobPayload(data: unknown): ImageJobPayload {
  return ImageJobPayloadSchema.parse(data);
}

export function parseTranslateJobPayload(data: unknown): TranslateJobPayload {
  return TranslateJobPayloadSchema.parse(data);
}

export function parsePublishJobPayload(data: unknown): PublishJobPayload {
  return PublishJobPayloadSchema.parse(data);
}

export function parseInventoryJobPayload(data: unknown): InventoryJobPayload {
  return InventoryJobPayloadSchema.parse(data);
}

import { z } from 'zod';

/**
 * マーケットプレイス
 */
export const MarketplaceSchema = z.enum(['joom', 'ebay']);
export type Marketplace = z.infer<typeof MarketplaceSchema>;

/**
 * 出品ステータス
 */
export const ListingStatusSchema = z.enum([
  'draft',
  'pending_publish',
  'publishing',
  'active',
  'paused',
  'sold',
  'ended',
  'error',
]);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

/**
 * Joom出品固有データ
 */
export const JoomListingDataSchema = z.object({
  // Joomカテゴリ
  joomCategoryId: z.string(),
  joomCategoryPath: z.string().optional(),

  // 属性
  joomAttributes: z.record(z.string()).default({}),

  // 配送
  shippingDays: z.number().min(1).max(90).default(14),
  shippingFrom: z.string().default('JP'),

  // バリエーション（オプション）
  hasVariants: z.boolean().default(false),
  variants: z.array(z.object({
    sku: z.string(),
    price: z.number(),
    quantity: z.number(),
    attributes: z.record(z.string()),
  })).optional(),
});
export type JoomListingData = z.infer<typeof JoomListingDataSchema>;

/**
 * eBay出品固有データ
 */
export const EbayListingDataSchema = z.object({
  // eBayカテゴリ
  ebayCategoryId: z.string(),
  ebayCategoryPath: z.string().optional(),

  // Item Specifics
  itemSpecifics: z.record(z.string()).default({}),

  // ポリシーID
  shippingPolicyId: z.string().optional(),
  returnPolicyId: z.string().optional(),
  paymentPolicyId: z.string().optional(),

  // コンディション
  conditionId: z.number(),
  conditionDescription: z.string().optional(),

  // 出品形式
  listingFormat: z.enum(['FixedPrice', 'Auction']).default('FixedPrice'),
  duration: z.enum(['Days_3', 'Days_5', 'Days_7', 'Days_10', 'Days_30', 'GTC']).default('GTC'),

  // 価格（DDU/DDP）
  dduPrice: z.number().optional(),
  ddpPrice: z.number().optional(),
  dutyAmount: z.number().optional(),

  // 送料設定
  shippingCostUS: z.number().optional(),
  shippingCostEU: z.number().optional(),
  shippingCostAsia: z.number().optional(),

  // 在庫
  quantity: z.number().min(1).default(1),

  // その他
  bestOfferEnabled: z.boolean().default(false),
  autoAcceptPrice: z.number().optional(),
  minimumBestOfferPrice: z.number().optional(),
});
export type EbayListingData = z.infer<typeof EbayListingDataSchema>;

/**
 * 出品情報スキーマ（共通部分）
 */
export const ListingBaseSchema = z.object({
  id: z.string().cuid().optional(),
  productId: z.string(),
  marketplace: MarketplaceSchema,

  // マーケットプレイスでの出品ID
  marketplaceListingId: z.string().optional(),

  // 価格
  listingPrice: z.number().positive(),
  shippingCost: z.number().nonnegative().optional(),
  currency: z.string().default('USD'),

  // ステータス
  status: ListingStatusSchema.default('draft'),
  errorMessage: z.string().optional(),

  // タイムスタンプ
  listedAt: z.string().datetime().optional(),
  soldAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

/**
 * Joom出品スキーマ
 */
export const JoomListingSchema = ListingBaseSchema.extend({
  marketplace: z.literal('joom'),
  marketplaceData: JoomListingDataSchema,
});
export type JoomListing = z.infer<typeof JoomListingSchema>;

/**
 * eBay出品スキーマ
 */
export const EbayListingSchema = ListingBaseSchema.extend({
  marketplace: z.literal('ebay'),
  marketplaceData: EbayListingDataSchema,
});
export type EbayListing = z.infer<typeof EbayListingSchema>;

/**
 * 統合出品スキーマ（discriminated union）
 */
export const ListingSchema = z.discriminatedUnion('marketplace', [
  JoomListingSchema,
  EbayListingSchema,
]);
export type Listing = z.infer<typeof ListingSchema>;

/**
 * 出品作成リクエスト
 */
export const CreateListingRequestSchema = z.object({
  productId: z.string(),
  marketplace: MarketplaceSchema,
  listingPrice: z.number().positive(),
  shippingCost: z.number().nonnegative().optional(),
  marketplaceData: z.union([JoomListingDataSchema, EbayListingDataSchema]),
});
export type CreateListingRequest = z.infer<typeof CreateListingRequestSchema>;

// ========================================
// バリデーション関数
// ========================================

export function parseListing(data: unknown): Listing {
  return ListingSchema.parse(data);
}

export function safeParseListing(data: unknown) {
  return ListingSchema.safeParse(data);
}

export function parseJoomListing(data: unknown): JoomListing {
  return JoomListingSchema.parse(data);
}

export function parseEbayListing(data: unknown): EbayListing {
  return EbayListingSchema.parse(data);
}

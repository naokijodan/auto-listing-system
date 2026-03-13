import { z } from 'zod'

export type ViewMode = 'overview' | 'performance' | 'price'

export const viewModes: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'overview', label: '概要', icon: 'Eye' },
  { id: 'performance', label: 'パフォーマンス', icon: 'TrendingUp' },
  { id: 'price', label: '価格', icon: 'DollarSign' },
]

export const marketplaceLabels: Record<string, { label: string; color: string }> = {
  ebay: { label: 'eBay', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  joom: { label: 'Joom', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
}

export const statusLabels: Record<string, string> = {
  PUBLISHED: '出品中',
  DRAFT: '下書き',
  SOLD: '売却済',
  ENDED: '終了',
}

// Zodスキーマ
export const ListingProductSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  images: z.array(z.string()).optional(),
  processedImages: z.array(z.string()).optional(),
})

export const ListingSchema = z.object({
  id: z.string(),
  productId: z.string(),
  marketplace: z.string(),
  status: z.string(),
  listingPrice: z.number(),
  shippingCost: z.number().nullable().optional(),
  currency: z.string(),
  externalId: z.string().nullable().optional(),
  marketplaceListingId: z.string().nullable().optional(),
  listingUrl: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  marketplaceData: z.record(z.string(), z.unknown()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  product: ListingProductSchema.nullable().optional(),
})

export const ListingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ListingSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }).optional(),
})

export const BulkOperationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    success: z.number().optional(),
    failed: z.number().optional(),
    deleted: z.number().optional(),
    updated: z.number().optional(),
    queued: z.number().optional(),
  }).optional(),
  message: z.string().optional(),
})


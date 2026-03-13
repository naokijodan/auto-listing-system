import { z } from 'zod'

export type ViewMode = 'inventory' | 'price' | 'seo'

export const sourceSiteLabels: Record<string, string> = {
  mercari: 'メルカリ',
  yahoo: 'ヤフオク',
  rakuma: 'ラクマ',
  ebay: 'eBay',
}

// Zodスキーマ
export const ProductSchema = z.object({
  id: z.string(),
  sourceId: z.string().optional(),
  sourceItemId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number(),
  images: z.array(z.string()).optional(),
  processedImages: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  status: z.string(),
  sourceSite: z.string().nullable().optional(),
  source: z.object({
    type: z.string().optional(),
    name: z.string().optional(),
  }).nullable().optional(),
  listings: z.array(z.object({
    listingPrice: z.number().optional(),
  }).passthrough()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ProductsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ProductSchema),
  pagination: z
    .object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .optional(),
})

export const ImportResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  failed: z.number(),
  errors: z.array(z.string()),
})

export type ImportResult = z.infer<typeof ImportResultSchema>


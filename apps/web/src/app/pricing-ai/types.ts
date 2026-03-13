import { z } from 'zod'

export const PricingStrategySchema = z.enum([
  'COMPETITIVE',
  'PROFIT_MAXIMIZE',
  'MARKET_AVERAGE',
  'PENETRATION',
  'PREMIUM',
])

export const PriceRecommendationSchema = z.object({
  listingId: z.string(),
  productId: z.string(),
  currentPrice: z.number(),
  recommendedPrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  costPrice: z.number(),
  currentMargin: z.number(),
  recommendedMargin: z.number(),
  competitorAvgPrice: z.number().nullable(),
  competitorMinPrice: z.number().nullable(),
  reason: z.string(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  strategy: PricingStrategySchema,
})

export const PricingStatsSchema = z.object({
  totalListings: z.number(),
  adjustmentNeeded: z.number(),
  avgMargin: z.number(),
  lowMarginCount: z.number(),
  highMarginCount: z.number(),
  byStrategy: z.record(z.string(), z.number()),
})

export const PricingStatsResponseSchema = z.object({
  success: z.boolean(),
  data: PricingStatsSchema,
})

export const PriceRecommendationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PriceRecommendationSchema),
  summary: z
    .object({
      needsAdjustment: z.number(),
      avgCurrentMargin: z.number(),
      avgRecommendedMargin: z.number(),
    })
    .optional(),
})

export const BulkApplyResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    success: z.number(),
    failed: z.number(),
  }),
})


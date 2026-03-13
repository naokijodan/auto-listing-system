import { describe, it, expect } from 'vitest'
import {
  PricingStatsResponseSchema,
  PriceRecommendationsResponseSchema,
  PriceRecommendationSchema,
  BulkApplyResponseSchema,
  PricingStrategySchema,
} from '../types'

describe('PricingStrategySchema', () => {
  it('有効な戦略をパースできる', () => {
    expect(PricingStrategySchema.safeParse('COMPETITIVE').success).toBe(true)
    expect(PricingStrategySchema.safeParse('PROFIT_MAXIMIZE').success).toBe(true)
    expect(PricingStrategySchema.safeParse('MARKET_AVERAGE').success).toBe(true)
    expect(PricingStrategySchema.safeParse('PENETRATION').success).toBe(true)
    expect(PricingStrategySchema.safeParse('PREMIUM').success).toBe(true)
  })

  it('無効な戦略を拒否する', () => {
    expect(PricingStrategySchema.safeParse('INVALID').success).toBe(false)
    expect(PricingStrategySchema.safeParse('').success).toBe(false)
  })
})

describe('PriceRecommendationSchema', () => {
  const validRec = {
    listingId: 'lst-001',
    productId: 'prd-001',
    currentPrice: 100,
    recommendedPrice: 120,
    minPrice: 80,
    maxPrice: 200,
    costPrice: 60,
    currentMargin: 40,
    recommendedMargin: 50,
    competitorAvgPrice: 110,
    competitorMinPrice: 95,
    reason: '競合価格より低いため値上げ推奨',
    confidence: 'HIGH',
    strategy: 'PROFIT_MAXIMIZE',
  }

  it('正常なレコメンデーションをパースできる', () => {
    expect(PriceRecommendationSchema.safeParse(validRec).success).toBe(true)
  })

  it('competitorAvgPriceがnullでもパースできる', () => {
    const rec = { ...validRec, competitorAvgPrice: null, competitorMinPrice: null }
    expect(PriceRecommendationSchema.safeParse(rec).success).toBe(true)
  })

  it('必須フィールドが欠けている場合を拒否する', () => {
    const { listingId, ...missing } = validRec
    expect(PriceRecommendationSchema.safeParse(missing).success).toBe(false)
  })

  it('価格が文字列の場合を拒否する', () => {
    const invalid = { ...validRec, currentPrice: '100' }
    // @ts-expect-error intentional wrong type for test
    expect(PriceRecommendationSchema.safeParse(invalid).success).toBe(false)
  })

  it('confidenceが不正な値の場合を拒否する', () => {
    const invalid = { ...validRec, confidence: 'VERY_HIGH' }
    // @ts-expect-error intentional wrong enum for test
    expect(PriceRecommendationSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('PricingStatsResponseSchema', () => {
  it('正常な統計レスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: {
        totalListings: 100,
        adjustmentNeeded: 25,
        avgMargin: 32.5,
        lowMarginCount: 10,
        highMarginCount: 30,
        byStrategy: { PROFIT_MAXIMIZE: 50, COMPETITIVE: 30, PREMIUM: 20 },
      },
    }
    expect(PricingStatsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('dataが欠けている場合を拒否する', () => {
    expect(PricingStatsResponseSchema.safeParse({ success: true }).success).toBe(false)
  })
})

describe('PriceRecommendationsResponseSchema', () => {
  it('正常なレスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: [],
      summary: { needsAdjustment: 0, avgCurrentMargin: 25, avgRecommendedMargin: 30 },
    }
    expect(PriceRecommendationsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('summary省略時もパースできる', () => {
    const valid = { success: true, data: [] }
    expect(PriceRecommendationsResponseSchema.safeParse(valid).success).toBe(true)
  })
})

describe('BulkApplyResponseSchema', () => {
  it('正常なレスポンスをパースできる', () => {
    const valid = { success: true, data: { success: 10, failed: 2 } }
    expect(BulkApplyResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('dataが欠けている場合を拒否する', () => {
    expect(BulkApplyResponseSchema.safeParse({ success: true }).success).toBe(false)
  })
})

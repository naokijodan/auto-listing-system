import { describe, it, expect } from 'vitest'
import {
  ListingsResponseSchema,
  ListingSchema,
  ListingProductSchema,
  BulkOperationResponseSchema,
  marketplaceLabels,
  statusLabels,
} from '../types'

describe('ListingsResponseSchema', () => {
  it('valid listings response parses', () => {
    const valid = {
      success: true,
      data: [
        {
          id: 'l-1',
          productId: 'p-1',
          marketplace: 'ebay',
          status: 'PUBLISHED',
          listingPrice: 12.34,
          currency: 'USD',
          createdAt: '2026-03-12T00:00:00Z',
          updatedAt: '2026-03-12T00:00:00Z',
          product: {
            id: 'p-1',
            title: '商品',
            titleEn: 'Product',
            price: 1200,
            images: ['https://example.com/img.jpg'],
          },
        },
      ],
      pagination: { total: 1, limit: 50, offset: 0 },
    }
    const result = ListingsResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects invalid response (data not array)', () => {
    const invalid = { success: true, data: {} }
    const result = ListingsResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('ListingSchema', () => {
  it('accepts minimal required fields', () => {
    const listing = {
      id: 'l-1',
      productId: 'p-1',
      marketplace: 'joom',
      status: 'DRAFT',
      listingPrice: 9.99,
      currency: 'USD',
      createdAt: '2026-03-12T00:00:00Z',
      updatedAt: '2026-03-12T00:00:00Z',
    }
    expect(ListingSchema.safeParse(listing).success).toBe(true)
  })

  it('rejects wrong type for listingPrice', () => {
    const invalid = {
      id: 'l-1',
      productId: 'p-1',
      marketplace: 'ebay',
      status: 'PUBLISHED',
      listingPrice: '12.3',
      currency: 'USD',
      createdAt: '2026-03-12T00:00:00Z',
      updatedAt: '2026-03-12T00:00:00Z',
    } as any
    expect(ListingSchema.safeParse(invalid).success).toBe(false)
  })

  it('accepts nested product schema', () => {
    const product = { id: 'p-1', title: '商品', titleEn: null, price: 1000, images: [] }
    expect(ListingProductSchema.safeParse(product).success).toBe(true)
  })
})

describe('BulkOperationResponseSchema', () => {
  it('parses result with counters', () => {
    const valid = { success: true, data: { deleted: 3, updated: 1, queued: 0 }, message: 'ok' }
    expect(BulkOperationResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('parses success without data/message', () => {
    const valid = { success: true }
    expect(BulkOperationResponseSchema.safeParse(valid).success).toBe(true)
  })
})

describe('labels', () => {
  it('marketplaceLabels contains ebay and joom', () => {
    expect(marketplaceLabels.ebay.label).toBe('eBay')
    expect(marketplaceLabels.joom.label).toBe('Joom')
  })

  it('statusLabels map has 4 statuses', () => {
    expect(statusLabels.PUBLISHED).toBe('出品中')
    expect(statusLabels.DRAFT).toBe('下書き')
    expect(statusLabels.SOLD).toBe('売却済')
    expect(statusLabels.ENDED).toBe('終了')
  })
})


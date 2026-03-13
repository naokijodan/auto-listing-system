import { describe, it, expect } from 'vitest'
import { MarketplaceOverviewSchema, platformMeta, defaultPlatformStatus } from '../types'
import type { PlatformKey } from '../types'

describe('MarketplaceOverviewSchema', () => {
  it('正常なoverviewレスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: {
        ebay: { connected: true, tokenExpired: false, environment: 'production', listings: { ACTIVE: 5, SOLD: 2 } },
        joom: { connected: true, listings: { ACTIVE: 3 } },
      },
    }
    const result = MarketplaceOverviewSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('不正なレスポンスを拒否する（successが文字列）', () => {
    const invalid = { success: 'yes', data: null }
    const result = MarketplaceOverviewSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('ebay.connectedが欠けている場合を拒否する', () => {
    const missing = {
      success: true,
      data: {
        ebay: { tokenExpired: null },
        joom: { connected: false },
      },
    }
    const result = MarketplaceOverviewSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it('空のlistingsでもパースできる', () => {
    const empty = {
      success: true,
      data: {
        ebay: { connected: false, listings: {} },
        joom: { connected: false, listings: {} },
      },
    }
    const result = MarketplaceOverviewSchema.safeParse(empty)
    expect(result.success).toBe(true)
  })

  it('listings省略時もパースできる', () => {
    const noListings = {
      success: true,
      data: {
        ebay: { connected: false },
        joom: { connected: false },
      },
    }
    const result = MarketplaceOverviewSchema.safeParse(noListings)
    expect(result.success).toBe(true)
  })

  it('dataが欠けている場合を拒否する', () => {
    const noData = { success: true }
    const result = MarketplaceOverviewSchema.safeParse(noData)
    expect(result.success).toBe(false)
  })
})

describe('platformMeta', () => {
  it('6つのプラットフォームが定義されている', () => {
    expect(Object.keys(platformMeta)).toHaveLength(6)
  })

  it('各プラットフォームにlabelとcolorがある', () => {
    for (const [, meta] of Object.entries(platformMeta)) {
      expect(meta.label).toBeTruthy()
      expect(meta.color).toBeTruthy()
    }
  })

  const expectedPlatforms: PlatformKey[] = ['ebay', 'joom', 'etsy', 'shopify', 'instagram_shop', 'tiktok_shop']
  it.each(expectedPlatforms)('%s が定義されている', (platform) => {
    expect(platformMeta[platform]).toBeDefined()
  })
})

describe('defaultPlatformStatus', () => {
  it('未接続状態である', () => {
    expect(defaultPlatformStatus.connected).toBe(false)
  })

  it('デフォルト同期設定が正しい', () => {
    expect(defaultPlatformStatus.settings).toEqual({
      inventorySync: true,
      orderSync: true,
      priceSync: false,
      interval: '30m',
    })
  })

  it('statsが初期値である', () => {
    expect(defaultPlatformStatus.stats).toEqual({
      listings: 0,
      orders: 0,
      sales: 0,
    })
  })
})


import { z } from 'zod'

export type PlatformKey = 'ebay' | 'joom' | 'etsy' | 'shopify' | 'instagram_shop' | 'tiktok_shop'

export type PlatformStatus = {
  connected: boolean
  tokenExpiry?: string | null
  lastSyncedAt?: string | null
  stats?: { listings: number; orders: number; sales: number }
  settings?: {
    inventorySync: boolean
    orderSync: boolean
    priceSync: boolean
    interval: '15m' | '30m' | '1h'
  }
}

export type MarketplaceStatus = {
  platforms: Record<PlatformKey, PlatformStatus>
}

export type Order = {
  id: string
  platform: string
  amount: number
  status: string
  createdAt: string
}

export const platformMeta: Record<PlatformKey, { label: string; color: string }> = {
  ebay: { label: 'eBay', color: 'blue-600' },
  joom: { label: 'Joom', color: 'green-600' },
  etsy: { label: 'Etsy', color: 'orange-600' },
  shopify: { label: 'Shopify', color: 'emerald-600' },
  instagram_shop: { label: 'Instagram Shop', color: 'pink-600' },
  tiktok_shop: { label: 'TikTok Shop', color: 'cyan-600' },
}

export const MarketplaceOverviewSchema = z.object({
  success: z.boolean(),
  data: z.object({
    ebay: z.object({
      connected: z.boolean(),
      tokenExpired: z.boolean().nullable().optional(),
      environment: z.string().optional(),
      listings: z.record(z.string(), z.number()).optional(),
    }),
    joom: z.object({
      connected: z.boolean(),
      listings: z.record(z.string(), z.number()).optional(),
    }),
  }),
})

export type MarketplaceOverviewResponse = z.infer<typeof MarketplaceOverviewSchema>

// デフォルトのPlatformStatus（未接続状態）
export const defaultPlatformStatus: PlatformStatus = {
  connected: false,
  tokenExpiry: null,
  lastSyncedAt: null,
  stats: { listings: 0, orders: 0, sales: 0 },
  settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
}


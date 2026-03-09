import { prisma } from '@rakuda/database'
import { logger } from '@rakuda/logger'
import {
  JoomProductsClient,
  JoomOrdersClient,
  JoomShippingDestinationsClient,
  JoomWarehousesClient,
} from './index'

const log = logger.child({ module: 'joom-compat' })

// v3 client singletons
export const joomProducts = new JoomProductsClient()
export const joomOrders = new JoomOrdersClient()
export const joomShippingDestinations = new JoomShippingDestinationsClient()
export const joomWarehouses = new JoomWarehousesClient()

// Backward-compatible facade for selected operations still used in legacy paths
export const joomApi = {
  async disableProduct(productId: string): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      await joomProducts.updateProduct({ id: productId }, { enabled: false })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: { code: 'JOOM_API_ERROR', message: err?.message || 'Unknown error' } }
    }
  },

  async updatePrice(productId: string, sku: string, price: number): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      await joomProducts.updateProduct({ id: productId }, { variants: [{ sku, price: String(price) }] })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: { code: 'JOOM_API_ERROR', message: err?.message || 'Unknown error' } }
    }
  },

  async shipOrder(orderId: string, trackingInfo: { trackingNumber: string; carrier: string; shippingProvider?: string }): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      await joomOrders.fulfillOrder(
        { id: orderId },
        {
          trackingNumber: trackingInfo.trackingNumber,
          provider: trackingInfo.carrier,
        }
      )
      return { success: true }
    } catch (err: any) {
      return { success: false, error: { code: 'JOOM_API_ERROR', message: err?.message || 'Unknown error' } }
    }
  },

  async getOrders(params?: { since?: string; limit?: number }): Promise<{ success: boolean; data?: { orders: any[]; total: number }; error?: { code: string; message: string } }> {
    try {
      const since = params?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const limit = params?.limit
      const resp = await joomOrders.retrieveOrders({ updatedFrom: since, limit })
      const items = resp?.data?.items || []
      return { success: true, data: { orders: items as any[], total: items.length } }
    } catch (err: any) {
      return { success: false, error: { code: 'JOOM_API_ERROR', message: err?.message || 'Unknown error' } }
    }
  },
}

// Re-export standalone helpers from old joom-api.ts (using prisma directly)
const JOOM_TOKEN_URL = 'https://api-merchant.joom.com/api/v2/oauth/access_token'

export async function refreshJoomToken(): Promise<{
  success: boolean
  expiresAt?: Date
  error?: string
}> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM', isActive: true },
  })

  if (!credential) {
    return { success: false, error: 'Joom credentials not configured' }
  }

  const creds = credential.credentials as {
    clientId?: string
    clientSecret?: string
    accessToken?: string
    refreshToken?: string
  }

  if (!creds.refreshToken) {
    return { success: false, error: 'Joom refresh token not available. Re-authorization required.' }
  }
  if (!creds.clientId || !creds.clientSecret) {
    return { success: false, error: 'Joom OAuth configuration incomplete (missing clientId or clientSecret)' }
  }

  try {
    const response = await fetch(JOOM_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId!,
        client_secret: creds.clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken!,
      }),
    })

    const data = (await response.json()) as {
      data?: { access_token?: string; refresh_token?: string; expires_in?: number }
      message?: string
    }

    if (!response.ok || !data.data?.access_token) {
      log.error({ type: 'joom_token_refresh_failed', status: response.status, error: data.message || 'Unknown error' })
      return { success: false, error: data.message || `Token refresh failed with status ${response.status}` }
    }

    const expiresIn = data.data.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await prisma.marketplaceCredential.update({
      where: { id: credential.id },
      data: {
        credentials: {
          ...creds,
          accessToken: data.data.access_token,
          refreshToken: data.data.refresh_token || creds.refreshToken,
        },
        tokenExpiresAt: expiresAt,
      },
    })

    log.info({ type: 'joom_token_refreshed', expiresAt })
    return { success: true, expiresAt }
  } catch (error: any) {
    log.error({ type: 'joom_token_refresh_exception', error: error.message })
    return { success: false, error: error.message }
  }
}

export async function isJoomConfigured(): Promise<boolean> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM', isActive: true },
  })
  return !!credential
}

export async function calculateJoomPrice(
  costJpy: number,
  weight: number = 200,
  category?: string
): Promise<{
  finalPriceUsd: number
  breakdown: {
    costJpy: number
    costUsd: number
    shippingCost: number
    platformFee: number
    paymentFee: number
    profit: number
    exchangeRate: number
  }
}> {
  const rateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  })
  const exchangeRate = rateRecord?.rate || 0.0067

  const priceSetting = await prisma.priceSetting.findFirst({
    where: { marketplace: 'JOOM', isDefault: true },
  })

  const platformFeeRate = priceSetting?.platformFeeRate ?? 0.15
  const paymentFeeRate = priceSetting?.paymentFeeRate ?? 0.03
  const profitRate = priceSetting?.targetProfitRate ?? 0.30

  const costUsd = costJpy * exchangeRate
  const shippingCost = 5 + weight * 0.01
  const baseCost = costUsd + shippingCost
  const totalDeduction = platformFeeRate + paymentFeeRate + profitRate
  const finalPriceUsd = baseCost / (1 - totalDeduction)

  return {
    finalPriceUsd: Math.ceil(finalPriceUsd * 100) / 100,
    breakdown: {
      costJpy,
      costUsd: Math.round(costUsd * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      platformFee: Math.round(finalPriceUsd * platformFeeRate * 100) / 100,
      paymentFee: Math.round(finalPriceUsd * paymentFeeRate * 100) / 100,
      profit: Math.round(finalPriceUsd * profitRate * 100) / 100,
      exchangeRate,
    },
  }
}

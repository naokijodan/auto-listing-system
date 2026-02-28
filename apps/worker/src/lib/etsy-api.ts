import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { RateLimiter, withRetry, safeFetch, ApiError, RateLimitError, apiRequest } from './api-utils';

const log = logger.child({ module: 'etsy-api' });

const ETSY_API_BASE = 'https://openapi.etsy.com/v3';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const etsyRateLimiter = new RateLimiter(10); // 10req/sec

export interface EtsyListingData {
  title: string;           // 最大140文字
  description: string;
  price: number;           // USD (float)
  quantity: number;
  tags: string[];          // 最大13個
  materials?: string[];
  taxonomy_id: number;     // Etsy Taxonomy ID
  who_made: 'i_did' | 'someone_else' | 'collective';
  when_made: string;       // 例: 'before_2005', '2020_2024'
  is_supply: boolean;
  shipping_profile_id: number;
  image_ids?: number[];
  state?: 'draft' | 'active';
}

export class EtsyApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private shopId: number | null = null;

  // トークン管理
  async ensureAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'ETSY', isActive: true },
    });
    if (!credential) {
      throw new Error('Etsy credentials not configured');
    }
    const creds = credential.credentials as Record<string, any>;
    const now = new Date();
    const tokenExpired = !credential.tokenExpiresAt || credential.tokenExpiresAt <= now;

    if (!tokenExpired && typeof creds.accessToken === 'string') {
      this.accessToken = creds.accessToken;
      this.tokenExpiresAt = credential.tokenExpiresAt || null;
      return this.accessToken;
    }

    // refresh
    const clientId: string = creds.clientId || process.env.ETSY_API_KEY || '';
    const refreshToken: string | undefined = creds.refreshToken;
    if (!refreshToken) {
      throw new Error('Etsy refresh token not available');
    }

    const resp = await safeFetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
      timeout: 30000,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      log.error({ type: 'etsy_refresh_failed', status: resp.status, error: txt });
      throw new Error(`Failed to refresh Etsy token: ${txt}`);
    }

    const data = await resp.json() as { access_token: string; expires_in: number };
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    await prisma.marketplaceCredential.update({
      where: { id: credential.id },
      data: {
        credentials: { ...creds, accessToken: data.access_token },
        tokenExpiresAt: expiresAt,
      },
    });

    this.accessToken = data.access_token;
    this.tokenExpiresAt = expiresAt;
    return this.accessToken;
  }

  async getShopId(): Promise<number> {
    if (this.shopId) return this.shopId;
    const res = await this.request<any>('GET', '/application/shops');
    const shop = Array.isArray((res as any)?.results) ? (res as any).results[0] : (res as any)?.shops?.[0] || (res as any)?.result?.[0] || (res as any);
    const shopId = shop?.shop_id || shop?.shopId || shop?.id;
    if (!shopId) throw new Error('Failed to resolve Etsy shop_id');
    this.shopId = Number(shopId);
    return this.shopId;
  }

  // Listing CRUD
  async createDraftListing(data: EtsyListingData): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('POST', `/application/shops/${shopId}/listings`, { body: data });
  }

  async publishListing(listingId: number): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('PUT', `/application/shops/${shopId}/listings/${listingId}`, { body: { state: 'active' } });
  }

  async updateListing(listingId: number, data: Partial<EtsyListingData>): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('PUT', `/application/shops/${shopId}/listings/${listingId}`, { body: data });
  }

  async deleteListing(listingId: number): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('DELETE', `/application/shops/${shopId}/listings/${listingId}`);
  }

  async getListing(listingId: number): Promise<any> {
    return this.request<any>('GET', `/application/listings/${listingId}`);
  }

  // 画像
  async uploadListingImage(listingId: number, imageBuffer: Buffer, filename: string): Promise<any> {
    const shopId = await this.getShopId();
    const token = await this.ensureAccessToken();
    await etsyRateLimiter.acquire();

    const form = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)]);
    (form as any).append('image', blob, filename);

    const url = `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`;
    const res = await withRetry(async () => {
      const response = await safeFetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: form as any,
        timeout: 60000,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('Rate limit', retryAfter ? parseInt(retryAfter) : undefined);
      }
      if (!response.ok) {
        const t = await response.text();
        throw new ApiError(t || 'Upload failed', response.status);
      }
      return response.json();
    }, { maxRetries: 3, initialDelay: 1000, retryableStatuses: [429, 500, 502, 503, 504] });

    return res;
  }

  // 在庫
  async updateListingInventory(listingId: number, products: any[]): Promise<any> {
    return this.request<any>('PUT', `/application/listings/${listingId}/inventory`, { body: { products } });
  }

  // 注文（Receipt）
  async getShopReceipts(params?: { min_created?: number; limit?: number }): Promise<any> {
    const shopId = await this.getShopId();
    const sp = new URLSearchParams();
    if (params?.min_created) sp.set('min_created', String(params.min_created));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return this.request<any>('GET', `/application/shops/${shopId}/receipts${q ? `?${q}` : ''}`);
  }

  async getReceipt(receiptId: number): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('GET', `/application/shops/${shopId}/receipts/${receiptId}`);
    }

  async createReceiptShipment(receiptId: number, trackingCode: string, carrierName: string): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('POST', `/application/shops/${shopId}/receipts/${receiptId}/tracking`, {
      body: { tracking_code: trackingCode, carrier_name: carrierName },
    });
  }

  // カテゴリ（Taxonomy）
  async getSellerTaxonomy(): Promise<any> {
    return this.request<any>('GET', '/application/seller-taxonomy/nodes');
  }

  // 配送プロファイル
  async getShippingProfiles(): Promise<any> {
    const shopId = await this.getShopId();
    return this.request<any>('GET', `/application/shops/${shopId}/shipping-profiles`);
  }

  // 内部ヘルパー
  private async request<T>(method: string, path: string, options?: { body?: any; isMultipart?: boolean }): Promise<T> {
    const token = await this.ensureAccessToken();
    await etsyRateLimiter.acquire();

    const url = `${ETSY_API_BASE}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };
    let body: any = undefined;

    if (options?.body !== undefined) {
      if (options.isMultipart) {
        body = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
    }

    return withRetry(async () => {
      const response = await safeFetch(url, {
        method,
        headers,
        body,
        timeout: 30000,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('Rate limit', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (!response.ok) {
        const text = await response.text();
        log.error({ type: 'etsy_api_error', path, status: response.status, error: text });
        throw new ApiError(text || 'Etsy API error', response.status);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const txt = await response.text();
      try {
        return JSON.parse(txt) as T;
      } catch {
        return (txt as unknown) as T;
      }
    }, { maxRetries: 3, initialDelay: 1000, retryableStatuses: [429, 500, 502, 503, 504] });
  }
}

export function isEtsyConfigured(): boolean {
  return !!process.env.ETSY_API_KEY;
}

export function calculateEtsyPrice(costJpy: number): number {
  // JPY→USD変換、利益率、Etsy手数料（6.5%取引 + 3%+$0.25決済 ≈ 約12.5%）
  const usdCost = costJpy / 150;
  const withProfit = usdCost * 1.3;
  const withFees = withProfit / (1 - 0.125);
  return Math.ceil(withFees * 100) / 100;
}

export const etsyApi = new EtsyApiClient();

/**
 * Etsy リフレッシュトークンでアクセストークンを更新
 * schedulerのcheckTokenExpiryから呼ばれる
 */
export async function refreshEtsyToken(): Promise<{
  success: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'ETSY', isActive: true },
  });

  if (!credential) {
    return { success: false, error: 'Etsy credentials not configured' };
  }

  const creds = credential.credentials as Record<string, any>;
  const clientId: string = creds.clientId || process.env.ETSY_API_KEY || '';
  const refreshToken: string | undefined = creds.refreshToken;

  if (!refreshToken) {
    return {
      success: false,
      error: 'Etsy refresh token not available. OAuth authorization required.',
    };
  }

  if (!clientId) {
    return {
      success: false,
      error: 'Etsy API key not configured',
    };
  }

  try {
    const response = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      log.error({
        type: 'etsy_token_refresh_failed',
        status: response.status,
        error: text,
      });
      return {
        success: false,
        error: `Token refresh failed: ${text}`,
      };
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.marketplaceCredential.update({
      where: { id: credential.id },
      data: {
        credentials: {
          ...creds,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
        },
        tokenExpiresAt: expiresAt,
      },
    });

    log.info({ type: 'etsy_token_refreshed', expiresAt });

    // シングルトンインスタンスのキャッシュをクリア
    (etsyApi as any).accessToken = data.access_token;
    (etsyApi as any).tokenExpiresAt = expiresAt;

    return { success: true, expiresAt };
  } catch (error: any) {
    log.error({
      type: 'etsy_token_refresh_exception',
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}


import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { RateLimiter, withRetry, safeFetch, ApiError, RateLimitError } from './api-utils';

const log = logger.child({ module: 'shopify-api' });
const shopifyRateLimiter = new RateLimiter(20); // 保守的に20req/sec

export interface ShopifyProductData {
  title: string;
  body_html: string;
  vendor?: string;
  product_type?: string;
  tags?: string; // comma-separated
  variants: Array<{
    price: string;
    sku: string;
    inventory_quantity?: number;
    weight?: number;
    weight_unit?: string;
  }>;
  images?: Array<{ src: string; alt?: string }>;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
  status?: 'active' | 'draft' | 'archived';
}

export class ShopifyApiClient {
  private accessToken: string | null = null;
  private shopDomain: string | null = null;

  // トークン管理
  async ensureAccessToken(): Promise<{ token: string; shop: string }> {
    if (this.accessToken && this.shopDomain) {
      return { token: this.accessToken, shop: this.shopDomain };
    }

    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'SHOPIFY', isActive: true },
    });
    if (!credential) {
      throw new Error('Shopify credentials not configured');
    }
    const creds = credential.credentials as Record<string, any>;
    const token = creds.accessToken as string | undefined;
    const shop = (creds.shop as string | undefined) || (creds.shopDomain as string | undefined);
    if (!token || !shop) {
      throw new Error('Invalid Shopify credential: missing token or shop');
    }
    this.accessToken = token;
    this.shopDomain = shop;
    return { token, shop };
  }

  // Product CRUD
  async createProduct(data: ShopifyProductData): Promise<any> {
    return this.request<any>('POST', `/products.json`, { product: data });
  }

  async updateProduct(productId: string, data: Partial<ShopifyProductData>): Promise<any> {
    return this.request<any>('PUT', `/products/${productId}.json`, { product: data });
  }

  async getProduct(productId: string): Promise<any> {
    return this.request<any>('GET', `/products/${productId}.json`);
  }

  async deleteProduct(productId: string): Promise<any> {
    return this.request<any>('DELETE', `/products/${productId}.json`);
  }

  async listProducts(params?: { limit?: number; since_id?: string }): Promise<any> {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.since_id) sp.set('since_id', params.since_id);
    const q = sp.toString();
    return this.request<any>('GET', `/products.json${q ? `?${q}` : ''}`);
  }

  // 在庫管理
  async getInventoryLevels(inventoryItemIds: string[]): Promise<any> {
    const sp = new URLSearchParams();
    if (inventoryItemIds.length) sp.set('inventory_item_ids', inventoryItemIds.join(','));
    return this.request<any>('GET', `/inventory_levels.json?${sp.toString()}`);
  }

  async setInventoryLevel(inventoryItemId: string, locationId: string, available: number): Promise<any> {
    return this.request<any>('POST', `/inventory_levels/set.json`, {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available,
    });
  }

  async adjustInventoryLevel(inventoryItemId: string, locationId: string, adjustment: number): Promise<any> {
    return this.request<any>('POST', `/inventory_levels/adjust.json`, {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available_adjustment: adjustment,
    });
  }

  // 注文
  async getOrders(params?: { status?: string; created_at_min?: string; limit?: number }): Promise<any> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.created_at_min) sp.set('created_at_min', params.created_at_min);
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return this.request<any>('GET', `/orders.json${q ? `?${q}` : ''}`);
  }

  async getOrder(orderId: string): Promise<any> {
    return this.request<any>('GET', `/orders/${orderId}.json`);
  }

  async createFulfillment(orderId: string, trackingNumber: string, trackingCompany: string): Promise<any> {
    return this.request<any>('POST', `/orders/${orderId}/fulfillments.json`, {
      fulfillment: {
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
      },
    });
  }

  // ロケーション（在庫拠点）
  async getLocations(): Promise<any> {
    return this.request<any>('GET', `/locations.json`);
  }

  // Webhook
  async createWebhook(topic: string, address: string): Promise<any> {
    return this.request<any>('POST', `/webhooks.json`, {
      webhook: { topic, address, format: 'json' },
    });
  }

  // 内部ヘルパー
  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const { token, shop } = await this.ensureAccessToken();
    await shopifyRateLimiter.acquire();
    const url = `https://${shop}/admin/api/2024-01${path}`;
    const headers: Record<string, string> = {
      'X-Shopify-Access-Token': token,
    };
    let payload: any;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    return withRetry(async () => {
      const response = await safeFetch(url, { method, headers, body: payload, timeout: 30000 });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('Rate limit', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (!response.ok) {
        const text = await response.text();
        log.error({ type: 'shopify_api_error', path, status: response.status, error: text });
        throw new ApiError(text || 'Shopify API error', response.status);
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

export function isShopifyConfigured(): boolean {
  return !!process.env.SHOPIFY_API_KEY;
}

export function calculateShopifyPrice(costJpy: number): number {
  // Shopify: 決済手数料2.9%+$0.30 + AI手数料4%（ChatGPT経由の場合）
  // 合計約9.2%（ChatGPT経由想定）
  const usdCost = costJpy / 150;
  const withProfit = usdCost * 1.3;
  const withFees = withProfit / (1 - 0.092);
  return Math.ceil(withFees * 100) / 100;
}

export const shopifyApi = new ShopifyApiClient();


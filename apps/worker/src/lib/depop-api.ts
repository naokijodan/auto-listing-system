import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { RateLimiter, withRetry, safeFetch, ApiError, RateLimitError } from './api-utils';

const log = logger.child({ module: 'depop-api' });

const DEPOP_API_BASE = 'https://partnerapi.depop.com/api/v1';
const depopRateLimiter = new RateLimiter(10, 1000);

export interface DepopProductInput {
  description: string;
  pictures: string[];
  price: { amount: number; currency: 'USD' | 'GBP' | 'AUD' | 'EUR' };
  quantity: number;
  category_id?: number;
  brand_id?: number;
  condition?: 'NEW_WITH_TAGS' | 'NEW_WITHOUT_TAGS' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  colour?: string;
  size?: string;
  national_shipping_cost?: { amount: number; currency: string };
  depop_shipping?: { provider_id: string; parcel_size_id: string; address_id: string };
}

export interface DepopProduct {
  product_id: number;
  sku: string;
  description: string;
  pictures: string[];
  price: { amount: number; currency: string };
  quantity: number;
  status: string;
  slug?: string;
  url?: string;
}

export class DepopApiClient {
  private apiKey: string | null = null;

  private async getApiKey(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }

    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'DEPOP', isActive: true },
    });

    if (!credential) {
      throw new Error('Depop credentials not configured');
    }

    const creds = credential.credentials as Record<string, any>;
    const apiKey = creds.apiKey || creds.accessToken || creds.token;

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Depop API key not available');
    }

    this.apiKey = apiKey;
    return apiKey;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const apiKey = await this.getApiKey();
    await depopRateLimiter.acquire();

    const url = `${DEPOP_API_BASE}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
    };
    let payload: string | undefined;

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    return withRetry(async () => {
      const response = await safeFetch(url, {
        method,
        headers,
        body: payload,
        timeout: 30000,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('Rate limit', retryAfter ? parseInt(retryAfter, 10) : undefined);
      }

      if (!response.ok) {
        const text = await response.text();
        let message = text || 'Depop API error';
        let code: string | undefined;
        let details: any;

        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.error || message;
          code = parsed?.code;
          details = parsed;
        } catch {
          details = text;
        }

        log.error({ type: 'depop_api_error', path, status: response.status, message });
        throw new ApiError(message, response.status, code, details);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000,
      retryableStatuses: [429, 500, 502, 503, 504],
    });
  }

  async createOrUpdateProduct(sku: string, data: DepopProductInput): Promise<DepopProduct> {
    return this.request<DepopProduct>('PUT', `/products/${encodeURIComponent(sku)}`, data);
  }

  async getProduct(sku: string): Promise<DepopProduct> {
    return this.request<DepopProduct>('GET', `/products/${encodeURIComponent(sku)}`);
  }

  async deleteProduct(sku: string): Promise<void> {
    await this.request<void>('DELETE', `/products/${encodeURIComponent(sku)}`);
  }

  async listProducts(limit?: number, offset?: number): Promise<any> {
    const sp = new URLSearchParams();
    if (typeof limit === 'number') sp.set('limit', String(limit));
    if (typeof offset === 'number') sp.set('offset', String(offset));
    const q = sp.toString();
    return this.request<any>('GET', `/products${q ? `?${q}` : ''}`);
  }

  async getOrders(status?: string, limit?: number, offset?: number): Promise<any> {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (typeof limit === 'number') sp.set('limit', String(limit));
    if (typeof offset === 'number') sp.set('offset', String(offset));
    const q = sp.toString();
    return this.request<any>('GET', `/orders${q ? `?${q}` : ''}`);
  }

  async getOrder(purchaseId: string): Promise<any> {
    return this.request<any>('GET', `/orders/${encodeURIComponent(purchaseId)}`);
  }

  async markAsShipped(purchaseId: string, parcelId: string, trackingCode: string): Promise<any> {
    return this.request<any>(
      'POST',
      `/orders/${encodeURIComponent(purchaseId)}/parcels/${encodeURIComponent(parcelId)}/mark-as-shipped`,
      { tracking_code: trackingCode }
    );
  }

  async getSellerAddresses(): Promise<any> {
    return this.request<any>('GET', '/shop/seller-addresses');
  }

  async getShippingProviders(addressId: string): Promise<any> {
    return this.request<any>(
      'GET',
      `/shop/seller-addresses/${encodeURIComponent(addressId)}/shipping-providers`
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getSellerAddresses();
      return true;
    } catch {
      return false;
    }
  }
}

export const depopApi = new DepopApiClient();

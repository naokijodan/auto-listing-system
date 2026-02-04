import { prisma } from '@als/database';
import { logger } from '@als/logger';

const log = logger.child({ module: 'ebay-api' });

// eBay API エンドポイント
const EBAY_API_SANDBOX = 'https://api.sandbox.ebay.com';
const EBAY_API_PRODUCTION = 'https://api.ebay.com';
const EBAY_AUTH_SANDBOX = 'https://auth.sandbox.ebay.com';
const EBAY_AUTH_PRODUCTION = 'https://auth.ebay.com';

const IS_PRODUCTION = process.env.EBAY_ENV === 'production';
const EBAY_API_BASE = IS_PRODUCTION ? EBAY_API_PRODUCTION : EBAY_API_SANDBOX;
const EBAY_AUTH_BASE = IS_PRODUCTION ? EBAY_AUTH_PRODUCTION : EBAY_AUTH_SANDBOX;

export interface EbayProduct {
  title: string;
  description: string;
  primaryCategory: {
    categoryId: string;
  };
  pictures: string[];
  condition: {
    conditionId: string;
    conditionDescription?: string;
  };
  price: {
    value: number;
    currency: string;
  };
  quantity: number;
  sku?: string;
  itemSpecifics?: Record<string, string>;
  shippingDetails?: {
    shippingType: string;
    shippingServiceOptions: Array<{
      shippingService: string;
      shippingServiceCost: number;
      shippingServiceAdditionalCost?: number;
      freeShipping?: boolean;
    }>;
  };
  returnPolicy?: {
    returnsAccepted: boolean;
    returnsPeriod: string;
    returnsDescription?: string;
  };
  listingDuration?: string;
  listingType?: string;
  paymentMethods?: string[];
}

export interface EbayApiResponse<T> {
  success: boolean;
  data?: T;
  itemId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * eBay API クライアント
 */
export class EbayApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor() {}

  /**
   * 認証情報を取得
   */
  private async getCredentials() {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'EBAY',
        isActive: true,
      },
    });

    if (!credential) {
      throw new Error('eBay credentials not configured');
    }

    return credential.credentials as {
      clientId: string;
      clientSecret: string;
      devId?: string;
      accessToken?: string;
      refreshToken?: string;
      ruName?: string;
    };
  }

  /**
   * アクセストークンを取得/更新
   */
  private async ensureAccessToken(): Promise<string> {
    // キャッシュされたトークンが有効ならそれを使う
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    const credentials = await this.getCredentials();

    // リフレッシュトークンがあれば更新
    if (credentials.refreshToken) {
      return this.refreshAccessToken(credentials);
    }

    // 既存のアクセストークンがあればそれを使う
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      return this.accessToken;
    }

    throw new Error('eBay access token not configured. Please complete OAuth flow.');
  }

  /**
   * アクセストークンをリフレッシュ
   */
  private async refreshAccessToken(credentials: any): Promise<string> {
    const auth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`
    ).toString('base64');

    try {
      const response = await fetch(`${EBAY_AUTH_BASE}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error({
          type: 'ebay_token_refresh_failed',
          error: data,
        });
        throw new Error('Failed to refresh eBay token');
      }

      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      // DBのトークンも更新
      await prisma.marketplaceCredential.updateMany({
        where: {
          marketplace: 'EBAY',
          isActive: true,
        },
        data: {
          credentials: {
            ...credentials,
            accessToken: data.access_token,
          },
          tokenExpiresAt: this.tokenExpiresAt,
        },
      });

      log.info({
        type: 'ebay_token_refreshed',
        expiresAt: this.tokenExpiresAt,
      });

      return this.accessToken!;
    } catch (error: any) {
      log.error({
        type: 'ebay_token_refresh_error',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Inventory API リクエスト
   */
  private async inventoryApiRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<EbayApiResponse<T>> {
    const token = await this.ensureAccessToken();

    const url = `${EBAY_API_BASE}/sell/inventory/v1${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
    };

    log.debug({
      type: 'ebay_api_request',
      method,
      endpoint,
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();

      if (!response.ok) {
        log.error({
          type: 'ebay_api_error',
          status: response.status,
          error: data,
        });

        return {
          success: false,
          error: {
            code: data.errors?.[0]?.errorId || 'UNKNOWN',
            message: data.errors?.[0]?.message || 'Unknown error',
            details: data.errors,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      log.error({
        type: 'ebay_api_exception',
        error: error.message,
      });

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * インベントリアイテムを作成/更新
   */
  async createOrUpdateInventoryItem(
    sku: string,
    product: {
      title: string;
      description: string;
      aspects?: Record<string, string[]>;
      imageUrls: string[];
      condition: string;
      conditionDescription?: string;
    }
  ): Promise<EbayApiResponse<void>> {
    log.info({
      type: 'ebay_create_inventory_item',
      sku,
      title: product.title,
    });

    return this.inventoryApiRequest<void>('PUT', `/inventory_item/${sku}`, {
      product: {
        title: product.title,
        description: product.description,
        aspects: product.aspects,
        imageUrls: product.imageUrls,
      },
      condition: product.condition,
      conditionDescription: product.conditionDescription,
    });
  }

  /**
   * オファーを作成
   */
  async createOffer(
    sku: string,
    offer: {
      marketplaceId: string;
      format: string;
      categoryId: string;
      pricingPrice: number;
      pricingCurrency: string;
      quantity: number;
      listingDescription?: string;
      fulfillmentPolicyId?: string;
      paymentPolicyId?: string;
      returnPolicyId?: string;
    }
  ): Promise<EbayApiResponse<{ offerId: string }>> {
    log.info({
      type: 'ebay_create_offer',
      sku,
      price: offer.pricingPrice,
    });

    return this.inventoryApiRequest<{ offerId: string }>('POST', '/offer', {
      sku,
      marketplaceId: offer.marketplaceId || 'EBAY_US',
      format: offer.format || 'FIXED_PRICE',
      categoryId: offer.categoryId,
      pricingSummary: {
        price: {
          value: offer.pricingPrice.toString(),
          currency: offer.pricingCurrency || 'USD',
        },
      },
      availableQuantity: offer.quantity,
      listingDescription: offer.listingDescription,
      listingPolicies: {
        fulfillmentPolicyId: offer.fulfillmentPolicyId,
        paymentPolicyId: offer.paymentPolicyId,
        returnPolicyId: offer.returnPolicyId,
      },
    });
  }

  /**
   * オファーを公開（出品）
   */
  async publishOffer(offerId: string): Promise<EbayApiResponse<{ listingId: string }>> {
    log.info({
      type: 'ebay_publish_offer',
      offerId,
    });

    return this.inventoryApiRequest<{ listingId: string }>(
      'POST',
      `/offer/${offerId}/publish`
    );
  }

  /**
   * 出品を取り下げ
   */
  async withdrawOffer(offerId: string): Promise<EbayApiResponse<void>> {
    log.info({
      type: 'ebay_withdraw_offer',
      offerId,
    });

    return this.inventoryApiRequest<void>('POST', `/offer/${offerId}/withdraw`);
  }

  /**
   * 在庫を更新
   */
  async updateInventory(sku: string, quantity: number): Promise<EbayApiResponse<void>> {
    log.info({
      type: 'ebay_update_inventory',
      sku,
      quantity,
    });

    // 在庫ロケーションを更新
    return this.inventoryApiRequest<void>(
      'POST',
      `/inventory_item/${sku}/update_availability`,
      {
        shipToLocationAvailability: {
          quantity,
        },
      }
    );
  }

  /**
   * 価格を更新
   */
  async updatePrice(
    offerId: string,
    price: number,
    currency: string = 'USD'
  ): Promise<EbayApiResponse<void>> {
    log.info({
      type: 'ebay_update_price',
      offerId,
      price,
    });

    return this.inventoryApiRequest<void>('PUT', `/offer/${offerId}`, {
      pricingSummary: {
        price: {
          value: price.toString(),
          currency,
        },
      },
    });
  }

  /**
   * カテゴリIDをマッピング
   */
  async getCategoryId(sourceCategory: string): Promise<string | null> {
    const mapping = await prisma.ebayCategoryMapping.findUnique({
      where: { sourceCategory },
    });

    return mapping?.ebayCategoryId || null;
  }
}

// シングルトンインスタンス
export const ebayApi = new EbayApiClient();

/**
 * eBay APIが設定されているか確認
 */
export async function isEbayConfigured(): Promise<boolean> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: {
      marketplace: 'EBAY',
      isActive: true,
    },
  });

  return !!credential;
}

/**
 * eBay 商品コンディションをマッピング
 */
export function mapConditionToEbay(condition?: string): string {
  const conditionMap: Record<string, string> = {
    '新品': 'NEW',
    '未使用': 'NEW',
    '新品・未使用': 'NEW',
    '未使用に近い': 'NEW_OTHER',
    '目立った傷や汚れなし': 'USED_EXCELLENT',
    'やや傷や汚れあり': 'USED_GOOD',
    '傷や汚れあり': 'USED_ACCEPTABLE',
    '全体的に状態が悪い': 'FOR_PARTS_OR_NOT_WORKING',
  };

  return conditionMap[condition || ''] || 'USED_GOOD';
}

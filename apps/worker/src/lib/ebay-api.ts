import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { RateLimiter, withRetry, safeFetch, createApiError, ApiError, RateLimitError } from './api-utils';

const log = logger.child({ module: 'ebay-api' });

// レート制限: eBay Inventory APIは100リクエスト/秒
const ebayRateLimiter = new RateLimiter(50, 1000);

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
      const response = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
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
   * Inventory API リクエスト（レート制限・リトライ付き）
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
      'Accept-Language': 'en-US',
    };

    log.debug({
      type: 'ebay_api_request',
      method,
      endpoint,
    });

    try {
      // レート制限とリトライ付きでリクエスト
      return await withRetry(async () => {
        await ebayRateLimiter.acquire();

        const response = await safeFetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          timeout: 30000,
        });

        if (response.status === 204) {
          return { success: true } as EbayApiResponse<T>;
        }

        const data = await response.json();

        if (!response.ok) {
          // レート制限エラーの場合はリトライ可能としてスロー
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              data.errors?.[0]?.message || 'Rate limit exceeded',
              retryAfter ? parseInt(retryAfter) : undefined
            );
          }

          // 5xxエラーもリトライ可能
          if (response.status >= 500) {
            throw new ApiError(
              data.errors?.[0]?.message || 'Server error',
              response.status,
              data.errors?.[0]?.errorId
            );
          }

          // その他のエラーはリトライ不要
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
          } as EbayApiResponse<T>;
        }

        return {
          success: true,
          data,
        } as EbayApiResponse<T>;
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      });
    } catch (error: any) {
      log.error({
        type: 'ebay_api_exception',
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: {
          code: error.code || 'NETWORK_ERROR',
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
      availability: {
        shipToLocationAvailability: {
          quantity: 1,
        },
      },
    });
  }

  /**
   * インベントリロケーションを作成/確認
   */
  async ensureInventoryLocation(
    merchantLocationKey: string = 'RAKUDA_JP'
  ): Promise<void> {
    // まず既存のロケーションがあるか確認
    const existing = await this.inventoryApiRequest<any>(
      'GET',
      `/location/${merchantLocationKey}`
    );

    if (existing.success) {
      return; // 既に存在する
    }

    // ロケーションを作成
    await this.inventoryApiRequest<void>(
      'POST',
      `/location/${merchantLocationKey}`,
      {
        location: {
          address: {
            city: 'Tokyo',
            stateOrProvince: 'Tokyo',
            postalCode: '100-0001',
            country: 'JP',
          },
        },
        locationTypes: ['WAREHOUSE'],
        name: 'RAKUDA Japan Warehouse',
        merchantLocationStatus: 'ENABLED',
      }
    );

    log.info({
      type: 'ebay_location_created',
      merchantLocationKey,
    });
  }

  /**
   * Sell Account API リクエスト（レート制限・リトライ付き）
   */
  private async accountApiRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<EbayApiResponse<T>> {
    const token = await this.ensureAccessToken();

    const url = `${EBAY_API_BASE}/sell/account/v1${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US',
    };

    log.debug({
      type: 'ebay_account_api_request',
      method,
      endpoint,
    });

    try {
      return await withRetry(async () => {
        await ebayRateLimiter.acquire();

        const response = await safeFetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          timeout: 30000,
        });

        if (response.status === 204) {
          return { success: true } as EbayApiResponse<T>;
        }

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              data.errors?.[0]?.message || 'Rate limit exceeded',
              retryAfter ? parseInt(retryAfter) : undefined
            );
          }

          if (response.status >= 500) {
            throw new ApiError(
              data.errors?.[0]?.message || 'Server error',
              response.status,
              data.errors?.[0]?.errorId
            );
          }

          log.error({
            type: 'ebay_account_api_error',
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
          } as EbayApiResponse<T>;
        }

        return {
          success: true,
          data,
        } as EbayApiResponse<T>;
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      });
    } catch (error: any) {
      log.error({
        type: 'ebay_account_api_exception',
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: {
          code: error.code || 'NETWORK_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Fulfillmentポリシー一覧を取得
   */
  async getFulfillmentPolicies(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ fulfillmentPolicies: Array<{ fulfillmentPolicyId: string; name: string }> }>> {
    return this.accountApiRequest('GET', `/fulfillment_policy?marketplace_id=${marketplaceId}`);
  }

  /**
   * Paymentポリシー一覧を取得
   */
  async getPaymentPolicies(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ paymentPolicies: Array<{ paymentPolicyId: string; name: string }> }>> {
    return this.accountApiRequest('GET', `/payment_policy?marketplace_id=${marketplaceId}`);
  }

  /**
   * Returnポリシー一覧を取得
   */
  async getReturnPolicies(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ returnPolicies: Array<{ returnPolicyId: string; name: string }> }>> {
    return this.accountApiRequest('GET', `/return_policy?marketplace_id=${marketplaceId}`);
  }

  /**
   * Fulfillmentポリシーを作成
   */
  async createFulfillmentPolicy(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ fulfillmentPolicyId: string }>> {
    return this.accountApiRequest('POST', '/fulfillment_policy', {
      name: 'RAKUDA Standard Shipping',
      description: 'Standard international shipping from Japan',
      marketplaceId,
      categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
      handlingTime: { value: 3, unit: 'DAY' },
      shippingOptions: [
        {
          optionType: 'DOMESTIC',
          costType: 'FLAT_RATE',
          shippingServices: [
            {
              sortOrder: 1,
              shippingCarrierCode: 'USPS',
              shippingServiceCode: 'USPSPriority',
              shippingCost: { value: '0.00', currency: 'USD' },
              additionalShippingCost: { value: '0.00', currency: 'USD' },
              freeShipping: true,
              buyerResponsibleForShipping: false,
            },
          ],
        },
      ],
    });
  }

  /**
   * Paymentポリシーを作成
   */
  async createPaymentPolicy(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ paymentPolicyId: string }>> {
    return this.accountApiRequest('POST', '/payment_policy', {
      name: 'RAKUDA Payment Policy',
      description: 'Standard payment policy',
      marketplaceId,
      categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
      paymentMethods: [
        { paymentMethodType: 'PERSONAL_CHECK' },
      ],
      immediatePay: false,
    });
  }

  /**
   * Returnポリシーを作成
   */
  async createReturnPolicy(
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{ returnPolicyId: string }>> {
    return this.accountApiRequest('POST', '/return_policy', {
      name: 'RAKUDA Return Policy',
      description: '30-day returns accepted',
      marketplaceId,
      categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
      returnsAccepted: true,
      returnPeriod: { value: 30, unit: 'DAY' },
      refundMethod: 'MONEY_BACK',
      returnShippingCostPayer: 'BUYER',
    });
  }

  /**
   * Business Policyプログラムへのopt-in
   * Sandbox環境では明示的にopt-inが必要
   */
  async optInToBusinessPolicies(): Promise<void> {
    const result = await this.accountApiRequest<void>(
      'POST',
      '/program/opt_in',
      { programType: 'SELLING_POLICY_MANAGEMENT' }
    );

    if (result.success) {
      log.info({ type: 'business_policy_opt_in_success' });
    } else {
      // 既にopt-in済みの場合もエラーになることがあるが無視
      log.warn({
        type: 'business_policy_opt_in_warning',
        error: result.error?.message,
      });
    }
  }

  /**
   * デフォルトのビジネスポリシーを確認・作成
   * 既存のポリシーがあればそのIDを返し、なければ作成する
   */
  async ensureDefaultPolicies(
    marketplaceId: string = 'EBAY_US'
  ): Promise<{
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  }> {
    // まずBusiness Policyへのopt-inを確認
    await this.optInToBusinessPolicies();

    // Fulfillment Policy
    let fulfillmentPolicyId: string | undefined;
    const fulfillmentResult = await this.getFulfillmentPolicies(marketplaceId);
    if (fulfillmentResult.success && fulfillmentResult.data?.fulfillmentPolicies?.length) {
      fulfillmentPolicyId = fulfillmentResult.data.fulfillmentPolicies[0].fulfillmentPolicyId;
      log.info({ type: 'policy_found', kind: 'fulfillment', id: fulfillmentPolicyId });
    } else {
      const created = await this.createFulfillmentPolicy(marketplaceId);
      if (!created.success || !created.data?.fulfillmentPolicyId) {
        throw new Error(`Failed to create fulfillment policy: ${created.error?.message}`);
      }
      fulfillmentPolicyId = created.data.fulfillmentPolicyId;
      log.info({ type: 'policy_created', kind: 'fulfillment', id: fulfillmentPolicyId });
    }

    // Payment Policy
    let paymentPolicyId: string | undefined;
    const paymentResult = await this.getPaymentPolicies(marketplaceId);
    if (paymentResult.success && paymentResult.data?.paymentPolicies?.length) {
      paymentPolicyId = paymentResult.data.paymentPolicies[0].paymentPolicyId;
      log.info({ type: 'policy_found', kind: 'payment', id: paymentPolicyId });
    } else {
      const created = await this.createPaymentPolicy(marketplaceId);
      if (!created.success || !created.data?.paymentPolicyId) {
        throw new Error(`Failed to create payment policy: ${created.error?.message}`);
      }
      paymentPolicyId = created.data.paymentPolicyId;
      log.info({ type: 'policy_created', kind: 'payment', id: paymentPolicyId });
    }

    // Return Policy
    let returnPolicyId: string | undefined;
    const returnResult = await this.getReturnPolicies(marketplaceId);
    if (returnResult.success && returnResult.data?.returnPolicies?.length) {
      returnPolicyId = returnResult.data.returnPolicies[0].returnPolicyId;
      log.info({ type: 'policy_found', kind: 'return', id: returnPolicyId });
    } else {
      const created = await this.createReturnPolicy(marketplaceId);
      if (!created.success || !created.data?.returnPolicyId) {
        throw new Error(`Failed to create return policy: ${created.error?.message}`);
      }
      returnPolicyId = created.data.returnPolicyId;
      log.info({ type: 'policy_created', kind: 'return', id: returnPolicyId });
    }

    return {
      fulfillmentPolicyId: fulfillmentPolicyId!,
      paymentPolicyId: paymentPolicyId!,
      returnPolicyId: returnPolicyId!,
    };
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
      merchantLocationKey?: string;
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
      merchantLocationKey: offer.merchantLocationKey || 'RAKUDA_JP',
      listingDescription: offer.listingDescription,
      listingPolicies: {
        fulfillmentPolicyId: offer.fulfillmentPolicyId,
        paymentPolicyId: offer.paymentPolicyId,
        returnPolicyId: offer.returnPolicyId,
      },
    });
  }

  /**
   * オファーを取得（状態確認）
   */
  async getOffer(offerId: string): Promise<EbayApiResponse<{
    offerId: string;
    sku: string;
    status: string;
    listingId?: string;
    pricingSummary?: {
      price: { value: string; currency: string };
    };
    availableQuantity?: number;
  }>> {
    log.info({
      type: 'ebay_get_offer',
      offerId,
    });

    return this.inventoryApiRequest('GET', `/offer/${offerId}`);
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
   * オファー価格を更新（updatePriceのエイリアス）
   */
  async updateOfferPrice(
    offerId: string,
    price: number,
    currency: string = 'USD'
  ): Promise<EbayApiResponse<void>> {
    return this.updatePrice(offerId, price, currency);
  }

  /**
   * カテゴリをキーワードで検索（Taxonomy API）
   */
  async searchCategories(
    query: string,
    marketplaceId: string = 'EBAY_US'
  ): Promise<EbayApiResponse<{
    categoryId: string;
    categoryName: string;
    categoryPath: string;
  }[]>> {
    log.info({
      type: 'ebay_search_categories',
      query,
      marketplaceId,
    });

    // Taxonomy APIにアクセス
    // 注: 実際のeBay Taxonomy APIはBrowse APIの一部
    // GET /commerce/taxonomy/v1/category_tree/{category_tree_id}/get_category_suggestions
    try {
      const accessToken = this.accessToken;

      // eBay US のカテゴリツリーID
      const categoryTreeId = marketplaceId === 'EBAY_US' ? '0' : '0';

      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error({ type: 'ebay_taxonomy_api_error', status: response.status, error: errorText });

        // API未設定やエラー時はDBのマッピングから検索
        const dbMappings = await prisma.ebayCategoryMapping.findMany({
          where: {
            OR: [
              { sourceCategory: { contains: query, mode: 'insensitive' } },
              { ebayCategoryName: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 10,
        });

        return {
          success: true,
          data: dbMappings.map(m => ({
            categoryId: m.ebayCategoryId,
            categoryName: m.ebayCategoryName || m.sourceCategory,
            categoryPath: m.ebayCategoryName,
          })),
        };
      }

      const data = await response.json();
      const suggestions = data.categorySuggestions || [];

      return {
        success: true,
        data: suggestions.map((s: any) => ({
          categoryId: s.category?.categoryId || '',
          categoryName: s.category?.categoryName || '',
          categoryPath: s.categoryTreeNodeAncestors
            ?.map((a: any) => a.categoryName)
            .reverse()
            .join(' > ') || '',
        })),
      };
    } catch (error: any) {
      log.error({ type: 'ebay_search_categories_error', error: error.message });

      // フォールバック: DBマッピングを検索
      const dbMappings = await prisma.ebayCategoryMapping.findMany({
        where: {
          OR: [
            { sourceCategory: { contains: query, mode: 'insensitive' } },
            { ebayCategoryName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
      });

      return {
        success: true,
        data: dbMappings.map(m => ({
          categoryId: m.ebayCategoryId,
          categoryName: m.ebayCategoryName || m.sourceCategory,
          categoryPath: m.ebayCategoryName,
        })),
      };
    }
  }

  /**
   * カテゴリIDをマッピング（Phase 45: 拡張版）
   * 1. DBの完全一致
   * 2. enrichmentエンジンの曖昧マッチング
   * 3. AI推定（オプション）
   */
  async getCategoryId(
    sourceCategory: string,
    title?: string,
    description?: string,
    useAI: boolean = false
  ): Promise<string | null> {
    // 1. DBの完全一致
    const mapping = await prisma.ebayCategoryMapping.findUnique({
      where: { sourceCategory },
    });

    if (mapping) {
      log.debug({
        type: 'category_mapping_found',
        sourceCategory,
        ebayCategoryId: mapping.ebayCategoryId,
        source: 'database',
      });
      return mapping.ebayCategoryId;
    }

    // 2. enrichmentエンジンで推定（タイトルがある場合）
    if (title) {
      try {
        // 動的インポート（循環依存回避）
        const { mapToEbayCategory } = await import('@rakuda/enrichment');
        const result = await mapToEbayCategory(
          sourceCategory,
          title,
          description || '',
          useAI
        );

        if (result.confidence >= 0.5) {
          log.info({
            type: 'category_mapping_inferred',
            sourceCategory,
            ebayCategoryId: result.categoryId,
            confidence: result.confidence,
            source: result.source,
          });
          return result.categoryId;
        }
      } catch (error: any) {
        log.warn({
          type: 'category_mapping_inference_failed',
          error: error.message,
        });
      }
    }

    log.warn({
      type: 'category_mapping_not_found',
      sourceCategory,
    });
    return null;
  }

  /**
   * カテゴリIDを取得（ItemSpecifics付き）
   */
  async getCategoryWithSpecifics(
    sourceCategory: string,
    title?: string,
    description?: string
  ): Promise<{
    categoryId: string | null;
    itemSpecifics: Record<string, string[]>;
  }> {
    // 1. DBから取得
    const mapping = await prisma.ebayCategoryMapping.findUnique({
      where: { sourceCategory },
    });

    if (mapping) {
      return {
        categoryId: mapping.ebayCategoryId,
        itemSpecifics: (mapping.itemSpecifics as Record<string, string[]>) || {},
      };
    }

    // 2. enrichmentエンジンで推定
    if (title) {
      try {
        const { mapToEbayCategory } = await import('@rakuda/enrichment');
        const result = await mapToEbayCategory(
          sourceCategory,
          title,
          description || '',
          false // AI不使用（高速化）
        );

        if (result.confidence >= 0.5) {
          return {
            categoryId: result.categoryId,
            itemSpecifics: result.itemSpecifics || {},
          };
        }
      } catch {
        // フォールバック
      }
    }

    return {
      categoryId: null,
      itemSpecifics: {},
    };
  }

  /**
   * Fulfillment API リクエスト（レート制限・リトライ付き）
   */
  private async fulfillmentApiRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<EbayApiResponse<T>> {
    const token = await this.ensureAccessToken();

    const url = `${EBAY_API_BASE}/sell/fulfillment/v1${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    log.debug({
      type: 'ebay_fulfillment_api_request',
      method,
      endpoint,
    });

    try {
      return await withRetry(async () => {
        await ebayRateLimiter.acquire();

        const response = await safeFetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          timeout: 30000,
        });

        if (response.status === 204) {
          return { success: true } as EbayApiResponse<T>;
        }

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              data.errors?.[0]?.message || 'Rate limit exceeded',
              retryAfter ? parseInt(retryAfter) : undefined
            );
          }

          if (response.status >= 500) {
            throw new ApiError(
              data.errors?.[0]?.message || 'Server error',
              response.status,
              data.errors?.[0]?.errorId
            );
          }

          log.error({
            type: 'ebay_fulfillment_api_error',
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
          } as EbayApiResponse<T>;
        }

        return {
          success: true,
          data,
        } as EbayApiResponse<T>;
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      });
    } catch (error: any) {
      log.error({
        type: 'ebay_fulfillment_api_exception',
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: {
          code: error.code || 'NETWORK_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * 注文一覧を取得
   */
  async getOrders(options: {
    creationDateFrom?: string;  // ISO形式
    creationDateTo?: string;
    limit?: number;
    offset?: number;
    orderStatus?: string[];     // 'Active', 'Cancelled', 'Completed', etc.
  }): Promise<EbayApiResponse<{
    orders: EbayOrder[];
    total: number;
    offset: number;
    limit: number;
  }>> {
    log.info({
      type: 'ebay_get_orders',
      options,
    });

    const params = new URLSearchParams();
    if (options.creationDateFrom) {
      params.append('filter', `creationdate:[${options.creationDateFrom}..]`);
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options.offset) {
      params.append('offset', options.offset.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fulfillmentApiRequest<{
      orders: EbayOrder[];
      total: number;
      offset: number;
      limit: number;
    }>('GET', `/order${query}`);
  }

  /**
   * 単一注文を取得
   */
  async getOrder(orderId: string): Promise<EbayApiResponse<EbayOrder>> {
    log.info({
      type: 'ebay_get_order',
      orderId,
    });

    return this.fulfillmentApiRequest<EbayOrder>('GET', `/order/${orderId}`);
  }

  /**
   * 注文を発送完了としてマーク
   */
  async shipOrder(
    orderId: string,
    lineItemId: string,
    trackingInfo: {
      trackingNumber: string;
      shippingCarrier: string;
    }
  ): Promise<EbayApiResponse<void>> {
    log.info({
      type: 'ebay_ship_order',
      orderId,
      lineItemId,
      trackingNumber: trackingInfo.trackingNumber,
    });

    return this.fulfillmentApiRequest<void>(
      'POST',
      `/order/${orderId}/shipping_fulfillment`,
      {
        lineItems: [
          {
            lineItemId,
            quantity: 1,
          },
        ],
        shippedDate: new Date().toISOString(),
        shippingCarrierCode: trackingInfo.shippingCarrier,
        trackingNumber: trackingInfo.trackingNumber,
      }
    );
  }
}

/**
 * eBay注文の型定義
 */
export interface EbayOrder {
  orderId: string;
  legacyOrderId?: string;
  creationDate: string;
  lastModifiedDate?: string;
  orderFulfillmentStatus: string;
  orderPaymentStatus: string;
  sellerId?: string;
  buyer?: {
    username: string;
  };
  pricingSummary?: {
    priceSubtotal?: { value: string; currency: string };
    deliveryCost?: { value: string; currency: string };
    total?: { value: string; currency: string };
  };
  fulfillmentStartInstructions?: Array<{
    shippingStep?: {
      shipTo?: {
        fullName?: string;
        contactAddress?: {
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          stateOrProvince?: string;
          postalCode?: string;
          countryCode?: string;
        };
      };
    };
  }>;
  lineItems?: Array<{
    lineItemId: string;
    legacyItemId?: string;
    title?: string;
    sku?: string;
    quantity?: number;
    lineItemCost?: { value: string; currency: string };
  }>;
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
  // eBay ConditionEnum マッピング
  // USED_EXCELLENT (3000) はほとんどのカテゴリで有効な中古品condition
  // USED_GOOD (5000) は一部カテゴリで無効なため、USED_EXCELLENTをデフォルトにする
  const conditionMap: Record<string, string> = {
    '新品': 'NEW',
    '未使用': 'NEW',
    '新品・未使用': 'NEW',
    '未使用に近い': 'NEW_OTHER',
    '目立った傷や汚れなし': 'USED_EXCELLENT',
    'やや傷や汚れあり': 'USED_EXCELLENT',
    '傷や汚れあり': 'USED_ACCEPTABLE',
    '全体的に状態が悪い': 'FOR_PARTS_OR_NOT_WORKING',
    'NEW': 'NEW',
    'USED': 'USED_EXCELLENT',
    'LIKE_NEW': 'NEW_OTHER',
  };

  return conditionMap[condition || ''] || 'USED_EXCELLENT';
}

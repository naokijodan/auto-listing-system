import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { RateLimiter, withRetry, safeFetch, ApiError, RateLimitError } from './api-utils';

const log = logger.child({ module: 'joom-api' });

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

// レート制限: Joom APIは10リクエスト/秒と仮定
const joomRateLimiter = new RateLimiter(10, 1000);

export interface JoomProduct {
  id?: string;
  name: string;
  description: string;
  mainImage: string;
  extraImages?: string[];
  price: number;
  currency: string;
  quantity: number;
  // kg単位（未設定時はデフォルトを使用）
  weight?: number;
  shipping?: {
    price: number;
    time: string;
  };
  shippingMethod?: 'joom_logistics' | 'offline';
  tags?: string[];
  parentSku?: string;
  sku: string;

  // 推奨フィールド（オプショナル）
  brand?: string;
  categoryId?: string;       // Joom カテゴリID
  color?: string;
  size?: string;
  material?: string;
  gtin?: string;             // GTIN/JAN/EAN
  msrp?: number;             // メーカー希望小売価格
  condition?: string;        // 'new' | 'refurbished' | 'used'
  searchTags?: string[];     // 検索タグ（tagsとは別）
  shippingLength?: number;   // cm
  shippingWidth?: number;    // cm
  shippingHeight?: number;   // cm
  dangerousKind?: string;    // 'none' | 'battery' | 'liquid' 等
}

export interface JoomApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Joom API クライアント
 */
export class JoomApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor() {}

  /**
   * 認証情報を取得
   */
  private async getCredentials() {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'JOOM',
        isActive: true,
      },
    });

    if (!credential) {
      throw new Error('Joom credentials not configured');
    }

    return credential.credentials as {
      clientId: string;
      clientSecret: string;
      accessToken?: string;
      refreshToken?: string;
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

    // 既存のアクセストークンがあればそれを使う
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      return this.accessToken;
    }

    // OAuth認証フロー（本番では実装）
    // Joomは通常、マーチャントポータルでトークンを取得
    throw new Error('Joom access token not configured. Please set up in marketplace credentials.');
  }

  /**
   * Phase 45: APIリクエストをDBに記録
   */
  private async logApiCall(
    method: string,
    endpoint: string,
    requestBody: any,
    statusCode: number | null,
    responseBody: any,
    success: boolean,
    errorMessage: string | null,
    duration: number,
    joomProductId?: string,
    productId?: string
  ): Promise<void> {
    try {
      await prisma.joomApiLog.create({
        data: {
          method,
          endpoint,
          requestBody,
          statusCode,
          responseBody,
          joomProductId,
          productId,
          success,
          errorMessage,
          duration,
        },
      });
    } catch (err) {
      log.error({ type: 'joom_api_log_error', error: (err as Error).message });
    }
  }

  /**
   * APIリクエスト（レート制限・リトライ付き）
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    options?: { joomProductId?: string; productId?: string }
  ): Promise<JoomApiResponse<T>> {
    const startTime = Date.now();
    const token = await this.ensureAccessToken();
    // Normalize legacy/query-style endpoints to v3 path-style when needed
    const effectiveEndpoint = this.normalizeEndpoint(endpoint);
    const url = `${JOOM_API_BASE}${effectiveEndpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    log.debug({
      type: 'joom_api_request',
      method,
      endpoint: effectiveEndpoint,
    });

    try {
      return await withRetry(async () => {
        await joomRateLimiter.acquire();

        const response = await safeFetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          timeout: 30000,
        });

        // レスポンスボディを取得（JSONでない場合もハンドル）
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          // JSONパースに失敗した場合
          data = { message: responseText || 'Unknown error', code: 'PARSE_ERROR' };
        }

        const duration = Date.now() - startTime;

        if (!response.ok) {
          // Phase 45: エラー時もログ記録
          await this.logApiCall(
            method, effectiveEndpoint, body, response.status, data,
            false, data.message || 'Unknown error', duration,
            options?.joomProductId, options?.productId
          );

          // レート制限エラーの場合はリトライ可能としてスロー
          if (response.status === 429) {
            throw new RateLimitError(
              data.message || 'Rate limit exceeded'
            );
          }

          // 5xxエラーもリトライ可能
          if (response.status >= 500) {
            throw new ApiError(
              data.message || 'Server error',
              response.status,
              data.code
            );
          }

          log.error({
            type: 'joom_api_error',
            status: response.status,
            error: data,
          });

          // エラーコードの正規化（特に product_already_exists を検出）
          const rawCode = typeof data.code === 'string' ? data.code.toLowerCase() : String(data.code || '').toLowerCase();
          const rawMessage = typeof data.message === 'string' ? data.message.toLowerCase() : String(data.message || '').toLowerCase();
          const isAlreadyExists = rawCode.includes('already_exists') || rawMessage.includes('already_exists') || rawMessage.includes('already exists');

          return {
            success: false,
            error: isAlreadyExists
              ? {
                  code: 'PRODUCT_ALREADY_EXISTS',
                  message: data.message || 'Product already exists',
                }
              : {
                  code: data.code || 'UNKNOWN',
                  message: data.message || 'Unknown error',
                },
          } as JoomApiResponse<T>;
        }

        // Joom APIのレスポンスは { code: 0, data: { id: "..." } } 形式
        // data.data から実際のデータを取り出す
        const actualData = data.data || data;

        // Phase 45: 成功時もログ記録
        await this.logApiCall(
          method, effectiveEndpoint, body, response.status, actualData,
          true, null, duration,
          options?.joomProductId || actualData?.id, options?.productId
        );

        return {
          success: true,
          data: actualData,
        } as JoomApiResponse<T>;
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Phase 45: 例外時もログ記録
      await this.logApiCall(
        method, effectiveEndpoint, body, null, null,
        false, error.message, duration,
        options?.joomProductId, options?.productId
      );

      log.error({
        type: 'joom_api_exception',
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
   * Normalize legacy query-form endpoints to v3 path style.
   * Example: 
   *  - '/orders?id=123' -> '/orders/123'
   */
  private normalizeEndpoint(endpoint: string): string {
    try {
      const [path, query = ''] = endpoint.split('?');
      if (path === '/orders' && query) {
        const params = new URLSearchParams(query);
        const id = params.get('id');
        if (id) {
          return `/orders/${encodeURIComponent(id)}`;
        }
      }
    } catch {
      // fall through to return original endpoint
    }
    return endpoint;
  }

  /**
   * 商品を作成
   * Joom API v3 では POST /products/create エンドポイントを使用
   */
  async createProduct(product: JoomProduct): Promise<JoomApiResponse<{ id: string }>> {
    log.info({
      type: 'joom_create_product',
      name: product.name,
      price: product.price,
    });

    // Store ID を環境変数から取得（未設定でもエラーにはしない）
    const storeId = process.env.JOOM_STORE_ID;
    if (!storeId) {
      log.warn({ type: 'joom_store_id_missing', message: 'JOOM_STORE_ID env is not set' });
    }

    // Joom API v3 のリクエストボディ形式
    // 注意: priceフィールドは文字列型
    const shippingPrice = product.shipping?.price || 0;
    const parentSku = product.parentSku || product.sku;
    const variantSku = `${parentSku}-V1`;  // バリアントSKUは親SKUと異なる必要あり
    const imageUrl = product.mainImage;

    const requestBody = {
      // トップレベル（商品情報）
      ...(storeId ? { storeId: storeId } : {}),
      name: product.name,
      description: product.description,
      currency: 'USD',
      mainImage: imageUrl,
      extraImages: product.extraImages || [],
      sku: parentSku,
      tags: product.tags || [],
      ...(product.shippingMethod ? { shippingMethod: product.shippingMethod } : { shippingMethod: 'offline' }),
      // 推奨フィールド（値がある場合のみ送信）
      ...(product.brand ? { brand: product.brand } : {}),
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      ...(product.color ? { color: product.color } : {}),
      ...(product.size ? { size: product.size } : {}),
      ...(product.material ? { material: product.material } : {}),
      ...(product.gtin ? { gtin: product.gtin } : {}),
      ...(product.msrp ? { msrp: { amount: String(product.msrp), currency: 'USD' } } : {}),
      ...(product.condition ? { condition: product.condition } : {}),
      ...(product.searchTags?.length ? { searchTags: product.searchTags } : {}),
      // Shipping dimensions（すべて揃っている場合のみ）
      ...(product.shippingLength && product.shippingWidth && product.shippingHeight ? {
        shippingLength: product.shippingLength,
        shippingWidth: product.shippingWidth,
        shippingHeight: product.shippingHeight,
      } : {}),
      ...(product.dangerousKind ? { dangerousKind: product.dangerousKind } : {}),
      // バリアント（1つ）
      variants: [
        {
          sku: variantSku,
          price: String(product.price),
          inventory: product.quantity,
          shippingPrice: String(shippingPrice),
          // shipping_weightはkg単位で送信（未指定時は0.15kg）
          shippingWeight: typeof product.weight === 'number' ? product.weight : 0.15,
          mainImage: imageUrl,
        },
      ],
    };

    // v3 API 固定
    return this.request<{ id: string }>('POST', '/products/create', requestBody);
  }

  /**
   * 商品を更新
   */
  async updateProduct(
    productId: string,
    updates: Partial<JoomProduct>
  ): Promise<JoomApiResponse<{ id: string }>> {
    log.info({
      type: 'joom_update_product',
      productId,
    });

    // Joom API v3 はcamelCaseフィールド名を使用
    const body: Record<string, any> = {};
    if (typeof updates.name !== 'undefined') body.name = updates.name;
    if (typeof updates.description !== 'undefined') body.description = updates.description;
    if (typeof updates.currency !== 'undefined') body.currency = updates.currency;
    if (typeof updates.mainImage !== 'undefined') body.mainImage = updates.mainImage;
    if (typeof updates.extraImages !== 'undefined') body.extraImages = updates.extraImages;
    if (typeof updates.parentSku !== 'undefined') body.parentSku = updates.parentSku;
    if (typeof updates.tags !== 'undefined') body.tags = updates.tags;

    return this.request<{ id: string }>('POST', `/products/update?id=${productId}`, body);
  }

  /**
   * 商品を取得
   */
  async getProduct(productId: string): Promise<JoomApiResponse<JoomProduct>> {
    return this.request<JoomProduct>('GET', `/products/${productId}`);
  }

  /**
   * 商品を有効化（出品）
   */
  async enableProduct(productId: string): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_enable_product',
      productId,
    });

    return this.request<void>('POST', `/products/update?id=${productId}`, {
      enabled: true,
    });
  }

  /**
   * 商品を無効化（取り下げ）
   */
  async disableProduct(productId: string): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_disable_product',
      productId,
    });

    return this.request<void>('POST', `/products/update?id=${productId}`, {
      enabled: false,
    });
  }

  /**
   * 在庫を更新
   */
  async updateInventory(
    productId: string,
    sku: string,
    quantity: number
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_update_inventory',
      productId,
      sku,
      quantity,
    });

    return this.request<void>('PUT', `/products/${productId}/variants/${sku}/inventory`, {
      inventory: quantity,
    });
  }

  /**
   * 価格を更新
   */
  async updatePrice(
    productId: string,
    sku: string,
    price: number
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_update_price',
      productId,
      sku,
      price,
    });

    return this.request<void>('PUT', `/products/${productId}/variants/${sku}/price`, {
      price: String(price),
    });
  }

  /**
   * Phase 40-C: 商品を削除
   */
  async deleteProduct(productId: string): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_delete_product',
      productId,
    });

    return this.request<void>('DELETE', `/products/${productId}`);
  }

  /**
   * Phase 40-C: 商品一覧を取得
   */
  async listProducts(params?: {
    status?: 'enabled' | 'disabled' | 'pending';
    limit?: number;
    offset?: number;
  }): Promise<JoomApiResponse<{ products: JoomProduct[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const endpoint = `/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<{ products: JoomProduct[]; total: number }>('GET', endpoint);
  }

  /**
   * Phase 40-C: 画像をURL経由でアップロード
   */
  async uploadImageByUrl(imageUrl: string): Promise<JoomApiResponse<{ imageId: string; url: string }>> {
    log.info({
      type: 'joom_upload_image',
      imageUrl,
    });

    return this.request<{ imageId: string; url: string }>('POST', '/images', {
      url: imageUrl,
    });
  }

  /**
   * Phase 40-C: 商品に画像を追加
   */
  async addProductImage(
    productId: string,
    imageUrl: string,
    isMain: boolean = false
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_add_product_image',
      productId,
      imageUrl,
      isMain,
    });

    return this.request<void>('POST', `/products/${productId}/images`, {
      url: imageUrl,
      isMain: isMain,
    });
  }

  /**
   * Phase 40-C: 商品の画像を削除
   */
  async removeProductImage(
    productId: string,
    imageId: string
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_remove_product_image',
      productId,
      imageId,
    });

    return this.request<void>('DELETE', `/products/${productId}/images/${imageId}`);
  }

  /**
   * 更新された注文一覧を取得（Joom API v3: GET /orders/multi）
   * @param params.since - RFC3339タイムスタンプ。この時刻以降に更新された注文を取得（必須）
   * @param params.limit - 1ページあたりの取得件数（デフォルト100、最大500）
   */
  async getOrders(params?: {
    since?: string;
    limit?: number;
  }): Promise<JoomApiResponse<{ orders: any[]; total: number }>> {
    const queryParams = new URLSearchParams();
    // sinceがない場合は7日前をデフォルトとする
    const since = params?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    queryParams.set('updatedFrom', since);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/orders/multi?${queryParams.toString()}`;
    return this.request<{ orders: any[]; total: number }>('GET', endpoint);
  }

  /**
   * 未発送の注文一覧を取得（Joom API v3: GET /orders/unfulfilled）
   */
  async getUnfulfilledOrders(params?: {
    limit?: number;
  }): Promise<JoomApiResponse<{ orders: any[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/orders/unfulfilled${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<{ orders: any[]; total: number }>('GET', endpoint);
  }

  /**
   * Phase 41-E: 注文の出荷通知（追跡番号をJoomに送信）
   */
  async shipOrder(
    orderId: string,
    trackingInfo: {
      trackingNumber: string;
      carrier: string;
      shippingProvider?: string;
    }
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_ship_order',
      orderId,
      trackingNumber: trackingInfo.trackingNumber,
      carrier: trackingInfo.carrier,
    });

    // Joom APIの出荷通知エンドポイント
    return this.request<void>('POST', `/orders/${orderId}/fulfill`, {
      trackingNumber: trackingInfo.trackingNumber,
      trackingProvider: trackingInfo.carrier,
      shippingProvider: trackingInfo.shippingProvider || trackingInfo.carrier,
    });
  }

  /**
   * Phase 41-E: 注文詳細を取得
   */
  async getOrder(orderId: string): Promise<JoomApiResponse<any>> {
    return this.request<any>('GET', `/orders?id=${orderId}`);
  }

  /**
   * Phase 41-E: 注文をキャンセル
   */
  async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_cancel_order',
      orderId,
      reason,
    });

    return this.request<void>('POST', `/orders/${orderId}/cancel`, {
      reason,
    });
  }

  /**
   * Phase 40-C: Dry-Runモード（実際にはAPIを呼ばず、シミュレーション結果を返す）
   */
  async dryRunCreateProduct(product: JoomProduct): Promise<{
    wouldCreate: JoomProduct;
    validation: { passed: boolean; warnings: string[] };
    estimatedVisibility: 'high' | 'medium' | 'low';
  }> {
    log.info({
      type: 'joom_dry_run',
      name: product.name,
      price: product.price,
    });

    const warnings: string[] = [];

    // バリデーションチェック
    if (product.name.length < 10) {
      warnings.push('Title is too short (minimum 10 characters recommended)');
    }
    if (product.name.length > 200) {
      warnings.push('Title is too long (maximum 200 characters)');
    }
    if (product.description.length < 50) {
      warnings.push('Description is too short (minimum 50 characters recommended)');
    }
    if (product.price < 1) {
      warnings.push('Price is too low (minimum $1.00)');
    }
    if (product.price > 1000) {
      warnings.push('High-priced items may have lower visibility');
    }
    if (!product.mainImage) {
      warnings.push('Main image is required');
    }
    if ((product.extraImages?.length || 0) < 2) {
      warnings.push('More images recommended for better visibility');
    }

    // SEOスコア計算（簡易版）
    let seoScore = 50;
    if (product.name.length >= 30) seoScore += 10;
    if (product.description.length >= 200) seoScore += 15;
    if ((product.extraImages?.length || 0) >= 3) seoScore += 15;
    if (product.tags && product.tags.length >= 3) seoScore += 10;

    let estimatedVisibility: 'high' | 'medium' | 'low' = 'medium';
    if (seoScore >= 80) estimatedVisibility = 'high';
    else if (seoScore < 50) estimatedVisibility = 'low';

    return {
      wouldCreate: {
        ...product,
        id: `dry-run-${Date.now()}`,
      },
      validation: {
        passed: warnings.length === 0,
        warnings,
      },
      estimatedVisibility,
    };
  }
}

// シングルトンインスタンス
export const joomApi = new JoomApiClient();

// Joom OAuth トークンエンドポイント
const JOOM_TOKEN_URL = 'https://api-merchant.joom.com/api/v2/oauth/access_token';

/**
 * Phase 48: Joom リフレッシュトークンでアクセストークンを更新
 */
export async function refreshJoomToken(): Promise<{
  success: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: {
      marketplace: 'JOOM',
      isActive: true,
    },
  });

  if (!credential) {
    return {
      success: false,
      error: 'Joom credentials not configured',
    };
  }

  const creds = credential.credentials as {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  if (!creds.refreshToken) {
    return {
      success: false,
      error: 'Joom refresh token not available. Re-authorization required.',
    };
  }

  if (!creds.clientId || !creds.clientSecret) {
    return {
      success: false,
      error: 'Joom OAuth configuration incomplete (missing clientId or clientSecret)',
    };
  }

  try {
    const response = await fetch(JOOM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
      }),
    });

    const data = await response.json() as {
      data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      code?: number;
      message?: string;
    };

    if (!response.ok || !data.data?.access_token) {
      log.error({
        type: 'joom_token_refresh_failed',
        status: response.status,
        error: data.message || 'Unknown error',
      });

      return {
        success: false,
        error: data.message || `Token refresh failed with status ${response.status}`,
      };
    }

    // 新しいトークンを保存
    const expiresIn = data.data.expires_in || 3600; // デフォルト1時間
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

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
    });

    log.info({
      type: 'joom_token_refreshed',
      expiresAt,
    });

    // シングルトンインスタンスのキャッシュもクリア
    (joomApi as any).accessToken = data.data.access_token;
    (joomApi as any).tokenExpiresAt = expiresAt;

    return {
      success: true,
      expiresAt,
    };
  } catch (error: any) {
    log.error({
      type: 'joom_token_refresh_exception',
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Joom APIが設定されているか確認
 */
export async function isJoomConfigured(): Promise<boolean> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: {
      marketplace: 'JOOM',
      isActive: true,
    },
  });

  return !!credential;
}

/**
 * Phase 40-C: Joom用の価格を計算
 */
export async function calculateJoomPrice(
  costJpy: number,
  weight: number = 200,
  category?: string
): Promise<{
  finalPriceUsd: number;
  breakdown: {
    costJpy: number;
    costUsd: number;
    shippingCost: number;
    platformFee: number;
    paymentFee: number;
    profit: number;
    exchangeRate: number;
  };
}> {
  // 為替レート取得
  const rateRecord = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });
  const exchangeRate = rateRecord?.rate || 0.0067; // デフォルト: 1円 = 0.0067ドル

  // 価格設定取得
  const priceSetting = await prisma.priceSetting.findFirst({
    where: { marketplace: 'JOOM', isDefault: true },
  });

  const platformFeeRate = priceSetting?.platformFeeRate ?? 0.15;
  const paymentFeeRate = priceSetting?.paymentFeeRate ?? 0.03;
  const profitRate = priceSetting?.targetProfitRate ?? 0.30;

  // 計算
  const costUsd = costJpy * exchangeRate;
  const shippingCost = 5 + (weight * 0.01); // 基本送料 + 重量ベース
  const baseCost = costUsd + shippingCost;
  const totalDeduction = platformFeeRate + paymentFeeRate + profitRate;
  const finalPriceUsd = baseCost / (1 - totalDeduction);

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
  };
}

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
  shipping?: {
    price: number;
    time: string;
  };
  tags?: string[];
  parentSku?: string;
  sku: string;
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
   * APIリクエスト（レート制限・リトライ付き）
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<JoomApiResponse<T>> {
    const token = await this.ensureAccessToken();

    const url = `${JOOM_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    log.debug({
      type: 'joom_api_request',
      method,
      endpoint,
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

        if (!response.ok) {
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

          return {
            success: false,
            error: {
              code: data.code || 'UNKNOWN',
              message: data.message || 'Unknown error',
            },
          } as JoomApiResponse<T>;
        }

        // Joom APIのレスポンスは { code: 0, data: { id: "..." } } 形式
        // data.data から実際のデータを取り出す
        const actualData = data.data || data;
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
   * 商品を作成
   * Joom API v3 では POST /products/create エンドポイントを使用
   */
  async createProduct(product: JoomProduct): Promise<JoomApiResponse<{ id: string }>> {
    log.info({
      type: 'joom_create_product',
      name: product.name,
      price: product.price,
    });

    // Joom API v3 のリクエストボディ形式
    // 注意: priceフィールドは文字列型、画像URLは複数形式で送信
    const shippingPrice = product.shipping?.price || 0;
    const parentSku = product.parentSku || product.sku;
    const variantSku = `${parentSku}-V1`;  // バリアントSKUは親SKUと異なる必要あり
    const imageUrl = product.mainImage;

    const requestBody = {
      name: product.name,
      description: product.description,
      // 画像URL: 複数形式で送信（APIが認識するフィールドを確保）
      orig_main_image_url: imageUrl,
      origMainImageUrl: imageUrl,
      mainImage: imageUrl,
      main_image: imageUrl,
      extra_images: product.extraImages || [],  // 文字列配列
      sku: parentSku,
      parent_sku: parentSku,
      tags: product.tags || [],
      variants: [
        {
          sku: variantSku,
          price: String(product.price),
          inventory: product.quantity,
          shippingPrice: String(shippingPrice),
          shippingWeight: 200,  // 重量（グラム）- 必須
          // バリアントにも画像URL
          origMainImageUrl: imageUrl,
          mainImage: imageUrl,
        },
      ],
    };

    // まず /products/create を試す（v3形式）
    let response = await this.request<{ id: string }>('POST', '/products/create', requestBody);

    // 404の場合は /products を試す（v2形式）
    if (!response.success && response.error?.code === 'NETWORK_ERROR' &&
        response.error?.message?.includes('Not Found')) {
      log.info({ type: 'joom_api_fallback', from: '/products/create', to: '/products' });
      response = await this.request<{ id: string }>('POST', '/products', requestBody);
    }

    return response;
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

    return this.request<{ id: string }>('PUT', `/products/${productId}`, updates);
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

    return this.request<void>('POST', `/products/${productId}/enable`);
  }

  /**
   * 商品を無効化（取り下げ）
   */
  async disableProduct(productId: string): Promise<JoomApiResponse<void>> {
    log.info({
      type: 'joom_disable_product',
      productId,
    });

    return this.request<void>('POST', `/products/${productId}/disable`);
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
      price,
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
      is_main: isMain,
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
   * Phase 40-C: 注文一覧を取得
   */
  async getOrders(params?: {
    status?: string;
    since?: string;
    limit?: number;
  }): Promise<JoomApiResponse<{ orders: any[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.since) queryParams.set('since', params.since);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
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
      tracking_number: trackingInfo.trackingNumber,
      tracking_provider: trackingInfo.carrier,
      shipping_provider: trackingInfo.shippingProvider || trackingInfo.carrier,
    });
  }

  /**
   * Phase 41-E: 注文詳細を取得
   */
  async getOrder(orderId: string): Promise<JoomApiResponse<any>> {
    return this.request<any>('GET', `/orders/${orderId}`);
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

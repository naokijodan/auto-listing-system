import { prisma } from '@als/database';
import { logger } from '@als/logger';

const log = logger.child({ module: 'joom-api' });

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

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
   * APIリクエスト
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
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
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
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      log.error({
        type: 'joom_api_exception',
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
   * 商品を作成
   */
  async createProduct(product: JoomProduct): Promise<JoomApiResponse<{ id: string }>> {
    log.info({
      type: 'joom_create_product',
      name: product.name,
      price: product.price,
    });

    return this.request<{ id: string }>('POST', '/products', {
      name: product.name,
      description: product.description,
      main_image: product.mainImage,
      extra_images: product.extraImages || [],
      parent_sku: product.parentSku || product.sku,
      variants: [
        {
          sku: product.sku,
          price: product.price,
          inventory: product.quantity,
          shipping: product.shipping || {
            price: 0,
            time: '15-30',
          },
        },
      ],
      tags: product.tags || [],
    });
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
}

// シングルトンインスタンス
export const joomApi = new JoomApiClient();

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

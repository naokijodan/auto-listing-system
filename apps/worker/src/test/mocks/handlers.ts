import { http, HttpResponse } from 'msw';

// eBay Sandbox API Base URL
const EBAY_SANDBOX_API = 'https://api.sandbox.ebay.com';
const EBAY_SANDBOX_AUTH = 'https://auth.sandbox.ebay.com';

// Joom API Base URL
const JOOM_API = 'https://api-merchant.joom.com/api/v3';

// 外部API
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com';

export const handlers = [
  // ========================================
  // eBay OAuth
  // ========================================
  http.post(`${EBAY_SANDBOX_AUTH}/identity/v1/oauth2/token`, async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const grantType = params.get('grant_type');

    // リフレッシュトークン
    if (grantType === 'refresh_token') {
      const refreshToken = params.get('refresh_token');
      if (!refreshToken || refreshToken === 'invalid_token') {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid refresh token' },
          { status: 400 }
        );
      }

      return HttpResponse.json({
        access_token: 'test-access-token-refreshed',
        expires_in: 7200,
        token_type: 'Bearer',
      });
    }

    // クライアント認証
    if (grantType === 'client_credentials') {
      return HttpResponse.json({
        access_token: 'test-access-token',
        expires_in: 7200,
        token_type: 'Bearer',
      });
    }

    return HttpResponse.json(
      { error: 'unsupported_grant_type' },
      { status: 400 }
    );
  }),

  // ========================================
  // eBay Inventory API
  // ========================================

  // GET inventory item
  http.get(`${EBAY_SANDBOX_API}/sell/inventory/v1/inventory_item/:sku`, ({ params }) => {
    const { sku } = params;

    if (sku === 'NON-EXISTENT-SKU') {
      return HttpResponse.json(
        {
          errors: [
            {
              errorId: 25702,
              domain: 'API_INVENTORY',
              subdomain: 'Selling',
              category: 'REQUEST',
              message: 'The specified SKU does not exist.',
            },
          ],
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      sku,
      locale: 'en_US',
      product: {
        title: `Test Product ${sku}`,
        description: 'Test Description',
        imageUrls: ['https://example.com/image.jpg'],
      },
      condition: 'NEW',
      availability: {
        shipToLocationAvailability: {
          quantity: 10,
        },
      },
    });
  }),

  // PUT inventory item (create/update)
  http.put(`${EBAY_SANDBOX_API}/sell/inventory/v1/inventory_item/:sku`, async ({ params, request }) => {
    const { sku } = params;
    const body = await request.json();

    // バリデーションエラーのシミュレーション
    if (!body.product?.title) {
      return HttpResponse.json(
        {
          errors: [
            {
              errorId: 25001,
              domain: 'API_INVENTORY',
              category: 'REQUEST',
              message: 'Product title is required.',
            },
          ],
        },
        { status: 400 }
      );
    }

    // 成功 (204 No Content)
    return new HttpResponse(null, { status: 204 });
  }),

  // POST offer
  http.post(`${EBAY_SANDBOX_API}/sell/inventory/v1/offer`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (!body.sku || !body.categoryId) {
      return HttpResponse.json(
        {
          errors: [
            {
              errorId: 25001,
              domain: 'API_INVENTORY',
              category: 'REQUEST',
              message: 'SKU and categoryId are required.',
            },
          ],
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      offerId: `OFFER-${Date.now()}`,
    });
  }),

  // POST publish offer
  http.post(`${EBAY_SANDBOX_API}/sell/inventory/v1/offer/:offerId/publish`, ({ params }) => {
    const { offerId } = params;

    return HttpResponse.json({
      listingId: `LISTING-${offerId}-${Date.now()}`,
    });
  }),

  // POST withdraw offer
  http.post(`${EBAY_SANDBOX_API}/sell/inventory/v1/offer/:offerId/withdraw`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST update availability
  http.post(`${EBAY_SANDBOX_API}/sell/inventory/v1/inventory_item/:sku/update_availability`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const availability = body.shipToLocationAvailability as Record<string, unknown> | undefined;

    if (!availability?.quantity && availability?.quantity !== 0) {
      return HttpResponse.json(
        {
          errors: [
            {
              errorId: 25001,
              domain: 'API_INVENTORY',
              category: 'REQUEST',
              message: 'Quantity is required.',
            },
          ],
        },
        { status: 400 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // PUT offer (update price)
  http.put(`${EBAY_SANDBOX_API}/sell/inventory/v1/offer/:offerId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ========================================
  // Exchange Rate API
  // ========================================
  http.get(`${EXCHANGE_RATE_API}/v4/latest/USD`, () => {
    return HttpResponse.json({
      base: 'USD',
      date: '2025-02-05',
      rates: {
        JPY: 150.0,
        EUR: 0.92,
        GBP: 0.79,
      },
    });
  }),

  // ========================================
  // Joom API
  // ========================================
  http.post(`${JOOM_API}/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (!body.name) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Product name is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      id: `joom-product-${Date.now()}`,
    });
  }),

  http.put(`${JOOM_API}/products/:productId`, async ({ params }) => {
    const { productId } = params;
    return HttpResponse.json({ id: productId });
  }),

  http.get(`${JOOM_API}/products/:productId`, async ({ params }) => {
    const { productId } = params;

    if (productId === 'non-existent') {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      id: productId,
      name: 'Test Product',
      price: 29.99,
    });
  }),

  http.post(`${JOOM_API}/products/:productId/enable`, () => {
    return HttpResponse.json({});
  }),

  http.post(`${JOOM_API}/products/:productId/disable`, () => {
    return HttpResponse.json({});
  }),

  http.put(`${JOOM_API}/products/:productId/variants/:sku/inventory`, () => {
    return HttpResponse.json({});
  }),

  http.put(`${JOOM_API}/products/:productId/variants/:sku/price`, () => {
    return HttpResponse.json({});
  }),
];

// エラーハンドラー（テスト用）
export const errorHandlers = {
  ebayAuthFailure: http.post(`${EBAY_SANDBOX_AUTH}/identity/v1/oauth2/token`, () => {
    return HttpResponse.json(
      { error: 'invalid_client', error_description: 'Client authentication failed' },
      { status: 401 }
    );
  }),

  ebayRateLimit: http.get(`${EBAY_SANDBOX_API}/sell/inventory/v1/*`, () => {
    return HttpResponse.json(
      {
        errors: [
          {
            errorId: 20200,
            domain: 'API_INVENTORY',
            category: 'REQUEST',
            message: 'Too many requests. Please try again later.',
          },
        ],
      },
      { status: 429 }
    );
  }),

  networkError: http.put(`${EBAY_SANDBOX_API}/sell/inventory/v1/inventory_item/:sku`, () => {
    return HttpResponse.error();
  }),
};

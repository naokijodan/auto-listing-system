import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RAKUDA API',
      version,
      description: `
## 越境EC自動出品システム API

RAKUDAは日本の仕入れサイト（メルカリ、ヤフオク、楽天など）から商品を取得し、
海外マーケットプレイス（eBay、Joom）に自動出品するシステムです。

### 認証
APIキーをヘッダーに含めて認証します：
\`\`\`
X-API-Key: your-api-key
\`\`\`

### レート制限
- スクレイピング: 10件/分
- 翻訳: 20件/分
- 出品: 5件/分

### エラーレスポンス
すべてのエラーは以下の形式で返されます：
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
\`\`\`
      `,
      contact: {
        name: 'RAKUDA Support',
      },
      license: {
        name: 'Private',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.rakuda.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Health', description: 'ヘルスチェックエンドポイント' },
      { name: 'Products', description: '商品管理' },
      { name: 'Listings', description: '出品管理' },
      { name: 'Orders', description: '注文管理' },
      { name: 'Analytics', description: '分析・レポート' },
      { name: 'Pricing', description: '価格設定・計算' },
      { name: 'Inventory', description: '在庫管理' },
      { name: 'Jobs', description: 'ジョブ管理' },
      { name: 'Categories', description: 'カテゴリマッピング' },
      { name: 'Notifications', description: '通知管理' },
      { name: 'Admin', description: '管理機能' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API認証キー',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input data' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            limit: { type: 'integer', example: 20 },
            offset: { type: 'integer', example: 0 },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'ヴィンテージ腕時計' },
            titleEn: { type: 'string', example: 'Vintage Watch' },
            price: { type: 'number', example: 15000 },
            currency: { type: 'string', example: 'JPY' },
            sourceType: {
              type: 'string',
              enum: ['mercari', 'yahoo_auction', 'yahoo_flea', 'rakuma', 'rakuten', 'amazon'],
            },
            sourceUrl: { type: 'string', format: 'uri' },
            status: {
              type: 'string',
              enum: ['PENDING_SCRAPE', 'PROCESSING_IMAGE', 'TRANSLATING', 'READY_TO_REVIEW', 'APPROVED', 'PUBLISHING', 'ACTIVE', 'SOLD', 'OUT_OF_STOCK', 'ERROR', 'DELETED'],
            },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
            category: { type: 'string' },
            brand: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            marketplace: { type: 'string', enum: ['EBAY', 'JOOM'] },
            marketplaceListingId: { type: 'string' },
            title: { type: 'string' },
            listingPrice: { type: 'number', example: 99.99 },
            currency: { type: 'string', example: 'USD' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_PUBLISH', 'PUBLISHING', 'ACTIVE', 'PAUSED', 'SOLD', 'ENDED', 'ERROR'],
            },
            listedAt: { type: 'string', format: 'date-time' },
            soldAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            listingId: { type: 'string', format: 'uuid' },
            marketplace: { type: 'string', enum: ['EBAY', 'JOOM'] },
            marketplaceOrderId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
            },
            totalPrice: { type: 'number' },
            currency: { type: 'string' },
            buyerName: { type: 'string' },
            shippingAddress: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        KPI: {
          type: 'object',
          properties: {
            totalProducts: { type: 'integer' },
            totalListings: { type: 'integer' },
            activeListings: { type: 'integer' },
            soldToday: { type: 'integer' },
            soldThisWeek: { type: 'integer' },
            soldThisMonth: { type: 'integer' },
            revenue: {
              type: 'object',
              properties: {
                today: { type: 'number' },
                thisWeek: { type: 'number' },
                thisMonth: { type: 'number' },
              },
            },
            healthScore: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: '認証エラー',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
              },
            },
          },
        },
        NotFound: {
          description: 'リソースが見つかりません',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resource not found' },
              },
            },
          },
        },
        BadRequest: {
          description: '不正なリクエスト',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
              },
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

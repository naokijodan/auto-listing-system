# Phase 12: テスト基盤 & Sandbox連携

## 概要

3者協議（Claude/GPT-5/Gemini）の合意に基づく実装計画。
「モックだけのテスト」ではなく、**Sandbox連携 + VCRパターン**で堅牢なテスト基盤を構築する。

## 目標

- テストカバレッジ 80%以上
- eBay Sandbox環境での動作確認
- CI/CDでの安定したテスト実行
- 縦切りスライスで「認証→在庫→出品」の最短フローを検証

---

## Task 1: テスト基盤構築

### 1.1 テストツールのセットアップ

```bash
# 依存関係
npm install -D vitest @vitest/coverage-v8 @vitest/ui
npm install -D msw@latest  # Mock Service Worker (VCRパターン)
npm install -D supertest   # API統合テスト
npm install -D @playwright/test  # E2Eテスト
```

### 1.2 設定ファイル

**vitest.config.ts** (各app/packageに作成)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### 1.3 MSW (Mock Service Worker) セットアップ

```typescript
// apps/worker/src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // eBay Sandbox API
  http.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', () => {
    return HttpResponse.json({
      access_token: 'test-access-token',
      expires_in: 7200,
      token_type: 'Bearer',
    });
  }),

  // 他のAPIハンドラー...
];
```

### 1.4 ディレクトリ構造

```
apps/
├── api/
│   └── src/
│       └── test/
│           ├── setup.ts
│           ├── mocks/
│           │   └── handlers.ts
│           ├── unit/
│           │   └── *.test.ts
│           └── integration/
│               └── *.test.ts
├── worker/
│   └── src/
│       └── test/
│           ├── setup.ts
│           ├── mocks/
│           │   ├── handlers.ts
│           │   └── recordings/  # VCR録画データ
│           ├── unit/
│           └── integration/
└── web/
    └── src/
        └── test/
            └── e2e/
                └── *.spec.ts
```

---

## Task 2: 環境設定の整備

### 2.1 Config モジュールの拡張

```typescript
// packages/config/src/index.ts
export const config = {
  env: process.env.NODE_ENV || 'development',

  ebay: {
    mode: process.env.EBAY_MODE || 'sandbox', // 'sandbox' | 'production'
    sandbox: {
      apiUrl: 'https://api.sandbox.ebay.com',
      authUrl: 'https://auth.sandbox.ebay.com',
    },
    production: {
      apiUrl: 'https://api.ebay.com',
      authUrl: 'https://auth.ebay.com',
    },
  },

  joom: {
    mode: process.env.JOOM_MODE || 'sandbox',
    sandbox: {
      apiUrl: 'https://api-merchant.sandbox.joom.com',
    },
    production: {
      apiUrl: 'https://api-merchant.joom.com',
    },
  },

  test: {
    useRecordings: process.env.TEST_USE_RECORDINGS === 'true',
    recordMode: process.env.TEST_RECORD_MODE === 'true',
  },
};
```

### 2.2 環境変数の追加

```bash
# .env.test
NODE_ENV=test
EBAY_MODE=sandbox
JOOM_MODE=sandbox
TEST_USE_RECORDINGS=true
TEST_RECORD_MODE=false
```

---

## Task 3: 縦切りスライス - eBay認証

### 3.1 eBay OAuth テスト

```typescript
// apps/worker/src/test/integration/ebay-auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { ebayHandlers } from '../mocks/handlers';
import { EbayApi } from '../../lib/ebay-api';

const server = setupServer(...ebayHandlers);

describe('eBay Authentication', () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());

  it('should obtain access token using client credentials', async () => {
    const ebay = new EbayApi();
    const token = await ebay.getAccessToken();

    expect(token).toBeDefined();
    expect(token.access_token).toBeTruthy();
    expect(token.expires_in).toBeGreaterThan(0);
  });

  it('should refresh token before expiry', async () => {
    const ebay = new EbayApi();
    await ebay.getAccessToken();

    // トークンがキャッシュされていることを確認
    const cachedToken = await ebay.getAccessToken();
    expect(cachedToken).toBeDefined();
  });

  it('should handle authentication errors gracefully', async () => {
    // エラーハンドラーを設定
    server.use(
      http.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', () => {
        return HttpResponse.json(
          { error: 'invalid_client' },
          { status: 401 }
        );
      })
    );

    const ebay = new EbayApi();
    await expect(ebay.getAccessToken()).rejects.toThrow();
  });
});
```

### 3.2 eBay API クラスのリファクタリング

```typescript
// apps/worker/src/lib/ebay-api.ts
import { config } from '@rakuda/config';

export class EbayApi {
  private baseUrl: string;
  private authUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    const mode = config.ebay.mode;
    this.baseUrl = config.ebay[mode].apiUrl;
    this.authUrl = config.ebay[mode].authUrl;
  }

  async getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    // キャッシュチェック
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return { access_token: this.accessToken, expires_in: 0 };
    }

    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.getBasicAuth()}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`eBay auth failed: ${error.error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

    return data;
  }

  private getBasicAuth(): string {
    const clientId = process.env.EBAY_CLIENT_ID || '';
    const clientSecret = process.env.EBAY_CLIENT_SECRET || '';
    return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  // 在庫確認API
  async getInventoryItem(sku: string): Promise<any> {
    await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get inventory: ${response.status}`);
    }

    return response.json();
  }
}
```

---

## Task 4: 縦切りスライス - 在庫確認

### 4.1 在庫確認テスト

```typescript
// apps/worker/src/test/integration/ebay-inventory.test.ts
import { describe, it, expect } from 'vitest';
import { EbayApi } from '../../lib/ebay-api';

describe('eBay Inventory', () => {
  it('should get inventory item by SKU', async () => {
    const ebay = new EbayApi();
    const item = await ebay.getInventoryItem('TEST-SKU-001');

    expect(item).toBeDefined();
    expect(item.sku).toBe('TEST-SKU-001');
  });

  it('should return null for non-existent SKU', async () => {
    const ebay = new EbayApi();
    const item = await ebay.getInventoryItem('NON-EXISTENT-SKU');

    expect(item).toBeNull();
  });

  it('should create inventory item', async () => {
    const ebay = new EbayApi();
    const result = await ebay.createInventoryItem('NEW-SKU-001', {
      availability: {
        shipToLocationAvailability: {
          quantity: 10,
        },
      },
      condition: 'NEW',
      product: {
        title: 'Test Product',
        description: 'Test Description',
      },
    });

    expect(result.success).toBe(true);
  });
});
```

---

## Task 5: CI/CD 統合

### 5.1 GitHub Actions 更新

```yaml
# .github/workflows/ci.yml (更新)
jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        # ...
      redis:
        image: redis:7-alpine
        # ...

    steps:
      # ... 既存のステップ ...

      - name: Run unit tests
        run: npm run test:unit
        env:
          TEST_USE_RECORDINGS: 'true'

      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_USE_RECORDINGS: 'true'
          # Sandboxテストは週1回だけ実行（コスト/安定性）

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

### 5.2 package.json スクリプト追加

```json
{
  "scripts": {
    "test": "turbo run test",
    "test:unit": "turbo run test:unit",
    "test:integration": "turbo run test:integration",
    "test:e2e": "turbo run test:e2e",
    "test:coverage": "turbo run test -- --coverage",
    "test:record": "TEST_RECORD_MODE=true npm run test:integration"
  }
}
```

---

## Task 6: 主要ドメインの単体テスト

### 6.1 テスト対象（優先順位順）

1. **価格計算** (`apps/worker/src/lib/price-calculator.ts`)
   - 為替計算
   - 利益率計算
   - 送料込み価格

2. **レート制限** (`apps/worker/src/lib/rate-limiter.ts`)
   - サイト別制限
   - スライディングウィンドウ

3. **在庫チェッカー** (`apps/worker/src/lib/inventory-checker.ts`)
   - 在庫状態判定
   - 価格変動検知

4. **スクレイパー** (`apps/worker/src/lib/scrapers/*.ts`)
   - HTML解析
   - データ抽出

### 6.2 テストファイル例

```typescript
// apps/worker/src/test/unit/price-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { PriceCalculator } from '../../lib/price-calculator';

describe('PriceCalculator', () => {
  const calculator = new PriceCalculator();

  describe('calculateSellingPrice', () => {
    it('should calculate with 30% profit margin', () => {
      const result = calculator.calculateSellingPrice({
        costJpy: 1000,
        exchangeRate: 150,
        profitMargin: 0.3,
        shippingCost: 500,
      });

      // (1000 + 500) / 150 * 1.3 = 13.0 USD
      expect(result.priceUsd).toBeCloseTo(13.0, 1);
    });

    it('should handle zero shipping cost', () => {
      const result = calculator.calculateSellingPrice({
        costJpy: 1500,
        exchangeRate: 150,
        profitMargin: 0.2,
        shippingCost: 0,
      });

      expect(result.priceUsd).toBeCloseTo(12.0, 1);
    });
  });
});
```

---

## 実行順序

| 順序 | タスク | 成果物 | 見積もり |
|------|--------|--------|----------|
| 1 | Task 1: テスト基盤構築 | vitest, msw設定 | - |
| 2 | Task 2: 環境設定整備 | config拡張, .env.test | - |
| 3 | Task 6: 単体テスト | 主要4ドメインのテスト | - |
| 4 | Task 3: eBay認証テスト | 認証フローの検証 | - |
| 5 | Task 4: 在庫確認テスト | Inventory APIの検証 | - |
| 6 | Task 5: CI/CD統合 | workflows更新 | - |

---

## 完了条件

- [ ] テストカバレッジ 80%以上
- [ ] CI/CDでテストが安定実行
- [ ] eBay Sandbox認証が成功
- [ ] VCRパターンでレスポンス記録完了
- [ ] 主要ドメイン（価格、レート制限、在庫、スクレイパー）のテスト完了

---

## 次のフェーズ（Phase 13）

Phase 12完了後：
1. eBay/Joom 本番API実装
2. 本番デプロイ準備
3. Chrome拡張機能完成

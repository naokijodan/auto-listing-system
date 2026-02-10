# Phase 45: eBay連携設計書

**作成日**: 2026-02-10
**ステータス**: 設計完了・実装待ち
**前提**: Phase 44で判明したJoom価格制限（¥900,000超）の回避策

---

## 1. 概要

### 1.1 目的

高価格帯商品（¥900,000超）をeBayに専用出品することで、Joomの価格制限を回避し、高級時計・ブランド品の越境販売を実現する。

### 1.2 背景

Phase 44のカナリアリリースで以下が判明:
- **Joom価格上限**: ¥900,000（約$6,000）を超える商品は出品エラー
- **影響**: 高級時計（Patek Philippe、Rolex Submariner等）がJoomで出品不可
- **対策**: eBayには価格上限がないため、高価格帯商品専用チャネルとして活用

### 1.3 対象商品

| 価格帯 | マーケットプレイス | 備考 |
|--------|-------------------|------|
| ¥900,000以下 | Joom | 既存フロー（Phase 40完了） |
| ¥900,000超 | eBay専用 | 本Phase対象 |
| 任意 | eBay + Joom並行出品 | Phase 46以降で検討 |

---

## 2. アーキテクチャ

### 2.1 価格ベースルーティング

```
┌─────────────────────────────────────────────────────────────┐
│                    商品出品ルーター                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │  価格チェック     │
                 │  price > ¥900K?  │
                 └────────┬────────┘
                          │
            ┌─────────────┴─────────────┐
            │ No                        │ Yes
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │   Joomフロー   │           │  eBayフロー    │
    │  (Phase 40)   │           │  (Phase 45)   │
    └───────────────┘           └───────────────┘
            │                           │
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │  Joom出品      │           │ eBay出品       │
    │  ワーカー      │           │ ワーカー       │
    └───────────────┘           └───────────────┘
```

### 2.2 eBay出品フロー（Inventory API + Offer API）

eBayのモダンAPI（Inventory API）は2段階の出品プロセスを採用:

```
┌─────────────────────────────────────────────────────────────┐
│                    eBay出品パイプライン                       │
└─────────────────────────────────────────────────────────────┘

[商品データ準備]
      │
      ▼
┌─────────────────┐
│ 1. 翻訳・属性抽出  │ ← 既存enrichmentエンジン流用
│    (Phase 40共通) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. カテゴリマッピング │ ← eBay Taxonomy API
│    ItemSpecifics抽出 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Inventory Item │ ← PUT /sell/inventory/v1/inventory_item/{sku}
│    作成/更新      │   商品情報・画像・コンディション
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Offer作成      │ ← POST /sell/inventory/v1/offer
│    価格・ポリシー  │   価格・数量・配送/支払/返品ポリシー
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Offer公開      │ ← POST /sell/inventory/v1/offer/{offerId}/publish
│    出品開始       │   実際のeBay出品として公開
└────────┬────────┘
         │
         ▼
      [完了]
```

### 2.3 ディレクトリ構成

```
apps/api/src/services/
├── ebay/
│   ├── client.ts           # eBay API クライアント（既存拡張）
│   ├── inventory.ts        # Inventory Item管理
│   ├── offer.ts            # Offer作成・公開
│   ├── policies.ts         # ポリシー取得
│   └── orders.ts           # 注文同期（既存）
├── enrichment/
│   ├── ebay-mapper.ts      # eBay固有の属性マッピング
│   └── ... (既存)
└── routing/
    └── marketplace-router.ts  # 価格ベースルーティング

apps/worker/src/workers/
├── ebay-publish-worker.ts  # eBay出品ワーカー（新規）
└── ... (既存)
```

---

## 3. 実装計画

### Phase 45A: eBay出品ロジック

**目標**: Inventory API + Offer APIによる出品基盤構築

| タスク | 説明 | 優先度 |
|--------|------|--------|
| 45A-1 | `ebay/inventory.ts` - Inventory Item CRUD | 高 |
| 45A-2 | `ebay/offer.ts` - Offer作成・公開 | 高 |
| 45A-3 | `ebay-publish-worker.ts` - BullMQワーカー | 高 |
| 45A-4 | `ebay-mapper.ts` - eBay ItemSpecifics抽出 | 中 |
| 45A-5 | ポリシー自動選択ロジック | 中 |

**主要実装**:

```typescript
// apps/api/src/services/ebay/inventory.ts

interface EbayInventoryItem {
  sku: string;
  product: {
    title: string;
    description: string;
    aspects: Record<string, string[]>;  // ItemSpecifics
    imageUrls: string[];
  };
  condition: string;  // NEW, USED_EXCELLENT, etc.
  conditionDescription?: string;
}

async function createOrUpdateInventoryItem(item: EbayInventoryItem) {
  // PUT /sell/inventory/v1/inventory_item/{sku}
  return ebayApi.createOrUpdateInventoryItem(item.sku, {
    title: item.product.title,
    description: item.product.description,
    aspects: item.product.aspects,
    imageUrls: item.product.imageUrls,
    condition: item.condition,
    conditionDescription: item.conditionDescription,
  });
}
```

```typescript
// apps/api/src/services/ebay/offer.ts

interface EbayOfferInput {
  sku: string;
  marketplaceId: string;  // EBAY_US
  categoryId: string;
  price: number;
  currency: string;
  quantity: number;
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
}

async function createAndPublishOffer(input: EbayOfferInput) {
  // 1. Offer作成
  const offerResult = await ebayApi.createOffer(input.sku, {
    marketplaceId: input.marketplaceId,
    format: 'FIXED_PRICE',
    categoryId: input.categoryId,
    pricingPrice: input.price,
    pricingCurrency: input.currency,
    quantity: input.quantity,
    fulfillmentPolicyId: input.fulfillmentPolicyId,
    paymentPolicyId: input.paymentPolicyId,
    returnPolicyId: input.returnPolicyId,
  });

  if (!offerResult.success || !offerResult.data?.offerId) {
    throw new Error(`Offer creation failed: ${offerResult.error?.message}`);
  }

  // 2. 公開
  const publishResult = await ebayApi.publishOffer(offerResult.data.offerId);

  return {
    offerId: offerResult.data.offerId,
    listingId: publishResult.data?.listingId,
  };
}
```

### Phase 45B: 価格ルーティング

**目標**: 価格に基づくマーケットプレイス自動選択

| タスク | 説明 | 優先度 |
|--------|------|--------|
| 45B-1 | `marketplace-router.ts` - ルーティングロジック | 高 |
| 45B-2 | 既存出品フローへの統合 | 高 |
| 45B-3 | 設定画面（価格閾値変更） | 低 |

**主要実装**:

```typescript
// apps/api/src/services/routing/marketplace-router.ts

const JOOM_PRICE_LIMIT_JPY = 900000;

interface RoutingDecision {
  marketplace: 'JOOM' | 'EBAY';
  reason: string;
  canListOnJoom: boolean;
  canListOnEbay: boolean;
}

function determineMarketplace(
  priceJpy: number,
  category?: string,
  options?: { preferEbay?: boolean }
): RoutingDecision {
  const canListOnJoom = priceJpy <= JOOM_PRICE_LIMIT_JPY;
  const canListOnEbay = true;  // eBayには価格上限なし

  if (!canListOnJoom) {
    return {
      marketplace: 'EBAY',
      reason: `Price ¥${priceJpy.toLocaleString()} exceeds Joom limit (¥${JOOM_PRICE_LIMIT_JPY.toLocaleString()})`,
      canListOnJoom,
      canListOnEbay,
    };
  }

  if (options?.preferEbay) {
    return {
      marketplace: 'EBAY',
      reason: 'User preference: eBay',
      canListOnJoom,
      canListOnEbay,
    };
  }

  return {
    marketplace: 'JOOM',
    reason: 'Default: Joom (price within limit)',
    canListOnJoom,
    canListOnEbay,
  };
}
```

### Phase 45C: Webhook連携

**目標**: eBay注文・在庫変更のリアルタイム同期

| タスク | 説明 | 優先度 |
|--------|------|--------|
| 45C-1 | eBay Notification API設定 | 高 |
| 45C-2 | Webhookエンドポイント実装 | 高 |
| 45C-3 | 注文同期ワーカー（既存拡張） | 中 |
| 45C-4 | 在庫同期ワーカー | 中 |

**Webhook設定**:

eBay Notification API（Marketplace Account Deletion Notificationなど）をサブスクライブ:

```typescript
// POST /api/webhooks/ebay
router.post('/webhooks/ebay', async (req, res) => {
  const event = req.body;

  // 署名検証
  const isValid = verifyEbaySignature(req);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // イベント処理
  await prisma.webhookEvent.create({
    data: {
      provider: 'EBAY',
      eventType: event.metadata?.topic || 'UNKNOWN',
      payload: event,
      headers: req.headers,
      status: 'PENDING',
    },
  });

  // 非同期処理キューに追加
  await ebayWebhookQueue.add('process-event', { eventId: event.id });

  res.status(200).json({ received: true });
});
```

### Phase 45D: UI拡張

**目標**: eBay出品管理画面の追加

| タスク | 説明 | 優先度 |
|--------|------|--------|
| 45D-1 | eBay出品一覧画面 | 中 |
| 45D-2 | 価格ルーティング表示 | 中 |
| 45D-3 | eBay接続設定画面 | 低 |
| 45D-4 | ポリシー選択UI | 低 |

---

## 4. スキーマ変更

### 4.1 既存スキーマの確認

現在のスキーマは既にeBay対応済み:

```prisma
// packages/database/prisma/schema.prisma

enum Marketplace {
  JOOM
  EBAY  // 既に定義済み
}

model Listing {
  id String @id @default(cuid())
  productId String
  marketplace Marketplace
  marketplaceListingId String?  // eBayのlistingId
  listingPrice Float
  // ... 既存フィールド
}

model MarketplaceCredential {
  marketplace Marketplace
  credentials Json  // eBay OAuth情報
  // ... 既存フィールド
}

model EbayCategoryMapping {
  sourceCategory String @unique
  ebayCategoryId String
  ebayCategoryName String
  itemSpecifics Json @default("{}")
  // ... 既存フィールド
}
```

### 4.2 追加が必要なフィールド

```prisma
// Listing モデルに追加
model Listing {
  // ... 既存フィールド

  // Phase 45: eBay固有フィールド
  ebayOfferId         String?   // eBay Offer ID
  ebayListingId       String?   // eBay Listing ID（出品後）
  ebayInventorySku    String?   // Inventory SKU
  routingReason       String?   // ルーティング理由
}

// マイグレーション
// npx prisma migrate dev --name add_ebay_offer_fields
```

### 4.3 価格設定の拡張

```prisma
// PriceSetting モデル（既存）に閾値追加
model PriceSetting {
  // ... 既存フィールド

  // Phase 45: ルーティング設定
  joomPriceLimitJpy   Int?      // Joom価格上限（デフォルト: 900000）
  preferredMarketplace String?  // 'JOOM' | 'EBAY' | 'AUTO'
}
```

---

## 5. 設定

### 5.1 必要な環境変数

```env
# .env

# ========================================
# eBay API（既存）
# ========================================
EBAY_ENV=sandbox  # または production

# DB経由で管理（MarketplaceCredentialテーブル）
# EBAY_CLIENT_ID は credentials JSON に格納
# EBAY_CLIENT_SECRET は credentials JSON に格納
# EBAY_REFRESH_TOKEN は credentials JSON に格納

# ========================================
# Phase 45: eBay連携設定（追加）
# ========================================

# 価格ルーティング
JOOM_PRICE_LIMIT_JPY=900000  # Joom出品上限（円）

# eBayデフォルト設定
EBAY_DEFAULT_MARKETPLACE_ID=EBAY_US
EBAY_DEFAULT_LISTING_DURATION=GTC  # Good 'Til Cancelled
EBAY_DEFAULT_CONDITION=USED_GOOD

# eBayポリシーID（Seller Hubで作成後に設定）
EBAY_FULFILLMENT_POLICY_ID=  # 配送ポリシーID
EBAY_PAYMENT_POLICY_ID=      # 支払いポリシーID
EBAY_RETURN_POLICY_ID=       # 返品ポリシーID

# Webhook
EBAY_WEBHOOK_SECRET=  # Webhook署名検証用シークレット
```

### 5.2 eBay Developer Account設定

#### ステップ1: アプリケーション作成

1. https://developer.ebay.com/ にアクセス
2. Application Access → Create Key
3. 環境選択: Production（本番用）
4. 以下を取得:
   - **App ID (Client ID)**
   - **Cert ID (Client Secret)**
   - **Dev ID**

#### ステップ2: OAuth設定

必要なスコープ:
```
https://api.ebay.com/oauth/api_scope/sell.inventory
https://api.ebay.com/oauth/api_scope/sell.inventory.readonly
https://api.ebay.com/oauth/api_scope/sell.account
https://api.ebay.com/oauth/api_scope/sell.account.readonly
https://api.ebay.com/oauth/api_scope/sell.fulfillment
https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly
https://api.ebay.com/oauth/api_scope/commerce.taxonomy.readonly
```

#### ステップ3: ポリシー作成（Seller Hub）

eBay Seller Hub（https://www.ebay.com/sh/settings）で事前作成:

1. **Fulfillment Policy（配送ポリシー）**
   - 国際配送設定
   - 発送元: Japan
   - 配送先: United States, Europe, etc.
   - 配送方法: ePacket, Cpass, EMS

2. **Payment Policy（支払いポリシー）**
   - PayPal / eBay Managed Payments

3. **Return Policy（返品ポリシー）**
   - 30日返品受付
   - 返送料: Buyer負担

#### ステップ4: RAKUDAに登録

```bash
# 認証情報をAPI経由で登録
curl -X POST http://localhost:3000/api/marketplaces/credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "marketplace": "EBAY",
    "name": "eBay Production",
    "credentials": {
      "clientId": "YOUR_CLIENT_ID",
      "clientSecret": "YOUR_CLIENT_SECRET",
      "devId": "YOUR_DEV_ID",
      "refreshToken": "YOUR_REFRESH_TOKEN"
    }
  }'

# 接続テスト
curl http://localhost:3000/api/marketplaces/ebay/test-connection \
  -H "X-API-Key: your-api-key"
```

---

## 6. 見積もり

| フェーズ | 内容 | 見積もり |
|---------|------|---------|
| 45A | eBay出品ロジック | 2-3日 |
| 45B | 価格ルーティング | 1日 |
| 45C | Webhook連携 | 1-2日 |
| 45D | UI拡張 | 2日 |
| **合計** | | **6-8日** |

---

## 7. テスト計画

### 7.1 単体テスト

| 対象 | カバレッジ目標 |
|------|---------------|
| 価格ルーティング | 100% |
| Inventory Item作成 | 90% |
| Offer作成・公開 | 90% |
| カテゴリマッピング | 80% |

### 7.2 統合テスト

| シナリオ | 内容 |
|---------|------|
| 高価格帯商品出品 | ¥1,000,000の商品がeBayにルーティングされること |
| 低価格帯商品出品 | ¥500,000の商品がJoomにルーティングされること |
| Inventory + Offer | Inventory Item作成 → Offer作成 → 公開の一連フロー |
| エラーハンドリング | APIエラー時のリトライ・フォールバック |

### 7.3 E2Eテスト（Sandbox）

```bash
# eBay Sandbox環境でのテスト
npm run test:e2e:ebay-sandbox
```

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| eBay API レート制限 | 出品遅延 | レート制限付きクライアント（既存実装済み） |
| OAuth トークン期限切れ | 出品失敗 | 自動リフレッシュ（既存実装済み） |
| ポリシー未設定 | 出品失敗 | 事前チェック・エラーメッセージ改善 |
| カテゴリマッピング不足 | 出品失敗 | フォールバックカテゴリ・AI推定 |

---

## 9. 参考リンク

- [eBay Developer Program](https://developer.ebay.com/)
- [eBay Inventory API](https://developer.ebay.com/api-docs/sell/inventory/overview.html)
- [eBay Account API](https://developer.ebay.com/api-docs/sell/account/overview.html)
- [eBay Taxonomy API](https://developer.ebay.com/api-docs/commerce/taxonomy/overview.html)
- [eBay Notification API](https://developer.ebay.com/api-docs/commerce/notification/overview.html)

---

## 10. 次のステップ

1. **Phase 45A開始**: Inventory API + Offer API実装
2. **Sandboxテスト**: 開発環境でのE2E検証
3. **Productionデプロイ**: 本番環境でのカナリアリリース
4. **Phase 46検討**: Joom + eBay並行出品、在庫連動

# RAKUDA 次セッション指示書

## 日付: 2026-02-21作成
## 目的: v3.0 Social Commerce Edition の実装開始

---

## 前提状態

### 完了済み
- M-1〜M-6: マルチプラットフォーム統合（eBay, Joom, Etsy, Shopify）
- QP-1〜QP-5: 品質向上
- v3.0設計書: プレゼンHTML改訂済み（Shopify Hub/カタログモデル/Instagram/TikTok）
- 最新コミット: `32da3bf`

### 未完了（このセッションで実行）
OAuthトークンが一切ない状態。Etsy/Shopifyのコード（API/出品サービス/ワーカー/認証ルート）は実装済みだが、認証情報が未設定。

---

## 実行タスク（この順番で）

### Task 1: 環境変数の整備

`.env` と `.env.example` にEtsy/Shopify用の環境変数を追加。

```env
# Etsy
ETSY_API_KEY=          # Etsy開発者ポータルで取得
ETSY_REDIRECT_URI=http://localhost:3000/api/etsy/callback

# Shopify
SHOPIFY_API_KEY=       # Shopifyパートナーダッシュボードで取得
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_inventory,write_inventory,read_orders,write_orders
SHOPIFY_REDIRECT_URI=http://localhost:3000/api/shopify/callback
SHOPIFY_SHOP_DOMAIN=   # xxx.myshopify.com
```

**実装内容:**
1. `.env.example` に上記テンプレート追加
2. ユーザーに認証情報の取得方法を案内

**参考ファイル:**
- `apps/api/src/routes/etsy-auth.ts` → `process.env.ETSY_API_KEY`
- `apps/api/src/routes/shopify-auth.ts` → `process.env.SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`

---

### Task 2: INT-1 Etsy OAuth認証

**ゴール:** Etsyアクセストークンを取得し、DB（OAuthState or 専用テーブル）に保存。

**手順:**
1. ユーザーがEtsy開発者ポータル（https://www.etsy.com/developers/your-apps）でAPIキーを取得
2. `.env` に `ETSY_API_KEY` をセット
3. `npm run dev` でAPIサーバー起動
4. ブラウザで `http://localhost:3000/api/etsy/auth` にアクセス
5. Etsy認証画面でログイン・許可
6. コールバックでトークン取得 → DBに保存
7. 確認: `curl http://localhost:3000/api/etsy/status` でトークン有効を確認

**既存コード:**
- 認証フロー: `apps/api/src/routes/etsy-auth.ts` (OAuth2 PKCE実装済み)
- APIクライアント: `apps/worker/src/lib/etsy-api.ts` (EtsyApiClient)
- OAuthStateモデル: `packages/database/prisma/schema.prisma` line 637

**注意:**
- PKCE方式（code_verifier → code_challenge）
- スコープ: listings_r/w, transactions_r/w, shops_r/w, profile_r, email_r
- トークン有効期間: 1時間（refresh_token で自動更新が必要）

---

### Task 3: INT-2 Shopify OAuth認証

**ゴール:** Shopifyアクセストークンを取得。

**手順:**
1. Shopifyパートナーダッシュボード（https://partners.shopify.com/）でアプリ作成
2. `.env` に `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SHOP_DOMAIN` をセット
3. ブラウザで `http://localhost:3000/api/shopify/auth?shop=YOUR-STORE` にアクセス
4. Shopify認証画面で許可
5. コールバックでトークン取得 → DBに保存

**既存コード:**
- 認証フロー: `apps/api/src/routes/shopify-auth.ts`
- APIクライアント: `apps/worker/src/lib/shopify-api.ts` (ShopifyApiClient)
- HMAC検証: verifyShopifyHmacFromQuery() 実装済み

---

### Task 4: INT-3 Etsy出品テスト

**ゴール:** テスト商品1件でEtsy出品フルフローを確認。

**手順:**
1. テスト用商品をDBに登録（or 既存商品を使用）
2. marketplace-router で Etsy に振り分けられるか確認（ヴィンテージ判定: whenMade > 20年前）
3. `etsy-publish-service.ts` で出品フロー実行:
   - enrichment → 翻訳・属性抽出
   - 画像処理 → アップロード
   - Etsy APIでドラフト出品 → 確認後 publish
4. Etsyショップで出品確認
5. 出品成功したらMarketplaceSyncState更新確認

**既存コード:**
- 出品サービス: `apps/worker/src/lib/etsy-publish-service.ts`
- ワーカー: `apps/worker/src/jobs/etsy-publish-worker.ts`
- ルーター: `apps/worker/src/lib/marketplace-router.ts`

---

### Task 5: INT-4 Shopify出品テスト

**ゴール:** テスト商品1件でShopify出品フルフローを確認。

**手順:**
1. テスト用商品をDBに登録（or Task 4と同じ商品）
2. `shopify-publish-service.ts` で出品フロー実行:
   - AI商品説明最適化（GPT-4o）
   - Schema.org構造化データ生成
   - メタフィールド設定
   - Shopify APIで商品作成
3. Shopifyストアで商品確認
4. MarketplaceSyncState更新確認

**既存コード:**
- 出品サービス: `apps/worker/src/lib/shopify-publish-service.ts`
- ワーカー: `apps/worker/src/jobs/shopify-sync-worker.ts`

---

### Task 6: M-7 Instagram Shop連携（Shopify Hub経由）

**ゴール:** Shopifyストアの商品をInstagram Shopに表示。

**前提:** Task 5完了（Shopify認証済み、テスト商品あり）

**手順（ほぼ設定作業、コード変更最小限）:**
1. Shopify管理画面 → 販売チャネル → 「Facebook & Instagram」を追加
2. Meta Business Suiteアカウントと接続
3. Instagram Businessアカウントをリンク
4. 商品カタログの同期を有効化
5. 同期を待つ（通常24-48時間）
6. Instagramアプリでショップタブに商品が表示されることを確認

**コード変更（任意）:**
- `Marketplace` enumに `INSTAGRAM_SHOP` 追加（将来の注文識別用）
  - 場所: `packages/database/prisma/schema.prisma` line 194
- Instagram経由の注文はShopify注文として入るため、Shopify sync workerで自動処理

---

### Task 7: M-8 Phase 1 TikTok Shop連携（Shopify Hub経由）

**ゴール:** Shopifyストアの商品をTikTok Shopに表示。

**前提:** Task 5完了

**手順（ほぼ設定作業、コード変更最小限）:**
1. Shopify管理画面 → 販売チャネル → 「TikTok」を追加
2. TikTok for Businessアカウントと接続
3. TikTok Shop Japan の審査完了（ビジネスアカウント必要）
4. 商品カタログの同期を有効化
5. TikTokアプリでShop機能から商品確認

**コード変更（任意）:**
- `Marketplace` enumに `TIKTOK_SHOP` 追加
- TikTok経由の注文もShopify注文として入るため、既存workerで処理

---

### Task 8: INT-5〜INT-6 統合テスト

**ゴール:** 全チャネルでの在庫同期を確認。

**テストシナリオ:**
1. 商品をProduct DBに登録
2. marketplace-router で自動振り分け
3. 全チャネルに出品されることを確認
4. 1つのチャネルで注文が入った想定で在庫減算
5. 他の全チャネルで在庫が更新されることを確認
6. 在庫0になったら全チャネルで出品停止を確認
7. 入荷（在庫追加）で全チャネルで出品再開を確認

---

## DB変更（必要に応じて）

### Prisma schema.prisma への追加

```prisma
// Marketplace enumに追加（Task 6,7のタイミングで）
enum Marketplace {
  JOOM
  EBAY
  ETSY
  SHOPIFY
  INSTAGRAM_SHOP  // 追加
  TIKTOK_SHOP     // 追加
}

// SupplierSource モデル追加（将来の無在庫対応）
model SupplierSource {
  id          String   @id @default(cuid())
  productId   String
  type        SourceType
  supplierUrl String?
  quantity    Int      @default(0)
  priority    Int      @default(0)
  lastCheckedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
}

enum SourceType {
  WAREHOUSE   // 自社倉庫
  SUPPLIER    // 仕入先
  ON_DEMAND   // オンデマンド
}

enum InventoryMode {
  STOCKED     // 有在庫
  DROPSHIP    // 無在庫
  HYBRID      // ハイブリッド
}

// Product modelに追加フィールド:
// inventoryMode InventoryMode @default(STOCKED)
// supplierSources SupplierSource[]
```

**マイグレーション実行:**
```bash
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma --name add-social-commerce-support
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

---

## ファイルマップ

### 認証（実装済み）
| ファイル | 内容 |
|---------|------|
| `apps/api/src/routes/etsy-auth.ts` | Etsy OAuth2 PKCE |
| `apps/api/src/routes/shopify-auth.ts` | Shopify OAuth2 + HMAC検証 |

### APIクライアント（実装済み）
| ファイル | 内容 |
|---------|------|
| `apps/worker/src/lib/ebay-api.ts` | 954行、Inventory/Offer/Fulfillment |
| `apps/worker/src/lib/joom-api.ts` | 811行、Marketplace API v3 |
| `apps/worker/src/lib/etsy-api.ts` | OAuth PKCE、Listing CRUD、10req/sec |
| `apps/worker/src/lib/shopify-api.ts` | Admin REST API、Webhook |

### 出品サービス（実装済み）
| ファイル | 内容 |
|---------|------|
| `apps/worker/src/lib/ebay-publish-service.ts` | 3段階出品フロー |
| `apps/worker/src/lib/joom-publish-service.ts` | 808行 |
| `apps/worker/src/lib/etsy-publish-service.ts` | ヴィンテージ判定、タグ最適化 |
| `apps/worker/src/lib/shopify-publish-service.ts` | AI最適化、Schema.org |

### 在庫管理（実装済み）
| ファイル | 内容 |
|---------|------|
| `apps/worker/src/lib/inventory-manager.ts` | 在庫一元管理 |
| `apps/worker/src/lib/order-sync-manager.ts` | 注文統合 |
| `apps/worker/src/lib/marketplace-router.ts` | 出品先自動ルーティング |

### DB
| ファイル | 内容 |
|---------|------|
| `packages/database/prisma/schema.prisma` | Marketplace enum (line 194), OAuthState (line 637) |

---

## 成功基準

- [ ] Etsy OAuthトークン取得成功
- [ ] Shopify OAuthトークン取得成功
- [ ] テスト商品1件がEtsyに出品される
- [ ] テスト商品1件がShopifyに出品される
- [ ] Instagram Shop に商品が表示される（同期待ち24-48h）
- [ ] TikTok Shop に商品が表示される（審査待ちの可能性あり）
- [ ] 在庫減算→全チャネル同期が正常動作
- [ ] Prisma schema に INSTAGRAM_SHOP, TIKTOK_SHOP 追加
- [ ] 全変更をコミット・プッシュ
- [ ] Obsidianノート作成

---

## ユーザーが事前に準備すること

1. **Etsy開発者アカウント** → https://www.etsy.com/developers/your-apps でAPIキー取得
2. **Shopifyパートナーアカウント** → https://partners.shopify.com/ でアプリ作成・API認証情報取得
3. **Shopifyストア** → テスト用or開発ストアを作成（xxx.myshopify.com）
4. **Instagram Businessアカウント** → Meta Business Suite連携用
5. **TikTok for Businessアカウント** → TikTok Shop Japan登録

## 確認不要で完了まで進めること

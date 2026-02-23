# RAKUDA 次セッション指示書

## 日付: 2026-02-23更新（初版2026-02-21）
## 目的: v3.0 Social Commerce Edition — OAuth認証 & 実チャネル接続

---

## 前提状態

### 完了済み
- M-1〜M-6: マルチプラットフォーム統合（eBay, Joom, Etsy, Shopify）
- QP-1〜QP-5: 品質向上
- SC-1〜SC-6: Social Commerce基盤（キュー・ワーカー・API・ルーター・統合テスト）
- QF-1〜QF-2: Quality Foundation（TSエラー修正、テスト整備）
- v3.0設計書: プレゼンHTML改訂済み（Shopify Hub/カタログモデル/Instagram/TikTok）
- 最新コミット: `2c9fbab`
- Worker: TSコンパイル 0エラー / 65ファイル・1295テスト全パス
- API: TSコンパイル 580エラー（eBayスタブ由来） / 12ファイル既存失敗

### 完了済みタスク（旧指示書から）

| 旧タスク | 内容 | ステータス |
|----------|------|-----------|
| Task 1 | 環境変数の整備（.env.example更新） | ✅ 完了 |
| Task 6 DB | Marketplace enumに INSTAGRAM_SHOP 追加 | ✅ 完了 |
| Task 7 DB | Marketplace enumに TIKTOK_SHOP 追加 | ✅ 完了 |
| Task 8 | 統合テスト（15テスト、6チャネル対応） | ✅ 完了 |
| - | DB: SupplierSource, SupplyType, InventoryMode 追加 | ✅ 完了 |
| - | marketplace-router 6チャネル対応 | ✅ 完了 |
| - | inventory-manager 全チャネル在庫同期 | ✅ 完了 |

### 未完了（次セッションで実行）
OAuthトークンが一切ない状態。コード・DB・テストは全て準備完了。あとは認証情報をセットして実チャネル接続するのみ。

---

## 実行タスク（この順番で）

### Task 1: INT-2 Shopify OAuth認証【最優先】

**ゴール:** Shopifyアクセストークンを取得。

**前提:** ユーザーがShopifyパートナーアカウント・APIキーを取得済み。

**手順:**
1. `.env` に `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SHOP_DOMAIN` をセット
2. `npm run dev` でAPIサーバー起動
3. ブラウザで `http://localhost:3000/api/shopify/auth?shop=YOUR-STORE` にアクセス
4. Shopify認証画面で許可
5. コールバックでトークン取得 → DBに保存
6. 確認: API statusエンドポイントでトークン有効を確認

**既存コード:**
- 認証フロー: `apps/api/src/routes/shopify-auth.ts`
- APIクライアント: `apps/worker/src/lib/shopify-api.ts` (ShopifyApiClient)
- HMAC検証: verifyShopifyHmacFromQuery() 実装済み

---

### Task 2: INT-1 Etsy OAuth認証

**ゴール:** Etsyアクセストークンを取得し、DB（OAuthState）に保存。

**前提:** ユーザーがEtsy開発者ポータルでAPIキーを取得済み。

**手順:**
1. `.env` に `ETSY_API_KEY` をセット
2. `npm run dev` でAPIサーバー起動
3. ブラウザで `http://localhost:3000/api/etsy/auth` にアクセス
4. Etsy認証画面でログイン・許可
5. コールバックでトークン取得 → DBに保存
6. 確認: `curl http://localhost:3000/api/etsy/status` でトークン有効を確認

**既存コード:**
- 認証フロー: `apps/api/src/routes/etsy-auth.ts` (OAuth2 PKCE実装済み)
- APIクライアント: `apps/worker/src/lib/etsy-api.ts` (EtsyApiClient)
- OAuthStateモデル: `packages/database/prisma/schema.prisma`

**注意:**
- PKCE方式（code_verifier → code_challenge）
- スコープ: listings_r/w, transactions_r/w, shops_r/w, profile_r, email_r
- トークン有効期間: 1時間（refresh_token で自動更新が必要）

---

### Task 3: INT-4 Shopify出品テスト

**ゴール:** テスト商品1件でShopify出品フルフローを確認。

**前提:** Task 1完了（Shopify認証済み）

**手順:**
1. テスト用商品をDBに登録（or 既存商品を使用）
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

### Task 4: INT-3 Etsy出品テスト

**ゴール:** テスト商品1件でEtsy出品フルフローを確認。

**前提:** Task 2完了（Etsy認証済み）

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

### Task 5: M-7 Instagram Shop連携（Shopify Hub経由）

**ゴール:** Shopifyストアの商品をInstagram Shopに表示。

**前提:** Task 3完了（Shopify認証済み、テスト商品あり）

**手順（設定作業のみ、コード変更なし）:**
1. Shopify管理画面 → 販売チャネル → 「Facebook & Instagram」を追加
2. Meta Business Suiteアカウントと接続
3. Instagram Businessアカウントをリンク
4. 商品カタログの同期を有効化
5. 同期を待つ（通常24-48時間）
6. Instagramアプリでショップタブに商品が表示されることを確認

**コード:** DB変更済み（INSTAGRAM_SHOP enum追加済み）。追加コード不要。

---

### Task 6: M-8 Phase 1 TikTok Shop連携（Shopify Hub経由）

**ゴール:** Shopifyストアの商品をTikTok Shopに表示。

**前提:** Task 3完了

**手順（設定作業のみ、コード変更なし）:**
1. Shopify管理画面 → 販売チャネル → 「TikTok」を追加
2. TikTok for Businessアカウントと接続
3. TikTok Shop Japan の審査完了（ビジネスアカウント必要）
4. 商品カタログの同期を有効化
5. TikTokアプリでShop機能から商品確認

**コード:** DB変更済み（TIKTOK_SHOP enum追加済み）。追加コード不要。

---

### Task 7: 認証待ちの間に実行可能な品質改善

| 候補 | 内容 | 見積り |
|------|------|--------|
| QP-7 | API側TSエラー580件修正（eBay Phase 114-270スタブ） | 大規模・段階的に |
| QP-8 | API側テスト12ファイル修正（既存失敗テスト） | 中規模 |
| M-8 Ph2 | TikTok Shop直接API連携（tiktok-api.ts作成、約1,500行） | 月間注文>100件時 |
| QP-6 | 既存eBayルーター242件をファクトリ（createEbayRouter）に移行 | 大規模 |

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

### 在庫管理（実装済み、6チャネル対応済み）
| ファイル | 内容 |
|---------|------|
| `apps/worker/src/lib/inventory-manager.ts` | 6+チャネル在庫一元管理 |
| `apps/worker/src/lib/order-sync-manager.ts` | 注文統合 |
| `apps/worker/src/lib/marketplace-router.ts` | 6チャネル統一ルーティング |

### 統合テスト（完了済み）
| ファイル | 内容 |
|---------|------|
| `apps/worker/src/test/integration/multichannel-inventory-sync.test.ts` | 15テスト、6チャネル在庫同期 |

### DB
| ファイル | 内容 |
|---------|------|
| `packages/database/prisma/schema.prisma` | Marketplace enum（6値）, SupplierSource, SupplyType, InventoryMode |

---

## 成功基準

- [x] Prisma schema に INSTAGRAM_SHOP, TIKTOK_SHOP 追加
- [x] SupplierSource, SupplyType, InventoryMode 追加
- [x] .env.example にEtsy/Shopify環境変数テンプレート追加
- [x] 統合テスト（15テスト、6チャネル）全パス
- [x] marketplace-router 6チャネル対応
- [ ] Shopify OAuthトークン取得成功
- [ ] Etsy OAuthトークン取得成功
- [ ] テスト商品1件がShopifyに出品される
- [ ] テスト商品1件がEtsyに出品される
- [ ] Instagram Shop に商品が表示される（同期待ち24-48h）
- [ ] TikTok Shop に商品が表示される（審査待ちの可能性あり）

---

## ユーザーが事前に準備すること

1. **Shopifyパートナーアカウント** → https://partners.shopify.com/ でアプリ作成・API認証情報取得 ← ユーザー取得済み
2. **Shopifyストア** → テスト用or開発ストアを作成（xxx.myshopify.com）
3. **Etsy開発者アカウント** → https://www.etsy.com/developers/your-apps でAPIキー取得
4. **Instagram Businessアカウント** → Meta Business Suite連携用
5. **TikTok for Businessアカウント** → TikTok Shop Japan登録

## 確認不要で完了まで進めること

# マルチプラットフォーム統合 + 在庫一元管理 実装計画

## 概要

4プラットフォーム（eBay, Joom, Etsy, Shopify）の出品・在庫・注文を一元管理する。
既存のJoom出品パイプラインをベースに、同じパターンで横展開する。

## 現状

| プラットフォーム | APIクライアント | OAuth | 出品サービス | 在庫同期 | 注文同期 |
|-----------------|----------------|-------|-------------|---------|---------|
| Joom | ✅ 811行 | ✅ | ✅ 808行 | ❌ | 部分的 |
| eBay | ✅ 954行 | ✅ | ❌ | ❌ | ❌ |
| Etsy | ❌ | ❌ | ❌ | ❌ | ❌ |
| Shopify | ❌ | ❌ | ❌ | ❌ | ❌ |

## 実装フェーズ

### Phase M-1: DB基盤拡張（Prismaスキーマ）

**変更内容:**
1. `Marketplace` enumに `ETSY`, `SHOPIFY` を追加
2. `InventoryEvent` モデル追加（在庫変動ログ）
3. `MarketplaceSync` モデル追加（同期状態管理）

**ファイル:**
- `packages/database/prisma/schema.prisma`

---

### Phase M-2: eBay出品サービス完成

**既存資産:** `apps/worker/src/lib/ebay-api.ts`（954行、Inventory/Offer/Fulfillment API実装済み）

**新規作成:**
1. `apps/worker/src/lib/ebay-publish-service.ts` - eBay出品フロー
   - Joom publish serviceと同じ3段階: createListing → processImages → publish
   - Inventory API → Offer API → Publish の流れ
   - カテゴリマッピング（enrichment パッケージ連携）
2. `apps/worker/src/jobs/ebay-publish-worker.ts` - BullMQワーカー
3. `apps/worker/src/lib/ebay-order-sync.ts` - 注文取得→Order DB保存

**推定行数:** 約1,200行

---

### Phase M-3: Etsy連携（フルスクラッチ）

**新規作成:**
1. `apps/worker/src/lib/etsy-api.ts` - Etsy APIクライアント
   - OAuth2 PKCE認証（Etsy v3 API）
   - Listing CRUD（createDraftListing, publishListing, updateListing, deleteListing）
   - Inventory管理（updateListingInventory）
   - Image管理（uploadListingImage）
   - Shop/Receipt（注文）取得
   - レート制限: 10req/sec
2. `apps/worker/src/lib/etsy-publish-service.ts` - Etsy出品フロー
   - enrichment → 画像処理 → Etsy出品
   - ヴィンテージ自動判定（製造年 > 20年前）
   - Etsyタグ最適化（最大13タグ）
3. `apps/worker/src/jobs/etsy-publish-worker.ts` - BullMQワーカー
4. `apps/api/src/routes/etsy-auth.ts` - OAuth認証エンドポイント

**推定行数:** 約2,000行

---

### Phase M-4: Shopify連携

**既存資産:** `ShopifyProduct` モデル（スキーマ定義済み）

**新規作成:**
1. `apps/worker/src/lib/shopify-api.ts` - Shopify Admin APIクライアント
   - OAuth2認証（Custom App / Public App）
   - Product CRUD
   - Inventory Level管理
   - Order取得
   - Webhook登録
2. `apps/worker/src/lib/shopify-publish-service.ts` - Shopify出品フロー
   - AI商品説明最適化（ChatGPT/Gemini向け構造化データ）
   - メタフィールド設定（AI検索最適化）
3. `apps/worker/src/jobs/shopify-sync-worker.ts` - 双方向同期ワーカー
4. `apps/api/src/routes/shopify-auth.ts` - OAuth認証エンドポイント

**推定行数:** 約1,800行

---

### Phase M-5: 在庫一元管理サービス

**新規作成:**
1. `apps/worker/src/lib/inventory-manager.ts` - 在庫一元管理
   - 単一在庫ソース（Product.quantity）
   - 在庫変動イベント発行（InventoryEvent）
   - 全プラットフォームへの在庫同期
   - 在庫切れ時の自動出品停止
   - 入荷時の自動出品再開
2. `apps/worker/src/lib/order-sync-manager.ts` - 注文統合マネージャー
   - 各プラットフォームからの注文ポーリング
   - 注文→在庫減算→他プラットフォームへ同期
   - 重複注文検出
3. `apps/worker/src/lib/marketplace-router.ts` - 出品先自動ルーティング
   - 価格ベース: ¥900K超→eBay、以下→Joom
   - カテゴリベース: ヴィンテージ→Etsy
   - ブランド品→Shopify（AI検索最適化）
4. `apps/worker/src/jobs/inventory-sync-worker.ts` - 定期同期ワーカー

**推定行数:** 約1,500行

---

### Phase M-6: 管理UI

**新規作成:**
1. `apps/web/src/app/inventory/page.tsx` - 統合在庫ダッシュボード
   - 全プラットフォームの在庫一覧
   - プラットフォーム別の出品状態
   - 在庫アラート
2. `apps/web/src/app/marketplace/page.tsx` - マーケットプレイス管理
   - 接続状態・認証管理
   - 同期設定
   - 出品先ルーティング設定

---

## 実行順序と依存関係

```
M-1 (DB基盤) ──→ M-2 (eBay完成) ──→ M-5 (在庫一元管理)
              ├─→ M-3 (Etsy連携)  ──→ M-5
              ├─→ M-4 (Shopify)   ──→ M-5
              └─→ M-5 完了後 ──→ M-6 (UI)
```

M-2, M-3, M-4は並列実行可能（M-1完了後）。

## 合計推定

- 新規コード: 約6,500行
- 変更ファイル: 約20ファイル
- 新規ファイル: 約15ファイル

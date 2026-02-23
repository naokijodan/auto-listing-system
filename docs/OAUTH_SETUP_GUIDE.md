# OAuth認証セットアップガイド

## Task 2: Etsy OAuth認証 (INT-1)

### 1. Etsy APIキー取得

1. https://www.etsy.com/developers/your-apps にアクセス
2. 「Create a New App」をクリック
3. アプリ名: `rakuda-listing` (任意)
4. アプリタイプ: `Seller tool`
5. 作成後、**Keystring** をコピー（これが `ETSY_API_KEY`）

### 2. 環境変数を設定

```bash
# .env に追加
ETSY_API_KEY=your_keystring_here
ETSY_REDIRECT_URI=http://localhost:3000/api/etsy/callback
```

### 3. OAuth認証実行

```bash
# APIサーバー起動
cd ~/Desktop/rakuda
npm run dev

# ブラウザで以下にアクセス
open http://localhost:3000/api/etsy/auth
```

4. Etsy認証画面でログイン → 許可
5. コールバックでトークンがDBに保存される

### 4. 確認

```bash
curl http://localhost:3000/api/etsy/status
# → {"connected":true,"tokenExpiresAt":"...","isExpired":false}
```

### 注意事項
- PKCE方式（code_verifier → code_challenge）を使用
- アクセストークン有効期間: 1時間
- refresh_tokenで自動更新（`POST /api/etsy/refresh`）

---

## Task 3: Shopify OAuth認証 (INT-2)

### 1. Shopifyアプリ作成

1. https://partners.shopify.com/ にアクセス（パートナーアカウント必要）
2. 「Apps」→「Create app」
3. アプリ名: `rakuda-connector`
4. App URL: `http://localhost:3000`
5. Allowed redirection URLs: `http://localhost:3000/api/shopify/callback`
6. **API key** と **API secret key** をコピー

### 2. テストストア作成

1. Shopifyパートナーダッシュボード → 「Stores」→「Add store」
2. 「Development store」を選択
3. ストア名: `rakuda-test.myshopify.com`

### 3. 環境変数を設定

```bash
# .env に追加
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SHOP_DOMAIN=rakuda-test.myshopify.com
SHOPIFY_SCOPES=read_products,write_products,read_inventory,write_inventory,read_orders,write_orders
SHOPIFY_REDIRECT_URI=http://localhost:3000/api/shopify/callback
```

### 4. OAuth認証実行

```bash
# ブラウザで以下にアクセス（shopパラメータに自分のストアを指定）
open "http://localhost:3000/api/shopify/auth?shop=rakuda-test"
```

5. Shopify認証画面で許可
6. トークンがDBに保存される

### 5. 確認

```bash
curl http://localhost:3000/api/shopify/status
# → {"connected":true,"shop":"rakuda-test.myshopify.com","scopes":"..."}
```

### 注意事項
- Shopifyはオフラインアクセストークン（永続）を使用
- リフレッシュ不要

---

## Task 4: Etsy出品テスト (INT-3)

### 前提: Task 2完了（Etsy認証済み）

1. テスト商品をDBに登録（既存商品を使用可）
2. marketplace-routerでEtsyに振り分けられることを確認
3. 出品フロー実行:

```bash
# APIエンドポイント経由（or ダッシュボードから）
curl -X POST http://localhost:3000/api/listings/publish \
  -H "Content-Type: application/json" \
  -d '{"productId":"YOUR_PRODUCT_ID","marketplace":"ETSY"}'
```

4. Etsyショップで出品確認
5. MarketplaceSyncState更新を確認

---

## Task 5: Shopify出品テスト (INT-4)

### 前提: Task 3完了（Shopify認証済み）

1. テスト商品をDBに登録
2. 出品フロー実行:

```bash
curl -X POST http://localhost:3000/api/listings/publish \
  -H "Content-Type: application/json" \
  -d '{"productId":"YOUR_PRODUCT_ID","marketplace":"SHOPIFY"}'
```

3. Shopifyストアで商品確認
4. MarketplaceSyncState更新を確認

---

## Task 6: Instagram Shop連携 (M-7)

### 前提: Task 5完了（Shopifyに商品あり）

1. Shopify管理画面 → 「販売チャネル」→「チャネルを追加」
2. 「Facebook & Instagram」を選択してインストール
3. Meta Business Suiteアカウントと接続
4. Instagram Businessアカウントをリンク
5. 商品カタログの同期を有効化
6. 同期待ち（通常24-48時間）
7. Instagramアプリでショップタブに商品が表示されることを確認

**コード変更不要** - Marketplace enumにINSTAGRAM_SHOPは追加済み

---

## Task 7: TikTok Shop連携 (M-8 Phase 1)

### 前提: Task 5完了

1. Shopify管理画面 → 「販売チャネル」→「チャネルを追加」
2. 「TikTok」を選択してインストール
3. TikTok for Businessアカウントと接続
4. TikTok Shop Japan の審査完了を待つ
5. 商品カタログの同期を有効化
6. TikTokアプリでShop機能から商品確認

**コード変更不要** - Marketplace enumにTIKTOK_SHOPは追加済み

---

## トラブルシューティング

### Etsy: "ETSY_API_KEY not configured"
→ `.env` に `ETSY_API_KEY` が設定されているか確認

### Shopify: "SHOPIFY_API_KEY/SECRET not configured"
→ `.env` に `SHOPIFY_API_KEY` と `SHOPIFY_API_SECRET` が設定されているか確認

### Shopify: "Invalid HMAC"
→ 開発環境では自動スキップ（NODE_ENV=development）。本番では `SHOPIFY_API_SECRET` が正しいか確認

### トークン期限切れ
→ Etsy: `POST /api/etsy/refresh` でリフレッシュ
→ Shopify: 永続トークンのためリフレッシュ不要

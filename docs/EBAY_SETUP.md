# eBay API セットアップガイド

## 概要

RAKUDAでeBayに出品するには、eBay Developer Programへの登録とOAuth認証の設定が必要です。

## 前提条件

- eBayセラーアカウント
- eBay Developer Programアカウント

## ステップ1: eBay Developer Program登録

1. https://developer.ebay.com/ にアクセス
2. 「Join」をクリックしてアカウント作成
3. メール認証を完了

## ステップ2: アプリケーション作成

1. Developer Portal → Application Access
2. 「Create Key」をクリック
3. 環境を選択:
   - **Sandbox**: テスト用（最初はこちらで動作確認）
   - **Production**: 本番用（実際の出品）
4. アプリ情報を入力:
   - Application Title: `RAKUDA`
   - Environment: 選択した環境
5. 「Create」をクリック
6. 以下の情報をメモ:
   - **Client ID** (App ID)
   - **Client Secret** (Cert ID)
   - **Dev ID**

## ステップ3: OAuth設定

### User Token取得（推奨）

eBay Inventory APIを使うにはUser Tokenが必要です。

1. Developer Portal → User Tokens
2. 「Get a Token」をクリック
3. 自分のeBayアカウントでログイン
4. 権限を許可
5. 以下を取得:
   - **Access Token**
   - **Refresh Token**（長期間有効）

### 必要なOAuth Scopes

```
https://api.ebay.com/oauth/api_scope/sell.inventory
https://api.ebay.com/oauth/api_scope/sell.inventory.readonly
https://api.ebay.com/oauth/api_scope/sell.account
https://api.ebay.com/oauth/api_scope/sell.account.readonly
https://api.ebay.com/oauth/api_scope/sell.fulfillment
https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly
https://api.ebay.com/oauth/api_scope/commerce.taxonomy.readonly
```

## ステップ4: RAKUDAに登録

### API経由で登録

```bash
curl -X POST http://localhost:3000/api/marketplaces/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace": "EBAY",
    "name": "eBay Production",
    "credentials": {
      "clientId": "YOUR_CLIENT_ID",
      "clientSecret": "YOUR_CLIENT_SECRET",
      "devId": "YOUR_DEV_ID",
      "accessToken": "YOUR_ACCESS_TOKEN",
      "refreshToken": "YOUR_REFRESH_TOKEN"
    }
  }'
```

### 環境変数設定（任意）

```env
# .env ファイル
EBAY_ENV=sandbox  # または production
```

## ステップ5: 接続テスト

```bash
curl http://localhost:3000/api/marketplaces/ebay/test-connection
```

### 成功時のレスポンス

```json
{
  "success": true,
  "status": "connected",
  "message": "eBay APIに正常に接続できました",
  "environment": "sandbox"
}
```

## ポリシー設定

eBayで出品するには、以下のポリシーを事前に作成する必要があります：

1. **Fulfillment Policy** (配送ポリシー)
2. **Payment Policy** (支払いポリシー)
3. **Return Policy** (返品ポリシー)

これらはeBay Seller Hubで作成できます：
https://www.ebay.com/sh/settings

### ポリシー確認API

```bash
# 配送ポリシー一覧
curl http://localhost:3000/api/marketplaces/ebay/policies/fulfillment

# 支払いポリシー一覧
curl http://localhost:3000/api/marketplaces/ebay/policies/payment

# 返品ポリシー一覧
curl http://localhost:3000/api/marketplaces/ebay/policies/return
```

## トラブルシューティング

### "eBay not connected"

→ 認証情報が登録されていません。ステップ4を実行してください。

### "Token expired"

→ アクセストークンの有効期限切れ。Refresh Tokenを使って更新されます。
   Refresh Tokenも期限切れの場合は、ステップ3を再実行。

### "Insufficient permissions"

→ OAuth Scopesが足りていません。ステップ3で必要なScopesを全て許可してください。

## Sandbox vs Production

| 項目 | Sandbox | Production |
|------|---------|------------|
| URL | api.sandbox.ebay.com | api.ebay.com |
| 実際の出品 | ❌ | ✅ |
| テスト用 | ✅ | ❌ |
| 手数料 | なし | あり |

**推奨フロー:**
1. Sandboxで動作確認
2. Productionアプリを作成
3. Production認証情報を登録
4. `EBAY_ENV=production` に変更

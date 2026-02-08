#!/bin/bash

#
# eBay Sandbox クイック動作確認スクリプト
#
# 使用方法:
#   1. 環境変数を設定:
#      export EBAY_CLIENT_ID="your-client-id"
#      export EBAY_CLIENT_SECRET="your-client-secret"
#      export EBAY_REFRESH_TOKEN="your-refresh-token"
#
#   2. スクリプト実行:
#      ./scripts/verify-ebay-quick.sh
#

set -e

echo "========================================"
echo "eBay Sandbox クイック動作確認"
echo "========================================"
echo ""

# 環境変数チェック
if [ -z "$EBAY_CLIENT_ID" ] || [ -z "$EBAY_CLIENT_SECRET" ]; then
    echo "❌ エラー: EBAY_CLIENT_ID と EBAY_CLIENT_SECRET が必要です"
    echo ""
    echo "設定方法:"
    echo "  export EBAY_CLIENT_ID='your-client-id'"
    echo "  export EBAY_CLIENT_SECRET='your-client-secret'"
    echo "  export EBAY_REFRESH_TOKEN='your-refresh-token' (オプション)"
    exit 1
fi

SANDBOX_AUTH="https://auth.sandbox.ebay.com"
SANDBOX_API="https://api.sandbox.ebay.com"

# Base64エンコード
AUTH_HEADER=$(echo -n "$EBAY_CLIENT_ID:$EBAY_CLIENT_SECRET" | base64)

echo "🔑 Step 1: Application Token取得..."
APP_TOKEN_RESPONSE=$(curl -s -X POST "$SANDBOX_AUTH/identity/v1/oauth2/token" \
    -H "Authorization: Basic $AUTH_HEADER" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope")

if echo "$APP_TOKEN_RESPONSE" | grep -q "access_token"; then
    echo "✅ Application Token取得成功"
else
    echo "❌ Application Token取得失敗"
    echo "   レスポンス: $APP_TOKEN_RESPONSE"
    exit 1
fi

# Refresh Tokenがあればアクセストークンを取得
if [ -n "$EBAY_REFRESH_TOKEN" ]; then
    echo ""
    echo "🔑 Step 2: User Access Token取得..."
    USER_TOKEN_RESPONSE=$(curl -s -X POST "$SANDBOX_AUTH/identity/v1/oauth2/token" \
        -H "Authorization: Basic $AUTH_HEADER" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=refresh_token&refresh_token=$EBAY_REFRESH_TOKEN")

    ACCESS_TOKEN=$(echo "$USER_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$ACCESS_TOKEN" ]; then
        echo "✅ User Access Token取得成功"

        echo ""
        echo "🔍 Step 3: Sell Account API疎通確認..."
        ACCOUNT_RESPONSE=$(curl -s -X GET "$SANDBOX_API/sell/account/v1/privilege" \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$ACCOUNT_RESPONSE" | grep -q "sellingLimit"; then
            echo "✅ Sell Account APIアクセス成功"
            echo "   レスポンス: $ACCOUNT_RESPONSE"
        else
            echo "⚠️ Sell Account APIアクセス失敗"
            echo "   レスポンス: $ACCOUNT_RESPONSE"
        fi

        echo ""
        echo "🔍 Step 4: Fulfillment API疎通確認..."
        ORDERS_RESPONSE=$(curl -s -X GET "$SANDBOX_API/sell/fulfillment/v1/order?limit=1" \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$ORDERS_RESPONSE" | grep -q "orders\|total"; then
            echo "✅ Fulfillment APIアクセス成功"
        else
            echo "⚠️ Fulfillment APIアクセス失敗"
            echo "   レスポンス: $ORDERS_RESPONSE"
        fi

        echo ""
        echo "🔍 Step 5: Taxonomy API疎通確認..."
        TAXONOMY_RESPONSE=$(curl -s -X GET "$SANDBOX_API/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=watch" \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$TAXONOMY_RESPONSE" | grep -q "categorySuggestions"; then
            echo "✅ Taxonomy APIアクセス成功"
        else
            echo "⚠️ Taxonomy APIアクセス失敗（Productionのみの可能性あり）"
        fi

    else
        echo "❌ User Access Token取得失敗"
        echo "   レスポンス: $USER_TOKEN_RESPONSE"
        echo ""
        echo "📋 診断: Refresh Tokenが無効または期限切れの可能性があります"
        echo "   対処法: eBay Developer Portalで新しいUser Tokenを取得"
        echo "   URL: https://developer.ebay.com/my/auth/?env=sandbox"
    fi
else
    echo ""
    echo "⚠️ EBAY_REFRESH_TOKEN が設定されていません"
    echo "   Application Tokenのみテスト完了"
    echo ""
    echo "User Tokenを取得するには:"
    echo "1. https://developer.ebay.com/my/auth/?env=sandbox にアクセス"
    echo "2. 'Get a Token from eBay via Your Application' をクリック"
    echo "3. 必要なScopesを選択:"
    echo "   - sell.inventory"
    echo "   - sell.account"
    echo "   - sell.fulfillment"
    echo "4. Refresh Tokenをコピーして環境変数に設定"
fi

echo ""
echo "========================================"
echo "テスト完了"
echo "========================================"

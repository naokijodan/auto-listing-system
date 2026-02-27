#!/bin/bash

# ========================================
# RAKUDA - eBay Sandbox セットアップスクリプト
# ========================================
#
# eBay Sandbox環境の認証情報を設定し、OAuthフローを開始するスクリプト
#
# 前提条件:
#   1. eBay Developer Account (https://developer.ebay.com/) が作成済み
#   2. Sandbox Application Keys を取得済み
#   3. Docker containers (postgres, redis) が起動済み
#
# 使い方:
#   ./scripts/setup-ebay-sandbox.sh
#

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo "========================================"
echo "  RAKUDA - eBay Sandbox Setup"
echo "========================================"
echo ""

# ----------------------------------------
# Step 1: Docker確認
# ----------------------------------------
log_step "1/5: Docker services 確認..."

if ! docker ps --format '{{.Names}}' | grep -q 'rakuda-postgres'; then
  log_error "rakuda-postgres が起動していません"
  echo "  実行: cd $PROJECT_DIR && docker-compose up -d"
  exit 1
fi
log_info "PostgreSQL 起動中"

if ! docker ps --format '{{.Names}}' | grep -q 'rakuda-redis'; then
  log_error "rakuda-redis が起動していません"
  exit 1
fi
log_info "Redis 起動中"

# ----------------------------------------
# Step 2: eBay認証情報の入力
# ----------------------------------------
echo ""
log_step "2/5: eBay Sandbox 認証情報を入力..."
echo ""
echo "  eBay Developer Portal で取得した Sandbox Keys を入力してください"
echo "  URL: https://developer.ebay.com/my/keys"
echo ""

read -p "  EBAY_CLIENT_ID (App ID): " EBAY_CLIENT_ID
if [ -z "$EBAY_CLIENT_ID" ]; then
  log_error "Client ID は必須です"
  exit 1
fi

read -p "  EBAY_CLIENT_SECRET (Cert ID): " EBAY_CLIENT_SECRET
if [ -z "$EBAY_CLIENT_SECRET" ]; then
  log_error "Client Secret は必須です"
  exit 1
fi

read -p "  EBAY_RU_NAME (RuName / Redirect URI name): " EBAY_RU_NAME

echo ""
log_info "認証情報を受け取りました"

# ----------------------------------------
# Step 3: .env 更新
# ----------------------------------------
log_step "3/5: .env ファイルを更新..."

ENV_FILE="$PROJECT_DIR/.env"

# 既存のeBay設定を更新（コメントアウトされたものを有効化）
if grep -q '^# EBAY_CLIENT_ID=' "$ENV_FILE" || grep -q '^EBAY_CLIENT_ID=' "$ENV_FILE"; then
  # 既存行を置換
  sed -i.bak '/^#.*EBAY_CLIENT_ID/d; /^EBAY_CLIENT_ID/d' "$ENV_FILE"
  sed -i.bak '/^#.*EBAY_CLIENT_SECRET/d; /^EBAY_CLIENT_SECRET/d' "$ENV_FILE"
  sed -i.bak '/^#.*EBAY_REFRESH_TOKEN/d; /^EBAY_REFRESH_TOKEN/d' "$ENV_FILE"
  sed -i.bak '/^#.*EBAY_SANDBOX/d; /^EBAY_SANDBOX/d' "$ENV_FILE"
  sed -i.bak '/^#.*EBAY_ENV/d; /^EBAY_ENV/d' "$ENV_FILE"
  sed -i.bak '/^#.*EBAY_REDIRECT_URI/d; /^EBAY_REDIRECT_URI/d' "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
fi

# eBayセクションを追加
cat >> "$ENV_FILE" << EOF

# ========================================
# eBay API (Sandbox)
# ========================================
EBAY_CLIENT_ID="$EBAY_CLIENT_ID"
EBAY_CLIENT_SECRET="$EBAY_CLIENT_SECRET"
EBAY_SANDBOX="true"
EBAY_ENV="sandbox"
EBAY_REDIRECT_URI="http://localhost:3000/api/ebay/callback"
EOF

log_info ".env 更新完了"

# ----------------------------------------
# Step 4: DB認証情報を更新
# ----------------------------------------
log_step "4/5: データベースの認証情報を更新..."

docker exec rakuda-postgres psql -U rakuda -d rakuda_development -c "
  UPDATE marketplace_credentials
  SET
    credentials = jsonb_build_object(
      'clientId', '$EBAY_CLIENT_ID',
      'clientSecret', '$EBAY_CLIENT_SECRET',
      'sandbox', true
    ),
    \"isActive\" = true
  WHERE marketplace = 'EBAY';
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  log_info "DB認証情報を更新"
else
  log_warn "DB更新失敗 - OAuthフロー完了時に自動作成されます"
fi

# ----------------------------------------
# Step 5: OAuth フロー開始案内
# ----------------------------------------
echo ""
log_step "5/5: OAuth フロー開始..."
echo ""
echo "  =========================================="
echo "  次の手順でOAuth認証を完了してください:"
echo "  =========================================="
echo ""
echo "  1. APIサーバーを起動:"
echo "     cd $PROJECT_DIR && npm run dev"
echo ""
echo "  2. ブラウザで以下のURLを開く:"
echo "     ${CYAN}http://localhost:3000/api/ebay/auth${NC}"
echo ""
echo "  3. eBay Sandbox のテストアカウントでログイン"
echo "     (Sandbox テストアカウントは eBay Developer Portal で作成)"
echo ""
echo "  4. アプリケーションへのアクセスを許可"
echo ""
echo "  5. リダイレクト後、設定ページに遷移すれば成功"
echo ""
echo "  =========================================="
echo "  Sandbox ビジネスポリシーの設定:"
echo "  =========================================="
echo ""
echo "  OAuthが完了したら、以下も必要です:"
echo ""
echo "  1. Sandbox Seller Hub でビジネスポリシーを作成:"
echo "     https://www.sandbox.ebay.com/sh/settings/business-policies"
echo ""
echo "  2. 以下の3つのポリシーを作成:"
echo "     - Fulfillment (配送) ポリシー"
echo "     - Payment (支払い) ポリシー"
echo "     - Return (返品) ポリシー"
echo ""
echo "  3. ポリシーIDを.envに追加:"
echo "     EBAY_FULFILLMENT_POLICY_ID=\"...\""
echo "     EBAY_PAYMENT_POLICY_ID=\"...\""
echo "     EBAY_RETURN_POLICY_ID=\"...\""
echo ""
echo "  完了後、E2Eテストを実行:"
echo "     npx tsx scripts/ebay-e2e-test.ts"
echo ""

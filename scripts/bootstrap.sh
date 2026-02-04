#!/bin/bash

# ========================================
# Auto Listing System - Bootstrap Script
# ========================================

set -e

echo "🚀 Auto Listing System - Bootstrap"
echo "=================================="

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Node.js バージョンチェック
check_node() {
    echo ""
    echo "📦 Checking Node.js..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 20 or later."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        log_error "Node.js version must be 20 or later. Current: $(node -v)"
        exit 1
    fi

    log_info "Node.js $(node -v)"
}

# Docker チェック
check_docker() {
    echo ""
    echo "🐳 Checking Docker..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    log_info "Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"
}

# 環境変数ファイル作成
setup_env() {
    echo ""
    echo "📝 Setting up environment..."

    if [ ! -f .env ]; then
        cp .env.example .env
        log_info "Created .env from .env.example"
    else
        log_warn ".env already exists, skipping"
    fi
}

# npm 依存関係インストール
install_deps() {
    echo ""
    echo "📥 Installing dependencies..."

    npm install
    log_info "Dependencies installed"
}

# Docker コンテナ起動
start_docker() {
    echo ""
    echo "🐳 Starting Docker containers..."

    docker-compose up -d

    # ヘルスチェック待機
    echo "   Waiting for services to be healthy..."
    sleep 5

    # PostgreSQL 接続確認
    until docker exec als-postgres pg_isready -U als_user -d als_development &> /dev/null; do
        echo "   Waiting for PostgreSQL..."
        sleep 2
    done
    log_info "PostgreSQL is ready"

    # Redis 接続確認
    until docker exec als-redis redis-cli ping &> /dev/null; do
        echo "   Waiting for Redis..."
        sleep 2
    done
    log_info "Redis is ready"

    # MinIO 接続確認
    until curl -s http://localhost:9000/minio/health/live &> /dev/null; do
        echo "   Waiting for MinIO..."
        sleep 2
    done
    log_info "MinIO is ready"
}

# Prisma セットアップ
setup_prisma() {
    echo ""
    echo "🗄️  Setting up database..."

    cd packages/database

    # Prisma クライアント生成
    npx prisma generate
    log_info "Prisma client generated"

    # マイグレーション実行
    npx prisma migrate dev --name init --skip-seed
    log_info "Database migrations applied"

    # シードデータ投入
    npx tsx prisma/seed.ts
    log_info "Seed data inserted"

    cd ../..
}

# 完了メッセージ
show_complete() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 Bootstrap completed successfully!${NC}"
    echo "=========================================="
    echo ""
    echo "Services running:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis:      localhost:6379"
    echo "  - MinIO:      localhost:9000 (API)"
    echo "  - MinIO:      localhost:9001 (Console)"
    echo ""
    echo "Next steps:"
    echo "  1. npm run dev        # Start development servers"
    echo "  2. npm run db:studio  # Open Prisma Studio"
    echo ""
    echo "Useful commands:"
    echo "  - npm run docker:logs  # View container logs"
    echo "  - npm run docker:down  # Stop containers"
    echo ""
}

# メイン処理
main() {
    check_node
    check_docker
    setup_env
    install_deps
    start_docker
    setup_prisma
    show_complete
}

main "$@"

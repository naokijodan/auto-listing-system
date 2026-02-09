#!/bin/sh
# =============================================================================
# RAKUDA Docker Entrypoint
# =============================================================================
# 起動前にデータベースマイグレーションを実行し、アプリケーションを起動
# =============================================================================

set -e

echo "=== RAKUDA Container Startup ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -Iseconds)"

# ---------------------------------------------------------------------------
# 1. データベース接続待機
# ---------------------------------------------------------------------------
wait_for_database() {
  echo "Waiting for database connection..."

  max_attempts=30
  attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\$connect()
        .then(() => { prisma.\$disconnect(); process.exit(0); })
        .catch(() => process.exit(1));
    " 2>/dev/null; then
      echo "Database connection established."
      return 0
    fi

    attempt=$((attempt + 1))
    echo "Database not ready (attempt $attempt/$max_attempts). Retrying in 2s..."
    sleep 2
  done

  echo "ERROR: Database connection failed after $max_attempts attempts."
  exit 1
}

# ---------------------------------------------------------------------------
# 2. データベースマイグレーション実行
# ---------------------------------------------------------------------------
run_migrations() {
  echo "Running database migrations..."

  if npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma; then
    echo "Database migrations completed successfully."
  else
    echo "ERROR: Database migrations failed."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# 3. Redisヘルスチェック（オプション）
# ---------------------------------------------------------------------------
check_redis() {
  if [ -n "$REDIS_URL" ]; then
    echo "Checking Redis connection..."

    # Redisホストとポートを抽出
    redis_host=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]+):?.*|\1|')
    redis_port=$(echo "$REDIS_URL" | sed -E 's|redis://[^:]+:?([0-9]+)?.*|\1|')
    redis_port=${redis_port:-6379}

    max_attempts=10
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
      if nc -z "$redis_host" "$redis_port" 2>/dev/null; then
        echo "Redis connection established."
        return 0
      fi

      attempt=$((attempt + 1))
      echo "Redis not ready (attempt $attempt/$max_attempts). Retrying in 1s..."
      sleep 1
    done

    echo "WARNING: Redis connection check failed. Continuing anyway..."
  fi
}

# ---------------------------------------------------------------------------
# 4. メイン処理
# ---------------------------------------------------------------------------
main() {
  # APIサーバーの場合のみマイグレーション実行
  if [ "$RUN_MIGRATIONS" = "true" ] || [ "$1" = "api" ]; then
    wait_for_database
    run_migrations
  fi

  # Redis接続確認（Workerの場合）
  if [ "$1" = "worker" ]; then
    check_redis
  fi

  echo "Starting application..."
  echo "Command: $@"
  echo "=== Startup Complete ==="

  # 実際のコマンドを実行
  exec "$@"
}

# ---------------------------------------------------------------------------
# 実行
# ---------------------------------------------------------------------------
main "$@"

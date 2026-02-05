#!/bin/bash

# RAKUDA Backup Script
# 日次バックアップを実行し、指定された場所に保存

set -e

# 設定
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgresql://localhost:5432/rakuda}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# タイムスタンプ
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="rakuda_backup_${TIMESTAMP}"

echo "=== RAKUDA Backup Script ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Backup directory: ${BACKUP_DIR}"

# バックアップディレクトリ作成
mkdir -p "${BACKUP_DIR}"

# 1. PostgreSQL バックアップ
echo ""
echo "=== 1. Database Backup ==="
if command -v pg_dump &> /dev/null; then
    DB_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_db.sql.gz"
    echo "Backing up database to ${DB_BACKUP_FILE}..."

    # pg_dump を実行してgzip圧縮
    pg_dump "${DB_URL}" | gzip > "${DB_BACKUP_FILE}"

    DB_SIZE=$(du -h "${DB_BACKUP_FILE}" | cut -f1)
    echo "Database backup completed: ${DB_SIZE}"
else
    echo "Warning: pg_dump not found. Skipping database backup."
fi

# 2. Redis バックアップ（RDB スナップショット）
echo ""
echo "=== 2. Redis Backup ==="
if command -v redis-cli &> /dev/null; then
    REDIS_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_redis.rdb"
    echo "Triggering Redis BGSAVE..."

    # BGSAVE を実行
    redis-cli -u "${REDIS_URL}" BGSAVE

    # BGSAVE 完了を待機
    sleep 5

    # RDB ファイルをコピー（Redis のデータディレクトリから）
    # 注: 実際の環境に合わせてパスを調整
    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp /var/lib/redis/dump.rdb "${REDIS_BACKUP_FILE}"
        REDIS_SIZE=$(du -h "${REDIS_BACKUP_FILE}" | cut -f1)
        echo "Redis backup completed: ${REDIS_SIZE}"
    else
        echo "Note: Redis RDB file not found at default location. Using DUMP command."
        # 代替: 重要なキーだけをエクスポート
        redis-cli -u "${REDIS_URL}" --scan --pattern "rakuda:*" > "${BACKUP_DIR}/${BACKUP_NAME}_redis_keys.txt"
        echo "Redis keys exported."
    fi
else
    echo "Warning: redis-cli not found. Skipping Redis backup."
fi

# 3. 設定ファイルバックアップ
echo ""
echo "=== 3. Config Backup ==="
CONFIG_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz"
echo "Backing up configuration files..."

# .env ファイル（存在する場合）
CONFIG_FILES=""
[ -f ".env" ] && CONFIG_FILES="${CONFIG_FILES} .env"
[ -f ".env.local" ] && CONFIG_FILES="${CONFIG_FILES} .env.local"
[ -f "packages/database/prisma/schema.prisma" ] && CONFIG_FILES="${CONFIG_FILES} packages/database/prisma/schema.prisma"

if [ -n "${CONFIG_FILES}" ]; then
    tar -czf "${CONFIG_BACKUP_FILE}" ${CONFIG_FILES} 2>/dev/null || true
    CONFIG_SIZE=$(du -h "${CONFIG_BACKUP_FILE}" | cut -f1)
    echo "Config backup completed: ${CONFIG_SIZE}"
else
    echo "No config files found to backup."
fi

# 4. 古いバックアップを削除
echo ""
echo "=== 4. Cleanup Old Backups ==="
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "rakuda_backup_*" -type f -mtime +${RETENTION_DAYS} -delete
echo "Cleanup completed."

# 5. サマリー
echo ""
echo "=== Backup Summary ==="
echo "Backup name: ${BACKUP_NAME}"
ls -lh "${BACKUP_DIR}/${BACKUP_NAME}"* 2>/dev/null || echo "No backup files created."

# バックアップ情報をJSONで出力
cat > "${BACKUP_DIR}/${BACKUP_NAME}_manifest.json" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": {
    "database": "${DB_BACKUP_FILE:-null}",
    "redis": "${REDIS_BACKUP_FILE:-null}",
    "config": "${CONFIG_BACKUP_FILE:-null}"
  },
  "retention_days": ${RETENTION_DAYS}
}
EOF

echo ""
echo "=== Backup Complete ==="
echo "Manifest: ${BACKUP_DIR}/${BACKUP_NAME}_manifest.json"

# RAKUDA バックアップ・リストア手順書

## 概要

RAKUDAシステムのデータバックアップとリストア手順を説明します。

## バックアップ対象

1. **PostgreSQL データベース** - 商品、出品、設定データ
2. **Redis データ** - キュー状態、キャッシュ、セッション
3. **設定ファイル** - .env、Prismaスキーマ

## バックアップ実行

### 手動バックアップ

```bash
# スクリプトを実行
./scripts/backup.sh

# オプション設定
BACKUP_DIR=/path/to/backups RETENTION_DAYS=14 ./scripts/backup.sh
```

### 自動バックアップ（cron設定）

```bash
# crontab -e で以下を追加
# 毎日 AM 3:00 に実行
0 3 * * * cd /path/to/rakuda && ./scripts/backup.sh >> /var/log/rakuda-backup.log 2>&1
```

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `BACKUP_DIR` | `./backups` | バックアップ保存先 |
| `DATABASE_URL` | `postgresql://localhost:5432/rakuda` | DB接続URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis接続URL |
| `RETENTION_DAYS` | `7` | バックアップ保持日数 |

## リストア手順

### 1. PostgreSQL リストア

```bash
# gzip圧縮されたダンプからリストア
gunzip -c backups/rakuda_backup_YYYYMMDD_HHMMSS_db.sql.gz | psql $DATABASE_URL

# または、新しいDBを作成してリストア
createdb rakuda_restored
gunzip -c backup.sql.gz | psql -d rakuda_restored
```

### 2. Redis リストア

```bash
# Redis を停止
redis-cli shutdown

# RDB ファイルを置き換え
cp backups/rakuda_backup_YYYYMMDD_HHMMSS_redis.rdb /var/lib/redis/dump.rdb

# Redis を起動
redis-server
```

### 3. 設定ファイルリストア

```bash
# 設定ファイルを展開
tar -xzf backups/rakuda_backup_YYYYMMDD_HHMMSS_config.tar.gz

# 必要に応じて .env を編集
```

## 災害復旧手順

### 完全リストア

1. **インフラ準備**
   ```bash
   # Docker の場合
   docker-compose up -d postgres redis
   ```

2. **データベースリストア**
   ```bash
   # 最新のバックアップを特定
   ls -lt backups/rakuda_backup_*_db.sql.gz | head -1

   # リストア実行
   gunzip -c backups/rakuda_backup_LATEST_db.sql.gz | psql $DATABASE_URL
   ```

3. **Prisma マイグレーション確認**
   ```bash
   cd packages/database
   npx prisma migrate status
   npx prisma migrate deploy
   ```

4. **Redis リストア**（必要な場合）
   ```bash
   # Redis データは再構築可能なため、必須ではない
   # 必要な場合のみ RDB ファイルをリストア
   ```

5. **アプリケーション起動**
   ```bash
   npm run build
   npm run start
   ```

## バックアップ検証

定期的にバックアップの整合性を確認してください。

```bash
# バックアップファイルの確認
ls -lh backups/

# マニフェストの確認
cat backups/rakuda_backup_LATEST_manifest.json

# DB ダンプの検証（展開テスト）
gunzip -t backups/rakuda_backup_LATEST_db.sql.gz
```

## クラウドストレージへの同期

### AWS S3 へのアップロード

```bash
# AWS CLI を使用
aws s3 sync ./backups s3://your-bucket/rakuda-backups/

# 定期同期（cron）
0 4 * * * aws s3 sync /path/to/rakuda/backups s3://your-bucket/rakuda-backups/
```

### Google Cloud Storage へのアップロード

```bash
# gsutil を使用
gsutil -m rsync -r ./backups gs://your-bucket/rakuda-backups/
```

## トラブルシューティング

### バックアップが失敗する

1. **ディスク容量を確認**
   ```bash
   df -h
   ```

2. **データベース接続を確認**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **権限を確認**
   ```bash
   ls -la ./backups
   ```

### リストアが失敗する

1. **ダンプファイルの整合性を確認**
   ```bash
   gunzip -t backup.sql.gz
   ```

2. **DB接続を確認**
   ```bash
   psql $DATABASE_URL -c "SELECT version()"
   ```

3. **既存データの競合を確認**
   ```bash
   # 必要に応じてDBを再作成
   dropdb rakuda
   createdb rakuda
   ```

## 関連ファイル

- `/scripts/backup.sh` - バックアップスクリプト
- `/packages/database/prisma/schema.prisma` - DBスキーマ
- `/.env` - 環境設定

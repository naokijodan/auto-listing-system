# RAKUDA デプロイメントガイド

## 概要

RAKUDAはDocker Composeを使用して簡単にデプロイできます。

## 必要要件

- Docker 24.0+
- Docker Compose 2.0+
- 2GB以上のRAM
- 20GB以上のディスク容量

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/naokijodan/auto-listing-system.git rakuda
cd rakuda
```

### 2. 環境変数を設定

```bash
cp .env.production.example .env.production
nano .env.production  # 必要な値を設定
```

### 3. Dockerイメージをビルド

```bash
docker compose -f docker-compose.prod.yml build
```

### 4. データベースマイグレーション

```bash
# コンテナを起動（DBのみ）
docker compose -f docker-compose.prod.yml up -d postgres

# マイグレーション実行
docker compose -f docker-compose.prod.yml run --rm api \
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 5. 全サービスを起動

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 6. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# ログ確認
docker compose -f docker-compose.prod.yml logs -f
```

## サービス構成

| サービス | ポート | 説明 |
|----------|--------|------|
| api | 3000 | REST API サーバー |
| worker | - | バックグラウンドジョブ |
| web | 3002 | Next.js フロントエンド |
| postgres | 5432 (内部のみ) | PostgreSQL データベース |
| redis | 6379 (内部のみ) | Redis キャッシュ/キュー |
| minio | 9000, 9001 (内部のみ) | S3互換ストレージ |

## 本番環境での推奨設定

### Nginx リバースプロキシ

```nginx
# /etc/nginx/sites-available/rakuda
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # フロントエンド
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### SSL証明書（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### ファイアウォール設定

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## バックアップ

### データベースバックアップ

```bash
# バックアップ作成
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U rakuda rakuda_production > backup_$(date +%Y%m%d).sql

# リストア
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U rakuda rakuda_production < backup_20260206.sql
```

### 自動バックアップ（cron）

```bash
# /etc/cron.d/rakuda-backup
0 3 * * * root cd /path/to/rakuda && \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U rakuda rakuda_production | gzip > /backups/rakuda_$(date +\%Y\%m\%d).sql.gz
```

## 更新

```bash
cd /path/to/rakuda

# 最新コードを取得
git pull

# イメージを再ビルド
docker compose -f docker-compose.prod.yml build

# マイグレーション（必要な場合）
docker compose -f docker-compose.prod.yml run --rm api \
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# 再起動
docker compose -f docker-compose.prod.yml up -d
```

## モニタリング

### ログ確認

```bash
# 全サービス
docker compose -f docker-compose.prod.yml logs -f

# 特定サービス
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
```

### リソース使用量

```bash
docker stats
```

### ヘルスチェック

```bash
# API
curl -s http://localhost:3000/api/health | jq

# Bull Board (ジョブキュー管理)
# http://localhost:3000/admin/queues
```

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose -f docker-compose.prod.yml logs api

# コンテナの状態を確認
docker compose -f docker-compose.prod.yml ps
```

### データベース接続エラー

```bash
# PostgreSQLの状態を確認
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# 接続テスト
docker compose -f docker-compose.prod.yml exec api \
  npx prisma db pull --schema=packages/database/prisma/schema.prisma
```

### メモリ不足

```bash
# Redisの設定を調整
# docker-compose.prod.yml の redis.command を編集
# --maxmemory 512mb など
```

## セキュリティチェックリスト

- [ ] 強力なパスワードを設定（POSTGRES_PASSWORD, API_KEY等）
- [ ] 本番環境では内部ポートを外部に公開しない
- [ ] SSL/TLSを有効化
- [ ] ファイアウォールを設定
- [ ] 定期的なバックアップを設定
- [ ] ログを監視
- [ ] 依存関係を定期的に更新

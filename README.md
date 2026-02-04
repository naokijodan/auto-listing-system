# Auto Listing System

eBay/Joom自動出品システム - メルカリ等から商品を取得し、自動で出品・在庫管理を行う統合システム

## 概要

- **仕入元**: メルカリ、ヤフオク、ラクマ、楽天、Amazon 等
- **出品先**: Joom、eBay
- **主な機能**:
  - ワンクリック出品
  - セラー一括出品
  - 画像白抜き加工
  - 自動翻訳（日→英）
  - 価格自動計算
  - 在庫監視・価格調整

## セットアップ

### 必要条件

- Node.js 20以上
- Docker Desktop
- npm 10以上

### 初回セットアップ

```bash
# リポジトリクローン
git clone https://github.com/naokijodan/auto-listing-system.git
cd auto-listing-system

# セットアップスクリプト実行
./scripts/bootstrap.sh
```

bootstrap.sh が以下を自動実行します：
1. npm依存関係のインストール
2. Docker コンテナ起動（PostgreSQL, Redis, MinIO）
3. DBマイグレーション
4. シードデータ投入

### 手動セットアップ

```bash
# 環境変数設定
cp .env.example .env

# 依存関係インストール
npm install

# Docker起動
docker-compose up -d

# DBマイグレーション
npm run db:migrate

# 開発サーバー起動
npm run dev
```

## 開発

### コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint

# Docker操作
npm run docker:up      # コンテナ起動
npm run docker:down    # コンテナ停止
npm run docker:logs    # ログ表示

# DB操作
npm run db:migrate     # マイグレーション実行
npm run db:studio      # Prisma Studio起動
```

### ポート

| サービス | ポート |
|----------|--------|
| API Server | 3000 |
| Bull Board | 3000/admin/queues |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## プロジェクト構成

```
auto-listing-system/
├── apps/
│   ├── web/          # Next.js フロントエンド
│   ├── api/          # Express API
│   └── worker/       # BullMQ ワーカー
├── packages/
│   ├── database/     # Prisma クライアント
│   ├── schema/       # Zod スキーマ
│   ├── logger/       # Pino ロガー
│   └── config/       # 共通設定
├── services/
│   └── image-processor/  # Python 画像処理
└── extension/        # Chrome拡張機能
```

## API エンドポイント

### Products

- `GET /api/products` - 商品一覧
- `GET /api/products/:id` - 商品詳細
- `POST /api/products` - 商品登録
- `POST /api/products/scrape` - スクレイピングリクエスト
- `DELETE /api/products/:id` - 商品削除

### Listings

- `GET /api/listings` - 出品一覧
- `GET /api/listings/:id` - 出品詳細
- `POST /api/listings` - 出品作成
- `POST /api/listings/:id/publish` - 出品公開
- `PATCH /api/listings/:id` - 出品更新
- `DELETE /api/listings/:id` - 出品削除

### Jobs

- `GET /api/jobs/logs` - ジョブログ一覧
- `GET /api/jobs/stats` - キュー統計
- `GET /api/jobs/queue/:queueName` - キュー内ジョブ一覧
- `POST /api/jobs/queue/:queueName/:jobId/retry` - ジョブリトライ

## 設計ドキュメント

- [設計計画書](https://naokijodan.github.io/auto-listing-system-plan/)
- [実装計画書](https://naokijodan.github.io/auto-listing-system-plan/implementation.html)

## ライセンス

Private

# RAKUDA - 越境EC自動化システム

## プロジェクト概要

RAKUDAは、日本のECサイト（ヤフオク、メルカリ、Amazon JP）から商品をスクレイピングし、海外6+チャネルに自動出品する越境EC自動化システム。

### 販売チャネル（6+）
| チャネル | 連携方式 | 役割 | ステータス |
|---------|---------|------|----------|
| eBay | 直接API | 高額品（¥900K+） | OAuth済 |
| Joom | 直接API | EU/CIS市場 | OAuth済 |
| Etsy | 直接API | ヴィンテージ・AI対応 | 実装済・認証待ち |
| Shopify | 直接API + **Social Commerce Hub** | 自社EC + ソーシャル配信ハブ | 実装済・認証待ち |
| Instagram Shop | Shopify経由 | ビジュアルコマース | M-7予定 |
| TikTok Shop | Shopify→直接API（2段階） | ライブコマース | M-8予定 |

### Shopify Hub戦略
ShopifyはRAKUDAの「ソーシャルコマースHub」。Shopifyに商品を同期すれば、Instagram/TikTok/Facebook/Pinterestへ自動配信される。追加API開発はほぼゼロ。月間TikTok注文>100件またはライブコマースAPI必要時に直接API移行。

### カタログ・在庫モデル
- **Product = カタログの核（Single Source of Truth）** - 何を売るか
- **SupplierSource = 在庫の出どころ** - どこにあるか
- 3つの在庫モード: STOCKED（有在庫）/ DROPSHIP（無在庫）/ HYBRID

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | MinIO/S3 |
| AI | OpenAI GPT-4o |
| Testing | Vitest, Playwright |

## ディレクトリ構成

```
rakuda/
├── apps/
│   ├── api/           # Express.js APIサーバー (port 3000)
│   ├── web/           # Next.js フロントエンド (port 3002)
│   └── worker/        # BullMQ ワーカープロセス
├── packages/
│   ├── database/      # Prisma スキーマ・クライアント
│   ├── schema/        # Zod バリデーションスキーマ
│   ├── config/        # 共通設定
│   └── logger/        # ロギングユーティリティ
├── extensions/
│   └── chrome/        # Chrome拡張機能（商品スクレイピング）
└── docs/              # 設計書・ドキュメント
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト
npm run test:unit        # 単体テスト
npm run test:integration # 統合テスト
npm run test:e2e         # E2Eテスト

# ビルド
npm run build

# Prisma
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

## 主要機能

### 完成済み
- Chrome拡張機能（ヤフオク・メルカリ・Amazon JPスクレイピング）
- 商品管理API
- BullMQジョブキュー
- 為替レート自動更新
- 通知システム
- E2Eテスト（Playwright）
- CI/CD（GitHub Actions）

### Joom連携（OAuth完了）
- トークン取得済み（有効期限: 2026-03-08）
- 出品パイプライン完成（Phase 40）

### eBay連携（OAuth完了）
- 954行のAPIクライアント、242のUI画面
- 352 Phase完了

### Etsy連携（実装済み・認証待ち）
- OAuth2 PKCE認証フロー実装
- ヴィンテージ自動判定、タグ最適化

### Shopify連携（実装済み・認証待ち）
- Social Commerce Hub（Instagram/TikTok配信）
- AI商品説明最適化、Schema.org構造化データ

### Instagram/TikTok連携（設計済み・M-7/M-8）
- Instagram: Shopify「Facebook & Instagram」チャネル経由
- TikTok: Phase 1 Shopify経由、Phase 2 直接API

## 完成済みPhase

### Phase 40: Joom出品ワークフロー ✅
- Phase 40-A: 翻訳・属性抽出エンジン（packages/enrichment）
- Phase 40-B: 画像処理パイプライン（apps/worker/src/lib/image-processor.ts）
- Phase 40-C: Joom API連携（apps/worker/src/lib/joom-api.ts, joom-publish-service.ts）
- Phase 40-D: UI・運用機能（apps/web/src/app/joom/page.tsx, products/review/page.tsx）

### Phase 114-270: eBay機能強化 ✅
- 157 Phases完了（詳細はHANDOVER.md参照）

## 現在のステータス

**次のアクション候補:**
- INT-1: Etsy OAuth認証実行
- INT-2: Shopify OAuth認証実行
- INT-3〜INT-4: テスト出品（Etsy/Shopify）
- M-7: Instagram Shop連携（Shopify Hub経由・設定のみ）
- M-8: TikTok Shop連携（Phase 1: Shopify経由、Phase 2: 直接API）
- INT-5〜INT-6: 全チャネル在庫同期結合テスト

## コード規約

### ファイル命名
- TypeScript: `kebab-case.ts`
- React: `PascalCase.tsx`
- テスト: `*.test.ts`, `*.spec.ts`

### コミットメッセージ
```
feat: 新機能
fix: バグ修正
refactor: リファクタリング
test: テスト追加
docs: ドキュメント
chore: その他
```

### テストカバレッジ目標
- 単体テスト: 90%
- 統合テスト: 80%
- E2Eテスト: 主要パス

## 環境変数

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...

# Joom (OAuth取得済み)
JOOM_CLIENT_ID=...
JOOM_CLIENT_SECRET=...

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

## 開発ログ

過去の実装履歴は `/Users/naokijodan/開発ログ/rakuda_*.md` を参照。

## 注意事項

1. **テスト必須** - コード変更後は必ずテスト実行
2. **コミット規約** - 上記フォーマットに従う
3. **Obsidianノート** - 作業完了後は開発ログを作成
4. **3者協議** - 設計判断が必要な場合は `multi_discuss` を使用

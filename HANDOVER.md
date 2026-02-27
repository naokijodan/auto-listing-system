# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-27
**Phase**: Phase 2 eBay E2Eテスト — 基盤構築完了、認証待ち
**最新コミット**: 06c78325
**方針**: eBay Phase生成を停止、実用化に注力

---

## ⚠️ 重要: 方針転換

**eBay Phaseの追加生成は一切行わない。**
- `generate_series.py` は使用禁止
- スタブファイル（21,597件）は削除済み
- コア実装（37ルート + 680 UIページ）のみ残存
- 詳細: `SESSION_INSTRUCTION_CLEANUP.md`

---

## 🚀 次のセッションで実行すること

### Phase 2: eBay E2Eテスト（ユーザー操作が必要）

**ブロッカー**: eBay Sandbox認証情報がダミー値。実テスト実行には以下が必要:

| ステップ | 内容 | 実行者 |
|----------|------|--------|
| 1. Sandbox Keys取得 | developer.ebay.com でSandbox Application Keys取得 | ユーザー |
| 2. セットアップ | `npm run ebay:setup` で認証情報を設定 | ユーザー+Claude |
| 3. OAuth認証 | ブラウザでeBay Sandboxにログイン・認証 | ユーザー |
| 4. Business Policies | Sandbox Seller Hubでポリシー3つ作成 | ユーザー |
| 5. E2Eテスト実行 | `npm run ebay:e2e` でフルフロー確認 | Claude |

**テスト基盤は構築済み:**
- `scripts/setup-ebay-sandbox.sh` - 対話式セットアップ
- `scripts/ebay-e2e-test.ts` - API経由フルフローテスト
- `apps/web/e2e/ebay-publish-flow.spec.ts` - Playwright UIテスト

### Phase 3: 外部認証（ユーザー操作が必要）

| タスク | 内容 | 前提条件 |
|--------|------|----------|
| **Etsy OAuth** | Developer Account → API Key → PKCE → トークン取得 | ブラウザ操作必要 |
| **Shopify OAuth** | Partner Account → アプリ作成 → OAuth → トークン取得 | ブラウザ操作必要 |
| **Depop Partner API** | Partner Portal申請 → APIキー取得 | 申請が必要 |

### Phase 4: 統合テスト

| タスク | 内容 | 前提条件 |
|--------|------|----------|
| **全チャネル出品テスト** | 1商品を全チャネルに出品 | Phase 3完了 |
| **在庫同期テスト** | 在庫変更が全チャネルに反映 | Phase 3完了 |

---

## 今回のセッションで完了したこと

### Phase 2 準備: eBay E2Eテスト基盤（2026-02-27）

1. **E2Eテスト基盤構築**
   - `scripts/setup-ebay-sandbox.sh` - 対話式Sandboxセットアップ
   - `scripts/ebay-e2e-test.ts` - API経由フルフローE2Eテスト（dry-run対応）
   - `apps/web/e2e/ebay-publish-flow.spec.ts` - Playwright UIテスト
   - npm scripts: `ebay:setup`, `ebay:e2e`, `ebay:e2e:dry`, `ebay:e2e:cleanup`

2. **eBay認証状況の調査**
   - DB認証情報はダミー値（`test-client-id`）のみ
   - 「OAuth済」は実装完了の意味で、実トークンは未取得
   - Phase 2とPhase 3のeBay部分は同時に実施が必要

### Phase 1: クリーンアップ（2026-02-27）

1. **Depop TSエラー4件修正**
   - `depop-publish-service.ts` の型エラーを全て修正
   - `DownloadResult`/`OptimizationResult`/`UploadResult` の正しいプロパティアクセス
   - `enrichmentTaskManager.translate` → `TranslatorService.translateOnly` に変更

2. **スタブファイル一括削除**
   - API: 21,597ファイル削除 → コア37ファイル残存
   - Web: 19,550ディレクトリ削除 → コア680ページ残存
   - 合計: 41,151ファイル変更、2,290,660行削除

3. **ebay-routes.ts再構築**
   - 54,023行 → 93行
   - 37のコアルートのみ登録、セクション別に整理

4. **テスト全パス**
   - Worker: 1,221テスト (61ファイル) 全パス
   - API: 344テスト (18ファイル) 全パス

---

## コア実装の現状

### 販売チャネル

| チャネル | APIクライアント | 出品サービス | ステータス |
|---------|---------------|------------|----------|
| eBay | 954行 | 425行 | 実装済・Sandbox認証待ち |
| Joom | 811行 | 808行 | OAuth済・動作可能 |
| Etsy | 268行 | 298行 | 実装済・認証待ち |
| Shopify | 197行 | 404行 | 実装済・認証待ち |
| Depop | 180行 | 335行 | 実装済・認証待ち |

### コアeBayルート（37ファイル）

**認証**: ebay-auth
**出品管理**: ebay-listings, ebay-templates, ebay-bulk, ebay-bulk-editor, ebay-auto-relist
**在庫・売上**: ebay-inventory, ebay-inventory-optimization, ebay-sales, ebay-sales-forecast, ebay-auto-pricing, ebay-auto-restock
**注文・配送**: ebay-orders, ebay-returns, ebay-logistics, ebay-shipping-international
**顧客管理**: ebay-messages, ebay-auto-messages, ebay-feedback, ebay-feedback-analysis, ebay-buyer-segments, ebay-customer-lifecycle
**分析**: ebay-analytics, ebay-optimization, ebay-ab-tests, ebay-recommendations, ebay-competitors, ebay-reports
**マーケティング**: ebay-promotions, ebay-ads
**セラーツール**: ebay-seller-hub, ebay-scheduled, ebay-multilingual, ebay-notification-hub, ebay-help-center
**商品設定**: ebay-variations, ebay-bundles

### 既知のTSエラー（スコープ外）

- `apps/api/src/lib/ab-test-engine.ts` — Prisma JSON型の不整合
- `apps/api/src/lib/chatbot-engine.ts` — Orderスキーマの不整合
- `apps/api/src/lib/sales-forecast-engine.ts` — OrderStatus型、フィールド名の不整合

これらは今回のクリーンアップのスコープ外。認証・E2Eテスト後に対応予定。

---

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

## 完了条件（SESSION_INSTRUCTION_CLEANUP.md より）

- [x] TSエラー0件（Depop分）
- [x] テスト全件パス
- [x] スタブファイル整理完了
- [ ] eBay出品E2Eテスト成功（Phase 2）
- [ ] Etsy/Shopify/Depop認証完了（Phase 3 — ユーザー操作後）
- [ ] 全チャネル統合テスト成功（Phase 4）

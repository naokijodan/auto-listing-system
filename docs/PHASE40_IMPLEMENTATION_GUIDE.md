# Phase 40 実装指示書

**対象**: 次セッションのClaude
**作成日**: 2026-02-07

---

## 指示文（コピペ用）

```
RAKUDAプロジェクトのPhase 40を実装してください。

設計書: docs/PHASE40_JOOM_WORKFLOW_DESIGN.md

実装順序:
1. Phase 40-A: 翻訳・属性抽出エンジン
2. Phase 40-B: 画像処理パイプライン
3. Phase 40-C: Joom API連携
4. Phase 40-D: UI・運用機能

各フェーズ完了後にテストを実行し、コミットしてください。
```

---

## プロジェクト概要

### RAKUDA とは
越境EC自動化システム。日本のECサイト（ヤフオク、メルカリ、Amazon JP）から商品をスクレイピングし、海外マーケットプレイス（Joom、eBay）に自動出品する。

### 技術スタック
- **Frontend**: Next.js 16 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ (Redis)
- **Storage**: MinIO/S3
- **AI**: OpenAI GPT-4o

### 現在の状態
- Chrome拡張機能: 完成（商品スクレイピング可能）
- Joom OAuth: 完了（トークン取得済み）
- eBay: EAGLEで対応中のため後回し
- 基本インフラ: 完成（API、Worker、Web）

---

## Phase 40-A: 翻訳・属性抽出エンジン

### 作成するファイル

1. **`apps/api/src/services/enrichment/translator.ts`**
   - OpenAI GPT-4oを使用
   - 日本語→英語/ロシア語の翻訳
   - 商品説明として自然な表現に

2. **`apps/api/src/services/enrichment/attribute-extractor.ts`**
   - 商品タイトル・説明文から属性を抽出
   - brand, color, size, material, condition
   - Joom用のitemSpecificsを生成

3. **`apps/api/src/services/enrichment/content-validator.ts`**
   - 禁制品チェック（電池、危険物、ワシントン条約）
   - 商標侵害リスク判定
   - 結果: approved / rejected / review_required

4. **`apps/worker/src/workers/translate-worker.ts`**
   - BullMQワーカー
   - translate-queueを処理
   - 翻訳→属性抽出→検証を一括処理

### プロンプト設計のポイント

```
翻訳フェーズは「翻訳＋属性抽出＋規制判定」の三位一体で実行する。
1回のAPI呼び出しで3つの結果を得ることでコスト削減。
```

---

## Phase 40-B: 画像処理パイプライン

### 作成するファイル

1. **`apps/api/src/services/assets/image-downloader.ts`**
   - 元サイトから画像をダウンロード
   - タイムアウト: 30秒
   - リトライ: 3回

2. **`apps/api/src/services/assets/image-optimizer.ts`**
   - sharp/jimp でリサイズ
   - 最大サイズ: 1200x1200
   - フォーマット: WebP優先、JPEGフォールバック
   - 背景: 白（Joom推奨）

3. **`apps/api/src/services/assets/storage.ts`**
   - MinIO/S3にアップロード
   - 公開URLを返す
   - バケット: rakuda-images

4. **`apps/worker/src/workers/image-worker.ts`**
   - BullMQワーカー
   - image-queueを処理
   - ダウンロード→最適化→保存

### 重要ポイント

```
元サイト（メルカリ、ヤフオク）の画像URLは有効期限がある。
必ず自社ストレージに保存してからJoomに渡すこと。
```

---

## Phase 40-C: Joom API連携

### 作成するファイル

1. **`apps/api/src/services/joom/client.ts`**
   - Joom Merchant API v3クライアント
   - OAuth Bearer Token認証
   - エラーハンドリング

2. **`apps/api/src/services/joom/products.ts`**
   - createProduct, updateProduct, deleteProduct
   - getProduct, listProducts

3. **`apps/api/src/services/joom/images.ts`**
   - uploadImage (URL指定)
   - deleteImage

4. **`apps/worker/src/workers/joom-publish-worker.ts`**
   - BullMQワーカー
   - joom-publish-queueを処理
   - 商品作成→画像紐付け

### Joom API エンドポイント

```
Base URL: https://api-merchant.joom.com/api/v3

POST   /products           商品作成
GET    /products           商品一覧
GET    /products/{id}      商品詳細
PUT    /products/{id}      商品更新
DELETE /products/{id}      商品削除
POST   /products/{id}/images  画像追加
GET    /orders             注文一覧
```

---

## Phase 40-D: UI・運用機能

### 作成/更新するファイル

1. **`apps/web/app/products/[id]/preview/page.tsx`**
   - Joom出品プレビュー画面
   - Dry-Runモード対応

2. **`apps/web/app/review/page.tsx`**
   - 禁制品レビュー画面
   - review_required商品の一覧

3. **`apps/web/app/joom/page.tsx`**
   - Joom出品管理画面
   - 一括出品ボタン
   - 出品履歴

---

## 既存コードの参考箇所

| 機能 | 参考ファイル |
|------|-------------|
| BullMQワーカー | `apps/worker/src/workers/translation-worker.ts` |
| Prismaスキーマ | `packages/database/prisma/schema.prisma` |
| APIルート | `apps/api/src/routes/products.ts` |
| 商品スキーマ | `packages/schema/src/product.ts` |
| 設定 | `packages/config/src/index.ts` |

---

## テスト

各フェーズ完了後に実行:

```bash
# 単体テスト
npm run test:unit

# 統合テスト
npm run test:integration

# E2Eテスト（必要に応じて）
npm run test:e2e
```

---

## コミット規約

```
feat: Phase 40-A - 翻訳・属性抽出エンジン実装
feat: Phase 40-B - 画像処理パイプライン実装
feat: Phase 40-C - Joom API連携実装
feat: Phase 40-D - Joom出品UI実装
```

---

## 注意事項

1. **OpenAI APIキー**: 環境変数 `OPENAI_API_KEY` が必要
2. **MinIO**: ローカル開発では `docker-compose up minio` で起動
3. **Joomトークン**: 既にDBに保存済み（2026-03-08まで有効）
4. **テスト**: モックを使用してAPIコールを避ける

---

## 完了条件

- [ ] 翻訳ワーカーが動作する
- [ ] 画像がS3/MinIOに保存される
- [ ] Joom APIで商品が作成できる
- [ ] Dry-Runモードでプレビューできる
- [ ] 禁制品がreview_requiredになる
- [ ] テストカバレッジ80%以上

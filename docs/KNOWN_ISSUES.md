# RAKUDA 既知の問題と再発防止策

最終更新: 2026-03-04

## 使い方
新しいセッション開始時に必ずこのファイルを確認すること。
問題を解決したら、このファイルに追記すること。

---

## 1. TypeScript/型関連

### 1-1: Prisma enum import パスの混在
- **症状**: `@rakuda/database` と `@prisma/client` の enum import が混在 → TSエラー大量発生
- **原因**: Prismaスキーマ変更後に `prisma generate` を実行せずコードを書いた
- **防止策**: Prismaスキーマ変更時は必ず `prisma generate` → 全ファイルの import 確認
- **CI対策**: ci.yml に `prisma generate` ステップ追加済み（commit 6848404b）

### 1-2: sourceType 大文字小文字の不統一
- **症状**: Chrome拡張=UPPERCASE、Zod=lowercase → フィルタリング失敗、クラッシュ
- **防止策**: 全レイヤーで **UPPERCASE**（Prisma enum形式）に統一。新規追加時も必ず確認
- **解決済み**: commit ef896c1b

---

## 2. Prisma/データベース関連

### 2-1: マイグレーション実行漏れ
- **症状**: コードは新スキーマを参照、本番DBは旧スキーマ → ランタイムエラー
- **防止策**: デプロイ時チェックリスト → マイグレーション適用を必ず含める
- **手順**: Coolify Terminal → `npx prisma migrate deploy`

### 2-2: DROP TABLE を含むマイグレーション
- **防止策**: 実行前に必ずDBバックアップ、外部キー制約を確認

---

## 3. Docker/デプロイ関連（Coolify）

### 3-1: Node メモリ不足
- **症状**: `cannot allocate memory` / `JavaScript heap out of memory`
- **防止策**: Dockerfile に `ENV NODE_OPTIONS="--max-old-space-size=4096"` を必ず設定

### 3-2: npm ci が devDependencies をスキップ
- **症状**: `turbo: not found (exit 127)`
- **原因**: Coolify が NODE_ENV=production を --build-arg として渡す
- **防止策**: Dockerfile で `RUN NODE_ENV=development npm ci --legacy-peer-deps`

### 3-3: Coolify デプロイ stuck in_progress
- **復旧手順**: `POST /api/v1/applications/{uuid}/stop` で明示停止
- **防止策**: concurrent_builds=1 を推奨

---

## 4. API統合関連

### 4-1: eBay Sandbox vs 本番の URL 違い
- **防止策**: API_BASE と AUTH_BASE を環境変数で分離。ドキュメント参照

### 4-2: eBay カテゴリ別 condition 値
- **症状**: カテゴリによって有効な condition enum が異なる
- **防止策**: Taxonomy API の getConditionsForCategory で実行時確認

### 4-3: eBay Business Policy opt-in
- **防止策**: Sandbox では明示的に opt-in が必要。セットアップ時に実行

### 4-4: Joom 必須フィールド送信漏れ
- **必須**: Store ID, Currency, Shipping Weight（kg単位）
- **防止策**: 公式CSV仕様（30フィールド）との mapping table を維持

### 4-5: Shopify Webhook body parsing 競合
- **症状**: express.json() が raw body を消費 → HMAC検証失敗
- **防止策**: Webhook エンドポイントを express.json() から除外

---

## 5. CI/CD関連

### 5-1: GitHub Actions ユーザーレベル無効化
- **解決済み**: 2026-03-04 GitHub Supportが設定修正。スパム検知の誤検出だった
- **注意**: リモートリポジトリ名は `auto-listing-system`（ローカルフォルダ名 `rakuda` と異なる）

### 5-2: ci.yml に prisma generate 欠落
- **解決済み**: commit 6848404b

---

## 6. 見積もり精度

### 実績データ
| 作業種類 | 見積もり精度 | バッファ推奨 |
|---|---|---|
| Codex によるコード生成 | 高い（±20%） | ×1.2 |
| API統合・テスト | 普通（±50%） | ×1.5 |
| 本番デプロイ・インフラ | 低い（±200%） | ×3.0 |
| DB マイグレーション | 低い（影響範囲不明） | ×2.5 |

### ルール
- 本番環境が絡む作業は、AI工数 × 3 で見積もる
- 「想定外の問題」は必ず発生する前提で計画する

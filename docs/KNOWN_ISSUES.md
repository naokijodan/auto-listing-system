# RAKUDA 既知の問題と再発防止策

最終更新: 2026-03-09 (Session 23)

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

### 3-2: Turboキャッシュで古いコードが残存
- **症状**: `prisma.joomListing.upsert()` がソースコードに存在しないのにランタイムエラー
- **原因**: `TURBO_FORCE=1` 環境変数はturboに無視される（CLIフラグのみ有効）→ 古いビルド成果物がキャッシュから使われた
- **防止策**: Dockerfileでは `RUN npx turbo run build --force`（`--force` CLIフラグ）を使用
- **解決済み**: commit 1af9233b

### 3-3: npm ci が devDependencies をスキップ
- **症状**: `turbo: not found (exit 127)`
- **原因**: Coolify が NODE_ENV=production を --build-arg として渡す
- **防止策**: Dockerfile で `RUN NODE_ENV=development npm ci --legacy-peer-deps`

### 3-4: Coolify デプロイ stuck in_progress
- **復旧手順**: `POST /api/v1/applications/{uuid}/stop` で明示停止
- **防止策**: concurrent_builds=1 を推奨
- **解決済み（Session 17）**: concurrent_builds=1に変更完了（Coolify Server > Advanced設定）

### 3-5: Docker Build Cache蓄積によるメモリ枯渇
- **症状**: Build Cache 30GB蓄積 → メモリ177MB free → Docker buildがハング
- **復旧**: `docker builder prune -f --all` で25GB回収
- **防止策**: Coolifyの毎日Docker Cleanup（0:00 UTC）が有効。force_docker_cleanup=true
- **解決済み（Session 16-17）**: Cleanup自動実行確認済み、Build Cache 5.8GBに安定

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

### 5-3: CIテスト36件失敗（Session 12で修正）
- **症状**: 12ファイルで36テスト失敗（puppeteer, scraper, shopify-webhook, joom-publish-flow）
- **原因**: 6つの根本原因
  1. puppeteer-extra mock不整合（`vi.mock('puppeteer')` → `vi.mock('puppeteer-extra')`）
  2. captcha-detector mock欠落（6スクレイパーテストに追加）
  3. scraping-daily-limit / scraping-circuit-breaker mock欠落
  4. sourceChannel assertionが実装と不一致（ソースコードはsourceChannelを書かない）
  5. joom-api / image系モジュールmock欠落（統合テスト）
  6. prisma.$transaction mock欠落
- **防止策**: テスト追加時はソースコードのimportを確認し、全外部依存をmockする
- **解決済み**: commit 4e159ef6

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

---

## 7. Joom API関連

### 7-1: Joom商品がPAUSEDになる
- **症状**: joom-status-syncジョブがJoom API側でdisabled検出→DB側をPAUSEDに更新
- **原因推定**: SBDC101の歴史的価格バグ（variant price: 13,607,648.12 USD）。現在はPricingPipelineの正規化で防止済み
- **復旧**: Worker再デプロイ後にenable APIジョブで再有効化
- **防止策**: PricingPipelineのnormalizer.tsで為替レートサニティチェック実装済み（JPY→USD: 0.001-0.02範囲）
- **ステータス**: 再有効化中（Session 12）

### 7-2: Joom API v3 enable/disable エンドポイント変更
- **症状**: `POST /products/{id}/enable` と `/disable` が404エラー
- **原因**: Joom API v3でこれらのエンドポイントは廃止（v2のみ）
- **修正**: `POST /products/update?id={id}` + `{ enabled: true/false }` に変更
- **解決済み**: commit 292d9e9d

### 7-3: eBayブラウザ操作の禁止【絶対遵守】
- **症状**: Playwrightでログイン画面を操作→ボット検知で永久サスペンドのリスク
- **ルール**: eBayに対するブラウザ自動操作（Playwright/Puppeteer）・スクレイピングは全面禁止
- **安全なアクセス**: API経由のみ、またはユーザーの直接操作
- **OAuth認証**: URLを提示してユーザーに手動ログインしてもらう（ブラウザ自動操作厳禁）

### 7-4: Worker環境変数のSandbox/Production不整合
- **症状**: Worker EBAY_ENV=sandbox + DB本番トークン → トークンリフレッシュ常時失敗 → 全eBay API操作停止
- **原因**: Coolify Worker環境変数がSandbox設定のまま放置されていた
- **防止策**: デプロイ時にAPI/Worker/Web間で環境変数の整合性を必ず確認。将来的にはDBのSSoT化で環境変数依存を排除する
- **解決済み**: Session 13（2026-03-07）で環境変数をProduction設定に修正

### 7-5: テスト出品の放置によるアカウントリスク
- **症状**: eBayテスト出品がViewを集めてしまった
- **防止策**: テスト出品は動作確認後に即座に削除する。セッション内でクリーンアップ確認必須
- **対応**: eBayは手動終了、Shopifyはadmin API DELETE、JoomはWorker経由disable

### 7-6: Coolifyデプロイがqueuedのまま進まない
- **症状**: in_progressデプロイがスタック→後続のqueuedが処理されない
- **復旧手順**: `POST /api/v1/applications/{uuid}/stop` → 停止確認 → 再デプロイ
- **防止策**: concurrent_builds=1推奨。デプロイ後はステータス確認を必ず行う

### 7-7: Joom API v3はcamelCaseフィールド名必須
- **症状**: 画像origUrl空、shippingWeight送信されない → J1009, J1130 infraction
- **原因**: `joom-api.ts`がsnake_case（`main_image_url`, `shipping_weight`等）を送信
- **修正**: 全フィールドをcamelCase化（`mainImage`, `shippingWeight`等）
- **解決済み**: commit f9526e4e

### 7-8: OpenAI GPT-5はtemperature・max_tokensパラメータ非対応
- **症状**: `400 Unsupported value: 'temperature' does not support 0.3` / `Unsupported parameter: 'max_tokens'`
- **修正**: temperature行を全削除（15ファイル）、max_tokens→max_completion_tokens（11ファイル）
- **解決済み**: commit 28daca33, 681b6d3c

### 7-9: S3アップロードのタイムアウト・リトライ不足
- **症状**: image-queue DLQに12件蓄積（socket timeout）
- **修正**: socketTimeout 30s→120s、uploadFile()に3回リトライ+exponential backoff、Cloudinaryフォールバック追加
- **解決済み**: commit 4aad8679

### 7-10: eBay画像パイプラインの設計ギャップ
- **症状**: eBay出品時にmarketplaceDataに画像URLが含まれない。processCreateInventoryItemがEnrichmentTask.optimizedImagesを参照しない
- **原因**: ebay-publish-service.tsのprocessImagesForListingがEnrichmentTaskにのみ画像保存し、Listing.marketplaceDataに保存していなかった。またebay-publish.tsがProduct.processedImagesのみ参照
- **修正**: (1) processImagesForListingでListing.marketplaceData.ebayImagesに保存追加 (2) processCreateInventoryItemでEnrichmentTask.optimizedImagesを最優先で参照
- **解決済み**: commit e8a4a860

### 7-11: listing-pipeline.test.ts 統合テスト失敗
- **症状**: ensureEbayCredential()でprisma.marketplaceCredential.upsertがundefined返却
- **原因**: Worker test/setup.tsのmockPrismaにupsert/delete等のメソッドが未定義。API側のsetup.tsには存在していたがWorker側に漏れていた
- **修正**: marketplaceCredential.upsert、ebayCategoryMapping.upsert、translationPrompt全体、各モデルのdelete、source/enrichmentTask/productのcreateデフォルト値を追加
- **解決済み**: commit b1dc825c（Session 23）

### 7-12: JoomBaseClient.getCredentials()がDB行全体をキャスト
- **症状**: Joom v3出品で「Joom access token not configured」エラー
- **原因**: `getCredentials()`がPrismaのMarketplaceCredential行を`JoomApiConfig`に`as unknown as`でキャスト。`accessToken`は`row.credentials`JSON内にあるのに、`row.accessToken`を参照していた
- **修正**: `row.credentials`からフィールドを個別抽出、`row.tokenExpiresAt`も返却
- **教訓**: Prisma行をインターフェースにキャストする際、JSONカラム(`credentials`)の展開を忘れない
- **解決済み**: commit e4441598

### 7-13: Joom Merchant Tier: Unverified
- **症状**: 出品した商品がJoomモデレーションでRejectedになる
- **原因**: マーチャントがUnverified Tierのため、商品審査が厳しい
- **対応**: Joom Merchant PortalでTrusted Tier取得を申請する必要がある
- **ステータス**: 未対応

### 7-14: Joom画像 "Invalid aspect ratio" エラー
- **症状**: Joom Merchant Portalで画像にエラーアイコン表示。"Invalid aspect ratio"
- **原因**: Joom API v3は画像に「square or almost square」を要求。テスト出品で1000x1620（比率1:1.62）の縦長画像を送信→拒否
- **修正**: image-optimizer.tsに`squarePadding`オプション追加。`fit: 'contain'` + 白背景で正方形にパディング。processImageForJoomとImagePipelineServiceで使用
- **教訓**: Joom画像要件「550x550 minimum」だけでなく「square or almost square」のアスペクト比制約も必須
- **解決済み**: commit 3ff77681

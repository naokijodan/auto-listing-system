# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-12
**Phase**: 65-66完了
**担当**: Claude

## 現在のステータス

### Phase 65-66: レポート自動生成

**ステータス**: 完了 ✅

#### 実装内容

**Phase 65: レポート生成エンジン**
1. レポート生成エンジン (`apps/api/src/lib/report-generator.ts`)
   - データ収集関数（売上、注文、在庫、商品パフォーマンス、利益、顧客、マーケットプレイス比較）
   - PDF生成（pdfkit）
   - Excel生成（exceljs）
   - CSV生成
   - レポートタイプ別レンダリング

2. レポート生成プロセッサ (`apps/worker/src/processors/report.ts`)
   - BullMQジョブとしてレポート生成を実行
   - スケジュール実行履歴の記録
   - Slack通知連携

3. スケジューラー更新 (`apps/worker/src/lib/scheduler.ts`)
   - `runScheduledReports()` - スケジュールされたレポートを実行
   - `triggerReportGeneration()` - 手動でレポート生成をトリガー

4. レポートAPI更新 (`apps/api/src/routes/reports.ts`)
   - GET /api/reports/:id/file - レポートファイルダウンロード
   - POST /api/reports/:id/generate - レポート即時生成トリガー

**Phase 66: レポートUI＆スケジュール配信**
1. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `reportApi` - レポート関連API（CRUD、生成、ダウンロード）
   - Report/ReportTemplate/ReportSchedule型定義

2. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `useReports()` - レポート一覧
   - `useReport()` - レポート詳細
   - `useReportStats()` - レポート統計
   - `useReportTypes()` - レポートタイプ一覧
   - `useReportFormats()` - フォーマット一覧
   - `useReportTemplates()` - テンプレート一覧
   - `useReportSchedules()` - スケジュール一覧

3. レポート生成ページ (`apps/web/src/app/report-generator/page.tsx`)
   - レポート統計ダッシュボード
   - レポート作成ダイアログ（タイプ・形式・期間選択）
   - レポート一覧テーブル（ステータス・進捗表示）
   - ダウンロード・再生成・削除機能
   - スケジュール管理タブ（CRUD）

4. サイドバー更新 (`apps/web/src/components/layout/sidebar.tsx`)
   - レポート生成リンク追加

5. パッケージ更新 (`apps/api/package.json`)
   - exceljs追加

---

### Phase 63-64: 顧客対応自動化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 63-64: 顧客対応自動化**
1. 顧客対応エンジン (`apps/api/src/lib/customer-support-engine.ts`)
   - メッセージ分析（センチメント・緊急度・カテゴリ判定）
   - 自動返信ルールマッチング
   - テンプレート変数置換
   - デフォルトテンプレート定義
   - デフォルト自動返信ルール定義

2. トリガータイプ
   - KEYWORD: キーワードマッチ
   - SENTIMENT: 感情分析（positive/neutral/negative）
   - CATEGORY: カテゴリマッチ（SHIPPING/REFUND/PRODUCT/GENERAL）
   - FIRST_MESSAGE: 初回メッセージ
   - NO_RESPONSE_24H: 24時間未返信

3. 顧客対応API (`apps/api/src/routes/customer-support.ts`)
   - GET /api/customer-support/stats - 対応統計
   - GET /api/customer-support/messages/pending - 未対応メッセージ一覧
   - POST /api/customer-support/analyze - メッセージ分析
   - POST /api/customer-support/generate-reply - 返信生成
   - GET /api/customer-support/rules - 自動返信ルール一覧
   - POST /api/customer-support/rules - ルール作成
   - PATCH /api/customer-support/rules/:id - ルール更新
   - DELETE /api/customer-support/rules/:id - ルール削除
   - GET /api/customer-support/templates - テンプレート一覧
   - POST /api/customer-support/templates - テンプレート作成
   - PATCH /api/customer-support/templates/:id - テンプレート更新
   - GET /api/customer-support/variables - テンプレート変数一覧
   - POST /api/customer-support/init-defaults - デフォルト初期化

4. Prismaスキーマ更新
   - AutoReplyRuleモデル追加
   - MessageTemplateに `nameEn`, `category`, `variables`, `autoReplyRules` 追加
   - CustomerMessageに `isAutoReply`, `autoReplyRuleId`, `respondedAt`, `category`, `sentiment`, `urgency` 追加

5. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `useCustomerSupportStats()` - 対応統計
   - `usePendingMessages()` - 未対応メッセージ
   - `useAutoReplyRules()` - 自動返信ルール
   - `useMessageTemplates()` - メッセージテンプレート
   - `useTemplateVariables()` - テンプレート変数

6. 顧客対応ページ (`apps/web/src/app/customer-support/page.tsx`)
   - 対応統計ダッシュボード（未対応、本日対応、自動返信率、平均返信時間）
   - 未対応メッセージ一覧（センチメント・緊急度表示）
   - メッセージ分析機能（AIによる分析結果表示）
   - 自動返信生成機能
   - 自動返信ルール管理（CRUD）
   - メッセージテンプレート管理（CRUD）
   - マーケットプレイスフィルター

---

### Phase 61-62: 価格最適化AI

**ステータス**: 完了 ✅

#### 実装内容

**Phase 61-62: 価格最適化AI**
1. 価格最適化エンジン (`apps/api/src/lib/pricing-engine.ts`)
   - 原価→販売価格計算（為替・手数料考慮）
   - 利益率計算（マージン算出）
   - 競合価格分析（過去7日データ）
   - 価格推奨生成（5戦略対応）
   - 一括価格推奨生成
   - 価格調整が必要なリスティング検出
   - 価格自動調整（履歴記録付き）
   - 価格最適化統計取得

2. 価格戦略
   - COMPETITIVE: 競合対抗（最安値付近）
   - PROFIT_MAXIMIZE: 利益最大化
   - MARKET_AVERAGE: 市場平均
   - PENETRATION: 浸透価格（低価格）
   - PREMIUM: プレミアム価格

3. 価格最適化API (`apps/api/src/routes/pricing-ai.ts`)
   - GET /api/pricing-ai/stats - 価格最適化統計
   - POST /api/pricing-ai/calculate - 原価から販売価格計算
   - GET /api/pricing-ai/recommendation/:listingId - 個別価格推奨
   - GET /api/pricing-ai/recommendations - 一括価格推奨
   - GET /api/pricing-ai/adjustments-needed - 調整必要なリスティング
   - POST /api/pricing-ai/apply/:listingId - 価格調整適用
   - POST /api/pricing-ai/bulk-apply - 一括価格調整
   - POST /api/pricing-ai/simulate - 価格変更シミュレーション

4. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `getPricingStats()` - 価格最適化統計取得
   - `getPriceRecommendations()` - 価格推奨取得
   - `getPriceAdjustmentsNeeded()` - 調整必要リスティング取得

5. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `usePricingStats()` - 価格最適化統計
   - `usePriceRecommendations()` - 価格推奨
   - `usePriceAdjustmentsNeeded()` - 調整必要リスティング

6. 価格最適化ページ (`apps/web/src/app/pricing-ai/page.tsx`)
   - 価格最適化統計ダッシュボード
   - 戦略選択UI（5戦略）
   - 価格推奨一覧テーブル
   - 個別価格適用機能
   - 一括価格適用機能
   - マーケットプレイスフィルター
   - 信頼度表示（HIGH/MEDIUM/LOW）
   - 価格差・マージン差分表示

---

### Phase 59-60: パフォーマンス最適化（Redisキャッシュ）

**ステータス**: 完了 ✅

#### 実装内容

**Phase 59-60: Redisキャッシュシステム**
1. キャッシュサービス (`apps/api/src/lib/cache-service.ts`)
   - Redis接続管理
   - TTL管理（30秒〜5分）
   - キャッシュ設定マスター
   - キャッシュ無効化機能
   - キャッシュ統計取得

2. キャッシュミドルウェア (`apps/api/src/middleware/cache.ts`)
   - GETリクエスト自動キャッシュ
   - Cache-Controlヘッダー設定
   - X-Cache (HIT/MISS) ヘッダー
   - キャッシュ無効化ミドルウェア

3. キャッシュ管理API (`apps/api/src/routes/cache-admin.ts`)
   - GET /api/admin/cache/stats - キャッシュ統計
   - GET /api/admin/cache/config - キャッシュ設定
   - POST /api/admin/cache/invalidate - キャッシュ無効化
   - POST /api/admin/cache/warm - キャッシュウォームアップ

4. 既存ルートにキャッシュ統合
   - shipments.ts - 発送処理時に統計キャッシュ無効化
   - sourcing.ts - 仕入れ更新時に統計キャッシュ無効化

**キャッシュTTL設定**:
- KPI/統計系: 60秒
- 発送/仕入れ系: 30秒
- マスタデータ系: 300秒（5分）
- 為替レート: 300秒（5分）

---

### Phase 57-58: ダッシュボード統合

**ステータス**: 完了 ✅

#### 実装内容

**Phase 57-58: ダッシュボード統合**
1. メインダッシュボード更新 (`apps/web/src/app/page.tsx`)
   - 発送管理カード追加
     - 未発送件数
     - 緊急件数（24時間以内）
     - 本日発送件数
     - 緊急アラート表示
   - 仕入れ管理カード追加
     - 未確認件数
     - 発注済み件数
     - 発送準備OK件数
     - 要対応アラート表示
   - クイックリンク拡張（4列）
     - 売れ筋分析
     - 滞留在庫
     - 発送処理
     - 仕入れ確認

2. SWRフック統合
   - `useShipmentStats()` - 発送統計
   - `useSourcingStats()` - 仕入れ統計

---

### Phase 55-56: 仕入れ管理機能

**ステータス**: 完了 ✅

#### 実装内容

**Phase 55-56: 仕入れ管理**
1. 仕入れ管理API (`apps/api/src/routes/sourcing.ts`)
   - GET /api/sourcing/pending - 仕入れ待ち一覧
   - PATCH /api/sourcing/:orderId/status - ステータス更新
   - GET /api/sourcing/stats - 仕入れ統計
   - POST /api/sourcing/bulk-update - 一括ステータス更新

2. 仕入れ管理ページ (`apps/web/src/app/sourcing/page.tsx`)
   - 仕入れ待ち注文一覧（ステータス別フィルター）
   - ステータス更新フォーム（未確認→確認済み→発注済み→入荷済み）
   - 仕入れコスト入力
   - 仕入れ元URL表示（外部リンク）
   - 仕入れ統計ダッシュボード
   - マーケットプレイス別フィルター

3. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `getPendingSourcing()` - 仕入れ待ち取得
   - `getSourcingStats()` - 仕入れ統計取得

4. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `usePendingSourcing()` - 仕入れ待ち
   - `useSourcingStats()` - 仕入れ統計

5. サイドバー更新
   - 仕入れ管理リンク追加（ShoppingBagアイコン）

---

### Phase 53-54: 発送管理UI & フロントエンド強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 53-54: 発送管理UI**
1. 発送管理ページ (`apps/web/src/app/shipments/page.tsx`)
   - 未発送注文一覧（緊急・通常フィルター）
   - 発送処理フォーム（配送業者選択、追跡番号入力）
   - 発送統計ダッシュボード（未発送、緊急、本日発送、累計）
   - マーケットプレイス別フィルター（Joom/eBay）
   - 発送期限表示（残り時間、緊急アラート）
   - 検索機能（注文ID、購入者、商品名）

2. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `getPendingShipments()` - 未発送注文取得
   - `getShipmentStats()` - 発送統計取得
   - `getCarriers()` - 配送業者一覧取得

3. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `usePendingShipments()` - 未発送注文
   - `useShipmentStats()` - 発送統計
   - `useCarriers()` - 配送業者一覧

4. サイドバー更新 (`apps/web/src/components/layout/sidebar.tsx`)
   - 発送管理リンク追加（PackageCheckアイコン）

---

### Phase 51-52: 注文処理 & 発送処理自動化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 51: 注文処理強化**
1. order-processor.ts (`apps/worker/src/lib/order-processor.ts`)
   - `processOrder()` - 注文の自動処理
   - `updateInventory()` - 在庫更新（商品ステータスをSOLDに）
   - `checkSourcingAvailability()` - 仕入れ元確認通知
   - `setShipmentDeadline()` - 発送期限設定
   - `notifyNewOrder()` - Slack通知
   - `sendDeadlineAlerts()` - 発送期限アラート
   - `updateSourcingStatus()` - 仕入れステータス更新

2. キュー追加 (`packages/config/src/constants.ts`)
   - ORDER: 'order-queue' - 注文処理キュー
   - SHIPMENT: 'shipment-queue' - 発送処理キュー

3. 注文処理プロセッサ (`apps/worker/src/processors/order.ts`)
   - BullMQジョブとして注文処理を実行

4. webhooks.ts更新 (`apps/api/src/routes/webhooks.ts`)
   - Joom/eBay注文受信時にジョブキューに追加

**Phase 52: 発送処理自動化**
1. shipment-service.ts (`apps/worker/src/lib/shipment-service.ts`)
   - `processShipment()` - 発送処理実行
   - `processBatchShipment()` - 一括発送処理
   - `getPendingShipments()` - 未発送注文一覧
   - `extendShipmentDeadline()` - 発送期限延長
   - `getAvailableCarriers()` - 配送業者一覧
   - Joom/eBay API連携（追跡番号登録）

2. 発送処理プロセッサ (`apps/worker/src/processors/shipment.ts`)
   - BullMQジョブとして発送処理を実行

3. APIエンドポイント (`apps/api/src/routes/shipments.ts`)
   - POST /api/shipments - 発送処理
   - POST /api/shipments/batch - 一括発送処理
   - GET /api/shipments/pending - 未発送注文一覧
   - GET /api/shipments/carriers - 配送業者一覧
   - POST /api/shipments/:orderId/extend-deadline - 発送期限延長
   - GET /api/shipments/stats - 発送統計

4. スケジューラー更新 (`apps/worker/src/lib/scheduler.ts`)
   - 発送期限チェック（6時間ごと）

## ファイル変更一覧

### Phase 65-66
#### 新規作成
- `apps/api/src/lib/report-generator.ts` - レポート生成エンジン
- `apps/worker/src/processors/report.ts` - レポート生成プロセッサ
- `apps/web/src/app/report-generator/page.tsx` - レポート生成ページ

#### 更新
- `apps/api/src/routes/reports.ts` - ファイルダウンロード・即時生成エンドポイント追加
- `apps/worker/src/lib/scheduler.ts` - レポートスケジュール実行関数追加
- `apps/api/package.json` - exceljs追加
- `apps/web/src/lib/api.ts` - レポートAPI追加
- `apps/web/src/lib/hooks.ts` - レポートSWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - レポート生成リンク追加

### Phase 63-64
#### 新規作成
- `apps/api/src/lib/customer-support-engine.ts` - 顧客対応エンジン
- `apps/api/src/routes/customer-support.ts` - 顧客対応API
- `apps/web/src/app/customer-support/page.tsx` - 顧客対応ページ

#### 更新
- `packages/database/prisma/schema.prisma` - AutoReplyRuleモデル、MessageTemplate/CustomerMessage拡張
- `apps/api/src/index.ts` - customer-supportルート登録
- `apps/web/src/lib/api.ts` - 顧客対応API追加
- `apps/web/src/lib/hooks.ts` - 顧客対応SWRフック追加

### Phase 61-62
#### 新規作成
- `apps/api/src/lib/pricing-engine.ts` - 価格最適化エンジン
- `apps/api/src/routes/pricing-ai.ts` - 価格最適化API
- `apps/web/src/app/pricing-ai/page.tsx` - 価格最適化ページ

#### 更新
- `apps/api/src/index.ts` - pricing-aiルート登録
- `apps/web/src/lib/api.ts` - 価格最適化API追加
- `apps/web/src/lib/hooks.ts` - 価格最適化SWRフック追加

### Phase 59-60
#### 新規作成
- `apps/api/src/lib/cache-service.ts` - Redisキャッシュサービス
- `apps/api/src/middleware/cache.ts` - キャッシュミドルウェア
- `apps/api/src/routes/cache-admin.ts` - キャッシュ管理API

#### 更新
- `apps/api/src/index.ts` - cache-adminルート登録
- `apps/api/src/routes/shipments.ts` - キャッシュ無効化追加
- `apps/api/src/routes/sourcing.ts` - キャッシュ無効化追加

### Phase 57-58
#### 更新
- `apps/web/src/app/page.tsx` - ダッシュボード統合（発送・仕入れカード追加）

### Phase 55-56
#### 新規作成
- `apps/api/src/routes/sourcing.ts` - 仕入れ管理API
- `apps/web/src/app/sourcing/page.tsx` - 仕入れ管理ページ

#### 更新
- `apps/api/src/index.ts` - sourcingルート登録
- `apps/web/src/lib/api.ts` - 仕入れ関連API追加
- `apps/web/src/lib/hooks.ts` - 仕入れ関連SWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - 仕入れ管理リンク追加

### Phase 53-54
#### 新規作成
- `apps/web/src/app/shipments/page.tsx` - 発送管理ページ

#### 更新
- `apps/web/src/lib/api.ts` - 発送関連API追加
- `apps/web/src/lib/hooks.ts` - 発送関連SWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - 発送管理リンク追加

### Phase 51-52
#### 新規作成
- `apps/worker/src/lib/order-processor.ts`
- `apps/worker/src/lib/shipment-service.ts`
- `apps/worker/src/processors/order.ts`
- `apps/worker/src/processors/shipment.ts`
- `apps/api/src/routes/shipments.ts`

#### 更新
- `packages/config/src/constants.ts` - ORDER/SHIPMENTキュー追加
- `apps/worker/src/lib/worker-manager.ts` - 注文/発送ワーカー追加
- `apps/worker/src/lib/scheduler.ts` - 発送期限チェック追加
- `apps/api/src/routes/webhooks.ts` - ジョブキュー連携
- `apps/api/src/index.ts` - shipmentsルート登録

## 過去のPhase

### Phase 49-50: Joomカテゴリマッピング & S3直接アップロード
- JoomCategoryMappingモデル
- GPT-4oカテゴリ自動推定
- S3プリサインURLアップロード

### Phase 47-48: E2Eテスト & 画像処理最適化
- Playwright E2Eテスト
- 並列画像処理

### Phase 45-46: Joom APIログ強化 & リアルタイム監視
- APIログDB記録
- SSEキュー監視

### Phase 43-44: ジョブリカバリー & Slackアラート
- FailedJob/IdempotencyKeyモデル
- Slackアラート

### Phase 41-42: BullMQワーカー統合 & フロントエンドUI
- 共有キューパッケージ
- エンリッチメント管理ページ

## 次のPhaseへの推奨事項

### Phase 67-68候補

1. **データベースインデックス最適化**
   - 複合インデックス追加
   - クエリパフォーマンス分析
   - スロークエリ最適化

2. **売上予測AI**
   - 過去データ分析
   - 需要予測モデル
   - 在庫最適化提案

3. **多言語対応強化**
   - i18n完全実装
   - 自動翻訳API連携
   - 地域別コンテンツ最適化

4. **ダッシュボードウィジェット**
   - カスタマイズ可能なウィジェット
   - ドラッグ&ドロップ配置
   - リアルタイム更新

## 技術的注意事項

1. **レポート自動生成**
   - レポートタイプ: SALES_SUMMARY, ORDER_DETAIL, INVENTORY_STATUS, PRODUCT_PERFORMANCE, PROFIT_ANALYSIS, CUSTOMER_ANALYSIS, MARKETPLACE_COMPARISON
   - 出力形式: PDF（pdfkit）, EXCEL（exceljs）, CSV
   - 期間: last_7d, last_30d, last_90d, custom
   - スケジュール: cron式で定義（例: "0 9 * * *" = 毎日9時）
   - 出力先: /tmp/rakuda-reports/

2. **顧客対応自動化**
   - トリガータイプ: KEYWORD, SENTIMENT, CATEGORY, FIRST_MESSAGE, NO_RESPONSE_24H
   - センチメント: positive(0.5以上), neutral(-0.5~0.5), negative(-0.5以下)
   - 緊急度: high(緊急キーワード含む), medium(質問含む), low(その他)
   - カテゴリ: SHIPPING, REFUND, PRODUCT, GENERAL
   - テンプレート変数: {{buyer_name}}, {{order_id}}, {{tracking_number}}, {{product_name}}, {{estimated_delivery}}

2. **価格最適化AI**
   - 最低利益率15%、最大50%、目標25%
   - 競合価格は過去7日のデータを分析
   - 価格変更は履歴テーブル（PriceHistory）に記録
   - 5つの価格戦略から選択可能

2. **注文処理**
   - 注文受信時にORDERキューにジョブ追加
   - 在庫はProductのstatusをSOLDに更新
   - 仕入れ確認通知はNotificationとして作成

3. **発送処理**
   - 追跡番号登録時にJoom/eBay APIに自動連携
   - 発送期限は営業日計算（土日除外）
   - 期限24時間前に緊急アラート

4. **Slack通知**
   - alertManager.sendCustomAlert()を使用
   - 新規注文、発送完了、期限アラートを通知

## 環境変数

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=rakuda-images
JOOM_WEBHOOK_SECRET=xxx
```

## 動作確認

```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev

# Prisma生成
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

## 関連ドキュメント

- `docs/PHASE40_JOOM_WORKFLOW_DESIGN.md`
- `docs/PHASE40_IMPLEMENTATION_GUIDE.md`

# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-16
**Phase**: 114-235完了（136, 142含む）
**担当**: Claude

## 現在のステータス

### Phase 234-235: eBay機能強化（最新）

**ステータス**: 完了 ✅

#### Phase 234: Image Optimizer（画像最適化）
- **API**: `ebay-image-optimizer.ts`（28エンドポイント）
- **UI**: `ebay/image-optimizer/page.tsx`（6タブ）
- **テーマカラー**: amber-600
- ダッシュボード（概要、統計、キュー状況）
- 画像管理（一覧、詳細、最適化、削除）
- 一括最適化（一括処理、ステータス、キャンセル、履歴）
- プリセット（CRUD、適用）
- 背景除去（単体、一括）
- 分析（品質、ストレージ）
- 設定（一般、Webhook）

#### Phase 235: Multi-Currency Manager（多通貨管理）
- **API**: `ebay-multi-currency.ts`（28エンドポイント）
- **UI**: `ebay/multi-currency/page.tsx`（6タブ）
- **テーマカラー**: sky-600
- ダッシュボード（概要、現在レート、統計）
- 通貨管理（一覧、詳細、設定、有効/無効）
- レート管理（更新、履歴、アラート）
- 変換（単体、一括、プレビュー）
- マージン設定（通貨別、ルール）
- レポート（サマリー）
- 設定（一般）

---

### Phase 232-233: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 232: Bulk Pricing Manager（一括価格管理）
- **API**: `ebay-bulk-pricing-manager.ts`（28エンドポイント）
- **UI**: `ebay/bulk-pricing-manager/page.tsx`（6タブ）
- **テーマカラー**: violet-600
- ダッシュボード（概要、最近の更新、統計）
- 価格管理（一覧、詳細、個別更新）
- 一括操作（パーセンテージ、固定額、マージンベース、プレビュー、適用）
- ルール（CRUD、実行）
- スケジュール（CRUD）
- レポート（履歴、生成）
- 設定（一般、通知）

#### Phase 233: SEO Analyzer（SEO分析）
- **API**: `ebay-seo-analyzer.ts`（28エンドポイント）
- **UI**: `ebay/seo-analyzer/page.tsx`（6タブ）
- **テーマカラー**: indigo-600
- ダッシュボード（概要、主要問題、トレンド）
- リスティング分析（一覧、詳細、再分析、最適化）
- キーワード（リサーチ、トレンド、競合）
- タイトル最適化（生成、分析）
- 一括最適化（分析、最適化、提案）
- 競合分析（分析、ベンチマーク）
- 設定（一般、キーワード）

---

### Phase 230-231: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 230: Order Tracking Hub（注文追跡ハブ）
- **API**: `ebay-order-tracking-hub.ts`（28エンドポイント）
- **UI**: `ebay/order-tracking-hub/page.tsx`（6タブ）
- **テーマカラー**: pink-600
- ダッシュボード（概要、最近の更新、アラート）
- 追跡管理（一覧、詳細、更新、顧客通知）
- 配送業者（一覧、詳細、更新）
- 分析（配送パフォーマンス、例外分析、トレンド）
- レポート（サマリー、生成）
- 通知ルール（CRUD）
- 設定（一般、通知）

#### Phase 231: Marketplace Analytics（マーケットプレース分析）
- **API**: `ebay-marketplace-analytics.ts`（28エンドポイント）
- **UI**: `ebay/marketplace-analytics/page.tsx`（6タブ）
- **テーマカラー**: teal-600
- ダッシュボード（概要、パフォーマンス比較、トレンド）
- マーケット詳細（一覧、詳細、売上、リスティング分析）
- クロスマーケット分析（比較、商品パフォーマンス、価格比較）
- カテゴリ分析（パフォーマンス、詳細）
- レポート（サマリー、生成、ダウンロード）
- 予測（売上予測）
- 設定（一般、アラート）

---

### Phase 228-229: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 228: Inventory Alerts V2（在庫アラートV2）
- **API**: `ebay-inventory-alerts-v2.ts`（28エンドポイント）
- **UI**: `ebay/inventory-alerts-v2/page.tsx`（6タブ）
- **テーマカラー**: orange-600
- ダッシュボード（概要、最近のアラート、統計）
- アラート管理（一覧、詳細、確認、解決、スヌーズ、削除、一括解決）
- ルール管理（CRUD、有効/無効切り替え）
- 閾値設定（一覧、更新、一括更新、自動計算）
- レポート（サマリー、生成）
- 設定（一般、通知）

#### Phase 229: Customer Service Hub（カスタマーサービスハブ）
- **API**: `ebay-customer-service-hub.ts`（28エンドポイント）
- **UI**: `ebay/customer-service-hub/page.tsx`（6タブ）
- **テーマカラー**: lime-600
- ダッシュボード（概要、最近のチケット、統計）
- チケット管理（一覧、詳細、CRUD、返信、割り当て、ステータス更新）
- テンプレート（CRUD）
- 自動化（ルールCRUD）
- レポート（パフォーマンス、満足度）
- 設定（一般、通知）

---

### Phase 226-227: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 226: Listing Calendar（出品カレンダー）
- **API**: `ebay-listing-calendar.ts`（28エンドポイント）
- **UI**: `ebay/listing-calendar/page.tsx`（6タブ）
- **テーマカラー**: amber-600
- ダッシュボード（概要、今日の予定、今後の予定）
- カレンダー（月間、週間、日別）
- スケジュール管理（一覧、詳細、CRUD、再スケジュール、承認、即時実行）
- 一括操作（一括スケジュール、再スケジュール、キャンセル）
- テンプレート（CRUD）
- 最適時間（推奨、時間帯分析）
- 設定（一般、通知）

#### Phase 227: Profit Dashboard（利益ダッシュボード）
- **API**: `ebay-profit-dashboard.ts`（28エンドポイント）
- **UI**: `ebay/profit-dashboard/page.tsx`（6タブ）
- **テーマカラー**: sky-600
- ダッシュボード（概要、トレンド、トップ商品）
- 売上分析（サマリー、内訳、商品別）
- コスト分析（サマリー、内訳、商品別）
- 利益分析（サマリー、マーケット別、カテゴリ別、商品別）
- 比較分析（期間比較、年次比較）
- レポート（サマリー、生成、ダウンロード）
- 目標管理（一覧、設定、更新）
- 設定（一般、コストルール）

---

### Phase 224-225: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 224: Notification Hub（通知ハブ）
- **API**: `ebay-notification-hub.ts`（28エンドポイント）
- **UI**: `ebay/notification-hub/page.tsx`（6タブ）
- **テーマカラー**: violet-600
- ダッシュボード（概要、最近の通知、統計）
- 通知管理（一覧、詳細、既読、全既読、削除）
- チャンネル管理（一覧、詳細、更新、テスト送信）
- テンプレート（CRUD、変数管理）
- ルール（CRUD、条件設定）
- 設定（一般、通知設定）

#### Phase 225: Task Manager（タスク管理）
- **API**: `ebay-task-manager.ts`（28エンドポイント）
- **UI**: `ebay/task-manager/page.tsx`（6タブ）
- **テーマカラー**: indigo-600
- ダッシュボード（概要、自分のタスク、チーム）
- タスク管理（一覧、詳細、CRUD、ステータス、担当者変更）
- チェックリスト（追加、更新）
- コメント（追加、削除）
- プロジェクト（一覧、詳細、CRUD）
- レポート（生産性、ワークロード）
- 設定（一般、通知）

---

### Phase 222-223: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 222: Supplier Hub（サプライヤーハブ）
- **API**: `ebay-supplier-hub.ts`（28エンドポイント）
- **UI**: `ebay/supplier-hub/page.tsx`（6タブ）
- **テーマカラー**: pink-600
- ダッシュボード（概要、最近の活動、パフォーマンス）
- サプライヤー管理（一覧、詳細、CRUD）
- 発注管理（一覧、詳細、作成、送信、キャンセル）
- カタログ（一覧、詳細、インポート）
- レポート（支出、パフォーマンス）
- 設定（一般、通知）

#### Phase 223: Returns Manager（返品管理）
- **API**: `ebay-returns-manager.ts`（28エンドポイント）
- **UI**: `ebay/returns-manager/page.tsx`（6タブ）
- **テーマカラー**: teal-600
- ダッシュボード（概要、最近の返品、統計）
- 返品管理（一覧、詳細、承認、拒否、受領、返金）
- ポリシー（一覧、詳細、更新）
- 自動化（ルールCRUD）
- レポート（サマリー、商品別）
- 設定（一般、通知）

---

### Phase 220-221: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 220: Content Studio（コンテンツスタジオ）
- **API**: `ebay-content-studio.ts`（28エンドポイント）
- **UI**: `ebay/content-studio/page.tsx`（6タブ）
- **テーマカラー**: orange-600
- ダッシュボード（概要、最近の活動、品質スコア）
- タイトル管理（一覧、詳細、AI生成、更新）
- 説明文管理（一覧、詳細、AI生成、更新）
- 画像管理（一覧、詳細、最適化、背景除去、強化）
- テンプレート（CRUD）
- 一括処理（タイトル、説明文、画像）
- 設定（一般、AI）

#### Phase 221: Compliance Manager（コンプライアンス管理）
- **API**: `ebay-compliance-manager.ts`（28エンドポイント）
- **UI**: `ebay/compliance-manager/page.tsx`（6タブ）
- **テーマカラー**: lime-600
- ダッシュボード（概要、アラート、トレンド）
- 問題管理（一覧、詳細、解決、無視、スキャン）
- ポリシー（一覧、詳細、更新、同期）
- カスタムルール（CRUD）
- レポート（サマリー、監査、生成）
- 自動化（ルール設定）
- 設定（一般、通知）

---

### Phase 218-219: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 218: Reputation Center（レピュテーションセンター）
- **API**: `ebay-reputation-center.ts`（28エンドポイント）
- **UI**: `ebay/reputation-center/page.tsx`（6タブ）
- **テーマカラー**: amber-600
- ダッシュボード（概要、最近のフィードバック、アラート）
- フィードバック管理（一覧、詳細、返信、修正リクエスト、報告）
- 評価分析（トレンド、カテゴリ別、キーワード、競合比較）
- セラーメトリクス（概要、履歴、欠陥詳細）
- テンプレート（返信テンプレート、自動返信ルール）
- 設定（一般設定）

#### Phase 219: Demand Planner（需要予測）
- **API**: `ebay-demand-planner.ts`（28エンドポイント）
- **UI**: `ebay/demand-planner/page.tsx`（6タブ）
- **テーマカラー**: sky-600
- ダッシュボード（概要、アラート、トレンド）
- 需要予測（一覧、詳細、更新、一括更新）
- 季節分析（概要、商品別、カレンダー）
- 在庫最適化（推奨、安全在庫）
- モデル設定（一覧、有効化、再訓練）
- 設定（一般、アラート）

---

### Phase 216-217: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 216: Payment Gateway（支払いゲートウェイ）
- **API**: `ebay-payment-gateway.ts`（28エンドポイント）
- **UI**: `ebay/payment-gateway/page.tsx`（6タブ）
- **テーマカラー**: purple-600
- ダッシュボード（概要、取引、統計）
- 取引管理（一覧、詳細、払い戻し、キャプチャ、取消）
- 支払い方法（一覧、詳細、更新、接続テスト）
- 出金（一覧、リクエスト、詳細）
- 銀行口座（一覧、追加、更新、削除）
- レポート（収益、手数料）
- 設定（一般、通知）

#### Phase 217: Analytics Hub（分析ハブ）
- **API**: `ebay-analytics-hub.ts`（28エンドポイント）
- **UI**: `ebay/analytics-hub/page.tsx`（6タブ）
- **テーマカラー**: rose-600
- ダッシュボード（概要、KPI、トレンド）
- トラフィック分析（概要、ソース、地域）
- 売上分析（概要、商品別、トレンド）
- コンバージョン分析（概要、パス、アトリビューション）
- カスタムレポート（一覧、作成、生成、削除）
- ウィジェット（一覧、更新）
- 設定（一般、目標）

---

### Phase 214-215: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 214: Order Hub（注文ハブ）
- **API**: `ebay-order-hub.ts`（28エンドポイント）
- **UI**: `ebay/order-hub/page.tsx`（6タブ）
- ダッシュボード（概要、今日の注文、保留中、アクティビティ）
- 注文管理（一覧、詳細、ステータス更新、キャンセル、払い戻し）
- フルフィルメント（ピッキング、パッキング、出荷）
- 自動化（ルール管理）
- レポート（売上、注文）
- 設定（一般、通知）

#### Phase 215: Shipping Center（配送センター）
- **API**: `ebay-shipping-center.ts`（28エンドポイント）
- **UI**: `ebay/shipping-center/page.tsx`（6タブ）
- ダッシュボード（概要、本日出荷、追跡、配送業者別）
- 出荷管理（一覧、詳細、作成、ラベル印刷）
- 追跡（一覧、詳細、例外）
- 配送業者（一覧、設定、料金表）
- レポート（コスト、パフォーマンス）
- 設定（一般、自動化）

---

### Phase 212-213: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 212: Customer Insights（顧客インサイト）
- **API**: `ebay-customer-insights.ts`（28エンドポイント）
- **UI**: `ebay/customer-insights/page.tsx`（6タブ）
- ダッシュボード（概要、メトリクス、アラート）
- 顧客分析（一覧、詳細、タイムライン）
- セグメント（VIP、Regular、New、At Risk、Churned）
- 行動分析（概要、ジャーニー、コホート）
- 予測分析（離脱リスク、LTV予測）
- 設定（一般、アラート）

#### Phase 213: Listing Optimizer（リスティング最適化）
- **API**: `ebay-listing-optimizer.ts`（28エンドポイント）
- **UI**: `ebay/listing-optimizer/page.tsx`（6タブ）
- ダッシュボード（概要、スコア、アラート）
- リスティング（一覧、分析、最適化、一括処理）
- タイトル（提案、AI生成）
- 画像（分析、品質スコア、強化）
- キーワード（トレンド、分析）
- 設定（一般、ルール）

---

### Phase 210-211: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 210: Integration Marketplace（連携マーケットプレイス）
- **API**: `ebay-integration-marketplace.ts`（28エンドポイント）
- **UI**: `ebay/integration-marketplace/page.tsx`（6タブ）
- ダッシュボード（概要、接続済み、人気の連携）
- 連携管理（一覧、詳細、接続、切断、再接続、同期）
- カテゴリ（E-commerce、Accounting、Automation等）
- APIログ（一覧、詳細、統計）
- ウェブフック（一覧、詳細、テスト）
- 設定（一般、通知）

#### Phase 211: Smart Scheduler（スマートスケジューラー）
- **API**: `ebay-smart-scheduler.ts`（28エンドポイント）
- **UI**: `ebay/smart-scheduler/page.tsx`（6タブ）
- ダッシュボード（概要、今後のスケジュール、最近の実行）
- ジョブ管理（CRUD、実行、一時停止、再開）
- カレンダービュー（月、週、日）
- リソース（使用状況、予測）
- レポート（一覧、生成）
- 設定（一般、リソース制限、通知）

---

### Phase 208-209: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 208: Automation Hub（自動化ハブ）
- **API**: `ebay-automation-hub.ts`（28エンドポイント）
- **UI**: `ebay/automation-hub/page.tsx`（6タブ）
- ダッシュボード（概要、統計、最近のアクティビティ）
- 自動化管理（CRUD、有効化/一時停止、手動実行、複製）
- テンプレート（一覧、詳細、適用）
- 実行履歴（一覧、詳細、リトライ）
- トリガー（スケジュール、イベント、Webhook、手動）
- 設定（一般、通知）

#### Phase 209: Data Center（データセンター）
- **API**: `ebay-data-center.ts`（28エンドポイント）
- **UI**: `ebay/data-center/page.tsx`（6タブ）
- ダッシュボード（概要、統計、健全性）
- テーブル管理（一覧、詳細、サンプルデータ）
- バックアップ（一覧、作成、復元、削除、ダウンロード）
- インポート/エクスポート（一覧、作成、詳細）
- クエリ（実行、履歴、保存）
- 設定（一般、バックアップ）

---

### Phase 206-207: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 206: Performance Analytics（パフォーマンス分析）
- **API**: `ebay-performance-analytics.ts`（28エンドポイント）
- **UI**: `ebay/performance-analytics/page.tsx`（6タブ）
- ダッシュボード（スコア、メトリクス、アラート）
- 売上分析（概要、カテゴリ別、地域別、売れ筋）
- 顧客分析（概要、セグメント、行動）
- 商品分析（概要、パフォーマンス、低パフォーマンス）
- ベンチマーク（業界、目標、競合比較）
- 設定（一般、アラート）

#### Phase 207: Market Intelligence（市場インテリジェンス）
- **API**: `ebay-market-intelligence.ts`（28エンドポイント）
- **UI**: `ebay/market-intelligence/page.tsx`（6タブ）
- ダッシュボード（市場概要、トレンド、アラート）
- 市場分析（規模、需要、供給）
- 価格分析（分布、トレンド、競合価格）
- キーワード（トレンド、提案、ギャップ）
- 競合分析（環境、動向、詳細）
- 設定（トラッキング、アラート）

---

### Phase 204-205: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 204: Account Settings（アカウント設定）
- **API**: `ebay-account-settings.ts`（28エンドポイント）
- **UI**: `ebay/account-settings/page.tsx`（6タブ）
- ダッシュボード（概要、アクティビティ、統計）
- プロフィール（基本情報、認証、書類）
- セキュリティ（パスワード、2FA、セッション）
- 支払い（残高、支払い方法、出金設定）
- 通知（メール、プッシュ、頻度）
- 設定（一般、APIキー、連携）

#### Phase 205: Compliance Center（コンプライアンスセンター）
- **API**: `ebay-compliance-center.ts`（28エンドポイント）
- **UI**: `ebay/compliance-center/page.tsx`（6タブ）
- ダッシュボード（スコア、カテゴリ別、アラート）
- ポリシー管理（一覧、詳細、確認）
- 違反管理（一覧、詳細、異議申し立て）
- 監査（履歴、詳細、リクエスト）
- レポート（生成、ダウンロード、規制）
- 設定（自動チェック、通知）

---

### Phase 202-203: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 202: Workflow Automation（ワークフロー自動化）
- **API**: `ebay-workflow-automation.ts`（28エンドポイント）
- **UI**: `ebay/workflow-automation/page.tsx`（6タブ）
- ダッシュボード（概要、統計、最近の実行）
- ワークフロー管理（CRUD、フィルタ、実行、複製）
- 実行履歴（一覧、詳細、キャンセル）
- テンプレート（一覧、使用）
- ログ（実行ログ、レベルフィルタ）
- 設定（同時実行数、タイムアウト、リトライ、通知）

#### Phase 203: Insights Dashboard（インサイトダッシュボード）
- **API**: `ebay-insights-dashboard.ts`（28エンドポイント）
- **UI**: `ebay/insights-dashboard/page.tsx`（6タブ）
- ダッシュボード（概要、KPI、アラート）
- インサイト管理（一覧、フィルタ、影響度）
- トレンド分析（上昇/下降トレンド、サマリー）
- AI予測（予測一覧、推奨アクション）
- レポート（一覧、カスタムダッシュボード）
- 設定（更新頻度、予測期間、アラート設定）

---

### Phase 200-201: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 200: Quality Control（品質管理）
- **API**: `ebay-quality-control.ts`（28エンドポイント）
- **UI**: `ebay/quality-control/page.tsx`（6タブ）
- ダッシュボード（概要、メトリクス、アラート）
- 問題管理（一覧、詳細、解決、無視）
- リスティング品質（スキャン、説明文分析）
- 画像品質（分析、欠落画像）
- 自動化（ルール管理）
- 設定（一般、しきい値）

#### Phase 201: Store Management（ストア管理）
- **API**: `ebay-store-management.ts`（28エンドポイント）
- **UI**: `ebay/store-management/page.tsx`（6タブ）
- ダッシュボード（概要、パフォーマンス、通知）
- カテゴリ管理（CRUD、順序、表示/非表示）
- ページ管理（CRUD、公開状態）
- デザイン（テーマ、バナー）
- プロモーション（CRUD、ステータス管理）
- 設定（サブスクリプション、一般、SEO）

---

### Phase 198-199: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 198: Business Analytics（ビジネス分析）
- **API**: `ebay-business-analytics.ts`（28エンドポイント）
- **UI**: `ebay/business-analytics/page.tsx`（6タブ）
- ダッシュボード（概要、KPI、トレンド）
- 売上分析（概要、カテゴリ別、チャネル別、売れ筋商品）
- 顧客分析（概要、セグメント、地域分布）
- パフォーマンス（リスティング、ファネル、セラーメトリクス）
- レポート（期間比較、生成、スケジュール）
- 設定（一般、アラート）

#### Phase 199: Cross-Border Hub（越境取引ハブ）
- **API**: `ebay-cross-border-hub.ts`（28エンドポイント）
- **UI**: `ebay/cross-border-hub/page.tsx`（6タブ）
- ダッシュボード（概要、市場、コンプライアンス、為替）
- マーケット管理（一覧、詳細、有効化、言語）
- 配送（見積もり、キャリア、ゾーン）
- 関税・税金（計算、VAT、制限、登録）
- レポート（国際売上、配送パフォーマンス）
- 設定（一般、配送、除外国）

---

### Phase 196-197: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 196: Revenue Optimization（収益最適化）
- **API**: `ebay-revenue-optimization.ts`（28エンドポイント）
- **UI**: `ebay/revenue-optimization/page.tsx`（6タブ）
- ダッシュボード（概要、収益トレンド、最適化インパクト）
- 最適化機会（一覧、詳細、適用、却下）
- 価格最適化（分析、推奨、一括適用、シミュレーション）
- バンドル（提案、作成、パフォーマンス）
- レポート（収益、最適化、エクスポート）
- 設定（一般、ルール作成/更新）

#### Phase 197: Financial Reporting（財務レポート）
- **API**: `ebay-financial-reporting.ts`（28エンドポイント）
- **UI**: `ebay/financial-reporting/page.tsx`（6タブ）
- ダッシュボード（概要、財務健全性、キャッシュフロー）
- 損益計算書（サマリー、トレンド、カテゴリ別）
- 貸借対照表（資産、負債、純資産）
- キャッシュフロー（詳細、予測）
- レポート（生成、スケジュール、予算対実績）
- 設定（一般、勘定科目）

---

### Phase 194-195: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 194: Order Automation（注文自動化）
- **API**: `ebay-order-automation.ts`（28エンドポイント）
- **UI**: `ebay/order-automation/page.tsx`（6タブ）
- ダッシュボード（概要、ステータス、アクティビティ）
- ルール管理（CRUD、テスト、一時停止/再開）
- ワークフロー管理（CRUD、ステップ管理）
- スケジュール管理（CRUD、cron設定）
- テンプレート（一覧、適用）
- 設定（実行、通知、ログ、トリガー）

#### Phase 195: Competitive Intelligence（競合インテリジェンス）
- **API**: `ebay-competitive-intelligence.ts`（28エンドポイント）
- **UI**: `ebay/competitive-intelligence/page.tsx`（6タブ）
- ダッシュボード（概要、市場トレンド、競争力スコア）
- 競合管理（追加/削除、スキャン、詳細）
- 商品比較（一覧、追跡、価格分析）
- アラート管理（一覧、ルール作成）
- レポート（競合、市場）
- 設定（モニタリング、通知、自動追跡）

---

### Phase 192-193: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 192: Inventory Forecasting（在庫予測）
- **API**: `ebay-inventory-forecasting.ts`（28エンドポイント）
- **UI**: `ebay/inventory-forecasting/page.tsx`（6タブ）
- ダッシュボード（概要、ヘルススコア、アラート）
- 予測管理（一覧、詳細、再計算、一括再計算）
- 再注文（推奨一覧、作成、一括発注）
- 季節性分析（パターン、月別指数、イベント）
- 最適化（提案、ABC分析）
- 設定（予測、再注文、アラート）

#### Phase 193: Customer Analytics（顧客分析）
- **API**: `ebay-customer-analytics.ts`（28エンドポイント）
- **UI**: `ebay/customer-analytics/page.tsx`（6タブ）
- ダッシュボード（概要、セグメント分布、トップ顧客）
- 顧客管理（一覧、詳細、ノート、タグ）
- セグメント管理（一覧、CRUD、詳細）
- RFM分析（分布、セグメント別、再計算）
- 行動分析（購買パターン、ブラウズ）
- 設定（分析、トラッキング、データ保持）

---

### Phase 190-191: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 190: Return Center（返品センター）
- **API**: `ebay-return-center.ts`（28エンドポイント）
- **UI**: `ebay/return-center/page.tsx`（6タブ）
- ダッシュボード（概要、トレンド、財務インパクト）
- 返品管理（一覧、承認/拒否、受領確認、一括処理）
- 返金管理（一覧、実行、詳細）
- 紛争管理（一覧、詳細、応答、エスカレート）
- クレーム管理（一覧、詳細、応答）
- 自動化ルール（作成、更新、削除）
- 設定（返品ポリシー、自動処理、通知）

#### Phase 191: Marketing Hub（マーケティングハブ）
- **API**: `ebay-marketing-hub.ts`（28エンドポイント）
- **UI**: `ebay/marketing-hub/page.tsx`（6タブ）
- ダッシュボード（概要、トレンド、チャネル別）
- キャンペーン管理（CRUD、一時停止/再開）
- プロモーション管理（割引、ボリューム、クーポン）
- 広告管理（グループ、キーワード）
- オーディエンス管理（カスタム、リターゲティング）
- 分析（ROI、コンバージョン）
- 設定（予算、入札、通知、トラッキング）

---

### Phase 188-189: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 188: Tax Management（税管理）
- **API**: `ebay-tax-management.ts`（28エンドポイント）
- **UI**: `ebay/tax-management/page.tsx`（6タブ）
- ダッシュボード（概要、税額推移、nexusマップ）
- 税率管理（国別、州別、カテゴリ別）
- 免税管理（証明書、顧客別、有効期限）
- Nexus管理（登録、しきい値、アラート）
- 送金管理（スケジュール、履歴、申告）
- 設定（一般、計算、コンプライアンス）

#### Phase 189: Supplier Management（サプライヤー管理）
- **API**: `ebay-supplier-management.ts`（28エンドポイント）
- **UI**: `ebay/supplier-management/page.tsx`（6タブ）
- ダッシュボード（概要、パフォーマンス、コスト分析）
- サプライヤー管理（一覧、CRUD、評価、一括操作）
- 発注管理（作成、追跡、履歴、受領）
- 入庫管理（予定、処理、品質検査）
- コスト分析（商品別、トレンド、最適化）
- 設定（一般、発注、品質、コスト）

---

### Phase 186-187: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 186: Product Catalog（商品カタログ）
- **API**: `ebay-product-catalog.ts`（28エンドポイント）
- **UI**: `ebay/product-catalog/page.tsx`（6タブ）
- ダッシュボード（概要、品質スコア、統計）
- 商品管理（一覧、CRUD、一括操作）
- カテゴリ管理（ツリー、マッピング）
- 属性管理（タイプ、オプション）
- 画像管理（アップロード、クリーンアップ）
- 設定（一般、画像、バリデーション）

#### Phase 187: Shipping Rate Calculator（送料計算機）
- **API**: `ebay-shipping-calculator.ts`（28エンドポイント）
- **UI**: `ebay/shipping-calculator/page.tsx`（6タブ）
- ダッシュボード（統計、キャリア、トレンド）
- 送料計算（単一、バッチ、商品別）
- キャリア管理（設定、テスト、同期）
- ゾーン管理（国内、国際、料金）
- ルール管理（無料送料、割引、サーチャージ）
- 設定（発送元、マークアップ）

---

### Phase 184-185: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 184: Pricing Intelligence（価格インテリジェンス）
- **API**: `ebay-pricing-intelligence.ts`（28エンドポイント）
- **UI**: `ebay/pricing-intelligence/page.tsx`（6タブ）
- ダッシュボード（概要、価格ポジション、アラート）
- 価格分析（一覧、詳細、最適化シミュレーション）
- 競合追跡（一覧、詳細、価格更新）
- アラート（一覧、ルール管理、一括処理）
- 推奨（一覧、適用、却下）
- 設定（一般、アラート、価格）

#### Phase 185: Seller Performance Dashboard（セラーパフォーマンスダッシュボード）
- **API**: `ebay-seller-performance.ts`（28エンドポイント）
- **UI**: `ebay/seller-performance/page.tsx`（6タブ）
- ダッシュボード（セラーレベル、指標、トレンド）
- 出荷（サマリー、キャリア別、問題）
- 顧客サービス（ケース管理、対応）
- フィードバック（統計、一覧、返信）
- ポリシー遵守（ステータス、違反、推奨）
- 設定（通知、目標、自動化）

---

### Phase 182-183: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 182: Inventory Hub（在庫ハブ）
- **API**: `ebay-inventory-hub.ts`（28エンドポイント）
- **UI**: `ebay/inventory-hub/page.tsx`（6タブ）
- ダッシュボード（在庫概要、アラート）
- 商品在庫管理（一覧、詳細、更新）
- 倉庫管理（一覧、作成、移動）
- 補充管理（推奨、発注、入荷）
- 棚卸（開始、カウント、完了）
- レポート（在庫、回転率）

#### Phase 183: Order Fulfillment Center（注文フルフィルメントセンター）
- **API**: `ebay-order-fulfillment.ts`（28エンドポイント）
- **UI**: `ebay/order-fulfillment/page.tsx`（6タブ）
- ダッシュボード（統計、パフォーマンス）
- 注文管理（一覧、詳細）
- ピッキング（リスト、開始、完了）
- パッキング（キュー、処理）
- 出荷（ラベル生成、出荷、追跡）
- 返品（承認、入荷、処理）

---

### Phase 180-181: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 180: Multi-Language Support v2（多言語対応v2）
- **API**: `ebay-multi-language-v2.ts`（25エンドポイント）
- **UI**: `ebay/multi-language-v2/page.tsx`（6タブ）
- ダッシュボード（言語数、翻訳数、品質）
- 言語管理（有効化、デフォルト設定）
- 翻訳管理（CRUD、自動翻訳、バッチ）
- 用語集（CRUD、インポート/エクスポート）
- 品質管理（スコア、問題検出）
- 設定（自動翻訳、品質、APIプロバイダー）

#### Phase 181: Marketplace Sync（マーケットプレイス同期）
- **API**: `ebay-marketplace-sync.ts`（28エンドポイント）
- **UI**: `ebay/marketplace-sync/page.tsx`（6タブ）
- ダッシュボード（接続数、同期状態、統計）
- マーケットプレイス管理（接続、設定）
- 同期管理（手動実行、スケジュール、履歴）
- 在庫同期（状態、差分、強制同期）
- 価格同期（状態、ルール）
- エラー管理（一覧、解決）

---

### Phase 178-179: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 178: Developer Portal（開発者ポータル）
- **API**: `ebay-developer-portal.ts`（25エンドポイント）
- **UI**: `ebay/developer-portal/page.tsx`（6タブ）
- ダッシュボード（API統計、アクティビティ）
- アプリ管理（CRUD、シークレット再生成）
- Webhook管理（CRUD、テスト送信）
- APIドキュメント（エンドポイント、スキーマ、認証）
- サンドボックス（データ管理、リセット）
- 使用状況（統計、ログ）

#### Phase 179: Analytics Dashboard v2（分析ダッシュボードv2）
- **API**: `ebay-analytics-dashboard-v2.ts`（28エンドポイント）
- **UI**: `ebay/analytics-dashboard-v2/page.tsx`（6タブ）
- 概要（KPI、リアルタイム、アラート）
- 売上分析（推移、カテゴリ別、地域別）
- 商品分析（トップセラー、パフォーマンス）
- 顧客分析（セグメント、行動、満足度）
- トラフィック分析（流入元、キーワード）
- カスタムレポート（作成、スケジュール、エクスポート）

---

### Phase 176-177: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 176: Advanced Search v2（高度検索v2）
- **API**: `ebay-advanced-search-v2.ts`（25エンドポイント）
- **UI**: `ebay/advanced-search-v2/page.tsx`（5タブ）
- 検索（詳細検索、クイック、オートコンプリート、ファセット）
- 保存検索（条件保存、通知設定）
- 検索履歴（履歴管理、よく使う検索）
- 検索分析（人気ワード、統計、トレンド）
- 設定（デフォルト、表示設定）

#### Phase 177: Security Center（セキュリティセンター）
- **API**: `ebay-security-center.ts`（28エンドポイント）
- **UI**: `ebay/security-center/page.tsx`（6タブ）
- ダッシュボード（スコア、問題サマリ、推奨）
- セッション管理（一覧、終了、ログイン履歴）
- 2FA（認証アプリ/SMS/メール、バックアップコード）
- APIキーセキュリティ（一覧、ローテーション、監視）
- 監査ログ（履歴、エクスポート）
- アラート・IP制限・パスワードポリシー・脆弱性スキャン

---

### Phase 174-175: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 174: Notification Center v2（通知センターv2）
- **API**: `ebay-notification-center-v2.ts`（25エンドポイント）
- **UI**: `ebay/notification-center-v2/page.tsx`（4タブ）
- 通知管理（既読/未読、一括操作）
- チャンネル設定（アプリ内/メール/プッシュ/Slack/SMS）
- カスタムルール、テンプレート
- 履歴・統計・デバイス管理

#### Phase 175: Customer Support Hub（カスタマーサポートハブ）
- **API**: `ebay-customer-support-hub.ts`（28エンドポイント）
- **UI**: `ebay/customer-support-hub/page.tsx`（5タブ）
- チケット管理（ステータス・優先度・担当者）
- エージェント管理・パフォーマンス
- 返信テンプレート、ナレッジベース
- 統計・SLAレポート、自動化ルール

---

### Phase 172-173: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 172: AI Assistant（AIアシスタント）
- **API**: `ebay-ai-assistant.ts`（22エンドポイント）
- **UI**: `ebay/ai-assistant/page.tsx`（4タブ）
- チャット・会話管理
- AIアクション（価格最適化、コンテンツ生成、在庫分析、売上予測、診断）
- クイックアクション（8種類）
- 学習・パーソナライズ、インサイト
- 使用統計

#### Phase 173: Bulk Import/Export Manager（一括インポート/エクスポート管理）
- **API**: `ebay-bulk-import-export.ts`（28エンドポイント）
- **UI**: `ebay/bulk-import-export/page.tsx`（4タブ）
- インポート/エクスポートジョブ管理
- スケジュール設定（Cron、配信設定）
- テンプレート（インポート/エクスポート）
- フィールド自動マッピング、統計

---

### Phase 170-171: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 170: Real-time Collaboration（リアルタイムコラボレーション）
- **API**: `ebay-realtime-collab.ts`（23エンドポイント）
- **UI**: `ebay/realtime-collab/page.tsx`（4タブ）
- セッション管理（作成・参加・退出・終了）
- リアルタイム編集（カーソル追跡、変更ブロードキャスト、ロック）
- チャット・コミュニケーション
- プレゼンス管理（オンライン・離席・取り込み中）
- コンフリクト解決、変更履歴、招待・権限管理

#### Phase 171: Custom Workflows Builder（カスタムワークフロービルダー）
- **API**: `ebay-custom-workflows.ts`（25エンドポイント）
- **UI**: `ebay/custom-workflows/page.tsx`（4タブ）
- ワークフローCRUD、有効化・一時停止・複製
- トリガー（イベント・スケジュール・条件・手動）
- アクション（翻訳・価格計算・出品・通知など14種類）
- テンプレート管理、実行履歴
- 統計・分析、エクスポート・インポート

---

### Phase 168-169: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 168: Integration Hub（統合ハブ）
- **API**: `ebay-integration-hub.ts`（22エンドポイント）
- **UI**: `ebay/integration-hub/page.tsx`（5タブ）
- 外部サービス統合（Slack/Google Sheets/Shopify/QuickBooks/Shippo/Zapier）
- OAuth接続・切断、手動同期、接続テスト
- Webhook管理、API接続モニタリング
- マーケットプレイス有効化

#### Phase 169: Mobile API Support（モバイルAPI対応）
- **API**: `ebay-mobile-api.ts`（25エンドポイント）
- **UI**: `ebay/mobile-api/page.tsx`（4タブ）
- モバイルダッシュボード、出品・注文管理
- プッシュ通知設定、クイックアクション
- バーコードスキャン、オフライン同期
- アプリ設定・ヘルスチェック

---

### Phase 166-167: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 166: Data Visualization Dashboard（データ可視化ダッシュボード）
- **API**: `ebay-data-visualization.ts`（22エンドポイント）
- **UI**: `ebay/data-visualization/page.tsx`（4タブ）
- ダッシュボードCRUD、ウィジェット管理
- 8種類のチャートタイプ（LINE/BAR/PIE/AREA/SCATTER/HEATMAP/FUNNEL/GAUGE）
- リアルタイム更新、スナップショット、エクスポート

#### Phase 167: Machine Learning Insights（機械学習インサイト）
- **API**: `ebay-ml-insights.ts`（25エンドポイント）
- **UI**: `ebay/ml-insights/page.tsx`（5タブ）
- 売上予測（Prophet）、需要予測、価格最適化（XGBoost）
- 顧客セグメンテーション（K-Means + RFM）
- 異常検知（Isolation Forest）、トレンド分析
- モデル管理・再トレーニング

---

### Phase 161-165: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 161: Webhook Manager（Webhook管理）
- **API**: `ebay-webhook-manager.ts`（20エンドポイント）
- **UI**: `ebay/webhook-manager/page.tsx`（4タブ）
- Webhook CRUD、配信ログ管理
- イベントタイプ設定、署名・セキュリティ設定

#### Phase 162: API Key Management（APIキー管理）
- **API**: `ebay-api-keys.ts`（20エンドポイント）
- **UI**: `ebay/api-keys/page.tsx`（4タブ）
- APIキーCRUD、使用状況ログ
- スコープ管理、レート制限設定

#### Phase 163: Audit Compliance（監査コンプライアンス）
- **API**: `ebay-audit-compliance.ts`（25エンドポイント）
- **UI**: `ebay/audit-compliance/page.tsx`（5タブ）
- コンプライアンスルール、違反管理
- 監査レポート、規制フレームワーク、証跡管理

#### Phase 164: Multi-User Management（マルチユーザー管理）
- **API**: `ebay-multi-user.ts`（25エンドポイント）
- **UI**: `ebay/multi-user/page.tsx`（5タブ）
- ユーザーCRUD、ロール・権限管理
- チーム管理、アクティビティログ

#### Phase 165: Advanced Reporting（高度なレポート）
- **API**: `ebay-advanced-reporting.ts`（22エンドポイント）
- **UI**: `ebay/advanced-reporting/page.tsx`（4タブ）
- レポートテンプレート、スケジュール実行
- メトリクス・ディメンション定義、ビルダー

---

### Phase 156-160: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 156: Activity Log（アクティビティログ）
- **API**: `ebay-activity-log.ts`（22エンドポイント）
- **UI**: `ebay/activity-log/page.tsx`（5タブ）
- アクティビティ履歴、監査トレイル
- セッションログ、エラーログ
- リテンション設定、アラート設定

#### Phase 157: Data Backup（データバックアップ）
- **API**: `ebay-data-backup.ts`（25エンドポイント）
- **UI**: `ebay/data-backup/page.tsx`（4タブ）
- バックアップ作成・復元・検証
- スケジュール管理、ストレージ設定
- リストアジョブ、クイックエクスポート

#### Phase 158: Performance Monitor（パフォーマンスモニター）
- **API**: `ebay-performance-monitor.ts`（22エンドポイント）
- **UI**: `ebay/performance-monitor/page.tsx`（5タブ）
- サービスヘルス、APIメトリクス
- システムリソース（CPU/メモリ/ディスク/ネットワーク）
- アラート設定・管理

#### Phase 159: User Preferences（ユーザー設定）
- **API**: `ebay-user-preferences.ts`（30エンドポイント）
- **UI**: `ebay/user-preferences/page.tsx`（6タブ）
- UI設定（テーマ/言語/タイムゾーン）
- 通知設定、デフォルト値設定
- ショートカット、プリセット管理

#### Phase 160: Help Center（ヘルプセンター）
- **API**: `ebay-help-center.ts`（22エンドポイント）
- **UI**: `ebay/help-center/page.tsx`（5タブ）
- ガイド・FAQ・チュートリアル
- サポートチケット管理
- 検索、お知らせ、リリースノート

---

### Phase 148-150, 136, 142: eBay機能強化

**ステータス**: 完了 ✅

#### Phase 148: Inventory Alerts（在庫アラート）
- **API**: `ebay-inventory-alerts.ts`（21エンドポイント）
- **UI**: `ebay/inventory-alerts/page.tsx`
- 8種類のアラートタイプ、4段階の重要度
- 5つの通知チャンネル（email/slack/sms/line/webhook）

#### Phase 149: Review Management（レビュー管理）
- **API**: `ebay-review-management.ts`（22エンドポイント）
- **UI**: `ebay/review-management/page.tsx`（6タブ）
- AI返信生成、センチメント分析
- 自動返信ルール

#### Phase 150: Shipment Tracking（発送追跡）
- **API**: `ebay-shipment-tracking.ts`（18エンドポイント）
- **UI**: `ebay/shipment-tracking/page.tsx`（5タブ）
- 9キャリア対応、8種類の発送ステータス
- ラベル印刷、例外管理

#### Phase 136: Alert Hub（統合アラートハブ）
- **API**: `ebay-alert-hub.ts`（18エンドポイント）
- **UI**: `ebay/alert-hub/page.tsx`（5タブ）
- 8カテゴリのアラート統合管理
- アラートルール・通知チャンネル設定

#### Phase 142: Templates V2（テンプレートシステム強化版）
- **API**: `ebay-templates-v2.ts`（22エンドポイント）
- **UI**: `ebay/templates-v2/page.tsx`（6タブ）
- バリエーション・バンドル・A/Bテスト対応
- プリセット機能、ダイナミックセクション

#### Phase 151: SEO Optimizer（SEO最適化）
- **API**: `ebay-seo-optimizer.ts`（25エンドポイント）
- **UI**: `ebay/seo-optimizer/page.tsx`（6タブ）
- SEOスコア分析、キーワードリサーチ
- タイトルテンプレート、最適化提案

#### Phase 152: Listing Quality（品質スコア）
- **API**: `ebay-listing-quality.ts`（22エンドポイント）
- **UI**: `ebay/listing-quality/page.tsx`（6タブ）
- 品質スコア評価、ベンチマーク比較
- 自動修正機能、トレンド分析

#### Phase 153: Tax & Duty Manager（税金・関税）
- **API**: `ebay-tax-duty.ts`（25エンドポイント）
- **UI**: `ebay/tax-duty/page.tsx`（7タブ）
- 税金・関税計算、HSコードマッピング
- コンプライアンス管理、免税ルール

#### Phase 154: Bulk Export/Import（一括エクスポート・インポート）
- **API**: `ebay-bulk-export-import.ts`（28エンドポイント）
- **UI**: `ebay/bulk-export-import/page.tsx`（7タブ）
- エクスポート/インポートジョブ管理
- テンプレート、スケジュール、ストレージ管理

#### Phase 155: Notification Center（通知センター）
- **API**: `ebay-notification-center.ts`（30エンドポイント）
- **UI**: `ebay/notification-center/page.tsx`（5タブ）
- 通知一覧・既読管理、配信チャンネル
- 通知テンプレート、配信レポート

---

### Phase 95-96: eBay出品パフォーマンス分析 & 改善提案エンジン

**ステータス**: 完了 ✅

#### 実装内容

**Phase 95: eBay出品パフォーマンス分析**
1. Prismaスキーマ追加
   - ListingPerformance: 出品パフォーマンス（Views・Watch・Impression・CTR・スコア）
   - PerformanceSnapshot: パフォーマンススナップショット（日次記録）
   - PerformanceThreshold: パフォーマンス閾値設定（メトリクス・演算子・アクション）
   - LowPerformanceFlag: 低パフォーマンスフラグ（スコア・理由・推奨アクション）
   - CategoryBenchmark: カテゴリベンチマーク（平均値・パーセンタイル）
   - PerformanceScoreType: ABSOLUTE, RELATIVE, COMBINED
   - ThresholdMetric: VIEWS, WATCHERS, IMPRESSIONS, CLICKS, CTR, CONVERSION_RATE, DAYS_LISTED
   - ThresholdOperator: LESS_THAN, GREATER_THAN, EQUALS, BETWEEN, PERCENTILE_BELOW
   - ThresholdAction: FLAG, NOTIFY, SUGGEST_IMPROVEMENT, AUTO_DELIST, AUTO_PRICE_REDUCE
   - FlagStatus: ACTIVE, DISMISSED, RESOLVED, EXPIRED

2. パフォーマンス分析API (`apps/api/src/routes/listing-performance.ts`)
   - GET /api/listing-performance/stats - パフォーマンス統計
   - GET /api/listing-performance/listings - 出品一覧（スコア付き）
   - GET /api/listing-performance/low-performers - 低パフォーマンス出品
   - POST /api/listing-performance/sync - eBay APIから同期
   - GET/POST/PUT/DELETE /api/listing-performance/thresholds - 閾値設定管理
   - GET /api/listing-performance/trends - トレンド分析
   - GET /api/listing-performance/category-benchmark - カテゴリベンチマーク
   - POST /api/listing-performance/calculate-benchmarks - ベンチマーク計算
   - GET /api/listing-performance/flags - フラグ一覧
   - PATCH /api/listing-performance/flags/:id/dismiss - フラグ却下

3. パフォーマンス分析ページ (`apps/web/src/app/listing-performance/page.tsx`)
   - パフォーマンス統計ダッシュボード（総出品数・低パフォーマンス率・平均Views/Watch）
   - 低パフォーマンス出品一覧（スコア・理由・改善提案リンク）
   - 全出品一覧（スコア順）
   - 閾値設定管理（CRUD）
   - カテゴリベンチマーク表示
   - eBay同期ボタン

**Phase 96: 改善提案エンジン & 半自動アクション**
1. Prismaスキーマ追加
   - ImprovementSuggestion: 改善提案（タイプ・現在値・提案値・信頼度・効果予測）
   - BulkAction: 一括アクション（タイプ・パラメータ・対象・進捗・結果）
   - ActionHistory: アクション履歴（変更前後・効果測定）
   - SuggestionType: TITLE, DESCRIPTION, ITEM_SPECIFICS, PRICE_REDUCE, PRICE_INCREASE, PHOTOS等
   - SuggestionStatus: PENDING, APPROVED, APPLIED, REJECTED, EXPIRED, FAILED
   - BulkActionType: PRICE_ADJUST_PERCENT, PRICE_ADJUST_FIXED, DELIST, RELIST, END_LISTING等
   - BulkActionStatus: PENDING, APPROVED, RUNNING, COMPLETED, FAILED, CANCELLED
   - ActionSource: MANUAL, SUGGESTION, BULK_ACTION, AUTOMATION, API

2. 改善提案API (`apps/api/src/routes/listing-improvement.ts`)
   - GET /api/listing-improvement/stats - 改善提案統計
   - POST /api/listing-improvement/generate - AI改善提案生成（GPT-4o）
   - GET /api/listing-improvement/suggestions - 提案一覧
   - POST /api/listing-improvement/apply/:id - 提案適用（ワンクリック）
   - POST /api/listing-improvement/reject/:id - 提案却下
   - POST /api/listing-improvement/bulk-action - 一括アクション実行
   - GET /api/listing-improvement/bulk-actions - 一括アクション一覧
   - GET /api/listing-improvement/history - アクション履歴
   - GET /api/listing-improvement/effectiveness - 効果測定レポート
   - POST /api/listing-improvement/preview - 変更プレビュー
   - POST /api/listing-improvement/generate-all - 低パフォーマンス出品に一括提案生成

3. 改善提案ページ (`apps/web/src/app/listing-improvement/page.tsx`)
   - 改善提案統計ダッシュボード（保留・適用・却下・適用率）
   - 改善提案一覧（ワンクリック適用・却下）
   - 一括操作（価格調整・非公開化・再出品）
   - アクション履歴
   - 効果測定レポート（タイプ別統計）

4. サイドバー・モバイルナビ更新
   - 出品パフォーマンスリンク追加（TrendingDownアイコン）
   - 改善提案リンク追加（Lightbulbアイコン）

---

### Phase 93-94: バックアップ・リカバリ強化 & 監視アラート強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 93: バックアップ・リカバリ強化**
1. Prismaスキーマ追加
   - BackupJob: バックアップジョブ（タイプ・ステータス・サイズ・保存先・チェックサム）
   - BackupSchedule: バックアップスケジュール（Cron・保持期間・暗号化・圧縮設定）
   - RecoveryPoint: リカバリポイント（メタデータ・整合性チェック・検証状態）
   - RestoreJob: リストアジョブ（ステータス・進捗・ターゲット環境）
   - BackupType: FULL, INCREMENTAL, DIFFERENTIAL
   - BackupTarget: DATABASE, FILES, REDIS, FULL_SYSTEM, CUSTOM
   - BackupStorage: LOCAL, S3, GCS, AZURE_BLOB, SFTP
   - BackupJobStatus: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, VERIFYING
   - RecoveryVerificationStatus: PENDING, VERIFIED, CORRUPTED, PARTIAL

2. バックアップAPI (`apps/api/src/routes/backup-recovery.ts`)
   - GET /api/backup-recovery/stats - バックアップ統計
   - GET /api/backup-recovery/jobs - ジョブ一覧
   - POST /api/backup-recovery/jobs - バックアップ開始
   - GET /api/backup-recovery/schedules - スケジュール一覧
   - POST /api/backup-recovery/schedules - スケジュール作成
   - PUT /api/backup-recovery/schedules/:id - スケジュール更新
   - DELETE /api/backup-recovery/schedules/:id - スケジュール削除
   - PATCH /api/backup-recovery/schedules/:id/toggle - 有効/無効切り替え
   - GET /api/backup-recovery/recovery-points - リカバリポイント一覧
   - POST /api/backup-recovery/restore - リストア開始
   - POST /api/backup-recovery/verify/:id - 整合性検証
   - GET /api/backup-recovery/restore-jobs - リストアジョブ一覧

3. バックアップページ (`apps/web/src/app/backup-recovery/page.tsx`)
   - バックアップ統計ダッシュボード（総ジョブ数・成功率・ストレージ使用量）
   - バックアップジョブ一覧・即時実行
   - スケジュール管理（作成・有効/無効・削除）
   - リカバリポイント一覧・検証・リストア
   - リストア確認ダイアログ（警告表示付き）

**Phase 94: 監視アラート強化**
1. Prismaスキーマ追加
   - AlertRule: アラートルール（メトリクス・条件・閾値・重要度・クールダウン）
   - AlertIncident: インシデント（発生時刻・確認・解決・根本原因・解決策）
   - AlertEscalation: エスカレーション設定（レベル・遅延・通知先）
   - AlertNotificationChannel: 通知チャンネル設定（タイプ・設定・テスト状態）
   - AlertNotification: 通知履歴（送信状態・リトライ）
   - AlertSeverity: INFO, WARNING, ERROR, CRITICAL
   - AlertCondition: GREATER_THAN, LESS_THAN, EQUALS, NOT_EQUALS, THRESHOLD, ANOMALY, PATTERN, ABSENCE
   - AlertIncidentStatus: OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED, SUPPRESSED
   - AlertChannelType: EMAIL, SLACK, DISCORD, WEBHOOK, SMS, PAGERDUTY, OPSGENIE, TEAMS

2. 監視アラートAPI (`apps/api/src/routes/monitoring-alerts.ts`)
   - GET /api/monitoring-alerts/stats - アラート統計
   - GET /api/monitoring-alerts/rules - ルール一覧
   - POST /api/monitoring-alerts/rules - ルール作成
   - PUT /api/monitoring-alerts/rules/:id - ルール更新
   - DELETE /api/monitoring-alerts/rules/:id - ルール削除
   - PATCH /api/monitoring-alerts/rules/:id/toggle - 有効/無効切り替え
   - GET /api/monitoring-alerts/incidents - インシデント一覧
   - PATCH /api/monitoring-alerts/incidents/:id/acknowledge - インシデント確認
   - PATCH /api/monitoring-alerts/incidents/:id/resolve - インシデント解決
   - GET /api/monitoring-alerts/escalations - エスカレーション設定
   - POST /api/monitoring-alerts/escalations - エスカレーション作成
   - GET /api/monitoring-alerts/channels - 通知チャンネル一覧
   - POST /api/monitoring-alerts/channels - チャンネル作成
   - POST /api/monitoring-alerts/channels/:id/test - チャンネルテスト
   - POST /api/monitoring-alerts/test - テストアラート送信
   - POST /api/monitoring-alerts/trigger - アラートトリガー（内部用）

3. 監視アラートページ (`apps/web/src/app/monitoring-alerts/page.tsx`)
   - アラート統計ダッシュボード（ルール数・オープン・クリティカル・24時間インシデント）
   - インシデント一覧・確認・解決（根本原因・解決方法記録）
   - ルール管理（メトリクス・条件・閾値・重要度設定）
   - 通知チャンネル管理（Email/Slack/Discord/Webhook等）
   - テストアラート送信機能

4. サイドバー・モバイルナビ更新
   - バックアップリンク追加（HardDriveアイコン）
   - 監視アラートリンク追加（AlertTriangleアイコン）

---

### Phase 91-92: Webhook配信システム強化 & API利用統計＆レート制限強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 91: Webhook配信システム強化**
1. Prismaスキーマ追加
   - WebhookEndpoint: Webhookエンドポイント（URL・シークレット・イベントタイプ・ステータス）
   - WebhookDelivery: 配信記録（レスポンスコード・レイテンシ・リトライ情報）
   - WebhookEvent: イベント定義（ペイロード・メタデータ）
   - WebhookLog: ログ（リクエスト/レスポンス詳細・エラー情報）
   - WebhookRetryPolicy: NONE, LINEAR, EXPONENTIAL, FIXED
   - WebhookDeliveryStatus: PENDING, SENDING, SUCCESS, FAILED, CANCELLED

2. Webhook配信API (`apps/api/src/routes/webhook-delivery.ts`)
   - GET /api/webhook-delivery/stats - 配信統計
   - GET /api/webhook-delivery/endpoints - エンドポイント一覧
   - POST /api/webhook-delivery/endpoints - エンドポイント作成
   - PUT /api/webhook-delivery/endpoints/:id - エンドポイント更新
   - DELETE /api/webhook-delivery/endpoints/:id - エンドポイント削除
   - PATCH /api/webhook-delivery/endpoints/:id/toggle - 有効/無効切り替え
   - POST /api/webhook-delivery/endpoints/:id/test - テスト送信
   - POST /api/webhook-delivery/endpoints/:id/rotate-secret - シークレットローテーション
   - GET /api/webhook-delivery/deliveries - 配信一覧
   - POST /api/webhook-delivery/deliveries/:id/retry - 再送信
   - GET /api/webhook-delivery/events - イベント一覧
   - POST /api/webhook-delivery/trigger - イベントトリガー
   - GET /api/webhook-delivery/logs - ログ一覧

3. Webhookページ (`apps/web/src/app/webhooks/page.tsx`)
   - エンドポイント一覧・作成・編集・削除
   - 有効/無効切り替え
   - テスト送信機能
   - シークレットローテーション
   - 配信一覧・再送信
   - イベントトリガー

**Phase 92: API利用統計＆レート制限強化**
1. Prismaスキーマ追加
   - ApiKey: APIキー（名前・ハッシュ・プレフィックス・権限・有効期限）
   - ApiKeyUsageLog: APIキー使用ログ（エンドポイント・メソッド・レスポンス）
   - RateLimitRule: レート制限ルール（ターゲット・上限・ウィンドウ・アクション）
   - ApiUsageSummary: 使用サマリー（期間・リクエスト数・成功/エラー率）
   - ApiQuota: クォータ（タイプ・上限・使用量・リセット日時）
   - RateLimitTarget: GLOBAL, ORGANIZATION, API_KEY, IP_ADDRESS, ENDPOINT, USER
   - RateLimitAction: REJECT, DELAY, LOG_ONLY, THROTTLE
   - ApiQuotaType: DAILY_REQUESTS, MONTHLY_REQUESTS, BANDWIDTH等

2. API利用統計API (`apps/api/src/routes/api-usage.ts`)
   - GET /api/api-usage/stats - 使用統計
   - GET /api/api-usage/keys - APIキー一覧
   - POST /api/api-usage/keys - APIキー作成
   - PUT /api/api-usage/keys/:id - APIキー更新
   - DELETE /api/api-usage/keys/:id - APIキー削除
   - PATCH /api/api-usage/keys/:id/toggle - 有効/無効切り替え
   - POST /api/api-usage/keys/:id/regenerate - キー再生成
   - GET /api/api-usage/rate-limits - レート制限一覧
   - POST /api/api-usage/rate-limits - ルール作成
   - PUT /api/api-usage/rate-limits/:id - ルール更新
   - DELETE /api/api-usage/rate-limits/:id - ルール削除
   - GET /api/api-usage/usage - 使用履歴
   - GET /api/api-usage/quotas - クォータ一覧
   - POST /api/api-usage/check-rate-limit - レート制限チェック

3. API利用統計ページ (`apps/web/src/app/api-usage/page.tsx`)
   - 使用統計ダッシュボード（リクエスト数・エラー率・キー数）
   - APIキー一覧・作成・削除
   - キー再生成・有効/無効切り替え
   - レート制限ルール管理
   - クォータ可視化（進捗バー表示）
   - 使用履歴（時間/日/週/月単位）

4. サイドバー・モバイルナビ更新
   - Webhookリンク追加（Webhookアイコン）
   - API利用統計リンク追加（Keyアイコン）

---

### Phase 89-90: 高度な検索・フィルタリング & データエクスポート・インポート強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 89: 高度な検索・フィルタリング**
1. Prismaスキーマ追加
   - SavedSearch: 保存済み検索（フィルター・ソート・カラム設定）
   - SearchHistory: 検索履歴（クエリ・結果数・実行時間）
   - SearchSuggestion: 検索サジェスト（頻度ベース）
   - AdvancedFilter: 高度なフィルター定義（フィールド・演算子・値）
   - SearchEntityType: PRODUCT, ORDER, LISTING, CUSTOMER, SHIPMENT, SUPPLIER, INVENTORY
   - FilterFieldType: TEXT, NUMBER, DATE, DATETIME, BOOLEAN, ENUM, ARRAY, JSON
   - FilterOperator: EQUALS, NOT_EQUALS, CONTAINS, BETWEEN, IN, REGEX等

2. 高度な検索API (`apps/api/src/routes/advanced-search.ts`)
   - GET /api/advanced-search/stats - 検索統計
   - POST /api/advanced-search/search - 検索実行（履歴・サジェスト自動更新）
   - GET /api/advanced-search/saved - 保存済み検索一覧
   - POST /api/advanced-search/saved - 検索保存
   - GET /api/advanced-search/history - 検索履歴
   - GET /api/advanced-search/suggestions - サジェスト
   - GET /api/advanced-search/filters - フィルター設定
   - GET /api/advanced-search/fields/:entityType - フィールド定義

3. 高度な検索ページ (`apps/web/src/app/advanced-search/page.tsx`)
   - エンティティタイプ選択（商品・注文・出品・発送・サプライヤー・顧客・在庫）
   - キーワード検索＋複合フィルター
   - 保存済み検索の管理
   - 検索履歴からの再検索
   - ページネーション

**Phase 90: データエクスポート・インポート強化**
1. Prismaスキーマ追加
   - DataExport: エクスポートジョブ（フィルター・フォーマット・ステータス・ファイル情報）
   - DataImport: インポートジョブ（マッピング・バリデーション・処理状況）
   - ImportLog: インポート行ログ（成功・エラー・スキップ）
   - ImportTemplate: インポートテンプレート（マッピング・変換ルール）
   - ExportSchedule: 定期エクスポートスケジュール（Cron・配信方法）
   - ExportFormat: CSV, XLSX, JSON, XML, PDF
   - ExportDeliveryMethod: EMAIL, SFTP, S3, WEBHOOK, SLACK

2. データ転送API (`apps/api/src/routes/data-export-import.ts`)
   - GET /api/data-export-import/stats - 統計
   - GET/POST /api/data-export-import/exports - エクスポート管理
   - GET /api/data-export-import/exports/:id/download - ダウンロード
   - GET/POST /api/data-export-import/imports - インポート管理
   - POST /api/data-export-import/imports/:id/validate - バリデーション
   - POST /api/data-export-import/imports/:id/process - 処理実行
   - GET/POST /api/data-export-import/templates - テンプレート管理
   - GET/POST /api/data-export-import/schedules - スケジュール管理
   - POST /api/data-export-import/schedules/:id/run-now - 即時実行

3. データ転送ページ (`apps/web/src/app/data-transfer/page.tsx`)
   - エクスポート一覧・作成・ダウンロード
   - インポート一覧・バリデーション・処理実行
   - 進捗表示（プログレスバー・成功/エラー/スキップ件数）
   - 定期エクスポートスケジュール管理
   - インポートテンプレート管理

4. サイドバー・モバイルナビ更新
   - 高度な検索リンク追加（Searchアイコン）
   - データ転送リンク追加（ArrowUpDownアイコン）

---

### Phase 87-88: 多通貨対応強化 & 監査・コンプライアンス

**ステータス**: 完了 ✅

#### 実装内容

**Phase 87: 多通貨対応強化**
1. Prismaスキーマ追加
   - Currency: 通貨マスタ（コード・名前・記号・小数桁数）
   - ExchangeRate: 為替レート（通貨ペア・レート・有効期間・ソース）
   - PriceConversion: 価格換算履歴（換算前後金額・使用レート・目的）
   - CurrencySetting: 通貨設定（デフォルト通貨・表示形式・丸め方式）
   - ExchangeRateSource: MANUAL, OPEN_EXCHANGE_RATES, FIXER_IO, CURRENCY_LAYER, BANK, ECB, CUSTOM_API

2. 多通貨管理API (`apps/api/src/routes/multi-currency.ts`)
   - GET /api/multi-currency/stats - 通貨統計
   - GET /api/multi-currency/currencies - 通貨一覧
   - POST /api/multi-currency/currencies - 通貨追加
   - PUT /api/multi-currency/currencies/:id - 通貨更新
   - DELETE /api/multi-currency/currencies/:id - 通貨削除
   - GET /api/multi-currency/rates - 為替レート一覧
   - GET /api/multi-currency/rates/latest - 最新レート
   - POST /api/multi-currency/rates - レート更新
   - POST /api/multi-currency/convert - 価格換算
   - GET /api/multi-currency/conversions - 換算履歴
   - GET /api/multi-currency/settings - 通貨設定
   - PUT /api/multi-currency/settings - 設定更新
   - POST /api/multi-currency/setup-defaults - デフォルト通貨セットアップ（JPY, USD, EUR, GBP, CNY, KRW, AUD, CAD）

3. 多通貨管理ページ (`apps/web/src/app/multi-currency/page.tsx`)
   - 通貨統計ダッシュボード（登録通貨数・為替レート数・換算履歴数）
   - 通貨一覧タブ（追加・有効/無効切り替え）
   - 為替レートタブ（レート追加・変動表示）
   - 換算履歴タブ
   - 換算ツールタブ（リアルタイム通貨換算）

**Phase 88: 監査・コンプライアンス**
1. Prismaスキーマ追加
   - DataRetentionPolicy: データ保持ポリシー（データタイプ・保持日数・アクション）
   - RetentionExecution: ポリシー実行履歴（処理件数・ステータス）
   - GdprRequest: GDPRリクエスト（タイプ・ユーザー・ステータス・期限）
   - GdprActivity: GDPRリクエストアクティビティ
   - DataMaskingRule: データマスキングルール（フィールドパターン・マスキングタイプ）
   - ComplianceAuditLog: コンプライアンス監査ログ
   - ConsentRecord: 同意記録（同意タイプ・目的・有効期限）
   - GdprRequestType: ACCESS, ERASURE, PORTABILITY, RECTIFICATION, RESTRICTION, OBJECTION
   - GdprRequestStatus: PENDING, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
   - RetentionAction: DELETE, ARCHIVE, ANONYMIZE
   - MaskingType: FULL, PARTIAL, HASH, TOKENIZE, REDACT
   - ConsentStatus: ACTIVE, WITHDRAWN, EXPIRED, SUPERSEDED

2. コンプライアンスAPI (`apps/api/src/routes/compliance.ts`)
   - GET /api/compliance/stats - コンプライアンス統計（スコア計算含む）
   - GET /api/compliance/retention-policies - データ保持ポリシー一覧
   - POST /api/compliance/retention-policies - ポリシー作成
   - PUT /api/compliance/retention-policies/:id - ポリシー更新
   - DELETE /api/compliance/retention-policies/:id - ポリシー削除
   - POST /api/compliance/retention-policies/:id/execute - ポリシー実行
   - GET /api/compliance/gdpr-requests - GDPRリクエスト一覧
   - POST /api/compliance/gdpr-requests - リクエスト作成
   - PUT /api/compliance/gdpr-requests/:id - リクエスト更新
   - POST /api/compliance/gdpr-requests/:id/process - リクエスト処理
   - GET /api/compliance/masking-rules - マスキングルール一覧
   - POST /api/compliance/masking-rules - ルール作成
   - POST /api/compliance/masking-rules/:id/test - マスキングテスト
   - GET /api/compliance/consents - 同意記録一覧
   - POST /api/compliance/consents - 同意記録
   - PUT /api/compliance/consents/:id/withdraw - 同意撤回
   - GET /api/compliance/consents/user/:userId - ユーザー別同意状況
   - GET /api/compliance/audit-logs - 監査ログ
   - GET /api/compliance/audit-logs/export - ログエクスポート（CSV/JSON）
   - GET /api/compliance/reports/summary - コンプライアンスレポート
   - POST /api/compliance/setup-defaults - デフォルト設定セットアップ

3. コンプライアンスページ (`apps/web/src/app/compliance/page.tsx`)
   - コンプライアンススコア表示（0-100、自動計算）
   - データ保持ポリシータブ（CRUD・実行）
   - GDPRリクエストタブ（ACCESS/ERASURE/PORTABILITY等対応）
   - データマスキングタブ（ルール管理・テスト）
   - 同意管理タブ（ユーザー同意状況）
   - 監査ログタブ（アクティビティ監視・エクスポート）

4. サイドバー・モバイルナビ更新
   - 多通貨管理リンク追加（Coinsアイコン）
   - コンプライアンスリンク追加（Scaleアイコン）

---

### Phase 85-86: SSO/SAML対応 & パフォーマンス最適化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 85: SSO/SAML対応**
1. Prismaスキーマ追加
   - SSOProvider: SSOプロバイダー設定（OAuth/OIDC/SAML設定・スコープ・属性マッピング）
   - SSOSession: SSOセッション管理（トークン・有効期限・デバイス情報）
   - SSOAuditLog: SSO監査ログ（認証イベント・エラー追跡）
   - SSOProviderType: GOOGLE, MICROSOFT, OKTA, AUTH0, SAML, OIDC, LDAP
   - SSOProviderStatus: INACTIVE, CONFIGURING, TESTING, ACTIVE, ERROR, SUSPENDED
   - SSOAuditAction: LOGIN_INITIATED, LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_REFRESH等

2. SSO API (`apps/api/src/routes/sso.ts`)
   - GET /api/sso/stats - SSO統計
   - GET /api/sso/provider-types - プロバイダータイプ一覧
   - GET /api/sso/providers - プロバイダー一覧
   - POST /api/sso/providers - プロバイダー作成
   - GET /api/sso/providers/:id - プロバイダー詳細
   - PATCH /api/sso/providers/:id - プロバイダー更新
   - DELETE /api/sso/providers/:id - プロバイダー削除
   - POST /api/sso/providers/:id/activate - アクティベート
   - POST /api/sso/providers/:id/deactivate - デアクティベート
   - GET /api/sso/providers/:id/authorize - OAuth認証開始
   - GET /api/sso/sessions - セッション一覧
   - POST /api/sso/sessions/:id/revoke - セッション無効化
   - GET /api/sso/audit-logs - 監査ログ
   - POST /api/sso/verify-domain - ドメイン検証

3. SSOページ (`apps/web/src/app/sso/page.tsx`)
   - SSO統計ダッシュボード（プロバイダー数・セッション・ログイン数）
   - プロバイダー一覧・作成・設定
   - Google/Microsoft/Okta/Auth0/SAML/OIDC/LDAP対応
   - アクティブセッション管理
   - 監査ログ表示

**Phase 86: パフォーマンス最適化**
1. Prismaスキーマ追加
   - PerformanceMetric: パフォーマンスメトリクス（API/DB/キャッシュ/メモリ/CPU）
   - ApiUsageLog: API使用ログ（エンドポイント・レスポンス時間・キャッシュ状態）
   - CdnConfig: CDN設定（プロバイダー・キャッシュ・画像最適化）
   - QueryOptimizationRule: クエリ最適化ルール（インデックス・キャッシュ・バッチ処理）
   - PerformanceMetricType: API_LATENCY, DB_QUERY_TIME, CACHE_HIT_RATE等
   - CdnProvider: CLOUDFLARE, AWS_CLOUDFRONT, FASTLY, BUNNY_CDN, IMGIX, CLOUDINARY
   - OptimizationType: ADD_INDEX, QUERY_REWRITE, ENABLE_CACHE, PAGINATION等

2. システムパフォーマンスAPI (`apps/api/src/routes/system-performance.ts`)
   - GET /api/system-performance/stats - パフォーマンス統計
   - GET /api/system-performance/api-logs - API使用ログ
   - POST /api/system-performance/metrics - メトリクス記録
   - GET /api/system-performance/metrics - メトリクス取得
   - GET /api/system-performance/cdn-configs - CDN設定一覧
   - POST /api/system-performance/cdn-configs - CDN設定作成
   - PATCH /api/system-performance/cdn-configs/:id - CDN設定更新
   - POST /api/system-performance/cdn-configs/:id/activate - CDNアクティベート
   - GET /api/system-performance/optimization-rules - 最適化ルール一覧
   - POST /api/system-performance/optimization-rules - ルール作成
   - PATCH /api/system-performance/optimization-rules/:id/toggle - ルール有効/無効
   - DELETE /api/system-performance/optimization-rules/:id - ルール削除
   - GET /api/system-performance/realtime - リアルタイムメトリクス
   - GET /api/system-performance/db-health - DBヘルスチェック
   - GET /api/system-performance/cache-stats - キャッシュ統計

3. システムパフォーマンスページ (`apps/web/src/app/system-performance/page.tsx`)
   - リアルタイムメトリクス（リクエスト/分・レイテンシ・エラー数）
   - エンドポイント別分析（トップ・遅い）
   - キャッシュパフォーマンス（ヒット率・エンドポイント別）
   - CDN設定管理
   - クエリ最適化ルール管理
   - データベースヘルス（テーブル統計・インデックス使用状況）

4. サイドバー・モバイルナビ更新
   - SSO設定リンク追加（KeyRoundアイコン）
   - システム性能リンク追加（Serverアイコン）

---

### Phase 83-84: カスタマーサクセス機能 & 高度なレポーティング

**ステータス**: 完了 ✅

#### 実装内容

**Phase 83: カスタマーサクセス機能**
1. Prismaスキーマ追加
   - Customer: 顧客マスタ（連絡先・統計・セグメント・ティア・チャーンリスク）
   - CustomerAnalytics: 顧客分析（RFMスコア・LTV・AOV）
   - CustomerActivity: 顧客アクティビティログ（注文・閲覧・問い合わせ等）
   - CustomerSegment: NEW, ACTIVE, AT_RISK, DORMANT, CHURNED, VIP, LOYAL
   - CustomerTier: STANDARD, SILVER, GOLD, PLATINUM, DIAMOND
   - ChurnRisk: LOW, MEDIUM, HIGH, CRITICAL
   - ActivityType: ORDER, VIEW, INQUIRY, REVIEW, RETURN, SUPPORT, LOGIN

2. カスタマーサクセスAPI (`apps/api/src/routes/customer-success.ts`)
   - GET /api/customer-success/stats - 顧客統計
   - GET /api/customer-success/segments - セグメント別顧客数
   - GET /api/customer-success/customers - 顧客一覧
   - GET /api/customer-success/customers/:id - 顧客詳細
   - POST /api/customer-success/customers/:id/analyze - RFM分析実行
   - GET /api/customer-success/at-risk - 離脱リスク顧客一覧
   - POST /api/customer-success/customers/:id/retention-action - リテンション施策実行
   - GET /api/customer-success/trends - 顧客トレンド

3. RFM分析アルゴリズム
   - Recency: 最終注文からの日数でスコアリング（1-5）
   - Frequency: 注文回数でスコアリング（1-5）
   - Monetary: 総購入額でスコアリング（1-5）
   - セグメント自動判定: RFMスコア組み合わせで決定
   - ティア判定: 総購入額に基づく（$5000以上=DIAMOND等）

4. チャーン予測
   - 最終注文日数、注文回数、平均注文間隔から計算
   - リスクスコア: 0-100
   - リスクレベル: LOW(<25), MEDIUM(25-50), HIGH(50-75), CRITICAL(75+)

5. カスタマーサクセスページ (`apps/web/src/app/customer-success/page.tsx`)
   - 顧客統計ダッシュボード（総顧客数・新規・離脱リスク・VIP）
   - セグメント分布表示
   - 顧客一覧（検索・セグメント・ティアフィルター）
   - 離脱リスク顧客タブ（RFMスコア・リスクレベル表示）
   - RFM分析実行機能

**Phase 84: 高度なレポーティング**
1. Prismaスキーマ追加
   - CustomReport: カスタムレポート定義（データソース・フィルター・列・集計・チャート）
   - ReportExecution: レポート実行履歴（パラメータ・結果・所要時間）
   - SharedDashboard: 共有ダッシュボード（レポート配置・権限）
   - ReportTemplate: レポートテンプレート（プリセット設定）
   - ReportDataSource: SALES, ORDERS, PRODUCTS, CUSTOMERS, INVENTORY, LISTINGS, ANALYTICS
   - ReportChartType: TABLE, LINE, BAR, PIE, AREA, SCATTER, HEATMAP
   - SharePermission: VIEW, EDIT, ADMIN

2. カスタムレポートAPI (`apps/api/src/routes/custom-reports.ts`)
   - GET /api/custom-reports/stats - レポート統計
   - GET /api/custom-reports/types - データソース・チャートタイプ一覧
   - GET /api/custom-reports - レポート一覧
   - POST /api/custom-reports - レポート作成
   - GET /api/custom-reports/:id - レポート詳細
   - PATCH /api/custom-reports/:id - レポート更新
   - DELETE /api/custom-reports/:id - レポート削除
   - POST /api/custom-reports/:id/execute - レポート実行
   - POST /api/custom-reports/:id/share - 共有設定
   - GET /api/custom-reports/dashboards - ダッシュボード一覧
   - POST /api/custom-reports/dashboards - ダッシュボード作成
   - GET /api/custom-reports/templates - テンプレート一覧
   - POST /api/custom-reports/templates/:id/use - テンプレート使用

3. カスタムレポートページ (`apps/web/src/app/custom-reports/page.tsx`)
   - レポート統計ダッシュボード
   - レポート一覧タブ（作成・編集・削除・実行）
   - ダッシュボードタブ（共有ダッシュボード管理）
   - テンプレートタブ（プリセットテンプレート使用）
   - レポート作成ダイアログ（データソース・列・フィルター・チャート選択）

4. サイドバー・モバイルナビ更新
   - カスタマーサクセスリンク追加（HeartHandshakeアイコン）
   - カスタムレポートリンク追加（FileBarChartアイコン）

---

### Phase 81-82: 外部連携強化 & セキュリティ強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 81: 外部連携強化**
1. Prismaスキーマ追加
   - ExternalIntegration: 外部連携設定（認証情報・同期設定）
   - IntegrationSyncLog: 同期ログ
   - IntegrationWebhookLog: Webhookログ
   - FreeeTransaction: freee取引データ
   - ShopifyProduct: Shopify商品連携
   - IntegrationType: SHOPIFY, AMAZON, FREEE, MFCLOUD, YAMATO, SAGAWA, JAPAN_POST, CUSTOM_API
   - IntegrationStatus: INACTIVE, CONNECTING, ACTIVE, ERROR, SUSPENDED

2. 外部連携API (`apps/api/src/routes/external-integrations.ts`)
   - GET /api/external-integrations/stats - 連携統計
   - GET /api/external-integrations/types - 連携タイプ一覧
   - GET /api/external-integrations - 連携一覧
   - POST /api/external-integrations - 連携作成
   - GET /api/external-integrations/:id - 連携詳細
   - PATCH /api/external-integrations/:id - 連携更新
   - DELETE /api/external-integrations/:id - 連携削除
   - POST /api/external-integrations/:id/connect - 接続
   - POST /api/external-integrations/:id/disconnect - 切断
   - POST /api/external-integrations/:id/sync - 手動同期
   - GET /api/external-integrations/:id/sync-logs - 同期ログ
   - POST /api/external-integrations/:id/webhook - Webhook受信
   - GET /api/external-integrations/freee/transactions - freee取引
   - GET /api/external-integrations/shopify/products - Shopify商品

3. 外部連携ページ (`apps/web/src/app/integrations/page.tsx`)
   - 連携統計ダッシュボード
   - 連携タイプ選択・作成
   - 連携一覧（ステータス・タイプフィルター）
   - 接続・切断・同期操作
   - 同期ログ表示

**Phase 82: セキュリティ強化**
1. Prismaスキーマ追加
   - TwoFactorAuth: 2FA設定（シークレット・バックアップコード）
   - SecurityAuditLog: 監査ログ（アクション・重要度・詳細）
   - IpWhitelist: IPホワイトリスト
   - UserSession: セッション管理
   - SecuritySetting: セキュリティ設定
   - TwoFactorMethod: TOTP, SMS, EMAIL, HARDWARE_KEY
   - SecurityAction: 20種類以上のセキュリティアクション

2. セキュリティ管理API (`apps/api/src/routes/security-management.ts`)
   - POST /api/security/2fa/setup - 2FA設定開始
   - POST /api/security/2fa/verify - 2FA検証・有効化
   - POST /api/security/2fa/validate - 2FAログイン検証
   - POST /api/security/2fa/disable - 2FA無効化
   - GET /api/security/2fa/status/:userId - 2FAステータス
   - GET /api/security/audit-logs - 監査ログ一覧
   - GET /api/security/audit-logs/stats - 監査ログ統計
   - GET /api/security/ip-whitelist - IPホワイトリスト
   - POST /api/security/ip-whitelist - IP追加
   - DELETE /api/security/ip-whitelist/:id - IP削除
   - POST /api/security/ip-whitelist/check - IP確認
   - GET /api/security/sessions - セッション一覧
   - POST /api/security/sessions/:id/revoke - セッション無効化
   - POST /api/security/sessions/revoke-all - 全セッション無効化
   - GET /api/security/settings - セキュリティ設定
   - PATCH /api/security/settings - 設定更新
   - GET /api/security/stats - セキュリティ統計

3. セキュリティページ (`apps/web/src/app/security/page.tsx`)
   - セキュリティ統計ダッシュボード
   - 2FA設定・有効化・無効化
   - バックアップコード管理
   - アクティブセッション一覧・無効化
   - IPホワイトリスト管理
   - 監査ログ（フィルター・重要度別）

4. サイドバー更新
   - 外部連携リンク追加（管理者セクション）
   - セキュリティリンク追加

5. パッケージ更新
   - otplib追加（TOTP生成・検証）

---

### Phase 79-80: マルチテナント対応 & 在庫予測・自動発注

**ステータス**: 完了 ✅

#### 実装内容

**Phase 79: マルチテナント対応**
1. Prismaスキーマ追加
   - Organization: 組織（名前・スラグ・プラン・ステータス・設定）
   - OrganizationMember: 組織メンバー（ユーザー・ロール・参加日）
   - OrganizationInvitation: 招待（メール・ロール・トークン・有効期限）
   - OrganizationPlan: FREE, STARTER, PROFESSIONAL, ENTERPRISE
   - OrganizationStatus: ACTIVE, SUSPENDED, DELETED
   - OrganizationRole: OWNER, ADMIN, MEMBER, VIEWER

2. 組織管理API (`apps/api/src/routes/organizations.ts`)
   - GET /api/organizations/stats - 組織統計
   - GET /api/organizations/plans - プラン一覧
   - GET /api/organizations - 組織一覧
   - POST /api/organizations - 組織作成
   - GET /api/organizations/:id - 組織詳細
   - PATCH /api/organizations/:id - 組織更新
   - DELETE /api/organizations/:id - 組織削除
   - GET /api/organizations/:id/members - メンバー一覧
   - PATCH /api/organizations/:id/members/:memberId/role - ロール変更
   - DELETE /api/organizations/:id/members/:memberId - メンバー削除
   - POST /api/organizations/:id/invitations - 招待送信
   - POST /api/organizations/invitations/:token/accept - 招待承諾
   - DELETE /api/organizations/:id/invitations/:invitationId - 招待キャンセル
   - GET /api/organizations/user/:userId/organizations - ユーザー所属組織

3. 組織管理ページ (`apps/web/src/app/organizations/page.tsx`)
   - 組織統計ダッシュボード
   - 組織一覧（検索・ステータス・プランフィルター）
   - 組織作成ダイアログ
   - メンバー一覧・ロール変更・削除
   - 招待送信・キャンセル
   - プラン表示

**Phase 80: 在庫予測・自動発注**
1. Prismaスキーマ追加
   - InventoryForecast: 在庫予測（需要予測・安全在庫・リードタイム・リスク）
   - AutoReorderRule: 自動発注ルール（トリガー・しきい値・数量・承認フロー）
   - AutoReorderOrder: 自動発注オーダー（ステータス・推奨数量・承認）
   - StockoutRisk: LOW, MEDIUM, HIGH, CRITICAL
   - ReorderAction: REORDER_NOW, REORDER_SOON, MONITOR, NO_ACTION
   - ReorderTriggerType: STOCK_LEVEL, DAYS_OF_STOCK, DEMAND_SPIKE, SCHEDULED
   - ReorderApprovalType: NONE, MANAGER, OWNER, BOTH

2. 在庫予測API (`apps/api/src/routes/inventory-forecast.ts`)
   - GET /api/inventory-forecast/stats - 予測統計
   - GET /api/inventory-forecast/forecasts - 予測一覧
   - POST /api/inventory-forecast/generate - 予測生成
   - GET /api/inventory-forecast/rules - 自動発注ルール一覧
   - POST /api/inventory-forecast/rules - ルール作成
   - PATCH /api/inventory-forecast/rules/:id - ルール更新
   - DELETE /api/inventory-forecast/rules/:id - ルール削除
   - PATCH /api/inventory-forecast/rules/:id/toggle - 有効/無効切り替え
   - GET /api/inventory-forecast/pending-orders - 承認待ち発注一覧
   - POST /api/inventory-forecast/orders/:id/approve - 発注承認
   - POST /api/inventory-forecast/orders/:id/reject - 発注却下
   - POST /api/inventory-forecast/check-triggers - トリガーチェック

3. 予測アルゴリズム
   - 需要予測: 7日移動平均
   - 安全在庫: avgDailySales × √leadTime × zScore
   - サービスレベル別Z値: 99%=2.33, 95%=1.65, 90%=1.28
   - 在庫切れリスク評価: 在庫日数に基づく4段階評価

4. 在庫予測ページ (`apps/web/src/app/inventory-forecast/page.tsx`)
   - 予測統計ダッシュボード
   - 在庫予測一覧（リスク別表示）
   - 自動発注ルール管理（CRUD）
   - 承認待ち発注一覧
   - 発注承認・却下機能
   - 予測生成ボタン

5. サイドバー更新
   - 組織管理リンク追加（管理者セクション）
   - 在庫予測リンク追加

---

### Phase 77-78: A/Bテスト機能 & サプライヤー管理

**ステータス**: 完了 ✅

#### 実装内容

**Phase 77: A/Bテスト機能**
1. Prismaスキーマ追加
   - ABTest: テスト定義（タイプ・対象・指標・期間）
   - ABTestVariant: バリアント定義（変更内容・重み・統計）
   - ABTestAssignment: 割り当て追跡（エンティティ→バリアント）
   - ABTestType: TITLE, DESCRIPTION, PRICE, IMAGE, MULTI
   - ABTestMetric: CONVERSION_RATE, CLICK_RATE, REVENUE, AVG_ORDER_VALUE
   - ABTestStatus: DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, CANCELLED

2. A/Bテストエンジン (`apps/api/src/lib/ab-test-engine.ts`)
   - テスト作成・開始・停止・完了
   - バリアント割り当て（重み付きランダム）
   - イベント記録（インプレッション・クリック・閲覧・コンバージョン）
   - 統計的有意性計算（Z検定）
   - 信頼区間・リフト計算
   - 勝者バリアント決定

3. A/BテストAPI (`apps/api/src/routes/ab-tests.ts`)
   - GET /api/ab-tests/stats - 統計
   - GET /api/ab-tests/types - テストタイプ一覧
   - GET /api/ab-tests - テスト一覧
   - POST /api/ab-tests - テスト作成
   - GET /api/ab-tests/:id - テスト詳細
   - POST /api/ab-tests/:id/start - テスト開始
   - POST /api/ab-tests/:id/stop - テスト停止
   - POST /api/ab-tests/:id/complete - テスト完了
   - GET /api/ab-tests/:id/results - 結果取得
   - POST /api/ab-tests/:id/assign - バリアント割り当て
   - POST /api/ab-tests/:id/event - イベント記録
   - POST /api/ab-tests/:id/apply-winner - 勝者適用

4. A/Bテスト管理ページ (`apps/web/src/app/ab-tests/page.tsx`)
   - テスト統計ダッシュボード
   - テスト作成ダイアログ
   - テスト一覧（ステータスフィルター）
   - バリアント比較表示
   - 開始・停止・完了操作
   - 結論・有意性表示

**Phase 78: サプライヤー管理**
1. Prismaスキーマ追加
   - Supplier: サプライヤー情報（連絡先・住所・評価）
   - SupplierProduct: サプライヤー商品（SKU・価格・在庫）
   - PurchaseOrder: 発注（明細・ステータス・金額）
   - PurchaseOrderItem: 発注明細（数量・入荷追跡）
   - SupplierStatus: ACTIVE, INACTIVE, SUSPENDED, BLACKLISTED
   - PurchaseOrderStatus: DRAFT, PENDING, APPROVED, ORDERED, SHIPPED, DELIVERED, CANCELLED

2. サプライヤーAPI (`apps/api/src/routes/suppliers.ts`)
   - GET /api/suppliers/stats - 統計
   - GET /api/suppliers - サプライヤー一覧
   - POST /api/suppliers - サプライヤー作成
   - GET /api/suppliers/:id - サプライヤー詳細
   - PATCH /api/suppliers/:id - サプライヤー更新
   - GET /api/suppliers/:id/products - 商品一覧
   - POST /api/suppliers/:id/products - 商品追加
   - GET /api/suppliers/orders/list - 発注一覧
   - POST /api/suppliers/orders - 発注作成
   - GET /api/suppliers/orders/:id - 発注詳細
   - PATCH /api/suppliers/orders/:id/status - ステータス更新
   - POST /api/suppliers/orders/:id/receive - 入荷処理
   - GET /api/suppliers/recommendations - 発注推奨

3. サプライヤー管理ページ (`apps/web/src/app/suppliers/page.tsx`)
   - サプライヤー統計ダッシュボード
   - サプライヤー作成ダイアログ
   - サプライヤー一覧（検索・ステータスフィルター）
   - サプライヤー詳細ダイアログ
   - 発注管理タブ
   - 発注ステータス更新

4. サイドバー更新
   - A/Bテストリンク追加（管理者セクション）
   - サプライヤーリンク追加

---

### Phase 75-76: モバイル最適化(PWA) & 高度な分析ダッシュボード

**ステータス**: 完了 ✅

#### 実装内容

**Phase 75: PWA対応 & モバイル最適化**
1. PWAマニフェスト (`apps/web/public/manifest.json`)
   - アプリ名: RAKUDA - 越境EC自動出品システム
   - アイコン: 192x192, 512x512
   - ショートカット: ダッシュボード、商品管理、注文管理、発送管理
   - スクリーンショット: デスクトップ・モバイル
   - テーマカラー: #f59e0b (amber)

2. Service Worker (`apps/web/public/sw.js`)
   - キャッシュ戦略:
     - Network First: API呼び出し（5秒タイムアウト）
     - Cache First: 静的アセット（JS, CSS, 画像, フォント）
   - プッシュ通知ハンドリング
   - バックグラウンドシンク（orders-sync, shipments-sync）
   - オフラインフォールバック（/offline）

3. オフラインページ (`apps/web/src/app/offline/page.tsx`)
   - オフライン時の案内表示
   - 再試行ボタン
   - オンライン復帰時に自動リダイレクト

4. PWAフック (`apps/web/src/lib/pwa.ts`)
   - `usePWA()` - インストール・更新管理
     - isInstallable: インストール可能判定
     - isInstalled: インストール済み判定
     - isUpdateAvailable: 更新有無
     - promptInstall(): インストールプロンプト表示
     - applyUpdate(): 更新適用
   - `useOnlineStatus()` - オンライン/オフライン検出
   - `useIsMobile()`, `useIsTablet()`, `useIsDesktop()` - デバイス判定
   - `subscribeToPushNotifications()` - プッシュ通知購読

5. モバイルナビゲーション (`apps/web/src/components/layout/mobile-nav.tsx`)
   - `BottomNav` - ボトムナビゲーション（5項目）
     - ホーム、商品、注文、発送、通知
   - `MobileHeader` - モバイルヘッダー
     - メニュー（Sheet）、ページタイトル、通知ボタン
     - カテゴリ別メニュー項目
   - `InstallBanner` - インストール促進バナー
   - `UpdateBanner` - 更新通知バナー
   - オフラインモード表示

6. レイアウト更新 (`apps/web/src/app/layout.tsx`)
   - PWAメタデータ（manifest, appleWebApp, viewport）
   - レスポンシブレイアウト分離
     - デスクトップ: Sidebar + Header
     - モバイル: MobileHeader + BottomNav
   - userScalable: false（ダブルタップズーム無効）

**Phase 76: 高度な分析ダッシュボード**
1. 高度分析API (`apps/api/src/routes/advanced-analytics.ts`)
   - GET /api/advanced-analytics/sales-trend - 売上トレンド
     - groupBy: day, week, month
     - 日付範囲指定
   - GET /api/advanced-analytics/by-category - カテゴリ別分析
     - 売上、注文数、収益割合、前期比較
   - GET /api/advanced-analytics/marketplace-comparison - マーケットプレイス比較
     - 収益、注文数、平均注文額、利益率
     - 前期比成長率
   - GET /api/advanced-analytics/product-performance - 商品パフォーマンス
     - ソート: revenue, orders, profit_rate
     - 個別商品詳細
   - GET /api/advanced-analytics/summary - サマリー
     - 総収益、総注文数、平均利益率、アクティブリスティング数
     - 前期比変化率
   - GET /api/advanced-analytics/export - データエクスポート
     - 形式: csv, json
     - データタイプ: sales, orders, products

2. 分析ダッシュボードページ (`apps/web/src/app/analytics/page.tsx`)
   - サマリーカード（4つ）
     - 総収益、総注文数、平均利益率、アクティブ出品数
     - 前期比変化表示（上昇/下降アイコン）
   - タブ構成
     - 売上トレンド（日/週/月切り替え、時系列テーブル）
     - カテゴリ分析（収益割合、前期比）
     - マーケットプレイス比較（Joom/eBay比較）
     - 商品パフォーマンス（ソート切り替え）
   - 日付範囲選択（過去7日/30日/90日/年初から）
   - エクスポート機能（CSV/JSON）
   - ローディング・エラー表示

3. サイドバー更新
   - 分析リンク追加（LineChartアイコン）

---

### Phase 73-74: ワークフロー自動化 & AIチャットボット

**ステータス**: 完了 ✅

#### 実装内容

**Phase 73: ワークフロー自動化エンジン**
1. Prismaスキーマ追加
   - WorkflowRule: ワークフロールール定義（トリガー・条件・アクション）
   - WorkflowExecution: 実行履歴
   - WorkflowTriggerType: 14種類のトリガー（注文・出品・在庫・ジョブ等）
   - WorkflowExecutionStatus: 実行状態

2. ワークフローエンジン (`apps/api/src/lib/workflow-engine.ts`)
   - 条件評価システム（12種類の演算子）
   - アクション実行（通知・Slack・ステータス更新・タスク作成・ジョブ実行・Webhook）
   - 変数置換（{{変数名}}形式）
   - 実行制限（日次上限・クールダウン）
   - 優先度ベースの実行順序

3. ワークフローAPI (`apps/api/src/routes/workflow-rules.ts`)
   - GET /api/workflow-rules/stats - 統計
   - GET /api/workflow-rules/trigger-types - トリガータイプ一覧
   - GET /api/workflow-rules/action-types - アクションタイプ一覧
   - GET /api/workflow-rules - ルール一覧
   - POST /api/workflow-rules - ルール作成
   - PATCH /api/workflow-rules/:id - ルール更新
   - DELETE /api/workflow-rules/:id - ルール削除
   - PATCH /api/workflow-rules/:id/toggle - 有効/無効切り替え
   - POST /api/workflow-rules/trigger - 手動トリガー
   - GET /api/workflow-rules/executions/list - 実行履歴

4. ワークフロー管理ページ (`apps/web/src/app/workflow-rules/page.tsx`)
   - ルール一覧・作成・削除
   - 有効/無効切り替え
   - 手動実行
   - 実行履歴表示
   - トリガータイプフィルター

**Phase 74: AIチャットボット統合**
1. Prismaスキーマ追加
   - ChatSession: チャットセッション
   - ChatMessage: チャットメッセージ
   - ChatbotConfig: チャットボット設定
   - ChatMessageRole: USER/ASSISTANT/SYSTEM/OPERATOR

2. チャットボットエンジン (`apps/api/src/lib/chatbot-engine.ts`)
   - インテント検出（10種類: ORDER_STATUS, TRACKING_INFO, PRODUCT_INQUIRY等）
   - エンティティ抽出（注文ID, 追跡番号）
   - OpenAI GPT-4o連携
   - コンテキスト管理（注文情報・商品情報）
   - 自動エスカレーション判定
   - セッション管理

3. チャットボットAPI (`apps/api/src/routes/chatbot.ts`)
   - GET /api/chatbot/stats - 統計
   - GET /api/chatbot/config - 設定取得
   - PATCH /api/chatbot/config - 設定更新
   - POST /api/chatbot/sessions - セッション作成
   - GET /api/chatbot/sessions - セッション一覧
   - GET /api/chatbot/sessions/:id/messages - メッセージ履歴
   - POST /api/chatbot/sessions/:id/messages - メッセージ送信
   - POST /api/chatbot/sessions/:id/escalate - エスカレーション
   - POST /api/chatbot/sessions/:id/resolve - 解決
   - POST /api/chatbot/sessions/:id/operator-message - オペレーター返信

4. チャットボット管理ページ (`apps/web/src/app/chatbot/page.tsx`)
   - セッション一覧・詳細
   - リアルタイムチャット表示
   - オペレーター返信機能
   - エスカレーション・解決
   - 設定管理（モデル・Temperature・プロンプト）
   - 分析（インテント別・マーケットプレイス別）

5. サイドバー更新
   - ワークフローリンク追加
   - チャットボットリンク追加

---

### Phase 71-72: 多言語対応(i18n) & リアルタイム通知強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 71: 国際化(i18n)システム**
1. 翻訳ファイル
   - `apps/web/src/lib/i18n/translations/ja.ts` - 日本語翻訳（完全実装）
   - `apps/web/src/lib/i18n/translations/en.ts` - 英語翻訳（完全実装）
   - カテゴリ: common, nav, dashboard, products, orders, shipments, sourcing, jobs, notifications, reports, settings, errors

2. i18nコアシステム (`apps/web/src/lib/i18n/index.ts`)
   - `I18nProvider` - React Context プロバイダー
   - `useI18n()` - i18nコンテキストフック
   - `useTranslation()` - 翻訳フック（t関数）
   - `useLocale()` - ロケール取得フック
   - `formatNumber()` - 数値フォーマット
   - `formatCurrency()` - 通貨フォーマット（JPY/USD/EUR対応）
   - `formatDate()` - 日付フォーマット
   - `formatRelativeTime()` - 相対時間フォーマット
   - ブラウザロケール自動検出
   - localStorage永続化

3. 言語切り替えUI (`apps/web/src/components/ui/language-switcher.tsx`)
   - `LanguageSwitcher` - ドロップダウン式言語切り替え
   - `LanguageSwitcherCompact` - コンパクト版（ヘッダー用）

4. プロバイダー統合 (`apps/web/src/components/providers/app-providers.tsx`)
   - I18nProvider追加（RealtimeProviderをラップ）

5. ヘッダー更新 (`apps/web/src/components/layout/header.tsx`)
   - LanguageSwitcherCompact追加
   - 検索プレースホルダーの多言語化

**Phase 72: リアルタイム通知強化**
1. 強化リアルタイムシステム (`apps/web/src/lib/realtime-enhanced.ts`)
   - WebSocketManager - WebSocket接続管理（自動再接続付き）
   - 18種類のイベントタイプ対応
   - ブラウザ通知API連携（Notification API）
   - Web Audio APIによるサウンド通知
   - SWRキャッシュ自動無効化
   - 通知設定のlocalStorage永続化

2. イベントタイプ（EnhancedEventType）
   - ORDER_RECEIVED, ORDER_PAID, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED
   - INVENTORY_CHANGE, INVENTORY_LOW, OUT_OF_STOCK
   - PRICE_CHANGE, LISTING_UPDATE, LISTING_PUBLISHED, LISTING_ERROR
   - JOB_COMPLETED, JOB_FAILED
   - CUSTOMER_MESSAGE, SHIPMENT_DEADLINE, SYSTEM_ALERT

3. フック
   - `useEnhancedRealtime()` - 拡張リアルタイム接続
   - `useNotificationSettings()` - 通知設定管理
   - `useUnreadNotificationCount()` - 未読通知カウント

4. 通知設定ページ (`apps/web/src/app/notification-settings/page.tsx`)
   - 接続状態表示（WebSocket/SSE/Polling）
   - ブラウザ通知許可リクエスト
   - テスト通知送信機能
   - 一般設定タブ（通知有効/無効、ブラウザ通知、サウンド通知）
   - イベント設定タブ（イベントタイプ別通知設定）
   - サウンド設定タブ（音量スライダー、テスト再生）

5. サイドバー更新 (`apps/web/src/components/layout/sidebar.tsx`)
   - 通知設定リンク追加

---

### Phase 69-70: データベース最適化 & ダッシュボードウィジェット

**ステータス**: 完了 ✅

#### 実装内容

**Phase 69: データベースインデックス最適化**
1. 複合インデックス追加（Prismaスキーマ）
   - Product: `[status, updatedAt]`, `[sourceId, status]`, `[brand]`, `[category]`, `[translationStatus, imageStatus]`
   - Listing: `[status, updatedAt]`, `[status, listedAt]`, `[marketplace, status, listingPrice]`, `[productId, status]`
   - Order: `[status, orderedAt]`, `[paymentStatus, orderedAt]`, `[fulfillmentStatus, orderedAt]`, `[marketplace, status, orderedAt]`, `[shippedAt]`
   - Sale: `[createdAt]`, `[orderId, createdAt]`
   - JobLog: `[queueName, status, createdAt]`, `[status, startedAt]`, `[jobType, status]`

2. クエリパフォーマンス監視API (`apps/api/src/routes/query-performance.ts`)
   - GET /api/query-performance/summary - パフォーマンスサマリー
   - GET /api/query-performance/table-stats - テーブル統計
   - GET /api/query-performance/index-usage - インデックス使用状況
   - GET /api/query-performance/unused-indexes - 未使用インデックス
   - GET /api/query-performance/seq-scans - シーケンシャルスキャン分析
   - GET /api/query-performance/tables/:tableName - テーブル詳細統計
   - POST /api/query-performance/vacuum/:tableName - VACUUM実行
   - POST /api/query-performance/analyze/:tableName - ANALYZE実行

**Phase 70: ダッシュボードウィジェット**
1. Prismaスキーマ追加
   - DashboardWidget: ウィジェット定義（タイプ・位置・設定）
   - DashboardLayout: レイアウト設定
   - DashboardWidgetType: 12種類のウィジェットタイプ

2. ダッシュボードウィジェットAPI (`apps/api/src/routes/dashboard-widgets.ts`)
   - GET /api/dashboard-widgets/types - ウィジェットタイプ一覧
   - GET /api/dashboard-widgets - ウィジェット一覧
   - POST /api/dashboard-widgets - ウィジェット作成
   - PATCH /api/dashboard-widgets/:id - ウィジェット更新
   - DELETE /api/dashboard-widgets/:id - ウィジェット削除
   - PATCH /api/dashboard-widgets/reorder - 順序一括更新
   - GET /api/dashboard-widgets/:id/data - ウィジェットデータ
   - GET /api/dashboard-widgets/data/all - 全ウィジェットデータ
   - POST /api/dashboard-widgets/setup-defaults - デフォルトセットアップ

3. ウィジェットタイプ
   - SALES_SUMMARY: 売上サマリー
   - ORDER_STATUS: 注文ステータス
   - INVENTORY_ALERT: 在庫アラート
   - RECENT_ORDERS: 最近の注文
   - TOP_PRODUCTS: 人気商品
   - PROFIT_CHART: 利益チャート
   - MARKETPLACE_COMPARISON: マーケットプレイス比較
   - SHIPMENT_STATUS: 発送ステータス
   - FORECAST_SUMMARY: 売上予測サマリー
   - JOB_QUEUE_STATUS: ジョブキューステータス
   - QUICK_ACTIONS: クイックアクション
   - CUSTOM: カスタムウィジェット

4. ウィジェット管理ページ (`apps/web/src/app/dashboard-widgets/page.tsx`)
   - ウィジェット一覧・追加・削除
   - 表示/非表示切り替え
   - プレビュータブ（リアルタイムデータ）
   - パフォーマンスタブ（DB健全性）

5. サイドバー更新
   - ウィジェット設定リンク追加（管理者セクション）

---

### Phase 67-68: 売上予測AI & 在庫最適化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 67: 売上予測エンジン**
1. 売上予測エンジン (`apps/api/src/lib/sales-forecast-engine.ts`)
   - 履歴売上データ取得（日別集計）
   - 季節性検出（曜日別・月別・週別係数）
   - 将来売上予測（移動平均＋指数平滑法）
   - カテゴリ別予測
   - 商品別需要予測
   - 在庫補充推奨（緊急/まもなく/十分/過剰）
   - 予測精度評価（MAPE, RMSE）

2. 売上予測API (`apps/api/src/routes/sales-forecast.ts`)
   - GET /api/sales-forecast/summary - 予測サマリー
   - GET /api/sales-forecast/daily - 日別予測
   - GET /api/sales-forecast/categories - カテゴリ別予測
   - GET /api/sales-forecast/products - 商品別需要予測
   - GET /api/sales-forecast/inventory-recommendations - 在庫補充推奨
   - GET /api/sales-forecast/accuracy - 予測精度
   - GET /api/sales-forecast/seasonality - 季節性パターン
   - GET /api/sales-forecast/trends - トレンド分析
   - GET /api/sales-forecast/stats - 予測統計ダッシュボードデータ

**Phase 68: 売上予測UI & 在庫最適化**
1. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `salesForecastApi` - 売上予測関連API
   - 型定義: ForecastResult, CategoryForecast, ProductForecast, InventoryRecommendation, ForecastSummary, ForecastStats

2. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `useForecastSummary()` - 予測サマリー
   - `useForecastStats()` - 予測統計
   - `useForecastDaily()` - 日別予測
   - `useForecastCategories()` - カテゴリ別予測
   - `useForecastProducts()` - 商品別需要
   - `useInventoryRecommendations()` - 在庫推奨
   - `useSeasonality()` - 季節性パターン
   - `useTrends()` - トレンド分析

3. 売上予測ページ (`apps/web/src/app/sales-forecast/page.tsx`)
   - 予測統計ダッシュボード（30日予測売上・注文数・成長率・精度）
   - 日別予測チャートタブ（履歴＋予測）
   - カテゴリ別分析タブ（成長率・トレンド）
   - 商品別需要タブ（需要予測・成長率）
   - 在庫補充推奨タブ（緊急/まもなく/十分/過剰分類）
   - 季節性パターンタブ（曜日・月別係数）

4. サイドバー更新 (`apps/web/src/components/layout/sidebar.tsx`)
   - 売上予測リンク追加（TrendingUpアイコン）

---

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

### Phase 85-86
#### 新規作成
- `apps/api/src/routes/sso.ts` - SSO API
- `apps/api/src/routes/system-performance.ts` - システムパフォーマンスAPI
- `apps/web/src/app/sso/page.tsx` - SSOページ
- `apps/web/src/app/system-performance/page.tsx` - システムパフォーマンスページ

#### 更新
- `packages/database/prisma/schema.prisma` - SSOProvider/SSOSession/SSOAuditLog/PerformanceMetric/ApiUsageLog/CdnConfig/QueryOptimizationRuleモデル追加
- `apps/api/src/index.ts` - sso, system-performanceルート登録
- `apps/web/src/components/layout/sidebar.tsx` - SSO・システム性能リンク追加
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビにリンク追加

### Phase 83-84
#### 新規作成
- `apps/api/src/routes/customer-success.ts` - カスタマーサクセスAPI
- `apps/api/src/routes/custom-reports.ts` - カスタムレポートAPI
- `apps/web/src/app/customer-success/page.tsx` - カスタマーサクセスページ
- `apps/web/src/app/custom-reports/page.tsx` - カスタムレポートページ

#### 更新
- `packages/database/prisma/schema.prisma` - Customer/CustomerAnalytics/CustomerActivity/CustomReport/ReportExecution/SharedDashboard/ReportTemplateモデル追加
- `apps/api/src/index.ts` - customer-success, custom-reportsルート登録
- `apps/web/src/components/layout/sidebar.tsx` - カスタマーサクセス・カスタムレポートリンク追加
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビにリンク追加

### Phase 81-82
#### 新規作成
- `apps/api/src/routes/external-integrations.ts` - 外部連携API
- `apps/api/src/routes/security-management.ts` - セキュリティ管理API
- `apps/web/src/app/integrations/page.tsx` - 外部連携ページ
- `apps/web/src/app/security/page.tsx` - セキュリティページ

#### 更新
- `packages/database/prisma/schema.prisma` - ExternalIntegration/IntegrationSyncLog/IntegrationWebhookLog/FreeeTransaction/ShopifyProduct/TwoFactorAuth/SecurityAuditLog/IpWhitelist/UserSession/SecuritySettingモデル追加
- `apps/api/src/index.ts` - external-integrations, security-managementルート登録
- `apps/api/package.json` - otplib追加
- `apps/web/src/components/layout/sidebar.tsx` - 外部連携・セキュリティリンク追加
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビにリンク追加

### Phase 79-80
#### 新規作成
- `apps/api/src/routes/organizations.ts` - 組織管理API
- `apps/web/src/app/organizations/page.tsx` - 組織管理ページ
- `apps/api/src/routes/inventory-forecast.ts` - 在庫予測API
- `apps/web/src/app/inventory-forecast/page.tsx` - 在庫予測ページ

#### 更新
- `packages/database/prisma/schema.prisma` - Organization/OrganizationMember/OrganizationInvitation/InventoryForecast/AutoReorderRule/AutoReorderOrderモデル追加
- `apps/api/src/index.ts` - organizations, inventory-forecastルート登録
- `apps/web/src/components/layout/sidebar.tsx` - 組織管理・在庫予測リンク追加
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビにリンク追加

### Phase 77-78
#### 新規作成
- `apps/api/src/lib/ab-test-engine.ts` - A/Bテストエンジン
- `apps/api/src/routes/ab-tests.ts` - A/BテストAPI
- `apps/web/src/app/ab-tests/page.tsx` - A/Bテスト管理ページ
- `apps/api/src/routes/suppliers.ts` - サプライヤー管理API
- `apps/web/src/app/suppliers/page.tsx` - サプライヤー管理ページ

#### 更新
- `packages/database/prisma/schema.prisma` - ABTest/ABTestVariant/ABTestAssignment/Supplier/SupplierProduct/PurchaseOrder/PurchaseOrderItemモデル追加
- `apps/api/src/index.ts` - ab-tests, suppliersルート登録
- `apps/web/src/components/layout/sidebar.tsx` - A/Bテスト・サプライヤーリンク追加
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビにリンク追加

### Phase 75-76
#### 新規作成
- `apps/web/public/manifest.json` - PWAマニフェスト
- `apps/web/public/sw.js` - Service Worker
- `apps/web/src/app/offline/page.tsx` - オフラインページ
- `apps/web/src/lib/pwa.ts` - PWAフック（インストール・更新・通知）
- `apps/web/src/components/layout/mobile-nav.tsx` - モバイルナビゲーション
- `apps/api/src/routes/advanced-analytics.ts` - 高度分析API
- `apps/web/src/app/analytics/page.tsx` - 分析ダッシュボードページ

#### 更新
- `apps/web/src/app/layout.tsx` - PWAメタデータ、レスポンシブレイアウト
- `apps/api/src/index.ts` - advanced-analyticsルート登録
- `apps/web/src/components/layout/sidebar.tsx` - 分析リンク追加

### Phase 73-74
#### 新規作成
- `apps/api/src/lib/workflow-engine.ts` - ワークフロー自動化エンジン
- `apps/api/src/routes/workflow-rules.ts` - ワークフロールールAPI
- `apps/web/src/app/workflow-rules/page.tsx` - ワークフロー管理ページ
- `apps/api/src/lib/chatbot-engine.ts` - AIチャットボットエンジン
- `apps/api/src/routes/chatbot.ts` - チャットボットAPI
- `apps/web/src/app/chatbot/page.tsx` - チャットボット管理ページ

#### 更新
- `packages/database/prisma/schema.prisma` - WorkflowRule/WorkflowExecution/ChatSession/ChatMessage/ChatbotConfigモデル追加
- `apps/api/src/index.ts` - workflow-rules, chatbotルート登録
- `apps/web/src/components/layout/sidebar.tsx` - ワークフロー・チャットボットリンク追加

### Phase 71-72
#### 新規作成
- `apps/web/src/lib/i18n/translations/ja.ts` - 日本語翻訳ファイル
- `apps/web/src/lib/i18n/translations/en.ts` - 英語翻訳ファイル
- `apps/web/src/lib/i18n/index.ts` - i18nコアシステム（Provider, hooks, formatters）
- `apps/web/src/components/ui/language-switcher.tsx` - 言語切り替えコンポーネント
- `apps/web/src/lib/realtime-enhanced.ts` - 強化リアルタイム通知システム
- `apps/web/src/app/notification-settings/page.tsx` - 通知設定ページ

#### 更新
- `apps/web/src/components/providers/app-providers.tsx` - I18nProvider追加
- `apps/web/src/components/layout/header.tsx` - 言語切り替え・多言語化対応
- `apps/web/src/components/layout/sidebar.tsx` - 通知設定リンク追加

### Phase 69-70
#### 新規作成
- `apps/api/src/routes/query-performance.ts` - クエリパフォーマンス監視API
- `apps/api/src/routes/dashboard-widgets.ts` - ダッシュボードウィジェットAPI
- `apps/web/src/app/dashboard-widgets/page.tsx` - ウィジェット管理ページ

#### 更新
- `packages/database/prisma/schema.prisma` - 複合インデックス追加、DashboardWidget/DashboardLayoutモデル追加
- `apps/api/src/index.ts` - query-performance, dashboard-widgetsルート登録
- `apps/web/src/lib/api.ts` - ダッシュボードウィジェットAPI追加
- `apps/web/src/lib/hooks.ts` - ダッシュボードウィジェットフック追加
- `apps/web/src/components/layout/sidebar.tsx` - ウィジェット設定リンク追加

### Phase 67-68
#### 新規作成
- `apps/api/src/lib/sales-forecast-engine.ts` - 売上予測エンジン
- `apps/api/src/routes/sales-forecast.ts` - 売上予測API
- `apps/web/src/app/sales-forecast/page.tsx` - 売上予測ページ

#### 更新
- `apps/api/src/index.ts` - sales-forecastルート登録
- `apps/web/src/lib/api.ts` - 売上予測API追加
- `apps/web/src/lib/hooks.ts` - 売上予測SWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - 売上予測リンク追加

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

### Phase 87-88候補

1. **多通貨対応強化**
   - リアルタイム為替レート
   - 通貨別価格表示
   - 自動価格調整
   - 通貨変換履歴

2. **監査・コンプライアンス**
   - GDPR対応
   - データ保持ポリシー
   - アクセスログ強化
   - 個人情報マスキング

3. **AI機能強化**
   - 商品説明自動生成改善
   - 需要予測精度向上
   - 価格最適化AI強化
   - チャットボット学習

4. **モバイルアプリ（React Native）**
   - iOS/Androidアプリ
   - プッシュ通知
   - オフライン対応
   - バーコードスキャン

## 技術的注意事項

1. **SSO/SAML**
   - プロバイダータイプ: GOOGLE, MICROSOFT, OKTA, AUTH0, SAML, OIDC, LDAP
   - ステータス: INACTIVE → CONFIGURING → TESTING → ACTIVE
   - PKCEサポート（code_challenge/code_verifier）
   - 属性マッピング: attributeMapping JSON
   - 許可ドメイン: allowedDomains配列
   - 自動プロビジョニング: 初回ログイン時にユーザー自動作成
   - セッション有効期限: expiresAtで管理

2. **システムパフォーマンス**
   - メトリクスタイプ: API_LATENCY, DB_QUERY_TIME, CACHE_HIT_RATE, MEMORY_USAGE, CPU_USAGE, THROUGHPUT, ERROR_RATE
   - 集計間隔: 1分（periodStart/periodEnd）
   - サンプル数カウント: sampleCount
   - CDNプロバイダー: CLOUDFLARE, AWS_CLOUDFRONT, FASTLY, BUNNY_CDN, IMGIX, CLOUDINARY
   - 画像最適化: WebP変換、複数サイズ生成（320/640/960/1280/1920px）
   - 最適化ルール: ADD_INDEX, QUERY_REWRITE, ENABLE_CACHE, PAGINATION, BATCH_LOADING

3. **カスタマーサクセス**
   - セグメント: NEW(30日以内初回), ACTIVE(30日以内注文), AT_RISK(60日超), DORMANT(90日超), CHURNED(180日超), VIP(上位10%), LOYAL(5回以上注文)
   - ティア: STANDARD(デフォルト), SILVER($500+), GOLD($1000+), PLATINUM($2500+), DIAMOND($5000+)
   - RFMスコア: 各1-5の3桁コード（例: 555=最優良顧客）
   - Recencyスコア: 7日以内=5, 30日以内=4, 60日以内=3, 90日以内=2, それ以外=1
   - Frequencyスコア: 10回以上=5, 5回以上=4, 3回以上=3, 2回以上=2, 1回=1
   - Monetaryスコア: $1000以上=5, $500以上=4, $200以上=3, $50以上=2, それ以外=1
   - チャーンリスク計算: 日数スコア(40%) + 頻度スコア(30%) + 間隔スコア(30%)

2. **カスタムレポート**
   - データソース: SALES, ORDERS, PRODUCTS, CUSTOMERS, INVENTORY, LISTINGS, ANALYTICS
   - チャートタイプ: TABLE, LINE, BAR, PIE, AREA, SCATTER, HEATMAP
   - 共有権限: VIEW(閲覧), EDIT(編集), ADMIN(管理)
   - 埋め込み: embedEnabled + embedTokenで外部埋め込み可能
   - テンプレート: プリセットのレポート設定を保存・再利用
   - 実行履歴: パラメータ・結果・所要時間を記録

3. **外部連携**
   - 連携タイプ: SHOPIFY, AMAZON, FREEE, MFCLOUD, YAMATO, SAGAWA, JAPAN_POST, CUSTOM_API
   - 認証方式: OAuth（Shopify/Amazon/freee）、APIキー（物流系）、カスタム
   - Webhookシークレット: crypto.randomBytes(32).toString('hex')
   - 署名検証: HMAC-SHA256
   - 同期タイプ: FULL(全件)、INCREMENTAL(差分)、MANUAL(手動)、WEBHOOK(Webhook起因)
   - 同期方向: IMPORT、EXPORT、BIDIRECTIONAL

2. **セキュリティ（2FA）**
   - 認証方式: TOTP（デフォルト）、SMS、EMAIL、HARDWARE_KEY
   - OTPライブラリ: otplib
   - バックアップコード: 10個生成、使用済みは自動削除
   - ロックアウト: 5回失敗で30分ロック
   - シークレット: authenticator.generateSecret()
   - OTPAuth URL: authenticator.keyuri(userId, 'RAKUDA', secret)

3. **監査ログ**
   - アクション: LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, TWO_FACTOR_*, SESSION_*, API_KEY_*, DATA_*, SETTINGS_*, MEMBER_*, IP_*, RATE_LIMITED, SUSPICIOUS_ACTIVITY
   - カテゴリ: AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, CONFIGURATION, SECURITY, ORGANIZATION, API
   - 重要度: DEBUG, INFO, WARNING, ERROR, CRITICAL
   - 保持期間: 無期限（手動削除のみ）

4. **IPホワイトリスト**
   - タイプ: SINGLE(単一IP)、RANGE(CIDR)
   - スコープ: GLOBAL、ORGANIZATION、USER
   - 有効期限: 任意設定可能
   - 使用統計: useCount, lastUsedAt

5. **セッション管理**
   - デバイス情報: deviceName, deviceType, browser, os
   - 位置情報: ipAddress, country, city
   - 無効化: 個別revoke、全セッションrevoke-all

6. **マルチテナント（組織管理）**
   - プラン: FREE(3ユーザー/100商品), STARTER(10/1000), PROFESSIONAL(50/10000), ENTERPRISE(無制限)
   - ロール: OWNER(全権限), ADMIN(設定変更可), MEMBER(基本操作), VIEWER(読み取り専用)
   - スラグ: URL用（自動生成、重複時はタイムスタンプ付加）
   - 招待トークン: crypto.randomBytes(32).toString('hex')
   - 招待有効期限: 7日間
   - オーナー削除不可

2. **在庫予測・自動発注**
   - 需要予測: 7日移動平均（過去30日の販売データから計算）
   - 安全在庫計算: avgDailySales × √leadTime × zScore
   - サービスレベル: 99%(z=2.33), 95%(z=1.65), 90%(z=1.28)
   - 在庫日数: currentStock / avgDailySales
   - リスク判定: CRITICAL(<7日), HIGH(<14日), MEDIUM(<30日), LOW(30日以上)
   - トリガータイプ: STOCK_LEVEL(在庫数), DAYS_OF_STOCK(在庫日数), DEMAND_SPIKE(需要急増), SCHEDULED(定期)
   - 承認タイプ: NONE(自動実行), MANAGER, OWNER, BOTH

3. **A/Bテスト**
   - テストタイプ: TITLE, DESCRIPTION, PRICE, IMAGE, MULTI
   - 成功指標: CONVERSION_RATE, CLICK_RATE, REVENUE, AVG_ORDER_VALUE
   - 統計的有意性: Z検定、デフォルト信頼水準95%
   - バリアント割り当て: 重み付きランダム
   - 最小サンプルサイズ: デフォルト100
   - イベント追跡: impression, click, view, conversion

2. **サプライヤー管理**
   - サプライヤーコード: ユニーク（例: SUP001）
   - 発注番号形式: PO-{年}-{ランダム4桁}
   - 発注ステータスフロー: DRAFT → PENDING → APPROVED → ORDERED → SHIPPED → DELIVERED
   - 価格割引: priceBreaks配列 [{ qty: 10, price: 900 }]
   - 入荷追跡: receivedQty で部分入荷対応
   - 自動発注推奨: 在庫状況と最小発注数量を考慮

3. **PWA対応**
   - Service Worker: キャッシュ名 `rakuda-v1`
   - キャッシュ対象: /_next/, /icons/, /images/, manifest.json
   - API呼び出し: Network First（5秒タイムアウト）
   - 静的アセット: Cache First
   - オフライン時: /offline にリダイレクト
   - バックグラウンドシンク: orders-sync, shipments-sync
   - プッシュ通知: /api/notifications/subscribe でサブスクリプション登録

2. **モバイルレイアウト**
   - ブレークポイント: md (768px) でデスクトップ/モバイル切り替え
   - ボトムナビ: 5項目（ホーム、商品、注文、発送、通知）
   - メニュー: Sheet使用（左スライド）
   - インストールバナー: bottom-20 (ボトムナビの上)
   - 更新バナー: top-14 (ヘッダーの下)

3. **高度分析API**
   - 日付範囲: startDate, endDate パラメータ
   - グルーピング: day, week, month
   - ソート: revenue, orders, profit_rate
   - エクスポート形式: csv, json
   - 前期比較: 同じ期間分だけ過去と比較

4. **ワークフロー自動化**
   - トリガータイプ: 14種類（ORDER_*, LISTING_*, INVENTORY_*, JOB_*, SCHEDULE, MANUAL）
   - 条件演算子: equals, not_equals, contains, greater_than, less_than, in, is_null 等
   - アクションタイプ: SEND_NOTIFICATION, SEND_SLACK, UPDATE_STATUS, CREATE_TASK, TRIGGER_JOB, WEBHOOK, LOG
   - 変数置換: {{変数名}} 形式（orderId, marketplace, totalAmount, productTitle 等）
   - 実行制限: maxExecutionsPerDay（日次上限）, cooldownMinutes（クールダウン）
   - 優先度: 高いほど先に評価・実行

2. **AIチャットボット**
   - インテント: ORDER_STATUS, TRACKING_INFO, PRODUCT_INQUIRY, RETURN_REFUND, SHIPPING_QUESTION, COMPLAINT等
   - AIモデル: GPT-4o（デフォルト）、Temperature 0.7
   - エスカレーション条件: 苦情検出、キーワードマッチ、メッセージ数超過
   - セッション管理: マーケットプレイス + customerId で識別
   - 対応言語: 英語(en), 日本語(ja)
   - ウェルカムメッセージ: セッション作成時に自動送信

3. **多言語対応(i18n)**
   - 対応言語: 日本語(ja), 英語(en)
   - デフォルト: 日本語
   - ロケール検出: ブラウザ設定 → localStorage → デフォルト
   - 翻訳キー: ドット記法（例: 'nav.dashboard', 'products.searchPlaceholder'）
   - 通貨フォーマット: JPY, USD, EUR対応
   - 新しい翻訳追加: ja.ts, en.ts両方に同じキーを追加

2. **リアルタイム通知**
   - 接続タイプ: WebSocket（優先）, SSE, Polling（フォールバック）
   - 自動再接続: 最大5回、指数バックオフ
   - ブラウザ通知: Notification API使用、許可リクエスト必須
   - サウンド通知: Web Audio API、重大度別周波数（success:880Hz, info:660Hz, warning:440Hz, error:330Hz）
   - SWRキャッシュ: イベントタイプ別に自動無効化
   - 設定永続化: localStorage（キー: rakuda_notification_settings）

3. **データベースインデックス最適化**
   - 複合インデックス: 頻出クエリパターンに基づいて追加
   - キャッシュヒット率: 95%以上が目標（99%以上が理想）
   - 未使用インデックス: 定期的に確認・削除検討
   - VACUUM ANALYZE: 大量データ変更後に実行推奨

2. **ダッシュボードウィジェット**
   - グリッドレイアウト: 4列ベース
   - 更新間隔: デフォルト60秒（ウィジェット毎に設定可能）
   - ウィジェットサイズ: タイプ毎に最小サイズあり
   - デフォルトセットアップ: 8ウィジェット（売上・注文・発送・予測等）

3. **売上予測AI**
   - 予測手法: 移動平均（7日）＋ 指数平滑法（α=0.3）
   - 季節性係数: 曜日別、月別、週別で計算
   - 信頼度: 高(0.8以上)、中(0.5-0.8)、低(0.5未満)
   - 在庫アクション: restock_urgent（7日以内在庫切れ）、restock_soon（14日以内）、sufficient（十分）、overstock（過剰）
   - 精度指標: MAPE（平均絶対パーセント誤差）、RMSE（二乗平均平方根誤差）

2. **レポート自動生成**
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

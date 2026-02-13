# RAKUDA 引き継ぎドキュメント

## 最終更新
2026-02-13

## 現在の状態

### 完了済みPhase
| Phase | 内容 | 完了日 |
|-------|------|--------|
| 17-18 | 在庫アラート処理・売上サマリー計算 | 2025-02-10 |
| 19-20 | データエクスポート・監査ログ | 2025-02-10 |
| 21-22 | システム設定管理・API使用量管理 | 2025-02-10 |
| 23-24 | ユーザー管理/RBAC・Webhook管理の強化 | 2025-02-10 |
| 25-26 | バックアップ/リストア・ダッシュボードウィジェット | 2025-02-10 |
| 27-28 | 通知チャンネル拡張・レポート機能強化 | 2026-02-11 |
| 29-30 | バッチ処理最適化・多言語対応 | 2026-02-11 |
| 31-32 | パフォーマンス最適化・監視アラート | 2026-02-11 |
| 33-34 | セキュリティ強化・外部連携 | 2026-02-11 |
| 35-36 | ワークフロー自動化・AI機能強化 | 2026-02-11 |
| 37-38 | データ可視化・検索機能 | 2026-02-11 |
| 39-40 | エンリッチメントエンジン・Joom出品ワークフロー | 2026-02-11 |
| 41-50 | フロントエンドUI・テスト・BullMQ統合 | 2026-02-12 |
| 51-60 | eBay出品・商品レビュー・バッチ処理 | 2026-02-12 |
| 61-70 | サプライヤー管理・在庫予測・レポート生成 | 2026-02-12 |
| 71-80 | 売上予測・分析・カスタマーサクセス | 2026-02-12 |
| 81-90 | カスタムレポート・SSO・システム性能 | 2026-02-13 |
| 91-92 | 多通貨管理・コンプライアンス | 2026-02-13 |
| 93-94 | バックアップ/リカバリ・監視アラート | 2026-02-13 |
| 95-96 | 出品パフォーマンス分析・改善提案エンジン | 2026-02-13 |
| 97-98 | 自動アクション・利益計算 | 2026-02-13 |
| 99-100 | テスト強化・ドキュメント整備 | 2026-02-14 |

### 最新コミット
- ハッシュ: (コミット予定)
- メッセージ: `feat: Phase 99-100 テスト強化とドキュメント整備`

---

## Phase 97-98 実装内容

### Phase 97: 自動アクションルール
**新規モデル:**
- AutomationRule（自動化ルール）
- AutomationExecution（実行履歴）
- SafetySettings（安全設定）

**新規ファイル:**
- `apps/api/src/routes/automation-rules.ts` - 自動アクションAPI
- `apps/web/src/app/automation-rules/page.tsx` - 自動アクション管理画面

**機能:**
- ルール管理（トリガー条件・アクション定義）
- ドライラン（テスト実行）
- 実行履歴・統計
- 安全設定（緊急停止、実行上限、クールダウン）
- トリガータイプ: low_performance, price_change, inventory_low, competitor_change, schedule
- アクションタイプ: pause_listing, adjust_price, send_notification, create_task

### Phase 98: 利益計算・コスト管理
**新規モデル:**
- ProductCost（商品コスト）
- ProfitCalculation（利益計算結果）
- FeeStructure（手数料構造）
- ProfitTarget（利益目標）

**新規ファイル:**
- `apps/api/src/routes/profit-calculation.ts` - 利益計算API
- `apps/web/src/app/profit-calculation/page.tsx` - 利益計算管理画面

**機能:**
- 利益計算（仕入原価・各種手数料・為替・送料を考慮）
- シミュレーション（価格変更の影響分析）
- コスト管理（eBay/Joom手数料、送料）
- 利益目標設定・達成率追跡
- 総合レポート生成

---

## Phase 95-96 実装内容

### Phase 95: 出品パフォーマンス分析
**新規モデル:**
- ListingPerformance（パフォーマンス指標）
- PerformanceSnapshot（履歴スナップショット）
- PerformanceThreshold（閾値設定）
- LowPerformanceFlag（低パフォーマンスフラグ）
- CategoryBenchmark（カテゴリベンチマーク）

**機能:**
- パフォーマンス追跡（インプレッション、クリック、CTR、CV率、売上）
- 低パフォーマンス商品の自動検出
- カテゴリ別ベンチマーク比較
- スコア算出（重み付けスコアリング）

### Phase 96: 改善提案エンジン
**新規モデル:**
- ImprovementSuggestion（改善提案）
- BulkAction（一括アクション）
- ActionHistory（アクション履歴）

**機能:**
- AI改善提案（タイトル、説明文、価格、画像）
- 一括適用機能
- 提案効果の追跡
- リスク評価・低パフォーマンス商品管理

---

## Phase 93-94 実装内容

### Phase 93: バックアップ/リカバリ
**新規モデル:**
- BackupJob, BackupSchedule, RecoveryPoint, RestoreJob

**機能:**
- データベースバックアップ（フル/増分）
- スケジュールバックアップ
- リカバリポイント管理
- リストアジョブ実行

### Phase 94: 監視アラート
**新規モデル:**
- AlertRule, AlertIncident, AlertEscalation, AlertNotificationChannel, AlertNotification

**機能:**
- アラートルール設定（メトリクス・閾値・条件）
- インシデント管理
- エスカレーション
- 通知チャンネル（Slack/Email/Webhook/PagerDuty）

---

## Phase 39-40 実装内容

### Phase 39: エンリッチメントエンジン
**新規モデル:**
- EnrichmentTask（エンリッチメントタスク）
- EnrichmentStep（ステップ履歴）
- ProhibitedKeyword（禁制品キーワード辞書）

**新規ファイル:**
- `apps/worker/src/lib/enrichment-service.ts` - エンリッチメントサービス
- `apps/api/src/routes/enrichment.ts` - エンリッチメントAPI

**機能:**
- GPT-4oによる翻訳・属性抽出・検証（1回のAPI呼び出しで3処理）
- 禁制品キーワードチェック（battery, hazardous, cites, trademark, adult, pharmaceutical, weapon）
- 価格計算（仕入価格→Joom販売価格）
- タスク管理（作成・実行・承認・却下・リトライ）
- ステップ履歴記録
- 禁制品キーワード辞書管理

### Phase 40: Joom出品ワークフロー
**新規モデル:**
- JoomListing（Joom出品情報）
- JoomPublishBatch（一括出品バッチ）
- JoomApiLog（APIログ）

**新規ファイル:**
- `apps/worker/src/lib/joom-publish-service.ts` - Joom出品サービス
- `apps/api/src/routes/joom.ts` - Joom出品API

**機能:**
- 画像パイプライン（ダウンロード→最適化→S3アップロード）
- Joom出品（Draft→Ready→Publishing→Active）
- Dry-Run（出品プレビュー）
- 一括出品（BatchPublishService）
- 完全ワークフロー（エンリッチメント→画像処理→出品）
- APIログ記録

---

## Phase 37-38 実装内容

### Phase 37: データ可視化
**新規モデル:**
- ChartConfig（グラフ設定）
- ChartData（グラフデータ）
- DashboardChartItem（ダッシュボード内グラフ）
- WidgetPreset（ウィジェットプリセット）
- UserFeedback（ユーザーフィードバック）
- PredictionFeedback（予測フィードバック）

**新規ファイル:**
- `apps/worker/src/lib/visualization-service.ts` - 可視化サービス
- `apps/api/src/routes/visualization.ts` - 可視化API

**機能:**
- グラフ設定管理（LINE, BAR, PIE, AREA, SCATTER, DONUT, RADAR, HEATMAP, TREEMAP, FUNNEL）
- 時間粒度別データ集計（HOURLY, DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY）
- データソース対応（SALES, ORDERS, PRODUCTS, PREDICTIONS, CUSTOM）
- ダッシュボードへのグラフ配置
- ウィジェットプリセット管理
- ユーザーフィードバック収集
- AI予測フィードバック収集・統計

### Phase 38: 検索機能
**新規モデル:**
- SearchIndex（検索インデックス）
- SearchLog（検索ログ）
- SearchSynonym（同義語辞書）
- SearchFilter（検索フィルター）
- PopularSearch（人気検索）
- SearchSuggestion（検索サジェスト）

**新規ファイル:**
- `apps/worker/src/lib/search-service.ts` - 検索サービス
- `apps/api/src/routes/search.ts` - 検索API

**機能:**
- PostgreSQL全文検索（to_tsvector, ts_rank）
- 商品・注文検索
- 同義語展開（日本語・英語対応）
- 検索サジェスト（オートコンプリート）
- 人気検索・トレンド分析
- クリック/コンバージョン追跡
- 検索フィルター管理
- 検索アナリティクス（CTR、コンバージョン率）

---

## 累積実装内容

### Phase 35-36
- **ワークフロー自動化**: Workflow, WorkflowStep, WorkflowExecution, ApprovalRequest, AutomationRule
- **AI機能強化**: AiModel, PricePrediction, DemandForecast, ProductRecommendation, CompetitorPrice, PriceOptimization

### Phase 33-34
- **セキュリティ強化**: SecurityEvent, LoginAttempt, DeviceSession, TwoFactorAuth
- **外部連携**: ExternalIntegration, IntegrationCredential, AnalyticsEvent, AccountingExport

### Phase 31-32
- **パフォーマンス最適化**: CacheConfig, CacheEntry, QueryPerformance
- **監視・アラート**: MetricDefinition, MetricSnapshot, MetricAlertRule, MetricAlert, SystemHealth

### Phase 29-30
- **バッチ処理最適化**: BatchJob, BatchExecution, BatchStep, BatchEvent
- **多言語対応**: TranslationNamespace, TranslationKey, Translation, SupportedLocale, TranslationHistory

### Phase 27-28
- **通知チャンネル拡張**: NotificationDispatch, NotificationTemplate, NotificationPreference
- **レポート機能強化**: Report, ReportTemplate, ReportScheduleConfig, ReportExecution

### Phase 25-26
- **バックアップ/リストア**: Backup, BackupSchedule, RestoreJob
- **ダッシュボードウィジェット**: DashboardWidget, Dashboard, DashboardItem, WidgetData, KpiSnapshot

### Phase 23-24
- **ユーザー管理/RBAC**: User, Role, Permission, UserRole, UserSession, UserApiKey, UserAuditLog
- **Webhook管理の強化**: WebhookEndpoint, WebhookDelivery, WebhookSecret

### Phase 21-22
- **システム設定管理**: SystemSetting, SettingHistory
- **API使用量管理**: ApiKey, ApiUsageLog, RateLimitRecord, ApiUsageSummary

### Phase 19-20
- **データエクスポート**: ExportJob
- **監査ログ**: AuditLog

### Phase 17-18
- **在庫アラート処理**: InventoryAlert
- **売上サマリー計算**: SalesSummary

---

## Joom出品ワークフロー

### パイプライン
```
[Chrome拡張] → [Product登録]
        ↓
[エンリッチメント]
 ├─ 翻訳（日→英/露）
 ├─ 属性抽出（ブランド、色、サイズ等）
 ├─ 禁制品チェック
 └─ 価格計算
        ↓
[レビュー] → approved / rejected / review_required
        ↓
[画像処理]
 ├─ ダウンロード（リトライ3回）
 ├─ 最適化（1200x1200, WebP）
 └─ S3アップロード
        ↓
[Joom出品]
 ├─ Dry-Run（プレビュー）
 └─ 実出品
```

### API エンドポイント

#### エンリッチメント (`/api/enrichment`)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /tasks | タスク一覧 |
| POST | /tasks | タスク作成 |
| GET | /tasks/:id | タスク詳細 |
| POST | /tasks/:id/approve | 承認 |
| POST | /tasks/:id/reject | 却下 |
| POST | /tasks/:id/retry | リトライ |
| GET | /review | レビュー待ち一覧 |
| GET | /stats | 統計 |
| GET | /keywords | 禁制品キーワード一覧 |
| POST | /keywords | キーワード追加 |

#### Joom (`/api/joom`)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /listings | 出品一覧 |
| POST | /listings | 出品作成 |
| GET | /listings/:id | 出品詳細 |
| POST | /listings/:id/preview | Dry-Run |
| POST | /listings/:id/publish | 出品実行 |
| GET | /batches | バッチ一覧 |
| POST | /batches | バッチ作成 |
| POST | /batches/:id/execute | バッチ実行 |
| POST | /workflow/full | 完全ワークフロー |

---

## 次のPhase候補

### Phase 41-42 候補
1. **テスト強化** - 単体・統合・E2Eテストのカバレッジ向上
2. **フロントエンドUI** - エンリッチメント/Joom管理画面
3. **BullMQワーカー統合** - ジョブキュー経由の非同期処理
4. **eBay出品ワークフロー** - Joomと同様のフロー

---

## 技術メモ

### ビルドコマンド
```bash
npm run build
```

### Prismaマイグレーション
```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

### 追加パッケージ
- bcrypt: パスワードハッシュ用（Phase 23）
- ioredis: Redis接続（Phase 31）
- speakeasy: TOTP 2FA用（Phase 33）
- qrcode: QRコード生成用（Phase 33）
- openai: GPT-4o API（Phase 39）

### 注意事項
- Prisma JSON型には `as any` キャストが必要な場合あり
- バックアップ暗号化キーは環境変数 `BACKUP_ENCRYPTION_KEY` で設定
- 通知チャンネル設定: webhookUrl, token, email, smtpHost, smtpPort, smtpUser
- Orderモデルは `total` (not `totalAmount`)、`marketplaceOrderId` (not `orderNumber`)、`fulfillmentStatus` (not `shippingStatus`) を使用
- BullMQ JobsOptionsにtimeoutオプションは存在しない（データに含めてワーカーで処理）
- i18nフォールバックチェーン: zh-TW→zh→en, ko→en, ja→en 等
- 既存のAlertモデルと競合するため、メトリクス関連はMetricAlertRule等のプレフィックスを使用
- 認証情報の暗号化には環境変数 `ENCRYPTION_KEY` を使用（AES-256-GCM）
- Saleモデルには `soldAt` フィールドがない（`createdAt` を使用）
- AI API呼び出しには環境変数 `OPENAI_API_KEY` が必要
- PostgreSQL全文検索には日本語設定 `japanese` を使用
- ExchangeRateモデルは `fetchedAt` でソート（`createdAt` ではない）

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

# RAKUDA 引き継ぎドキュメント

## 最終更新
2026-02-11

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

### 最新コミット
- ハッシュ: `5b5d66b`
- メッセージ: `feat: Phase 35-36 ワークフロー自動化とAI機能強化を実装`

---

## Phase 35-36 実装内容

### Phase 35: ワークフロー自動化
**新規モデル:**
- Workflow, WorkflowStep（ワークフロー定義）
- WorkflowExecution, WorkflowStepExecution（実行インスタンス）
- ApprovalRequest, ApprovalAction（承認フロー）
- AutomationRule, AutomationExecution（自動化ルール）

**新規ファイル:**
- `apps/worker/src/lib/workflow-service.ts` - ワークフロー・承認・自動化サービス
- `apps/api/src/routes/workflows.ts` - ワークフローAPI

**機能:**
- ワークフロー定義・実行管理
- 8種類のステップタイプ（ACTION, CONDITION, APPROVAL, DELAY, NOTIFICATION, LOOP, PARALLEL, AI, INTEGRATION）
- 承認フロー（複数承認者、期限、エスカレーション）
- 自動化ルールエンジン（条件評価、アクション実行）
- イベント駆動型自動化（product.created, order.completed等）
- レート制限・クールダウン機能

### Phase 36: AI機能強化
**新規モデル:**
- AiModel（AIモデル設定）
- AiTrainingJob（学習ジョブ）
- AiPredictionLog（予測ログ）
- PricePrediction（価格予測）
- DemandForecast（需要予測）
- ProductRecommendation（商品推薦）
- CompetitorPrice（競合価格）
- PriceOptimization（価格最適化設定）

**新規ファイル:**
- `apps/worker/src/lib/ai-service.ts` - AI機能サービス
- `apps/api/src/routes/ai.ts` - AI機能API

**機能:**
- AIモデル管理（OpenAI, Anthropic, Google対応）
- 価格予測（競合分析、市場需要、季節性考慮）
- 需要予測（トレンド分析、季節性指数）
- 商品推薦（類似商品、クロスセル、アップセル等8種類）
- 競合価格監視・統計
- 価格最適化（5種類の戦略: COMPETITIVE, PROFIT_MAXIMIZATION, MARKET_PENETRATION, DYNAMIC, RULE_BASED）
- AI学習ジョブ管理

---

## 累積実装内容

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

## 次のPhase候補

### Phase 37-38 候補
1. **データ可視化** - グラフ・チャート・ダッシュボード強化
2. **検索機能強化** - Elasticsearch連携・全文検索
3. **Joom出品ワークフロー** - Phase 40の実装開始
4. **テスト強化** - 単体・統合・E2Eテストのカバレッジ向上

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

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

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

### 最新コミット
- ハッシュ: `161567c`
- メッセージ: `feat: Phase 31-32 パフォーマンス最適化と監視・アラート機能を実装`

---

## Phase 31-32 実装内容

### Phase 31: パフォーマンス最適化
**新規モデル:**
- CacheConfig, CacheEntry, QueryPerformance

**新規ファイル:**
- `apps/worker/src/lib/cache-service.ts` - キャッシュサービス
- `apps/api/src/routes/cache.ts` - キャッシュAPI

**機能:**
- Redisを活用した高速キャッシュ
- キャッシュ統計（ヒット率・ミス率・退避数）
- タグベースのキャッシュ無効化
- Read-throughキャッシュパターン（getOrFetch）
- 期限切れキャッシュの自動クリーンアップ
- クエリパフォーマンス分析（スロークエリ・N+1検出）
- キャッシュタイプ: QUERY, DATA, PAGE, FRAGMENT, SESSION, API

### Phase 32: 監視・アラート
**新規モデル:**
- MetricDefinition, MetricSnapshot, MetricAlertRule, MetricAlert, MetricAlertHistory, SystemHealth

**新規ファイル:**
- `apps/worker/src/lib/monitoring-service.ts` - 監視サービス
- `apps/api/src/routes/metrics.ts` - メトリクスAPI

**機能:**
- メトリクス定義・収集（SYSTEM, BUSINESS, PERFORMANCE, SECURITY, CUSTOM）
- アラートルール設定（しきい値・比較・継続時間）
- アラートライフサイクル（FIRING→ACKNOWLEDGED→RESOLVED）
- アラート重要度（CRITICAL, WARNING, INFO）
- 通知チャンネル連携
- アラート履歴追跡
- システムヘルス監視
- 監視統計ダッシュボード

---

## 累積実装内容

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

### Phase 33-34 候補
1. **セキュリティ強化** - 2FA・セッション管理・監査強化
2. **外部連携強化** - Google Analytics連携・会計ソフト連携
3. **データ可視化** - グラフ・チャート・ダッシュボード強化
4. **検索機能強化** - Elasticsearch連携・全文検索

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

### 注意事項
- Prisma JSON型には `as any` キャストが必要な場合あり
- バックアップ暗号化キーは環境変数 `BACKUP_ENCRYPTION_KEY` で設定
- 通知チャンネル設定: webhookUrl, token, email, smtpHost, smtpPort, smtpUser
- Orderモデルは `total` (not `totalAmount`)、`marketplaceOrderId` (not `orderNumber`)、`fulfillmentStatus` (not `shippingStatus`) を使用
- BullMQ JobsOptionsにtimeoutオプションは存在しない（データに含めてワーカーで処理）
- i18nフォールバックチェーン: zh-TW→zh→en, ko→en, ja→en 等
- 既存のAlertモデルと競合するため、メトリクス関連はMetricAlertRule等のプレフィックスを使用

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

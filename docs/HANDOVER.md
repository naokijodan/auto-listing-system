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

### 最新コミット
- ハッシュ: `cccee1c`
- メッセージ: `feat: Phase 33-34 セキュリティ強化と外部連携機能を実装`

---

## Phase 33-34 実装内容

### Phase 33: セキュリティ強化
**新規モデル:**
- SecurityEvent, LoginAttempt, DeviceSession
- TwoFactorAuth, TwoFactorChallenge
- ApiKeyPolicy, PasswordPolicy, PasswordHistory

**新規ファイル:**
- `apps/worker/src/lib/security-service.ts` - セキュリティサービス
- `apps/api/src/routes/security.ts` - セキュリティAPI

**機能:**
- セキュリティイベントログ（24種類のイベントタイプ）
- ブルートフォース保護（IPブロック、試行回数制限）
- デバイスセッション管理（信頼済みデバイス、同時ログイン制限）
- TOTP 2FA（speakeasy + QRcode + バックアップコード）
- APIキーポリシー（IP制限、スコープ、有効期限、使用回数制限）
- パスワードポリシー（強度要件、履歴チェック、有効期限）
- AES-256-GCM暗号化

### Phase 34: 外部連携強化
**新規モデル:**
- ExternalIntegration, IntegrationCredential, IntegrationSyncLog
- AnalyticsEvent, AccountingExport, AccountingMapping

**新規ファイル:**
- `apps/worker/src/lib/integration-service.ts` - 外部連携サービス
- `apps/api/src/routes/integrations.ts` - 外部連携API

**機能:**
- 外部連携の一元管理
- OAuth 2.0/APIキー認証の統一
- 認証情報の暗号化保存
- 同期ログ・リトライ機能
- Google Analytics 4連携基盤
- 会計ソフト連携基盤（freee/弥生/マネーフォワード対応）
- BaseIntegrationService抽象クラス（SDK）

---

## 累積実装内容

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

### Phase 35-36 候補
1. **データ可視化** - グラフ・チャート・ダッシュボード強化
2. **検索機能強化** - Elasticsearch連携・全文検索
3. **ワークフロー自動化** - 承認フロー・自動化ルール
4. **AI機能強化** - 商品推薦・価格最適化・需要予測

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

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

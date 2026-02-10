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

### 最新コミット
- ハッシュ: `98e1ceb`
- メッセージ: `feat: Phase 29-30 バッチ処理最適化と多言語対応を実装`

---

## Phase 29-30 実装内容

### Phase 29: バッチ処理の最適化
**新規モデル:**
- BatchJob, BatchExecution, BatchStep, BatchEvent

**新規ファイル:**
- `apps/worker/src/lib/batch-service.ts` - バッチ処理サービス
- `apps/api/src/routes/batch-jobs.ts` - バッチジョブAPI

**機能:**
- BullMQを活用した並列実行
- 進捗追跡（推定/確定の区別）
- キャンセルフラグによるグレースフル停止
- イベント駆動による進捗記録
- 12種類のジョブタイプ（PRODUCT_SYNC, PRICE_UPDATE, ORDER_SYNC等）

### Phase 30: 多言語対応（i18n）
**新規モデル:**
- TranslationNamespace, TranslationKey, Translation, SupportedLocale, TranslationHistory

**新規ファイル:**
- `apps/worker/src/lib/i18n-service.ts` - i18nサービス
- `apps/api/src/routes/i18n.ts` - i18n API

**機能:**
- フォールバックチェーン対応（zh-TW→zh→en等）
- ETag/Last-Modified対応のバンドルAPI
- 翻訳ステータス管理（未翻訳/機械翻訳/承認済み/公開済み）
- インポート/エクスポート機能
- 対応言語: en, ja, zh, zh-TW, ko, es, de, fr

---

## 累積実装内容

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

### Phase 31-32 候補
1. **パフォーマンス最適化** - クエリ最適化・キャッシュ強化
2. **監視・アラート** - メトリクス収集・しきい値アラート
3. **セキュリティ強化** - 2FA・セッション管理・監査強化
4. **外部連携強化** - Google Analytics連携・会計ソフト連携

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

### 注意事項
- Prisma JSON型には `as any` キャストが必要な場合あり
- バックアップ暗号化キーは環境変数 `BACKUP_ENCRYPTION_KEY` で設定
- 通知チャンネル設定: webhookUrl, token, email, smtpHost, smtpPort, smtpUser
- Orderモデルは `total` (not `totalAmount`)、`marketplaceOrderId` (not `orderNumber`)、`fulfillmentStatus` (not `shippingStatus`) を使用
- BullMQ JobsOptionsにtimeoutオプションは存在しない（データに含めてワーカーで処理）
- i18nフォールバックチェーン: zh-TW→zh→en, ko→en, ja→en 等

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

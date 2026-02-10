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

### 最新コミット
- ハッシュ: `76df8fb`
- メッセージ: `feat: Phase 27-28 通知チャンネル拡張とレポート機能強化`

---

## Phase 27-28 実装内容

### Phase 27: 通知チャンネル拡張
**新規モデル:**
- NotificationDispatch, NotificationTemplate, NotificationPreference

**新規ファイル:**
- `apps/worker/src/lib/notification-channel-service.ts` - 通知ディスパッチサービス
- `apps/api/src/routes/notification-dispatches.ts` - 通知ディスパッチAPI

**機能:**
- Slack Webhook通知（Block Kit使用）
- Discord Embed通知
- LINE Notify API連携
- Email送信（シミュレーション）
- 重要度に応じた色分け（INFO=青, SUCCESS=緑, WARNING=オレンジ, ERROR=赤）
- 通知テンプレート管理
- ユーザー通知プリファレンス
- 失敗通知のリトライ機能
- 通知統計

### Phase 28: レポート機能強化
**新規モデル:**
- Report, ReportTemplate, ReportScheduleConfig, ReportExecution

**新規ファイル:**
- `apps/worker/src/lib/report-service.ts` - レポート生成サービス
- `apps/api/src/routes/reports.ts` - レポート管理API

**機能:**
- レポートタイプ：SALES_SUMMARY, INVENTORY_STATUS, PRODUCT_PERFORMANCE, ORDER_DETAIL, CUSTOMER_ANALYSIS, PROFIT_ANALYSIS, MARKETPLACE_COMPARISON, AUDIT_REPORT, CUSTOM
- 出力フォーマット：PDF, Excel, CSV, HTML
- スケジュール実行機能
- 古いレポートの自動クリーンアップ
- レポートテンプレート管理

---

## 累積実装内容

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

### Phase 29-30 候補
1. **バッチ処理の最適化** - 並列実行・進捗追跡・キャンセル機能
2. **多言語対応** - i18n基盤の構築
3. **パフォーマンス最適化** - クエリ最適化・キャッシュ強化
4. **監視・アラート** - メトリクス収集・しきい値アラート

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

---

## 開発ルール
1. 2Phaseずつ実装
2. 3者協議（Claude/GPT-5/Gemini）で設計判断
3. 確認なしでノンストップ実行
4. Git commit/push後にObsidianノート作成

# RAKUDA 次セッション指示書

## 更新日
2026-02-13

## 現在の状態

### 完了済みPhase（直近）

| Phase | 内容 | 状態 |
|-------|------|------|
| 95-96 | eBay出品パフォーマンス分析 & 改善提案エンジン | ✅ 完了 |
| 93-94 | バックアップ・リカバリ強化 & 監視アラート強化 | ✅ 完了 |
| 91-92 | Webhook配信システム強化 & API利用統計＆レート制限強化 | ✅ 完了 |
| 89-90 | 高度な検索・フィルタリング & データエクスポート・インポート強化 | ✅ 完了 |
| 87-88 | 多通貨対応強化 & 監査・コンプライアンス | ✅ 完了 |
| 85-86 | SSO/SAML対応 & パフォーマンス最適化 | ✅ 完了 |
| 83-84 | カスタマーサクセス機能 & 高度なレポーティング | ✅ 完了 |
| 81-82 | 外部連携強化 & セキュリティ強化 | ✅ 完了 |

### 最新コミット

```
91ef166 feat: Phase 91-92 Webhook配信システム強化 & API利用統計＆レート制限強化
```

---

## 次に実装すべきPhase

### Phase 93-94: バックアップ・リカバリ強化 & 監視アラート強化

**Phase 93: バックアップ・リカバリ強化**
1. Prismaスキーマ追加
   - BackupJob: バックアップジョブ（タイプ・ステータス・サイズ・保存先）
   - BackupSchedule: バックアップスケジュール（Cron・保持期間・暗号化設定）
   - RecoveryPoint: リカバリポイント（メタデータ・整合性チェック）
   - BackupType: FULL, INCREMENTAL, DIFFERENTIAL
   - BackupTarget: DATABASE, FILES, REDIS, FULL_SYSTEM
   - BackupStorage: LOCAL, S3, GCS, AZURE_BLOB

2. バックアップAPI (`apps/api/src/routes/backup-recovery.ts`)
   - GET /api/backup-recovery/stats - バックアップ統計
   - GET /api/backup-recovery/jobs - ジョブ一覧
   - POST /api/backup-recovery/jobs - バックアップ開始
   - GET /api/backup-recovery/schedules - スケジュール一覧
   - POST /api/backup-recovery/schedules - スケジュール作成
   - GET /api/backup-recovery/recovery-points - リカバリポイント一覧
   - POST /api/backup-recovery/restore - リストア開始
   - POST /api/backup-recovery/verify/:id - 整合性検証

3. バックアップページ (`apps/web/src/app/backup-recovery/page.tsx`)
   - バックアップ統計ダッシュボード
   - バックアップ一覧・即時実行
   - スケジュール管理
   - リストア機能
   - 整合性検証

**Phase 94: 監視アラート強化**
1. Prismaスキーマ追加
   - AlertRule: アラートルール（条件・閾値・アクション）
   - AlertIncident: インシデント（発生時刻・解決時刻・影響範囲）
   - AlertEscalation: エスカレーション設定
   - AlertNotificationChannel: 通知チャンネル設定
   - AlertSeverity: INFO, WARNING, ERROR, CRITICAL
   - AlertCondition: THRESHOLD, ANOMALY, PATTERN, ABSENCE

2. 監視アラートAPI (`apps/api/src/routes/monitoring-alerts.ts`)
   - GET /api/monitoring-alerts/stats - アラート統計
   - GET /api/monitoring-alerts/rules - ルール一覧
   - POST /api/monitoring-alerts/rules - ルール作成
   - GET /api/monitoring-alerts/incidents - インシデント一覧
   - PATCH /api/monitoring-alerts/incidents/:id/acknowledge - 確認
   - PATCH /api/monitoring-alerts/incidents/:id/resolve - 解決
   - GET /api/monitoring-alerts/escalations - エスカレーション設定
   - POST /api/monitoring-alerts/test - テストアラート送信

3. 監視アラートページ (`apps/web/src/app/monitoring-alerts/page.tsx`)
   - アラート統計ダッシュボード
   - ルール管理（CRUD）
   - インシデント一覧（確認・解決）
   - エスカレーション設定
   - テストアラート

---

### Phase 95-96: eBay出品パフォーマンス分析 & 改善提案エンジン

**背景**: 3者協議（Claude/GPT-5/Gemini）の結果、Beeツールにない差別化機能として実装価値が高いと判断。

**Phase 95: eBay出品パフォーマンス分析**
1. Prismaスキーマ追加
   - ListingPerformance: 出品パフォーマンス（Views・Watch・Impression・CTR）
   - PerformanceSnapshot: パフォーマンススナップショット（日次記録）
   - PerformanceThreshold: パフォーマンス閾値設定（絶対値・相対値）
   - LowPerformanceFlag: 低パフォーマンスフラグ（スコア・理由・推奨アクション）
   - PerformanceScoreType: ABSOLUTE, RELATIVE, COMBINED
   - ThresholdMetric: VIEWS, WATCHERS, IMPRESSIONS, CTR, DAYS_LISTED

2. パフォーマンス分析API (`apps/api/src/routes/listing-performance.ts`)
   - GET /api/listing-performance/stats - パフォーマンス統計
   - GET /api/listing-performance/listings - 出品一覧（スコア付き）
   - GET /api/listing-performance/low-performers - 低パフォーマンス出品
   - POST /api/listing-performance/sync - eBay APIから同期
   - GET /api/listing-performance/thresholds - 閾値設定
   - PUT /api/listing-performance/thresholds - 閾値更新
   - GET /api/listing-performance/trends - トレンド分析
   - GET /api/listing-performance/category-benchmark - カテゴリベンチマーク

3. パフォーマンス分析ページ (`apps/web/src/app/listing-performance/page.tsx`)
   - パフォーマンス統計ダッシュボード
   - 低パフォーマンス出品一覧（スコア・理由表示）
   - 閾値設定（絶対値・相対値カスタマイズ）
   - トレンドグラフ
   - カテゴリ別ベンチマーク比較

**Phase 96: 改善提案エンジン & 半自動アクション**
1. Prismaスキーマ追加
   - ImprovementSuggestion: 改善提案（タイプ・提案内容・信頼度・適用状態）
   - BulkAction: 一括アクション（タイプ・対象出品・実行状態）
   - ActionHistory: アクション履歴（変更前後・効果測定）
   - SuggestionType: TITLE, DESCRIPTION, ITEM_SPECIFICS, PRICE, CATEGORY, PHOTOS
   - BulkActionType: PRICE_ADJUST, DELIST, RELIST, APPLY_SUGGESTION, END_LISTING

2. 改善提案API (`apps/api/src/routes/listing-improvement.ts`)
   - POST /api/listing-improvement/generate - AI改善提案生成（GPT-4o）
   - GET /api/listing-improvement/suggestions - 提案一覧
   - POST /api/listing-improvement/apply/:id - 提案適用（ワンクリック）
   - POST /api/listing-improvement/bulk-action - 一括アクション実行
   - GET /api/listing-improvement/history - アクション履歴
   - GET /api/listing-improvement/effectiveness - 効果測定レポート
   - POST /api/listing-improvement/preview - 変更プレビュー

3. 改善提案ページ (`apps/web/src/app/listing-improvement/page.tsx`)
   - 改善提案一覧（タイトル・説明文・価格等）
   - ワンクリック適用ボタン
   - 一括アクション（価格調整・非公開化・再出品）
   - 変更プレビュー
   - 効果測定ダッシュボード（適用前後比較）

**注意事項**:
- 「自動削除」はPhase 97以降でオプション機能として提供（デフォルトOFF・二重確認必須）
- eBay Trading API / Inventory API / Seller Hub Reports API を使用
- 誤削除防止のため、削除前に必ず確認ダイアログ表示

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express.js (Hono), TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | MinIO/S3 |
| AI | OpenAI GPT-4o |

---

## 実装パターン

### APIルート作成手順
1. `apps/api/src/routes/xxx.ts` でHono APIを実装
2. `apps/api/src/index.ts` にimport・use追加
3. RESTful CRUD + 統計エンドポイント

### フロントエンドページ作成手順
1. `apps/web/src/app/xxx/page.tsx` でページ実装
2. shadcn/ui コンポーネント使用
3. タブ構成（一覧・詳細・設定）
4. ダイアログで作成・編集

### Prismaスキーマ追加手順
1. `packages/database/prisma/schema.prisma` にモデル追加
2. enum定義（必要に応じて）
3. リレーション設定

### ナビゲーション更新
1. `apps/web/src/components/layout/sidebar.tsx` にリンク追加
2. `apps/web/src/components/layout/mobile-nav.tsx` にリンク追加
3. lucide-reactアイコン使用

---

## 完了条件

各Phaseで以下を必ず実施：
1. Prismaスキーマ追加
2. APIルート実装
3. フロントエンドページ実装
4. サイドバー・モバイルナビ更新
5. HANDOVER.md更新
6. Git commit & push
7. Obsidianノート作成（`/Users/naokijodan/開発ログ/rakuda_phaseXX_YYYYMMDD.md`）

---

## 参照ファイル

- `HANDOVER.md` - 引き継ぎ書（最新状態）
- `CLAUDE.md` - プロジェクトルール
- `packages/database/prisma/schema.prisma` - DBスキーマ
- `apps/api/src/index.ts` - APIルート登録
- `apps/web/src/components/layout/sidebar.tsx` - サイドバー

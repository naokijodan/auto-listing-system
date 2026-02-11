# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-11
**Phase**: 43-44完了
**担当**: Claude

## 現在のステータス

### Phase 43-44: ジョブリカバリー & Slackアラート

**ステータス**: 完了 ✅

#### 実装内容

**Phase 43: ジョブリカバリー**
1. Prismaスキーマ追加
   - `FailedJob` モデル - 失敗ジョブの追跡
   - `IdempotencyKey` モデル - 冪等性キー管理
   - `FailedJobStatus` enum - PENDING, RETRIED, ABANDONED

2. ジョブリカバリーサービス (`apps/worker/src/lib/job-recovery.ts`)
   - `generateIdempotencyKey` - 冪等性キー生成
   - `checkIdempotencyKey` - 重複チェック
   - `recordIdempotencyKey` - キー記録
   - `recordFailedJob` - 失敗ジョブ記録
   - `JobRecoveryService` クラス
     - `getRetryableJobs` - リトライ可能ジョブ取得
     - `retryJob` - 個別リトライ
     - `retryBatch` - バッチリトライ
     - `cleanupOldRecords` - 古いレコード削除
     - `getStats` - 統計情報取得

3. APIルート拡張 (`apps/api/src/routes/jobs.ts`)
   - `GET /api/jobs/failed` - 失敗ジョブ一覧
   - `GET /api/jobs/recovery-stats` - リカバリー統計
   - `POST /api/jobs/retry/:id` - 個別リトライ
   - `POST /api/jobs/retry-batch` - バッチリトライ
   - `POST /api/jobs/abandon/:id` - ジョブ諦め
   - `POST /api/jobs/cleanup` - 古いレコード削除

**Phase 44: Slackアラート & バッチダッシュボード**
1. Slackアラートサービス (`apps/worker/src/lib/slack-alert.ts`)
   - `SlackClient` クラス - Webhook送信
   - `AlertManager` クラス
     - `checkRules` - ルールベースアラート
     - `alertJobFailure` - ジョブ失敗通知
     - `alertPublishSuccess` - 出品成功通知
     - `alertBatchComplete` - バッチ完了通知
     - `sendCustomAlert` - カスタムアラート
   - デフォルトルール
     - キュー詰まり検知
     - 連続失敗検知
     - ワーカー停止検知

2. バッチダッシュボードページ (`apps/web/src/app/batch/page.tsx`)
   - キュー統計表示（Enrichment/Joom）
   - リカバリー統計表示
   - 失敗ジョブ一覧
   - リトライ/諦め操作
   - キュー別フィルタリング

3. ワーカー統合
   - `worker-manager.ts` - 失敗時にDB記録 & Slack通知
   - `joom-publish.ts` - 出品成功/バッチ完了時にSlack通知

## ファイル変更一覧

### 新規作成
- `apps/worker/src/lib/job-recovery.ts`
- `apps/worker/src/lib/slack-alert.ts`
- `apps/web/src/app/batch/page.tsx`

### 更新
- `packages/database/prisma/schema.prisma` - FailedJob, IdempotencyKeyモデル追加
- `apps/api/src/routes/jobs.ts` - リカバリーAPIエンドポイント追加
- `apps/worker/src/lib/worker-manager.ts` - 失敗時のDB記録・Slack通知
- `apps/worker/src/processors/joom-publish.ts` - 出品成功/バッチ完了時のSlack通知
- `apps/web/src/components/layout/sidebar.tsx` - バッチ処理リンク追加

## 次のPhaseへの推奨事項

### Phase 45候補

1. **E2Eテスト追加**
   - エンリッチメントワークフローのテスト
   - Joom出品ワークフローのテスト

2. **Joom API完全連携**
   - 実際のJoom APIコール実装
   - レート制限対応

3. **画像処理最適化**
   - Sharp並列処理
   - S3直接アップロード

4. **リアルタイム監視UI**
   - WebSocket/SSEによるライブ更新
   - キュー状態のリアルタイム表示

## 技術的注意事項

1. **Prisma**
   - スキーマ変更後は `npx prisma generate` が必要
   - マイグレーションは `npx prisma migrate dev` で実行

2. **Slackアラート**
   - `SLACK_WEBHOOK_URL` 環境変数が必要
   - 未設定の場合はログ出力のみ

3. **BullMQ**
   - Redis接続が必要
   - `maxRetriesPerRequest: null` 設定必須

## 環境変数

```env
# Phase 43-44で追加
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
```

## 動作確認

```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev

# ワーカー起動（別ターミナル）
npm run dev -w @rakuda/worker
```

## 関連ドキュメント

- `docs/PHASE40_JOOM_WORKFLOW_DESIGN.md`
- `docs/PHASE40_IMPLEMENTATION_GUIDE.md`

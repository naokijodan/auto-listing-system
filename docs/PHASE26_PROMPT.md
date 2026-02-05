# RAKUDA Phase 26 実装指示文

以下の指示に従って、RAKUDAシステムのPhase 26を実装してください。

---

## プロジェクト情報

- **プロジェクト**: RAKUDA（越境EC自動出品システム）
- **パス**: `~/Desktop/rakuda`
- **GitHub**: https://github.com/naokijodan/auto-listing-system
- **技術スタック**: Next.js 14 + Express + Prisma + BullMQ + Redis + PostgreSQL

## 現在の状況

Phase 24-25完了済み:
- Swagger API docs (`/api/docs`)
- CSVバリデーション強化
- ヘルスチェック永続化
- バッチ処理改善

## Phase 26 テーマ

**アクション誘導型アラートシステム（Smart Notification System）**

通知疲れを防ぎつつ、重要イベントへの対応速度を最大化する。

## 実装タスク

### Phase 26A: Notification Service層の構築
1. `packages/config/src/constants.ts` に `NOTIFICATION` キューを追加
2. `packages/database/prisma/schema.prisma` に `AlertRule`, `AlertLog` モデル追加
3. マイグレーション実行
4. `apps/worker/src/lib/alert-manager.ts` 作成
5. `packages/schema/src/alert.ts` に型定義追加

### Phase 26B: 通知プロセッサー実装
1. `apps/worker/src/processors/notification.ts` 作成
2. `apps/worker/src/lib/email-sender.ts` 作成（Nodemailer）
3. `apps/worker/src/lib/slack-sender.ts` 作成（Webhook）
4. `apps/worker/src/index.ts` にワーカー追加

### Phase 26C: 通知テンプレートエンジン
1. `apps/worker/src/lib/notification-templates.ts` 作成
2. 各イベントタイプのテンプレート定義
3. Deep Link生成関数

### Phase 26D: APIエンドポイント
1. `apps/api/src/routes/alerts.ts` 作成
   - GET/POST/PUT/DELETE /api/alerts/rules
   - GET /api/alerts/logs
   - GET /api/alerts/logs/stats
   - POST /api/alerts/send
2. `apps/api/src/index.ts` にルート追加

### Phase 26E: 既存プロセッサー統合
1. `inventory.ts` - 在庫切れ時にアラート発火
2. `publish.ts` - 出品失敗時にアラート発火
3. `scrape.ts` - スクレイプエラー時にアラート発火

## 対象イベント

| イベント | 重要度 | チャネル |
|---------|--------|----------|
| INVENTORY_OUT_OF_STOCK | critical | email, slack |
| PRICE_DROP_DETECTED | warning | slack |
| LISTING_FAILED | critical | email, slack |
| COMPETITOR_PRICE_CHANGE | info | slack |
| ORDER_RECEIVED | info | slack |
| SCRAPE_ERROR | warning | email |

## 詳細設計

設計書を参照: `docs/PHASE26_DESIGN.md`
実装手順を参照: `docs/PHASE26_INSTRUCTIONS.md`

## 実装ルール

1. **設計承認をスキップ** - 計画書があるので即座に実装開始
2. **ノンストップ実行** - 完了まで確認を求めずに進める
3. **各フェーズ完了時にコミット**
4. **全フェーズ完了後にプッシュ**
5. **Obsidianノート作成**: `開発ログ/rakuda_Phase26実装_{日付}.md`

## 開始コマンド

```bash
cd ~/Desktop/rakuda
git pull
```

---

**上記の指示に従って、Phase 26A から順番に実装を開始してください。**

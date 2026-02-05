# RAKUDA Phase 27 実装指示文

以下の指示に従って、RAKUDAシステムのPhase 27を実装してください。

---

## プロジェクト情報

- **プロジェクト**: RAKUDA（越境EC自動出品システム）
- **パス**: `~/Desktop/rakuda`
- **GitHub**: https://github.com/naokijodan/auto-listing-system
- **技術スタック**: Next.js 14 + Express + Prisma + BullMQ + Redis + PostgreSQL

## 現在の状況

Phase 26完了済み:
- アクション誘導型アラートシステム（Email/Slack通知）
- AlertManager（スロットリング、バッチ処理）
- アラートルールAPI

## Phase 27 テーマ

**リアルタイムダッシュボード（Real-time Dashboard）**

運用者がダッシュボードを開いた瞬間に最新状態を確認でき、作業中もリアルタイムで状況変化を把握できるシステム。

## 実装タスク

### Phase 27A: イベントバス基盤構築
1. `packages/schema/src/realtime.ts` に型定義追加
2. `apps/worker/src/lib/event-bus.ts` 作成（Redis Pub/Sub）
3. `packages/config/src/constants.ts` にEVENT_CHANNELS追加

### Phase 27B: SSEエンドポイント実装
1. `apps/api/src/routes/realtime.ts` 作成
   - GET /api/realtime/events（SSEストリーム）
   - GET /api/realtime/status（接続ステータス）
   - GET /api/realtime/stats（配信統計）
2. イベントデバウンス実装
3. `apps/api/src/index.ts` にルート追加

### Phase 27C: Workerイベント発火統合
1. `worker-manager.ts` でEventBus初期化
2. `inventory-checker.ts` - 在庫変動時にイベント発火
3. `webhooks.ts` - 新規注文時にイベント発火
4. `price-sync.ts` - 価格変動時にイベント発火

### Phase 27D: フロントエンド実装
1. `apps/web/src/hooks/useRealtimeEvents.ts` 作成
2. `apps/web/src/providers/RealtimeProvider.tsx` 作成
3. `apps/web/src/components/ConnectionStatus.tsx` 作成
4. `apps/web/src/components/RealtimeToast.tsx` 作成
5. `apps/web/src/app/layout.tsx` 更新

### Phase 27E: 統合テスト・環境変数
1. EventBusテスト作成
2. SSEエンドポイントテスト作成
3. `.env.example` 更新

## 対象イベント

| イベント | チャネル | トリガー |
|---------|----------|----------|
| INVENTORY_CHANGE | inventory | 在庫切れ、価格変動検知 |
| ORDER_RECEIVED | orders | 新規注文受付 |
| PRICE_CHANGE | pricing | 価格更新、競合価格変動 |
| LISTING_UPDATE | listings | 出品状態変更 |

## 詳細設計

設計書を参照: `docs/PHASE27_DESIGN.md`
実装手順を参照: `docs/PHASE27_INSTRUCTIONS.md`

## 実装ルール

1. **設計承認をスキップ** - 計画書があるので即座に実装開始
2. **ノンストップ実行** - 完了まで確認を求めずに進める
3. **各フェーズ完了時にコミット**
4. **全フェーズ完了後にプッシュ**
5. **Obsidianノート作成**: `開発ログ/rakuda_Phase27実装_{日付}.md`

## 開始コマンド

```bash
cd ~/Desktop/rakuda
git pull
```

---

**上記の指示に従って、Phase 27A から順番に実装を開始してください。**

# RAKUDA 引き継ぎ書 - 2026年2月10日（最終更新）

## プロジェクト概要

RAKUDAは日本のECサイト（ヤフオク、メルカリ、Amazon JP）から商品をスクレイピングし、海外マーケットプレイス（Joom、eBay）に自動出品する越境EC自動化システム。

---

## 現在の状態

### 完了済みPhase

| Phase | 内容 | 状態 |
|-------|------|------|
| 40 | Joom出品ワークフロー | ✅ 完了 |
| 41 | 本番基盤構築（Docker、Sentry） | ✅ 完了 |
| 42 | E2Eテスト | ✅ 完了 |
| 43 | カナリアリリース | ✅ Phase 5完了 |
| 44 | 価格制限対応 | ✅ 完了 |
| 45A-B | eBay出品ロジック | ✅ 実装完了（認証未設定） |
| Joom運用 Phase 1 | 防御基盤 | ✅ 完了 |
| Joom運用 Phase 2 | 注文処理半自動化 | ✅ 完了 |
| Phase 3 | 通知基盤 | ✅ 完了 |
| Phase 4 | 商品パイプライン拡張 | ✅ 完了 |
| Phase 5 | ダッシュボード強化 | ✅ 完了 |
| Phase 6 | 在庫同期強化 | ✅ 完了 |
| Phase 7 | 自動価格調整 | ✅ 完了 |
| Phase 8 | レポート生成 | ✅ 完了 |
| Phase 9 | eBay OAuth認証 | ✅ 完了 |
| Phase 10 | 注文自動化 | ✅ 完了 |
| Phase 11 | 一括操作API | ✅ 完了 |
| Phase 12 | 返金自動化 | ✅ 完了 |
| Phase 13 | 配送ラベル生成 | ✅ 完了 |
| Phase 14 | パフォーマンス分析 | ✅ 完了 |
| **Phase 15** | **Webhook受信処理拡張** | ✅ **完了** |
| **Phase 16** | **カスタマーコミュニケーション** | ✅ **完了** |

---

## 本日の実装

### Phase 15: Webhook受信処理の拡張

#### 新規対応イベント
- **eBay**: SHIPMENT_TRACKING_CREATED/UPDATED, MARKETPLACE_REFUND_INITIATED/COMPLETED
- **Joom**: order.shipped, order.tracking_updated, order.refund_initiated, order.refunded

#### WebhookEventモデル拡張
```prisma
model WebhookEvent {
  // 既存フィールド...
  maxRetries       Int      @default(5)
  lastAttemptedAt  DateTime?
  nextRetryAt      DateTime?
  status           WebhookEventStatus // FATAL追加
}
```

#### 状態遷移
- PENDING → PROCESSING → COMPLETED
- FAILED → FATAL（リトライ上限5回）

### Phase 16: カスタマーコミュニケーション

#### MessageTemplateモデル
- トリガーイベント: ORDER_CONFIRMED, SHIPPED, DELIVERED, REFUNDED等
- 多言語対応（language: en, ja）
- プレースホルダー: {{buyer_name}}, {{order_id}}, {{tracking_number}}等

#### CustomerMessageモデル
- 送信状態管理: PENDING → SENDING → SENT/FAILED/FATAL
- リトライロジック（最大3回、指数バックオフ）

#### API エンドポイント
| エンドポイント | 説明 |
|--------------|-----|
| /api/message-templates | テンプレートCRUD |
| /api/message-templates/:id/preview | プレビュー |
| /api/message-templates/seed-defaults | デフォルトテンプレート作成 |
| /api/customer-messages | メッセージ管理 |
| /api/customer-messages/:id/retry | 再送信 |
| /api/customer-messages/stats/summary | 統計 |

---

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| `apps/worker/src/processors/publish.ts` | Joom/eBay出品ロジック |
| `apps/worker/src/processors/order-processor.ts` | 注文処理（半自動化） |
| `apps/worker/src/lib/profit-guard.ts` | 赤字ストッパー |
| `apps/worker/src/lib/scheduler.ts` | スケジューラー |
| `apps/worker/src/lib/notification-service.ts` | 通知サービス |
| `apps/api/src/routes/webhooks.ts` | **Webhook受信処理（Phase 15）** |
| `apps/api/src/routes/message-templates.ts` | **テンプレートAPI（Phase 16）** |
| `apps/api/src/routes/customer-messages.ts` | **メッセージAPI（Phase 16）** |
| `apps/worker/src/lib/webhook-processor.ts` | **Webhookイベント処理（Phase 15）** |
| `apps/worker/src/lib/message-sender.ts` | **メッセージ送信（Phase 16）** |

---

## 環境情報

| 項目 | 値 |
|------|-----|
| Node.js | v22.18.0 |
| Docker | PostgreSQL, Redis, MinIO稼働中 |
| Joom OAuth | 有効（期限: 2026-03-08） |
| eBay OAuth | 未設定（後回し） |

---

## スケジューラー設定

```typescript
// Phase 15-16 追加
messageSending: {
  enabled: true,
  cronExpression: '*/5 * * * *',  // 5分ごとにメッセージ送信
  batchSize: 10,
}
webhookProcessing: {
  enabled: true,
  cronExpression: '* * * * *',    // 毎分Webhookイベント処理
  batchSize: 20,
}
```

---

## コマンド一覧

```bash
# 開発
npm run dev                    # 開発サーバー起動
npm run test:unit              # 単体テスト

# デフォルトテンプレート作成
curl -X POST http://localhost:3000/api/message-templates/seed-defaults

# カナリアリリース
npx tsx scripts/canary-release.ts --status
npx tsx scripts/canary-release.ts --phase=5

# 本番運用
npm run start:prod
npm run worker:prod
```

---

## 次のタスク

### 優先度1: デフォルトテンプレート作成
1. `POST /api/message-templates/seed-defaults` を実行
2. 日本語テンプレートも追加（必要に応じて）

### 優先度2: Webhook設定
1. eBay/Joom管理画面でWebhook URLを登録
2. 署名検証用のシークレットを環境変数に設定

### 優先度3: 通知チャンネル設定
1. Slack/Discord Webhook URL設定
2. テスト通知送信確認

---

## Git履歴（直近）

```
35bbd4f feat: Phase 15-16 Webhook受信処理・カスタマーコミュニケーション
5cf768e docs: 引き継ぎ書更新（Phase 13-14完了）
70c3e3b feat: Phase 13-14 配送ラベル・パフォーマンス分析
588bcdf feat: Phase 11-12 一括操作API・返金自動化
```

---

## 開発ログ（Obsidian）

- `開発ログ/rakuda_phase15-16_webhook_comm_20260210.md` ← **NEW**
- `開発ログ/rakuda_phase5_price_limit_20260210.md`
- `開発ログ/rakuda_phase45_ebay_design_20260210.md`
- `開発ログ/rakuda_profit-guard_20260210.md`

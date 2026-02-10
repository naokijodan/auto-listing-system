# RAKUDA 引き継ぎ書 - 2026年2月10日（更新）

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
| **Joom運用 Phase 1** | **防御基盤** | ✅ **完了** |
| **Joom運用 Phase 2** | **注文処理半自動化** | ✅ **完了** |
| **Phase 3** | **通知基盤** | ✅ **完了** |
| **Phase 4** | **商品パイプライン拡張** | ✅ **完了** |
| **Phase 5** | **ダッシュボード強化** | ✅ **完了** |
| **Phase 6** | **在庫同期強化** | ✅ **完了** |
| **Phase 7** | **自動価格調整** | ✅ **完了** |
| **Phase 8** | **レポート生成** | ✅ **完了** |
| **Phase 9** | **eBay OAuth認証** | ✅ **完了** |
| **Phase 10** | **注文自動化** | ✅ **完了** |

### カナリアリリース状況

| ステータス | 件数 | 説明 |
|-----------|------|------|
| ACTIVE | 28件 | Joom出品成功 |
| PENDING_PUBLISH | 5件 | 新規出品キュー（Phase 4で追加） |
| PAUSED | 14件 | 高価格帯（eBay用に保持） |

### 重要な発見

**Joom価格上限: ¥900,000（≒$6,000）**
- ¥900,000以下: 100%成功
- ¥900,000超: 100%失敗（eBay専用に振り分け）

---

## 本日の実装

### Phase 3: 通知基盤

#### NotificationEventモデル
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  type        String   // ORDER_RECEIVED, PROFIT_ALERT, STOCK_OUT
  channel     String   // SLACK, DISCORD, WEBHOOK
  status      String   // PENDING, SENT, FAILED, ACTION_TAKEN
  payload     Json
  referenceId String?
  ...
}
```

#### 通知サービス
- ファイル: `apps/worker/src/lib/notification-service.ts`
- Slack/Discord Webhook送信
- リトライロジック（最大3回、指数バックオフ）
- 通知テンプレート（注文、在庫切れ、利益アラート）

```bash
# 環境変数
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Phase 4: 商品パイプライン拡張

#### 安全カテゴリ拡張
- カメラ、オーディオ、ゲーム追加
- BRAND_WHITELIST: G-SHOCK、Sony、Nikon、Canon、Nintendo等

#### PAUSED再評価ジョブ
- 毎日3時に自動実行
- 新ルールで安全と判定 → ACTIVEに復帰

#### 結果
- 5件新規出品: Nikon D850、Sony WH-1000XM5、Nintendo Switch、G-SHOCK x2

---

## 実装済み機能

### 1. Circuit Breaker
```typescript
MAX_CONSECUTIVE_ERRORS = 3      // 連続エラー3件で停止
ERROR_RATE_THRESHOLD = 0.05     // エラー率5%で停止
```

### 2. 価格ベースルーティング
```typescript
JOOM_PRICE_LIMIT_JPY = 900000   // Joom出品上限
// ¥900,000超 → eBay専用
// ¥900,000以下 → Joom（+ eBay並行可）
```

### 3. eBay出品ロジック
- `publishToEbay()` 完全実装
- Inventory + Offer API 2段階プロセス
- Item Specifics構造化（Brand, Material, Country）
- リトライロジック（指数バックオフ）

### 4. 本番運用設定
- 自動出品スケジューラー（1時間ごと）
- 出品統計・監視機能
- production用スクリプト

### 5. eBay OAuth認証（Phase 9）
- OAuth2フロー完全実装（auth, callback, refresh, status）
- sandbox/production環境切り替え
- MarketplaceCredentialへのトークン自動保存
- ファイル: `apps/api/src/routes/ebay-auth.ts`

### 6. 注文自動化（Phase 10）
- リスクレベル判定（LOW/MEDIUM/HIGH）
- 自動化レベル（MANUAL/SEMI_AUTO/FULL_AUTO）
- 自動承認閾値:
  - maxAmountUsd: $100
  - minProfitRate: 15%
  - maxItemCount: 3
- ShadowLogへの決定記録
- ファイル: `apps/worker/src/lib/order-automation.ts`

---

## 環境情報

| 項目 | 値 |
|------|-----|
| Node.js | v22.18.0 |
| Docker | PostgreSQL, Redis, MinIO稼働中 |
| Joom OAuth | 有効（期限: 2026-03-08） |
| eBay OAuth | **未設定（後回し）** |

---

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| `apps/worker/src/processors/publish.ts` | Joom/eBay出品ロジック |
| `apps/worker/src/processors/order-processor.ts` | 注文処理（半自動化） |
| `apps/worker/src/lib/profit-guard.ts` | 赤字ストッパー |
| `apps/worker/src/lib/scheduler.ts` | 在庫監視・再評価スケジューラ |
| `apps/worker/src/lib/notification-service.ts` | **通知サービス** |
| `apps/worker/src/lib/ebay-api.ts` | eBay API クライアント |
| `apps/api/src/routes/ebay-auth.ts` | **eBay OAuth認証（Phase 9）** |
| `apps/worker/src/lib/order-automation.ts` | **注文自動化（Phase 10）** |
| `packages/database/prisma/schema.prisma` | DBスキーマ |
| `scripts/canary-release.ts` | カナリアリリース（カテゴリ拡張済み） |

---

## コマンド一覧

```bash
# 開発
npm run dev                    # 開発サーバー起動
npm run test:unit              # 単体テスト

# カナリアリリース
npx tsx scripts/canary-release.ts --status    # ステータス確認
npx tsx scripts/canary-release.ts --phase=5   # 出品実行
npx tsx scripts/canary-release.ts --rollback  # ロールバック

# PAUSED再評価
npx tsx scripts/run-paused-reevaluation.ts

# 本番運用
npm run start:prod             # APIサーバー起動
npm run worker:prod            # ワーカー起動
npm run docker:prod:up         # Docker本番起動
```

---

## 次のタスク

### 優先度1: 通知設定
1. Slack/Discord Webhook URL設定
2. テスト通知送信確認

### 優先度2: 出品完了確認
1. 5件の出品ジョブ完了を監視
2. Joom Merchant Portalで確認

### 優先度3: eBay連携（後回し）
1. eBay Sandboxアカウント作成
2. OAuth認証設定
3. 高価格帯商品（14件）のテスト出品

---

## Git履歴（直近）

```
bd6247e feat: Phase 9-10 eBay認証・注文自動化
11cc5d9 docs: 引き継ぎ書更新（Phase 7-8完了）
a7c1660 feat: Phase 7-8 自動価格調整・レポート生成
898176e feat: Phase 5-6 ダッシュボード・在庫同期強化
```

---

## 開発ログ（Obsidian）

- `開発ログ/rakuda_session_summary_20260210.md`
- `開発ログ/rakuda_phase5_price_limit_20260210.md`
- `開発ログ/rakuda_phase45_ebay_design_20260210.md`
- `開発ログ/rakuda_profit-guard_20260210.md`
- `開発ログ/rakuda_joom_operation_phase1-2_20260210.md`
- `開発ログ/rakuda_phase3-4_notification_category_20260210.md`
- `開発ログ/rakuda_phase5-6_dashboard_inventory_20260210.md`
- `開発ログ/rakuda_phase7-8_price_report_20260210.md`

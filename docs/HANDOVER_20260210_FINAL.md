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

### カナリアリリース状況

| ステータス | 件数 | 説明 |
|-----------|------|------|
| ACTIVE | 28件 | Joom出品成功 |
| PAUSED | 14件 | 高価格帯（eBay用に保持） |

### 重要な発見

**Joom価格上限: ¥900,000（≒$6,000）**
- ¥900,000以下: 100%成功
- ¥900,000超: 100%失敗（eBay専用に振り分け）

---

## 本日の実装（Joom運用基盤 Phase 1-2）

### Phase 1: 防御基盤

#### 新規スキーマ
```prisma
// packages/database/prisma/schema.prisma
model InventoryLog { ... }   // 在庫履歴
model ShadowLog { ... }      // 自動化判定用ログ
model ProfitThreshold { ... } // 利益率閾値設定
```

#### 高頻度在庫監視
- **1時間毎**にActive商品をチェック
- 在庫切れ検知 → 即時PAUSED + アラート通知
- InventoryLogに記録

```bash
# 環境変数
ACTIVE_INVENTORY_MONITOR_ENABLED=true
ACTIVE_INVENTORY_MONITOR_CRON=0 * * * *
```

### Phase 2: 注文処理 半自動化

#### 赤字ストッパー（Profit Guard）
- ファイル: `apps/worker/src/lib/profit-guard.ts`
- 機能: 注文時に利益計算、赤字リスク検知
- モード: isDryRun=true（赤字でも通過、ログ記録）

```typescript
// 利益計算
const result = await checkProfit({
  salePrice: 100,  // USD
  costPrice: 5000, // JPY
  marketplace: 'JOOM',
});
// → profitJpy, profitRate, isDangerous
```

#### 注文通知Bot
- ファイル: `apps/worker/src/processors/order-processor.ts`
- 機能: Webhook受信 → 利益計算 → 発注推奨通知
- **自動購入なし**（Human-in-the-loop）

```
通知内容:
- 注文ID、購入者、合計金額
- 商品リスト（価格、仕入価格、利益、購入リンク）
- 利益サマリー（赤字リスク警告）
```

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
| `apps/worker/src/processors/order-processor.ts` | **注文処理（半自動化）** |
| `apps/worker/src/lib/profit-guard.ts` | **赤字ストッパー** |
| `apps/worker/src/lib/scheduler.ts` | **在庫監視スケジューラ** |
| `apps/worker/src/lib/ebay-api.ts` | eBay API クライアント |
| `packages/database/prisma/schema.prisma` | DBスキーマ |

---

## コマンド一覧

```bash
# 開発
npm run dev                    # 開発サーバー起動
npm run test:unit              # 単体テスト

# カナリアリリース
npm run canary:status          # ステータス確認
npm run canary:rollback        # ロールバック

# 本番運用
npm run start:prod             # APIサーバー起動
npm run worker:prod            # ワーカー起動
npm run docker:prod:up         # Docker本番起動
```

---

## 次のタスク

### 優先度1: Joom運用監視
1. 通知チャンネル設定（Slack/Discord）
2. 実際の注文を待って処理フロー確認
3. ShadowLog分析 → 自動化移行判定

### 優先度2: 追加商品の出品
1. 新規商品スクレイピング
2. カナリアリリース継続（週10-20件ペース）

### 優先度3: eBay連携（後回し）
1. eBay Sandboxアカウント作成
2. OAuth認証設定
3. 高価格帯商品（14件）のテスト出品

---

## Git履歴（直近）

```
c91e941 feat: Phase 1-2 Joom運用基盤 - 在庫監視・注文処理半自動化
6be8e18 feat: 赤字ストッパー（Profit Guard）を実装
bd34cc4 docs: 次セッション用引き継ぎ書・指示文を追加
b335aa4 docs: 引き継ぎ書最終更新
9412888 feat: eBay出品ロジック実装・高価格帯ルーティング
```

---

## 開発ログ（Obsidian）

- `開発ログ/rakuda_session_summary_20260210.md`
- `開発ログ/rakuda_phase5_price_limit_20260210.md`
- `開発ログ/rakuda_phase45_ebay_design_20260210.md`
- `開発ログ/rakuda_profit-guard_20260210.md`
- `開発ログ/rakuda_joom_operation_phase1-2_20260210.md`

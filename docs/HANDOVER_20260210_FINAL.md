# RAKUDA 引き継ぎ書 - 2026年2月10日

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
| 45A-B | eBay出品ロジック | ✅ 実装完了 |

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
| eBay OAuth | **未設定（次のタスク）** |

---

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| `apps/worker/src/processors/publish.ts` | Joom/eBay出品ロジック |
| `apps/worker/src/lib/ebay-api.ts` | eBay API クライアント |
| `scripts/canary-release.ts` | カナリアリリース（Circuit Breaker付き） |
| `packages/config/src/constants.ts` | 価格上限定数 |
| `docs/PHASE45_EBAY_INTEGRATION_DESIGN.md` | eBay連携設計書 |

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

# クリーンアップ
npm run cleanup:high-value-errors  # 高価格帯エラー処理
```

---

## 次のタスク（Phase 45C-D）

### 優先度1: eBay OAuth設定
1. eBay Developer Portal でアプリ作成
2. Production API Keys取得
3. OAuth認証フロー実装
4. `.env` に認証情報設定

### 優先度2: eBay出品テスト
1. 高価格帯商品（14件PAUSED）をeBayに出品
2. 結果確認・エラー対応

### 優先度3: Webhook連携
1. eBay注文通知受信
2. Order同期処理

### 優先度4: UI拡張
1. eBay出品管理画面
2. マーケットプレイス統合ダッシュボード

---

## Git履歴（直近）

```
b335aa4 docs: 引き継ぎ書最終更新
9412888 feat: eBay出品ロジック実装・高価格帯ルーティング
351b9de docs: Phase 45 eBay連携設計書を追加
4cc2ae5 feat: add cleanup script for high-value Joom errors
34847e9 feat: 本番運用設定（スケジューラー、監視、統計）
22baec2 feat: Phase 5実行・価格制限対応
```

---

## 開発ログ（Obsidian）

- `開発ログ/rakuda_session_summary_20260210.md`
- `開発ログ/rakuda_phase5_price_limit_20260210.md`
- `開発ログ/rakuda_phase45_ebay_design_20260210.md`

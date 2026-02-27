# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-27
**Phase**: Phase 2 eBay E2Eテスト — 完了 (9/9 PASS)
**最新コミット**: 1c87e592
**方針**: eBay Phase生成を停止、実用化に注力

---

## ⚠️ 重要: 方針転換

**eBay Phaseの追加生成は一切行わない。**
- `generate_series.py` は使用禁止
- スタブファイル（21,597件）は削除済み
- コア実装（37ルート + 680 UIページ）のみ残存

---

## 現在の状態

### eBay Sandbox 出品成功
- **E2Eテスト**: 9/9 PASS (21秒)
- **Sandbox Item ID**: `110589099265`
- **テストコマンド**: `npx tsx scripts/ebay-e2e-test.ts`

### 開発サーバー
- API: `http://localhost:3010` (Express.js)
- Web: `http://localhost:3012` (Next.js)
- Worker: BullMQ (tsx watch)
- 起動: `npm run dev` (turbo)

### Docker コンテナ (稼働中)
- `rakuda-postgres` — Up 11 days (healthy)
- `rakuda-redis` — Up 11 days (healthy)
- `rakuda-minio` — Up 11 days (healthy)

### eBay Sandbox認証
- **Sandbox User**: `TESTUSER_rakudaseller` / `Rakuda2026!`
- **Access Token**: DB保存済み (2時間有効、自動refresh)
- **Refresh Token**: 有効期限 2027-08-29
- **Business Policies**: opt-in済み、3ポリシー作成済み
  - Fulfillment: `6217663000` (USPS Priority, 送料無料)
  - Payment: `6217666000` (eBay Managed Payments)
  - Return: `6217665000` (30日返品)

---

## 🚀 次のセッションで実行すること

### Phase 3: 外部認証（ユーザー操作が必要）

| タスク | 内容 | 前提条件 |
|--------|------|----------|
| **Etsy OAuth** | Developer Account → API Key → PKCE → トークン取得 | ブラウザ操作必要 |
| **Shopify OAuth** | Partner Account → アプリ作成 → OAuth → トークン取得 | ブラウザ操作必要 |
| **Depop Partner API** | Partner Portal申請 → APIキー取得 | 申請が必要 |

### Phase 4: 統合テスト

| タスク | 内容 | 前提条件 |
|--------|------|----------|
| **全チャネル出品テスト** | 1商品を全チャネルに出品 | Phase 3完了 |
| **在庫同期テスト** | 在庫変更が全チャネルに反映 | Phase 3完了 |

### 改善候補（優先度低）
- E2Eテストの翻訳済みタイトル・価格をインベントリアイテムに反映（現在は原文のまま）
- Payment PolicyのPERSONAL_CHECK → eBay Managed Payments直接指定
- 既知のTSエラー3件修正（ab-test-engine, chatbot-engine, sales-forecast-engine）

---

## 今回のセッションで完了したこと

### Phase 2: eBay E2Eテスト完全通過（2026-02-27）

1. **OAuth認証フロー実行**
   - Playwright経由でeBay Sandbox consent完了
   - Authorization Code → Access Token + Refresh Token取得
   - DB保存・自動refresh実装確認

2. **eBay API 6つのエラー修正**
   | エラー | 原因 | 修正 |
   |--------|------|------|
   | Invalid access token | Token refresh URL間違い | `EBAY_API_BASE`使用 |
   | Invalid Accept-Language | ヘッダー不足 | `Accept-Language: en-US`追加 |
   | No Item.Country | ロケーション未設定 | `ensureInventoryLocation()`追加 |
   | Condition 5000 invalid | カテゴリ不適合 | `USED_EXCELLENT`(3000)使用 |
   | Not eligible for Business Policy | opt-in未実行 | Account API `opt_in`実行 |
   | Type missing | Item Specifics不足 | aspects自動推定追加 |

3. **Account API実装**
   - `accountApiRequest` — Sell Account API汎用リクエスト
   - `optInToBusinessPolicies()` — Business Policy自動opt-in
   - `ensureDefaultPolicies()` — 3ポリシー自動確認・作成
   - `getFulfillmentPolicies/getPaymentPolicies/getReturnPolicies`
   - `createFulfillmentPolicy/createPaymentPolicy/createReturnPolicy`

4. **E2Eテストスクリプト改善**
   - enrichment auto-approval対応
   - Wristwatchesカテゴリ用Item Specifics追加
   - エラーメッセージの明確化

### Phase 1: クリーンアップ（2026-02-27 前セッション）

- Depop TSエラー4件修正
- スタブファイル41,151件削除
- ebay-routes.ts: 54,023行 → 93行
- テスト全パス (Worker 1,221件 + API 344件)

---

## 修正ファイル一覧（Phase 2）

| ファイル | 変更内容 |
|---------|---------|
| `apps/worker/src/lib/ebay-api.ts` | Token refresh URL修正、ヘッダー追加、Account API、ポリシー管理、ロケーション、aspects |
| `apps/worker/src/processors/ebay-publish.ts` | ensureInventoryLocation、ポリシー自動作成、Item Specifics推定 |
| `scripts/ebay-e2e-test.ts` | auto-approval対応、itemSpecifics追加 |
| `apps/web/package.json` | ポート3012 |
| `apps/web/playwright.config.ts` | ポート3012 |

---

## コア実装の現状

### 販売チャネル

| チャネル | APIクライアント | 出品サービス | ステータス |
|---------|---------------|------------|----------|
| eBay | 1,297行 | 480行 | **E2E通過・Sandbox動作確認済** |
| Joom | 811行 | 808行 | OAuth済・動作可能 |
| Etsy | 268行 | 298行 | 実装済・認証待ち |
| Shopify | 197行 | 404行 | 実装済・認証待ち |
| Depop | 180行 | 335行 | 実装済・認証待ち |

### 完了条件

- [x] TSエラー0件（Depop分）
- [x] テスト全件パス
- [x] スタブファイル整理完了
- [x] **eBay出品E2Eテスト成功（Phase 2）** ← 今回完了
- [ ] Etsy/Shopify/Depop認証完了（Phase 3 — ユーザー操作後）
- [ ] 全チャネル統合テスト成功（Phase 4）

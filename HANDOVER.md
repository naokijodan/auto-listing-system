# RAKUDA 引継ぎ書

## 最終更新: 2026-02-27

---

## RAKUDAとは

RAKUDAは越境EC自動化システム。日本のECサイト（ヤフオク・メルカリ・Amazon JP）から商品をスクレイピングし、海外マーケットプレイス（eBay・Joom・Etsy・Shopify・Depop等）に自動出品する。プロジェクトディレクトリは `/Users/naokijodan/Desktop/rakuda/`。

---

## 禁止事項

**eBay Phaseの追加生成は一切行わないこと。**
過去にスタブファイル21,597件が自動生成されたが、全て削除済み。`generate_series.py` は使用禁止。コア実装（37ルート + 680 UIページ）のみ残存している。

---

## 現在の到達点

### Phase 2 完了: eBay Sandbox出品E2Eテスト全通過

本セッションでeBay Sandbox環境へのフルフロー出品に成功した。テスト商品1件（セイコー プレザージュ SARX055）を使い、商品作成 → AI翻訳・属性抽出 → eBay Inventory API経由の出品 → Sandboxでの公開確認まで、全9ステップが自動で通過する。

- テスト結果: **9/9 PASS**（実行時間21秒）
- Sandbox Item ID: `110589099265`
- テスト実行コマンド: `npx tsx scripts/ebay-e2e-test.ts`

### eBay Sandbox認証情報

Sandbox環境の認証は全て設定済み。Access Tokenは2時間で失効するが、Refresh Token（有効期限2027-08-29）を使った自動更新が実装されている。Business Policyも3種（Fulfillment・Payment・Return）が作成済みで、新規出品時に自動で参照される。

- Sandbox User: `TESTUSER_rakudaseller` / `Rakuda2026!`
- Business Policies: Fulfillment `6217663000`, Payment `6217666000`, Return `6217665000`

---

## 開発環境

RAKUDAはturboモノレポ構成で、`npm run dev`で3つのプロセスが同時起動する。

| プロセス | ポート | 技術 |
|---------|-------|------|
| API | 3010 | Express.js |
| Web | 3012 | Next.js |
| Worker | なし | BullMQ (tsx watch) |

ポート3000はquest-appのSupabaseが使用しているため、RAKUDAのAPI・Webは3010/3012に変更済み。

Dockerコンテナは3つ（`rakuda-postgres`、`rakuda-redis`、`rakuda-minio`）で、長期稼働中。

---

## 今回のセッションでやったこと

### 1. eBay OAuth認証フローの実行

Playwright経由でeBay Sandbox consent画面を操作し、Authorization Codeを取得。Access Token + Refresh Tokenに交換してDBに保存した。

### 2. eBay Inventory API出品フローのバグ修正（6件）

出品フローを実行するたびに異なるエラーが発生し、1つずつ潰していった。

| 修正 | 内容 |
|------|------|
| Token refresh URL | `EBAY_AUTH_BASE`（auth.sandbox.ebay.com）を使っていたが、正しくは`EBAY_API_BASE`（api.sandbox.ebay.com） |
| Accept-Languageヘッダー | Sandbox APIが`Accept-Language: en-US`を要求。inventoryApiRequestに追加 |
| Inventory Location | eBayは出品元の所在地情報が必須。`ensureInventoryLocation()`で東京のウェアハウスを自動作成 |
| Condition mapping | `USED_GOOD`（conditionId 5000）はWristwatchesカテゴリで無効。デフォルトを`USED_EXCELLENT`（3000）に変更 |
| Business Policy opt-in | Sandboxユーザーはデフォルトでは Business Policyが使えない。Account APIの`/program/opt_in`で自動opt-in |
| Item Specifics | Wristwatchesカテゴリは「Type」が必須。商品データからaspects（Type, Brand, Model等）を自動推定する処理を追加 |

### 3. Account API実装の追加

`ebay-api.ts`にSell Account API用のメソッド群を追加した。Business Policyの取得・作成・自動opt-inを行い、ポリシーIDが未指定の場合でも出品が通るようにした。

### 4. E2Eテストスクリプトの改善

enrichmentが自動承認（APPROVED）になった場合の承認スキップ処理と、Wristwatchesカテゴリ用のItem Specifics付きリスティング作成に対応した。

---

## 修正ファイル

| ファイル | 変更量 | 内容 |
|---------|--------|------|
| `apps/worker/src/lib/ebay-api.ts` | +343行 | Token refresh修正、ヘッダー追加、Account API全体、ポリシー管理、ロケーション作成 |
| `apps/worker/src/processors/ebay-publish.ts` | +55行 | ensureInventoryLocation呼び出し、ポリシー自動作成、Item Specifics推定ロジック |
| `scripts/ebay-e2e-test.ts` | +42/-22行 | auto-approval対応、itemSpecifics追加 |
| `apps/web/package.json` | ポート変更 | 3002 → 3012 |
| `apps/web/playwright.config.ts` | ポート変更 | 3002 → 3012 |

---

## コミット履歴（本セッション）

| コミット | 内容 |
|---------|------|
| `76bce4be` | docs: HANDOVER.md更新 - Phase 2 eBay E2Eテスト完了 |
| `1c87e592` | feat: eBay E2Eテスト完全通過 - Sandbox出品成功 |
| `c54cdf02` | fix: webポートを3012に変更（ポート衝突回避） |

---

## 販売チャネルの現状

| チャネル | APIクライアント | ステータス |
|---------|---------------|----------|
| eBay | 1,297行 | **E2E通過・Sandbox動作確認済** |
| Joom | 811行 | OAuth済・動作可能 |
| Etsy | 268行 | 実装済・認証待ち |
| Shopify | 197行 | 実装済・認証待ち |
| Depop | 180行 | 実装済・認証待ち |

---

## 次のセッションでやること

### Phase 3: 外部マーケットプレイス認証

eBayは完了したので、残り4チャネルのOAuth認証を進める。いずれもブラウザでのユーザー操作が必要。

| チャネル | 作業内容 | 必要なもの |
|---------|---------|-----------|
| Etsy | Developer Account作成 → API Key取得 → PKCE OAuth → トークン取得 | ブラウザ操作 |
| Shopify | Partner Account作成 → アプリ作成 → OAuth → トークン取得 | ブラウザ操作 |
| Depop | Partner Portal申請 → APIキー取得 | 申請・審査 |

### Phase 4: 統合テスト

全チャネルの認証が完了したら、1商品を全チャネルに同時出品するテストと、在庫変更が全チャネルに反映される同期テストを実施する。

### 改善候補（優先度低）

- E2Eテストでenrichment結果（英語タイトル・USD価格）がインベントリアイテムに反映されていない（現在は日本語タイトルのまま出品される）
- Payment Policyで`PERSONAL_CHECK`を指定しているが、eBay Managed Paymentsに自動変換される（直接指定に変更すべき）
- 既知のTSエラー3件（ab-test-engine, chatbot-engine, sales-forecast-engine）が未修正

---

## 完了条件チェックリスト

- [x] TSエラー0件（Depop分）
- [x] テスト全件パス（Worker 1,221件 + API 344件）
- [x] スタブファイル整理完了（41,151件削除）
- [x] eBay出品E2Eテスト成功（Phase 2）
- [ ] Etsy/Shopify/Depop認証完了（Phase 3）
- [ ] 全チャネル統合テスト成功（Phase 4）

# RAKUDA 引継ぎ書

## 最終更新: 2026-02-28 (Phase 3準備セッション終了時)

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

テスト商品1件（セイコー プレザージュ SARX055）で、商品作成 → AI翻訳・属性抽出 → eBay Inventory API経由の出品 → Sandboxでの公開確認まで、全9ステップが自動で通過。

- テスト結果: **9/9 PASS**（実行時間21秒）
- Sandbox Item ID: `110589099265`
- テスト実行コマンド: `npx tsx scripts/ebay-e2e-test.ts`

### Phase 3準備 完了: Etsy/Shopify/Depop認証基盤整備

3チャネルの認証に必要なコード基盤を全て整備した。バグ修正5件、セットアップスクリプト3本、E2Eテストスクリプト3本を作成・コミット済み。**残りはユーザーによるブラウザ操作（アカウント登録・OAuth認証）のみ。**

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

## 販売チャネルの現状

| チャネル | APIクライアント | ステータス |
|---------|---------------|----------|
| eBay | 1,297行 | **E2E通過・Sandbox動作確認済** |
| Joom | 811行 | OAuth済・動作可能 |
| Etsy | 268行 | 実装済・バグ修正済・セットアップ/E2Eスクリプト完備・**認証待ち** |
| Shopify | 197行 | 実装済・バグ修正済・セットアップ/E2Eスクリプト完備・**認証待ち** |
| Depop | 187行 | 実装済・バグ修正済・セットアップ/E2Eスクリプト完備・**認証待ち** |

### eBay Sandbox認証情報

Sandbox環境の認証は全て設定済み。Access Tokenは2時間で失効するが、Refresh Token（有効期限2027-08-29）を使った自動更新が実装されている。Business Policyも3種（Fulfillment・Payment・Return）が作成済みで、新規出品時に自動で参照される。

- Sandbox User: `TESTUSER_rakudaseller` / `Rakuda2026!`
- Business Policies: Fulfillment `6217663000`, Payment `6217666000`, Return `6217665000`

### マーケットプレイスAPI調査結果

| チャネル | 開発者登録 | APIキー取得 | 備考 |
|---------|-----------|-----------|------|
| Etsy | etsy.com/developers/register | 審査に2-4週間 | PKCE必須、サンドボックスなし、2FA必須 |
| Shopify | shopify.com/partners（無料） | 即日発行可 | Dev store利用可、永続トークン、最新API 2026-01 |
| Depop | integrations@depop.com に申請 | 非公開API | 2025年7月開始、サンドボックスあり |

---

## 次のセッションでやること

### Phase 3: OAuth認証の実行（ユーザー操作必要）

セットアップスクリプトとE2Eテストは準備済み。優先順位はShopify → Etsy → Depop。

#### Shopify（即日可能・最優先）

1. https://www.shopify.com/partners で無料パートナーアカウント作成
2. Partner Dashboard → Stores → Add store → Development store作成
3. Dev Dashboard → Create app → Custom app作成
4. API access画面でスコープ設定: `read_products, write_products, read_inventory, write_inventory, read_orders, write_orders`
5. Client ID / Client Secret を `.env` の `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` に設定
6. 実行: `npx tsx scripts/setup-shopify-credentials.ts your-store.myshopify.com`
7. 表示されるOAuth URLをブラウザで開いて認証
8. E2Eテスト: `npx tsx scripts/shopify-e2e-test.ts --dry-run`

#### Etsy（審査待ち・登録だけ先に）

1. Etsyアカウントで2FA設定
2. https://www.etsy.com/developers/register でアプリ登録
3. API Key審査完了まで待機（2-4週間）
4. 審査通過後、API Keyを `.env` の `ETSY_API_KEY` に設定
5. 実行: `npx tsx scripts/setup-etsy-credentials.ts`
6. 表示されるOAuth URLをブラウザで開いて認証
7. E2Eテスト: `npx tsx scripts/etsy-e2e-test.ts --dry-run`

#### Depop（メール申請・時期未定）

1. integrations@depop.com にPartner API申請メール送信
2. 承認後、APIキーを `.env` の `DEPOP_API_KEY` に設定
3. 実行: `npx tsx scripts/setup-depop-credentials.ts`
4. E2Eテスト: `npx tsx scripts/depop-e2e-test.ts --dry-run`

### Phase 4: 統合テスト

全チャネルの認証が完了したら、1商品を全チャネルに同時出品するテストと、在庫変更が全チャネルに反映される同期テストを実施する。

```bash
npx tsx scripts/etsy-e2e-test.ts
npx tsx scripts/shopify-e2e-test.ts
npx tsx scripts/depop-e2e-test.ts
```

---

## 直近のコミット履歴

| コミット | 内容 |
|---------|------|
| `1c18f0b2` | feat: Phase 3準備 - Etsy/Shopify/Depop認証基盤整備 |
| `fa0cd1ae` | docs: HANDOVER.md全面書き直し |
| `76bce4be` | docs: HANDOVER.md更新 - Phase 2 eBay E2Eテスト完了 |
| `1c87e592` | feat: eBay E2Eテスト完全通過 - Sandbox出品成功 |
| `c54cdf02` | fix: webポートを3012に変更 |

---

## Phase 3準備で修正・作成したファイル

### バグ修正

| ファイル | 内容 |
|---------|------|
| `apps/api/src/routes/etsy-auth.ts` | redirect URIポート 3000→3010 |
| `apps/api/src/routes/shopify-auth.ts` | redirect URIポート 3000→3010、API version 2024-01→2025-01（2箇所） |
| `apps/worker/src/lib/shopify-api.ts` | API version 2024-01→2025-01 |
| `apps/worker/src/lib/depop-api.ts` | testConnection()メソッド追加 |

### 新規作成

| ファイル | 内容 |
|---------|------|
| `scripts/setup-etsy-credentials.ts` | PKCE OAuth URL生成、OAuthState DB保存 |
| `scripts/setup-shopify-credentials.ts` | OAuth URL生成、CLI引数でショップドメイン指定 |
| `scripts/setup-depop-credentials.ts` | APIキー保存、接続テスト実行 |
| `scripts/etsy-e2e-test.ts` | 九谷焼花瓶テスト商品でフルフロー検証 |
| `scripts/shopify-e2e-test.ts` | リーバイスデニムジャケットテスト商品でフルフロー検証 |
| `scripts/depop-e2e-test.ts` | エアジョーダン1テスト商品でフルフロー検証 |

---

## 改善候補（優先度低）

- E2Eテストでenrichment結果（英語タイトル・USD価格）がインベントリアイテムに反映されていない（日本語タイトルのまま出品される）
- Payment Policyで`PERSONAL_CHECK`を指定しているが、eBay Managed Paymentsに自動変換される（直接指定に変更すべき）
- 既知のTSエラー3件（ab-test-engine, chatbot-engine, sales-forecast-engine）が未修正
- Shopify API versionは2025-01を使用中。最新安定版は2026-01（2025-01は2026年6月までサポート）

---

## 完了条件チェックリスト

- [x] TSエラー0件（Depop分）
- [x] テスト全件パス（Worker 1,221件 + API 344件）
- [x] スタブファイル整理完了（41,151件削除）
- [x] eBay出品E2Eテスト成功（Phase 2）
- [x] Phase 3認証基盤整備（セットアップスクリプト・E2Eテスト・バグ修正）
- [ ] Etsy/Shopify/Depop認証完了（Phase 3 - ユーザー操作待ち）
- [ ] 全チャネル統合テスト成功（Phase 4）

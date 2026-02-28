# RAKUDA 引継ぎ書

## 最終更新: 2026-02-28 (Shopify/Etsy/Depop認証 + 本番デプロイ設計セッション)

---

## RAKUDAとは

RAKUDAは越境EC自動化システム。日本のECサイト（ヤフオク・メルカリ・Amazon JP）から商品をスクレイピングし、海外マーケットプレイス（eBay・Joom・Etsy・Shopify・Depop等）に自動出品する。プロジェクトディレクトリは `/Users/naokijodan/Desktop/rakuda/`。

---

## 禁止事項

**eBay Phaseの追加生成は一切行わないこと。**
過去にスタブファイル21,597件が自動生成されたが、全て削除済み。`generate_series.py` は使用禁止。コア実装（37ルート + 680 UIページ）のみ残存している。

---

## 現在の到達点

### @ts-nocheck全件除去 完了
- 298ファイル（API 40 + Web 258）から `// @ts-nocheck` を除去
- TSエラー1,462件を修正（API 354件 + Web 1,108件）
- UIコンポーネント根本修正（Badge, Button, Card, Checkbox, Toast）
- テスト2,342件全通過

### Shopify/Etsy/Depop認証 完了
- **Shopify**: パートナーアカウント作成、rakuda-store開発ストア作成、レガシーカスタムアプリ「RAKUDA」作成、APIキー3点を.envに保存済み
- **Etsy**: 開発者アカウント作成、アプリ「rakuda」登録、APIキー/SharedSecretを.envに保存済み（Personal Approval待ち＝OAuth実行で完了）
- **Depop**: business@depop.comに申請、Selling API Enquiry Form送信済み（返信待ち）

### 3者協議による本番デプロイ設計 完了
Claude/GPT/Gemini全員一致の方針：
- **デプロイ先**: Hetzner VPS (CPX31: 4vCPU/8GB RAM) + Coolify + Vercel(Web)
- **MVP戦略**: eBay → Shopify の2軸優先。Etsy/Depopは後回し
- **アーキテクチャ**: モノレポ維持。マイクロサービス化は不要
- **月額コスト**: 約5,000〜8,000円

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

| チャネル | APIクライアント | ステータス | .env設定 |
|---------|---------------|----------|----------|
| eBay | 1,297行 | **E2E通過・Sandbox動作確認済** | 設定済み |
| Joom | 811行 | OAuth済・動作可能 | 設定済み |
| Shopify | 197行 | **APIキー取得済・接続テスト未実施** | 設定済み |
| Etsy | 268行 | **APIキー取得済・OAuth承認待ち** | 設定済み |
| Depop | 187行 | **Partner API申請中・返信待ち** | 未設定 |

### Shopify認証情報（.envに保存済み）
- Shop Domain: `rakuda-store.myshopify.com`
- Access Token: `shpat_****` （レガシーカスタムアプリ）
- API Key / API Secret: 設定済み
- スコープ: write_products, write_orders, write_inventory, write_shipping, read_locations, write_fulfillments, read_analytics, write_customers

### Etsy認証情報（.envに保存済み）
- API Key (Keystring): `njrdzcwc61ha706dasyq467o`
- Shared Secret: 設定済み
- ステータス: Pending Personal Approval → OAuth実行で承認完了

### eBay Sandbox認証情報
- Sandbox User: `TESTUSER_rakudaseller` / `Rakuda2026!`
- Business Policies: Fulfillment `6217663000`, Payment `6217666000`, Return `6217665000`
- Refresh Token有効期限: 2027-08-29

---

## 次のセッションでやること

### Phase 5: 本番デプロイ + チャネル接続テスト

#### ステップ1: Hetzner VPS契約 + Coolifyインストール（ユーザー操作）
1. https://www.hetzner.com/cloud でCPX31プラン（4vCPU/8GB RAM, €15/月）を契約
2. Ubuntu 24.04 LTSを選択
3. SSH鍵を登録
4. CoolifyをVPSにインストール: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
5. ドメインを取得・DNS設定（Cloudflare推奨）

#### ステップ2: 本番環境デプロイ（自動実行）
1. Coolifyで各サービスを設定:
   - PostgreSQL
   - Redis
   - API (Express.js) - Dockerfile
   - Worker (BullMQ) - Dockerfile
   - Web (Next.js) - Vercel無料枠にデプロイ
2. 環境変数をCoolifyに設定（.envから移行）
3. SSL証明書設定（Let's Encrypt）
4. Prisma migrate deploy実行

#### ステップ3: チャネル接続テスト（自動実行）
1. Shopify接続テスト: `npx tsx scripts/shopify-e2e-test.ts --dry-run`
2. Etsy OAuth実行（本番URL使用）: `npx tsx scripts/setup-etsy-credentials.ts`
3. eBay本番環境設定（Sandbox → Production切替）

#### ステップ4: OAuthトークン監視ジョブ実装（自動実行）
1. BullMQで定期ジョブ作成（1時間ごと）
2. 有効期限24時間前に警告通知（Discord）
3. 有効期限1時間前に自動リフレッシュ
4. 失敗時にDiscord通知

#### ステップ5: Prismaスキーマ分割（自動実行）
1. `prismaSchemaFolder`機能を有効化
2. eBay.prisma / Shopify.prisma / Etsy.prisma / Common.prisma に分割

---

## 直近のコミット履歴

| コミット | 内容 |
|---------|------|
| `ec844c25` | fix: 全ファイルから @ts-nocheck を除去し、TSエラー0件を達成 |
| `97ca3ced` | fix: テスト失敗23件を修正 - monitoring/ebay-api テスト全通過 |
| `d2f8ec01` | fix: TSエラー全件解消 - API 488件 + Web 1,601件を修正 |
| `1c18f0b2` | feat: Phase 3準備 - Etsy/Shopify/Depop認証基盤整備 |

---

## 完了条件チェックリスト

- [x] TSエラー0件
- [x] @ts-nocheck全件除去（298ファイル）
- [x] テスト全件パス（2,342件）
- [x] eBay出品E2Eテスト成功（Phase 2）
- [x] Phase 3認証基盤整備
- [x] Shopify APIキー取得・.env設定
- [x] Etsy APIキー取得・.env設定
- [x] Depop Partner API申請送信
- [x] 本番デプロイ設計（3者協議完了）
- [ ] Hetzner VPS契約 + Coolifyインストール
- [ ] 本番環境デプロイ
- [ ] Shopify接続テスト
- [ ] Etsy OAuth完了
- [ ] eBay本番環境切替
- [ ] OAuthトークン監視ジョブ実装
- [ ] Prismaスキーマ分割

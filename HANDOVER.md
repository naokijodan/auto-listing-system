# RAKUDA 引継ぎ書

## 最終更新: 2026-03-01 (eBay本番テスト出品成功 + OAuthコールバック修正 + Joom本番設定セッション)

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

### Shopify接続テスト 完了（本セッション）
- レガシーカスタムアプリのアクセストークンをDBに直接保存
- Shopify Admin API 全8テスト通過: DB接続/認証情報保存/Shop情報取得/商品一覧/ロケーション/テスト商品作成・削除/スコープ確認
- Shop: rakuda-store（Development plan, JPY, Japan）
- ロケーション: Shop location (ID: 89391366360)

### OAuthトークン監視ジョブ Etsy対応 完了（本セッション）
- `refreshEtsyToken()` 関数をetsy-api.tsに追加
- scheduler.tsの`checkTokenExpiry`にEtsy自動リフレッシュ追加
- テスト10件全通過（Etsy token refresh 2件追加）

### Prismaスキーマ分割 完了（本セッション）
- `prismaSchemaFolder` 機能を有効化
- 10,814行の単一ファイルを13ファイルに分割:
  - base.prisma（generator/datasource）
  - common.prisma（コアモデル: 6,486行）
  - ebay.prisma / shopify.prisma / etsy.prisma / joom.prisma / depop.prisma
  - marketplace.prisma / enrichment.prisma / notifications.prisma
  - auth.prisma / monitoring.prisma / operations.prisma
- CI/CD・Docker設定のスキーマパス更新済み
- `prisma generate` 正常動作確認、DB差分なし

### 本番デプロイ 完了
- **VPS**: Vultr Tokyo (vhf-3c-8gb: 3vCPU/8GB RAM/256GB NVMe, $48/mo)
  - IP: 45.32.28.61, Ubuntu 24.04 LTS
- **Coolify**: v4.0.0-beta.463 (http://45.32.28.61:8000 / https://coolify.rakuda.dev)
- **PostgreSQL 16**: Coolify管理、coolifyネットワーク上
- **Redis 7.2**: Coolify管理、coolifyネットワーク上
- **rakuda-api**: Coolify管理でデプロイ成功、Traefik経由 + Let's Encrypt SSL
  - URL: https://api.rakuda.dev (Coolify UUID: acg8g884ck4woc480cgcg8kk)
  - ヘルスチェック: /api/health → {"status":"ok","services":{"database":"ok","redis":"ok"}}
- **rakuda-web**: Coolify管理でデプロイ成功（Next.js standalone）
  - URL: https://rakuda.dev (Coolify UUID: zoo8cgswg4ssc84kgcog8cg0)
  - Dockerfile Stage 4 (web target) でビルド
- **rakuda-worker**: systemdサービスとして管理
  - `/etc/systemd/system/rakuda-worker.service`
  - Docker containerを制御、全スケジューラー正常初期化
- **Prismaマイグレーション**: 2件適用済み（init + add_oauth_state）

### ドメイン・DNS・SSL 完了（2026-03-01セッション）
- **ドメイン**: rakuda.dev（Cloudflare Registrar、$12.20/年）
- **Cloudflare Zone ID**: 77ead71df34c621aa86d7e70c1b0882e
- **DNSレコード**:
  - `api.rakuda.dev` → 45.32.28.61（DNS-only、Let's Encrypt用）
  - `rakuda.dev` → 45.32.28.61（DNS-only）
  - `coolify.rakuda.dev` → 45.32.28.61
- **SSL**: Traefik + Let's Encrypt で自動取得・更新

### eBay本番環境切替 完了（2026-03-01セッション）
- Production Client ID: `NaokiKab-Createak-PRD-a265b3311-5f1d9341`
- Production Client Secret: 設定済み（Coolify env + Worker systemd）
- Auth'n'Auth Token: 取得済み
- OAuth Refresh Token: 取得済み（Coolify EBAY_REFRESH_TOKEN）
- Callback URL: `https://api.rakuda.dev/api/ebay/callback`
- EBAY_SANDBOX=false, EBAY_ENV=production

### Discord Webhook 完了（2026-03-01セッション）
- API（Coolify env）とWorker（systemd env）に設定済み
- テスト送信成功（HTTP 204）

### Shopify本番環境接続 完了（2026-03-01セッション②）
- Prismaマイグレーション適用（Marketplace enum拡張 + 全チャネルテーブル追加）
- marketplaceCredentialテーブルにShopify認証情報登録（レガシーカスタムアプリトークン）
- Coolify env + Worker systemdにShopify環境変数追加
- shopify.ts の認証チェック修正（integrationCredential → marketplaceCredential）
- API再デプロイ（コミット33fd0828）
- /api/shopify/status: connected=true ✅
- /api/shopify-products/status: isAuthenticated=true, Online Store=CONNECTED ✅
- テスト商品作成・削除成功（Shopify Admin API直接）

### eBay Production OAuth 完了 + テスト出品成功（2026-03-01セッション③）
- Production OAuth完了: Refresh Token有効（期限: 2027-08-30）
- **テスト出品成功**: eBay Listing ID `137081160735`（ACTIVE）
  - URL: https://www.ebay.com/itm/137081160735
  - 商品: Seiko Presage SARX035, $399.99
  - SKU: RAKUDA-EBAY-cmm6kzo2x0004111xokg9ks5o
- Business Policy設定済み:
  - Fulfillment: 308477371011 (xp_new_free - 無料送料)
  - Payment: 288537326011 (eBay Managed Payments)
  - Return: 288537325011 (No Return Accepted)
- 全312個のFulfillmentポリシー確認済み（free系: xp_new_free, eco_new_free等）

### eBay OAuthコールバック修正（2026-03-01セッション③）
- `ebay-auth.ts`: 相対リダイレクト → FRONTEND_URL使用に変更
- 成功時: `${FRONTEND_URL}/settings?ebay=connected`
- エラー時: `${FRONTEND_URL}/settings?ebay=error&message=...`
- Coolify env: FRONTEND_URL=https://rakuda.dev 設定済み
- コミット: 05b58053

### Joom本番環境設定（2026-03-01セッション③）
- MarketplaceCredential: clientId/clientSecret設定済み（DB直接INSERT）
- Coolify env: JOOM_CLIENT_ID, JOOM_CLIENT_SECRET, JOOM_REDIRECT_URI 設定済み
- Worker systemd: JOOM関連環境変数追加、再起動済み
- **ブロッカー**: Joom OAuth appのredirect URIがlocalhost:3000のまま
  - 変更先: https://api.rakuda.dev/api/auth/joom/callback
  - Joom developer portalで変更が必要
  - 変更後: https://api.rakuda.dev/api/auth/joom/authorize にアクセスしてOAuth実行

### 運用整備 完了（2026-03-01セッション②）
- PostgreSQLバックアップ: `/opt/rakuda-backup.sh` (毎日3:00 UTC, 7日保持)
  - 初回バックアップ成功: 76KB
  - 失敗時Discord通知
- ヘルスチェックモニタリング: `/opt/rakuda-healthcheck.sh` (5分毎)
  - API, Web, Worker, DB, Redis, ディスク容量を監視
  - 異常時Discord通知
- Dockerイメージクリーンアップ実施（旧イメージ11個削除、ディスク100GB空き）
- Worker最新イメージ(33fd0828)で再起動完了

### Etsy OAuth ブロック中（2026-03-01セッション）
- アプリが「Pending Personal Approval」ステータス
- コールバックURLがlocalhost:3010で登録されており変更不可
- 新規アプリ作成も不可（既存Pending中）
- **3者協議の結論**: Etsyは後回し、Shopifyを最優先で進める

### デプロイ時に修正した問題
1. Prismaスキーマパス（単一ファイル→フォルダ）
2. Alpine Linux OpenSSL 3.x互換性（binaryTargets追加）
3. Dockerネットワーク分離（coolifyネットワーク統一）
4. エントリポイントのsedパース問題（簡略化で解決）
5. パッケージmainフィールド（./src/index.ts → ./dist/index.js）
6. BullMQ Redis接続（ioredisインスタンス→URL直接指定）

### 3者協議による本番デプロイ設計 完了
Claude/GPT/Gemini全員一致の方針：
- **デプロイ先**: Vultr VPS (Tokyo) + Coolify（API/Web/Worker全てCoolify管理）
- **MVP戦略**: eBay → Shopify の2軸優先。Etsy/Depopは後回し
- **アーキテクチャ**: モノレポ維持。マイクロサービス化は不要

### 3者協議によるEtsy方針 完了（2026-03-01セッション）
Claude/GPT/Gemini全員一致の方針：
- **Etsy後回し**: Pending Personal Approvalは外部依存、コントロール不可
- **Shopify最優先**: Social Commerce Hubとして1認証で3-4チャネル分の効果
- **優先順位**: Shopify OAuth → 共通商品スキーマ設計 → Instagram/TikTok疎通 → Etsy（承認後）

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
| Shopify | 197行 | **接続テスト全通過・出品準備完了** | 設定済み |
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

### eBay本番認証情報（2026-03-01設定）
- Production Client ID: `NaokiKab-Createak-PRD-a265b3311-5f1d9341`
- Production Client Secret: Coolify env + Worker systemdに設定済み
- OAuth Refresh Token: 有効（期限: 2027-08-30、DB MarketplaceCredentialに保存済み）
- Callback URL: `https://api.rakuda.dev/api/ebay/callback`
- EBAY_SANDBOX=false, EBAY_ENV=production

### eBay Sandbox認証情報（旧・参考）
- Sandbox User: `TESTUSER_rakudaseller` / `Rakuda2026!`
- Business Policies: Fulfillment `6217663000`, Payment `6217666000`, Return `6217665000`
- Refresh Token有効期限: 2027-08-29

---

## 次のセッションでやること

### Phase 6: チャネル拡大（続き）

#### 1. ~~eBay Production再認証~~ ✅ 完了
- eBay本番テスト出品成功（Listing ID: 137081160735, $399.99）

#### 2. Joom本番OAuth実行（ユーザー操作必要）
- **前提**: Joom developer portalでredirect URIを変更
  - 現在: `http://localhost:3000/api/auth/joom/callback`
  - 変更先: `https://api.rakuda.dev/api/auth/joom/callback`
- 変更後: ブラウザで `https://api.rakuda.dev/api/auth/joom/authorize` にアクセス
- OAuth完了後: Joomテスト出品を実行

#### 3. Shopify Social Commerce Hub拡張
- Instagram Shop連携（Shopify管理画面→「Facebook & Instagram」チャネル追加）
- TikTok Shop連携（Shopify管理画面→「TikTok」チャネル追加）
- Webhook基盤構築（注文通知等）

#### 4. Shopify本番出品テスト
- RAKUDA UIからShopify出品テスト

#### 5. Etsy OAuth（承認後）
- Pending Personal Approval が下りたらコールバックURLを変更
- https://api.rakuda.dev/api/etsy/callback でOAuth実行
- 環境変数は既に設定済み

---

## 直近のコミット履歴

| コミット | 内容 |
|---------|------|
| `05b58053` | fix: eBay OAuthコールバックをフロントエンドURLにリダイレクト |
| `fad63abe` | docs: HANDOVER.md更新 - Shopify本番接続完了 + 運用整備完了 |
| `33fd0828` | feat: Shopify本番環境対応 - DB認証チェック修正 + 全チャネルマイグレーション |
| `801370ba` | feat: Dockerfile に Web (Next.js) ステージ追加 + standalone モード有効化 |
| `e64466f7` | docs: HANDOVER.md更新 - 本番デプロイ完了 |
| `4fcb7af4` | fix: BullMQ Redis接続をURL直接指定に変更 |
| `9353dc00` | fix: パッケージmainフィールドをdist/に変更 + Dockerfileヘルスチェック削除 |
| `4b344bde` | feat: Shopify接続テスト + OAuthトークン監視Etsy対応 + Prismaスキーマ分割 |

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
- [x] Shopify接続テスト（全8ステップ通過）
- [x] OAuthトークン監視ジョブ実装（eBay/Joom/Etsy対応）
- [x] Prismaスキーマ分割（13ファイル）
- [x] Vultr VPS契約 + Coolifyインストール
- [x] 本番環境デプロイ（API + Web + Worker）
- [x] ドメイン取得（rakuda.dev）+ Cloudflare DNS + SSL
- [x] eBay本番環境切替（Production OAuth完了）
- [x] Discord Webhook設定（API + Worker）
- [x] Worker systemdサービス化
- [x] Shopify本番環境接続（認証情報登録・API動作確認・テスト出品成功）
- [x] Prismaマイグレーション本番適用（全チャネルテーブル追加）
- [x] 運用整備（PostgreSQLバックアップ毎日3:00・ヘルスチェック5分毎・Discord通知）
- [x] eBay Production OAuth完了（Refresh Token有効、2027-08-30まで）
- [x] eBay本番テスト出品成功（Listing ID: 137081160735, ACTIVE）
- [x] eBay OAuthコールバックリダイレクト修正（FRONTEND_URL対応）
- [x] Joom本番環境設定（DB + Coolify + Worker環境変数）
- [ ] Joom本番OAuth実行（redirect URI変更→OAuth→テスト出品）
- [ ] Etsy OAuth完了（承認待ち→後回し）
- [ ] Shopify Social Commerce Hub拡張（Instagram/TikTok連携）

# Shopify Social Commerce Hub セットアップガイド

## 概要

RAKUDAはShopifyを「Social Commerce Hub」として利用し、1つのShopify連携で複数の販売チャネル（Instagram Shop, TikTok Shop, Facebook Shop, Pinterest等）に商品を自動配信する。

**前提条件:**
- Shopify本番接続済み（rakuda-store.myshopify.com）
- Shopify Admin APIアクセストークン設定済み
- 商品出品フロー動作確認済み

---

## M-7: Instagram Shop連携

### 手順1: Facebook Business Manager設定

1. [Facebook Business Suite](https://business.facebook.com/) にログイン
2. 「設定」→「ビジネス設定」→「コマースマネージャー」を開く
3. Instagramビジネスアカウントが接続されていることを確認

### 手順2: Shopify管理画面でチャネル追加

1. Shopify管理画面 (`https://rakuda-store.myshopify.com/admin`) にログイン
2. 左メニュー「設定」→「アプリと販売チャネル」
3. 「Shopify App Store」をクリック
4. **「Facebook & Instagram」** を検索してインストール
5. アプリ設定画面で:
   - Facebookアカウントと連携
   - Instagramビジネスアカウントを選択
   - カタログ同期を有効化
   - チェックアウト方法: 「Shopifyでチェックアウト」を推奨

### 手順3: 商品同期設定

1. 「Facebook & Instagram」チャネル設定 → 「商品」タブ
2. 同期する商品コレクションを選択（またはすべて）
3. 同期が完了するまで待機（通常15-30分）
4. Instagram Appで「ショップ」タブに商品が表示されることを確認

### 手順4: 動作確認

- [ ] Instagram Appで商品がショップに表示される
- [ ] 商品タップ→Shopifyチェックアウトに遷移する
- [ ] テスト注文→RAKUDAのWebhookで受信される（app_id: 2329312）
- [ ] Order.sourceChannel = 'INSTAGRAM' で記録される

### 注意事項
- Instagram Shopping審査に1-3日かかる場合あり
- 商品画像はInstagramのガイドラインに準拠する必要あり（テキスト20%以下等）
- 価格はUSDで表示される（Shopifyの設定に従う）

---

## M-8: TikTok Shop連携

### Phase 1: Shopify経由（推奨・初期段階）

#### 手順1: TikTok for Businessアカウント

1. [TikTok for Business](https://ads.tiktok.com/) にサインアップ
2. ビジネスセンターでアカウント作成
3. TikTok Shopセラー登録（対象国: US, UK, SEA等）

#### 手順2: Shopify管理画面でチャネル追加

1. Shopify管理画面 → 「設定」→「アプリと販売チャネル」
2. 「TikTok」を検索してインストール
3. アプリ設定:
   - TikTok for Businessアカウントと連携
   - TikTok Shop機能を有効化
   - カタログ同期を設定

#### 手順3: 商品同期

1. 「TikTok」チャネル設定 → 「カタログ」
2. 同期する商品を選択
3. TikTok Seller Centerで商品が表示されることを確認

#### 手順4: 動作確認

- [ ] TikTok Seller Centerに商品が表示される
- [ ] テスト注文→RAKUDAのWebhookで受信される（app_id: 4383523）
- [ ] Order.sourceChannel = 'TIKTOK' で記録される
- [ ] ON_HOLD状態のハンドリングが正常に動作する

### Phase 2: 直接API連携（将来・条件付き）

以下の条件を**いずれか**満たしたら直接API移行を検討:
- 月間TikTok注文が100件超
- TikTokライブコマースAPI連携が必要
- Shopify経由では対応できないTikTok固有機能が必要

#### 直接API移行時の作業
1. TikTok Open Platformでアプリ作成
2. `tiktok-api.ts` クライアント実装
3. `tiktok-webhook-processor.ts` 実装
4. Order.marketplace = TIKTOK_SHOP で直接記録
5. Shopifyチャネル経由をオプショナルに変更

---

## コード側の対応状況

### 実装済み
- [x] `shopify-channel-identifier.ts`: app_idベースのチャネル識別
- [x] `shopify-webhook-processor.ts`: sourceChannel付きOrder作成
- [x] `Order.sourceChannel`: Prismaスキーマに追加
- [x] ON_HOLD/AUTHORIZED状態のハンドリング
- [x] API: sourceChannelフィルター対応

### チャネル識別マッピング

| app_id | チャネル名 | sourceChannel |
|--------|-----------|---------------|
| 580111 | Online Store | ONLINE_STORE |
| 2329312 | Facebook & Instagram | INSTAGRAM |
| 4383523 | TikTok | TIKTOK |
| 1780363 | Google & YouTube | GOOGLE_YOUTUBE |
| 3009811 | Pinterest | PINTEREST |
| 3890849 | Shop App | SHOP_APP |

### 注文フロー

```
Customer → Instagram/TikTok → Shopify Order → Webhook → RAKUDA
                                                          ↓
                                                   identifyShopifyChannel()
                                                          ↓
                                                   Order.sourceChannel = 'INSTAGRAM' / 'TIKTOK'
                                                          ↓
                                                   Sale + InventoryEvent作成
                                                          ↓
                                                   他チャネル在庫更新
```

### TikTok特有の注意点

1. **ON_HOLD状態**: TikTokの注文は最初にON_HOLD→TikTokが確認後にUNFULFILLEDに遷移
   - 自動フルフィルメントはON_HOLD解除後のみ実行
2. **税金**: TikTokがmarketplace facilitatorとして税金を徴収する州がある
   - `channel_liable: true` → TikTokが税金を処理済み
3. **支払い**: TikTok経由の支払いはTikTokのペイメントシステム → Shopifyに同期

---

## トラブルシューティング

### 商品がInstagram/TikTokに表示されない
1. Shopify管理画面でチャネルの同期ステータスを確認
2. 商品がチャネルのポリシーに準拠しているか確認
3. カタログ同期を手動トリガー

### Webhookが届かない
1. Shopify管理画面 → 「通知」→「Webhook」で配信ステータスを確認
2. `https://api.rakuda.dev/api/shopify/webhook` のHTTPS証明書を確認
3. Webhookテスト送信で検証

### sourceChannelがNULLになる
1. 未知のapp_idの場合（ログで確認）
2. SHOPIFY_APP_IDSマッピングに追加が必要

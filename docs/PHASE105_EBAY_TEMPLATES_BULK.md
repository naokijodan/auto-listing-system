# Phase 105: eBay出品テンプレート＆一括操作強化

## 概要
eBay出品の効率化のため、テンプレート機能と一括操作機能を実装する。

## 機能一覧

### 1. 出品テンプレート機能
カテゴリ別のデフォルト設定を保存し、出品作成時に自動適用する。

#### テンプレート設定項目
- カテゴリID
- コンディションID
- 発送ポリシーID
- 支払いポリシーID
- 返品ポリシーID
- デフォルト送料
- Item Specifics（カテゴリ別の属性）
- 説明文テンプレート

### 2. 一括操作機能

#### 一括価格変更
- 選択した出品の価格を一括で変更
- パーセンテージ指定（+10%, -5%など）
- 固定金額指定

#### 一括出品終了
- 選択した出品を一括で終了
- 終了理由の指定

#### 一括再出品
- 終了した出品を一括で再出品
- 価格調整オプション

### 3. 自動再出品機能
- 終了した出品を自動的に再出品
- 設定: 有効/無効、最大再出品回数、価格調整率

## データベース設計

### EbayListingTemplate
```prisma
model EbayListingTemplate {
  id                  String   @id @default(cuid())
  name                String
  description         String?
  ebayCategoryId      String
  ebayCategoryName    String?
  conditionId         String?
  fulfillmentPolicyId String?
  paymentPolicyId     String?
  returnPolicyId      String?
  defaultShippingCost Float?
  itemSpecifics       Json?
  descriptionTemplate String?
  isDefault           Boolean  @default(false)
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### EbayAutoRelistConfig
```prisma
model EbayAutoRelistConfig {
  id              String   @id @default(cuid())
  enabled         Boolean  @default(false)
  maxRelistCount  Int      @default(3)
  priceAdjustment Float    @default(0) // パーセンテージ
  excludeCategories String[] @default([])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## API設計

### テンプレートAPI
- `GET /api/ebay-listings/templates` - テンプレート一覧
- `POST /api/ebay-listings/templates` - テンプレート作成
- `PUT /api/ebay-listings/templates/:id` - テンプレート更新
- `DELETE /api/ebay-listings/templates/:id` - テンプレート削除
- `POST /api/ebay-listings/templates/:id/apply` - テンプレートを出品に適用

### 一括操作API
- `POST /api/ebay-listings/bulk/price-update` - 一括価格変更
- `POST /api/ebay-listings/bulk/end` - 一括終了
- `POST /api/ebay-listings/bulk/relist` - 一括再出品

### 自動再出品API
- `GET /api/ebay-listings/auto-relist/config` - 設定取得
- `PUT /api/ebay-listings/auto-relist/config` - 設定更新
- `POST /api/ebay-listings/auto-relist/run` - 手動実行

## UI設計

### テンプレート管理画面
- テンプレート一覧
- テンプレート作成/編集モーダル
- デフォルトテンプレートの設定

### eBay管理ページ拡張
- 一括価格変更ボタン
- 一括終了ボタン
- 一括再出品ボタン
- 自動再出品設定パネル

## 実装順序

### Phase 105-A: テンプレート機能
1. Prismaスキーマ追加
2. テンプレートAPI実装
3. テンプレート管理UI

### Phase 105-B: 一括操作
1. 一括操作API実装
2. eBayページに一括操作UI追加

### Phase 105-C: 自動再出品
1. 自動再出品設定API
2. ワーカージョブ実装
3. 設定UI

## 見積もり
- Phase 105-A: テンプレート機能
- Phase 105-B: 一括操作
- Phase 105-C: 自動再出品

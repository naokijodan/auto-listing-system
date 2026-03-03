# RAKUDA 出品フォーマット改修計画

作成日: 2026-03-04
合意: Claude + GPT-5 + Gemini 3者協議による

## 背景

### 現状の問題
- eBay出品: EAGLEフォーマット対比で**44%**のカバー率
- Joom出品: 公式CSV仕様対比で**23%**のカバー率
- 基盤: CI失敗中、JoomListing/Listingテーブル未統合

### 発見
- eBay Taxonomy API (`getItemAspectsForCategory`) でカテゴリごとの必須Item Specificsを動的取得可能（未実装）
- eBay Account API（ポリシー取得3種）は実装済みだが、名前での選択UIがない
- Joom公式CSVフォーマット（30フィールド）が存在し、必須フィールドのうち3つが未送信

---

## Phase 0: 土台の安定化（最優先）

### 0-A: CI/ESLint修正
- **目的**: テストが通らない状態でのコード変更を防ぐ
- **対象**: GitHub Actions CI workflow
- **作業内容**:
  - unit testの失敗原因を特定・修正
  - ESLintエラーの修正
  - CIがグリーンになることを確認

### 0-B: Joom必須3点修正（止血）
- **目的**: Joom出品の最低成立要件を満たす
- **対象**: `apps/worker/src/lib/joom-api.ts` の `createProduct()`
- **作業内容**:
  1. **Store ID**: Joom管理画面からStore IDを取得し、リクエストに含める
     - DBの `JoomCredentials` にstoreIdカラム追加、または環境変数で管理
  2. **Currency**: `currency: 'USD'` をリクエストボディに追加
  3. **Shipping Weight (kg)**: 固定200g → 商品の実重量をkg単位で送信
     - Productモデルに `weightGrams` フィールド追加
     - デフォルト値はカテゴリ別に設定（watches: 0.15kg, clothing: 0.3kg等）
  4. フィールド名を統一（snake_caseに統一、4重送信を1つに）

### 0-C: Listingテーブル統合設計
- **目的**: JoomListing → 統合Listingテーブルへの移行計画策定
- **対象**: `packages/database/prisma/schema.prisma`
- **作業内容**:
  - 統合スキーマの設計（marketplace enumにJOOM追加）
  - マイグレーション計画（既存JoomListingデータの移行）
  - 影響範囲の洗い出し（inventory-sync, joom routes等）
  - ※実装はPhase 1と並行

---

## Phase 1: eBay収益最大化（短期）

### 1-A: eBay Taxonomy API実装
- **目的**: カテゴリごとの必須Item Specificsを動的取得
- **対象**: `apps/worker/src/lib/ebay-api.ts`
- **作業内容**:
  1. `getItemAspectsForCategory(categoryTreeId, categoryId)` メソッド追加
     - エンドポイント: `GET /commerce/taxonomy/v1/category_tree/{id}/get_item_aspects_for_category`
  2. `getDefaultCategoryTreeId(marketplaceId)` メソッド追加
     - EBAY_US → categoryTreeId: 0
  3. 取得結果をDBにキャッシュ（EbayCategoryMappingテーブルの `itemSpecifics` カラム活用）
  4. enrichmentエンジンへの連携（必須項目リストを属性抽出AIに渡す）
  5. 定期更新ジョブ（BullMQ cron）

### 1-B: Item Specifics全項目対応
- **目的**: EAGLE同等の11項目を全て埋める
- **対象**: `apps/worker/src/processors/ebay-publish.ts`
- **作業内容**:
  - Taxonomy APIから取得した必須項目を出品ペイロードに反映
  - カテゴリ31387 (Wristwatches) の場合:
    - Model, Style, Reference Number, Country, Country/Region of Manufacture
    - Department, Case Size, Case Material, Movement, Type, Brand
  - enrichment結果からの自動マッピング
  - 未確定項目へのデフォルト値設定（"NA", "Does not apply"等）

### 1-C: BestOffer対応
- **目的**: オファー受付・自動拒否価格の設定
- **対象**: `apps/worker/src/lib/ebay-api.ts` の `createOffer()`
- **作業内容**:
  1. Offer APIに `bestOfferEnabled: true` 追加
  2. `autoDeclinePrice` の計算ロジック（販売価格の88%等）
  3. Listingテーブルに `bestOfferEnabled`, `autoDeclinePrice` カラム追加

### 1-D: duration/GTC + private_listing
- **目的**: 出品期間とプライベートリスティングの設定
- **対象**: `apps/worker/src/lib/ebay-api.ts`
- **作業内容**:
  - Offer APIに `listingDuration: 'GTC'` 追加
  - `hideBuyerDetails: true` (private_listing相当)

### 1-E: ポリシー名同期
- **目的**: ポリシーIDだけでなく名前での選択を可能に
- **対象**: `apps/worker/src/lib/ebay-api.ts`, DB
- **作業内容**:
  1. `EbayPolicy` テーブル新規作成（type, policyId, name, marketplaceId）
  2. ポリシー取得APIの結果をDBに保存
  3. 出品時にポリシー名→IDの変換
  4. 定期同期ジョブ

---

## Phase 2: Joom品質向上（中期）

### 2-A: CSV仕様準拠（正規化）
- フィールド名をJoom公式に統一
- APIバージョンをv3固定（fallback削除）
- Product/Variant構造の正確な実装

### 2-B: 推奨フィールド対応
- Brand, Suggested Category ID, Search Tags
- Color, Size, GTIN/JAN
- MSRP（割引表示用）
- Shipping dimensions (Length/Width/Height)
- Dangerous Kind

### 2-C: 国別送料設定
- Joom Logistics vs Offline Shipping の切り替え
- 国別送料テーブル

---

## Phase 3: 共通基盤化（長期）

### 3-A: テンプレートシステム
- カテゴリ別出品テンプレート（eBay/Joom共通）
- Description生成テンプレート

### 3-B: 管理機能
- タグ管理（商品グルーピング）
- メモ機能
- 仕入時送料・初期仕入価格の追跡

### 3-C: 複数アカウント管理
- eBay複数アカウント対応
- アカウント別ポリシー管理

---

## 技術的注意事項

### eBay Taxonomy API
- Category Tree ID: EBAY_US = 0
- Rate Limit: 確認が必要
- キャッシュ戦略: DB保存 + 24時間TTL
- Item Specificsのデータ構造:
  ```json
  {
    "aspects": [
      {
        "localizedAspectName": "Brand",
        "aspectConstraint": {
          "aspectRequired": true,
          "aspectMode": "SELECTION_ONLY"
        },
        "aspectValues": [{ "localizedValue": "Seiko" }, ...]
      }
    ]
  }
  ```

### Joomフィールド名
- 公式CSV: snake_case（Shipping Weight, Store ID等）
- 公式API: 要確認（v3）
- RAKUDA現在: camelCase + snake_case混在 → 統一必要

### Listingテーブル統合
- 現在: `Listing`（eBay/Shopify用）+ `JoomListing`（Joom専用）
- 目標: `Listing`にmarketplace='JOOM'を追加、JoomListing固有フィールドはJSON or 別テーブル
- マイグレーション: 既存データの移行スクリプトが必要

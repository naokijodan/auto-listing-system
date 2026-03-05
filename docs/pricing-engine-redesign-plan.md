# RAKUDA 価格計算エンジン再設計 計画書

日付: 2026-03-06
ステータス: 計画策定完了（実装待ち）
策定方法: Claude × GPT-5 × Gemini 3者協議

---

## 1. 背景と目的

### 問題
- 現在の価格計算は簡易的（固定手数料率＋固定利益率のみ）
- 関税(US duty)、VAT、MPF、通関手数料が未対応
- DDP/DDU切替がない
- 為替変動・仕入価格変動時の自動価格調整ができない
- 一括シートV3の計算ロジックがスプレッドシートにしかなく、自動化の障壁

### 目的
- V3シートの計算式をRAKUDAのprice-calculatorに移植
- マーケットプレイス別の正確な価格計算
- 為替・仕入価格変動に連動した自動再計算
- 配送方法・シッピングポリシーの自動選択
- 計算根拠の完全なトレーサビリティ

---

## 2. アーキテクチャ設計

### 2.1 パイプライン型ストラテジーパターン

```
[入力] CostBasis + Context
  ↓
[Phase A: Normalizer（共通）]
  - 為替変換（JPY→USD）
  - 共通コスト加算（梱包費等）
  ↓
[Phase B: MP Strategy（マーケットプレイス固有）]
  - eBay: 関税/MPF/VAT/DDP計算
  - Joom: 送料込み計算
  - Shopify: 独自手数料計算
  ↓
[Phase C: Post-Processor（共通）]
  - 端数処理（$.99等）
  - チャネル別上限価格チェック
  - 最低利益率バリデーション
  - 価格変動幅チェック（安全装置）
  ↓
[出力] PriceResult（最終価格 + 全内訳 + 計算コンテキスト）
```

### 2.2 計算結果オブジェクト（Breakdown）

```typescript
interface PriceCalculationInput {
  sourcePrice: number;        // 仕入価格（円）
  weight?: number;            // 重量（g）
  dimensions?: { l: number; w: number; h: number }; // 梱包サイズ(cm)
  category?: string;          // 商品カテゴリ
  marketplace: Marketplace;   // 出品先
  shippingMethod?: string;    // 配送方法（指定時）
  pricingMode: 'SIMPLE' | 'DETAILED'; // 計算モード
  profitMode: 'RATE' | 'AMOUNT';       // 利益率 or 利益額
}

interface PriceCalculationResult {
  // 最終価格
  dduPrice: number;           // DDU価格（USD）
  ddpPrice: number;           // DDP価格（USD）= DDU + 関税
  finalPrice: number;         // 採用価格（DDP or DDUはモードによる）

  // 内訳（全ステップ）
  breakdown: {
    sourcePrice: number;        // 仕入価格（円）
    sourcePriceUsd: number;     // 仕入価格（USD）
    shippingCost: number;       // 送料（USD）
    platformFee: number;        // プラットフォーム手数料
    paymentFee: number;         // 決済手数料（Payoneer等）
    adCost: number;             // 広告費
    profit: number;             // 利益額
    profitRate: number;         // 実際の利益率（%）
    // eBay固有
    estimatedDuty: number;      // 想定関税
    vatAmount: number;          // VAT額
    dutyProcessingFee: number;  // 関税処理手数料
    mpf: number;                // MPF（米国通関処理手数料）
    customsClearanceFee: number; // 通関手数料
  };

  // 計算コンテキスト（スナップショット用）
  metadata: {
    calculatedAt: Date;
    exchangeRate: number;       // 使用した為替レート
    exchangeRateSource: string; // レートのソース
    settingsVersion: string;    // 適用した設定のバージョン
    pricingMode: string;
    shippingMethod: string;
    marketplace: string;
    category?: string;
  };

  // 適用した設定値
  appliedSettings: {
    platformFeeRate: number;
    paymentFeeRate: number;
    adRate: number;
    profitRate: number;
    dutyRate: number;
    vatRate: number;
    dutyProcessingFeeRate: number;
    mpfAmount: number;
  };
}
```

### 2.3 eBay価格計算式（V3移植）

#### DDU価格（利益率モード）
```
DDU価格(USD) = (仕入値円 + 送料円) ÷ (1 - 手数料率 - 利益率 - 広告率 - Payoneer率) ÷ 為替レート
```

#### DDU価格（利益額モード）
```
DDU価格(USD) = (仕入値円 + 送料円 + 利益額円) ÷ (1 - 手数料率 - 広告率 - Payoneer率) ÷ 為替レート
```

#### 想定関税
```
想定関税(USD) = DDU価格 × 調整後関税率 × (1 + 関税処理手数料率)
             + DDU価格 × VAT率 × 関税処理手数料率
             + IF(配送方法=CE, CE通関手数料円÷為替, 0)
             + MPF($)
             + EU送料差額円 ÷ 為替
```

#### DDP価格
```
DDP価格(USD) = DDU価格 + 想定関税
```

#### 調整後関税率（循環依存の解決）
```
調整後関税率 = 実際の関税率 ÷ (1 - 手数料率 - 広告率)
```
※ DDP価格に手数料がかかるため、関税率を事前調整して循環を解消

### 2.4 Joom価格計算式

```
出品価格(USD) = (仕入値円 × 為替レート + 送料USD) ÷ (1 - 手数料率 - 決済手数料率 - 利益率)
```

Joomは関税・VAT計算なし（プラットフォームが買い手側で処理）。

---

## 3. パラメータ管理（DB設計）

### 3.1 3層構造

```
Layer 1: GlobalPricingSetting（全体共通）
  └ 為替バッファ率、共通梱包費

Layer 2: MarketplacePricingSetting（MP×カテゴリ別）
  └ 手数料率、広告費率、利益率、関税率、VAT率...

Layer 3: ProductPriceOverride（商品個別）
  └ 固定価格、個別利益率の強制上書き
```

### 3.2 設定Resolverパターン

```typescript
// 最も優先度の高い設定値を取得
SettingsResolver.get('platformFeeRate', {
  marketplace: 'EBAY',
  category: 'watches',
  productId: 'xxx'
})
// → ProductOverride > MarketplaceCategory > Marketplace > Global の順で解決
```

### 3.3 スナップショット保存

出品時・再計算時の計算パラメータを `price_calculation_snapshots` テーブルに保存。
- Listing ID と紐づけ
- 計算結果の全breakdown をJSON保存
- 後から「なぜこの価格になったか」をトレース可能

### 3.4 新規テーブル

```
pricing_settings（設定マスタ）
  - id, marketplace, category, is_default
  - platform_fee_rate, payment_fee_rate, ad_rate
  - profit_mode ('RATE'|'AMOUNT'), profit_rate, profit_amount
  - duty_rate, vat_rate, duty_processing_fee_rate
  - mpf_amount, customs_clearance_fee
  - exchange_buffer_rate
  - valid_from（バージョニング用）
  - created_at, updated_at

shipping_rate_table（送料テーブル）
  - id, shipping_method, weight_min, weight_max
  - cost_jpy, cost_usd
  - is_active

product_price_overrides（商品個別上書き）
  - id, product_id, marketplace
  - fixed_price, custom_profit_rate
  - override_reason
  - created_at

price_calculation_snapshots（計算スナップショット）
  - id, listing_id, product_id, marketplace
  - input_json, result_json, settings_json
  - calculated_at
```

---

## 4. 自動再計算エンジン

### 4.1 トリガー構成（4層）

| トリガー | 条件 | 優先度 | 対象 |
|---------|------|--------|------|
| 緊急手動 | 管理画面から即時実行 | HIGH | 全SKU or 指定SKU |
| 即時 | 仕入価格変動検知 | HIGH | 該当SKU |
| 閾値 | 為替±2%変動 | MEDIUM | 全アクティブSKU |
| 日次バッチ | cron（1日1回） | LOW | 全アクティブSKU |

### 4.2 安全装置（Safety Guards）

1. **価格変動幅制限**: 前回価格から±30%以上の変動 → 自動更新を保留、要確認リストへ
2. **赤字ブロック**: 計算結果が最低利益率を下回る → 自動出品停止 or 価格更新スキップ
3. **レートリミット**: マーケットプレイスAPIのRate Limitを考慮したバッチ更新
4. **サーキットブレーカー**: 連続エラー時に再計算ジョブを一時停止

### 4.3 キュー設計

```
price-recalculation-queue（BullMQ）
  ├ priority: HIGH  → 仕入価格変動（即時）
  ├ priority: MEDIUM → 為替変動（閾値超過）
  └ priority: LOW   → 日次バッチ

1ジョブ = 1 SKU × 全出品チャネルの再計算
バッチサイズ: 50 SKU/分（API制限を考慮）
```

---

## 5. Chrome拡張機能の送料選択UI

### 5.1 取り込み時のフロー

```
商品スクレイピング
  ↓
[送料選択UI]
  - 推奨配送方法を自動選択（仕入価格＋重量ベース）
  - 手動変更可能（ドロップダウン）
  - 概算利益をリアルタイム表示（配送方法ごとに横並び比較）
  ↓
RAKUDAに保存（Product.shippingMethod フィールド）
```

### 5.2 UI要素

- 配送方法ドロップダウン（推奨がデフォルト選択）
- 各配送方法の概算送料表示
- 想定利益（$）と利益率（%）のバッジ表示
- DDP/DDUモード切替（eBay出品時のみ表示）

---

## 6. 実装フェーズ

### Phase 1: 基盤 + Joom（1-2日）
- [ ] PriceCalculationInput/Result インターフェース定義
- [ ] 共通パイプライン基盤（Normalizer, PostProcessor）
- [ ] JoomPricingStrategy 実装
- [ ] SettingsResolver 実装
- [ ] pricing_settings テーブル作成・マイグレーション
- [ ] Joomの既存6リスティングで動作確認

### Phase 2: eBay詳細モード + V3検証（2-3日）
- [ ] EbayPricingStrategy 実装（DDU/DDP/関税計算）
- [ ] shipping_rate_table テーブル作成
- [ ] 利益率モード / 利益額モード切替
- [ ] V3シートからテストデータ（100パターン）エクスポート
- [ ] ゴールドマスターテスト構築（V3と1セント以内の一致を検証）

### Phase 3: パラメータ管理 + 管理画面（1-2日）
- [ ] 3層設定（Global/MP×Category/Product Override）
- [ ] 管理画面UI（価格設定の表示・編集）
- [ ] price_calculation_snapshots テーブル作成
- [ ] 計算内訳の表示UI

### Phase 4: 自動再計算エンジン（1-2日）
- [ ] price-recalculation-queue 作成
- [ ] 為替変動検知 → 閾値トリガー
- [ ] 仕入価格変動検知 → 即時トリガー
- [ ] 日次バッチジョブ
- [ ] 安全装置（変動幅制限、赤字ブロック、サーキットブレーカー）

### Phase 5: Chrome拡張 送料選択UI（1日）
- [ ] 配送方法選択ドロップダウン追加
- [ ] 利益シミュレーターUI（リアルタイム概算表示）
- [ ] Product.shippingMethod フィールド追加

### Phase 6: シッピングポリシー自動選択（1日）
- [ ] 価格帯×配送方法 → eBayシッピングポリシーの自動マッピング
- [ ] 出品時のポリシー自動設定

**合計見積もり: 7-11日**
（過去実績バッファ: API統合 ×1.5 → **実質10-16日**）

---

## 7. V3移植の注意事項

### 7.1 為替レートの方向
- **V3**: 為替 = JPY/USD（例: 150）→ 割り算で使用
- **RAKUDA**: 為替 = JPY→USD直レート（例: 0.0067）→ 掛け算で使用
- **方針**: RAKUDA側に統一。V3の計算式を移植時に変換方向を必ず確認

### 7.2 循環依存の解決
- DDU価格 → 関税計算 → DDP価格 の順序を厳守
- 関税率の事前調整（調整後関税率 = 実関税率 ÷ (1 - 手数料率 - 広告率)）で循環を回避
- コード内にコメントで数式の導出過程を記載

### 7.3 テスト戦略
- V3シートから100パターンのテストデータをCSVエクスポート
- 新エンジンの結果と突き合わせる「ゴールドマスターテスト」
- 1セントの誤差も許容しない厳格なテスト
- シャドウ計算フェーズ（1週間）で本番データとの比較検証

---

## 8. 3者協議の結論

### 全員一致
- ストラテジー＋共通パイプラインが最適
- パラメータの3層管理＋スナップショット保存は必須
- V3一致検証（ゴールドマスターテスト）が品質担保の要
- Chrome拡張には利益シミュレーター必須

### Claudeの追加意見
- 為替レート方向の統一が最優先の技術課題
- Phase 1でJoomを先に動かすことで基盤の疎通確認ができる
- 既存のprice-calculator.tsをリファクタリングする形で進めるのが効率的

---

## 参照

- 一括シートV3: `~/Desktop/ツール開発/一括シートApps_v3/`
- 現在のprice-calculator: `apps/worker/src/lib/price-calculator.ts`
- 現在のpricing-engine: `apps/api/src/lib/pricing-engine.ts`
- 設定定数: `packages/config/src/constants.ts`

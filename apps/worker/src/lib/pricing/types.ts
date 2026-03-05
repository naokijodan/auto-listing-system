import { Marketplace } from '@rakuda/database';

// 計算モード
export type PricingMode = 'SIMPLE' | 'DETAILED';
export type ProfitMode = 'RATE' | 'AMOUNT';

// 入力
export interface PriceCalculationInput {
  sourcePrice: number;        // 仕入価格（円）
  weight?: number;            // 重量（g）
  dimensions?: { l: number; w: number; h: number }; // 梱包サイズ(cm)
  category?: string;          // 商品カテゴリ
  marketplace: Marketplace;   // 出品先
  shippingMethod?: string;    // 配送方法（指定時）
  pricingMode: PricingMode;   // 計算モード
  profitMode: ProfitMode;     // 利益率 or 利益額
  profitAmount?: number;      // 利益額（円）- profitMode=AMOUNT時のみ
  productId?: string;         // 商品ID（個別上書き確認用）
}

// 計算結果
export interface PriceCalculationResult {
  dduPrice: number;           // DDU価格（USD）
  ddpPrice: number;           // DDP価格（USD）= DDU + 関税
  finalPrice: number;         // 採用価格

  breakdown: PriceBreakdown;
  metadata: CalculationMetadata;
  appliedSettings: AppliedSettings;
}

// 内訳
export interface PriceBreakdown {
  sourcePrice: number;        // 仕入価格（円）
  sourcePriceUsd: number;     // 仕入価格（USD）
  shippingCostJpy: number;    // 送料（円）
  shippingCostUsd: number;    // 送料（USD）
  platformFee: number;        // プラットフォーム手数料（USD）
  paymentFee: number;         // 決済手数料（USD）
  adCost: number;             // 広告費（USD）
  profit: number;             // 利益額（USD）
  profitRate: number;         // 実際の利益率（%）
  // eBay固有（Joomでは全て0）
  estimatedDuty: number;      // 想定関税（USD）
  vatAmount: number;          // VAT額（USD）
  dutyProcessingFee: number;  // 関税処理手数料（USD）
  mpf: number;                // MPF（USD）
  customsClearanceFee: number; // 通関手数料（USD）
}

// メタデータ
export interface CalculationMetadata {
  calculatedAt: Date;
  exchangeRate: number;       // 使用した為替レート（JPY→USD）
  exchangeRateSource: string;
  settingsVersion: string;
  pricingMode: PricingMode;
  profitMode: ProfitMode;
  shippingMethod: string;
  marketplace: string;
  category?: string;
}

// 適用した設定値
export interface AppliedSettings {
  platformFeeRate: number;
  paymentFeeRate: number;
  adRate: number;
  profitRate: number;
  profitAmount: number;
  dutyRate: number;
  vatRate: number;
  dutyProcessingFeeRate: number;
  mpfAmount: number;
  customsClearanceFeeJpy: number;
  exchangeBufferRate: number;
}

// 正規化された入力（Normalizer出力）
export interface NormalizedInput {
  sourcePriceUsd: number;     // 仕入価格（USD）
  shippingCostJpy: number;    // 送料（円）
  shippingCostUsd: number;    // 送料（USD）
  exchangeRate: number;       // JPY→USD
  exchangeRateSource: string;
  shippingMethod: string;     // 選択された配送方法
  original: PriceCalculationInput; // 元の入力
}

// 設定解決結果
export interface ResolvedSettings {
  platformFeeRate: number;
  paymentFeeRate: number;
  adRate: number;
  profitRate: number;         // 利益率（RATE mode）
  profitAmount: number;       // 利益額・円（AMOUNT mode）
  dutyRate: number;           // 関税率
  adjustedDutyRate: number;   // 調整後関税率
  vatRate: number;
  dutyProcessingFeeRate: number;
  mpfAmount: number;          // MPF（USD）
  customsClearanceFeeJpy: number; // CE通関手数料（円）
  euShippingDiffJpy: number;  // EU送料差額（円）
  exchangeBufferRate: number;
  version: string;
}


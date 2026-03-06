import { Marketplace } from '@rakuda/database';
import type {
  AppliedSettings,
  NormalizedInput,
  PriceBreakdown,
  PriceCalculationResult,
  ResolvedSettings,
} from '../types';
import { BasePricingStrategy } from './base-strategy';

export class JoomPricingStrategy extends BasePricingStrategy {
  readonly marketplace = 'JOOM' as const;

  calculate(normalized: NormalizedInput, settings: ResolvedSettings): PriceCalculationResult {
    const { sourcePriceUsd, shippingCostUsd, exchangeRate } = normalized;

    // 利益額（円→USD）
    const profitAmountUsd = settings.profitAmount ? settings.profitAmount * exchangeRate : 0;

    const denominatorRateForRateMode =
      1 - settings.platformFeeRate - settings.paymentFeeRate - settings.adRate - settings.profitRate;
    const denominatorRateForAmountMode =
      1 - settings.platformFeeRate - settings.paymentFeeRate - settings.adRate;

    const baseNumerator = sourcePriceUsd + shippingCostUsd;

    const dduPriceRaw = normalized.original.profitMode === 'AMOUNT'
      ? (baseNumerator + profitAmountUsd) / denominatorRateForAmountMode
      : baseNumerator / denominatorRateForRateMode;

    const dduPrice = dduPriceRaw; // 丸めは post-processor で実施
    const ddpPrice = dduPrice; // Joom は関税なし
    const finalPrice = dduPrice;

    const platformFee = dduPrice * settings.platformFeeRate;
    const paymentFee = dduPrice * settings.paymentFeeRate;
    const adCost = dduPrice * settings.adRate;
    const profit = normalized.original.profitMode === 'AMOUNT' ? profitAmountUsd : dduPrice * settings.profitRate;

    const breakdown: PriceBreakdown = {
      sourcePrice: normalized.original.sourcePrice,
      sourcePriceUsd,
      shippingCostJpy: normalized.shippingCostJpy,
      shippingCostUsd,
      platformFee,
      paymentFee,
      adCost,
      profit,
      // 実際の利益率（売価に対する利益割合）
      profitRate: dduPrice > 0 ? profit / dduPrice : 0,
      // Joom は全て 0
      estimatedDuty: 0,
      vatAmount: 0,
      dutyProcessingFee: 0,
      mpf: 0,
      customsClearanceFee: 0,
    };

    const appliedSettings: AppliedSettings = {
      platformFeeRate: settings.platformFeeRate,
      paymentFeeRate: settings.paymentFeeRate,
      adRate: settings.adRate,
      profitRate: settings.profitRate,
      profitAmount: settings.profitAmount || 0,
      dutyRate: settings.dutyRate,
      vatRate: settings.vatRate,
      dutyProcessingFeeRate: settings.dutyProcessingFeeRate,
      mpfAmount: settings.mpfAmount,
      customsClearanceFeeJpy: settings.customsClearanceFeeJpy,
      exchangeBufferRate: settings.exchangeBufferRate,
    };

    return {
      dduPrice,
      ddpPrice,
      finalPrice,
      breakdown,
      metadata: {
        calculatedAt: new Date(),
        exchangeRate,
        exchangeRateSource: normalized.exchangeRateSource,
        settingsVersion: settings.version,
        pricingMode: normalized.original.pricingMode,
        profitMode: normalized.original.profitMode,
        shippingMethod: normalized.shippingMethod,
        marketplace: 'JOOM',
        category: normalized.original.category,
      },
      appliedSettings,
    };
  }
}

import { Marketplace } from '@rakuda/database';
import type {
  AppliedSettings,
  NormalizedInput,
  PriceBreakdown,
  PriceCalculationResult,
  ResolvedSettings,
} from '../types';
import { BasePricingStrategy } from './base-strategy';

export class EbayPricingStrategy extends BasePricingStrategy {
  readonly marketplace = Marketplace.EBAY as const;

  calculate(normalized: NormalizedInput, settings: ResolvedSettings): PriceCalculationResult {
    const { sourcePriceUsd, shippingCostUsd, exchangeRate } = normalized;

    // 利益額（円→USD）
    const profitAmountUsd = normalized.original.profitMode === 'AMOUNT'
      ? ((normalized.original.profitAmount ?? settings.profitAmount ?? 0) * exchangeRate)
      : 0;

    // DDU 計算（V3移植ロジック）
    const denominatorRateForRateMode =
      1 - settings.platformFeeRate - settings.paymentFeeRate - settings.adRate - settings.profitRate;
    const denominatorRateForAmountMode =
      1 - settings.platformFeeRate - settings.paymentFeeRate - settings.adRate;

    const baseNumerator = sourcePriceUsd + shippingCostUsd;
    const dduPrice = normalized.original.profitMode === 'AMOUNT'
      ? (baseNumerator + profitAmountUsd) / denominatorRateForAmountMode
      : baseNumerator / denominatorRateForRateMode;

    // 関税計算（V3移植ロジック）
    const customsClearanceFeeUsd = normalized.shippingMethod === 'CE'
      ? settings.customsClearanceFeeJpy * normalized.exchangeRate
      : 0;
    const euShippingDiffUsd = settings.euShippingDiffJpy * normalized.exchangeRate;

    const estimatedDuty =
      dduPrice * settings.adjustedDutyRate * (1 + settings.dutyProcessingFeeRate)
      + dduPrice * settings.vatRate * settings.dutyProcessingFeeRate
      + customsClearanceFeeUsd
      + settings.mpfAmount
      + euShippingDiffUsd;

    // DDP 計算
    const ddpPrice = dduPrice + estimatedDuty;
    const finalPrice = ddpPrice; // eBay は DDP が最終価格

    // Breakdown（手数料は DDU ベース）
    const platformFee = dduPrice * settings.platformFeeRate;
    const paymentFee = dduPrice * settings.paymentFeeRate;
    const adCost = dduPrice * settings.adRate;
    const profit = normalized.original.profitMode === 'AMOUNT'
      ? profitAmountUsd
      : dduPrice * settings.profitRate;
    const profitRate = dduPrice > 0 ? profit / dduPrice : 0;

    const vatAmount = dduPrice * settings.vatRate;
    const dutyProcessingFee =
      dduPrice * settings.adjustedDutyRate * settings.dutyProcessingFeeRate +
      dduPrice * settings.vatRate * settings.dutyProcessingFeeRate;

    const breakdown: PriceBreakdown = {
      sourcePrice: normalized.original.sourcePrice,
      sourcePriceUsd,
      shippingCostJpy: normalized.shippingCostJpy,
      shippingCostUsd,
      platformFee,
      paymentFee,
      adCost,
      profit,
      profitRate,
      estimatedDuty,
      vatAmount,
      dutyProcessingFee,
      mpf: settings.mpfAmount,
      customsClearanceFee: customsClearanceFeeUsd + euShippingDiffUsd,
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
        marketplace: 'EBAY',
        category: normalized.original.category,
      },
      appliedSettings,
    };
  }
}

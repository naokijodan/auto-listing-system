import { describe, it, expect, vi } from 'vitest';

vi.mock('@rakuda/database', () => ({
  Marketplace: { EBAY: 'EBAY' },
}));

import { EbayPricingStrategy } from '../../pricing/strategies/ebay-strategy';
import type { NormalizedInput, ResolvedSettings } from '../../pricing/types';

describe('EbayPricingStrategy', () => {
  const baseNormalized: NormalizedInput = {
    sourcePriceUsd: 67.0, // 10000 * 0.0067
    shippingCostJpy: 12.0 / 0.0067,
    shippingCostUsd: 12.0,
    exchangeRate: 0.0067,
    exchangeRateSource: 'TEST',
    shippingMethod: 'EBAY_DEFAULT',
    original: {
      sourcePrice: 10000,
      weight: 300,
      marketplace: 'EBAY' as any,
      pricingMode: 'DETAILED',
      profitMode: 'RATE',
    },
  };

  const baseSettings: ResolvedSettings = {
    platformFeeRate: 0.13,
    paymentFeeRate: 0.03,
    adRate: 0,
    profitRate: 0.30,
    profitAmount: 0,
    dutyRate: 0.15,
    adjustedDutyRate: 0.15 / (1 - 0.13 - 0), // 0.172414...
    vatRate: 0,
    dutyProcessingFeeRate: 0.021,
    mpfAmount: 0,
    customsClearanceFeeJpy: 0,
    euShippingDiffJpy: 0,
    exchangeBufferRate: 0.02,
    version: 'test',
  };

  it('RATE mode with duty', () => {
    const strategy = new EbayPricingStrategy();
    const res = strategy.calculate({ ...baseNormalized }, { ...baseSettings });

    // DDU = 79 / 0.54 = 146.296296...
    expect(res.dduPrice).toBeCloseTo(146.2963, 3);
    // estimatedDuty = ddu * 0.172414 * 1.021
    expect(res.breakdown.estimatedDuty).toBeGreaterThan(0);
    expect(res.ddpPrice).toBeCloseTo(res.dduPrice + res.breakdown.estimatedDuty, 10);
    expect(res.finalPrice).toBeCloseTo(res.ddpPrice, 10);
    expect(res.breakdown.platformFee).toBeCloseTo(res.dduPrice * 0.13, 5);
    expect(res.breakdown.profitRate).toBeCloseTo(0.3, 2);
    expect(res.breakdown.vatAmount).toBeCloseTo(0, 10);
  });

  it('AMOUNT mode with duty', () => {
    const strategy = new EbayPricingStrategy();
    const normalizedAmount: NormalizedInput = {
      ...baseNormalized,
      original: { ...baseNormalized.original, profitMode: 'AMOUNT', profitAmount: 3000 },
    };
    const res = strategy.calculate(normalizedAmount, { ...baseSettings });

    // profitAmountUsd = 3000 * 0.0067 = 20.1
    // DDU = (67 + 12 + 20.1) / 0.84 = 117.976...
    expect(res.dduPrice).toBeCloseTo(117.976, 3);
    expect(res.breakdown.profit).toBeCloseTo(20.1, 10);
    expect(res.ddpPrice).toBeGreaterThan(res.dduPrice);
  });

  it('DDP equals DDU when duty is 0', () => {
    const strategy = new EbayPricingStrategy();
    const settingsZeroDuty: ResolvedSettings = { ...baseSettings, dutyRate: 0, adjustedDutyRate: 0 };
    const res = strategy.calculate({ ...baseNormalized }, settingsZeroDuty);

    expect(res.ddpPrice).toBeCloseTo(res.dduPrice, 10);
    expect(res.breakdown.estimatedDuty).toBeCloseTo(0, 10);
  });

  it('CE shipping + VAT + MPF + EU shipping diff included in estimatedDuty', () => {
    const strategy = new EbayPricingStrategy();
    const normalizedCE: NormalizedInput = { ...baseNormalized, shippingMethod: 'CE' };
    const settingsWithFees: ResolvedSettings = {
      ...baseSettings,
      vatRate: 0.05,
      mpfAmount: 2.5,
      customsClearanceFeeJpy: 500,
      euShippingDiffJpy: 300,
    };
    const res = strategy.calculate(normalizedCE, settingsWithFees);

    const ddu = res.dduPrice;
    const expectedVat = ddu * 0.05;
    const expectedCustoms = (500 + 300) * 0.0067; // JPY -> USD
    const expectedEstimatedDuty =
      ddu * (baseSettings.adjustedDutyRate) * (1 + baseSettings.dutyProcessingFeeRate) +
      ddu * 0.05 * baseSettings.dutyProcessingFeeRate +
      expectedCustoms +
      2.5;

    expect(res.breakdown.mpf).toBeCloseTo(2.5, 10);
    expect(res.breakdown.customsClearanceFee).toBeCloseTo(expectedCustoms, 6);
    expect(res.breakdown.vatAmount).toBeCloseTo(expectedVat, 6);
    expect(res.breakdown.estimatedDuty).toBeCloseTo(expectedEstimatedDuty, 4);
  });
});


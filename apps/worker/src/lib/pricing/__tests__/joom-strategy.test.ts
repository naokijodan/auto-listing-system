import { describe, it, expect } from 'vitest';

vi.mock('@rakuda/database', () => ({
  Marketplace: { JOOM: 'JOOM' },
}));

import { JoomPricingStrategy } from '../../pricing/strategies/joom-strategy';
import type { NormalizedInput, ResolvedSettings } from '../../pricing/types';

describe('JoomPricingStrategy', () => {
  it('computes DDU price and breakdown (RATE mode)', () => {
    const strategy = new JoomPricingStrategy();
    const normalized: NormalizedInput = {
      sourcePriceUsd: 33.5,
      shippingCostJpy: 7.0 / 0.0067,
      shippingCostUsd: 7.0,
      exchangeRate: 0.0067,
      exchangeRateSource: 'TEST',
      shippingMethod: 'JOOM_STANDARD',
      original: {
        sourcePrice: 5000,
        weight: 200,
        marketplace: 'JOOM' as any,
        pricingMode: 'DETAILED',
        profitMode: 'RATE',
      },
    };
    const settings: ResolvedSettings = {
      platformFeeRate: 0.15,
      paymentFeeRate: 0.03,
      adRate: 0,
      profitRate: 0.3,
      profitAmount: 0,
      dutyRate: 0,
      adjustedDutyRate: 0,
      vatRate: 0,
      dutyProcessingFeeRate: 0,
      mpfAmount: 0,
      customsClearanceFeeJpy: 0,
      euShippingDiffJpy: 0,
      exchangeBufferRate: 0.02,
      version: 'test',
    };

    const res = strategy.calculate(normalized, settings);
    // 40.5 / (1 - 0.15 - 0.03 - 0.3) = 77.8846...
    expect(res.dduPrice).toBeCloseTo(77.8846, 3);
    expect(res.ddpPrice).toBeCloseTo(res.dduPrice, 10);
    expect(res.breakdown.platformFee).toBeCloseTo(res.dduPrice * 0.15, 10);
    expect(res.breakdown.paymentFee).toBeCloseTo(res.dduPrice * 0.03, 10);
    expect(res.breakdown.profitRate).toBeCloseTo(0.3, 2);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    productPriceOverride: { findFirst: vi.fn() },
    priceSetting: { findFirst: vi.fn() },
    exchangeRate: { findFirst: vi.fn() },
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
  Marketplace: { JOOM: 'JOOM', EBAY: 'EBAY' },
}));

vi.mock('@rakuda/config', () => ({
  PRICE_DEFAULTS: {
    JOOM: {
      platformFeeRate: 0.15,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.3,
      adRate: 0,
      exchangeBuffer: 0.02,
    },
    EBAY: {
      platformFeeRate: 0.13,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.3,
      adRate: 0,
      exchangeBuffer: 0.02,
    },
  },
  SHIPPING_DEFAULTS: {
    JOOM: { baseCost: 5, perGramCost: 0.01 },
    EBAY: { defaultCost: 12 },
  },
  EXCHANGE_RATE_DEFAULTS: { JPY_TO_USD: 0.0067 },
  MARKETPLACE_PRICE_LIMITS: { JOOM_PRICE_LIMIT_JPY: 900000 },
}));

import { PricingPipeline } from '../../pricing';
import { Marketplace } from '@rakuda/database';

describe('PricingPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates Joom price end-to-end (RATE mode) with rounding', async () => {
    mockPrisma.productPriceOverride.findFirst.mockResolvedValue(undefined);
    mockPrisma.priceSetting.findFirst.mockResolvedValue(undefined);
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });

    const pipeline = new PricingPipeline();
    const res = await pipeline.calculate({
      sourcePrice: 5000,
      weight: 200,
      marketplace: Marketplace.JOOM as any,
      pricingMode: 'DETAILED',
      profitMode: 'RATE',
    });

    // Derived from sample:
    // ddu = 40.5 / 0.52 = 77.8846..., final rounds up to 77.89
    expect(res.dduPrice).toBeCloseTo(77.8846, 3);
    expect(res.finalPrice).toBeCloseTo(77.89, 2);
    expect(res.breakdown.platformFee).toBeCloseTo(res.dduPrice * 0.15, 2);
    expect(res.breakdown.paymentFee).toBeCloseTo(res.dduPrice * 0.03, 2);
    expect(res.breakdown.profit).toBeCloseTo(res.dduPrice * 0.3, 2);
  });
});


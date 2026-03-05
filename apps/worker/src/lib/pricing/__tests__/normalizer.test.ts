import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted prisma mock
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    exchangeRate: { findFirst: vi.fn() },
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
  Marketplace: { JOOM: 'JOOM', EBAY: 'EBAY' },
}));

vi.mock('@rakuda/config', () => ({
  SHIPPING_DEFAULTS: {
    JOOM: { baseCost: 5, perGramCost: 0.01 },
    EBAY: { defaultCost: 12 },
  },
  EXCHANGE_RATE_DEFAULTS: { JPY_TO_USD: 0.0067 },
}));

import { normalize } from '../../pricing/normalizer';
import type { PriceCalculationInput } from '../../pricing/types';
import { Marketplace } from '@rakuda/database';

describe('normalizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts JPY to USD using latest rate or default and computes shipping for Joom', async () => {
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(undefined);
    const input: PriceCalculationInput = {
      sourcePrice: 5000,
      weight: 200,
      marketplace: Marketplace.JOOM as any,
      pricingMode: 'DETAILED',
      profitMode: 'RATE',
    };

    const normalized = await normalize(input);
    expect(normalized.exchangeRate).toBeCloseTo(0.0067, 10);
    expect(normalized.sourcePriceUsd).toBeCloseTo(33.5, 10);
    expect(normalized.shippingCostUsd).toBeCloseTo(7.0, 10); // 5 + 0.01*200
    expect(normalized.shippingMethod).toBe('JOOM_STANDARD');
  });
});


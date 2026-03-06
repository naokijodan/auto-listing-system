import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted prisma mock
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    exchangeRate: { findFirst: vi.fn() },
    shippingRateEntry: { findFirst: vi.fn() },
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
    mockPrisma.shippingRateEntry.findFirst.mockResolvedValue(null);
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

  it('uses ShippingRateEntry when shippingMethod and weight are provided', async () => {
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });
    mockPrisma.shippingRateEntry.findFirst.mockResolvedValueOnce({
      id: 'test-1',
      shippingMethod: 'CF',
      weightMin: 0,
      weightMax: 500,
      costJpy: 1200,
      costUsd: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await normalize({
      sourcePrice: 5000,
      weight: 300,
      marketplace: 'EBAY' as any,
      shippingMethod: 'CF',
      pricingMode: 'SIMPLE',
      profitMode: 'RATE',
    });

    expect(result.shippingCostJpy).toBe(1200);
    expect(result.shippingCostUsd).toBeCloseTo(1200 * 0.0067, 4);
    expect(result.shippingMethod).toBe('CF');
  });

  it('falls back to SHIPPING_DEFAULTS when no ShippingRateEntry found', async () => {
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });
    mockPrisma.shippingRateEntry.findFirst.mockResolvedValueOnce(null);

    const result = await normalize({
      sourcePrice: 5000,
      weight: 300,
      marketplace: 'EBAY' as any,
      shippingMethod: 'UNKNOWN_METHOD',
      pricingMode: 'SIMPLE',
      profitMode: 'RATE',
    });

    // EBAY default: 12 USD
    expect(result.shippingCostUsd).toBe(12);
  });

  it('falls back when weight is 0', async () => {
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });
    mockPrisma.shippingRateEntry.findFirst.mockResolvedValueOnce(null);

    const result = await normalize({
      sourcePrice: 5000,
      weight: 0,
      marketplace: 'JOOM' as any,
      shippingMethod: 'CF',
      pricingMode: 'SIMPLE',
      profitMode: 'RATE',
    });

    // Joom fallback: baseCost(5) + 0 * perGramCost(0.01) = 5
    expect(result.shippingCostUsd).toBe(5);
  });

  it('falls back when shippingMethod is not specified', async () => {
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });
    mockPrisma.shippingRateEntry.findFirst.mockResolvedValueOnce(null);

    const result = await normalize({
      sourcePrice: 5000,
      weight: 300,
      marketplace: 'JOOM' as any,
      pricingMode: 'SIMPLE',
      profitMode: 'RATE',
    });

    // Joom fallback: baseCost(5) + 300 * perGramCost(0.01) = 8
    expect(result.shippingCostUsd).toBe(8);
    expect(result.shippingMethod).toBe('JOOM_STANDARD');
  });
});

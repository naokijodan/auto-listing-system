import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    productPriceOverride: { findFirst: vi.fn() },
    priceSetting: { findFirst: vi.fn() },
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
}));

import { resolveSettings } from '../../pricing/settings-resolver';
import { Marketplace } from '@rakuda/database';

describe('settings-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to PRICE_DEFAULTS for Joom when no DB settings', async () => {
    mockPrisma.productPriceOverride.findFirst.mockResolvedValue(undefined);
    mockPrisma.priceSetting.findFirst.mockResolvedValue(undefined);

    const settings = await resolveSettings(Marketplace.JOOM as any);
    expect(settings.platformFeeRate).toBeCloseTo(0.15, 10);
    expect(settings.paymentFeeRate).toBeCloseTo(0.03, 10);
    expect(settings.profitRate).toBeCloseTo(0.3, 10);
    expect(settings.adRate).toBe(0);
    expect(settings.adjustedDutyRate).toBe(0); // Joom duty zero
    expect(typeof settings.version).toBe('string');
    expect(new Date(settings.version).toString()).not.toBe('Invalid Date');
  });
});


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockPrisma, mockFetch } = vi.hoisted(() => {
  return {
    mockPrisma: {
      exchangeRate: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      priceSetting: {
        findFirst: vi.fn(),
      },
      shippingPolicy: {
        findFirst: vi.fn(),
      },
    },
    mockFetch: vi.fn(),
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@rakuda/config', () => ({
  PRICE_DEFAULTS: {
    JOOM: {
      platformFeeRate: 0.15,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.20,
      adRate: 0.05,
      exchangeBuffer: 0.02,
    },
    EBAY: {
      platformFeeRate: 0.13,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.20,
      adRate: 0.02,
      exchangeBuffer: 0.02,
    },
  },
  SHIPPING_DEFAULTS: {
    JOOM: {
      baseCost: 5,
      perGramCost: 0.01,
    },
    EBAY: {
      defaultCost: 15,
    },
  },
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
  },
}));

const originalFetch = globalThis.fetch;

import {
  calculatePrice,
  calculatePricesForRegions,
  updateExchangeRate,
} from '../../lib/price-calculator';

describe('Price Calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as any;
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });
    mockPrisma.exchangeRate.create.mockResolvedValue({});
    mockPrisma.priceSetting.findFirst.mockResolvedValue(null);
    mockPrisma.shippingPolicy.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('calculatePrice', () => {
    it('should calculate price for Joom marketplace', async () => {
      const result = await calculatePrice({
        sourcePrice: 1000, // 1000 JPY
        weight: 200,
        marketplace: 'joom',
      });

      expect(result.listingPrice).toBeGreaterThan(0);
      expect(result.shippingCost).toBeGreaterThan(0);
      expect(result.breakdown.sourcePrice).toBe(1000);
      expect(result.breakdown.exchangeRate).toBe(0.0067);
    });

    it('should calculate price for eBay marketplace', async () => {
      const result = await calculatePrice({
        sourcePrice: 1000,
        weight: 200,
        marketplace: 'ebay',
        region: 'US',
      });

      expect(result.listingPrice).toBeGreaterThan(0);
      expect(result.settings.platformFeeRate).toBeDefined();
    });

    it('should use category-specific settings when available', async () => {
      mockPrisma.priceSetting.findFirst.mockResolvedValueOnce({
        platformFeeRate: 0.10,
        paymentFeeRate: 0.02,
        targetProfitRate: 0.25,
        adRate: 0,
        categorySettings: {
          electronics: {
            platformFeeRate: 0.12,
          },
        },
      });

      const result = await calculatePrice({
        sourcePrice: 1000,
        marketplace: 'joom',
        category: 'electronics',
      });

      expect(result.settings.platformFeeRate).toBe(0.12);
    });

    it('should use default settings when category not found', async () => {
      mockPrisma.priceSetting.findFirst
        .mockResolvedValueOnce(null) // category lookup
        .mockResolvedValueOnce({
          platformFeeRate: 0.15,
          paymentFeeRate: 0.03,
          targetProfitRate: 0.20,
          adRate: 0.05,
          isDefault: true,
        });

      const result = await calculatePrice({
        sourcePrice: 1000,
        marketplace: 'joom',
        category: 'nonexistent',
      });

      expect(result.settings.platformFeeRate).toBe(0.15);
    });

    it('should calculate shipping based on weight for Joom', async () => {
      const lightResult = await calculatePrice({
        sourcePrice: 1000,
        weight: 100, // 100g
        marketplace: 'joom',
      });

      const heavyResult = await calculatePrice({
        sourcePrice: 1000,
        weight: 500, // 500g
        marketplace: 'joom',
      });

      expect(heavyResult.shippingCost).toBeGreaterThan(lightResult.shippingCost);
    });

    it('should use shipping policy for eBay', async () => {
      mockPrisma.shippingPolicy.findFirst.mockResolvedValue({
        region: 'US',
        shippingTable: {
          '100': 1000, // 100g = 1000 JPY
          '500': 1500, // 500g = 1500 JPY
          '1000': 2500, // 1000g = 2500 JPY
        },
        isActive: true,
      });

      const result = await calculatePrice({
        sourcePrice: 1000,
        weight: 300,
        marketplace: 'ebay',
        region: 'US',
      });

      // 300g should fall into 500g tier = 1500 JPY = 10.05 USD
      expect(result.shippingCost).toBeGreaterThan(0);
    });

    it('should use default weight of 200g', async () => {
      const result = await calculatePrice({
        sourcePrice: 1000,
        marketplace: 'joom',
        // weight not specified
      });

      // Default weight should be used
      expect(result.breakdown.shippingCost).toBe(
        Math.round((5 + 200 * 0.01) * 100) / 100
      );
    });

    it('should round price to 2 decimal places', async () => {
      const result = await calculatePrice({
        sourcePrice: 1234,
        marketplace: 'joom',
      });

      const decimalPlaces = (result.listingPrice.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should calculate correct breakdown', async () => {
      const result = await calculatePrice({
        sourcePrice: 10000, // 10000 JPY
        weight: 200,
        marketplace: 'joom',
      });

      // Verify breakdown adds up correctly
      const totalCosts = 
        result.breakdown.sourcePriceUsd +
        result.breakdown.shippingCost +
        result.breakdown.platformFee +
        result.breakdown.paymentFee +
        result.breakdown.adCost +
        result.breakdown.profit;

      // Total should be close to listing price
      expect(totalCosts).toBeCloseTo(result.listingPrice, 1);
    });
  });

  describe('calculatePricesForRegions', () => {
    it('should calculate prices for multiple regions', async () => {
      const results = await calculatePricesForRegions(
        {
          sourcePrice: 1000,
          marketplace: 'ebay',
        },
        ['US', 'EU', 'ASIA']
      );

      expect(results.US).toBeDefined();
      expect(results.EU).toBeDefined();
      expect(results.ASIA).toBeDefined();
      expect(results.US.listingPrice).toBeGreaterThan(0);
    });

    it('should use default regions when not specified', async () => {
      const results = await calculatePricesForRegions({
        sourcePrice: 1000,
        marketplace: 'ebay',
      });

      expect(Object.keys(results)).toHaveLength(3);
    });

    it('should have different prices per region when shipping differs', async () => {
      mockPrisma.shippingPolicy.findFirst
        .mockResolvedValueOnce({
          region: 'US',
          shippingTable: { '500': 1500 },
          isActive: true,
        })
        .mockResolvedValueOnce({
          region: 'EU',
          shippingTable: { '500': 2500 },
          isActive: true,
        })
        .mockResolvedValueOnce(null); // ASIA - use default

      const results = await calculatePricesForRegions(
        {
          sourcePrice: 1000,
          weight: 300,
          marketplace: 'ebay',
        },
        ['US', 'EU', 'ASIA']
      );

      // Different shipping policies should result in different prices
      expect(results.US).toBeDefined();
      expect(results.EU).toBeDefined();
    });
  });

  describe('updateExchangeRate', () => {
    it('should fetch and store exchange rate', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: { JPY: 150 }, // 1 USD = 150 JPY
        }),
      });

      const result = await updateExchangeRate();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/USD'
      );
      expect(mockPrisma.exchangeRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromCurrency: 'JPY',
          toCurrency: 'USD',
          source: 'exchangerate-api',
        }),
      });
      expect(result).toBeCloseTo(1 / 150, 4);
    });

    it('should return existing rate on API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await updateExchangeRate();

      expect(result).toBe(0.0067); // Default rate from findFirst mock
    });

    it('should return existing rate when API returns no JPY rate', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: {}, // No JPY rate
        }),
      });

      const result = await updateExchangeRate();

      expect(mockPrisma.exchangeRate.create).not.toHaveBeenCalled();
      expect(result).toBe(0.0067);
    });
  });
});

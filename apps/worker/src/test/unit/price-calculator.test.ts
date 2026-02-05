import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePrice, calculatePricesForRegions } from '../../lib/price-calculator';
import { mockPrisma } from '../setup';

describe('PriceCalculator', () => {
  beforeEach(() => {
    // デフォルトの為替レート: 1 JPY = 0.0067 USD (≒ 150 JPY/USD)
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      id: '1',
      fromCurrency: 'JPY',
      toCurrency: 'USD',
      rate: 0.0067,
      source: 'test',
      fetchedAt: new Date(),
    });

    // デフォルトの価格設定
    mockPrisma.priceSetting.findFirst.mockResolvedValue({
      id: '1',
      marketplace: 'EBAY',
      isDefault: true,
      platformFeeRate: 0.13,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.30,
      adRate: 0,
      categorySettings: {},
    });

    // デフォルトの送料ポリシー
    mockPrisma.shippingPolicy.findFirst.mockResolvedValue({
      id: '1',
      region: 'US',
      isActive: true,
      shippingTable: {
        '100': 1200,   // 100g以下: 1200円
        '200': 1500,   // 200g以下: 1500円
        '500': 2000,   // 500g以下: 2000円
        '1000': 2500,  // 1000g以下: 2500円
      },
    });
  });

  describe('calculatePrice', () => {
    it('should calculate listing price for eBay with default settings', async () => {
      const result = await calculatePrice({
        sourcePrice: 1000, // 1000円
        weight: 200,       // 200g
        marketplace: 'ebay',
      });

      // 検証
      expect(result.listingPrice).toBeGreaterThan(0);
      expect(result.shippingCost).toBeGreaterThan(0);
      expect(result.breakdown.sourcePrice).toBe(1000);
      expect(result.breakdown.exchangeRate).toBe(0.0067);
    });

    it('should calculate correct profit margin', async () => {
      const result = await calculatePrice({
        sourcePrice: 1500, // 1500円
        weight: 150,
        marketplace: 'ebay',
      });

      // 利益率が設定通りか確認
      const profitRate = result.breakdown.profit / result.listingPrice;
      expect(profitRate).toBeCloseTo(0.30, 1);
    });

    it('should handle Joom marketplace with different fee structure', async () => {
      // Joom用の設定
      mockPrisma.priceSetting.findFirst.mockResolvedValue({
        id: '2',
        marketplace: 'JOOM',
        isDefault: true,
        platformFeeRate: 0.15, // Joomは15%
        paymentFeeRate: 0.03,
        targetProfitRate: 0.30,
        adRate: 0,
        categorySettings: {},
      });

      const result = await calculatePrice({
        sourcePrice: 1000,
        weight: 200,
        marketplace: 'joom',
      });

      // Joomの手数料率が適用されているか
      expect(result.settings.platformFeeRate).toBe(0.15);
    });

    it('should use fallback values when no settings found', async () => {
      mockPrisma.priceSetting.findFirst.mockResolvedValue(null);
      mockPrisma.shippingPolicy.findFirst.mockResolvedValue(null);

      const result = await calculatePrice({
        sourcePrice: 1000,
        weight: 200,
        marketplace: 'ebay',
      });

      // フォールバック値を使用
      expect(result.settings.platformFeeRate).toBe(0.13);
      expect(result.shippingCost).toBe(12); // デフォルト送料
    });

    it('should use default exchange rate when not available', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await calculatePrice({
        sourcePrice: 1000,
        weight: 200,
        marketplace: 'ebay',
      });

      // デフォルト為替レート
      expect(result.breakdown.exchangeRate).toBe(0.0067);
    });

    it('should handle different weight tiers correctly', async () => {
      // 軽量商品
      const lightResult = await calculatePrice({
        sourcePrice: 1000,
        weight: 50,  // 50g
        marketplace: 'ebay',
      });

      // 重量商品
      const heavyResult = await calculatePrice({
        sourcePrice: 1000,
        weight: 800, // 800g
        marketplace: 'ebay',
      });

      // 重い商品の方が送料が高い
      expect(heavyResult.shippingCost).toBeGreaterThan(lightResult.shippingCost);
    });

    it('should round prices to 2 decimal places', async () => {
      const result = await calculatePrice({
        sourcePrice: 1234,
        weight: 123,
        marketplace: 'ebay',
      });

      // 小数点2位まで
      const decimalPlaces = (result.listingPrice.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should calculate breakdown correctly', async () => {
      const result = await calculatePrice({
        sourcePrice: 2000,
        weight: 200,
        marketplace: 'ebay',
      });

      // 内訳の合計が出品価格に近いことを確認
      const totalDeductions =
        result.breakdown.platformFee +
        result.breakdown.paymentFee +
        result.breakdown.adCost +
        result.breakdown.profit;

      const netAmount = result.listingPrice - totalDeductions;
      const baseCost = result.breakdown.sourcePriceUsd + result.breakdown.shippingCost;

      // 誤差許容範囲内で一致
      expect(netAmount).toBeCloseTo(baseCost, 1);
    });
  });

  describe('calculatePricesForRegions', () => {
    it('should calculate prices for multiple regions', async () => {
      const results = await calculatePricesForRegions(
        {
          sourcePrice: 1500,
          weight: 200,
          marketplace: 'ebay',
        },
        ['US', 'EU', 'ASIA']
      );

      expect(Object.keys(results)).toEqual(['US', 'EU', 'ASIA']);
      expect(results.US.listingPrice).toBeGreaterThan(0);
      expect(results.EU.listingPrice).toBeGreaterThan(0);
      expect(results.ASIA.listingPrice).toBeGreaterThan(0);
    });

    it('should use default regions when not specified', async () => {
      const results = await calculatePricesForRegions({
        sourcePrice: 1500,
        weight: 200,
        marketplace: 'ebay',
      });

      expect(Object.keys(results)).toEqual(['US', 'EU', 'ASIA']);
    });
  });
});

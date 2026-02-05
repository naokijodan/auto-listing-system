import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatestExchangeRate } from '../../lib/exchange-rate';
import { mockPrisma } from '../setup';

describe('Exchange Rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestExchangeRate', () => {
    it('should return latest exchange rate from database', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: '1',
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        rate: 0.0067,
        source: 'exchangerate-api',
        fetchedAt: new Date('2026-02-05'),
      });

      const result = await getLatestExchangeRate();

      expect(result.jpyToUsd).toBe(0.0067);
      expect(result.source).toBe('exchangerate-api');
    });

    it('should return default values when no rate in database', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await getLatestExchangeRate();

      expect(result.jpyToUsd).toBe(0.0067);
      expect(result.usdToJpy).toBe(150);
      expect(result.source).toBe('default');
    });

    it('should calculate usdToJpy correctly', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.0066,
        fetchedAt: new Date(),
        source: 'test',
      });

      const result = await getLatestExchangeRate();

      expect(result.usdToJpy).toBeCloseTo(151.52, 1);
    });

    it('should include fetchedAt from database', async () => {
      const fetchedAt = new Date('2026-02-01');
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.0067,
        fetchedAt,
        source: 'yahoo-finance',
      });

      const result = await getLatestExchangeRate();

      expect(result.fetchedAt).toEqual(fetchedAt);
      expect(result.source).toBe('yahoo-finance');
    });
  });
});

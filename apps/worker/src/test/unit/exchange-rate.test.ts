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
        updateMany: vi.fn(),
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
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
  },
}));

const originalFetch = globalThis.fetch;

import { updateExchangeRate, getLatestExchangeRate } from '../../lib/exchange-rate';

describe('Exchange Rate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    process.env = { ...originalEnv };
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);
    mockPrisma.exchangeRate.create.mockResolvedValue({});
    mockPrisma.priceSetting.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('updateExchangeRate', () => {
    it('should update exchange rate from API', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          conversion_rate: 0.0068,
        }),
      });

      const result = await updateExchangeRate();

      expect(result.success).toBe(true);
      expect(result.newRate).toBe(0.0068);
      expect(result.source).toBe('exchangerate-api');
    });

    it('should create exchange rate record in database', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          conversion_rate: 0.0068,
        }),
      });

      await updateExchangeRate();

      expect(mockPrisma.exchangeRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromCurrency: 'JPY',
          toCurrency: 'USD',
          rate: 0.0068,
          source: 'exchangerate-api',
        }),
      });
    });

    it('should update price settings', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          conversion_rate: 0.0068,
        }),
      });

      await updateExchangeRate();

      expect(mockPrisma.priceSetting.updateMany).toHaveBeenCalled();
    });

    it('should fallback to Yahoo Finance on API error', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 0.0069,
                  },
                },
              ],
            },
          }),
        });

      const result = await updateExchangeRate();

      expect(result.success).toBe(true);
      expect(result.newRate).toBe(0.0069);
      expect(result.source).toBe('yahoo-finance');
    });

    it('should return old rate if all APIs fail', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.0067,
        fetchedAt: new Date(),
        source: 'exchangerate-api',
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await updateExchangeRate();

      expect(result.success).toBe(false);
      expect(result.oldRate).toBe(0.0067);
      expect(result.newRate).toBe(0.0067);
    });

    it('should use default rate if no API key configured', async () => {
      delete process.env.EXCHANGE_RATE_API_KEY;

      mockFetch.mockRejectedValue(new Error('No API'));

      const result = await updateExchangeRate();

      expect(result.success).toBe(false);
      expect(result.oldRate).toBe(0.0067); // default
    });

    it('should handle API returning error result', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: 'error',
            'error-type': 'invalid-key',
          }),
        })
        .mockRejectedValueOnce(new Error('Yahoo also failed'));

      const result = await updateExchangeRate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return old and new rates', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.0065,
        fetchedAt: new Date(),
        source: 'exchangerate-api',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          conversion_rate: 0.0070,
        }),
      });

      const result = await updateExchangeRate();

      expect(result.oldRate).toBe(0.0065);
      expect(result.newRate).toBe(0.0070);
    });

    it('should handle Yahoo API returning non-ok response', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
        });

      const result = await updateExchangeRate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Yahoo API returning response without quote', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    // No regularMarketPrice
                  },
                },
              ],
            },
          }),
        });

      const result = await updateExchangeRate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getLatestExchangeRate', () => {
    it('should return latest rate from database', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.0068,
        fetchedAt: new Date('2026-02-09T10:00:00Z'),
        source: 'exchangerate-api',
      });

      const result = await getLatestExchangeRate();

      expect(result.jpyToUsd).toBe(0.0068);
      expect(result.usdToJpy).toBeCloseTo(147.06, 0);
      expect(result.source).toBe('exchangerate-api');
    });

    it('should return default rate if no rate in database', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await getLatestExchangeRate();

      expect(result.jpyToUsd).toBe(0.0067);
      expect(result.source).toBe('default');
    });

    it('should query database with correct parameters', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      await getLatestExchangeRate();

      expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          fromCurrency: 'JPY',
          toCurrency: 'USD',
        },
        orderBy: {
          fetchedAt: 'desc',
        },
      });
    });

    it('should calculate inverse rate correctly', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        rate: 0.01, // 1 JPY = 0.01 USD, so 1 USD = 100 JPY
        fetchedAt: new Date(),
        source: 'test',
      });

      const result = await getLatestExchangeRate();

      expect(result.jpyToUsd).toBe(0.01);
      expect(result.usdToJpy).toBe(100);
    });
  });
});

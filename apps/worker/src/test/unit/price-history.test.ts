import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockPriceHistoryCreate,
  mockPriceHistoryFindMany,
  mockPriceHistoryFindFirst,
  mockPriceHistoryAggregate,
  mockPriceHistoryCreateMany,
  mockCompetitorPriceLogCreate,
  mockCompetitorPriceLogFindMany,
  mockPriceChangeLogCreate,
  mockPriceChangeLogFindMany,
} = vi.hoisted(() => ({
  mockPriceHistoryCreate: vi.fn(),
  mockPriceHistoryFindMany: vi.fn(),
  mockPriceHistoryFindFirst: vi.fn(),
  mockPriceHistoryAggregate: vi.fn(),
  mockPriceHistoryCreateMany: vi.fn(),
  mockCompetitorPriceLogCreate: vi.fn(),
  mockCompetitorPriceLogFindMany: vi.fn(),
  mockPriceChangeLogCreate: vi.fn(),
  mockPriceChangeLogFindMany: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    priceHistory: {
      create: mockPriceHistoryCreate,
      findMany: mockPriceHistoryFindMany,
      findFirst: mockPriceHistoryFindFirst,
      aggregate: mockPriceHistoryAggregate,
      createMany: mockPriceHistoryCreateMany,
    },
    competitorPriceLog: {
      create: mockCompetitorPriceLogCreate,
      findMany: mockCompetitorPriceLogFindMany,
    },
    priceChangeLog: {
      create: mockPriceChangeLogCreate,
      findMany: mockPriceChangeLogFindMany,
    },
  },
}));

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

import { priceHistoryService as priceHistory } from '../../lib/pricing/price-history';

describe('Price History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordPrice', () => {
    it('should record a price entry', async () => {
      const mockEntry = {
        id: 'entry-1',
        listingId: 'listing-1',
        price: 100,
        source: 'manual',
        metadata: null,
        recordedAt: new Date(),
      };
      mockPriceHistoryCreate.mockResolvedValueOnce(mockEntry);

      const result = await priceHistory.recordPrice('listing-1', 100, 'manual');

      expect(mockPriceHistoryCreate).toHaveBeenCalledWith({
        data: {
          listingId: 'listing-1',
          price: 100,
          source: 'manual',
          metadata: undefined,
        },
      });
      expect(result).toEqual(mockEntry);
    });

    it('should record price with metadata', async () => {
      const mockEntry = {
        id: 'entry-1',
        listingId: 'listing-1',
        price: 150,
        source: 'rule',
        metadata: { ruleId: 'rule-1' },
        recordedAt: new Date(),
      };
      mockPriceHistoryCreate.mockResolvedValueOnce(mockEntry);

      const result = await priceHistory.recordPrice('listing-1', 150, 'rule', { ruleId: 'rule-1' });

      expect(mockPriceHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { ruleId: 'rule-1' },
        }),
      });
      expect(result.metadata).toEqual({ ruleId: 'rule-1' });
    });
  });

  describe('getHistory', () => {
    it('should return price history for listing', async () => {
      const mockEntries = [
        { id: '1', listingId: 'listing-1', price: 120, recordedAt: new Date() },
        { id: '2', listingId: 'listing-1', price: 100, recordedAt: new Date() },
      ];
      mockPriceHistoryFindMany.mockResolvedValueOnce(mockEntries);

      const result = await priceHistory.getHistory('listing-1', 30);

      expect(mockPriceHistoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingId: 'listing-1',
          }),
          orderBy: { recordedAt: 'desc' },
          take: 1000,
        })
      );
      expect(result).toEqual(mockEntries);
    });

    it('should use custom limit', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([]);

      await priceHistory.getHistory('listing-1', 30, 500);

      expect(mockPriceHistoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      );
    });
  });

  describe('getLatestPrice', () => {
    it('should return latest price', async () => {
      mockPriceHistoryFindFirst.mockResolvedValueOnce({ price: 150 });

      const result = await priceHistory.getLatestPrice('listing-1');

      expect(result).toBe(150);
    });

    it('should return null when no history', async () => {
      mockPriceHistoryFindFirst.mockResolvedValueOnce(null);

      const result = await priceHistory.getLatestPrice('listing-1');

      expect(result).toBeNull();
    });
  });

  describe('getAveragePrice', () => {
    it('should return average price', async () => {
      mockPriceHistoryAggregate.mockResolvedValueOnce({ _avg: { price: 125.5 } });

      const result = await priceHistory.getAveragePrice('listing-1', 30);

      expect(result).toBe(125.5);
    });

    it('should return 0 when no data', async () => {
      mockPriceHistoryAggregate.mockResolvedValueOnce({ _avg: { price: null } });

      const result = await priceHistory.getAveragePrice('listing-1', 30);

      expect(result).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return null for empty history', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([]);

      const result = await priceHistory.getStatistics('listing-1', 30);

      expect(result).toBeNull();
    });

    it('should calculate statistics correctly', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([
        { price: 150, recordedAt: new Date() }, // newest
        { price: 120, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() }, // oldest
      ]);

      const result = await priceHistory.getStatistics('listing-1', 30);

      expect(result).not.toBeNull();
      expect(result!.count).toBe(3);
      expect(result!.minPrice).toBe(100);
      expect(result!.maxPrice).toBe(150);
      expect(result!.avgPrice).toBeCloseTo(123.33, 1);
      expect(result!.trend).toBe('up'); // 150 vs 100 = +50%
      expect(result!.trendPercent).toBe(50);
    });

    it('should detect downward trend', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([
        { price: 80, recordedAt: new Date() },  // newest
        { price: 90, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() }, // oldest
      ]);

      const result = await priceHistory.getStatistics('listing-1', 30);

      expect(result!.trend).toBe('down');
      expect(result!.trendPercent).toBe(-20);
    });

    it('should detect stable trend', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([
        { price: 101, recordedAt: new Date() }, // newest
        { price: 100, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() }, // oldest
      ]);

      const result = await priceHistory.getStatistics('listing-1', 30);

      expect(result!.trend).toBe('stable');
    });

    it('should calculate standard deviation', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([
        { price: 100, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() },
      ]);

      const result = await priceHistory.getStatistics('listing-1', 30);

      expect(result!.stdDev).toBe(0); // No variance
    });
  });

  describe('getPriceVolatility', () => {
    it('should return volatility from statistics', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([
        { price: 110, recordedAt: new Date() },
        { price: 100, recordedAt: new Date() },
        { price: 90, recordedAt: new Date() },
      ]);

      const result = await priceHistory.getPriceVolatility('listing-1', 30);

      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when no history', async () => {
      mockPriceHistoryFindMany.mockResolvedValueOnce([]);

      const result = await priceHistory.getPriceVolatility('listing-1', 30);

      expect(result).toBe(0);
    });
  });

  describe('recordCompetitorPrice', () => {
    it('should record competitor price', async () => {
      mockCompetitorPriceLogCreate.mockResolvedValueOnce({});

      await priceHistory.recordCompetitorPrice('competitor-123', 150, {
        marketplace: 'EBAY',
        title: 'Competitor Product',
      });

      expect(mockCompetitorPriceLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          competitorIdentifier: 'competitor-123',
          price: 150,
          marketplace: 'EBAY',
          title: 'Competitor Product',
        }),
      });
    });

    it('should record with optional fields', async () => {
      mockCompetitorPriceLogCreate.mockResolvedValueOnce({});

      await priceHistory.recordCompetitorPrice('comp-1', 200, {
        marketplace: 'JOOM',
        listingId: 'listing-1',
        productId: 'product-1',
        url: 'https://example.com/product',
        metadata: { source: 'scraper' },
      });

      expect(mockCompetitorPriceLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          listingId: 'listing-1',
          productId: 'product-1',
          url: 'https://example.com/product',
          metadata: { source: 'scraper' },
        }),
      });
    });
  });

  describe('getCompetitorHistory', () => {
    it('should return competitor price history', async () => {
      const mockHistory = [
        { competitorIdentifier: 'comp-1', price: 100, marketplace: 'EBAY', title: 'Product', url: null, recordedAt: new Date() },
      ];
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce(mockHistory);

      const result = await priceHistory.getCompetitorHistory('listing-1', 30);

      expect(result).toEqual(mockHistory);
    });
  });

  describe('logPriceChange', () => {
    it('should log price change', async () => {
      mockPriceChangeLogCreate.mockResolvedValueOnce({});

      await priceHistory.logPriceChange('listing-1', 100, 120, 'rule');

      expect(mockPriceChangeLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          listingId: 'listing-1',
          oldPrice: 100,
          newPrice: 120,
          changePercent: 20, // 20% increase
          source: 'rule',
          platformUpdated: false,
        }),
      });
    });

    it('should log with optional fields', async () => {
      mockPriceChangeLogCreate.mockResolvedValueOnce({});

      await priceHistory.logPriceChange('listing-1', 100, 90, 'ai', {
        recommendationId: 'rec-1',
        ruleId: 'rule-1',
        reason: 'Price optimization',
        platformUpdated: true,
      });

      expect(mockPriceChangeLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recommendationId: 'rec-1',
          ruleId: 'rule-1',
          reason: 'Price optimization',
          platformUpdated: true,
        }),
      });
    });

    it('should calculate negative change percent', async () => {
      mockPriceChangeLogCreate.mockResolvedValueOnce({});

      await priceHistory.logPriceChange('listing-1', 100, 80, 'manual');

      expect(mockPriceChangeLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changePercent: -20,
        }),
      });
    });

    it('should handle zero old price', async () => {
      mockPriceChangeLogCreate.mockResolvedValueOnce({});

      await priceHistory.logPriceChange('listing-1', 0, 100, 'initial');

      expect(mockPriceChangeLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changePercent: 0,
        }),
      });
    });
  });

  describe('getPriceChangeHistory', () => {
    it('should return price change history', async () => {
      const mockHistory = [
        { id: '1', oldPrice: 100, newPrice: 120, changePercent: 20, source: 'rule', reason: null, createdAt: new Date() },
      ];
      mockPriceChangeLogFindMany.mockResolvedValueOnce(mockHistory);

      const result = await priceHistory.getPriceChangeHistory('listing-1', 30);

      expect(result).toEqual(mockHistory);
    });
  });

  describe('recordPricesBulk', () => {
    it('should record multiple prices', async () => {
      mockPriceHistoryCreateMany.mockResolvedValueOnce({ count: 3 });

      const entries = [
        { listingId: 'listing-1', price: 100, source: 'auto' as const },
        { listingId: 'listing-2', price: 200, source: 'auto' as const },
        { listingId: 'listing-3', price: 150, source: 'auto' as const },
      ];

      const result = await priceHistory.recordPricesBulk(entries);

      expect(result).toBe(3);
      expect(mockPriceHistoryCreateMany).toHaveBeenCalled();
    });
  });
});

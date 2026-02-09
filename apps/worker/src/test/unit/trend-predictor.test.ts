import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockOrderFindMany,
  mockListingFindMany,
  mockPriceChangeLogFindMany,
  mockSaleFindMany,
  mockCompetitorTrackerFindUnique,
  mockCompetitorPriceLogFindMany,
} = vi.hoisted(() => ({
  mockOrderFindMany: vi.fn(),
  mockListingFindMany: vi.fn(),
  mockPriceChangeLogFindMany: vi.fn(),
  mockSaleFindMany: vi.fn(),
  mockCompetitorTrackerFindUnique: vi.fn(),
  mockCompetitorPriceLogFindMany: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    order: {
      findMany: mockOrderFindMany,
    },
    listing: {
      findMany: mockListingFindMany,
    },
    priceChangeLog: {
      findMany: mockPriceChangeLogFindMany,
    },
    sale: {
      findMany: mockSaleFindMany,
    },
    competitorTracker: {
      findUnique: mockCompetitorTrackerFindUnique,
    },
    competitorPriceLog: {
      findMany: mockCompetitorPriceLogFindMany,
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

import { trendPredictor } from '../../lib/analytics/trend-predictor';

describe('Trend Predictor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forecastSales', () => {
    it('should return empty array with insufficient data', async () => {
      // Less than 7 days of data
      mockOrderFindMany.mockResolvedValueOnce([
        { createdAt: new Date(), total: 100 },
        { createdAt: new Date(), total: 150 },
      ]);

      const result = await trendPredictor.forecastSales(7);

      expect(result).toEqual([]);
    });

    it('should generate forecasts for specified days', async () => {
      // Generate 30 days of orders
      const orders = [];
      const baseDate = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        orders.push({ createdAt: date, total: 100 + Math.random() * 50 });
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.forecastSales(7);

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('predictedOrders');
      expect(result[0]).toHaveProperty('predictedRevenue');
      expect(result[0]).toHaveProperty('confidence');
    });

    it('should have decreasing confidence for future predictions', async () => {
      // Generate 30 days of orders with consistent daily orders
      const orders = [];
      const baseDate = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        // Add 2 orders per day
        orders.push({ createdAt: date, total: 100 });
        orders.push({ createdAt: date, total: 150 });
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.forecastSales(7);

      expect(result).toHaveLength(7);
      // First prediction should have higher confidence than last
      expect(result[0].confidence).toBeGreaterThanOrEqual(result[6].confidence);
    });

    it('should return non-negative predicted values', async () => {
      const orders = [];
      const baseDate = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        orders.push({ createdAt: date, total: 50 });
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.forecastSales(7);

      for (const forecast of result) {
        expect(forecast.predictedOrders).toBeGreaterThanOrEqual(0);
        expect(forecast.predictedRevenue).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('analyzePriceTrends', () => {
    it('should analyze active listings', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          listingPrice: 100,
          product: { price: 60 },
        },
        {
          id: 'listing-2',
          listingPrice: 200,
          product: { price: 150 },
        },
      ]);
      mockPriceChangeLogFindMany.mockResolvedValueOnce([]);
      mockSaleFindMany.mockResolvedValueOnce([]);

      const result = await trendPredictor.analyzePriceTrends();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('listingId');
      expect(result[0]).toHaveProperty('currentPrice');
      expect(result[0]).toHaveProperty('recommendedPrice');
      expect(result[0]).toHaveProperty('expectedImpact');
      expect(result[0]).toHaveProperty('confidence');
    });

    it('should filter by listing IDs when provided', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          listingPrice: 100,
          product: { price: 60 },
        },
      ]);
      mockPriceChangeLogFindMany.mockResolvedValueOnce([]);
      mockSaleFindMany.mockResolvedValueOnce([]);

      await trendPredictor.analyzePriceTrends(['listing-1']);

      expect(mockListingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['listing-1'] },
          }),
        })
      );
    });

    it('should recommend price decrease for high margin with high elasticity', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          listingPrice: 200, // High margin (cost 60, margin > 70%)
          product: { price: 60 },
        },
      ]);
      // Multiple price decreases (indicates high elasticity)
      mockPriceChangeLogFindMany.mockResolvedValueOnce([
        { listingId: 'listing-1', oldPrice: 220, newPrice: 200 },
        { listingId: 'listing-1', oldPrice: 210, newPrice: 220 },
      ]);
      mockSaleFindMany.mockResolvedValueOnce([
        { listingId: 'listing-1', totalPrice: 200 },
      ]);

      const result = await trendPredictor.analyzePriceTrends();

      expect(result[0].recommendedPrice).toBeLessThanOrEqual(result[0].currentPrice);
    });

    it('should handle listings with zero price', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          listingPrice: 0,
          product: { price: 0 },
        },
      ]);
      mockPriceChangeLogFindMany.mockResolvedValueOnce([]);
      mockSaleFindMany.mockResolvedValueOnce([]);

      const result = await trendPredictor.analyzePriceTrends();

      expect(result[0].currentPrice).toBe(0);
      expect(result[0].recommendedPrice).toBe(0);
    });

    it('should return low confidence with few price changes', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          listingPrice: 100,
          product: { price: 60 },
        },
      ]);
      mockPriceChangeLogFindMany.mockResolvedValueOnce([]);
      mockSaleFindMany.mockResolvedValueOnce([]);

      const result = await trendPredictor.analyzePriceTrends();

      expect(result[0].confidence).toBe(0.4); // Low confidence due to no price change data
    });
  });

  describe('analyzeSeasonality', () => {
    it('should return patterns with no orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);

      const result = await trendPredictor.analyzeSeasonality();

      expect(result).toHaveProperty('weekdayPattern');
      expect(result).toHaveProperty('monthlyPattern');
      expect(result).toHaveProperty('hourlyPattern');
    });

    it('should calculate weekday pattern', async () => {
      const orders = [];
      // Add orders on different weekdays
      for (let i = 0; i < 7; i++) {
        const date = new Date('2026-02-09');
        date.setDate(date.getDate() + i);
        orders.push({ createdAt: date });
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.analyzeSeasonality();

      expect(result.weekdayPattern).toHaveProperty('Sunday');
      expect(result.weekdayPattern).toHaveProperty('Monday');
      expect(result.weekdayPattern).toHaveProperty('Saturday');
    });

    it('should calculate hourly pattern', async () => {
      const orders = [];
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date('2026-02-09');
        date.setHours(hour, 0, 0, 0);
        orders.push({ createdAt: date });
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.analyzeSeasonality();

      expect(Object.keys(result.hourlyPattern)).toHaveLength(24);
      expect(result.hourlyPattern).toHaveProperty('00:00');
      expect(result.hourlyPattern).toHaveProperty('12:00');
      expect(result.hourlyPattern).toHaveProperty('23:00');
    });

    it('should normalize patterns to percentages', async () => {
      const orders = [];
      // Add 10 orders on Sunday, 5 on Monday
      for (let i = 0; i < 10; i++) {
        orders.push({ createdAt: new Date('2026-02-08') }); // Sunday
      }
      for (let i = 0; i < 5; i++) {
        orders.push({ createdAt: new Date('2026-02-09') }); // Monday
      }
      mockOrderFindMany.mockResolvedValueOnce(orders);

      const result = await trendPredictor.analyzeSeasonality();

      const total = Object.values(result.weekdayPattern).reduce((sum, v) => sum + v, 0);
      expect(Math.round(total)).toBe(100);
    });
  });

  describe('forecastCompetitorPrices', () => {
    it('should return null for non-existent tracker', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce(null);

      const result = await trendPredictor.forecastCompetitorPrices('non-existent');

      expect(result).toBeNull();
    });

    it('should return null with insufficient price data', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce({ id: 'tracker-1' });
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce([
        { price: 100, recordedAt: new Date() },
        { price: 105, recordedAt: new Date() },
      ]);

      const result = await trendPredictor.forecastCompetitorPrices('tracker-1');

      expect(result).toBeNull();
    });

    it('should forecast upward price trend', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce({ id: 'tracker-1' });
      // Prices increasing over time
      const priceLogs = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (9 - i));
        priceLogs.push({ price: 100 + i * 5, recordedAt: date });
      }
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce(priceLogs);

      const result = await trendPredictor.forecastCompetitorPrices('tracker-1');

      expect(result).not.toBeNull();
      expect(result!.currentPrice).toBe(145); // Last price
      expect(result!.priceDirection).toBe('up');
    });

    it('should forecast downward price trend', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce({ id: 'tracker-1' });
      // Prices decreasing over time
      const priceLogs = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (9 - i));
        priceLogs.push({ price: 200 - i * 10, recordedAt: date });
      }
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce(priceLogs);

      const result = await trendPredictor.forecastCompetitorPrices('tracker-1');

      expect(result).not.toBeNull();
      expect(result!.priceDirection).toBe('down');
    });

    it('should forecast stable price', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce({ id: 'tracker-1' });
      // Prices stable
      const priceLogs = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (9 - i));
        priceLogs.push({ price: 100, recordedAt: date });
      }
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce(priceLogs);

      const result = await trendPredictor.forecastCompetitorPrices('tracker-1');

      expect(result).not.toBeNull();
      expect(result!.priceDirection).toBe('stable');
    });

    it('should calculate confidence based on data points', async () => {
      mockCompetitorTrackerFindUnique.mockResolvedValueOnce({ id: 'tracker-1' });
      const priceLogs = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        priceLogs.push({ price: 100 + i, recordedAt: date });
      }
      mockCompetitorPriceLogFindMany.mockResolvedValueOnce(priceLogs);

      const result = await trendPredictor.forecastCompetitorPrices('tracker-1');

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(0.8); // Max confidence capped at 0.8
    });
  });
});

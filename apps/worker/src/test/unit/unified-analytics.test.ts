import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockProductCount,
  mockListingCount,
  mockListingFindMany,
  mockPriceRecommendationFindMany,
  mockPriceChangeLogFindMany,
  mockCompetitorTrackerFindMany,
  mockCompetitorAlertFindMany,
  mockCompetitorPriceLogFindMany,
  mockOrderFindMany,
} = vi.hoisted(() => ({
  mockProductCount: vi.fn(),
  mockListingCount: vi.fn(),
  mockListingFindMany: vi.fn(),
  mockPriceRecommendationFindMany: vi.fn(),
  mockPriceChangeLogFindMany: vi.fn(),
  mockCompetitorTrackerFindMany: vi.fn(),
  mockCompetitorAlertFindMany: vi.fn(),
  mockCompetitorPriceLogFindMany: vi.fn(),
  mockOrderFindMany: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    product: {
      count: mockProductCount,
    },
    listing: {
      count: mockListingCount,
      findMany: mockListingFindMany,
    },
    priceRecommendation: {
      findMany: mockPriceRecommendationFindMany,
    },
    priceChangeLog: {
      findMany: mockPriceChangeLogFindMany,
    },
    competitorTracker: {
      findMany: mockCompetitorTrackerFindMany,
    },
    competitorAlert: {
      findMany: mockCompetitorAlertFindMany,
    },
    competitorPriceLog: {
      findMany: mockCompetitorPriceLogFindMany,
    },
    order: {
      findMany: mockOrderFindMany,
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

import { unifiedAnalytics } from '../../lib/analytics/unified-analytics';

describe('Unified Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default empty mocks
    mockProductCount.mockResolvedValue(0);
    mockListingCount.mockResolvedValue(0);
    mockListingFindMany.mockResolvedValue([]);
    mockPriceRecommendationFindMany.mockResolvedValue([]);
    mockPriceChangeLogFindMany.mockResolvedValue([]);
    mockCompetitorTrackerFindMany.mockResolvedValue([]);
    mockCompetitorAlertFindMany.mockResolvedValue([]);
    mockCompetitorPriceLogFindMany.mockResolvedValue([]);
    mockOrderFindMany.mockResolvedValue([]);
  });

  describe('getDashboardSummary', () => {
    it('should return summary with all sections', async () => {
      mockProductCount.mockResolvedValueOnce(50);
      mockListingCount.mockResolvedValueOnce(30);
      mockListingFindMany.mockResolvedValueOnce([]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('pricing');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('inventory');
    });

    it('should calculate correct period', async () => {
      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.period.days).toBe(7);
      const diffMs = result.period.to.getTime() - result.period.from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    it('should calculate total revenue from orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100, sales: [] },
        { total: 200, sales: [] },
        { total: 150, sales: [] },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.overview.totalRevenue).toBe(450);
    });

    it('should calculate total profit from sales', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100, sales: [{ profitJpy: 20 }, { profitJpy: 15 }] },
        { total: 200, sales: [{ profitJpy: 50 }] },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.overview.totalProfit).toBe(85);
    });

    it('should calculate average margin percent', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        { listingPrice: 100, product: { price: 60 }, status: 'ACTIVE', createdAt: new Date() }, // 40% margin
        { listingPrice: 200, product: { price: 100 }, status: 'ACTIVE', createdAt: new Date() }, // 50% margin
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.overview.avgMarginPercent).toBe(45); // (40 + 50) / 2
    });

    it('should count price increases and decreases', async () => {
      mockPriceChangeLogFindMany.mockResolvedValueOnce([
        { oldPrice: 100, newPrice: 120 }, // increase
        { oldPrice: 100, newPrice: 80 },  // decrease
        { oldPrice: 100, newPrice: 110 }, // increase
        { oldPrice: 100, newPrice: 90 },  // decrease
        { oldPrice: 100, newPrice: 130 }, // increase
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.pricing.priceIncreases).toBe(3);
      expect(result.pricing.priceDecreases).toBe(2);
    });

    it('should count recommendations by status', async () => {
      mockPriceRecommendationFindMany.mockResolvedValueOnce([
        { status: 'APPLIED' },
        { status: 'APPLIED' },
        { status: 'PENDING' },
        { status: 'REJECTED' },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.pricing.recommendationsGenerated).toBe(4);
      expect(result.pricing.recommendationsApplied).toBe(2);
    });

    it('should count active competitor trackers', async () => {
      mockCompetitorTrackerFindMany.mockResolvedValueOnce([
        { id: '1', isActive: true },
        { id: '2', isActive: true },
        { id: '3', isActive: true },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.competitors.trackersActive).toBe(3);
    });

    it('should count pending competitor alerts', async () => {
      mockCompetitorAlertFindMany.mockResolvedValueOnce([
        { status: 'pending' },
        { status: 'pending' },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.competitors.alertsPending).toBe(2);
    });

    it('should calculate price advantage percentage', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        { id: 'listing-1', listingPrice: 80, status: 'ACTIVE', createdAt: new Date() },
        { id: 'listing-2', listingPrice: 120, status: 'ACTIVE', createdAt: new Date() },
      ]);
      mockCompetitorTrackerFindMany.mockResolvedValueOnce([
        { listingId: 'listing-1', lastPrice: 100, isActive: true }, // Our price is lower
        { listingId: 'listing-2', lastPrice: 100, isActive: true }, // Our price is higher
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.competitors.priceAdvantage).toBe(50); // 1 out of 2 = 50%
    });

    it('should identify stale items (30+ days old)', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      const newDate = new Date();
      newDate.setDate(newDate.getDate() - 10);

      mockListingFindMany.mockResolvedValueOnce([
        { id: '1', status: 'ACTIVE', createdAt: oldDate },
        { id: '2', status: 'ACTIVE', createdAt: oldDate },
        { id: '3', status: 'ACTIVE', createdAt: newDate },
      ]);

      const result = await unifiedAnalytics.getDashboardSummary(7);

      expect(result.inventory.staleItems).toBe(2);
    });
  });

  describe('getPricingTrend', () => {
    it('should return pricing trend structure', async () => {
      const result = await unifiedAnalytics.getPricingTrend(30);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('priceChanges');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('avgMargin');
    });

    it('should group price changes by day', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPriceChangeLogFindMany.mockResolvedValueOnce([
        { createdAt: today, oldPrice: 100, newPrice: 110 },
        { createdAt: today, oldPrice: 100, newPrice: 120 },
        { createdAt: yesterday, oldPrice: 100, newPrice: 90 },
      ]);

      const result = await unifiedAnalytics.getPricingTrend(30);

      expect(result.priceChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate average price change per day', async () => {
      const today = new Date();

      mockPriceChangeLogFindMany.mockResolvedValueOnce([
        { createdAt: today, oldPrice: 100, newPrice: 110 }, // +10%
        { createdAt: today, oldPrice: 100, newPrice: 120 }, // +20%
      ]);

      const result = await unifiedAnalytics.getPricingTrend(30);

      const todayData = result.priceChanges.find(p => p.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(15); // (10 + 20) / 2
    });

    it('should count recommendations per day', async () => {
      const today = new Date();

      mockPriceRecommendationFindMany.mockResolvedValueOnce([
        { createdAt: today },
        { createdAt: today },
        { createdAt: today },
      ]);

      const result = await unifiedAnalytics.getPricingTrend(30);

      const todayData = result.recommendations.find(r => r.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(3);
    });
  });

  describe('getCompetitorTrend', () => {
    it('should return competitor trend structure', async () => {
      const result = await unifiedAnalytics.getCompetitorTrend(30);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('priceGap');
      expect(result).toHaveProperty('alertCount');
      expect(result).toHaveProperty('checkCount');
    });

    it('should count alerts per day', async () => {
      const today = new Date();

      mockCompetitorAlertFindMany.mockResolvedValueOnce([
        { createdAt: today },
        { createdAt: today },
      ]);

      const result = await unifiedAnalytics.getCompetitorTrend(30);

      const todayData = result.alertCount.find(a => a.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(2);
    });

    it('should count price checks per day', async () => {
      const today = new Date();

      mockCompetitorPriceLogFindMany.mockResolvedValueOnce([
        { recordedAt: today, priceChangePercent: 5 },
        { recordedAt: today, priceChangePercent: -3 },
        { recordedAt: today, priceChangePercent: 0 },
      ]);

      const result = await unifiedAnalytics.getCompetitorTrend(30);

      const todayData = result.checkCount.find(c => c.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(3);
    });
  });

  describe('getSalesTrend', () => {
    it('should return sales trend structure', async () => {
      const result = await unifiedAnalytics.getSalesTrend(30);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('salesCount');
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('topCategories');
      expect(result).toHaveProperty('topProducts');
    });

    it('should count sales per day', async () => {
      const today = new Date();

      mockOrderFindMany.mockResolvedValueOnce([
        { createdAt: today, total: 100, marketplace: 'JOOM', sales: [] },
        { createdAt: today, total: 200, marketplace: 'JOOM', sales: [] },
      ]);

      const result = await unifiedAnalytics.getSalesTrend(30);

      const todayData = result.salesCount.find(s => s.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(2);
    });

    it('should calculate revenue per day', async () => {
      const today = new Date();

      mockOrderFindMany.mockResolvedValueOnce([
        { createdAt: today, total: 100, marketplace: 'JOOM', sales: [] },
        { createdAt: today, total: 250, marketplace: 'JOOM', sales: [] },
      ]);

      const result = await unifiedAnalytics.getSalesTrend(30);

      const todayData = result.revenue.find(r => r.date === today.toISOString().split('T')[0]);
      expect(todayData?.value).toBe(350);
    });

    it('should aggregate top categories by revenue', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { createdAt: new Date(), total: 100, marketplace: 'JOOM', sales: [] },
        { createdAt: new Date(), total: 200, marketplace: 'JOOM', sales: [] },
        { createdAt: new Date(), total: 150, marketplace: 'EBAY', sales: [] },
      ]);

      const result = await unifiedAnalytics.getSalesTrend(30);

      expect(result.topCategories).toHaveLength(2);
      expect(result.topCategories[0].category).toBe('JOOM');
      expect(result.topCategories[0].revenue).toBe(300);
      expect(result.topCategories[1].category).toBe('EBAY');
    });

    it('should aggregate top products by revenue', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        {
          createdAt: new Date(),
          total: 200,
          marketplace: 'JOOM',
          sales: [
            { sku: 'SKU-1', title: 'Product 1', totalPrice: 100 },
            { sku: 'SKU-2', title: 'Product 2', totalPrice: 100 },
          ],
        },
        {
          createdAt: new Date(),
          total: 150,
          marketplace: 'JOOM',
          sales: [
            { sku: 'SKU-1', title: 'Product 1', totalPrice: 150 },
          ],
        },
      ]);

      const result = await unifiedAnalytics.getSalesTrend(30);

      expect(result.topProducts.length).toBeGreaterThan(0);
      expect(result.topProducts[0].id).toBe('SKU-1');
      expect(result.topProducts[0].revenue).toBe(250); // 100 + 150
      expect(result.topProducts[0].count).toBe(2);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics structure', async () => {
      const result = await unifiedAnalytics.getPerformanceMetrics(7);

      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('avgOrderValue');
      expect(result).toHaveProperty('returnRate');
      expect(result).toHaveProperty('listingSuccessRate');
      expect(result).toHaveProperty('priceOptimizationImpact');
    });

    it('should calculate conversion rate', async () => {
      mockListingCount.mockResolvedValue(100);
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100 },
        { total: 200 },
        { total: 150 },
      ]);

      const result = await unifiedAnalytics.getPerformanceMetrics(7);

      expect(result.conversionRate).toBe(3); // 3 orders / 100 listings * 100
    });

    it('should calculate average order value', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100 },
        { total: 200 },
        { total: 300 },
      ]);

      const result = await unifiedAnalytics.getPerformanceMetrics(7);

      expect(result.avgOrderValue).toBe(200);
    });

    it('should handle zero orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);

      const result = await unifiedAnalytics.getPerformanceMetrics(7);

      expect(result.conversionRate).toBe(0);
      expect(result.avgOrderValue).toBe(0);
    });

    it('should handle zero listings', async () => {
      mockListingCount.mockResolvedValue(0);
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100 },
      ]);

      const result = await unifiedAnalytics.getPerformanceMetrics(7);

      expect(result.conversionRate).toBe(0);
    });
  });
});

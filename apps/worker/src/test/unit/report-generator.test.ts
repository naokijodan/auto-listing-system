import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockOrderFindMany, mockListingCount, mockPriceChangeLogCount, mockCompetitorAlertCount, mockPriceRecommendationFindMany } = vi.hoisted(() => ({
  mockOrderFindMany: vi.fn(),
  mockListingCount: vi.fn(),
  mockPriceChangeLogCount: vi.fn(),
  mockCompetitorAlertCount: vi.fn(),
  mockPriceRecommendationFindMany: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    order: {
      findMany: mockOrderFindMany,
    },
    listing: {
      count: mockListingCount,
    },
    priceChangeLog: {
      count: mockPriceChangeLogCount,
    },
    competitorAlert: {
      count: mockCompetitorAlertCount,
    },
    priceRecommendation: {
      findMany: mockPriceRecommendationFindMany,
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

vi.mock('./unified-analytics', () => ({
  unifiedAnalytics: {
    getDashboardSummary: vi.fn().mockResolvedValue({
      overview: { totalRevenue: 1000, totalProfit: 100, avgMarginPercent: 10, totalProducts: 50, activeListings: 30 },
      pricing: { recommendationsGenerated: 5, recommendationsApplied: 3, avgPriceChange: 2, priceIncreases: 2, priceDecreases: 1 },
      competitors: { trackersActive: 10, alertsPending: 2, avgCompetitorPriceChange: 1.5, priceAdvantage: 5 },
      inventory: { staleItems: 3 },
    }),
    getSalesTrend: vi.fn().mockResolvedValue({ salesCount: [], topCategories: [] }),
    getPricingTrend: vi.fn().mockResolvedValue({}),
    getCompetitorTrend: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('./trend-predictor', () => ({
  trendPredictor: {
    forecastSales: vi.fn().mockResolvedValue([]),
  },
}));

import { reportGenerator, GeneratedReport, ReportSection } from '../../lib/analytics/report-generator';

describe('Report Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatAsMarkdown', () => {
    it('should format daily report as markdown', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: '売上サマリー',
            data: { ordersCount: 10, totalRevenue: 500.50 },
            summary: '本日の注文数: 10件',
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('# 日次レポート');
      expect(markdown).toContain('**期間**:');
      expect(markdown).toContain('2026-02-09');
      expect(markdown).toContain('## 売上サマリー');
      expect(markdown).toContain('> 本日の注文数: 10件');
      expect(markdown).toContain('**ordersCount**: 10');
      expect(markdown).toContain('**totalRevenue**: 500.5');
    });

    it('should format weekly report as markdown', () => {
      const report: GeneratedReport = {
        id: 'weekly-2026-02-02',
        type: 'weekly',
        format: 'json',
        period: {
          from: new Date('2026-02-02T00:00:00.000Z'),
          to: new Date('2026-02-08T23:59:59.999Z'),
        },
        sections: [],
        generatedAt: new Date('2026-02-09T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('# 週次レポート');
    });

    it('should format monthly report as markdown', () => {
      const report: GeneratedReport = {
        id: 'monthly-2026-01',
        type: 'monthly',
        format: 'json',
        period: {
          from: new Date('2026-01-01T00:00:00.000Z'),
          to: new Date('2026-01-31T23:59:59.999Z'),
        },
        sections: [],
        generatedAt: new Date('2026-02-01T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('# 月次レポート');
    });

    it('should format array data as table', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'トップカテゴリ',
            data: [
              { category: 'Electronics', sales: 50 },
              { category: 'Clothing', sales: 30 },
            ],
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('| category | sales |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Electronics | 50 |');
      expect(markdown).toContain('| Clothing | 30 |');
    });

    it('should handle empty array data', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Empty Section',
            data: [],
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('## Empty Section');
      expect(markdown).not.toContain('| --- |');
    });

    it('should handle nested object in data', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Nested Data',
            data: {
              simple: 'value',
              nested: { a: 1, b: 2 },
            },
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const markdown = reportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('**simple**: value');
      expect(markdown).toContain('**nested**: {"a":1,"b":2}');
    });
  });

  describe('formatAsCsv', () => {
    it('should format report metadata', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const csv = reportGenerator.formatAsCsv(report);

      expect(csv).toContain('Report Type,daily');
      expect(csv).toContain('Period Start,2026-02-09');
      expect(csv).toContain('Period End,2026-02-09');
    });

    it('should format array data as CSV rows', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Sales Data',
            data: [
              { date: '2026-02-08', orders: 5, revenue: 100 },
              { date: '2026-02-09', orders: 8, revenue: 150 },
            ],
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const csv = reportGenerator.formatAsCsv(report);

      expect(csv).toContain('[Sales Data]');
      expect(csv).toContain('date,orders,revenue');
      expect(csv).toContain('2026-02-08,5,100');
      expect(csv).toContain('2026-02-09,8,150');
    });

    it('should format object data as key-value pairs', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Summary',
            data: {
              totalOrders: 50,
              totalRevenue: 1250.75,
            },
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const csv = reportGenerator.formatAsCsv(report);

      expect(csv).toContain('[Summary]');
      expect(csv).toContain('Key,Value');
      expect(csv).toContain('totalOrders,50');
      expect(csv).toContain('totalRevenue,1250.75');
    });

    it('should escape values containing commas', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Products',
            data: [
              { name: 'Item A, B, C', price: 100 },
            ],
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const csv = reportGenerator.formatAsCsv(report);

      expect(csv).toContain('"Item A, B, C"');
    });

    it('should handle nested objects in CSV', () => {
      const report: GeneratedReport = {
        id: 'daily-2026-02-09',
        type: 'daily',
        format: 'json',
        period: {
          from: new Date('2026-02-09T00:00:00.000Z'),
          to: new Date('2026-02-09T23:59:59.999Z'),
        },
        sections: [
          {
            title: 'Nested',
            data: {
              stats: { count: 10, avg: 5.5 },
            },
          },
        ],
        generatedAt: new Date('2026-02-10T00:00:00.000Z'),
      };

      const csv = reportGenerator.formatAsCsv(report);

      expect(csv).toContain('stats,{"count":10,"avg":5.5}');
    });
  });

  describe('generateDailyReport', () => {
    it('should generate daily report with sales data', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100, sales: [{ profitJpy: 20 }] },
        { total: 150, sales: [{ profitJpy: 30 }] },
      ]);
      mockListingCount.mockResolvedValueOnce(5);
      mockPriceChangeLogCount.mockResolvedValueOnce(10);
      mockCompetitorAlertCount.mockResolvedValueOnce(3);
      mockPriceRecommendationFindMany.mockResolvedValueOnce([
        { status: 'APPLIED' },
        { status: 'PENDING' },
      ]);

      const testDate = new Date('2026-02-09T12:00:00.000Z');
      const report = await reportGenerator.generateDailyReport(testDate);

      expect(report.type).toBe('daily');
      expect(report.id).toContain('daily-');
      expect(report.sections).toHaveLength(4);
      expect(report.sections[0].title).toBe('売上サマリー');
      expect(report.sections[0].data.ordersCount).toBe(2);
      expect(report.sections[0].data.totalRevenue).toBe(250);
      expect(report.sections[0].data.totalProfit).toBe(50);
    });

    it('should handle empty orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockListingCount.mockResolvedValueOnce(0);
      mockPriceChangeLogCount.mockResolvedValueOnce(0);
      mockCompetitorAlertCount.mockResolvedValueOnce(0);
      mockPriceRecommendationFindMany.mockResolvedValueOnce([]);

      const report = await reportGenerator.generateDailyReport();

      expect(report.sections[0].data.ordersCount).toBe(0);
      expect(report.sections[0].data.avgOrderValue).toBe(0);
    });

    it('should calculate average order value correctly', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { total: 100, sales: [] },
        { total: 200, sales: [] },
        { total: 300, sales: [] },
      ]);
      mockListingCount.mockResolvedValueOnce(0);
      mockPriceChangeLogCount.mockResolvedValueOnce(0);
      mockCompetitorAlertCount.mockResolvedValueOnce(0);
      mockPriceRecommendationFindMany.mockResolvedValueOnce([]);

      const report = await reportGenerator.generateDailyReport();

      expect(report.sections[0].data.avgOrderValue).toBe(200);
    });
  });

  describe('report section structure', () => {
    it('should have correct section structure', () => {
      const section: ReportSection = {
        title: 'Test Section',
        data: { key: 'value' },
        summary: 'Test summary',
      };

      expect(section.title).toBe('Test Section');
      expect(section.data).toEqual({ key: 'value' });
      expect(section.summary).toBe('Test summary');
    });

    it('should allow optional summary', () => {
      const section: ReportSection = {
        title: 'Test Section',
        data: [],
      };

      expect(section.summary).toBeUndefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const {
  mockProductCount,
  mockListingCount,
  mockJobLogFindMany,
  mockExchangeRateFindFirst,
  mockNotifyDailyReport,
} = vi.hoisted(() => ({
  mockProductCount: vi.fn(),
  mockListingCount: vi.fn(),
  mockJobLogFindMany: vi.fn(),
  mockExchangeRateFindFirst: vi.fn(),
  mockNotifyDailyReport: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    product: {
      count: mockProductCount,
    },
    listing: {
      count: mockListingCount,
    },
    jobLog: {
      findMany: mockJobLogFindMany,
    },
    exchangeRate: {
      findFirst: mockExchangeRateFindFirst,
    },
  },
}));

vi.mock('../../lib/notifications', () => ({
  notifyDailyReport: mockNotifyDailyReport,
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
  },
}));

// Import after mocks
import { generateDailyReport, sendDailyReportNotification, generateWeeklySummary } from '../../lib/daily-report';

describe('Daily Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock values
    mockProductCount.mockResolvedValue(0);
    mockListingCount.mockResolvedValue(0);
    mockJobLogFindMany.mockResolvedValue([]);
    mockExchangeRateFindFirst.mockResolvedValue(null);
  });

  describe('generateDailyReport', () => {
    it('should generate basic report with all zeros', async () => {
      const report = await generateDailyReport();

      expect(report).toMatchObject({
        products: {
          total: 0,
          new: 0,
          active: 0,
          outOfStock: 0,
          error: 0,
        },
        listings: {
          total: 0,
          published: 0,
          active: 0,
          sold: 0,
          ended: 0,
        },
        jobs: {
          total: 0,
          completed: 0,
          failed: 0,
        },
      });
    });

    it('should include product counts', async () => {
      mockProductCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // new
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(5) // out of stock
        .mockResolvedValueOnce(5); // error

      const report = await generateDailyReport();

      expect(report.products).toEqual({
        total: 100,
        new: 10,
        active: 80,
        outOfStock: 5,
        error: 5,
      });
    });

    it('should include listing counts', async () => {
      mockListingCount
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(20) // published today
        .mockResolvedValueOnce(180) // active
        .mockResolvedValueOnce(5) // sold today
        .mockResolvedValueOnce(3); // ended today

      const report = await generateDailyReport();

      expect(report.listings).toEqual({
        total: 200,
        published: 20,
        active: 180,
        sold: 5,
        ended: 3,
      });
    });

    it('should calculate job statistics', async () => {
      mockJobLogFindMany.mockResolvedValueOnce([
        { jobType: 'SCRAPE', status: 'COMPLETED' },
        { jobType: 'SCRAPE', status: 'COMPLETED' },
        { jobType: 'SCRAPE', status: 'FAILED' },
        { jobType: 'PUBLISH', status: 'COMPLETED' },
        { jobType: 'PUBLISH', status: 'FAILED' },
      ]);

      const report = await generateDailyReport();

      expect(report.jobs).toEqual({
        total: 5,
        completed: 3,
        failed: 2,
        byType: {
          SCRAPE: { completed: 2, failed: 1 },
          PUBLISH: { completed: 1, failed: 1 },
        },
      });
    });

    it('should detect inventory issues', async () => {
      mockJobLogFindMany
        .mockResolvedValueOnce([]) // All jobs
        .mockResolvedValueOnce([
          { result: { isAvailable: false } },
          { result: { isAvailable: true, priceChanged: true } },
          { result: { isAvailable: false, priceChanged: true } },
        ]); // Inventory logs

      const report = await generateDailyReport();

      expect(report.inventoryChecks).toEqual({
        total: 3,
        outOfStockDetected: 2,
        priceChangesDetected: 2,
      });
    });

    it('should calculate exchange rate change', async () => {
      mockExchangeRateFindFirst
        .mockResolvedValueOnce({ rate: 0.0067, fetchedAt: new Date() }) // current
        .mockResolvedValueOnce({ rate: 0.0065, fetchedAt: new Date() }); // previous

      const report = await generateDailyReport();

      expect(report.exchangeRate.current).toBeCloseTo(149.25, 0);
      expect(report.exchangeRate.previousDay).toBeCloseTo(153.85, 0);
    });

    it('should use default rate when no exchange rate exists', async () => {
      mockExchangeRateFindFirst.mockResolvedValue(null);

      const report = await generateDailyReport();

      // Default: 1 / 0.0067 = ~149.25
      expect(report.exchangeRate.current).toBeCloseTo(149.25, 0);
    });

    it('should aggregate error summary', async () => {
      mockJobLogFindMany
        .mockResolvedValueOnce([]) // All jobs
        .mockResolvedValueOnce([]) // Inventory logs
        .mockResolvedValueOnce([
          { jobType: 'SCRAPE', errorMessage: 'Page not found' },
          { jobType: 'SCRAPE', errorMessage: 'Timeout' },
          { jobType: 'PUBLISH', errorMessage: 'API error' },
        ]); // Error logs

      const report = await generateDailyReport();

      expect(report.errors).toHaveLength(2);
      expect(report.errors.find(e => e.type === 'SCRAPE')).toEqual({
        type: 'SCRAPE',
        count: 2,
        lastError: 'Timeout',
      });
    });

    it('should use provided date', async () => {
      const targetDate = new Date('2026-01-15T12:00:00Z');

      const report = await generateDailyReport(targetDate);

      // The date should be the start of day in local timezone
      expect(report.date).toMatch(/^2026-01-1[45]$/);
    });
  });

  describe('sendDailyReportNotification', () => {
    it('should generate and send report notification', async () => {
      mockProductCount
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      mockListingCount
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(185)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      mockJobLogFindMany
        .mockResolvedValueOnce([
          { jobType: 'JOB', status: 'COMPLETED' },
          { jobType: 'JOB', status: 'FAILED' },
        ])
        .mockResolvedValueOnce([{ result: { isAvailable: false } }])
        .mockResolvedValueOnce([]);

      mockNotifyDailyReport.mockResolvedValue(undefined);

      await sendDailyReportNotification();

      expect(mockNotifyDailyReport).toHaveBeenCalledWith(
        expect.objectContaining({
          newProducts: 5,
          publishedListings: 10,
          soldListings: 3,
          outOfStock: 1,
          errors: 1,
        })
      );
    });
  });

  describe('generateWeeklySummary', () => {
    it('should generate weekly summary with basic stats', async () => {
      mockProductCount.mockResolvedValueOnce(70); // new products
      mockListingCount
        .mockResolvedValueOnce(50) // published
        .mockResolvedValueOnce(15); // sold
      mockJobLogFindMany.mockResolvedValueOnce([]); // no errors

      const summary = await generateWeeklySummary();

      expect(summary.totalNewProducts).toBe(70);
      expect(summary.totalPublished).toBe(50);
      expect(summary.totalSold).toBe(15);
      expect(summary.totalErrors).toBe(0);
      expect(summary.avgDailyProducts).toBe(10); // 70 / 7
      expect(summary.topErrors).toEqual([]);
      expect(summary.week).toContain(' - ');
    });

    it('should calculate average daily products', async () => {
      mockProductCount.mockResolvedValueOnce(21);
      mockListingCount
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockJobLogFindMany.mockResolvedValueOnce([]);

      const summary = await generateWeeklySummary();

      expect(summary.avgDailyProducts).toBe(3); // 21 / 7 = 3
    });

    it('should aggregate top errors by job type', async () => {
      mockProductCount.mockResolvedValueOnce(0);
      mockListingCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockJobLogFindMany.mockResolvedValueOnce([
        { jobType: 'SCRAPE' },
        { jobType: 'SCRAPE' },
        { jobType: 'SCRAPE' },
        { jobType: 'PUBLISH' },
        { jobType: 'PUBLISH' },
        { jobType: 'TRANSLATE' },
      ]);

      const summary = await generateWeeklySummary();

      expect(summary.totalErrors).toBe(6);
      expect(summary.topErrors).toHaveLength(3);
      expect(summary.topErrors[0]).toEqual({ type: 'SCRAPE', count: 3 });
      expect(summary.topErrors[1]).toEqual({ type: 'PUBLISH', count: 2 });
      expect(summary.topErrors[2]).toEqual({ type: 'TRANSLATE', count: 1 });
    });

    it('should limit top errors to 5', async () => {
      mockProductCount.mockResolvedValueOnce(0);
      mockListingCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockJobLogFindMany.mockResolvedValueOnce([
        { jobType: 'TYPE1' },
        { jobType: 'TYPE2' },
        { jobType: 'TYPE3' },
        { jobType: 'TYPE4' },
        { jobType: 'TYPE5' },
        { jobType: 'TYPE6' },
        { jobType: 'TYPE7' },
      ]);

      const summary = await generateWeeklySummary();

      expect(summary.topErrors).toHaveLength(5);
    });

    it('should include date range in week field', async () => {
      mockProductCount.mockResolvedValueOnce(0);
      mockListingCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockJobLogFindMany.mockResolvedValueOnce([]);

      const summary = await generateWeeklySummary();

      // Week should be in format "YYYY-MM-DD - YYYY-MM-DD"
      expect(summary.week).toMatch(/^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/);
    });
  });
});

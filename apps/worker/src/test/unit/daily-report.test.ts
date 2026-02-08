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
import { generateDailyReport, sendDailyReportNotification } from '../../lib/daily-report';

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
});

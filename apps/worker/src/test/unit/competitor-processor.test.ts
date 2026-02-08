import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockGetTrackersToCheck,
  mockRecordPriceCheck,
  mockRecordError,
  mockScrape,
  mockHealthCheck,
} = vi.hoisted(() => ({
  mockGetTrackersToCheck: vi.fn(),
  mockRecordPriceCheck: vi.fn(),
  mockRecordError: vi.fn(),
  mockScrape: vi.fn(),
  mockHealthCheck: vi.fn(),
}));

vi.mock('../../lib/competitor/competitor-monitor', () => ({
  competitorMonitor: {
    getTrackersToCheck: mockGetTrackersToCheck,
    recordPriceCheck: mockRecordPriceCheck,
    recordError: mockRecordError,
  },
}));

vi.mock('../../lib/competitor/competitor-scraper', () => ({
  competitorScraper: {
    scrape: mockScrape,
    healthCheck: mockHealthCheck,
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

// Import after mocks
import { competitorProcessor } from '../../processors/competitor';

describe('Competitor Processor', () => {
  const createMockJob = (data: any) => ({
    id: 'test-job-id',
    data,
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('competitorProcessor', () => {
    it('should throw error for unknown job type', async () => {
      const job = createMockJob({ type: 'unknown-type' });

      await expect(competitorProcessor(job)).rejects.toThrow('Unknown job type: unknown-type');
    });
  });

  describe('check_all job', () => {
    it('should return success when no trackers to check', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([]);

      const job = createMockJob({ type: 'check_all' });

      const result = await competitorProcessor(job);

      expect(result.success).toBe(true);
      expect(result.checked).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should check all trackers successfully', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-1', url: 'https://example.com/1', marketplace: 'EBAY' },
        { id: 'tracker-2', url: 'https://example.com/2', marketplace: 'AMAZON' },
      ]);

      mockScrape
        .mockResolvedValueOnce({
          success: true,
          price: 99.99,
          title: 'Product 1',
        })
        .mockResolvedValueOnce({
          success: true,
          price: 149.99,
          title: 'Product 2',
        });

      mockRecordPriceCheck
        .mockResolvedValueOnce({ alertTriggered: false })
        .mockResolvedValueOnce({ alertTriggered: true });

      const job = createMockJob({ type: 'check_all', batchSize: 100 });

      const resultPromise = competitorProcessor(job);

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.checked).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.alertsTriggered).toBe(1);
    });

    it('should handle scrape failures', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-1', url: 'https://example.com/1', marketplace: 'EBAY' },
      ]);

      mockScrape.mockResolvedValueOnce({
        success: false,
        error: 'Page not found',
      });

      mockRecordError.mockResolvedValueOnce(undefined);

      const job = createMockJob({ type: 'check_all' });

      const resultPromise = competitorProcessor(job);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.checked).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('tracker-1: Page not found');
    });

    it('should handle exceptions during scrape', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-1', url: 'https://example.com/1', marketplace: 'EBAY' },
      ]);

      mockScrape.mockRejectedValueOnce(new Error('Network error'));
      mockRecordError.mockResolvedValueOnce(undefined);

      const job = createMockJob({ type: 'check_all' });

      const resultPromise = competitorProcessor(job);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('tracker-1: Network error');
      expect(mockRecordError).toHaveBeenCalledWith('tracker-1', 'Network error');
    });
  });

  describe('check_single job', () => {
    it('should return error when tracker not found', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([]);

      const job = createMockJob({ type: 'check_single', trackerId: 'tracker-123' });

      const result = await competitorProcessor(job);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tracker not found or not active: tracker-123');
    });

    it('should check single tracker successfully', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-123', url: 'https://example.com/item', marketplace: 'EBAY' },
      ]);

      mockScrape.mockResolvedValueOnce({
        success: true,
        price: 59.99,
        title: 'Test Product',
      });

      mockRecordPriceCheck.mockResolvedValueOnce({ alertTriggered: true });

      const job = createMockJob({ type: 'check_single', trackerId: 'tracker-123' });

      const result = await competitorProcessor(job);

      expect(result.success).toBe(true);
      expect(result.checked).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.alertsTriggered).toBe(1);
    });

    it('should handle scrape failure for single tracker', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-123', url: 'https://example.com/item', marketplace: 'EBAY' },
      ]);

      mockScrape.mockResolvedValueOnce({
        success: false,
        error: 'Item not found',
      });

      mockRecordError.mockResolvedValueOnce(undefined);

      const job = createMockJob({ type: 'check_single', trackerId: 'tracker-123' });

      const result = await competitorProcessor(job);

      expect(result.success).toBe(false);
      expect(result.checked).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Item not found');
    });

    it('should handle exception for single tracker', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-123', url: 'https://example.com/item', marketplace: 'EBAY' },
      ]);

      mockScrape.mockRejectedValueOnce(new Error('Timeout'));
      mockRecordError.mockResolvedValueOnce(undefined);

      const job = createMockJob({ type: 'check_single', trackerId: 'tracker-123' });

      const result = await competitorProcessor(job);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Timeout');
    });
  });

  describe('health_check job', () => {
    it('should run health check on sample trackers', async () => {
      mockGetTrackersToCheck.mockResolvedValueOnce([
        { id: 'tracker-1', url: 'https://example.com/1', marketplace: 'EBAY' },
        { id: 'tracker-2', url: 'https://example.com/2', marketplace: 'AMAZON' },
      ]);

      mockHealthCheck
        .mockResolvedValueOnce({ accessible: true })
        .mockResolvedValueOnce({ accessible: false, error: 'Connection refused' });

      const job = createMockJob({ type: 'health_check' });

      const resultPromise = competitorProcessor(job);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.checked).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('tracker-2: Connection refused');
    });

    it('should limit health check to 10 trackers', async () => {
      const manyTrackers = Array.from({ length: 15 }, (_, i) => ({
        id: `tracker-${i}`,
        url: `https://example.com/${i}`,
        marketplace: 'EBAY',
      }));

      mockGetTrackersToCheck.mockResolvedValueOnce(manyTrackers);
      mockHealthCheck.mockResolvedValue({ accessible: true });

      const job = createMockJob({ type: 'health_check' });

      const resultPromise = competitorProcessor(job);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.checked).toBe(10); // Limited to 10
      expect(mockHealthCheck).toHaveBeenCalledTimes(10);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockJobLogFindMany,
  mockJobLogCount,
  mockProductCount,
  mockExchangeRateFindFirst,
  mockNotifyJobFailed,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockJobLogFindMany: vi.fn(),
  mockJobLogCount: vi.fn(),
  mockProductCount: vi.fn(),
  mockExchangeRateFindFirst: vi.fn(),
  mockNotifyJobFailed: vi.fn(),
  mockSendNotification: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    jobLog: {
      findMany: mockJobLogFindMany,
      count: mockJobLogCount,
    },
    product: {
      count: mockProductCount,
    },
    exchangeRate: {
      findFirst: mockExchangeRateFindFirst,
    },
  },
}));

vi.mock('../../lib/notifications', () => ({
  notifyJobFailed: mockNotifyJobFailed,
  sendNotification: mockSendNotification,
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

// Import after mocks
import { recordError, checkSystemHealth, notifyHealthIssues } from '../../lib/error-monitor';

describe('Error Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordError', () => {
    it('should notify when max attempts reached', async () => {
      mockJobLogFindMany.mockResolvedValue([]);
      mockNotifyJobFailed.mockResolvedValue(undefined);

      await recordError('test-job', 'job-123', 'Test error', 3);

      expect(mockNotifyJobFailed).toHaveBeenCalledWith(
        'test-job',
        'job-123',
        'Test error',
        3
      );
    });

    it('should not notify on low attempts', async () => {
      mockJobLogFindMany.mockResolvedValue([]);

      await recordError('test-job', 'job-123', 'Test error', 1);

      expect(mockNotifyJobFailed).not.toHaveBeenCalled();
    });

    it('should notify on consecutive failures', async () => {
      mockJobLogFindMany
        .mockResolvedValueOnce([
          { status: 'FAILED' },
          { status: 'FAILED' },
          { status: 'FAILED' },
          { status: 'COMPLETED' },
        ])
        .mockResolvedValueOnce([]); // For failure rate check

      mockSendNotification.mockResolvedValue(undefined);

      await recordError('test-job', 'job-123', 'Test error', 1, {
        consecutiveFailureThreshold: 3,
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job_failed',
          title: '連続エラー検知',
        })
      );
    });

    it('should notify on high failure rate', async () => {
      // Consecutive failures check - not enough
      mockJobLogFindMany.mockResolvedValueOnce([
        { status: 'FAILED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
      ]);

      // Failure rate check - high failure rate
      mockJobLogFindMany.mockResolvedValueOnce([
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
      ]);

      mockSendNotification.mockResolvedValue(undefined);

      await recordError('test-job', 'job-123', 'Test error', 1, {
        failureRateThreshold: 50,
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job_failed',
          title: '高エラー率検知',
        })
      );
    });

    it('should not notify on low sample size for failure rate', async () => {
      mockJobLogFindMany
        .mockResolvedValueOnce([]) // Consecutive check
        .mockResolvedValueOnce([
          { status: 'FAILED' },
          { status: 'FAILED' },
          { status: 'FAILED' },
        ]); // Only 3 samples (minimum is 5)

      await recordError('test-job', 'job-123', 'Test error', 1);

      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkSystemHealth', () => {
    it('should return healthy when all checks pass', async () => {
      mockJobLogFindMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'FAILED' },
      ]);
      mockProductCount
        .mockResolvedValueOnce(5) // OUT_OF_STOCK
        .mockResolvedValueOnce(95) // ACTIVE
        .mockResolvedValueOnce(0); // ERROR
      mockJobLogCount.mockResolvedValue(0); // Dead letter
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(true);
      expect(result.checks.every(c => c.status === 'ok')).toBe(true);
    });

    it('should detect high failure rate as error', async () => {
      mockJobLogFindMany.mockResolvedValue([
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
      ]); // 80% failure rate
      mockProductCount.mockResolvedValue(0);
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(false);
      expect(result.checks.find(c => c.name === 'ジョブ成功率')?.status).toBe('error');
    });

    it('should detect moderate failure rate as warning', async () => {
      mockJobLogFindMany.mockResolvedValue([
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
      ]); // 40% failure rate
      mockProductCount.mockResolvedValue(0);
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(true); // warning doesn't make it unhealthy
      expect(result.checks.find(c => c.name === 'ジョブ成功率')?.status).toBe('warning');
    });

    it('should detect error products', async () => {
      mockJobLogFindMany.mockResolvedValue([]);
      mockProductCount
        .mockResolvedValueOnce(0) // OUT_OF_STOCK
        .mockResolvedValueOnce(100) // ACTIVE
        .mockResolvedValueOnce(15); // ERROR (more than 10)
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(false);
      expect(result.checks.find(c => c.name === 'エラー商品')?.status).toBe('error');
    });

    it('should detect high out of stock rate', async () => {
      mockJobLogFindMany.mockResolvedValue([]);
      mockProductCount
        .mockResolvedValueOnce(40) // OUT_OF_STOCK
        .mockResolvedValueOnce(60) // ACTIVE
        .mockResolvedValueOnce(0); // ERROR
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(true);
      expect(result.checks.find(c => c.name === '在庫状況')?.status).toBe('warning');
    });

    it('should detect dead letter queue issues', async () => {
      mockJobLogFindMany.mockResolvedValue([]);
      mockProductCount.mockResolvedValue(0);
      mockJobLogCount.mockResolvedValue(15); // More than 10 DLQ
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(false);
      expect(result.checks.find(c => c.name === 'Dead Letter Queue')?.status).toBe('error');
    });

    it('should detect stale exchange rate', async () => {
      mockJobLogFindMany.mockResolvedValue([]);
      mockProductCount.mockResolvedValue(0);
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
      });

      const result = await checkSystemHealth();

      expect(result.healthy).toBe(false);
      expect(result.checks.find(c => c.name === '為替レート')?.status).toBe('error');
    });
  });

  describe('notifyHealthIssues', () => {
    it('should not notify when healthy', async () => {
      mockJobLogFindMany.mockResolvedValue([{ status: 'COMPLETED' }]);
      mockProductCount.mockResolvedValue(0);
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      await notifyHealthIssues();

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should notify when there are health issues', async () => {
      mockJobLogFindMany.mockResolvedValue([
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
      ]);
      mockProductCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(15);
      mockJobLogCount.mockResolvedValue(0);
      mockExchangeRateFindFirst.mockResolvedValue({
        fetchedAt: new Date(),
      });

      mockSendNotification.mockResolvedValue(undefined);

      await notifyHealthIssues();

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job_failed',
          title: 'システムヘルス警告',
          severity: 'error',
        })
      );
    });
  });
});

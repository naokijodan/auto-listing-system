/**
 * Phase 47: ジョブリカバリーサービスのユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, resetMocks } from './setup';

// モジュールをインポート前にモック設定
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'new-job-id' }),
    close: vi.fn(),
  })),
}));

describe('Job Recovery Functions', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('generateIdempotencyKey', () => {
    it('should generate consistent key for same inputs', async () => {
      const { generateIdempotencyKey } = await import('../lib/job-recovery');

      const timestamp = 1234567890;
      const key1 = generateIdempotencyKey('publish', 'product-123', timestamp);
      const key2 = generateIdempotencyKey('publish', 'product-123', timestamp);

      expect(key1).toBe(key2);
      expect(key1).toBe('publish:product-123:1234567890');
    });

    it('should generate different keys for different operations', async () => {
      const { generateIdempotencyKey } = await import('../lib/job-recovery');

      const timestamp = 1234567890;
      const key1 = generateIdempotencyKey('publish', 'product-123', timestamp);
      const key2 = generateIdempotencyKey('enrich', 'product-123', timestamp);

      expect(key1).not.toBe(key2);
    });
  });

  describe('checkIdempotencyKey', () => {
    it('should return true if key exists', async () => {
      mockPrisma.idempotencyKey = {
        findUnique: vi.fn().mockResolvedValue({ key: 'test-key' }),
        upsert: vi.fn(),
      };

      const { checkIdempotencyKey } = await import('../lib/job-recovery');
      const exists = await checkIdempotencyKey('test-key');

      expect(exists).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockPrisma.idempotencyKey = {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      };

      const { checkIdempotencyKey } = await import('../lib/job-recovery');
      const exists = await checkIdempotencyKey('non-existent-key');

      expect(exists).toBe(false);
    });
  });

  describe('recordIdempotencyKey', () => {
    it('should create or update idempotency key', async () => {
      mockPrisma.idempotencyKey = {
        findUnique: vi.fn(),
        upsert: vi.fn().mockResolvedValue({ key: 'test-key' }),
      };

      const { recordIdempotencyKey } = await import('../lib/job-recovery');
      await recordIdempotencyKey('test-key', { success: true });

      expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test-key' },
          create: expect.objectContaining({ key: 'test-key' }),
          update: expect.any(Object),
        })
      );
    });
  });
});

describe('JobRecoveryService', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('getRetryableJobs', () => {
    it('should return jobs that can be retried', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          queueName: 'enrichment',
          jobId: 'original-1',
          jobName: 'enrich-product',
          jobData: { productId: 'p1' },
          error: 'Network error',
          attemptsMade: 1,
          maxAttempts: 3,
          canRetry: true,
          retryAfter: new Date(Date.now() - 1000),
          createdAt: new Date(),
          status: 'PENDING',
        },
      ];

      mockPrisma.failedJob = {
        findMany: vi.fn().mockResolvedValue(mockJobs),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn(),
        groupBy: vi.fn(),
      };

      const { JobRecoveryService } = await import('../lib/job-recovery');
      const service = new JobRecoveryService();
      const jobs = await service.getRetryableJobs(10);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].canRetry).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return recovery statistics', async () => {
      mockPrisma.failedJob = {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn()
          .mockResolvedValueOnce(5)  // pending
          .mockResolvedValueOnce(10) // retried
          .mockResolvedValueOnce(2), // abandoned
        deleteMany: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([
          { queueName: 'enrichment', status: 'PENDING', _count: 3 },
          { queueName: 'enrichment', status: 'RETRIED', _count: 7 },
        ]),
      };

      const { JobRecoveryService } = await import('../lib/job-recovery');
      const service = new JobRecoveryService();
      const stats = await service.getStats();

      expect(stats.pending).toBe(5);
      expect(stats.retried).toBe(10);
      expect(stats.abandoned).toBe(2);
      expect(stats.byQueue.enrichment.pending).toBe(3);
      expect(stats.byQueue.enrichment.retried).toBe(7);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete old records', async () => {
      mockPrisma.failedJob = {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 15 }),
        groupBy: vi.fn(),
      };

      const { JobRecoveryService } = await import('../lib/job-recovery');
      const service = new JobRecoveryService();
      const deletedCount = await service.cleanupOldRecords(7);

      expect(deletedCount).toBe(15);
      expect(mockPrisma.failedJob.deleteMany).toHaveBeenCalled();
    });
  });
});

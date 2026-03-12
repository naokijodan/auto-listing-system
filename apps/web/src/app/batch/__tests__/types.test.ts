import { describe, it, expect } from 'vitest';
import { QueueStatsSchema, FailedJobSchema, RecoveryStatsSchema, SSEQueueStatsMessageSchema } from '../types';

describe('QueueStatsSchema', () => {
  it('should accept valid queue stats', () => {
    const valid = { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 };
    expect(QueueStatsSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject missing fields', () => {
    const invalid = { waiting: 5, active: 2 };
    expect(QueueStatsSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject non-number values', () => {
    const invalid = { waiting: 'abc', active: 2, completed: 100, failed: 3, delayed: 1 } as any;
    expect(QueueStatsSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('FailedJobSchema', () => {
  const validJob = {
    id: 'job-1',
    queueName: 'enrichment',
    jobId: 'bull-123',
    jobName: 'process-product',
    error: 'Connection timeout',
    attemptsMade: 2,
    maxAttempts: 3,
    canRetry: true,
    createdAt: '2026-03-12T00:00:00Z',
    status: 'PENDING' as const,
  };

  it('should accept valid failed job', () => {
    expect(FailedJobSchema.safeParse(validJob).success).toBe(true);
  });

  it('should accept with optional retryAfter', () => {
    const withRetry = { ...validJob, retryAfter: '2026-03-12T01:00:00Z' };
    expect(FailedJobSchema.safeParse(withRetry).success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalid = { ...validJob, status: 'UNKNOWN' } as any;
    expect(FailedJobSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject missing id', () => {
    const { id, ...noId } = validJob as any;
    expect(FailedJobSchema.safeParse(noId).success).toBe(false);
  });
});

describe('RecoveryStatsSchema', () => {
  it('should accept valid recovery stats', () => {
    const valid = {
      pending: 5,
      retried: 10,
      abandoned: 2,
      byQueue: { enrichment: { pending: 3, retried: 7 }, 'joom-publish': { pending: 2, retried: 3 } },
    };
    expect(RecoveryStatsSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject empty object', () => {
    expect(RecoveryStatsSchema.safeParse({}).success).toBe(false);
  });
});

describe('SSEQueueStatsMessageSchema', () => {
  it('should accept valid SSE message', () => {
    const valid = {
      type: 'queue-stats',
      data: { enrichment: { waiting: 1, active: 0, completed: 50, failed: 2, delayed: 0 } },
    };
    expect(SSEQueueStatsMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject wrong type', () => {
    const invalid = { type: 'other-type', data: {} } as any;
    expect(SSEQueueStatsMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject missing data', () => {
    const invalid = { type: 'queue-stats' } as any;
    expect(SSEQueueStatsMessageSchema.safeParse(invalid).success).toBe(false);
  });
});


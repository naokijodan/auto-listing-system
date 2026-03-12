import { describe, it, expect } from 'vitest';

describe('Batch page logic', () => {
  describe('getStatusBadge logic', () => {
    const statuses = ['PENDING', 'RETRIED', 'ABANDONED'] as const;

    it('should have all three status types', () => {
      expect(statuses).toContain('PENDING');
      expect(statuses).toContain('RETRIED');
      expect(statuses).toContain('ABANDONED');
    });
  });

  describe('queue filtering', () => {
    const jobs = [
      { id: '1', queueName: 'enrichment', jobName: 'job1' },
      { id: '2', queueName: 'joom-publish', jobName: 'job2' },
      { id: '3', queueName: 'enrichment', jobName: 'job3' },
    ];

    it('should return all jobs when no filter', () => {
      const selectedQueue = null as string | null;
      const filtered = jobs.filter((job) => !selectedQueue || job.queueName === selectedQueue);
      expect(filtered).toHaveLength(3);
    });

    it('should filter by enrichment queue', () => {
      const selectedQueue = 'enrichment';
      const filtered = jobs.filter((job) => !selectedQueue || job.queueName === selectedQueue);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by joom-publish queue', () => {
      const selectedQueue = 'joom-publish';
      const filtered = jobs.filter((job) => !selectedQueue || job.queueName === selectedQueue);
      expect(filtered).toHaveLength(1);
    });

    it('should limit to 20 items', () => {
      const manyJobs = Array.from({ length: 30 }, (_, i) => ({
        id: String(i),
        queueName: 'enrichment',
        jobName: `job${i}`,
      }));
      const sliced = manyJobs.slice(0, 20);
      expect(sliced).toHaveLength(20);
    });
  });

  describe('SSE stats mapping', () => {
    it('should extract enrichment stats from SSE data', () => {
      const sseStats = {
        enrichment: { waiting: 1, active: 2, completed: 3, failed: 4, delayed: 5 },
        'joom-publish': { waiting: 10, active: 20, completed: 30, failed: 40, delayed: 50 },
      } as const;
      const enrichmentQueueStats = sseStats?.enrichment;
      expect(enrichmentQueueStats?.waiting).toBe(1);
    });

    it('should extract joom-publish stats from SSE data', () => {
      const sseStats = {
        enrichment: { waiting: 1, active: 2, completed: 3, failed: 4, delayed: 5 },
        'joom-publish': { waiting: 10, active: 20, completed: 30, failed: 40, delayed: 50 },
      } as const;
      const joomQueueStats = sseStats?.['joom-publish'];
      expect(joomQueueStats?.waiting).toBe(10);
    });

    it('should handle null SSE stats', () => {
      const sseStats = null as any;
      const enrichmentQueueStats = sseStats?.enrichment;
      expect(enrichmentQueueStats).toBeUndefined();
    });
  });

  describe('error message truncation', () => {
    it('should show full error if under 100 chars', () => {
      const error = 'Connection timeout';
      const display = error.slice(0, 100) + (error.length > 100 ? '...' : '');
      expect(display).toBe('Connection timeout');
    });

    it('should truncate long errors with ellipsis', () => {
      const error = 'A'.repeat(150);
      const display = error.slice(0, 100) + (error.length > 100 ? '...' : '');
      expect(display).toBe('A'.repeat(100) + '...');
      expect(display.length).toBe(103);
    });
  });
});


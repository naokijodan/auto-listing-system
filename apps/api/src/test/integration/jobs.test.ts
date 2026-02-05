import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma, mockQueue, createMockJob } from '../setup';

const app = createTestApp();

// Use correct queue name from config
const QUEUE_NAME = 'scrape-queue';

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs/logs', () => {
    it('should return empty array when no logs', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);
      mockPrisma.jobLog.count.mockResolvedValue(0);

      const response = await request(app).get('/api/jobs/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should return job logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          jobId: 'job-1',
          productId: 'product-1',
          queueName: QUEUE_NAME,
          status: 'COMPLETED',
          createdAt: new Date(),
        },
      ];
      mockPrisma.jobLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.jobLog.count.mockResolvedValue(1);

      const response = await request(app).get('/api/jobs/logs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by productId', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);
      mockPrisma.jobLog.count.mockResolvedValue(0);

      await request(app).get('/api/jobs/logs?productId=product-1');

      expect(mockPrisma.jobLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-1' },
        })
      );
    });

    it('should filter by queueName', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);
      mockPrisma.jobLog.count.mockResolvedValue(0);

      await request(app).get(`/api/jobs/logs?queueName=${QUEUE_NAME}`);

      expect(mockPrisma.jobLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { queueName: QUEUE_NAME },
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);
      mockPrisma.jobLog.count.mockResolvedValue(0);

      await request(app).get('/api/jobs/logs?status=COMPLETED');

      expect(mockPrisma.jobLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'COMPLETED' },
        })
      );
    });

    it('should support pagination parameters', async () => {
      mockPrisma.jobLog.findMany.mockResolvedValue([]);
      mockPrisma.jobLog.count.mockResolvedValue(100);

      const response = await request(app).get('/api/jobs/logs?limit=10&offset=20');

      expect(response.body.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('GET /api/jobs/stats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);

      const response = await request(app).get('/api/jobs/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/jobs/queue/:queueName', () => {
    it('should return waiting jobs', async () => {
      const mockJobs = [createMockJob('job-1', { productId: 'product-1' })];
      mockQueue.getWaiting.mockResolvedValue(mockJobs);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=waiting`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return active jobs', async () => {
      mockQueue.getActive.mockResolvedValue([]);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=active`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return completed jobs', async () => {
      mockQueue.getCompleted.mockResolvedValue([]);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=completed`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return failed jobs', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=failed`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return delayed jobs', async () => {
      mockQueue.getDelayed.mockResolvedValue([]);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=delayed`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}?status=invalid`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });

    it('should return 404 for non-existent queue', async () => {
      const response = await request(app).get('/api/jobs/queue/non-existent-queue?status=waiting');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('QUEUE_NOT_FOUND');
    });
  });

  describe('GET /api/jobs/queue/:queueName/:jobId', () => {
    it('should return job details', async () => {
      const mockJob = createMockJob('job-1', { productId: 'product-1' });
      mockQueue.getJob.mockResolvedValue(mockJob);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}/job-1`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('job-1');
    });

    it('should return 404 for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const response = await request(app).get(`/api/jobs/queue/${QUEUE_NAME}/non-existent`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('JOB_NOT_FOUND');
    });
  });

  describe('POST /api/jobs/queue/:queueName/:jobId/retry', () => {
    it('should retry a job', async () => {
      const mockJob = createMockJob('job-1', { productId: 'product-1' });
      mockQueue.getJob.mockResolvedValue(mockJob);

      const response = await request(app).post(`/api/jobs/queue/${QUEUE_NAME}/job-1/retry`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Job retried');
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should return 404 for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const response = await request(app).post(`/api/jobs/queue/${QUEUE_NAME}/non-existent/retry`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('JOB_NOT_FOUND');
    });
  });

  describe('POST /api/jobs/queue/:queueName/retry-all', () => {
    it('should retry all failed jobs', async () => {
      const mockJobs = [
        createMockJob('job-1', {}),
        createMockJob('job-2', {}),
      ];
      mockQueue.getFailed.mockResolvedValue(mockJobs);

      const response = await request(app).post(`/api/jobs/queue/${QUEUE_NAME}/retry-all`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should handle empty failed queue', async () => {
      mockQueue.getFailed.mockResolvedValue([]);

      const response = await request(app).post(`/api/jobs/queue/${QUEUE_NAME}/retry-all`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });
  });
});

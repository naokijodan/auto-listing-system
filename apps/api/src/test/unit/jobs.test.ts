import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoist mocks to avoid TDZ issues with vi.mock hoisting
const { mockJobs, prismaMock } = vi.hoisted(() => {
  const mockJobs: any[] = [
    { id: 'j1', name: 'task', data: {}, timestamp: Date.now(), attemptsMade: 0, failedReason: undefined,
      getState: vi.fn().mockResolvedValue('waiting'), progress: 0 },
  ];

  const prismaMock = {
    jobLog: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    failedJob: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'f1', queueName: 'scrape-queue', jobName: 'task', jobData: {}, maxAttempts: 3, attemptsMade: 1, canRetry: true, status: 'PENDING' }),
      groupBy: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    order: {
      aggregate: vi.fn().mockResolvedValue({ _count: 0 }),
    },
  };

  return { mockJobs, prismaMock };
});

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name: string) => ({
    name,
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    getWaiting: vi.fn().mockResolvedValue(mockJobs),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    getFailedJobs: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockImplementation(async (id: string) => id === 'j1' ? ({
      id: 'j1', name: 'task', data: {}, timestamp: Date.now(), attemptsMade: 0,
      failedReason: undefined, progress: 0, getState: vi.fn().mockResolvedValue('waiting'), retry: vi.fn().mockResolvedValue(undefined)
    }) : null),
  })),
}));

vi.mock('ioredis', () => {
  const mockRedis = {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue(undefined),
  };
  return { default: vi.fn().mockImplementation(() => mockRedis) };
});

vi.mock('@rakuda/database', async () => ({ prisma: prismaMock }));
vi.mock('@rakuda/config', () => ({ QUEUE_NAMES: { SCRAPE: 'scrape-queue', IMAGE: 'image-queue', TRANSLATE: 'translate-queue', PUBLISH: 'publish-queue', INVENTORY: 'inventory-queue' } }));
vi.mock('@rakuda/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } }));

import { jobsRouter } from '../../routes/jobs';
import { errorHandler } from '../../middleware/error-handler';

describe('jobsRouter', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobsRouter);
    app.use(errorHandler);
  });

  it('GET /logs - 200', async () => {
    const res = await request(app).get('/api/jobs/logs');
    expect(res.status).toBe(200);
  });

  it('GET /stats - 200', async () => {
    const res = await request(app).get('/api/jobs/stats');
    expect(res.status).toBe(200);
  });

  it('GET /queue/:queueName - 200 waiting', async () => {
    const res = await request(app).get('/api/jobs/queue/scrape-queue?status=waiting');
    expect(res.status).toBe(200);
  });

  it('GET /queue/:queueName - 404 invalid queue', async () => {
    const res = await request(app).get('/api/jobs/queue/nope');
    expect(res.status).toBe(404);
  });

  it('GET /queue/:queueName - 400 invalid status', async () => {
    const res = await request(app).get('/api/jobs/queue/scrape-queue?status=unknown');
    expect(res.status).toBe(400);
  });

  it('GET /queue/:queueName/:jobId - 200', async () => {
    const res = await request(app).get('/api/jobs/queue/scrape-queue/j1');
    expect(res.status).toBe(200);
  });

  it('GET /queue/:queueName/:jobId - 404 when not found', async () => {
    const res = await request(app).get('/api/jobs/queue/scrape-queue/none');
    expect(res.status).toBe(404);
  });

  it('GET /queue/:queueName/:jobId/progress - 200', async () => {
    const res = await request(app).get('/api/jobs/queue/scrape-queue/j1/progress');
    expect(res.status).toBe(200);
  });

  it('POST /queue/:queueName/:jobId/retry - 200', async () => {
    const res = await request(app).post('/api/jobs/queue/scrape-queue/j1/retry');
    expect(res.status).toBe(200);
  });

  it('POST /queue/:queueName/:jobId/retry - 404 for missing job', async () => {
    const res = await request(app).post('/api/jobs/queue/scrape-queue/nope/retry');
    expect(res.status).toBe(404);
  });

  it('POST /queue/:queueName/retry-all - 200', async () => {
    const res = await request(app).post('/api/jobs/queue/scrape-queue/retry-all');
    expect(res.status).toBe(200);
  });

  it('GET /failed - 200', async () => {
    const res = await request(app).get('/api/jobs/failed');
    expect(res.status).toBe(200);
  });

  it('GET /recovery-stats - 200', async () => {
    prismaMock.failedJob.count = vi.fn().mockResolvedValue(0);
    prismaMock.failedJob.groupBy = vi.fn().mockResolvedValue([]);
    const res = await request(app).get('/api/jobs/recovery-stats');
    expect(res.status).toBe(200);
  });

  it('POST /retry/:id - 200', async () => {
    prismaMock.failedJob.findUnique.mockResolvedValueOnce({ id: 'f1', queueName: 'scrape-queue', jobName: 'task', jobData: {}, maxAttempts: 3, attemptsMade: 1, canRetry: true, status: 'PENDING' });
    const res = await request(app).post('/api/jobs/retry/f1');
    expect(res.status).toBe(200);
  });

  it('POST /retry/:id - 404 missing', async () => {
    prismaMock.failedJob.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/jobs/retry/missing');
    expect(res.status).toBe(404);
  });

  it('POST /retry/:id - 400 cannot retry', async () => {
    prismaMock.failedJob.findUnique.mockResolvedValueOnce({ id: 'f1', queueName: 'scrape-queue', jobName: 'task', jobData: {}, maxAttempts: 3, attemptsMade: 3, canRetry: false, status: 'PENDING' });
    const res = await request(app).post('/api/jobs/retry/f1');
    expect(res.status).toBe(400);
  });

  it('POST /retry-batch - 200', async () => {
    prismaMock.failedJob.findMany = vi.fn().mockResolvedValue([]);
    const res = await request(app).post('/api/jobs/retry-batch').send({ limit: 5 });
    expect(res.status).toBe(200);
  });

  it('POST /abandon/:id - 200', async () => {
    const res = await request(app).post('/api/jobs/abandon/f1');
    expect(res.status).toBe(200);
  });

  it('POST /cleanup - 200', async () => {
    const res = await request(app).post('/api/jobs/cleanup').send({ daysOld: 7 });
    expect(res.status).toBe(200);
  });
});

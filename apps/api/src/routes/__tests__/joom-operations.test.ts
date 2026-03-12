import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';

// Hoisted mocks
const {
  mockMarketplaceCredentialFindFirst,
  mockListingDeleteMany,
  mockListingFindFirst,
  mockBatchFindMany,
  mockBatchCount,
  mockBatchFindUnique,
  mockBatchCreate,
  mockBatchUpdate,
  mockAddBatchPublishJob,
  mockGetQueueStats,
  mockGetJobStatus,
} = vi.hoisted(() => ({
  mockMarketplaceCredentialFindFirst: vi.fn(),
  mockListingDeleteMany: vi.fn(),
  mockListingFindFirst: vi.fn(),
  mockBatchFindMany: vi.fn(),
  mockBatchCount: vi.fn(),
  mockBatchFindUnique: vi.fn(),
  mockBatchCreate: vi.fn(),
  mockBatchUpdate: vi.fn(),
  mockAddBatchPublishJob: vi.fn(),
  mockGetQueueStats: vi.fn(),
  mockGetJobStatus: vi.fn(),
}));

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      marketplaceCredential: { findFirst: mockMarketplaceCredentialFindFirst },
      listing: { deleteMany: mockListingDeleteMany, findFirst: mockListingFindFirst },
      joomPublishBatch: {
        findMany: mockBatchFindMany,
        count: mockBatchCount,
        findUnique: mockBatchFindUnique,
        create: mockBatchCreate,
        update: mockBatchUpdate,
      },
    })),
    Marketplace: { JOOM: 'JOOM', EBAY: 'EBAY' },
  };
});

vi.mock('@rakuda/queue', () => ({
  addBatchPublishJob: mockAddBatchPublishJob.mockResolvedValue('job-batch-1'),
  addFullJoomWorkflowJob: vi.fn().mockResolvedValue('job-full-1'),
  addAutoJoomPublishJob: vi.fn().mockResolvedValue('job-auto-1'),
  getJoomPublishQueueStats: mockGetQueueStats.mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
  getJobStatus: mockGetJobStatus.mockResolvedValue({ id: 'job-1', state: 'waiting' }),
  QUEUE_NAMES: { JOOM_PUBLISH: 'joom-publish' },
  initQueueConnection: vi.fn().mockReturnValue({}),
}));

// Mock BullMQ Queue to avoid real connections
vi.mock('bullmq', () => ({ Queue: vi.fn().mockImplementation(() => ({ getFailed: vi.fn().mockResolvedValue([]) })) }));

// Mock global fetch for Joom API calls
const mockFetch = vi.fn();
// @ts-ignore
global.fetch = mockFetch as any;

// Import after mocks
import joomOperationsRouter from '../joom-operations';

describe('Joom Operations Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/joom-ops', joomOperationsRouter);

    // Defaults
    mockMarketplaceCredentialFindFirst.mockResolvedValue({ id: 'cred-1', marketplace: 'JOOM', credentials: { accessToken: 'tok' } });
    mockBatchFindMany.mockResolvedValue([{ id: 'b1', status: 'PENDING', createdBy: { id: 'u1', name: 'U', email: 'e' } }]);
    mockBatchCount.mockResolvedValue(1);
    mockBatchFindUnique.mockResolvedValue({ id: 'b1', status: 'PENDING' });
    mockBatchCreate.mockResolvedValue({ id: 'b-new', status: 'PENDING', productIds: ['p1'], totalCount: 1 });
    mockBatchUpdate.mockResolvedValue({ id: 'b1', status: 'PROCESSING' });
    mockAddBatchPublishJob.mockResolvedValue('job-1');
    mockGetQueueStats.mockResolvedValue({ waiting: 1, active: 0, completed: 0, failed: 0 });
    mockGetJobStatus.mockResolvedValue({ id: 'job-1', state: 'waiting' });
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: { items: [{ id: 'jp-1', name: 'Remote', enabled: true, moderationStatus: 'ok' }] } }) });
  });

  // Helper to get route handler directly from the router stack
  function getHandler(method: string, path: string): (req: any, res: any, next: any) => any {
    const stack: any[] = (joomOperationsRouter as any).stack || [];
    const layer = stack.find((l: any) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]);
    if (!layer) throw new Error(`Handler not found for ${method} ${path}`);
    const routeStack = layer.route.stack || [];
    const handle = routeStack[0]?.handle;
    if (!handle) throw new Error(`No handle for ${method} ${path}`);
    return handle;
  }

  async function invoke(method: string, path: string, options: { body?: any; params?: any; query?: any } = {}) {
    const handler = getHandler(method, path);
    const req: any = { body: options.body || {}, params: options.params || {}, query: options.query || {} };
    return await new Promise<{ status: number; body: any }>((resolve) => {
      const res: any = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json(payload: any) { resolve({ status: this.statusCode, body: payload }); },
      };
      handler(req, res, () => resolve({ status: res.statusCode || 200, body: undefined }));
    });
  }

  // GET /products/remote
  it('GET /products/remote - success', async () => {
    const res = await invoke('get', '/products/remote');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('GET /products/remote - with pagination query still validates', async () => {
    const res = await invoke('get', '/products/remote', { query: { limit: '20', offset: '0' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // GET /batches
  it('GET /batches - success', async () => {
    const res = await invoke('get', '/batches', { query: { status: 'PENDING', limit: '10', offset: '0' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(1);
    expect(mockBatchFindMany).toHaveBeenCalled();
  });

  // POST /batches
  it('POST /batches - success with productIds', async () => {
    const res = await invoke('post', '/batches', { body: { name: 'Batch 1', productIds: ['p1', 'p2'], dryRun: false, concurrency: 5 } });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('b-new');
  });

  it('POST /batches - empty productIds returns 400', async () => {
    const res = await invoke('post', '/batches', { body: { productIds: [] } });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  // POST /batches/:id/execute
  it('POST /batches/:id/execute - success queues job', async () => {
    mockBatchFindUnique.mockResolvedValueOnce({ id: 'b1', status: 'PENDING' });
    const res = await invoke('post', '/batches/:id/execute', { params: { id: 'b1' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockAddBatchPublishJob).toHaveBeenCalledWith('b1');
  });

  it('POST /batches/:id/execute - not found', async () => {
    mockBatchFindUnique.mockResolvedValueOnce(null);
    const res = await invoke('post', '/batches/:id/execute', { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Batch not found');
  });

  // GET /queue/stats
  it('GET /queue/stats - success', async () => {
    mockGetQueueStats.mockResolvedValueOnce({ waiting: 2, active: 1, completed: 10, failed: 0 });
    const res = await invoke('get', '/queue/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.waiting).toBe(2);
  });

  // GET /queue/jobs/:jobId
  it('GET /queue/jobs/:jobId - success', async () => {
    mockGetJobStatus.mockResolvedValueOnce({ id: 'job-1', state: 'completed' });
    const res = await invoke('get', '/queue/jobs/:jobId', { params: { jobId: 'job-1' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.state).toBe('completed');
  });

  it('GET /queue/jobs/:jobId - not found', async () => {
    mockGetJobStatus.mockResolvedValueOnce(null);
    const res = await invoke('get', '/queue/jobs/:jobId', { params: { jobId: 'missing' } });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Job not found');
  });
});


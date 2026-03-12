import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';

// Hoisted mocks for prisma + queue + fetch
const {
  mockListingFindMany,
  mockListingFindUnique,
  mockListingFindFirst,
  mockListingCreate,
  mockListingUpdate,
  mockListingDelete,
  mockListingCount,
  mockEnrichmentTaskFindUnique,
  mockMarketplaceCredentialFindFirst,
  mockAddPublishJob,
} = vi.hoisted(() => ({
  mockListingFindMany: vi.fn(),
  mockListingFindUnique: vi.fn(),
  mockListingFindFirst: vi.fn(),
  mockListingCreate: vi.fn(),
  mockListingUpdate: vi.fn(),
  mockListingDelete: vi.fn(),
  mockListingCount: vi.fn(),
  mockEnrichmentTaskFindUnique: vi.fn(),
  mockMarketplaceCredentialFindFirst: vi.fn(),
  mockAddPublishJob: vi.fn(),
}));

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      listing: {
        findMany: mockListingFindMany,
        findUnique: mockListingFindUnique,
        findFirst: mockListingFindFirst,
        create: mockListingCreate,
        update: mockListingUpdate,
        delete: mockListingDelete,
        count: mockListingCount,
      },
      enrichmentTask: {
        findUnique: mockEnrichmentTaskFindUnique,
      },
      marketplaceCredential: {
        findFirst: mockMarketplaceCredentialFindFirst,
      },
    })),
    ListingStatus: {
      DRAFT: 'DRAFT',
      PENDING_PUBLISH: 'PENDING_PUBLISH',
      PUBLISHING: 'PUBLISHING',
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      SOLD: 'SOLD',
      ENDED: 'ENDED',
      ERROR: 'ERROR',
    },
    Marketplace: {
      JOOM: 'JOOM',
      EBAY: 'EBAY',
    },
  };
});

vi.mock('@rakuda/queue', () => ({
  addPublishJob: mockAddPublishJob.mockResolvedValue('job-joom-1'),
}));

// Mock global fetch for Joom API calls
const mockFetch = vi.fn();
// @ts-ignore
global.fetch = mockFetch as any;

// Import after mocks
import joomListingsRouter from '../joom-listings';

describe('Joom Listings Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/joom-listings', joomListingsRouter);

    // Default mocks
    mockListingFindMany.mockResolvedValue([
      {
        id: 'lst-1',
        productId: 'p-1',
        marketplace: 'JOOM',
        status: 'DRAFT',
        listingPrice: 100,
        currency: 'USD',
        marketplaceData: {},
        product: {
          id: 'p-1',
          title: 'Prod',
          titleEn: 'Prod EN',
          price: 100,
          images: [],
          processedImages: [],
          category: null,
          brand: null,
          condition: null,
        },
      },
    ]);
    mockListingCount.mockResolvedValue(1);
    mockEnrichmentTaskFindUnique.mockResolvedValue({ id: 'task-1', productId: 'p-1', status: 'APPROVED', pricing: { finalPriceUsd: 99 } });
    mockListingFindFirst.mockResolvedValue(null);
    mockListingCreate.mockResolvedValue({ id: 'lst-created', productId: 'p-1', marketplace: 'JOOM', status: 'DRAFT', listingPrice: 99, currency: 'USD', marketplaceData: {}, product: {} });
    mockListingFindUnique.mockResolvedValue({ id: 'lst-1', productId: 'p-1', marketplace: 'JOOM', status: 'DRAFT', listingPrice: 100, currency: 'USD', marketplaceData: {}, product: {} });
    mockListingUpdate.mockResolvedValue({ id: 'lst-1', status: 'PENDING_PUBLISH' });
    mockListingDelete.mockResolvedValue({ id: 'lst-1' });
    mockMarketplaceCredentialFindFirst.mockResolvedValue({ id: 'cred-1', marketplace: 'JOOM', credentials: { accessToken: 'tok' } });
    mockAddPublishJob.mockResolvedValue('job-1');
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: {} }) });
  });

  // Helper to get route handler directly from the router stack
  function getHandler(method: string, path: string): (req: any, res: any, next: any) => any {
    const stack: any[] = (joomListingsRouter as any).stack || [];
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

  // GET /listings
  it('GET /listings - returns listings (success)', async () => {
    const res = await invoke('get', '/listings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBe(1);
    expect(mockListingFindMany).toHaveBeenCalled();
  });

  it('GET /listings - with status filter maps to internal status', async () => {
    await invoke('get', '/listings', { query: { status: 'active' } });
    const call = mockListingFindMany.mock.calls[0]?.[0];
    expect(call?.where?.status).toBeDefined();
  });

  it('GET /listings - with pagination params', async () => {
    await invoke('get', '/listings', { query: { limit: '10', offset: '5' } });
    const args = mockListingFindMany.mock.calls[0]?.[0];
    expect(args.take).toBe(10);
    expect(args.skip).toBe(5);
  });

  it('GET /listings - invalid limit triggers Zod 400', async () => {
    const res = await invoke('get', '/listings', { query: { limit: '0' } });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  // GET /listings/:id
  it('GET /listings/:id - success', async () => {
    mockListingFindUnique.mockResolvedValueOnce({ id: 'lst-1', product: { id: 'p-1' } });
    const res = await invoke('get', '/listings/:id', { params: { id: 'lst-1' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('lst-1');
  });

  it('GET /listings/:id - not found', async () => {
    mockListingFindUnique.mockResolvedValueOnce(null);
    const res = await invoke('get', '/listings/:id', { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Listing not found');
  });

  // POST /listings
  it('POST /listings - success with valid enrichmentTaskId', async () => {
    const res = await invoke('post', '/listings', { body: { enrichmentTaskId: 'task-1' } });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockEnrichmentTaskFindUnique).toHaveBeenCalledWith({ where: { id: 'task-1' }, select: expect.any(Object) });
    expect(mockListingCreate).toHaveBeenCalled();
  });

  it('POST /listings - missing enrichmentTaskId returns 400', async () => {
    const res = await invoke('post', '/listings', { body: {} });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  // POST /listings/:id/publish
  it('POST /listings/:id/publish - success', async () => {
    mockListingFindUnique.mockResolvedValueOnce({ id: 'lst-1', status: 'DRAFT', product: {} });
    const res = await invoke('post', '/listings/:id/publish', { params: { id: 'lst-1' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING_PUBLISH');
    expect(mockAddPublishJob).toHaveBeenCalledWith('lst-1');
  });

  it('POST /listings/:id/publish - listing not found', async () => {
    mockListingFindUnique.mockResolvedValueOnce(null);
    const res = await invoke('post', '/listings/:id/publish', { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Listing not found');
  });

  // DELETE /listings/:id
  it('DELETE /listings/:id - success', async () => {
    mockListingFindUnique.mockResolvedValueOnce({ id: 'lst-1', marketplaceData: { joomProductId: 'j-1' } });
    const res = await invoke('delete', '/listings/:id', { params: { id: 'lst-1' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockListingDelete).toHaveBeenCalledWith({ where: { id: 'lst-1' } });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('DELETE /listings/:id - not found', async () => {
    mockListingFindUnique.mockResolvedValueOnce(null);
    const res = await invoke('delete', '/listings/:id', { params: { id: 'missing' } });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Listing not found');
  });

  // GET /stats
  it('GET /stats - returns counts (success)', async () => {
    mockListingCount.mockResolvedValueOnce(10); // total
    mockListingCount.mockResolvedValueOnce(2); // draft
    mockListingCount.mockResolvedValueOnce(3); // pending
    mockListingCount.mockResolvedValueOnce(1); // publishing
    mockListingCount.mockResolvedValueOnce(4); // active
    mockListingCount.mockResolvedValueOnce(0); // paused
    mockListingCount.mockResolvedValueOnce(0); // sold
    mockListingCount.mockResolvedValueOnce(0); // error

    const res = await invoke('get', '/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(10);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    listing: {
      findMany: vi.fn().mockResolvedValue([{ id: 'l1', marketplace: 'JOOM', productId: 'p1', listingPrice: 10 }]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue({ id: 'l1', productId: 'p1', marketplace: 'JOOM', status: 'DRAFT' }),
      update: vi.fn().mockResolvedValue({ id: 'l1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      delete: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'l2' }),
      countActive: vi.fn().mockResolvedValue(0),
    },
    product: {
      findUnique: vi.fn().mockResolvedValue({ id: 'p1' }),
    },
    jobLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { prismaMock };
});

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    addBulk: vi.fn().mockResolvedValue([]),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
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
vi.mock('@rakuda/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } }));
vi.mock('@rakuda/config', () => ({ QUEUE_NAMES: { PUBLISH: 'publish-queue', INVENTORY: 'inventory-queue' } }));
vi.mock('@rakuda/schema', () => ({ CreateListingRequestSchema: { parse: (x: any) => x } }));

import { listingsRouter } from '../../routes/listings';
import { errorHandler } from '../../middleware/error-handler';

describe('listingsRouter', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/listings', listingsRouter);
    app.use(errorHandler);
  });

  it('GET / - 200', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
  });

  it('POST / - create listing 201', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 'p1' });
    prismaMock.listing.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/listings')
      .send({ productId: 'p1', marketplace: 'joom', listingPrice: 10, marketplaceData: { joomCategoryId: 'c1' } });
    expect(res.status).toBe(201);
  });

  it('POST / - 404 when product missing', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/listings')
      .send({ productId: 'pX', marketplace: 'joom', listingPrice: 10, marketplaceData: { joomCategoryId: 'c1' } });
    expect(res.status).toBe(404);
  });

  it('POST /bulk/update-price - 200', async () => {
    prismaMock.listing.findUnique.mockResolvedValue({ id: 'l1', listingPrice: 10 });
    const res = await request(app).post('/api/listings/bulk/update-price').send({ listingIds: ['l1'], priceChange: { amount: 1 } });
    expect(res.status).toBe(200);
  });

  it('POST /bulk/update-price - 400 on bad payload', async () => {
    const res = await request(app).post('/api/listings/bulk/update-price').send({});
    expect(res.status).toBe(400);
  });

  it('POST /bulk/update-status - 200', async () => {
    prismaMock.listing.updateMany.mockResolvedValueOnce({ count: 2 });
    const res = await request(app).post('/api/listings/bulk/update-status').send({ listingIds: ['l1'], status: 'ACTIVE' });
    expect(res.status).toBe(200);
  });

  it('POST /bulk/update-status - 400 invalid status', async () => {
    const res = await request(app).post('/api/listings/bulk/update-status').send({ listingIds: ['l1'], status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('POST /bulk/publish - 202', async () => {
    prismaMock.listing.findMany = vi.fn().mockResolvedValue([{ id: 'l1', productId: 'p1', status: 'DRAFT', marketplace: 'JOOM', marketplaceData: {} }]);
    const res = await request(app).post('/api/listings/bulk/publish').send({ listingIds: ['l1'] });
    expect(res.status).toBe(202);
  });

  it('POST /bulk/publish - 400 missing listingIds', async () => {
    const res = await request(app).post('/api/listings/bulk/publish').send({});
    expect(res.status).toBe(400);
  });

  it('POST /bulk/delete - 200', async () => {
    prismaMock.listing.count = vi.fn().mockResolvedValue(0);
    prismaMock.listing.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await request(app).post('/api/listings/bulk/delete').send({ listingIds: ['l1'], confirm: true });
    expect(res.status).toBe(200);
  });

  it('POST /bulk/delete - 400 when active listings exist', async () => {
    prismaMock.listing.count = vi.fn().mockResolvedValue(1);
    const res = await request(app).post('/api/listings/bulk/delete').send({ listingIds: ['l1'], confirm: true });
    expect(res.status).toBe(400);
  });

  it('POST /bulk/retry - 202 when some queued', async () => {
    prismaMock.listing.findMany = vi.fn().mockResolvedValue([{ id: 'l1', productId: 'p1', marketplace: 'JOOM', marketplaceData: {} }]);
    const res = await request(app).post('/api/listings/bulk/retry').send({});
    expect(res.status).toBe(202);
  });

  it('POST /bulk/retry - 200 when none found', async () => {
    prismaMock.listing.findMany = vi.fn().mockResolvedValue([]);
    const res = await request(app).post('/api/listings/bulk/retry').send({});
    expect(res.status).toBe(200);
  });

  it('POST /bulk/sync - 200', async () => {
    prismaMock.listing.findMany = vi.fn().mockResolvedValue([{ id: 'l1', marketplace: 'JOOM', marketplaceListingId: 'M1' }]);
    const res = await request(app).post('/api/listings/bulk/sync').send({});
    expect(res.status).toBe(200);
  });

  it('GET /inventory/sync/status - 200', async () => {
    const res = await request(app).get('/api/listings/inventory/sync/status');
    expect(res.status).toBe(200);
  });

  it('POST /inventory/sync - 202', async () => {
    const res = await request(app).post('/api/listings/inventory/sync').send({ marketplace: 'joom' });
    expect(res.status).toBe(202);
  });

  it('GET /:id - 200', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({ id: 'l1' });
    const res = await request(app).get('/api/listings/l1');
    expect(res.status).toBe(200);
  });

  it('GET /:id - 404 when not found', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/listings/missing');
    expect(res.status).toBe(404);
  });

  it('POST /:id/publish - 202', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({ id: 'l1', productId: 'p1', marketplace: 'JOOM', status: 'DRAFT', marketplaceData: {} });
    const res = await request(app).post('/api/listings/l1/publish').send({});
    expect(res.status).toBe(202);
  });

  it('POST /:id/publish - 400 invalid status', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({ id: 'l1', productId: 'p1', marketplace: 'JOOM', status: 'ACTIVE', marketplaceData: {} });
    const res = await request(app).post('/api/listings/l1/publish').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /:id - 200', async () => {
    prismaMock.listing.update.mockResolvedValueOnce({ id: 'l1', listingPrice: 15 });
    const res = await request(app).patch('/api/listings/l1').send({ listingPrice: 15 });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id - 200', async () => {
    const res = await request(app).delete('/api/listings/l1');
    expect(res.status).toBe(200);
  });
});


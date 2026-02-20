import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Minimal mocks
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    addBulk: vi.fn().mockResolvedValue([]),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue({
      id: 'job-123',
      name: 'test',
      data: {},
      timestamp: Date.now(),
      attemptsMade: 0,
      progress: 0,
      failedReason: undefined,
      getState: vi.fn().mockResolvedValue('waiting'),
      retry: vi.fn().mockResolvedValue(undefined),
    }),
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

// Prisma mock with adjustable behaviors per test
const prismaMock = {
  product: {
    findMany: vi.fn().mockResolvedValue([{ id: 'p1', title: 'A', price: 1000, images: [], sourceUrl: 'https://x', status: 'ACTIVE', createdAt: new Date() }]),
    count: vi.fn().mockResolvedValue(1),
    findUnique: vi.fn().mockResolvedValue({ id: 'p1', title: 'A', price: 1000, images: [], sourceUrl: 'https://x', status: 'ACTIVE', createdAt: new Date() }),
    update: vi.fn().mockResolvedValue({ id: 'p1' }),
    updateMany: vi.fn().mockResolvedValue({ count: 2 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    create: vi.fn().mockResolvedValue({ id: 'new-product', images: [], title: 'A', description: '', price: 1000 }),
  },
  listing: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'l1' }),
  },
  source: {
    findFirst: vi.fn().mockResolvedValue({ id: 'src1', type: 'MERCARI' }),
    create: vi.fn().mockResolvedValue({ id: 'src1', type: 'MERCARI' }),
  },
  exchangeRate: {
    findFirst: vi.fn().mockResolvedValue({ rate: 0.0067 }),
  },
  priceSetting: {
    findFirst: vi.fn().mockResolvedValue({ platformFeeRate: 0.15, paymentFeeRate: 0.03, targetProfitRate: 0.3 }),
  },
  jobLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('@rakuda/database', async () => ({ prisma: prismaMock }));

vi.mock('@rakuda/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    SCRAPE: 'scrape-queue',
    IMAGE: 'image-queue',
    TRANSLATE: 'translate-queue',
    PUBLISH: 'publish-queue',
    INVENTORY: 'inventory-queue',
  },
  EXCHANGE_RATE_DEFAULTS: { JPY_TO_USD: 0.0067 },
}));

// Schema and CSV utils used by products routes
vi.mock('@rakuda/schema', () => ({
  ScrapedProductSchema: {},
  parseScrapedProduct: vi.fn((x: any) => x),
  generateSourceHash: vi.fn(() => 'hash-abc'),
}));

vi.mock('../../utils/csv', () => ({
  parseCsv: vi.fn(() => []),
  rowToProduct: vi.fn((row: any) => ({ title: row.title || 'Title', price: 1000 })),
  productsToCsv: vi.fn(() => 'id,title\n1,Test'),
  validateAndParseCsv: vi.fn((csv: string) => ({ valid: true, data: [{ title: 'A', price: '1000' }], errors: [], warnings: [], stats: { totalRows: 1, validRows: 1, invalidRows: 0, skippedRows: 0 } })),
  generateCsvTemplate: vi.fn(() => 'title,price\nexample,1000'),
}));

import { productsRouter } from '../../routes/products';
import { errorHandler } from '../../middleware/error-handler';

describe('productsRouter', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/products', productsRouter);
    app.use(errorHandler);
  });

  it('GET / - returns 200', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /export - returns CSV 200', async () => {
    const res = await request(app).get('/api/products/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('GET /:id - returns 200', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 'p1' });
    const res = await request(app).get('/api/products/p1');
    expect(res.status).toBe(200);
  });

  it('GET /:id - returns 404 when not found', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/products/none');
    expect(res.status).toBe(404);
  });

  it('POST /scrape - queues job (202)', async () => {
    const res = await request(app)
      .post('/api/products/scrape')
      .send({ url: 'https://example.com', source: 'mercari' });
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
  });

  it('POST /scrape - 400 when missing params', async () => {
    const res = await request(app).post('/api/products/scrape').send({});
    expect(res.status).toBe(400);
  });

  it('POST /scrape-seller - queues job (202)', async () => {
    const res = await request(app)
      .post('/api/products/scrape-seller')
      .send({ url: 'https://example.com/seller', source: 'mercari' });
    expect(res.status).toBe(202);
  });

  it('POST /scrape-seller - 400 when missing params', async () => {
    const res = await request(app).post('/api/products/scrape-seller').send({});
    expect(res.status).toBe(400);
  });

  it('POST / - creates product (201)', async () => {
    // ensure no existing
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/products')
      .send({
        sourceType: 'mercari',
        sourceUrl: 'https://example.com/item',
        sourceItemId: 's1',
        title: 'T',
        description: 'D',
        price: 1000,
        images: ['https://img'],
      });
    expect(res.status).toBe(201);
  });

  it('DELETE /:id - soft deletes product (200)', async () => {
    const res = await request(app).delete('/api/products/p1');
    expect(res.status).toBe(200);
  });

  it('GET /import/template - returns CSV 200', async () => {
    const res = await request(app).get('/api/products/import/template');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('POST /import/validate - returns 200 for valid CSV', async () => {
    const res = await request(app)
      .post('/api/products/import/validate')
      .send({ csv: 'title,price\nA,1000' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBeDefined();
  });

  it('POST /import/validate - 400 when csv missing', async () => {
    const res = await request(app).post('/api/products/import/validate').send({});
    expect(res.status).toBe(400);
  });

  it('POST /import - imports rows (200)', async () => {
    const res = await request(app)
      .post('/api/products/import')
      .send({ csv: 'title,price\nA,1000', sourceType: 'mercari' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /import - 400 on validation failure', async () => {
    const { validateAndParseCsv } = await import('../../utils/csv');
    (validateAndParseCsv as any).mockReturnValueOnce({ valid: false, data: [], errors: [{ row: 1, message: 'err' }], warnings: [], stats: { totalRows: 1, validRows: 0, invalidRows: 1, skippedRows: 0 } });
    const res = await request(app)
      .post('/api/products/import')
      .send({ csv: 'bad', sourceType: 'mercari' });
    expect(res.status).toBe(400);
  });

  it('DELETE /bulk - 200 and returns count', async () => {
    const res = await request(app).delete('/api/products/bulk').send({ ids: ['p1', 'p2'] });
    expect(res.status).toBe(200);
  });

  it('DELETE /bulk - 400 when ids missing', async () => {
    const res = await request(app).delete('/api/products/bulk').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /bulk - 200 with valid updates', async () => {
    const res = await request(app).patch('/api/products/bulk').send({ ids: ['p1'], updates: { status: 'ACTIVE' } });
    expect(res.status).toBe(200);
  });

  it('PATCH /bulk - 400 with invalid payload', async () => {
    const res = await request(app).patch('/api/products/bulk').send({ ids: [] });
    expect(res.status).toBe(400);
  });

  it('POST /bulk/publish - 200 when ids provided', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/products/bulk/publish').send({ ids: ['p1'] });
    expect(res.status).toBe(200);
  });

  it('POST /bulk/publish - 400 when ids missing', async () => {
    const res = await request(app).post('/api/products/bulk/publish').send({});
    expect(res.status).toBe(400);
  });

  it('POST /:id/preview-joom - 200 with preview', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 'p1', title: 'T', description: 'desc'.repeat(50), price: 1000, images: ['https://img'], processedImages: [], titleEn: 'T', descriptionEn: 'D', weight: 100, source: { id: 'src1' } });
    const res = await request(app).post('/api/products/p1/preview-joom').send({});
    expect(res.status).toBe(200);
  });

  it('POST /:id/preview-joom - 404 when product missing', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/products/none/preview-joom').send({});
    expect(res.status).toBe(404);
  });

  it('POST /restore - 200 when ids provided', async () => {
    prismaMock.product.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await request(app).post('/api/products/restore').send({ ids: ['p1'] });
    expect(res.status).toBe(200);
  });

  it('POST /restore - 400 when ids missing', async () => {
    const res = await request(app).post('/api/products/restore').send({});
    expect(res.status).toBe(400);
  });
});


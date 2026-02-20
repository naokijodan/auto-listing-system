import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
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

const prismaMock = {
  order: {
    findMany: vi.fn().mockResolvedValue([{ id: 'o1', marketplace: 'JOOM', total: 10, orderedAt: new Date() }]),
    count: vi.fn().mockResolvedValue(1),
    findUnique: vi.fn().mockResolvedValue({ id: 'o1', marketplace: 'JOOM', marketplaceOrderId: 'M1' }),
    aggregate: vi.fn().mockResolvedValue({ _sum: { total: 10 } }),
  },
  sale: {
    aggregate: vi.fn().mockResolvedValue({ _sum: { totalPrice: 10, costPrice: 5, profitJpy: 500 } }),
    findMany: vi.fn().mockResolvedValue([{ id: 's1', orderId: 'o1' }]),
    findUnique: vi.fn().mockResolvedValue({ id: 's1', totalPrice: 10 }),
    update: vi.fn().mockResolvedValue({ id: 's1' }),
  },
  exchangeRate: {
    findFirst: vi.fn().mockResolvedValue({ rate: 0.0067 }),
  },
  jobLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  notification: {
    create: vi.fn().mockResolvedValue({ id: 'n1' }),
  },
};

vi.mock('@rakuda/database', async () => ({ prisma: prismaMock }));
vi.mock('@rakuda/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } }));
vi.mock('@rakuda/config', () => ({ QUEUE_NAMES: { INVENTORY: 'inventory-queue' }, EXCHANGE_RATE_DEFAULTS: { JPY_TO_USD: 0.0067 } }));

import { ordersRouter } from '../../routes/orders';
import { errorHandler } from '../../middleware/error-handler';

describe('ordersRouter', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/orders', ordersRouter);
    app.use(errorHandler);
  });

  it('GET / - 200', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
  });

  it('GET /action-required - 200', async () => {
    const res = await request(app).get('/api/orders/action-required');
    expect(res.status).toBe(200);
  });

  it('GET /stats/summary - 200', async () => {
    const res = await request(app).get('/api/orders/stats/summary');
    expect(res.status).toBe(200);
  });

  it('GET /stats/daily - 200', async () => {
    const res = await request(app).get('/api/orders/stats/daily');
    expect(res.status).toBe(200);
  });

  it('GET /stats/by-marketplace - 200', async () => {
    const res = await request(app).get('/api/orders/stats/by-marketplace');
    expect(res.status).toBe(200);
  });

  it('PATCH /sales/:saleId - 200', async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce({ id: 's1', totalPrice: 10 });
    const res = await request(app).patch('/api/orders/sales/s1').send({ costPrice: 500 });
    expect(res.status).toBe(200);
  });

  it('PATCH /sales/:saleId - 404 when missing', async () => {
    prismaMock.sale.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).patch('/api/orders/sales/missing').send({ costPrice: 500 });
    expect(res.status).toBe(404);
  });

  it('GET /:id - 200', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({ id: 'o1' });
    const res = await request(app).get('/api/orders/o1');
    expect(res.status).toBe(200);
  });

  it('GET /:id - 404', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/orders/missing');
    expect(res.status).toBe(404);
  });

  it('PATCH /:id/shipping - 200', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({ id: 'o1', marketplace: 'JOOM', marketplaceOrderId: 'M1' });
    prismaMock.order.update.mockResolvedValueOnce({ id: 'o1' });
    const res = await request(app).patch('/api/orders/o1/shipping').send({ trackingNumber: 'TN', trackingCarrier: 'Yamato' });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id/shipping - 404 when missing', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).patch('/api/orders/none/shipping').send({});
    expect(res.status).toBe(404);
  });

  it('PATCH /:id/status - 200', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({ id: 'o1' });
    prismaMock.order.update = vi.fn().mockResolvedValue({ id: 'o1' });
    const res = await request(app).patch('/api/orders/o1/status').send({ status: 'SHIPPED' });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id/status - 404 when missing', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).patch('/api/orders/missing/status').send({ status: 'SHIPPED' });
    expect(res.status).toBe(404);
  });

  it('GET /:orderId/sales - 200', async () => {
    const res = await request(app).get('/api/orders/o1/sales');
    expect(res.status).toBe(200);
  });

  it('POST /sync - 202', async () => {
    const res = await request(app).post('/api/orders/sync').send({ marketplace: 'joom' });
    expect(res.status).toBe(202);
  });

  it('GET /sync/status - 200', async () => {
    const res = await request(app).get('/api/orders/sync/status');
    expect(res.status).toBe(200);
  });
});


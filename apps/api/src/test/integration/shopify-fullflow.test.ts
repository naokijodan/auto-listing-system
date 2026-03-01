import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma, mockQueue } from '../setup';

const app = createTestApp();

describe('API → Worker Job Flow (Shopify)', () => {
  beforeEach(() => {
    // reset mock counts
  });

  it('should queue Shopify publish job when publish endpoint is called', async () => {
    mockPrisma.shopifyProduct.findUnique.mockResolvedValue({ id: 'sp-123', status: 'PENDING' });
    mockPrisma.shopifyProduct.update.mockResolvedValue({ id: 'sp-123', status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/shopify-products/products/sp-123/publish')
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ message: 'Publishing started', productId: 'sp-123' }));
    expect(mockQueue.add).toHaveBeenCalledWith(
      'shopify-publish',
      expect.objectContaining({ type: 'publish', shopifyProductId: 'sp-123' }),
      expect.any(Object),
    );
  });

  it('should return publish status for queued product', async () => {
    mockPrisma.shopifyProduct.findUnique.mockResolvedValue({ id: 'sp-200', status: 'PENDING' });
    const res = await request(app)
      .get('/api/shopify-products/products/sp-200')
      .expect(200);
    expect(res.body.status).toBe('PENDING');
  });

  it('should return orders filtered by sourceChannel', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);

    await request(app)
      .get('/api/shopify-products/orders')
      .query({ sourceChannel: 'INSTAGRAM' })
      .expect(200);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ marketplace: 'SHOPIFY', sourceChannel: 'INSTAGRAM' }),
    }));
  });

  it('should return status payload including channels summary', async () => {
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({ id: 'cred-1' });
    mockPrisma.shopifyProduct.count.mockImplementation(async (args: any) => {
      if (!args) return 9;
      if (args?.where?.status === 'PENDING') return 5;
      if (args?.where?.status === 'ACTIVE') return 3;
      if (args?.where?.status === 'PAUSED') return 1;
      if (args?.where?.status === 'ERROR') return 0;
      return 0;
    });
    mockPrisma.order.count.mockImplementation(async (args: any) => {
      if (args?.where?.status === 'PENDING') return 2;
      if (args?.where?.status === 'SHIPPED') return 1;
      return 6;
    });

    const res = await request(app)
      .get('/api/shopify-products/status')
      .expect(200);

    expect(res.body).toHaveProperty('channels');
    expect(Array.isArray(res.body.channels)).toBe(true);
    expect(res.body.products).toEqual(expect.objectContaining({ total: 9, pending: 5, active: 3, paused: 1 }));
  });
});


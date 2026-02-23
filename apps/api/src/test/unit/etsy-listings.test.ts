/**
 * Etsy出品管理API ユニットテスト
 * Task 4: Phase 12 core - 主要APIユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoist mocks
const { mockEtsyListing, mockProduct, mockQueueAdd } = vi.hoisted(() => ({
  mockEtsyListing: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockProduct: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  mockQueueAdd: vi.fn().mockResolvedValue({ id: 'job-etsy-1' }),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
  })),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    etsyListing: mockEtsyListing,
    product: mockProduct,
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    ETSY_PUBLISH: 'etsy-publish',
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import etsyRouter from '../../routes/etsy';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/etsy', etsyRouter);
  return app;
}

describe('Etsy Listings API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/etsy/listings', () => {
    it('should return listings with pagination', async () => {
      const listings = [
        { id: '1', etsyListingId: '100001', title: 'Vintage Watch', status: 'ACTIVE' },
        { id: '2', etsyListingId: '100002', title: 'Antique Ring', status: 'DRAFT' },
      ];
      mockEtsyListing.findMany.mockResolvedValue(listings);
      mockEtsyListing.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/etsy/listings')
        .query({ limit: '10', offset: '0' });

      expect(response.status).toBe(200);
      expect(response.body.listings).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockEtsyListing.findMany.mockResolvedValue([]);
      mockEtsyListing.count.mockResolvedValue(0);

      await request(app)
        .get('/api/etsy/listings')
        .query({ status: 'ACTIVE' });

      expect(mockEtsyListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockEtsyListing.findMany.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/etsy/listings');
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/etsy/listings/:id', () => {
    it('should return a listing by id', async () => {
      const listing = {
        id: '1',
        etsyListingId: '100001',
        title: 'Vintage Watch',
        status: 'ACTIVE',
      };
      mockEtsyListing.findUnique.mockResolvedValue(listing);

      const response = await request(app).get('/api/etsy/listings/1');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });

    it('should return 404 for non-existent listing', async () => {
      mockEtsyListing.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/etsy/listings/999');
      expect(response.status).toBe(404);
    });
  });
});

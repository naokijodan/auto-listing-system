import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockCompetitorTracker, mockCompetitorPriceLog, mockCompetitorAlert } = vi.hoisted(() => ({
  mockCompetitorTracker: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mockCompetitorPriceLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  mockCompetitorAlert: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    competitorTracker: mockCompetitorTracker,
    competitorPriceLog: mockCompetitorPriceLog,
    competitorAlert: mockCompetitorAlert,
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Import after mocks
import { competitorMonitoringRouter } from '../../routes/competitor-monitoring';

describe('Competitor Monitoring API', () => {
  let app: express.Application;

  const mockTracker = {
    id: 'tracker-1',
    listingId: 'listing-1',
    productId: 'product-1',
    competitorIdentifier: 'comp-123',
    marketplace: 'eBay',
    url: 'https://ebay.com/item/123',
    title: 'Competitor Product',
    matchMethod: 'manual',
    matchConfidence: 1.0,
    checkInterval: 360,
    alertOnPriceDrop: true,
    alertOnPriceRise: false,
    alertThresholdPercent: 5.0,
    autoAdjustPrice: false,
    currentPrice: 100,
    isActive: true,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPriceLog = {
    id: 'log-1',
    trackerId: 'tracker-1',
    listingId: 'listing-1',
    price: 100,
    priceChangePercent: -2.5,
    recordedAt: new Date(),
  };

  const mockAlert = {
    id: 'alert-1',
    trackerId: 'tracker-1',
    listingId: 'listing-1',
    alertType: 'price_drop',
    severity: 'high',
    status: 'pending',
    message: 'Competitor price dropped by 10%',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/competitor-monitoring', competitorMonitoringRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/competitor-monitoring/trackers', () => {
    it('should return list of trackers', async () => {
      mockCompetitorTracker.findMany.mockResolvedValue([mockTracker]);
      mockCompetitorTracker.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by listingId', async () => {
      mockCompetitorTracker.findMany.mockResolvedValue([mockTracker]);
      mockCompetitorTracker.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers?listingId=listing-1');

      expect(response.status).toBe(200);
      expect(mockCompetitorTracker.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingId: 'listing-1',
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      mockCompetitorTracker.findMany.mockResolvedValue([mockTracker]);
      mockCompetitorTracker.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers?isActive=true');

      expect(response.status).toBe(200);
      expect(mockCompetitorTracker.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockCompetitorTracker.findMany.mockResolvedValue([]);
      mockCompetitorTracker.count.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });
  });

  describe('POST /api/competitor-monitoring/trackers', () => {
    it('should create new tracker', async () => {
      mockCompetitorTracker.create.mockResolvedValue(mockTracker);

      const response = await request(app)
        .post('/api/competitor-monitoring/trackers')
        .send({
          competitorIdentifier: 'comp-123',
          marketplace: 'eBay',
          url: 'https://ebay.com/item/123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/competitor-monitoring/trackers')
        .send({
          marketplace: 'eBay',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should apply default values', async () => {
      mockCompetitorTracker.create.mockResolvedValue(mockTracker);

      await request(app)
        .post('/api/competitor-monitoring/trackers')
        .send({
          competitorIdentifier: 'comp-123',
          marketplace: 'eBay',
          url: 'https://ebay.com/item/123',
        });

      expect(mockCompetitorTracker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchMethod: 'manual',
          matchConfidence: 1.0,
          checkInterval: 360,
          alertOnPriceDrop: true,
          alertOnPriceRise: false,
          alertThresholdPercent: 5.0,
          autoAdjustPrice: false,
        }),
      });
    });
  });

  describe('GET /api/competitor-monitoring/trackers/:id', () => {
    it('should return single tracker with recent prices', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(mockTracker);
      mockCompetitorPriceLog.findMany.mockResolvedValue([mockPriceLog]);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers/tracker-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('tracker-1');
      expect(response.body.data.recentPrices).toHaveLength(1);
    });

    it('should return 404 for non-existent tracker', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/competitor-monitoring/trackers/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/competitor-monitoring/trackers/:id', () => {
    it('should update tracker', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(mockTracker);
      mockCompetitorTracker.update.mockResolvedValue({
        ...mockTracker,
        isActive: false,
      });

      const response = await request(app)
        .put('/api/competitor-monitoring/trackers/tracker-1')
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent tracker', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/competitor-monitoring/trackers/non-existent')
        .send({ isActive: false });

      expect(response.status).toBe(404);
    });

    it('should update verification status', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(mockTracker);
      mockCompetitorTracker.update.mockResolvedValue({
        ...mockTracker,
        isVerified: true,
        verifiedBy: 'user-1',
        verifiedAt: new Date(),
      });

      const response = await request(app)
        .put('/api/competitor-monitoring/trackers/tracker-1')
        .send({ isVerified: true, verifiedBy: 'user-1' });

      expect(response.status).toBe(200);
      expect(mockCompetitorTracker.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isVerified: true,
            verifiedBy: 'user-1',
            verifiedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('DELETE /api/competitor-monitoring/trackers/:id', () => {
    it('should delete tracker', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(mockTracker);
      mockCompetitorTracker.delete.mockResolvedValue(mockTracker);

      const response = await request(app)
        .delete('/api/competitor-monitoring/trackers/tracker-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tracker deleted');
    });

    it('should return 404 for non-existent tracker', async () => {
      mockCompetitorTracker.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/competitor-monitoring/trackers/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/competitor-monitoring/prices', () => {
    it('should return price history', async () => {
      mockCompetitorPriceLog.findMany.mockResolvedValue([mockPriceLog]);

      const response = await request(app)
        .get('/api/competitor-monitoring/prices');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by trackerId', async () => {
      mockCompetitorPriceLog.findMany.mockResolvedValue([mockPriceLog]);

      const response = await request(app)
        .get('/api/competitor-monitoring/prices?trackerId=tracker-1');

      expect(response.status).toBe(200);
      expect(mockCompetitorPriceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trackerId: 'tracker-1',
          }),
        })
      );
    });

    it('should filter by days', async () => {
      mockCompetitorPriceLog.findMany.mockResolvedValue([mockPriceLog]);

      await request(app)
        .get('/api/competitor-monitoring/prices?days=7');

      expect(mockCompetitorPriceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
    });
  });

  describe('GET /api/competitor-monitoring/alerts', () => {
    it('should return list of alerts', async () => {
      mockCompetitorAlert.findMany.mockResolvedValue([mockAlert]);
      mockCompetitorAlert.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/alerts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      mockCompetitorAlert.findMany.mockResolvedValue([mockAlert]);
      mockCompetitorAlert.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/alerts?status=pending');

      expect(response.status).toBe(200);
      expect(mockCompetitorAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
          }),
        })
      );
    });

    it('should filter by alertType', async () => {
      mockCompetitorAlert.findMany.mockResolvedValue([mockAlert]);
      mockCompetitorAlert.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/competitor-monitoring/alerts?alertType=price_drop');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/competitor-monitoring/alerts/:id/acknowledge', () => {
    it('should acknowledge alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(mockAlert);
      mockCompetitorAlert.update.mockResolvedValue({
        ...mockAlert,
        status: 'acknowledged',
      });

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/alert-1/acknowledge')
        .send({ acknowledgedBy: 'user-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alert acknowledged');
    });

    it('should return 404 for non-existent alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/non-existent/acknowledge');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/competitor-monitoring/alerts/:id/resolve', () => {
    it('should resolve alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(mockAlert);
      mockCompetitorAlert.update.mockResolvedValue({
        ...mockAlert,
        status: 'resolved',
      });

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/alert-1/resolve');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Alert resolved');
    });

    it('should return 404 for non-existent alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/non-existent/resolve');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/competitor-monitoring/alerts/:id/dismiss', () => {
    it('should dismiss alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(mockAlert);
      mockCompetitorAlert.update.mockResolvedValue({
        ...mockAlert,
        status: 'dismissed',
      });

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/alert-1/dismiss');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Alert dismissed');
    });

    it('should return 404 for non-existent alert', async () => {
      mockCompetitorAlert.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/competitor-monitoring/alerts/non-existent/dismiss');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/competitor-monitoring/stats', () => {
    it('should return monitoring statistics', async () => {
      mockCompetitorTracker.count.mockResolvedValue(10);
      mockCompetitorAlert.count.mockResolvedValue(5);
      mockCompetitorPriceLog.count.mockResolvedValue(100);
      mockCompetitorPriceLog.findMany.mockResolvedValue([
        { priceChangePercent: -2.5 },
        { priceChangePercent: 3.0 },
      ]);
      mockCompetitorAlert.groupBy.mockResolvedValue([
        { alertType: 'price_drop', _count: 3 },
        { alertType: 'price_rise', _count: 2 },
      ]);

      const response = await request(app)
        .get('/api/competitor-monitoring/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.trackers).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.priceChecks).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockCompetitorTracker.count.mockResolvedValue(10);
      mockCompetitorAlert.count.mockResolvedValue(5);
      mockCompetitorPriceLog.count.mockResolvedValue(100);
      mockCompetitorPriceLog.findMany.mockResolvedValue([]);
      mockCompetitorAlert.groupBy.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/competitor-monitoring/stats?days=30');

      expect(response.status).toBe(200);
      expect(response.body.data.period.days).toBe(30);
    });
  });
});

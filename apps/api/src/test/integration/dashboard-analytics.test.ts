import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    product: { count: vi.fn() },
    listing: { count: vi.fn(), findMany: vi.fn() },
    priceRecommendation: { findMany: vi.fn() },
    priceChangeLog: { findMany: vi.fn(), count: vi.fn() },
    competitorTracker: { count: vi.fn() },
    competitorAlert: { count: vi.fn(), findMany: vi.fn() },
    competitorPriceLog: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
    priceHistory: { findMany: vi.fn() },
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
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
import { dashboardAnalyticsRouter } from '../../routes/dashboard-analytics';

describe('Dashboard Analytics API', () => {
  let app: express.Application;

  const mockOrder = {
    id: 'order-1',
    total: 100,
    marketplace: 'eBay',
    createdAt: new Date(),
    sales: [
      { sku: 'SKU-1', title: 'Product 1', totalPrice: 50, profitJpy: 10 },
      { sku: 'SKU-2', title: 'Product 2', totalPrice: 50, profitJpy: 15 },
    ],
  };

  const mockListing = {
    id: 'listing-1',
    listingPrice: 100,
    status: 'ACTIVE',
    createdAt: new Date(),
    product: { price: 70 },
  };

  const mockRecommendation = {
    id: 'rec-1',
    status: 'APPLIED',
    createdAt: new Date(),
  };

  const mockPriceChange = {
    id: 'change-1',
    oldPrice: 100,
    newPrice: 95,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardAnalyticsRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary', async () => {
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.listing.count.mockResolvedValue(50);
      mockPrisma.listing.findMany.mockResolvedValue([mockListing]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([mockPriceChange]);
      mockPrisma.competitorTracker.count.mockResolvedValue(20);
      mockPrisma.competitorAlert.count.mockResolvedValue(5);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const response = await request(app)
        .get('/api/dashboard/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.pricing).toBeDefined();
      expect(response.body.data.competitors).toBeDefined();
      expect(response.body.data.inventory).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.listing.count.mockResolvedValue(50);
      mockPrisma.listing.findMany.mockResolvedValue([]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);
      mockPrisma.competitorTracker.count.mockResolvedValue(0);
      mockPrisma.competitorAlert.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/summary?days=30');

      expect(response.status).toBe(200);
      expect(response.body.data.period.days).toBe(30);
    });

    it('should calculate revenue and margin', async () => {
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.listing.count.mockResolvedValue(50);
      mockPrisma.listing.findMany.mockResolvedValue([mockListing]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);
      mockPrisma.competitorTracker.count.mockResolvedValue(0);
      mockPrisma.competitorAlert.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder, mockOrder]);

      const response = await request(app)
        .get('/api/dashboard/summary');

      expect(response.status).toBe(200);
      expect(response.body.data.overview.totalRevenue).toBe(200);
      expect(response.body.data.overview.ordersCount).toBe(2);
    });
  });

  describe('GET /api/dashboard/trends/pricing', () => {
    it('should return pricing trends', async () => {
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([mockPriceChange]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);

      const response = await request(app)
        .get('/api/dashboard/trends/pricing');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.priceChanges).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
    });

    it('should accept days parameter', async () => {
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/trends/pricing?days=14');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/trends/competitors', () => {
    it('should return competitor trends', async () => {
      mockPrisma.competitorPriceLog.findMany.mockResolvedValue([
        { recordedAt: new Date(), priceChangePercent: -5 },
      ]);
      mockPrisma.competitorAlert.findMany.mockResolvedValue([
        { createdAt: new Date(), alertType: 'price_drop' },
      ]);

      const response = await request(app)
        .get('/api/dashboard/trends/competitors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.priceChecks).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
    });
  });

  describe('GET /api/dashboard/trends/sales', () => {
    it('should return sales trends', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const response = await request(app)
        .get('/api/dashboard/trends/sales');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.daily).toBeDefined();
      expect(response.body.data.topCategories).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    it('should calculate summary correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder, mockOrder]);

      const response = await request(app)
        .get('/api/dashboard/trends/sales');

      expect(response.status).toBe(200);
      expect(response.body.data.summary.totalOrders).toBe(2);
      expect(response.body.data.summary.totalRevenue).toBe(200);
    });
  });

  describe('GET /api/dashboard/top-performers', () => {
    it('should return top performers', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { sku: 'SKU-1', title: 'Product 1', totalPrice: 100, order: { createdAt: new Date() } },
        { sku: 'SKU-1', title: 'Product 1', totalPrice: 150, order: { createdAt: new Date() } },
        { sku: 'SKU-2', title: 'Product 2', totalPrice: 50, order: { createdAt: new Date() } },
      ]);

      const response = await request(app)
        .get('/api/dashboard/top-performers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.byRevenue).toBeDefined();
      expect(response.body.data.byOrderCount).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/top-performers?limit=5');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/kpis', () => {
    it('should return KPI metrics with period comparison', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([mockOrder, mockOrder]) // current
        .mockResolvedValueOnce([mockOrder]); // previous
      mockPrisma.listing.count
        .mockResolvedValueOnce(10) // current
        .mockResolvedValueOnce(8); // previous
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([mockPriceChange]);

      const response = await request(app)
        .get('/api/dashboard/kpis');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.revenue.current).toBeDefined();
      expect(response.body.data.revenue.previous).toBeDefined();
      expect(response.body.data.revenue.changePercent).toBeDefined();
      expect(response.body.data.orders).toBeDefined();
      expect(response.body.data.listings).toBeDefined();
    });

    it('should calculate change percent correctly', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ total: 200, createdAt: new Date() }])
        .mockResolvedValueOnce([{ total: 100, createdAt: new Date() }]);
      mockPrisma.listing.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/kpis');

      expect(response.status).toBe(200);
      expect(response.body.data.revenue.changePercent).toBe(100);
      expect(response.body.data.listings.changePercent).toBe(100);
    });
  });

  describe('GET /api/dashboard/forecast/sales', () => {
    it('should return sales forecast', async () => {
      const orders = Array.from({ length: 30 }, (_, i) => ({
        total: 100 + Math.random() * 50,
        createdAt: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const response = await request(app)
        .get('/api/dashboard/forecast/sales');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.forecasts).toBeDefined();
      expect(response.body.data.basedOn).toBeDefined();
    });

    it('should return message when insufficient data', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const response = await request(app)
        .get('/api/dashboard/forecast/sales');

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('Insufficient');
    });

    it('should accept days parameter', async () => {
      const orders = Array.from({ length: 30 }, (_, i) => ({
        total: 100,
        createdAt: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const response = await request(app)
        .get('/api/dashboard/forecast/sales?days=14');

      expect(response.status).toBe(200);
      expect(response.body.data.forecasts).toHaveLength(14);
    });
  });

  describe('GET /api/dashboard/seasonality', () => {
    it('should return seasonality analysis', async () => {
      const orders = Array.from({ length: 50 }, () => ({
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const response = await request(app)
        .get('/api/dashboard/seasonality');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.weekdayPattern).toBeDefined();
      expect(response.body.data.hourlyPattern).toBeDefined();
      expect(response.body.data.totalOrders).toBe(50);
    });
  });

  describe('GET /api/dashboard/reports/daily', () => {
    it('should return daily report in JSON format', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.listing.count.mockResolvedValue(5);
      mockPrisma.priceChangeLog.count.mockResolvedValue(3);
      mockPrisma.competitorAlert.count.mockResolvedValue(2);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);

      const response = await request(app)
        .get('/api/dashboard/reports/daily');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('daily');
      expect(response.body.data.sections).toBeDefined();
    });

    it('should return daily report in markdown format', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.listing.count.mockResolvedValue(5);
      mockPrisma.priceChangeLog.count.mockResolvedValue(3);
      mockPrisma.competitorAlert.count.mockResolvedValue(2);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/reports/daily?format=markdown');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
    });

    it('should return daily report in CSV format', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.listing.count.mockResolvedValue(5);
      mockPrisma.priceChangeLog.count.mockResolvedValue(3);
      mockPrisma.competitorAlert.count.mockResolvedValue(2);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/reports/daily?format=csv');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should accept date parameter', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.listing.count.mockResolvedValue(0);
      mockPrisma.priceChangeLog.count.mockResolvedValue(0);
      mockPrisma.competitorAlert.count.mockResolvedValue(0);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/reports/daily?date=2026-01-15');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/reports/weekly', () => {
    it('should return weekly report', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.listing.count.mockResolvedValue(5);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([mockPriceChange]);
      mockPrisma.competitorAlert.count.mockResolvedValue(2);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);

      const response = await request(app)
        .get('/api/dashboard/reports/weekly');

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('weekly');
      expect(response.body.data.sections.weeklySummary).toBeDefined();
      expect(response.body.data.sections.dailyBreakdown).toBeDefined();
    });
  });

  describe('GET /api/dashboard/reports/monthly', () => {
    it('should return monthly report', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.listing.count.mockResolvedValue(50);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([mockPriceChange]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      mockPrisma.competitorTracker.count.mockResolvedValue(20);
      mockPrisma.competitorAlert.count.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/dashboard/reports/monthly');

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('monthly');
      expect(response.body.data.sections.monthlySummary).toBeDefined();
      expect(response.body.data.sections.inventory).toBeDefined();
      expect(response.body.data.sections.competitorAnalysis).toBeDefined();
    });

    it('should accept month parameter', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.listing.count.mockResolvedValue(0);
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([]);
      mockPrisma.priceRecommendation.findMany.mockResolvedValue([]);
      mockPrisma.competitorTracker.count.mockResolvedValue(0);
      mockPrisma.competitorAlert.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/dashboard/reports/monthly?month=2026-01-01');

      expect(response.status).toBe(200);
    });
  });
});

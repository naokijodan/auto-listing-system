import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockPrisma } from '../setup';
import { analyticsRouter } from '../../routes/analytics';
import { errorHandler } from '../../middleware/error-handler';

describe('Analytics Financial Reports API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/financial/pnl', () => {
    it('should return profit/loss statement for default period', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          marketplace: 'EBAY',
          subtotal: 100,
          shippingCost: 15,
          tax: 5,
          marketplaceFee: 13,
          paymentFee: 3,
          sales: [
            { quantity: 1, costPrice: 5000 }, // 5000 JPY
          ],
        },
        {
          id: 'order-2',
          marketplace: 'JOOM',
          subtotal: 50,
          shippingCost: 10,
          tax: 2,
          marketplaceFee: 7.5,
          paymentFee: 1.5,
          sales: [
            { quantity: 2, costPrice: 2000 },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: 'rate-1',
        rate: 0.0067,
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        fetchedAt: new Date(),
      });

      const response = await request(app).get('/api/analytics/financial/pnl');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.orderCount).toBe(2);
      expect(response.body.data.summary.itemCount).toBe(3);
      expect(response.body.data.revenue.gross).toBe(150);
      expect(response.body.data.costs.marketplaceFees).toBe(20.5);
      expect(response.body.data.costs.paymentFees).toBe(4.5);
      expect(response.body.data.profit).toHaveProperty('gross');
      expect(response.body.data.profit).toHaveProperty('operating');
      expect(response.body.data.profit).toHaveProperty('net');
    });

    it('should accept custom date range', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/financial/pnl')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period.start).toContain('2025-01-01');
    });

    it('should support different periods', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      for (const period of ['week', 'month', 'quarter', 'year']) {
        const response = await request(app)
          .get('/api/analytics/financial/pnl')
          .query({ period });

        expect(response.status).toBe(200);
        expect(response.body.data.period.label).toBe(period);
      }
    });
  });

  describe('GET /api/analytics/financial/fees', () => {
    it('should return fee breakdown by marketplace', async () => {
      const mockOrders = [
        { marketplace: 'EBAY', subtotal: 100, shippingCost: 15, marketplaceFee: 13, paymentFee: 3 },
        { marketplace: 'EBAY', subtotal: 80, shippingCost: 12, marketplaceFee: 10.4, paymentFee: 2.4 },
        { marketplace: 'JOOM', subtotal: 50, shippingCost: 10, marketplaceFee: 7.5, paymentFee: 1.5 },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const response = await request(app).get('/api/analytics/financial/fees');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.byMarketplace.EBAY).toBeDefined();
      expect(response.body.data.byMarketplace.EBAY.orderCount).toBe(2);
      expect(response.body.data.byMarketplace.JOOM).toBeDefined();
      expect(response.body.data.byMarketplace.JOOM.orderCount).toBe(1);
      expect(response.body.data.totals.orderCount).toBe(3);
      expect(response.body.data.byMarketplace.EBAY.effectiveFeeRate).toBeGreaterThan(0);
    });

    it('should handle empty orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/analytics/financial/fees');

      expect(response.status).toBe(200);
      expect(response.body.data.totals.orderCount).toBe(0);
      expect(response.body.data.totals.totalFees).toBe(0);
    });
  });

  describe('GET /api/analytics/financial/roi', () => {
    it('should calculate ROI by category', async () => {
      const mockSales = [
        {
          id: 'sale-1',
          productId: 'prod-1',
          quantity: 1,
          totalPrice: 100,
          costPrice: 5000,
          order: { marketplaceFee: 13, paymentFee: 3, orderedAt: new Date() },
        },
        {
          id: 'sale-2',
          productId: 'prod-2',
          quantity: 2,
          totalPrice: 80,
          costPrice: 3000,
          order: { marketplaceFee: 10.4, paymentFee: 2.4, orderedAt: new Date() },
        },
      ];

      const mockProducts = [
        { id: 'prod-1', category: '時計', brand: 'Seiko', price: 5000 },
        { id: 'prod-2', category: '時計', brand: 'Citizen', price: 3000 },
      ];

      mockPrisma.sale.findMany.mockResolvedValue(mockSales);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });

      const response = await request(app)
        .get('/api/analytics/financial/roi')
        .query({ groupBy: 'category' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.groupBy).toBe('category');
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.items[0]).toHaveProperty('roi');
      expect(response.body.data.items[0]).toHaveProperty('profitMargin');
      expect(response.body.data.totals).toHaveProperty('roi');
    });

    it('should support grouping by brand', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/financial/roi')
        .query({ groupBy: 'brand' });

      expect(response.status).toBe(200);
      expect(response.body.data.groupBy).toBe('brand');
    });

    it('should support grouping by product', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/financial/roi')
        .query({ groupBy: 'product' });

      expect(response.status).toBe(200);
      expect(response.body.data.groupBy).toBe('product');
    });
  });

  describe('GET /api/analytics/financial/tax-export', () => {
    it('should return tax export data in JSON format', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          marketplace: 'EBAY',
          marketplaceOrderId: 'EBAY-123',
          subtotal: 100,
          shippingCost: 15,
          tax: 5,
          marketplaceFee: 13,
          paymentFee: 3,
          orderedAt: new Date('2025-03-15'),
          sales: [
            { title: 'Seiko Watch', quantity: 1, costPrice: 5000 },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.exchangeRate.findMany.mockResolvedValue([
        { rate: 0.0067, fetchedAt: new Date('2025-03-01') },
      ]);

      const response = await request(app)
        .get('/api/analytics/financial/tax-export')
        .query({ year: 2025 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period.year).toBe(2025);
      expect(response.body.data.summary.total).toBeDefined();
      expect(response.body.data.summary.monthly).toBeInstanceOf(Array);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.transactions.length).toBe(1);
      expect(response.body.data.transactions[0].orderId).toBe('EBAY-123');
    });

    it('should support quarterly export', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analytics/financial/tax-export')
        .query({ year: 2025, quarter: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.period.quarter).toBe(1);
    });

    it('should export as CSV when format=csv', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          marketplace: 'EBAY',
          marketplaceOrderId: 'EBAY-123',
          subtotal: 100,
          shippingCost: 15,
          tax: 5,
          marketplaceFee: 13,
          paymentFee: 3,
          orderedAt: new Date('2025-03-15'),
          sales: [
            { title: 'Seiko Watch', quantity: 1, costPrice: 5000 },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.exchangeRate.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analytics/financial/tax-export')
        .query({ year: 2025, format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('tax-report-2025.csv');
      expect(response.text).toContain('日付,注文ID');
      expect(response.text).toContain('EBAY-123');
    });
  });

  describe('GET /api/analytics/financial/daily', () => {
    it('should return daily financial data', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockOrders = [
        {
          id: 'order-1',
          subtotal: 100,
          marketplaceFee: 13,
          paymentFee: 3,
          orderedAt: today,
          sales: [{ quantity: 1, costPrice: 5000 }],
        },
        {
          id: 'order-2',
          subtotal: 50,
          marketplaceFee: 7.5,
          paymentFee: 1.5,
          orderedAt: yesterday,
          sales: [{ quantity: 2, costPrice: 2000 }],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: 0.0067 });

      const response = await request(app)
        .get('/api/analytics/financial/daily')
        .query({ days: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(7);
      expect(response.body.data[0]).toHaveProperty('date');
      expect(response.body.data[0]).toHaveProperty('orders');
      expect(response.body.data[0]).toHaveProperty('revenue');
      expect(response.body.data[0]).toHaveProperty('cost');
      expect(response.body.data[0]).toHaveProperty('fees');
      expect(response.body.data[0]).toHaveProperty('profit');
    });

    it('should limit days to 90 max', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/financial/daily')
        .query({ days: 365 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(90);
    });

    it('should require minimum of 7 days', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/financial/daily')
        .query({ days: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(7);
    });
  });
});

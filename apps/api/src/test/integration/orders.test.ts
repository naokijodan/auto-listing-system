import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockPrisma } from '../setup';
import { ordersRouter } from '../../routes/orders';
import { errorHandler } from '../../middleware/error-handler';

describe('Orders API', () => {
  // Create a dedicated test app with proper middleware order
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should return orders list', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          marketplace: 'EBAY',
          marketplaceOrderId: 'ebay-123',
          buyerUsername: 'buyer1',
          total: 99.99,
          status: 'CONFIRMED',
          orderedAt: new Date(),
          sales: [
            { id: 'sale-1', sku: 'SKU-1', title: 'Product 1', quantity: 1, unitPrice: 99.99, totalPrice: 99.99 },
          ],
        },
        {
          id: 'order-2',
          marketplace: 'JOOM',
          marketplaceOrderId: 'joom-456',
          buyerUsername: 'buyer2',
          total: 49.99,
          status: 'SHIPPED',
          orderedAt: new Date(),
          sales: [],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(2);

      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by marketplace', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          marketplace: 'EBAY',
          marketplaceOrderId: 'ebay-123',
          total: 99.99,
          status: 'CONFIRMED',
          sales: [],
        },
      ]);
      mockPrisma.order.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/orders')
        .query({ marketplace: 'EBAY' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'SHIPPED' });

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/orders')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
    });

    it('should search by order ID or buyer', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/orders')
        .query({ search: 'buyer1' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: 'order-1',
        marketplace: 'EBAY',
        marketplaceOrderId: 'ebay-123',
        buyerUsername: 'buyer1',
        buyerEmail: 'buyer@example.com',
        buyerName: 'Test Buyer',
        shippingAddress: {
          addressLine1: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
          country: 'US',
        },
        subtotal: 89.99,
        shippingCost: 10.00,
        tax: 0,
        total: 99.99,
        currency: 'USD',
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
        orderedAt: new Date(),
        sales: [
          {
            id: 'sale-1',
            sku: 'SKU-1',
            title: 'Product 1',
            quantity: 1,
            unitPrice: 89.99,
            totalPrice: 89.99,
          },
        ],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app).get('/api/orders/order-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('order-1');
      expect(response.body.data.buyerUsername).toBe('buyer1');
      expect(response.body.data.sales).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/orders/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/orders/:id/shipping', () => {
    it('should update shipping information', async () => {
      const mockOrder = {
        id: 'order-1',
        marketplace: 'EBAY',
        marketplaceOrderId: 'ebay-123',
        status: 'CONFIRMED',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        trackingNumber: 'TRACK123456',
        trackingCarrier: 'ePacket',
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        shippedAt: new Date(),
      });
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        type: 'ORDER_SHIPPED',
      });

      const response = await request(app)
        .patch('/api/orders/order-1/shipping')
        .send({
          trackingNumber: 'TRACK123456',
          trackingCarrier: 'ePacket',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe('TRACK123456');
      expect(response.body.data.status).toBe('SHIPPED');
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/orders/non-existent/shipping')
        .send({
          trackingNumber: 'TRACK123456',
          trackingCarrier: 'ePacket',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      });

      const response = await request(app)
        .patch('/api/orders/order-1/status')
        .send({
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('GET /api/orders/stats/summary', () => {
    it('should return order statistics', async () => {
      mockPrisma.order.count.mockImplementation(async ({ where }: any) => {
        if (!where) return 100;
        if (where.status === 'PENDING') return 10;
        if (where.status === 'PROCESSING') return 5;
        if (where.status === 'SHIPPED') return 20;
        if (where.status === 'DELIVERED') return 60;
        if (where.status === 'CANCELLED') return 5;
        return 100;
      });

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 9999.99 },
      });

      mockPrisma.sale.aggregate.mockResolvedValue({
        _sum: {
          totalPrice: 9999.99,
          costPrice: 5000,
          profitJpy: 300000,
        },
      });

      const response = await request(app).get('/api/orders/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.total).toBe(100);
      expect(response.body.data.revenue.total).toBe(9999.99);
    });

    it('should filter statistics by marketplace', async () => {
      mockPrisma.order.count.mockResolvedValue(50);
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 5000 },
      });
      mockPrisma.sale.aggregate.mockResolvedValue({
        _sum: { totalPrice: 5000, costPrice: 2500, profitJpy: 150000 },
      });

      const response = await request(app)
        .get('/api/orders/stats/summary')
        .query({ marketplace: 'EBAY' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/orders/stats/daily', () => {
    it('should return daily sales statistics', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.order.findMany.mockResolvedValue([
        { orderedAt: today, total: 100, marketplace: 'EBAY' },
        { orderedAt: today, total: 50, marketplace: 'EBAY' },
        { orderedAt: yesterday, total: 75, marketplace: 'JOOM' },
      ]);

      const response = await request(app)
        .get('/api/orders/stats/daily')
        .query({ days: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/orders/stats/by-marketplace', () => {
    it('should return sales by marketplace', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([
        { marketplace: 'EBAY', _count: { id: 60 }, _sum: { total: 6000 } },
        { marketplace: 'JOOM', _count: { id: 40 }, _sum: { total: 4000 } },
      ]);

      const response = await request(app).get('/api/orders/stats/by-marketplace');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].marketplace).toBe('EBAY');
      expect(response.body.data[0].orderCount).toBe(60);
    });
  });

  describe('GET /api/orders/:orderId/sales', () => {
    it('should return sales for an order', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        {
          id: 'sale-1',
          orderId: 'order-1',
          sku: 'SKU-1',
          title: 'Product 1',
          quantity: 2,
          unitPrice: 25,
          totalPrice: 50,
          costPrice: 1000,
          profitJpy: 5000,
          profitRate: 50,
        },
        {
          id: 'sale-2',
          orderId: 'order-1',
          sku: 'SKU-2',
          title: 'Product 2',
          quantity: 1,
          unitPrice: 49.99,
          totalPrice: 49.99,
        },
      ]);

      const response = await request(app).get('/api/orders/order-1/sales');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PATCH /api/orders/sales/:saleId', () => {
    it('should update sale cost price and calculate profit', async () => {
      const mockSale = {
        id: 'sale-1',
        orderId: 'order-1',
        totalPrice: 100,
      };

      mockPrisma.sale.findUnique.mockResolvedValue(mockSale);
      mockPrisma.sale.update.mockResolvedValue({
        ...mockSale,
        costPrice: 5000,
        profitJpy: 10000,
        profitRate: 200,
      });

      const response = await request(app)
        .patch('/api/orders/sales/sale-1')
        .send({ costPrice: 5000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.costPrice).toBe(5000);
    });

    it('should return 404 for non-existent sale', async () => {
      mockPrisma.sale.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/orders/sales/non-existent')
        .send({ costPrice: 5000 });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/orders/action-required', () => {
    it('should return orders requiring action', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          status: 'CONFIRMED',
          marketplace: 'EBAY',
          marketplaceOrderId: 'ebay-123',
          sales: [{ id: 'sale-1', sku: 'SKU-1', title: 'Product', quantity: 1 }],
        },
        {
          id: 'order-2',
          status: 'PROCESSING',
          fulfillmentStatus: 'UNFULFILLED',
          marketplace: 'JOOM',
          marketplaceOrderId: 'joom-456',
          sales: [],
        },
      ]);

      const response = await request(app).get('/api/orders/action-required');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
  });
});

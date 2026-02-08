import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// Mock API clients
vi.mock('../../lib/joom-api', () => ({
  JoomApiClient: vi.fn().mockImplementation(() => ({
    getOrders: vi.fn(),
  })),
}));

vi.mock('../../lib/ebay-api', () => ({
  EbayApiClient: vi.fn().mockImplementation(() => ({
    getOrders: vi.fn(),
  })),
}));

import { processOrderSyncJob } from '../../processors/order-sync';
import { JoomApiClient } from '../../lib/joom-api';
import { EbayApiClient } from '../../lib/ebay-api';

describe('Order Sync Processor', () => {
  const mockJoomClient = {
    getOrders: vi.fn(),
  };

  const mockEbayClient = {
    getOrders: vi.fn(),
  };

  const baseJob = {
    id: 'job-123',
    data: {
      marketplace: 'joom' as const,
      sinceDays: 7,
      maxOrders: 100,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (JoomApiClient as any).mockImplementation(() => mockJoomClient);
    (EbayApiClient as any).mockImplementation(() => mockEbayClient);
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-1' });
    mockPrisma.sale.create.mockResolvedValue({ id: 'sale-1' });
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('Joom Order Sync', () => {
    it('should sync new orders from Joom', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'joom-order-1',
              orderId: 'ORD-001',
              status: 'approved',
              total: { amount: 29.99, currency: 'USD' },
              shipping: {
                cost: 5.00,
                address: {
                  street: '123 Main St',
                  city: 'New York',
                  state: 'NY',
                  country: 'US',
                  postalCode: '10001',
                },
              },
              buyer: { username: 'buyer1', name: 'John Doe' },
              createdAt: '2026-02-01T10:00:00Z',
              items: [
                { sku: 'SKU-001', title: 'Product 1', quantity: 1, unitPrice: 24.99 },
              ],
            },
          ],
        },
      });

      const result = await processOrderSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalFetched).toBe(1);
      expect(result.summary.totalCreated).toBe(1);
      expect(result.summary.totalUpdated).toBe(0);
      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(mockPrisma.sale.create).toHaveBeenCalled();
    });

    it('should update existing order when status changed', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'joom-order-1',
              orderId: 'ORD-001',
              status: 'shipped',
              total: { amount: 29.99, currency: 'USD' },
              createdAt: '2026-02-01T10:00:00Z',
            },
          ],
        },
      });

      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'existing-order-1',
        marketplaceOrderId: 'ORD-001',
        status: 'CONFIRMED',
      });
      mockPrisma.order.update.mockResolvedValue({ id: 'existing-order-1' });

      const result = await processOrderSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalUpdated).toBe(1);
      expect(result.summary.totalCreated).toBe(0);
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });

    it('should skip order when no changes', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'joom-order-1',
              orderId: 'ORD-001',
              status: 'shipped',
              total: { amount: 29.99, currency: 'USD' },
              createdAt: '2026-02-01T10:00:00Z',
            },
          ],
        },
      });

      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'existing-order-1',
        marketplaceOrderId: 'ORD-001',
        status: 'SHIPPED', // Same status as fetched
      });

      const result = await processOrderSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSkipped).toBe(1);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should handle Joom API error', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: false,
        error: { message: 'API error' },
      });

      await expect(processOrderSyncJob(baseJob)).rejects.toThrow('API error');
    });

    it('should map Joom statuses correctly', async () => {
      const statusTests = [
        { joomStatus: 'pending', expectedStatus: 'PENDING' },
        { joomStatus: 'approved', expectedStatus: 'CONFIRMED' },
        { joomStatus: 'shipped', expectedStatus: 'SHIPPED' },
        { joomStatus: 'delivered', expectedStatus: 'DELIVERED' },
        { joomStatus: 'cancelled', expectedStatus: 'CANCELLED' },
        { joomStatus: 'refunded', expectedStatus: 'REFUNDED' },
      ];

      for (const test of statusTests) {
        mockPrisma.order.findFirst.mockResolvedValue(null);
        mockJoomClient.getOrders.mockResolvedValue({
          success: true,
          data: {
            orders: [
              {
                id: 'joom-order-1',
                status: test.joomStatus,
                total: { amount: 10, currency: 'USD' },
                createdAt: '2026-02-01T10:00:00Z',
              },
            ],
          },
        });

        await processOrderSyncJob(baseJob);

        expect(mockPrisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: test.expectedStatus,
            }),
          })
        );

        vi.clearAllMocks();
        mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
        mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
        mockPrisma.order.create.mockResolvedValue({ id: 'order-1' });
        mockPrisma.sale.create.mockResolvedValue({ id: 'sale-1' });
      }
    });
  });

  describe('eBay Order Sync', () => {
    const ebayJob = {
      ...baseJob,
      data: { ...baseJob.data, marketplace: 'ebay' as const },
    };

    it('should sync new orders from eBay', async () => {
      mockEbayClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              orderId: 'EBAY-ORD-001',
              orderFulfillmentStatus: 'NOT_STARTED',
              orderPaymentStatus: 'PAID',
              creationDate: '2026-02-01T10:00:00Z',
              buyer: { username: 'ebay_buyer1' },
              pricingSummary: {
                total: { value: '49.99', currency: 'USD' },
                deliveryCost: { value: '9.99', currency: 'USD' },
                priceSubtotal: { value: '40.00', currency: 'USD' },
              },
              fulfillmentStartInstructions: [
                {
                  shippingStep: {
                    shipTo: {
                      fullName: 'Jane Doe',
                      contactAddress: {
                        addressLine1: '456 Oak Ave',
                        city: 'Los Angeles',
                        stateOrProvince: 'CA',
                        countryCode: 'US',
                        postalCode: '90001',
                      },
                    },
                  },
                },
              ],
              lineItems: [
                { sku: 'EBAY-SKU-001', title: 'eBay Product 1', quantity: 2, lineItemCost: { value: '20.00' } },
              ],
            },
          ],
        },
      });

      const result = await processOrderSyncJob(ebayJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalFetched).toBe(1);
      expect(result.summary.totalCreated).toBe(1);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            marketplace: 'EBAY',
            marketplaceOrderId: 'EBAY-ORD-001',
            status: 'CONFIRMED', // PAID status maps to CONFIRMED
          }),
        })
      );
    });

    it('should map eBay statuses correctly', async () => {
      const statusTests = [
        { fulfillment: 'NOT_STARTED', payment: 'PENDING', expected: 'PENDING' },
        { fulfillment: 'NOT_STARTED', payment: 'PAID', expected: 'CONFIRMED' },
        { fulfillment: 'IN_PROGRESS', payment: 'PAID', expected: 'SHIPPED' },
        { fulfillment: 'FULFILLED', payment: 'PAID', expected: 'DELIVERED' },
        { fulfillment: 'NOT_STARTED', payment: 'FAILED', expected: 'CANCELLED' },
      ];

      for (const test of statusTests) {
        mockPrisma.order.findFirst.mockResolvedValue(null);
        mockEbayClient.getOrders.mockResolvedValue({
          success: true,
          data: {
            orders: [
              {
                orderId: 'EBAY-ORD-TEST',
                orderFulfillmentStatus: test.fulfillment,
                orderPaymentStatus: test.payment,
                creationDate: '2026-02-01T10:00:00Z',
                pricingSummary: { total: { value: '10' } },
              },
            ],
          },
        });

        await processOrderSyncJob(ebayJob);

        expect(mockPrisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: test.expected,
            }),
          })
        );

        vi.clearAllMocks();
        mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
        mockPrisma.order.create.mockResolvedValue({ id: 'order-1' });
        mockPrisma.sale.create.mockResolvedValue({ id: 'sale-1' });
      }
    });
  });

  describe('Error Handling', () => {
    it('should return error for unsupported marketplace', async () => {
      const invalidJob = {
        ...baseJob,
        data: { ...baseJob.data, marketplace: 'amazon' as any },
      };

      const result = await processOrderSyncJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Supported marketplaces');
    });

    it('should handle individual order processing errors', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'joom-order-1',
              status: 'approved',
              total: { amount: 29.99, currency: 'USD' },
              createdAt: '2026-02-01T10:00:00Z',
            },
          ],
        },
      });

      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockRejectedValue(new Error('Database error'));

      const result = await processOrderSyncJob(baseJob);

      expect(result.success).toBe(true); // Job succeeds but has errors
      expect(result.summary.totalErrors).toBe(1);
      expect(result.orders[0].status).toBe('error');
    });

    it('should create notification for new orders', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'joom-order-1',
              status: 'approved',
              total: { amount: 29.99, currency: 'USD' },
              createdAt: '2026-02-01T10:00:00Z',
            },
          ],
        },
      });

      await processOrderSyncJob(baseJob);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ORDER_RECEIVED',
            title: '新規注文を同期',
          }),
        })
      );
    });

    it('should create job log on completion', async () => {
      mockJoomClient.getOrders.mockResolvedValue({
        success: true,
        data: { orders: [] },
      });

      await processOrderSyncJob(baseJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queueName: 'orders',
            jobType: 'ORDER_SYNC',
            status: 'COMPLETED',
          }),
        })
      );
    });
  });
});

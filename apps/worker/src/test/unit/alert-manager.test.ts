import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions and mock redis
const {
  mockAlertRuleFindMany,
  mockAlertRuleFindUnique,
  mockAlertLogCreate,
  mockAlertLogUpdate,
  mockRedisExists,
  mockRedisSetex,
  mockRedisRpush,
  mockRedisExpire,
  mockRedisLrange,
  mockRedisDel,
  mockRedisHincrby,
  mockRedisHgetall,
  mockQueueAdd,
  mockRedis,
} = vi.hoisted(() => {
  const mockRedisExists = vi.fn();
  const mockRedisSetex = vi.fn();
  const mockRedisRpush = vi.fn();
  const mockRedisExpire = vi.fn();
  const mockRedisLrange = vi.fn();
  const mockRedisDel = vi.fn();
  const mockRedisHincrby = vi.fn();
  const mockRedisHgetall = vi.fn();
  return {
    mockAlertRuleFindMany: vi.fn(),
    mockAlertRuleFindUnique: vi.fn(),
    mockAlertLogCreate: vi.fn(),
    mockAlertLogUpdate: vi.fn(),
    mockRedisExists,
    mockRedisSetex,
    mockRedisRpush,
    mockRedisExpire,
    mockRedisLrange,
    mockRedisDel,
    mockRedisHincrby,
    mockRedisHgetall,
    mockQueueAdd: vi.fn(),
    mockRedis: {
      exists: mockRedisExists,
      setex: mockRedisSetex,
      rpush: mockRedisRpush,
      expire: mockRedisExpire,
      lrange: mockRedisLrange,
      del: mockRedisDel,
      hincrby: mockRedisHincrby,
      hgetall: mockRedisHgetall,
    },
  };
});

vi.mock('@rakuda/database', () => ({
  prisma: {
    alertRule: {
      findMany: mockAlertRuleFindMany,
      findUnique: mockAlertRuleFindUnique,
    },
    alertLog: {
      create: mockAlertLogCreate,
      update: mockAlertLogUpdate,
    },
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    NOTIFICATION: 'notification',
  },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
  })),
}));

vi.mock('../../lib/redis', () => ({
  getConnection: vi.fn().mockReturnValue(mockRedis),
}));

import { alertManager } from '../../lib/alert-manager';

describe('Alert Manager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAlertLogCreate.mockResolvedValue({ id: 'log-1' });
    mockAlertLogUpdate.mockResolvedValue({});
    mockRedisExists.mockResolvedValue(0);
    mockRedisSetex.mockResolvedValue('OK');
    mockRedisRpush.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisLrange.mockResolvedValue([]);
    mockRedisDel.mockResolvedValue(1);
    mockRedisHincrby.mockResolvedValue(1);
    mockRedisHgetall.mockResolvedValue({});
    mockQueueAdd.mockResolvedValue({});
    // Initialize the alert manager to set up the notification queue
    await alertManager.initialize();
  });

  describe('shouldThrottle', () => {
    it('should return true when throttle key exists', async () => {
      mockRedisExists.mockResolvedValueOnce(1);

      const result = await alertManager.shouldThrottle('rule-1');

      expect(result).toBe(true);
    });

    it('should return false when throttle key does not exist', async () => {
      mockRedisExists.mockResolvedValueOnce(0);

      const result = await alertManager.shouldThrottle('rule-1');

      expect(result).toBe(false);
    });
  });

  describe('checkRules', () => {
    it('should return matching rules for event type', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Test Rule',
          eventType: 'INVENTORY_OUT_OF_STOCK',
          conditions: [],
          severity: 'HIGH',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 30,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'INVENTORY_OUT_OF_STOCK',
        data: { title: 'Test Product' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Rule');
    });

    it('should filter rules by conditions', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Price Drop Rule',
          eventType: 'PRICE_DROP_DETECTED',
          conditions: [{ field: 'changePercent', operator: 'gt', value: 10 }],
          severity: 'MEDIUM',
          channels: ['EMAIL'],
          cooldownMinutes: 60,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      // Event with 5% change (should not match)
      const result1 = await alertManager.checkRules({
        type: 'PRICE_DROP_DETECTED',
        data: { changePercent: 5 },
      });
      expect(result1).toHaveLength(0);

      // Reset mock for second call
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Price Drop Rule',
          eventType: 'PRICE_DROP_DETECTED',
          conditions: [{ field: 'changePercent', operator: 'gt', value: 10 }],
          severity: 'MEDIUM',
          channels: ['EMAIL'],
          cooldownMinutes: 60,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      // Event with 15% change (should match)
      const result2 = await alertManager.checkRules({
        type: 'PRICE_DROP_DETECTED',
        data: { changePercent: 15 },
      });
      expect(result2).toHaveLength(1);
    });

    it('should return empty array when no rules match', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([]);

      const result = await alertManager.checkRules({
        type: 'UNKNOWN_EVENT',
        data: {},
      });

      expect(result).toHaveLength(0);
    });

    it('should handle rules with multiple conditions (AND logic)', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Multi Condition Rule',
          eventType: 'TEST_EVENT',
          conditions: [
            { field: 'price', operator: 'gt', value: 100 },
            { field: 'category', operator: 'eq', value: 'Electronics' },
          ],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      // Both conditions match
      const result = await alertManager.checkRules({
        type: 'TEST_EVENT',
        data: { price: 150, category: 'Electronics' },
      });
      expect(result).toHaveLength(1);

      // Reset for second test
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Multi Condition Rule',
          eventType: 'TEST_EVENT',
          conditions: [
            { field: 'price', operator: 'gt', value: 100 },
            { field: 'category', operator: 'eq', value: 'Electronics' },
          ],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      // Only one condition matches
      const result2 = await alertManager.checkRules({
        type: 'TEST_EVENT',
        data: { price: 150, category: 'Clothing' },
      });
      expect(result2).toHaveLength(0);
    });

    it('should handle nested field access', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Nested Field Rule',
          eventType: 'TEST_EVENT',
          conditions: [{ field: 'product.price', operator: 'gte', value: 50 }],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST_EVENT',
        data: { product: { price: 75, name: 'Test' } },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('processEvent', () => {
    it('should process event and send alert for matching rules', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Test Rule',
          eventType: 'ORDER_RECEIVED',
          conditions: [],
          severity: 'INFO',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      await alertManager.processEvent({
        type: 'ORDER_RECEIVED',
        data: { orderId: 'order-123' },
      });

      expect(mockAlertLogCreate).toHaveBeenCalled();
    });

    it('should not send alert when no rules match', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([]);

      await alertManager.processEvent({
        type: 'UNKNOWN_EVENT',
        data: {},
      });

      expect(mockAlertLogCreate).not.toHaveBeenCalled();
    });

    it('should throttle alerts when cooldown is active', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Test Rule',
          eventType: 'TEST_EVENT',
          conditions: [],
          severity: 'HIGH',
          channels: ['EMAIL'],
          cooldownMinutes: 30,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);
      mockRedisExists.mockResolvedValueOnce(1); // Throttle exists

      await alertManager.processEvent({
        type: 'TEST_EVENT',
        data: {},
      });

      // Should create log with 'throttled' status
      expect(mockAlertLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'throttled',
          }),
        })
      );
    });

    it('should generate deep link with productId', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-product',
          name: 'Product Rule',
          eventType: 'INVENTORY_OUT_OF_STOCK',
          conditions: [],
          severity: 'HIGH',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      await alertManager.processEvent({
        type: 'INVENTORY_OUT_OF_STOCK',
        data: { title: 'Test Product' },
        productId: 'product-123',
      });

      expect(mockAlertLogCreate).toHaveBeenCalled();
      expect(mockQueueAdd).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          deepLink: expect.stringContaining('/products/product-123'),
        }),
        expect.anything()
      );
    });

    it('should generate deep link with listingId', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-listing',
          name: 'Listing Rule',
          eventType: 'LISTING_FAILED',
          conditions: [],
          severity: 'HIGH',
          channels: ['EMAIL'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      await alertManager.processEvent({
        type: 'LISTING_FAILED',
        data: { title: 'Test Listing', error: 'API Error' },
        listingId: 'listing-456',
      });

      expect(mockAlertLogCreate).toHaveBeenCalled();
      expect(mockQueueAdd).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          deepLink: expect.stringContaining('/listings/listing-456'),
        }),
        expect.anything()
      );
    });
  });

  describe('processBatch', () => {
    it('should process batch alerts', async () => {
      mockRedisLrange.mockResolvedValueOnce([
        JSON.stringify({
          ruleId: 'rule-1',
          event: { type: 'TEST_EVENT', data: { id: '1' } },
          timestamp: new Date().toISOString(),
        }),
        JSON.stringify({
          ruleId: 'rule-1',
          event: { type: 'TEST_EVENT', data: { id: '2' } },
          timestamp: new Date().toISOString(),
        }),
      ]);
      mockAlertRuleFindUnique.mockResolvedValueOnce({
        id: 'rule-1',
        channels: ['EMAIL'],
        severity: 'MEDIUM',
        cooldownMinutes: 30,
        isActive: true,
      });

      await alertManager.processBatch('rule-1', 'TEST_EVENT', 'batch-key');

      expect(mockRedisDel).toHaveBeenCalledTimes(2); // batch key and scheduled key
      expect(mockQueueAdd).toHaveBeenCalled();
    });

    it('should skip if batch is empty', async () => {
      mockRedisLrange.mockResolvedValueOnce([]);

      await alertManager.processBatch('rule-1', 'TEST_EVENT', 'batch-key');

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('should skip if rule is no longer active', async () => {
      mockRedisLrange.mockResolvedValueOnce([
        JSON.stringify({
          ruleId: 'rule-1',
          event: { type: 'TEST_EVENT', data: {} },
          timestamp: new Date().toISOString(),
        }),
      ]);
      mockAlertRuleFindUnique.mockResolvedValueOnce({
        id: 'rule-1',
        isActive: false,
      });

      await alertManager.processBatch('rule-1', 'TEST_EVENT', 'batch-key');

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('should skip if rule not found', async () => {
      mockRedisLrange.mockResolvedValueOnce([
        JSON.stringify({
          ruleId: 'rule-1',
          event: { type: 'TEST_EVENT', data: {} },
          timestamp: new Date().toISOString(),
        }),
      ]);
      mockAlertRuleFindUnique.mockResolvedValueOnce(null);

      await alertManager.processBatch('rule-1', 'TEST_EVENT', 'batch-key');

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats for specified days', async () => {
      mockRedisHgetall
        .mockResolvedValueOnce({ sent: '5', throttled: '2' })
        .mockResolvedValueOnce({ sent: '3', batched: '1' })
        .mockResolvedValueOnce({});

      const stats = await alertManager.getStats(3);

      expect(Object.keys(stats).length).toBeLessThanOrEqual(3);
    });

    it('should parse numeric values from Redis', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockRedisHgetall.mockResolvedValueOnce({ sent: '10', throttled: '5' });

      const stats = await alertManager.getStats(1);

      if (stats[today]) {
        expect(stats[today].sent).toBe(10);
        expect(stats[today].throttled).toBe(5);
      }
    });
  });

  describe('updateAlertLogStatus', () => {
    it('should update alert log status to sent', async () => {
      await alertManager.updateAlertLogStatus('log-1', 'sent');

      expect(mockAlertLogUpdate).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      });
    });

    it('should update alert log status to failed with error message', async () => {
      await alertManager.updateAlertLogStatus('log-1', 'failed', 'Connection timeout');

      expect(mockAlertLogUpdate).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'failed',
          errorMsg: 'Connection timeout',
        }),
      });
    });
  });

  describe('condition operators', () => {
    it('should evaluate eq operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'EQ Rule',
          eventType: 'TEST',
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { status: 'active' },
      });

      expect(result).toHaveLength(1);
    });

    it('should evaluate ne operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'NE Rule',
          eventType: 'TEST',
          conditions: [{ field: 'status', operator: 'ne', value: 'inactive' }],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { status: 'active' },
      });

      expect(result).toHaveLength(1);
    });

    it('should evaluate lt operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'LT Rule',
          eventType: 'TEST',
          conditions: [{ field: 'stock', operator: 'lt', value: 5 }],
          severity: 'HIGH',
          channels: ['EMAIL'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { stock: 3 },
      });

      expect(result).toHaveLength(1);
    });

    it('should evaluate lte operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'LTE Rule',
          eventType: 'TEST',
          conditions: [{ field: 'stock', operator: 'lte', value: 5 }],
          severity: 'MEDIUM',
          channels: ['EMAIL'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { stock: 5 },
      });

      expect(result).toHaveLength(1);
    });

    it('should evaluate contains operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Contains Rule',
          eventType: 'TEST',
          conditions: [{ field: 'title', operator: 'contains', value: 'error' }],
          severity: 'HIGH',
          channels: ['EMAIL'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { title: 'An error occurred' },
      });

      expect(result).toHaveLength(1);
    });

    it('should return false for unknown operator', async () => {
      mockAlertRuleFindMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Unknown Op Rule',
          eventType: 'TEST',
          conditions: [{ field: 'value', operator: 'unknown', value: 5 }],
          severity: 'LOW',
          channels: ['WEB_PUSH'],
          cooldownMinutes: 0,
          batchWindowMinutes: 0,
          isActive: true,
        },
      ]);

      const result = await alertManager.checkRules({
        type: 'TEST',
        data: { value: 5 },
      });

      expect(result).toHaveLength(0);
    });
  });
});

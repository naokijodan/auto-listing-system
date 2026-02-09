import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockIORedis, mockPublisher, mockSubscriber } = vi.hoisted(() => {
  const mockPublisher = {
    ping: vi.fn().mockResolvedValue('PONG'),
    publish: vi.fn().mockResolvedValue(1),
    hincrby: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    quit: vi.fn().mockResolvedValue('OK'),
  };

  const mockSubscriber = {
    ping: vi.fn().mockResolvedValue('PONG'),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue(1),
    unsubscribe: vi.fn().mockResolvedValue(1),
    psubscribe: vi.fn().mockResolvedValue(1),
    punsubscribe: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  };

  let callCount = 0;
  const mockIORedis = vi.fn().mockImplementation(() => {
    callCount++;
    return callCount % 2 === 1 ? mockPublisher : mockSubscriber;
  });

  return {
    mockIORedis,
    mockPublisher,
    mockSubscriber,
  };
});

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
  EVENT_CHANNELS: {
    INVENTORY: 'rakuda:inventory',
    ORDERS: 'rakuda:orders',
    PRICING: 'rakuda:pricing',
    LISTINGS: 'rakuda:listings',
  },
}));

vi.mock('ioredis', () => ({
  default: mockIORedis,
}));

describe('EventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('initialize', () => {
    it('should initialize the event bus', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      await eventBus.initialize();

      expect(eventBus.initialized).toBe(true);
      expect(mockIORedis).toHaveBeenCalledTimes(2); // publisher + subscriber
    });

    it('should not initialize twice', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      await eventBus.initialize();
      await eventBus.initialize();

      expect(mockIORedis).toHaveBeenCalledTimes(2);
    });

    it('should register message handlers on subscriber', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      await eventBus.initialize();

      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
    });
  });

  describe('publish', () => {
    it('should publish event to channel', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publish('test-channel', {
        type: 'INVENTORY_CHANGE',
        payload: { id: '123', action: 'created' },
        timestamp: new Date().toISOString(),
      });

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'test-channel',
        expect.stringContaining('INVENTORY_CHANGE')
      );
    });

    it('should warn if not initialized', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      await eventBus.publish('test-channel', {
        type: 'INVENTORY_CHANGE',
        payload: { id: '123' },
        timestamp: new Date().toISOString(),
      });

      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should update stats on publish', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publish('test-channel', {
        type: 'PRICE_CHANGE',
        payload: { id: '123' },
        timestamp: new Date().toISOString(),
      });

      expect(mockPublisher.hincrby).toHaveBeenCalled();
    });
  });

  describe('convenience publish methods', () => {
    it('should publish inventory change', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publishInventoryChange('product-123', 'created', { quantity: 10 });

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'rakuda:inventory',
        expect.stringContaining('INVENTORY_CHANGE')
      );
    });

    it('should publish order received', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publishOrderReceived('order-456');

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'rakuda:orders',
        expect.stringContaining('ORDER_RECEIVED')
      );
    });

    it('should publish price change', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publishPriceChange('listing-789');

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'rakuda:pricing',
        expect.stringContaining('PRICE_CHANGE')
      );
    });

    it('should publish listing update', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.publishListingUpdate('listing-123', 'updated');

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'rakuda:listings',
        expect.stringContaining('LISTING_UPDATE')
      );
    });
  });

  describe('subscribe', () => {
    it('should subscribe to channel', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const handler = vi.fn();
      await eventBus.subscribe('test-channel', handler);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should use psubscribe for wildcard channels', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const handler = vi.fn();
      await eventBus.subscribe('test-channel:*', handler);

      expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('test-channel:*');
    });

    it('should warn if not initialized', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      const handler = vi.fn();
      await eventBus.subscribe('test-channel', handler);

      expect(mockSubscriber.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from channel', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const handler = vi.fn();
      await eventBus.subscribe('test-channel', handler);
      await eventBus.unsubscribe('test-channel');

      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should use punsubscribe for wildcard channels', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const handler = vi.fn();
      await eventBus.subscribe('test-channel:*', handler);
      await eventBus.unsubscribe('test-channel:*');

      expect(mockSubscriber.punsubscribe).toHaveBeenCalledWith('test-channel:*');
    });

    it('should remove specific handler', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      await eventBus.subscribe('test-channel', handler1);
      await eventBus.subscribe('test-channel', handler2);
      await eventBus.unsubscribe('test-channel', handler1);

      // Should not unsubscribe from Redis since handler2 is still active
      expect(mockSubscriber.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats for specified days', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      mockPublisher.hgetall.mockResolvedValue({
        published: '100',
        delivered: '95',
      });

      const stats = await eventBus.getStats(3);

      expect(mockPublisher.hgetall).toHaveBeenCalled();
      expect(typeof stats).toBe('object');
    });

    it('should return empty object if not initialized', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      const stats = await eventBus.getStats();

      expect(stats).toEqual({});
    });
  });

  describe('close', () => {
    it('should close connections', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      await eventBus.close();

      expect(mockPublisher.quit).toHaveBeenCalled();
      expect(mockSubscriber.quit).toHaveBeenCalled();
      expect(eventBus.initialized).toBe(false);
    });
  });

  describe('getPublisher', () => {
    it('should return publisher', async () => {
      const { eventBus } = await import('../../lib/event-bus');
      await eventBus.initialize();

      const publisher = eventBus.getPublisher();

      expect(publisher).toBeDefined();
    });

    it('should return null if not initialized', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      const publisher = eventBus.getPublisher();

      expect(publisher).toBeNull();
    });
  });

  describe('createSubscriber', () => {
    it('should create new subscriber instance', async () => {
      const { eventBus } = await import('../../lib/event-bus');

      const subscriber = await eventBus.createSubscriber();

      expect(mockIORedis).toHaveBeenCalled();
      expect(subscriber).toBeDefined();
    });
  });
});

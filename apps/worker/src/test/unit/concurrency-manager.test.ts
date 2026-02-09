import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockRedisGet, mockRedisSet, mockRedisIncr, mockRedisDecr, mockRedisExpire } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockRedisIncr: vi.fn(),
  mockRedisDecr: vi.fn(),
  mockRedisExpire: vi.fn(),
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

import {
  ConcurrencyManager,
  DEFAULT_CONCURRENCY_CONFIGS,
} from '../../lib/concurrency-manager';

describe('ConcurrencyManager', () => {
  let manager: ConcurrencyManager;
  const mockRedis = {
    get: mockRedisGet,
    set: mockRedisSet,
    incr: mockRedisIncr,
    decr: mockRedisDecr,
    expire: mockRedisExpire,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ConcurrencyManager(mockRedis);
  });

  describe('DEFAULT_CONCURRENCY_CONFIGS', () => {
    it('should have scrape config', () => {
      expect(DEFAULT_CONCURRENCY_CONFIGS.scrape).toBeDefined();
      expect(DEFAULT_CONCURRENCY_CONFIGS.scrape.concurrency).toBe(2);
    });

    it('should have translate config', () => {
      expect(DEFAULT_CONCURRENCY_CONFIGS.translate).toBeDefined();
      expect(DEFAULT_CONCURRENCY_CONFIGS.translate.concurrency).toBe(5);
    });

    it('should have image config', () => {
      expect(DEFAULT_CONCURRENCY_CONFIGS.image).toBeDefined();
      expect(DEFAULT_CONCURRENCY_CONFIGS.image.concurrency).toBe(3);
    });

    it('should have publish config', () => {
      expect(DEFAULT_CONCURRENCY_CONFIGS.publish).toBeDefined();
      expect(DEFAULT_CONCURRENCY_CONFIGS.publish.concurrency).toBe(2);
    });

    it('should have inventory config with highest priority', () => {
      expect(DEFAULT_CONCURRENCY_CONFIGS.inventory.priority).toBe(4);
      expect(DEFAULT_CONCURRENCY_CONFIGS.inventory.concurrency).toBe(1);
    });
  });

  describe('getConcurrency', () => {
    it('should return concurrency for known queue', () => {
      expect(manager.getConcurrency('scrape')).toBe(2);
      expect(manager.getConcurrency('translate')).toBe(5);
      expect(manager.getConcurrency('image')).toBe(3);
    });

    it('should return 0 for disabled queue', () => {
      manager.setConfig('scrape', { enabled: false });

      expect(manager.getConcurrency('scrape')).toBe(0);
    });

    it('should return 0 for unknown queue', () => {
      expect(manager.getConcurrency('unknown')).toBe(0);
    });
  });

  describe('getPriority', () => {
    it('should return priority for known queue', () => {
      expect(manager.getPriority('inventory')).toBe(4);
      expect(manager.getPriority('scrape')).toBe(1);
    });

    it('should return 1 for unknown queue', () => {
      expect(manager.getPriority('unknown')).toBe(1);
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled queue', () => {
      expect(manager.isEnabled('scrape')).toBe(true);
    });

    it('should return false for disabled queue', () => {
      manager.setConfig('scrape', { enabled: false });

      expect(manager.isEnabled('scrape')).toBe(false);
    });

    it('should return true for unknown queue', () => {
      expect(manager.isEnabled('unknown')).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should update existing config', () => {
      manager.setConfig('scrape', { concurrency: 10 });

      expect(manager.getConcurrency('scrape')).toBe(10);
    });

    it('should create config for unknown queue', () => {
      manager.setConfig('newQueue', { concurrency: 3, priority: 5 });

      expect(manager.getConcurrency('newQueue')).toBe(3);
      expect(manager.getPriority('newQueue')).toBe(5);
    });

    it('should preserve other config properties', () => {
      manager.setConfig('scrape', { concurrency: 10 });

      expect(manager.getPriority('scrape')).toBe(1);
      expect(manager.isEnabled('scrape')).toBe(true);
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configs', () => {
      const configs = manager.getAllConfigs();

      expect(configs.length).toBe(Object.keys(DEFAULT_CONCURRENCY_CONFIGS).length);
    });

    it('should include updated configs', () => {
      manager.setConfig('scrape', { concurrency: 10 });

      const configs = manager.getAllConfigs();
      const scrapeConfig = configs.find(c => c.queueName === 'scrape');

      expect(scrapeConfig?.concurrency).toBe(10);
    });
  });

  describe('getQueuesByPriority', () => {
    it('should return queues sorted by priority', () => {
      const queues = manager.getQueuesByPriority();

      // inventory has priority 4 (highest)
      expect(queues[0]).toBe('inventory');
    });

    it('should exclude disabled queues', () => {
      manager.setConfig('inventory', { enabled: false });

      const queues = manager.getQueuesByPriority();

      expect(queues).not.toContain('inventory');
    });
  });

  describe('getTotalConcurrency', () => {
    it('should sum all enabled queue concurrencies', () => {
      // Default: scrape(2) + translate(5) + image(3) + publish(2) + inventory(1) + competitor(1) = 14
      expect(manager.getTotalConcurrency()).toBe(14);
    });

    it('should exclude disabled queues', () => {
      manager.setConfig('translate', { enabled: false });

      // 14 - 5 = 9
      expect(manager.getTotalConcurrency()).toBe(9);
    });
  });

  describe('getRecommendedConcurrency', () => {
    it('should return recommended values', () => {
      const recommended = manager.getRecommendedConcurrency();

      expect(recommended.scrape).toBe(2);
      expect(recommended.translate).toBe(5);
      expect(recommended.image).toBe(3);
    });
  });

  describe('loadConfigs', () => {
    it('should load configs from Redis', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify([
        { queueName: 'scrape', concurrency: 10, priority: 1, enabled: true },
      ]));

      await manager.loadConfigs();

      expect(manager.getConcurrency('scrape')).toBe(10);
    });

    it('should handle empty Redis value', async () => {
      mockRedisGet.mockResolvedValueOnce(null);

      await manager.loadConfigs();

      // Should keep default values
      expect(manager.getConcurrency('scrape')).toBe(2);
    });

    it('should handle Redis error', async () => {
      mockRedisGet.mockRejectedValueOnce(new Error('Redis error'));

      await manager.loadConfigs();

      // Should keep default values
      expect(manager.getConcurrency('scrape')).toBe(2);
    });
  });

  describe('saveConfigs', () => {
    it('should save configs to Redis', async () => {
      mockRedisSet.mockResolvedValueOnce('OK');

      await manager.saveConfigs();

      expect(mockRedisSet).toHaveBeenCalledWith(
        'rakuda:concurrency:configs',
        expect.any(String)
      );
    });

    it('should handle Redis error', async () => {
      mockRedisSet.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(manager.saveConfigs()).resolves.not.toThrow();
    });
  });

  describe('getWorkerStatus', () => {
    it('should return status for all queues', async () => {
      mockRedisGet.mockResolvedValue('1');

      const status = await manager.getWorkerStatus();

      expect(status.scrape).toBeDefined();
      expect(status.scrape.active).toBe(1);
      expect(status.scrape.max).toBe(2);
    });

    it('should handle missing active count', async () => {
      mockRedisGet.mockResolvedValue(null);

      const status = await manager.getWorkerStatus();

      expect(status.scrape.active).toBe(0);
    });
  });

  describe('recordActiveJob', () => {
    it('should increment for positive delta', async () => {
      await manager.recordActiveJob('scrape', 1);

      expect(mockRedisIncr).toHaveBeenCalledWith('rakuda:worker:scrape:active');
    });

    it('should decrement for negative delta', async () => {
      await manager.recordActiveJob('scrape', -1);

      expect(mockRedisDecr).toHaveBeenCalledWith('rakuda:worker:scrape:active');
    });

    it('should set expiration', async () => {
      await manager.recordActiveJob('scrape', 1);

      expect(mockRedisExpire).toHaveBeenCalledWith('rakuda:worker:scrape:active', 300);
    });
  });
});

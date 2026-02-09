import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock
const { mockIORedis } = vi.hoisted(() => {
  const mockInstance = {
    on: vi.fn().mockReturnThis(),
    quit: vi.fn().mockResolvedValue('OK'),
  };
  return {
    mockIORedis: vi.fn().mockReturnValue(mockInstance),
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('ioredis', () => ({
  default: mockIORedis,
}));

describe('Redis Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createConnection', () => {
    it('should create a new connection', async () => {
      const { createConnection } = await import('../../lib/redis');

      const connection = createConnection();

      expect(mockIORedis).toHaveBeenCalled();
      expect(connection).toBeDefined();
    });

    it('should return existing connection on subsequent calls', async () => {
      const { createConnection } = await import('../../lib/redis');

      const connection1 = createConnection();
      const connection2 = createConnection();

      expect(connection1).toBe(connection2);
      expect(mockIORedis).toHaveBeenCalledTimes(1);
    });

    it('should use REDIS_URL from environment', async () => {
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://custom-host:6380';

      const { createConnection } = await import('../../lib/redis');
      createConnection();

      expect(mockIORedis).toHaveBeenCalledWith(
        'redis://custom-host:6380',
        expect.any(Object)
      );

      process.env.REDIS_URL = originalEnv;
    });

    it('should use default localhost URL when REDIS_URL not set', async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const { createConnection } = await import('../../lib/redis');
      createConnection();

      expect(mockIORedis).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.any(Object)
      );

      process.env.REDIS_URL = originalEnv;
    });

    it('should register event handlers', async () => {
      const mockInstance = {
        on: vi.fn().mockReturnThis(),
        quit: vi.fn().mockResolvedValue('OK'),
      };
      mockIORedis.mockReturnValueOnce(mockInstance);

      const { createConnection } = await import('../../lib/redis');
      createConnection();

      expect(mockInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should configure retry strategy', async () => {
      const { createConnection } = await import('../../lib/redis');
      createConnection();

      const options = mockIORedis.mock.calls[0][1];
      expect(options.retryStrategy).toBeDefined();

      // Test retry strategy returns increasing delays up to 2000ms
      const delay1 = options.retryStrategy(1);
      const delay2 = options.retryStrategy(10);
      const delay50 = options.retryStrategy(50);

      expect(delay1).toBe(50);
      expect(delay2).toBe(500);
      expect(delay50).toBe(2000); // capped at 2000
    });
  });

  describe('getConnection', () => {
    it('should return existing connection', async () => {
      const { createConnection, getConnection } = await import('../../lib/redis');

      createConnection();
      const connection = getConnection();

      expect(connection).toBeDefined();
    });

    it('should throw error if connection not initialized', async () => {
      const { getConnection } = await import('../../lib/redis');

      expect(() => getConnection()).toThrow('Redis connection not initialized');
    });
  });

  describe('closeConnection', () => {
    it('should close existing connection', async () => {
      const mockInstance = {
        on: vi.fn().mockReturnThis(),
        quit: vi.fn().mockResolvedValue('OK'),
      };
      mockIORedis.mockReturnValueOnce(mockInstance);

      const { createConnection, closeConnection } = await import('../../lib/redis');

      createConnection();
      await closeConnection();

      expect(mockInstance.quit).toHaveBeenCalled();
    });

    it('should handle no connection gracefully', async () => {
      const { closeConnection } = await import('../../lib/redis');

      await expect(closeConnection()).resolves.not.toThrow();
    });

    it('should allow new connection after closing', async () => {
      const mockInstance = {
        on: vi.fn().mockReturnThis(),
        quit: vi.fn().mockResolvedValue('OK'),
      };
      mockIORedis.mockReturnValue(mockInstance);

      const { createConnection, closeConnection } = await import('../../lib/redis');

      createConnection();
      await closeConnection();

      // Should be able to create new connection
      mockIORedis.mockClear();
      createConnection();

      expect(mockIORedis).toHaveBeenCalledTimes(1);
    });
  });
});

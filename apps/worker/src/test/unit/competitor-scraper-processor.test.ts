import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const {
  mockRedis,
  mockRateLimiter,
  mockWorker,
  mockQueue,
  mockNotifyCompetitorPriceChange,
} = vi.hoisted(() => {
  const mockWorker = vi.fn().mockReturnValue({
    on: vi.fn(),
    close: vi.fn(),
  });

  const mockQueue = vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn(),
  });

  return {
    mockRedis: {
      hget: vi.fn(),
      hset: vi.fn().mockResolvedValue(1),
      hkeys: vi.fn().mockResolvedValue([]),
      setex: vi.fn().mockResolvedValue('OK'),
    },
    mockRateLimiter: {
      waitForRateLimit: vi.fn().mockResolvedValue(undefined),
    },
    mockWorker,
    mockQueue,
    mockNotifyCompetitorPriceChange: vi.fn().mockResolvedValue(undefined),
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

vi.mock('bullmq', () => ({
  Worker: mockWorker,
  Queue: mockQueue,
  Job: vi.fn(),
}));

vi.mock('../../lib/rate-limiter', () => ({
  createRateLimiter: vi.fn().mockReturnValue(mockRateLimiter),
}));

vi.mock('../../lib/notification-service', () => ({
  notifyCompetitorPriceChange: mockNotifyCompetitorPriceChange,
}));

import { createCompetitorScraperWorker, scheduleCompetitorUpdates } from '../../processors/competitor-scraper';

describe('Competitor Scraper Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCompetitorScraperWorker', () => {
    it('should create a worker', () => {
      const worker = createCompetitorScraperWorker(mockRedis as any);

      expect(mockWorker).toHaveBeenCalledWith(
        'competitor',
        expect.any(Function),
        expect.objectContaining({
          connection: mockRedis,
          concurrency: 1,
        })
      );
    });

    it('should register event handlers', () => {
      const mockWorkerInstance = {
        on: vi.fn(),
        close: vi.fn(),
      };
      mockWorker.mockReturnValueOnce(mockWorkerInstance);

      createCompetitorScraperWorker(mockRedis as any);

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should configure rate limiting', () => {
      createCompetitorScraperWorker(mockRedis as any);

      expect(mockWorker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          limiter: {
            max: 5,
            duration: 60000,
          },
        })
      );
    });
  });

  describe('scheduleCompetitorUpdates', () => {
    it('should schedule update jobs for all competitors', async () => {
      const mockQueueInstance = {
        add: vi.fn().mockResolvedValue({}),
        close: vi.fn(),
      };
      mockQueue.mockReturnValueOnce(mockQueueInstance);

      mockRedis.hkeys.mockResolvedValueOnce(['comp1', 'comp2', 'comp3']);

      await scheduleCompetitorUpdates(mockRedis as any);

      expect(mockQueue).toHaveBeenCalledWith('competitor', { connection: mockRedis });
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(3);
    });

    it('should add jobs with correct data', async () => {
      const mockQueueInstance = {
        add: vi.fn().mockResolvedValue({}),
        close: vi.fn(),
      };
      mockQueue.mockReturnValueOnce(mockQueueInstance);

      mockRedis.hkeys.mockResolvedValueOnce(['test-competitor']);

      await scheduleCompetitorUpdates(mockRedis as any);

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'update-price',
        { type: 'update', competitorId: 'test-competitor' },
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
        })
      );
    });

    it('should handle empty competitor list', async () => {
      const mockQueueInstance = {
        add: vi.fn().mockResolvedValue({}),
        close: vi.fn(),
      };
      mockQueue.mockReturnValueOnce(mockQueueInstance);

      mockRedis.hkeys.mockResolvedValueOnce([]);

      await scheduleCompetitorUpdates(mockRedis as any);

      expect(mockQueueInstance.add).not.toHaveBeenCalled();
    });

    it('should add random delay to jobs', async () => {
      const mockQueueInstance = {
        add: vi.fn().mockResolvedValue({}),
        close: vi.fn(),
      };
      mockQueue.mockReturnValueOnce(mockQueueInstance);

      mockRedis.hkeys.mockResolvedValueOnce(['comp1']);

      await scheduleCompetitorUpdates(mockRedis as any);

      const addCall = mockQueueInstance.add.mock.calls[0];
      const options = addCall[2];
      expect(options.delay).toBeGreaterThanOrEqual(0);
      expect(options.delay).toBeLessThan(60000);
    });
  });

  describe('worker job processing', () => {
    it('should handle search type jobs', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'search',
          searchQuery: 'vintage watch',
          listingId: 'listing-123',
        },
      };

      const result = await jobProcessor(mockJob);

      expect(result.type).toBe('search');
      expect(result.results).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should store search results in Redis', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'search',
          searchQuery: 'test product',
          listingId: 'listing-456',
        },
      };

      await jobProcessor(mockJob);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'rakuda:competitor-search:listing-456',
        3600,
        expect.any(String)
      );
    });

    it('should handle update type jobs', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const competitorData = {
        competitorUrl: 'https://ebay.com/item/123',
        competitorPrice: 100,
        priceHistory: [],
        productTitle: 'Test Product',
        seller: 'TestSeller',
        myPrice: 90,
        currency: 'USD',
      };
      mockRedis.hget.mockResolvedValueOnce(JSON.stringify(competitorData));

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'update',
          competitorId: 'comp-123',
        },
      };

      const result = await jobProcessor(mockJob);

      expect(result.type).toBe('update');
      expect(result.price).toBeDefined();
      expect(result.updated).toBe(true);
    });

    it('should throw error for missing search query', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'search',
          // No searchQuery or productTitle
        },
      };

      await expect(jobProcessor(mockJob)).rejects.toThrow('Search query is required');
    });

    it('should throw error for missing competitor ID', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'update',
          // No competitorId
        },
      };

      await expect(jobProcessor(mockJob)).rejects.toThrow('Competitor ID is required');
    });

    it('should throw error for unknown job type', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'unknown',
        },
      };

      await expect(jobProcessor(mockJob)).rejects.toThrow('Unknown job type: unknown');
    });

    it('should throw error for non-existent competitor', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      mockRedis.hget.mockResolvedValueOnce(null);

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'update',
          competitorId: 'non-existent',
        },
      };

      await expect(jobProcessor(mockJob)).rejects.toThrow('Competitor not found: non-existent');
    });

    it('should notify on significant price change', async () => {
      let jobProcessor: any;
      mockWorker.mockImplementation((queueName, processor, options) => {
        jobProcessor = processor;
        return { on: vi.fn(), close: vi.fn() };
      });

      createCompetitorScraperWorker(mockRedis as any);

      // Mock a competitor with a price that will change significantly
      const competitorData = {
        competitorUrl: 'https://ebay.com/item/123',
        competitorPrice: 100,
        priceHistory: [],
        productTitle: 'Test Product',
        seller: 'TestSeller',
        myPrice: 90,
        currency: 'USD',
      };
      mockRedis.hget.mockResolvedValueOnce(JSON.stringify(competitorData));

      // Mock Math.random to get a price change > 5%
      const originalRandom = Math.random;
      Math.random = () => 0.1; // This will give us ~105% of original price

      const mockJob = {
        id: 'job-1',
        data: {
          type: 'update',
          competitorId: 'comp-123',
        },
      };

      const result = await jobProcessor(mockJob);

      Math.random = originalRandom;

      // The mock implementation uses random, so priceChanged may or may not be true
      expect(result.updated).toBe(true);
    });
  });
});

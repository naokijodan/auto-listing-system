import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks and shared fakes
const {
  mockPrisma,
  mockQueueAdd,
  mockQueueGetRepeatableJobs,
  mockQueueRemoveRepeatableByKey,
  mockRedisSet,
  mockRedisGet,
  mockLoggerChild,
  mockChildLogger,
  mockEbayClientCtor,
  mockEbayClientInstance,
} = vi.hoisted(() => {
  const mockQueueAdd = vi.fn().mockResolvedValue({});
  const mockQueueGetRepeatableJobs = vi.fn().mockResolvedValue([]);
  const mockQueueRemoveRepeatableByKey = vi.fn().mockResolvedValue(undefined);
  const mockRedisSet = vi.fn().mockResolvedValue('OK');
  const mockRedisGet = vi.fn().mockResolvedValue(null);

  const mockChildLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const mockLoggerChild = vi.fn().mockReturnValue(mockChildLogger);

  const mockPrisma = {
    ebayCategoryMapping: {
      findMany: vi.fn(),
    },
  } as any;

  const mockEbayClientInstance = {
    fetchAndCacheItemAspects: vi.fn(),
    syncPolicies: vi.fn(),
  };
  const mockEbayClientCtor = vi.fn().mockImplementation(() => mockEbayClientInstance);

  return {
    mockPrisma,
    mockQueueAdd,
    mockQueueGetRepeatableJobs,
    mockQueueRemoveRepeatableByKey,
    mockRedisSet,
    mockRedisGet,
    mockLoggerChild,
    mockChildLogger,
    mockEbayClientCtor,
    mockEbayClientInstance,
  };
});

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn().mockReturnValue({
    set: mockRedisSet,
    get: mockRedisGet,
    quit: vi.fn().mockResolvedValue('OK'),
  }),
}));

// Mock BullMQ Queue
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    getRepeatableJobs: mockQueueGetRepeatableJobs,
    removeRepeatableByKey: mockQueueRemoveRepeatableByKey,
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Job: vi.fn(),
}));

// Mock logger
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: mockLoggerChild,
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock database (Prisma client)
vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

// Mock ebay-api for dynamic import in scrape processor
vi.mock('../../lib/ebay-api', () => ({
  EbayApiClient: mockEbayClientCtor,
}));

// Import targets after mocks
import { initializeScheduler } from '../../lib/scheduler';
import { processScrapeJob } from '../../processors/scrape';

describe('BullMQ Cron Jobs: eBay Taxonomy/Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('scheduler.ts - scheduleEbayTaxonomySync', () => {
    it('does not register job when enabled=false', async () => {
      mockQueueGetRepeatableJobs.mockResolvedValue([]);

      await initializeScheduler({
        // explicitly disable only taxonomy to assert absence
        ebayTaxonomySync: {
          enabled: false,
          cronExpression: '0 3 * * 0',
          marketplaceIds: ['EBAY_US'],
        },
        // also disable policy to keep scope tight
        ebayPolicySync: {
          enabled: false,
          cronExpression: '0 4 * * *',
          marketplaceIds: ['EBAY_US'],
        },
      });

      const taxonomyAddCalls = mockQueueAdd.mock.calls.filter((c) => c[0] === 'ebay-taxonomy-sync');
      expect(taxonomyAddCalls.length).toBe(0);
    });

    it('adds cron job when enabled=true with proper data and options', async () => {
      mockQueueGetRepeatableJobs.mockResolvedValue([
        { name: 'ebay-taxonomy-sync', key: 'old-key-1' },
        { name: 'other-job', key: 'old-key-2' },
      ] as any);

      const cronExpression = '0 3 * * 0';
      const marketplaceIds = ['EBAY_US', 'EBAY_GB'];

      await initializeScheduler({
        ebayTaxonomySync: {
          enabled: true,
          cronExpression,
          marketplaceIds,
        },
        ebayPolicySync: {
          enabled: false,
          cronExpression: '0 4 * * *',
          marketplaceIds: ['EBAY_US'],
        },
      });

      // existing repeatable job is removed
      expect(mockQueueRemoveRepeatableByKey).toHaveBeenCalledWith('old-key-1');

      // job is added to scrapeQueue
      const addCall = mockQueueAdd.mock.calls.find((c) => c[0] === 'ebay-taxonomy-sync');
      expect(addCall).toBeTruthy();
      const [, data, opts] = addCall!;
      expect(data.type).toBe('ebay-taxonomy-sync');
      expect(data.marketplaceIds).toEqual(marketplaceIds);
      expect(typeof data.scheduledAt).toBe('string');
      expect(opts.repeat.pattern).toBe(cronExpression);
      expect(opts.jobId).toBe('ebay-taxonomy-sync-scheduled');
    });
  });

  describe('scheduler.ts - scheduleEbayPolicySync', () => {
    it('does not register job when enabled=false', async () => {
      mockQueueGetRepeatableJobs.mockResolvedValue([]);

      await initializeScheduler({
        ebayPolicySync: {
          enabled: false,
          cronExpression: '0 4 * * *',
          marketplaceIds: ['EBAY_US'],
        },
        ebayTaxonomySync: {
          enabled: false,
          cronExpression: '0 3 * * 0',
          marketplaceIds: ['EBAY_US'],
        },
      });

      const policyAddCalls = mockQueueAdd.mock.calls.filter((c) => c[0] === 'ebay-policy-sync');
      expect(policyAddCalls.length).toBe(0);
    });

    it('adds cron job when enabled=true with proper data and options', async () => {
      mockQueueGetRepeatableJobs.mockResolvedValue([
        { name: 'ebay-policy-sync', key: 'old-key-pol' },
      ] as any);

      const cronExpression = '0 4 * * *';
      const marketplaceIds = ['EBAY_US'];

      await initializeScheduler({
        ebayPolicySync: {
          enabled: true,
          cronExpression,
          marketplaceIds,
        },
        ebayTaxonomySync: {
          enabled: false,
          cronExpression: '0 3 * * 0',
          marketplaceIds: ['EBAY_US'],
        },
      });

      // existing repeatable job is removed first
      expect(mockQueueRemoveRepeatableByKey).toHaveBeenCalledWith('old-key-pol');

      // job is added to scrapeQueue with correct payload and options
      const addCall = mockQueueAdd.mock.calls.find((c) => c[0] === 'ebay-policy-sync');
      expect(addCall).toBeTruthy();
      const [, data, opts] = addCall!;
      expect(data.type).toBe('ebay-policy-sync');
      expect(data.marketplaceIds).toEqual(marketplaceIds);
      expect(typeof data.scheduledAt).toBe('string');
      expect(opts.repeat.pattern).toBe(cronExpression);
      expect(opts.jobId).toBe('ebay-policy-sync-scheduled');
    });
  });

  describe('scrape.ts - processScrapeJob for ebay-taxonomy-sync', () => {
    beforeEach(() => {
      mockPrisma.ebayCategoryMapping.findMany.mockReset();
      mockEbayClientInstance.fetchAndCacheItemAspects.mockReset();
      mockEbayClientCtor.mockClear();
      Object.values(mockChildLogger).forEach((fn) => (fn as any).mockClear?.());
    });

    it('creates EbayApiClient and fetches aspects for each active mapping', async () => {
      mockPrisma.ebayCategoryMapping.findMany.mockResolvedValue([
        { ebayCategoryId: '111' },
        { ebayCategoryId: '222' },
      ]);
      mockEbayClientInstance.fetchAndCacheItemAspects.mockResolvedValue(undefined);

      const job = {
        id: 'job-tax-1',
        name: 'ebay-taxonomy-sync',
        data: {
          type: 'ebay-taxonomy-sync',
          marketplaceIds: ['EBAY_US'],
        },
      } as any;

      const result = await processScrapeJob(job);

      expect(mockEbayClientCtor).toHaveBeenCalledTimes(1);
      expect(mockPrisma.ebayCategoryMapping.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { ebayCategoryId: true },
      });
      expect(mockEbayClientInstance.fetchAndCacheItemAspects).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('filters by categoryIds when provided', async () => {
      mockPrisma.ebayCategoryMapping.findMany.mockResolvedValue([
        { ebayCategoryId: '123' },
      ]);
      mockEbayClientInstance.fetchAndCacheItemAspects.mockResolvedValue(undefined);

      const job = {
        id: 'job-tax-2',
        name: 'ebay-taxonomy-sync',
        data: {
          type: 'ebay-taxonomy-sync',
          marketplaceIds: ['EBAY_US'],
          categoryIds: ['123', '456'],
        },
      } as any;

      const result = await processScrapeJob(job);

      expect(mockPrisma.ebayCategoryMapping.findMany).toHaveBeenCalledWith({
        where: { isActive: true, ebayCategoryId: { in: ['123', '456'] } },
        select: { ebayCategoryId: true },
      });
      expect(mockEbayClientInstance.fetchAndCacheItemAspects).toHaveBeenCalledWith('123', 'EBAY_US');
      expect(result.success).toBe(true);
    });

    it('logs warn on error and continues processing', async () => {
      mockPrisma.ebayCategoryMapping.findMany.mockResolvedValue([
        { ebayCategoryId: '111' },
        { ebayCategoryId: '222' },
      ]);
      mockEbayClientInstance.fetchAndCacheItemAspects
        .mockRejectedValueOnce(new Error('failed category 111'))
        .mockResolvedValueOnce(undefined);

      const job = {
        id: 'job-tax-3',
        name: 'ebay-taxonomy-sync',
        data: {
          type: 'ebay-taxonomy-sync',
          marketplaceIds: ['EBAY_US'],
        },
      } as any;

      const result = await processScrapeJob(job);

      expect(mockEbayClientInstance.fetchAndCacheItemAspects).toHaveBeenCalledTimes(2);
      // warn is logged at least once
      expect(mockChildLogger.warn).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('scrape.ts - processScrapeJob for ebay-policy-sync', () => {
    beforeEach(() => {
      mockEbayClientInstance.syncPolicies.mockReset();
      mockEbayClientCtor.mockClear();
    });

    it('creates EbayApiClient and calls syncPolicies for each marketplace', async () => {
      mockEbayClientInstance.syncPolicies.mockResolvedValue({});

      const job = {
        id: 'job-pol-1',
        name: 'ebay-policy-sync',
        data: {
          type: 'ebay-policy-sync',
          marketplaceIds: ['EBAY_US', 'EBAY_GB'],
        },
      } as any;

      const result = await processScrapeJob(job);

      expect(mockEbayClientCtor).toHaveBeenCalledTimes(1);
      expect(mockEbayClientInstance.syncPolicies).toHaveBeenCalledTimes(2);
      expect(mockEbayClientInstance.syncPolicies).toHaveBeenNthCalledWith(1, 'EBAY_US');
      expect(mockEbayClientInstance.syncPolicies).toHaveBeenNthCalledWith(2, 'EBAY_GB');
      expect(result.success).toBe(true);
    });
  });
});


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const {
  mockPrisma,
  mockScrapeMercari,
  mockScrapeYahooAuction,
  mockNotifyOutOfStock,
  mockNotifyPriceChanged,
  mockAlertManager,
  mockEventBus,
  mockSyncListingInventory,
  mockIORedis,
  mockQueue,
  mockProcessBatch,
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      product: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      listing: {
        updateMany: vi.fn(),
        findMany: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
    },
    mockScrapeMercari: vi.fn(),
    mockScrapeYahooAuction: vi.fn(),
    mockNotifyOutOfStock: vi.fn(),
    mockNotifyPriceChanged: vi.fn(),
    mockAlertManager: {
      processEvent: vi.fn(),
    },
    mockEventBus: {
      publishInventoryChange: vi.fn(),
      publishPriceChange: vi.fn(),
    },
    mockSyncListingInventory: vi.fn(),
    mockIORedis: vi.fn().mockReturnValue({
      quit: vi.fn().mockResolvedValue('OK'),
    }),
    mockQueue: {
      add: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    },
    mockProcessBatch: vi.fn(),
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

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
  Marketplace: {
    JOOM: 'JOOM',
    EBAY: 'EBAY',
  },
}));

vi.mock('@rakuda/config', () => ({
  QUEUE_NAMES: {
    INVENTORY: 'rakuda:inventory',
  },
  processBatch: mockProcessBatch,
}));

vi.mock('../../lib/scrapers/mercari', () => ({
  scrapeMercari: mockScrapeMercari,
}));

vi.mock('../../lib/scrapers/yahoo-auction', () => ({
  scrapeYahooAuction: mockScrapeYahooAuction,
}));

vi.mock('../../lib/notifications', () => ({
  notifyOutOfStock: mockNotifyOutOfStock,
  notifyPriceChanged: mockNotifyPriceChanged,
}));

vi.mock('../../lib/alert-manager', () => ({
  alertManager: mockAlertManager,
}));

vi.mock('../../lib/event-bus', () => ({
  eventBus: mockEventBus,
}));

vi.mock('../../processors/inventory-sync', () => ({
  syncListingInventory: mockSyncListingInventory,
}));

vi.mock('ioredis', () => ({
  default: mockIORedis,
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => mockQueue),
}));

import {
  getAlertSettings,
  checkSingleProductInventory,
  runBatchInventoryCheck,
  runParallelInventorySync,
  queueInventoryChecks,
} from '../../lib/inventory-checker';

describe('Inventory Checker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.update.mockResolvedValue({});
    mockPrisma.listing.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.listing.findMany.mockResolvedValue([]);
    mockPrisma.notification.create.mockResolvedValue({});
    mockNotifyOutOfStock.mockResolvedValue(undefined);
    mockNotifyPriceChanged.mockResolvedValue(undefined);
    mockAlertManager.processEvent.mockResolvedValue(undefined);
    mockEventBus.publishInventoryChange.mockResolvedValue(undefined);
    mockEventBus.publishPriceChange.mockResolvedValue(undefined);
    mockSyncListingInventory.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAlertSettings', () => {
    it('should return default settings when no env vars', () => {
      delete process.env.PRICE_CHANGE_THRESHOLD_PERCENT;
      delete process.env.PRICE_CHANGE_NOTIFY;
      delete process.env.OUT_OF_STOCK_NOTIFY;
      delete process.env.INVENTORY_MAX_RETRIES;
      delete process.env.INVENTORY_RETRY_DELAY_MS;

      const settings = getAlertSettings();

      expect(settings.priceChangeThresholdPercent).toBe(10);
      expect(settings.priceChangeNotifyEnabled).toBe(true);
      expect(settings.outOfStockNotifyEnabled).toBe(true);
      expect(settings.maxRetries).toBe(3);
      expect(settings.retryDelayMs).toBe(5000);
    });

    it('should use environment variables when set', () => {
      process.env.PRICE_CHANGE_THRESHOLD_PERCENT = '20';
      process.env.PRICE_CHANGE_NOTIFY = 'false';
      process.env.OUT_OF_STOCK_NOTIFY = 'false';
      process.env.INVENTORY_MAX_RETRIES = '5';
      process.env.INVENTORY_RETRY_DELAY_MS = '10000';

      const settings = getAlertSettings();

      expect(settings.priceChangeThresholdPercent).toBe(20);
      expect(settings.priceChangeNotifyEnabled).toBe(false);
      expect(settings.outOfStockNotifyEnabled).toBe(false);
      expect(settings.maxRetries).toBe(5);
      expect(settings.retryDelayMs).toBe(10000);
    });

    it('should enable notifications unless explicitly disabled', () => {
      process.env.PRICE_CHANGE_NOTIFY = 'true';
      process.env.OUT_OF_STOCK_NOTIFY = 'yes';

      const settings = getAlertSettings();

      expect(settings.priceChangeNotifyEnabled).toBe(true);
      expect(settings.outOfStockNotifyEnabled).toBe(true);
    });
  });

  describe('checkSingleProductInventory', () => {
    const mockProduct = {
      id: 'product-123',
      title: 'Test Product',
      price: 1000,
      sourceUrl: 'https://mercari.com/item/123',
      sourceHash: 'old-hash',
      status: 'ACTIVE',
      source: {
        type: 'MERCARI',
      },
      listings: [],
    };

    it('should return error when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await checkSingleProductInventory('product-123');

      expect(result.productId).toBe('product-123');
      expect(result.isAvailable).toBe(false);
      expect(result.action).toBe('none');
      expect(result.error).toBe('Product not found');
    });

    it('should check Mercari product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(mockScrapeMercari).toHaveBeenCalledWith('https://mercari.com/item/123');
      expect(result.isAvailable).toBe(true);
      expect(result.currentPrice).toBe(1000);
      expect(result.priceChanged).toBe(false);
    });

    it('should check Yahoo Auction product', async () => {
      const yahooProduct = {
        ...mockProduct,
        sourceUrl: 'https://auctions.yahoo.co.jp/item/456',
        source: { type: 'YAHOO_AUCTION' },
      };
      mockPrisma.product.findUnique.mockResolvedValue(yahooProduct);
      mockScrapeYahooAuction.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(mockScrapeYahooAuction).toHaveBeenCalledWith('https://auctions.yahoo.co.jp/item/456');
      expect(result.isAvailable).toBe(true);
    });

    it('should detect price change', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1200, // 20% increase
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.priceChanged).toBe(true);
      expect(result.currentPrice).toBe(1200);
      expect(result.action).toBe('update_price');
    });

    it('should mark out of stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(false);
      expect(result.action).toBe('mark_out_of_stock');
    });

    it('should handle scrape failure', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: false,
        error: 'Scrape failed',
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(false);
      expect(result.error).toBe('Scrape failed');
      expect(result.action).toBe('none');
    });

    it('should handle unsupported source type', async () => {
      const unsupportedProduct = {
        ...mockProduct,
        source: { type: 'UNKNOWN_TYPE' },
      };
      mockPrisma.product.findUnique.mockResolvedValue(unsupportedProduct);

      // Use maxRetries: 0 to avoid long retry delays in test
      const result = await checkSingleProductInventory('product-123', {
        maxRetries: 0,
        retryDelayMs: 1,
      });

      // Unknown source types now gracefully skip (return available=true, no error)
      expect(result.isAvailable).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should update product in database', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1100,
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: expect.objectContaining({
          price: 1100,
          sourceHash: expect.any(String),
        }),
      });
    });

    it('should delist when out of stock with active listings', async () => {
      const productWithListings = {
        ...mockProduct,
        listings: [
          { id: 'listing-1', status: 'ACTIVE', marketplace: 'JOOM', marketplaceListingId: 'joom-123' },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithListings);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.action).toBe('delist');
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith({
        where: {
          productId: 'product-123',
          status: 'ACTIVE',
        },
        data: expect.objectContaining({
          status: 'ENDED',
        }),
      });
    });

    it('should sync marketplace inventory when out of stock', async () => {
      const productWithMarketplaceListings = {
        ...mockProduct,
        listings: [
          { id: 'listing-1', status: 'ACTIVE', marketplace: 'JOOM', marketplaceListingId: 'joom-123' },
          { id: 'listing-2', status: 'ACTIVE', marketplace: 'EBAY', marketplaceListingId: 'ebay-456' },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithMarketplaceListings);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockSyncListingInventory).toHaveBeenCalledWith('listing-1', 0);
      expect(mockSyncListingInventory).toHaveBeenCalledWith('listing-2', 0);
    });

    it('should notify out of stock', async () => {
      const productWithListings = {
        ...mockProduct,
        listings: [{ id: 'listing-1', status: 'ACTIVE', marketplace: 'JOOM' }],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithListings);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT_OF_STOCK',
          productId: 'product-123',
        }),
      });
      expect(mockNotifyOutOfStock).toHaveBeenCalledWith('Test Product', 'https://mercari.com/item/123', 1);
      expect(mockAlertManager.processEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'INVENTORY_OUT_OF_STOCK',
        productId: 'product-123',
      }));
      expect(mockEventBus.publishInventoryChange).toHaveBeenCalledWith('product-123', 'updated', expect.any(Object));
    });

    it('should notify price change when threshold exceeded', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1200, // 20% increase
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PRICE_CHANGE',
          productId: 'product-123',
        }),
      });
      expect(mockNotifyPriceChanged).toHaveBeenCalledWith('Test Product', 1000, 1200, 20);
      expect(mockEventBus.publishPriceChange).toHaveBeenCalled();
    });

    it('should trigger alert for 20%+ price change', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1250, // 25% increase
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockAlertManager.processEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PRICE_DROP_DETECTED',
        productId: 'product-123',
      }));
    });

    it('should not notify for small price changes', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1050, // 5% increase (below 10% threshold)
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockNotifyPriceChanged).not.toHaveBeenCalled();
    });

    it('should use custom alert settings', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });

      await checkSingleProductInventory('product-123', {
        outOfStockNotifyEnabled: false,
      });

      expect(mockNotifyOutOfStock).not.toHaveBeenCalled();
    });

    it('should handle sync inventory failure gracefully', async () => {
      const productWithListings = {
        ...mockProduct,
        listings: [
          { id: 'listing-1', status: 'ACTIVE', marketplace: 'JOOM', marketplaceListingId: 'joom-123' },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithListings);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: false,
        },
      });
      mockSyncListingInventory.mockRejectedValue(new Error('Sync failed'));

      const result = await checkSingleProductInventory('product-123');

      // Should still complete without throwing
      expect(result.action).toBe('delist');
    });

    it('should calculate hash correctly', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockScrapeMercari.mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.newHash).toBeDefined();
      expect(typeof result.newHash).toBe('string');
      expect(result.hashChanged).toBe(true); // Different from old-hash
    });
  });

  describe('runBatchInventoryCheck', () => {
    it('should return empty result when no products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await runBatchInventoryCheck();

      expect(result.total).toBe(0);
      expect(result.checked).toBe(0);
      expect(result.duration).toBe(0);
    });

    it('should process batch of products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
        { id: 'product-3' },
      ]);

      mockProcessBatch.mockResolvedValue({
        results: [
          { success: true, result: { isAvailable: true, priceChanged: false } },
          { success: true, result: { isAvailable: false, priceChanged: false } },
          { success: true, result: { isAvailable: true, priceChanged: true } },
        ],
        stats: {
          processed: 3,
          succeeded: 3,
          failed: 0,
          duration: 5000,
          itemsPerSecond: 0.6,
        },
        aborted: false,
      });

      const result = await runBatchInventoryCheck();

      expect(result.total).toBe(3);
      expect(result.checked).toBe(3);
      expect(result.outOfStock).toBe(1);
      expect(result.priceChanged).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should use custom config', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: { processed: 0, succeeded: 0, failed: 0, duration: 0, itemsPerSecond: 0 },
        aborted: false,
      });

      await runBatchInventoryCheck({
        batchSize: 100,
        maxConcurrent: 5,
        delayBetweenChecks: 5000,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 100,
      }));
    });

    it('should count errors correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);

      mockProcessBatch.mockResolvedValue({
        results: [
          { success: true, result: { isAvailable: true, priceChanged: false } },
          { success: false, error: new Error('Failed') },
        ],
        stats: {
          processed: 2,
          succeeded: 1,
          failed: 1,
          duration: 3000,
          itemsPerSecond: 0.67,
        },
        aborted: false,
      });

      const result = await runBatchInventoryCheck();

      expect(result.errors).toBe(1);
    });

    it('should calculate items per minute', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: {
          processed: 10,
          succeeded: 10,
          failed: 0,
          duration: 60000,
          itemsPerSecond: 10 / 60,
        },
        aborted: false,
      });

      const result = await runBatchInventoryCheck();

      expect(result.itemsPerMinute).toBe(10);
    });
  });

  describe('runParallelInventorySync', () => {
    it('should return empty result when no listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const result = await runParallelInventorySync('joom');

      expect(result.total).toBe(0);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should sync Joom listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { id: 'listing-1' },
        { id: 'listing-2' },
      ]);

      mockProcessBatch.mockResolvedValue({
        results: [
          { success: true, result: { success: true } },
          { success: true, result: { success: true } },
        ],
        stats: {
          processed: 2,
          succeeded: 2,
          failed: 0,
          duration: 2000,
          itemsPerSecond: 1,
        },
        aborted: false,
      });

      const result = await runParallelInventorySync('joom');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          marketplace: 'JOOM',
          status: 'ACTIVE',
          marketplaceListingId: { not: null },
        },
      }));
      expect(result.total).toBe(2);
      expect(result.synced).toBe(2);
    });

    it('should sync eBay listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);
      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: { processed: 0, succeeded: 0, failed: 0, duration: 0, itemsPerSecond: 0 },
        aborted: false,
      });

      await runParallelInventorySync('ebay');

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          marketplace: 'EBAY',
        }),
      }));
    });

    it('should use custom options', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);
      mockProcessBatch.mockResolvedValue({
        results: [],
        stats: { processed: 0, succeeded: 0, failed: 0, duration: 0, itemsPerSecond: 0 },
        aborted: false,
      });

      await runParallelInventorySync('joom', {
        maxListings: 50,
        concurrency: 5,
      });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
      }));
    });

    it('should track failed syncs', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { id: 'listing-1' },
        { id: 'listing-2' },
      ]);

      mockProcessBatch.mockResolvedValue({
        results: [
          { success: true, result: { success: true } },
          { success: false, error: new Error('Sync error') },
        ],
        stats: {
          processed: 2,
          succeeded: 1,
          failed: 1,
          duration: 3000,
          itemsPerSecond: 0.67,
        },
        aborted: false,
      });

      const result = await runParallelInventorySync('joom');

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('queueInventoryChecks', () => {
    it('should queue specified products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1', sourceUrl: 'url1', sourceHash: 'hash1' },
        { id: 'product-2', sourceUrl: 'url2', sourceHash: 'hash2' },
      ]);

      const count = await queueInventoryChecks(['product-1', 'product-2']);

      expect(count).toBe(2);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['product-1', 'product-2'] } },
        select: { id: true, sourceUrl: true, sourceHash: true },
      });
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should queue all active products when no IDs specified', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1', sourceUrl: 'url1', sourceHash: 'hash1' },
      ]);

      await queueInventoryChecks();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] },
        },
        select: { id: true, sourceUrl: true, sourceHash: true },
      });
    });

    it('should add job with correct data', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1', sourceUrl: 'https://example.com', sourceHash: 'abc123' },
      ]);

      await queueInventoryChecks(['product-1']);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'inventory-check',
        {
          productId: 'product-1',
          sourceUrl: 'https://example.com',
          currentHash: 'abc123',
          checkPrice: true,
          checkStock: true,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );
    });

    it('should close queue and redis after queueing', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await queueInventoryChecks();

      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should return zero when no products found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const count = await queueInventoryChecks(['nonexistent']);

      expect(count).toBe(0);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});

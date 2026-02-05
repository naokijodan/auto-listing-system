import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAlertSettings,
  DEFAULT_ALERT_SETTINGS,
  checkSingleProductInventory,
} from '../../lib/inventory-checker';
import { mockPrisma } from '../setup';

// スクレイパーをモック
vi.mock('../../lib/scrapers/mercari', () => ({
  scrapeMercari: vi.fn(),
}));

vi.mock('../../lib/scrapers/yahoo-auction', () => ({
  scrapeYahooAuction: vi.fn(),
}));

// 通知をモック
vi.mock('../../lib/notifications', () => ({
  notifyOutOfStock: vi.fn(),
  notifyPriceChanged: vi.fn(),
}));

// モジュールをインポート
import { scrapeMercari } from '../../lib/scrapers/mercari';
import { scrapeYahooAuction } from '../../lib/scrapers/yahoo-auction';
import { notifyOutOfStock, notifyPriceChanged } from '../../lib/notifications';

describe('InventoryChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Prisma notification mock
    mockPrisma.notification = {
      create: vi.fn().mockResolvedValue({ id: '1' }),
    } as any;
  });

  describe('getAlertSettings', () => {
    it('should return default settings when no env vars set', () => {
      const settings = getAlertSettings();

      expect(settings.priceChangeThresholdPercent).toBe(10);
      expect(settings.priceChangeNotifyEnabled).toBe(true);
      expect(settings.outOfStockNotifyEnabled).toBe(true);
      expect(settings.maxRetries).toBe(3);
      expect(settings.retryDelayMs).toBe(5000);
    });

    it('should respect environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        PRICE_CHANGE_THRESHOLD_PERCENT: '15',
        PRICE_CHANGE_NOTIFY: 'false',
        OUT_OF_STOCK_NOTIFY: 'false',
        INVENTORY_MAX_RETRIES: '5',
        INVENTORY_RETRY_DELAY_MS: '10000',
      };

      const settings = getAlertSettings();

      expect(settings.priceChangeThresholdPercent).toBe(15);
      expect(settings.priceChangeNotifyEnabled).toBe(false);
      expect(settings.outOfStockNotifyEnabled).toBe(false);
      expect(settings.maxRetries).toBe(5);
      expect(settings.retryDelayMs).toBe(10000);

      process.env = originalEnv;
    });
  });

  describe('checkSingleProductInventory', () => {
    const mockProduct = {
      id: 'product-123',
      title: 'Test Product',
      sourceUrl: 'https://jp.mercari.com/item/m12345',
      price: 1000,
      status: 'ACTIVE',
      sourceHash: 'old-hash',
      source: {
        id: 'source-1',
        type: 'MERCARI',
      },
      listings: [],
    };

    beforeEach(() => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue(mockProduct);
      mockPrisma.listing.updateMany.mockResolvedValue({ count: 0 });
    });

    it('should return error when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await checkSingleProductInventory('non-existent-id');

      expect(result.productId).toBe('non-existent-id');
      expect(result.isAvailable).toBe(false);
      expect(result.error).toBe('Product not found');
      expect(result.action).toBe('none');
    });

    it('should detect product still available with same price', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1000,
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(true);
      expect(result.priceChanged).toBe(false);
      expect(result.action).toBe('none');
    });

    it('should detect price change', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1200, // 価格変更
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(true);
      expect(result.priceChanged).toBe(true);
      expect(result.currentPrice).toBe(1200);
      expect(result.action).toBe('update_price');
    });

    it('should detect out of stock', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1000,
          isAvailable: false,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(false);
      expect(result.action).toBe('mark_out_of_stock');
    });

    it('should delist active listings when out of stock', async () => {
      const productWithListings = {
        ...mockProduct,
        listings: [
          { id: 'listing-1', status: 'ACTIVE' },
          { id: 'listing-2', status: 'ACTIVE' },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithListings);

      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1000,
          isAvailable: false,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.action).toBe('delist');
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId: 'product-123',
            status: 'ACTIVE',
          },
          data: expect.objectContaining({
            status: 'ENDED',
          }),
        })
      );
    });

    it('should send out of stock notification when enabled', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1000,
          isAvailable: false,
        },
      });

      await checkSingleProductInventory('product-123', {
        outOfStockNotifyEnabled: true,
      });

      expect(notifyOutOfStock).toHaveBeenCalledWith(
        'Test Product',
        'https://jp.mercari.com/item/m12345',
        0 // no active listings
      );
    });

    it('should send price change notification when threshold exceeded', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1200, // 20% increase
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123', {
        priceChangeNotifyEnabled: true,
        priceChangeThresholdPercent: 10,
      });

      expect(notifyPriceChanged).toHaveBeenCalledWith(
        'Test Product',
        1000,
        1200,
        expect.closeTo(20, 1)
      );
    });

    it('should not send notification when price change below threshold', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1050, // 5% increase
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123', {
        priceChangeNotifyEnabled: true,
        priceChangeThresholdPercent: 10, // 10% threshold
      });

      expect(notifyPriceChanged).not.toHaveBeenCalled();
    });

    it('should handle scrape failure', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: false,
        error: 'Page not found',
      });

      const result = await checkSingleProductInventory('product-123');

      expect(result.isAvailable).toBe(false);
      expect(result.error).toBe('Page not found');
      expect(result.action).toBe('none');
    });

    it('should use Yahoo Auction scraper for Yahoo products', async () => {
      const yahooProduct = {
        ...mockProduct,
        sourceUrl: 'https://page.auctions.yahoo.co.jp/jp/auction/abc123',
        source: {
          id: 'source-2',
          type: 'YAHOO_AUCTION',
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(yahooProduct);

      (scrapeYahooAuction as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Yahoo Product',
          description: 'Description',
          price: 2000,
          isAvailable: true,
        },
      });

      const result = await checkSingleProductInventory('product-123');

      expect(scrapeYahooAuction).toHaveBeenCalled();
      expect(scrapeMercari).not.toHaveBeenCalled();
      expect(result.isAvailable).toBe(true);
    });

    it('should update product hash and price in database', async () => {
      (scrapeMercari as any).mockResolvedValue({
        success: true,
        product: {
          title: 'Test Product',
          description: 'Test Description',
          price: 1500,
          isAvailable: true,
        },
      });

      await checkSingleProductInventory('product-123');

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-123' },
          data: expect.objectContaining({
            price: 1500,
            sourceHash: expect.any(String),
          }),
        })
      );
    });
  });
});

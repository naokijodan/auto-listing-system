import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockCreatePage, mockRandomDelay, mockPage } = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
  };
  return {
    mockCreatePage: vi.fn().mockResolvedValue(mockPage),
    mockRandomDelay: vi.fn().mockResolvedValue(undefined),
    mockPage,
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

vi.mock('../../lib/puppeteer', () => ({
  createPage: mockCreatePage,
  randomDelay: mockRandomDelay,
}));

import { scrapeYahooAuction, scrapeYahooAuctionSeller } from '../../lib/scrapers/yahoo-auction';

describe('Yahoo Auction Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
  });

  describe('scrapeYahooAuction', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Vintage Watch',
        price: 15000,
        buyNowPrice: null,
        description: 'A beautiful vintage watch',
        images: ['https://auctions.yahoo.co.jp/images/123.jpg'],
        category: 'Accessories > Watches',
        condition: 'Used - Good',
        sellerName: 'WatchSeller',
        sellerId: 'seller123',
        isAvailable: true,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/a123456');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Vintage Watch');
      expect(result.product?.price).toBe(15000);
      expect(result.product?.sourceType).toBe('YAHOO_AUCTION');
      expect(result.product?.sourceItemId).toBe('a123456');
    });

    it('should use buy now price when available', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Product with Buy Now',
        price: 10000,
        buyNowPrice: 12000,
        description: '',
        images: [],
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/b123456');

      expect(result.product?.price).toBe(12000);
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapeYahooAuction('https://invalid-url.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Yahoo Auction URL');
    });

    it('should return error when title not found', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: '',
        price: 0,
        buyNowPrice: null,
        description: '',
        images: [],
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/c123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Page not found'));

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/d123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page not found');
    });

    it('should close page after scraping', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        buyNowPrice: null,
        description: '',
        images: [],
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/e123456');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

      await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/f123456');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should limit images to 10', async () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://auctions.yahoo.co.jp/images/${i}.jpg`);
      mockPage.evaluate.mockResolvedValue({
        title: 'Product with many images',
        price: 5000,
        buyNowPrice: null,
        description: '',
        images: manyImages,
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/g123456');

      expect(result.product?.images.length).toBe(10);
    });

    it('should handle ended auctions', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Ended Auction',
        price: 8000,
        buyNowPrice: null,
        description: '',
        images: [],
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: false,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/h123456');

      expect(result.product?.isAvailable).toBe(false);
    });

    it('should extract alphanumeric item ID', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        buyNowPrice: null,
        description: '',
        images: [],
        category: '',
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapeYahooAuction('https://page.auctions.yahoo.co.jp/auction/x987654321');

      expect(result.product?.sourceItemId).toBe('x987654321');
    });
  });

  describe('scrapeYahooAuctionSeller', () => {
    it('should scrape seller products', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          'https://page.auctions.yahoo.co.jp/auction/a111',
          'https://page.auctions.yahoo.co.jp/auction/a222',
        ])
        .mockResolvedValueOnce({
          title: 'Product 1',
          price: 1000,
          buyNowPrice: null,
          description: '',
          images: [],
          category: '',
          condition: null,
          sellerName: null,
          sellerId: null,
          isAvailable: true,
        })
        .mockResolvedValueOnce({
          title: 'Product 2',
          price: 2000,
          buyNowPrice: null,
          description: '',
          images: [],
          category: '',
          condition: null,
          sellerName: null,
          sellerId: null,
          isAvailable: true,
        });

      const result = await scrapeYahooAuctionSeller('https://auctions.yahoo.co.jp/seller/testseller');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
    });

    it('should handle empty product list', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const result = await scrapeYahooAuctionSeller('https://auctions.yahoo.co.jp/seller/emptyseller');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      await scrapeYahooAuctionSeller('https://auctions.yahoo.co.jp/seller/testseller', 10);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 10);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      const result = await scrapeYahooAuctionSeller('https://auctions.yahoo.co.jp/seller/testseller');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });

    it('should use default limit of 50', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      await scrapeYahooAuctionSeller('https://auctions.yahoo.co.jp/seller/testseller');

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 50);
    });
  });
});

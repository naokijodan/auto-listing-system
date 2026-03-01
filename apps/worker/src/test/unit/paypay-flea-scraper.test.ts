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

import { scrapePayPayFlea, scrapePayPayFleaSeller } from '../../lib/scrapers/paypay-flea';

describe('PayPay Flea Market Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
  });

  describe('scrapePayPayFlea', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'PayPay Test Product',
        price: 4500,
        description: 'A nice product',
        images: ['https://item-shopping.c.yimg.jp/123.jpg'],
        category: 'Electronics > Phones',
        brand: 'TestBrand',
        condition: 'Used - Good',
        sellerName: 'PayPay Seller',
        sellerId: 'seller123',
        isAvailable: true,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123xyz');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('PayPay Test Product');
      expect(result.product?.price).toBe(4500);
      expect(result.product?.sourceType).toBe('YAHOO_FLEA');
      expect(result.product?.sourceItemId).toBe('abc123xyz');
    });

    it('should extract alphanumeric item ID', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        description: '',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/XYZ789abc');

      expect(result.product?.sourceItemId).toBe('XYZ789abc');
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid PayPay Flea Market URL');
    });

    it('should return error when title not found', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: '',
        price: 0,
        description: '',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Navigation timeout');
    });

    it('should close page after scraping', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        description: '',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

      await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should limit images to 10', async () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://item-shopping.c.yimg.jp/${i}.jpg`);
      mockPage.evaluate.mockResolvedValue({
        title: 'Product with many images',
        price: 5000,
        description: '',
        images: manyImages,
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(result.product?.images.length).toBe(10);
    });

    it('should handle sold out products', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Sold Out Product',
        price: 3000,
        description: '',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: false,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(result.product?.isAvailable).toBe(false);
    });

    it('should include brand and condition when available', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Branded Product',
        price: 8000,
        description: 'Nice product',
        images: [],
        category: 'Fashion > Bags',
        brand: 'Designer Brand',
        condition: 'Like New',
        sellerName: 'Premium Seller',
        sellerId: 'premium123',
        isAvailable: true,
      });

      const result = await scrapePayPayFlea('https://paypayfleamarket.yahoo.co.jp/item/abc123');

      expect(result.product?.brand).toBe('Designer Brand');
      expect(result.product?.condition).toBe('Like New');
      expect(result.product?.sellerName).toBe('Premium Seller');
      expect(result.product?.sellerId).toBe('premium123');
    });
  });

  describe('scrapePayPayFleaSeller', () => {
    it('should scrape seller products', async () => {
      // Mock scroll height checks
      mockPage.evaluate
        .mockResolvedValueOnce(1000) // first scroll height
        .mockResolvedValueOnce(undefined) // scrollTo
        .mockResolvedValueOnce(1000) // second scroll height (same, exit loop)
        .mockResolvedValueOnce([
          'https://paypayfleamarket.yahoo.co.jp/item/aaa111',
          'https://paypayfleamarket.yahoo.co.jp/item/bbb222',
        ])
        .mockResolvedValueOnce({
          title: 'Product 1',
          price: 1000,
          description: '',
          images: [],
          category: '',
          brand: null,
          condition: null,
          sellerName: null,
          sellerId: null,
          isAvailable: true,
        })
        .mockResolvedValueOnce({
          title: 'Product 2',
          price: 2000,
          description: '',
          images: [],
          category: '',
          brand: null,
          condition: null,
          sellerName: null,
          sellerId: null,
          isAvailable: true,
        });

      const result = await scrapePayPayFleaSeller('https://paypayfleamarket.yahoo.co.jp/seller/test123');

      expect(result.success).toBe(true);
      expect(result.products).toBeDefined();
    });

    it('should handle empty product list', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(1000) // scroll height
        .mockResolvedValueOnce(undefined) // scrollTo
        .mockResolvedValueOnce(1000) // same height
        .mockResolvedValueOnce([]); // empty links

      const result = await scrapePayPayFleaSeller('https://paypayfleamarket.yahoo.co.jp/seller/test123');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Connection refused'));

      const result = await scrapePayPayFleaSeller('https://paypayfleamarket.yahoo.co.jp/seller/test123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should close page after scraping', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce([]);

      await scrapePayPayFleaSeller('https://paypayfleamarket.yahoo.co.jp/seller/test123');

      expect(mockPage.close).toHaveBeenCalled();
    });
  });
});

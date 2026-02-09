import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockCreatePage, mockRandomDelay, mockPage } = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
    setExtraHTTPHeaders: vi.fn(),
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

import { scrapeAmazon, scrapeAmazonSearch } from '../../lib/scrapers/amazon';

describe('Amazon Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
    mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
  });

  describe('scrapeAmazon', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(false) // CAPTCHA check
        .mockResolvedValueOnce({
          title: 'Test Amazon Product',
          price: 4980,
          description: 'A great product',
          images: ['https://m.media-amazon.com/images/I/123.jpg'],
          category: 'Electronics > Accessories',
          brand: 'TestBrand',
          sellerName: 'Amazon',
          isAvailable: true,
          rating: 4.5,
          reviewCount: 1234,
        });

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Test Amazon Product');
      expect(result.product?.price).toBe(4980);
      expect(result.product?.sourceType).toBe('amazon');
      expect(result.product?.sourceItemId).toBe('B08ABCDEFG');
    });

    it('should extract ASIN from various URL formats', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Test',
          price: 1000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: 'Amazon',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        });

      const result = await scrapeAmazon('https://www.amazon.co.jp/gp/product/B01XYZABCD');

      expect(result.product?.sourceItemId).toBe('B01XYZABCD');
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapeAmazon('https://www.amazon.co.jp/invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Amazon URL - could not extract ASIN');
    });

    it('should detect CAPTCHA', async () => {
      mockPage.evaluate.mockResolvedValueOnce(true); // CAPTCHA detected

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.success).toBe(false);
      expect(result.error).toContain('CAPTCHA');
    });

    it('should return error when title not found', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: '',
          price: 0,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        });

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout exceeded'));

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout exceeded');
    });

    it('should close page after scraping', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Test',
          price: 1000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        });

      await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should set HTTP headers for bot detection avoidance', async () => {
      mockPage.evaluate.mockResolvedValueOnce(false).mockResolvedValueOnce({
        title: 'Test',
        price: 1000,
        description: '',
        images: [],
        category: '',
        brand: null,
        sellerName: '',
        isAvailable: true,
        rating: null,
        reviewCount: 0,
      });

      await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
    });

    it('should limit images to 10', async () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://m.media-amazon.com/images/I/${i}.jpg`);
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Product with many images',
          price: 5000,
          description: '',
          images: manyImages,
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        });

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.product?.images.length).toBe(10);
    });

    it('should handle out of stock products', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Out of Stock Product',
          price: 3000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: false,
          rating: null,
          reviewCount: 0,
        });

      const result = await scrapeAmazon('https://www.amazon.co.jp/dp/B08ABCDEFG');

      expect(result.product?.isAvailable).toBe(false);
    });
  });

  describe('scrapeAmazonSearch', () => {
    it('should scrape search results', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          'https://www.amazon.co.jp/dp/B08AAAAAAA',
          'https://www.amazon.co.jp/dp/B08BBBBBBB',
        ]);

      // For each product scrape
      mockPage.evaluate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Product 1',
          price: 1000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        })
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({
          title: 'Product 2',
          price: 2000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: '',
          isAvailable: true,
          rating: null,
          reviewCount: 0,
        });

      const result = await scrapeAmazonSearch('https://www.amazon.co.jp/s?k=test', 10);

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const result = await scrapeAmazonSearch('https://www.amazon.co.jp/s?k=nonexistent');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      const result = await scrapeAmazonSearch('https://www.amazon.co.jp/s?k=test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});

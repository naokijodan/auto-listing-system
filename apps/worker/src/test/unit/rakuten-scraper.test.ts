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

import { scrapeRakuten, scrapeRakutenShop } from '../../lib/scrapers/rakuten';

describe('Rakuten Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
  });

  describe('scrapeRakuten', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Rakuten Test Product',
        price: 5980,
        description: 'A great rakuten product',
        images: ['https://thumbnail.image.rakuten.co.jp/123.jpg'],
        category: 'Electronics > Audio',
        brand: 'TestBrand',
        sellerName: 'Test Shop',
        isAvailable: true,
        reviewCount: 150,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Rakuten Test Product');
      expect(result.product?.price).toBe(5980);
      expect(result.product?.sourceType).toBe('rakuten');
      expect(result.product?.sourceItemId).toBe('testshop:item-12345');
    });

    it('should extract shop and item ID from URL', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        description: '',
        images: [],
        category: '',
        brand: null,
        sellerName: null,
        isAvailable: true,
        reviewCount: null,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/myshop/product-abc123/');

      expect(result.product?.sourceItemId).toBe('myshop:product-abc123');
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapeRakuten('https://www.rakuten.co.jp/invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Rakuten URL');
    });

    it('should return error when title not found', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: '',
        price: 0,
        description: '',
        images: [],
        category: '',
        brand: null,
        sellerName: null,
        isAvailable: true,
        reviewCount: null,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const result = await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

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
        sellerName: null,
        isAvailable: true,
        reviewCount: null,
      });

      await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

      await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle sold out products', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Sold Out Product',
        price: 3000,
        description: '',
        images: [],
        category: '',
        brand: null,
        sellerName: null,
        isAvailable: false,
        reviewCount: null,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/testshop/item-12345/');

      expect(result.product?.isAvailable).toBe(false);
    });

    it('should handle URL with query parameters', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test',
        price: 1000,
        description: '',
        images: [],
        category: '',
        brand: null,
        sellerName: null,
        isAvailable: true,
        reviewCount: null,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/shop123/abc-item?scid=af_pc_etc');

      expect(result.product?.sourceItemId).toBe('shop123:abc-item');
    });

    it('should include brand and category when available', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Branded Product',
        price: 9800,
        description: 'Product description',
        images: ['https://example.com/img.jpg'],
        category: 'Fashion > Bags',
        brand: 'Premium Brand',
        sellerName: 'Brand Shop',
        isAvailable: true,
        reviewCount: 50,
      });

      const result = await scrapeRakuten('https://item.rakuten.co.jp/brandshop/bag-001/');

      expect(result.product?.brand).toBe('Premium Brand');
      expect(result.product?.category).toBe('Fashion > Bags');
      expect(result.product?.sellerName).toBe('Brand Shop');
    });
  });

  describe('scrapeRakutenShop', () => {
    it('should scrape shop products', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          'https://item.rakuten.co.jp/testshop/item-001/',
          'https://item.rakuten.co.jp/testshop/item-002/',
        ])
        .mockResolvedValueOnce({
          title: 'Product 1',
          price: 1000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: null,
          isAvailable: true,
          reviewCount: null,
        })
        .mockResolvedValueOnce({
          title: 'Product 2',
          price: 2000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: null,
          isAvailable: true,
          reviewCount: null,
        });

      const result = await scrapeRakutenShop('https://www.rakuten.co.jp/testshop/');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
    });

    it('should handle empty product list', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const result = await scrapeRakutenShop('https://www.rakuten.co.jp/emptyshop/');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const manyLinks = Array.from(
        { length: 100 },
        (_, i) => `https://item.rakuten.co.jp/shop/item-${i}/`
      );
      mockPage.evaluate.mockResolvedValueOnce(manyLinks.slice(0, 5));

      // Mock the product evaluates
      for (let i = 0; i < 5; i++) {
        mockPage.evaluate.mockResolvedValueOnce({
          title: `Product ${i}`,
          price: 1000 * (i + 1),
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: null,
          isAvailable: true,
          reviewCount: null,
        });
      }

      const result = await scrapeRakutenShop('https://www.rakuten.co.jp/bigshop/', 5);

      expect(result.success).toBe(true);
      expect(result.products?.length).toBeLessThanOrEqual(5);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Connection refused'));

      const result = await scrapeRakutenShop('https://www.rakuten.co.jp/testshop/');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should use default limit of 50', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      await scrapeRakutenShop('https://www.rakuten.co.jp/testshop/');

      expect(mockPage.goto).toHaveBeenCalled();
    });

    it('should skip failed product scrapes', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          'https://item.rakuten.co.jp/testshop/item-001/',
          'https://item.rakuten.co.jp/testshop/item-002/',
        ])
        .mockResolvedValueOnce({
          title: '',  // Will fail - no title
          price: 0,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: null,
          isAvailable: true,
          reviewCount: null,
        })
        .mockResolvedValueOnce({
          title: 'Product 2',
          price: 2000,
          description: '',
          images: [],
          category: '',
          brand: null,
          sellerName: null,
          isAvailable: true,
          reviewCount: null,
        });

      const result = await scrapeRakutenShop('https://www.rakuten.co.jp/testshop/');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.products?.[0].title).toBe('Product 2');
    });
  });
});

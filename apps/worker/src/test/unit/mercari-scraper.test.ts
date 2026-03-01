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

import { scrapeMercari, scrapeMercariSeller } from '../../lib/scrapers/mercari';

describe('Mercari Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
  });

  describe('scrapeMercari', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Test Product',
        price: 3000,
        description: 'This is a test product',
        images: ['https://static.mercdn.net/item/123.jpg'],
        category: 'Electronics > Phones',
        brand: 'Apple',
        condition: 'Like New',
        sellerName: 'TestSeller',
        sellerId: '12345',
        isAvailable: true,
      });

      const result = await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Test Product');
      expect(result.product?.price).toBe(3000);
      expect(result.product?.sourceType).toBe('MERCARI');
      expect(result.product?.sourceItemId).toBe('m12345');
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapeMercari('https://invalid-url.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Mercari URL');
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

      const result = await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const result = await scrapeMercari('https://jp.mercari.com/item/m12345');

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

      await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

      await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should limit images to 10', async () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://static.mercdn.net/item/${i}.jpg`);
      mockPage.evaluate.mockResolvedValue({
        title: 'Test Product',
        price: 3000,
        description: '',
        images: manyImages,
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
      });

      const result = await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(result.product?.images.length).toBe(10);
    });

    it('should extract item ID from various URL formats', async () => {
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

      const result = await scrapeMercari('https://jp.mercari.com/item/mABC123xyz');

      expect(result.product?.sourceItemId).toBe('mABC123xyz');
    });

    it('should handle sold out products', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Sold Product',
        price: 2000,
        description: '',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: false,
      });

      const result = await scrapeMercari('https://jp.mercari.com/item/m12345');

      expect(result.product?.isAvailable).toBe(false);
    });
  });

  describe('scrapeMercariSeller', () => {
    it('should scrape seller products', async () => {
      // First call for seller page
      mockPage.evaluate
        .mockResolvedValueOnce([
          'https://jp.mercari.com/item/m111',
          'https://jp.mercari.com/item/m222',
        ])
        // Then for each product
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

      const result = await scrapeMercariSeller('https://jp.mercari.com/user/profile/12345');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
    });

    it('should return error for invalid seller URL', async () => {
      const result = await scrapeMercariSeller('https://jp.mercari.com/invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Mercari seller URL');
    });

    it('should handle empty product list', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const result = await scrapeMercariSeller('https://jp.mercari.com/user/profile/12345');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const manyUrls = Array.from({ length: 100 }, (_, i) => `https://jp.mercari.com/item/m${i}`);
      mockPage.evaluate.mockResolvedValueOnce(manyUrls.slice(0, 5)); // Limit applied in evaluate

      const result = await scrapeMercariSeller('https://jp.mercari.com/user/profile/12345', 5);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 5);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Connection refused'));

      const result = await scrapeMercariSeller('https://jp.mercari.com/user/profile/12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});

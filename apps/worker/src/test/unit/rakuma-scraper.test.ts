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

import { scrapeRakuma, scrapeRakumaSeller } from '../../lib/scrapers/rakuma';

describe('Rakuma Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
  });

  describe('scrapeRakuma', () => {
    it('should scrape product successfully', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Rakuma Test Product',
        price: 3500,
        description: 'A beautiful item',
        images: ['https://static.fril.jp/large/123.jpg'],
        category: 'Fashion > Bags',
        brand: 'TestBrand',
        condition: 'Good',
        sellerName: 'Test Seller',
        sellerId: '12345',
        isAvailable: true,
        size: 'M',
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Rakuma Test Product');
      expect(result.product?.price).toBe(3500);
      expect(result.product?.sourceType).toBe('rakuma');
      expect(result.product?.sourceItemId).toBe('123456789');
    });

    it('should extract item ID from /items/ URL format', async () => {
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
        size: null,
      });

      const result = await scrapeRakuma('https://fril.jp/items/987654321');

      expect(result.product?.sourceItemId).toBe('987654321');
    });

    it('should return error for invalid URL', async () => {
      const result = await scrapeRakuma('https://fril.jp/invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Rakuma URL');
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
        size: null,
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract product title');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Page load timeout'));

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page load timeout');
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
        size: null,
      });

      await scrapeRakuma('https://fril.jp/item/123456789');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

      await scrapeRakuma('https://fril.jp/item/123456789');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should limit images to 10', async () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://static.fril.jp/large/${i}.jpg`);
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
        size: null,
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

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
        size: null,
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.product?.isAvailable).toBe(false);
    });

    it('should add size to description when available', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Product with size',
        price: 2000,
        description: 'Original description',
        images: [],
        category: '',
        brand: null,
        condition: null,
        sellerName: null,
        sellerId: null,
        isAvailable: true,
        size: 'L',
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.product?.description).toContain('サイズ: L');
      expect(result.product?.description).toContain('Original description');
    });

    it('should include brand and condition when available', async () => {
      mockPage.evaluate.mockResolvedValue({
        title: 'Branded Product',
        price: 9800,
        description: '',
        images: [],
        category: 'Fashion > Accessories',
        brand: 'LuxuryBrand',
        condition: 'Like New',
        sellerName: 'Brand Shop',
        sellerId: '999',
        isAvailable: true,
        size: null,
      });

      const result = await scrapeRakuma('https://fril.jp/item/123456789');

      expect(result.product?.brand).toBe('LuxuryBrand');
      expect(result.product?.condition).toBe('Like New');
      expect(result.product?.sellerName).toBe('Brand Shop');
    });
  });

  describe('scrapeRakumaSeller', () => {
    it('should scrape seller products', async () => {
      // Mock scroll height checks
      mockPage.evaluate
        .mockResolvedValueOnce(1000) // first scroll height
        .mockResolvedValueOnce(undefined) // scrollTo
        .mockResolvedValueOnce(1000) // second scroll height (same, exit loop)
        .mockResolvedValueOnce([
          'https://fril.jp/item/111',
          'https://fril.jp/item/222',
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
          size: null,
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
          size: null,
        });

      const result = await scrapeRakumaSeller('https://fril.jp/user/12345');

      expect(result.success).toBe(true);
      expect(result.products).toBeDefined();
    });

    it('should handle empty product list', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(1000) // scroll height
        .mockResolvedValueOnce(undefined) // scrollTo
        .mockResolvedValueOnce(1000) // same height
        .mockResolvedValueOnce([]); // empty links

      const result = await scrapeRakumaSeller('https://fril.jp/user/12345');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(0);
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Connection refused'));

      const result = await scrapeRakumaSeller('https://fril.jp/user/12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should close page after scraping', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce([]);

      await scrapeRakumaSeller('https://fril.jp/user/12345');

      expect(mockPage.close).toHaveBeenCalled();
    });
  });
});

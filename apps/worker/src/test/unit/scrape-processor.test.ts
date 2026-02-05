import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processScrapeJob } from '../../processors/scrape';
import { mockPrisma } from '../setup';

// Mock scrapers
vi.mock('../../lib/scrapers', () => ({
  scrapeProduct: vi.fn(),
  scrapeSellerProducts: vi.fn(),
}));

// Mock schema
vi.mock('@rakuda/schema', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    generateSourceHash: vi.fn().mockReturnValue('mock-hash-123'),
  };
});

import { scrapeProduct, scrapeSellerProducts } from '../../lib/scrapers';

const mockScrapeProduct = vi.mocked(scrapeProduct);
const mockScrapeSellerProducts = vi.mocked(scrapeSellerProducts);

describe('Scrape Processor', () => {
  const mockSource = { id: 'source-1', type: 'MERCARI', name: 'mercari' };

  const mockJob = {
    id: 'job-123',
    name: 'scrape',
    data: {
      url: 'https://jp.mercari.com/item/m12345',
      sourceType: 'mercari',
      marketplace: ['joom'],
      options: {},
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.source.findFirst.mockResolvedValue(mockSource);
    mockPrisma.source.create.mockResolvedValue(mockSource);
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.product.create.mockResolvedValue({ id: 'product-1', images: [], title: 'Test', description: 'Desc' });
    mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('single product scrape', () => {
    it('should scrape and create new product', async () => {
      mockScrapeProduct.mockResolvedValue({
        success: true,
        product: {
          sourceItemId: 'm12345',
          sourceUrl: 'https://jp.mercari.com/item/m12345',
          title: 'テスト商品',
          description: '商品説明',
          price: 5000,
          images: ['https://static.mercdn.net/item/m12345.jpg'],
          category: 'Electronics',
          condition: '良好',
        },
      });

      const result = await processScrapeJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.productId).toBe('product-1');
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });

    it('should update existing product when hash changed', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'existing-product',
        sourceHash: 'old-hash',
      });
      mockScrapeProduct.mockResolvedValue({
        success: true,
        product: {
          sourceItemId: 'm12345',
          sourceUrl: 'https://jp.mercari.com/item/m12345',
          title: '更新された商品',
          description: '更新された説明',
          price: 6000,
          images: [],
        },
      });

      const result = await processScrapeJob(mockJob);

      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });

    it('should skip update when hash unchanged', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'existing-product',
        sourceHash: 'mock-hash-123', // Same as generated
      });
      mockScrapeProduct.mockResolvedValue({
        success: true,
        product: {
          sourceItemId: 'm12345',
          sourceUrl: 'https://jp.mercari.com/item/m12345',
          title: 'テスト商品',
          description: '商品説明',
          price: 5000,
          images: [],
        },
      });

      const result = await processScrapeJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.message).toContain('no changes');
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });

    it('should create source if not exists', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockScrapeProduct.mockResolvedValue({
        success: true,
        product: {
          sourceItemId: 'm12345',
          sourceUrl: 'https://jp.mercari.com/item/m12345',
          title: 'テスト商品',
          description: '商品説明',
          price: 5000,
          images: [],
        },
      });

      await processScrapeJob(mockJob);

      expect(mockPrisma.source.create).toHaveBeenCalled();
    });

    it('should throw error when scrape fails', async () => {
      mockScrapeProduct.mockResolvedValue({
        success: false,
        error: 'Page not found',
      });

      await expect(processScrapeJob(mockJob)).rejects.toThrow('Page not found');

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Page not found',
        }),
      });
    });

    it('should create job log on success', async () => {
      mockScrapeProduct.mockResolvedValue({
        success: true,
        product: {
          sourceItemId: 'm12345',
          sourceUrl: 'https://jp.mercari.com/item/m12345',
          title: 'テスト商品',
          description: '商品説明',
          price: 5000,
          images: [],
        },
      });

      await processScrapeJob(mockJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'scrape',
          jobType: 'SCRAPE',
          status: 'COMPLETED',
        }),
      });
    });
  });

  describe('seller scrape', () => {
    const sellerJob = {
      id: 'job-456',
      name: 'scrape-seller',
      data: {
        url: 'https://jp.mercari.com/user/profile/12345',
        sourceType: 'mercari',
        options: { limit: 10 },
      },
    } as any;

    it('should scrape multiple products from seller page', async () => {
      mockScrapeSellerProducts.mockResolvedValue({
        success: true,
        products: [
          {
            sourceItemId: 'm001',
            sourceUrl: 'https://jp.mercari.com/item/m001',
            title: '商品1',
            description: '説明1',
            price: 1000,
            images: [],
          },
          {
            sourceItemId: 'm002',
            sourceUrl: 'https://jp.mercari.com/item/m002',
            title: '商品2',
            description: '説明2',
            price: 2000,
            images: [],
          },
        ],
      });

      const result = await processScrapeJob(sellerJob);

      expect(result.success).toBe(true);
      expect(mockScrapeSellerProducts).toHaveBeenCalledWith(
        'https://jp.mercari.com/user/profile/12345',
        'mercari',
        10
      );
    });

    it('should throw error when seller scrape fails', async () => {
      mockScrapeSellerProducts.mockResolvedValue({
        success: false,
        error: 'Seller not found',
      });

      await expect(processScrapeJob(sellerJob)).rejects.toThrow('Seller not found');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';
import { JoomApiClient, isJoomConfigured, calculateJoomPrice } from '../../lib/joom-api';

describe('Joom API', () => {
  beforeEach(() => {
    // 認証情報をモック
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        accessToken: 'test-access-token',
      },
    });
  });

  describe('isJoomConfigured', () => {
    it('should return true when credentials exist', async () => {
      const result = await isJoomConfigured();
      expect(result).toBe(true);
    });

    it('should return false when no credentials', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const result = await isJoomConfigured();
      expect(result).toBe(false);
    });
  });

  describe('JoomApiClient', () => {
    let client: JoomApiClient;

    beforeEach(() => {
      client = new JoomApiClient();
    });

    describe('createProduct', () => {
      it('should create product successfully', async () => {
        const result = await client.createProduct({
          name: 'Test Product',
          description: 'Test Description',
          mainImage: 'https://example.com/image.jpg',
          price: 29.99,
          currency: 'USD',
          quantity: 10,
          sku: 'TEST-SKU-001',
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBeDefined();
      });

      it('should handle validation errors', async () => {
        const result = await client.createProduct({
          name: '', // Empty name should fail
          description: 'Test',
          mainImage: 'https://example.com/image.jpg',
          price: 10,
          currency: 'USD',
          quantity: 1,
          sku: 'TEST',
        });

        expect(result.success).toBe(false);
      });

      it('should throw error when credentials not configured', async () => {
        mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

        // ensureAccessToken throws before the try-catch, so expect rejection
        await expect(
          client.createProduct({
            name: 'Test',
            description: 'Test',
            mainImage: 'https://example.com/image.jpg',
            price: 10,
            currency: 'USD',
            quantity: 1,
            sku: 'TEST',
          })
        ).rejects.toThrow('not configured');
      });
    });

    describe('updateProduct', () => {
      it('should update product successfully', async () => {
        const result = await client.updateProduct('joom-product-123', {
          name: 'Updated Product',
          price: 39.99,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('getProduct', () => {
      it('should get product successfully', async () => {
        const result = await client.getProduct('joom-product-123');

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('Test Product');
      });

      it('should handle not found', async () => {
        const result = await client.getProduct('non-existent');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('enableProduct', () => {
      it('should enable product successfully', async () => {
        const result = await client.enableProduct('joom-product-123');

        expect(result.success).toBe(true);
      });
    });

    describe('disableProduct', () => {
      it('should disable product successfully', async () => {
        const result = await client.disableProduct('joom-product-123');

        expect(result.success).toBe(true);
      });
    });

    describe('updateInventory', () => {
      it('should update inventory successfully', async () => {
        const result = await client.updateInventory('joom-product-123', 'TEST-SKU', 5);

        expect(result.success).toBe(true);
      });
    });

    describe('updatePrice', () => {
      it('should update price successfully', async () => {
        const result = await client.updatePrice('joom-product-123', 'TEST-SKU', 49.99);

        expect(result.success).toBe(true);
      });
    });

    describe('deleteProduct', () => {
      it('should delete product successfully', async () => {
        const result = await client.deleteProduct('joom-product-123');

        expect(result.success).toBe(true);
      });

      it('should handle not found error', async () => {
        const result = await client.deleteProduct('non-existent');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('listProducts', () => {
      it('should list products successfully', async () => {
        const result = await client.listProducts();

        expect(result.success).toBe(true);
        expect(result.data?.products).toBeDefined();
        expect(Array.isArray(result.data?.products)).toBe(true);
      });

      it('should filter by status', async () => {
        const result = await client.listProducts({ status: 'enabled' });

        expect(result.success).toBe(true);
      });

      it('should support pagination', async () => {
        const result = await client.listProducts({ limit: 10, offset: 0 });

        expect(result.success).toBe(true);
      });
    });

    describe('uploadImageByUrl', () => {
      it('should upload image successfully', async () => {
        const result = await client.uploadImageByUrl('https://example.com/image.jpg');

        expect(result.success).toBe(true);
        expect(result.data?.imageId).toBeDefined();
      });
    });

    describe('addProductImage', () => {
      it('should add image to product', async () => {
        const result = await client.addProductImage('joom-product-123', 'https://example.com/image.jpg');

        expect(result.success).toBe(true);
      });

      it('should set as main image', async () => {
        const result = await client.addProductImage('joom-product-123', 'https://example.com/image.jpg', true);

        expect(result.success).toBe(true);
      });
    });

    describe('removeProductImage', () => {
      it('should remove image from product', async () => {
        const result = await client.removeProductImage('joom-product-123', 'image-id-123');

        expect(result.success).toBe(true);
      });
    });

    describe('getOrders', () => {
      it('should get orders successfully', async () => {
        const result = await client.getOrders();

        expect(result.success).toBe(true);
        expect(result.data?.orders).toBeDefined();
      });

      it('should filter by status', async () => {
        const result = await client.getOrders({ status: 'pending' });

        expect(result.success).toBe(true);
      });
    });

    describe('dryRunCreateProduct', () => {
      it('should return validation result for valid product', async () => {
        const result = await client.dryRunCreateProduct({
          name: 'High Quality Japanese Watch - Seiko Presage',
          description: 'Beautiful Japanese automatic watch with sapphire crystal. Excellent condition with original box and papers. Water resistant to 100m. Perfect for formal occasions.',
          mainImage: 'https://example.com/watch.jpg',
          extraImages: ['https://example.com/watch2.jpg', 'https://example.com/watch3.jpg', 'https://example.com/watch4.jpg'],
          price: 299.99,
          currency: 'USD',
          quantity: 1,
          sku: 'SEIKO-001',
          tags: ['watch', 'seiko', 'japanese', 'automatic'],
        });

        expect(result.wouldCreate).toBeDefined();
        expect(result.validation.passed).toBe(true);
        expect(result.validation.warnings).toHaveLength(0);
        expect(result.estimatedVisibility).toBe('high');
      });

      it('should return warnings for short title', async () => {
        const result = await client.dryRunCreateProduct({
          name: 'Watch',
          description: 'A watch',
          mainImage: 'https://example.com/watch.jpg',
          price: 10,
          currency: 'USD',
          quantity: 1,
          sku: 'WATCH-001',
        });

        expect(result.validation.passed).toBe(false);
        expect(result.validation.warnings.length).toBeGreaterThan(0);
        expect(result.validation.warnings.some(w => w.includes('Title'))).toBe(true);
      });

      it('should return medium or low visibility for poor quality listing', async () => {
        const result = await client.dryRunCreateProduct({
          name: 'Item',
          description: 'For sale',
          mainImage: '',
          price: 5,
          currency: 'USD',
          quantity: 1,
          sku: 'ITEM-001',
        });

        // Base score is 50 without any bonuses, which results in 'medium'
        // Only scores < 50 result in 'low'
        expect(['low', 'medium']).toContain(result.estimatedVisibility);
        expect(result.validation.passed).toBe(false); // Should have warnings
        expect(result.validation.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateJoomPrice', () => {
    beforeEach(() => {
      // 為替レートをモック
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({
        id: '1',
        fromCurrency: 'JPY',
        toCurrency: 'USD',
        rate: 0.0067,
        source: 'test',
        fetchedAt: new Date(),
      });

      // 価格設定をモック
      mockPrisma.priceSetting.findFirst.mockResolvedValue({
        id: '1',
        marketplace: 'JOOM',
        isDefault: true,
        platformFeeRate: 0.15,
        paymentFeeRate: 0.03,
        targetProfitRate: 0.30,
      });
    });

    it('should calculate price correctly', async () => {
      const result = await calculateJoomPrice(10000, 200); // 10,000円、200g

      expect(result.finalPriceUsd).toBeGreaterThan(0);
      expect(result.breakdown.costJpy).toBe(10000);
      expect(result.breakdown.costUsd).toBeGreaterThan(0);
      expect(result.breakdown.shippingCost).toBeGreaterThan(0);
      expect(result.breakdown.platformFee).toBeGreaterThan(0);
      expect(result.breakdown.paymentFee).toBeGreaterThan(0);
      expect(result.breakdown.profit).toBeGreaterThan(0);
    });

    it('should include weight-based shipping', async () => {
      const lightResult = await calculateJoomPrice(5000, 100);
      const heavyResult = await calculateJoomPrice(5000, 500);

      expect(heavyResult.breakdown.shippingCost).toBeGreaterThan(lightResult.breakdown.shippingCost);
    });

    it('should use default exchange rate when not found', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await calculateJoomPrice(10000);

      expect(result.finalPriceUsd).toBeGreaterThan(0);
      expect(result.breakdown.exchangeRate).toBe(0.0067); // デフォルト値
    });

    it('should use default price settings when not found', async () => {
      mockPrisma.priceSetting.findFirst.mockResolvedValue(null);

      const result = await calculateJoomPrice(10000);

      expect(result.finalPriceUsd).toBeGreaterThan(0);
    });
  });
});

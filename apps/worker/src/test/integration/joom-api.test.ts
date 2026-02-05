import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';
import { JoomApiClient, isJoomConfigured } from '../../lib/joom-api';

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
  });
});

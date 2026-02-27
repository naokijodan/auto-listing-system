import { describe, it, expect, beforeEach } from 'vitest';
import { server, mockPrisma } from '../setup';
import { errorHandlers } from '../mocks/handlers';
import { EbayApiClient, mapConditionToEbay } from '../../lib/ebay-api';

describe('EbayApiClient', () => {
  let client: EbayApiClient;

  beforeEach(() => {
    // 認証情報をモック
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
      id: '1',
      marketplace: 'EBAY',
      isActive: true,
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      tokenExpiresAt: null,
    });

    client = new EbayApiClient();
  });

  describe('Authentication', () => {
    it('should refresh access token using refresh token', async () => {
      // inventoryApiRequestを通じて間接的にトークン取得をテスト
      const result = await client.createOrUpdateInventoryItem('TEST-SKU', {
        title: 'Test Product',
        description: 'Test Description',
        imageUrls: ['https://example.com/image.jpg'],
        condition: 'NEW',
      });

      expect(result.success).toBe(true);
    });

    it('should handle authentication failure', async () => {
      server.use(errorHandlers.ebayAuthFailure);

      // 認証失敗をシミュレート
      await expect(
        client.createOrUpdateInventoryItem('TEST-SKU', {
          title: 'Test Product',
          description: 'Test Description',
          imageUrls: ['https://example.com/image.jpg'],
          condition: 'NEW',
        })
      ).rejects.toThrow();
    });

    it('should use existing access token if available', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        marketplace: 'EBAY',
        isActive: true,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          accessToken: 'existing-access-token',
        },
        tokenExpiresAt: new Date(Date.now() + 3600000),
      });

      const result = await client.createOrUpdateInventoryItem('TEST-SKU', {
        title: 'Test Product',
        description: 'Test Description',
        imageUrls: ['https://example.com/image.jpg'],
        condition: 'NEW',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Inventory API', () => {
    describe('createOrUpdateInventoryItem', () => {
      it('should create inventory item successfully', async () => {
        const result = await client.createOrUpdateInventoryItem('NEW-SKU-001', {
          title: 'New Product',
          description: 'Product Description',
          imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
          condition: 'NEW',
          conditionDescription: 'Brand new item',
        });

        expect(result.success).toBe(true);
      });

      it('should handle validation errors', async () => {
        const result = await client.createOrUpdateInventoryItem('INVALID-SKU', {
          title: '', // 空のタイトルはエラー
          description: 'Description',
          imageUrls: [],
          condition: 'NEW',
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('title');
      });
    });

    describe('createOffer', () => {
      it('should create offer successfully', async () => {
        const result = await client.createOffer('TEST-SKU', {
          marketplaceId: 'EBAY_US',
          format: 'FIXED_PRICE',
          categoryId: '123456',
          pricingPrice: 29.99,
          pricingCurrency: 'USD',
          quantity: 5,
        });

        expect(result.success).toBe(true);
        expect(result.data?.offerId).toBeDefined();
        expect(result.data?.offerId).toMatch(/^OFFER-/);
      });

      it('should handle missing required fields', async () => {
        const result = await client.createOffer('', {
          marketplaceId: 'EBAY_US',
          format: 'FIXED_PRICE',
          categoryId: '', // 空のカテゴリID
          pricingPrice: 29.99,
          pricingCurrency: 'USD',
          quantity: 5,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('publishOffer', () => {
      it('should publish offer successfully', async () => {
        const result = await client.publishOffer('OFFER-123');

        expect(result.success).toBe(true);
        expect(result.data?.listingId).toBeDefined();
        expect(result.data?.listingId).toMatch(/^LISTING-/);
      });
    });

    describe('withdrawOffer', () => {
      it('should withdraw offer successfully', async () => {
        const result = await client.withdrawOffer('OFFER-123');

        expect(result.success).toBe(true);
      });
    });

    describe('updateInventory', () => {
      it('should update inventory quantity', async () => {
        const result = await client.updateInventory('TEST-SKU', 15);

        expect(result.success).toBe(true);
      });

      it('should handle zero quantity', async () => {
        const result = await client.updateInventory('TEST-SKU', 0);

        expect(result.success).toBe(true);
      });
    });

    describe('updatePrice', () => {
      it('should update price successfully', async () => {
        const result = await client.updatePrice('OFFER-123', 39.99, 'USD');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Category Mapping', () => {
    it('should get category ID from mapping', async () => {
      mockPrisma.ebayCategoryMapping.findUnique.mockResolvedValue({
        id: '1',
        sourceCategory: 'Electronics',
        ebayCategoryId: '293',
      });

      const categoryId = await client.getCategoryId('Electronics');

      expect(categoryId).toBe('293');
    });

    it('should return null for unmapped category', async () => {
      mockPrisma.ebayCategoryMapping.findUnique.mockResolvedValue(null);

      const categoryId = await client.getCategoryId('Unknown Category');

      expect(categoryId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(errorHandlers.networkError);

      const result = await client.createOrUpdateInventoryItem('TEST-SKU', {
        title: 'Test Product',
        description: 'Test Description',
        imageUrls: ['https://example.com/image.jpg'],
        condition: 'NEW',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });
});

describe('mapConditionToEbay', () => {
  it('should map Japanese conditions to eBay conditions', () => {
    expect(mapConditionToEbay('新品')).toBe('NEW');
    expect(mapConditionToEbay('未使用')).toBe('NEW');
    expect(mapConditionToEbay('新品・未使用')).toBe('NEW');
    expect(mapConditionToEbay('未使用に近い')).toBe('NEW_OTHER');
    expect(mapConditionToEbay('目立った傷や汚れなし')).toBe('USED_EXCELLENT');
    expect(mapConditionToEbay('やや傷や汚れあり')).toBe('USED_EXCELLENT');
    expect(mapConditionToEbay('傷や汚れあり')).toBe('USED_ACCEPTABLE');
    expect(mapConditionToEbay('全体的に状態が悪い')).toBe('FOR_PARTS_OR_NOT_WORKING');
  });

  it('should return default for unknown conditions', () => {
    expect(mapConditionToEbay('unknown')).toBe('USED_EXCELLENT');
    expect(mapConditionToEbay('')).toBe('USED_EXCELLENT');
    expect(mapConditionToEbay(undefined)).toBe('USED_EXCELLENT');
  });
});

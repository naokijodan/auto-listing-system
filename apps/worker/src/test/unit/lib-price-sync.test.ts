import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const { mockListingFindUnique, mockListingFindMany, mockListingUpdate, mockCalculatePrice, mockJoomUpdatePrice, mockEbayUpdatePrice } = vi.hoisted(() => ({
  mockListingFindUnique: vi.fn(),
  mockListingFindMany: vi.fn(),
  mockListingUpdate: vi.fn(),
  mockCalculatePrice: vi.fn(),
  mockJoomUpdatePrice: vi.fn(),
  mockEbayUpdatePrice: vi.fn(),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    listing: {
      findUnique: mockListingFindUnique,
      findMany: mockListingFindMany,
      update: mockListingUpdate,
    },
  },
}));

vi.mock('../../lib/price-calculator', () => ({
  calculatePrice: mockCalculatePrice,
}));

vi.mock('../../lib/joom-api', () => ({
  joomApi: {
    updatePrice: mockJoomUpdatePrice,
  },
  isJoomConfigured: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../lib/ebay-api', () => ({
  ebayApi: {
    updatePrice: mockEbayUpdatePrice,
  },
  isEbayConfigured: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../lib/exchange-rate', () => ({
  getLatestExchangeRate: vi.fn().mockResolvedValue(150),
}));

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

import { syncListingPrice, syncAllPrices } from '../../lib/price-sync';

describe('Price Sync (lib)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListingUpdate.mockResolvedValue({});
    mockJoomUpdatePrice.mockResolvedValue({});
    mockEbayUpdatePrice.mockResolvedValue({});
  });

  describe('syncListingPrice', () => {
    it('should return error when listing not found', async () => {
      mockListingFindUnique.mockResolvedValueOnce(null);

      const result = await syncListingPrice('non-existent');

      expect(result.priceChanged).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should sync price when price changed significantly', async () => {
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'JOOM',
        listingPrice: 100,
        status: 'ACTIVE',
        marketplaceListingId: 'joom-123',
        marketplaceData: { sku: 'sku-123' },
        product: {
          price: 10000,
          weight: 200,
          category: 'Electronics',
        },
      });

      mockCalculatePrice.mockResolvedValueOnce({
        listingPrice: 120, // 20% increase
        shippingCost: 10,
      });

      const result = await syncListingPrice('listing-1');

      expect(result.priceChanged).toBe(true);
      expect(result.newPrice).toBe(120);
      expect(result.oldPrice).toBe(100);
    });

    it('should not sync when price change is less than 1%', async () => {
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'JOOM',
        listingPrice: 100,
        status: 'DRAFT',
        product: {
          price: 10000,
          weight: 200,
        },
      });

      mockCalculatePrice.mockResolvedValueOnce({
        listingPrice: 100.5, // 0.5% change
        shippingCost: 10,
      });

      const result = await syncListingPrice('listing-1');

      expect(result.priceChanged).toBe(false);
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('should update Joom API for active listings', async () => {
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'JOOM',
        listingPrice: 100,
        status: 'ACTIVE',
        marketplaceListingId: 'joom-123',
        marketplaceData: { sku: 'sku-123' },
        product: {
          price: 10000,
          weight: 200,
        },
      });

      mockCalculatePrice.mockResolvedValueOnce({
        listingPrice: 150,
        shippingCost: 10,
      });

      const result = await syncListingPrice('listing-1');

      expect(result.apiUpdated).toBe(true);
      expect(mockJoomUpdatePrice).toHaveBeenCalled();
    });

    it('should update eBay API for active listings', async () => {
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'EBAY',
        listingPrice: 100,
        status: 'ACTIVE',
        marketplaceListingId: 'ebay-123',
        marketplaceData: { offerId: 'offer-123' },
        product: {
          price: 10000,
          weight: 200,
        },
      });

      mockCalculatePrice.mockResolvedValueOnce({
        listingPrice: 150,
        shippingCost: 10,
      });

      const result = await syncListingPrice('listing-1');

      expect(result.apiUpdated).toBe(true);
      expect(mockEbayUpdatePrice).toHaveBeenCalled();
    });

    it('should handle API update errors gracefully', async () => {
      mockListingFindUnique.mockResolvedValueOnce({
        id: 'listing-1',
        marketplace: 'JOOM',
        listingPrice: 100,
        status: 'ACTIVE',
        marketplaceListingId: 'joom-123',
        marketplaceData: { sku: 'sku-123' },
        product: {
          price: 10000,
          weight: 200,
        },
      });

      mockCalculatePrice.mockResolvedValueOnce({
        listingPrice: 150,
        shippingCost: 10,
      });

      mockJoomUpdatePrice.mockRejectedValueOnce(new Error('API error'));

      const result = await syncListingPrice('listing-1');

      expect(result.priceChanged).toBe(true);
      expect(result.apiUpdated).toBe(false);
    });
  });

  describe('syncAllPrices', () => {
    it('should sync all active listings', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        { id: 'listing-1' },
        { id: 'listing-2' },
      ]);

      mockListingFindUnique
        .mockResolvedValueOnce({
          id: 'listing-1',
          marketplace: 'JOOM',
          listingPrice: 100,
          status: 'DRAFT',
          product: { price: 10000, weight: 200 },
        })
        .mockResolvedValueOnce({
          id: 'listing-2',
          marketplace: 'JOOM',
          listingPrice: 200,
          status: 'DRAFT',
          product: { price: 20000, weight: 300 },
        });

      mockCalculatePrice.mockResolvedValue({
        listingPrice: 100,
        shippingCost: 10,
      });

      const result = await syncAllPrices({ batchSize: 10 });

      expect(result.total).toBe(2);
    });

    it('should filter by marketplace', async () => {
      mockListingFindMany.mockResolvedValueOnce([]);

      await syncAllPrices({ marketplace: 'JOOM' });

      expect(mockListingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketplace: 'JOOM',
          }),
        })
      );
    });

    it('should handle errors in individual syncs', async () => {
      mockListingFindMany.mockResolvedValueOnce([
        { id: 'listing-1' },
        { id: 'listing-2' },
      ]);

      mockListingFindUnique
        .mockResolvedValueOnce(null) // First listing not found
        .mockResolvedValueOnce({
          id: 'listing-2',
          marketplace: 'JOOM',
          listingPrice: 200,
          status: 'DRAFT',
          product: { price: 20000, weight: 300 },
        });

      mockCalculatePrice.mockResolvedValue({
        listingPrice: 200,
        shippingCost: 10,
      });

      const result = await syncAllPrices();

      expect(result.errors).toBe(1);
    });

    it('should return success false when there are errors', async () => {
      mockListingFindMany.mockResolvedValueOnce([{ id: 'listing-1' }]);
      mockListingFindUnique.mockResolvedValueOnce(null);

      const result = await syncAllPrices();

      expect(result.success).toBe(false);
    });
  });
});

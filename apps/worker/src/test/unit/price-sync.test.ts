import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// Mock dependencies
vi.mock('../../lib/price-calculator', () => ({
  calculatePrice: vi.fn(),
}));

vi.mock('../../lib/joom-api', () => ({
  JoomApiClient: vi.fn().mockImplementation(() => ({
    updatePrice: vi.fn(),
  })),
}));

vi.mock('../../lib/ebay-api', () => ({
  EbayApiClient: vi.fn().mockImplementation(() => ({
    updatePrice: vi.fn(),
  })),
}));

import { processPriceSyncJob, recalculateListingPrice } from '../../processors/price-sync';
import { calculatePrice } from '../../lib/price-calculator';
import { JoomApiClient } from '../../lib/joom-api';
import { EbayApiClient } from '../../lib/ebay-api';

describe('Price Sync Processor', () => {
  const mockCalculatePrice = vi.mocked(calculatePrice);
  const mockJoomClient = { updatePrice: vi.fn() };
  const mockEbayClient = { updatePrice: vi.fn() };

  const mockProduct = {
    id: 'product-1',
    title: 'Test Product',
    titleEn: 'Test Product EN',
    price: 10000, // 10000 JPY
    weight: 200,
    category: 'electronics',
  };

  const mockListing = {
    id: 'listing-1',
    productId: 'product-1',
    marketplace: 'JOOM',
    status: 'ACTIVE',
    listingPrice: 50.00,
    currency: 'USD',
    marketplaceListingId: 'joom-123',
    marketplaceData: { sku: 'SKU-001', variantSku: 'SKU-001-V1' },
    product: mockProduct,
    updatedAt: new Date('2026-01-01'),
  };

  const baseJob = {
    id: 'job-123',
    data: {
      marketplace: 'joom' as const,
      forceUpdate: false,
      maxListings: 100,
      priceChangeThreshold: 2,
      syncToMarketplace: false,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (JoomApiClient as any).mockImplementation(() => mockJoomClient);
    (EbayApiClient as any).mockImplementation(() => mockEbayClient);
    mockPrisma.listing.findMany.mockResolvedValue([mockListing]);
    mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
    mockPrisma.listing.update.mockResolvedValue({ id: 'listing-1' });
    mockPrisma.priceChangeLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'job-log-1' });
    mockPrisma.$transaction.mockImplementation((ops) => Promise.all(ops));
  });

  describe('processPriceSyncJob', () => {
    it('should update price when change exceeds threshold', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 55.00, // 10% increase
        shippingCost: 5.00,
        breakdown: {
          exchangeRate: 0.0067,
          costUsd: 67.00,
          platformFee: 7.15,
          paymentFee: 1.65,
          shippingCost: 5.00,
          profit: 16.50,
        },
      });

      const result = await processPriceSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalUpdated).toBe(1);
      expect(result.summary.totalSkipped).toBe(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip when price change is below threshold', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 50.50, // Only 1% increase, below 2% threshold
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      const result = await processPriceSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSkipped).toBe(1);
      expect(result.summary.totalUpdated).toBe(0);
      expect(result.updates[0].status).toBe('skipped');
      expect(result.updates[0].reason).toContain('below threshold');
    });

    it('should force update when forceUpdate is true', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 50.10, // Only 0.2% increase
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      const forceJob = {
        ...baseJob,
        data: { ...baseJob.data, forceUpdate: true },
      };

      const result = await processPriceSyncJob(forceJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalUpdated).toBe(1);
    });

    it('should sync price to Joom marketplace when enabled', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 60.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      mockJoomClient.updatePrice.mockResolvedValue({ success: true });

      const syncJob = {
        ...baseJob,
        data: { ...baseJob.data, syncToMarketplace: true },
      };

      const result = await processPriceSyncJob(syncJob);

      expect(result.success).toBe(true);
      expect(result.summary.marketplaceSynced).toBe(1);
      expect(mockJoomClient.updatePrice).toHaveBeenCalledWith(
        'joom-123',
        'SKU-001-V1',
        60.00
      );
    });

    it('should sync price to eBay marketplace when enabled', async () => {
      const ebayListing = {
        ...mockListing,
        marketplace: 'EBAY',
        marketplaceData: { offerId: 'offer-123' },
      };
      mockPrisma.listing.findMany.mockResolvedValue([ebayListing]);

      mockCalculatePrice.mockResolvedValue({
        listingPrice: 60.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      mockEbayClient.updatePrice.mockResolvedValue({ success: true });

      const syncJob = {
        ...baseJob,
        data: { ...baseJob.data, marketplace: 'ebay', syncToMarketplace: true },
      };

      const result = await processPriceSyncJob(syncJob);

      expect(result.success).toBe(true);
      expect(result.summary.marketplaceSynced).toBe(1);
      expect(mockEbayClient.updatePrice).toHaveBeenCalledWith(
        'offer-123',
        60.00,
        'USD'
      );
    });

    it('should handle marketplace sync failure gracefully', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 60.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      mockJoomClient.updatePrice.mockResolvedValue({
        success: false,
        error: { message: 'API rate limit' },
      });

      const syncJob = {
        ...baseJob,
        data: { ...baseJob.data, syncToMarketplace: true },
      };

      const result = await processPriceSyncJob(syncJob);

      expect(result.success).toBe(true);
      expect(result.summary.marketplaceFailed).toBe(1);
      expect(result.updates[0].marketplaceSynced).toBe(false);
    });

    it('should handle product not found', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { ...mockListing, product: null },
      ]);

      const result = await processPriceSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalErrors).toBe(1);
      expect(result.updates[0].status).toBe('error');
      expect(result.updates[0].reason).toBe('Product not found');
    });

    it('should calculate average price change correctly', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { ...mockListing, id: 'listing-1', listingPrice: 50.00 },
        { ...mockListing, id: 'listing-2', listingPrice: 100.00 },
      ]);

      mockCalculatePrice
        .mockResolvedValueOnce({
          listingPrice: 55.00, // 10% increase
          shippingCost: 5.00,
          breakdown: { exchangeRate: 0.0067 },
        })
        .mockResolvedValueOnce({
          listingPrice: 120.00, // 20% increase
          shippingCost: 5.00,
          breakdown: { exchangeRate: 0.0067 },
        });

      const result = await processPriceSyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalUpdated).toBe(2);
      expect(result.summary.averagePriceChange).toBe(15); // (10 + 20) / 2
    });

    it('should filter by marketplace when specified', async () => {
      await processPriceSyncJob(baseJob);

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketplace: 'JOOM',
          }),
        })
      );
    });

    it('should create price change log', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 60.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      await processPriceSyncJob(baseJob);

      expect(mockPrisma.priceChangeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            listingId: 'listing-1',
            oldPrice: 50.00,
            newPrice: 60.00,
            source: 'auto_sync',
          }),
        })
      );
    });

    it('should create job log on completion', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 60.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      await processPriceSyncJob(baseJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queueName: 'pricing',
            jobType: 'PRICE_SYNC',
            status: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('recalculateListingPrice', () => {
    it('should recalculate single listing price', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 65.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      const result = await recalculateListingPrice('listing-1');

      expect(result.success).toBe(true);
      expect(result.oldPrice).toBe(50.00);
      expect(result.newPrice).toBe(65.00);
      expect(result.changePercent).toBe(30); // (65-50)/50 * 100
    });

    it('should throw error when listing not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      await expect(recalculateListingPrice('invalid-id')).rejects.toThrow(
        'Listing not found'
      );
    });

    it('should throw error when product not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        ...mockListing,
        product: null,
      });

      await expect(recalculateListingPrice('listing-1')).rejects.toThrow(
        'Listing not found'
      );
    });

    it('should create price change log with manual source', async () => {
      mockCalculatePrice.mockResolvedValue({
        listingPrice: 65.00,
        shippingCost: 5.00,
        breakdown: { exchangeRate: 0.0067 },
      });

      await recalculateListingPrice('listing-1');

      expect(mockPrisma.priceChangeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'manual',
          }),
        })
      );
    });
  });
});

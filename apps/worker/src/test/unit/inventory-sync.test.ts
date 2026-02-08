import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// Mock API clients
vi.mock('../../lib/joom-api', () => ({
  JoomApiClient: vi.fn().mockImplementation(() => ({
    updateInventory: vi.fn(),
  })),
}));

vi.mock('../../lib/ebay-api', () => ({
  EbayApiClient: vi.fn().mockImplementation(() => ({
    updateInventory: vi.fn(),
  })),
}));

import { processInventorySyncJob, syncListingInventory } from '../../processors/inventory-sync';
import { JoomApiClient } from '../../lib/joom-api';
import { EbayApiClient } from '../../lib/ebay-api';

describe('Inventory Sync Processor', () => {
  const mockJoomClient = { updateInventory: vi.fn() };
  const mockEbayClient = { updateInventory: vi.fn() };

  const mockProduct = {
    id: 'product-1',
    title: 'Test Product',
    titleEn: 'Test Product EN',
    status: 'ACTIVE',
    price: 10000,
  };

  const mockListing = {
    id: 'listing-1',
    productId: 'product-1',
    marketplace: 'JOOM',
    status: 'ACTIVE',
    marketplaceListingId: 'joom-123',
    marketplaceData: { sku: 'SKU-001', variantSku: 'SKU-001-V1' },
    product: mockProduct,
    updatedAt: new Date('2026-01-01'),
  };

  const baseJob = {
    id: 'job-123',
    data: {
      marketplace: 'joom' as const,
      syncOutOfStock: true,
      maxListings: 100,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (JoomApiClient as any).mockImplementation(() => mockJoomClient);
    (EbayApiClient as any).mockImplementation(() => mockEbayClient);
    mockPrisma.listing.findMany.mockResolvedValue([mockListing]);
    mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
    mockJoomClient.updateInventory.mockResolvedValue({ success: true });
    mockEbayClient.updateInventory.mockResolvedValue({ success: true });
  });

  describe('processInventorySyncJob', () => {
    it('should sync inventory to Joom successfully', async () => {
      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSynced).toBe(1);
      expect(result.summary.totalErrors).toBe(0);
      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'SKU-001-V1',
        1 // In stock
      );
    });

    it('should sync inventory to eBay successfully', async () => {
      const ebayListing = {
        ...mockListing,
        marketplace: 'EBAY',
        marketplaceData: { sku: 'EBAY-SKU-001' },
      };
      mockPrisma.listing.findMany.mockResolvedValue([ebayListing]);

      const ebayJob = {
        ...baseJob,
        data: { ...baseJob.data, marketplace: 'ebay' },
      };

      const result = await processInventorySyncJob(ebayJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSynced).toBe(1);
      expect(mockEbayClient.updateInventory).toHaveBeenCalledWith(
        'EBAY-SKU-001',
        1
      );
    });

    it('should sync out of stock products with quantity 0', async () => {
      const outOfStockProduct = { ...mockProduct, status: 'OUT_OF_STOCK' };
      const outOfStockListing = { ...mockListing, product: outOfStockProduct };
      mockPrisma.listing.findMany.mockResolvedValue([outOfStockListing]);

      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSynced).toBe(1);
      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'SKU-001-V1',
        0 // Out of stock
      );
    });

    it('should sync sold products with quantity 0', async () => {
      const soldProduct = { ...mockProduct, status: 'SOLD' };
      const soldListing = { ...mockListing, product: soldProduct };
      mockPrisma.listing.findMany.mockResolvedValue([soldListing]);

      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'SKU-001-V1',
        0
      );
    });

    it('should skip out of stock when syncOutOfStock is disabled', async () => {
      const outOfStockProduct = { ...mockProduct, status: 'OUT_OF_STOCK' };
      const outOfStockListing = { ...mockListing, product: outOfStockProduct };
      mockPrisma.listing.findMany.mockResolvedValue([outOfStockListing]);

      const noSyncJob = {
        ...baseJob,
        data: { ...baseJob.data, syncOutOfStock: false },
      };

      const result = await processInventorySyncJob(noSyncJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalSkipped).toBe(1);
      expect(result.summary.totalSynced).toBe(0);
      expect(result.updates[0].reason).toBe('Out of stock sync disabled');
    });

    it('should handle API error', async () => {
      mockJoomClient.updateInventory.mockResolvedValue({
        success: false,
        error: { message: 'API rate limit exceeded' },
      });

      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true); // Job succeeds but has errors
      expect(result.summary.totalErrors).toBe(1);
      expect(result.updates[0].status).toBe('error');
      expect(result.updates[0].reason).toBe('API rate limit exceeded');
    });

    it('should handle product not found', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { ...mockListing, product: null },
      ]);

      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalErrors).toBe(1);
      expect(result.updates[0].status).toBe('error');
      expect(result.updates[0].reason).toBe('Product not found');
    });

    it('should return error for unsupported marketplace', async () => {
      const invalidJob = {
        ...baseJob,
        data: { ...baseJob.data, marketplace: 'amazon' as any },
      };

      const result = await processInventorySyncJob(invalidJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Supported marketplaces');
    });

    it('should sync specific listings when listingIds provided', async () => {
      const jobWithIds = {
        ...baseJob,
        data: { ...baseJob.data, listingIds: ['listing-1', 'listing-2'] },
      };

      await processInventorySyncJob(jobWithIds);

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['listing-1', 'listing-2'] },
          }),
        })
      );
    });

    it('should use fallback SKU format when variantSku not available', async () => {
      const listingWithoutVariant = {
        ...mockListing,
        marketplaceData: null,
      };
      mockPrisma.listing.findMany.mockResolvedValue([listingWithoutVariant]);

      await processInventorySyncJob(baseJob);

      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'joom-123-V1', // Fallback format
        1
      );
    });

    it('should create job log on completion', async () => {
      await processInventorySyncJob(baseJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queueName: 'inventory',
            jobType: 'INVENTORY_SYNC',
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should process multiple listings', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { ...mockListing, id: 'listing-1', marketplaceListingId: 'joom-1' },
        { ...mockListing, id: 'listing-2', marketplaceListingId: 'joom-2' },
        { ...mockListing, id: 'listing-3', marketplaceListingId: 'joom-3' },
      ]);

      const result = await processInventorySyncJob(baseJob);

      expect(result.success).toBe(true);
      expect(result.summary.totalProcessed).toBe(3);
      expect(result.summary.totalSynced).toBe(3);
      expect(mockJoomClient.updateInventory).toHaveBeenCalledTimes(3);
    });

    it('should limit updates array in result', async () => {
      // Create 60 mock listings
      const manyListings = Array.from({ length: 60 }, (_, i) => ({
        ...mockListing,
        id: `listing-${i}`,
        marketplaceListingId: `joom-${i}`,
      }));
      mockPrisma.listing.findMany.mockResolvedValue(manyListings);

      const result = await processInventorySyncJob(baseJob);

      expect(result.updates.length).toBe(50); // Limited to 50
      expect(result.summary.totalProcessed).toBe(60);
    });
  });

  describe('syncListingInventory', () => {
    it('should sync single listing inventory to Joom', async () => {
      const result = await syncListingInventory('listing-1', 5);

      expect(result.success).toBe(true);
      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'SKU-001-V1',
        5
      );
    });

    it('should sync single listing inventory to eBay', async () => {
      const ebayListing = {
        ...mockListing,
        marketplace: 'EBAY',
        marketplaceData: { sku: 'EBAY-SKU-001' },
      };
      mockPrisma.listing.findUnique.mockResolvedValue(ebayListing);

      const result = await syncListingInventory('listing-1', 3);

      expect(result.success).toBe(true);
      expect(mockEbayClient.updateInventory).toHaveBeenCalledWith(
        'EBAY-SKU-001',
        3
      );
    });

    it('should return error for invalid listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      const result = await syncListingInventory('invalid-id', 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid listing');
    });

    it('should return error for listing without marketplace ID', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        ...mockListing,
        marketplaceListingId: null,
      });

      const result = await syncListingInventory('listing-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid listing');
    });

    it('should return error for unsupported marketplace', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        ...mockListing,
        marketplace: 'AMAZON',
      });

      const result = await syncListingInventory('listing-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported marketplace');
    });

    it('should handle API error', async () => {
      mockJoomClient.updateInventory.mockResolvedValue({
        success: false,
        error: { message: 'Network error' },
      });

      const result = await syncListingInventory('listing-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should use fallback SKU for Joom when marketplaceData is null', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        ...mockListing,
        marketplaceData: null,
      });

      await syncListingInventory('listing-1', 5);

      expect(mockJoomClient.updateInventory).toHaveBeenCalledWith(
        'joom-123',
        'joom-123-V1',
        5
      );
    });

    it('should use marketplaceListingId as SKU for eBay when no sku in data', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        ...mockListing,
        marketplace: 'EBAY',
        marketplaceData: {},
      });

      await syncListingInventory('listing-1', 5);

      expect(mockEbayClient.updateInventory).toHaveBeenCalledWith(
        'joom-123', // Falls back to marketplaceListingId
        5
      );
    });
  });
});

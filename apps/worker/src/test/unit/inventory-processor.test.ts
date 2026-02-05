import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processInventoryJob, processScheduledInventoryCheck } from '../../processors/inventory';
import { mockPrisma } from '../setup';

// Mock inventory checker
vi.mock('../../lib/inventory-checker', () => ({
  checkSingleProductInventory: vi.fn(),
}));

import { checkSingleProductInventory } from '../../lib/inventory-checker';

const mockCheckInventory = vi.mocked(checkSingleProductInventory);

describe('Inventory Processor', () => {
  const mockProduct = {
    id: 'product-1',
    title: 'Test Product',
    sourceUrl: 'https://example.com/product/1',
    listings: [],
  };

  const mockJob = {
    id: 'job-123',
    data: {
      productId: 'product-1',
      sourceUrl: 'https://example.com/product/1',
      currentHash: 'abc123',
      checkPrice: true,
      checkStock: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('processInventoryJob', () => {
    it('should process inventory check successfully', async () => {
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        currentPrice: 5000,
        priceChanged: false,
        hashChanged: false,
        action: 'none',
        error: null,
      });

      const result = await processInventoryJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.priceChanged).toBe(false);
      expect(result.action).toBe('none');
    });

    it('should detect price change', async () => {
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        currentPrice: 6000,
        priceChanged: true,
        hashChanged: true,
        newHash: 'def456',
        action: 'update_price',
        error: null,
      });

      const result = await processInventoryJob(mockJob);

      expect(result.priceChanged).toBe(true);
      expect(result.currentPrice).toBe(6000);
      expect(result.action).toBe('update_price');
    });

    it('should detect out of stock', async () => {
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: false,
        currentPrice: null,
        priceChanged: false,
        hashChanged: true,
        action: 'end_listing',
        error: null,
      });

      const result = await processInventoryJob(mockJob);

      expect(result.isAvailable).toBe(false);
      expect(result.action).toBe('end_listing');
    });

    it('should throw error when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(processInventoryJob(mockJob)).rejects.toThrow('Product not found');
    });

    it('should create job log on success', async () => {
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        currentPrice: 5000,
        priceChanged: false,
        hashChanged: false,
        action: 'none',
        error: null,
      });

      await processInventoryJob(mockJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'inventory',
          jobType: 'INVENTORY_CHECK',
          status: 'COMPLETED',
          productId: 'product-1',
        }),
      });
    });

    it('should handle check error', async () => {
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: false,
        priceChanged: false,
        hashChanged: false,
        action: 'none',
        error: 'Failed to fetch page',
      });

      const result = await processInventoryJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to fetch page');
    });

    it('should handle thrown error', async () => {
      mockCheckInventory.mockRejectedValue(new Error('Network error'));

      await expect(processInventoryJob(mockJob)).rejects.toThrow('Network error');

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Network error',
        }),
      });
    });
  });

  describe('processScheduledInventoryCheck', () => {
    const scheduledJob = {
      id: 'scheduled-job-123',
      data: {
        scheduledAt: new Date().toISOString(),
        checkType: 'all' as const,
        batchSize: 10,
      },
    } as any;

    beforeEach(() => {
      // Speed up tests by mocking setTimeout
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should process scheduled inventory check for all products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]);
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        priceChanged: false,
        hashChanged: false,
        action: 'none',
        error: null,
      });

      const resultPromise = processScheduledInventoryCheck(scheduledJob);

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.totalChecked).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should process specific products when specified', async () => {
      const specificJob = {
        id: 'scheduled-job-123',
        data: {
          scheduledAt: new Date().toISOString(),
          checkType: 'specific' as const,
          productIds: ['product-1', 'product-3'],
          batchSize: 10,
        },
      } as any;

      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-3' },
      ]);
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        priceChanged: false,
        hashChanged: false,
        action: 'none',
        error: null,
      });

      const resultPromise = processScheduledInventoryCheck(specificJob);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.totalChecked).toBe(2);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['product-1', 'product-3'] } },
        select: { id: true },
      });
    });

    it('should track out of stock items', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: false,
        priceChanged: false,
        hashChanged: false,
        action: 'end_listing',
        error: null,
      });

      const resultPromise = processScheduledInventoryCheck(scheduledJob);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.outOfStock).toBe(1);
    });

    it('should track price changes', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      mockCheckInventory.mockResolvedValue({
        productId: 'product-1',
        isAvailable: true,
        priceChanged: true,
        hashChanged: true,
        action: 'update_price',
        error: null,
      });

      const resultPromise = processScheduledInventoryCheck(scheduledJob);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.priceChanged).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      mockCheckInventory.mockRejectedValue(new Error('Check failed'));

      const resultPromise = processScheduledInventoryCheck(scheduledJob);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.errors).toBe(1);
      expect(result.success).toBe(true); // Overall job still succeeds
    });

    it('should handle database error', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('DB error'));

      const result = await processScheduledInventoryCheck(scheduledJob);

      expect(result.success).toBe(false);
      expect(result.errors).toBe(1);
    });
  });
});

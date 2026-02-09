import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const { mockProcessImages, mockPrisma } = vi.hoisted(() => {
  return {
    mockProcessImages: vi.fn(),
    mockPrisma: {
      product: {
        update: vi.fn(),
      },
      jobLog: {
        create: vi.fn(),
      },
    },
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

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/image-processor', () => ({
  processImages: mockProcessImages,
}));

import { processImageJob } from '../../processors/image';

describe('Image Processor Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({});
    mockPrisma.jobLog.create.mockResolvedValue({});
  });

  describe('processImageJob', () => {
    it('should process images successfully', async () => {
      const processedImages = [
        {
          originalUrl: 'https://example.com/image1.jpg',
          processedUrl: 'https://storage.example.com/processed1.jpg',
          processedKey: 'key1',
          width: 800,
          height: 600,
          size: 50000,
        },
        {
          originalUrl: 'https://example.com/image2.jpg',
          processedUrl: 'https://storage.example.com/processed2.jpg',
          processedKey: 'key2',
          width: 800,
          height: 600,
          size: 50000,
        },
      ];
      mockProcessImages.mockResolvedValue(processedImages);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
          removeBackground: true,
        },
      };

      const result = await processImageJob(mockJob as any);

      expect(result.success).toBe(true);
      expect(result.processedUrls).toHaveLength(2);
      expect(result.failedUrls).toHaveLength(0);
    });

    it('should update product status to PROCESSING at start', async () => {
      mockProcessImages.mockResolvedValue([]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      await processImageJob(mockJob as any);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: {
          imageStatus: 'PROCESSING',
          status: 'PROCESSING_IMAGES',
        },
      });
    });

    it('should update product status to COMPLETED on success', async () => {
      mockProcessImages.mockResolvedValue([
        {
          originalUrl: 'https://example.com/image.jpg',
          processedUrl: 'https://storage.example.com/processed.jpg',
          processedKey: 'key',
          width: 800,
          height: 600,
          size: 50000,
        },
      ]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      await processImageJob(mockJob as any);

      expect(mockPrisma.product.update).toHaveBeenLastCalledWith({
        where: { id: 'product-123' },
        data: expect.objectContaining({
          imageStatus: 'COMPLETED',
          status: 'READY_TO_REVIEW',
        }),
      });
    });

    it('should create job log on success', async () => {
      mockProcessImages.mockResolvedValue([]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      await processImageJob(mockJob as any);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'image',
          jobType: 'IMAGE',
          status: 'COMPLETED',
          productId: 'product-123',
        }),
      });
    });

    it('should track failed image URLs', async () => {
      mockProcessImages.mockResolvedValue([
        {
          originalUrl: 'https://example.com/image1.jpg',
          processedUrl: 'https://storage.example.com/processed1.jpg',
          processedKey: 'key',
          width: 800,
          height: 600,
          size: 50000,
        },
        // image2 failed - not in results
      ]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg', // This one failed
          ],
        },
      };

      const result = await processImageJob(mockJob as any);

      expect(result.processedUrls).toHaveLength(1);
      expect(result.failedUrls).toHaveLength(1);
      expect(result.failedUrls).toContain('https://example.com/image2.jpg');
    });

    it('should use default removeBackground true', async () => {
      mockProcessImages.mockResolvedValue([]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
          // removeBackground not specified
        },
      };

      await processImageJob(mockJob as any);

      expect(mockProcessImages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        true, // default removeBackground
        3 // concurrency
      );
    });

    it('should respect removeBackground false', async () => {
      mockProcessImages.mockResolvedValue([]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
          removeBackground: false,
        },
      };

      await processImageJob(mockJob as any);

      expect(mockProcessImages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        false,
        3
      );
    });

    it('should handle processing error', async () => {
      mockProcessImages.mockRejectedValue(new Error('Image processing failed'));

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      await expect(processImageJob(mockJob as any)).rejects.toThrow('Image processing failed');
    });

    it('should update product status to ERROR on failure', async () => {
      mockProcessImages.mockRejectedValue(new Error('Processing error'));

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      try {
        await processImageJob(mockJob as any);
      } catch {}

      expect(mockPrisma.product.update).toHaveBeenLastCalledWith({
        where: { id: 'product-123' },
        data: expect.objectContaining({
          imageStatus: 'ERROR',
          status: 'ERROR',
          lastError: 'Processing error',
        }),
      });
    });

    it('should create job log on failure', async () => {
      mockProcessImages.mockRejectedValue(new Error('Processing error'));

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['https://example.com/image.jpg'],
        },
      };

      try {
        await processImageJob(mockJob as any);
      } catch {}

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'image',
          jobType: 'IMAGE',
          status: 'FAILED',
          errorMessage: 'Processing error',
        }),
      });
    });

    it('should include timestamp in result', async () => {
      mockProcessImages.mockResolvedValue([]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: [],
        },
      };

      const result = await processImageJob(mockJob as any);

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should include message in result', async () => {
      mockProcessImages.mockResolvedValue([
        { originalUrl: 'url1', processedUrl: 'purl1', processedKey: 'k1', width: 1, height: 1, size: 1 },
        { originalUrl: 'url2', processedUrl: 'purl2', processedKey: 'k2', width: 1, height: 1, size: 1 },
        { originalUrl: 'url3', processedUrl: 'purl3', processedKey: 'k3', width: 1, height: 1, size: 1 },
      ]);

      const mockJob = {
        id: 'job-123',
        data: {
          productId: 'product-123',
          imageUrls: ['url1', 'url2', 'url3'],
        },
      };

      const result = await processImageJob(mockJob as any);

      expect(result.message).toBe('Processed 3 images');
    });
  });
});

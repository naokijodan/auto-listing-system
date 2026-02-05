import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processImageJob } from '../../processors/image';
import { mockPrisma } from '../setup';

// Mock image processor lib
vi.mock('../../lib/image-processor', () => ({
  processImages: vi.fn(),
}));

import { processImages } from '../../lib/image-processor';

const mockProcessImages = vi.mocked(processImages);

describe('Image Processor', () => {
  const mockJob = {
    id: 'job-123',
    data: {
      productId: 'product-1',
      imageUrls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
      removeBackground: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('processImageJob', () => {
    it('should process images successfully', async () => {
      mockProcessImages.mockResolvedValue([
        { originalUrl: 'https://example.com/image1.jpg', processedUrl: 'https://cdn.example.com/image1.jpg' },
        { originalUrl: 'https://example.com/image2.jpg', processedUrl: 'https://cdn.example.com/image2.jpg' },
      ]);

      const result = await processImageJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.processedUrls).toHaveLength(2);
      expect(result.failedUrls).toHaveLength(0);
      expect(result.message).toContain('2 images');
    });

    it('should update product status to PROCESSING then READY_TO_REVIEW', async () => {
      mockProcessImages.mockResolvedValue([]);

      await processImageJob(mockJob);

      // First update: PROCESSING
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'product-1' },
        data: {
          imageStatus: 'PROCESSING',
          status: 'PROCESSING_IMAGES',
        },
      });

      // Second update: COMPLETED
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: { id: 'product-1' },
          data: expect.objectContaining({
            imageStatus: 'COMPLETED',
            status: 'READY_TO_REVIEW',
          }),
        })
      );
    });

    it('should track failed images', async () => {
      mockProcessImages.mockResolvedValue([
        { originalUrl: 'https://example.com/image1.jpg', processedUrl: 'https://cdn.example.com/image1.jpg' },
        // image2 not processed (failed)
      ]);

      const result = await processImageJob(mockJob);

      expect(result.processedUrls).toHaveLength(1);
      expect(result.failedUrls).toHaveLength(1);
      expect(result.failedUrls[0]).toBe('https://example.com/image2.jpg');
    });

    it('should create job log on success', async () => {
      mockProcessImages.mockResolvedValue([
        { originalUrl: 'https://example.com/image1.jpg', processedUrl: 'https://cdn.example.com/image1.jpg' },
      ]);

      await processImageJob(mockJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'image',
          jobType: 'IMAGE',
          status: 'COMPLETED',
          productId: 'product-1',
          result: expect.objectContaining({
            originalCount: 2,
            processedCount: 1,
            failedCount: 1,
          }),
        }),
      });
    });

    it('should handle processing error', async () => {
      mockProcessImages.mockRejectedValue(new Error('Image processing failed'));

      await expect(processImageJob(mockJob)).rejects.toThrow('Image processing failed');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          imageStatus: 'ERROR',
          status: 'ERROR',
          lastError: 'Image processing failed',
        }),
      });
    });

    it('should create failed job log on error', async () => {
      mockProcessImages.mockRejectedValue(new Error('Image processing failed'));

      await expect(processImageJob(mockJob)).rejects.toThrow();

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Image processing failed',
        }),
      });
    });

    it('should use default removeBackground value', async () => {
      const jobWithoutRemoveBg = {
        ...mockJob,
        data: {
          productId: 'product-1',
          imageUrls: ['https://example.com/image1.jpg'],
          // removeBackground not specified
        },
      };

      mockProcessImages.mockResolvedValue([]);

      await processImageJob(jobWithoutRemoveBg);

      expect(mockProcessImages).toHaveBeenCalledWith(
        ['https://example.com/image1.jpg'],
        'product-1',
        true, // default removeBackground
        3
      );
    });
  });
});

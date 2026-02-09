import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockDownloadImage,
  mockOptimizeImage,
  mockValidateForJoom,
  mockUploadFile,
  mockGenerateProductImageKey,
  mockDeleteProductImages,
  mockIsValidImageUrl,
  mockMkdtemp,
  mockRm,
  mockStat,
  mockSharp,
  mockExecAsync,
} = vi.hoisted(() => ({
  mockDownloadImage: vi.fn(),
  mockOptimizeImage: vi.fn(),
  mockValidateForJoom: vi.fn(),
  mockUploadFile: vi.fn(),
  mockGenerateProductImageKey: vi.fn(),
  mockDeleteProductImages: vi.fn(),
  mockIsValidImageUrl: vi.fn(),
  mockMkdtemp: vi.fn(),
  mockRm: vi.fn(),
  mockStat: vi.fn(),
  mockSharp: vi.fn(),
  mockExecAsync: vi.fn(),
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

vi.mock('fs/promises', () => ({
  default: {
    mkdtemp: mockMkdtemp,
    rm: mockRm,
    stat: mockStat,
  },
  mkdtemp: mockMkdtemp,
  rm: mockRm,
  stat: mockStat,
}));

vi.mock('sharp', () => ({
  default: mockSharp,
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

vi.mock('../../lib/image-downloader', () => ({
  downloadImage: mockDownloadImage,
  isValidImageUrl: mockIsValidImageUrl,
}));

vi.mock('../../lib/image-optimizer', () => ({
  optimizeImage: mockOptimizeImage,
  validateForJoom: mockValidateForJoom,
}));

vi.mock('../../lib/storage', () => ({
  uploadFile: mockUploadFile,
  generateProductImageKey: mockGenerateProductImageKey,
  deleteProductImages: mockDeleteProductImages,
}));

import { processImage, processImages, processImageForJoom, processImagesForJoom } from '../../lib/image-processor';

describe('Image Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockMkdtemp.mockResolvedValue('/tmp/test-image-abc');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 50000 });

    mockSharp.mockReturnValue({
      metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
      png: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
      toFile: vi.fn().mockResolvedValue(undefined),
      composite: vi.fn().mockReturnThis(),
    });

    mockDownloadImage.mockResolvedValue({ success: true });
    mockOptimizeImage.mockResolvedValue({
      success: true,
      outputPath: '/tmp/test-image-abc/optimized-0.jpg',
      width: 800,
      height: 600,
      optimizedSize: 50000,
    });
    mockValidateForJoom.mockReturnValue({ valid: true, issues: [] });
    mockUploadFile.mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/products/123/image.jpg',
    });
    mockGenerateProductImageKey.mockReturnValue('products/123/0.webp');
    mockIsValidImageUrl.mockReturnValue(true);

    // rembg not available by default
    mockExecAsync.mockRejectedValue(new Error('rembg not found'));
  });

  describe('processImage', () => {
    it('should process image successfully', async () => {
      const result = await processImage(
        'https://example.com/image.jpg',
        'product-123',
        0,
        false // disable background removal
      );

      expect(result.originalUrl).toBe('https://example.com/image.jpg');
      expect(result.processedUrl).toBe('https://storage.example.com/products/123/image.jpg');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.size).toBe(50000);
    });

    it('should download image', async () => {
      await processImage('https://example.com/image.jpg', 'product-123', 0, false);

      expect(mockDownloadImage).toHaveBeenCalled();
    });

    it('should optimize image', async () => {
      await processImage('https://example.com/image.jpg', 'product-123', 0, false);

      expect(mockOptimizeImage).toHaveBeenCalled();
    });

    it('should upload to storage', async () => {
      await processImage('https://example.com/image.jpg', 'product-123', 0, false);

      expect(mockUploadFile).toHaveBeenCalled();
    });

    it('should cleanup temp files', async () => {
      await processImage('https://example.com/image.jpg', 'product-123', 0, false);

      expect(mockRm).toHaveBeenCalledWith('/tmp/test-image-abc', { recursive: true });
    });

    it('should throw on download failure', async () => {
      mockDownloadImage.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      await expect(
        processImage('https://example.com/image.jpg', 'product-123', 0, false)
      ).rejects.toThrow('Network error');
    });

    it('should throw on optimization failure', async () => {
      mockOptimizeImage.mockResolvedValue({
        success: false,
        error: 'Invalid image format',
      });

      await expect(
        processImage('https://example.com/image.jpg', 'product-123', 0, false)
      ).rejects.toThrow('Invalid image format');
    });

    it('should throw on upload failure', async () => {
      mockUploadFile.mockResolvedValue({
        success: false,
        error: 'Storage unavailable',
      });

      await expect(
        processImage('https://example.com/image.jpg', 'product-123', 0, false)
      ).rejects.toThrow('Storage unavailable');
    });
  });

  describe('processImages', () => {
    it('should process multiple images', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const results = await processImages(urls, 'product-123', false);

      expect(results).toHaveLength(3);
    });

    it('should handle partial failures', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      // First succeeds, second fails
      mockDownloadImage
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const results = await processImages(urls, 'product-123', false);

      expect(results.length).toBeLessThan(urls.length);
    });

    it('should respect concurrency limit', async () => {
      const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`);

      await processImages(urls, 'product-123', false, 2);

      // Should have been called 10 times total
      expect(mockDownloadImage).toHaveBeenCalledTimes(10);
    });
  });

  describe('processImageForJoom', () => {
    it('should process image for Joom successfully', async () => {
      const result = await processImageForJoom(
        'https://example.com/image.jpg',
        'product-123',
        0
      );

      expect(result.originalUrl).toBe('https://example.com/image.jpg');
      expect(result.format).toBe('webp');
      expect(result.joomCompliant).toBe(true);
      expect(result.validationIssues).toHaveLength(0);
    });

    it('should validate image URL', async () => {
      mockIsValidImageUrl.mockReturnValue(false);

      await expect(
        processImageForJoom('invalid-url', 'product-123', 0)
      ).rejects.toThrow('Invalid image URL');
    });

    it('should use WebP format', async () => {
      await processImageForJoom('https://example.com/image.jpg', 'product-123', 0);

      expect(mockOptimizeImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ format: 'webp' })
      );
    });

    it('should validate for Joom requirements', async () => {
      await processImageForJoom('https://example.com/image.jpg', 'product-123', 0);

      expect(mockValidateForJoom).toHaveBeenCalled();
    });

    it('should report validation issues', async () => {
      mockValidateForJoom.mockReturnValue({
        valid: false,
        issues: ['Image too small', 'Aspect ratio invalid'],
      });

      const result = await processImageForJoom(
        'https://example.com/image.jpg',
        'product-123',
        0
      );

      expect(result.joomCompliant).toBe(false);
      expect(result.validationIssues).toContain('Image too small');
    });

    it('should generate Joom-specific storage key', async () => {
      await processImageForJoom('https://example.com/image.jpg', 'product-123', 0);

      expect(mockGenerateProductImageKey).toHaveBeenCalledWith('product-123', 0, 'webp');
    });
  });

  describe('processImagesForJoom', () => {
    it('should process multiple images for Joom', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      const results = await processImagesForJoom(urls, 'product-123');

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.format).toBe('webp');
      });
    });

    it('should handle partial failures', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      mockDownloadImage
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const results = await processImagesForJoom(urls, 'product-123');

      expect(results.length).toBeLessThan(urls.length);
    });

    it('should respect concurrency limit', async () => {
      const urls = Array.from({ length: 6 }, (_, i) => `https://example.com/image${i}.jpg`);

      await processImagesForJoom(urls, 'product-123', 2);

      expect(mockDownloadImage).toHaveBeenCalledTimes(6);
    });
  });
});

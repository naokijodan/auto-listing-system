import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const { mockS3Client, mockFs } = vi.hoisted(() => {
  return {
    mockS3Client: {
      send: vi.fn(),
    },
    mockFs: {
      readFile: vi.fn(),
      stat: vi.fn(),
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

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => mockS3Client),
  PutObjectCommand: vi.fn().mockImplementation((params) => ({ type: 'PutObject', params })),
  DeleteObjectCommand: vi.fn().mockImplementation((params) => ({ type: 'DeleteObject', params })),
  GetObjectCommand: vi.fn().mockImplementation((params) => ({ type: 'GetObject', params })),
  HeadObjectCommand: vi.fn().mockImplementation((params) => ({ type: 'HeadObject', params })),
  ListObjectsV2Command: vi.fn().mockImplementation((params) => ({ type: 'ListObjects', params })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/file'),
}));

vi.mock('fs/promises', () => ({
  default: mockFs,
}));

import {
  uploadFile,
  uploadBuffer,
  deleteFile,
  fileExists,
  generateProductImageKey,
  listProductImages,
  deleteProductImages,
  buildPublicUrl,
  getPresignedUrl,
  convertToExternalUrl,
  convertImagesToExternalUrls,
  healthCheck,
} from '../../lib/storage';

describe('Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Client.send.mockResolvedValue({});
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
    mockFs.stat.mockResolvedValue({ size: 12 });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const result = await uploadFile('/path/to/image.jpg', 'test/image.jpg');

      expect(result.success).toBe(true);
      expect(result.key).toBe('test/image.jpg');
      expect(result.url).toBeDefined();
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle upload error', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Upload failed'));

      const result = await uploadFile('/path/to/image.jpg', 'test/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should use custom bucket', async () => {
      await uploadFile('/path/to/image.jpg', 'test/image.jpg', {
        bucket: 'custom-bucket',
      });

      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should use custom content type', async () => {
      await uploadFile('/path/to/image.jpg', 'test/image.jpg', {
        contentType: 'image/png',
      });

      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('uploadBuffer', () => {
    it('should upload buffer successfully', async () => {
      const buffer = Buffer.from('test data');
      
      const result = await uploadBuffer(buffer, 'test/data.bin');

      expect(result.success).toBe(true);
      expect(result.key).toBe('test/data.bin');
      expect(result.size).toBe(9);
    });

    it('should handle upload error', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Upload failed'));
      const buffer = Buffer.from('test data');

      const result = await uploadBuffer(buffer, 'test/data.bin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should use custom content type', async () => {
      const buffer = Buffer.from('{}');

      await uploadBuffer(buffer, 'test/data.json', {
        contentType: 'application/json',
      });

      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const result = await deleteFile('test/image.jpg');

      expect(result.success).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Delete failed'));

      const result = await deleteFile('test/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockS3Client.send.mockResolvedValue({});

      const result = await fileExists('test/image.jpg');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Not found'));

      const result = await fileExists('test/nonexistent.jpg');

      expect(result).toBe(false);
    });
  });

  describe('generateProductImageKey', () => {
    it('should generate key with default format', () => {
      const key = generateProductImageKey('product-123', 0);

      expect(key).toMatch(/^products\/product-123\/\d+-0\.webp$/);
    });

    it('should generate key with custom format', () => {
      const key = generateProductImageKey('product-123', 1, 'jpg');

      expect(key).toMatch(/^products\/product-123\/\d+-1\.jpg$/);
    });

    it('should include timestamp in key', () => {
      const beforeTime = Date.now();
      const key = generateProductImageKey('product-123', 0);
      const afterTime = Date.now();

      // Extract timestamp from key
      const match = key.match(/products\/product-123\/(\d+)-0\.webp/);
      expect(match).not.toBeNull();

      const timestamp = parseInt(match![1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('listProductImages', () => {
    it('should list product images', async () => {
      mockS3Client.send.mockResolvedValue({
        Contents: [
          { Key: 'products/product-123/image1.jpg' },
          { Key: 'products/product-123/image2.jpg' },
        ],
      });

      const keys = await listProductImages('product-123');

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe('products/product-123/image1.jpg');
    });

    it('should return empty array on error', async () => {
      mockS3Client.send.mockRejectedValue(new Error('List failed'));

      const keys = await listProductImages('product-123');

      expect(keys).toEqual([]);
    });

    it('should return empty array when no images', async () => {
      mockS3Client.send.mockResolvedValue({ Contents: [] });

      const keys = await listProductImages('product-123');

      expect(keys).toEqual([]);
    });
  });

  describe('deleteProductImages', () => {
    it('should delete all product images', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'products/product-123/image1.jpg' },
            { Key: 'products/product-123/image2.jpg' },
          ],
        })
        .mockResolvedValue({}); // Delete operations

      const result = await deleteProductImages('product-123');

      expect(result.deleted).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should count errors during deletion', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'products/product-123/image1.jpg' },
            { Key: 'products/product-123/image2.jpg' },
          ],
        })
        .mockResolvedValueOnce({}) // First delete succeeds
        .mockRejectedValueOnce(new Error('Delete failed')); // Second fails

      const result = await deleteProductImages('product-123');

      expect(result.deleted).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('buildPublicUrl', () => {
    it('should build public URL', () => {
      const url = buildPublicUrl('my-bucket', 'path/to/file.jpg');

      expect(url).toContain('my-bucket');
      expect(url).toContain('path/to/file.jpg');
    });

    it('should handle trailing slash in CDN URL', () => {
      const url = buildPublicUrl('bucket', 'file.jpg');

      expect(url).not.toContain('//bucket');
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const url = await getPresignedUrl('test/image.jpg');

      expect(url).toBe('https://signed-url.example.com/file');
    });

    it('should use custom expiration', async () => {
      await getPresignedUrl('test/image.jpg', 'bucket', 3600);

      // Function should complete without error
    });
  });

  describe('convertToExternalUrl', () => {
    it('should return non-local URL unchanged', async () => {
      const url = await convertToExternalUrl('https://external.com/image.jpg');

      expect(url).toBe('https://external.com/image.jpg');
    });

    it('should convert localhost URL to presigned URL', async () => {
      const url = await convertToExternalUrl('http://localhost:9000/bucket/path/to/file.jpg');

      expect(url).toBe('https://signed-url.example.com/file');
    });

    it('should convert 127.0.0.1 URL to presigned URL', async () => {
      const url = await convertToExternalUrl('http://127.0.0.1:9000/bucket/path/to/file.jpg');

      expect(url).toBe('https://signed-url.example.com/file');
    });

    it('should convert minio URL to presigned URL', async () => {
      const url = await convertToExternalUrl('http://minio:9000/bucket/path/to/file.jpg');

      expect(url).toBe('https://signed-url.example.com/file');
    });
  });

  describe('convertImagesToExternalUrls', () => {
    it('should convert multiple image URLs', async () => {
      const urls = [
        'https://external.com/image1.jpg',
        'http://localhost:9000/bucket/image2.jpg',
      ];

      const results = await convertImagesToExternalUrls(urls);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe('https://external.com/image1.jpg');
      expect(results[1]).toBe('https://signed-url.example.com/file');
    });

    it('should handle empty array', async () => {
      const results = await convertImagesToExternalUrls([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when S3 is accessible', async () => {
      mockS3Client.send.mockResolvedValue({ Contents: [] });

      const result = await healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.bucket).toBeDefined();
    });

    it('should return unhealthy on S3 error', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Connection refused'));

      const result = await healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});

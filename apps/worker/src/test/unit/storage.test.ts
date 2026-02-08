import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockSend, mockReadFile, mockStat } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockReadFile: vi.fn(),
  mockStat: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
  DeleteObjectCommand: vi.fn().mockImplementation((params) => params),
  GetObjectCommand: vi.fn().mockImplementation((params) => params),
  HeadObjectCommand: vi.fn().mockImplementation((params) => params),
  ListObjectsV2Command: vi.fn().mockImplementation((params) => params),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
    stat: mockStat,
  },
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

describe('Storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_BUCKET = 'test-bucket';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const fileBuffer = Buffer.from('test content');
      mockReadFile.mockResolvedValueOnce(fileBuffer);
      mockStat.mockResolvedValueOnce({ size: fileBuffer.length });
      mockSend.mockResolvedValueOnce({});

      const { uploadFile } = await import('../../lib/storage');

      const result = await uploadFile('/path/to/file.jpg', 'images/test.jpg');

      expect(result.success).toBe(true);
      expect(result.key).toBe('images/test.jpg');
      expect(result.url).toContain('test-bucket');
      expect(result.size).toBe(fileBuffer.length);
    });

    it('should handle upload errors', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('test'));
      mockStat.mockResolvedValueOnce({ size: 4 });
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      const { uploadFile } = await import('../../lib/storage');

      const result = await uploadFile('/path/to/file.jpg', 'images/test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('S3 error');
    });

    it('should use custom bucket', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('test'));
      mockStat.mockResolvedValueOnce({ size: 4 });
      mockSend.mockResolvedValueOnce({});

      const { uploadFile } = await import('../../lib/storage');

      const result = await uploadFile('/path/to/file.jpg', 'key.jpg', {
        bucket: 'custom-bucket',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'custom-bucket',
        })
      );
    });

    it('should set custom content type', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('test'));
      mockStat.mockResolvedValueOnce({ size: 4 });
      mockSend.mockResolvedValueOnce({});

      const { uploadFile } = await import('../../lib/storage');

      await uploadFile('/path/to/file.jpg', 'key.jpg', {
        contentType: 'image/webp',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          ContentType: 'image/webp',
        })
      );
    });
  });

  describe('uploadBuffer', () => {
    it('should upload buffer successfully', async () => {
      const buffer = Buffer.from('test content');
      mockSend.mockResolvedValueOnce({});

      const { uploadBuffer } = await import('../../lib/storage');

      const result = await uploadBuffer(buffer, 'images/test.jpg', {
        contentType: 'image/jpeg',
      });

      expect(result.success).toBe(true);
      expect(result.key).toBe('images/test.jpg');
      expect(result.size).toBe(buffer.length);
    });

    it('should handle buffer upload errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Upload failed'));

      const { uploadBuffer } = await import('../../lib/storage');

      const result = await uploadBuffer(Buffer.from('test'), 'key.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockSend.mockResolvedValueOnce({});

      const { deleteFile } = await import('../../lib/storage');

      const result = await deleteFile('images/test.jpg');

      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Delete failed'));

      const { deleteFile } = await import('../../lib/storage');

      const result = await deleteFile('images/test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockSend.mockResolvedValueOnce({});

      const { fileExists } = await import('../../lib/storage');

      const exists = await fileExists('images/test.jpg');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockSend.mockRejectedValueOnce(new Error('Not found'));

      const { fileExists } = await import('../../lib/storage');

      const exists = await fileExists('images/nonexistent.jpg');

      expect(exists).toBe(false);
    });
  });

  describe('generateProductImageKey', () => {
    it('should generate valid key for product image', async () => {
      const { generateProductImageKey } = await import('../../lib/storage');

      const key = generateProductImageKey('prod-123', 0, 'jpg');

      expect(key).toMatch(/^products\/prod-123\/\d+-0\.jpg$/);
    });

    it('should include different indices', async () => {
      const { generateProductImageKey } = await import('../../lib/storage');

      const key1 = generateProductImageKey('prod-123', 0, 'jpg');
      const key2 = generateProductImageKey('prod-123', 1, 'jpg');

      expect(key1).toContain('-0.jpg');
      expect(key2).toContain('-1.jpg');
    });
  });

  describe('listProductImages', () => {
    it('should list product images', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'products/prod-123/image1.jpg' },
          { Key: 'products/prod-123/image2.jpg' },
        ],
      });

      const { listProductImages } = await import('../../lib/storage');

      const keys = await listProductImages('prod-123');

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe('products/prod-123/image1.jpg');
    });

    it('should return empty array on error', async () => {
      mockSend.mockRejectedValueOnce(new Error('List failed'));

      const { listProductImages } = await import('../../lib/storage');

      const keys = await listProductImages('prod-123');

      expect(keys).toEqual([]);
    });

    it('should return empty array when no contents', async () => {
      mockSend.mockResolvedValueOnce({});

      const { listProductImages } = await import('../../lib/storage');

      const keys = await listProductImages('prod-123');

      expect(keys).toEqual([]);
    });
  });

  describe('deleteProductImages', () => {
    it('should delete all product images', async () => {
      // List images
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'products/prod-123/image1.jpg' },
          { Key: 'products/prod-123/image2.jpg' },
        ],
      });
      // Delete each image
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({});

      const { deleteProductImages } = await import('../../lib/storage');

      const result = await deleteProductImages('prod-123');

      expect(result.deleted).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should count errors', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'products/prod-123/image1.jpg' }],
      });
      mockSend.mockRejectedValueOnce(new Error('Delete failed'));

      const { deleteProductImages } = await import('../../lib/storage');

      const result = await deleteProductImages('prod-123');

      expect(result.deleted).toBe(0);
      expect(result.errors).toBe(1);
    });
  });

  describe('buildPublicUrl', () => {
    it('should build public URL', async () => {
      const { buildPublicUrl } = await import('../../lib/storage');

      const url = buildPublicUrl('my-bucket', 'images/test.jpg');

      expect(url).toBe('http://localhost:9000/my-bucket/images/test.jpg');
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned URL', async () => {
      const { getPresignedUrl } = await import('../../lib/storage');

      const url = await getPresignedUrl('images/test.jpg');

      expect(url).toBe('https://signed-url.example.com');
    });
  });
});

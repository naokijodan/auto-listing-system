import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockWriteFile } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    writeFile: mockWriteFile,
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

const mockFetch = vi.fn();

describe('Image Downloader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', mockFetch);
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isValidImageUrl', () => {
    it('should return true for valid http URL', async () => {
      const { isValidImageUrl } = await import('../../lib/image-downloader');

      expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('should return true for valid https URL', async () => {
      const { isValidImageUrl } = await import('../../lib/image-downloader');

      expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
    });

    it('should return false for invalid URL', async () => {
      const { isValidImageUrl } = await import('../../lib/image-downloader');

      expect(isValidImageUrl('not-a-url')).toBe(false);
    });

    it('should return false for ftp URL', async () => {
      const { isValidImageUrl } = await import('../../lib/image-downloader');

      expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
    });

    it('should return false for data URL', async () => {
      const { isValidImageUrl } = await import('../../lib/image-downloader');

      expect(isValidImageUrl('data:image/png;base64,abc')).toBe(false);
    });
  });

  describe('estimateUrlExpiry', () => {
    it('should return 24h for Mercari URLs', async () => {
      const { estimateUrlExpiry } = await import('../../lib/image-downloader');

      const expiry = estimateUrlExpiry('https://static.mercdn.net/item/image.jpg');

      expect(expiry).toBeInstanceOf(Date);
      // Should be approximately 24 hours from now
      const diff = expiry!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
    });

    it('should return 7 days for Yahoo Auctions URLs', async () => {
      const { estimateUrlExpiry } = await import('../../lib/image-downloader');

      const expiry = estimateUrlExpiry('https://auctions.c.yimg.jp/images/item.jpg');

      expect(expiry).toBeInstanceOf(Date);
      const diff = expiry!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000);
    });

    it('should return null for Amazon URLs', async () => {
      const { estimateUrlExpiry } = await import('../../lib/image-downloader');

      expect(estimateUrlExpiry('https://images-amazon.com/item.jpg')).toBeNull();
      expect(estimateUrlExpiry('https://m.media-amazon.com/item.jpg')).toBeNull();
    });

    it('should return 24h for unknown URLs', async () => {
      const { estimateUrlExpiry } = await import('../../lib/image-downloader');

      const expiry = estimateUrlExpiry('https://unknown-site.com/image.jpg');

      expect(expiry).toBeInstanceOf(Date);
      const diff = expiry!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    });
  });

  describe('downloadImage', () => {
    it('should download image successfully', async () => {
      const imageBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: () => Promise.resolve(imageBuffer.buffer),
      });

      const { downloadImage } = await import('../../lib/image-downloader');

      const result = await downloadImage(
        'https://example.com/image.png',
        '/tmp/test.png',
        { retries: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/tmp/test.png');
      expect(result.contentType).toBe('image/png');
      expect(result.size).toBe(4);
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });

      const { downloadImage } = await import('../../lib/image-downloader');

      const result = await downloadImage(
        'https://example.com/image.jpg',
        '/tmp/test.jpg',
        { retries: 2, retryDelay: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should return error after all retries fail', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const { downloadImage } = await import('../../lib/image-downloader');

      const result = await downloadImage(
        'https://example.com/image.jpg',
        '/tmp/test.jpg',
        { retries: 2, retryDelay: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(result.attempts).toBe(2);
    });

    it('should fail on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { downloadImage } = await import('../../lib/image-downloader');

      const result = await downloadImage(
        'https://example.com/image.jpg',
        '/tmp/test.jpg',
        { retries: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should fail on non-image content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const { downloadImage } = await import('../../lib/image-downloader');

      const result = await downloadImage(
        'https://example.com/page.html',
        '/tmp/test.jpg',
        { retries: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not an image');
    });
  });

  describe('downloadImages', () => {
    it('should download multiple images', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
      });

      const { downloadImages } = await import('../../lib/image-downloader');

      const results = await downloadImages(
        [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
        ],
        '/tmp',
        { retries: 1 },
        2 // concurrency
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle partial failures', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
        })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
        });

      const { downloadImages } = await import('../../lib/image-downloader');

      const results = await downloadImages(
        ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
        '/tmp',
        { retries: 1 },
        3
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});

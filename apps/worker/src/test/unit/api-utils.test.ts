import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RateLimiter,
  sleep,
  withRetry,
  ApiError,
  RateLimitError,
  createApiError,
  safeFetch,
  apiRequest,
  DEFAULT_RETRY_CONFIG,
} from '../../lib/api-utils';

describe('api-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      const sleepPromise = sleep(1000);

      await vi.advanceTimersByTimeAsync(1000);
      await sleepPromise;

      expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter(5, 1000);

      // 5 requests should pass immediately
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }
    });

    it('should throttle requests over limit', async () => {
      const limiter = new RateLimiter(2, 1000);

      // First 2 requests pass immediately
      await limiter.acquire();
      await limiter.acquire();

      // Third request should wait
      const acquirePromise = limiter.acquire();

      // Advance time
      await vi.advanceTimersByTimeAsync(1000);
      await acquirePromise;
    });

    it('should reset request times', () => {
      const limiter = new RateLimiter(5, 1000);
      limiter.reset();
      // Should not throw
    });
  });

  describe('withRetry', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      vi.useRealTimers(); // Need real timers for retry delays

      const fn = vi.fn()
        .mockRejectedValueOnce(new ApiError('Server error', 500))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10,
        retryableStatuses: [500],
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      vi.useRealTimers();

      const fn = vi.fn().mockRejectedValue(new ApiError('Server error', 500));

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelay: 10,
          retryableStatuses: [500],
        })
      ).rejects.toThrow('Server error');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable error', async () => {
      vi.useRealTimers();

      const fn = vi.fn().mockRejectedValue(new ApiError('Bad request', 400));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelay: 10,
          retryableStatuses: [500],
        })
      ).rejects.toThrow('Bad request');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      vi.useRealTimers();

      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNRESET';

      const fn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('ApiError', () => {
    it('should create error with all properties', () => {
      const error = new ApiError('Test error', 404, 'NOT_FOUND', { detail: 'info' });

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.message).toBe('Too many requests');
      expect(error.status).toBe(429);
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('createApiError', () => {
    it('should create error from response with JSON', async () => {
      const response = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['Content-Type', 'application/json']]),
        json: async () => ({
          errors: [{ errorId: 'INVALID_INPUT', message: 'Invalid input' }],
        }),
        text: async () => '',
      } as unknown as Response;

      const error = await createApiError(response);

      expect(error.message).toBe('Invalid input');
      expect(error.status).toBe(400);
      expect(error.code).toBe('INVALID_INPUT');
    });

    it('should create rate limit error for 429', async () => {
      const response = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'Retry-After' ? '30' : null,
        },
        json: async () => ({ message: 'Rate limited' }),
        text: async () => '',
      } as unknown as Response;

      const error = await createApiError(response);

      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBe(30);
    });

    it('should handle non-JSON response', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null,
        },
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Plain text error',
      } as unknown as Response;

      const error = await createApiError(response);

      expect(error.status).toBe(500);
    });
  });

  describe('safeFetch', () => {
    it('should make fetch request', async () => {
      vi.useRealTimers();

      const mockResponse = { ok: true, json: async () => ({ data: 'test' }) };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await safeFetch('https://api.example.com/test', {
        timeout: 5000,
      });

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should timeout long requests', async () => {
      vi.useRealTimers();

      global.fetch = vi.fn().mockImplementation(
        (url: string, options?: RequestInit) =>
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => resolve({ ok: true }), 10000);
            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Aborted'));
            });
          })
      );

      await expect(
        safeFetch('https://api.example.com/test', { timeout: 100 })
      ).rejects.toThrow('Aborted');
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(429);
      expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(503);
    });
  });
});

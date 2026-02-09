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
  apiRequestWithCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  withRetryAndCircuitBreaker,
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
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(true);
    });
  });

  // ========================================
  // サーキットブレーカーテスト（Phase 45）
  // ========================================
  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker('test-closed');
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isOpen()).toBe(false);
    });

    it('should open after failure threshold', async () => {
      const cb = new CircuitBreaker('test-open', { failureThreshold: 3 });

      // 3回失敗させる
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      expect(cb.getState()).toBe('OPEN');
      expect(cb.isOpen()).toBe(true);
    });

    it('should block requests when OPEN', async () => {
      const cb = new CircuitBreaker('test-block', { failureThreshold: 2 });

      // 2回失敗させてOPENに
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      // OPENなのでブロックされる
      await expect(
        cb.execute(async () => 'success')
      ).rejects.toThrow(CircuitBreakerError);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      vi.useRealTimers();

      const cb = new CircuitBreaker('test-half-open', {
        failureThreshold: 2,
        timeout: 100,
      });

      // 2回失敗させてOPENに
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      expect(cb.getState()).toBe('OPEN');

      // タイムアウト待機
      await sleep(150);

      // HALF_OPENに遷移
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('should close after success threshold in HALF_OPEN', async () => {
      vi.useRealTimers();

      const cb = new CircuitBreaker('test-close-after-success', {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 50,
      });

      // 2回失敗させてOPENに
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      // タイムアウト待機でHALF_OPENに
      await sleep(100);
      expect(cb.getState()).toBe('HALF_OPEN');

      // 2回成功させてCLOSEDに
      for (let i = 0; i < 2; i++) {
        await cb.execute(async () => 'success');
      }

      expect(cb.getState()).toBe('CLOSED');
    });

    it('should reopen on failure in HALF_OPEN', async () => {
      vi.useRealTimers();

      const cb = new CircuitBreaker('test-reopen', {
        failureThreshold: 2,
        timeout: 50,
      });

      // OPENに
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      // HALF_OPENに
      await sleep(100);
      expect(cb.getState()).toBe('HALF_OPEN');

      // 失敗してOPENに戻る
      try {
        await cb.execute(async () => {
          throw new Error('Another error');
        });
      } catch {
        // 期待通り
      }

      expect(cb.getState()).toBe('OPEN');
    });

    it('should reset manually', async () => {
      const cb = new CircuitBreaker('test-reset', { failureThreshold: 2 });

      // OPENに
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Test error');
          });
        } catch {
          // 期待通り
        }
      }

      expect(cb.getState()).toBe('OPEN');

      // リセット
      cb.reset();

      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isOpen()).toBe(false);
    });

    it('should return stats', async () => {
      const cb = new CircuitBreaker('test-stats', { failureThreshold: 3 });

      // 1回失敗
      try {
        await cb.execute(async () => {
          throw new Error('Test error');
        });
      } catch {
        // 期待通り
      }

      const stats = cb.getStats();
      expect(stats.name).toBe('test-stats');
      expect(stats.state).toBe('CLOSED');
      expect(stats.failureCount).toBe(1);
    });
  });

  describe('getCircuitBreaker', () => {
    it('should create new circuit breaker', () => {
      const cb = getCircuitBreaker('new-cb');
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should return same instance for same name', () => {
      const cb1 = getCircuitBreaker('same-cb');
      const cb2 = getCircuitBreaker('same-cb');
      expect(cb1).toBe(cb2);
    });
  });

  describe('withRetryAndCircuitBreaker', () => {
    it('should combine retry and circuit breaker', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new ApiError('Server error', 500))
        .mockResolvedValue('success');

      const result = await withRetryAndCircuitBreaker(
        fn,
        'combined-test',
        { maxRetries: 3, initialDelay: 10, jitter: false },
        { failureThreshold: 5 }
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreakerError', () => {
    it('should create circuit breaker error', () => {
      const error = new CircuitBreakerError('Circuit is open');
      expect(error.name).toBe('CircuitBreakerError');
      expect(error.message).toBe('Circuit is open');
    });
  });

  describe('apiRequest', () => {
    it('should make API request and return JSON', async () => {
      vi.useRealTimers();

      const mockData = { id: 1, name: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiRequest<typeof mockData>('https://api.example.com/test');

      expect(result).toEqual(mockData);
    });

    it('should return undefined for 204 response', async () => {
      vi.useRealTimers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await apiRequest('https://api.example.com/test');

      expect(result).toBeUndefined();
    });

    it('should throw error on non-ok response', async () => {
      vi.useRealTimers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: () => null },
        json: async () => ({ message: 'Bad request' }),
        text: async () => 'Bad request',
      });

      await expect(
        apiRequest('https://api.example.com/test', {}, undefined, { maxRetries: 0 })
      ).rejects.toThrow();
    });

    it('should use rate limiter when provided', async () => {
      vi.useRealTimers();

      const limiter = new RateLimiter(10, 1000);
      const acquireSpy = vi.spyOn(limiter, 'acquire');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await apiRequest('https://api.example.com/test', {}, limiter);

      expect(acquireSpy).toHaveBeenCalled();
    });
  });

  describe('apiRequestWithCircuitBreaker', () => {
    it('should make API request with circuit breaker', async () => {
      vi.useRealTimers();

      const mockData = { id: 1, name: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiRequestWithCircuitBreaker<typeof mockData>(
        'https://api.example.com/test',
        {},
        'test-api-cb'
      );

      expect(result).toEqual(mockData);
    });

    it('should return undefined for 204 response', async () => {
      vi.useRealTimers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await apiRequestWithCircuitBreaker(
        'https://api.example.com/test',
        {},
        'test-api-cb-204'
      );

      expect(result).toBeUndefined();
    });

    it('should use rate limiter when provided', async () => {
      vi.useRealTimers();

      const limiter = new RateLimiter(10, 1000);
      const acquireSpy = vi.spyOn(limiter, 'acquire');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await apiRequestWithCircuitBreaker(
        'https://api.example.com/test',
        {},
        'test-api-cb-limiter',
        limiter
      );

      expect(acquireSpy).toHaveBeenCalled();
    });

    it('should throw on non-ok response', async () => {
      vi.useRealTimers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: { get: () => null },
        json: async () => ({ message: 'Server error' }),
        text: async () => 'Server error',
      });

      await expect(
        apiRequestWithCircuitBreaker(
          'https://api.example.com/test',
          {},
          'test-api-cb-error',
          undefined,
          { maxRetries: 0 },
          { failureThreshold: 5 }
        )
      ).rejects.toThrow();
    });
  });
});

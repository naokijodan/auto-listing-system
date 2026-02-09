import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Graceful Shutdown', () => {
  const originalProcessOn = process.on;
  const originalProcessExit = process.exit;
  let processOnMock: ReturnType<typeof vi.fn>;
  let processExitMock: ReturnType<typeof vi.fn>;
  let registeredHandlers: Map<string, (...args: any[]) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    registeredHandlers = new Map();

    processOnMock = vi.fn((event: string, handler: (...args: any[]) => void) => {
      registeredHandlers.set(event, handler);
      return process;
    });

    processExitMock = vi.fn();

    process.on = processOnMock as any;
    process.exit = processExitMock as any;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    process.exit = originalProcessExit;
  });

  describe('setupGracefulShutdown', () => {
    it('should register SIGTERM handler', async () => {
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      expect(registeredHandlers.has('SIGTERM')).toBe(true);
    });

    it('should register SIGINT handler', async () => {
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      expect(registeredHandlers.has('SIGINT')).toBe(true);
    });

    it('should register unhandledRejection handler', async () => {
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      expect(registeredHandlers.has('unhandledRejection')).toBe(true);
    });

    it('should register uncaughtException handler', async () => {
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      expect(registeredHandlers.has('uncaughtException')).toBe(true);
    });
  });

  describe('isShuttingDownNow', () => {
    it('should return false initially', async () => {
      const { isShuttingDownNow } = await import('../../lib/graceful-shutdown');

      expect(isShuttingDownNow()).toBe(false);
    });
  });

  describe('handleShutdown (via SIGTERM)', () => {
    it('should call shutdown handler on SIGTERM', async () => {
      vi.useFakeTimers();
      const { setupGracefulShutdown, isShuttingDownNow } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      const sigtermHandler = registeredHandlers.get('SIGTERM');
      expect(sigtermHandler).toBeDefined();

      // Trigger SIGTERM
      await sigtermHandler?.();

      // Handler should have been called
      expect(handler).toHaveBeenCalled();
      expect(isShuttingDownNow()).toBe(true);

      vi.useRealTimers();
    });

    it('should exit with code 0 on successful shutdown', async () => {
      vi.useFakeTimers();
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      const sigtermHandler = registeredHandlers.get('SIGTERM');
      await sigtermHandler?.();

      expect(processExitMock).toHaveBeenCalledWith(0);

      vi.useRealTimers();
    });

    it('should exit with code 1 on handler error', async () => {
      vi.useFakeTimers();
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockRejectedValue(new Error('Shutdown error'));

      setupGracefulShutdown(handler);

      const sigtermHandler = registeredHandlers.get('SIGTERM');
      await sigtermHandler?.();

      expect(processExitMock).toHaveBeenCalledWith(1);

      vi.useRealTimers();
    });

    it('should ignore duplicate shutdown signals', async () => {
      vi.useFakeTimers();
      const { setupGracefulShutdown } = await import('../../lib/graceful-shutdown');
      const handler = vi.fn().mockResolvedValue(undefined);

      setupGracefulShutdown(handler);

      const sigtermHandler = registeredHandlers.get('SIGTERM');
      const sigintHandler = registeredHandlers.get('SIGINT');

      // Trigger first shutdown
      await sigtermHandler?.();

      // Try to trigger second shutdown
      await sigintHandler?.();

      // Handler should only be called once
      expect(handler).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});

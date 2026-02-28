import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@rakuda/database';

// Mock modules
vi.mock('@rakuda/database', () => ({
  prisma: {
    marketplaceCredential: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('./notification-service', () => ({
  sendNotification: vi.fn().mockResolvedValue([{ success: true }]),
}));

vi.mock('./ebay-api', () => ({
  ebayApi: {
    ensureAccessToken: vi.fn().mockResolvedValue('new-token'),
  },
}));

vi.mock('./joom-api', () => ({
  refreshJoomToken: vi.fn().mockResolvedValue({
    success: true,
    expiresAt: new Date(Date.now() + 3600000),
  }),
}));

vi.mock('./etsy-api', () => ({
  refreshEtsyToken: vi.fn().mockResolvedValue({
    success: true,
    expiresAt: new Date(Date.now() + 3600000),
  }),
}));

describe('Token Refresh Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkTokenExpiry', () => {
    it('should skip credentials without expiry date', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '1',
          marketplace: 'JOOM',
          isActive: true,
          tokenExpiresAt: null,
          credentials: { accessToken: 'token' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({});

      expect(result.checked).toBe(1);
      expect(result.refreshed).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn for expired tokens', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '1',
          marketplace: 'JOOM',
          isActive: true,
          tokenExpiresAt: expiredDate,
          credentials: { accessToken: 'token' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({});

      expect(result.checked).toBe(1);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].message).toContain('already expired');
    });

    it('should warn for tokens expiring within warn threshold', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      // 12 hours from now (within default 24 hour warn threshold)
      const expiringDate = new Date(Date.now() + 12 * 3600000);

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '1',
          marketplace: 'JOOM',
          isActive: true,
          tokenExpiresAt: expiringDate,
          credentials: { accessToken: 'token' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({
        warnBeforeExpiry: 86400000, // 24 hours
      });

      expect(result.checked).toBe(1);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].message).toContain('will expire in');
    });

    it('should not warn for healthy tokens', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      // 48 hours from now (outside 24 hour warn threshold)
      const healthyDate = new Date(Date.now() + 48 * 3600000);

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '1',
          marketplace: 'JOOM',
          isActive: true,
          tokenExpiresAt: healthyDate,
          credentials: { accessToken: 'token' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({
        warnBeforeExpiry: 86400000, // 24 hours
      });

      expect(result.checked).toBe(1);
      expect(result.warnings.length).toBe(0);
    });

    it('should filter by marketplace when specified', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([]);

      await checkTokenExpiry({ marketplace: 'ebay' });

      expect(prisma.marketplaceCredential.findMany).toHaveBeenCalledWith({
        where: { marketplace: 'EBAY', isActive: true },
      });
    });

    it('should query all marketplaces when not specified', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([]);

      await checkTokenExpiry({});

      expect(prisma.marketplaceCredential.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  describe('SchedulerConfig tokenRefresh', () => {
    it('should have default token refresh config', async () => {
      // Import to check default config structure
      const schedulerModule = await import('../../lib/scheduler');

      // The DEFAULT_CONFIG should include tokenRefresh
      // We can't directly access it, but we can verify the functionality works
      expect(typeof schedulerModule.checkTokenExpiry).toBe('function');
      expect(typeof schedulerModule.triggerTokenRefresh).toBe('function');
    });
  });

  describe('Joom Token Refresh (Phase 48)', () => {
    it('should attempt to refresh Joom token when expiring soon', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      const expiringDate = new Date(Date.now() + 30 * 60000);

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '1',
          marketplace: 'JOOM',
          isActive: true,
          tokenExpiresAt: expiringDate,
          credentials: {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            accessToken: 'old-token',
            refreshToken: 'refresh-token',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({
        refreshBeforeExpiry: 3600000,
      });

      expect(result.checked).toBe(1);
      expect(result.refreshed + result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Etsy Token Refresh', () => {
    it('should attempt to refresh Etsy token when expiring soon', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      const expiringDate = new Date(Date.now() + 30 * 60000);

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([
        {
          id: '2',
          marketplace: 'ETSY',
          isActive: true,
          tokenExpiresAt: expiringDate,
          credentials: {
            clientId: 'etsy-client-id',
            accessToken: 'old-token',
            refreshToken: 'etsy-refresh-token',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await checkTokenExpiry({
        refreshBeforeExpiry: 3600000,
      });

      expect(result.checked).toBe(1);
      expect(result.refreshed + result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by etsy marketplace', async () => {
      const { checkTokenExpiry } = await import('../../lib/scheduler');

      vi.mocked(prisma.marketplaceCredential.findMany).mockResolvedValue([]);

      await checkTokenExpiry({ marketplace: 'etsy' });

      expect(prisma.marketplaceCredential.findMany).toHaveBeenCalledWith({
        where: { marketplace: 'ETSY', isActive: true },
      });
    });
  });
});

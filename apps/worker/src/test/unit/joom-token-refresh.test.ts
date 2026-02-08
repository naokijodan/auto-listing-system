import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch with proper Response object
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse(data: any, ok: boolean = true, status: number = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    clone: function() { return this; },
  };
}

// Mock Prisma
vi.mock('@rakuda/database', () => ({
  prisma: {
    marketplaceCredential: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { prisma } from '@rakuda/database';

describe('refreshJoomToken (Phase 48)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when credentials not configured', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue(null);

    const result = await refreshJoomToken();

    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('should return error when refresh token is missing', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'old-token',
        // no refreshToken
      },
    } as any);

    const result = await refreshJoomToken();

    expect(result.success).toBe(false);
    expect(result.error).toContain('refresh token not available');
  });

  it('should return error when clientId or clientSecret is missing', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        // no clientId or clientSecret
      },
    } as any);

    const result = await refreshJoomToken();

    expect(result.success).toBe(false);
    expect(result.error).toContain('configuration incomplete');
  });

  it('should refresh token successfully', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
      },
    } as any);

    vi.mocked(prisma.marketplaceCredential.update).mockResolvedValue({} as any);

    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      },
    }));

    const result = await refreshJoomToken();

    expect(result.success).toBe(true);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(prisma.marketplaceCredential.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({
        credentials: expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      }),
    });
  });

  it('should handle API error response', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'old-token',
        refreshToken: 'expired-refresh-token',
      },
    } as any);

    mockFetch.mockResolvedValue(createMockResponse({
      code: 401,
      message: 'Invalid refresh token',
    }, false, 401));

    const result = await refreshJoomToken();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid refresh token');
  });

  it('should handle network errors', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
      },
    } as any);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await refreshJoomToken();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should preserve existing refresh token if new one not provided', async () => {
    const { refreshJoomToken } = await import('../../lib/joom-api');

    vi.mocked(prisma.marketplaceCredential.findFirst).mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        accessToken: 'old-token',
        refreshToken: 'original-refresh-token',
      },
    } as any);

    vi.mocked(prisma.marketplaceCredential.update).mockResolvedValue({} as any);

    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        access_token: 'new-access-token',
        // no refresh_token in response
        expires_in: 3600,
      },
    }));

    const result = await refreshJoomToken();

    expect(result.success).toBe(true);
    expect(prisma.marketplaceCredential.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({
        credentials: expect.objectContaining({
          refreshToken: 'original-refresh-token', // preserved
        }),
      }),
    });
  });
});

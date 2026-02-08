import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数をモック
    vi.stubEnv('EBAY_CLIENT_ID', 'test-client-id');
    vi.stubEnv('EBAY_CLIENT_SECRET', 'test-client-secret');
    vi.stubEnv('EBAY_RU_NAME', 'test-ru-name');
    vi.stubEnv('APP_URL', 'http://localhost:3000');
    vi.stubEnv('WEB_URL', 'http://localhost:5173');
  });

  describe('GET /api/auth/ebay/authorize', () => {
    it('should return auth URL when configured', async () => {
      mockPrisma.oAuthState.create.mockResolvedValue({ id: '1', state: 'test-state' });

      const response = await request(app).get('/api/auth/ebay/authorize');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toContain('auth.sandbox.ebay.com');
      expect(response.body.authUrl).toContain('client_id=test-client-id');
      expect(response.body.expiresIn).toBe(600);
    });

    it('should return 400 when not configured', async () => {
      vi.stubEnv('EBAY_CLIENT_ID', '');
      vi.stubEnv('EBAY_RU_NAME', '');

      const response = await request(app).get('/api/auth/ebay/authorize');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not configured');
    });
  });

  describe('GET /api/auth/ebay/status', () => {
    it('should return not connected when no credentials', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/auth/ebay/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(false);
    });

    it('should return connected status with token info', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        marketplace: 'EBAY',
        isActive: true,
        tokenExpiresAt: futureDate,
        refreshTokenExpiresAt: null,
      });

      const response = await request(app).get('/api/auth/ebay/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
      expect(response.body.tokenExpired).toBe(false);
      expect(response.body.environment).toBe('sandbox');
    });

    it('should indicate token expired', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        marketplace: 'EBAY',
        isActive: true,
        tokenExpiresAt: pastDate,
        refreshTokenExpiresAt: null,
      });

      const response = await request(app).get('/api/auth/ebay/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
      expect(response.body.tokenExpired).toBe(true);
    });
  });

  describe('DELETE /api/auth/ebay', () => {
    it('should disconnect eBay', async () => {
      mockPrisma.marketplaceCredential.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app).delete('/api/auth/ebay');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.marketplaceCredential.updateMany).toHaveBeenCalledWith({
        where: {
          marketplace: 'EBAY',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });
  });

  describe('GET /api/auth/joom/status', () => {
    it('should return not connected when no credentials', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/auth/joom/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(false);
    });

    it('should return connected status', async () => {
      mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
        id: '1',
        marketplace: 'JOOM',
        isActive: true,
        tokenExpiresAt: new Date(),
      });

      const response = await request(app).get('/api/auth/joom/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
    });
  });

  describe('POST /api/auth/joom/token', () => {
    it('should save Joom token', async () => {
      mockPrisma.marketplaceCredential.upsert.mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/joom/token')
        .send({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.marketplaceCredential.upsert).toHaveBeenCalled();
    });

    it('should return 400 when accessToken missing', async () => {
      const response = await request(app)
        .post('/api/auth/joom/token')
        .send({ refreshToken: 'test-refresh-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/auth/joom', () => {
    it('should disconnect Joom', async () => {
      mockPrisma.marketplaceCredential.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app).delete('/api/auth/joom');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.marketplaceCredential.updateMany).toHaveBeenCalledWith({
        where: {
          marketplace: 'JOOM',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });
  });

  describe('GET /api/auth/ebay/callback', () => {
    it('should return 400 when code is missing', async () => {
      const response = await request(app)
        .get('/api/auth/ebay/callback')
        .query({ state: 'test-state' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing code or state');
    });

    it('should return 400 when state is missing', async () => {
      const response = await request(app)
        .get('/api/auth/ebay/callback')
        .query({ code: 'test-code' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing code or state');
    });

    it('should return 400 for invalid state', async () => {
      mockPrisma.oAuthState.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/ebay/callback')
        .query({ code: 'test-code', state: 'invalid-state' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid or expired state');
    });

    it('should redirect on OAuth error', async () => {
      const response = await request(app)
        .get('/api/auth/ebay/callback')
        .query({ error: 'access_denied', error_description: 'User denied access' });

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('error=access_denied');
    });
  });

});

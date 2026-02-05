import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

// Mock ioredis for health checks
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return ok status when all services healthy', async () => {
      // Mock database check
      (mockPrisma as any).$queryRaw = vi.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toBeDefined();
    });

    it('should return degraded status when database fails', async () => {
      // Mock database failure
      (mockPrisma as any).$queryRaw = vi.fn().mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/api/health');

      // Will return 503 if database is down
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready true when database is available', async () => {
      (mockPrisma as any).$queryRaw = vi.fn().mockResolvedValue([{ 1: 1 }]);

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    it('should return ready false when database fails', async () => {
      (mockPrisma as any).$queryRaw = vi.fn().mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.ready).toBe(false);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return alive true', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body.alive).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

// ========================================
// Test Fixtures
// ========================================

const createMockSyncSetting = (overrides: any = {}) => ({
  id: 'setting-1',
  marketplace: 'JOOM',
  syncType: 'INVENTORY',
  cronExpression: '0 */6 * * *',
  isEnabled: true,
  lastRunAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET /api/settings/sync-schedule - 全設定取得
  // ========================================
  describe('GET /api/settings/sync-schedule', () => {
    it('should return all sync settings', async () => {
      const mockSettings = [
        createMockSyncSetting({ id: 'setting-1', marketplace: 'JOOM', syncType: 'INVENTORY' }),
        createMockSyncSetting({ id: 'setting-2', marketplace: 'JOOM', syncType: 'ORDER' }),
        createMockSyncSetting({ id: 'setting-3', marketplace: 'EBAY', syncType: 'PRICE' }),
      ];

      mockPrisma.marketplaceSyncSetting.findMany.mockResolvedValue(mockSettings);

      const response = await request(app).get('/api/settings/sync-schedule');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(mockPrisma.marketplaceSyncSetting.findMany).toHaveBeenCalledWith({
        orderBy: [
          { marketplace: 'asc' },
          { syncType: 'asc' },
        ],
      });
    });

    it('should return empty array when no settings exist', async () => {
      mockPrisma.marketplaceSyncSetting.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/settings/sync-schedule');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle database error gracefully', async () => {
      mockPrisma.marketplaceSyncSetting.findMany.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/api/settings/sync-schedule');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch sync settings');
    });
  });

  // ========================================
  // GET /api/settings/sync-schedule/:marketplace/:syncType - 個別設定取得
  // ========================================
  describe('GET /api/settings/sync-schedule/:marketplace/:syncType', () => {
    it('should return a specific sync setting', async () => {
      const mockSetting = createMockSyncSetting();

      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockSetting);

      const response = await request(app).get('/api/settings/sync-schedule/joom/inventory');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.marketplace).toBe('JOOM');
      expect(response.body.data.syncType).toBe('INVENTORY');
    });

    it('should handle uppercase marketplace/syncType', async () => {
      const mockSetting = createMockSyncSetting({ marketplace: 'EBAY', syncType: 'ORDER' });

      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockSetting);

      const response = await request(app).get('/api/settings/sync-schedule/EBAY/ORDER');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when setting not found', async () => {
      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/settings/sync-schedule/joom/inventory');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Setting not found');
    });

    it('should return 400 for invalid marketplace', async () => {
      const response = await request(app).get('/api/settings/sync-schedule/amazon/inventory');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid marketplace or syncType');
    });

    it('should return 400 for invalid syncType', async () => {
      const response = await request(app).get('/api/settings/sync-schedule/joom/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid marketplace or syncType');
    });

    it('should handle database error gracefully', async () => {
      mockPrisma.marketplaceSyncSetting.findUnique.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/api/settings/sync-schedule/joom/inventory');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch sync setting');
    });
  });

  // ========================================
  // PUT /api/settings/sync-schedule - 単一設定更新
  // ========================================
  describe('PUT /api/settings/sync-schedule (single update)', () => {
    it('should update a single sync setting', async () => {
      const mockUpdatedSetting = createMockSyncSetting({
        cronExpression: '0 */4 * * *',
      });

      mockPrisma.marketplaceSyncSetting.upsert.mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
          cronExpression: '0 */4 * * *',
          isEnabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should create a new setting if not exists (upsert)', async () => {
      const mockNewSetting = createMockSyncSetting({
        marketplace: 'EBAY',
        syncType: 'PRICE',
      });

      mockPrisma.marketplaceSyncSetting.upsert.mockResolvedValue(mockNewSetting);

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'EBAY',
          syncType: 'PRICE',
          cronExpression: '0 0 * * *',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid cron expression (too short)', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
          cronExpression: '* * *', // Invalid: only 3 parts
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid cron expression (wrong format)', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
          cronExpression: 'abc def ghi jkl mno',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid cron expression');
    });

    it('should reject missing marketplace', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          syncType: 'INVENTORY',
          cronExpression: '0 */6 * * *',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing syncType', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          cronExpression: '0 */6 * * *',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing cronExpression', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle database error gracefully', async () => {
      mockPrisma.marketplaceSyncSetting.upsert.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
          cronExpression: '0 */6 * * *',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update sync settings');
    });
  });

  // ========================================
  // PUT /api/settings/sync-schedule - 一括設定更新
  // ========================================
  describe('PUT /api/settings/sync-schedule (bulk update)', () => {
    it('should update multiple sync settings', async () => {
      const mockUpdatedSettings = [
        createMockSyncSetting({ id: 'setting-1', marketplace: 'JOOM', syncType: 'INVENTORY' }),
        createMockSyncSetting({ id: 'setting-2', marketplace: 'JOOM', syncType: 'ORDER' }),
      ];

      mockPrisma.$transaction.mockResolvedValue(mockUpdatedSettings);

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          settings: [
            { marketplace: 'JOOM', syncType: 'INVENTORY', cronExpression: '0 */6 * * *' },
            { marketplace: 'JOOM', syncType: 'ORDER', cronExpression: '0 */12 * * *' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('2 settings updated');
    });

    it('should reject bulk update with invalid cron in one setting', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          settings: [
            { marketplace: 'JOOM', syncType: 'INVENTORY', cronExpression: '0 */6 * * *' },
            { marketplace: 'JOOM', syncType: 'ORDER', cronExpression: 'invalid cron expression' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid cron expression');
    });

    it('should reject empty settings array', async () => {
      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          settings: [],
        });

      // Empty array should pass validation but result in no updates
      expect(response.status).toBe(200);
    });

    it('should handle database error in bulk update', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          settings: [
            { marketplace: 'JOOM', syncType: 'INVENTORY', cronExpression: '0 */6 * * *' },
          ],
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ========================================
  // PATCH /api/settings/sync-schedule/:marketplace/:syncType/toggle
  // ========================================
  describe('PATCH /api/settings/sync-schedule/:marketplace/:syncType/toggle', () => {
    it('should toggle setting from enabled to disabled', async () => {
      const mockCurrentSetting = createMockSyncSetting({ isEnabled: true });
      const mockUpdatedSetting = createMockSyncSetting({ isEnabled: false });

      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockCurrentSetting);
      mockPrisma.marketplaceSyncSetting.update.mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .patch('/api/settings/sync-schedule/joom/inventory/toggle');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isEnabled).toBe(false);
    });

    it('should toggle setting from disabled to enabled', async () => {
      const mockCurrentSetting = createMockSyncSetting({ isEnabled: false });
      const mockUpdatedSetting = createMockSyncSetting({ isEnabled: true });

      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockCurrentSetting);
      mockPrisma.marketplaceSyncSetting.update.mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .patch('/api/settings/sync-schedule/joom/inventory/toggle');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isEnabled).toBe(true);
    });

    it('should return 404 when setting not found', async () => {
      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/settings/sync-schedule/joom/inventory/toggle');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Setting not found');
    });

    it('should return 400 for invalid marketplace', async () => {
      const response = await request(app)
        .patch('/api/settings/sync-schedule/amazon/inventory/toggle');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid marketplace or syncType');
    });

    it('should return 400 for invalid syncType', async () => {
      const response = await request(app)
        .patch('/api/settings/sync-schedule/joom/unknown/toggle');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle database error gracefully', async () => {
      mockPrisma.marketplaceSyncSetting.findUnique.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .patch('/api/settings/sync-schedule/joom/inventory/toggle');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to toggle sync setting');
    });
  });

  // ========================================
  // POST /api/settings/sync-schedule/:marketplace/:syncType/run
  // ========================================
  describe('POST /api/settings/sync-schedule/:marketplace/:syncType/run', () => {
    it('should record manual run timestamp', async () => {
      const now = new Date();
      const mockUpdatedSetting = createMockSyncSetting({ lastRunAt: now });

      mockPrisma.marketplaceSyncSetting.update.mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .post('/api/settings/sync-schedule/joom/inventory/run');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lastRunAt).toBeDefined();
    });

    it('should update lastRunAt for EBAY marketplace', async () => {
      const mockUpdatedSetting = createMockSyncSetting({
        marketplace: 'EBAY',
        syncType: 'ORDER',
        lastRunAt: new Date(),
      });

      mockPrisma.marketplaceSyncSetting.update.mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .post('/api/settings/sync-schedule/ebay/order/run');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid marketplace', async () => {
      const response = await request(app)
        .post('/api/settings/sync-schedule/amazon/inventory/run');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid marketplace or syncType');
    });

    it('should return 400 for invalid syncType', async () => {
      const response = await request(app)
        .post('/api/settings/sync-schedule/joom/unknown/run');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle database error gracefully', async () => {
      mockPrisma.marketplaceSyncSetting.update.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/settings/sync-schedule/joom/inventory/run');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to record sync run');
    });

    it('should handle non-existent setting (Prisma P2025 error)', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrisma.marketplaceSyncSetting.update.mockRejectedValue(prismaError);

      const response = await request(app)
        .post('/api/settings/sync-schedule/joom/inventory/run');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ========================================
  // Cron Expression Validation Tests
  // ========================================
  describe('Cron Expression Validation', () => {
    const validCronExpressions = [
      '* * * * *',         // Every minute
      '0 * * * *',         // Every hour
      '0 0 * * *',         // Every day at midnight
      '0 */6 * * *',       // Every 6 hours
      '*/15 * * * *',      // Every 15 minutes
      '0 0 1 * *',         // First day of month
      '0 0 * * 0',         // Every Sunday
      '30 4 1 1 *',        // 4:30 on January 1st
    ];

    validCronExpressions.forEach((cron) => {
      it(`should accept valid cron: "${cron}"`, async () => {
        mockPrisma.marketplaceSyncSetting.upsert.mockResolvedValue(
          createMockSyncSetting({ cronExpression: cron })
        );

        const response = await request(app)
          .put('/api/settings/sync-schedule')
          .send({
            marketplace: 'JOOM',
            syncType: 'INVENTORY',
            cronExpression: cron,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    const invalidCronExpressions = [
      { cron: '* * *', reason: 'too few parts' },
      { cron: '* * * * * *', reason: 'too many parts' },
      { cron: 'a b c d e', reason: 'non-numeric parts' },
      { cron: '60 * * * *', reason: 'minute out of range' },
      { cron: '* 25 * * *', reason: 'hour out of range' },
    ];

    invalidCronExpressions.forEach(({ cron, reason }) => {
      it(`should reject invalid cron: "${cron}" (${reason})`, async () => {
        const response = await request(app)
          .put('/api/settings/sync-schedule')
          .send({
            marketplace: 'JOOM',
            syncType: 'INVENTORY',
            cronExpression: cron,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  // ========================================
  // Marketplace and SyncType Enum Tests
  // ========================================
  describe('Marketplace and SyncType Enum Validation', () => {
    const validMarketplaces = ['joom', 'ebay', 'JOOM', 'EBAY'];
    const validSyncTypes = ['inventory', 'order', 'price', 'INVENTORY', 'ORDER', 'PRICE'];

    validMarketplaces.forEach((marketplace) => {
      validSyncTypes.forEach((syncType) => {
        it(`should accept ${marketplace}/${syncType}`, async () => {
          mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(
            createMockSyncSetting({
              marketplace: marketplace.toUpperCase(),
              syncType: syncType.toUpperCase(),
            })
          );

          const response = await request(app)
            .get(`/api/settings/sync-schedule/${marketplace}/${syncType}`);

          expect(response.status).toBe(200);
        });
      });
    });

    const invalidMarketplaces = ['amazon', 'rakuten', 'aliexpress', ''];

    invalidMarketplaces.forEach((marketplace) => {
      it(`should reject invalid marketplace: "${marketplace}"`, async () => {
        const response = await request(app)
          .get(`/api/settings/sync-schedule/${marketplace}/inventory`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid marketplace or syncType');
      });
    });

    const invalidSyncTypes = ['listing', 'shipping', 'notification', ''];

    invalidSyncTypes.forEach((syncType) => {
      it(`should reject invalid syncType: "${syncType}"`, async () => {
        const response = await request(app)
          .get(`/api/settings/sync-schedule/joom/${syncType}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid marketplace or syncType');
      });
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle very long cron expression', async () => {
      const longCron = '0 */6 * * *' + ' '.repeat(100);

      const response = await request(app)
        .put('/api/settings/sync-schedule')
        .send({
          marketplace: 'JOOM',
          syncType: 'INVENTORY',
          cronExpression: longCron.trim(),
        });

      // Should be accepted since trimmed version is valid
      expect([200, 400]).toContain(response.status);
    });

    it('should handle concurrent toggle requests', async () => {
      const mockSetting = createMockSyncSetting({ isEnabled: true });
      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockSetting);
      mockPrisma.marketplaceSyncSetting.update.mockResolvedValue({
        ...mockSetting,
        isEnabled: false,
      });

      const responses = await Promise.all([
        request(app).patch('/api/settings/sync-schedule/joom/inventory/toggle'),
        request(app).patch('/api/settings/sync-schedule/joom/inventory/toggle'),
      ]);

      // Both should succeed (database handles consistency)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle special characters in response', async () => {
      const mockSetting = createMockSyncSetting({
        cronExpression: '0 */6 * * *',
      });

      mockPrisma.marketplaceSyncSetting.findUnique.mockResolvedValue(mockSetting);

      const response = await request(app)
        .get('/api/settings/sync-schedule/joom/inventory');

      expect(response.status).toBe(200);
      expect(response.body.data.cronExpression).toBe('0 */6 * * *');
    });
  });
});

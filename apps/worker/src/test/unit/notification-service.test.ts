import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockPrisma, mockFetch, mockNodemailer } = vi.hoisted(() => {
  return {
    mockPrisma: {
      notificationChannel: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    },
    mockFetch: vi.fn(),
    mockNodemailer: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      }),
    },
  };
});

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

vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('nodemailer', () => ({
  createTransport: mockNodemailer.createTransport,
}));

// Mock global fetch
const originalFetch = globalThis.fetch;

import {
  sendNotification,
  notifyOrderReceived,
  notifyOrderPaid,
  notifyOrderShipped,
  notifyOrderCancelled,
  notifyOutOfStock,
  notifyPriceChange,
  notifyListingPublished,
  notifyListingError,
  notifyJobFailed,
  notifyDailyReport,
  notifyExchangeRateUpdate,
} from '../../lib/notification-service';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });
    mockPrisma.notificationChannel.findMany.mockResolvedValue([]);
    mockPrisma.notificationChannel.update.mockResolvedValue({});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('sendNotification', () => {
    it('should send to Slack channel', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
        },
      ]);

      const results = await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'SUCCESS',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(results[0].success).toBe(true);
    });

    it('should send to Discord channel', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-2',
          channel: 'DISCORD',
          webhookUrl: 'https://discord.com/api/webhooks/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
        },
      ]);

      const results = await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'INFO',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.any(Object)
      );
      expect(results[0].success).toBe(true);
    });

    it('should send to LINE channel', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-3',
          channel: 'LINE',
          token: 'test-line-token',
          isActive: true,
          enabledTypes: ['ERROR'],
          minSeverity: 'INFO',
        },
      ]);

      const results = await sendNotification({
        eventType: 'ERROR',
        title: 'Error',
        message: 'Error message',
        severity: 'ERROR',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-line-token',
          }),
        })
      );
      expect(results[0].success).toBe(true);
    });

    it('should send to Email channel', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-4',
          channel: 'EMAIL',
          email: 'test@example.com',
          isActive: true,
          enabledTypes: ['DAILY_REPORT'],
          minSeverity: 'INFO',
        },
      ]);

      const results = await sendNotification({
        eventType: 'DAILY_REPORT',
        title: 'Report',
        message: 'Daily report',
        severity: 'INFO',
      });

      expect(mockNodemailer.createTransport).toHaveBeenCalled();
      expect(results[0].success).toBe(true);
    });

    it('should filter by severity', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'WARNING', // Only WARNING and above
        },
      ]);

      const results = await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'INFO', // Below WARNING
      });

      // Should not send because severity is below minSeverity
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should always send ERROR severity', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['JOB_FAILED'],
          minSeverity: 'WARNING',
        },
      ]);

      const results = await sendNotification({
        eventType: 'JOB_FAILED',
        title: 'Error',
        message: 'Job failed',
        severity: 'ERROR',
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results[0].success).toBe(true);
    });

    it('should filter by marketplace', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
          marketplaceFilter: ['JOOM'], // Only JOOM
        },
      ]);

      const results = await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'SUCCESS',
        marketplace: 'EBAY', // Not in filter
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle channel errors', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
        },
      ]);
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const results = await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'SUCCESS',
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should update channel on success', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
        },
      ]);

      await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'SUCCESS',
      });

      expect(mockPrisma.notificationChannel.update).toHaveBeenCalledWith({
        where: { id: 'ch-1' },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
          errorCount: 0,
        }),
      });
    });

    it('should update channel error count on failure', async () => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED'],
          minSeverity: 'INFO',
        },
      ]);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await sendNotification({
        eventType: 'ORDER_RECEIVED',
        title: 'Test',
        message: 'Test message',
        severity: 'SUCCESS',
      });

      expect(mockPrisma.notificationChannel.update).toHaveBeenCalledWith({
        where: { id: 'ch-1' },
        data: expect.objectContaining({
          lastError: 'Network error',
          errorCount: { increment: 1 },
        }),
      });
    });
  });

  describe('convenience functions', () => {
    beforeEach(() => {
      mockPrisma.notificationChannel.findMany.mockResolvedValue([
        {
          id: 'ch-1',
          channel: 'SLACK',
          webhookUrl: 'https://hooks.slack.com/test',
          isActive: true,
          enabledTypes: ['ORDER_RECEIVED', 'ORDER_PAID', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'OUT_OF_STOCK', 'PRICE_CHANGE', 'LISTING_PUBLISHED', 'LISTING_ERROR', 'JOB_FAILED', 'DAILY_REPORT', 'EXCHANGE_RATE'],
          minSeverity: 'INFO',
        },
      ]);
    });

    it('should send order received notification', async () => {
      await notifyOrderReceived('order-123', 'JOOM', 99.99, 3);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('新規注文');
    });

    it('should send order paid notification', async () => {
      await notifyOrderPaid('order-123', 'EBAY', 150.00);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('支払い完了');
    });

    it('should send order shipped notification', async () => {
      await notifyOrderShipped('order-123', 'JOOM', 'TRACK123', 'DHL');

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('出荷完了');
    });

    it('should send order cancelled notification', async () => {
      await notifyOrderCancelled('order-123', 'EBAY', 'Customer request');

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('キャンセル');
    });

    it('should send out of stock notification', async () => {
      await notifyOutOfStock('Test Product', 'https://example.com', 5);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('在庫切れ');
    });

    it('should send price change notification', async () => {
      await notifyPriceChange('Test Product', 1000, 1200, 20);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('仕入価格');
    });

    it('should send listing published notification', async () => {
      await notifyListingPublished('Test Product', 'JOOM', 'listing-123', 29.99);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('出品完了');
    });

    it('should send listing error notification', async () => {
      await notifyListingError('Test Product', 'EBAY', 'API error');

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('出品エラー');
    });

    it('should send job failed notification', async () => {
      await notifyJobFailed('SCRAPE', 'job-123', 'Timeout', 3);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('ジョブ失敗');
    });

    it('should send daily report notification', async () => {
      await notifyDailyReport({
        newProducts: 10,
        publishedListings: 5,
        soldListings: 3,
        outOfStock: 1,
        errors: 0,
        revenue: 500,
        profit: 15000,
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('日次レポート');
    });

    it('should send exchange rate notification for significant change', async () => {
      await notifyExchangeRateUpdate(150, 153); // 2% change

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('為替レート');
    });

    it('should not send exchange rate notification for small change', async () => {
      await notifyExchangeRateUpdate(150, 150.5); // 0.33% change

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('fallback to environment variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      mockPrisma.notificationChannel.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use SLACK_WEBHOOK_URL from environment', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/env-test';

      await sendNotification({
        eventType: 'TEST',
        title: 'Test',
        message: 'Test message',
        severity: 'INFO',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/env-test',
        expect.any(Object)
      );
    });

    it('should use DISCORD_WEBHOOK_URL from environment', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/env-test';

      await sendNotification({
        eventType: 'TEST',
        title: 'Test',
        message: 'Test message',
        severity: 'INFO',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/env-test',
        expect.any(Object)
      );
    });

    it('should use LINE_NOTIFY_TOKEN from environment', async () => {
      process.env.LINE_NOTIFY_TOKEN = 'env-line-token';

      await sendNotification({
        eventType: 'TEST',
        title: 'Test',
        message: 'Test message',
        severity: 'INFO',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer env-line-token',
          }),
        })
      );
    });
  });
});

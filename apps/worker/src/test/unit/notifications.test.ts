import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockFetch, mockEnv } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
    mockEnv: {
      SLACK_WEBHOOK_URL: '',
      DISCORD_WEBHOOK_URL: '',
      LINE_NOTIFY_TOKEN: '',
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

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

import {
  sendNotification,
  notifyOutOfStock,
  notifyPriceChanged,
  notifyListingPublished,
  notifyListingError,
  notifyJobFailed,
  notifyExchangeRateUpdated,
  notifyDailyReport,
  getNotificationConfig,
} from '../../lib/notifications';

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as any;
    mockFetch.mockResolvedValue({ ok: true });

    // Reset env
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.LINE_NOTIFY_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  describe('getNotificationConfig', () => {
    it('should return false for all when no env vars set', () => {
      const config = getNotificationConfig();

      expect(config.slack).toBe(false);
      expect(config.discord).toBe(false);
      expect(config.line).toBe(false);
    });

    it('should return true for slack when SLACK_WEBHOOK_URL is set', () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const config = getNotificationConfig();

      expect(config.slack).toBe(true);
      expect(config.discord).toBe(false);
      expect(config.line).toBe(false);
    });

    it('should return true for discord when DISCORD_WEBHOOK_URL is set', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';

      const config = getNotificationConfig();

      expect(config.slack).toBe(false);
      expect(config.discord).toBe(true);
      expect(config.line).toBe(false);
    });

    it('should return true for line when LINE_NOTIFY_TOKEN is set', () => {
      process.env.LINE_NOTIFY_TOKEN = 'test-token';

      const config = getNotificationConfig();

      expect(config.slack).toBe(false);
      expect(config.discord).toBe(false);
      expect(config.line).toBe(true);
    });

    it('should return true for all when all env vars set', () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
      process.env.LINE_NOTIFY_TOKEN = 'test-token';

      const config = getNotificationConfig();

      expect(config.slack).toBe(true);
      expect(config.discord).toBe(true);
      expect(config.line).toBe(true);
    });
  });

  describe('sendNotification', () => {
    it('should return false for all when no channels configured', async () => {
      const result = await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test',
        message: 'Test message',
        severity: 'info',
      });

      expect(result.slack).toBe(false);
      expect(result.discord).toBe(false);
      expect(result.line).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send to Slack when configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const result = await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test Title',
        message: 'Test message',
        severity: 'warning',
      });

      expect(result.slack).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send to Discord when configured', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';

      const result = await sendNotification({
        type: 'listing_published',
        title: 'Test Title',
        message: 'Test message',
        severity: 'success',
      });

      expect(result.discord).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send to LINE when configured', async () => {
      process.env.LINE_NOTIFY_TOKEN = 'test-token';

      const result = await sendNotification({
        type: 'job_failed',
        title: 'Test Title',
        message: 'Test message',
        severity: 'error',
      });

      expect(result.line).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });

    it('should send to all channels when all configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
      process.env.LINE_NOTIFY_TOKEN = 'test-token';

      const result = await sendNotification({
        type: 'daily_report',
        title: 'Test',
        message: 'Test message',
        severity: 'info',
      });

      expect(result.slack).toBe(true);
      expect(result.discord).toBe(true);
      expect(result.line).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle Slack API error', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test',
        message: 'Test message',
        severity: 'warning',
      });

      expect(result.slack).toBe(false);
    });

    it('should handle Discord API error', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
      mockFetch.mockResolvedValue({ ok: false, status: 400 });

      const result = await sendNotification({
        type: 'listing_error',
        title: 'Test',
        message: 'Test message',
        severity: 'error',
      });

      expect(result.discord).toBe(false);
    });

    it('should handle LINE API error', async () => {
      process.env.LINE_NOTIFY_TOKEN = 'test-token';
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      const result = await sendNotification({
        type: 'price_changed',
        title: 'Test',
        message: 'Test message',
        severity: 'info',
      });

      expect(result.line).toBe(false);
    });

    it('should handle fetch error', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await sendNotification({
        type: 'job_failed',
        title: 'Test',
        message: 'Test message',
        severity: 'error',
      });

      expect(result.slack).toBe(false);
    });

    it('should include data fields in payload', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test',
        message: 'Test message',
        severity: 'warning',
        data: { key1: 'value1', key2: 123 },
      });

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].fields).toHaveLength(2);
    });

    it('should use correct color for each severity', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      // Test info color
      await sendNotification({
        type: 'daily_report',
        title: 'Test',
        message: 'Test',
        severity: 'info',
      });
      let body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#2196F3');

      mockFetch.mockClear();

      // Test warning color
      await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test',
        message: 'Test',
        severity: 'warning',
      });
      body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#FF9800');

      mockFetch.mockClear();

      // Test error color
      await sendNotification({
        type: 'job_failed',
        title: 'Test',
        message: 'Test',
        severity: 'error',
      });
      body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#F44336');

      mockFetch.mockClear();

      // Test success color
      await sendNotification({
        type: 'listing_published',
        title: 'Test',
        message: 'Test',
        severity: 'success',
      });
      body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#4CAF50');
    });
  });

  describe('notifyOutOfStock', () => {
    it('should send out of stock notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyOutOfStock('Test Product', 'https://example.com/product', 5);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('在庫切れ検知');
      expect(body.attachments[0].color).toBe('#FF9800'); // warning
    });

    it('should truncate long product title', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      const longTitle = 'A'.repeat(100);

      await notifyOutOfStock(longTitle, 'https://example.com', 1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const productField = body.attachments[0].fields.find((f: any) => f.title === '商品名');
      expect(productField.value.length).toBeLessThanOrEqual(50);
    });
  });

  describe('notifyPriceChanged', () => {
    it('should send price increase notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyPriceChanged('Test Product', 1000, 1500, 50);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('仕入価格上昇');
    });

    it('should send price decrease notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyPriceChanged('Test Product', 1500, 1000, -33.33);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('仕入価格下落');
    });

    it('should use warning severity for large price changes', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyPriceChanged('Test Product', 1000, 1500, 50); // >20%

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#FF9800'); // warning
    });

    it('should use info severity for small price changes', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyPriceChanged('Test Product', 1000, 1100, 10); // <20%

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#2196F3'); // info
    });
  });

  describe('notifyListingPublished', () => {
    it('should send listing published notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyListingPublished(
        'Test Product',
        'Joom',
        'https://joom.com/product/123',
        29.99
      );

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('出品完了');
      expect(body.attachments[0].color).toBe('#4CAF50'); // success
    });
  });

  describe('notifyListingError', () => {
    it('should send listing error notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyListingError('Test Product', 'eBay', 'Invalid category');

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('出品エラー');
      expect(body.attachments[0].color).toBe('#F44336'); // error
    });

    it('should truncate long error message', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      const longError = 'E'.repeat(200);

      await notifyListingError('Test Product', 'eBay', longError);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const errorField = body.attachments[0].fields.find((f: any) => f.title === 'エラー');
      expect(errorField.value.length).toBeLessThanOrEqual(100);
    });
  });

  describe('notifyJobFailed', () => {
    it('should send job failed notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyJobFailed('scrape', 'job-123', 'Timeout error', 3);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('ジョブ失敗');
      expect(body.attachments[0].color).toBe('#F44336'); // error
    });
  });

  describe('notifyExchangeRateUpdated', () => {
    it('should send notification for significant rate change', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      // 1 USD = 100 JPY -> 1 USD = 110 JPY (10% yen depreciation)
      await notifyExchangeRateUpdated(0.01, 1 / 110);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('為替レート更新');
      expect(body.attachments[0].title).toContain('円安');
    });

    it('should send notification for yen appreciation', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      // 1 USD = 150 JPY -> 1 USD = 140 JPY (yen appreciation)
      await notifyExchangeRateUpdated(1 / 150, 1 / 140);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('円高');
    });

    it('should not send notification for small rate changes', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      // Less than 1% change
      await notifyExchangeRateUpdated(0.01, 0.01005);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('notifyDailyReport', () => {
    it('should send daily report notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyDailyReport({
        newProducts: 10,
        publishedListings: 5,
        soldListings: 3,
        outOfStock: 2,
        errors: 1,
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toBe('日次レポート');
      expect(body.attachments[0].color).toBe('#2196F3'); // info
    });

    it('should include revenue when provided', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyDailyReport({
        newProducts: 10,
        publishedListings: 5,
        soldListings: 3,
        outOfStock: 2,
        errors: 1,
        revenue: 150.50,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const revenueField = body.attachments[0].fields.find((f: any) => f.title === '売上金額');
      expect(revenueField).toBeDefined();
      expect(revenueField.value).toBe('$150.50');
    });

    it('should not include revenue field when not provided', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await notifyDailyReport({
        newProducts: 10,
        publishedListings: 5,
        soldListings: 3,
        outOfStock: 2,
        errors: 1,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const revenueField = body.attachments[0].fields.find((f: any) => f.title === '売上金額');
      expect(revenueField).toBeUndefined();
    });
  });
});

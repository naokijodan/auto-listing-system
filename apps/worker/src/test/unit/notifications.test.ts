import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const mockFetch = vi.fn();

describe('Notifications', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', mockFetch);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  describe('sendNotification', () => {
    it('should send to all configured channels', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxx';
      process.env.LINE_NOTIFY_TOKEN = 'line-token';

      mockFetch.mockResolvedValue({ ok: true });

      const { sendNotification } = await import('../../lib/notifications');

      const result = await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test Alert',
        message: 'This is a test',
        severity: 'warning',
      });

      expect(result.slack).toBe(true);
      expect(result.discord).toBe(true);
      expect(result.line).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should return false for unconfigured channels', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;
      delete process.env.LINE_NOTIFY_TOKEN;

      const { sendNotification } = await import('../../lib/notifications');

      const result = await sendNotification({
        type: 'inventory_out_of_stock',
        title: 'Test',
        message: 'Test',
        severity: 'info',
      });

      expect(result.slack).toBe(false);
      expect(result.discord).toBe(false);
      expect(result.line).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { sendNotification } = await import('../../lib/notifications');

      const result = await sendNotification({
        type: 'job_failed',
        title: 'Error',
        message: 'Test error',
        severity: 'error',
      });

      expect(result.slack).toBe(false);
    });

    it('should handle network errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { sendNotification } = await import('../../lib/notifications');

      const result = await sendNotification({
        type: 'job_failed',
        title: 'Error',
        message: 'Test',
        severity: 'error',
      });

      expect(result.slack).toBe(false);
    });

    it('should include data fields in notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { sendNotification } = await import('../../lib/notifications');

      await sendNotification({
        type: 'price_changed',
        title: 'Price Update',
        message: 'Price changed',
        severity: 'info',
        data: {
          商品名: 'Test Product',
          価格: '1000',
        },
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].fields).toBeDefined();
      expect(body.attachments[0].fields.length).toBe(2);
    });
  });

  describe('notifyOutOfStock', () => {
    it('should send out of stock notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyOutOfStock } = await import('../../lib/notifications');

      await notifyOutOfStock('Test Product', 'https://amazon.co.jp/item/123', 3);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('在庫切れ');
    });
  });

  describe('notifyPriceChanged', () => {
    it('should send price increase notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyPriceChanged } = await import('../../lib/notifications');

      await notifyPriceChanged('Test Product', 1000, 1200, 20);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('上昇');
    });

    it('should send price decrease notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyPriceChanged } = await import('../../lib/notifications');

      await notifyPriceChanged('Test Product', 1000, 800, -20);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('下落');
    });

    it('should use warning severity for large changes', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyPriceChanged } = await import('../../lib/notifications');

      await notifyPriceChanged('Test Product', 1000, 500, -50);

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#FF9800'); // warning color
    });
  });

  describe('notifyListingPublished', () => {
    it('should send listing published notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyListingPublished } = await import('../../lib/notifications');

      await notifyListingPublished(
        'Test Product',
        'eBay',
        'https://ebay.com/itm/123',
        99.99
      );

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('出品完了');
      expect(body.attachments[0].color).toBe('#4CAF50'); // success color
    });
  });

  describe('notifyListingError', () => {
    it('should send listing error notification', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { notifyListingError } = await import('../../lib/notifications');

      await notifyListingError('Test Product', 'eBay', 'Invalid category');

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attachments[0].title).toContain('出品エラー');
      expect(body.attachments[0].color).toBe('#F44336'); // error color
    });
  });

  describe('Discord notification', () => {
    it('should send Discord notification with embeds', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxx';
      mockFetch.mockResolvedValue({ ok: true });

      const { sendNotification } = await import('../../lib/notifications');

      await sendNotification({
        type: 'daily_report',
        title: 'Daily Report',
        message: 'Summary of the day',
        severity: 'info',
        data: { 総売上: 10000 },
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.embeds).toBeDefined();
      expect(body.embeds[0].title).toBe('Daily Report');
    });
  });

  describe('LINE notification', () => {
    it('should send LINE notification', async () => {
      process.env.LINE_NOTIFY_TOKEN = 'line-token';
      mockFetch.mockResolvedValue({ ok: true });

      const { sendNotification } = await import('../../lib/notifications');

      await sendNotification({
        type: 'exchange_rate_updated',
        title: 'Exchange Rate Updated',
        message: 'USD/JPY rate changed',
        severity: 'info',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer line-token',
          }),
        })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Mock fetch using vi.stubGlobal
const mockFetch = vi.fn();

describe('Slack Sender', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('isSlackConfigured', () => {
    it('should return true when SLACK_WEBHOOK_URL is set', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      const { isSlackConfigured } = await import('../../lib/slack-sender');

      expect(isSlackConfigured()).toBe(true);
    });

    it('should return false when SLACK_WEBHOOK_URL is not set', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const { isSlackConfigured } = await import('../../lib/slack-sender');

      expect(isSlackConfigured()).toBe(false);
    });

    it('should return false when SLACK_WEBHOOK_URL is empty', async () => {
      process.env.SLACK_WEBHOOK_URL = '';
      const { isSlackConfigured } = await import('../../lib/slack-sender');

      expect(isSlackConfigured()).toBe(false);
    });
  });

  describe('sendSlackMessage', () => {
    it('should return error when webhook not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const { sendSlackMessage } = await import('../../lib/slack-sender');

      const result = await sendSlackMessage({ text: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slack webhook not configured');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send message successfully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('ok'),
      });
      const { sendSlackMessage } = await import('../../lib/slack-sender');

      const result = await sendSlackMessage({ text: 'Hello Slack!' });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/xxx',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Hello Slack!' }),
        })
      );
    });

    it('should handle API errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid_token'),
      });
      const { sendSlackMessage } = await import('../../lib/slack-sender');

      const result = await sendSlackMessage({ text: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack API error: 400');
    });

    it('should handle network errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { sendSlackMessage } = await import('../../lib/slack-sender');

      const result = await sendSlackMessage({ text: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send message with blocks', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('ok') });
      const { sendSlackMessage } = await import('../../lib/slack-sender');

      const message = {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Test Header' },
          },
        ],
      };

      const result = await sendSlackMessage(message);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(message),
        })
      );
    });
  });

  describe('sendTemplatedSlackMessage', () => {
    it('should send INVENTORY_OUT_OF_STOCK message', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });
      const { sendTemplatedSlackMessage } = await import('../../lib/slack-sender');

      const data = {
        商品名: 'Test Product',
        ソース: 'Amazon',
        出品先: 'eBay',
      };

      const result = await sendTemplatedSlackMessage(
        'INVENTORY_OUT_OF_STOCK',
        data,
        'https://app.example.com/products/123'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.blocks[0].text.text).toContain('在庫切れ');
    });

    it('should send ORDER_RECEIVED message', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });
      const { sendTemplatedSlackMessage } = await import('../../lib/slack-sender');

      const data = {
        注文番号: 'ORDER-123',
        商品名: 'Test Product',
        金額: 9999,
        購入者: 'testuser',
      };

      const result = await sendTemplatedSlackMessage('ORDER_RECEIVED', data);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.blocks[0].text.text).toContain('注文');
    });

    it('should send generic message for unknown template', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });
      const { sendTemplatedSlackMessage } = await import('../../lib/slack-sender');

      const data = {
        key1: 'value1',
        key2: 'value2',
      };

      const result = await sendTemplatedSlackMessage('UNKNOWN_TEMPLATE', data);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send batch message', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/xxx';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });
      const { sendTemplatedSlackMessage } = await import('../../lib/slack-sender');

      const data = {
        件数: 5,
        items: [
          { 商品名: 'Product 1' },
          { 商品名: 'Product 2' },
        ],
      };

      const result = await sendTemplatedSlackMessage('INVENTORY_OUT_OF_STOCK_BATCH', data);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

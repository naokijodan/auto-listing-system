import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockFetch } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
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

import {
  isSlackConfigured,
  sendSlackMessage,
  sendTemplatedSlackMessage,
} from '../../lib/slack-sender';

describe('Slack Sender', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    process.env = { ...originalEnv };
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('isSlackConfigured', () => {
    it('should return true when SLACK_WEBHOOK_URL is set', () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      expect(isSlackConfigured()).toBe(true);
    });

    it('should return false when SLACK_WEBHOOK_URL is not set', () => {
      delete process.env.SLACK_WEBHOOK_URL;
      expect(isSlackConfigured()).toBe(false);
    });

    it('should return false when SLACK_WEBHOOK_URL is empty', () => {
      process.env.SLACK_WEBHOOK_URL = '';
      expect(isSlackConfigured()).toBe(false);
    });
  });

  describe('sendSlackMessage', () => {
    it('should return error when webhook not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const result = await sendSlackMessage({ text: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Slack webhook not configured');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send message to webhook', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      const result = await sendSlackMessage({ text: 'Test message' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle API error response', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });
      const result = await sendSlackMessage({ text: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack API error');
    });

    it('should handle network error', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await sendSlackMessage({ text: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send message with blocks', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
      await sendSlackMessage({
        text: 'Test',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Block content' } }],
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.blocks).toBeDefined();
      expect(body.blocks[0].type).toBe('section');
    });
  });

  describe('sendTemplatedSlackMessage', () => {
    beforeEach(() => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
    });

    it('should send INVENTORY_OUT_OF_STOCK message', async () => {
      await sendTemplatedSlackMessage('INVENTORY_OUT_OF_STOCK', { title: 'Test Product', marketplace: 'JOOM' }, 'https://example.com/product/123');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('Test Product');
      expect(body.blocks).toBeDefined();
    });

    it('should send PRICE_DROP_DETECTED message', async () => {
      await sendTemplatedSlackMessage('PRICE_DROP_DETECTED', { title: 'Test Product', changePercent: 15, oldPrice: 1000, newPrice: 1150 });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('Test Product');
    });

    it('should send LISTING_FAILED message', async () => {
      await sendTemplatedSlackMessage('LISTING_FAILED', { title: 'Test Product', marketplace: 'EBAY', error: 'API timeout' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('Test Product');
    });

    it('should send COMPETITOR_PRICE_CHANGE message', async () => {
      await sendTemplatedSlackMessage('COMPETITOR_PRICE_CHANGE', { title: 'Test Product', competitorPrice: 900, ourPrice: 1000, priceDifference: 100 });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('Test Product');
    });

    it('should send ORDER_RECEIVED message', async () => {
      await sendTemplatedSlackMessage('ORDER_RECEIVED', { orderId: 'ORDER-123', marketplace: 'JOOM', total: 29.99, currency: 'USD', buyerUsername: 'buyer123' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('ORDER-123');
    });

    it('should include deep link in ORDER_RECEIVED message', async () => {
      await sendTemplatedSlackMessage('ORDER_RECEIVED', { orderId: 'ORDER-456', marketplace: 'JOOM', total: 99.99, currency: 'USD', buyerUsername: 'buyer' }, 'https://app.rakuda.com/orders/ORDER-456');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.blocks.some((b: Record<string, unknown>) => b.type === 'actions')).toBe(true);
    });

    it('should include deep link in COMPETITOR_PRICE_CHANGE message', async () => {
      await sendTemplatedSlackMessage('COMPETITOR_PRICE_CHANGE', { title: 'Watch', competitorPrice: 500, ourPrice: 600, priceDifference: 100 }, 'https://app.rakuda.com/products/123');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.blocks.some((b: Record<string, unknown>) => b.type === 'actions')).toBe(true);
    });

    it('should send SCRAPE_ERROR message', async () => {
      await sendTemplatedSlackMessage('SCRAPE_ERROR', { source: 'MERCARI', url: 'https://mercari.com/item/123', error: 'Connection timeout' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('MERCARI');
    });

    it('should send batch message', async () => {
      await sendTemplatedSlackMessage('INVENTORY_OUT_OF_STOCK_BATCH', { count: 5, alerts: [{ title: 'Product 1' }, { title: 'Product 2' }, { title: 'Product 3' }] });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('5');
    });

    it('should send LISTING_FAILED_BATCH message', async () => {
      await sendTemplatedSlackMessage('LISTING_FAILED_BATCH', { count: 3, alerts: [{ title: 'Product 1' }] });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send COMPETITOR_PRICE_CHANGE_BATCH message', async () => {
      await sendTemplatedSlackMessage('COMPETITOR_PRICE_CHANGE_BATCH', { count: 2, alerts: [{ title: 'Product 1' }] });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send ORDER_RECEIVED_BATCH message', async () => {
      await sendTemplatedSlackMessage('ORDER_RECEIVED_BATCH', { count: 7, alerts: [{ title: 'Order 1' }] });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send SCRAPE_ERROR_BATCH message', async () => {
      await sendTemplatedSlackMessage('SCRAPE_ERROR_BATCH', { count: 4, alerts: [{ title: 'Error 1' }] });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send PRICE_DROP_DETECTED_BATCH message', async () => {
      await sendTemplatedSlackMessage('PRICE_DROP_DETECTED_BATCH', { count: 10, alerts: [{ title: 'Product 1' }] });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should send generic message for unknown template', async () => {
      await sendTemplatedSlackMessage('UNKNOWN_TEMPLATE', { key: 'value' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('UNKNOWN_TEMPLATE');
    });

    it('should include deep link in message', async () => {
      await sendTemplatedSlackMessage('INVENTORY_OUT_OF_STOCK', { title: 'Test Product' }, 'https://example.com/product');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const actionsBlock = body.blocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements[0].url).toBe('https://example.com/product');
    });

    it('should work without deep link', async () => {
      await sendTemplatedSlackMessage('INVENTORY_OUT_OF_STOCK', { title: 'Test Product' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const actionsBlock = body.blocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeUndefined();
    });

    it('should include deep link in batch message', async () => {
      await sendTemplatedSlackMessage(
        'INVENTORY_OUT_OF_STOCK_BATCH',
        { count: 5, alerts: [{ title: 'Product 1' }] },
        'https://example.com/alerts'
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // For batch messages with attachments, the blocks are in attachments
      const attachmentBlocks = body.attachments?.[0]?.blocks || [];
      const actionsBlock = attachmentBlocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements[0].url).toBe('https://example.com/alerts');
    });

    it('should include deep link in generic message', async () => {
      await sendTemplatedSlackMessage(
        'UNKNOWN_TEMPLATE',
        { key: 'value' },
        'https://example.com/details'
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const actionsBlock = body.blocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements[0].url).toBe('https://example.com/details');
    });

    it('should include deep link in LISTING_FAILED_BATCH message', async () => {
      await sendTemplatedSlackMessage(
        'LISTING_FAILED_BATCH',
        { count: 3, alerts: [{ title: 'Product 1' }] },
        'https://example.com/failed-listings'
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const attachmentBlocks = body.attachments?.[0]?.blocks || [];
      const actionsBlock = attachmentBlocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
    });

    it('should include deep link in SCRAPE_ERROR_BATCH message', async () => {
      await sendTemplatedSlackMessage(
        'SCRAPE_ERROR_BATCH',
        { count: 4, alerts: [{ error: 'Error 1' }] },
        'https://example.com/scrape-errors'
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const attachmentBlocks = body.attachments?.[0]?.blocks || [];
      const actionsBlock = attachmentBlocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
    });
  });
});

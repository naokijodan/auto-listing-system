import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  NOTIFICATION_TEMPLATES,
  generateDeepLink,
  generateDeepLinkForEvent,
  interpolate,
  getSeverityColor,
  getSeveritySlackColor,
  getDefaultAlertRules,
} from '../../lib/notification-templates';

describe('Notification Templates', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WEB_APP_URL = 'https://rakuda.example.com';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('NOTIFICATION_TEMPLATES', () => {
    it('should have INVENTORY_OUT_OF_STOCK template', () => {
      const template = NOTIFICATION_TEMPLATES.INVENTORY_OUT_OF_STOCK;

      expect(template.eventType).toBe('INVENTORY_OUT_OF_STOCK');
      expect(template.severity).toBe('critical');
      expect(template.defaultChannels).toContain('email');
      expect(template.slack.emoji).toBe('🚨');
    });

    it('should have PRICE_DROP_DETECTED template', () => {
      const template = NOTIFICATION_TEMPLATES.PRICE_DROP_DETECTED;

      expect(template.eventType).toBe('PRICE_DROP_DETECTED');
      expect(template.severity).toBe('warning');
      expect(template.slack.emoji).toBe('📉');
    });

    it('should have LISTING_FAILED template', () => {
      const template = NOTIFICATION_TEMPLATES.LISTING_FAILED;

      expect(template.eventType).toBe('LISTING_FAILED');
      expect(template.severity).toBe('critical');
      expect(template.deepLinkType).toBe('listing');
    });

    it('should have ORDER_RECEIVED template', () => {
      const template = NOTIFICATION_TEMPLATES.ORDER_RECEIVED;

      expect(template.eventType).toBe('ORDER_RECEIVED');
      expect(template.severity).toBe('info');
      expect(template.slack.emoji).toBe('🎉');
    });
  });

  describe('generateDeepLink', () => {
    it('should generate link for product', () => {
      const url = generateDeepLink('product', { id: '123' });

      expect(url).toContain('/products/123');
    });

    it('should generate link for listing', () => {
      const url = generateDeepLink('listing', { id: 'abc' });

      expect(url).toContain('/listings/abc');
    });

    it('should generate link for inventory', () => {
      const url = generateDeepLink('inventory');

      expect(url).toBe('https://rakuda.example.com/inventory');
    });

    it('should generate link for pricing', () => {
      const url = generateDeepLink('pricing');

      expect(url).toBe('https://rakuda.example.com/pricing/recommendations');
    });

    it('should return base URL for none type', () => {
      const url = generateDeepLink('none');

      expect(url).toBe('https://rakuda.example.com');
    });

    it('should encode special characters in params', () => {
      const url = generateDeepLink('product', { id: 'test/id&special' });

      expect(url).toBe('https://rakuda.example.com/products/test%2Fid%26special');
    });

    it('should use default localhost URL when WEB_APP_URL not set', () => {
      delete process.env.WEB_APP_URL;

      const url = generateDeepLink('inventory');

      expect(url).toContain('localhost:3001');
    });

    it('should add query params for unmatched parameters', () => {
      const url = generateDeepLink('inventory', { filter: 'outOfStock', status: 'critical' });

      expect(url).toContain('filter=outOfStock');
      expect(url).toContain('status=critical');
    });
  });

  describe('generateDeepLinkForEvent', () => {
    it('should generate link for INVENTORY_OUT_OF_STOCK', () => {
      const url = generateDeepLinkForEvent('INVENTORY_OUT_OF_STOCK', {
        productId: 'prod-123',
      });

      expect(url).toContain('/inventory');
    });

    it('should generate link for LISTING_FAILED with listingId', () => {
      const url = generateDeepLinkForEvent('LISTING_FAILED', {
        listingId: 'listing-456',
      });

      expect(url).toContain('/listings/listing-456');
    });

    it('should generate link for ORDER_RECEIVED with orderId', () => {
      const url = generateDeepLinkForEvent('ORDER_RECEIVED', {
        orderId: 'order-789',
      });

      expect(url).toContain('/orders');
      expect(url).toContain('orderId=order-789');
    });

    it('should return base URL for unknown event type', () => {
      const url = generateDeepLinkForEvent('UNKNOWN_EVENT' as any, {});

      expect(url).toBe('https://rakuda.example.com');
    });
  });

  describe('interpolate', () => {
    it('should replace single placeholder', () => {
      const result = interpolate('Hello {{name}}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    it('should replace multiple placeholders', () => {
      const result = interpolate('{{greeting}}, {{name}}!', {
        greeting: 'Hello',
        name: 'World',
      });

      expect(result).toBe('Hello, World!');
    });

    it('should replace same placeholder multiple times', () => {
      const result = interpolate('{{x}} + {{x}} = 2{{x}}', { x: '1' });

      expect(result).toBe('1 + 1 = 21');
    });

    it('should remove missing placeholders', () => {
      const result = interpolate('Hello {{name}}!', {});

      expect(result).toBe('Hello !');
    });

    it('should handle null values', () => {
      const result = interpolate('Value: {{value}}', { value: null });

      expect(result).toBe('Value: ');
    });

    it('should handle undefined values', () => {
      const result = interpolate('Value: {{value}}', { value: undefined });

      expect(result).toBe('Value: ');
    });

    it('should convert numbers to strings', () => {
      const result = interpolate('Price: {{price}}円', { price: 1000 });

      expect(result).toBe('Price: 1000円');
    });

    it('should handle boolean values', () => {
      const result = interpolate('Status: {{active}}', { active: true });

      expect(result).toBe('Status: true');
    });
  });

  describe('getSeverityColor', () => {
    it('should return red for critical', () => {
      expect(getSeverityColor('critical')).toBe('#dc3545');
    });

    it('should return yellow for warning', () => {
      expect(getSeverityColor('warning')).toBe('#ffc107');
    });

    it('should return blue for info', () => {
      expect(getSeverityColor('info')).toBe('#17a2b8');
    });

    it('should return info color for unknown severity', () => {
      expect(getSeverityColor('unknown' as any)).toBe('#17a2b8');
    });
  });

  describe('getSeveritySlackColor', () => {
    it('should return danger for critical', () => {
      expect(getSeveritySlackColor('critical')).toBe('danger');
    });

    it('should return warning for warning', () => {
      expect(getSeveritySlackColor('warning')).toBe('warning');
    });

    it('should return good for info', () => {
      expect(getSeveritySlackColor('info')).toBe('good');
    });

    it('should return good for unknown severity', () => {
      expect(getSeveritySlackColor('unknown' as any)).toBe('good');
    });
  });

  describe('getDefaultAlertRules', () => {
    it('should return array of default rules', () => {
      const rules = getDefaultAlertRules();

      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should include inventory out of stock rule', () => {
      const rules = getDefaultAlertRules();
      const rule = rules.find(r => r.eventType === 'INVENTORY_OUT_OF_STOCK');

      expect(rule).toBeDefined();
      expect(rule?.name).toContain('在庫切れ');
      expect(rule?.severity).toBe('critical');
      expect(rule?.channels).toContain('email');
    });

    it('should include listing failed rule', () => {
      const rules = getDefaultAlertRules();
      const rule = rules.find(r => r.eventType === 'LISTING_FAILED');

      expect(rule).toBeDefined();
      expect(rule?.cooldownMinutes).toBe(0);
    });

    it('should include order received rule', () => {
      const rules = getDefaultAlertRules();
      const rule = rules.find(r => r.eventType === 'ORDER_RECEIVED');

      expect(rule).toBeDefined();
      expect(rule?.channels).toContain('slack');
    });

    it('should have cooldown settings for price alerts', () => {
      const rules = getDefaultAlertRules();
      const rule = rules.find(r => r.eventType === 'PRICE_DROP_DETECTED');

      expect(rule?.cooldownMinutes).toBeGreaterThan(0);
      expect(rule?.batchWindowMinutes).toBeGreaterThan(0);
    });
  });
});

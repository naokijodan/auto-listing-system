import { describe, it, expect } from 'vitest';
import { identifyShopifyChannel } from '../../lib/shopify-channel-identifier';

describe('shopify-channel-identifier', () => {
  it('maps app_id 580111 to ONLINE_STORE', () => {
    const ch = identifyShopifyChannel({ app_id: 580111 });
    expect(ch.code).toBe('ONLINE_STORE');
    expect(ch.name).toBeDefined();
  });

  it('maps app_id 2329312 to INSTAGRAM and requiresHoldCheck on on_hold', () => {
    const ch = identifyShopifyChannel({ app_id: 2329312, fulfillment_status: 'on_hold' });
    expect(ch.code).toBe('INSTAGRAM');
    expect(ch.requiresHoldCheck).toBe(true);
  });

  it('maps app_id 4383523 to TIKTOK and requiresHoldCheck on on_hold', () => {
    const ch = identifyShopifyChannel({ app_id: 4383523, fulfillment_status: 'on_hold' });
    expect(ch.code).toBe('TIKTOK');
    expect(ch.requiresHoldCheck).toBe(true);
  });

  it("maps source_name 'web' to ONLINE_STORE when app_id unknown", () => {
    const ch = identifyShopifyChannel({ source_name: 'web' });
    expect(ch.code).toBe('ONLINE_STORE');
  });

  it('falls back to UNKNOWN for unknown app_id', () => {
    const ch = identifyShopifyChannel({ app_id: 99999999 });
    expect(ch.code).toBe('UNKNOWN');
  });

  it('app_id takes precedence over source_name', () => {
    const ch = identifyShopifyChannel({ app_id: 2329312, source_name: 'web' });
    expect(ch.code).toBe('INSTAGRAM');
  });

  it('requiresPaymentCapture only for Instagram authorized', () => {
    const ch1 = identifyShopifyChannel({ app_id: 2329312, financial_status: 'authorized' });
    const ch2 = identifyShopifyChannel({ app_id: 2329312, financial_status: 'paid' });
    const ch3 = identifyShopifyChannel({ app_id: 580111, financial_status: 'authorized' });
    expect(ch1.requiresPaymentCapture).toBe(true);
    expect(ch2.requiresPaymentCapture).toBe(false);
    expect(ch3.requiresPaymentCapture).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';
import { processShopifyWebhookEvent } from '../../lib/shopify-webhook-processor';

describe('shopify-webhook-processor channel identification', () => {
  beforeEach(() => {
    // ensure mocks exist
    (mockPrisma.order as any).findUnique = vi.fn();
    mockPrisma.order.create.mockResolvedValue({ id: 'ord-1' } as any);
    mockPrisma.sale.create.mockResolvedValue({ id: 'sale-1' } as any);
    (mockPrisma as any).webhookEvent = {
      update: vi.fn().mockResolvedValue({} as any),
    } as any;
    mockPrisma.inventoryEvent.create.mockResolvedValue({} as any);
    mockPrisma.product.update.mockResolvedValue({} as any);
  });

  const basePayload = {
    id: 123,
    created_at: '2026-02-28T10:00:00Z',
    subtotal_price: '10.00',
    total_shipping_price_set: { shop_money: { amount: '0.00' } },
    total_tax: '0.00',
    total_price: '10.00',
    currency: 'USD',
    customer: { email: 'buyer@example.com', first_name: 'Taro', last_name: 'Yamada' },
    line_items: [
      { product_id: 999, title: 'Item', quantity: 1, price: '10.00' },
    ],
  };

  it('sets Order.sourceChannel = INSTAGRAM when app_id=2329312', async () => {
    (mockPrisma.order as any).findUnique.mockResolvedValue(null);
    const payload = { ...basePayload, app_id: 2329312 };
    await processShopifyWebhookEvent({ id: 'evt-1', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} } as any);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceChannel: 'INSTAGRAM' }),
    }));
  });

  it('sets Order.sourceChannel = TIKTOK when app_id=4383523', async () => {
    (mockPrisma.order as any).findUnique.mockResolvedValue(null);
    const payload = { ...basePayload, app_id: 4383523 };
    await processShopifyWebhookEvent({ id: 'evt-2', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} } as any);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceChannel: 'TIKTOK' }),
    }));
  });

  it("sets fulfillmentStatus to 'ON_HOLD' when fulfillment_status=on_hold for IG/TikTok", async () => {
    (mockPrisma.order as any).findUnique.mockResolvedValue(null);
    const payload = { ...basePayload, app_id: 2329312, fulfillment_status: 'on_hold' };
    await processShopifyWebhookEvent({ id: 'evt-3', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} } as any);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fulfillmentStatus: 'ON_HOLD' }),
    }));
  });

  it("sets paymentStatus to 'AUTHORIZED' when Instagram order is authorized", async () => {
    (mockPrisma.order as any).findUnique.mockResolvedValue(null);
    const payload = { ...basePayload, app_id: 2329312, financial_status: 'authorized' };
    await processShopifyWebhookEvent({ id: 'evt-4', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} } as any);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: 'AUTHORIZED' }),
    }));
  });
});

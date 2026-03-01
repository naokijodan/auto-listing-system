import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../setup';
import { processShopifyWebhookEvent } from '../../lib/shopify-webhook-processor';

describe('Shopify Webhook → Order Processing Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseOrderPayload = {
    id: 820982911946154,
    name: '#1001',
    app_id: 580111, // Online Store
    source_name: 'web',
    financial_status: 'paid',
    fulfillment_status: null,
    line_items: [{
      id: 1,
      variant_id: 51431097991384,
      title: 'Seiko Presage SARX035',
      quantity: 1,
      sku: 'RAKUDA-SHOP-product-123',
      product_id: 'shopify-prod-1',
      price: '399.99',
    }],
    total_price: '399.99',
    currency: 'USD',
    created_at: '2026-03-01T10:00:00Z',
    shipping_address: {
      first_name: 'John', last_name: 'Doe', address1: '123 Main St', city: 'New York', province: 'NY', zip: '10001', country: 'US',
    },
    customer: { email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
  } as any;

  it('should process orders/create webhook and create Order + Sale records', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-1', marketplaceOrderId: String(baseOrderPayload.id) });
    mockPrisma.listing.findFirst.mockResolvedValue({ id: 'lst-1', productId: 'product-123' });

    await processShopifyWebhookEvent({
      id: 'wh-1',
      provider: 'SHOPIFY',
      eventType: 'orders/create',
      payload: { ...baseOrderPayload, line_items: [{ ...baseOrderPayload.line_items[0], sku: 'RAKUDA-SHOP-product-123' }] },
      headers: {},
    });

    expect(mockPrisma.order.create).toHaveBeenCalled();
    expect(mockPrisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: 1 }),
    }));
    expect(mockPrisma.inventoryEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: 'SALE', quantity: -1, newStock: 0 }),
    }));
    expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SOLD' }),
    }));
  });

  it('should process orders/create from Instagram channel', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-inst', marketplaceOrderId: String(baseOrderPayload.id) });

    await processShopifyWebhookEvent({ id: 'wh-2', provider: 'SHOPIFY', eventType: 'orders/create', payload: { ...baseOrderPayload, app_id: 2329312 }, headers: {} });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceChannel: 'INSTAGRAM' }),
    }));
  });

  it('should process orders/create from TikTok channel with ON_HOLD status', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-tt', marketplaceOrderId: String(baseOrderPayload.id) });

    await processShopifyWebhookEvent({ id: 'wh-3', provider: 'SHOPIFY', eventType: 'orders/create', payload: { ...baseOrderPayload, app_id: 4383523, fulfillment_status: 'on_hold' }, headers: {} });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceChannel: 'TIKTOK', fulfillmentStatus: 'ON_HOLD' }),
    }));
  });

  it('should handle orders/cancelled and update Order status', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-2', marketplaceOrderId: String(baseOrderPayload.id) });
    await processShopifyWebhookEvent({ id: 'wh-4', provider: 'SHOPIFY', eventType: 'orders/cancelled', payload: { ...baseOrderPayload }, headers: {} });
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELLED' } }));
  });

  it('should handle products/update and sync Listing', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue({ id: 'lst-2' });
    await processShopifyWebhookEvent({ id: 'wh-5', provider: 'SHOPIFY', eventType: 'products/update', payload: { id: 'shopify-prod-2', status: 'active', variants: [{ id: 1, price: '499.99' }] }, headers: {} });
    expect(mockPrisma.listing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lst-2' },
      data: expect.objectContaining({ listingPrice: 499.99, status: 'ACTIVE' }),
    }));
  });

  it('should handle duplicate order webhook idempotently', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'existing-order', marketplaceOrderId: String(baseOrderPayload.id) });
    await processShopifyWebhookEvent({ id: 'wh-6', provider: 'SHOPIFY', eventType: 'orders/create', payload: { ...baseOrderPayload }, headers: {} });
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});

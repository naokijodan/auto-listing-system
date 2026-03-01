import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';
import { processShopifyWebhookEvent } from '../../lib/shopify-webhook-processor';

describe('Multi-Marketplace Inventory Sync (Shopify order triggers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create InventoryEvent when Shopify order is processed', async () => {
    const payload = {
      id: 820982911946154,
      financial_status: 'paid',
      fulfillment_status: null,
      line_items: [{ sku: 'RAKUDA-SHOP-product-xyz', product_id: 'shopify-prod-xyz', title: 'Seiko', quantity: 1, price: '399.99' }],
      created_at: new Date().toISOString(),
      currency: 'USD',
    };

    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-xyz', marketplaceOrderId: String(payload.id) });
    mockPrisma.listing.findFirst.mockResolvedValue({ id: 'lst-shopify', productId: 'product-xyz' });

    await processShopifyWebhookEvent({ id: 'wh-inv-1', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} });

    expect(mockPrisma.inventoryEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: 'SALE', quantity: -1, newStock: 0 }),
    }));
  });

  it('should mark product as SOLD across channels (RAKUDA product)', async () => {
    const payload = {
      id: 820982911946155,
      financial_status: 'paid',
      fulfillment_status: null,
      line_items: [{ sku: 'RAKUDA-SHOP-product-abc', product_id: 'shopify-prod-abc', title: 'Seiko', quantity: 1, price: '399.99' }],
      created_at: new Date().toISOString(),
      currency: 'USD',
    };

    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.create.mockResolvedValue({ id: 'order-abc', marketplaceOrderId: String(payload.id) });
    mockPrisma.listing.findFirst.mockResolvedValue({ id: 'lst-shopify', productId: 'product-abc' });

    await processShopifyWebhookEvent({ id: 'wh-inv-2', provider: 'SHOPIFY', eventType: 'orders/create', payload, headers: {} });

    expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'product-abc' },
      data: expect.objectContaining({ status: 'SOLD' }),
    }));
  });
});


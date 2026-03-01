import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'shopify-webhook-processor' });

interface WebhookEventLike {
  id: string;
  provider: string;
  eventType: string;
  payload: any;
  headers: any;
}

export async function processShopifyWebhookEvent(event: WebhookEventLike): Promise<void> {
  const { eventType, payload } = event;

  log.info({ eventId: event.id, eventType }, 'Processing Shopify webhook event');

  switch (eventType) {
    case 'orders/create':
      await handleOrderCreated(event.id, payload);
      break;
    case 'orders/updated':
      await handleOrderUpdated(event.id, payload);
      break;
    case 'orders/cancelled':
      await handleOrderCancelled(event.id, payload);
      break;
    case 'products/update':
      await handleProductUpdated(event.id, payload);
      break;
    case 'inventory_levels/update':
      await handleInventoryLevelUpdated(event.id, payload);
      break;
    case 'app/uninstalled':
      await handleAppUninstalled(event.id, payload);
      break;
    default:
      log.warn({ eventType, eventId: event.id }, 'Unhandled Shopify webhook event type');
  }
}

// 注文作成
async function handleOrderCreated(eventId: string, payload: any): Promise<void> {
  const marketplaceOrderId = String(payload.id);

  const existing = await prisma.order.findUnique({
    where: { marketplace_marketplaceOrderId: { marketplace: 'SHOPIFY', marketplaceOrderId } },
  });
  if (existing) {
    log.info({ marketplaceOrderId, existingOrderId: existing.id }, 'Order already exists, skipping');
    await prisma.webhookEvent.update({ where: { id: eventId }, data: { orderId: existing.id } });
    return;
  }

  // 金額情報
  const subtotal = parseFloat(payload.subtotal_price || '0');
  const shipping = parseFloat(payload.total_shipping_price_set?.shop_money?.amount || '0');
  const tax = parseFloat(payload.total_tax || '0');
  const total = parseFloat(payload.total_price || '0');
  const currency = payload.currency || payload.total_price_set?.shop_money?.currency || 'USD';

  const shipTo = payload.shipping_address || {};

  const order = await prisma.order.create({
    data: {
      marketplace: 'SHOPIFY',
      marketplaceOrderId,
      buyerUsername: payload.customer?.email || payload.email || 'unknown',
      buyerEmail: payload.email || payload.customer?.email || null,
      buyerName: `${payload.customer?.first_name || ''} ${payload.customer?.last_name || ''}`.trim() || null,
      shippingAddress: shipTo as any,
      subtotal,
      shippingCost: shipping,
      tax,
      total,
      currency,
      status: mapShopifyOrderStatus(payload.financial_status, payload.fulfillment_status, payload.cancelled_at),
      paymentStatus: mapShopifyPaymentStatus(payload.financial_status),
      fulfillmentStatus: mapShopifyFulfillmentStatus(payload.fulfillment_status),
      orderedAt: new Date(payload.created_at || Date.now()),
      paidAt: payload.financial_status === 'paid' && payload.processed_at ? new Date(payload.processed_at) : null,
      rawData: payload as any,
    },
  });

  // 売上明細
  const lineItems = payload.line_items || [];
  for (const li of lineItems) {
    const sku: string = li.sku || '';
    let productId: string | null = null;
    const m = sku ? sku.match(/^RAKUDA-SHOP-(.+)$/) : null;
    if (m) productId = m[1];

    // listing ひもづけ（productId優先、なければShopify product_idで検索）
    let listingId: string | undefined;
    if (productId) {
      const lst = await prisma.listing.findFirst({ where: { productId, marketplace: 'SHOPIFY' } });
      if (lst) listingId = lst.id;
    } else if (li.product_id) {
      const lst = await prisma.listing.findFirst({ where: { marketplace: 'SHOPIFY', marketplaceListingId: String(li.product_id) } });
      if (lst) {
        listingId = lst.id;
        productId = lst.productId;
      }
    }

    await prisma.sale.create({
      data: {
        orderId: order.id,
        listingId: listingId || null,
        productId: productId || null,
        sku: sku || String(li.product_id || ''),
        title: li.title || 'Shopify Item',
        quantity: li.quantity || 1,
        unitPrice: parseFloat(li.price || '0'),
        totalPrice: parseFloat(li.price || '0') * (li.quantity || 1),
        marketplaceItemId: String(li.product_id || ''),
      },
    });

    // 在庫イベント（販売）: 簡易的に在庫1を前提
    if (productId) {
      await prisma.inventoryEvent.create({
        data: {
          productId,
          eventType: 'SALE',
          quantity: -(li.quantity || 1),
          prevStock: 1,
          newStock: 0,
          marketplace: 'SHOPIFY',
          orderId: order.id,
          reason: 'Order received via Shopify webhook',
        },
      });
      await prisma.product.update({ where: { id: productId }, data: { status: 'SOLD' } });
    }
  }

  await prisma.webhookEvent.update({ where: { id: eventId }, data: { orderId: order.id } });

  log.info({ orderId: order.id, marketplaceOrderId }, 'Shopify order created');
}

// 注文更新
async function handleOrderUpdated(eventId: string, payload: any): Promise<void> {
  const marketplaceOrderId = String(payload.id);

  const order = await prisma.order.findUnique({
    where: { marketplace_marketplaceOrderId: { marketplace: 'SHOPIFY', marketplaceOrderId } },
  });

  if (!order) {
    await handleOrderCreated(eventId, payload);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: mapShopifyOrderStatus(payload.financial_status, payload.fulfillment_status, payload.cancelled_at),
      paymentStatus: mapShopifyPaymentStatus(payload.financial_status),
      fulfillmentStatus: mapShopifyFulfillmentStatus(payload.fulfillment_status),
      rawData: payload as any,
      updatedAt: new Date(),
    },
  });

  await prisma.webhookEvent.update({ where: { id: eventId }, data: { orderId: order.id } });

  log.info({ orderId: order.id, marketplaceOrderId }, 'Shopify order updated');
}

// 注文キャンセル
async function handleOrderCancelled(_eventId: string, payload: any): Promise<void> {
  const marketplaceOrderId = String(payload.id);

  const order = await prisma.order.findUnique({
    where: { marketplace_marketplaceOrderId: { marketplace: 'SHOPIFY', marketplaceOrderId } },
  });

  if (!order) {
    log.warn({ marketplaceOrderId }, 'Order not found for cancellation');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' },
  });

  log.info({ orderId: order.id, marketplaceOrderId }, 'Shopify order cancelled');
}

// 商品更新（Listing同期）
async function handleProductUpdated(_eventId: string, payload: any): Promise<void> {
  const shopifyProductId = String(payload.id);

  const listing = await prisma.listing.findFirst({
    where: { marketplace: 'SHOPIFY', marketplaceListingId: shopifyProductId },
  });

  if (!listing) {
    log.debug({ shopifyProductId }, 'No RAKUDA listing found for Shopify product update');
    return;
  }

  const shopifyStatus = payload.status; // active, archived, draft
  const newStatus = shopifyStatus === 'active' ? 'ACTIVE'
    : shopifyStatus === 'archived' ? 'ENDED'
    : 'DRAFT';

  const firstVariant = payload.variants?.[0];
  const newPrice = firstVariant ? parseFloat(firstVariant.price) : undefined;

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: newStatus,
      ...(newPrice !== undefined ? { listingPrice: newPrice } : {}),
    },
  });

  log.info({ listingId: listing.id, shopifyProductId, newStatus, newPrice }, 'Shopify product update synced');
}

// 在庫レベル更新（モニタリングのみ）
async function handleInventoryLevelUpdated(_eventId: string, payload: any): Promise<void> {
  const inventoryItemId = String(payload.inventory_item_id || '');
  const available = payload.available;
  const locationId = String(payload.location_id || '');

  log.info({ inventoryItemId, available, locationId }, 'Shopify inventory level updated (monitoring only)');
}

// アプリアンインストール
async function handleAppUninstalled(_eventId: string, payload: any): Promise<void> {
  log.warn({ shop: payload?.domain || payload?.myshopify_domain }, 'Shopify app uninstalled - deactivating listings/credentials');

  const result = await prisma.listing.updateMany({ where: { marketplace: 'SHOPIFY', status: 'ACTIVE' }, data: { status: 'ENDED' } });

  await prisma.marketplaceCredential.updateMany({ where: { marketplace: 'SHOPIFY' }, data: { isActive: false } });

  log.info({ deactivatedListings: result.count }, 'All Shopify listings deactivated');
}

// ステータスマッピング
function mapShopifyOrderStatus(financialStatus: string, fulfillmentStatus: string | null, cancelledAt?: string | null): 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTE' {
  if (cancelledAt) return 'CANCELLED';
  if (fulfillmentStatus === 'fulfilled') return 'SHIPPED';
  if (fulfillmentStatus === 'partial' || fulfillmentStatus === 'partialled' || fulfillmentStatus === 'partial_fulfilled') return 'PROCESSING';
  if (financialStatus === 'paid' || financialStatus === 'partially_paid' || financialStatus === 'authorized') return 'CONFIRMED';
  if (financialStatus === 'refunded') return 'REFUNDED';
  return 'PENDING';
}

function mapShopifyPaymentStatus(financialStatus: string): 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' {
  switch ((financialStatus || '').toLowerCase()) {
    case 'paid':
    case 'partially_paid':
    case 'authorized':
      return 'PAID';
    case 'refunded':
    case 'partially_refunded':
      return 'REFUNDED';
    case 'voided':
    case 'failed':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

function mapShopifyFulfillmentStatus(fulfillmentStatus: string | null): 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'RETURNED' {
  const s = (fulfillmentStatus || '').toLowerCase();
  if (s === 'fulfilled') return 'FULFILLED';
  if (s === 'partial' || s === 'partialled' || s === 'partial_fulfilled') return 'PARTIALLY_FULFILLED';
  return 'UNFULFILLED';
}


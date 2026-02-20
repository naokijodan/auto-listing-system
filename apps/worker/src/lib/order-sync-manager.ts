import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { ebayOrderSyncService } from './ebay-publish-service';
import { shopifyOrderSyncService } from './shopify-publish-service';
import { etsyApi } from './etsy-api';
import { joomApi } from './joom-api';
import { inventoryManager } from './inventory-manager';

const log = logger.child({ module: 'order-sync-manager' });

export class OrderSyncManager {
  async syncAllOrders(): Promise<{
    ebay: { synced: number; errors: number };
    joom: { synced: number; errors: number };
    etsy: { synced: number; errors: number };
    shopify: { synced: number; errors: number };
  }> {
    const [ebay, joom, etsy, shopify] = await Promise.allSettled([
      this.syncEbayOrders(),
      this.syncJoomOrders(),
      this.syncEtsyOrders(),
      this.syncShopifyOrders(),
    ]);

    const result = {
      ebay: ebay.status === 'fulfilled' ? ebay.value : { synced: 0, errors: 1 },
      joom: joom.status === 'fulfilled' ? joom.value : { synced: 0, errors: 1 },
      etsy: etsy.status === 'fulfilled' ? etsy.value : { synced: 0, errors: 1 },
      shopify: shopify.status === 'fulfilled' ? shopify.value : { synced: 0, errors: 1 },
    };
    return result;
  }

  async syncEbayOrders(): Promise<{ synced: number; errors: number }> {
    return ebayOrderSyncService.syncOrders();
  }

  async syncJoomOrders(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await joomApi.getOrders({ status: 'pending', since, limit: 50 });
      if (!res.success || !res.data) return { synced, errors: errors + 1 };
      const orders = res.data.orders || [];

      for (const order of orders) {
        try {
          const marketplaceOrderId = String(order.id || order.orderId || order.order_id || '');
          if (!marketplaceOrderId) throw new Error('Invalid Joom order id');

          const subtotal = Number(order.subtotal || order.totalPrice || 0);
          const shipping = Number(order.shippingPrice || 0);
          const total = Number(order.total || subtotal + shipping);
          const currency = order.currency || 'USD';

          const buyer = order.buyer || {};
          const shipTo = order.shippingAddress || {};

          const existing = await prisma.order.findUnique({ where: { marketplace_marketplaceOrderId: { marketplace: 'JOOM', marketplaceOrderId } } });

          const saved = await prisma.order.upsert({
            where: { marketplace_marketplaceOrderId: { marketplace: 'JOOM', marketplaceOrderId } },
            create: {
              marketplace: 'JOOM',
              marketplaceOrderId,
              buyerUsername: buyer.username || 'unknown',
              buyerEmail: buyer.email || null,
              buyerName: buyer.name || null,
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              tax: Number(order.tax || 0),
              total,
              currency,
              status: 'CONFIRMED',
              paymentStatus: (order.paymentStatus || '').toString().toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
              fulfillmentStatus: 'UNFULFILLED',
              rawData: order as any,
              orderedAt: new Date(order.createdAt || order.created_at || Date.now()),
            },
            update: {
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              total,
              paymentStatus: (order.paymentStatus || existing?.paymentStatus || 'PENDING') as any,
              rawData: order as any,
            },
          });

          const lineItems = order.items || order.lineItems || [];
          for (const li of lineItems) {
            const sku = li.sku || '';
            const m = (sku || '').match(/^RAKUDA-(.+)$/);
            const productId = m ? m[1] : null;

            let listingId: string | undefined;
            if (productId) {
              const lst = await prisma.listing.findFirst({ where: { productId, marketplace: 'JOOM' } });
              if (lst) listingId = lst.id;
            }

            await prisma.sale.create({
              data: {
                orderId: saved.id,
                listingId: listingId || null,
                productId: productId || null,
                sku: sku || String(li.productId || ''),
                title: li.title || 'Joom Item',
                quantity: li.quantity || 1,
                unitPrice: Number(li.price || subtotal),
                totalPrice: Number(li.price || subtotal) * (li.quantity || 1),
                marketplaceItemId: String(li.productId || ''),
              },
            });

            if (productId) {
              await inventoryManager.recordInventoryChange({
                productId,
                eventType: 'SALE',
                quantity: -(li.quantity || 1),
                marketplace: 'JOOM',
                orderId: saved.id,
                reason: 'Order synced from Joom',
              });
              await prisma.product.update({ where: { id: productId }, data: { status: 'SOLD' as any } });
            }
          }

          if (!existing) synced++;
        } catch (e: any) {
          errors++;
          log.error({ type: 'joom_order_sync_item_error', error: e.message });
        }
      }
      return { synced, errors };
    } catch (e: any) {
      log.error({ type: 'joom_order_sync_failed', error: e.message });
      return { synced, errors: errors + 1 };
    }
  }

  async syncEtsyOrders(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    try {
      const min_created = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const res = await etsyApi.getShopReceipts({ min_created, limit: 50 });
      const receipts = (res?.results || res?.receipts || res?.data || []) as any[];

      for (const receipt of receipts) {
        try {
          const marketplaceOrderId = String(receipt.receipt_id || receipt.id || '');
          if (!marketplaceOrderId) throw new Error('Invalid Etsy receipt id');

          const subtotal = Number(receipt.subtotal || receipt.amount_net || 0);
          const shipping = Number(receipt.total_shipping_cost || 0);
          const total = Number(receipt.total || receipt.amount_paid || subtotal + shipping);
          const currency = receipt.currency_code || 'USD';

          const saved = await prisma.order.upsert({
            where: { marketplace_marketplaceOrderId: { marketplace: 'ETSY', marketplaceOrderId } },
            create: {
              marketplace: 'ETSY',
              marketplaceOrderId,
              buyerUsername: receipt.name || 'unknown',
              buyerEmail: receipt.buyer_email || null,
              buyerName: receipt.name || null,
              shippingAddress: (receipt.formatted_address || receipt.shipping_details || {}) as any,
              subtotal,
              shippingCost: shipping,
              tax: Number(receipt.total_tax_cost || 0),
              total,
              currency,
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              fulfillmentStatus: (receipt.was_shipped ? 'FULFILLED' : 'UNFULFILLED') as any,
              rawData: receipt as any,
              orderedAt: new Date((receipt.create_timestamp || receipt.created_at || Date.now()) * (String(receipt.create_timestamp).length > 10 ? 1 : 1000)),
            },
            update: {
              shippingAddress: (receipt.formatted_address || receipt.shipping_details || {}) as any,
              subtotal,
              shippingCost: shipping,
              total,
              rawData: receipt as any,
            },
          });

          const transactions = receipt.transactions || [];
          for (const t of transactions) {
            const sku = t.sku || '';
            const m = (sku || '').match(/^RAKUDA-ETSY-(.+)$/);
            const productId = m ? m[1] : null;
            let listingId: string | undefined;
            if (productId) {
              const lst = await prisma.listing.findFirst({ where: { productId, marketplace: 'ETSY' } });
              if (lst) listingId = lst.id;
            }

            await prisma.sale.create({
              data: {
                orderId: saved.id,
                listingId: listingId || null,
                productId: productId || null,
                sku: sku || String(t.listing_id || ''),
                title: t.title || 'Etsy Item',
                quantity: t.quantity || 1,
                unitPrice: Number(t.price || subtotal),
                totalPrice: Number(t.price || subtotal) * (t.quantity || 1),
                marketplaceItemId: String(t.listing_id || ''),
              },
            });

            if (productId) {
              await inventoryManager.recordInventoryChange({
                productId,
                eventType: 'SALE',
                quantity: -(t.quantity || 1),
                marketplace: 'ETSY',
                orderId: saved.id,
                reason: 'Order synced from Etsy',
              });
              await prisma.product.update({ where: { id: productId }, data: { status: 'SOLD' as any } });
            }
          }

          synced++;
        } catch (e: any) {
          errors++;
          log.error({ type: 'etsy_order_sync_item_error', error: e.message });
        }
      }
      return { synced, errors };
    } catch (e: any) {
      log.error({ type: 'etsy_order_sync_failed', error: e.message });
      return { synced, errors: errors + 1 };
    }
  }

  async syncShopifyOrders(): Promise<{ synced: number; errors: number }> {
    return shopifyOrderSyncService.syncOrders();
  }

  async getOrdersSummary(days: number = 30): Promise<{
    total: number;
    revenue: number;
    byMarketplace: Record<string, { count: number; revenue: number }>;
    byDay: Array<{ date: string; count: number; revenue: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, revenueAgg, byMarketplaceAgg, byDayAgg] = await Promise.all([
      prisma.order.count({ where: { orderedAt: { gte: since } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { orderedAt: { gte: since } } }),
      prisma.order.groupBy({ by: ['marketplace'], where: { orderedAt: { gte: since } }, _count: true, _sum: { total: true } }),
      prisma.$queryRawUnsafe<Array<{ date: string; count: number; revenue: number }>>(`
        SELECT to_char(date_trunc('day', "orderedAt"), 'YYYY-MM-DD') as date,
               count(*) as count,
               coalesce(sum("total"), 0) as revenue
        FROM orders
        WHERE "orderedAt" >= $1
        GROUP BY 1
        ORDER BY 1
      `, since),
    ]);

    const revenue = Number(revenueAgg._sum.total || 0);
    const byMarketplace = byMarketplaceAgg.reduce((acc, m) => {
      acc[m.marketplace as any] = { count: m._count, revenue: Number(m._sum.total || 0) };
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const byDay = (byDayAgg || []).map(r => ({ date: r.date, count: Number(r.count), revenue: Number(r.revenue) }));
    return { total, revenue, byMarketplace, byDay };
  }
}

export const orderSyncManager = new OrderSyncManager();


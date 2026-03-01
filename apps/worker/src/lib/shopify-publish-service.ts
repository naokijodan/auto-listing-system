import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { shopifyApi, calculateShopifyPrice, ShopifyProductData } from './shopify-api';
import { imagePipelineService } from './joom-publish-service';
import { identifyShopifyChannel } from './shopify-channel-identifier';

export interface ShopifyPublishResult {
  success: boolean;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productUrl?: string;
  error?: string;
}

const log = logger.child({ module: 'shopify-publish-service' });

export class ShopifyPublishService {
  // Step 1: ShopifyProduct レコード作成
  async createShopifyListing(enrichmentTaskId: string): Promise<string> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: enrichmentTaskId },
      include: { product: true },
    });

    if (!task) throw new Error(`EnrichmentTask not found: ${enrichmentTaskId}`);
    if (task.status !== 'APPROVED') throw new Error(`Task not approved: ${task.status}`);

    // プレースホルダID（ユニーク確保）
    const placeholderId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // ListingもDRAFTで用意
    const listing = await prisma.listing.upsert({
      where: { productId_marketplace: { productId: task.productId, marketplace: 'SHOPIFY' } },
      create: {
        productId: task.productId,
        marketplace: 'SHOPIFY',
        status: 'DRAFT',
        listingPrice: 0,
        currency: 'USD',
        marketplaceData: {},
      },
      update: {},
    });

    const sp = await prisma.shopifyProduct.create({
      data: {
        integrationId: 'shopify-default',
        shopifyProductId: placeholderId,
        shopifyVariantId: null,
        handle: null,
        productId: task.productId,
        listingId: listing.id,
        syncEnabled: true,
        syncPrice: true,
        syncInventory: true,
        status: 'PENDING',
      },
    });

    log.info({ type: 'shopify_product_record_created', id: sp.id, productId: task.productId });
    return sp.id;
  }

  // Step 2: 画像処理
  async processImagesForListing(shopifyProductDbId: string): Promise<void> {
    const sp = await prisma.shopifyProduct.findUnique({ where: { id: shopifyProductDbId } });
    if (!sp) throw new Error(`ShopifyProduct not found: ${shopifyProductDbId}`);
    if (!sp.productId) throw new Error('ShopifyProduct missing productId');

    const product = await prisma.product.findUnique({ where: { id: sp.productId } });
    if (!product) throw new Error(`Product not found: ${sp.productId}`);

    const imageResult = await imagePipelineService.processImages(product.id, product.images);

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: product.id } });
    if (task) {
      await prisma.enrichmentTask.update({
        where: { id: task.id },
        data: {
          bufferedImages: imageResult.buffered,
          optimizedImages: imageResult.optimized,
          imageStatus: 'COMPLETED',
        },
      });
    }
    log.info({ type: 'shopify_images_processed', shopifyProductDbId, count: imageResult.optimized.length });
  }

  // Step 3: Shopifyに出品
  async publishToShopify(shopifyProductDbId: string): Promise<ShopifyPublishResult> {
    const sp = await prisma.shopifyProduct.findUnique({ where: { id: shopifyProductDbId } });
    if (!sp) return { success: false, error: 'ShopifyProduct not found' };

    const product = sp.productId ? await prisma.product.findUnique({ where: { id: sp.productId } }) : null;
    if (!product) return { success: false, error: 'Product not found for ShopifyProduct' };

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: product.id } });
    if (!task) return { success: false, error: 'EnrichmentTask not found for product' };

    const translations = (task.translations as any) || {};
    const attributes = (task.attributes as any) || {};
    const pricing = (task.pricing as any) || {};

    const originalTitle = translations?.en?.title || product.titleEn || product.title || '';
    const title = this.optimizeTitleForAI(originalTitle, attributes?.brand, attributes?.category);
    const desc = translations?.en?.description || product.descriptionEn || product.description || '';
    const body_html = this.generateAIOptimizedDescription(title, desc, attributes);

    const optimizedImages: string[] = (task.optimizedImages?.length
      ? task.optimizedImages
      : (product.processedImages.length ? product.processedImages : product.images)) || [];

    const priceUsd: number = typeof pricing.finalPriceUsd === 'number'
      ? pricing.finalPriceUsd
      : calculateShopifyPrice(typeof pricing.costJpy === 'number' ? pricing.costJpy : product.price);

    const sku = `RAKUDA-SHOP-${product.id}`;
    const tags = [attributes?.category, attributes?.brand, attributes?.material, attributes?.year]
      .filter(Boolean)
      .map((s: string) => String(s))
      .join(',');

    const data: ShopifyProductData = {
      title,
      body_html,
      vendor: attributes?.brand || undefined,
      product_type: attributes?.category || undefined,
      tags: tags || undefined,
      variants: [
        {
          price: String(priceUsd.toFixed(2)),
          sku,
          inventory_quantity: 1,
          weight: product.weight ? product.weight / 1000 : undefined,
          weight_unit: product.weight ? 'kg' : undefined,
        },
      ],
      images: optimizedImages.slice(0, 10).map((src, i) => ({ src, alt: i === 0 ? title : undefined })),
      metafields: [
        { namespace: 'custom', key: 'brand', value: String(attributes?.brand || ''), type: 'single_line_text_field' },
        { namespace: 'custom', key: 'condition', value: String(attributes?.condition || product.condition || ''), type: 'single_line_text_field' },
        { namespace: 'custom', key: 'made_in', value: 'Japan', type: 'single_line_text_field' },
        ...(attributes?.year ? [{ namespace: 'custom', key: 'year', value: String(attributes.year), type: 'single_line_text_field' }] : []),
      ],
      status: 'active',
    };

    try {
      await prisma.listing.update({
        where: { productId_marketplace: { productId: product.id, marketplace: 'SHOPIFY' } },
        data: { status: 'PUBLISHING' },
      });

      const resp = await shopifyApi.createProduct(data);
      const created = (resp?.product || resp) as any;
      const productId = String(created?.product?.id || created?.id || created?.product_id || '');
      const variantId = String(created?.product?.variants?.[0]?.id || created?.variants?.[0]?.id || '');
      const handle = created?.product?.handle || created?.handle || undefined;

      if (!productId) throw new Error('Failed to create Shopify product');

      const productUrl = handle ? `https://${(await shopifyApi.ensureAccessToken()).shop}/products/${handle}` : undefined;

      await prisma.$transaction([
        prisma.shopifyProduct.update({
          where: { id: sp.id },
          data: {
            shopifyProductId: productId,
            shopifyVariantId: variantId || null,
            handle: handle || null,
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        }),
        prisma.listing.update({
          where: { productId_marketplace: { productId: product.id, marketplace: 'SHOPIFY' } },
          data: {
            marketplaceListingId: productId,
            status: 'ACTIVE',
            listingPrice: priceUsd,
            listedAt: new Date(),
            marketplaceData: {
              title,
              description: body_html,
              images: optimizedImages.slice(0, 10),
              sku,
              variantId,
              handle: handle || null,
            },
          },
        }),
        prisma.marketplaceSyncState.upsert({
          where: { marketplace_productId: { marketplace: 'SHOPIFY', productId: product.id } },
          create: {
            marketplace: 'SHOPIFY',
            productId: product.id,
            listingId: productId,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
            localStock: 1,
            remoteStock: 1,
            localPrice: priceUsd,
            remotePrice: priceUsd,
          },
          update: {
            listingId: productId,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
            localPrice: priceUsd,
            remotePrice: priceUsd,
          },
        }),
      ]);

      log.info({ type: 'shopify_publish_success', productId, variantId });
      return { success: true, shopifyProductId: productId, shopifyVariantId: variantId || undefined, productUrl };
    } catch (error: any) {
      await prisma.listing.update({
        where: { productId_marketplace: { productId: product.id, marketplace: 'SHOPIFY' } },
        data: { status: 'ERROR', errorMessage: error.message },
      });
      log.error({ type: 'shopify_publish_failed', productId: product.id, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // AI検索最適化タイトル生成
  optimizeTitleForAI(originalTitle: string, brand?: string, category?: string): string {
    const parts: string[] = [];
    if (originalTitle) parts.push(originalTitle.trim());
    if (brand) parts.push(String(brand));
    if (category) parts.push(String(category));
    const title = parts.join(' ').replace(/\s+/g, ' ').trim();
    return title.slice(0, 255);
  }

  // AI検索最適化HTML生成
  generateAIOptimizedDescription(title: string, description: string, attributes: any): string {
    const features: string[] = [];
    if (attributes?.brand) features.push(`Brand: ${attributes.brand}`);
    if (attributes?.condition) features.push(`Condition: ${attributes.condition}`);
    if (attributes?.made_in || 'Japan') features.push(`Made in: ${attributes?.made_in || 'Japan'}`);
    if (attributes?.year) features.push(`Year: ${attributes.year}`);

    const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedDesc = (description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `
<div itemscope itemtype="https://schema.org/Product">
  <h1 itemprop="name">${escapedTitle}</h1>
  <div itemprop="description">
    <p>${escapedDesc}</p>
  </div>
  ${features.length ? `<ul>${features.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
  <meta itemprop="brand" content="${attributes?.brand || ''}" />
  <meta itemprop="category" content="${attributes?.category || ''}" />
  ${attributes?.year ? `<meta itemprop="productionDate" content="${attributes.year}" />` : ''}
</div>
    `.trim();
  }
}

export class ShopifyOrderSyncService {
  async syncOrders(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await shopifyApi.getOrders({ status: 'any', created_at_min: since, limit: 50 });
      const orders = res?.orders || res?.data?.orders || [];

      for (const order of orders) {
        try {
          const marketplaceOrderId = String(order.id);
          const channelInfo = identifyShopifyChannel({
            app_id: order.app_id,
            source_name: order.source_name,
            fulfillment_status: order.fulfillment_status,
            financial_status: order.financial_status,
          });
          const subtotal = parseFloat(order.subtotal_price || '0');
          const shipping = parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0');
          const total = parseFloat(order.total_price || '0');
          const currency = order.currency || order.total_price_set?.shop_money?.currency || 'USD';

          const shipTo = order.shipping_address || {};

          const existing = await prisma.order.findUnique({
            where: { marketplace_marketplaceOrderId: { marketplace: 'SHOPIFY', marketplaceOrderId } },
          });

          const saved = await prisma.order.upsert({
            where: { marketplace_marketplaceOrderId: { marketplace: 'SHOPIFY', marketplaceOrderId } },
            create: {
              marketplace: 'SHOPIFY',
              marketplaceOrderId,
              buyerUsername: order.customer?.email || 'unknown',
              buyerEmail: order.email || order.customer?.email || null,
              buyerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || null,
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              tax: parseFloat(order.total_tax || '0'),
              total,
              currency,
              status: 'CONFIRMED',
              paymentStatus: (channelInfo.requiresPaymentCapture
                ? 'AUTHORIZED'
                : (order.financial_status === 'paid' ? 'PAID' : 'PENDING')) as any,
              fulfillmentStatus: (channelInfo.requiresHoldCheck
                ? 'ON_HOLD'
                : (order.fulfillment_status === 'fulfilled' ? 'FULFILLED' : 'UNFULFILLED')) as any,
              sourceChannel: channelInfo.code,
              rawData: order as any,
              orderedAt: new Date(order.created_at),
            },
            update: {
              buyerUsername: order.customer?.email || existing?.buyerUsername || 'unknown',
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              total,
              paymentStatus: (channelInfo.requiresPaymentCapture
                ? 'AUTHORIZED'
                : (order.financial_status === 'paid' ? 'PAID' : (existing?.paymentStatus || 'PENDING'))) as any,
              ...(existing?.sourceChannel ? {} : { sourceChannel: channelInfo.code }),
              rawData: order as any,
            },
          });

          // 売上明細
          const lineItems = order.line_items || [];
          for (const li of lineItems) {
            const sku = li.sku || '';
            let productId: string | null = null;
            const m = sku.match(/^RAKUDA-SHOP-(.+)$/);
            if (m) productId = m[1];

            let listingId: string | undefined;
            if (productId) {
              const lst = await prisma.listing.findFirst({ where: { productId, marketplace: 'SHOPIFY' } });
              if (lst) listingId = lst.id;
            }

            await prisma.sale.create({
              data: {
                orderId: saved.id,
                listingId: listingId || null,
                productId: productId || null,
                sku: sku || String(li.product_id),
                title: li.title || 'Shopify Item',
                quantity: li.quantity || 1,
                unitPrice: parseFloat(li.price || '0'),
                totalPrice: parseFloat(li.price || '0') * (li.quantity || 1),
                marketplaceItemId: String(li.product_id || ''),
              },
            });

            if (productId) {
              await prisma.inventoryEvent.create({
                data: {
                  productId,
                  eventType: 'SALE',
                  quantity: -(li.quantity || 1),
                  prevStock: 1,
                  newStock: 0,
                  marketplace: 'SHOPIFY',
                  orderId: saved.id,
                  reason: 'Order synced from Shopify',
                },
              });
              await prisma.product.update({ where: { id: productId }, data: { status: 'SOLD' } });
            }
          }

          if (!existing) synced++;
        } catch (e: any) {
          errors++;
          log.error({ type: 'shopify_order_sync_item_error', error: e.message });
        }
      }

      log.info({ type: 'shopify_order_sync_complete', synced, errors });
      return { synced, errors };
    } catch (error: any) {
      log.error({ type: 'shopify_order_sync_failed', error: error.message });
      return { synced, errors: errors + 1 };
    }
  }

  async fulfillOrder(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.marketplace !== 'SHOPIFY') throw new Error('Not a Shopify order');

    try {
      await shopifyApi.createFulfillment(order.marketplaceOrderId, trackingNumber, carrier);
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          fulfillmentStatus: 'FULFILLED',
          trackingNumber: trackingNumber,
          trackingCarrier: carrier,
          shippedAt: new Date(),
        },
      });
      log.info({ type: 'shopify_order_fulfilled', orderId, trackingNumber });
    } catch (error: any) {
      log.error({ type: 'shopify_fulfill_order_failed', orderId, error: error.message });
      throw error;
    }
  }
}

export const shopifyPublishService = new ShopifyPublishService();
export const shopifyOrderSyncService = new ShopifyOrderSyncService();

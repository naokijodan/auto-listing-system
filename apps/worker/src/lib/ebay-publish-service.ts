import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { ebayApi, mapConditionToEbay, createEbayApiClient } from './ebay-api';
import { imagePipelineService } from './joom-publish-service';

export interface EbayPublishResult {
  success: boolean;
  ebayListingId?: string;
  ebayOfferId?: string;
  listingUrl?: string;
  error?: string;
}

const log = logger.child({ module: 'ebay-publish-service' });

export class EbayPublishService {
  // Step 1: Listing レコード作成（DRAFT状態）
  async createEbayListing(enrichmentTaskId: string, credentialId?: string): Promise<string> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: enrichmentTaskId },
      include: { product: true },
    });

    if (!task) {
      throw new Error(`EnrichmentTask not found: ${enrichmentTaskId}`);
    }

    if (task.status !== 'APPROVED') {
      throw new Error(`Task not approved: ${task.status}`);
    }

    // 価格の初期値（Enrichmentの計算があれば使用、なければ計算）
    const pricing = (task.pricing as any) || {};
    const baseCostJpy: number = typeof pricing.costJpy === 'number' ? pricing.costJpy : task.product.price;
    const initialPriceUsd: number = typeof pricing.finalPriceUsd === 'number'
      ? pricing.finalPriceUsd
      : this.calculateEbayPrice(baseCostJpy, task.product.weight || undefined);

    let listing;
    if (credentialId) {
      listing = await prisma.listing.findFirst({
        where: {
          productId: task.productId,
          marketplace: 'EBAY',
          credentialId: credentialId,
        } as any,
      });
      if (listing) {
        listing = await prisma.listing.update({
          where: { id: listing.id },
          data: { listingPrice: initialPriceUsd },
        });
      } else {
        listing = await prisma.listing.create({
          data: {
            productId: task.productId,
            marketplace: 'EBAY',
            credentialId: credentialId,
            status: 'DRAFT',
            listingPrice: initialPriceUsd,
            currency: 'USD',
            marketplaceData: {},
          } as any,
        });
      }
    } else {
      // レガシー: credentialId なし
      listing = await prisma.listing.upsert({
        where: {
          productId_marketplace: {
            productId: task.productId,
            marketplace: 'EBAY',
          },
        },
        create: {
          productId: task.productId,
          marketplace: 'EBAY',
          status: 'DRAFT',
          listingPrice: initialPriceUsd,
          currency: 'USD',
          marketplaceData: {},
        },
        update: {
          listingPrice: initialPriceUsd,
        },
      });
    }

    log.info({ type: 'ebay_listing_created', listingId: listing.id, productId: task.productId });
    return listing.id;
  }

  // Step 2: 画像処理（既存のImagePipelineServiceを再利用）
  async processImagesForListing(listingId: string): Promise<void> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: listing.productId } });
    if (!task) {
      throw new Error(`EnrichmentTask not found for product: ${listing.productId}`);
    }

    const imageResult = await imagePipelineService.processImages(listing.productId, listing.product.images);

    await prisma.$transaction([
      prisma.enrichmentTask.update({
        where: { id: task.id },
        data: {
          bufferedImages: imageResult.buffered,
          optimizedImages: imageResult.optimized,
          imageStatus: 'COMPLETED',
        },
      }),
      prisma.listing.update({
        where: { id: listingId },
        data: { status: 'PENDING_PUBLISH' },
      }),
    ]);

    log.info({ type: 'images_processed_for_ebay', listingId, count: imageResult.optimized.length });
  }

  // Step 3: eBayに出品
  async publishToEbay(listingId: string, credentialId?: string): Promise<EbayPublishResult> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }
    if (listing.marketplace !== 'EBAY') {
      return { success: false, error: 'Listing is not for eBay' };
    }

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: listing.productId } });
    if (!task) {
      return { success: false, error: 'EnrichmentTask not found for product' };
    }

    const translations = (task.translations as any) || {};
    const attributes = (task.attributes as any) || {};
    const pricing = (task.pricing as any) || {};

    const title = translations?.en?.title || listing.product.titleEn || listing.product.title;
    const description = translations?.en?.description || listing.product.descriptionEn || listing.product.description || '';
    const aspectBrand = attributes?.brand ? [attributes.brand] : undefined;
    const itemSpecifics: Record<string, string[]> = {
      ...(attributes?.itemSpecifics || {}),
      ...(aspectBrand ? { Brand: aspectBrand } : {}),
    };

    const optimizedImages: string[] = task.optimizedImages && task.optimizedImages.length > 0
      ? task.optimizedImages
      : (listing.product.processedImages.length > 0 ? listing.product.processedImages : listing.product.images);
    const imageUrls = optimizedImages.slice(0, 12);

    const condition = mapConditionToEbay(attributes?.condition || listing.product.condition || undefined);
    const priceUsd: number = typeof pricing.finalPriceUsd === 'number'
      ? pricing.finalPriceUsd
      : this.calculateEbayPrice(typeof pricing.costJpy === 'number' ? pricing.costJpy : listing.product.price, listing.product.weight || undefined);

    // ポリシーID（環境変数）
    const fulfillmentPolicyId = process.env.EBAY_FULFILLMENT_POLICY_ID;
    const paymentPolicyId = process.env.EBAY_PAYMENT_POLICY_ID;
    const returnPolicyId = process.env.EBAY_RETURN_POLICY_ID;

    const apiClient = credentialId ? createEbayApiClient(credentialId) : ebayApi;

    try {
      await prisma.listing.update({ where: { id: listingId }, data: { status: 'PUBLISHING' } });

      // Step 1: Inventory Item
      const sku = `RAKUDA-EBAY-${listing.productId}`;
      const invRes = await apiClient.createOrUpdateInventoryItem(sku, {
        title,
        description,
        aspects: itemSpecifics,
        imageUrls,
        condition,
      });
      if (!invRes.success) {
        throw new Error(invRes.error?.message || 'Failed to create inventory item');
      }

      // カテゴリID取得
      const sourceCategory = attributes?.category || listing.product.category || '';
      const categoryId = await apiClient.getCategoryId(sourceCategory, title, description);
      if (!categoryId) {
        throw new Error('Failed to resolve eBay category');
      }

      // Step 2: Offer
      const offerRes = await apiClient.createOffer(sku, {
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        categoryId,
        pricingPrice: priceUsd,
        pricingCurrency: 'USD',
        quantity: 1,
        listingDescription: description,
        fulfillmentPolicyId: fulfillmentPolicyId || undefined,
        paymentPolicyId: paymentPolicyId || undefined,
        returnPolicyId: returnPolicyId || undefined,
      });
      if (!offerRes.success || !offerRes.data?.offerId) {
        throw new Error(offerRes.error?.message || 'Failed to create eBay offer');
      }

      const offerId = offerRes.data.offerId;

      // Step 3: Publish
      const pubRes = await apiClient.publishOffer(offerId);
      if (!pubRes.success || !pubRes.data?.listingId) {
        throw new Error(pubRes.error?.message || 'Failed to publish offer');
      }

      const ebayListingId = pubRes.data.listingId;

      await prisma.listing.update({
        where: { id: listingId },
        data: {
          status: 'ACTIVE',
          marketplaceListingId: ebayListingId,
          listedAt: new Date(),
          listingPrice: priceUsd,
          marketplaceData: {
            ...(listing.marketplaceData as any || {}),
            sku,
            offerId,
            categoryId,
            title,
            description,
            itemSpecifics,
            images: imageUrls,
            fulfillmentPolicyId,
            paymentPolicyId,
            returnPolicyId,
          },
        },
      });

      log.info({ type: 'ebay_publish_success', listingId, ebayListingId, offerId });

      return {
        success: true,
        ebayListingId,
        ebayOfferId: offerId,
        listingUrl: `https://www.ebay.com/itm/${ebayListingId}`,
      };
    } catch (error: any) {
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      });

      log.error({ type: 'ebay_publish_failed', listingId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // 価格計算（仕入価格JPY → 出品価格USD）
  calculateEbayPrice(costJpy: number, weight?: number): number {
    const usdCost = costJpy / 150; // 為替レート（DB or デフォルト）
    const withProfit = usdCost * 1.3; // 30%利益
    const withFees = withProfit / (1 - 0.1325); // eBay手数料逆算
    return Math.ceil(withFees * 100) / 100; // セント単位で切り上げ
  }
}

// eBay注文同期
export class EbayOrderSyncService {
  async syncOrders(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await ebayApi.getOrders({ creationDateFrom: since, limit: 50, offset: 0 });
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to fetch orders from eBay');
      }

      for (const order of res.data.orders) {
        try {
          const marketplaceOrderId = order.orderId;

          // Upsert Order
          const subtotal = parseFloat(order.pricingSummary?.priceSubtotal?.value || '0');
          const shipping = parseFloat(order.pricingSummary?.deliveryCost?.value || '0');
          const total = parseFloat(order.pricingSummary?.total?.value || '0');

          const shipTo = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress || {};

          const existing = await prisma.order.findUnique({
            where: { marketplace_marketplaceOrderId: { marketplace: 'EBAY', marketplaceOrderId } },
          });

          const saved = await prisma.order.upsert({
            where: { marketplace_marketplaceOrderId: { marketplace: 'EBAY', marketplaceOrderId } },
            create: {
              marketplace: 'EBAY',
              marketplaceOrderId,
              buyerUsername: order.buyer?.username || 'unknown',
              buyerEmail: null,
              buyerName: order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.fullName || null,
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              tax: 0,
              total,
              currency: order.pricingSummary?.total?.currency || 'USD',
              status: 'CONFIRMED',
              paymentStatus: order.orderPaymentStatus === 'PAID' ? 'PAID' : 'PENDING',
              fulfillmentStatus: 'UNFULFILLED',
              rawData: order as any,
              orderedAt: new Date(order.creationDate),
            },
            update: {
              buyerUsername: order.buyer?.username || existing?.buyerUsername || 'unknown',
              shippingAddress: shipTo as any,
              subtotal,
              shippingCost: shipping,
              total,
              paymentStatus: order.orderPaymentStatus === 'PAID' ? 'PAID' : existing?.paymentStatus || 'PENDING',
              rawData: order as any,
            },
          });

          // Create Sale records for line items
          const lineItems = order.lineItems || [];
          for (const li of lineItems) {
            const sku = li.sku || '';
            const productId = this.extractProductIdFromSku(sku);

            // Try to link listing by productId
            let listingId: string | undefined;
            if (productId) {
              const lst = await prisma.listing.findFirst({
                where: { productId, marketplace: 'EBAY' },
              });
              if (lst) listingId = lst.id;
            }

            await prisma.sale.create({
              data: {
                orderId: saved.id,
                listingId: listingId || null,
                productId: productId || null,
                sku: sku || (li.legacyItemId || ''),
                title: li.title || 'eBay Item',
                quantity: li.quantity || 1,
                unitPrice: li.lineItemCost ? parseFloat(li.lineItemCost.value) : subtotal,
                totalPrice: li.lineItemCost ? parseFloat(li.lineItemCost.value) : subtotal,
                marketplaceItemId: li.legacyItemId || undefined,
              },
            });

            // Inventory event (sale)
            if (productId) {
              await prisma.inventoryEvent.create({
                data: {
                  productId,
                  eventType: 'SALE',
                  quantity: -(li.quantity || 1),
                  prevStock: 1,
                  newStock: 0,
                  marketplace: 'EBAY',
                  orderId: saved.id,
                  reason: 'Order synced from eBay',
                },
              });

              // Update product status to SOLD (single-quantity assumption)
              await prisma.product.update({ where: { id: productId }, data: { status: 'SOLD' } });
            }
          }

          if (!existing) synced++;
        } catch (e: any) {
          errors++;
          log.error({ type: 'ebay_order_sync_item_error', error: e.message });
        }
      }

      log.info({ type: 'ebay_order_sync_complete', synced, errors });
      return { synced, errors };
    } catch (error: any) {
      log.error({ type: 'ebay_order_sync_failed', error: error.message });
      return { synced, errors: errors + 1 };
    }
  }

  async fulfillOrder(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    if (order.marketplace !== 'EBAY') {
      throw new Error('Not an eBay order');
    }

    try {
      const raw: any = order.rawData || {};
      const lineItemId: string | undefined = raw?.lineItems?.[0]?.lineItemId;
      if (!lineItemId) {
        throw new Error('lineItemId not found in order.rawData');
      }

      const res = await ebayApi.shipOrder(order.marketplaceOrderId, lineItemId, {
        trackingNumber,
        shippingCarrier: carrier,
      });

      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to mark as shipped on eBay');
      }

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

      log.info({ type: 'ebay_order_fulfilled', orderId, trackingNumber });
    } catch (error: any) {
      log.error({ type: 'ebay_fulfill_order_failed', orderId, error: error.message });
      throw error;
    }
  }

  private extractProductIdFromSku(sku?: string | null): string | null {
    if (!sku) return null;
    // Expected format: RAKUDA-EBAY-{productId}
    const m = sku.match(/^RAKUDA-EBAY-(.+)$/);
    return m ? m[1] : null;
  }
}

export const ebayPublishService = new EbayPublishService();
export const ebayOrderSyncService = new EbayOrderSyncService();

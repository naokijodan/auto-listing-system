import { Job } from 'bullmq';
import { prisma, Marketplace, OrderStatus, PaymentStatus, FulfillmentStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { JoomApiClient } from '../lib/joom-api';
import { EbayApiClient, EbayOrder } from '../lib/ebay-api';

const log = logger.child({ processor: 'order-sync' });

// APIクライアントのシングルトン
let joomClient: JoomApiClient | null = null;
let ebayClient: EbayApiClient | null = null;

function getJoomClient(): JoomApiClient {
  if (!joomClient) {
    joomClient = new JoomApiClient();
  }
  return joomClient;
}

function getEbayClient(): EbayApiClient {
  if (!ebayClient) {
    ebayClient = new EbayApiClient();
  }
  return ebayClient;
}

export interface OrderSyncJobPayload {
  marketplace: 'joom' | 'ebay';
  sinceDays?: number; // 何日前からの注文を取得するか
  maxOrders?: number;
}

export interface OrderSyncJobResult {
  success: boolean;
  message: string;
  summary: {
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
  };
  orders: Array<{
    marketplaceOrderId: string;
    status: 'created' | 'updated' | 'skipped' | 'error';
    reason?: string;
  }>;
  timestamp: string;
}

// Joom注文のレスポンス型
interface JoomOrder {
  id: string;
  orderId?: string;
  order_id?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
  total?: {
    amount: number;
    currency: string;
  };
  totalAmount?: number;
  shipping?: {
    cost?: number;
    address?: {
      name?: string;
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      postal_code?: string;
    };
  };
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    postal_code?: string;
  };
  buyer?: {
    username?: string;
    name?: string;
  };
  buyerUsername?: string;
  items?: Array<{
    productId?: string;
    product_id?: string;
    sku?: string;
    title?: string;
    name?: string;
    quantity?: number;
    price?: number;
    unitPrice?: number;
    unit_price?: number;
  }>;
}

/**
 * Joomの注文ステータスをシステムステータスにマッピング
 */
function mapJoomStatus(joomStatus: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'pending': OrderStatus.PENDING,
    'approved': OrderStatus.CONFIRMED,
    'in_transit': OrderStatus.SHIPPED,
    'shipped': OrderStatus.SHIPPED,
    'delivered': OrderStatus.DELIVERED,
    'cancelled': OrderStatus.CANCELLED,
    'refunded': OrderStatus.REFUNDED,
  };
  return statusMap[joomStatus.toLowerCase()] || OrderStatus.PENDING;
}

/**
 * Joomの支払いステータスをマッピング
 */
function mapJoomPaymentStatus(joomStatus: string): PaymentStatus {
  const paidStatuses = ['approved', 'in_transit', 'shipped', 'delivered'];
  return paidStatuses.includes(joomStatus.toLowerCase()) ? PaymentStatus.PAID : PaymentStatus.PENDING;
}

/**
 * eBayの注文ステータスをシステムステータスにマッピング
 */
function mapEbayStatus(fulfillmentStatus: string, paymentStatus: string): OrderStatus {
  // eBay Fulfillment Status: NOT_STARTED, IN_PROGRESS, FULFILLED
  // eBay Payment Status: PENDING, PAID, FAILED
  if (fulfillmentStatus === 'FULFILLED') {
    return OrderStatus.DELIVERED;
  }
  if (fulfillmentStatus === 'IN_PROGRESS') {
    return OrderStatus.SHIPPED;
  }
  if (paymentStatus === 'PAID') {
    return OrderStatus.CONFIRMED;
  }
  if (paymentStatus === 'FAILED') {
    return OrderStatus.CANCELLED;
  }
  return OrderStatus.PENDING;
}

/**
 * eBayの支払いステータスをマッピング
 */
function mapEbayPaymentStatus(paymentStatus: string): PaymentStatus {
  if (paymentStatus === 'PAID') {
    return PaymentStatus.PAID;
  }
  if (paymentStatus === 'FAILED') {
    return PaymentStatus.FAILED;
  }
  return PaymentStatus.PENDING;
}

/**
 * 注文同期プロセッサー
 */
export async function processOrderSyncJob(
  job: Job<OrderSyncJobPayload>
): Promise<OrderSyncJobResult> {
  const {
    marketplace,
    sinceDays = 7,
    maxOrders = 100,
  } = job.data;

  log.info({
    type: 'order_sync_start',
    jobId: job.id,
    marketplace,
    sinceDays,
    maxOrders,
  });

  const orders: OrderSyncJobResult['orders'] = [];
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    if (marketplace !== 'joom' && marketplace !== 'ebay') {
      return {
        success: false,
        message: 'Supported marketplaces: joom, ebay',
        summary: {
          totalFetched: 0,
          totalCreated: 0,
          totalUpdated: 0,
          totalSkipped: 0,
          totalErrors: 0,
        },
        orders: [],
        timestamp: new Date().toISOString(),
      };
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    const dbMarketplace = marketplace === 'joom' ? 'JOOM' : 'EBAY';

    let fetchedOrders: Array<JoomOrder | EbayOrder> = [];

    if (marketplace === 'joom') {
      // Joomから注文を取得
      const joom = getJoomClient();
      const response = await joom.getOrders({
        since: sinceDate.toISOString(),
        limit: maxOrders,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch orders from Joom');
      }
      fetchedOrders = response.data.orders || [];
    } else {
      // eBayから注文を取得
      const ebay = getEbayClient();
      const response = await ebay.getOrders({
        creationDateFrom: sinceDate.toISOString(),
        limit: maxOrders,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch orders from eBay');
      }
      fetchedOrders = response.data.orders || [];
    }

    log.info({
      type: 'order_sync_fetched',
      marketplace,
      count: fetchedOrders.length,
    });

    for (const fetchedOrder of fetchedOrders) {
      let marketplaceOrderId: string;
      let orderStatus: OrderStatus;
      let paymentStatus: PaymentStatus;
      let shippingAddress: Record<string, string>;
      let total: number;
      let shippingCost: number;
      let subtotal: number;
      let buyerUsername: string;
      let buyerName: string;
      let orderedAt: Date;
      let currency: string;
      let marketplaceFee: number;
      let items: Array<{ sku: string; title: string; quantity: number; unitPrice: number }> = [];

      if (marketplace === 'joom') {
        const joomOrder = fetchedOrder as JoomOrder;
        marketplaceOrderId = joomOrder.orderId || joomOrder.order_id || joomOrder.id;
        orderStatus = mapJoomStatus(joomOrder.status);
        paymentStatus = mapJoomPaymentStatus(joomOrder.status);

        const shippingAddr = joomOrder.shippingAddress || joomOrder.shipping?.address || {};
        shippingAddress = {
          street: shippingAddr.street || '',
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          country: shippingAddr.country || '',
          postalCode: shippingAddr.postalCode || shippingAddr.postal_code || '',
        };

        total = joomOrder.total?.amount || joomOrder.totalAmount || 0;
        shippingCost = joomOrder.shipping?.cost || 0;
        subtotal = total - shippingCost;
        buyerUsername = joomOrder.buyer?.username || joomOrder.buyerUsername || 'unknown';
        buyerName = joomOrder.buyer?.name || '';
        orderedAt = new Date(joomOrder.createdAt || joomOrder.created_at || Date.now());
        currency = joomOrder.total?.currency || 'USD';
        marketplaceFee = total * 0.15; // Joom手数料 15%推定

        if (joomOrder.items) {
          items = joomOrder.items.map(item => ({
            sku: item.sku || item.productId || item.product_id || 'unknown',
            title: item.title || item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.unit_price || item.price || 0,
          }));
        }
      } else {
        const ebayOrder = fetchedOrder as EbayOrder;
        marketplaceOrderId = ebayOrder.orderId;
        orderStatus = mapEbayStatus(ebayOrder.orderFulfillmentStatus, ebayOrder.orderPaymentStatus);
        paymentStatus = mapEbayPaymentStatus(ebayOrder.orderPaymentStatus);

        const shipTo = ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
        const contactAddress = shipTo?.contactAddress || {};
        shippingAddress = {
          street: contactAddress.addressLine1 || '',
          city: contactAddress.city || '',
          state: contactAddress.stateOrProvince || '',
          country: contactAddress.countryCode || '',
          postalCode: contactAddress.postalCode || '',
        };

        total = parseFloat(ebayOrder.pricingSummary?.total?.value || '0');
        shippingCost = parseFloat(ebayOrder.pricingSummary?.deliveryCost?.value || '0');
        subtotal = parseFloat(ebayOrder.pricingSummary?.priceSubtotal?.value || '0');
        buyerUsername = ebayOrder.buyer?.username || 'unknown';
        buyerName = shipTo?.fullName || '';
        orderedAt = new Date(ebayOrder.creationDate);
        currency = ebayOrder.pricingSummary?.total?.currency || 'USD';
        marketplaceFee = total * 0.13; // eBay手数料 13%推定

        if (ebayOrder.lineItems) {
          items = ebayOrder.lineItems.map(item => ({
            sku: item.sku || item.legacyItemId || 'unknown',
            title: item.title || 'Unknown Item',
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.lineItemCost?.value || '0'),
          }));
        }
      }

      try {
        // 既存の注文を確認
        const existingOrder = await prisma.order.findFirst({
          where: {
            marketplace: dbMarketplace as Marketplace,
            marketplaceOrderId,
          },
        });

        if (existingOrder) {
          // ステータスが変わっていたら更新
          if (existingOrder.status !== orderStatus) {
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: {
                status: orderStatus,
                paymentStatus,
              },
            });

            orders.push({
              marketplaceOrderId,
              status: 'updated',
              reason: `Status changed: ${existingOrder.status} -> ${orderStatus}`,
            });
            totalUpdated++;
          } else {
            orders.push({
              marketplaceOrderId,
              status: 'skipped',
              reason: 'No changes',
            });
            totalSkipped++;
          }
        } else {
          // 新規注文を作成
          const createdOrder = await prisma.order.create({
            data: {
              marketplace: dbMarketplace as Marketplace,
              marketplaceOrderId,
              status: orderStatus,
              paymentStatus,
              fulfillmentStatus: orderStatus === OrderStatus.SHIPPED || orderStatus === OrderStatus.DELIVERED ? FulfillmentStatus.FULFILLED : FulfillmentStatus.UNFULFILLED,
              buyerUsername,
              buyerName,
              shippingAddress,
              subtotal,
              shippingCost,
              tax: 0,
              marketplaceFee,
              total,
              currency,
              orderedAt,
            },
          });

          // 売上明細を作成
          for (const item of items) {
            await prisma.sale.create({
              data: {
                orderId: createdOrder.id,
                sku: item.sku,
                title: item.title,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
              },
            });
          }

          orders.push({
            marketplaceOrderId,
            status: 'created',
          });
          totalCreated++;

          log.info({
            type: 'order_created',
            marketplace,
            orderId: createdOrder.id,
            marketplaceOrderId,
            total,
          });
        }
      } catch (error: any) {
        orders.push({
          marketplaceOrderId,
          status: 'error',
          reason: error.message,
        });
        totalErrors++;

        log.error({
          type: 'order_sync_error',
          marketplace,
          marketplaceOrderId,
          error: error.message,
        });
      }
    }

    // 通知作成
    const marketplaceName = marketplace === 'joom' ? 'Joom' : 'eBay';
    if (totalCreated > 0) {
      await prisma.notification.create({
        data: {
          type: 'ORDER_RECEIVED',
          title: '新規注文を同期',
          message: `${marketplaceName}から${totalCreated}件の新規注文を同期しました`,
          severity: 'INFO',
          metadata: {
            marketplace: dbMarketplace,
            totalCreated,
            totalUpdated,
          },
        },
      });
    }

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `order-sync-${Date.now()}`,
        queueName: 'orders',
        jobType: 'ORDER_SYNC',
        status: 'COMPLETED',
        result: {
          marketplace,
          totalFetched: fetchedOrders.length,
          totalCreated,
          totalUpdated,
          totalSkipped,
          totalErrors,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'order_sync_complete',
      marketplace,
      totalFetched: fetchedOrders.length,
      totalCreated,
      totalUpdated,
      totalSkipped,
      totalErrors,
    });

    return {
      success: true,
      message: `Order sync completed: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`,
      summary: {
        totalFetched: fetchedOrders.length,
        totalCreated,
        totalUpdated,
        totalSkipped,
        totalErrors,
      },
      orders: orders.slice(0, 50),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'order_sync_fatal_error',
      error: error.message,
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `order-sync-${Date.now()}`,
        queueName: 'orders',
        jobType: 'ORDER_SYNC',
        status: 'FAILED',
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    throw error;
  }
}

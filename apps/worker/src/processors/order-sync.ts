import { Job } from 'bullmq';
import { prisma, Marketplace, OrderStatus, PaymentStatus, FulfillmentStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { JoomApiClient } from '../lib/joom-api';

const log = logger.child({ processor: 'order-sync' });

// Joom APIクライアントのシングルトン
let joomClient: JoomApiClient | null = null;
function getJoomClient(): JoomApiClient {
  if (!joomClient) {
    joomClient = new JoomApiClient();
  }
  return joomClient;
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
    if (marketplace !== 'joom') {
      // eBay対応は後日
      return {
        success: false,
        message: 'Only Joom marketplace is currently supported',
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

    // Joomから注文を取得
    const joom = getJoomClient();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);

    const response = await joom.getOrders({
      since: sinceDate.toISOString(),
      limit: maxOrders,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch orders from Joom');
    }

    const joomOrders = response.data.orders || [];
    log.info({
      type: 'order_sync_fetched',
      count: joomOrders.length,
    });

    for (const joomOrder of joomOrders) {
      const marketplaceOrderId = joomOrder.orderId || joomOrder.order_id || joomOrder.id;

      try {
        // 既存の注文を確認
        const existingOrder = await prisma.order.findFirst({
          where: {
            marketplace: 'JOOM',
            marketplaceOrderId,
          },
        });

        const orderStatus = mapJoomStatus(joomOrder.status);
        const paymentStatus = mapJoomPaymentStatus(joomOrder.status);

        // 配送先住所
        const shippingAddr = joomOrder.shippingAddress || joomOrder.shipping?.address || {};
        const shippingAddress = {
          street: shippingAddr.street || '',
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          country: shippingAddr.country || '',
          postalCode: shippingAddr.postalCode || shippingAddr.postal_code || '',
        };

        // 金額計算
        const total = joomOrder.total?.amount || joomOrder.totalAmount || 0;
        const shippingCost = joomOrder.shipping?.cost || 0;
        const subtotal = total - shippingCost;

        // 購入者情報
        const buyerUsername = joomOrder.buyer?.username || joomOrder.buyerUsername || 'unknown';
        const buyerName = joomOrder.buyer?.name || '';

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
          const orderedAt = new Date(joomOrder.createdAt || joomOrder.created_at || Date.now());

          const createdOrder = await prisma.order.create({
            data: {
              marketplace: 'JOOM' as Marketplace,
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
              marketplaceFee: total * 0.15, // Joom手数料 15%推定
              total,
              currency: joomOrder.total?.currency || 'USD',
              orderedAt,
            },
          });

          // 売上明細を作成
          if (joomOrder.items && joomOrder.items.length > 0) {
            for (const item of joomOrder.items) {
              const unitPrice = item.unitPrice || item.unit_price || item.price || 0;
              const quantity = item.quantity || 1;

              await prisma.sale.create({
                data: {
                  orderId: createdOrder.id,
                  sku: item.sku || item.productId || item.product_id || 'unknown',
                  title: item.title || item.name || 'Unknown Item',
                  quantity,
                  unitPrice,
                  totalPrice: unitPrice * quantity,
                },
              });
            }
          }

          orders.push({
            marketplaceOrderId,
            status: 'created',
          });
          totalCreated++;

          log.info({
            type: 'order_created',
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
          marketplaceOrderId,
          error: error.message,
        });
      }
    }

    // 通知作成
    if (totalCreated > 0) {
      await prisma.notification.create({
        data: {
          type: 'ORDER_RECEIVED',
          title: '新規注文を同期',
          message: `Joomから${totalCreated}件の新規注文を同期しました`,
          severity: 'INFO',
          metadata: {
            marketplace: 'JOOM',
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
          totalFetched: joomOrders.length,
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
      totalFetched: joomOrders.length,
      totalCreated,
      totalUpdated,
      totalSkipped,
      totalErrors,
    });

    return {
      success: true,
      message: `Order sync completed: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`,
      summary: {
        totalFetched: joomOrders.length,
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

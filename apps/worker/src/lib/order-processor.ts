/**
 * Phase 51: 注文処理サービス
 *
 * Joom/eBayからの注文を受信した際の自動処理を担当:
 * - 在庫自動減算
 * - 仕入れ元への確認・発注依頼
 * - Slackアラート
 * - 発送期限監視
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { sendNotification } from './notification-service';
import { alertManager } from './slack-alert';
import { joomApi } from './joom-api';

const log = logger.child({ module: 'order-processor' });

// 発送期限（日数）
const SHIPMENT_DEADLINE_DAYS = {
  JOOM: 5, // Joomは5営業日以内に発送
  EBAY: 3, // eBayは3営業日以内に発送
};

export interface OrderProcessingResult {
  success: boolean;
  orderId: string;
  actions: {
    inventoryUpdated: boolean;
    sourcingRequested: boolean;
    slackNotified: boolean;
    shipmentDeadlineSet: boolean;
  };
  errors: string[];
}

/**
 * 注文を処理（在庫減算、仕入れ確認、通知）
 */
export async function processOrder(orderId: string): Promise<OrderProcessingResult> {
  const result: OrderProcessingResult = {
    success: true,
    orderId,
    actions: {
      inventoryUpdated: false,
      sourcingRequested: false,
      slackNotified: false,
      shipmentDeadlineSet: false,
    },
    errors: [],
  };

  try {
    // 注文データを取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sales: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    log.info({
      type: 'order_processing_start',
      orderId: order.id,
      marketplace: order.marketplace,
      marketplaceOrderId: order.marketplaceOrderId,
      itemCount: order.sales.length,
    });

    // 1. 在庫減算
    try {
      await updateInventory(order);
      result.actions.inventoryUpdated = true;
    } catch (error) {
      result.errors.push(`Inventory update failed: ${(error as Error).message}`);
      log.error({ orderId, error }, 'Inventory update failed');
    }

    // 2. 仕入れ元確認・発注依頼
    try {
      await checkSourcingAvailability(order);
      result.actions.sourcingRequested = true;
    } catch (error) {
      result.errors.push(`Sourcing check failed: ${(error as Error).message}`);
      log.error({ orderId, error }, 'Sourcing check failed');
    }

    // 3. 発送期限設定
    try {
      await setShipmentDeadline(order);
      result.actions.shipmentDeadlineSet = true;
    } catch (error) {
      result.errors.push(`Shipment deadline failed: ${(error as Error).message}`);
      log.error({ orderId, error }, 'Shipment deadline failed');
    }

    // 4. Slack通知
    try {
      await notifyNewOrder(order);
      result.actions.slackNotified = true;
    } catch (error) {
      result.errors.push(`Slack notification failed: ${(error as Error).message}`);
      log.error({ orderId, error }, 'Slack notification failed');
    }

    // 処理結果を更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
        rawData: {
          ...(order.rawData as object || {}),
          processingResult: JSON.parse(JSON.stringify(result)),
          processedAt: new Date().toISOString(),
        },
      },
    });

    result.success = result.errors.length === 0;

    log.info({
      type: 'order_processing_complete',
      orderId,
      result,
    });

    return result;
  } catch (error) {
    log.error({ orderId, error }, 'Order processing failed');
    result.success = false;
    result.errors.push((error as Error).message);
    return result;
  }
}

/**
 * 在庫を減算（商品ステータスを更新）
 */
async function updateInventory(order: any): Promise<void> {
  for (const sale of order.sales) {
    if (!sale.productId) {
      log.warn({ saleId: sale.id }, 'Sale has no linked product, skipping inventory update');
      continue;
    }

    const product = await prisma.product.findUnique({
      where: { id: sale.productId },
    });
    if (!product) {
      continue;
    }

    // 商品ステータスをSOLDに更新（単品販売の場合）
    // 複数在庫管理は将来のPhaseで実装
    await prisma.product.update({
      where: { id: product.id },
      data: {
        status: 'SOLD',
      },
    });

    log.info({
      type: 'inventory_updated',
      productId: product.id,
      soldQuantity: sale.quantity,
      newStatus: 'SOLD',
    });

    // リスティングを一時停止
    await pauseListingsForProduct(product.id);
  }
}

/**
 * 在庫切れ商品のリスティングを一時停止
 */
async function pauseListingsForProduct(productId: string): Promise<void> {
  const listings = await prisma.listing.findMany({
    where: {
      productId,
      status: 'ACTIVE',
    },
  });

  for (const listing of listings) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: 'PAUSED' },
    });

    // Joomの場合、APIで無効化
    if (listing.marketplace === 'JOOM' && listing.marketplaceListingId) {
      try {
        await joomApi.disableProduct(listing.marketplaceListingId);
        log.info({
          type: 'joom_listing_disabled',
          listingId: listing.id,
          joomProductId: listing.marketplaceListingId,
        });
      } catch (error) {
        log.error({ listingId: listing.id, error }, 'Failed to disable Joom listing');
      }
    }
  }

  // 在庫切れ通知
  await prisma.notification.create({
    data: {
      type: 'OUT_OF_STOCK',
      title: '在庫切れ',
      message: `商品ID: ${productId} の在庫が切れました。リスティングを一時停止しました。`,
      severity: 'WARNING',
      productId,
      metadata: {
        pausedListings: listings.map((l) => l.id),
      },
    },
  });
}

/**
 * 仕入れ元の在庫確認・発注依頼
 */
async function checkSourcingAvailability(order: any): Promise<void> {
  for (const sale of order.sales) {
    const product = sale.product;
    if (!product) {
      continue;
    }

    // 仕入れ元情報を取得
    const sourceUrl = product.sourceUrl;
    if (!sourceUrl) {
      log.info({ productId: product.id }, 'No source URL, skipping sourcing check');
      continue;
    }

    // 仕入れリクエストを作成
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: '仕入れ確認が必要',
        message: `注文 ${order.marketplaceOrderId} の商品「${product.title}」の仕入れを確認してください`,
        severity: 'INFO',
        productId: product.id,
        metadata: {
          orderId: order.id,
          marketplaceOrderId: order.marketplaceOrderId,
          sourceUrl,
          quantity: sale.quantity,
          costPrice: product.price,
        },
      },
    });

    log.info({
      type: 'sourcing_request_created',
      orderId: order.id,
      productId: product.id,
      sourceUrl,
    });
  }
}

/**
 * 発送期限を設定
 */
async function setShipmentDeadline(order: any): Promise<void> {
  const marketplace = order.marketplace as 'JOOM' | 'EBAY';
  const deadlineDays = SHIPMENT_DEADLINE_DAYS[marketplace] || 5;

  // 営業日を考慮した期限計算（土日を除く）
  const deadline = calculateBusinessDays(new Date(), deadlineDays);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      rawData: {
        ...(order.rawData as object || {}),
        shipmentDeadline: deadline.toISOString(),
        shipmentDeadlineDays: deadlineDays,
      },
    },
  });

  log.info({
    type: 'shipment_deadline_set',
    orderId: order.id,
    deadline,
    deadlineDays,
  });
}

/**
 * 営業日を計算（土日を除く）
 */
function calculateBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 土日（0, 6）はスキップ
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  return result;
}

/**
 * 新規注文をSlackに通知
 */
async function notifyNewOrder(order: any): Promise<void> {
  const items = order.sales.map((s: any) => `• ${s.title} x${s.quantity}`).join(', ');

  const shippingAddress = order.shippingAddress as any;
  const addressString = shippingAddress
    ? `${shippingAddress.city || ''}, ${shippingAddress.country || ''}`
    : 'Unknown';

  await alertManager.sendCustomAlert(
    'info',
    '新規注文受付',
    `${order.marketplace}で新しい注文を受け付けました`,
    [
      { title: '注文ID', value: order.marketplaceOrderId },
      { title: '購入者', value: order.buyerName || order.buyerUsername },
      { title: '配送先', value: addressString },
      { title: '合計', value: `${order.total} ${order.currency}` },
      { title: '商品', value: items.slice(0, 100) },
    ]
  );
}

/**
 * 注文詳細URLを生成
 */
function getOrderDetailUrl(order: any): string {
  const baseUrl = process.env.WEB_URL || 'http://localhost:3002';
  return `${baseUrl}/orders/${order.id}`;
}

/**
 * 発送期限が近い注文を取得
 */
export async function getOrdersNearingDeadline(hours: number = 24): Promise<any[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'CONFIRMED', 'PROCESSING'],
      },
      fulfillmentStatus: 'UNFULFILLED',
    },
    include: {
      sales: true,
    },
  });

  // 発送期限が近い注文をフィルター
  return orders.filter((order) => {
    const rawData = order.rawData as any;
    if (!rawData?.shipmentDeadline) {
      return false;
    }
    const deadline = new Date(rawData.shipmentDeadline);
    return deadline <= threshold;
  });
}

/**
 * 発送期限アラートを送信
 */
export async function sendDeadlineAlerts(): Promise<void> {
  const urgentOrders = await getOrdersNearingDeadline(24);

  for (const order of urgentOrders) {
    const rawData = order.rawData as any;
    const deadline = new Date(rawData.shipmentDeadline);
    const hoursRemaining = Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60));

    // 既にアラート済みかチェック
    const existingAlert = await prisma.notification.findFirst({
      where: {
        type: 'SYSTEM',
        title: '発送期限が近づいています',
        createdAt: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12時間以内
        },
      },
    });

    if (existingAlert) {
      continue;
    }

    // アラート作成
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: '発送期限が近づいています',
        message: `注文 ${order.marketplaceOrderId} (${order.marketplace}) の発送期限まで残り${hoursRemaining}時間です`,
        severity: hoursRemaining <= 12 ? 'ERROR' : 'WARNING',
        metadata: {
          orderId: order.id,
          marketplaceOrderId: order.marketplaceOrderId,
          marketplace: order.marketplace,
          deadline: deadline.toISOString(),
          hoursRemaining,
        },
      },
    });

    // Slack通知
    await alertManager.sendCustomAlert(
      hoursRemaining <= 12 ? 'error' : 'warning',
      '発送期限アラート',
      `注文 ${order.marketplaceOrderId} (${order.marketplace}) の発送期限まで残り ${hoursRemaining}時間 です！`,
      [
        { title: '注文ID', value: order.marketplaceOrderId },
        { title: 'マーケットプレイス', value: order.marketplace },
        { title: '残り時間', value: `${hoursRemaining}時間` },
      ]
    );

    log.info({
      type: 'deadline_alert_sent',
      orderId: order.id,
      hoursRemaining,
    });
  }
}

/**
 * 注文の仕入れステータスを更新
 */
export async function updateSourcingStatus(
  orderId: string,
  status: 'CONFIRMED' | 'ORDERED' | 'RECEIVED' | 'UNAVAILABLE',
  notes?: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const rawData = order.rawData as any || {};

  await prisma.order.update({
    where: { id: orderId },
    data: {
      rawData: {
        ...rawData,
        sourcingStatus: status,
        sourcingNotes: notes,
        sourcingUpdatedAt: new Date().toISOString(),
      },
    },
  });

  log.info({
    type: 'sourcing_status_updated',
    orderId,
    status,
    notes,
  });

  // 仕入れ不可の場合は注文キャンセル検討通知
  if (status === 'UNAVAILABLE') {
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: '仕入れ不可',
        message: `注文 ${order.marketplaceOrderId} の商品が仕入れ不可です。キャンセルを検討してください。`,
        severity: 'ERROR',
        metadata: {
          orderId,
          marketplaceOrderId: order.marketplaceOrderId,
          notes,
        },
      },
    });

    await alertManager.sendCustomAlert(
      'error',
      '仕入れ不可アラート',
      `注文 ${order.marketplaceOrderId} の商品が仕入れ不可です。キャンセル対応が必要です。`,
      [
        { title: '注文ID', value: order.marketplaceOrderId },
        { title: '理由', value: notes || '不明' },
      ]
    );
  }
}

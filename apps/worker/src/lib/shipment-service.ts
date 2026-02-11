/**
 * Phase 52: 発送処理サービス
 *
 * 発送処理の自動化を担当:
 * - 追跡番号登録
 * - マーケットプレイスAPI連携（Joom/eBay）
 * - 発送通知メール
 * - Slackアラート
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { joomApi } from './joom-api';
import { alertManager } from './slack-alert';

const log = logger.child({ module: 'shipment-service' });

// 配送業者マッピング
const CARRIER_MAPPING: Record<string, { joom: string; ebay: string }> = {
  'yamato': { joom: 'YAMATO', ebay: 'YamatoTransport' },
  'sagawa': { joom: 'SAGAWA', ebay: 'Sagawa' },
  'japan_post': { joom: 'JAPAN_POST', ebay: 'JapanPost' },
  'fedex': { joom: 'FEDEX', ebay: 'FedEx' },
  'dhl': { joom: 'DHL', ebay: 'DHL' },
  'ups': { joom: 'UPS', ebay: 'UPS' },
  'ems': { joom: 'EMS', ebay: 'EMS' },
};

export interface ShipmentInput {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippedAt?: Date;
  notes?: string;
}

export interface ShipmentResult {
  success: boolean;
  orderId: string;
  marketplaceOrderId: string;
  marketplace: string;
  trackingNumber: string;
  carrier: string;
  apiSynced: boolean;
  slackNotified: boolean;
  errors: string[];
}

/**
 * 注文の発送処理を実行
 */
export async function processShipment(input: ShipmentInput): Promise<ShipmentResult> {
  const { orderId, trackingNumber, carrier, shippedAt, notes } = input;

  const result: ShipmentResult = {
    success: false,
    orderId,
    marketplaceOrderId: '',
    marketplace: '',
    trackingNumber,
    carrier,
    apiSynced: false,
    slackNotified: false,
    errors: [],
  };

  try {
    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sales: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    result.marketplaceOrderId = order.marketplaceOrderId;
    result.marketplace = order.marketplace;

    log.info({
      type: 'shipment_processing_start',
      orderId: order.id,
      marketplace: order.marketplace,
      trackingNumber,
      carrier,
    });

    // 配送業者名を正規化
    const normalizedCarrier = normalizeCarrier(carrier);
    const carrierMapping = CARRIER_MAPPING[normalizedCarrier.toLowerCase()] || {
      joom: carrier.toUpperCase(),
      ebay: carrier,
    };

    // 1. 注文データを更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        trackingCarrier: carrier,
        shippedAt: shippedAt || new Date(),
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        rawData: {
          ...(order.rawData as object || {}),
          shipmentNotes: notes,
          shipmentProcessedAt: new Date().toISOString(),
        },
      },
    });

    // 2. マーケットプレイスAPIに発送通知を送信
    try {
      if (order.marketplace === 'JOOM') {
        const apiResult = await joomApi.shipOrder(order.marketplaceOrderId, {
          trackingNumber,
          carrier: carrierMapping.joom,
        });

        if (apiResult.success) {
          result.apiSynced = true;
          log.info({
            type: 'joom_shipment_synced',
            orderId,
            marketplaceOrderId: order.marketplaceOrderId,
          });
        } else {
          result.errors.push(`Joom API error: ${apiResult.error?.message}`);
          log.error({
            type: 'joom_shipment_sync_failed',
            orderId,
            error: apiResult.error,
          });
        }
      } else if (order.marketplace === 'EBAY') {
        // eBay API連携（既存のebay-api.tsを使用）
        const { ebayApi, isEbayConfigured } = await import('./ebay-api');
        if (await isEbayConfigured()) {
          // eBay APIで発送通知
          const orderResult = await ebayApi.getOrder(order.marketplaceOrderId);
          if (orderResult.success && orderResult.data) {
            const lineItem = orderResult.data.lineItems?.[0];
            if (lineItem) {
              const shipResult = await ebayApi.shipOrder(
                order.marketplaceOrderId,
                lineItem.lineItemId,
                {
                  trackingNumber,
                  shippingCarrier: carrierMapping.ebay,
                }
              );
              if (shipResult.success) {
                result.apiSynced = true;
                log.info({
                  type: 'ebay_shipment_synced',
                  orderId,
                  marketplaceOrderId: order.marketplaceOrderId,
                });
              } else {
                result.errors.push(`eBay API error: ${shipResult.error?.message}`);
              }
            }
          }
        }
      }
    } catch (apiError) {
      result.errors.push(`API sync error: ${(apiError as Error).message}`);
      log.error({ orderId, error: apiError }, 'Marketplace API sync failed');
    }

    // 3. 通知を作成
    await prisma.notification.create({
      data: {
        type: 'ORDER_SHIPPED',
        title: '発送完了',
        message: `注文 ${order.marketplaceOrderId} (${order.marketplace}) の発送が完了しました。追跡番号: ${trackingNumber}`,
        severity: 'SUCCESS',
        metadata: {
          orderId: order.id,
          marketplaceOrderId: order.marketplaceOrderId,
          marketplace: order.marketplace,
          trackingNumber,
          carrier,
        },
      },
    });

    // 4. Slack通知
    try {
      const items = order.sales.map((s: any) => `${s.title} x${s.quantity}`).join(', ');

      await alertManager.sendCustomAlert(
        'info',
        '発送完了',
        `注文 ${order.marketplaceOrderId} の発送が完了しました`,
        [
          { title: 'マーケットプレイス', value: order.marketplace },
          { title: '購入者', value: order.buyerName || order.buyerUsername },
          { title: '追跡番号', value: trackingNumber },
          { title: '配送業者', value: carrier },
          { title: 'API連携', value: result.apiSynced ? '成功' : '失敗' },
          { title: '商品', value: items.slice(0, 100) },
        ]
      );

      result.slackNotified = true;
    } catch (slackError) {
      result.errors.push(`Slack notification failed: ${(slackError as Error).message}`);
      log.error({ orderId, error: slackError }, 'Slack notification failed');
    }

    result.success = result.errors.length === 0;

    log.info({
      type: 'shipment_processing_complete',
      orderId,
      result,
    });

    return result;
  } catch (error) {
    log.error({ orderId, error }, 'Shipment processing failed');
    result.errors.push((error as Error).message);
    return result;
  }
}

/**
 * 配送業者名を正規化
 */
function normalizeCarrier(carrier: string): string {
  const normalized = carrier.toLowerCase().replace(/[_\-\s]/g, '');

  // 日本語名のマッピング
  const japaneseMapping: Record<string, string> = {
    'ヤマト': 'yamato',
    'ヤマト運輸': 'yamato',
    'クロネコ': 'yamato',
    '佐川': 'sagawa',
    '佐川急便': 'sagawa',
    '日本郵便': 'japan_post',
    'ゆうパック': 'japan_post',
    'eパケット': 'japan_post',
  };

  if (japaneseMapping[carrier]) {
    return japaneseMapping[carrier];
  }

  // 英語名のマッピング
  const englishMapping: Record<string, string> = {
    'yamato': 'yamato',
    'kuroneko': 'yamato',
    'sagawa': 'sagawa',
    'sagawaexpress': 'sagawa',
    'japanpost': 'japan_post',
    'yupack': 'japan_post',
    'epacket': 'japan_post',
    'fedex': 'fedex',
    'dhl': 'dhl',
    'ups': 'ups',
    'ems': 'ems',
  };

  return englishMapping[normalized] || carrier;
}

/**
 * 複数注文の一括発送処理
 */
export async function processBatchShipment(
  shipments: ShipmentInput[]
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: ShipmentResult[];
}> {
  const results: ShipmentResult[] = [];

  for (const shipment of shipments) {
    const result = await processShipment(shipment);
    results.push(result);
  }

  const summary = {
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };

  // バッチ処理結果をSlackに通知
  if (shipments.length > 1) {
    const failedOrders = results.filter((r) => !r.success).map((r) => r.marketplaceOrderId).join(', ');

    await alertManager.sendCustomAlert(
      summary.failed > 0 ? 'warning' : 'info',
      '一括発送処理完了',
      `${summary.total}件の発送処理が完了しました`,
      [
        { title: '処理件数', value: summary.total.toString() },
        { title: '成功', value: summary.success.toString() },
        { title: '失敗', value: summary.failed.toString() },
        ...(summary.failed > 0 ? [{ title: '失敗した注文', value: failedOrders.slice(0, 100) }] : []),
      ]
    );
  }

  return summary;
}

/**
 * 未発送注文の一覧を取得
 */
export async function getPendingShipments(options?: {
  marketplace?: 'JOOM' | 'EBAY';
  limit?: number;
  urgentOnly?: boolean;
}): Promise<any[]> {
  const { marketplace, limit = 100, urgentOnly = false } = options || {};

  const where: any = {
    status: {
      in: ['CONFIRMED', 'PROCESSING'],
    },
    fulfillmentStatus: 'UNFULFILLED',
    paymentStatus: 'PAID',
  };

  if (marketplace) {
    where.marketplace = marketplace;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      sales: true,
    },
    orderBy: { orderedAt: 'asc' },
    take: limit,
  });

  // 発送期限情報を追加
  const ordersWithDeadline = orders.map((order) => {
    const rawData = order.rawData as any;
    const deadline = rawData?.shipmentDeadline
      ? new Date(rawData.shipmentDeadline)
      : null;
    const hoursRemaining = deadline
      ? Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))
      : null;

    return {
      ...order,
      shipmentDeadline: deadline,
      hoursRemaining,
      isUrgent: hoursRemaining !== null && hoursRemaining <= 24,
    };
  });

  // 緊急のみフィルター
  if (urgentOnly) {
    return ordersWithDeadline.filter((o) => o.isUrgent);
  }

  return ordersWithDeadline;
}

/**
 * 発送期限を延長（マーケットプレイスAPIがサポートしている場合）
 */
export async function extendShipmentDeadline(
  orderId: string,
  newDeadline: Date,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // 注文データを更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        rawData: {
          ...(order.rawData as object || {}),
          shipmentDeadline: newDeadline.toISOString(),
          deadlineExtendedAt: new Date().toISOString(),
          deadlineExtendReason: reason,
        },
      },
    });

    log.info({
      type: 'shipment_deadline_extended',
      orderId,
      newDeadline,
      reason,
    });

    return { success: true };
  } catch (error) {
    log.error({ orderId, error }, 'Failed to extend shipment deadline');
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 配送業者の一覧を取得
 */
export function getAvailableCarriers(): { id: string; name: string; nameJa: string }[] {
  return [
    { id: 'yamato', name: 'Yamato Transport', nameJa: 'ヤマト運輸' },
    { id: 'sagawa', name: 'Sagawa Express', nameJa: '佐川急便' },
    { id: 'japan_post', name: 'Japan Post', nameJa: '日本郵便' },
    { id: 'fedex', name: 'FedEx', nameJa: 'FedEx' },
    { id: 'dhl', name: 'DHL', nameJa: 'DHL' },
    { id: 'ups', name: 'UPS', nameJa: 'UPS' },
    { id: 'ems', name: 'EMS', nameJa: 'EMS（国際スピード郵便）' },
  ];
}

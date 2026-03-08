import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { checkOrderProfit } from '../lib/profit-guard';
import { sendNotification } from '../lib/notification-service';

const log = logger.child({ module: 'order-processor' });

// 注文処理ジョブペイロード
export interface OrderProcessJobPayload {
  orderId: string;
  webhookEventId?: string;
  isManual?: boolean;
}

// 注文処理結果
export interface OrderProcessResult {
  success: boolean;
  orderId: string;
  action: 'notify' | 'auto_approve' | 'reject';
  profitCheck: {
    totalProfit: number;
    anyDangerous: boolean;
  };
  notificationSent: boolean;
  error?: string;
}

// 注文処理プロセッサー
export async function processOrderJob(
  job: Job<OrderProcessJobPayload>
): Promise<OrderProcessResult> {
  const { orderId, webhookEventId } = job.data;
  const startTime = Date.now();

  log.info({
    type: 'order_process_start',
    orderId,
    webhookEventId,
    jobId: job.id,
  });

  try {
    // 注文情報を取得（sales含む）
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sales: true,
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 利益チェック
    const profitResult = await checkOrderProfit(orderId);

    // 商品のsourceUrlを取得するためにProductを個別に取得
    const productIds = order.sales
      .map((s) => s.productId)
      .filter((id): id is string => id !== null);

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, sourceUrl: true },
          })
        : [];

    const productMap = new Map(products.map((p) => [p.id, p.sourceUrl]));

    // 注文詳細を構築
    const orderDetails = {
      orderId: order.marketplaceOrderId,
      marketplace: order.marketplace,
      buyer: order.buyerUsername,
      total: order.total,
      currency: order.currency,
      items: order.sales.map((sale) => ({
        title: sale.title,
        sku: sale.sku,
        price: sale.unitPrice,
        costPrice: sale.costPrice,
        quantity: sale.quantity,
        sourceUrl: sale.productId ? productMap.get(sale.productId) : null,
      })),
      shippingAddress: order.shippingAddress,
      profitSummary: {
        totalProfit: profitResult.totalProfit,
        anyDangerous: profitResult.anyDangerous,
        items: profitResult.items.map((item) => ({
          profitJpy: item.calculation.profitJpy,
          profitRate: item.calculation.profitRate,
          isDangerous: item.calculation.isDangerous,
          reason: item.calculation.reason,
        })),
      },
    };

    // 発注推奨通知を送信
    const notificationResult = await sendOrderNotification(orderDetails);

    // ShadowLogに記録（JSON互換の形式に変換）
    await prisma.shadowLog.create({
      data: {
        service: 'order-processor',
        operation: 'process',
        input: {
          orderId,
          webhookEventId: webhookEventId || null,
          orderTotal: order.total,
          itemCount: order.sales.length,
        },
        output: {
          totalProfit: profitResult.totalProfit,
          anyDangerous: profitResult.anyDangerous,
          itemCount: profitResult.items.length,
          notificationSent: notificationResult.success,
        },
        decision: profitResult.anyDangerous ? 'hold' : 'approve',
        decisionReason: profitResult.anyDangerous
          ? '利益率が閾値を下回る商品があります'
          : '利益率OK',
        isDryRun: true, // 常にDryRun（自動購入しない）
        durationMs: Date.now() - startTime,
      },
    });

    // 注文ステータスを更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: profitResult.anyDangerous ? 'PENDING' : 'CONFIRMED',
        updatedAt: new Date(),
      },
    });

    log.info({
      type: 'order_process_complete',
      orderId,
      totalProfit: profitResult.totalProfit,
      anyDangerous: profitResult.anyDangerous,
      notificationSent: notificationResult.success,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      orderId,
      action: 'notify',
      profitCheck: {
        totalProfit: profitResult.totalProfit,
        anyDangerous: profitResult.anyDangerous,
      },
      notificationSent: notificationResult.success,
    };
  } catch (error: any) {
    log.error({
      type: 'order_process_error',
      orderId,
      error: error.message,
      duration: Date.now() - startTime,
    });

    return {
      success: false,
      orderId,
      action: 'notify',
      profitCheck: { totalProfit: 0, anyDangerous: false },
      notificationSent: false,
      error: error.message,
    };
  }
}

// 発注推奨通知を送信
async function sendOrderNotification(orderDetails: {
  orderId: string;
  marketplace: string;
  buyer: string;
  total: number;
  currency: string;
  items: Array<{
    title: string;
    sku: string;
    price: number;
    costPrice: number | null;
    quantity: number;
    sourceUrl?: string | null;
  }>;
  shippingAddress: any;
  profitSummary: {
    totalProfit: number;
    anyDangerous: boolean;
    items: Array<{
      profitJpy: number;
      profitRate: number;
      isDangerous: boolean;
      reason?: string;
    }>;
  };
}): Promise<{ success: boolean; error?: string }> {
  // 利益状況に応じた絵文字
  const profitEmoji = orderDetails.profitSummary.anyDangerous ? '⚠️' : '✅';
  const urgencyEmoji = orderDetails.profitSummary.anyDangerous ? '🔴' : '🟢';

  // 商品リストを構築
  const itemsList = orderDetails.items
    .map((item, index) => {
      const profitInfo = orderDetails.profitSummary.items[index];
      const profitStatus = profitInfo?.isDangerous ? '⚠️ 低利益' : '✅ OK';
      return `• ${item.title.substring(0, 40)}
  価格: $${item.price.toFixed(2)} | 仕入: ¥${item.costPrice?.toLocaleString() || 'N/A'}
  利益: ¥${profitInfo?.profitJpy.toLocaleString() || 'N/A'} (${profitInfo?.profitRate || 0}%) ${profitStatus}
  ${item.sourceUrl ? `購入リンク: ${item.sourceUrl}` : ''}`;
    })
    .join('\n\n');

  // 通知メッセージ
  const message = `${urgencyEmoji} 新規注文を受信しました。仕入れ判断をお願いします。

【注文情報】
注文ID: ${orderDetails.orderId}
マーケット: ${orderDetails.marketplace}
購入者: ${orderDetails.buyer}
合計: ${orderDetails.currency} ${orderDetails.total.toFixed(2)}

【商品】
${itemsList}

【利益サマリー】
合計利益: ¥${orderDetails.profitSummary.totalProfit.toLocaleString()}
${orderDetails.profitSummary.anyDangerous ? '⚠️ 低利益の商品があります。慎重に判断してください。' : '✅ 全商品の利益率が基準を満たしています。'}

【配送先】
${formatAddress(orderDetails.shippingAddress)}

---
上記リンクから仕入れ元サイトで購入してください。`;

  try {
    await sendNotification({
      eventType: 'ORDER_RECEIVED',
      title: `${profitEmoji} 発注推奨: ${orderDetails.marketplace}注文 #${orderDetails.orderId.slice(-8)}`,
      message,
      severity: orderDetails.profitSummary.anyDangerous ? 'WARNING' : 'SUCCESS',
      marketplace: orderDetails.marketplace as 'JOOM' | 'EBAY',
      data: {
        注文ID: orderDetails.orderId,
        合計: `${orderDetails.currency} ${orderDetails.total.toFixed(2)}`,
        利益: `¥${orderDetails.profitSummary.totalProfit.toLocaleString()}`,
        商品数: orderDetails.items.length,
        ステータス: orderDetails.profitSummary.anyDangerous ? '要確認' : 'OK',
      },
    });

    return { success: true };
  } catch (error: any) {
    log.error({
      type: 'order_notification_error',
      orderId: orderDetails.orderId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// 住所フォーマット
function formatAddress(address: any): string {
  if (!address) return 'N/A';

  const parts = [
    address.addressLine1 || address.street,
    address.addressLine2,
    address.city,
    address.stateOrProvince || address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

// 未処理注文を一括処理
export async function processUnprocessedOrders(): Promise<{
  processed: number;
  errors: number;
  results: OrderProcessResult[];
}> {
  log.info({ type: 'batch_order_process_start' });

  // PENDING状態の注文を取得
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
    },
    include: {
      sales: true,
    },
    orderBy: { orderedAt: 'asc' },
    take: 50, // バッチサイズ
  });

  const results: OrderProcessResult[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const order of pendingOrders) {
    try {
      const result = await processOrderJob({
        data: { orderId: order.id },
        id: `batch-${order.id}`,
      } as Job<OrderProcessJobPayload>);

      results.push(result);
      if (result.success) {
        processedCount++;
      } else {
        errorCount++;
      }
    } catch (error: any) {
      errorCount++;
      results.push({
        success: false,
        orderId: order.id,
        action: 'notify',
        profitCheck: { totalProfit: 0, anyDangerous: false },
        notificationSent: false,
        error: error.message,
      });
    }
  }

  log.info({
    type: 'batch_order_process_complete',
    total: pendingOrders.length,
    processed: processedCount,
    errors: errorCount,
  });

  return {
    processed: processedCount,
    errors: errorCount,
    results,
  };
}

// Webhookイベントから注文を処理
export async function processOrderFromWebhook(
  webhookEventId: string
): Promise<OrderProcessResult | null> {
  log.info({ type: 'webhook_order_process_start', webhookEventId });

  // Webhookイベントを取得
  const webhookEvent = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
  });

  if (!webhookEvent) {
    log.error({ type: 'webhook_event_not_found', webhookEventId });
    return null;
  }

  // 関連する注文IDを取得
  if (!webhookEvent.orderId) {
    log.warn({ type: 'webhook_no_order_id', webhookEventId });
    return null;
  }

  // 注文を処理
  const result = await processOrderJob({
    data: {
      orderId: webhookEvent.orderId,
      webhookEventId,
    },
    id: `webhook-${webhookEventId}`,
  } as Job<OrderProcessJobPayload>);

  // Webhookイベントのステータスを更新
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: result.success ? 'COMPLETED' : 'FAILED',
      processedAt: new Date(),
      errorMessage: result.error,
    },
  });

  return result;
}

// 利益統計を取得
export async function getOrderProfitStats(
  days: number = 7
): Promise<{
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  avgProfitRate: number;
  dangerousOrders: number;
  byMarketplace: Record<
    string,
    {
      orders: number;
      revenue: number;
      profit: number;
    }
  >;
}> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: sinceDate },
    },
    include: {
      sales: true,
    },
  });

  const byMarketplace: Record<
    string,
    { orders: number; revenue: number; profit: number }
  > = {};
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalProfitRate = 0;
  let dangerousOrders = 0;
  let orderCount = 0;

  for (const order of orders) {
    const marketplace = order.marketplace;

    if (!byMarketplace[marketplace]) {
      byMarketplace[marketplace] = { orders: 0, revenue: 0, profit: 0 };
    }

    byMarketplace[marketplace].orders++;
    byMarketplace[marketplace].revenue += order.total;

    let orderProfit = 0;
    let minProfitRate = 100;

    for (const sale of order.sales) {
      if (sale.profitJpy) {
        orderProfit += sale.profitJpy;
        byMarketplace[marketplace].profit += sale.profitJpy;
      }
      if (sale.profitRate && sale.profitRate < minProfitRate) {
        minProfitRate = sale.profitRate;
      }
    }

    totalRevenue += order.total;
    totalProfit += orderProfit;
    totalProfitRate += minProfitRate;
    orderCount++;

    // 利益率10%未満を危険とカウント
    if (minProfitRate < 10) {
      dangerousOrders++;
    }
  }

  return {
    totalOrders: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit),
    avgProfitRate:
      orderCount > 0 ? Math.round((totalProfitRate / orderCount) * 10) / 10 : 0,
    dangerousOrders,
    byMarketplace,
  };
}

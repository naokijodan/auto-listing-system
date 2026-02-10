import { prisma, OrderStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'refund-automation' });

// 返金理由
export type RefundReason =
  | 'OUT_OF_STOCK'
  | 'SHIPPING_ISSUE'
  | 'ITEM_DAMAGED'
  | 'BUYER_REQUEST'
  | 'ITEM_NOT_AS_DESCRIBED'
  | 'OTHER';

// 返金ポリシー
export interface RefundPolicy {
  maxDaysAfterShipment: number;
  maxDaysAfterDelivery: number;
  autoApproveReasons: RefundReason[];
  requireApprovalReasons: RefundReason[];
  partialRefundAllowed: boolean;
}

// デフォルト返金ポリシー
const DEFAULT_REFUND_POLICY: RefundPolicy = {
  maxDaysAfterShipment: 30,
  maxDaysAfterDelivery: 14,
  autoApproveReasons: ['OUT_OF_STOCK', 'SHIPPING_ISSUE'],
  requireApprovalReasons: ['BUYER_REQUEST', 'ITEM_NOT_AS_DESCRIBED', 'ITEM_DAMAGED'],
  partialRefundAllowed: true,
};

// 返金リクエスト
export interface RefundRequest {
  orderId: string;
  saleId?: string;
  reason: RefundReason;
  amount?: number; // 指定がなければ全額
  description?: string;
  buyerEvidence?: string[];
}

// 返金結果
export interface RefundResult {
  requestId: string;
  orderId: string;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'PROCESSED';
  amount: number;
  reason: RefundReason;
  autoApproved: boolean;
  message: string;
  processedAt?: Date;
}

/**
 * 返金リクエストを処理
 */
export async function processRefundRequest(
  request: RefundRequest,
  policy: RefundPolicy = DEFAULT_REFUND_POLICY
): Promise<RefundResult> {
  log.info({ type: 'refund_request_received', orderId: request.orderId, reason: request.reason });

  // 注文を取得
  const order = await prisma.order.findUnique({
    where: { id: request.orderId },
    include: {
      sales: true,
    },
  });

  if (!order) {
    return {
      requestId: `refund-${Date.now()}`,
      orderId: request.orderId,
      status: 'REJECTED',
      amount: 0,
      reason: request.reason,
      autoApproved: false,
      message: 'Order not found',
    };
  }

  // 返金額を計算
  let refundAmount: number;
  if (request.amount !== undefined) {
    refundAmount = request.amount;
  } else if (request.saleId) {
    const sale = order.sales.find(s => s.id === request.saleId);
    refundAmount = sale ? (sale.unitPrice || 0) : 0;
  } else {
    refundAmount = order.total || 0;
  }

  // 返金ポリシーをチェック
  const eligibility = checkRefundEligibility(order, request, policy);

  if (!eligibility.eligible) {
    // 返金不可の場合でも記録
    await recordRefundDecision(request, order, 'REJECTED', refundAmount, eligibility.reason);

    return {
      requestId: `refund-${Date.now()}`,
      orderId: request.orderId,
      status: 'REJECTED',
      amount: refundAmount,
      reason: request.reason,
      autoApproved: false,
      message: eligibility.reason,
    };
  }

  // 自動承認判定
  const isAutoApprove = policy.autoApproveReasons.includes(request.reason);

  if (isAutoApprove) {
    // 自動承認 - マーケットプレイスAPIで返金処理
    const processResult = await executeRefund(order, refundAmount, request.reason);

    await recordRefundDecision(request, order, 'PROCESSED', refundAmount, 'Auto-approved');

    return {
      requestId: `refund-${Date.now()}`,
      orderId: request.orderId,
      status: 'PROCESSED',
      amount: refundAmount,
      reason: request.reason,
      autoApproved: true,
      message: 'Refund processed automatically',
      processedAt: new Date(),
    };
  } else {
    // 手動レビュー必要
    await recordRefundDecision(request, order, 'PENDING_REVIEW', refundAmount, 'Manual review required');

    // 通知を送信
    try {
      const { sendNotification } = await import('./notification-service');
      await sendNotification({
        eventType: 'REFUND_REQUEST',
        severity: 'WARNING',
        title: 'Refund Request Requires Review',
        message: `Order ${order.id} - ${request.reason}: $${refundAmount}`,
        data: {
          orderId: order.id,
          reason: request.reason,
          amount: refundAmount,
          description: request.description,
        },
      });
    } catch (error: any) {
      log.warn({ type: 'refund_notification_failed', error: error.message });
    }

    return {
      requestId: `refund-${Date.now()}`,
      orderId: request.orderId,
      status: 'PENDING_REVIEW',
      amount: refundAmount,
      reason: request.reason,
      autoApproved: false,
      message: 'Refund request submitted for manual review',
    };
  }
}

/**
 * 返金適格性をチェック
 */
function checkRefundEligibility(
  order: any,
  request: RefundRequest,
  policy: RefundPolicy
): { eligible: boolean; reason: string } {
  // 既に返金済みかチェック
  if (order.status === 'REFUNDED' || order.status === 'CANCELLED') {
    return { eligible: false, reason: 'Order already refunded or cancelled' };
  }

  // 期限チェック（発送後）
  if (order.shippedAt) {
    const daysSinceShipment = Math.floor(
      (Date.now() - new Date(order.shippedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceShipment > policy.maxDaysAfterShipment) {
      return {
        eligible: false,
        reason: `Refund period expired (${daysSinceShipment} days since shipment)`,
      };
    }
  }

  // 在庫切れは常に承認
  if (request.reason === 'OUT_OF_STOCK') {
    return { eligible: true, reason: 'Out of stock refund' };
  }

  // 配送問題は配送前のみ自動承認
  if (request.reason === 'SHIPPING_ISSUE' && !order.shippedAt) {
    return { eligible: true, reason: 'Shipping issue before shipment' };
  }

  // その他の理由
  return { eligible: true, reason: 'Standard refund request' };
}

/**
 * マーケットプレイスで返金を実行
 */
async function executeRefund(
  order: any,
  amount: number,
  reason: RefundReason
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const marketplace = order.marketplace;

  log.info({
    type: 'refund_execute',
    orderId: order.id,
    marketplace,
    amount,
    reason,
  });

  try {
    if (marketplace === 'JOOM') {
      // Joom返金API呼び出し
      const { joomApi } = await import('./joom-api');
      // 注: 実際のJoom返金APIは未実装のため、ここではシミュレーション
      log.info({ type: 'joom_refund_simulated', orderId: order.externalOrderId, amount });

      // 注文ステータスを更新
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED' as OrderStatus,
          updatedAt: new Date(),
        },
      });

      return { success: true, transactionId: `joom-refund-${Date.now()}` };
    } else if (marketplace === 'EBAY') {
      // eBay返金API呼び出し
      const { ebayApi } = await import('./ebay-api');
      // 注: 実際のeBay返金APIは未実装のため、ここではシミュレーション
      log.info({ type: 'ebay_refund_simulated', orderId: order.externalOrderId, amount });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED' as OrderStatus,
          updatedAt: new Date(),
        },
      });

      return { success: true, transactionId: `ebay-refund-${Date.now()}` };
    } else {
      return { success: false, error: `Unsupported marketplace: ${marketplace}` };
    }
  } catch (error: any) {
    log.error({ type: 'refund_execute_error', orderId: order.id, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 返金決定を記録
 */
async function recordRefundDecision(
  request: RefundRequest,
  order: any,
  status: string,
  amount: number,
  reason: string
): Promise<void> {
  await prisma.shadowLog.create({
    data: {
      service: 'refund-automation',
      operation: 'process_refund',
      input: {
        orderId: request.orderId,
        reason: request.reason,
        requestedAmount: request.amount,
        description: request.description,
      },
      output: {
        status,
        amount,
        marketplace: order.marketplace,
        externalOrderId: order.externalOrderId,
      },
      decision: status,
      decisionReason: reason,
      isDryRun: false,
    },
  });
}

/**
 * 在庫切れによる自動返金
 * 在庫チェックで売れた商品が在庫切れの場合に自動呼び出し
 */
export async function processOutOfStockRefund(orderId: string, saleId?: string): Promise<RefundResult> {
  return processRefundRequest({
    orderId,
    saleId,
    reason: 'OUT_OF_STOCK',
    description: 'Item no longer available from source',
  });
}

/**
 * 返金リクエスト一覧を取得
 */
export async function getPendingRefunds(): Promise<Array<{
  id: string;
  orderId: string;
  reason: string;
  amount: number;
  createdAt: Date;
}>> {
  const logs = await prisma.shadowLog.findMany({
    where: {
      service: 'refund-automation',
      decision: 'PENDING_REVIEW',
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return logs.map(log => ({
    id: log.id,
    orderId: (log.input as any).orderId,
    reason: (log.input as any).reason,
    amount: (log.output as any).amount,
    createdAt: log.createdAt,
  }));
}

/**
 * 手動で返金を承認
 */
export async function approveRefund(
  refundLogId: string,
  approvedBy: string
): Promise<RefundResult> {
  const log_ = await prisma.shadowLog.findUnique({
    where: { id: refundLogId },
  });

  if (!log_ || log_.decision !== 'PENDING_REVIEW') {
    return {
      requestId: refundLogId,
      orderId: '',
      status: 'REJECTED',
      amount: 0,
      reason: 'OTHER',
      autoApproved: false,
      message: 'Invalid refund request',
    };
  }

  const input = log_.input as any;
  const output = log_.output as any;

  // 注文を取得して返金実行
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
  });

  if (!order) {
    return {
      requestId: refundLogId,
      orderId: input.orderId,
      status: 'REJECTED',
      amount: 0,
      reason: input.reason,
      autoApproved: false,
      message: 'Order not found',
    };
  }

  // 返金を実行
  const result = await executeRefund(order, output.amount, input.reason);

  // ログを更新
  await prisma.shadowLog.update({
    where: { id: refundLogId },
    data: {
      decision: result.success ? 'APPROVED' : 'FAILED',
      decisionReason: result.success ? `Approved by ${approvedBy}` : result.error,
    },
  });

  return {
    requestId: refundLogId,
    orderId: input.orderId,
    status: result.success ? 'PROCESSED' : 'REJECTED',
    amount: output.amount,
    reason: input.reason,
    autoApproved: false,
    message: result.success ? `Refund approved by ${approvedBy}` : result.error || 'Refund failed',
    processedAt: result.success ? new Date() : undefined,
  };
}

/**
 * 返金統計を取得
 */
export async function getRefundStats(days: number = 30): Promise<{
  totalRefunds: number;
  totalAmount: number;
  byReason: Record<string, { count: number; amount: number }>;
  autoApproved: number;
  manualApproved: number;
  rejected: number;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await prisma.shadowLog.findMany({
    where: {
      service: 'refund-automation',
      createdAt: { gte: since },
    },
  });

  const stats = {
    totalRefunds: 0,
    totalAmount: 0,
    byReason: {} as Record<string, { count: number; amount: number }>,
    autoApproved: 0,
    manualApproved: 0,
    rejected: 0,
  };

  for (const log_ of logs) {
    const input = log_.input as any;
    const output = log_.output as any;
    const amount = output?.amount || 0;
    const reason = input?.reason || 'OTHER';

    if (log_.decision === 'PROCESSED' || log_.decision === 'APPROVED') {
      stats.totalRefunds++;
      stats.totalAmount += amount;

      if (!stats.byReason[reason]) {
        stats.byReason[reason] = { count: 0, amount: 0 };
      }
      stats.byReason[reason].count++;
      stats.byReason[reason].amount += amount;

      if (log_.decisionReason === 'Auto-approved') {
        stats.autoApproved++;
      } else {
        stats.manualApproved++;
      }
    } else if (log_.decision === 'REJECTED') {
      stats.rejected++;
    }
  }

  return stats;
}

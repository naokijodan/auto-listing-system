import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'order-automation' });

// 自動化レベル
export type AutomationLevel = 'MANUAL' | 'SEMI_AUTO' | 'FULL_AUTO';

// 現在の自動化レベル
const AUTOMATION_LEVEL: AutomationLevel =
  (process.env.ORDER_AUTOMATION_LEVEL as AutomationLevel) || 'SEMI_AUTO';

// 自動承認の閾値
const AUTO_APPROVE_THRESHOLDS = {
  maxAmountUsd: parseFloat(process.env.AUTO_APPROVE_MAX_AMOUNT || '100'),
  minProfitRate: parseFloat(process.env.AUTO_APPROVE_MIN_PROFIT_RATE || '15'),
  maxItemCount: parseInt(process.env.AUTO_APPROVE_MAX_ITEMS || '3', 10),
};

interface OrderValidationResult {
  orderId: string;
  isValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  autoApproved: boolean;
  reasons: string[];
  profitSummary: {
    totalProfitJpy: number;
    profitRate: number;
    isDangerous: boolean;
  };
}

// 注文の検証
export async function validateOrder(orderId: string): Promise<OrderValidationResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      sales: true,
    },
  });

  if (!order) {
    return {
      orderId,
      isValid: false,
      riskLevel: 'HIGH',
      autoApproved: false,
      reasons: ['Order not found'],
      profitSummary: { totalProfitJpy: 0, profitRate: 0, isDangerous: true },
    };
  }

  const reasons: string[] = [];
  let totalCostJpy = 0;
  let totalRevenueJpy = 0;
  const exchangeRate = 150;

  for (const sale of order.sales) {
    // Saleモデルから直接costPriceを使用
    if (sale.costPrice) {
      totalCostJpy += sale.costPrice;
    }
    const saleJpy = (sale.unitPrice || 0) * exchangeRate * 0.85;
    totalRevenueJpy += saleJpy;
  }

  const totalProfitJpy = totalRevenueJpy - totalCostJpy;
  const profitRate = totalCostJpy > 0 ? (totalProfitJpy / totalCostJpy) * 100 : 0;
  const isDangerous = profitRate < 0 || totalProfitJpy < -1000;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  if (isDangerous) {
    riskLevel = 'HIGH';
    reasons.push('Negative profit detected');
  } else if (profitRate < AUTO_APPROVE_THRESHOLDS.minProfitRate) {
    riskLevel = 'MEDIUM';
    reasons.push(`Low profit rate: ${profitRate.toFixed(1)}%`);
  }

  if ((order.total || 0) > AUTO_APPROVE_THRESHOLDS.maxAmountUsd) {
    riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
    reasons.push(`High order amount: $${order.total}`);
  }

  if (order.sales.length > AUTO_APPROVE_THRESHOLDS.maxItemCount) {
    riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
    reasons.push(`Many items: ${order.sales.length}`);
  }

  let autoApproved = false;
  if (AUTOMATION_LEVEL === 'FULL_AUTO') {
    autoApproved = riskLevel !== 'HIGH';
  } else if (AUTOMATION_LEVEL === 'SEMI_AUTO') {
    autoApproved = riskLevel === 'LOW';
  }

  await prisma.shadowLog.create({
    data: {
      service: 'order-automation',
      operation: 'validate_order',
      input: { orderId, automationLevel: AUTOMATION_LEVEL },
      output: {
        riskLevel,
        autoApproved,
        reasons,
        profitRate,
        totalProfitJpy,
      },
      decision: autoApproved ? 'AUTO_APPROVED' : 'MANUAL_REVIEW',
      decisionReason: reasons.join('; ') || 'All checks passed',
      isDryRun: AUTOMATION_LEVEL === 'MANUAL',
    },
  });

  log.info({
    type: 'order_validated',
    orderId,
    riskLevel,
    autoApproved,
    profitRate: profitRate.toFixed(1),
  });

  return {
    orderId,
    isValid: true,
    riskLevel,
    autoApproved,
    reasons: reasons.length > 0 ? reasons : ['All checks passed'],
    profitSummary: { totalProfitJpy, profitRate, isDangerous },
  };
}

// 注文処理（自動化対応）
export async function processOrderAutomation(orderId: string): Promise<{
  processed: boolean;
  action: 'AUTO_APPROVED' | 'FLAGGED_FOR_REVIEW' | 'REJECTED';
  message: string;
}> {
  const validation = await validateOrder(orderId);

  if (!validation.isValid) {
    return {
      processed: false,
      action: 'REJECTED',
      message: validation.reasons.join('; '),
    };
  }

  if (validation.autoApproved) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PROCESSING' },
    });

    log.info({ type: 'order_auto_approved', orderId });

    return {
      processed: true,
      action: 'AUTO_APPROVED',
      message: 'Order automatically approved for processing',
    };
  } else {
    return {
      processed: false,
      action: 'FLAGGED_FOR_REVIEW',
      message: `Manual review required: ${validation.reasons.join('; ')}`,
    };
  }
}

// 自動化設定取得
export function getAutomationConfig() {
  return {
    level: AUTOMATION_LEVEL,
    thresholds: AUTO_APPROVE_THRESHOLDS,
  };
}

import { prisma, Prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'inventory-alert-service' });

// 設定
const STOCK_LOW_THRESHOLD = 3;
const RESUME_DELAY_HOURS = 24; // 在庫復活から再開までの待機時間
const NOTIFICATION_COOLDOWN_MINUTES = 60; // 同一商品への通知間隔

interface InventoryState {
  productId: string;
  listingId?: string;
  previousStock: number | null;
  currentStock: number;
  previousAvailable: boolean | null;
  currentAvailable: boolean;
}

interface AlertResult {
  alertId: string;
  alertType: string;
  actionTaken: string | null;
  suppressed: boolean;
}

/**
 * 在庫状態を評価し、必要に応じてアラートを生成
 */
export async function evaluateInventoryState(state: InventoryState): Promise<AlertResult | null> {
  const { productId, listingId, previousStock, currentStock, previousAvailable, currentAvailable } = state;

  // 変化がなければスキップ
  if (previousStock === currentStock && previousAvailable === currentAvailable) {
    return null;
  }

  // アラートタイプを判定
  let alertType: string | null = null;
  let severity: string = 'MEDIUM';
  let reason = '';

  // 在庫切れ検知
  if (currentStock === 0 && (previousStock === null || previousStock > 0)) {
    alertType = 'STOCK_OUT';
    severity = 'HIGH';
    reason = `在庫数が${previousStock ?? 'unknown'}から0になりました`;
  }
  // 在庫僅少検知
  else if (currentStock > 0 && currentStock <= STOCK_LOW_THRESHOLD && (previousStock === null || previousStock > STOCK_LOW_THRESHOLD)) {
    alertType = 'STOCK_LOW';
    severity = 'MEDIUM';
    reason = `在庫数が${currentStock}に減少しました（閾値: ${STOCK_LOW_THRESHOLD}）`;
  }
  // 在庫復活検知
  else if (currentStock > 0 && (previousStock === 0 || previousStock === null)) {
    alertType = 'STOCK_RECOVERED';
    severity = 'LOW';
    reason = `在庫が${currentStock}に復活しました`;
  }
  // 販売状態変更検知
  else if (currentAvailable !== previousAvailable) {
    alertType = 'AVAILABILITY_CHANGED';
    severity = currentAvailable ? 'LOW' : 'HIGH';
    reason = currentAvailable ? '販売が再開されました' : '販売が停止されました';
  }

  if (!alertType) {
    return null;
  }

  // スパム抑制チェック
  const suppressed = await shouldSuppressAlert(productId, alertType);

  // アラートを作成
  const alert = await prisma.inventoryAlert.create({
    data: {
      productId,
      listingId,
      alertType: alertType as any,
      severity: severity as any,
      previousStock,
      currentStock,
      previousAvailable,
      currentAvailable,
      reason,
      thresholdUsed: STOCK_LOW_THRESHOLD,
      suppressed,
      suppressReason: suppressed ? '通知クールダウン期間中' : null,
    },
  });

  log.info({ alertId: alert.id, alertType, productId, suppressed }, 'Inventory alert created');

  // アクションを実行（抑制されていない場合）
  if (!suppressed && listingId) {
    const action = await executeAlertAction(alert.id, alertType, listingId);
    return {
      alertId: alert.id,
      alertType,
      actionTaken: action,
      suppressed: false,
    };
  }

  return {
    alertId: alert.id,
    alertType,
    actionTaken: null,
    suppressed,
  };
}

/**
 * スパム抑制チェック
 */
async function shouldSuppressAlert(productId: string, alertType: string): Promise<boolean> {
  const cooldownTime = new Date();
  cooldownTime.setMinutes(cooldownTime.getMinutes() - NOTIFICATION_COOLDOWN_MINUTES);

  const recentAlert = await prisma.inventoryAlert.findFirst({
    where: {
      productId,
      alertType: alertType as any,
      createdAt: { gte: cooldownTime },
      suppressed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return recentAlert !== null;
}

/**
 * アラートに基づくアクションを実行
 */
async function executeAlertAction(
  alertId: string,
  alertType: string,
  listingId: string
): Promise<string | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    log.warn({ alertId, listingId }, 'Listing not found for alert action');
    return null;
  }

  // 自動制御が無効の場合はスキップ
  if (!listing.autoStatusEnabled) {
    log.info({ alertId, listingId }, 'Auto status control disabled for listing');
    await prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        actionTaken: 'NONE',
        actionDetails: { reason: 'autoStatusEnabled is false' },
      },
    });
    return 'NONE';
  }

  let action: string | null = null;

  switch (alertType) {
    case 'STOCK_OUT':
    case 'AVAILABILITY_CHANGED':
      if (listing.status === 'ACTIVE') {
        action = await pauseListing(alertId, listingId);
      }
      break;

    case 'STOCK_RECOVERED':
      if (listing.pausedByInventory) {
        action = await scheduleListingResume(alertId, listingId);
      }
      break;

    default:
      action = 'NOTIFY_ONLY';
      await prisma.inventoryAlert.update({
        where: { id: alertId },
        data: { actionTaken: 'NOTIFY_ONLY' },
      });
  }

  return action;
}

/**
 * リスティングを停止
 */
async function pauseListing(alertId: string, listingId: string): Promise<string> {
  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'PAUSED',
        pausedByInventory: true,
        resumeAt: null,
      },
    }),
    prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        actionTaken: 'PAUSE_LISTING',
        actionDetails: { pausedAt: new Date().toISOString() },
      },
    }),
  ]);

  // 通知を作成
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: { select: { title: true } } },
  });

  await prisma.notification.create({
    data: {
      type: 'OUT_OF_STOCK',
      title: '在庫切れによる自動停止',
      message: `${listing?.product?.title || 'Unknown'} の出品を在庫切れにより自動停止しました`,
      severity: 'WARNING',
      listingId,
      metadata: { alertId },
    },
  });

  log.info({ alertId, listingId }, 'Listing paused due to stock out');

  return 'PAUSE_LISTING';
}

/**
 * リスティングの遅延再開をスケジュール
 */
async function scheduleListingResume(alertId: string, listingId: string): Promise<string> {
  const resumeAt = new Date();
  resumeAt.setHours(resumeAt.getHours() + RESUME_DELAY_HOURS);

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: { resumeAt },
    }),
    prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        actionTaken: 'SCHEDULE_RESUME',
        actionDetails: {
          resumeAt: resumeAt.toISOString(),
          delayHours: RESUME_DELAY_HOURS,
        },
      },
    }),
  ]);

  log.info({ alertId, listingId, resumeAt }, 'Listing resume scheduled');

  return 'SCHEDULE_RESUME';
}

/**
 * 遅延再開が予定されているリスティングを処理
 */
export async function processScheduledResumes(): Promise<{
  processed: number;
  resumed: number;
  failed: number;
}> {
  const now = new Date();

  const listings = await prisma.listing.findMany({
    where: {
      pausedByInventory: true,
      resumeAt: { lte: now },
      autoStatusEnabled: true,
    },
    include: {
      product: { select: { title: true } },
    },
  });

  let resumed = 0;
  let failed = 0;

  for (const listing of listings) {
    try {
      await prisma.$transaction([
        prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'ACTIVE',
            pausedByInventory: false,
            resumeAt: null,
          },
        }),
        prisma.inventoryAlert.create({
          data: {
            listingId: listing.id,
            productId: listing.productId,
            alertType: 'LISTING_RESUMED',
            severity: 'LOW',
            reason: `${RESUME_DELAY_HOURS}時間の待機期間を経て自動再開`,
            actionTaken: 'RESUME_LISTING',
            actionDetails: { resumedAt: now.toISOString() },
          },
        }),
      ]);

      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: '出品自動再開',
          message: `${listing.product?.title || 'Unknown'} の出品を自動再開しました`,
          severity: 'SUCCESS',
          listingId: listing.id,
        },
      });

      resumed++;
      log.info({ listingId: listing.id }, 'Listing resumed after delay');
    } catch (error) {
      failed++;
      log.error({ listingId: listing.id, error }, 'Failed to resume listing');
    }
  }

  return { processed: listings.length, resumed, failed };
}

/**
 * 手動でリスティングの自動制御を切り替え
 */
export async function setAutoStatusEnabled(
  listingId: string,
  enabled: boolean
): Promise<boolean> {
  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: { autoStatusEnabled: enabled },
  });

  log.info({ listingId, enabled }, 'Auto status control toggled');

  return listing.autoStatusEnabled;
}

/**
 * 手動で即座にリスティングを再開
 */
export async function forceResumeListing(listingId: string): Promise<boolean> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || !listing.pausedByInventory) {
    return false;
  }

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        pausedByInventory: false,
        resumeAt: null,
      },
    }),
    prisma.inventoryAlert.create({
      data: {
        listingId,
        productId: listing.productId,
        alertType: 'LISTING_RESUMED',
        severity: 'LOW',
        reason: '手動による強制再開',
        actionTaken: 'RESUME_LISTING',
        actionDetails: { manual: true, resumedAt: new Date().toISOString() },
      },
    }),
  ]);

  log.info({ listingId }, 'Listing force resumed');

  return true;
}

/**
 * 在庫アラート統計
 */
export async function getAlertStats(days: number = 7): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  actionsTaken: Record<string, number>;
  suppressedCount: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [typeCounts, severityCounts, actionCounts, suppressed, total] = await Promise.all([
    prisma.inventoryAlert.groupBy({
      by: ['alertType'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.inventoryAlert.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.inventoryAlert.groupBy({
      by: ['actionTaken'],
      where: { createdAt: { gte: since }, actionTaken: { not: null } },
      _count: true,
    }),
    prisma.inventoryAlert.count({
      where: { createdAt: { gte: since }, suppressed: true },
    }),
    prisma.inventoryAlert.count({
      where: { createdAt: { gte: since } },
    }),
  ]);

  const byType = typeCounts.reduce((acc, item) => {
    acc[item.alertType] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const bySeverity = severityCounts.reduce((acc, item) => {
    acc[item.severity] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const actionsTaken = actionCounts.reduce((acc, item) => {
    if (item.actionTaken) {
      acc[item.actionTaken] = item._count;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    byType,
    bySeverity,
    actionsTaken,
    suppressedCount: suppressed,
  };
}

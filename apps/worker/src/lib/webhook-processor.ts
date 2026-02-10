import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'webhook-processor' });

// 設定
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5000;

/**
 * 処理対象のWebhookイベントを取得
 */
export async function getPendingWebhookEvents(batchSize: number = 20): Promise<any[]> {
  const now = new Date();

  const events = await prisma.webhookEvent.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        {
          status: 'FAILED',
          retryCount: { lt: MAX_RETRIES },
          nextRetryAt: { lte: now },
        },
      ],
    },
    take: batchSize,
    orderBy: [
      { status: 'asc' }, // PENDINGを優先
      { createdAt: 'asc' },
    ],
  });

  return events;
}

/**
 * Webhookイベントを処理中にマーク
 */
export async function markEventProcessing(eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: 'PROCESSING',
      lastAttemptedAt: new Date(),
    },
  });
}

/**
 * Webhookイベント処理完了
 */
export async function markEventCompleted(eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

/**
 * Webhookイベント処理失敗
 */
export async function markEventFailed(
  eventId: string,
  error: string,
  isFatal: boolean = false
): Promise<void> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) return;

  const newRetryCount = event.retryCount + 1;
  const shouldBeFatal = isFatal || newRetryCount >= MAX_RETRIES;

  // 次回リトライ時刻を計算（指数バックオフ）
  const nextRetryAt = shouldBeFatal
    ? null
    : new Date(Date.now() + BASE_DELAY_MS * Math.pow(2, newRetryCount));

  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: shouldBeFatal ? 'FATAL' : 'FAILED',
      retryCount: newRetryCount,
      errorMessage: error,
      nextRetryAt,
    },
  });

  if (shouldBeFatal) {
    // FATALイベントの通知を作成
    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        title: 'Webhookイベント処理失敗',
        message: `Webhookイベント（${event.provider}: ${event.eventType}）の処理が最大リトライ回数に達しました。手動確認が必要です。`,
        severity: 'ERROR',
        metadata: {
          webhookEventId: eventId,
          provider: event.provider,
          eventType: event.eventType,
          error,
        },
      },
    });
  }

  log.warn({ eventId, retryCount: newRetryCount, isFatal: shouldBeFatal, error }, 'Webhook event processing failed');
}

/**
 * Webhookイベント統計
 */
export async function getWebhookStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  fatal: number;
  ignored: number;
  byProvider: Record<string, number>;
  byEventType: Record<string, number>;
  recentFailures: any[];
}> {
  const [statusCounts, providerCounts, eventTypeCounts, recentFailures] = await Promise.all([
    prisma.webhookEvent.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.webhookEvent.groupBy({
      by: ['provider'],
      _count: true,
    }),
    prisma.webhookEvent.groupBy({
      by: ['eventType'],
      _count: true,
    }),
    prisma.webhookEvent.findMany({
      where: {
        status: { in: ['FAILED', 'FATAL'] },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        eventType: true,
        status: true,
        retryCount: true,
        errorMessage: true,
        createdAt: true,
        lastAttemptedAt: true,
      },
    }),
  ]);

  const statusMap = statusCounts.reduce((acc, item) => {
    acc[item.status.toLowerCase()] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const byProvider = providerCounts.reduce((acc, item) => {
    acc[item.provider] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const byEventType = eventTypeCounts.reduce((acc, item) => {
    acc[item.eventType] = item._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    pending: statusMap.pending || 0,
    processing: statusMap.processing || 0,
    completed: statusMap.completed || 0,
    failed: statusMap.failed || 0,
    fatal: statusMap.fatal || 0,
    ignored: statusMap.ignored || 0,
    byProvider,
    byEventType,
    recentFailures,
  };
}

/**
 * 古いWebhookイベントをクリーンアップ
 */
export async function cleanupOldEvents(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // 完了済みまたは無視されたイベントのみ削除
  const result = await prisma.webhookEvent.deleteMany({
    where: {
      status: { in: ['COMPLETED', 'IGNORED'] },
      createdAt: { lt: cutoffDate },
    },
  });

  log.info({ deleted: result.count, retentionDays }, 'Old webhook events cleaned up');

  return result.count;
}

/**
 * スタックしたPROCESSINGイベントを回復
 */
export async function recoverStuckEvents(stuckThresholdMinutes: number = 10): Promise<number> {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - stuckThresholdMinutes);

  // PROCESSING状態で一定時間経過したイベントをFAILEDに戻す
  const result = await prisma.webhookEvent.updateMany({
    where: {
      status: 'PROCESSING',
      lastAttemptedAt: { lt: cutoffTime },
    },
    data: {
      status: 'FAILED',
      errorMessage: 'Processing timeout - recovered for retry',
    },
  });

  if (result.count > 0) {
    log.warn({ recovered: result.count }, 'Recovered stuck webhook events');
  }

  return result.count;
}

/**
 * 手動でFATALイベントを再処理キューに入れる
 */
export async function resetFatalEvent(eventId: string): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (!event || event.status !== 'FATAL') {
    return false;
  }

  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: 'PENDING',
      retryCount: 0,
      errorMessage: null,
      nextRetryAt: null,
    },
  });

  log.info({ eventId }, 'FATAL webhook event reset to PENDING');

  return true;
}

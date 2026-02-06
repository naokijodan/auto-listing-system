/**
 * 競合価格モニタリングサービス（Phase 29）
 *
 * 競合商品の価格追跡と変動検知
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { eventBus } from '../event-bus';

const log = logger.child({ module: 'CompetitorMonitor' });

export interface TrackerCreateInput {
  listingId?: string;
  productId?: string;
  competitorIdentifier: string;
  marketplace: string;
  url: string;
  title?: string;
  matchMethod?: string;
  matchConfidence?: number;
  checkInterval?: number;
  alertOnPriceDrop?: boolean;
  alertOnPriceRise?: boolean;
  alertThresholdPercent?: number;
  autoAdjustPrice?: boolean;
}

export interface PriceCheckResult {
  trackerId: string;
  success: boolean;
  price?: number;
  previousPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  alertTriggered?: boolean;
  alertType?: string;
  error?: string;
}

class CompetitorMonitorService {
  /**
   * 新しいトラッカーを作成
   */
  async createTracker(input: TrackerCreateInput): Promise<string> {
    const tracker = await prisma.competitorTracker.create({
      data: {
        listingId: input.listingId,
        productId: input.productId,
        competitorIdentifier: input.competitorIdentifier,
        marketplace: input.marketplace,
        url: input.url,
        title: input.title,
        matchMethod: input.matchMethod || 'manual',
        matchConfidence: input.matchConfidence || 1.0,
        checkInterval: input.checkInterval || 360, // デフォルト6時間
        alertOnPriceDrop: input.alertOnPriceDrop ?? true,
        alertOnPriceRise: input.alertOnPriceRise ?? false,
        alertThresholdPercent: input.alertThresholdPercent || 5.0,
        autoAdjustPrice: input.autoAdjustPrice ?? false,
      },
    });

    log.info({
      type: 'tracker_created',
      trackerId: tracker.id,
      marketplace: input.marketplace,
      url: input.url,
    });

    return tracker.id;
  }

  /**
   * トラッカーを更新
   */
  async updateTracker(
    trackerId: string,
    updates: Partial<TrackerCreateInput> & { isActive?: boolean; isVerified?: boolean }
  ): Promise<void> {
    await prisma.competitorTracker.update({
      where: { id: trackerId },
      data: {
        ...updates,
        verifiedAt: updates.isVerified ? new Date() : undefined,
      },
    });

    log.info({
      type: 'tracker_updated',
      trackerId,
    });
  }

  /**
   * チェックが必要なトラッカーを取得
   */
  async getTrackersToCheck(limit: number = 50): Promise<Array<{
    id: string;
    listingId: string | null;
    productId: string | null;
    competitorIdentifier: string;
    marketplace: string;
    url: string;
    lastPrice: number | null;
    alertOnPriceDrop: boolean;
    alertOnPriceRise: boolean;
    alertThresholdPercent: number;
    autoAdjustPrice: boolean;
  }>> {
    const now = new Date();

    // チェック間隔を過ぎたトラッカーを取得
    const trackers = await prisma.competitorTracker.findMany({
      where: {
        isActive: true,
        consecutiveErrors: { lt: 5 }, // 連続エラー5回未満
        OR: [
          { lastCheckedAt: null },
          {
            lastCheckedAt: {
              lt: new Date(now.getTime() - 60 * 60 * 1000), // 1時間以上前
            },
          },
        ],
      },
      orderBy: [
        { lastCheckedAt: 'asc' }, // 古いものから
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    return trackers.map(t => ({
      id: t.id,
      listingId: t.listingId,
      productId: t.productId,
      competitorIdentifier: t.competitorIdentifier,
      marketplace: t.marketplace,
      url: t.url,
      lastPrice: t.lastPrice,
      alertOnPriceDrop: t.alertOnPriceDrop,
      alertOnPriceRise: t.alertOnPriceRise,
      alertThresholdPercent: t.alertThresholdPercent,
      autoAdjustPrice: t.autoAdjustPrice,
    }));
  }

  /**
   * 価格チェック結果を記録
   */
  async recordPriceCheck(
    trackerId: string,
    price: number,
    metadata?: {
      title?: string;
      conditionRank?: string;
      sellerRating?: number;
      stockStatus?: string;
      shippingCost?: number;
    }
  ): Promise<PriceCheckResult> {
    const tracker = await prisma.competitorTracker.findUnique({
      where: { id: trackerId },
    });

    if (!tracker) {
      throw new Error(`Tracker not found: ${trackerId}`);
    }

    const previousPrice = tracker.lastPrice;
    const priceChange = previousPrice !== null ? price - previousPrice : null;
    const priceChangePercent = previousPrice !== null && previousPrice > 0
      ? (priceChange! / previousPrice) * 100
      : null;

    // 価格ログを記録
    await prisma.competitorPriceLog.create({
      data: {
        trackerId,
        competitorIdentifier: tracker.competitorIdentifier,
        listingId: tracker.listingId,
        productId: tracker.productId,
        marketplace: tracker.marketplace,
        price,
        title: metadata?.title || tracker.title,
        url: tracker.url,
        conditionRank: metadata?.conditionRank,
        sellerRating: metadata?.sellerRating,
        stockStatus: metadata?.stockStatus,
        shippingCost: metadata?.shippingCost,
        priceChange,
        priceChangePercent,
        matchConfidence: tracker.matchConfidence,
        isVerified: tracker.isVerified,
      },
    });

    // トラッカーを更新
    await prisma.competitorTracker.update({
      where: { id: trackerId },
      data: {
        lastPrice: price,
        lastCheckedAt: new Date(),
        lastError: null,
        consecutiveErrors: 0,
        title: metadata?.title || tracker.title,
      },
    });

    // アラート判定
    let alertTriggered = false;
    let alertType: string | undefined;

    if (priceChangePercent !== null) {
      const threshold = tracker.alertThresholdPercent;

      if (tracker.alertOnPriceDrop && priceChangePercent <= -threshold) {
        alertTriggered = true;
        alertType = 'price_drop';
      } else if (tracker.alertOnPriceRise && priceChangePercent >= threshold) {
        alertTriggered = true;
        alertType = 'price_rise';
      }

      if (alertTriggered) {
        await this.createAlert(tracker, price, previousPrice!, priceChange!, priceChangePercent, alertType!);
      }
    }

    log.info({
      type: 'price_check_recorded',
      trackerId,
      price,
      previousPrice,
      priceChangePercent,
      alertTriggered,
    });

    return {
      trackerId,
      success: true,
      price,
      previousPrice: previousPrice || undefined,
      priceChange: priceChange || undefined,
      priceChangePercent: priceChangePercent || undefined,
      alertTriggered,
      alertType,
    };
  }

  /**
   * エラーを記録
   */
  async recordError(trackerId: string, error: string): Promise<void> {
    await prisma.competitorTracker.update({
      where: { id: trackerId },
      data: {
        lastCheckedAt: new Date(),
        lastError: error,
        consecutiveErrors: { increment: 1 },
      },
    });

    log.warn({
      type: 'price_check_error',
      trackerId,
      error,
    });
  }

  /**
   * アラートを作成
   */
  private async createAlert(
    tracker: any,
    currentPrice: number,
    previousPrice: number,
    priceDiff: number,
    priceDiffPercent: number,
    alertType: string
  ): Promise<void> {
    // 自社価格を取得
    let ourPrice: number | undefined;
    if (tracker.listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: tracker.listingId },
        select: { listingPrice: true },
      });
      ourPrice = listing?.listingPrice;
    }

    const severity = this.calculateSeverity(priceDiffPercent, alertType, ourPrice, currentPrice);

    const alert = await prisma.competitorAlert.create({
      data: {
        trackerId: tracker.id,
        listingId: tracker.listingId,
        productId: tracker.productId,
        alertType,
        severity,
        title: `競合価格${alertType === 'price_drop' ? '値下げ' : '値上げ'}検知`,
        message: `${tracker.title || tracker.competitorIdentifier}の価格が${previousPrice.toFixed(2)}から${currentPrice.toFixed(2)}に変更されました（${priceDiffPercent > 0 ? '+' : ''}${priceDiffPercent.toFixed(1)}%）`,
        ourPrice,
        competitorPrice: currentPrice,
        priceDiff,
        priceDiffPercent,
        metadata: {
          previousPrice,
          marketplace: tracker.marketplace,
          url: tracker.url,
        },
      },
    });

    // リアルタイムイベント発火
    if (eventBus.initialized && tracker.listingId) {
      await eventBus.publishPriceChange(tracker.listingId, {
        type: 'competitor_alert',
        alertId: alert.id,
        alertType,
        competitorPrice: currentPrice,
        priceDiffPercent,
      });
    }

    log.info({
      type: 'competitor_alert_created',
      alertId: alert.id,
      trackerId: tracker.id,
      alertType,
      severity,
    });
  }

  /**
   * 重要度を計算
   */
  private calculateSeverity(
    priceDiffPercent: number,
    alertType: string,
    ourPrice?: number,
    competitorPrice?: number
  ): string {
    const absDiff = Math.abs(priceDiffPercent);

    // 競合が自社より安くなった場合は重要度を上げる
    if (alertType === 'price_drop' && ourPrice && competitorPrice && competitorPrice < ourPrice) {
      if (competitorPrice < ourPrice * 0.85) return 'critical';
      if (competitorPrice < ourPrice * 0.95) return 'high';
      return 'medium';
    }

    if (absDiff >= 20) return 'critical';
    if (absDiff >= 10) return 'high';
    if (absDiff >= 5) return 'medium';
    return 'low';
  }

  /**
   * 未対応アラート一覧を取得
   */
  async getPendingAlerts(options?: {
    listingId?: string;
    productId?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    trackerId: string;
    listingId: string | null;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    ourPrice: number | null;
    competitorPrice: number | null;
    priceDiffPercent: number | null;
    createdAt: Date;
  }>> {
    const alerts = await prisma.competitorAlert.findMany({
      where: {
        status: 'pending',
        ...(options?.listingId ? { listingId: options.listingId } : {}),
        ...(options?.productId ? { productId: options.productId } : {}),
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 50,
    });

    return alerts.map(a => ({
      id: a.id,
      trackerId: a.trackerId,
      listingId: a.listingId,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      message: a.message,
      ourPrice: a.ourPrice,
      competitorPrice: a.competitorPrice,
      priceDiffPercent: a.priceDiffPercent,
      createdAt: a.createdAt,
    }));
  }

  /**
   * アラートを確認済みにする
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy?: string): Promise<void> {
    await prisma.competitorAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * アラートを解決済みにする
   */
  async resolveAlert(alertId: string): Promise<void> {
    await prisma.competitorAlert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * 統計情報を取得
   */
  async getStats(days: number = 7): Promise<{
    totalTrackers: number;
    activeTrackers: number;
    verifiedTrackers: number;
    totalAlerts: number;
    pendingAlerts: number;
    priceChecksToday: number;
    avgPriceChange: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTrackers,
      activeTrackers,
      verifiedTrackers,
      totalAlerts,
      pendingAlerts,
      priceChecksToday,
      recentLogs,
    ] = await Promise.all([
      prisma.competitorTracker.count(),
      prisma.competitorTracker.count({ where: { isActive: true } }),
      prisma.competitorTracker.count({ where: { isVerified: true } }),
      prisma.competitorAlert.count({ where: { createdAt: { gte: since } } }),
      prisma.competitorAlert.count({ where: { status: 'pending' } }),
      prisma.competitorPriceLog.count({ where: { recordedAt: { gte: today } } }),
      prisma.competitorPriceLog.findMany({
        where: {
          recordedAt: { gte: since },
          priceChangePercent: { not: null },
        },
        select: { priceChangePercent: true },
      }),
    ]);

    const avgPriceChange = recentLogs.length > 0
      ? recentLogs.reduce((sum, l) => sum + (l.priceChangePercent || 0), 0) / recentLogs.length
      : 0;

    return {
      totalTrackers,
      activeTrackers,
      verifiedTrackers,
      totalAlerts,
      pendingAlerts,
      priceChecksToday,
      avgPriceChange: Math.round(avgPriceChange * 100) / 100,
    };
  }
}

// シングルトンインスタンス
export const competitorMonitor = new CompetitorMonitorService();

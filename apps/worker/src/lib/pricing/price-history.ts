/**
 * 価格履歴サービス（Phase 28）
 *
 * 価格の時系列データを管理し、分析機能を提供
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'PriceHistory' });

export type PriceSource = 'manual' | 'rule' | 'ai' | 'competitor' | 'initial' | 'auto';

export interface PriceHistoryEntry {
  id: string;
  listingId: string;
  price: number;
  currency: string;
  source: string;
  metadata: Record<string, unknown> | null;
  recordedAt: Date;
}

export interface PriceStatistics {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  stdDev: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

class PriceHistoryService {
  /**
   * 価格を記録
   */
  async recordPrice(
    listingId: string,
    price: number,
    source: PriceSource,
    metadata?: Record<string, unknown>
  ): Promise<PriceHistoryEntry> {
    const entry = await prisma.priceHistory.create({
      data: {
        listingId,
        price,
        source,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });

    log.debug({
      type: 'price_recorded',
      listingId,
      price,
      source,
    });

    return entry as PriceHistoryEntry;
  }

  /**
   * 価格履歴を取得
   */
  async getHistory(
    listingId: string,
    days: number = 30,
    limit: number = 1000
  ): Promise<PriceHistoryEntry[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const entries = await prisma.priceHistory.findMany({
      where: {
        listingId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return entries as PriceHistoryEntry[];
  }

  /**
   * 最新の価格を取得
   */
  async getLatestPrice(listingId: string): Promise<number | null> {
    const entry = await prisma.priceHistory.findFirst({
      where: { listingId },
      orderBy: { recordedAt: 'desc' },
    });

    return entry?.price ?? null;
  }

  /**
   * 平均価格を計算
   */
  async getAveragePrice(listingId: string, days: number = 30): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await prisma.priceHistory.aggregate({
      where: {
        listingId,
        recordedAt: { gte: since },
      },
      _avg: { price: true },
    });

    return result._avg.price ?? 0;
  }

  /**
   * 価格統計を計算
   */
  async getStatistics(listingId: string, days: number = 30): Promise<PriceStatistics | null> {
    const history = await this.getHistory(listingId, days);

    if (history.length === 0) {
      return null;
    }

    const prices = history.map(h => h.price);
    const count = prices.length;
    const sum = prices.reduce((a, b) => a + b, 0);
    const avgPrice = sum / count;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // 標準偏差
    const squaredDiffs = prices.map(p => Math.pow(p - avgPrice, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // ボラティリティ（変動係数）
    const volatility = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;

    // トレンド計算（最新と最古の比較）
    const oldestPrice = history[history.length - 1].price;
    const newestPrice = history[0].price;
    const trendPercent = oldestPrice > 0
      ? ((newestPrice - oldestPrice) / oldestPrice) * 100
      : 0;

    let trend: 'up' | 'down' | 'stable';
    if (trendPercent > 2) {
      trend = 'up';
    } else if (trendPercent < -2) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      count,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice,
      maxPrice,
      stdDev: Math.round(stdDev * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      trend,
      trendPercent: Math.round(trendPercent * 100) / 100,
    };
  }

  /**
   * 価格変動率を計算
   */
  async getPriceVolatility(listingId: string, days: number = 30): Promise<number> {
    const stats = await this.getStatistics(listingId, days);
    return stats?.volatility ?? 0;
  }

  /**
   * 競合価格を記録
   */
  async recordCompetitorPrice(
    competitorIdentifier: string,
    price: number,
    options: {
      listingId?: string;
      productId?: string;
      marketplace: string;
      title?: string;
      url?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await prisma.competitorPriceLog.create({
      data: {
        competitorIdentifier,
        price,
        listingId: options.listingId,
        productId: options.productId,
        marketplace: options.marketplace,
        title: options.title,
        url: options.url,
        metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
      },
    });

    log.debug({
      type: 'competitor_price_recorded',
      competitorIdentifier,
      price,
      marketplace: options.marketplace,
    });
  }

  /**
   * 競合価格履歴を取得
   */
  async getCompetitorHistory(
    listingId: string,
    days: number = 30
  ): Promise<Array<{
    competitorIdentifier: string;
    price: number;
    marketplace: string;
    title: string | null;
    url: string | null;
    recordedAt: Date;
  }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.competitorPriceLog.findMany({
      where: {
        listingId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'desc' },
      select: {
        competitorIdentifier: true,
        price: true,
        marketplace: true,
        title: true,
        url: true,
        recordedAt: true,
      },
    });

    return logs;
  }

  /**
   * 価格変更をログに記録
   */
  async logPriceChange(
    listingId: string,
    oldPrice: number,
    newPrice: number,
    source: PriceSource,
    options?: {
      recommendationId?: string;
      ruleId?: string;
      reason?: string;
      platformUpdated?: boolean;
      platformError?: string;
    }
  ): Promise<void> {
    const changePercent = oldPrice > 0
      ? ((newPrice - oldPrice) / oldPrice) * 100
      : 0;

    await prisma.priceChangeLog.create({
      data: {
        listingId,
        oldPrice,
        newPrice,
        changePercent,
        source,
        recommendationId: options?.recommendationId,
        ruleId: options?.ruleId,
        reason: options?.reason,
        platformUpdated: options?.platformUpdated ?? false,
        platformError: options?.platformError,
      },
    });

    log.info({
      type: 'price_change_logged',
      listingId,
      oldPrice,
      newPrice,
      changePercent: Math.round(changePercent * 100) / 100,
      source,
    });
  }

  /**
   * 価格変更履歴を取得
   */
  async getPriceChangeHistory(
    listingId: string,
    days: number = 30
  ): Promise<Array<{
    id: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    source: string;
    reason: string | null;
    createdAt: Date;
  }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.priceChangeLog.findMany({
      where: {
        listingId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        oldPrice: true,
        newPrice: true,
        changePercent: true,
        source: true,
        reason: true,
        createdAt: true,
      },
    });

    return logs;
  }

  /**
   * バルク価格記録（バッチ処理用）
   */
  async recordPricesBulk(
    entries: Array<{
      listingId: string;
      price: number;
      source: PriceSource;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<number> {
    const result = await prisma.priceHistory.createMany({
      data: entries.map(e => ({
        listingId: e.listingId,
        price: e.price,
        source: e.source,
        metadata: e.metadata ? JSON.parse(JSON.stringify(e.metadata)) : undefined,
      })),
    });

    log.info({
      type: 'prices_recorded_bulk',
      count: result.count,
    });

    return result.count;
  }

  /**
   * 古い履歴を削除（クリーンアップ）
   */
  async cleanupOldHistory(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await prisma.priceHistory.deleteMany({
      where: {
        recordedAt: { lt: cutoff },
      },
    });

    log.info({
      type: 'price_history_cleaned',
      deletedCount: result.count,
      retentionDays,
    });

    return result.count;
  }
}

// シングルトンインスタンス
export const priceHistoryService = new PriceHistoryService();

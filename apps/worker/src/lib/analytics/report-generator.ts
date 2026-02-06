/**
 * レポート生成サービス（Phase 30C）
 *
 * 定期レポートの生成・エクスポート
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { unifiedAnalytics } from './unified-analytics';
import { trendPredictor } from './trend-predictor';

const log = logger.child({ module: 'ReportGenerator' });

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'json' | 'csv' | 'markdown';

export interface ReportSection {
  title: string;
  data: any;
  summary?: string;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: ReportFormat;
  period: {
    from: Date;
    to: Date;
  };
  sections: ReportSection[];
  generatedAt: Date;
  content?: string; // フォーマット済みコンテンツ
}

class ReportGeneratorService {
  /**
   * 日次レポートを生成
   */
  async generateDailyReport(date?: Date): Promise<GeneratedReport> {
    const targetDate = date || new Date();
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);

    log.info({ type: 'generate_daily_report', date: from.toISOString() });

    const [
      orders,
      newListings,
      priceChanges,
      competitorAlerts,
      recommendations,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { sales: true },
      }),
      prisma.listing.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceChangeLog.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.competitorAlert.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.priceRecommendation.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => {
      return sum + o.sales.reduce((s, sale) => s + (sale.profitJpy || 0), 0);
    }, 0);

    const sections: ReportSection[] = [
      {
        title: '売上サマリー',
        data: {
          ordersCount: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgOrderValue: orders.length > 0
            ? Math.round((totalRevenue / orders.length) * 100) / 100
            : 0,
        },
        summary: `本日の注文数: ${orders.length}件、売上: $${totalRevenue.toFixed(2)}`,
      },
      {
        title: '出品活動',
        data: {
          newListings,
          priceChanges,
        },
        summary: `新規出品: ${newListings}件、価格変更: ${priceChanges}件`,
      },
      {
        title: '価格最適化',
        data: {
          recommendationsGenerated: recommendations.length,
          recommendationsApplied: recommendations.filter(r => r.status === 'APPLIED').length,
          recommendationsPending: recommendations.filter(r => r.status === 'PENDING').length,
        },
        summary: `推奨生成: ${recommendations.length}件、適用済み: ${recommendations.filter(r => r.status === 'APPLIED').length}件`,
      },
      {
        title: '競合モニタリング',
        data: {
          alertsGenerated: competitorAlerts,
        },
        summary: `アラート発生: ${competitorAlerts}件`,
      },
    ];

    return {
      id: `daily-${from.toISOString().split('T')[0]}`,
      type: 'daily',
      format: 'json',
      period: { from, to },
      sections,
      generatedAt: new Date(),
    };
  }

  /**
   * 週次レポートを生成
   */
  async generateWeeklyReport(weekStart?: Date): Promise<GeneratedReport> {
    const from = weekStart || this.getWeekStart(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);

    log.info({ type: 'generate_weekly_report', from: from.toISOString() });

    const summary = await unifiedAnalytics.getDashboardSummary(7);

    // 日別の売上トレンド
    const salesTrend = await unifiedAnalytics.getSalesTrend(7);

    // 予測
    const forecast = await trendPredictor.forecastSales(7);

    const sections: ReportSection[] = [
      {
        title: '週間サマリー',
        data: summary.overview,
        summary: `総売上: $${summary.overview.totalRevenue}、注文数: ${summary.overview.activeListings}件`,
      },
      {
        title: '価格最適化レポート',
        data: summary.pricing,
        summary: `推奨生成: ${summary.pricing.recommendationsGenerated}件、適用: ${summary.pricing.recommendationsApplied}件`,
      },
      {
        title: '競合分析',
        data: summary.competitors,
        summary: `アクティブトラッカー: ${summary.competitors.trackersActive}、ペンディングアラート: ${summary.competitors.alertsPending}`,
      },
      {
        title: '日別売上トレンド',
        data: salesTrend.salesCount,
      },
      {
        title: 'トップカテゴリ',
        data: salesTrend.topCategories,
      },
      {
        title: '来週の予測',
        data: forecast,
      },
    ];

    return {
      id: `weekly-${from.toISOString().split('T')[0]}`,
      type: 'weekly',
      format: 'json',
      period: { from, to },
      sections,
      generatedAt: new Date(),
    };
  }

  /**
   * 月次レポートを生成
   */
  async generateMonthlyReport(monthStart?: Date): Promise<GeneratedReport> {
    const from = monthStart || this.getMonthStart(new Date());
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    to.setDate(0); // 前月の最終日
    to.setHours(23, 59, 59, 999);

    const daysInMonth = to.getDate();

    log.info({ type: 'generate_monthly_report', from: from.toISOString() });

    const summary = await unifiedAnalytics.getDashboardSummary(daysInMonth);
    const salesTrend = await unifiedAnalytics.getSalesTrend(daysInMonth);
    const pricingTrend = await unifiedAnalytics.getPricingTrend(daysInMonth);
    const competitorTrend = await unifiedAnalytics.getCompetitorTrend(daysInMonth);

    // 前月との比較
    const previousFrom = new Date(from);
    previousFrom.setMonth(previousFrom.getMonth() - 1);
    const previousSummary = await unifiedAnalytics.getDashboardSummary(daysInMonth);

    const revenueChange = previousSummary.overview.totalRevenue > 0
      ? ((summary.overview.totalRevenue - previousSummary.overview.totalRevenue) / previousSummary.overview.totalRevenue) * 100
      : 0;

    const sections: ReportSection[] = [
      {
        title: '月間ハイライト',
        data: {
          totalRevenue: summary.overview.totalRevenue,
          totalProfit: summary.overview.totalProfit,
          revenueChangePercent: Math.round(revenueChange * 100) / 100,
          avgMarginPercent: summary.overview.avgMarginPercent,
        },
        summary: `月間売上: $${summary.overview.totalRevenue}（前月比: ${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%）`,
      },
      {
        title: '在庫・出品状況',
        data: {
          totalProducts: summary.overview.totalProducts,
          activeListings: summary.overview.activeListings,
          staleItems: summary.inventory.staleItems,
        },
      },
      {
        title: '価格最適化効果',
        data: {
          recommendationsGenerated: summary.pricing.recommendationsGenerated,
          recommendationsApplied: summary.pricing.recommendationsApplied,
          avgPriceChange: summary.pricing.avgPriceChange,
          priceIncreases: summary.pricing.priceIncreases,
          priceDecreases: summary.pricing.priceDecreases,
        },
      },
      {
        title: '競合分析サマリー',
        data: {
          trackersActive: summary.competitors.trackersActive,
          alertsPending: summary.competitors.alertsPending,
          avgCompetitorPriceChange: summary.competitors.avgCompetitorPriceChange,
          priceAdvantage: summary.competitors.priceAdvantage,
        },
      },
      {
        title: '売上トレンド',
        data: salesTrend,
      },
      {
        title: '価格変更トレンド',
        data: pricingTrend,
      },
      {
        title: '競合価格トレンド',
        data: competitorTrend,
      },
    ];

    return {
      id: `monthly-${from.toISOString().slice(0, 7)}`,
      type: 'monthly',
      format: 'json',
      period: { from, to },
      sections,
      generatedAt: new Date(),
    };
  }

  /**
   * レポートをマークダウン形式に変換
   */
  formatAsMarkdown(report: GeneratedReport): string {
    const lines: string[] = [];

    // タイトル
    const typeLabel = {
      daily: '日次',
      weekly: '週次',
      monthly: '月次',
    }[report.type];

    lines.push(`# ${typeLabel}レポート`);
    lines.push('');
    lines.push(`**期間**: ${report.period.from.toISOString().split('T')[0]} 〜 ${report.period.to.toISOString().split('T')[0]}`);
    lines.push(`**生成日時**: ${report.generatedAt.toISOString()}`);
    lines.push('');

    for (const section of report.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');

      if (section.summary) {
        lines.push(`> ${section.summary}`);
        lines.push('');
      }

      if (Array.isArray(section.data)) {
        // 配列の場合はテーブルとして出力
        if (section.data.length > 0) {
          const keys = Object.keys(section.data[0]);
          lines.push('| ' + keys.join(' | ') + ' |');
          lines.push('| ' + keys.map(() => '---').join(' | ') + ' |');
          for (const row of section.data) {
            lines.push('| ' + keys.map(k => String(row[k] ?? '')).join(' | ') + ' |');
          }
          lines.push('');
        }
      } else if (typeof section.data === 'object') {
        // オブジェクトの場合はリストとして出力
        for (const [key, value] of Object.entries(section.data)) {
          if (typeof value === 'object') {
            lines.push(`- **${key}**: ${JSON.stringify(value)}`);
          } else {
            lines.push(`- **${key}**: ${value}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * レポートをCSV形式に変換
   */
  formatAsCsv(report: GeneratedReport): string {
    const lines: string[] = [];

    lines.push(`Report Type,${report.type}`);
    lines.push(`Period Start,${report.period.from.toISOString()}`);
    lines.push(`Period End,${report.period.to.toISOString()}`);
    lines.push(`Generated At,${report.generatedAt.toISOString()}`);
    lines.push('');

    for (const section of report.sections) {
      lines.push(`[${section.title}]`);

      if (Array.isArray(section.data) && section.data.length > 0) {
        const keys = Object.keys(section.data[0]);
        lines.push(keys.join(','));
        for (const row of section.data) {
          lines.push(keys.map(k => {
            const val = row[k];
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`;
            }
            return String(val ?? '');
          }).join(','));
        }
      } else if (typeof section.data === 'object') {
        lines.push('Key,Value');
        for (const [key, value] of Object.entries(section.data)) {
          lines.push(`${key},${typeof value === 'object' ? JSON.stringify(value) : value}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 週の開始日を取得（日曜日）
   */
  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 月の開始日を取得
   */
  private getMonthStart(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}

// シングルトンインスタンス
export const reportGenerator = new ReportGeneratorService();

'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QueueStatus } from '@/components/dashboard/queue-status';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SalesChart } from '@/components/dashboard/sales-chart';
import {
  Package,
  ShoppingCart,
  Activity,
  DollarSign,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Heart,
  BarChart3,
} from 'lucide-react';
import { useDashboardStats, useJobLogs } from '@/lib/hooks';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KpiData {
  totalProducts: number;
  totalListings: number;
  activeListings: number;
  soldToday: number;
  soldThisWeek: number;
  soldThisMonth: number;
  revenue: { today: number; thisWeek: number; thisMonth: number };
  grossProfit: { today: number; thisWeek: number; thisMonth: number };
  outOfStockCount: number;
  staleListings30: number;
  staleListings60: number;
  staleRate: number;
  healthScore: number;
  healthScoreBreakdown: { staleScore: number; stockScore: number; profitScore: number };
  productsByStatus: Record<string, number>;
}

interface TrendData {
  date: string;
  listings: number;
  sold: number;
  revenue: number;
}

export default function Dashboard() {
  // Fetch dashboard data
  const { products, listings, queueStats, isLoading } = useDashboardStats();
  const { data: jobLogsData } = useJobLogs({ limit: 10 });

  // Fetch KPI data
  const { data: kpiResponse } = useSWR<{ success: boolean; data: KpiData }>(
    '/api/analytics/kpi',
    fetcher,
    { refreshInterval: 60000 }
  );
  const kpi = kpiResponse?.data;

  // Fetch trend data
  const { data: trendResponse } = useSWR<{ success: boolean; data: TrendData[] }>(
    '/api/analytics/trends/sales?days=14',
    fetcher,
    { refreshInterval: 300000 }
  );
  const trendData = trendResponse?.data || [];

  // Transform job logs to activity format
  const activities = useMemo(() => {
    if (!jobLogsData?.data) return [];
    return jobLogsData.data.map((log) => ({
      id: log.id,
      type: log.status === 'failed' ? 'job_failed' as const :
            log.status === 'completed' ? 'job_completed' as const :
            'product_added' as const,
      title: `${log.queueName} - ${log.jobType}`,
      description: log.errorMessage || `Job ID: ${log.jobId.slice(0, 8)}`,
      status: log.status,
      createdAt: log.createdAt,
    }));
  }, [jobLogsData]);

  // Transform queue stats
  const queues = useMemo(() => {
    return queueStats.map((q) => ({
      name: q.name,
      waiting: q.waiting,
      active: q.active,
      completed: q.completed,
      failed: q.failed,
      delayed: q.delayed,
    }));
  }, [queueStats]);

  // Health score color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ダッシュボード</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            RAKUDAの稼働状況を一目で確認
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            更新中...
          </div>
        )}
      </div>

      {/* Health Score Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              getHealthBg(kpi?.healthScore || 0)
            )}>
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                ストア健全性スコア
              </h3>
              <p className={cn('text-3xl font-bold', getHealthColor(kpi?.healthScore || 0))}>
                {kpi?.healthScore ?? '--'} / 100
              </p>
            </div>
          </div>
          <div className="hidden gap-6 sm:flex">
            <div className="text-center">
              <p className="text-xs text-zinc-500">滞留スコア</p>
              <p className="text-lg font-semibold">{kpi?.healthScoreBreakdown?.staleScore ?? '--'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">在庫スコア</p>
              <p className="text-lg font-semibold">{kpi?.healthScoreBreakdown?.stockScore ?? '--'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">利益スコア</p>
              <p className="text-lg font-semibold">{kpi?.healthScoreBreakdown?.profitScore ?? '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総商品数"
          value={kpi?.totalProducts ?? products}
          icon={Package}
          changeLabel={`出品中: ${kpi?.activeListings ?? listings}`}
          color="blue"
        />
        <StatsCard
          title="今月の販売"
          value={kpi?.soldThisMonth ?? 0}
          icon={ShoppingCart}
          changeLabel={`今週: ${kpi?.soldThisWeek ?? 0} / 今日: ${kpi?.soldToday ?? 0}`}
          color="amber"
        />
        <StatsCard
          title="今月の売上"
          value={`$${(kpi?.revenue?.thisMonth ?? 0).toLocaleString()}`}
          icon={DollarSign}
          changeLabel={`粗利: $${(kpi?.grossProfit?.thisMonth ?? 0).toLocaleString()}`}
          color="emerald"
        />
        <StatsCard
          title="滞留率"
          value={`${kpi?.staleRate ?? 0}%`}
          icon={Clock}
          changeLabel={`30日超: ${kpi?.staleListings30 ?? 0}件 / 60日超: ${kpi?.staleListings60 ?? 0}件`}
          color={kpi?.staleRate && kpi.staleRate > 20 ? 'red' : 'purple'}
        />
      </div>

      {/* Alert Cards */}
      {(kpi?.staleListings60 ?? 0) > 0 || (kpi?.outOfStockCount ?? 0) > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(kpi?.staleListings60 ?? 0) > 0 && (
            <Link
              href="/inventory/stale"
              className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
            >
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {kpi?.staleListings60}件が60日以上滞留
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  クリックして滞留在庫を確認
                </p>
              </div>
            </Link>
          )}
          {(kpi?.outOfStockCount ?? 0) > 0 && (
            <Link
              href="/products?status=OUT_OF_STOCK"
              className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30"
            >
              <Activity className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">
                  {kpi?.outOfStockCount}件が在庫切れ
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  クリックして確認
                </p>
              </div>
            </Link>
          )}
        </div>
      ) : null}

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={trendData.length > 0 ? trendData : [
            { date: '---', listings: 0, sold: 0 },
          ]} />
        </div>
        <div>
          <RecentActivity activities={activities.length > 0 ? activities : [
            { id: '0', type: 'product_added' as const, title: 'データなし', description: 'ジョブログがありません', createdAt: new Date().toISOString() }
          ]} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/analytics/bestsellers"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">売れ筋分析</p>
            <p className="text-xs text-zinc-500">カテゴリ・ブランド別</p>
          </div>
        </Link>
        <Link
          href="/inventory/stale"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">滞留在庫管理</p>
            <p className="text-xs text-zinc-500">一括処理・アラート</p>
          </div>
        </Link>
        <Link
          href="/pricing/recommendations"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">価格提案</p>
            <p className="text-xs text-zinc-500">シミュレーション</p>
          </div>
        </Link>
      </div>

      {/* Queue Status */}
      <QueueStatus queues={queues.length > 0 ? queues : [
        { name: 'scrape', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        { name: 'translate', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        { name: 'image', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        { name: 'publish', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      ]} />

      {/* Exchange Rate Card */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-zinc-800 dark:from-amber-900/20 dark:to-orange-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              現在の為替レート
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              最終更新: {new Date().toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              ¥150.00 / $1
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              価格計算に使用
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

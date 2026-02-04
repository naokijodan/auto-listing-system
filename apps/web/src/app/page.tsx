'use client';

import { useMemo } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QueueStatus } from '@/components/dashboard/queue-status';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { Package, ShoppingCart, Activity, DollarSign, Loader2 } from 'lucide-react';
import { useDashboardStats, useJobLogs, useQueueStats } from '@/lib/hooks';

// Chart data (placeholder - will be calculated from real data later)
const mockChartData = [
  { date: '1/29', listings: 45, sold: 12 },
  { date: '1/30', listings: 52, sold: 18 },
  { date: '1/31', listings: 38, sold: 15 },
  { date: '2/1', listings: 65, sold: 22 },
  { date: '2/2', listings: 48, sold: 19 },
  { date: '2/3', listings: 72, sold: 28 },
  { date: '2/4', listings: 58, sold: 24 },
];

export default function Dashboard() {
  // Fetch dashboard data
  const { products, listings, queueStats, isLoading } = useDashboardStats();
  const { data: jobLogsData } = useJobLogs({ limit: 10 });

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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総商品数"
          value={isLoading ? '...' : products}
          icon={Package}
          changeLabel="データ取得中"
          color="blue"
        />
        <StatsCard
          title="出品数"
          value={isLoading ? '...' : listings}
          icon={ShoppingCart}
          changeLabel="データ取得中"
          color="amber"
        />
        <StatsCard
          title="販売数（今月）"
          value={isLoading ? '...' : '-'}
          icon={Activity}
          changeLabel="未実装"
          color="emerald"
        />
        <StatsCard
          title="売上（今月）"
          value={isLoading ? '...' : '-'}
          icon={DollarSign}
          changeLabel="未実装"
          color="purple"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={mockChartData} />
        </div>
        <div>
          <RecentActivity activities={activities.length > 0 ? activities : [
            { id: '0', type: 'product_added' as const, title: 'データなし', description: 'ジョブログがありません', createdAt: new Date().toISOString() }
          ]} />
        </div>
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
              最終更新: 2024/02/04 09:00
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              ¥148.52 / $1
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              +0.3% (前日比)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

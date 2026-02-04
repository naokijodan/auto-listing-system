'use client';

import { StatsCard } from '@/components/dashboard/stats-card';
import { QueueStatus } from '@/components/dashboard/queue-status';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { Package, ShoppingCart, Activity, DollarSign } from 'lucide-react';

// Demo data - will be replaced with real API data
const mockStats = {
  products: { total: 1234, change: 12 },
  listings: { total: 856, change: 8 },
  sold: { total: 234, change: 15 },
  revenue: { total: 1250000, change: 23 },
};

const mockQueues = [
  { name: 'scrape', waiting: 5, active: 2, completed: 150, failed: 3 },
  { name: 'translate', waiting: 3, active: 1, completed: 145, failed: 1 },
  { name: 'image', waiting: 8, active: 3, completed: 140, failed: 2 },
  { name: 'publish', waiting: 2, active: 1, completed: 130, failed: 5 },
  { name: 'inventory', waiting: 0, active: 0, completed: 500, failed: 0 },
];

const mockActivities = [
  {
    id: '1',
    type: 'listing_published' as const,
    title: 'eBayに出品完了',
    description: 'SEIKO SKX007 - $299.99',
    status: 'published',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '2',
    type: 'product_added' as const,
    title: '新商品を追加',
    description: 'メルカリから取得: ヴィンテージ時計',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'job_completed' as const,
    title: '在庫チェック完了',
    description: '500商品をチェック、3件の在庫切れを検知',
    status: 'completed',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: '4',
    type: 'price_updated' as const,
    title: '価格自動更新',
    description: '為替レート変動により12商品の価格を調整',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: '5',
    type: 'job_failed' as const,
    title: '出品エラー',
    description: 'Joom API レート制限',
    status: 'failed',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
];

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
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ダッシュボード</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          RAKUDAの稼働状況を一目で確認
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総商品数"
          value={mockStats.products.total}
          icon={Package}
          change={mockStats.products.change}
          changeLabel="先週比"
          color="blue"
        />
        <StatsCard
          title="出品中"
          value={mockStats.listings.total}
          icon={ShoppingCart}
          change={mockStats.listings.change}
          changeLabel="先週比"
          color="amber"
        />
        <StatsCard
          title="販売数（今月）"
          value={mockStats.sold.total}
          icon={Activity}
          change={mockStats.sold.change}
          changeLabel="先月比"
          color="emerald"
        />
        <StatsCard
          title="売上（今月）"
          value={`¥${(mockStats.revenue.total / 10000).toFixed(0)}万`}
          icon={DollarSign}
          change={mockStats.revenue.change}
          changeLabel="先月比"
          color="purple"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={mockChartData} />
        </div>
        <div>
          <RecentActivity activities={mockActivities} />
        </div>
      </div>

      {/* Queue Status */}
      <QueueStatus queues={mockQueues} />

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

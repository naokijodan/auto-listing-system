'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type Period = 'day' | 'week' | 'month';

const periods: { id: Period; label: string }[] = [
  { id: 'day', label: '今日' },
  { id: 'week', label: '今週' },
  { id: 'month', label: '今月' },
];

// Mock data for reports
const generateMockData = (period: Period) => {
  const days = period === 'day' ? 24 : period === 'week' ? 7 : 30;
  const labels = period === 'day'
    ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
    : period === 'week'
    ? ['月', '火', '水', '木', '金', '土', '日']
    : Array.from({ length: 30 }, (_, i) => `${i + 1}日`);

  return {
    summary: {
      totalProducts: 1234 + Math.floor(Math.random() * 100),
      newProducts: 45 + Math.floor(Math.random() * 20),
      totalListings: 856 + Math.floor(Math.random() * 50),
      newListings: 23 + Math.floor(Math.random() * 10),
      soldItems: 12 + Math.floor(Math.random() * 5),
      revenue: 125000 + Math.floor(Math.random() * 50000),
      averagePrice: 98.5 + Math.random() * 20,
      jobsCompleted: 450 + Math.floor(Math.random() * 100),
      jobsFailed: 5 + Math.floor(Math.random() * 3),
    },
    salesData: labels.map((label, i) => ({
      name: label,
      listings: Math.floor(Math.random() * 20) + 5,
      sold: Math.floor(Math.random() * 5),
    })),
    categoryData: [
      { name: '時計', value: 45, color: '#f59e0b' },
      { name: 'アクセサリー', value: 25, color: '#10b981' },
      { name: 'バッグ', value: 15, color: '#3b82f6' },
      { name: 'その他', value: 15, color: '#8b5cf6' },
    ],
    statusData: [
      { name: 'アクティブ', value: 650, color: '#10b981' },
      { name: '処理中', value: 120, color: '#f59e0b' },
      { name: 'エラー', value: 15, color: '#ef4444' },
      { name: '下書き', value: 71, color: '#6b7280' },
    ],
    revenueData: labels.map((label) => ({
      name: label,
      revenue: Math.floor(Math.random() * 50000) + 10000,
    })),
    topProducts: [
      { title: 'SEIKO SKX007', sold: 5, revenue: 1495.00 },
      { title: 'ORIENT Bambino', sold: 3, revenue: 897.00 },
      { title: 'G-SHOCK GA-2100', sold: 2, revenue: 398.00 },
      { title: 'CITIZEN Promaster', sold: 2, revenue: 378.00 },
      { title: 'Hermes Silk Tie', sold: 1, revenue: 189.00 },
    ],
  };
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const data = useMemo(() => generateMockData(period), [period]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">レポート</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            販売・出品データの分析レポート
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  period === p.id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="新規商品"
          value={data.summary.newProducts}
          total={data.summary.totalProducts}
          icon={Package}
          color="blue"
        />
        <SummaryCard
          title="新規出品"
          value={data.summary.newListings}
          total={data.summary.totalListings}
          icon={ShoppingCart}
          color="amber"
        />
        <SummaryCard
          title="販売数"
          value={data.summary.soldItems}
          subtext={`平均 $${data.summary.averagePrice.toFixed(2)}`}
          icon={TrendingUp}
          color="emerald"
        />
        <SummaryCard
          title="売上"
          value={`¥${(data.summary.revenue / 10000).toFixed(1)}万`}
          subtext={`${data.summary.soldItems}件の販売`}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              出品・販売推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: '#71717a' }} />
                  <YAxis className="text-xs" tick={{ fill: '#71717a' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="listings" fill="#f59e0b" name="出品数" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sold" fill="#10b981" name="販売数" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              売上推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: '#71717a' }} />
                  <YAxis className="text-xs" tick={{ fill: '#71717a' }} tickFormatter={(v) => `¥${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {data.categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>ステータス分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {data.statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>売上トップ商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div key={product.title} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      index === 1 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {product.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {product.sold}件販売
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    ${product.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            ジョブ実行状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {data.summary.jobsCompleted}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">完了</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {data.summary.jobsFailed}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">失敗</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {((data.summary.jobsCompleted / (data.summary.jobsCompleted + data.summary.jobsFailed)) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">成功率</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  total?: number;
  subtext?: string;
  icon: typeof Package;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}

function SummaryCard({ title, value, total, subtext, icon: Icon, color }: SummaryCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {total !== undefined && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                全{total.toLocaleString()}件中
              </p>
            )}
            {subtext && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtext}</p>
            )}
          </div>
          <div className={cn('rounded-xl p-3', colorStyles[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  useKpi,
  useSalesTrends,
  useCategoryRankings,
  usePnl,
  useFinancialDaily,
} from '@/lib/hooks';
import { fetcher, api } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Download,
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  FileText,
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

type Period = 'week' | 'month' | 'quarter';

const periods: { id: Period; label: string }[] = [
  { id: 'week', label: '今週' },
  { id: 'month', label: '今月' },
  { id: 'quarter', label: '四半期' },
];

// ステータス別の色設定
const statusColors: Record<string, string> = {
  ACTIVE: '#10b981',
  PROCESSING: '#f59e0b',
  PENDING_SCRAPE: '#3b82f6',
  ERROR: '#ef4444',
  DRAFT: '#6b7280',
  SOLD: '#8b5cf6',
  OUT_OF_STOCK: '#f97316',
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // API データ取得
  const { data: kpiResponse, isLoading: kpiLoading, mutate: mutateKpi } = useKpi();
  const { data: trendsResponse, isLoading: trendsLoading } = useSalesTrends(period === 'week' ? 7 : period === 'month' ? 30 : 90);
  const { data: categoryResponse } = useCategoryRankings({ limit: 5, period });
  const { data: pnlResponse, isLoading: pnlLoading } = usePnl({ period });
  const { data: dailyResponse } = useFinancialDaily(period === 'week' ? 7 : period === 'month' ? 30 : 90);

  const kpi = kpiResponse?.data;
  const trends = trendsResponse?.data || [];
  const categories = categoryResponse?.data || [];
  const pnl = pnlResponse?.data;
  const dailyData = dailyResponse?.data || [];

  const isLoading = kpiLoading || trendsLoading || pnlLoading;

  // ステータスデータを変換
  const statusData = kpi?.productsByStatus
    ? Object.entries(kpi.productsByStatus).map(([name, value]) => ({
        name: getStatusLabel(name),
        value,
        color: statusColors[name] || '#6b7280',
      }))
    : [];

  // カテゴリデータを変換
  const categoryData = categories.map((cat, i) => ({
    name: cat.category || '未分類',
    value: cat.soldCount,
    revenue: cat.revenue,
    color: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][i] || '#6b7280',
  }));

  // CSVエクスポート処理
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${api.getTaxExport({ format: 'csv' })}`
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' });
    } finally {
      setIsExporting(false);
    }
  };

  // PDFエクスポート処理
  const handlePdfExport = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${api.getPdfExport(period)}`
      );
      if (!res.ok) throw new Error('PDF export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addToast({ type: 'error', message: 'PDFエクスポートに失敗しました' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // リフレッシュ
  const handleRefresh = () => {
    mutateKpi();
  };

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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={isExportingPdf}>
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Summary Cards */}
      {!isLoading && kpi && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="新規出品"
            value={kpi.activeListings}
            total={kpi.totalListings}
            icon={ShoppingCart}
            color="amber"
          />
          <SummaryCard
            title="販売数"
            value={period === 'week' ? kpi.soldThisWeek : kpi.soldThisMonth}
            subtext={`今日: ${kpi.soldToday}件`}
            icon={TrendingUp}
            color="emerald"
          />
          <SummaryCard
            title="売上"
            value={`$${(period === 'week' ? kpi.revenue.thisWeek : kpi.revenue.thisMonth).toLocaleString()}`}
            subtext={`利益: $${(period === 'week' ? kpi.grossProfit.thisWeek : kpi.grossProfit.thisMonth).toLocaleString()}`}
            icon={DollarSign}
            color="purple"
          />
          <SummaryCard
            title="健全性"
            value={`${kpi.healthScore}%`}
            subtext={`滞留率: ${kpi.staleRate}%`}
            icon={Package}
            color="blue"
          />
        </div>
      )}

      {/* Financial Summary */}
      {!isLoading && pnl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              損益サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-sm text-zinc-500">売上高</p>
                <p className="text-2xl font-bold">${pnl.revenue.gross.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-sm text-zinc-500">粗利</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${pnl.profit.gross.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400">{pnl.profit.grossMargin}%</p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-sm text-zinc-500">手数料</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${pnl.costs.totalFees.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-sm text-zinc-500">純利益</p>
                <p className={cn(
                  'text-2xl font-bold',
                  pnl.profit.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  ${pnl.profit.net.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400">{pnl.profit.netMargin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: '#71717a' }} />
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
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  データがありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              売上・利益推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: '#71717a' }} />
                    <YAxis className="text-xs" tick={{ fill: '#71717a' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="売上"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="利益"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  データがありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
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
                      formatter={(value: number, name: string, props: any) => [
                        `${value}件 ($${props.payload.revenue?.toLocaleString() || 0})`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  データがありません
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {categoryData.map((item) => (
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
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
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
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  データがありません
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>売上トップカテゴリ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.length > 0 ? (
                categories.slice(0, 5).map((cat, index) => (
                  <div key={cat.category || index} className="flex items-center justify-between">
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
                          {cat.category || '未分類'}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {cat.soldCount}件販売
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      ${cat.revenue.toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-400">
                  データがありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Stats */}
      {!isLoading && pnl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              注文サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {pnl.summary.orderCount}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">注文数</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    ${pnl.summary.avgOrderValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">平均注文額</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    ${pnl.summary.avgProfitPerOrder.toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">平均利益/注文</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_SCRAPE: '取込待ち',
    SCRAPED: '取込済',
    PROCESSING_IMAGES: '画像処理中',
    TRANSLATING: '翻訳中',
    READY_TO_REVIEW: 'レビュー待ち',
    APPROVED: '承認済',
    PUBLISHING: '出品中',
    ACTIVE: 'アクティブ',
    SOLD: '販売済',
    OUT_OF_STOCK: '在庫切れ',
    ERROR: 'エラー',
    DELETED: '削除済',
    DRAFT: '下書き',
  };
  return labels[status] || status;
}

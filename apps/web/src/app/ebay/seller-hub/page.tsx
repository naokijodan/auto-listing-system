// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Package,
  DollarSign,
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  Award,
  Activity,
  Users,
  Eye,
  MousePointer,
  Truck,
  MessageSquare,
  RotateCcw,
  FileText,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Shield,
  Calendar,
  Loader2,
} from 'lucide-react';

interface SellerHubDashboard {
  sellerStatus: {
    level: string;
    levelName: string;
    evaluationDate: string;
    daysUntilEvaluation: number;
    isAtRisk: boolean;
  };
  summary: {
    todaySales: number;
    todayOrders: number;
    pendingShipments: number;
    openCases: number;
    pendingReturns: number;
    unreadMessages: number;
  };
  performance: Record<string, { current: number; target: number; status: string }>;
  salesTrend: {
    daily: Array<{ date: string; sales: number; orders: number }>;
    comparison: { thisWeek: number; lastWeek: number; changePercent: number };
  };
  actionItems: Array<{
    type: string;
    count: number;
    priority: string;
    dueIn: string;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    link: string;
  }>;
}

const levelConfig: Record<string, { name: string; color: string; bgColor: string; icon: typeof Award }> = {
  TOP_RATED: { name: 'トップセラー', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30', icon: Award },
  ABOVE_STANDARD: { name: '標準以上', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', icon: CheckCircle },
  BELOW_STANDARD: { name: '標準以下', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30', icon: AlertTriangle },
};

const actionTypeConfig: Record<string, { name: string; icon: typeof Package; color: string }> = {
  SHIP_ORDER: { name: '発送待ち', icon: Truck, color: 'text-blue-500' },
  RESPOND_TO_CASE: { name: 'ケース対応', icon: MessageSquare, color: 'text-red-500' },
  UPLOAD_TRACKING: { name: '追跡番号', icon: Package, color: 'text-orange-500' },
  RESOLVE_RETURN: { name: '返品対応', icon: RotateCcw, color: 'text-purple-500' },
};

export default function EbaySellerHubPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'sales' | 'traffic' | 'tasks'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: dashboard, mutate: mutateDashboard } = useSWR<SellerHubDashboard>(
    '/api/ebay-seller-hub/dashboard',
    fetcher
  );

  const { data: performanceData } = useSWR(
    activeTab === 'performance' ? '/api/ebay-seller-hub/performance' : null,
    fetcher
  );

  const { data: salesData } = useSWR(
    activeTab === 'sales' ? '/api/ebay-seller-hub/sales' : null,
    fetcher
  );

  const { data: trafficData } = useSWR(
    activeTab === 'traffic' ? '/api/ebay-seller-hub/traffic' : null,
    fetcher
  );

  const { data: tasksData, mutate: mutateTasks } = useSWR(
    activeTab === 'tasks' ? '/api/ebay-seller-hub/tasks' : null,
    fetcher
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await postApi('/api/ebay-seller-hub/sync', {});
      addToast({ type: 'success', message: 'eBayセラーハブと同期を開始しました' });
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '同期に失敗しました' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await postApi(`/api/ebay-seller-hub/tasks/${taskId}`, { status: 'COMPLETED' });
      addToast({ type: 'success', message: 'タスクを完了しました' });
      mutateTasks();
    } catch {
      addToast({ type: 'error', message: 'タスク更新に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: LayoutDashboard },
    { id: 'performance', label: 'パフォーマンス', icon: Activity },
    { id: 'sales', label: '売上', icon: DollarSign },
    { id: 'traffic', label: 'トラフィック', icon: Eye },
    { id: 'tasks', label: 'タスク', icon: CheckCircle },
  ];

  const levelInfo = dashboard?.sellerStatus ? levelConfig[dashboard.sellerStatus.level] : null;
  const LevelIcon = levelInfo?.icon || Award;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">セラーハブ</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBay Seller Hub統合ダッシュボード
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            同期
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-4">
            {/* Seller Status Card */}
            <Card className={cn('p-4', levelInfo?.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', levelInfo?.bgColor)}>
                    <LevelIcon className={cn('h-8 w-8', levelInfo?.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn('text-lg font-bold', levelInfo?.color)}>
                        {dashboard.sellerStatus.levelName}
                      </h3>
                      {dashboard.sellerStatus.level === 'TOP_RATED' && (
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      次回評価日: {dashboard.sellerStatus.evaluationDate}
                      <span className="ml-2 text-zinc-500">
                        （あと{dashboard.sellerStatus.daysUntilEvaluation}日）
                      </span>
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  詳細を見る
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">今日の売上</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dashboard.summary.todaySales.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">今日の注文</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.todayOrders}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
                    <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">発送待ち</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {dashboard.summary.pendingShipments}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">オープンケース</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {dashboard.summary.openCases}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                    <RotateCcw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">返品待ち</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {dashboard.summary.pendingReturns}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                    <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">未読メッセージ</p>
                    <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                      {dashboard.summary.unreadMessages}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Performance Metrics */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  パフォーマンス指標
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboard.performance).map(([key, metric]) => {
                    const isGood = metric.status === 'GOOD';
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-medium', isGood ? 'text-emerald-600' : 'text-red-600')}>
                              {metric.current}%
                            </span>
                            <span className="text-zinc-400">/ {metric.target}%</span>
                            {isGood ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', isGood ? 'bg-emerald-500' : 'bg-red-500')}
                            style={{ width: `${Math.min((metric.current / metric.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Action Items */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-500" />
                  アクションアイテム
                </h3>
                <div className="space-y-3">
                  {dashboard.actionItems.map((item, index) => {
                    const config = actionTypeConfig[item.type] || { name: item.type, icon: Package, color: 'text-zinc-500' };
                    const Icon = config.icon;
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          item.priority === 'HIGH' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-zinc-50 dark:bg-zinc-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('h-5 w-5', config.color)} />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {config.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              期限: {item.dueIn}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            item.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                          )}>
                            {item.count}件
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Sales Trend */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  売上トレンド（過去7日間）
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">今週:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    ${dashboard.salesTrend.comparison.thisWeek.toFixed(2)}
                  </span>
                  <span className={cn(
                    'flex items-center gap-0.5',
                    dashboard.salesTrend.comparison.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {dashboard.salesTrend.comparison.changePercent >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {Math.abs(dashboard.salesTrend.comparison.changePercent)}%
                  </span>
                </div>
              </div>
              <div className="h-40 flex items-end gap-2">
                {dashboard.salesTrend.daily.map((day) => {
                  const maxSales = Math.max(...dashboard.salesTrend.daily.map(d => d.sales));
                  const height = (day.sales / maxSales) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-zinc-500">
                        {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Alerts */}
            {dashboard.alerts.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  アラート
                </h3>
                <div className="space-y-2">
                  {dashboard.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        alert.type === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {alert.type === 'WARNING' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Zap className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && performanceData && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">
                セラーパフォーマンス詳細
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {performanceData.metrics?.map((metric: { id: string; name: string; current: number; target: number; status: string }) => (
                  <div key={metric.id} className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{metric.name}</span>
                      {metric.status === 'GOOD' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-2xl font-bold', metric.status === 'GOOD' ? 'text-emerald-600' : 'text-red-600')}>
                        {metric.current}%
                      </span>
                      <span className="text-sm text-zinc-500">目標: {metric.target}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && salesData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">総売上</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  ${salesData.summary?.totalSales?.toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">総注文数</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {salesData.summary?.totalOrders}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">平均注文額</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  ${salesData.summary?.averageOrderValue?.toFixed(2)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">純収益</p>
                <p className="text-2xl font-bold text-green-600">
                  ${salesData.summary?.netRevenue?.toLocaleString()}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">カテゴリ別売上</h3>
              <div className="space-y-3">
                {salesData.byCategory?.map((cat: { category: string; sales: number; percentage: number }) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">{cat.category}</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        ${cat.sales.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Traffic Tab */}
        {activeTab === 'traffic' && trafficData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">インプレッション</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trafficData.summary?.totalImpressions?.toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">ページビュー</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trafficData.summary?.totalPageViews?.toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">CTR</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trafficData.summary?.clickThroughRate}%
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-zinc-500 mb-1">コンバージョン率</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trafficData.summary?.conversionRate}%
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">流入元</h3>
                <div className="space-y-3">
                  {trafficData.bySource?.map((src: { source: string; pageViews: number; percentage: number }) => (
                    <div key={src.source} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{src.source}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {src.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">デバイス</h3>
                <div className="space-y-3">
                  {trafficData.byDevice?.map((dev: { device: string; percentage: number }) => (
                    <div key={dev.device} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{dev.device}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {dev.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && tasksData && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4 text-center">
                <p className="text-sm text-zinc-500">総タスク</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{tasksData.summary?.total}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-zinc-500">未処理</p>
                <p className="text-2xl font-bold text-orange-600">{tasksData.summary?.pending}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-zinc-500">処理中</p>
                <p className="text-2xl font-bold text-blue-600">{tasksData.summary?.inProgress}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-zinc-500">完了</p>
                <p className="text-2xl font-bold text-emerald-600">{tasksData.summary?.completed}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-zinc-500">期限切れ</p>
                <p className="text-2xl font-bold text-red-600">{tasksData.summary?.overdue}</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">タスク一覧</h3>
              <div className="space-y-3">
                {tasksData.tasks?.map((task: { id: string; type: string; title: string; description: string; priority: string; status: string; dueDate: string; isOverdue: boolean }) => {
                  const config = actionTypeConfig[task.type] || { name: task.type, icon: Package, color: 'text-zinc-500' };
                  const Icon = config.icon;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        task.isOverdue ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-5 w-5', config.color)} />
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{task.title}</p>
                          <p className="text-xs text-zinc-500">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          task.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'
                        )}>
                          {task.priority}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskComplete(task.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          完了
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

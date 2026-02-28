
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Eye,
  Users,
  Package,
  Globe,
  Clock,
  Target,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Settings,
  Bell,
  Layers,
  Filter,
} from 'lucide-react';

type TabType = 'overview' | 'sales' | 'products' | 'customers' | 'traffic' | 'reports';

export default function AnalyticsDashboardV2Page() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState('30d');

  const { data: summary } = useSWR<any>(`/api/ebay-analytics-dashboard-v2/summary?period=${period}`, fetcher);
  const { data: realtime } = useSWR<any>('/api/ebay-analytics-dashboard-v2/realtime', fetcher);
  const { data: salesTrends } = useSWR<any>(`/api/ebay-analytics-dashboard-v2/sales/trends?period=${period}`, fetcher);
  const { data: salesByCategory } = useSWR<any>('/api/ebay-analytics-dashboard-v2/sales/by-category', fetcher);
  const { data: salesByRegion } = useSWR<any>('/api/ebay-analytics-dashboard-v2/sales/by-region', fetcher);
  const { data: topSellers } = useSWR<any>('/api/ebay-analytics-dashboard-v2/products/top-sellers', fetcher);
  const { data: customersOverview } = useSWR<any>('/api/ebay-analytics-dashboard-v2/customers/overview', fetcher);
  const { data: trafficOverview } = useSWR<any>('/api/ebay-analytics-dashboard-v2/traffic/overview', fetcher);
  const { data: reports } = useSWR<any>('/api/ebay-analytics-dashboard-v2/reports', fetcher);
  const { data: alerts } = useSWR<any>('/api/ebay-analytics-dashboard-v2/alerts', fetcher);

  const tabs = [
    { id: 'overview' as TabType, label: '概要', icon: BarChart3 },
    { id: 'sales' as TabType, label: '売上', icon: DollarSign },
    { id: 'products' as TabType, label: '商品', icon: Package },
    { id: 'customers' as TabType, label: '顧客', icon: Users },
    { id: 'traffic' as TabType, label: 'トラフィック', icon: Globe },
    { id: 'reports' as TabType, label: 'レポート', icon: FileText },
  ];

  const TrendIndicator = ({ value, trend }: { value: number; trend: string }) => (
    <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
      {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span>{value > 0 ? '+' : ''}{value}%</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">分析ダッシュボード</h1>
            <p className="text-sm text-zinc-500">パフォーマンス分析・インサイト</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="7d">過去7日</option>
            <option value="30d">過去30日</option>
            <option value="90d">過去90日</option>
            <option value="1y">過去1年</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <TrendIndicator value={summary.revenue?.change} trend={summary.revenue?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                ${summary.revenue?.total?.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-500">売上</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                <TrendIndicator value={summary.orders?.change} trend={summary.orders?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summary.orders?.total?.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-500">注文数</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-purple-500" />
                <TrendIndicator value={summary.avgOrderValue?.change} trend={summary.avgOrderValue?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                ${summary.avgOrderValue?.value?.toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500">平均注文額</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                <TrendIndicator value={summary.conversionRate?.change} trend={summary.conversionRate?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summary.conversionRate?.value}%
              </p>
              <p className="text-sm text-zinc-500">コンバージョン率</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-5 w-5 text-amber-500" />
                <TrendIndicator value={summary.activeListings?.change} trend={summary.activeListings?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summary.activeListings?.total}
              </p>
              <p className="text-sm text-zinc-500">出品中</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="h-5 w-5 text-pink-500" />
                <TrendIndicator value={summary.views?.change} trend={summary.views?.trend} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summary.views?.total?.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-500">閲覧数</p>
            </Card>
          </div>

          {/* Realtime & Alerts */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white">リアルタイム</h3>
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
              {realtime && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{realtime.activeVisitors}</p>
                    <p className="text-sm text-zinc-500">アクティブ訪問者</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{realtime.ordersToday}</p>
                    <p className="text-sm text-zinc-500">本日の注文</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                    <p className="text-2xl font-bold text-emerald-600">${realtime.revenueToday?.toLocaleString()}</p>
                    <p className="text-sm text-zinc-500">本日の売上</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{realtime.viewsToday?.toLocaleString()}</p>
                    <p className="text-sm text-zinc-500">本日の閲覧</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white">アラート</h3>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {alerts?.alerts?.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-2 rounded-lg ${
                    alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-amber-50 dark:bg-amber-900/20'
                  }`}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(alert.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Trends */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">売上推移</h3>
            <div className="space-y-2">
              {salesTrends?.data?.map((day: any) => (
                <div key={day.date} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{day.date}</span>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">${day.revenue?.toLocaleString()}</span>
                    <span className="text-sm text-zinc-500">{day.orders}件</span>
                    <span className="text-sm text-zinc-500">平均${day.avgValue?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* By Category */}
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">カテゴリ別売上</h3>
              <div className="space-y-3">
                {salesByCategory?.data?.map((item: any) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.category}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">${item.revenue?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* By Region */}
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">地域別売上</h3>
              <div className="space-y-3">
                {salesByRegion?.data?.map((item: any) => (
                  <div key={item.region}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.region}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">${item.revenue?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && topSellers && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">トップセラー</h3>
            <div className="space-y-3">
              {topSellers.data?.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-zinc-200 text-zinc-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{product.title}</p>
                      <p className="text-sm text-zinc-500">{product.units}個販売 • {product.views}閲覧</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-600">${product.revenue?.toLocaleString()}</p>
                    <p className="text-sm text-zinc-500">平均${product.avgPrice?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && customersOverview && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総顧客数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {customersOverview.totalCustomers?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-zinc-500">新規顧客</p>
                <span className="text-xs text-emerald-600">+{customersOverview.newCustomers?.change}%</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {customersOverview.newCustomers?.count}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">リピーター率</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {customersOverview.returningCustomers?.percentage}%
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">平均LTV</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${customersOverview.avgLifetimeValue?.toFixed(2)}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">顧客セグメント</h3>
            <div className="space-y-3">
              {customersOverview.segments?.map((segment: any) => (
                <div key={segment.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      segment.name === 'VIP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      segment.name === 'Regular' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      segment.name === 'Occasional' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {segment.name}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{segment.count}人</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    ${segment.revenue?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Traffic Tab */}
      {activeTab === 'traffic' && trafficOverview && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総訪問数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {trafficOverview.totalVisits?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">ユニーク訪問者</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {trafficOverview.uniqueVisitors?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">ページビュー</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {trafficOverview.pageViews?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">平均滞在時間</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {Math.floor(trafficOverview.avgSessionDuration / 60)}分{trafficOverview.avgSessionDuration % 60}秒
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">流入元</h3>
            <div className="space-y-3">
              {trafficOverview.sources?.map((source: any) => (
                <div key={source.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{source.source}</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">{source.visits?.toLocaleString()}訪問</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && reports && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              新規レポート
            </Button>
          </div>

          {reports.reports?.map((report: any) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{report.name}</p>
                    <p className="text-sm text-zinc-500">
                      {report.schedule === 'daily' ? '毎日' :
                       report.schedule === 'weekly' ? '毎週' : '毎月'} • 最終実行: {report.lastRun}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    ダウンロード
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

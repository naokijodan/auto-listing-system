'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  Globe,
  ShoppingCart,
  DollarSign,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Calendar,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'sales' | 'customers' | 'products' | 'benchmarks' | 'settings';

export default function PerformanceAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'sales', label: '売上分析', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'customers', label: '顧客分析', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: '商品分析', icon: <Package className="w-4 h-4" /> },
    { id: 'benchmarks', label: 'ベンチマーク', icon: <Target className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <LineChart className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">パフォーマンス分析</h1>
              <p className="text-sm text-gray-500">Performance Analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'benchmarks' && <BenchmarksTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/performance-analytics/dashboard/overview`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/performance-analytics/dashboard/metrics`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/performance-analytics/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* パフォーマンススコア */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">総合パフォーマンススコア</h3>
            <p className="text-sm text-gray-500 mt-1">{overview?.period === 'last30days' ? '過去30日間' : overview?.period}</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-5xl font-bold text-sky-600">{overview?.overallScore}</p>
              <p className="text-sm text-gray-500">総合スコア</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-24">売上</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-green-500 rounded-full" style={{ width: `${overview?.salesPerformance}%` }}></div>
                </div>
                <span className="text-sm font-medium">{overview?.salesPerformance}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-24">顧客満足度</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${overview?.customerSatisfaction}%` }}></div>
                </div>
                <span className="text-sm font-medium">{overview?.customerSatisfaction}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-24">運営効率</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${overview?.operationalEfficiency}%` }}></div>
                </div>
                <span className="text-sm font-medium">{overview?.operationalEfficiency}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics?.metrics?.map((metric: {
          name: string;
          value: number;
          change: number;
          unit: string;
          trend: string;
        }) => (
          <div key={metric.name} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{metric.name}</p>
            <p className="text-xl font-bold mt-1">
              {metric.unit === 'yen' ? '¥' : ''}{metric.value.toLocaleString()}{metric.unit === 'percent' ? '%' : ''}
            </p>
            <div className={`flex items-center gap-1 mt-2 ${
              metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {metric.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <span className="text-sm">{Math.abs(metric.change)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* アラート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">パフォーマンスアラート</h3>
        <div className="space-y-3">
          {alerts?.alerts?.map((alert: {
            id: string;
            type: string;
            title: string;
            message: string;
            timestamp: string;
          }) => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
              alert.type === 'positive' ? 'bg-green-50' :
              alert.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
            }`}>
              {alert.type === 'positive' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
              {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />}
              {alert.type === 'info' && <Award className="w-5 h-5 text-blue-600 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-gray-500">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/performance-analytics/sales/overview`, fetcher);
  const { data: byCategory } = useSWR(`${API_BASE}/ebay/performance-analytics/sales/by-category`, fetcher);
  const { data: byRegion } = useSWR(`${API_BASE}/ebay/performance-analytics/sales/by-region`, fetcher);
  const { data: topProducts } = useSWR(`${API_BASE}/ebay/performance-analytics/sales/top-products`, fetcher);

  return (
    <div className="space-y-6">
      {/* 売上概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-3xl font-bold mt-1">¥{overview?.totalSales?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総注文数</p>
          <p className="text-3xl font-bold mt-1">{overview?.totalOrders?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均注文額</p>
          <p className="text-3xl font-bold mt-1">¥{overview?.averageOrderValue?.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* カテゴリ別 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別売上</h3>
          <div className="space-y-4">
            {byCategory?.categories?.map((cat: {
              category: string;
              sales: number;
              orders: number;
              percentage: number;
            }) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{cat.category}</span>
                  <span className="text-sm text-gray-500">¥{cat.sales.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-sky-500 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{cat.orders}件 ({cat.percentage}%)</p>
              </div>
            ))}
          </div>
        </div>

        {/* 地域別 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">地域別売上</h3>
          <div className="space-y-4">
            {byRegion?.regions?.map((region: {
              region: string;
              sales: number;
              orders: number;
              percentage: number;
            }) => (
              <div key={region.region} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <span>{region.region}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">¥{region.sales.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{region.orders}件 ({region.percentage}%)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 売れ筋商品 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">売れ筋商品</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
                <th className="px-4 py-3 text-right text-sm">販売数</th>
                <th className="px-4 py-3 text-right text-sm">平均価格</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts?.products?.map((product: {
                id: string;
                title: string;
                sales: number;
                quantity: number;
                averagePrice: number;
              }) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{product.title}</td>
                  <td className="px-4 py-3 text-right">¥{product.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{product.quantity}</td>
                  <td className="px-4 py-3 text-right">¥{product.averagePrice.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomersTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/performance-analytics/customers/overview`, fetcher);
  const { data: segments } = useSWR(`${API_BASE}/ebay/performance-analytics/customers/segments`, fetcher);
  const { data: behavior } = useSWR(`${API_BASE}/ebay/performance-analytics/customers/behavior`, fetcher);

  return (
    <div className="space-y-6">
      {/* 顧客概要 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">総顧客数</p>
          <p className="text-xl font-bold">{overview?.totalCustomers?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">新規顧客</p>
          <p className="text-xl font-bold text-green-600">{overview?.newCustomers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">リピーター</p>
          <p className="text-xl font-bold text-blue-600">{overview?.repeatCustomers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">顧客生涯価値</p>
          <p className="text-xl font-bold">¥{overview?.customerLifetimeValue?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">維持率</p>
          <p className="text-xl font-bold">{overview?.retentionRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">離脱率</p>
          <p className="text-xl font-bold text-red-600">{overview?.churnRate}%</p>
        </div>
      </div>

      {/* セグメント */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">顧客セグメント</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">セグメント</th>
                <th className="px-4 py-3 text-right text-sm">顧客数</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
                <th className="px-4 py-3 text-right text-sm">平均注文額</th>
                <th className="px-4 py-3 text-right text-sm">リピート率</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {segments?.segments?.map((seg: {
                name: string;
                count: number;
                revenue: number;
                averageOrderValue: number;
                repeatRate: number;
              }) => (
                <tr key={seg.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      seg.name === 'VIP' ? 'bg-purple-100 text-purple-800' :
                      seg.name === 'Regular' ? 'bg-blue-100 text-blue-800' :
                      seg.name === 'Occasional' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {seg.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{seg.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{seg.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{seg.averageOrderValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{seg.repeatRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 行動分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">顧客行動分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">購入前の平均訪問回数</p>
            <p className="text-2xl font-bold mt-1">{behavior?.averageVisitsBeforePurchase}回</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">平均滞在時間</p>
            <p className="text-2xl font-bold mt-1">{Math.round((behavior?.averageTimeOnSite || 0) / 60)}分</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">カート放棄率</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{behavior?.cartAbandonmentRate}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">人気カテゴリ</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {behavior?.mostViewedCategories?.map((cat: string) => (
                <span key={cat} className="px-2 py-1 bg-sky-100 text-sky-800 rounded text-xs">{cat}</span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">ピーク時間帯</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {behavior?.peakShoppingHours?.map((hour: string) => (
                <span key={hour} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">{hour}</span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">ピーク曜日</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {behavior?.peakShoppingDays?.map((day: string) => (
                <span key={day} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{day}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/performance-analytics/products/overview`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/performance-analytics/products/performance`, fetcher);
  const { data: underperforming } = useSWR(`${API_BASE}/ebay/performance-analytics/products/underperforming`, fetcher);

  return (
    <div className="space-y-6">
      {/* 商品概要 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">総リスティング</p>
          <p className="text-xl font-bold">{overview?.totalListings?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">アクティブ</p>
          <p className="text-xl font-bold text-green-600">{overview?.activeListings?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">販売済み</p>
          <p className="text-xl font-bold text-blue-600">{overview?.soldItems}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">販売率</p>
          <p className="text-xl font-bold">{overview?.sellThroughRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">平均販売日数</p>
          <p className="text-xl font-bold">{overview?.averageDaysToSell}日</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">返品率</p>
          <p className="text-xl font-bold text-red-600">{overview?.returnRate}%</p>
        </div>
      </div>

      {/* 商品パフォーマンス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">商品パフォーマンス</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-right text-sm">閲覧数</th>
                <th className="px-4 py-3 text-right text-sm">ウォッチャー</th>
                <th className="px-4 py-3 text-right text-sm">販売数</th>
                <th className="px-4 py-3 text-right text-sm">CV率</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {performance?.products?.map((product: {
                id: string;
                title: string;
                views: number;
                watchers: number;
                sales: number;
                conversionRate: number;
                revenue: number;
              }) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{product.title}</td>
                  <td className="px-4 py-3 text-right">{product.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{product.watchers}</td>
                  <td className="px-4 py-3 text-right">{product.sales}</td>
                  <td className="px-4 py-3 text-right">{product.conversionRate}%</td>
                  <td className="px-4 py-3 text-right">¥{product.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 低パフォーマンス商品 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">改善が必要な商品</h3>
        <div className="space-y-3">
          {underperforming?.products?.map((product: {
            id: string;
            title: string;
            views: number;
            watchers: number;
            daysListed: number;
            issue: string;
          }) => (
            <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
              <div>
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-gray-500">
                  閲覧: {product.views} • ウォッチャー: {product.watchers} • {product.daysListed}日出品中
                </p>
                <p className="text-sm text-amber-600 mt-1">⚠️ {product.issue}</p>
              </div>
              <button className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
                最適化
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenchmarksTab() {
  const { data: industry } = useSWR(`${API_BASE}/ebay/performance-analytics/benchmarks/industry`, fetcher);
  const { data: goals } = useSWR(`${API_BASE}/ebay/performance-analytics/benchmarks/goals`, fetcher);
  const { data: competitors } = useSWR(`${API_BASE}/ebay/performance-analytics/competitors/comparison`, fetcher);

  return (
    <div className="space-y-6">
      {/* 業界ベンチマーク */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">業界ベンチマーク</h3>
        <div className="space-y-4">
          {industry?.benchmarks?.map((benchmark: {
            metric: string;
            yourValue: number;
            industryAverage: number;
            percentile: number;
          }) => (
            <div key={benchmark.metric} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">{benchmark.metric}</div>
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full relative">
                    <div
                      className="absolute h-3 bg-sky-500 rounded-full"
                      style={{ width: `${benchmark.percentile}%` }}
                    ></div>
                    <div
                      className="absolute w-1 h-5 bg-gray-800 rounded -top-1"
                      style={{ left: `${(benchmark.industryAverage / benchmark.yourValue) * 50}%` }}
                      title="業界平均"
                    ></div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-bold">{benchmark.yourValue}</p>
                    <p className="text-xs text-gray-500">平均: {benchmark.industryAverage}</p>
                  </div>
                  <div className="w-16 text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      benchmark.percentile >= 75 ? 'bg-green-100 text-green-800' :
                      benchmark.percentile >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      上位{100 - benchmark.percentile}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 目標達成状況 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">目標達成状況</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals?.goals?.map((goal: {
            name: string;
            target: number;
            current: number;
            progress: number;
            status: string;
          }) => (
            <div key={goal.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{goal.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  goal.status === 'achieved' ? 'bg-green-100 text-green-800' :
                  goal.status === 'on_track' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {goal.status === 'achieved' ? '達成' : goal.status === 'on_track' ? '順調' : '遅れ'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mb-2">
                <div
                  className={`h-2 rounded-full ${
                    goal.status === 'achieved' ? 'bg-green-500' :
                    goal.status === 'on_track' ? 'bg-blue-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>現在: {goal.current.toLocaleString()}</span>
                <span>目標: {goal.target.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 競合比較 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">競合比較</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">セラー</th>
                <th className="px-4 py-3 text-right text-sm">リスティング数</th>
                <th className="px-4 py-3 text-right text-sm">平均価格</th>
                <th className="px-4 py-3 text-right text-sm">フィードバック</th>
                <th className="px-4 py-3 text-right text-sm">シェア</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {competitors?.comparisons?.map((comp: {
                competitor: string;
                listings: number;
                avgPrice: number;
                feedbackScore: number;
                marketShare: number;
              }) => (
                <tr key={comp.competitor} className={`hover:bg-gray-50 ${comp.competitor === 'You' ? 'bg-sky-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    {comp.competitor === 'You' ? '🔵 あなた' : comp.competitor}
                  </td>
                  <td className="px-4 py-3 text-right">{comp.listings.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{comp.avgPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{comp.feedbackScore}%</td>
                  <td className="px-4 py-3 text-right">{comp.marketShare}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/performance-analytics/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/performance-analytics/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">デフォルト期間</p>
              <p className="text-sm text-gray-500">分析のデフォルト期間</p>
            </div>
            <select defaultValue={general?.settings?.defaultPeriod} className="border rounded-lg px-3 py-2">
              <option value="7days">7日間</option>
              <option value="30days">30日間</option>
              <option value="90days">90日間</option>
              <option value="365days">1年間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">更新間隔</p>
              <p className="text-sm text-gray-500">データの自動更新間隔（分）</p>
            </div>
            <select defaultValue={general?.settings?.refreshInterval} className="border rounded-lg px-3 py-2">
              <option value={5}>5分</option>
              <option value={15}>15分</option>
              <option value={30}>30分</option>
              <option value={60}>1時間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">ダッシュボードレイアウト</p>
            </div>
            <select defaultValue={general?.settings?.dashboardLayout} className="border rounded-lg px-3 py-2">
              <option value="default">デフォルト</option>
              <option value="compact">コンパクト</option>
              <option value="detailed">詳細</option>
            </select>
          </div>
        </div>
      </div>

      {/* アラート設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">アラート設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">売上低下アラート</p>
              <p className="text-sm text-gray-500">しきい値: {alerts?.settings?.salesDropThreshold}%低下</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.salesDropAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">コンバージョン低下アラート</p>
              <p className="text-sm text-gray-500">しきい値: {alerts?.settings?.conversionDropThreshold}%低下</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.conversionDropAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">目標達成通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.goalAchievementAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">週次サマリー</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.weeklySummary} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

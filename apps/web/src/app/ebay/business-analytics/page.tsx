
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  Target,
  PieChart,
  LineChart,
  Settings,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Zap,
  FileText,
  Bell,
  Filter,
  RefreshCw,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'sales' | 'customers' | 'performance' | 'reports' | 'settings';

export default function BusinessAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'sales', label: '売上分析', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'customers', label: '顧客分析', icon: <Users className="w-4 h-4" /> },
    { id: 'performance', label: 'パフォーマンス', icon: <Zap className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ビジネス分析</h1>
              <p className="text-sm text-gray-500">Business Analytics</p>
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
                  ? 'border-indigo-600 text-indigo-600'
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
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/business-analytics/dashboard/overview`, fetcher);
  const { data: kpis } = useSWR(`${API_BASE}/ebay/business-analytics/dashboard/kpis`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/business-analytics/dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総売上</p>
              <p className="text-2xl font-bold">¥{overview?.totalSales?.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>12.5% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">注文数</p>
              <p className="text-2xl font-bold">{overview?.totalOrders?.toLocaleString()}</p>
            </div>
            <ShoppingCart className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>8.3% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均注文額</p>
              <p className="text-2xl font-bold">¥{overview?.averageOrderValue?.toLocaleString()}</p>
            </div>
            <Target className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>3.5% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">コンバージョン率</p>
              <p className="text-2xl font-bold">{overview?.conversionRate}%</p>
            </div>
            <PieChart className="w-10 h-10 text-orange-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>0.3% 前月比</span>
          </div>
        </div>
      </div>

      {/* KPI一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">KPIダッシュボード</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis?.kpis?.map((kpi: {
            id: string;
            name: string;
            value: number;
            target: number;
            unit: string;
            trend: number;
          }) => (
            <div key={kpi.id} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{kpi.name}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold">
                  {kpi.unit === 'currency' ? `¥${kpi.value.toLocaleString()}` :
                   kpi.unit === 'percent' ? `${kpi.value}%` :
                   kpi.unit === 'rating' ? kpi.value :
                   kpi.value.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      kpi.value >= kpi.target ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">目標: {kpi.target}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* トレンドチャート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">売上トレンド（過去30日）</h3>
        <div className="h-64 flex items-end gap-1">
          {trends?.daily?.map((day: { date: string; sales: number }, i: number) => (
            <div
              key={i}
              className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
              style={{ height: `${(day.sales / 200000) * 100}%` }}
              title={`${day.date}: ¥${Math.floor(day.sales).toLocaleString()}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/business-analytics/sales/overview`, fetcher);
  const { data: categories } = useSWR(`${API_BASE}/ebay/business-analytics/sales/by-category`, fetcher);
  const { data: channels } = useSWR(`${API_BASE}/ebay/business-analytics/sales/by-channel`, fetcher);
  const { data: topProducts } = useSWR(`${API_BASE}/ebay/business-analytics/sales/top-products`, fetcher);

  return (
    <div className="space-y-6">
      {/* 売上概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-2xl font-bold">¥{overview?.totalSales?.toLocaleString()}</p>
          <p className="text-sm text-green-600 mt-1">+{overview?.salesGrowth}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">粗利益</p>
          <p className="text-2xl font-bold">¥{overview?.grossProfit?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">純利益</p>
          <p className="text-2xl font-bold">¥{overview?.netProfit?.toLocaleString()}</p>
          <p className="text-sm text-green-600 mt-1">+{overview?.profitGrowth}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">トップカテゴリ</p>
          <p className="text-2xl font-bold">{overview?.topSellingCategory}</p>
        </div>
      </div>

      {/* カテゴリ別 & チャネル別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別売上</h3>
          <div className="space-y-4">
            {categories?.categories?.map((cat: {
              category: string;
              sales: number;
              orders: number;
              growth: number;
              share: number;
            }) => (
              <div key={cat.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{cat.category}</span>
                  <span className="text-sm text-gray-500">
                    ¥{cat.sales.toLocaleString()} ({cat.share}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${cat.share}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{cat.orders}件</span>
                  <span className={cat.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cat.growth >= 0 ? '+' : ''}{cat.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">チャネル別売上</h3>
          <div className="space-y-4">
            {channels?.channels?.map((ch: {
              channel: string;
              sales: number;
              orders: number;
              share: number;
            }) => (
              <div key={ch.channel}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{ch.channel}</span>
                  <span className="text-sm text-gray-500">
                    ¥{ch.sales.toLocaleString()} ({ch.share}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${ch.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 売れ筋商品 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">売れ筋商品</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">順位</th>
                <th className="px-4 py-3 text-left text-sm">SKU</th>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
                <th className="px-4 py-3 text-right text-sm">注文数</th>
                <th className="px-4 py-3 text-right text-sm">マージン</th>
                <th className="px-4 py-3 text-center text-sm">トレンド</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts?.products?.slice(0, 10).map((prod: {
                rank: number;
                sku: string;
                title: string;
                sales: number;
                orders: number;
                margin: number;
                trend: string;
              }) => (
                <tr key={prod.sku} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{prod.rank}</td>
                  <td className="px-4 py-3 text-sm">{prod.sku}</td>
                  <td className="px-4 py-3 text-sm">{prod.title}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{Math.floor(prod.sales).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{prod.orders}</td>
                  <td className="px-4 py-3 text-sm text-right">{prod.margin.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">
                    {prod.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600 inline" />
                    ) : prod.trend === 'down' ? (
                      <ArrowDownRight className="w-4 h-4 text-red-600 inline" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
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
  const { data: overview } = useSWR(`${API_BASE}/ebay/business-analytics/customers/overview`, fetcher);
  const { data: segments } = useSWR(`${API_BASE}/ebay/business-analytics/customers/segments`, fetcher);
  const { data: geography } = useSWR(`${API_BASE}/ebay/business-analytics/customers/geography`, fetcher);

  return (
    <div className="space-y-6">
      {/* 顧客概要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総顧客数</p>
          <p className="text-2xl font-bold">{overview?.totalCustomers?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">新規顧客</p>
          <p className="text-2xl font-bold">{overview?.newCustomers?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">リピート率</p>
          <p className="text-2xl font-bold">{overview?.repeatRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均LTV</p>
          <p className="text-2xl font-bold">¥{overview?.averageLifetimeValue?.toLocaleString()}</p>
        </div>
      </div>

      {/* セグメント & 地域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">顧客セグメント</h3>
          <div className="space-y-4">
            {segments?.segments?.map((seg: {
              segment: string;
              count: number;
              revenue: number;
              avgOrders: number;
              avgValue: number;
            }) => (
              <div key={seg.segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{seg.segment}</p>
                  <p className="text-sm text-gray-500">{seg.count}人 | 平均{seg.avgOrders}注文</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">¥{seg.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">平均¥{seg.avgValue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">地域分布</h3>
          <div className="space-y-4">
            {geography?.byCountry?.map((country: {
              country: string;
              customers: number;
              revenue: number;
              share: number;
            }) => (
              <div key={country.country}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{country.country}</span>
                  <span className="text-sm text-gray-500">
                    {country.customers}人 ({country.share}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${country.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceTab() {
  const { data: listings } = useSWR(`${API_BASE}/ebay/business-analytics/performance/listings`, fetcher);
  const { data: funnel } = useSWR(`${API_BASE}/ebay/business-analytics/performance/conversion-funnel`, fetcher);
  const { data: seller } = useSWR(`${API_BASE}/ebay/business-analytics/performance/seller-metrics`, fetcher);

  return (
    <div className="space-y-6">
      {/* リスティングパフォーマンス */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総リスティング数</p>
          <p className="text-2xl font-bold">{listings?.totalListings?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均インプレッション</p>
          <p className="text-2xl font-bold">{listings?.avgImpressions?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均CTR</p>
          <p className="text-2xl font-bold">{listings?.avgCtr}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均コンバージョン</p>
          <p className="text-2xl font-bold">{listings?.avgConversion}%</p>
        </div>
      </div>

      {/* コンバージョンファネル */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">コンバージョンファネル</h3>
        <div className="flex items-center justify-center gap-4">
          {[
            { label: 'インプレッション', value: funnel?.impressions, rate: 100 },
            { label: 'クリック', value: funnel?.clicks, rate: funnel?.rates?.clickThrough },
            { label: '商品閲覧', value: funnel?.viewItems, rate: 86 },
            { label: 'カート追加', value: funnel?.addToCart, rate: funnel?.rates?.viewToCart },
            { label: 'チェックアウト', value: funnel?.checkout, rate: funnel?.rates?.cartToCheckout },
            { label: '購入', value: funnel?.purchases, rate: funnel?.rates?.checkoutToPurchase },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold"
                style={{
                  width: `${120 - i * 15}px`,
                  height: `${120 - i * 15}px`,
                }}
              >
                {step.value?.toLocaleString()}
              </div>
              <p className="text-sm font-medium mt-2">{step.label}</p>
              {i > 0 && <p className="text-xs text-gray-500">{step.rate?.toFixed(1)}%</p>}
            </div>
          ))}
        </div>
      </div>

      {/* セラーメトリクス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">セラーメトリクス</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">セラーレベル</p>
            <p className="text-xl font-bold text-green-800">{seller?.sellerLevel}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">フィードバックスコア</p>
            <p className="text-xl font-bold text-blue-800">{seller?.feedbackScore}%</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">追跡アップロード率</p>
            <p className="text-xl font-bold text-purple-800">{seller?.trackingUploadRate}%</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">欠陥率</p>
            <p className="text-xl font-bold text-orange-800">{seller?.defectRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: reports } = useSWR(`${API_BASE}/ebay/business-analytics/reports/available`, fetcher);
  const { data: scheduled } = useSWR(`${API_BASE}/ebay/business-analytics/reports/scheduled`, fetcher);
  const { data: comparison } = useSWR(`${API_BASE}/ebay/business-analytics/comparison/period`, fetcher);

  return (
    <div className="space-y-6">
      {/* 期間比較 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">期間比較</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {comparison?.changes && Object.entries(comparison.changes as Record<string, any>).map(([key, change]: [string, { amount: number; percent: number }]) => (
            <div key={key} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 capitalize">{key}</p>
              <p className="text-xl font-bold">
                {key === 'sales' || key === 'avgOrderValue' ? `¥${change.amount.toLocaleString()}` : change.amount.toLocaleString()}
              </p>
              <p className={`text-sm ${change.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change.percent >= 0 ? '+' : ''}{change.percent}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* レポート一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">利用可能なレポート</h3>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            カスタムレポート作成
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports?.reports?.map((report: { id: string; name: string; frequency: string; lastRun: string }) => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-8 h-8 text-indigo-600" />
                <div>
                  <h4 className="font-medium">{report.name}</h4>
                  <p className="text-xs text-gray-500">{report.frequency}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center justify-center gap-1">
                  <Download className="w-4 h-4" />
                  生成
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* スケジュールレポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">スケジュールレポート</h3>
        <div className="space-y-3">
          {scheduled?.scheduled?.map((sch: { id: string; reportId: string; frequency: string; nextRun: string }) => (
            <div key={sch.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{sch.reportId}</p>
                  <p className="text-sm text-gray-500">
                    {sch.frequency} | 次回: {new Date(sch.nextRun).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings } = useSWR(`${API_BASE}/ebay/business-analytics/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/business-analytics/settings/alerts`, fetcher);

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
            <select defaultValue={settings?.defaultDateRange} className="border rounded-lg px-3 py-2">
              <option value="7days">7日間</option>
              <option value="30days">30日間</option>
              <option value="90days">90日間</option>
              <option value="1year">1年間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">更新間隔</p>
              <p className="text-sm text-gray-500">データの自動更新間隔（秒）</p>
            </div>
            <select defaultValue={settings?.refreshInterval} className="border rounded-lg px-3 py-2">
              <option value={60}>60秒</option>
              <option value={300}>5分</option>
              <option value={900}>15分</option>
              <option value={3600}>1時間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">リアルタイム更新</p>
              <p className="text-sm text-gray-500">リアルタイムデータ更新を有効化</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.enableRealtime} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* アラート設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">アラート設定</h3>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            アラート追加
          </button>
        </div>
        <div className="space-y-3">
          {alerts?.alerts?.map((alert: { id: string; name: string; condition: { metric: string }; enabled: boolean }) => (
            <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className={`w-5 h-5 ${alert.enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium">{alert.name}</p>
                  <p className="text-sm text-gray-500">メトリック: {alert.condition.metric}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={alert.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

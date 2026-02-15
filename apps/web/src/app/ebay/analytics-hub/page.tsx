'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  ShoppingCart,
  Globe,
  Target,
  Settings,
  FileText,
  DollarSign,
  LayoutGrid,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AnalyticsHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: BarChart3 },
    { id: 'traffic', name: 'トラフィック', icon: Globe },
    { id: 'sales', name: '売上', icon: DollarSign },
    { id: 'conversion', name: 'コンバージョン', icon: Target },
    { id: 'reports', name: 'レポート', icon: FileText },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-rose-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Analytics Hub</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'traffic' && <TrafficTab />}
        {activeTab === 'sales' && <SalesTab />}
        {activeTab === 'conversion' && <ConversionTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/analytics-hub/dashboard/overview`, fetcher);
  const { data: kpis } = useSWR(`${API_BASE}/ebay/analytics-hub/dashboard/kpis`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/analytics-hub/dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-rose-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">総ビュー</p>
              <p className="text-2xl font-bold">{(overview?.totalViews || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">セッション</p>
              <p className="text-2xl font-bold">{(overview?.totalSessions || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">コンバージョン</p>
              <p className="text-2xl font-bold">{overview?.conversionRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-amber-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">売上</p>
              <p className="text-2xl font-bold">¥{(overview?.revenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">KPI</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis?.kpis?.map((kpi: any) => (
              <div key={kpi.name} className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">{kpi.name}</p>
                <p className="text-xl font-bold mt-1">
                  {kpi.unit === 'JPY' ? '¥' : ''}{kpi.value.toLocaleString()}{kpi.unit === '%' ? '%' : ''}
                </p>
                <div className={`flex items-center text-sm mt-1 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">トレンド</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {trends?.daily?.slice(-5).map((day: any) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm">{day.date}</span>
                <div className="flex items-center space-x-8 text-sm">
                  <span>ビュー: {day.views.toLocaleString()}</span>
                  <span>セッション: {day.sessions.toLocaleString()}</span>
                  <span>コンバージョン: {day.conversions.toLocaleString()}</span>
                  <span className="font-medium">売上: ¥{day.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrafficTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/analytics-hub/traffic/overview`, fetcher);
  const { data: sources } = useSWR(`${API_BASE}/ebay/analytics-hub/traffic/sources`, fetcher);
  const { data: geo } = useSWR(`${API_BASE}/ebay/analytics-hub/traffic/geo`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総訪問者</p>
          <p className="text-2xl font-bold">{(overview?.overview?.totalVisitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">ユニーク訪問者</p>
          <p className="text-2xl font-bold">{(overview?.overview?.uniqueVisitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">新規訪問者</p>
          <p className="text-2xl font-bold">{(overview?.overview?.newVisitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">リピーター</p>
          <p className="text-2xl font-bold">{(overview?.overview?.returningVisitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均PV</p>
          <p className="text-2xl font-bold">{overview?.overview?.avgPageViews || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">トラフィックソース</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {overview?.bySource?.map((source: any) => (
                <div key={source.source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{source.source}</span>
                    <span>{source.visitors.toLocaleString()} ({source.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-rose-600 h-2 rounded-full" style={{ width: `${source.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">地域別</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {geo?.countries?.map((country: any) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-gray-400 mr-2" />
                    <span>{country.country}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span>{country.visitors.toLocaleString()}</span>
                    <span className="text-gray-500">{country.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/analytics-hub/sales/overview`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/analytics-hub/sales/products`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-2xl font-bold">¥{(overview?.overview?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総注文数</p>
          <p className="text-2xl font-bold">{(overview?.overview?.totalOrders || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均注文額</p>
          <p className="text-2xl font-bold">¥{(overview?.overview?.avgOrderValue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総販売数</p>
          <p className="text-2xl font-bold">{(overview?.overview?.totalUnits || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">返品率</p>
          <p className="text-2xl font-bold">{overview?.overview?.refundRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">カテゴリ別売上</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {overview?.byCategory?.map((cat: any) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.category}</span>
                    <span>¥{cat.revenue.toLocaleString()} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-rose-600 h-2 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">トップ商品</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {products?.products?.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.units}個販売</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">¥{product.revenue.toLocaleString()}</p>
                    <p className={`text-sm ${product.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversionTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/analytics-hub/conversion/overview`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">コンバージョン率</p>
          <p className="text-2xl font-bold">{overview?.overview?.overallRate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総訪問者</p>
          <p className="text-2xl font-bold">{(overview?.overview?.visitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総コンバージョン</p>
          <p className="text-2xl font-bold">{(overview?.overview?.conversions || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均転換日数</p>
          <p className="text-2xl font-bold">{overview?.overview?.avgTimeToConvert || 0}日</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">コンバージョンファネル</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {overview?.funnel?.map((stage: any, index: number) => (
              <React.Fragment key={stage.stage}>
                <div className="text-center flex-1">
                  <div className="w-20 h-20 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-rose-600">{stage.count.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 font-medium">{stage.stage}</p>
                  <p className="text-sm text-gray-500">{stage.rate}%</p>
                </div>
                {index < overview?.funnel?.length - 1 && (
                  <div className="w-8 h-1 bg-rose-200"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/analytics-hub/reports`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
          レポート作成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">レポート名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スケジュール</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終生成</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.reports?.map((report: any) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{report.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{report.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">{report.schedule}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.lastGenerated}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-rose-600 hover:text-rose-800 text-sm font-medium">ダウンロード</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/analytics-hub/settings/general`, fetcher);
  const { data: goals } = useSWR(`${API_BASE}/ebay/analytics-hub/settings/goals`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">タイムゾーン</label>
              <select defaultValue={general?.settings?.timezone} className="mt-1 block w-full border rounded-lg px-3 py-2">
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルト期間（日）</label>
              <input type="number" defaultValue={general?.settings?.defaultDateRange} className="mt-1 block w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">目標</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {goals?.goals?.map((goal: any) => (
              <div key={goal.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-sm text-gray-500">目標: {goal.unit === 'JPY' ? '¥' : ''}{goal.target.toLocaleString()}{goal.unit === '%' ? '%' : ''}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-rose-600 h-2 rounded-full" style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">現在: {goal.unit === 'JPY' ? '¥' : ''}{goal.current.toLocaleString()}{goal.unit === '%' ? '%' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">設定を保存</button>
      </div>
    </div>
  );
}

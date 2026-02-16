'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Globe,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Filter,
  Download,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function MarketplaceAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Globe },
    { id: 'marketplaces', label: 'マーケット', icon: BarChart3 },
    { id: 'cross-market', label: 'クロス分析', icon: TrendingUp },
    { id: 'categories', label: 'カテゴリ', icon: Layers },
    { id: 'forecast', label: '予測', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-teal-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Marketplace Analytics</h1>
                <p className="text-sm text-gray-500">マーケットプレース分析</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                <Download className="w-4 h-4" />
                レポート出力
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'marketplaces' && <MarketplacesTab />}
        {activeTab === 'cross-market' && <CrossMarketTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'forecast' && <ForecastTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/marketplace-analytics/dashboard/overview`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/marketplace-analytics/dashboard/performance`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/marketplace-analytics/dashboard/trends`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">マーケット数</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.totalMarketplaces || 0}</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総売上</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.totalSales || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">アクティブ出品</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.activeListings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均CVR</p>
              <p className="text-3xl font-bold text-teal-600">{overview?.avgConversionRate || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">マーケット別パフォーマンス</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">マーケット</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">売上</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">注文数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">出品数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CVR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performance?.marketplaces?.map((mp: any) => (
                <tr key={mp.marketplace} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{mp.marketplace}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(mp.sales)}</td>
                  <td className="px-4 py-3 text-right">{mp.orders}</td>
                  <td className="px-4 py-3 text-right">{mp.listings}</td>
                  <td className="px-4 py-3 text-right text-teal-600 font-medium">{mp.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">週次トレンド</h3>
        <div className="h-64 flex items-end justify-between gap-4">
          {trends?.weekly?.map((week: any) => (
            <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full space-y-1">
                <div className="bg-teal-500 rounded-t" style={{ height: `${(week.ebayUs / 600000) * 150}px` }} />
                <div className="bg-blue-500 rounded" style={{ height: `${(week.ebayUk / 600000) * 150}px` }} />
                <div className="bg-green-500 rounded" style={{ height: `${(week.ebayDe / 600000) * 150}px` }} />
                <div className="bg-yellow-500 rounded-b" style={{ height: `${(week.ebayAu / 600000) * 150}px` }} />
              </div>
              <span className="text-xs text-gray-500">{week.week}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-teal-500 rounded"></span>eBay US</span>
          <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-blue-500 rounded"></span>eBay UK</span>
          <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-green-500 rounded"></span>eBay DE</span>
          <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-yellow-500 rounded"></span>eBay AU</span>
        </div>
      </div>
    </div>
  );
}

function MarketplacesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/marketplace-analytics/marketplaces`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">マーケットプレース一覧</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.marketplaces?.map((mp: any) => (
          <div key={mp.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{mp.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${mp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {mp.status}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">売上</span>
                <span className="font-medium">{formatCurrency(mp.sales)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">出品数</span>
                <span className="font-medium">{mp.listings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">通貨</span>
                <span className="font-medium">{mp.currency}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">最終同期: {mp.lastSync}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrossMarketTab() {
  const { data: comparison } = useSWR(`${API_BASE}/ebay/marketplace-analytics/cross-market/comparison`, fetcher);
  const { data: pricing } = useSWR(`${API_BASE}/ebay/marketplace-analytics/cross-market/pricing`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">マーケット比較</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">指標</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay US</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay UK</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay DE</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay AU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparison?.metrics?.map((metric: any) => (
                <tr key={metric.metric}>
                  <td className="px-4 py-3 font-medium text-gray-900">{metric.metric}</td>
                  <td className="px-4 py-3 text-right">{metric.ebayUs?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{metric.ebayUk?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{metric.ebayDe?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{metric.ebayAu?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">価格比較</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay US</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay UK</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay DE</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">eBay AU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pricing?.products?.map((product: any) => (
                <tr key={product.product}>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.product}</td>
                  <td className="px-4 py-3 text-right">${product.ebayUs}</td>
                  <td className="px-4 py-3 text-right">£{product.ebayUk}</td>
                  <td className="px-4 py-3 text-right">€{product.ebayDe}</td>
                  <td className="px-4 py-3 text-right">A${product.ebayAu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/marketplace-analytics/categories/performance`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">カテゴリパフォーマンス</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">売上</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">注文数</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">平均単価</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">成長率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.categories?.map((cat: any) => (
              <tr key={cat.category} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{cat.category}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(cat.totalSales)}</td>
                <td className="px-6 py-4 text-right">{cat.orders}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(cat.avgPrice)}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`flex items-center justify-end gap-1 ${cat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cat.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(cat.growth)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ForecastTab() {
  const { data } = useSWR(`${API_BASE}/ebay/marketplace-analytics/forecast/sales`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">売上予測</h3>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-gray-500">来月予測</p>
            <p className="text-2xl font-bold text-teal-600">{formatCurrency(data?.forecast?.nextMonth || 0)}</p>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-gray-500">四半期予測</p>
            <p className="text-2xl font-bold text-teal-600">{formatCurrency(data?.forecast?.nextQuarter || 0)}</p>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-gray-500">信頼度</p>
            <p className="text-2xl font-bold text-teal-600">{data?.forecast?.confidence || 0}%</p>
          </div>
        </div>

        <h4 className="text-md font-medium text-gray-700 mb-3">マーケット別予測</h4>
        <div className="space-y-3">
          {data?.forecast?.byMarketplace?.map((mp: any) => (
            <div key={mp.marketplace} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{mp.marketplace}</span>
              <span className="font-medium text-teal-600">{formatCurrency(mp.predicted)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/marketplace-analytics/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/marketplace-analytics/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">デフォルト通貨</p>
              <p className="text-sm text-gray-500">レポートの表示通貨</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>{general?.settings?.defaultCurrency}</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">自動同期</p>
              <p className="text-sm text-gray-500">データを自動的に同期</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoSync} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">アラート設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">売上低下アラート</p>
              <p className="text-sm text-gray-500">売上が閾値以上低下した場合</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.salesDropAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">低CVRアラート</p>
              <p className="text-sm text-gray-500">CVRが閾値を下回った場合</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.lowConversionAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

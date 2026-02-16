'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Download,
  Filter,
  Calendar,
  Settings,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Globe,
  Layers,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ProfitDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('month');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: DollarSign },
    { id: 'revenue', label: '売上分析', icon: TrendingUp },
    { id: 'costs', label: 'コスト分析', icon: TrendingDown },
    { id: 'profit', label: '利益分析', icon: PieChart },
    { id: 'goals', label: '目標管理', icon: Target },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-sky-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Profit Dashboard</h1>
                <p className="text-sm text-gray-500">利益分析・レポート</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="week">今週</option>
                <option value="month">今月</option>
                <option value="quarter">四半期</option>
                <option value="year">今年</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
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
                      ? 'border-sky-600 text-sky-600'
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
        {activeTab === 'revenue' && <RevenueTab />}
        {activeTab === 'costs' && <CostsTab />}
        {activeTab === 'profit' && <ProfitTab />}
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/profit-dashboard/dashboard/overview`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/profit-dashboard/dashboard/trends`, fetcher);
  const { data: topProducts } = useSWR(`${API_BASE}/ebay/profit-dashboard/dashboard/top-products`, fetcher);

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
              <p className="text-sm text-gray-500">総売上</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.totalRevenue || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総コスト</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.totalCost || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">純利益</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(overview?.netProfit || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">利益率</p>
              <p className="text-2xl font-bold text-sky-600">{overview?.profitMargin || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-sky-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">ROI: {overview?.roi || 0}%</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">利益トレンド</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              売上
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              コスト
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              利益
            </span>
          </div>
        </div>
        <div className="h-64 flex items-end justify-between gap-2">
          {trends?.daily?.map((day: any) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-1">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(day.profit / 60000) * 100}px` }}
                />
              </div>
              <span className="text-xs text-gray-500">{day.date.slice(-2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison & Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">期間比較</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">前週比</span>
              <span className={`flex items-center gap-1 ${(trends?.comparison?.vsLastWeek || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(trends?.comparison?.vsLastWeek || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(trends?.comparison?.vsLastWeek || 0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">前月比</span>
              <span className={`flex items-center gap-1 ${(trends?.comparison?.vsLastMonth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(trends?.comparison?.vsLastMonth || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(trends?.comparison?.vsLastMonth || 0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">前年比</span>
              <span className={`flex items-center gap-1 ${(trends?.comparison?.vsLastYear || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(trends?.comparison?.vsLastYear || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(trends?.comparison?.vsLastYear || 0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">トップ商品</h3>
          <div className="space-y-3">
            {topProducts?.products?.slice(0, 4).map((product: any) => (
              <div key={product.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sales}件販売</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{formatCurrency(product.profit)}</p>
                  <p className="text-sm text-gray-500">{product.margin}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/profit-dashboard/revenue/summary`, fetcher);
  const { data: breakdown } = useSWR(`${API_BASE}/ebay/profit-dashboard/revenue/breakdown`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">売上サマリー</h3>
        <p className="text-3xl font-bold text-gray-900 mb-6">{formatCurrency(summary?.total || 0)}</p>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              マーケット別
            </h4>
            <div className="space-y-3">
              {summary?.byMarketplace?.map((mp: any) => (
                <div key={mp.marketplace}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{mp.marketplace}</span>
                    <span className="text-sm font-medium">{formatCurrency(mp.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-sky-500 h-2 rounded-full"
                      style={{ width: `${mp.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              カテゴリ別
            </h4>
            <div className="space-y-3">
              {summary?.byCategory?.map((cat: any) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{cat.category}</span>
                    <span className="text-sm font-medium">{formatCurrency(cat.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">売上内訳</h3>
        <div className="space-y-3">
          {breakdown?.breakdown?.map((item: any) => (
            <div key={item.type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{item.type}</span>
              <div className="text-right">
                <span className="font-medium">{formatCurrency(item.amount)}</span>
                <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CostsTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/profit-dashboard/costs/summary`, fetcher);
  const { data: breakdown } = useSWR(`${API_BASE}/ebay/profit-dashboard/costs/breakdown`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">コストサマリー</h3>
        <p className="text-3xl font-bold text-red-600 mb-6">{formatCurrency(summary?.total || 0)}</p>

        <div className="space-y-4">
          {summary?.byType?.map((type: any) => (
            <div key={type.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600">{type.type}</span>
                <span className="font-medium">{formatCurrency(type.amount)} ({type.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${type.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">コスト詳細</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {breakdown?.details?.map((detail: any) => (
                <tr key={detail.category}>
                  <td className="px-4 py-3 text-gray-900">{detail.category}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(detail.amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{detail.items ? `${detail.items}件` : detail.rate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfitTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/profit-dashboard/profit/summary`, fetcher);
  const { data: byMarketplace } = useSWR(`${API_BASE}/ebay/profit-dashboard/profit/by-marketplace`, fetcher);
  const { data: byCategory } = useSWR(`${API_BASE}/ebay/profit-dashboard/profit/by-category`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">粗利益</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.grossProfit || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">粗利率: {summary?.grossMargin || 0}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">営業費用</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.operatingExpenses || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">純利益</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.netProfit || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">純利率: {summary?.netMargin || 0}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">ROI</p>
          <p className="text-2xl font-bold text-sky-600">{summary?.roi || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">マーケット別利益</h3>
          <div className="space-y-4">
            {byMarketplace?.marketplaces?.map((mp: any) => (
              <div key={mp.marketplace} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{mp.marketplace}</span>
                  <span className="text-green-600 font-medium">{formatCurrency(mp.profit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>売上: {formatCurrency(mp.revenue)}</span>
                  <span>利益率: {mp.margin}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ別利益</h3>
          <div className="space-y-4">
            {byCategory?.categories?.map((cat: any) => (
              <div key={cat.category} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{cat.category}</span>
                  <span className="text-green-600 font-medium">{formatCurrency(cat.profit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>売上: {formatCurrency(cat.revenue)}</span>
                  <span>利益率: {cat.margin}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/profit-dashboard/goals`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">目標管理</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          <Target className="w-4 h-4" />
          目標設定
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.goals?.map((goal: any) => (
          <div key={goal.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {goal.type === 'revenue' ? '売上目標' : goal.type === 'profit' ? '利益目標' : '利益率目標'}
              </h3>
              <span className={`text-sm ${goal.progress >= 100 ? 'text-green-600' : goal.progress >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                {goal.progress}%
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">目標</p>
                <p className="text-xl font-bold text-gray-900">
                  {goal.type === 'margin' ? `${goal.target}%` : formatCurrency(goal.target)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">現在</p>
                <p className="text-xl font-bold text-sky-600">
                  {goal.type === 'margin' ? `${goal.current}%` : formatCurrency(goal.current)}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/profit-dashboard/settings/general`, fetcher);
  const { data: costRules } = useSWR(`${API_BASE}/ebay/profit-dashboard/settings/cost-rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">通貨</p>
              <p className="text-sm text-gray-500">レポートの表示通貨</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>{general?.settings?.currency}</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">会計年度開始月</p>
              <p className="text-sm text-gray-500">年次レポートの開始月</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="04">4月</option>
              <option value="01">1月</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">送料をコストに含める</p>
              <p className="text-sm text-gray-500">利益計算時に送料を含める</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.includeShippingInCost} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">コストルール</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">値</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">適用先</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {costRules?.rules?.map((rule: any) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3 text-gray-500">{rule.type}</td>
                  <td className="px-4 py-3 text-gray-900">{rule.value || rule.rate}{rule.rate ? '%' : '円'}</td>
                  <td className="px-4 py-3 text-gray-500">{rule.applyTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

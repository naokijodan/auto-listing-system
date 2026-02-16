'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Settings,
  Filter,
  Play,
  Clock,
  RefreshCw,
  Plus,
  Eye,
  Zap,
  Calendar,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function BulkPricingManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: DollarSign },
    { id: 'products', label: '価格管理', icon: TrendingUp },
    { id: 'bulk', label: '一括操作', icon: Percent },
    { id: 'rules', label: 'ルール', icon: Zap },
    { id: 'schedules', label: 'スケジュール', icon: Calendar },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-violet-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bulk Pricing Manager</h1>
                <p className="text-sm text-gray-500">一括価格管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                <Percent className="w-4 h-4" />
                一括価格変更
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
                      ? 'border-violet-600 text-violet-600'
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
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'bulk' && <BulkTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/dashboard/recent`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総商品数</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.totalProducts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">保留中の更新</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.pendingUpdates || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最近の更新</p>
              <p className="text-3xl font-bold text-green-600">{overview?.recentUpdates || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均変更率</p>
              <p className="text-3xl font-bold text-violet-600">{overview?.avgPriceChange || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の更新</h3>
        <div className="space-y-3">
          {recent?.updates?.map((update: any) => (
            <div key={update.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  update.status === 'completed' ? 'bg-green-100' :
                  update.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {update.avgChange >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{update.type} - {update.productsCount}件</p>
                  <p className="text-sm text-gray-500">平均変更: {update.avgChange}%</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${
                update.status === 'completed' ? 'bg-green-100 text-green-700' :
                update.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {update.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats by Marketplace */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">マーケット別</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">マーケット</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">商品数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">平均価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">最終更新</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats?.byMarketplace?.map((mp: any) => (
                <tr key={mp.marketplace}>
                  <td className="px-4 py-3 font-medium text-gray-900">{mp.marketplace}</td>
                  <td className="px-4 py-3 text-right">{mp.products}</td>
                  <td className="px-4 py-3 text-right">${mp.avgPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{mp.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/products`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">現在価格</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">原価</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">マージン</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">マーケット</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.products?.map((product: any) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </td>
                <td className="px-6 py-4 text-right font-medium">${product.currentPrice.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-gray-500">${product.costPrice.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-medium ${product.margin >= 30 ? 'text-green-600' : product.margin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {product.margin}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.marketplace}</td>
                <td className="px-6 py-4">
                  <button className="text-violet-600 hover:text-violet-800">編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">パーセンテージ変更</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">変更率</label>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={10} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <button className="w-full bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700">適用</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">固定額変更</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">金額</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input type="number" defaultValue={5} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <button className="w-full bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700">適用</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">マージンベース</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">目標マージン</label>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={35} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <button className="w-full bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700">適用</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">価格ルール</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          <Plus className="w-4 h-4" />
          新規ルール
        </button>
      </div>

      <div className="space-y-4">
        {data?.rules?.map((rule: any) => (
          <div key={rule.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Zap className={`w-5 h-5 ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <p className="text-sm text-gray-500">条件: {rule.condition}</p>
                  <p className="text-sm text-gray-500">アクション: {rule.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{rule.affectedProducts}件対象</span>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Play className="w-4 h-4 text-violet-600" />
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/schedules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">スケジュール</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          <Plus className="w-4 h-4" />
          新規スケジュール
        </button>
      </div>

      <div className="space-y-4">
        {data?.schedules?.map((schedule: any) => (
          <div key={schedule.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                  <p className="text-sm text-gray-500">予定: {schedule.scheduledAt}</p>
                  <p className="text-sm text-gray-500">{schedule.products}件対象</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${
                schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {schedule.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/bulk-pricing-manager/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">デフォルト目標マージン</p>
              <p className="text-sm text-gray-500">新規商品のデフォルトマージン</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" defaultValue={general?.settings?.defaultMarginTarget || 30} className="w-20 border border-gray-300 rounded-lg px-3 py-2" />
              <span className="text-gray-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">最大価格変更率</p>
              <p className="text-sm text-gray-500">一度の変更で許可される最大変更率</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" defaultValue={general?.settings?.maxPriceChangePercent || 25} className="w-20 border border-gray-300 rounded-lg px-3 py-2" />
              <span className="text-gray-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">承認必須</p>
              <p className="text-sm text-gray-500">大きな変更には承認を必須</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.requireApproval} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

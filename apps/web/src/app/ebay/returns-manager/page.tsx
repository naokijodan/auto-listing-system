'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  RotateCcw,
  Package,
  FileText,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Truck,
  Zap,
  Download,
  Tag,
  TrendingUp,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ReturnsManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: RotateCcw },
    { id: 'returns', name: '返品管理', icon: Package },
    { id: 'policies', name: 'ポリシー', icon: FileText },
    { id: 'automation', name: '自動化', icon: Zap },
    { id: 'reports', name: 'レポート', icon: BarChart2 },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <RotateCcw className="h-8 w-8 text-teal-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Returns Manager</h1>
                <p className="text-sm text-gray-500">返品・返金管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                <Download className="h-4 w-4 mr-2" />
                レポート
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'returns' && <ReturnsTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/returns-manager/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/returns-manager/dashboard/recent`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/returns-manager/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">保留中の返品</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.pendingReturns || 0}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="mt-2 text-sm text-yellow-600">要対応</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">処理中</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.inProgressReturns || 0}</p>
            </div>
            <Truck className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">返品待ち</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">返品率</p>
              <p className="text-3xl font-bold text-teal-600">{overview?.returnRate || 0}%</p>
            </div>
            <TrendingUp className="h-12 w-12 text-teal-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">良好</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">返金総額</p>
              <p className="text-3xl font-bold text-red-600">¥{((overview?.totalRefunded || 0) / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="h-12 w-12 text-red-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">今月</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Returns */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">最近の返品</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recent?.returns?.map((ret: any) => (
              <div key={ret.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      ret.status === 'pending' ? 'bg-yellow-100' :
                      ret.status === 'approved' ? 'bg-blue-100' :
                      'bg-green-100'
                    }`}>
                      {ret.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : ret.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ret.product}</p>
                      <p className="text-xs text-gray-500">{ret.reason}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">¥{ret.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Reasons */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">返品理由</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.byReason?.map((reason: any) => (
                <div key={reason.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{reason.reason}</span>
                    <span className="text-sm font-medium text-gray-900">{reason.count}件 ({reason.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${reason.percentage}%` }}
                    />
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

function ReturnsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/returns-manager/returns`, fetcher);
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-cyan-100 text-cyan-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReturns = data?.returns?.filter((ret: any) =>
    statusFilter === 'all' || ret.status === statusFilter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">すべて</option>
                <option value="pending">保留中</option>
                <option value="approved">承認済み</option>
                <option value="received">受領済み</option>
                <option value="refunded">返金済み</option>
                <option value="completed">完了</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total || 0} 件</p>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返品ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">理由</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReturns.map((ret: any) => (
              <tr key={ret.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{ret.id}</p>
                  <p className="text-xs text-gray-500">{ret.orderId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{ret.customer}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{ret.product}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{ret.reason}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900">¥{ret.amount.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                    {ret.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-teal-600 hover:text-teal-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    {ret.status === 'pending' && (
                      <>
                        <button className="text-green-600 hover:text-green-900">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoliciesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/returns-manager/policies`, fetcher);

  return (
    <div className="space-y-6">
      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.policies?.map((policy: any) => (
          <div key={policy.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{policy.name}</h4>
                <p className="mt-1 text-xs text-gray-500">
                  返品期間: {policy.returnWindow > 0 ? `${policy.returnWindow}日` : '返品不可'}
                </p>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">再入荷手数料</span>
                <span className="font-medium">{policy.restockingFee}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">条件</span>
                <div className="flex flex-wrap gap-1">
                  {policy.conditions.slice(0, 2).map((cond: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationTab() {
  const { data } = useSWR(`${API_BASE}/ebay/returns-manager/automation/rules`, fetcher);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">自動化ルール</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          ルール作成
        </button>
      </div>

      {/* Rules */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {data?.rules?.map((rule: any) => (
            <div key={rule.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Zap className={`h-5 w-5 ${rule.enabled ? 'text-teal-500' : 'text-gray-300'}`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                    <p className="text-xs text-gray-500">
                      条件: <code className="bg-gray-100 px-1 rounded">{rule.condition}</code> → アクション: {rule.action}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.enabled} className="sr-only peer" readOnly />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/returns-manager/reports/summary`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/returns-manager/reports/products`, fetcher);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">月次サマリー - {summary?.summary?.period}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">総返品数</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.summary?.totalReturns || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">返金総額</p>
              <p className="text-2xl font-bold text-red-600">¥{(summary?.summary?.totalRefunded || 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">平均処理時間</p>
              <p className="text-2xl font-bold text-blue-600">{summary?.summary?.avgProcessingTime || 0}日</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">返品率</p>
              <p className="text-2xl font-bold text-teal-600">{summary?.summary?.returnRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products with High Returns */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">返品率の高い商品</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">返品数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">返品率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">主な理由</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products?.products?.map((product: any) => (
                <tr key={product.product}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{product.returns}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={product.returnRate > 3 ? 'text-red-600' : 'text-green-600'}>
                      {product.returnRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.topReason}</td>
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
  const { data } = useSWR(`${API_BASE}/ebay/returns-manager/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">デフォルトポリシー</label>
            <select
              defaultValue={data?.settings?.defaultPolicy}
              className="w-64 border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="1">標準返品ポリシー</option>
              <option value="2">電子機器ポリシー</option>
              <option value="3">セール品ポリシー</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">自動承認</h4>
              <p className="text-sm text-gray-500">少額の返品を自動承認</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoApproveEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">自動承認しきい値</label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">¥</span>
              <input
                type="number"
                defaultValue={data?.settings?.autoApproveThreshold || 5000}
                className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">画像必須</h4>
              <p className="text-sm text-gray-500">返品リクエストに画像を必須にする</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.requireImages} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">新規返品通知</h4>
              <p className="text-sm text-gray-500">新規返品リクエストを通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.notifyOnNewReturn} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

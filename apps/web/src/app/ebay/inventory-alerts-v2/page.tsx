'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Filter,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
  Zap,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function InventoryAlertsV2Page() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: AlertTriangle },
    { id: 'alerts', label: 'アラート', icon: Bell },
    { id: 'rules', label: 'ルール', icon: Zap },
    { id: 'thresholds', label: '閾値設定', icon: TrendingDown },
    { id: 'reports', label: 'レポート', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Inventory Alerts</h1>
                <p className="text-sm text-gray-500">在庫アラート管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                <RefreshCw className="w-4 h-4" />
                在庫チェック
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
                      ? 'border-orange-600 text-orange-600'
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
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'thresholds' && <ThresholdsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/dashboard/recent`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総アラート</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.totalAlerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">緊急</p>
              <p className="text-3xl font-bold text-red-600">{overview?.criticalAlerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">警告</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.warningAlerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本日解決</p>
              <p className="text-3xl font-bold text-green-600">{overview?.resolvedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のアラート</h3>
        <div className="space-y-3">
          {recent?.alerts?.map((alert: any) => (
            <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'critical' ? 'bg-red-100' :
                  alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {alert.severity === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  {alert.severity === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  {alert.severity === 'info' && <Bell className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{alert.product}</p>
                  <p className="text-sm text-gray-500">{alert.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {alert.type}
                </span>
                <span className="text-sm text-gray-500">{alert.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats by Type */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">タイプ別統計</h3>
        <div className="grid grid-cols-3 gap-4">
          {stats?.byType?.slice(0, 6).map((type: any) => (
            <div key={type.type} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{type.type}</span>
                <span className="text-sm font-medium">{type.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${type.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <CheckCircle className="w-4 h-4" />
          一括解決
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重要度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">在庫</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.alerts?.map((alert: any) => (
              <tr key={alert.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{alert.productName}</p>
                    <p className="text-sm text-gray-500">{alert.sku}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{alert.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="font-medium">{alert.currentStock}</span>
                  <span className="text-gray-500"> / {alert.threshold}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    alert.status === 'active' ? 'bg-red-100 text-red-700' :
                    alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {alert.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded" title="確認">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="解決">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="スヌーズ">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </button>
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

function RulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">アラートルール</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
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
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs ${
                  rule.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  rule.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {rule.severity}
                </span>
                <div className="flex gap-1">
                  {rule.notifyChannels?.map((channel: string) => (
                    <span key={channel} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {channel}
                    </span>
                  ))}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThresholdsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/thresholds`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">閾値設定</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RefreshCw className="w-4 h-4" />
            自動計算
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            一括更新
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">低在庫閾値</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">再発注点</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">安全在庫</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.thresholds?.map((threshold: any) => (
              <tr key={threshold.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{threshold.productName}</p>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    defaultValue={threshold.lowStockThreshold}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    defaultValue={threshold.reorderPoint}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    defaultValue={threshold.safetyStock}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-6 py-4">
                  <button className="text-orange-600 hover:text-orange-800">保存</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/reports/summary`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月間サマリー</h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{data?.report?.totalAlerts || 0}</p>
            <p className="text-sm text-gray-500">総アラート</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{data?.report?.resolvedAlerts || 0}</p>
            <p className="text-sm text-gray-500">解決済み</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{data?.report?.resolutionRate || 0}%</p>
            <p className="text-sm text-gray-500">解決率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{data?.report?.avgResolutionTime || 0}h</p>
            <p className="text-sm text-gray-500">平均解決時間</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">タイプ別レポート</h3>
        <div className="space-y-4">
          {data?.report?.byType?.map((type: any) => (
            <div key={type.type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{type.type}</span>
              <div className="flex items-center gap-4">
                <span>{type.count}件</span>
                <span className="text-green-600">{type.resolved}件解決</span>
                <span className="text-gray-500">{((type.resolved / type.count) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/inventory-alerts-v2/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">アラート有効</p>
              <p className="text-sm text-gray-500">在庫アラートシステムを有効にする</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.enabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">チェック間隔</p>
              <p className="text-sm text-gray-500">在庫チェックの間隔（分）</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="15">{general?.settings?.checkInterval || 15}分</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">補充時自動解決</p>
              <p className="text-sm text-gray-500">在庫が補充されたらアラートを自動解決</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoResolveOnRestock} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">メール通知</p>
              <p className="text-sm text-gray-500">{notifications?.settings?.email?.recipients?.join(', ')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.email?.enabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Slack通知</p>
              <p className="text-sm text-gray-500">{notifications?.settings?.slack?.channel}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.slack?.enabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">緊急のみ通知</p>
              <p className="text-sm text-gray-500">緊急（Critical）アラートのみ通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.criticalOnly} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

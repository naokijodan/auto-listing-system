'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
  Filter,
  Bell,
  TrendingUp,
  Globe,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function OrderTrackingHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Truck },
    { id: 'tracking', label: '追跡', icon: MapPin },
    { id: 'carriers', label: '配送業者', icon: Package },
    { id: 'analytics', label: '分析', icon: TrendingUp },
    { id: 'notifications', label: '通知ルール', icon: Bell },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-pink-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Order Tracking Hub</h1>
                <p className="text-sm text-gray-500">注文追跡管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                <RefreshCw className="w-4 h-4" />
                全て更新
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
                      ? 'border-pink-600 text-pink-600'
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
        {activeTab === 'tracking' && <TrackingTab />}
        {activeTab === 'carriers' && <CarriersTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/order-tracking-hub/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/order-tracking-hub/dashboard/recent`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/order-tracking-hub/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">輸送中</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.inTransit || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">配達完了</p>
              <p className="text-3xl font-bold text-green-600">{overview?.delivered || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">遅延</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.delayed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">定時配達率</p>
              <p className="text-3xl font-bold text-pink-600">{overview?.onTimeDeliveryRate || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">平均: {overview?.avgDeliveryDays}日</p>
        </div>
      </div>

      {/* Recent Updates & Alerts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の更新</h3>
          <div className="space-y-3">
            {recent?.updates?.map((update: any) => (
              <div key={update.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    update.status === 'delivered' ? 'bg-green-100' :
                    update.status === 'in_transit' ? 'bg-blue-100' :
                    update.status === 'delayed' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    {update.status === 'delivered' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {update.status === 'in_transit' && <Truck className="w-4 h-4 text-blue-600" />}
                    {update.status === 'delayed' && <Clock className="w-4 h-4 text-yellow-600" />}
                    {update.status === 'out_for_delivery' && <Package className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{update.orderId}</p>
                    <p className="text-sm text-gray-500">{update.message}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{update.location}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">アラート</h3>
          <div className="space-y-3">
            {alerts?.alerts?.map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-100' :
                    alert.severity === 'high' ? 'bg-orange-100' : 'bg-yellow-100'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{alert.orderId}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingTab() {
  const { data } = useSWR(`${API_BASE}/ebay/order-tracking-hub/tracking`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          <RefreshCw className="w-4 h-4" />
          追跡更新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注文</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">追跡番号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配送業者</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配送先</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">到着予定</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.shipments?.map((shipment: any) => (
              <tr key={shipment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{shipment.orderId}</p>
                  <p className="text-sm text-gray-500">{shipment.customer}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{shipment.trackingNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{shipment.carrier}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{shipment.destination}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                    shipment.status === 'delayed' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {shipment.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{shipment.estimatedDelivery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CarriersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/order-tracking-hub/carriers`, fetcher);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">配送業者</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.carriers?.map((carrier: any) => (
          <div key={carrier.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${carrier.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {carrier.enabled ? '有効' : '無効'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>コード: {carrier.code}</p>
              <p>配送件数: {carrier.shipments}件</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data: performance } = useSWR(`${API_BASE}/ebay/order-tracking-hub/analytics/delivery-performance`, fetcher);
  const { data: exceptions } = useSWR(`${API_BASE}/ebay/order-tracking-hub/analytics/exceptions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">配送パフォーマンス</h3>
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{performance?.summary?.avgDeliveryDays || 0}</p>
            <p className="text-sm text-gray-500">平均配送日数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{performance?.summary?.onTimeRate || 0}%</p>
            <p className="text-sm text-gray-500">定時配達率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{performance?.summary?.lateRate || 0}%</p>
            <p className="text-sm text-gray-500">遅延率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{performance?.summary?.exceptionRate || 0}%</p>
            <p className="text-sm text-gray-500">例外率</p>
          </div>
        </div>

        <h4 className="text-md font-medium text-gray-700 mb-3">配送業者別</h4>
        <div className="space-y-3">
          {performance?.byCarrier?.map((carrier: any) => (
            <div key={carrier.carrier} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{carrier.carrier}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">{carrier.avgDays}日</span>
                <span className="text-green-600 font-medium">{carrier.onTimeRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">例外分析</h3>
        <div className="space-y-3">
          {exceptions?.byType?.map((type: any) => (
            <div key={type.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600">{type.type}</span>
                <span className="text-sm">{type.count} ({type.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-500 h-2 rounded-full"
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

function NotificationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/order-tracking-hub/notification-rules`, fetcher);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">通知ルール</h2>

      <div className="space-y-4">
        {data?.rules?.map((rule: any) => (
          <div key={rule.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Bell className={`w-5 h-5 ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <p className="text-sm text-gray-500">トリガー: {rule.trigger}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {rule.channels?.map((channel: string) => (
                    <span key={channel} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {channel}
                    </span>
                  ))}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/order-tracking-hub/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/order-tracking-hub/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">自動更新</p>
              <p className="text-sm text-gray-500">追跡情報を自動的に更新</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoRefreshEnabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">更新間隔</p>
              <p className="text-sm text-gray-500">自動更新の間隔（分）</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="60">{general?.settings?.refreshInterval || 60}分</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">顧客通知</p>
              <p className="text-sm text-gray-500">顧客への配送通知を送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.customerNotifications} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">遅延閾値</p>
              <p className="text-sm text-gray-500">遅延アラートを発生させる日数</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="2">{notifications?.settings?.delayThresholdDays || 2}日</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

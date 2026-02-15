'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Search,
  Filter,
  Globe,
  BarChart,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Navigation,
  XCircle,
  Eye,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ShippingCenterPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Truck },
    { id: 'shipments', name: '出荷管理', icon: Package },
    { id: 'tracking', name: '追跡', icon: MapPin },
    { id: 'carriers', name: '配送業者', icon: Globe },
    { id: 'reports', name: 'レポート', icon: BarChart },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-cyan-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Shipping Center</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-cyan-600 text-cyan-600'
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
        {activeTab === 'shipments' && <ShipmentsTab />}
        {activeTab === 'tracking' && <TrackingTab />}
        {activeTab === 'carriers' && <CarriersTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/shipping-center/dashboard/overview`, fetcher);
  const { data: today } = useSWR(`${API_BASE}/ebay/shipping-center/dashboard/today`, fetcher);
  const { data: tracking } = useSWR(`${API_BASE}/ebay/shipping-center/dashboard/tracking`, fetcher);
  const { data: carriers } = useSWR(`${API_BASE}/ebay/shipping-center/dashboard/carriers`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-cyan-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">本日の出荷</p>
              <p className="text-2xl font-bold">{overview?.todayShipments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Navigation className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">輸送中</p>
              <p className="text-2xl font-bold">{overview?.inTransit || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">定時配達率</p>
              <p className="text-2xl font-bold">{overview?.onTimeRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-amber-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">平均配達日数</p>
              <p className="text-2xl font-bold">{overview?.avgDeliveryTime || 0}日</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">本日の出荷</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {today?.shipments?.map((shipment: any) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      shipment.status === 'delivered' ? 'bg-green-100' :
                      shipment.status === 'in_transit' ? 'bg-blue-100' :
                      shipment.status === 'picked_up' ? 'bg-cyan-100' : 'bg-gray-100'
                    }`}>
                      {shipment.status === 'delivered' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       shipment.status === 'in_transit' ? <Navigation className="h-5 w-5 text-blue-600" /> :
                       <Truck className="h-5 w-5 text-cyan-600" />}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{shipment.trackingNumber}</p>
                      <p className="text-sm text-gray-500">{shipment.carrier} → {shipment.destination}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                    'bg-cyan-100 text-cyan-800'
                  }`}>
                    {shipment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">配送業者別パフォーマンス</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {carriers?.carriers?.map((carrier: any) => (
                <div key={carrier.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{carrier.name}</span>
                    <span className="text-sm text-gray-500">{carrier.shipments}件</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">定時率:</span>
                      <span className="ml-1 font-medium">{carrier.onTimeRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">平均:</span>
                      <span className="ml-1 font-medium">{carrier.avgTime}日</span>
                    </div>
                    <div>
                      <span className="text-gray-500">コスト:</span>
                      <span className="ml-1 font-medium">¥{carrier.avgCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tracking?.alerts?.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">配送アラート</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {tracking.alerts.map((alert: any) => (
                <div key={alert.id} className={`p-4 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50' : 'bg-yellow-50'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
                      alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-gray-600">{alert.carrier} - {alert.shipmentId}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShipmentsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-center/shipments`, fetcher);
  const [status, setStatus] = useState('all');

  const filteredShipments = data?.shipments?.filter((s: any) => {
    return status === 'all' || s.status === status;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="追跡番号を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">全ステータス</option>
            {data?.statuses?.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
          <Plus className="h-5 w-5 mr-2" />
          新規出荷
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">追跡番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配送業者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配送先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">コスト</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredShipments?.map((shipment: any) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{shipment.trackingNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{shipment.carrier}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {shipment.destination.city}, {shipment.destination.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{shipment.weight}</td>
                  <td className="px-6 py-4 whitespace-nowrap">¥{shipment.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      shipment.status === 'shipped' ? 'bg-cyan-100 text-cyan-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="追跡">
                        <MapPin className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-cyan-600 hover:bg-cyan-50 rounded" title="ラベル印刷">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
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

function TrackingTab() {
  const { data: tracking } = useSWR(`${API_BASE}/ebay/shipping-center/tracking`, fetcher);
  const { data: exceptions } = useSWR(`${API_BASE}/ebay/shipping-center/tracking/exceptions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">追跡状況</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">追跡番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配送業者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">現在地</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終更新</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配達予定</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tracking?.shipments?.map((shipment: any) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{shipment.trackingNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{shipment.carrier}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{shipment.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      shipment.status === 'out_for_delivery' ? 'bg-emerald-100 text-emerald-800' :
                      shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.lastUpdate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.estimatedDelivery || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">配送例外</h3>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            {exceptions?.total || 0}件
          </span>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {exceptions?.exceptions?.map((exception: any) => (
              <div key={exception.id} className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">{exception.message}</p>
                      <p className="text-sm text-gray-600">{exception.carrier} - {exception.trackingNumber}</p>
                      <p className="text-sm text-gray-500">{exception.daysSinceShipped}日経過</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-white border border-red-600 text-red-600 rounded-lg text-sm hover:bg-red-50">
                    解決
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CarriersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-center/carriers`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.carriers?.map((carrier: any) => (
          <div key={carrier.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  carrier.status === 'active' ? 'bg-cyan-100' : 'bg-gray-100'
                }`}>
                  <Truck className={`h-6 w-6 ${
                    carrier.status === 'active' ? 'text-cyan-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold">{carrier.name}</h3>
                  <p className="text-sm text-gray-500">{carrier.services.join(', ')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                carrier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {carrier.status === 'active' ? '有効' : '無効'}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              デフォルトサービス: {carrier.defaultService}
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">
                設定
              </button>
              <button className="px-3 py-2 border border-cyan-600 text-cyan-600 rounded-lg text-sm hover:bg-cyan-50">
                料金表
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: cost } = useSWR(`${API_BASE}/ebay/shipping-center/reports/cost`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/shipping-center/reports/performance`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総配送コスト</p>
          <p className="text-2xl font-bold">¥{(cost?.summary?.totalCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均コスト/件</p>
          <p className="text-2xl font-bold">¥{(cost?.summary?.avgCostPerShipment || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総出荷数</p>
          <p className="text-2xl font-bold">{performance?.summary?.totalShipments || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">定時配達率</p>
          <p className="text-2xl font-bold">{performance?.summary?.onTimeRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">配送業者別コスト</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {cost?.summary?.byCarrier?.map((item: any) => (
                <div key={item.carrier} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.carrier}</p>
                    <p className="text-sm text-gray-500">{item.shipments}件</p>
                  </div>
                  <p className="font-bold">¥{item.cost.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">配送先別パフォーマンス</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {performance?.byDestination?.map((item: any) => (
                <div key={item.country}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.country}</span>
                    <span>{item.shipments}件 / {item.onTimeRate}% / {item.avgDays}日</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-cyan-600 h-2 rounded-full"
                      style={{ width: `${item.onTimeRate}%` }}
                    ></div>
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

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/shipping-center/settings/general`, fetcher);
  const { data: automation } = useSWR(`${API_BASE}/ebay/shipping-center/settings/automation`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルト配送業者</label>
              <select
                defaultValue={general?.settings?.defaultCarrier}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="japan_post">Japan Post</option>
                <option value="dhl">DHL</option>
                <option value="fedex">FedEx</option>
                <option value="ups">UPS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルトサービス</label>
              <select
                defaultValue={general?.settings?.defaultService}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="EMS">EMS</option>
                <option value="ePacket">ePacket</option>
                <option value="SAL">SAL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">重量単位</label>
              <select
                defaultValue={general?.settings?.weightUnit}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">サイズ単位</label>
              <select
                defaultValue={general?.settings?.dimensionUnit}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">自動化設定</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'autoSelectCarrier', label: '配送業者を自動選択' },
            { key: 'autoNotifyCustomer', label: '顧客に自動通知' },
            { key: 'autoUpdateTracking', label: '追跡情報を自動更新' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={automation?.settings?.[item.key]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700">追跡更新間隔（分）</label>
            <input
              type="number"
              defaultValue={automation?.settings?.updateInterval}
              className="mt-1 block w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

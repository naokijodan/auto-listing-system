'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  DollarSign,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Eye,
  XCircle,
  FileText,
  Zap,
  BarChart,
  Plus,
  Box,
  ClipboardList,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function OrderHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: ShoppingBag },
    { id: 'orders', name: '注文管理', icon: Package },
    { id: 'fulfillment', name: 'フルフィルメント', icon: Box },
    { id: 'automation', name: '自動化', icon: Zap },
    { id: 'reports', name: 'レポート', icon: BarChart },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-fuchsia-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Order Hub</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-fuchsia-600 text-fuchsia-600'
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
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'fulfillment' && <FulfillmentTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/order-hub/dashboard/overview`, fetcher);
  const { data: today } = useSWR(`${API_BASE}/ebay/order-hub/dashboard/today`, fetcher);
  const { data: pending } = useSWR(`${API_BASE}/ebay/order-hub/dashboard/pending`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ShoppingBag className="h-8 w-8 text-fuchsia-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">今日の注文</p>
              <p className="text-2xl font-bold">{overview?.todayOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">保留中</p>
              <p className="text-2xl font-bold">{overview?.pendingOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">発送済み</p>
              <p className="text-2xl font-bold">{overview?.shippedOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">今日の売上</p>
              <p className="text-2xl font-bold">¥{(overview?.todayRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">今日の注文</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {today?.orders?.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      order.status === 'delivered' ? 'bg-green-100' :
                      order.status === 'shipped' ? 'bg-blue-100' :
                      order.status === 'processing' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      {order.status === 'delivered' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       order.status === 'shipped' ? <Truck className="h-5 w-5 text-blue-600" /> :
                       order.status === 'processing' ? <RefreshCw className="h-5 w-5 text-yellow-600" /> :
                       <Clock className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-gray-500">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">¥{order.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{order.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">保留中の注文</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pending?.orders?.map((order: any) => (
                <div key={order.id} className={`p-4 rounded-lg ${
                  order.priority === 'high' ? 'bg-red-50' : 'bg-yellow-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-gray-600">{order.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">¥{order.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{order.waitingTime}分待ち</p>
                    </div>
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

function OrdersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/order-hub/orders`, fetcher);
  const [status, setStatus] = useState('all');

  const filteredOrders = data?.orders?.filter((o: any) => {
    return status === 'all' || o.status === status;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="注文を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">全ステータス</option>
            {data?.statuses?.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注文ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">合計</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders?.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{order.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{order.customer.name}</p>
                      <p className="text-sm text-gray-500">{order.customer.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.items}</td>
                  <td className="px-6 py-4 whitespace-nowrap">¥{order.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="詳細">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-fuchsia-600 hover:bg-fuchsia-50 rounded" title="出荷">
                        <Truck className="h-4 w-4" />
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

function FulfillmentTab() {
  const { data: picking } = useSWR(`${API_BASE}/ebay/order-hub/fulfillment/picking`, fetcher);
  const { data: packing } = useSWR(`${API_BASE}/ebay/order-hub/fulfillment/packing`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">ピッキングリスト</h3>
            <span className="px-3 py-1 bg-fuchsia-100 text-fuchsia-800 rounded-full text-sm">
              {picking?.total || 0}件
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {picking?.items?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.status === 'picked' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <ClipboardList className={`h-5 w-5 ${
                        item.status === 'picked' ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku} / 場所: {item.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">x{item.quantity}</span>
                    {item.status !== 'picked' && (
                      <button className="px-3 py-1 bg-fuchsia-600 text-white rounded-lg text-sm hover:bg-fuchsia-700">
                        ピック
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">パッキングリスト</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {packing?.total || 0}件
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {packing?.orders?.map((order: any) => (
                <div key={order.orderId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{order.orderId}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'ready' ? '準備完了' : '準備中'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">商品数:</span> {order.items}
                    </div>
                    <div>
                      <span className="text-gray-500">重量:</span> {order.weight}
                    </div>
                    <div>
                      <span className="text-gray-500">梱包:</span> {order.packaging}
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-fuchsia-600 text-white rounded-lg text-sm hover:bg-fuchsia-700">
                      パッキング完了
                    </button>
                    <button className="px-3 py-2 border border-fuchsia-600 text-fuchsia-600 rounded-lg text-sm hover:bg-fuchsia-50">
                      ラベル印刷
                    </button>
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

function AutomationTab() {
  const { data } = useSWR(`${API_BASE}/ebay/order-hub/automation/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">
          <Plus className="h-5 w-5 mr-2" />
          ルール作成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">自動化ルール</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data?.rules?.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Zap className={`h-6 w-6 mr-3 ${rule.enabled ? 'text-fuchsia-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-gray-500">条件: {rule.condition} → {rule.action}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={rule.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-fuchsia-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: sales } = useSWR(`${API_BASE}/ebay/order-hub/reports/sales`, fetcher);
  const { data: orders } = useSWR(`${API_BASE}/ebay/order-hub/reports/orders`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-2xl font-bold">¥{(sales?.summary?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-sm text-green-600">+{sales?.summary?.growth || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総注文数</p>
          <p className="text-2xl font-bold">{orders?.summary?.totalOrders || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均注文額</p>
          <p className="text-2xl font-bold">¥{(sales?.summary?.avgOrderValue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">完了率</p>
          <p className="text-2xl font-bold">{orders?.summary?.completionRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">日別売上</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sales?.daily?.map((day: any) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{day.date}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{day.orders}件</span>
                    <span className="font-medium">¥{day.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">ステータス別</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {orders?.byStatus?.map((item: any) => (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.status}</span>
                    <span>{item.count}件 ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-fuchsia-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
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
  const { data: general } = useSWR(`${API_BASE}/ebay/order-hub/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/order-hub/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">注文番号プレフィックス</label>
              <input
                type="text"
                defaultValue={general?.settings?.orderNumberPrefix}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">税率（%）</label>
              <input
                type="number"
                defaultValue={general?.settings?.taxRate}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">在庫切れ警告しきい値</label>
              <input
                type="number"
                defaultValue={general?.settings?.lowStockThreshold}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">注文タイムアウト（時間）</label>
              <input
                type="number"
                defaultValue={general?.settings?.orderTimeout}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">通知設定</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'newOrderAlert', label: '新規注文アラート' },
            { key: 'lowStockAlert', label: '在庫切れアラート' },
            { key: 'returnRequestAlert', label: '返品リクエストアラート' },
            { key: 'dailySummary', label: 'デイリーサマリー' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={notifications?.settings?.[item.key]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-fuchsia-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

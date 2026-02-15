'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Truck,
  Users,
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
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  DollarSign,
  ShoppingCart,
  Send,
  XCircle,
  Download,
  Upload,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SupplierHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Truck },
    { id: 'suppliers', name: 'サプライヤー', icon: Users },
    { id: 'orders', name: '発注', icon: ShoppingCart },
    { id: 'catalog', name: 'カタログ', icon: Package },
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
              <Truck className="h-8 w-8 text-pink-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Supplier Hub</h1>
                <p className="text-sm text-gray-500">サプライヤー・発注管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
                <Plus className="h-4 w-4 mr-2" />
                新規発注
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
                    ? 'border-pink-500 text-pink-600'
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
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/supplier-hub/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/supplier-hub/dashboard/recent`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/supplier-hub/dashboard/performance`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">アクティブサプライヤー</p>
              <p className="text-3xl font-bold text-pink-600">{overview?.activeSuppliers || 0}</p>
            </div>
            <Users className="h-12 w-12 text-pink-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">/ {overview?.totalSuppliers || 0} 件</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">保留中発注</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.pendingOrders || 0}</p>
            </div>
            <ShoppingCart className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">/ {overview?.totalOrders?.toLocaleString() || 0} 件</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総支出</p>
              <p className="text-3xl font-bold text-blue-600">¥{((overview?.totalSpend || 0) / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">累計</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">オンタイム率</p>
              <p className="text-3xl font-bold text-green-600">{overview?.onTimeDelivery || 0}%</p>
            </div>
            <Clock className="h-12 w-12 text-green-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">良好</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">最近の活動</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recent?.activities?.map((activity: any) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    activity.type === 'order_placed' ? 'bg-blue-100' :
                    activity.type === 'shipment_received' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    {activity.type === 'order_placed' ? (
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                    ) : activity.type === 'shipment_received' ? (
                      <Package className="h-4 w-4 text-green-600" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.supplier}</p>
                    <p className="text-xs text-gray-500">
                      {activity.orderId} - ¥{activity.amount?.toLocaleString() || activity.items + '点'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">トップサプライヤー</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {performance?.topSuppliers?.map((supplier: any, index: number) => (
              <div key={supplier.supplier} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{supplier.supplier}</p>
                      <p className="text-xs text-gray-500">{supplier.orders}件の発注</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">¥{(supplier.spend / 1000000).toFixed(1)}M</p>
                    <div className="flex items-center text-xs text-yellow-500">
                      <Star className="h-3 w-3 mr-1" />
                      {supplier.rating}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuppliersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/supplier-hub/suppliers`, fetcher);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="サプライヤーを検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <select className="border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
              <option value="">すべてのステータス</option>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
            <Plus className="h-4 w-4 mr-2" />
            サプライヤー追加
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サプライヤー</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">発注数</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">総支出</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">評価</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.suppliers?.map((supplier: any) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-xs text-gray-500">{supplier.country}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{supplier.type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-900">{supplier.totalOrders}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-900">¥{supplier.totalSpend.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center text-yellow-500">
                    <Star className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{supplier.rating}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {supplier.status === 'active' ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-pink-600 hover:text-pink-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
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

function OrdersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/supplier-hub/orders`, fetcher);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="発注番号で検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <select className="border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
              <option value="">すべてのステータス</option>
              <option value="pending">保留中</option>
              <option value="confirmed">確認済み</option>
              <option value="shipped">発送済み</option>
              <option value="delivered">配達済み</option>
            </select>
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
            <Plus className="h-4 w-4 mr-2" />
            新規発注
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">発注番号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サプライヤー</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">商品数</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予定日</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.orders?.map((order: any) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-500">{order.orderDate}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{order.supplierName}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-500">{order.items}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900">¥{order.total.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.expectedDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-pink-600 hover:text-pink-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      <Send className="h-4 w-4" />
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

function CatalogTab() {
  const { data } = useSWR(`${API_BASE}/ebay/supplier-hub/catalog`, fetcher);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="商品を検索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
            <Upload className="h-4 w-4 mr-2" />
            カタログインポート
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サプライヤー</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">単価</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">在庫</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">リードタイム</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.products?.map((product: any) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{product.sku}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{product.name}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-500">{product.supplierName}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900">¥{product.price.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm ${product.stock > 50 ? 'text-green-600' : product.stock > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {product.leadTime}日
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-pink-600 hover:text-pink-900">
                    <ShoppingCart className="h-4 w-4" />
                  </button>
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
  const { data: spend } = useSWR(`${API_BASE}/ebay/supplier-hub/reports/spend`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/supplier-hub/reports/performance`, fetcher);

  return (
    <div className="space-y-6">
      {/* Spend Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">支出サマリー</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">総支出</p>
              <p className="text-2xl font-bold text-gray-900">¥{((spend?.summary?.totalSpend || 0) / 1000000).toFixed(1)}M</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">月平均</p>
              <p className="text-2xl font-bold text-pink-600">¥{((spend?.summary?.monthlyAvg || 0) / 1000000).toFixed(1)}M</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">トップカテゴリ</p>
              <p className="text-2xl font-bold text-blue-600">{spend?.summary?.topCategory}</p>
            </div>
          </div>
          <div className="space-y-4">
            {spend?.bySupplier?.map((supplier: any) => (
              <div key={supplier.supplier}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{supplier.supplier}</span>
                  <span className="text-sm font-medium text-gray-900">¥{(supplier.spend / 1000000).toFixed(1)}M ({supplier.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${supplier.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">サプライヤーパフォーマンス</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サプライヤー</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">オンタイム率</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">欠陥率</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">平均リードタイム</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performance?.bySupplier?.map((supplier: any) => (
                <tr key={supplier.supplier}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={supplier.onTimeDelivery >= 95 ? 'text-green-600' : 'text-yellow-600'}>
                      {supplier.onTimeDelivery}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={supplier.defectRate <= 0.5 ? 'text-green-600' : 'text-yellow-600'}>
                      {supplier.defectRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{supplier.avgLeadTime}日</td>
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
  const { data } = useSWR(`${API_BASE}/ebay/supplier-hub/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">デフォルト支払条件</label>
            <select
              defaultValue={data?.settings?.defaultPaymentTerms}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">デフォルト通貨</label>
            <select
              defaultValue={data?.settings?.defaultCurrency}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="JPY">日本円 (JPY)</option>
              <option value="USD">米ドル (USD)</option>
              <option value="EUR">ユーロ (EUR)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">自動再発注</h4>
              <p className="text-sm text-gray-500">在庫が少なくなったら自動発注</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoReorder} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">再発注しきい値</label>
            <input
              type="number"
              defaultValue={data?.settings?.reorderThreshold || 10}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

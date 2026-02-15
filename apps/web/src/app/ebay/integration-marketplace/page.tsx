'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Plug,
  Link,
  Star,
  ShoppingCart,
  Calculator,
  Zap,
  MessageCircle,
  Megaphone,
  Truck,
  BarChart,
  Webhook,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Play,
  Trash2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function IntegrationMarketplacePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Plug },
    { id: 'integrations', name: '連携一覧', icon: Link },
    { id: 'categories', name: 'カテゴリ', icon: ShoppingCart },
    { id: 'logs', name: 'APIログ', icon: BarChart },
    { id: 'webhooks', name: 'ウェブフック', icon: Webhook },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Plug className="h-8 w-8 text-teal-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Integration Marketplace</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600'
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
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/integration-marketplace/dashboard/overview`, fetcher);
  const { data: connected } = useSWR(`${API_BASE}/ebay/integration-marketplace/dashboard/connected`, fetcher);
  const { data: popular } = useSWR(`${API_BASE}/ebay/integration-marketplace/dashboard/popular`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Link className="h-8 w-8 text-teal-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">接続済み連携</p>
              <p className="text-2xl font-bold">{overview?.connectedIntegrations || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Plug className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">利用可能</p>
              <p className="text-2xl font-bold">{overview?.availableIntegrations || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">今日のデータ転送</p>
              <p className="text-2xl font-bold">{overview?.dataTransferredToday || '0 GB'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">同期成功率</p>
              <p className="text-2xl font-bold">{overview?.syncSuccessRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">接続済み連携</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {connected?.integrations?.map((integration: any) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Plug className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      integration.status === 'active' ? 'bg-green-100 text-green-800' :
                      integration.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {integration.status === 'active' ? '接続中' : integration.status === 'warning' ? '警告' : 'エラー'}
                    </span>
                    <span className="text-sm text-gray-500">{integration.dataTransferred}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">人気の連携</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {popular?.integrations?.map((integration: any) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Plug className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{integration.rating}</span>
                    <span className="text-sm text-gray-500">({integration.installs.toLocaleString()})</span>
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

function IntegrationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/integration-marketplace/integrations`, fetcher);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filteredIntegrations = data?.integrations?.filter((i: any) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
                         i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || i.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="連携を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">全カテゴリ</option>
            {data?.categories?.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations?.map((integration: any) => (
          <div key={integration.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Plug className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.category}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                integration.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {integration.status === 'connected' ? '接続済み' : '利用可能'}
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">{integration.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">{integration.rating}</span>
                <span className="text-sm text-gray-500">({integration.installs.toLocaleString()}件)</span>
              </div>
              <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                integration.status === 'connected'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}>
                {integration.status === 'connected' ? '設定' : '接続'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/integration-marketplace/categories`, fetcher);

  const categoryIcons: { [key: string]: React.ElementType } = {
    'E-commerce': ShoppingCart,
    'Accounting': Calculator,
    'Automation': Zap,
    'Communication': MessageCircle,
    'Marketing': Megaphone,
    'Shipping': Truck,
    'Analytics': BarChart,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.categories?.map((category: any) => {
          const Icon = categoryIcons[category.name] || Plug;
          return (
            <div key={category.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.count}件の連携</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">{category.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogsTab() {
  const { data: logs } = useSWR(`${API_BASE}/ebay/integration-marketplace/logs`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/integration-marketplace/logs/stats`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総リクエスト</p>
          <p className="text-2xl font-bold">{stats?.stats?.totalRequests?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">成功率</p>
          <p className="text-2xl font-bold">{stats?.stats?.successRate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均レスポンス時間</p>
          <p className="text-2xl font-bold">{stats?.stats?.avgResponseTime || 0}ms</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">データ転送量</p>
          <p className="text-2xl font-bold">{stats?.stats?.dataTransferred || '0 GB'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">APIログ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">連携</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">方向</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">サイズ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs?.logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{log.integrationName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.direction === 'incoming' ? '受信' : '送信'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status === 'success' ? '成功' : '失敗'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.dataSize}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WebhooksTab() {
  const { data } = useSWR(`${API_BASE}/ebay/integration-marketplace/webhooks`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          <Webhook className="h-5 w-5 mr-2" />
          ウェブフック追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">連携</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">イベント</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終トリガー</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.webhooks?.map((webhook: any) => (
                <tr key={webhook.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{webhook.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{webhook.integrationId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{webhook.event}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.status === 'active' ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{webhook.lastTriggered}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Play className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
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

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/integration-marketplace/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/integration-marketplace/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルト同期間隔（分）</label>
              <input
                type="number"
                defaultValue={general?.settings?.defaultSyncInterval}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">最大同時同期数</label>
              <input
                type="number"
                defaultValue={general?.settings?.maxConcurrentSyncs}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">リトライ回数</label>
              <input
                type="number"
                defaultValue={general?.settings?.retryAttempts}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ログ保持日数</label>
              <input
                type="number"
                defaultValue={general?.settings?.logRetentionDays}
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
            { key: 'onSyncFailure', label: '同期失敗時に通知' },
            { key: 'onConnectionLost', label: '接続切断時に通知' },
            { key: 'onNewIntegration', label: '新規連携追加時に通知' },
            { key: 'dailySummary', label: 'デイリーサマリーを送信' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={notifications?.settings?.[item.key]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

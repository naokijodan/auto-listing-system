'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Bell,
  Mail,
  MessageSquare,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Send,
  Smartphone,
  Slack,
  Webhook,
  BarChart2,
  Clock,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function NotificationHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Bell },
    { id: 'notifications', name: '通知', icon: MessageSquare },
    { id: 'channels', name: 'チャンネル', icon: Mail },
    { id: 'templates', name: 'テンプレート', icon: Edit },
    { id: 'rules', name: 'ルール', icon: Settings },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-violet-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Hub</h1>
                <p className="text-sm text-gray-500">通知センター</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700">
                <Check className="h-4 w-4 mr-2" />
                全て既読
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
                    ? 'border-violet-500 text-violet-600'
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
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'channels' && <ChannelsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/notification-hub/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/notification-hub/dashboard/recent`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/notification-hub/dashboard/stats`, fetcher);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'normal': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">未読通知</p>
              <p className="text-3xl font-bold text-violet-600">{overview?.unreadNotifications || 0}</p>
            </div>
            <Bell className="h-12 w-12 text-violet-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">要確認</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">本日の通知</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.todayNotifications || 0}</p>
            </div>
            <Clock className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">送信済み</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">配信率</p>
              <p className="text-3xl font-bold text-green-600">{overview?.deliveryRate || 0}%</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">良好</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">アクティブチャンネル</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.activeChannels || 0}</p>
            </div>
            <Mail className="h-12 w-12 text-gray-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">設定済み</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">最近の通知</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recent?.notifications?.map((notif: any) => (
              <div key={notif.id} className={`px-6 py-4 ${!notif.read ? 'bg-violet-50' : ''}`}>
                <div className="flex items-start space-x-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    notif.type === 'order' ? 'bg-blue-100' :
                    notif.type === 'inventory' ? 'bg-yellow-100' :
                    notif.type === 'message' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {notif.type === 'order' ? (
                      <Bell className="h-4 w-4 text-blue-600" />
                    ) : notif.type === 'inventory' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : notif.type === 'message' ? (
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    ) : (
                      <Settings className="h-4 w-4 text-gray-600" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                      <span className={`text-xs font-medium ${getPriorityColor(notif.priority)}`}>
                        {notif.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{notif.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Stats */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">チャンネル別配信状況</h3>
          </div>
          <div className="p-6 space-y-4">
            {stats?.byChannel?.map((channel: any) => (
              <div key={channel.channel}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {channel.channel === 'email' && <Mail className="h-4 w-4 text-violet-600" />}
                    {channel.channel === 'push' && <Smartphone className="h-4 w-4 text-blue-600" />}
                    {channel.channel === 'slack' && <Slack className="h-4 w-4 text-purple-600" />}
                    {channel.channel === 'sms' && <MessageSquare className="h-4 w-4 text-green-600" />}
                    <span className="text-sm text-gray-700 capitalize">{channel.channel}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{channel.rate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${channel.rate}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{channel.delivered.toLocaleString()} / {channel.sent.toLocaleString()} 配信</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/notification-hub/notifications`, fetcher);
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredNotifications = data?.notifications?.filter((notif: any) =>
    typeFilter === 'all' || notif.type === typeFilter
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
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="all">すべて</option>
                <option value="order">注文</option>
                <option value="inventory">在庫</option>
                <option value="message">メッセージ</option>
                <option value="system">システム</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total?.toLocaleString() || 0} 件</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {filteredNotifications.map((notif: any) => (
          <div key={notif.id} className={`px-6 py-4 ${!notif.read ? 'bg-violet-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                  notif.type === 'order' ? 'bg-blue-100' :
                  notif.type === 'inventory' ? 'bg-yellow-100' :
                  notif.type === 'message' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {notif.type === 'order' ? (
                    <Bell className="h-5 w-5 text-blue-600" />
                  ) : notif.type === 'inventory' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : notif.type === 'message' ? (
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  ) : (
                    <Settings className="h-5 w-5 text-gray-600" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                  <p className="text-sm text-gray-500">{notif.message}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {notif.channels?.map((ch: string) => (
                      <span key={ch} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {ch}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">{notif.createdAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-violet-600 hover:text-violet-900">
                  <Eye className="h-4 w-4" />
                </button>
                {!notif.read && (
                  <button className="text-green-600 hover:text-green-900">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/notification-hub/channels`, fetcher);

  const getChannelIcon = (code: string) => {
    switch (code) {
      case 'email': return <Mail className="h-6 w-6 text-violet-600" />;
      case 'push': return <Smartphone className="h-6 w-6 text-blue-600" />;
      case 'slack': return <Slack className="h-6 w-6 text-purple-600" />;
      case 'sms': return <MessageSquare className="h-6 w-6 text-green-600" />;
      case 'webhook': return <Webhook className="h-6 w-6 text-orange-600" />;
      default: return <Bell className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.channels?.map((channel: any) => (
          <div key={channel.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getChannelIcon(channel.code)}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{channel.name}</h4>
                  <p className="text-xs text-gray-500">{channel.code}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                channel.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {channel.status === 'active' ? 'アクティブ' : '無効'}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">配信率</span>
                <span className={`font-medium ${channel.deliveryRate >= 99 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {channel.deliveryRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">設定済み</span>
                {channel.configured ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
              <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                設定
              </button>
              <button className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/notification-hub/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">テンプレート管理</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          テンプレート作成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">テンプレート名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">チャンネル</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">使用回数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.templates?.map((template: any) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                    {template.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {template.channels?.map((ch: string) => (
                      <span key={ch} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {ch}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {template.usageCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-violet-600 hover:text-violet-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-600">
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
  );
}

function RulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/notification-hub/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">通知ルール</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          ルール作成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {data?.rules?.map((rule: any) => (
          <div key={rule.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  トリガー: <code className="bg-gray-100 px-1 rounded">{rule.trigger}</code>
                  {' | '}
                  条件: <code className="bg-gray-100 px-1 rounded">{rule.condition}</code>
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  {rule.channels?.map((ch: string) => (
                    <span key={ch} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-800">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={rule.enabled} className="sr-only peer" readOnly />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
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
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/notification-hub/settings/general`, fetcher);
  const { data: preferences } = useSWR(`${API_BASE}/ebay/notification-hub/settings/preferences`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">通知有効</h4>
              <p className="text-sm text-gray-500">全ての通知を有効化</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.enabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">おやすみモード</h4>
              <p className="text-sm text-gray-500">指定時間は通知を停止</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.quietHoursEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">開始時刻</label>
              <input
                type="time"
                defaultValue={data?.settings?.quietHoursStart}
                className="border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">終了時刻</label>
              <input
                type="time"
                defaultValue={data?.settings?.quietHoursEnd}
                className="border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">保持期間（日）</label>
            <input
              type="number"
              defaultValue={data?.settings?.retentionDays || 30}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

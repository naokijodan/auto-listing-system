'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Package,
  Truck,
  Star,
  AlertTriangle,
  Settings,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  Clock,
  Send,
  BarChart3,
  Smartphone,
  Globe,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabType = 'notifications' | 'preferences' | 'channels' | 'templates' | 'reports';

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [filter, setFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const { data: stats } = useSWR(`${API_BASE}/ebay-notification-center/stats`, fetcher);
  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    `${API_BASE}/ebay-notification-center/notifications?limit=30`,
    fetcher
  );
  const { data: preferencesData } = useSWR(`${API_BASE}/ebay-notification-center/preferences`, fetcher);
  const { data: channelsData } = useSWR(`${API_BASE}/ebay-notification-center/channels`, fetcher);
  const { data: templatesData } = useSWR(`${API_BASE}/ebay-notification-center/templates`, fetcher);
  const { data: reportsData } = useSWR(`${API_BASE}/ebay-notification-center/reports`, fetcher);

  const tabs = [
    { id: 'notifications' as TabType, label: '通知', icon: Bell, badge: stats?.unread },
    { id: 'preferences' as TabType, label: '設定', icon: Settings },
    { id: 'channels' as TabType, label: 'チャンネル', icon: Send },
    { id: 'templates' as TabType, label: 'テンプレート', icon: MessageSquare },
    { id: 'reports' as TabType, label: 'レポート', icon: BarChart3 },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="h-5 w-5 text-blue-500" />;
      case 'message': return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case 'inventory': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'shipping': return <Truck className="h-5 w-5 text-green-500" />;
      case 'review': return <Star className="h-5 w-5 text-yellow-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-300 bg-white';
      default: return 'border-l-gray-300 bg-white';
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'slack': return <MessageSquare className="h-5 w-5" />;
      case 'sms': return <Smartphone className="h-5 w-5" />;
      case 'push': return <Bell className="h-5 w-5" />;
      case 'webhook': return <Globe className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const handleMarkAllRead = async () => {
    await fetch(`${API_BASE}/ebay-notification-center/notifications/mark-all-read`, {
      method: 'POST'
    });
    mutateNotifications();
  };

  const handleMarkRead = async (ids: string[]) => {
    await fetch(`${API_BASE}/ebay-notification-center/notifications/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids })
    });
    mutateNotifications();
  };

  const renderNotifications = () => {
    const filteredNotifications = notificationsData?.notifications?.filter((n: any) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return n.status === 'unread';
      return n.type === filter;
    });

    return (
      <div className="space-y-4">
        {/* アクションバー */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              <option value="unread">未読のみ</option>
              <option value="order">注文</option>
              <option value="message">メッセージ</option>
              <option value="inventory">在庫</option>
              <option value="shipping">発送</option>
              <option value="review">レビュー</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <CheckCheck className="h-4 w-4" />
              すべて既読
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2 text-sm">
              <Archive className="h-4 w-4" />
              古い通知をアーカイブ
            </button>
          </div>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">未読</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.unread || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">緊急</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.byPriority?.urgent || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">今日</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.todayCount || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">週平均</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.weeklyAvg || 0}</p>
          </div>
        </div>

        {/* 通知リスト */}
        <div className="space-y-2">
          {filteredNotifications?.map((notification: any) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow border-l-4 ${getPriorityColor(notification.priority)} ${
                notification.status === 'unread' ? 'font-medium' : 'opacity-75'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedNotifications);
                      if (e.target.checked) {
                        newSet.add(notification.id);
                      } else {
                        newSet.delete(notification.id);
                      }
                      setSelectedNotifications(newSet);
                    }}
                    className="mt-1"
                  />
                  {getTypeIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.status === 'unread' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1">
                        {notification.deliveredChannels?.map((ch: string) => (
                          <span
                            key={ch}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => handleMarkRead([notification.id])}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Check className="h-4 w-4" />
                            既読
                          </button>
                        )}
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            {notification.actionLabel || '詳細'}
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPreferences = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">通知設定</h3>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">通知タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">有効</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">チャンネル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">優先度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">頻度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {preferencesData?.preferences?.map((pref: any) => (
              <tr key={pref.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(pref.type)}
                    <span className="capitalize">{pref.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={pref.enabled}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {pref.channels?.map((ch: string) => (
                      <span key={ch} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {ch}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    pref.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    pref.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    pref.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pref.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{pref.digestFrequency}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* クワイエットアワー */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <BellOff className="h-5 w-5" />
          クワイエットアワー
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          指定した時間帯は通知を送信しません（緊急を除く）
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
            <input type="time" defaultValue="22:00" className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
            <input type="time" defaultValue="08:00" className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイムゾーン</label>
            <select className="border rounded px-3 py-2 w-full">
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChannels = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">通知チャンネル</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          チャンネル追加
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {channelsData?.channels?.map((channel: any) => (
          <div key={channel.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${channel.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  {getChannelIcon(channel.type)}
                </div>
                <div>
                  <h4 className="font-medium">{channel.name}</h4>
                  <span className="text-xs text-gray-500 capitalize">{channel.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {channel.verified ? (
                  <span className="text-green-600 text-xs flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    認証済み
                  </span>
                ) : (
                  <span className="text-yellow-600 text-xs">未認証</span>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={channel.enabled} className="sr-only peer" onChange={() => {}} />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-3">
              {channel.config?.email && <p>メール: {channel.config.email}</p>}
              {channel.config?.phone && <p>電話: {channel.config.phone}</p>}
              {channel.config?.channel && <p>チャンネル: {channel.config.channel}</p>}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-gray-400">
                最終使用: {channel.lastUsedAt ? new Date(channel.lastUsedAt).toLocaleString('ja-JP') : '-'}
              </span>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">テスト送信</button>
                <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">通知テンプレート</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          テンプレート作成
        </button>
      </div>

      <div className="space-y-4">
        {templatesData?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {getTypeIcon(template.type)}
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <span className="text-xs text-gray-500 capitalize">{template.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {template.enabled ? (
                  <Eye className="h-4 w-4 text-green-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded mb-3">
              <p className="text-sm font-medium">{template.subject}</p>
              <p className="text-sm text-gray-600 mt-1">{template.body}</p>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs text-gray-500 mr-2">変数:</span>
              {template.variables?.map((v: string) => (
                <code key={v} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex gap-1">
                {template.channels?.map((ch: string) => (
                  <span key={ch} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {ch}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">プレビュー</button>
                <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">配信レポート</h3>
        <select className="border rounded px-3 py-2 text-sm">
          <option value="last_7_days">過去7日間</option>
          <option value="last_30_days">過去30日間</option>
          <option value="last_90_days">過去90日間</option>
        </select>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{reportsData?.summary?.totalSent}</p>
          <p className="text-sm text-gray-500">送信数</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-green-600">{reportsData?.summary?.delivered}</p>
          <p className="text-sm text-gray-500">配信成功</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-red-600">{reportsData?.summary?.failed}</p>
          <p className="text-sm text-gray-500">配信失敗</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-purple-600">{reportsData?.summary?.opened}</p>
          <p className="text-sm text-gray-500">開封数</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold text-orange-600">{reportsData?.summary?.clicked}</p>
          <p className="text-sm text-gray-500">クリック数</p>
        </div>
      </div>

      {/* チャンネル別 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4">チャンネル別パフォーマンス</h4>
        <div className="space-y-3">
          {reportsData?.byChannel?.map((ch: any) => (
            <div key={ch.channel} className="flex items-center gap-4">
              <div className="w-20 capitalize">{ch.channel}</div>
              <div className="flex-1">
                <div className="flex gap-1 h-6">
                  <div
                    className="bg-blue-500 rounded-l"
                    style={{ width: `${(ch.sent / 300) * 100}%` }}
                    title={`送信: ${ch.sent}`}
                  />
                  <div
                    className="bg-green-500"
                    style={{ width: `${(ch.delivered / 300) * 100}%` }}
                    title={`配信: ${ch.delivered}`}
                  />
                  <div
                    className="bg-purple-500"
                    style={{ width: `${(ch.opened / 300) * 100}%` }}
                    title={`開封: ${ch.opened}`}
                  />
                  <div
                    className="bg-orange-500 rounded-r"
                    style={{ width: `${(ch.clicked / 300) * 100}%` }}
                    title={`クリック: ${ch.clicked}`}
                  />
                </div>
              </div>
              <div className="text-sm text-right w-32">
                {ch.sent} 送信 / {Math.round((ch.opened / ch.sent) * 100)}% 開封率
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> 送信</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> 配信</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded" /> 開封</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded" /> クリック</div>
        </div>
      </div>

      {/* タイプ別 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4">通知タイプ別</h4>
        <div className="grid grid-cols-5 gap-4">
          {reportsData?.byType?.map((t: any) => (
            <div key={t.type} className="text-center p-4 bg-gray-50 rounded">
              {getTypeIcon(t.type)}
              <p className="font-bold mt-2">{t.count}</p>
              <p className="text-xs text-gray-500 capitalize">{t.type}</p>
              <p className="text-xs text-green-600 mt-1">{t.openRate}% 開封率</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'notifications': return renderNotifications();
      case 'preferences': return renderPreferences();
      case 'channels': return renderChannels();
      case 'templates': return renderTemplates();
      case 'reports': return renderReports();
      default: return renderNotifications();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
              <p className="text-sm text-gray-500">通知管理・配信設定</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                更新
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                設定
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

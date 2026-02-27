// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Filter,
  Mail,
  Smartphone,
  MessageSquare,
  ShoppingCart,
  Package,
  AlertTriangle,
  Info,
  Users,
  Clock,
  Plus,
  MoreVertical,
  ChevronRight,
  Zap,
  BarChart3,
  FileText,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  actionUrl: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  trigger: { type: string; condition: string };
  channels: string[];
  priority: string;
  enabled: boolean;
  createdAt: string;
}

export default function NotificationCenterV2Page() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings' | 'rules' | 'stats'>('notifications');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: notificationsData, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    '/api/ebay-notification-center-v2/notifications',
    fetcher
  );

  const { data: settingsData } = useSWR(
    '/api/ebay-notification-center-v2/settings',
    fetcher
  );

  const { data: rulesData } = useSWR<{ rules: Rule[] }>(
    '/api/ebay-notification-center-v2/rules',
    fetcher
  );

  const { data: statsData } = useSWR(
    '/api/ebay-notification-center-v2/stats',
    fetcher
  );

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const rules = rulesData?.rules ?? [];

  const tabs = [
    { id: 'notifications', label: '通知', icon: Bell, badge: unreadCount },
    { id: 'settings', label: '設定', icon: Settings },
    { id: 'rules', label: 'ルール', icon: Zap },
    { id: 'stats', label: '統計', icon: BarChart3 },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="h-5 w-5 text-emerald-500" />;
      case 'inventory': return <Package className="h-5 w-5 text-amber-500" />;
      case 'message': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'competitor': return <Users className="h-5 w-5 text-purple-500" />;
      case 'system': return <Info className="h-5 w-5 text-zinc-500" />;
      default: return <Bell className="h-5 w-5 text-zinc-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const filteredNotifications = categoryFilter === 'all'
    ? notifications
    : notifications.filter(n => n.category === categoryFilter);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-pink-500">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">通知センター</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {unreadCount > 0 ? `${unreadCount}件の未読通知` : 'すべて既読です'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-1" />
            すべて既読
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'notifications' && (
          <div>
            {/* フィルター */}
            <div className="mb-4 flex gap-2">
              {['all', 'sales', 'alert', 'communication', 'info'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    categoryFilter === cat
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat === 'all' ? 'すべて' : cat === 'sales' ? '売上' : cat === 'alert' ? 'アラート' : cat === 'communication' ? 'コミュニケーション' : '情報'}
                </button>
              ))}
            </div>

            {/* 通知リスト */}
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    notification.status === 'unread' ? 'border-l-4 border-l-rose-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${notification.status === 'unread' ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {notification.title}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'high' ? '重要' : notification.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.createdAt).toLocaleString('ja-JP')}
                        </span>
                        {notification.actionUrl && (
                          <button className="text-rose-600 hover:text-rose-700 flex items-center gap-1">
                            詳細を見る
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {notification.status === 'unread' && (
                        <Button variant="ghost" size="sm">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">通知チャンネル</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">アプリ内通知</p>
                      <p className="text-xs text-zinc-500">ダッシュボードに通知を表示</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.channels?.inApp?.enabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">メール通知</p>
                      <p className="text-xs text-zinc-500">{settingsData.channels?.email?.address}</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.channels?.email?.enabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">プッシュ通知</p>
                      <p className="text-xs text-zinc-500">ブラウザ・モバイルに通知</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.channels?.push?.enabled} className="toggle" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">カテゴリ別設定</h3>
              <div className="space-y-3">
                {Object.entries(settingsData.categories || {}).map(([category, settings]: [string, any]) => (
                  <div key={category} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <span className="text-sm text-zinc-900 dark:text-white capitalize">{category}</span>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${settings.inApp ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>アプリ</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${settings.email ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>メール</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${settings.push ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>プッシュ</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">おやすみモード</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">有効化</p>
                    <p className="text-xs text-zinc-500">指定時間中は通知をミュート</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.quietHours?.enabled} className="toggle" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500">開始時刻</label>
                    <input
                      type="time"
                      defaultValue={settingsData.quietHours?.start}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">終了時刻</label>
                    <input
                      type="time"
                      defaultValue={settingsData.quietHours?.end}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                ルール作成
              </Button>
            </div>
            {rules.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{rule.name}</h4>
                      <p className="text-sm text-zinc-500">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {rule.channels.map((ch) => (
                        <span key={ch} className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                          {ch}
                        </span>
                      ))}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(rule.priority)}`}>
                      {rule.priority}
                    </span>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'stats' && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-rose-600">{statsData.sent?.total}</p>
                <p className="text-sm text-zinc-500">送信数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{statsData.delivery?.deliveryRate}%</p>
                <p className="text-sm text-zinc-500">配信率</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{statsData.engagement?.openRate}%</p>
                <p className="text-sm text-zinc-500">開封率</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{statsData.engagement?.clickRate}%</p>
                <p className="text-sm text-zinc-500">クリック率</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">チャンネル別送信数</h3>
              <div className="space-y-2">
                {Object.entries(statsData.sent?.byChannel || {}).map(([channel, count]: [string, any]) => (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-zinc-500">{channel}</span>
                    <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${(count / statsData.sent.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

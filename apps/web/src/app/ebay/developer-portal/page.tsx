
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Code2,
  AppWindow,
  Webhook,
  FileText,
  Settings,
  Activity,
  Plus,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Play,
  Trash2,
  RotateCcw,
  TestTube,
  Users,
  Send,
} from 'lucide-react';

type TabType = 'dashboard' | 'apps' | 'webhooks' | 'docs' | 'sandbox' | 'usage';

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const { data: dashboard } = useSWR<any>('/api/ebay-developer-portal/dashboard', fetcher);
  const { data: apps } = useSWR<any>('/api/ebay-developer-portal/apps', fetcher);
  const { data: webhooks } = useSWR<any>('/api/ebay-developer-portal/webhooks', fetcher);
  const { data: endpoints } = useSWR<any>('/api/ebay-developer-portal/api-docs/endpoints', fetcher);
  const { data: sandbox } = useSWR<any>('/api/ebay-developer-portal/sandbox', fetcher);
  const { data: usage } = useSWR<any>('/api/ebay-developer-portal/usage', fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: Activity },
    { id: 'apps' as TabType, label: 'アプリ', icon: AppWindow },
    { id: 'webhooks' as TabType, label: 'Webhook', icon: Webhook },
    { id: 'docs' as TabType, label: 'APIドキュメント', icon: FileText },
    { id: 'sandbox' as TabType, label: 'サンドボックス', icon: TestTube },
    { id: 'usage' as TabType, label: '使用状況', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">開発者ポータル</h1>
            <p className="text-sm text-zinc-500">API・Webhook・サンドボックス管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            APIリファレンス
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規アプリ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">今日のAPI呼び出し</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.apiCalls?.today?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">今月のAPI呼び出し</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.apiCalls?.thisMonth?.toLocaleString()}
              </p>
              <div className="mt-2 h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${dashboard.apiCalls?.percentUsed}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                上限の{dashboard.apiCalls?.percentUsed}%使用中
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">アクティブアプリ</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.activeApps}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">Webhook配信率</p>
              <p className="text-2xl font-bold text-emerald-600">
                {dashboard.webhooks?.deliveryRate}%
              </p>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">最近のアクティビティ</h3>
            <div className="space-y-3">
              {dashboard.recentActivity?.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'api_call' ? 'bg-blue-500' :
                      activity.type === 'webhook_delivery' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {activity.type === 'api_call' ? `API: ${activity.endpoint}` :
                         activity.type === 'webhook_delivery' ? `Webhook: ${activity.event}` :
                         `アプリ更新: ${activity.appName}`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(activity.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Apps Tab */}
      {activeTab === 'apps' && apps && (
        <div className="space-y-4">
          {apps.apps?.map((app: any) => (
            <Card key={app.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    app.type === 'production' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <AppWindow className={`h-5 w-5 ${
                      app.type === 'production' ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{app.name}</p>
                    <p className="text-sm text-zinc-500">
                      {app.type === 'production' ? '本番環境' : 'サンドボックス'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    app.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {app.status === 'active' ? '有効' : '無効'}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">Client ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{app.clientId}</code>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">API呼び出し</span>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {app.apiCalls?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  設定
                </Button>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  シークレット再生成
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  削除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && webhooks && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Webhook追加
            </Button>
          </div>

          {webhooks.webhooks?.map((webhook: any) => (
            <Card key={webhook.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    webhook.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    <Webhook className={`h-5 w-5 ${
                      webhook.status === 'active' ? 'text-emerald-600' : 'text-zinc-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{webhook.url}</p>
                    <p className="text-sm text-zinc-500">
                      {webhook.events?.join(', ')}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  webhook.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {webhook.status === 'active' ? '有効' : '無効'}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  テスト送信
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  編集
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  削除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* API Docs Tab */}
      {activeTab === 'docs' && endpoints && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">APIエンドポイント</h3>
            <div className="space-y-2">
              {endpoints.endpoints?.map((endpoint: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      endpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-zinc-500">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Sandbox Tab */}
      {activeTab === 'sandbox' && sandbox && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">サンドボックス環境</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                sandbox.enabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-600'
              }`}>
                {sandbox.enabled ? '有効' : '無効'}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-500 mb-1">Base URL</p>
              <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{sandbox.baseUrl}</code>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{sandbox.testData?.listings}</p>
                <p className="text-sm text-zinc-500">テスト出品</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{sandbox.testData?.orders}</p>
                <p className="text-sm text-zinc-500">テスト注文</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{sandbox.testData?.messages}</p>
                <p className="text-sm text-zinc-500">テストメッセージ</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                データリセット
              </Button>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                テストデータ生成
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && usage && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">API使用状況</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500">総API呼び出し</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {usage.apiCalls?.total?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500">エラー数</p>
                <p className="text-2xl font-bold text-red-600">
                  {usage.errors?.total}
                </p>
              </div>
            </div>

            <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">エンドポイント別</h4>
            <div className="space-y-2">
              {usage.apiCalls?.byEndpoint?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.endpoint}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-500">{item.calls?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Zap,
  Settings,
  BarChart3,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Workflow,
  Calendar,
  FileText,
} from 'lucide-react';

type TabType = 'dashboard' | 'rules' | 'workflows' | 'schedules' | 'templates' | 'settings';

export default function OrderAutomationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'rules' as const, label: 'ルール', icon: Zap },
    { id: 'workflows' as const, label: 'ワークフロー', icon: Workflow },
    { id: 'schedules' as const, label: 'スケジュール', icon: Calendar },
    { id: 'templates' as const, label: 'テンプレート', icon: FileText },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">注文自動化</h1>
          <p className="text-zinc-500">ルール・ワークフロー・スケジュール管理</p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'workflows' && <WorkflowsTab />}
      {activeTab === 'schedules' && <SchedulesTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR('/api/ebay-order-automation/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">自動化注文</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.totalAutomatedOrders?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">自動化率</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.automationRate ?? 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均処理時間</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.avgProcessingTime ?? 0}分</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">節約時間</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.savedHours ?? 0}時間</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-zinc-500">アクティブルール</p>
          <p className="text-2xl font-bold text-green-600">{dashboard?.status?.activeRules ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-zinc-500">一時停止中</p>
          <p className="text-2xl font-bold text-amber-600">{dashboard?.status?.pausedRules ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-zinc-500">実行中ワークフロー</p>
          <p className="text-2xl font-bold text-blue-600">{dashboard?.status?.runningWorkflows ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-zinc-500">キュー待ち</p>
          <p className="text-2xl font-bold">{dashboard?.status?.queuedTasks ?? 0}</p>
        </Card>
      </div>

      {/* 最近のアクティビティ */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">最近のアクティビティ</h3>
        <div className="space-y-3">
          {dashboard?.recentActivity?.map((activity: { id: string; type: string; orderId: string; rule: string; timestamp: string }) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">{activity.type}</p>
                  <p className="text-sm text-zinc-500">{activity.rule} - {activity.orderId}</p>
                </div>
              </div>
              <span className="text-sm text-zinc-500">{new Date(activity.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* パフォーマンス */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">パフォーマンス</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">過去24時間</p>
            <p className="text-xl font-bold">{dashboard?.performance?.last24h?.processed ?? 0}</p>
            <p className="text-sm text-green-600">成功: {dashboard?.performance?.last24h?.success ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-500">過去7日</p>
            <p className="text-xl font-bold">{dashboard?.performance?.last7d?.processed ?? 0}</p>
            <p className="text-sm text-green-600">成功: {dashboard?.performance?.last7d?.success ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-500">過去30日</p>
            <p className="text-xl font-bold">{dashboard?.performance?.last30d?.processed ?? 0}</p>
            <p className="text-sm text-green-600">成功: {dashboard?.performance?.last30d?.success ?? 0}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RulesTab() {
  const { data, isLoading } = useSWR('/api/ebay-order-automation/rules', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="ルールを検索..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          ルール作成
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.items?.map((rule: { id: string; name: string; description: string; category: string; status: string; stats: { executions: number; success: number }; lastTriggered: string }) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${rule.status === 'active' ? 'bg-green-100' : 'bg-zinc-100'}`}>
                  <Zap className={`h-5 w-5 ${rule.status === 'active' ? 'text-green-600' : 'text-zinc-600'}`} />
                </div>
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-zinc-500">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">実行回数</p>
                  <p className="font-medium">{rule.stats.executions}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">成功率</p>
                  <p className="font-medium text-green-600">
                    {rule.stats.executions > 0 ? ((rule.stats.success / rule.stats.executions) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkflowsTab() {
  const { data, isLoading } = useSWR('/api/ebay-order-automation/workflows', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">ワークフロー一覧</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          ワークフロー作成
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.items?.map((workflow: { id: string; name: string; description: string; steps: { id: string; name: string }[]; status: string; executions: { total: number; running: number; completed: number }; avgDuration: number }) => (
          <Card key={workflow.id} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">{workflow.name}</h4>
                <p className="text-sm text-zinc-500">{workflow.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                workflow.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
              }`}>{workflow.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              {workflow.steps.map((step: { id: string; name: string }, idx: number) => (
                <div key={step.id} className="flex items-center">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">{step.name}</div>
                  {idx < workflow.steps.length - 1 && <span className="mx-2 text-zinc-400">→</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span>実行: {workflow.executions.total}</span>
                <span className="text-blue-600">実行中: {workflow.executions.running}</span>
                <span className="text-green-600">完了: {workflow.executions.completed}</span>
              </div>
              <span>平均時間: {workflow.avgDuration}分</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SchedulesTab() {
  const { data, isLoading } = useSWR('/api/ebay-order-automation/schedules', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">スケジュール一覧</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          スケジュール作成
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">名前</th>
                <th className="text-left py-2">タイプ</th>
                <th className="text-left py-2">スケジュール</th>
                <th className="text-left py-2">次回実行</th>
                <th className="text-left py-2">最終実行</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((schedule: { id: string; name: string; type: string; cron: string; nextRun: string; lastRun: string; status: string }) => (
                <tr key={schedule.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{schedule.name}</td>
                  <td className="py-2">{schedule.type}</td>
                  <td className="py-2 font-mono text-xs">{schedule.cron}</td>
                  <td className="py-2">{new Date(schedule.nextRun).toLocaleString()}</td>
                  <td className="py-2">{new Date(schedule.lastRun).toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      schedule.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                    }`}>{schedule.status}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const { data, isLoading } = useSWR('/api/ebay-order-automation/templates', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">自動化テンプレート</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((template: { id: string; name: string; category: string; description: string; rules: number; actions: number; uses: number }) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{template.name}</h4>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{template.category}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">{template.description}</p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                {template.rules}ルール · {template.actions}アクション · {template.uses}回使用
              </div>
              <Button variant="outline" size="sm">適用</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-order-automation/settings/general', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">実行設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">最大同時実行</span>
            <span className="text-sm font-medium">{data?.execution?.maxConcurrent ?? 10}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">リトライ回数</span>
            <span className="text-sm font-medium">{data?.execution?.retryAttempts ?? 3}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">タイムアウト</span>
            <span className="text-sm font-medium">{data?.execution?.timeout ?? 300}秒</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            実行設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">成功時通知</span>
            <span className="text-sm font-medium">{data?.notifications?.onSuccess ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">失敗時通知</span>
            <span className="text-sm font-medium">{data?.notifications?.onFailure ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">チャネル</span>
            <span className="text-sm font-medium">{data?.notifications?.channels?.join(', ') ?? '-'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            通知設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">ログ設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">ログレベル</span>
            <span className="text-sm font-medium">{data?.logging?.level ?? 'info'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">保持期間</span>
            <span className="text-sm font-medium">{data?.logging?.retentionDays ?? 30}日</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            ログ設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

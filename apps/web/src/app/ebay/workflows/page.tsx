// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Workflow,
  RefreshCw,
  Settings,
  Loader2,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  ShoppingCart,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Star,
  RotateCcw,
  Eye,
  ChevronRight,
  MoreVertical,
  Copy,
  TestTube,
} from 'lucide-react';

interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    config: Record<string, unknown>;
  };
  actions: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
  status: string;
  executionCount: number;
  lastExecuted: string | null;
  successRate: number;
}

interface Dashboard {
  summary: {
    totalWorkflows: number;
    activeWorkflows: number;
    pausedWorkflows: number;
    totalExecutions: number;
    executionsToday: number;
    avgSuccessRate: string;
  };
  recentExecutions: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    duration: number;
    executedAt: string;
  }>;
  executionsTrend: Array<{
    date: string;
    executions: number;
    success: number;
    failed: number;
  }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: string;
  popularity: number;
}

const triggerIcons: Record<string, typeof ShoppingCart> = {
  ORDER_RECEIVED: ShoppingCart,
  ORDER_PAID: ShoppingCart,
  ORDER_SHIPPED: ShoppingCart,
  ORDER_DELIVERED: CheckCircle,
  LISTING_SOLD: Zap,
  LISTING_ENDED: XCircle,
  LISTING_VIEWS: Eye,
  INVENTORY_LOW: AlertTriangle,
  INVENTORY_EMPTY: XCircle,
  PRICE_CHANGE: TrendingUp,
  MESSAGE_RECEIVED: MessageSquare,
  FEEDBACK_RECEIVED: Star,
  RETURN_REQUESTED: RotateCcw,
  SCHEDULE: Clock,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '有効', color: 'bg-emerald-100 text-emerald-700' },
  paused: { label: '停止', color: 'bg-zinc-100 text-zinc-700' },
  success: { label: '成功', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-700' },
};

export default function EbayWorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflows' | 'executions' | 'templates' | 'settings'>('dashboard');
  const [activeWorkflowMenu, setActiveWorkflowMenu] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<Dashboard>(
    '/api/ebay-workflows/dashboard',
    fetcher
  );

  const { data: workflowsData, mutate: mutateWorkflows } = useSWR<{ workflows: WorkflowSummary[] }>(
    '/api/ebay-workflows/workflows',
    fetcher
  );

  const { data: templates } = useSWR<Template[]>(
    '/api/ebay-workflows/templates',
    fetcher
  );

  const workflows = workflowsData?.workflows || [];

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      const result = await postApi(`/api/ebay-workflows/workflows/${workflowId}/toggle`, {});
      addToast({ type: 'success', message: (result as { message: string }).message });
      mutateWorkflows();
    } catch {
      addToast({ type: 'error', message: 'ワークフローの切り替えに失敗しました' });
    }
  };

  const handleExecuteWorkflow = async (workflowId: string, testMode: boolean = false) => {
    setIsExecuting(workflowId);
    try {
      const result = await postApi(`/api/ebay-workflows/workflows/${workflowId}/execute`, { testMode });
      addToast({ type: 'success', message: (result as { message: string }).message });
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '実行に失敗しました' });
    } finally {
      setIsExecuting(null);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('このワークフローを削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-workflows/workflows/${workflowId}`);
      addToast({ type: 'success', message: 'ワークフローを削除しました' });
      mutateWorkflows();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const result = await postApi(`/api/ebay-workflows/templates/${templateId}/create`, {});
      addToast({ type: 'success', message: (result as { message: string }).message });
      mutateWorkflows();
      setActiveTab('workflows');
    } catch {
      addToast({ type: 'error', message: 'ワークフローの作成に失敗しました' });
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Workflow },
    { id: 'workflows', name: 'ワークフロー', icon: Zap },
    { id: 'executions', name: '実行履歴', icon: Clock },
    { id: 'templates', name: 'テンプレート', icon: Copy },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <Workflow className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ワークフロー自動化</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {workflows.filter(w => w.status === 'active').length}個のワークフローが稼働中
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { mutateDashboard(); mutateWorkflows(); }}
            disabled={dashboardLoading}
          >
            <RefreshCw className={cn('h-4 w-4', dashboardLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">ワークフロー</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalWorkflows}</p>
                </div>
                <Workflow className="h-6 w-6 text-violet-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">稼働中</p>
                  <p className="text-2xl font-bold text-emerald-600">{dashboard?.summary.activeWorkflows}</p>
                </div>
                <Play className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">停止中</p>
                  <p className="text-2xl font-bold text-zinc-600">{dashboard?.summary.pausedWorkflows}</p>
                </div>
                <Pause className="h-6 w-6 text-zinc-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総実行回数</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalExecutions}</p>
                </div>
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">今日の実行</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.executionsToday}</p>
                </div>
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">成功率</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.avgSuccessRate}%</p>
                </div>
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Execution Trend */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">実行トレンド（7日間）</h3>
              <div className="h-40 flex items-end gap-2">
                {dashboard?.executionsTrend.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div
                      className="bg-emerald-500 rounded-t"
                      style={{ height: `${(day.success / 50) * 100}%` }}
                      title={`成功: ${day.success}`}
                    />
                    <div
                      className="bg-red-500 rounded-b"
                      style={{ height: `${(day.failed / 50) * 100}%` }}
                      title={`失敗: ${day.failed}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>7日前</span>
                <span>今日</span>
              </div>
            </Card>

            {/* Recent Executions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">最近の実行</h3>
              <div className="space-y-2">
                {dashboard?.recentExecutions.slice(0, 6).map((exec) => {
                  const status = statusConfig[exec.status] || statusConfig.success;
                  return (
                    <div key={exec.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800">
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-0.5 text-xs rounded', status.color)}>
                          {status.label}
                        </span>
                        <span className="text-sm">{exec.workflowName}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(exec.executedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          {workflows.map((workflow) => {
            const TriggerIcon = triggerIcons[workflow.trigger.type] || Zap;
            const status = statusConfig[workflow.status] || statusConfig.active;

            return (
              <Card key={workflow.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg',
                      workflow.status === 'active' ? 'bg-violet-100' : 'bg-zinc-100'
                    )}>
                      <TriggerIcon className={cn(
                        'h-6 w-6',
                        workflow.status === 'active' ? 'text-violet-600' : 'text-zinc-500'
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <span className={cn('px-2 py-0.5 text-xs rounded', status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">{workflow.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span>トリガー: {workflow.trigger.type}</span>
                        <span>アクション: {workflow.actions.length}個</span>
                        <span>実行: {workflow.executionCount}回</span>
                        <span>成功率: {workflow.successRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteWorkflow(workflow.id, true)}
                      disabled={isExecuting === workflow.id}
                    >
                      {isExecuting === workflow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleWorkflow(workflow.id)}
                    >
                      {workflow.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveWorkflowMenu(activeWorkflowMenu === workflow.id ? null : workflow.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {activeWorkflowMenu === workflow.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border z-50 dark:bg-zinc-800 dark:border-zinc-700">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
                            <Edit3 className="h-4 w-4" />
                            編集
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
                            <Copy className="h-4 w-4" />
                            複製
                          </button>
                          <button
                            onClick={() => { handleDeleteWorkflow(workflow.id); setActiveWorkflowMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ワークフロー</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">トリガー</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">実行時間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">実行日時</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.recentExecutions.map((exec) => {
                const status = statusConfig[exec.status] || statusConfig.success;
                return (
                  <tr key={exec.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <span className="font-medium">{exec.workflowName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">-</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 text-xs rounded', status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {exec.duration}ms
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(exec.executedAt).toLocaleString('ja-JP')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-3 gap-4">
          {templates?.map((template) => {
            const TriggerIcon = triggerIcons[template.trigger] || Zap;
            return (
              <Card key={template.id} className="p-4 hover:border-violet-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                    <TriggerIcon className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-zinc-500 mt-1">{template.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-zinc-400">人気度: {template.popularity}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateFromTemplate(template.id)}
                      >
                        使用する
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">実行設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ワークフロー有効</p>
                  <p className="text-sm text-zinc-500">すべてのワークフローを有効化</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">同時実行数上限</label>
                <input type="number" defaultValue={10} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">タイムアウト（秒）</label>
                <input type="number" defaultValue={30} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">失敗時リトライ</p>
                  <p className="text-sm text-zinc-500">自動的に再試行</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">通知設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">失敗時に通知</span>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">成功時に通知</span>
                <input type="checkbox" className="h-4 w-4" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">通知チャネル</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                    <span className="text-sm">Slack</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeWorkflowMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveWorkflowMenu(null)} />
      )}
    </div>
  );
}

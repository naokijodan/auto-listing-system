'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  GitFork,
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Zap,
  Box,
  ArrowRight,
  ChevronRight,
  FileText,
  BarChart3,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  History,
  Layers,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  trigger: { type: string; event?: string; cron?: string };
  stepsCount: number;
  lastRun: string;
  runsToday: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  stepsCount: number;
  popularity: number;
}

interface Run {
  runId: string;
  status: string;
  trigger: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  stepsExecuted: number;
  error?: string;
}

interface Stats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageDuration: number;
  runsByDay: Array<{ date: string; runs: number; success: number; failed: number }>;
  topWorkflows: Array<{ id: string; name: string; runs: number; successRate: number }>;
}

export default function CustomWorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'runs' | 'stats'>('workflows');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: workflowsData } = useSWR<{ workflows: Workflow[] }>(
    '/api/ebay-custom-workflows/workflows',
    fetcher
  );

  const { data: templatesData } = useSWR<{ templates: Template[] }>(
    '/api/ebay-custom-workflows/templates',
    fetcher
  );

  const { data: runsData } = useSWR<{ runs: Run[] }>(
    selectedWorkflow ? `/api/ebay-custom-workflows/workflows/${selectedWorkflow}/runs` : null,
    fetcher
  );

  const { data: statsData } = useSWR<Stats>(
    '/api/ebay-custom-workflows/stats',
    fetcher
  );

  const workflows = workflowsData?.workflows ?? [];
  const templates = templatesData?.templates ?? [];
  const runs = runsData?.runs ?? [];
  const stats = statsData;

  const tabs = [
    { id: 'workflows', label: 'ワークフロー', icon: GitFork },
    { id: 'templates', label: 'テンプレート', icon: Layers },
    { id: 'runs', label: '実行履歴', icon: History },
    { id: 'stats', label: '統計', icon: BarChart3 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-amber-500" />;
      case 'draft': return <FileText className="h-4 w-4 text-zinc-400" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <AlertTriangle className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTriggerLabel = (trigger: { type: string; event?: string; cron?: string }) => {
    switch (trigger.type) {
      case 'event': return `イベント: ${trigger.event}`;
      case 'schedule': return `スケジュール: ${trigger.cron}`;
      case 'manual': return '手動実行';
      case 'condition': return '条件トリガー';
      default: return trigger.type;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'listing': return '出品';
      case 'inventory': return '在庫';
      case 'pricing': return '価格';
      case 'orders': return '注文';
      case 'reporting': return 'レポート';
      case 'bulk': return '一括処理';
      default: return category;
    }
  };

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <GitFork className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">カスタムワークフロー</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              自動化ワークフローを作成・管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            インポート
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <GitFork className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-zinc-500">ワークフロー</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.totalWorkflows}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">アクティブ</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.activeWorkflows}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500">総実行数</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.totalRuns}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">成功率</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.successRate}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-zinc-500">平均実行時間</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.averageDuration}秒</p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'workflows' && (
          <div>
            {/* 検索バー */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ワークフローを検索..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                フィルター
              </Button>
            </div>

            {/* ワークフロー一覧 */}
            <div className="space-y-3">
              {filteredWorkflows.map((workflow) => (
                <Card key={workflow.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(workflow.status)}
                        <h4 className="font-medium text-zinc-900 dark:text-white">{workflow.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          workflow.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          workflow.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {workflow.status === 'active' ? 'アクティブ' : workflow.status === 'paused' ? '一時停止' : '下書き'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{workflow.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {getTriggerLabel(workflow.trigger)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Box className="h-3 w-3" />
                          {workflow.stepsCount}ステップ
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          今日 {workflow.runsToday}回実行
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          成功率 {workflow.successRate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedWorkflow(workflow.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {workflow.status === 'active' ? (
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4 text-amber-500" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 簡易フロー表示 */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                        トリガー
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
                        翻訳
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
                        価格計算
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="text-zinc-400">...</span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
                        完了
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <GitFork className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{template.name}</h4>
                      <span className="text-xs text-zinc-500">{getCategoryLabel(template.category)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{template.description}</p>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                  <span>{template.stepsCount}ステップ</span>
                  <span>{template.popularity}回使用</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  このテンプレートを使用
                </Button>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'runs' && (
          <div>
            {/* ワークフロー選択 */}
            <div className="mb-4">
              <select
                value={selectedWorkflow || ''}
                onChange={(e) => setSelectedWorkflow(e.target.value || null)}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                <option value="">ワークフローを選択</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {selectedWorkflow ? (
              <div className="space-y-2">
                {runs.map((run) => (
                  <Card key={run.runId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            実行 #{run.runId.split('_')[1]}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(run.startedAt).toLocaleString('ja-JP')} • {run.trigger}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500">{run.stepsExecuted}ステップ実行</span>
                        <span className="text-zinc-500">{(run.duration / 1000).toFixed(1)}秒</span>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {run.error && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{run.error}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 flex flex-col items-center justify-center text-zinc-500">
                <History className="h-12 w-12 mb-3 opacity-50" />
                <p>ワークフローを選択して実行履歴を表示</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            {/* 日別実行グラフ */}
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">日別実行数</h3>
              <div className="h-48 flex items-end gap-2">
                {stats.runsByDay.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${(day.runs / 60) * 100}%` }}>
                      <div
                        className="w-full bg-emerald-500 rounded-t"
                        style={{ height: `${(day.success / day.runs) * 100}%` }}
                      />
                      <div
                        className="w-full bg-red-500 rounded-b"
                        style={{ height: `${(day.failed / day.runs) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 justify-center text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded" />
                  成功
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded" />
                  失敗
                </span>
              </div>
            </Card>

            {/* トップワークフロー */}
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">よく使われるワークフロー</h3>
              <div className="space-y-3">
                {stats.topWorkflows.map((wf, index) => (
                  <div key={wf.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-medium text-violet-600 dark:text-violet-400">
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-900 dark:text-white">{wf.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>{wf.runs}回実行</span>
                      <span className="text-emerald-600">{wf.successRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* サマリー */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{stats.successfulRuns}</p>
                <p className="text-sm text-zinc-500">成功した実行</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.failedRuns}</p>
                <p className="text-sm text-zinc-500">失敗した実行</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.averageDuration}秒</p>
                <p className="text-sm text-zinc-500">平均実行時間</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

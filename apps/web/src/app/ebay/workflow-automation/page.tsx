'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Workflow,
  BarChart3,
  Settings,
  Play,
  Pause,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  LayoutGrid,
  History,
  FileCode,
  Zap,
  RefreshCw,
  ChevronRight,
  Target,
  Filter,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'workflows' | 'executions' | 'templates' | 'logs' | 'settings';

export default function WorkflowAutomationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'workflows', label: 'ワークフロー', icon: <Workflow className="w-4 h-4" /> },
    { id: 'executions', label: '実行履歴', icon: <Play className="w-4 h-4" /> },
    { id: 'templates', label: 'テンプレート', icon: <FileCode className="w-4 h-4" /> },
    { id: 'logs', label: 'ログ', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Workflow className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ワークフロー自動化</h1>
              <p className="text-sm text-gray-500">Workflow Automation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
          {activeTab === 'executions' && <ExecutionsTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/workflow-automation/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/workflow-automation/dashboard/stats`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/workflow-automation/executions/recent`, fetcher);

  return (
    <div className="space-y-6">
      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">アクティブワークフロー</p>
              <p className="text-2xl font-bold">{overview?.activeWorkflows}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Workflow className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">/ {overview?.totalWorkflows} 合計</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本日の実行</p>
              <p className="text-2xl font-bold">{overview?.todayExecutions}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-2">成功率 {overview?.successRate}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">実行中</p>
              <p className="text-2xl font-bold">{overview?.runningExecutions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">失敗</p>
              <p className="text-2xl font-bold text-red-600">{overview?.failedExecutions}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 統計 & 最近の実行 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">ワークフロー統計</h3>
          <div className="space-y-4">
            {stats?.byCategory?.map((cat: { category: string; count: number; executions: number }) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gray-400" />
                  <span>{cat.category}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{cat.count} ワークフロー</span>
                  <span className="font-medium">{cat.executions} 実行</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">最近の実行</h3>
          <div className="space-y-3">
            {recent?.executions?.slice(0, 5).map((exec: {
              id: string;
              workflowName: string;
              status: string;
              startedAt: string;
              duration: number;
            }) => (
              <div key={exec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {exec.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {exec.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                  {exec.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
                  <div>
                    <p className="font-medium">{exec.workflowName}</p>
                    <p className="text-sm text-gray-500">{exec.startedAt}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{exec.duration}秒</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/workflow-automation/workflows`, fetcher);
  const [filter, setFilter] = useState('all');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'draft': return <Edit className="w-4 h-4 text-gray-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">ワークフロー一覧</h3>
            <div className="flex gap-2">
              {['all', 'active', 'paused', 'draft'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === f ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {f === 'all' ? 'すべて' : f === 'active' ? 'アクティブ' : f === 'paused' ? '一時停止' : '下書き'}
                </button>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
        <div className="divide-y">
          {data?.workflows?.map((wf: {
            id: string;
            name: string;
            description: string;
            status: string;
            triggerType: string;
            lastRun: string;
            totalRuns: number;
            successRate: number;
          }) => (
            <div key={wf.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Workflow className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{wf.name}</h4>
                      {getStatusIcon(wf.status)}
                    </div>
                    <p className="text-sm text-gray-500">{wf.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm text-right">
                    <p className="text-gray-500">トリガー: {wf.triggerType}</p>
                    <p className="text-gray-400">最終実行: {wf.lastRun}</p>
                  </div>
                  <div className="text-sm text-right">
                    <p className="font-medium">{wf.totalRuns}回実行</p>
                    <p className="text-green-600">成功率 {wf.successRate}%</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded"><Play className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-gray-100 rounded"><Copy className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/workflow-automation/executions`, fetcher);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">実行履歴</h3>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              フィルター
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">実行ID</th>
                <th className="px-4 py-3 text-left text-sm">ワークフロー</th>
                <th className="px-4 py-3 text-left text-sm">トリガー</th>
                <th className="px-4 py-3 text-left text-sm">開始日時</th>
                <th className="px-4 py-3 text-right text-sm">所要時間</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.executions?.map((exec: {
                id: string;
                workflowId: string;
                workflowName: string;
                triggerType: string;
                startedAt: string;
                duration: number;
                status: string;
                stepsCompleted: number;
                totalSteps: number;
              }) => (
                <tr key={exec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{exec.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium">{exec.workflowName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{exec.triggerType}</td>
                  <td className="px-4 py-3 text-sm">{exec.startedAt}</td>
                  <td className="px-4 py-3 text-sm text-right">{exec.duration}秒</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(exec.status)}`}>
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      {exec.status === 'running' && (
                        <button className="p-1 hover:bg-gray-100 rounded text-red-600"><XCircle className="w-4 h-4" /></button>
                      )}
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

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/workflow-automation/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">ワークフローテンプレート</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <Plus className="w-4 h-4" />
            テンプレート作成
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.templates?.map((tpl: {
            id: string;
            name: string;
            description: string;
            category: string;
            usageCount: number;
            steps: number;
          }) => (
            <div key={tpl.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-amber-600" />
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tpl.category}</span>
              </div>
              <h4 className="font-medium mt-3">{tpl.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-gray-400">{tpl.steps}ステップ</span>
                <span className="text-sm text-gray-500">{tpl.usageCount}回使用</span>
              </div>
              <button className="w-full mt-3 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                使用する
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/workflow-automation/logs`, fetcher);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">実行ログ</h3>
          <div className="flex items-center gap-2">
            <select className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">すべてのレベル</option>
              <option value="error">エラー</option>
              <option value="warning">警告</option>
              <option value="info">情報</option>
            </select>
            <button className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              エクスポート
            </button>
          </div>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {data?.logs?.map((log: {
            id: string;
            timestamp: string;
            level: string;
            workflowName: string;
            executionId: string;
            message: string;
            details?: string;
          }) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                  {log.level.toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{log.timestamp}</span>
                    <ChevronRight className="w-4 h-4" />
                    <span>{log.workflowName}</span>
                    <span className="font-mono text-xs">({log.executionId.slice(0, 8)})</span>
                  </div>
                  <p className="mt-1">{log.message}</p>
                  {log.details && (
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">{log.details}</pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/workflow-automation/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/workflow-automation/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">同時実行数</p>
              <p className="text-sm text-gray-500">同時に実行可能なワークフロー数</p>
            </div>
            <select defaultValue={general?.maxConcurrentExecutions} className="border rounded-lg px-3 py-2">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">デフォルトタイムアウト</p>
              <p className="text-sm text-gray-500">ワークフローの最大実行時間</p>
            </div>
            <select defaultValue={general?.defaultTimeout} className="border rounded-lg px-3 py-2">
              <option value={300}>5分</option>
              <option value={600}>10分</option>
              <option value={1800}>30分</option>
              <option value={3600}>1時間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">リトライ設定</p>
              <p className="text-sm text-gray-500">失敗時の自動リトライ回数</p>
            </div>
            <select defaultValue={general?.retryAttempts} className="border rounded-lg px-3 py-2">
              <option value={0}>リトライなし</option>
              <option value={1}>1回</option>
              <option value={3}>3回</option>
              <option value={5}>5回</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">デバッグモード</p>
              <p className="text-sm text-gray-500">詳細なログを出力</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.debugMode} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">実行完了通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.onComplete} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">エラー通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.onError} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">日次サマリー</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.dailySummary} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Zap,
  BarChart3,
  Settings,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Eye,
  ChevronRight,
  Calendar,
  Activity,
  Target,
  Star,
  History,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'automations' | 'templates' | 'executions' | 'triggers' | 'settings';

export default function AutomationHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'automations', label: '自動化', icon: <Zap className="w-4 h-4" /> },
    { id: 'templates', label: 'テンプレート', icon: <FileCode className="w-4 h-4" /> },
    { id: 'executions', label: '実行履歴', icon: <History className="w-4 h-4" /> },
    { id: 'triggers', label: 'トリガー', icon: <Target className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-lime-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">自動化ハブ</h1>
              <p className="text-sm text-gray-500">Automation Hub</p>
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
                  ? 'border-lime-600 text-lime-600'
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
          {activeTab === 'automations' && <AutomationsTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'executions' && <ExecutionsTab />}
          {activeTab === 'triggers' && <TriggersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/automation-hub/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/automation-hub/dashboard/stats`, fetcher);
  const { data: activity } = useSWR(`${API_BASE}/ebay/automation-hub/dashboard/activity`, fetcher);

  return (
    <div className="space-y-6">
      {/* メトリクス */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">アクティブ自動化</p>
              <p className="text-2xl font-bold">{overview?.activeAutomations}</p>
            </div>
            <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-lime-600" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">/ {overview?.totalAutomations} 合計</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本日の実行</p>
              <p className="text-2xl font-bold">{overview?.executionsToday?.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-2">成功率 {overview?.successRate}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">節約時間</p>
              <p className="text-2xl font-bold">{overview?.timeSaved}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">今月</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">一時停止中</p>
              <p className="text-2xl font-bold text-amber-600">{overview?.pausedAutomations}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Pause className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* カテゴリ別 & アクティビティ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別統計</h3>
          <div className="space-y-4">
            {stats?.byCategory?.map((cat: {
              category: string;
              count: number;
              executions: number;
              successRate: number;
            }) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-lime-600" />
                  <div>
                    <p className="font-medium">{cat.category}</p>
                    <p className="text-xs text-gray-500">{cat.count} 自動化</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{cat.executions.toLocaleString()}</p>
                  <p className="text-xs text-green-600">{cat.successRate}% 成功</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">最近のアクティビティ</h3>
          <div className="space-y-3">
            {activity?.activities?.map((act: {
              id: string;
              type: string;
              automation: string;
              status: string;
              timestamp: string;
              affected?: number;
              message?: string;
            }) => (
              <div key={act.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {act.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                {act.status === 'failed' && <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                {act.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />}
                {act.status === 'active' && <Zap className="w-5 h-5 text-lime-600 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium">{act.automation}</p>
                  <p className="text-sm text-gray-500">
                    {act.type === 'execution' ? `${act.affected}件処理` :
                     act.type === 'error' ? act.message :
                     act.type === 'created' ? '新規作成' : '実行中'}
                  </p>
                  <p className="text-xs text-gray-400">{act.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/automation-hub/automations`, fetcher);
  const [filter, setFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">自動化一覧</h3>
            <div className="flex gap-2">
              {['all', 'active', 'paused', 'draft'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === f ? 'bg-lime-100 text-lime-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {f === 'all' ? 'すべて' : f === 'active' ? 'アクティブ' : f === 'paused' ? '一時停止' : '下書き'}
                </button>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
        <div className="divide-y">
          {data?.automations?.map((auto: {
            id: string;
            name: string;
            category: string;
            status: string;
            trigger: string;
            schedule?: string;
            event?: string;
            lastRun: string;
            nextRun?: string;
            executions: number;
            successRate: number;
          }) => (
            <div key={auto.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    auto.status === 'active' ? 'bg-lime-100' :
                    auto.status === 'paused' ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <Zap className={`w-5 h-5 ${
                      auto.status === 'active' ? 'text-lime-600' :
                      auto.status === 'paused' ? 'text-amber-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{auto.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        auto.status === 'active' ? 'bg-green-100 text-green-800' :
                        auto.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {auto.status === 'active' ? 'アクティブ' : auto.status === 'paused' ? '一時停止' : '下書き'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {auto.trigger === 'schedule' ? `スケジュール: ${auto.schedule}` : `イベント: ${auto.event}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm text-right">
                    <p className="font-medium">{auto.executions.toLocaleString()}回</p>
                    <p className="text-green-600">{auto.successRate}% 成功</p>
                  </div>
                  <div className="flex gap-1">
                    {auto.status === 'active' ? (
                      <button className="p-2 hover:bg-gray-100 rounded" title="一時停止">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-2 hover:bg-gray-100 rounded" title="実行">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
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

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/automation-hub/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">自動化テンプレート</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.templates?.map((tpl: {
            id: string;
            name: string;
            category: string;
            description: string;
            usageCount: number;
            rating: number;
          }) => (
            <div key={tpl.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-lime-600" />
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tpl.category}</span>
              </div>
              <h4 className="font-medium mt-3">{tpl.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm">{tpl.rating}</span>
                </div>
                <span className="text-xs text-gray-400">{tpl.usageCount}回使用</span>
              </div>
              <button className="w-full mt-3 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
                使用する
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/automation-hub/executions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">実行履歴</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">実行ID</th>
                <th className="px-4 py-3 text-left text-sm">自動化</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">開始</th>
                <th className="px-4 py-3 text-right text-sm">所要時間</th>
                <th className="px-4 py-3 text-right text-sm">処理数</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.executions?.map((exec: {
                id: string;
                automationId: string;
                automationName: string;
                status: string;
                startedAt: string;
                duration: number | null;
                itemsAffected: number;
                error?: string;
              }) => (
                <tr key={exec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{exec.id}</td>
                  <td className="px-4 py-3 font-medium">{exec.automationName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      exec.status === 'success' ? 'bg-green-100 text-green-800' :
                      exec.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      exec.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {exec.status === 'success' ? '成功' :
                       exec.status === 'running' ? '実行中' :
                       exec.status === 'failed' ? '失敗' : exec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{exec.startedAt}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {exec.duration !== null ? `${exec.duration}秒` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{exec.itemsAffected}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      {exec.status === 'failed' && (
                        <button className="p-1 hover:bg-gray-100 rounded"><RefreshCw className="w-4 h-4" /></button>
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

function TriggersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/automation-hub/triggers`, fetcher);

  return (
    <div className="space-y-6">
      {/* トリガータイプ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">トリガータイプ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.triggers?.map((trigger: {
            type: string;
            name: string;
            description: string;
            icon: string;
          }) => (
            <div key={trigger.type} className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                  {trigger.icon === 'clock' && <Clock className="w-5 h-5 text-lime-600" />}
                  {trigger.icon === 'zap' && <Zap className="w-5 h-5 text-lime-600" />}
                  {trigger.icon === 'link' && <ChevronRight className="w-5 h-5 text-lime-600" />}
                  {trigger.icon === 'hand' && <Play className="w-5 h-5 text-lime-600" />}
                </div>
                <div>
                  <p className="font-medium">{trigger.name}</p>
                  <p className="text-xs text-gray-500">{trigger.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* イベント一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">利用可能なイベント</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.events?.map((event: {
            name: string;
            description: string;
          }) => (
            <div key={event.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-mono text-sm">{event.name}</p>
                <p className="text-xs text-gray-500">{event.description}</p>
              </div>
              <button className="px-3 py-1 bg-lime-600 text-white rounded text-sm hover:bg-lime-700">
                使用
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/automation-hub/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/automation-hub/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">最大同時実行数</p>
              <p className="text-sm text-gray-500">同時に実行できる自動化の数</p>
            </div>
            <select defaultValue={general?.settings?.maxConcurrentExecutions} className="border rounded-lg px-3 py-2">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">デフォルトリトライ回数</p>
            </div>
            <select defaultValue={general?.settings?.defaultRetryAttempts} className="border rounded-lg px-3 py-2">
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">実行タイムアウト</p>
              <p className="text-sm text-gray-500">秒単位</p>
            </div>
            <select defaultValue={general?.settings?.executionTimeout} className="border rounded-lg px-3 py-2">
              <option value={60}>60秒</option>
              <option value={180}>3分</option>
              <option value={300}>5分</option>
              <option value={600}>10分</option>
            </select>
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">成功時通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.onSuccess} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-lime-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">失敗時通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.onFailure} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-lime-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">日次サマリー</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.dailySummary} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-lime-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">週次サマリー</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.weeklySummary} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-lime-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

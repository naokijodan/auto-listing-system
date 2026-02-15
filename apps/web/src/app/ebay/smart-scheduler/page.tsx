'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Clock,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart,
  Activity,
  Cpu,
  Database,
  FileText,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SmartSchedulerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Clock },
    { id: 'jobs', name: 'ジョブ管理', icon: Zap },
    { id: 'calendar', name: 'カレンダー', icon: Calendar },
    { id: 'resources', name: 'リソース', icon: Cpu },
    { id: 'reports', name: 'レポート', icon: FileText },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-violet-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Smart Scheduler</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
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
        {activeTab === 'jobs' && <JobsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'resources' && <ResourcesTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/smart-scheduler/dashboard/overview`, fetcher);
  const { data: upcoming } = useSWR(`${API_BASE}/ebay/smart-scheduler/dashboard/upcoming`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/smart-scheduler/dashboard/recent`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-violet-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">アクティブジョブ</p>
              <p className="text-2xl font-bold">{overview?.activeJobs || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">今日の実行</p>
              <p className="text-2xl font-bold">{overview?.executionsToday || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">成功率</p>
              <p className="text-2xl font-bold">{overview?.successRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-amber-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">平均実行時間</p>
              <p className="text-2xl font-bold">{overview?.avgExecutionTime || 0}秒</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">今後のスケジュール</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcoming?.schedules?.map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      schedule.priority === 'high' ? 'bg-red-100' :
                      schedule.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        schedule.priority === 'high' ? 'text-red-600' :
                        schedule.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{schedule.jobName}</p>
                      <p className="text-sm text-gray-500">{schedule.frequency}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{schedule.nextRun.split(' ')[1]}</p>
                    <p className="text-xs text-gray-500">{schedule.nextRun.split(' ')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">最近の実行</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recent?.executions?.map((execution: any) => (
                <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    {execution.status === 'success' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : execution.status === 'failed' ? (
                      <XCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                    )}
                    <div className="ml-3">
                      <p className="font-medium">{execution.jobName}</p>
                      <p className="text-sm text-gray-500">{execution.startedAt}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      execution.status === 'success' ? 'bg-green-100 text-green-800' :
                      execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {execution.status === 'success' ? '成功' : execution.status === 'failed' ? '失敗' : '実行中'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{execution.duration}秒</p>
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

function JobsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/smart-scheduler/jobs`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          <Plus className="h-5 w-5 mr-2" />
          ジョブ作成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ジョブ名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スケジュール</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">優先度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">成功率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">次回実行</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.jobs?.map((job: any) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{job.name}</p>
                      <p className="text-sm text-gray-500">{job.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{job.frequency}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.priority === 'high' ? 'bg-red-100 text-red-800' :
                      job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {job.priority === 'high' ? '高' : job.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'active' ? '有効' : '停止中'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{job.successRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.nextRun}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="実行">
                        <Play className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title="一時停止">
                        <Pause className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="編集">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="削除">
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

function CalendarTab() {
  const { data: month } = useSWR(`${API_BASE}/ebay/smart-scheduler/calendar/month`, fetcher);
  const { data: week } = useSWR(`${API_BASE}/ebay/smart-scheduler/calendar/week`, fetcher);
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">2026年2月</h2>
          <button className="p-2 hover:bg-gray-100 rounded">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`px-4 py-2 rounded-lg ${
                view === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {v === 'month' ? '月' : v === 'week' ? '週' : '日'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {week?.days?.map((day: any, index: number) => (
            <div key={day.date} className="border p-4 min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.date.split('-')[2]}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  day.failed > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {day.executions}件
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">{day.success} 成功</div>
                {day.failed > 0 && <div className="text-xs text-red-600">{day.failed} 失敗</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourcesTab() {
  const { data: usage } = useSWR(`${API_BASE}/ebay/smart-scheduler/resources/usage`, fetcher);
  const { data: forecast } = useSWR(`${API_BASE}/ebay/smart-scheduler/resources/forecast`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">CPU使用率</p>
              <p className="text-2xl font-bold">{usage?.current?.cpu || 0}%</p>
            </div>
            <Cpu className="h-8 w-8 text-violet-600" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full"
                style={{ width: `${usage?.current?.cpu || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">メモリ使用率</p>
              <p className="text-2xl font-bold">{usage?.current?.memory || 0}%</p>
            </div>
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${usage?.current?.memory || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">アクティブワーカー</p>
              <p className="text-2xl font-bold">{usage?.current?.activeWorkers || 0}/{usage?.current?.maxWorkers || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">キュー待ち</p>
              <p className="text-2xl font-bold">{usage?.current?.queueLength || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">ジョブ別リソース使用</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {usage?.byJob?.map((job: any) => (
                <div key={job.jobId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{job.jobName}</p>
                    <span className="text-sm text-gray-500">{job.avgDuration}秒</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">CPU: </span>
                      <span>{job.avgCpu}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">メモリ: </span>
                      <span>{job.avgMemory}MB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">リソース予測</h3>
          </div>
          <div className="p-6">
            {forecast?.recommendations?.map((rec: any, index: number) => (
              <div key={index} className="flex items-start p-4 bg-yellow-50 rounded-lg mb-4">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium text-yellow-800">{rec.message}</p>
                  <p className="text-sm text-yellow-700 mt-1">{rec.action}</p>
                </div>
              </div>
            ))}
            <div className="space-y-4 mt-4">
              {forecast?.forecast?.map((item: any) => (
                <div key={item.time} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.time}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span>CPU: {item.expectedCpu}%</span>
                    <span>メモリ: {item.expectedMemory}%</span>
                    <span>ジョブ: {item.expectedJobs}</span>
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

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/smart-scheduler/reports`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          <FileText className="h-5 w-5 mr-2" />
          レポート生成
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">レポート名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">期間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終生成</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">次回生成</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.reports?.map((report: any) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{report.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{report.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{report.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.lastGenerated}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.nextGeneration}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">
                      ダウンロード
                    </button>
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
  const { data: general } = useSWR(`${API_BASE}/ebay/smart-scheduler/settings/general`, fetcher);
  const { data: resources } = useSWR(`${API_BASE}/ebay/smart-scheduler/settings/resources`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/smart-scheduler/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">タイムゾーン</label>
              <select
                defaultValue={general?.settings?.timezone}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルトタイムアウト（秒）</label>
              <input
                type="number"
                defaultValue={general?.settings?.defaultTimeout}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">最大同時実行ジョブ数</label>
              <input
                type="number"
                defaultValue={general?.settings?.maxConcurrentJobs}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルトリトライ回数</label>
              <input
                type="number"
                defaultValue={general?.settings?.defaultRetryAttempts}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">リソース制限</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">最大ワーカー数</label>
              <input
                type="number"
                defaultValue={resources?.settings?.maxWorkers}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ジョブあたり最大メモリ（MB）</label>
              <input
                type="number"
                defaultValue={resources?.settings?.maxMemoryPerJob}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">キュー上限</label>
              <input
                type="number"
                defaultValue={resources?.settings?.queueLimit}
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
            { key: 'onJobFailure', label: 'ジョブ失敗時に通知' },
            { key: 'onJobTimeout', label: 'タイムアウト時に通知' },
            { key: 'onResourceWarning', label: 'リソース警告時に通知' },
            { key: 'dailySummary', label: 'デイリーサマリーを送信' },
            { key: 'weeklySummary', label: 'ウィークリーサマリーを送信' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={notifications?.settings?.[item.key]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

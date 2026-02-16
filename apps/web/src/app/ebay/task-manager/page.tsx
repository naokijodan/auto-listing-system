'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  CheckSquare,
  ListTodo,
  Users,
  FolderKanban,
  BarChart2,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Play,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function TaskManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: CheckSquare },
    { id: 'tasks', name: 'タスク', icon: ListTodo },
    { id: 'projects', name: 'プロジェクト', icon: FolderKanban },
    { id: 'team', name: 'チーム', icon: Users },
    { id: 'reports', name: 'レポート', icon: BarChart2 },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
                <p className="text-sm text-gray-500">タスク・プロジェクト管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                タスク作成
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
                    ? 'border-indigo-500 text-indigo-600'
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
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/task-manager/dashboard/overview`, fetcher);
  const { data: myTasks } = useSWR(`${API_BASE}/ebay/task-manager/dashboard/my-tasks`, fetcher);
  const { data: team } = useSWR(`${API_BASE}/ebay/task-manager/dashboard/team`, fetcher);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Play className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">保留中</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.pendingTasks || 0}</p>
            </div>
            <Circle className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">タスク</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">進行中</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.inProgressTasks || 0}</p>
            </div>
            <Play className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">タスク</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">期限切れ</p>
              <p className="text-3xl font-bold text-red-600">{overview?.overdueTasks || 0}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-200" />
          </div>
          <p className="mt-2 text-sm text-red-600">要対応</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">完了率</p>
              <p className="text-3xl font-bold text-green-600">{overview?.completionRate || 0}%</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">{overview?.completedTasks || 0} / {overview?.totalTasks || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">マイタスク</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {myTasks?.tasks?.map((task: any) => (
              <div key={task.id} className="px-6 py-4">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {task.dueDate}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Progress */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">チーム進捗</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {team?.members?.map((member: any) => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{member.completed}/{member.totalTasks}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(member.completed / member.totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksTab() {
  const { data } = useSWR(`${API_BASE}/ebay/task-manager/tasks`, fetcher);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTasks = data?.tasks?.filter((task: any) =>
    statusFilter === 'all' || task.status === statusFilter
  ) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">すべて</option>
                <option value="pending">保留中</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total || 0} 件</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {filteredTasks.map((task: any) => (
          <div key={task.id} className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  readOnly
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      {task.assignee}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {task.dueDate}
                    </span>
                    <div className="flex items-center space-x-1">
                      {task.tags?.map((tag: string) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-xs">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{task.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-indigo-600 hover:text-indigo-900">
                  <Eye className="h-4 w-4" />
                </button>
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

function ProjectsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/task-manager/projects`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">プロジェクト</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          プロジェクト作成
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.projects?.map((project: any) => (
          <div key={project.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                <p className="text-xs text-gray-500 mt-1">期限: {project.dueDate}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">進捗</span>
                <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    project.progress >= 70 ? 'bg-green-500' :
                    project.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>{project.completedTasks} / {project.tasksCount} タスク</span>
              <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                詳細
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamTab() {
  const { data } = useSWR(`${API_BASE}/ebay/task-manager/dashboard/team`, fetcher);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">チームメンバー</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.members?.map((member: any) => (
          <div key={member.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                <p className="text-xs text-gray-500">{member.totalTasks} タスク</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-50 rounded-lg p-2">
                <p className="text-lg font-bold text-yellow-600">{member.pending}</p>
                <p className="text-xs text-gray-500">保留中</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-lg font-bold text-blue-600">{member.inProgress}</p>
                <p className="text-xs text-gray-500">進行中</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">{member.completed}</p>
                <p className="text-xs text-gray-500">完了</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(member.completed / member.totalTasks) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                完了率: {Math.round((member.completed / member.totalTasks) * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: productivity } = useSWR(`${API_BASE}/ebay/task-manager/reports/productivity`, fetcher);
  const { data: workload } = useSWR(`${API_BASE}/ebay/task-manager/reports/workload`, fetcher);

  return (
    <div className="space-y-6">
      {/* Productivity Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">生産性サマリー</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">完了タスク数</p>
              <p className="text-2xl font-bold text-green-600">{productivity?.summary?.totalCompleted || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">平均完了時間</p>
              <p className="text-2xl font-bold text-indigo-600">{productivity?.summary?.avgCompletionTime || 0}日</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">期限内完了率</p>
              <p className="text-2xl font-bold text-blue-600">{productivity?.summary?.onTimeRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workload */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">ワークロード</h3>
        </div>
        <div className="p-6 space-y-4">
          {workload?.byMember?.map((member: any) => (
            <div key={member.member}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{member.member}</span>
                <span className="text-sm font-medium text-gray-900">{member.workload}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    member.workload >= 80 ? 'bg-red-500' :
                    member.workload >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${member.workload}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{member.completed} / {member.assigned} 完了</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/task-manager/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">デフォルト優先度</label>
            <select
              defaultValue={data?.settings?.defaultPriority}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">自動アーカイブ（日数）</label>
            <input
              type="number"
              defaultValue={data?.settings?.autoArchiveDays || 30}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">リマインダー</h4>
              <p className="text-sm text-gray-500">期限前に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.reminderEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">リマインダー（時間前）</label>
            <input
              type="number"
              defaultValue={data?.settings?.reminderBefore || 24}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Headphones,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Filter,
  Plus,
  Send,
  Star,
  TrendingUp,
  Zap,
  FileText,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CustomerServiceHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Headphones },
    { id: 'tickets', label: 'チケット', icon: MessageSquare },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'automation', label: '自動化', icon: Zap },
    { id: 'reports', label: 'レポート', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Headphones className="w-8 h-8 text-lime-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Customer Service Hub</h1>
                <p className="text-sm text-gray-500">カスタマーサービス管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
                <Plus className="w-4 h-4" />
                新規チケット
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-lime-600 text-lime-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'tickets' && <TicketsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-service-hub/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/customer-service-hub/dashboard/recent`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/customer-service-hub/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">オープン</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.openTickets || 0}</p>
            </div>
            <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-lime-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">対応中</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.pendingTickets || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本日解決</p>
              <p className="text-3xl font-bold text-green-600">{overview?.resolvedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">満足度</p>
              <p className="text-3xl font-bold text-lime-600">{overview?.satisfactionScore || 0}</p>
            </div>
            <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-lime-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">平均レスポンス: {overview?.avgResponseTime}h</p>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のチケット</h3>
        <div className="space-y-3">
          {recent?.tickets?.map((ticket: any) => (
            <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  ticket.priority === 'high' ? 'bg-red-100' :
                  ticket.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    ticket.priority === 'high' ? 'text-red-600' :
                    ticket.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{ticket.subject}</p>
                  <p className="text-sm text-gray-500">{ticket.customer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs ${
                  ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                  ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  ticket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {ticket.status}
                </span>
                <span className="text-sm text-gray-500">{ticket.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ステータス別</h3>
          <div className="space-y-3">
            {stats?.byStatus?.map((status: any) => (
              <div key={status.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{status.status}</span>
                  <span className="text-sm font-medium">{status.count} ({status.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-lime-500 h-2 rounded-full"
                    style={{ width: `${status.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ別</h3>
          <div className="space-y-3">
            {stats?.byCategory?.map((cat: any) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{cat.category}</span>
                  <span className="text-sm font-medium">{cat.count} ({cat.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
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

function TicketsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-service-hub/tickets`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
          <Plus className="w-4 h-4" />
          新規チケット
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">件名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">優先度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">担当</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.tickets?.map((ticket: any) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{ticket.subject}</p>
                  {ticket.orderId && <p className="text-sm text-gray-500">注文: {ticket.orderId}</p>}
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{ticket.customer?.name}</p>
                  <p className="text-sm text-gray-500">{ticket.customer?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{ticket.category}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                    ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{ticket.assignee || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded" title="返信">
                      <Send className="w-4 h-4 text-lime-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="割り当て">
                      <Users className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-service-hub/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">返信テンプレート</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
          <Plus className="w-4 h-4" />
          新規テンプレート
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{template.category}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>使用回数: {template.usageCount}回</span>
              <span>最終使用: {template.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-service-hub/automation/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">自動化ルール</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700">
          <Plus className="w-4 h-4" />
          新規ルール
        </button>
      </div>

      <div className="space-y-4">
        {data?.rules?.map((rule: any) => (
          <div key={rule.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-lime-100' : 'bg-gray-100'}`}>
                  <Zap className={`w-5 h-5 ${rule.enabled ? 'text-lime-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <p className="text-sm text-gray-500">
                    トリガー: {rule.trigger} | 条件: {rule.condition} | アクション: {rule.action}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: performance } = useSWR(`${API_BASE}/ebay/customer-service-hub/reports/performance`, fetcher);
  const { data: satisfaction } = useSWR(`${API_BASE}/ebay/customer-service-hub/reports/satisfaction`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンスサマリー</h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{performance?.report?.totalTickets || 0}</p>
            <p className="text-sm text-gray-500">総チケット</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{performance?.report?.resolutionRate || 0}%</p>
            <p className="text-sm text-gray-500">解決率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{performance?.report?.avgResponseTime || 0}h</p>
            <p className="text-sm text-gray-500">平均レスポンス</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-lime-600">{performance?.report?.satisfactionScore || 0}</p>
            <p className="text-sm text-gray-500">満足度スコア</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">担当者別パフォーマンス</h3>
          <div className="space-y-4">
            {performance?.report?.byAgent?.map((agent: any) => (
              <div key={agent.agent} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{agent.agent}</p>
                  <p className="text-sm text-gray-500">{agent.resolved}件解決</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-lime-600">{agent.satisfaction}</p>
                  <p className="text-sm text-gray-500">平均{agent.avgTime}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">満足度分布</h3>
          <div className="space-y-3">
            {satisfaction?.report?.distribution?.map((dist: any) => (
              <div key={dist.rating}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    {Array.from({ length: dist.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </span>
                  <span className="text-sm">{dist.count} ({dist.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${dist.percentage}%` }}
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

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/customer-service-hub/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/customer-service-hub/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">自動割り当て</p>
              <p className="text-sm text-gray-500">新規チケットを自動的に担当者に割り当て</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoAssign} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">SLA有効</p>
              <p className="text-sm text-gray-500">サービスレベル契約を有効化</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.slaEnabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">レスポンス目標時間</p>
              <p className="text-sm text-gray-500">初回レスポンスまでの目標時間</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="2">{general?.settings?.responseTimeTarget || 2}時間</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          {[
            { key: 'newTicket', label: '新規チケット', desc: '新しいチケットが作成された場合' },
            { key: 'ticketAssigned', label: 'チケット割り当て', desc: 'チケットが割り当てられた場合' },
            { key: 'ticketReply', label: '顧客返信', desc: '顧客から返信があった場合' },
            { key: 'slaWarning', label: 'SLA警告', desc: 'SLA違反が近い場合' },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-500">{setting.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={(notifications?.settings as any)?.[setting.key]} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

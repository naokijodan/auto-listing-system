'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Shield,
  AlertTriangle,
  FileText,
  Settings,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  BarChart2,
  Zap,
  AlertCircle,
  BookOpen,
  Bell,
  Clock,
  TrendingUp,
  Play,
  Pause,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ComplianceManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Shield },
    { id: 'issues', name: '問題管理', icon: AlertTriangle },
    { id: 'policies', name: 'ポリシー', icon: BookOpen },
    { id: 'rules', name: 'カスタムルール', icon: FileText },
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
              <Shield className="h-8 w-8 text-lime-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Compliance Manager</h1>
                <p className="text-sm text-gray-500">コンプライアンス・ポリシー管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-lime-600 hover:bg-lime-700">
                <Play className="h-4 w-4 mr-2" />
                スキャン実行
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
                    ? 'border-lime-500 text-lime-600'
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
        {activeTab === 'issues' && <IssuesTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/compliance-manager/dashboard/overview`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/compliance-manager/dashboard/alerts`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/compliance-manager/dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">コンプライアンススコア</p>
              <p className="text-3xl font-bold text-lime-600">{overview?.overallScore || 0}%</p>
            </div>
            <Shield className="h-12 w-12 text-lime-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">良好</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">準拠リスティング</p>
              <p className="text-3xl font-bold text-green-600">{overview?.compliantListings?.toLocaleString() || 0}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">/ {overview?.totalListings?.toLocaleString() || 0} 件</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">重大な問題</p>
              <p className="text-3xl font-bold text-red-600">{overview?.criticalIssues || 0}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-red-200" />
          </div>
          <p className="mt-2 text-sm text-red-600">要対応</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">警告</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.warningIssues || 0}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="mt-2 text-sm text-yellow-600">確認推奨</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">アラート</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts?.alerts?.map((alert: any) => (
              <div key={alert.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100' :
                    alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    {alert.severity === 'critical' ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <Bell className="h-4 w-4 text-blue-600" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-400">{alert.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">週次トレンド</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {trends?.weekly?.map((week: any) => (
                <div key={week.week} className="flex items-center">
                  <span className="w-12 text-sm text-gray-500">{week.week}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-4 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-lime-500 rounded-full"
                        style={{ width: `${week.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-sm font-medium text-gray-900">{week.score}%</span>
                  <span className="w-12 text-sm text-gray-500">({week.issues}件)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">カテゴリ別スコア</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trends?.byCategory?.map((cat: any) => (
              <div key={cat.category} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-500">{cat.category}</p>
                <p className={`text-3xl font-bold ${
                  cat.score >= 95 ? 'text-green-600' :
                  cat.score >= 90 ? 'text-lime-600' : 'text-yellow-600'
                }`}>
                  {cat.score}%
                </p>
                <p className="text-xs text-gray-400">{cat.issues}件の問題</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssuesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-manager/issues`, fetcher);
  const [severityFilter, setSeverityFilter] = useState('all');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredIssues = data?.issues?.filter((issue: any) =>
    severityFilter === 'all' || issue.severity === severityFilter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-lime-500 focus:border-lime-500"
              >
                <option value="all">すべて</option>
                <option value="critical">重大</option>
                <option value="warning">警告</option>
                <option value="info">情報</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-lime-500 focus:border-lime-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total || 0} 件</p>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">重要度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">リスティング</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">問題タイプ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">検出日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIssues.map((issue: any) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity === 'critical' ? '重大' : issue.severity === 'warning' ? '警告' : '情報'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{issue.listingId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{issue.type}</p>
                  {issue.keyword && <p className="text-xs text-gray-500">キーワード: {issue.keyword}</p>}
                  {issue.brand && <p className="text-xs text-gray-500">ブランド: {issue.brand}</p>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    issue.status === 'open' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {issue.status === 'resolved' ? '解決済み' : issue.status === 'open' ? '未解決' : '対応中'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {issue.detectedAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-lime-600 hover:text-lime-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <CheckCircle className="h-4 w-4" />
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

function PoliciesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-manager/policies`, fetcher);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">ポリシー管理</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-lime-600 hover:bg-lime-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          ポリシー同期
        </button>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.policies?.map((policy: any) => (
          <div key={policy.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                  policy.type === 'keyword' ? 'bg-red-100' :
                  policy.type === 'vero' ? 'bg-purple-100' :
                  policy.type === 'category' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {policy.type === 'keyword' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : policy.type === 'vero' ? (
                    <Shield className="h-5 w-5 text-purple-600" />
                  ) : policy.type === 'category' ? (
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{policy.name}</h4>
                  <p className="text-xs text-gray-500">{policy.rules} ルール</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={policy.enabled} className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
              </label>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-400">最終更新: {policy.lastUpdated}</p>
              <button className="text-lime-600 hover:text-lime-800 text-sm font-medium">
                詳細
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-manager/rules`, fetcher);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">カスタムルール</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-lime-600 hover:bg-lime-700">
          <Plus className="h-4 w-4 mr-2" />
          ルール作成
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ルール名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">条件</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">重要度</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">有効</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.rules?.map((rule: any) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-500">{rule.type}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{rule.pattern || rule.condition}</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    rule.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rule.severity === 'critical' ? '重大' : rule.severity === 'warning' ? '警告' : '情報'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.enabled} className="sr-only peer" readOnly />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-600">
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
  );
}

function ReportsTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/compliance-manager/reports/summary`, fetcher);
  const { data: audits } = useSWR(`${API_BASE}/ebay/compliance-manager/reports/audit`, fetcher);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">月次サマリー - {summary?.summary?.period}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">総スキャン数</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.summary?.totalScans || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">検出問題</p>
              <p className="text-2xl font-bold text-red-600">{summary?.summary?.totalIssuesFound || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">解決済み</p>
              <p className="text-2xl font-bold text-green-600">{summary?.summary?.totalIssuesResolved || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">コンプライアンス率</p>
              <p className="text-2xl font-bold text-lime-600">{summary?.summary?.complianceRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* By Type */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">問題タイプ別</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {summary?.byType?.map((type: any) => (
              <div key={type.type} className="flex items-center">
                <span className="w-40 text-sm text-gray-500">{type.type}</span>
                <div className="flex-1 mx-4">
                  <div className="h-4 bg-gray-200 rounded-full flex">
                    <div
                      className="h-full bg-red-500 rounded-l-full"
                      style={{ width: `${((type.count - type.resolved) / type.count) * 100}%` }}
                    />
                    <div
                      className="h-full bg-green-500 rounded-r-full"
                      style={{ width: `${(type.resolved / type.count) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-24 text-sm text-right text-gray-500">{type.resolved}/{type.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">監査履歴</h3>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-lime-600 hover:bg-lime-700">
            レポート生成
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">スキャン数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">問題検出</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">合格率</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits?.audits?.map((audit: any) => (
                <tr key={audit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{audit.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{audit.scannedListings.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{audit.issuesFound}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${
                      audit.passRate >= 99 ? 'text-green-600' :
                      audit.passRate >= 95 ? 'text-lime-600' : 'text-yellow-600'
                    }`}>
                      {audit.passRate}%
                    </span>
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
  const { data } = useSWR(`${API_BASE}/ebay/compliance-manager/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/compliance-manager/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">自動スキャン</h4>
              <p className="text-sm text-gray-500">リスティングを自動スキャン</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoScan} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">スキャン頻度</label>
            <select
              defaultValue={data?.settings?.scanFrequency}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">重大問題でブロック</h4>
              <p className="text-sm text-gray-500">重大な問題があるリスティングをブロック</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.blockOnCritical} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">通知設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">メール通知</h4>
              <p className="text-sm text-gray-500">問題検出時にメールで通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications?.settings?.emailEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Slack通知</h4>
              <p className="text-sm text-gray-500">Slackチャンネルに通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications?.settings?.slackEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">ダイジェスト頻度</label>
            <select
              defaultValue={notifications?.settings?.digestFrequency}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="realtime">リアルタイム</option>
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-lime-600 hover:bg-lime-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

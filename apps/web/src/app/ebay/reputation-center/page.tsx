'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Award,
  FileText,
  Settings,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Send,
  BarChart2,
  Users,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ReputationCenterPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Star },
    { id: 'feedback', name: 'フィードバック', icon: MessageSquare },
    { id: 'analysis', name: '評価分析', icon: TrendingUp },
    { id: 'metrics', name: 'セラーメトリクス', icon: Award },
    { id: 'templates', name: 'テンプレート', icon: FileText },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-amber-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reputation Center</h1>
                <p className="text-sm text-gray-500">評価・フィードバック管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
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
                    ? 'border-amber-500 text-amber-600'
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
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'metrics' && <MetricsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/reputation-center/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/reputation-center/dashboard/recent`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/reputation-center/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総合評価</p>
              <p className="text-3xl font-bold text-amber-600">{overview?.overallRating || 0}</p>
            </div>
            <Star className="h-12 w-12 text-amber-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">⭐ 5段階評価</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ポジティブ率</p>
              <p className="text-3xl font-bold text-green-600">{overview?.positivePercent || 0}%</p>
            </div>
            <ThumbsUp className="h-12 w-12 text-green-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">{overview?.positiveFeedback?.toLocaleString() || 0}件</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総フィードバック</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.totalFeedback?.toLocaleString() || 0}</p>
            </div>
            <MessageSquare className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">{overview?.sellerLevel || '-'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ネガティブ</p>
              <p className="text-3xl font-bold text-red-600">{overview?.negativeFeedback || 0}</p>
            </div>
            <ThumbsDown className="h-12 w-12 text-red-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">対応が必要</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">最近のフィードバック</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recent?.feedback?.map((fb: any) => (
              <div key={fb.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      fb.type === 'positive' ? 'bg-green-100' : fb.type === 'neutral' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {fb.type === 'positive' ? (
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                      ) : fb.type === 'neutral' ? (
                        <span className="text-yellow-600">−</span>
                      ) : (
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fb.buyer}</p>
                      <p className="text-sm text-gray-500">{fb.comment}</p>
                      <p className="text-xs text-gray-400 mt-1">{fb.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {'⭐'.repeat(fb.rating)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">アラート</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts?.alerts?.map((alert: any) => (
              <div key={alert.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-400">{alert.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const { data } = useSWR(`${API_BASE}/ebay/reputation-center/feedback`, fetcher);
  const [filter, setFilter] = useState('all');

  const filteredFeedback = data?.feedback?.filter((fb: any) =>
    filter === 'all' || fb.type === filter
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
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">すべて</option>
                <option value="positive">ポジティブ</option>
                <option value="neutral">ニュートラル</option>
                <option value="negative">ネガティブ</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total?.toLocaleString() || 0} 件</p>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">バイヤー</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コメント</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返信</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFeedback.map((fb: any) => (
              <tr key={fb.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    fb.type === 'positive' ? 'bg-green-100 text-green-800' :
                    fb.type === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {fb.type === 'positive' ? 'ポジティブ' : fb.type === 'neutral' ? 'ニュートラル' : 'ネガティブ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fb.buyer?.name}</p>
                    <p className="text-xs text-gray-500">{fb.buyer?.country}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 truncate max-w-xs">{fb.comment}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{fb.product}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {fb.responded ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fb.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-amber-600 hover:text-amber-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      <Send className="h-4 w-4" />
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

function AnalysisTab() {
  const { data: trends } = useSWR(`${API_BASE}/ebay/reputation-center/analysis/trends`, fetcher);
  const { data: categories } = useSWR(`${API_BASE}/ebay/reputation-center/analysis/categories`, fetcher);
  const { data: keywords } = useSWR(`${API_BASE}/ebay/reputation-center/analysis/keywords`, fetcher);

  return (
    <div className="space-y-6">
      {/* Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">月別トレンド</h3>
        <div className="space-y-4">
          {trends?.monthly?.map((month: any) => (
            <div key={month.month} className="flex items-center">
              <span className="w-20 text-sm text-gray-500">{month.month}</span>
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(month.positive / (month.positive + month.neutral + month.negative)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${(month.neutral / (month.positive + month.neutral + month.negative)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(month.negative / (month.positive + month.neutral + month.negative)) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-sm font-medium text-gray-900">{month.positivePercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">カテゴリ別評価</h3>
          </div>
          <div className="p-6">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase">件数</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase">好評率</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase">評価</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories?.categories?.map((cat: any) => (
                  <tr key={cat.category}>
                    <td className="py-3 text-sm font-medium text-gray-900">{cat.category}</td>
                    <td className="py-3 text-sm text-right text-gray-500">{cat.total.toLocaleString()}</td>
                    <td className="py-3 text-sm text-right text-green-600">{cat.positivePercent}%</td>
                    <td className="py-3 text-sm text-right text-amber-600">⭐ {cat.avgRating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Keyword Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">キーワード分析</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">ポジティブキーワード</h4>
              <div className="flex flex-wrap gap-2">
                {keywords?.positive?.map((kw: any) => (
                  <span key={kw.keyword} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {kw.keyword} ({kw.count})
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">ネガティブキーワード</h4>
              <div className="flex flex-wrap gap-2">
                {keywords?.negative?.map((kw: any) => (
                  <span key={kw.keyword} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                    {kw.keyword} ({kw.count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/reputation-center/metrics/overview`, fetcher);
  const { data: history } = useSWR(`${API_BASE}/ebay/reputation-center/metrics/history`, fetcher);

  return (
    <div className="space-y-6">
      {/* Seller Status */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Award className="h-12 w-12 text-amber-600" />
          <div>
            <h3 className="text-xl font-bold text-amber-800">{overview?.status}</h3>
            <p className="text-sm text-amber-600">認定日: {overview?.statusSince}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-600">欠陥率</h4>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-green-600">{overview?.metrics?.defectRate}%</span>
            <span className="text-sm text-gray-500">/ {overview?.metrics?.defectRateTarget}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(overview?.metrics?.defectRate / overview?.metrics?.defectRateTarget) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-600">遅延発送率</h4>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-green-600">{overview?.metrics?.lateShipmentRate}%</span>
            <span className="text-sm text-gray-500">/ {overview?.metrics?.lateShipmentTarget}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(overview?.metrics?.lateShipmentRate / overview?.metrics?.lateShipmentTarget) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-600">追跡番号登録率</h4>
            <CheckCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-green-600">{overview?.metrics?.trackingUploadRate}%</span>
            <span className="text-sm text-gray-500">/ {overview?.metrics?.trackingUploadTarget}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${Math.min((overview?.metrics?.trackingUploadRate / 100) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-600">取引欠陥率</h4>
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-green-600">{overview?.metrics?.transactionDefectRate}%</span>
            <span className="text-sm text-gray-500">/ {overview?.metrics?.transactionDefectTarget}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(overview?.metrics?.transactionDefectRate / overview?.metrics?.transactionDefectTarget) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">メトリクス履歴</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">月</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">欠陥率</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">遅延発送率</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">追跡番号登録率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history?.history?.map((h: any) => (
                <tr key={h.month}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{h.month}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{h.defectRate}%</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{h.lateShipmentRate}%</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{h.trackingUploadRate}%</td>
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
  const { data: templates } = useSWR(`${API_BASE}/ebay/reputation-center/templates`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/reputation-center/auto-reply/rules`, fetcher);

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">返信テンプレート</h3>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            テンプレート追加
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {templates?.templates?.map((template: any) => (
            <div key={template.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.type === 'positive' ? 'bg-green-100 text-green-800' :
                      template.type === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {template.type}
                    </span>
                    <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{template.message}</p>
                  <p className="mt-1 text-xs text-gray-400">使用回数: {template.usageCount.toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-2">
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

      {/* Auto Reply Rules */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">自動返信ルール</h3>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            ルール追加
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {rules?.rules?.map((rule: any) => (
            <div key={rule.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Zap className={`h-5 w-5 ${rule.enabled ? 'text-amber-500' : 'text-gray-300'}`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                    <p className="text-xs text-gray-500">
                      条件: {rule.condition} | 使用回数: {rule.usageCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.enabled} className="sr-only peer" readOnly />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
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
  const { data } = useSWR(`${API_BASE}/ebay/reputation-center/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">自動返信</h4>
              <p className="text-sm text-gray-500">ポジティブフィードバックに自動返信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoReplyEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">ネガティブ通知</h4>
              <p className="text-sm text-gray-500">ネガティブフィードバック時に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.notifyOnNegative} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">日次サマリー</h4>
              <p className="text-sm text-gray-500">毎日のフィードバックサマリーを送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.dailySummary} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">フィードバックリクエスト</h4>
              <p className="text-sm text-gray-500">購入者にフィードバックを依頼</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.feedbackRequestEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              リクエスト遅延（日数）
            </label>
            <input
              type="number"
              defaultValue={data?.settings?.requestDelay || 7}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

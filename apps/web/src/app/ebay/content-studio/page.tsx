'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Palette,
  Type,
  FileText,
  Image,
  Layout,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Wand2,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  Zap,
  BarChart2,
  TrendingUp,
  Star,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ContentStudioPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Palette },
    { id: 'titles', name: 'タイトル', icon: Type },
    { id: 'descriptions', name: '説明文', icon: FileText },
    { id: 'images', name: '画像', icon: Image },
    { id: 'templates', name: 'テンプレート', icon: Layout },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Palette className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
                <p className="text-sm text-gray-500">コンテンツ作成・最適化</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                <Sparkles className="h-4 w-4 mr-2" />
                AI最適化
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
                    ? 'border-orange-500 text-orange-600'
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
        {activeTab === 'titles' && <TitlesTab />}
        {activeTab === 'descriptions' && <DescriptionsTab />}
        {activeTab === 'images' && <ImagesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/content-studio/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/content-studio/dashboard/recent`, fetcher);
  const { data: quality } = useSWR(`${API_BASE}/ebay/content-studio/dashboard/quality`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総リスティング</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.totalListings?.toLocaleString() || 0}</p>
            </div>
            <FileText className="h-12 w-12 text-gray-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">{overview?.optimizedListings?.toLocaleString() || 0} 最適化済み</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">品質スコア</p>
              <p className="text-3xl font-bold text-orange-600">{overview?.avgQualityScore || 0}%</p>
            </div>
            <Star className="h-12 w-12 text-orange-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">平均</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総画像</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.totalImages?.toLocaleString() || 0}</p>
            </div>
            <Image className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">登録済み</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI生成コンテンツ</p>
              <p className="text-3xl font-bold text-purple-600">{overview?.aiGeneratedContent?.toLocaleString() || 0}</p>
            </div>
            <Sparkles className="h-12 w-12 text-purple-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">件数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Breakdown */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">品質スコア詳細</h3>
          </div>
          <div className="p-6 space-y-4">
            {quality?.breakdown && Object.entries(quality.breakdown).map(([key, value]: [string, any]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                  <span className="text-sm font-medium text-gray-900">{value}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      value >= 90 ? 'bg-green-500' : value >= 80 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">最近の活動</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recent?.activities?.map((activity: any) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    activity.type.includes('generated') ? 'bg-purple-100' :
                    activity.type.includes('enhanced') ? 'bg-blue-100' :
                    activity.type.includes('updated') ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    {activity.type.includes('generated') ? (
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    ) : activity.type.includes('enhanced') ? (
                      <Image className="h-4 w-4 text-blue-600" />
                    ) : activity.type.includes('updated') ? (
                      <Edit className="h-4 w-4 text-green-600" />
                    ) : (
                      <Zap className="h-4 w-4 text-orange-600" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.listing}</p>
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

function TitlesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/content-studio/titles`, fetcher);
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimized': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs_work': return 'bg-yellow-100 text-yellow-800';
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
                className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">すべて</option>
                <option value="optimized">最適化済み</option>
                <option value="needs_work">要改善</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
            <Wand2 className="h-4 w-4 mr-2" />
            一括最適化
          </button>
        </div>
      </div>

      {/* Titles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">スコア</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">提案</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.titles?.map((title: any) => (
              <tr key={title.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{title.current}</p>
                  <p className="text-xs text-gray-500">{title.listingId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-medium ${
                    title.score >= 90 ? 'text-green-600' :
                    title.score >= 80 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {title.score}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-500">{title.suggestions}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(title.status)}`}>
                    {title.status === 'optimized' ? '最適化済み' : title.status === 'good' ? '良好' : '要改善'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-orange-600 hover:text-orange-900">
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
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

function DescriptionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/content-studio/descriptions`, fetcher);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="検索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
            <Wand2 className="h-4 w-4 mr-2" />
            一括生成
          </button>
        </div>
      </div>

      {/* Descriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">リスティング</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">文字数</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">スコア</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">HTML</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.descriptions?.map((desc: any) => (
              <tr key={desc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{desc.listingId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-500">{desc.length}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-medium ${
                    desc.score >= 85 ? 'text-green-600' :
                    desc.score >= 70 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {desc.score}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {desc.hasHtml ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    desc.status === 'optimized' ? 'bg-green-100 text-green-800' :
                    desc.status === 'good' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {desc.status === 'optimized' ? '最適化済み' : desc.status === 'good' ? '良好' : '要改善'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-orange-600 hover:text-orange-900">
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
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

function ImagesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/content-studio/images`, fetcher);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="検索..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              アップロード
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
              <Wand2 className="h-4 w-4 mr-2" />
              一括最適化
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">リスティング</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">画像数</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">品質</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">最適化</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.images?.map((img: any) => (
              <tr key={img.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{img.listingId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-500">{img.count}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-medium ${
                    img.avgQuality >= 90 ? 'text-green-600' :
                    img.avgQuality >= 75 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {img.avgQuality}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {img.optimized ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    img.status === 'excellent' ? 'bg-green-100 text-green-800' :
                    img.status === 'good' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {img.status === 'excellent' ? '優秀' : img.status === 'good' ? '良好' : '要改善'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-orange-600 hover:text-orange-900">
                      <Wand2 className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
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
  const { data } = useSWR(`${API_BASE}/ebay/content-studio/templates`, fetcher);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">テンプレート管理</h3>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          テンプレート作成
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  template.type === 'description' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {template.type === 'description' ? '説明文' : 'タイトル'}
                </span>
                <h4 className="mt-2 text-sm font-medium text-gray-900">{template.name}</h4>
                <p className="mt-1 text-xs text-gray-500">カテゴリ: {template.category}</p>
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
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">使用回数: {template.usageCount.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/content-studio/settings/general`, fetcher);
  const { data: aiSettings } = useSWR(`${API_BASE}/ebay/content-studio/settings/ai`, fetcher);

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
              <h4 className="text-sm font-medium text-gray-900">自動最適化</h4>
              <p className="text-sm text-gray-500">新規リスティングを自動最適化</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoOptimize} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">タイトル最大長</label>
            <input
              type="number"
              defaultValue={data?.settings?.titleMaxLength || 80}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">説明文最小長</label>
            <input
              type="number"
              defaultValue={data?.settings?.descriptionMinLength || 500}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">AI設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">モデル</label>
            <select
              defaultValue={aiSettings?.settings?.model}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">トーン</label>
            <select
              defaultValue={aiSettings?.settings?.tone}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="professional">プロフェッショナル</option>
              <option value="casual">カジュアル</option>
              <option value="friendly">フレンドリー</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">言語</label>
            <select
              defaultValue={aiSettings?.settings?.language}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="en">英語</option>
              <option value="ja">日本語</option>
              <option value="de">ドイツ語</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

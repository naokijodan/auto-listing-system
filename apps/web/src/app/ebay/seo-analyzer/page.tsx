'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  Filter,
  Zap,
  FileText,
  BarChart3,
  Target,
  RefreshCw,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SeoAnalyzerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Search },
    { id: 'listings', label: 'リスティング', icon: FileText },
    { id: 'keywords', label: 'キーワード', icon: Target },
    { id: 'bulk', label: '一括最適化', icon: Zap },
    { id: 'competitors', label: '競合分析', icon: BarChart3 },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">SEO Analyzer</h1>
                <p className="text-sm text-gray-500">SEO分析・最適化</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <RefreshCw className="w-4 h-4" />
                全件分析
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
                      ? 'border-indigo-600 text-indigo-600'
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
        {activeTab === 'listings' && <ListingsTab />}
        {activeTab === 'keywords' && <KeywordsTab />}
        {activeTab === 'bulk' && <BulkTab />}
        {activeTab === 'competitors' && <CompetitorsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/seo-analyzer/dashboard/overview`, fetcher);
  const { data: issues } = useSWR(`${API_BASE}/ebay/seo-analyzer/dashboard/top-issues`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/seo-analyzer/dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均SEOスコア</p>
              <p className="text-3xl font-bold text-indigo-600">{overview?.avgSeoScore || 0}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">優秀</p>
              <p className="text-3xl font-bold text-green-600">{overview?.excellentListings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">改善必要</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.needsWorkListings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最近の最適化</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.recentOptimizations || 0}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Issues */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">主要な問題</h3>
        <div className="space-y-4">
          {issues?.issues?.map((issue: any) => (
            <div key={issue.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  issue.severity === 'high' ? 'bg-red-100' :
                  issue.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    issue.severity === 'high' ? 'text-red-600' :
                    issue.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{issue.description}</p>
                  <p className="text-sm text-gray-500">{issue.count}件のリスティング</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${
                issue.severity === 'high' ? 'bg-red-100 text-red-700' :
                issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {issue.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">トレンド</h3>
        <div className="space-y-3">
          {trends?.weekly?.map((week: any) => (
            <div key={week.week} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-600">{week.week}</span>
              <div className="flex items-center gap-4">
                <span className="text-indigo-600 font-medium">スコア: {week.avgScore}</span>
                <span className="text-green-600">{week.optimized}件最適化</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/seo-analyzer/listings`, fetcher);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">総合</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">タイトル</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">説明</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">画像</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">詳細</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.listings?.map((listing: any) => (
              <tr key={listing.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{listing.title}</p>
                  <p className="text-sm text-gray-500">{listing.issues}件の問題</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(listing.seoScore)}`}>
                    {listing.seoScore}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm">{listing.titleScore}</td>
                <td className="px-6 py-4 text-center text-sm">{listing.descriptionScore}</td>
                <td className="px-6 py-4 text-center text-sm">{listing.imageScore}</td>
                <td className="px-6 py-4 text-center text-sm">{listing.specificScore}</td>
                <td className="px-6 py-4">
                  <button className="text-indigo-600 hover:text-indigo-800">分析</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeywordsTab() {
  const { data: trending } = useSWR(`${API_BASE}/ebay/seo-analyzer/keywords/trending`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">キーワードリサーチ</h3>
        <div className="flex gap-4">
          <input type="text" placeholder="キーワードを入力..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2" />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">検索</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">トレンドキーワード</h3>
        <div className="space-y-3">
          {trending?.trending?.map((keyword: any) => (
            <div key={keyword.keyword} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{keyword.keyword}</p>
                <p className="text-sm text-gray-500">検索ボリューム: {keyword.volume}</p>
              </div>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{keyword.growth}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BulkTab() {
  const { data } = useSWR(`${API_BASE}/ebay/seo-analyzer/bulk/suggestions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">一括最適化</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">分析</button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">最適化実行</button>
          </div>
        </div>
        <p className="text-gray-600 mb-4">
          潜在的な改善: 平均 +{data?.totalPotentialImprovement || 0}ポイント
        </p>
        <div className="space-y-3">
          {data?.suggestions?.map((suggestion: any) => (
            <div key={suggestion.listingId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">リスティング {suggestion.listingId}</p>
                <p className="text-sm text-gray-500">{suggestion.changes?.join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">現在: {suggestion.currentScore}</p>
                <p className="text-sm text-green-600">改善後: {suggestion.potentialScore}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/seo-analyzer/competitors/analysis`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">競合分析</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">セラー</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">平均SEOスコア</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">平均タイトル長</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">平均画像数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">トップキーワード</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.competitors?.map((competitor: any) => (
                <tr key={competitor.seller}>
                  <td className="px-4 py-3 font-medium text-gray-900">{competitor.seller}</td>
                  <td className="px-4 py-3 text-center text-indigo-600 font-medium">{competitor.avgSeoScore}</td>
                  <td className="px-4 py-3 text-center">{competitor.avgTitleLength}</td>
                  <td className="px-4 py-3 text-center">{competitor.avgImageCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {competitor.topKeywords?.map((kw: string) => (
                        <span key={kw} className="px-2 py-1 bg-gray-100 rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ベンチマーク</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">{data?.benchmarks?.titleLength || 0}</p>
            <p className="text-sm text-gray-500">推奨タイトル長</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">{data?.benchmarks?.imageCount || 0}</p>
            <p className="text-sm text-gray-500">推奨画像数</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">{data?.benchmarks?.descriptionLength || 0}</p>
            <p className="text-sm text-gray-500">推奨説明文字数</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">{data?.benchmarks?.itemSpecifics || 0}</p>
            <p className="text-sm text-gray-500">推奨詳細数</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/seo-analyzer/settings/general`, fetcher);
  const { data: keywords } = useSWR(`${API_BASE}/ebay/seo-analyzer/settings/keywords`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">自動分析</p>
              <p className="text-sm text-gray-500">新規リスティングを自動的に分析</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoAnalyze} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">目標スコア</p>
              <p className="text-sm text-gray-500">SEOスコアの目標値</p>
            </div>
            <input type="number" defaultValue={general?.settings?.targetScore || 80} className="w-20 border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">最低スコアアラート</p>
              <p className="text-sm text-gray-500">アラートを発生させる最低スコア</p>
            </div>
            <input type="number" defaultValue={general?.settings?.minScoreAlert || 50} className="w-20 border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">キーワード設定</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 mb-2">主要キーワード</p>
            <div className="flex gap-2 flex-wrap">
              {keywords?.settings?.primaryKeywords?.map((kw: string) => (
                <span key={kw} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">{kw}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-2">除外キーワード</p>
            <div className="flex gap-2 flex-wrap">
              {keywords?.settings?.excludeKeywords?.map((kw: string) => (
                <span key={kw} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

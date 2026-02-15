'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Sparkles,
  FileText,
  Image,
  Tag,
  DollarSign,
  Search,
  TrendingUp,
  TrendingDown,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  Eye,
  BarChart,
  Plus,
  Edit,
  Wand2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ListingOptimizerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Sparkles },
    { id: 'listings', name: 'リスティング', icon: FileText },
    { id: 'title', name: 'タイトル', icon: Tag },
    { id: 'images', name: '画像', icon: Image },
    { id: 'keywords', name: 'キーワード', icon: Search },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Sparkles className="h-8 w-8 text-emerald-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Listing Optimizer</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
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
        {activeTab === 'listings' && <ListingsTab />}
        {activeTab === 'title' && <TitleTab />}
        {activeTab === 'images' && <ImagesTab />}
        {activeTab === 'keywords' && <KeywordsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/listing-optimizer/dashboard/overview`, fetcher);
  const { data: scores } = useSWR(`${API_BASE}/ebay/listing-optimizer/dashboard/scores`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/listing-optimizer/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">総リスティング</p>
              <p className="text-2xl font-bold">{overview?.totalListings?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">最適化済み</p>
              <p className="text-2xl font-bold">{overview?.optimizedListings?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">平均スコア</p>
              <p className="text-2xl font-bold">{overview?.avgOptimizationScore || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-amber-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">予測増収</p>
              <p className="text-2xl font-bold">¥{(overview?.estimatedRevenueIncrease || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">カテゴリ別スコア</h3>
          </div>
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-emerald-100">
                <span className="text-4xl font-bold text-emerald-600">{scores?.overall || 0}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">総合スコア</p>
            </div>
            <div className="space-y-4">
              {scores?.categories?.map((cat: any) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.name}</span>
                    <span className="font-medium">{cat.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        cat.score >= 80 ? 'bg-green-600' :
                        cat.score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">改善が必要</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {alerts?.alerts?.map((alert: any) => (
                <div key={alert.id} className={`p-4 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50' :
                  alert.severity === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
                      alert.severity === 'high' ? 'text-red-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.action}</p>
                    </div>
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

function ListingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-optimizer/listings`, fetcher);
  const [filter, setFilter] = useState('all');

  const filteredListings = data?.listings?.filter((l: any) => {
    return filter === 'all' || l.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {data?.filters?.map((f: string) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg ${
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全て' :
               f === 'optimized' ? '最適化済み' :
               f === 'needs_improvement' ? '要改善' :
               f === 'low_score' ? '低スコア' : '未処理'}
            </button>
          ))}
        </div>
        <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Zap className="h-5 w-5 mr-2" />
          一括最適化
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リスティング</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閲覧/売上</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredListings?.map((listing: any) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-sm text-gray-500">{listing.category}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        listing.score >= 80 ? 'bg-green-100' :
                        listing.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        <span className={`font-bold ${
                          listing.score >= 80 ? 'text-green-600' :
                          listing.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{listing.score}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      listing.status === 'optimized' ? 'bg-green-100 text-green-800' :
                      listing.status === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {listing.status === 'optimized' ? '最適化済み' :
                       listing.status === 'needs_improvement' ? '要改善' : '低スコア'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">¥{listing.price.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span>{listing.views.toLocaleString()}</span>
                      <span className="text-gray-300">/</span>
                      <span>{listing.sales}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="最適化">
                        <Wand2 className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="分析">
                        <BarChart className="h-5 w-5" />
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

function TitleTab() {
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const { data } = useSWR(
    selectedListing ? `${API_BASE}/ebay/listing-optimizer/title/suggestions/${selectedListing}` : null,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">タイトル最適化</h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">リスティングID</label>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="リスティングIDを入力..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setSelectedListing(e.target.value)}
            />
            <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              分析
            </button>
          </div>
        </div>

        {data && (
          <>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">現在のタイトル</p>
              <p className="font-medium">{data.currentTitle}</p>
            </div>

            <h4 className="font-medium mb-4">提案されたタイトル</h4>
            <div className="space-y-4">
              {data.suggestions?.map((suggestion: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg hover:border-emerald-500 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{suggestion.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{suggestion.reason}</p>
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        suggestion.score >= 90 ? 'bg-green-100 text-green-800' :
                        suggestion.score >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        スコア: {suggestion.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">キーワード分析</h4>
              <div className="flex flex-wrap gap-2">
                {data.keywords?.map((keyword: string) => (
                  <span key={keyword} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
              {data.missingKeywords?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">追加推奨キーワード:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.missingKeywords.map((keyword: string) => (
                      <span key={keyword} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        + {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">AIタイトル生成</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品情報</label>
            <textarea
              placeholder="商品の特徴を入力してください..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={4}
            ></textarea>
          </div>
          <button className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Wand2 className="h-5 w-5 mr-2" />
            タイトルを生成
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagesTab() {
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const { data } = useSWR(
    selectedListing ? `${API_BASE}/ebay/listing-optimizer/images/analysis/${selectedListing}` : null,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">画像分析</h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">リスティングID</label>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="リスティングIDを入力..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setSelectedListing(e.target.value)}
            />
            <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              分析
            </button>
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">現在の画像数</span>
                  <span className="font-bold text-lg">{data.analysis?.totalImages}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">推奨画像数</span>
                  <span className="font-bold text-lg text-emerald-600">{data.analysis?.recommendedImages}</span>
                </div>
              </div>
            </div>

            <h4 className="font-medium mb-4">画像品質スコア</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {data.analysis?.qualityScores?.map((img: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg text-center">
                  <div className={`w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                    img.score >= 80 ? 'bg-green-100' :
                    img.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <Image className={`h-8 w-8 ${
                      img.score >= 80 ? 'text-green-600' :
                      img.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <p className="font-bold">{img.score}</p>
                  <p className="text-xs text-gray-500">画像 {img.image}</p>
                  {img.issues?.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">{img.issues.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>

            {data.analysis?.issues?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">問題点</h4>
                <div className="space-y-2">
                  {data.analysis.issues.map((issue: any, index: number) => (
                    <div key={index} className="flex items-start p-3 bg-red-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">画像 {issue.image}</p>
                        <p className="text-sm text-red-700">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">改善提案</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {data.analysis?.suggestions?.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">画像強化</h3>
        <p className="text-sm text-gray-600 mb-4">AIを使用して画像の品質を自動的に向上させます。</p>
        <button className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Wand2 className="h-5 w-5 mr-2" />
          画像を強化
        </button>
      </div>
    </div>
  );
}

function KeywordsTab() {
  const { data: trends } = useSWR(`${API_BASE}/ebay/listing-optimizer/keywords/trends`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">キーワードトレンド</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {trends?.trends?.map((trend: any) => (
              <div key={trend.keyword} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  {trend.trend === 'rising' ? (
                    <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                  ) : trend.trend === 'declining' ? (
                    <TrendingDown className="h-5 w-5 text-red-600 mr-3" />
                  ) : (
                    <div className="w-5 h-5 mr-3 flex items-center justify-center">
                      <div className="w-3 h-0.5 bg-gray-400"></div>
                    </div>
                  )}
                  <span className="font-medium">{trend.keyword}</span>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <span className={`${
                    trend.change > 0 ? 'text-green-600' :
                    trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend.change > 0 ? '+' : ''}{trend.change}%
                  </span>
                  <span className="text-gray-500">検索: {trend.volume.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">キーワード分析</h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">リスティングIDまたはキーワード</label>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="入力..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/listing-optimizer/settings/general`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/listing-optimizer/settings/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">最適化しきい値</label>
              <input
                type="number"
                defaultValue={general?.settings?.optimizationThreshold}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">このスコア未満のリスティングを最適化対象とします</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">言語</label>
              <select
                defaultValue={general?.settings?.preferredLanguage}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { key: 'autoOptimize', label: '自動最適化を有効化' },
              { key: 'notifyOnLowScore', label: '低スコア時に通知' },
              { key: 'aiAssistEnabled', label: 'AIアシスタントを有効化' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={general?.settings?.[item.key]}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">最適化ルール</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {rules?.rules?.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-gray-500">条件: {rule.condition} → {rule.action}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={rule.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

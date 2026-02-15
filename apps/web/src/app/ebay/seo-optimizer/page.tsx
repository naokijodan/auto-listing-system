'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
  BarChart3,
  Lightbulb,
  Target,
  Zap,
  RefreshCw,
  Download,
  ChevronRight,
  Star,
  Eye,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabType = 'dashboard' | 'scores' | 'suggestions' | 'keywords' | 'templates' | 'rules';

export default function SeoOptimizerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [keywordQuery, setKeywordQuery] = useState('');

  const { data: stats } = useSWR(`${API_BASE}/ebay-seo-optimizer/stats`, fetcher);
  const { data: scoresData } = useSWR(`${API_BASE}/ebay-seo-optimizer/scores?limit=20`, fetcher);
  const { data: suggestionsData } = useSWR(`${API_BASE}/ebay-seo-optimizer/suggestions?status=pending`, fetcher);
  const { data: keywordsData } = useSWR(`${API_BASE}/ebay-seo-optimizer/keywords?limit=20`, fetcher);
  const { data: trendingData } = useSWR(`${API_BASE}/ebay-seo-optimizer/keywords/trending?limit=10`, fetcher);
  const { data: templatesData } = useSWR(`${API_BASE}/ebay-seo-optimizer/title-templates`, fetcher);
  const { data: rulesData } = useSWR(`${API_BASE}/ebay-seo-optimizer/rules`, fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'scores' as TabType, label: 'SEOスコア', icon: Target },
    { id: 'suggestions' as TabType, label: '最適化提案', icon: Lightbulb },
    { id: 'keywords' as TabType, label: 'キーワード', icon: Search },
    { id: 'templates' as TabType, label: 'タイトルテンプレート', icon: FileText },
    { id: 'rules' as TabType, label: 'SEOルール', icon: Settings },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">分析済み出品</p>
              <p className="text-2xl font-bold">{stats?.analyzedListings?.toLocaleString() || '-'}</p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">全{stats?.totalListings?.toLocaleString()}件中</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均SEOスコア</p>
              <p className="text-2xl font-bold">{stats?.averageScore || '-'}</p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">100点満点</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">高インパクト改善</p>
              <p className="text-2xl font-bold">{stats?.improvementOpportunities?.highImpact || '-'}</p>
            </div>
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">優先対応推奨</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">スコア分布</p>
              <p className="text-2xl font-bold">{stats?.scoreDistribution?.good?.count || '-'}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">Good以上の出品</p>
        </div>
      </div>

      {/* スコア分布 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">SEOスコア分布</h3>
        <div className="grid grid-cols-4 gap-4">
          {stats?.scoreDistribution && Object.entries(stats.scoreDistribution).map(([key, value]: [string, any]) => (
            <div key={key} className="text-center">
              <div className={`text-3xl font-bold ${
                key === 'excellent' ? 'text-green-600' :
                key === 'good' ? 'text-blue-600' :
                key === 'fair' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {value.count}
              </div>
              <div className="text-sm text-gray-500 capitalize">{key}</div>
              <div className="text-xs text-gray-400">{value.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* よくある問題 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">よくある問題 Top 5</h3>
        <div className="space-y-3">
          {stats?.topIssues?.map((issue: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                <div>
                  <p className="font-medium">{issue.issue}</p>
                  <p className="text-sm text-gray-500">{issue.count}件の出品に影響</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-sm">
                  影響度: {issue.avgImpact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* トレンドキーワード */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">トレンドキーワード</h3>
        <div className="flex flex-wrap gap-2">
          {trendingData?.trending?.map((keyword: any) => (
            <span
              key={keyword.id}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              {keyword.keyword}
              <span className="text-xs text-blue-500">({keyword.searchVolume.toLocaleString()})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScores = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">SEOスコア一覧</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          全件再分析
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">出品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリスコア</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">改善余地</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終分析</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scoresData?.scores?.map((score: any) => (
              <tr key={score.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{score.listingTitle}</div>
                  <div className="text-xs text-gray-500">{score.listingId}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score.overallScore)}`}>
                    {score.overallScore} - {getScoreLabel(score.overallScore)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {score.categoryScores?.slice(0, 4).map((cat: any) => (
                      <span
                        key={cat.category}
                        className={`px-2 py-0.5 rounded text-xs ${getScoreColor(cat.score)}`}
                        title={cat.category}
                      >
                        {cat.score}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">+{score.improvementPotential}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(score.lastAnalyzedAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedListing(score.listingId)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    詳細 <ChevronRight className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">最適化提案</h3>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2 text-sm">
            <option value="">すべてのタイプ</option>
            <option value="title">タイトル</option>
            <option value="description">説明文</option>
            <option value="keywords">キーワード</option>
            <option value="images">画像</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {suggestionsData?.suggestions?.map((suggestion: any) => (
          <div key={suggestion.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs uppercase">
                  {suggestion.type}
                </span>
                <span className="ml-2 text-sm text-gray-500">{suggestion.listingId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600">
                  期待効果: +{suggestion.expectedImpact}%
                </span>
                <span className="text-sm text-gray-400">
                  信頼度: {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">現在の値</p>
                <p className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-300">
                  {suggestion.currentValue}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">提案値</p>
                <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-300">
                  {suggestion.suggestedValue}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {suggestion.keywords?.map((kw: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {kw}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
                  却下
                </button>
                <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                  適用
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKeywords = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={keywordQuery}
              onChange={(e) => setKeywordQuery(e.target.value)}
              placeholder="キーワードを検索..."
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
          </div>
        </div>
        <select className="border rounded px-3 py-2">
          <option value="">すべてのカテゴリ</option>
          <option value="Watches">Watches</option>
          <option value="Camera Lenses">Camera Lenses</option>
          <option value="Electronics">Electronics</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          検索
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* キーワード一覧 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">キーワード一覧</h3>
          <div className="space-y-2">
            {keywordsData?.keywords?.map((keyword: any) => (
              <div key={keyword.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  {keyword.trending && <TrendingUp className="h-4 w-4 text-orange-500" />}
                  <div>
                    <p className="font-medium">{keyword.keyword}</p>
                    <p className="text-xs text-gray-500">
                      {keyword.category} | {keyword.source}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{keyword.searchVolume.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">検索数</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getCompetitionColor(keyword.competition)}`}>
                    {keyword.competition}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm">{keyword.relevanceScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* トレンドキーワード */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            トレンドキーワード
          </h3>
          <div className="space-y-2">
            {trendingData?.trending?.map((keyword: any, index: number) => (
              <div key={keyword.id} className="flex items-center justify-between p-3 bg-orange-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{keyword.keyword}</p>
                    <p className="text-xs text-gray-500">{keyword.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{keyword.searchVolume.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">タイトルテンプレート</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + 新規テンプレート
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templatesData?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                {template.category && (
                  <span className="text-xs text-gray-500">{template.category}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{template.usageCount}回使用</span>
                <span className={`px-2 py-1 rounded text-xs ${getScoreColor(template.avgScore)}`}>
                  平均{template.avgScore}点
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded mb-3">
              <p className="text-sm font-mono text-gray-600">{template.pattern}</p>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">出力例:</p>
              <p className="text-sm">{template.exampleOutput}</p>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {template.variables?.map((v: string) => (
                <span key={v} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {`{${v}}`}
                </span>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm">
                編集
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                使用
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">SEOルール設定</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + 新規ルール
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">有効</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ルール名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">条件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重み</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rulesData?.rules?.map((rule: any) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                  {rule.customMessage && (
                    <div className="text-xs text-gray-500">{rule.customMessage}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {rule.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{rule.condition}</code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${rule.weight}%` }}
                      />
                    </div>
                    <span className="text-sm">{rule.weight}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                    <button className="text-red-600 hover:text-red-800 text-sm">削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'scores':
        return renderScores();
      case 'suggestions':
        return renderSuggestions();
      case 'keywords':
        return renderKeywords();
      case 'templates':
        return renderTemplates();
      case 'rules':
        return renderRules();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SEO Optimizer</h1>
              <p className="text-sm text-gray-500">eBay出品のSEO最適化・キーワードリサーチ</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                レポート
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                一括最適化
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        {renderContent()}
      </div>
    </div>
  );
}

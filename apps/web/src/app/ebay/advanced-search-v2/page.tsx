// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Search,
  Filter,
  Save,
  History,
  Settings,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  FileText,
  ChevronRight,
  X,
  Star,
  Download,
  Clock,
  Trash2,
  TrendingUp,
  Sliders,
} from 'lucide-react';

interface SavedSearch {
  id: string;
  name: string;
  type: string;
  filters: Record<string, any>;
  createdAt: string;
  lastUsed: string;
}

interface SearchHistory {
  id: string;
  query: string;
  type: string;
  resultsCount: number;
  timestamp: string;
}

export default function AdvancedSearchV2Page() {
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'history' | 'analytics' | 'settings'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});

  const { data: savedSearchesData } = useSWR<{ savedSearches: SavedSearch[] }>(
    '/api/ebay-advanced-search-v2/saved',
    fetcher
  );

  const { data: historyData } = useSWR<{ history: SearchHistory[] }>(
    '/api/ebay-advanced-search-v2/history',
    fetcher
  );

  const { data: analyticsData } = useSWR(
    '/api/ebay-advanced-search-v2/analytics',
    fetcher
  );

  const { data: settingsData } = useSWR(
    '/api/ebay-advanced-search-v2/settings',
    fetcher
  );

  const savedSearches = savedSearchesData?.savedSearches ?? [];
  const history = historyData?.history ?? [];

  const tabs = [
    { id: 'search', label: '検索', icon: Search },
    { id: 'saved', label: '保存済み', icon: Star },
    { id: 'history', label: '履歴', icon: History },
    { id: 'analytics', label: '分析', icon: BarChart3 },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  const searchTypes = [
    { id: 'all', label: 'すべて', icon: Search },
    { id: 'products', label: '商品', icon: Package },
    { id: 'listings', label: '出品', icon: FileText },
    { id: 'orders', label: '注文', icon: ShoppingCart },
    { id: 'customers', label: '顧客', icon: Users },
    { id: 'messages', label: 'メッセージ', icon: MessageSquare },
  ];

  const getTypeIcon = (type: string) => {
    const found = searchTypes.find(t => t.id === type);
    return found ? found.icon : Search;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">高度検索</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              商品、出品、注文、顧客を検索
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-4 p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索キーワードを入力..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-lg"
            />
          </div>
          <Button variant="outline" size="lg" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-5 w-5 mr-1" />
            フィルター
          </Button>
          <Button variant="primary" size="lg">
            <Search className="h-5 w-5 mr-1" />
            検索
          </Button>
        </div>

        {/* Search Type */}
        <div className="mt-3 flex gap-2">
          {searchTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSearchType(type.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  searchType === type.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">カテゴリ</label>
                <select className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <option value="">すべて</option>
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home">Home</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">ステータス</label>
                <select className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <option value="">すべて</option>
                  <option value="active">アクティブ</option>
                  <option value="draft">下書き</option>
                  <option value="archived">アーカイブ</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">価格帯</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="最小" className="w-1/2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800" />
                  <input type="number" placeholder="最大" className="w-1/2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">日付範囲</label>
                <input type="date" className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800" />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFilters({})}>
                フィルターをクリア
              </Button>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                検索を保存
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'search' && (
          <div className="text-center py-12 text-zinc-500">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">検索キーワードを入力してください</p>
            <p className="text-sm">商品、出品、注文、顧客、メッセージを横断検索できます</p>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedSearches.map((search) => {
              const TypeIcon = getTypeIcon(search.type);
              return (
                <Card key={search.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">{search.name}</h4>
                        <p className="text-xs text-zinc-500">
                          {search.type} • 最終使用: {new Date(search.lastUsed).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm">
                        <Search className="h-4 w-4 mr-1" />
                        実行
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">"{item.query}"</p>
                      <p className="text-xs text-zinc-500">
                        {item.type} • {item.resultsCount}件 • {new Date(item.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            <div className="text-center pt-4">
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                履歴をクリア
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analyticsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{analyticsData.totalSearches}</p>
                <p className="text-sm text-zinc-500">総検索数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{analyticsData.uniqueQueries}</p>
                <p className="text-sm text-zinc-500">ユニーククエリ</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{analyticsData.avgResultsPerSearch}</p>
                <p className="text-sm text-zinc-500">平均結果数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{analyticsData.noResultsRate}%</p>
                <p className="text-sm text-zinc-500">結果なし率</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">人気の検索キーワード</h3>
              <div className="space-y-2">
                {analyticsData.topQueries?.map((q: any, index: number) => (
                  <div key={q.query} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-zinc-900 dark:text-white">{q.query}</span>
                    <span className="text-sm text-zinc-500">{q.count}回</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">タイプ別検索数</h3>
              <div className="space-y-2">
                {Object.entries(analyticsData.searchesByType || {}).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-zinc-500">{type}</span>
                    <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / analyticsData.totalSearches) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">検索設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">デフォルト検索タイプ</p>
                    <p className="text-xs text-zinc-500">検索時のデフォルトタイプ</p>
                  </div>
                  <select defaultValue={settingsData.defaultType} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    {searchTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">1ページあたりの結果数</p>
                    <p className="text-xs text-zinc-500">検索結果の表示数</p>
                  </div>
                  <select defaultValue={settingsData.resultsPerPage} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">マッチ部分をハイライト</p>
                    <p className="text-xs text-zinc-500">検索キーワードをハイライト表示</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.highlightMatches} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">あいまい検索</p>
                    <p className="text-xs text-zinc-500">類似キーワードも検索結果に含める</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.fuzzySearch} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">シノニム検索</p>
                    <p className="text-xs text-zinc-500">同義語も検索結果に含める</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.synonymsEnabled} className="toggle" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">検索履歴</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">検索履歴を保存</p>
                    <p className="text-xs text-zinc-500">最近の検索を履歴に保存</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.recentSearchesEnabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">履歴の最大保存数</p>
                    <p className="text-xs text-zinc-500">保存する履歴の最大数</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={settingsData.maxRecentSearches}
                    className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

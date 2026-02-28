
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  FolderTree,
  RefreshCw,
  Loader2,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Settings,
  FileText,
  ArrowRight,
  Tag,
  Layers,
  Target,
  Zap,
  Filter,
  Download,
  Upload,
  Eye,
  Link2,
} from 'lucide-react';

interface Category {
  id: string;
  categoryId: string;
  name: string;
  nameJa: string;
  level: string;
  parentId: string | null;
  path: string[];
  isLeaf: boolean;
  listingsCount: number;
  children: string[];
}

interface MappingRule {
  id: string;
  name: string;
  source: string;
  sourceCategory: string;
  sourceCategoryId: string;
  targetCategoryId: string;
  targetCategoryName: string;
  confidence: number;
  status: string;
  matchCount: number;
  lastUsed: string;
  keywords: string[];
  excludeKeywords: string[];
}

interface ItemSpecific {
  id: string;
  name: string;
  nameJa: string;
  type: string;
  valueType: string;
  values: string[];
}

interface Suggestion {
  id: string;
  productId: string;
  productTitle: string;
  suggestedCategories: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  selectedCategoryId: string | null;
  status: string;
}

const sourceLabels: Record<string, string> = {
  YAHOO_AUCTION: 'ヤフオク',
  MERCARI: 'メルカリ',
  AMAZON_JP: 'Amazon JP',
  RAKUTEN: '楽天',
  CUSTOM: 'カスタム',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  INACTIVE: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DEPRECATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const specificsTypeColors: Record<string, string> = {
  REQUIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RECOMMENDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OPTIONAL: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function EbayCategoryMappingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'mappings' | 'suggestions' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestInput, setSuggestInput] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestResults, setSuggestResults] = useState<any[]>([]);

  // Dashboard data
  const { data: dashboardData, mutate: mutateDashboard } = useSWR<any>('/api/ebay-category-mapping/dashboard', fetcher);

  // Categories
  const { data: categoriesData, mutate: mutateCategories } = useSWR<any>(
    activeTab === 'categories' ? `/api/ebay-category-mapping/categories?level=L1` : null,
    fetcher
  );

  // Mappings
  const { data: mappingsData, mutate: mutateMappings } = useSWR<any>(
    activeTab === 'mappings'
      ? `/api/ebay-category-mapping/mappings${sourceFilter ? `?source=${sourceFilter}` : ''}`
      : null,
    fetcher
  );

  // Suggestions
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR<any>(
    activeTab === 'suggestions' ? '/api/ebay-category-mapping/suggestions?status=PENDING' : null,
    fetcher
  );

  // Settings
  const { data: settingsData, mutate: mutateSettings } = useSWR<any>(
    activeTab === 'settings' ? '/api/ebay-category-mapping/settings' : null,
    fetcher
  );

  // Category details when selected
  const { data: categoryDetails } = useSWR<any>(
    selectedCategory ? `/api/ebay-category-mapping/categories/${selectedCategory.id}` : null,
    fetcher
  );

  const stats = dashboardData?.stats;

  // カテゴリ展開/折りたたみ
  const toggleCategory = async (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // AI推薦実行
  const handleSuggest = async () => {
    if (!suggestInput.trim()) return;

    setIsSuggesting(true);
    try {
      const response = await postApi('/api/ebay-category-mapping/suggest', {
        productTitle: suggestInput,
      });
      setSuggestResults((response as any).suggestions || []);
    } catch (error) {
      addToast({ type: 'error', message: 'カテゴリ推薦に失敗しました' });
    } finally {
      setIsSuggesting(false);
    }
  };

  // 推薦承認
  const handleAcceptSuggestion = async (suggestionId: string, categoryId: string) => {
    try {
      await postApi(`/api/ebay-category-mapping/suggestions/${suggestionId}/accept`, { categoryId });
      addToast({ type: 'success', message: '推薦を承認しました' });
      mutateSuggestions();
      mutateDashboard();
    } catch (error) {
      addToast({ type: 'error', message: '承認に失敗しました' });
    }
  };

  // 推薦却下
  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await postApi(`/api/ebay-category-mapping/suggestions/${suggestionId}/reject`, {
        reason: 'Manual rejection',
      });
      addToast({ type: 'success', message: '推薦を却下しました' });
      mutateSuggestions();
      mutateDashboard();
    } catch (error) {
      addToast({ type: 'error', message: '却下に失敗しました' });
    }
  };

  // マッピング削除
  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('このマッピングルールを削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-category-mapping/mappings/${mappingId}`);
      addToast({ type: 'success', message: 'マッピングを削除しました' });
      mutateMappings();
      mutateDashboard();
    } catch (error) {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  // カテゴリ同期
  const handleSync = async () => {
    try {
      await postApi('/api/ebay-category-mapping/sync', {});
      addToast({ type: 'success', message: 'カテゴリを同期しました' });
      mutateCategories();
      mutateDashboard();
    } catch (error) {
      addToast({ type: 'error', message: '同期に失敗しました' });
    }
  };

  // 設定更新
  const handleUpdateSettings = async (updates: Record<string, any>) => {
    try {
      await putApi('/api/ebay-category-mapping/settings', updates);
      addToast({ type: 'success', message: '設定を更新しました' });
      mutateSettings();
    } catch (error) {
      addToast({ type: 'error', message: '設定の更新に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: Layers },
    { id: 'categories', label: 'カテゴリツリー', icon: FolderTree },
    { id: 'mappings', label: 'マッピングルール', icon: Link2 },
    { id: 'suggestions', label: 'AI推薦', icon: Sparkles },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <FolderTree className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">カテゴリマッピング</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBayカテゴリの自動マッピングとItem Specifics管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSuggestModal(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            AI推薦テスト
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-1" />
            同期
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            マッピング追加
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                    <Link2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">マッピング数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.totalMappings}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">有効</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeMappings}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">カテゴリ数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.totalCategories}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">AI精度</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.aiSuggestionStats.accuracy}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">保留中</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.aiSuggestionStats.pending}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Source Distribution */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">ソース別マッピング</h3>
                <div className="space-y-2">
                  {Object.entries(stats.mappingsBySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {sourceLabels[source] || source}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-zinc-100 rounded-full dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${((count as number) / stats.totalMappings) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white w-8 text-right">
                          {count as number}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Categories */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">よく使うカテゴリ</h3>
                <div className="space-y-2">
                  {stats.topCategories.map((cat: any, index: number) => (
                    <div key={cat.categoryId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-4">{index + 1}</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {cat.count.toLocaleString()}件
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Pending Suggestions */}
            {dashboardData?.pendingSuggestions?.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
                  確認待ちの推薦 ({dashboardData.pendingSuggestions.length}件)
                </h3>
                <div className="space-y-2">
                  {dashboardData.pendingSuggestions.slice(0, 5).map((sug: Suggestion) => (
                    <div key={sug.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                          {sug.productTitle}
                        </p>
                        <p className="text-xs text-zinc-500">
                          推薦: {sug.suggestedCategories[0]?.categoryName}
                          <span className="ml-2 text-violet-600">
                            ({(sug.suggestedCategories[0]?.confidence * 100).toFixed(0)}%)
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcceptSuggestion(sug.id, sug.suggestedCategories[0]?.categoryId)}
                        >
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectSuggestion(sug.id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Category Tree */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white">カテゴリツリー</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="カテゴリ検索..."
                    className="pl-8 pr-3 py-1.5 text-sm border rounded-lg w-48 dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1 max-h-[500px] overflow-auto">
                {categoriesData?.categories
                  .filter((cat: Category) => cat.level === 'L1')
                  .map((category: Category) => (
                    <CategoryTreeItem
                      key={category.id}
                      category={category}
                      level={0}
                      expanded={expandedCategories.has(category.id)}
                      selected={selectedCategory?.id === category.id}
                      onToggle={() => toggleCategory(category.id)}
                      onSelect={() => setSelectedCategory(category)}
                    />
                  ))}
              </div>
            </Card>

            {/* Category Details */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">カテゴリ詳細</h3>
              {selectedCategory && categoryDetails ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">カテゴリ名</p>
                    <p className="font-medium text-zinc-900 dark:text-white">{categoryDetails.name}</p>
                    <p className="text-sm text-zinc-500">{categoryDetails.nameJa}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-1">パス</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {categoryDetails.path.map((p: string, i: number) => (
                        <div key={i} className="flex items-center">
                          {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-400 mx-1" />}
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">カテゴリID</p>
                      <p className="text-sm font-mono text-zinc-900 dark:text-white">{categoryDetails.categoryId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">レベル</p>
                      <span className="px-2 py-0.5 text-xs rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        {categoryDetails.level}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-1">出品数</p>
                    <p className="text-sm text-zinc-900 dark:text-white">{categoryDetails.listingsCount.toLocaleString()}件</p>
                  </div>

                  {/* Item Specifics */}
                  {categoryDetails.itemSpecifics?.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Item Specifics</p>
                      <div className="space-y-2">
                        {categoryDetails.itemSpecifics.map((spec: ItemSpecific) => (
                          <div key={spec.id} className="p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-zinc-900 dark:text-white">{spec.name}</span>
                              <span className={cn('px-1.5 py-0.5 text-xs rounded', specificsTypeColors[spec.type])}>
                                {spec.type}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">{spec.nameJa}</p>
                            {spec.values.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {spec.values.slice(0, 5).map((v, i) => (
                                  <span key={i} className="px-1.5 py-0.5 text-xs bg-zinc-200 rounded dark:bg-zinc-700">
                                    {v}
                                  </span>
                                ))}
                                {spec.values.length > 5 && (
                                  <span className="text-xs text-zinc-400">+{spec.values.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <FolderTree className="h-8 w-8 mb-2" />
                  <p className="text-sm">カテゴリを選択してください</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="マッピング検索..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              >
                <option value="">すべてのソース</option>
                <option value="YAHOO_AUCTION">ヤフオク</option>
                <option value="MERCARI">メルカリ</option>
                <option value="AMAZON_JP">Amazon JP</option>
                <option value="RAKUTEN">楽天</option>
                <option value="CUSTOM">カスタム</option>
              </select>
            </div>

            {/* Mapping List */}
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-xs text-zinc-500">
                    <th className="px-4 py-3 text-left font-medium">マッピング名</th>
                    <th className="px-4 py-3 text-left font-medium">ソース</th>
                    <th className="px-4 py-3 text-left font-medium">ソースカテゴリ</th>
                    <th className="px-4 py-3 text-left font-medium">eBayカテゴリ</th>
                    <th className="px-4 py-3 text-center font-medium">信頼度</th>
                    <th className="px-4 py-3 text-center font-medium">使用回数</th>
                    <th className="px-4 py-3 text-center font-medium">ステータス</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {mappingsData?.mappings.map((mapping: MappingRule) => (
                    <tr key={mapping.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{mapping.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                          {sourceLabels[mapping.source]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{mapping.sourceCategory}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{mapping.targetCategoryName}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'text-sm font-medium',
                          mapping.confidence >= 0.9 ? 'text-emerald-600' :
                          mapping.confidence >= 0.7 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {(mapping.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {mapping.matchCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 text-xs rounded', statusColors[mapping.status])}>
                          {mapping.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMapping(mapping.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">確認待ちの推薦</h3>
              {suggestionsData?.suggestions?.length > 0 ? (
                <div className="space-y-3">
                  {suggestionsData.suggestions.map((sug: Suggestion) => (
                    <div key={sug.id} className="p-3 border rounded-lg dark:border-zinc-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white">{sug.productTitle}</p>
                          <p className="text-xs text-zinc-500 mt-1">商品ID: {sug.productId}</p>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                          PENDING
                        </span>
                      </div>
                      <div className="space-y-2">
                        {sug.suggestedCategories.map((cat, index) => (
                          <div
                            key={cat.categoryId}
                            className={cn(
                              'flex items-center justify-between p-2 rounded',
                              index === 0 ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-zinc-50 dark:bg-zinc-800/50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {index === 0 && <Target className="h-4 w-4 text-violet-600" />}
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">{cat.categoryName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'text-sm font-medium',
                                cat.confidence >= 0.9 ? 'text-emerald-600' :
                                cat.confidence >= 0.7 ? 'text-amber-600' : 'text-red-600'
                              )}>
                                {(cat.confidence * 100).toFixed(0)}%
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcceptSuggestion(sug.id, cat.categoryId)}
                              >
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectSuggestion(sug.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          却下
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Sparkles className="h-8 w-8 mx-auto mb-2" />
                  <p>確認待ちの推薦はありません</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settingsData && (
          <div className="space-y-4 max-w-2xl">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">AI推薦設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">自動推薦</p>
                    <p className="text-xs text-zinc-500">商品登録時に自動でカテゴリを推薦</p>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings({ autoSuggestEnabled: !settingsData.autoSuggestEnabled })}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.autoSuggestEnabled ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.autoSuggestEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    推薦信頼度しきい値
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={settingsData.suggestConfidenceThreshold}
                    onChange={(e) => handleUpdateSettings({ suggestConfidenceThreshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    現在: {(settingsData.suggestConfidenceThreshold * 100).toFixed(0)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    自動承認しきい値
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1"
                    step="0.01"
                    value={settingsData.autoAcceptThreshold}
                    onChange={(e) => handleUpdateSettings({ autoAcceptThreshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    現在: {(settingsData.autoAcceptThreshold * 100).toFixed(0)}% 以上で自動承認
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">リーフカテゴリ優先</p>
                    <p className="text-xs text-zinc-500">最下層のカテゴリを優先的に推薦</p>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings({ preferLeafCategories: !settingsData.preferLeafCategories })}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.preferLeafCategories ? 'bg-violet-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.preferLeafCategories ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">同期設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    同期間隔（時間）
                  </label>
                  <select
                    value={settingsData.syncInterval}
                    onChange={(e) => handleUpdateSettings({ syncInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <option value="6">6時間</option>
                    <option value="12">12時間</option>
                    <option value="24">24時間</option>
                    <option value="48">48時間</option>
                    <option value="168">週1回</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">
                    最終同期: {new Date(settingsData.lastSyncAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* AI Suggest Test Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              AI カテゴリ推薦テスト
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  商品タイトル
                </label>
                <input
                  type="text"
                  value={suggestInput}
                  onChange={(e) => setSuggestInput(e.target.value)}
                  placeholder="例: SEIKO プレサージュ 自動巻き 腕時計"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSuggest}
                disabled={isSuggesting || !suggestInput.trim()}
                className="w-full"
              >
                {isSuggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                推薦を取得
              </Button>

              {suggestResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">推薦結果</p>
                  {suggestResults.map((result, index) => (
                    <div
                      key={result.categoryId}
                      className={cn(
                        'p-3 rounded-lg border',
                        index === 0 ? 'border-violet-300 bg-violet-50 dark:bg-violet-900/20' : 'dark:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{result.categoryName}</p>
                          <p className="text-xs text-zinc-500">{result.categoryPath?.join(' > ')}</p>
                        </div>
                        <span className={cn(
                          'text-lg font-bold',
                          result.confidence >= 0.9 ? 'text-emerald-600' :
                          result.confidence >= 0.7 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {(result.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {result.reason && (
                        <p className="text-xs text-zinc-500 mt-1">{result.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuggestModal(false);
                    setSuggestInput('');
                    setSuggestResults([]);
                  }}
                >
                  閉じる
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// カテゴリツリーアイテムコンポーネント
function CategoryTreeItem({
  category,
  level,
  expanded,
  selected,
  onToggle,
  onSelect,
}: {
  category: Category;
  level: number;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
          selected
            ? 'bg-violet-100 dark:bg-violet-900/30'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={onSelect}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-0.5 hover:bg-zinc-200 rounded dark:hover:bg-zinc-700"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <FolderTree className="h-4 w-4 text-zinc-400" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{category.nameJa || category.name}</span>
        <span className="text-xs text-zinc-400">{category.listingsCount}</span>
      </div>
    </div>
  );
}

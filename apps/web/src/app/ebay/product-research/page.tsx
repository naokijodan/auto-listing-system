// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Star,
  Target,
  Zap,
  AlertTriangle,
  Calendar,
  DollarSign,
  BarChart3,
  Sparkles,
  Eye,
  Bookmark,
  BookmarkCheck,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShoppingCart,
  Percent,
  Award,
  Flame,
  Leaf,
  Sun,
  Settings,
  ChevronRight,
  ExternalLink,
  LineChart,
} from 'lucide-react';

interface TrendingProduct {
  id: string;
  title: string;
  category: string;
  averagePrice: number;
  priceRange: { min: number; max: number };
  soldCount: number;
  soldCountChange: number;
  listingCount: number;
  sellThroughRate: number;
  averageDaysToSell: number;
  trendDirection: string;
  trendScore: number;
  competitionLevel: string;
  profitPotential: string;
  keywords: string[];
}

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description: string;
  potentialProfit: number;
  profitMargin: number;
  riskLevel: string;
  confidence: number;
  expiresIn: string;
}

interface SeasonalProduct {
  id: string;
  title: string;
  category: string;
  peakMonths: string[];
  currentDemand: number;
  peakDemand: number;
  daysUntilPeak: number;
  recommendedAction: string;
}

interface SavedResearch {
  id: string;
  name: string;
  type: string;
  keywords: string[];
  lastRunAt: string;
  resultCount: number;
}

const trendIcons: Record<string, any> = {
  UP: TrendingUp,
  DOWN: TrendingDown,
  STABLE: Minus,
};

const trendColors: Record<string, string> = {
  UP: 'text-emerald-600',
  DOWN: 'text-red-600',
  STABLE: 'text-zinc-500',
};

const competitionColors: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  VERY_HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const profitColors: Record<string, string> = {
  EXCELLENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  HIGH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

const opportunityTypeIcons: Record<string, any> = {
  PRICE_GAP: DollarSign,
  TRENDING_UP: TrendingUp,
  SUPPLY_SHORTAGE: AlertTriangle,
};

const riskColors: Record<string, string> = {
  LOW: 'text-emerald-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-red-600',
};

export default function EbayProductResearchPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'trending' | 'search' | 'opportunities' | 'seasonal' | 'saved' | 'settings'>('overview');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TrendingProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<TrendingProduct | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Dashboard data
  const { data: dashboardData, mutate: mutateDashboard } = useSWR('/api/ebay-product-research/dashboard', fetcher);

  // Trending products
  const { data: trendingData, mutate: mutateTrending } = useSWR(
    activeTab === 'trending' ? `/api/ebay-product-research/trending${categoryFilter ? `?category=${categoryFilter}` : ''}` : null,
    fetcher
  );

  // Opportunities
  const { data: opportunitiesData } = useSWR(
    activeTab === 'opportunities' ? '/api/ebay-product-research/opportunities' : null,
    fetcher
  );

  // Seasonal
  const { data: seasonalData } = useSWR(
    activeTab === 'seasonal' ? '/api/ebay-product-research/seasonal' : null,
    fetcher
  );

  // Saved researches
  const { data: savedData, mutate: mutateSaved } = useSWR(
    activeTab === 'saved' ? '/api/ebay-product-research/saved' : null,
    fetcher
  );

  // Categories
  const { data: categoriesData } = useSWR('/api/ebay-product-research/categories', fetcher);

  // Settings
  const { data: settingsData } = useSWR(
    activeTab === 'settings' ? '/api/ebay-product-research/settings' : null,
    fetcher
  );

  // Product analysis
  const { data: analysisData } = useSWR(
    selectedProduct ? `/api/ebay-product-research/analyze/${selectedProduct.id}` : null,
    fetcher
  );

  const stats = dashboardData?.stats;

  // 検索実行
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    try {
      const response = await postApi('/api/ebay-product-research/search', {
        keyword: searchKeyword,
        category: categoryFilter || undefined,
        sortBy: 'trendScore',
      });
      setSearchResults(response.results || []);
    } catch (error) {
      addToast({ type: 'error', message: '検索に失敗しました' });
    } finally {
      setIsSearching(false);
    }
  };

  // 調査を保存
  const handleSaveResearch = async () => {
    if (!searchKeyword.trim()) return;

    try {
      await postApi('/api/ebay-product-research/saved', {
        name: `${searchKeyword} 調査`,
        type: 'TRENDING',
        keywords: [searchKeyword],
        categories: categoryFilter ? [categoryFilter] : [],
        alerts: true,
      });
      addToast({ type: 'success', message: '調査を保存しました' });
      mutateSaved();
    } catch (error) {
      addToast({ type: 'error', message: '保存に失敗しました' });
    }
  };

  // 保存した調査を実行
  const handleRunSavedResearch = async (researchId: string) => {
    try {
      const response = await postApi(`/api/ebay-product-research/saved/${researchId}/run`, {});
      setSearchResults(response.results || []);
      setActiveTab('search');
      addToast({ type: 'success', message: '調査を実行しました' });
    } catch (error) {
      addToast({ type: 'error', message: '実行に失敗しました' });
    }
  };

  // 保存した調査を削除
  const handleDeleteSavedResearch = async (researchId: string) => {
    if (!confirm('この調査を削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-product-research/saved/${researchId}`);
      addToast({ type: 'success', message: '調査を削除しました' });
      mutateSaved();
    } catch (error) {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'trending', label: 'トレンド', icon: Flame },
    { id: 'search', label: '商品検索', icon: Search },
    { id: 'opportunities', label: '機会発見', icon: Target },
    { id: 'seasonal', label: '季節商品', icon: Sun },
    { id: 'saved', label: '保存済み', icon: Bookmark },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品調査</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              市場トレンド分析と機会発見
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutateDashboard()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
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
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
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
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">調査数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.totalResearches}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                    <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">機会発見</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.opportunitiesFound}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブアラート</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.activeAlerts}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">推定利益</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${stats.profitGenerated.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Top Trending */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">トレンド商品</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('trending')}>
                    すべて見る
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {dashboardData?.topTrending?.slice(0, 5).map((product: TrendingProduct) => {
                    const TrendIcon = trendIcons[product.trendDirection] || Minus;
                    return (
                      <div key={product.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {product.title}
                          </p>
                          <p className="text-xs text-zinc-500">{product.category}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className={cn('flex items-center', trendColors[product.trendDirection])}>
                            <TrendIcon className="h-4 w-4" />
                            <span className="text-sm font-medium ml-1">{product.trendScore}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Recent Opportunities */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">最近の機会</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('opportunities')}>
                    すべて見る
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {dashboardData?.recentOpportunities?.map((opp: Opportunity) => {
                    const OppIcon = opportunityTypeIcons[opp.type] || Target;
                    return (
                      <div key={opp.id} className="p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                        <div className="flex items-start gap-2">
                          <OppIcon className="h-4 w-4 text-orange-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{opp.title}</p>
                            <p className="text-xs text-zinc-500">{opp.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-emerald-600">
                                +${opp.potentialProfit} ({opp.profitMargin}%)
                              </span>
                              <span className={cn('text-xs', riskColors[opp.riskLevel])}>
                                リスク: {opp.riskLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Upcoming Seasonal */}
            {dashboardData?.upcomingSeasonal?.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
                  注目の季節商品
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {dashboardData.upcomingSeasonal.map((seasonal: SeasonalProduct) => (
                    <div key={seasonal.id} className="p-3 border rounded-lg dark:border-zinc-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{seasonal.title}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-2">{seasonal.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600">
                          ピークまで{seasonal.daysUntilPeak}日
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {seasonal.recommendedAction.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Top Categories */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">トップカテゴリ</h3>
              <div className="space-y-2">
                {stats.topCategories.map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{cat.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-500">{cat.searches} 検索</span>
                      <span className="text-sm font-medium text-emerald-600">{cat.opportunities} 機会</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              >
                <option value="">すべてのカテゴリ</option>
                {categoriesData?.categories.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {trendingData?.products.map((product: TrendingProduct) => {
                const TrendIcon = trendIcons[product.trendDirection] || Minus;
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      'p-4 cursor-pointer transition-colors',
                      selectedProduct?.id === product.id
                        ? 'ring-2 ring-orange-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    )}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-zinc-900 dark:text-white">{product.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {product.category}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.keywords?.slice(0, 5).map((kw, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-zinc-100 rounded dark:bg-zinc-800">
                              {kw}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-6 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-zinc-500">平均価格</p>
                            <p className="font-medium">${product.averagePrice.toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">販売数</p>
                            <p className="font-medium">{product.soldCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">販売率</p>
                            <p className="font-medium">{product.sellThroughRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">販売日数</p>
                            <p className="font-medium">{product.averageDaysToSell}日</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">競合</p>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded', competitionColors[product.competitionLevel])}>
                              {product.competitionLevel}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">利益ポテンシャル</p>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded', profitColors[product.profitPotential])}>
                              {product.profitPotential}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className={cn('flex items-center gap-1 text-lg font-bold', trendColors[product.trendDirection])}>
                          <TrendIcon className="h-5 w-5" />
                          <span>{product.trendScore}</span>
                        </div>
                        <span className={cn(
                          'text-xs flex items-center',
                          product.soldCountChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {product.soldCountChange >= 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(product.soldCountChange)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="商品名、キーワード、ブランドを検索..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              >
                <option value="">すべてのカテゴリ</option>
                {categoriesData?.categories.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <Button variant="primary" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
              {searchKeyword && (
                <Button variant="outline" onClick={handleSaveResearch}>
                  <Bookmark className="h-4 w-4 mr-1" />
                  保存
                </Button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {searchResults.map((product) => {
                  const TrendIcon = trendIcons[product.trendDirection] || Minus;
                  return (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-zinc-900 dark:text-white">{product.title}</h3>
                          <p className="text-sm text-zinc-500">{product.category}</p>
                          <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                            <div>
                              <p className="text-xs text-zinc-500">平均価格</p>
                              <p className="font-medium">${product.averagePrice.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">販売率</p>
                              <p className="font-medium">{product.sellThroughRate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">競合</p>
                              <span className={cn('text-xs px-1.5 py-0.5 rounded', competitionColors[product.competitionLevel])}>
                                {product.competitionLevel}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">利益</p>
                              <span className={cn('text-xs px-1.5 py-0.5 rounded', profitColors[product.profitPotential])}>
                                {product.profitPotential}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={cn('flex items-center gap-1 text-lg font-bold', trendColors[product.trendDirection])}>
                          <TrendIcon className="h-5 w-5" />
                          <span>{product.trendScore}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12 text-zinc-400">
                <Search className="h-12 w-12 mx-auto mb-4" />
                <p>キーワードを入力して商品を検索</p>
              </div>
            )}
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            {opportunitiesData?.opportunities.map((opp: Opportunity) => {
              const OppIcon = opportunityTypeIcons[opp.type] || Target;
              return (
                <Card key={opp.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      opp.type === 'PRICE_GAP' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      opp.type === 'TRENDING_UP' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'
                    )}>
                      <OppIcon className={cn(
                        'h-5 w-5',
                        opp.type === 'PRICE_GAP' ? 'text-emerald-600' :
                        opp.type === 'TRENDING_UP' ? 'text-blue-600' :
                        'text-amber-600'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{opp.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">
                            信頼度: {opp.confidence}%
                          </span>
                          <span className="text-sm text-amber-600">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {opp.expiresIn}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 mb-2">{opp.description}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-emerald-600">
                          +${opp.potentialProfit}
                        </span>
                        <span className="text-sm text-zinc-500">
                          利益率 {opp.profitMargin}%
                        </span>
                        <span className={cn('text-sm', riskColors[opp.riskLevel])}>
                          リスク: {opp.riskLevel}
                        </span>
                      </div>
                    </div>
                    <Button variant="primary" size="sm">
                      詳細
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Seasonal Tab */}
        {activeTab === 'seasonal' && (
          <div className="space-y-4">
            {seasonalData?.products.map((seasonal: SeasonalProduct & { urgency?: string }) => (
              <Card key={seasonal.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="h-5 w-5 text-orange-500" />
                      <h3 className="font-medium text-zinc-900 dark:text-white">{seasonal.title}</h3>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        seasonal.urgency === 'HIGH' ? 'bg-red-100 text-red-700' :
                        seasonal.urgency === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-zinc-100 text-zinc-700'
                      )}>
                        {seasonal.urgency === 'HIGH' ? '緊急' :
                         seasonal.urgency === 'MEDIUM' ? '準備' : '計画'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">{seasonal.category}</p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500">ピーク月</p>
                        <p className="font-medium">{seasonal.peakMonths.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">現在の需要</p>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${seasonal.currentDemand}%` }}
                            />
                          </div>
                          <span className="text-xs">{seasonal.currentDemand}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">ピークまで</p>
                        <p className="font-medium text-amber-600">{seasonal.daysUntilPeak}日</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">推奨アクション</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {seasonal.recommendedAction.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedData?.researches.length > 0 ? (
              savedData.researches.map((research: SavedResearch) => (
                <Card key={research.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-orange-500" />
                        <h3 className="font-medium text-zinc-900 dark:text-white">{research.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                          {research.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                        <span>キーワード: {research.keywords.join(', ')}</span>
                        {research.lastRunAt && (
                          <span>最終実行: {new Date(research.lastRunAt).toLocaleString('ja-JP')}</span>
                        )}
                        <span>結果: {research.resultCount}件</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRunSavedResearch(research.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        実行
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSavedResearch(research.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <Bookmark className="h-12 w-12 mx-auto mb-4" />
                <p>保存された調査はありません</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">アラート設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">アラート通知</p>
                    <p className="text-xs text-zinc-500">条件に合う商品が見つかったら通知</p>
                  </div>
                  <button
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.alertsEnabled ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.alertsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    トレンドスコアしきい値
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={settingsData.alertThreshold?.trendScore || 80}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    現在: {settingsData.alertThreshold?.trendScore || 80}以上
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">表示設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    通貨
                  </label>
                  <select
                    value={settingsData.currency}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    仕入れ地域
                  </label>
                  <select
                    value={settingsData.sourcingRegion}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <option value="JP">日本</option>
                    <option value="US">アメリカ</option>
                    <option value="EU">ヨーロッパ</option>
                    <option value="CN">中国</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">自動更新</p>
                    <p className="text-xs text-zinc-500">データを定期的に更新</p>
                  </div>
                  <button
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.autoRefresh ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

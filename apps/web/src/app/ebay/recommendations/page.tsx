'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Sparkles,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  Users,
  Package,
  RefreshCw,
  Loader2,
  Search,
  Settings,
  Zap,
  Link as LinkIcon,
  Percent,
  BarChart3,
  Brain,
  Target,
  Gift,
} from 'lucide-react';

interface DashboardData {
  success: boolean;
  stats: {
    totalRecommendations: number;
    clickThroughRate: number;
    conversionRate: number;
    revenueFromRecommendations: number;
    averageOrderValueLift: number;
    topPerformingType: string;
  };
  typePerformance: Array<{
    type: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cvr: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  totalListings: number;
  listingsWithRecommendations: number;
}

interface RecommendationType {
  code: string;
  name: string;
  description: string;
}

interface TrendingProduct {
  listingId: string;
  title: string;
  price: number;
  image?: string;
  category?: string;
  trendScore: number;
  metrics: {
    viewsToday: number;
    viewsGrowth: number;
    watchlistAdds: number;
    salesVelocity: string;
  };
}

const typeIcons: Record<string, typeof Sparkles> = {
  SIMILAR: Package,
  CROSS_SELL: ShoppingCart,
  UPSELL: ArrowUpRight,
  FREQUENTLY_BOUGHT: Users,
  TRENDING: TrendingUp,
  VIEWED_ALSO: Search,
  PERSONALIZED: Target,
};

const typeColors: Record<string, string> = {
  SIMILAR: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CROSS_SELL: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPSELL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  FREQUENTLY_BOUGHT: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  TRENDING: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VIEWED_ALSO: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PERSONALIZED: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function EbayRecommendationsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trending' | 'cross-sell' | 'bundles' | 'settings'>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [bundleDiscount, setBundleDiscount] = useState(10);

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/ebay-recommendations/dashboard',
    fetcher
  );

  // Recommendation types
  const { data: typesData } = useSWR<{ success: boolean; types: RecommendationType[] }>(
    '/api/ebay-recommendations/types',
    fetcher
  );

  // Trending products
  const { data: trendingData, isLoading: trendingLoading } = useSWR<{ success: boolean; trending: TrendingProduct[] }>(
    activeTab === 'trending' ? '/api/ebay-recommendations/trending?limit=20' : null,
    fetcher
  );

  // Cross-sell pairs
  const { data: crossSellData, isLoading: crossSellLoading, mutate: mutateCrossSell } = useSWR<{ success: boolean; pairs: any[] }>(
    activeTab === 'cross-sell' ? '/api/ebay-recommendations/cross-sell-pairs' : null,
    fetcher
  );

  // Settings
  const { data: settingsData, mutate: mutateSettings } = useSWR<{ success: boolean; settings: any }>(
    activeTab === 'settings' ? '/api/ebay-recommendations/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;
  const typePerformance = dashboardData?.typePerformance || [];
  const weeklyTrend = dashboardData?.weeklyTrend || [];
  const types = typesData?.types || [];
  const trending = trendingData?.trending || [];
  const crossSellPairs = crossSellData?.pairs || [];
  const settings = settingsData?.settings;

  // バンドル提案を生成
  const handleGenerateBundle = async () => {
    if (selectedListings.length < 2) {
      addToast({ type: 'error', message: '2件以上の商品を選択してください' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await postApi('/api/ebay-recommendations/suggest-bundle', {
        listingIds: selectedListings,
        discountPercent: bundleDiscount,
      }) as any;

      addToast({
        type: 'success',
        message: `バンドル「${response.bundle.name}」を作成しました（$${response.bundle.bundlePrice.toFixed(2)}）`,
      });
      setSelectedListings([]);
    } catch {
      addToast({ type: 'error', message: 'バンドル生成に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 設定更新
  const handleUpdateSettings = async (key: string, value: any) => {
    try {
      await postApi('/api/ebay-recommendations/settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
      mutateSettings();
      addToast({ type: 'success', message: '設定を更新しました' });
    } catch {
      addToast({ type: 'error', message: '設定の更新に失敗しました' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品推奨エンジン</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              類似商品・クロスセル・アップセル
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutateDashboard()}
            disabled={dashboardLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', dashboardLoading && 'animate-spin')} />
            更新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {[
          { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
          { id: 'trending', label: 'トレンド', icon: TrendingUp },
          { id: 'cross-sell', label: 'クロスセル', icon: LinkIcon },
          { id: 'bundles', label: 'バンドル', icon: Gift },
          { id: 'settings', label: '設定', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">総推奨数</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {stats?.totalRecommendations.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">CTR</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {stats?.clickThroughRate || 0}%
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                  <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">CVR</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {stats?.conversionRate || 0}%
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">推奨売上</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    ${stats?.revenueFromRecommendations.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">AOV上昇</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    +{stats?.averageOrderValueLift || 0}%
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-900/30">
                  <Zap className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">最高効果</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {stats?.topPerformingType || '-'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Type Performance */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              推奨タイプ別パフォーマンス
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-2 px-3 font-medium text-zinc-500">タイプ</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">インプレッション</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">クリック</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">CTR</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">コンバージョン</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">CVR</th>
                    <th className="text-right py-2 px-3 font-medium text-zinc-500">売上</th>
                  </tr>
                </thead>
                <tbody>
                  {typePerformance.map((perf) => {
                    const Icon = typeIcons[perf.type] || Sparkles;
                    const typeInfo = types.find(t => t.code === perf.type);
                    return (
                      <tr key={perf.type} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('p-1.5 rounded', typeColors[perf.type])}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {typeInfo?.name || perf.type}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 text-zinc-600 dark:text-zinc-400">
                          {perf.impressions.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3 text-zinc-600 dark:text-zinc-400">
                          {perf.clicks.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            perf.ctr >= 12 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                          )}>
                            {perf.ctr}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-3 text-zinc-600 dark:text-zinc-400">
                          {perf.conversions}
                        </td>
                        <td className="text-right py-3 px-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            perf.cvr >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                          )}>
                            {perf.cvr}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-3 font-medium text-zinc-900 dark:text-white">
                          ${perf.revenue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Weekly Trend Chart */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              週別トレンド
            </h3>
            <div className="h-64 flex items-end gap-2">
              {weeklyTrend.map((week, index) => {
                const maxRevenue = Math.max(...weeklyTrend.map(w => w.revenue));
                const height = (week.revenue / maxRevenue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-zinc-500">{week.week}</span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      ${week.revenue}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Trending Tab */}
      {activeTab === 'trending' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              トレンド商品
            </h3>
            {trendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {trending.map((product, index) => (
                  <Card key={product.listingId} className="p-3 hover:shadow-md transition-shadow">
                    <div className="relative">
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                        #{index + 1}
                      </div>
                      <div className="h-32 bg-zinc-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-zinc-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {product.title}
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      ${product.price.toFixed(2)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>スコア: {product.trendScore}</span>
                      <span className="text-emerald-600">+{product.metrics.viewsGrowth}%</span>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-zinc-400">
                      <span>{product.metrics.viewsToday} views</span>
                      <span>{product.metrics.watchlistAdds} watch</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Cross-sell Tab */}
      {activeTab === 'cross-sell' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                クロスセルペア
              </h3>
              <Button variant="primary" size="sm">
                <LinkIcon className="h-4 w-4 mr-1" />
                新規ペア作成
              </Button>
            </div>
            {crossSellLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : crossSellPairs.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">クロスセルペアがありません</p>
                <p className="text-sm text-zinc-400 mt-2">
                  一緒に購入されやすい商品をペアに設定しましょう
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {crossSellPairs.map((pair) => (
                  <div
                    key={pair.id}
                    className="flex items-center gap-4 p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {pair.source.title}
                      </p>
                      <p className="text-sm text-zinc-500">${pair.source.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-purple-500" />
                      {pair.discount && (
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded">
                          {pair.discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {pair.target.title}
                      </p>
                      <p className="text-sm text-zinc-500">${pair.target.price.toFixed(2)}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      pair.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-600'
                    )}>
                      {pair.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bundles Tab */}
      {activeTab === 'bundles' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              バンドル作成
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-500 mb-2">
                  バンドルに含める商品を選択してください（2件以上）
                </p>
                <div className="border border-zinc-200 rounded-lg p-4 min-h-[200px] dark:border-zinc-700">
                  {selectedListings.length === 0 ? (
                    <p className="text-zinc-400 text-center py-8">
                      商品が選択されていません
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedListings.map((id) => (
                        <div key={id} className="flex items-center justify-between p-2 bg-zinc-50 rounded dark:bg-zinc-800">
                          <span className="text-sm">{id.slice(0, 20)}...</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedListings(prev => prev.filter(i => i !== id))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      バンドル割引率
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={bundleDiscount}
                        onChange={(e) => setBundleDiscount(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-bold text-purple-600 w-16 text-right">
                        {bundleDiscount}%
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleGenerateBundle}
                    disabled={isGenerating || selectedListings.length < 2}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Gift className="h-4 w-4 mr-2" />
                    )}
                    バンドルを生成
                  </Button>
                  <p className="text-xs text-zinc-500">
                    AIが最適なバンドル名を自動生成します
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              推奨エンジン設定
            </h3>
            {settings && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                    推奨タイプの有効化
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'enableSimilar', label: '類似商品', icon: Package },
                      { key: 'enableCrossSell', label: 'クロスセル', icon: ShoppingCart },
                      { key: 'enableUpsell', label: 'アップセル', icon: ArrowUpRight },
                      { key: 'enableFrequentlyBought', label: 'よく一緒に購入', icon: Users },
                      { key: 'enableTrending', label: 'トレンド', icon: TrendingUp },
                      { key: 'enablePersonalized', label: 'パーソナライズ', icon: Target },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            settings[item.key]
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-zinc-200 dark:border-zinc-700'
                          )}
                          onClick={() => handleUpdateSettings(item.key, !settings[item.key])}
                        >
                          <Icon className={cn(
                            'h-5 w-5',
                            settings[item.key] ? 'text-purple-600' : 'text-zinc-400'
                          )} />
                          <span className={cn(
                            'text-sm font-medium',
                            settings[item.key] ? 'text-purple-700' : 'text-zinc-500'
                          )}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      デフォルトアルゴリズム
                    </label>
                    <select
                      value={settings.defaultAlgorithm}
                      onChange={(e) => handleUpdateSettings('defaultAlgorithm', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    >
                      <option value="HYBRID">ハイブリッド</option>
                      <option value="COLLABORATIVE">協調フィルタリング</option>
                      <option value="CONTENT_BASED">コンテンツベース</option>
                      <option value="AI_POWERED">AI推奨</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      商品あたりの最大推奨数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.maxRecommendationsPerListing}
                      onChange={(e) => handleUpdateSettings('maxRecommendationsPerListing', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      最小スコア閾値
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.minScoreThreshold}
                      onChange={(e) => handleUpdateSettings('minScoreThreshold', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      更新間隔（時間）
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.refreshInterval}
                      onChange={(e) => handleUpdateSettings('refreshInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">AI推奨</p>
                      <p className="text-sm text-zinc-500">GPT-4oを使用した高度な推奨</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-12 h-6 rounded-full cursor-pointer transition-colors',
                      settings.aiEnabled ? 'bg-purple-500' : 'bg-zinc-300'
                    )}
                    onClick={() => handleUpdateSettings('aiEnabled', !settings.aiEnabled)}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5',
                        settings.aiEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Award,
  Loader2,
  ShoppingBag,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';

interface CategoryRanking {
  category: string;
  soldCount: number;
  revenue: number;
  profit: number;
}

interface BrandRanking {
  brand: string;
  soldCount: number;
  revenue: number;
  profit: number;
}

interface SourcingSuggestion {
  type: 'brand' | 'seller' | 'category';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
}

interface RankingResponse {
  success: boolean;
  data: CategoryRanking[] | BrandRanking[];
}

interface SuggestionsResponse {
  success: boolean;
  data: SourcingSuggestion[];
}

const periodLabels = {
  week: '今週',
  month: '今月',
  year: '今年',
};

const priorityColors = {
  high: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  medium: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
  low: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
};

const priorityBadgeColors = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-600 text-white',
  low: 'bg-blue-600 text-white',
};

export default function BestsellersPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'category' | 'brand'>('category');

  // Fetch category rankings
  const { data: categoryResponse, isLoading: categoryLoading } = useSWR<RankingResponse>(
    `/api/analytics/rankings/category?period=${period}&limit=10`,
    fetcher,
    { refreshInterval: 300000 }
  );
  const categoryRankings = (categoryResponse?.data || []) as CategoryRanking[];

  // Fetch brand rankings
  const { data: brandResponse, isLoading: brandLoading } = useSWR<RankingResponse>(
    `/api/analytics/rankings/brand?period=${period}&limit=10`,
    fetcher,
    { refreshInterval: 300000 }
  );
  const brandRankings = (brandResponse?.data || []) as BrandRanking[];

  // Fetch sourcing suggestions
  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useSWR<SuggestionsResponse>(
    '/api/analytics/suggestions/sourcing',
    fetcher,
    { refreshInterval: 600000 }
  );
  const suggestions = suggestionsResponse?.data || [];

  const isLoading = categoryLoading || brandLoading;
  const rankings = activeTab === 'category' ? categoryRankings : brandRankings;

  // Calculate totals
  const totalRevenue = rankings.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = rankings.reduce((sum, item) => sum + item.profit, 0);
  const totalSold = rankings.reduce((sum, item) => sum + item.soldCount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">売れ筋分析</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            カテゴリ・ブランド別の売上ランキングと仕入れ提案
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{periodLabels[period]}の売上</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{periodLabels[period]}の粗利</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                ${totalProfit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{periodLabels[period]}の販売数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalSold}件</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rankings */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('category')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'category'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                )}
              >
                <BarChart3 className="mr-2 inline-block h-4 w-4" />
                カテゴリ別
              </button>
              <button
                onClick={() => setActiveTab('brand')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'brand'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                )}
              >
                <Award className="mr-2 inline-block h-4 w-4" />
                ブランド別
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : rankings.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                    データがありません
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rankings.map((item, index) => {
                    const name = 'category' in item ? item.category : item.brand;
                    const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

                    return (
                      <div
                        key={name}
                        className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                      >
                        {/* Rank */}
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                          index === 0 ? 'bg-amber-400 text-amber-900' :
                          index === 1 ? 'bg-zinc-300 text-zinc-700' :
                          index === 2 ? 'bg-amber-600 text-amber-100' :
                          'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                        )}>
                          {index + 1}
                        </div>

                        {/* Name and Bar */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate font-medium text-zinc-900 dark:text-white">
                              {name}
                            </p>
                            <p className="text-sm text-zinc-500">{percentage.toFixed(1)}%</p>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-right">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {item.soldCount}件
                            </p>
                            <p className="text-xs text-zinc-500">販売</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              ${item.revenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500">売上</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              ${item.profit.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500">粗利</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sourcing Suggestions */}
        <div>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                仕入れ提案
              </h2>
            </div>
            <div className="p-4">
              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="py-8 text-center">
                  <Lightbulb className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    売上データが蓄積されると提案が表示されます
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg border p-3',
                        priorityColors[suggestion.priority]
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'rounded px-2 py-0.5 text-xs font-medium',
                              priorityBadgeColors[suggestion.priority]
                            )}>
                              {suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {suggestion.type === 'brand' ? 'ブランド' :
                               suggestion.type === 'seller' ? 'セラー' : 'カテゴリ'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                            {suggestion.title}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {suggestion.description}
                          </p>
                        </div>
                        {suggestion.type === 'seller' && (
                          <button className="ml-2 rounded p-1 hover:bg-white/50 dark:hover:bg-black/20">
                            <ExternalLink className="h-4 w-4 text-zinc-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

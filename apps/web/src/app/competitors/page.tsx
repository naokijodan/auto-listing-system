'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Package,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';

interface CompetitorProduct {
  id: string;
  listingId: string;
  competitorUrl: string;
  competitorTitle: string;
  competitorPrice: number;
  competitorSeller: string;
  lastChecked: string;
  priceHistory: { price: number; date: string }[];
  createdAt: string;
  myTitle: string;
  myPrice: number;
  myImageUrl: string | null;
  priceDiff: number;
}

interface CompetitorsResponse {
  success: boolean;
  data: CompetitorProduct[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    lowerThanMe: number;
    higherThanMe: number;
    similar: number;
    avgPriceDiff: number;
  };
}

export default function CompetitorsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    listingId: '',
    competitorUrl: '',
    competitorTitle: '',
    competitorPrice: '',
    competitorSeller: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch competitors
  const { data: response, isLoading, mutate } = useSWR<CompetitorsResponse>(
    '/api/competitors?limit=100',
    fetcher,
    { refreshInterval: 60000 }
  );

  // Fetch stats
  const { data: statsResponse } = useSWR<StatsResponse>(
    '/api/competitors/stats',
    fetcher,
    { refreshInterval: 60000 }
  );

  const competitors = response?.data || [];
  const stats = statsResponse?.data;

  // Add competitor
  const handleAddCompetitor = async () => {
    if (!newCompetitor.listingId || !newCompetitor.competitorUrl) {
      alert('出品IDと競合URLは必須です');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: newCompetitor.listingId,
          competitorUrl: newCompetitor.competitorUrl,
          competitorTitle: newCompetitor.competitorTitle,
          competitorPrice: newCompetitor.competitorPrice ? Number(newCompetitor.competitorPrice) : undefined,
          competitorSeller: newCompetitor.competitorSeller,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewCompetitor({
          listingId: '',
          competitorUrl: '',
          competitorTitle: '',
          competitorPrice: '',
          competitorSeller: '',
        });
        mutate();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete competitor
  const handleDelete = async (id: string) => {
    if (!confirm('この競合商品を削除しますか？')) return;

    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        mutate();
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
  };

  const getPriceDiffIcon = (diff: number) => {
    if (diff < -1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (diff > 1) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    return <Minus className="h-4 w-4 text-zinc-400" />;
  };

  const getPriceDiffColor = (diff: number) => {
    if (diff < -1) return 'text-red-600 dark:text-red-400';
    if (diff > 1) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-zinc-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">競合モニタリング</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            競合商品の価格を追跡・比較
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          競合を追加
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">追跡中</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">競合が安い</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.lowerThanMe}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">自社が安い</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.higherThanMe}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">平均価格差</p>
                <p className={cn('text-xl font-bold', getPriceDiffColor(stats.avgPriceDiff))}>
                  {stats.avgPriceDiff >= 0 ? '+' : ''}${stats.avgPriceDiff.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">基本版について</p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              現在は手動での競合登録・価格更新が必要です。
              Phase 10以降で自動価格取得機能を実装予定です。
            </p>
          </div>
        </div>
      </div>

      {/* Competitors List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">競合商品一覧</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">
              競合商品が登録されていません
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              最初の競合を追加する
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {competitors.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {/* My Product Image */}
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {comp.myImageUrl ? (
                    <img
                      src={comp.myImageUrl}
                      alt={comp.myTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {comp.myTitle}
                  </h3>
                  <p className="truncate text-xs text-zinc-500">
                    競合: {comp.competitorTitle || comp.competitorSeller || '未設定'}
                  </p>
                </div>

                {/* Prices */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    ${comp.myPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">自社</p>
                </div>

                <div className="flex items-center gap-1">
                  {getPriceDiffIcon(comp.priceDiff)}
                </div>

                <div className="text-center">
                  <p className={cn('text-sm font-semibold', getPriceDiffColor(-comp.priceDiff))}>
                    ${comp.competitorPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">競合</p>
                </div>

                {/* Diff */}
                <div className="text-center">
                  <p className={cn('text-sm font-bold', getPriceDiffColor(comp.priceDiff))}>
                    {comp.priceDiff >= 0 ? '+' : ''}${comp.priceDiff.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">差額</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={comp.competitorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    title="競合ページを開く"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:hover:bg-red-900/20"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">競合商品を追加</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  自社出品ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompetitor.listingId}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, listingId: e.target.value })}
                  placeholder="cl..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  競合商品URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={newCompetitor.competitorUrl}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorUrl: e.target.value })}
                  placeholder="https://www.ebay.com/itm/..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  競合商品タイトル
                </label>
                <input
                  type="text"
                  value={newCompetitor.competitorTitle}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorTitle: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    競合価格 ($)
                  </label>
                  <input
                    type="number"
                    value={newCompetitor.competitorPrice}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorPrice: e.target.value })}
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    競合セラー名
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.competitorSeller}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorSeller: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddCompetitor}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

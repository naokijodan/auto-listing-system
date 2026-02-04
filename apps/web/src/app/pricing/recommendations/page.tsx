'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  TrendingDown,
  Check,
  X,
  Loader2,
  Package,
  DollarSign,
  Clock,
  Eye,
  AlertTriangle,
  Calculator,
  ChevronRight,
  Settings,
} from 'lucide-react';

interface PriceRecommendation {
  id: string;
  listingId: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number;
  recommendedPrice: number;
  reason: string;
  reasonCode: 'stale_30' | 'stale_60' | 'stale_90' | 'low_views' | 'competitive' | 'profit_optimize';
  expectedProfitChange: number;
  discountPercent: number;
  daysSinceListed: number;
  views: number;
  costPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface RecommendationsResponse {
  success: boolean;
  data: PriceRecommendation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  stats: {
    total: number;
    totalPotentialSavings: number;
    byReason: {
      stale_30: number;
      stale_60: number;
      stale_90: number;
      low_views: number;
    };
  };
}

interface SimulationResult {
  listingId: string;
  currentPrice: number;
  newPrice: number;
  costPrice: number;
  currentProfit: number;
  newProfit: number;
  profitChange: number;
  profitMarginCurrent: number;
  profitMarginNew: number;
  priceChangePercent: number;
  isBelowCost: boolean;
  isLowMargin: boolean;
}

const reasonLabels = {
  stale_30: { label: '30日滞留', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  stale_60: { label: '60日滞留', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  stale_90: { label: '90日滞留', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  low_views: { label: '閲覧数少', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  competitive: { label: '競合対応', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  profit_optimize: { label: '利益最適化', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export default function PricingRecommendationsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState<string | null>(null);
  const [simulatorPrice, setSimulatorPrice] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [filterReason, setFilterReason] = useState<string>('');

  // Fetch recommendations
  const { data: response, isLoading, mutate } = useSWR<RecommendationsResponse>(
    '/api/pricing/recommendations?limit=100',
    fetcher,
    { refreshInterval: 60000 }
  );

  const recommendations = response?.data || [];
  const stats = response?.stats;

  // Filter by reason
  const filteredRecs = useMemo(() => {
    if (!filterReason) return recommendations;
    return recommendations.filter((r) => r.reasonCode === filterReason);
  }, [recommendations, filterReason]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecs.map((r) => r.listingId)));
    }
  };

  // Approve single recommendation
  const handleApprove = async (rec: PriceRecommendation) => {
    if (!confirm(`$${rec.currentPrice} → $${rec.recommendedPrice} に価格を変更しますか？`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pricing/recommendations/${rec.listingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice: rec.recommendedPrice }),
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
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の価格提案を承認しますか？`)) return;

    setIsProcessing(true);
    try {
      const selectedRecs = filteredRecs
        .filter((r) => selectedIds.has(r.listingId))
        .map((r) => ({ listingId: r.listingId, newPrice: r.recommendedPrice }));

      const res = await fetch('/api/pricing/recommendations/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations: selectedRecs }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        mutate();
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate price
  const handleSimulate = async (listingId: string) => {
    try {
      const res = await fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, newPrice: simulatorPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openSimulator = (rec: PriceRecommendation) => {
    setSimulatorOpen(rec.listingId);
    setSimulatorPrice(rec.recommendedPrice);
    setSimulationResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">価格提案</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            滞留日数・閲覧数に基づく価格調整の提案
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <Settings className="h-4 w-4" />
          ルール設定
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">提案件数</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">30日滞留</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.byReason.stale_30}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">60日以上</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {stats.byReason.stale_60 + stats.byReason.stale_90}件
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">閲覧数少</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.byReason.low_views}件</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">フィルター:</span>
        <button
          onClick={() => setFilterReason('')}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            filterReason === '' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          )}
        >
          すべて
        </button>
        {Object.entries(reasonLabels).map(([code, { label }]) => (
          <button
            key={code}
            onClick={() => setFilterReason(code)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              filterReason === code ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            {selectedIds.size}件選択中
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isProcessing}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            一括承認
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Recommendations List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <input
            type="checkbox"
            checked={filteredRecs.length > 0 && selectedIds.size === filteredRecs.length}
            onChange={toggleSelectAll}
            className="mr-4 h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            全{filteredRecs.length}件
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingDown className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">価格提案はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredRecs.map((rec) => {
              const reasonStyle = reasonLabels[rec.reasonCode];
              return (
                <div key={rec.id}>
                  <div
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                      selectedIds.has(rec.listingId) && 'bg-emerald-50 dark:bg-emerald-900/10'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rec.listingId)}
                      onChange={() => toggleSelect(rec.listingId)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    {/* Image */}
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {rec.imageUrl ? (
                        <img
                          src={rec.imageUrl}
                          alt={rec.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {rec.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', reasonStyle.color)}>
                          {reasonStyle.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {rec.daysSinceListed}日経過 · {rec.views}回閲覧
                        </span>
                      </div>
                    </div>
                    {/* Price Change */}
                    <div className="text-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 line-through">
                          ${rec.currentPrice.toFixed(2)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${rec.recommendedPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-red-600">-{rec.discountPercent}%</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSimulator(rec)}
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        title="シミュレーション"
                      >
                        <Calculator className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(rec)}
                        disabled={isProcessing}
                        className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                        title="承認"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Simulator Panel */}
                  {simulatorOpen === rec.listingId && (
                    <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="flex items-start gap-6">
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
                            価格シミュレーション
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-500">$</span>
                            <input
                              type="number"
                              value={simulatorPrice}
                              onChange={(e) => setSimulatorPrice(Number(e.target.value))}
                              step="0.01"
                              min="0"
                              className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                            />
                            <button
                              onClick={() => handleSimulate(rec.listingId)}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              計算
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            原価: ${rec.costPrice.toFixed(2)}
                          </p>
                        </div>

                        {simulationResult && (
                          <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-zinc-500">利益</p>
                                <p className={cn(
                                  'text-lg font-bold',
                                  simulationResult.newProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                                )}>
                                  ${simulationResult.newProfit.toFixed(2)}
                                </p>
                                <p className={cn(
                                  'text-xs',
                                  simulationResult.profitChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                                )}>
                                  {simulationResult.profitChange >= 0 ? '+' : ''}
                                  {simulationResult.profitChange.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">利益率</p>
                                <p className={cn(
                                  'text-lg font-bold',
                                  simulationResult.profitMarginNew >= 20 ? 'text-emerald-600' :
                                  simulationResult.profitMarginNew >= 10 ? 'text-amber-600' : 'text-red-600'
                                )}>
                                  {simulationResult.profitMarginNew.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">値下げ幅</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                  {simulationResult.priceChangePercent.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            {(simulationResult.isBelowCost || simulationResult.isLowMargin) && (
                              <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                {simulationResult.isBelowCost && '⚠️ 原価割れです'}
                                {simulationResult.isLowMargin && !simulationResult.isBelowCost && '⚠️ 利益率が10%未満です'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSimulatorOpen(null)}
                        className="mt-2 text-xs text-zinc-500 hover:text-zinc-700"
                      >
                        閉じる
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reason Explanation */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">価格提案ルール</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="font-medium text-amber-800 dark:text-amber-400">30日滞留</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">5%値下げ推奨</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
            <p className="font-medium text-orange-800 dark:text-orange-400">60日滞留</p>
            <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">15%値下げ推奨</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="font-medium text-red-800 dark:text-red-400">90日滞留</p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">25%値下げ推奨</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="font-medium text-blue-800 dark:text-blue-400">閲覧数少</p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">10%値下げ推奨（14日経過 & 10回未満）</p>
          </div>
        </div>
      </div>
    </div>
  );
}

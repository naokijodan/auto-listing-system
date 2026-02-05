'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  Trash2,
  RefreshCw,
  TrendingDown,
  Check,
  X,
  Filter,
  ChevronDown,
  Loader2,
  Package,
  Eye,
  Heart,
} from 'lucide-react';

interface StaleInventoryItem {
  productId: string;
  listingId: string;
  title: string;
  daysSinceListed: number;
  views: number;
  watchers: number;
  currentPrice: number;
  costPrice: number;
  profitMargin: number;
  staleScore: number;
  recommendedAction: 'price_drop' | 'relist' | 'delete' | 'keep';
  listedAt: string;
  category: string | null;
  brand: string | null;
  imageUrl: string | null;
}

interface StaleInventoryResponse {
  success: boolean;
  data: StaleInventoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  stats: {
    total: number;
    totalValue: number;
    avgDaysSinceListed: number;
    byAction: {
      price_drop: number;
      relist: number;
      delete: number;
      keep: number;
    };
  };
}

interface FiltersResponse {
  success: boolean;
  data: {
    categories: string[];
    brands: string[];
  };
}

const actionLabels = {
  price_drop: { label: '値下げ推奨', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30', icon: TrendingDown },
  relist: { label: '再出品推奨', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30', icon: RefreshCw },
  delete: { label: '削除推奨', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30', icon: Trash2 },
  keep: { label: '保持', color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30', icon: Check },
};

export default function StaleInventoryPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [minDays, setMinDays] = useState(30);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [sortBy, setSortBy] = useState('daysSinceListed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(10);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('minDays', String(minDays));
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('limit', '100');
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    return params.toString();
  }, [minDays, category, brand, sortBy, sortOrder]);

  // Fetch stale inventory
  const { data: response, isLoading, mutate } = useSWR<StaleInventoryResponse>(
    `/api/inventory/stale?${queryParams}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  // Fetch filter options
  const { data: filtersResponse } = useSWR<FiltersResponse>(
    '/api/inventory/stale/filters',
    fetcher
  );

  const items = response?.data || [];
  const stats = response?.stats;
  const filters = filtersResponse?.data;

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
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.listingId)));
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の出品を停止しますか？`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/inventory/stale/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        mutate();
        addToast({ type: 'success', message: '出品を停止しました' });
      } else {
        addToast({ type: 'error', message: 'エラーが発生しました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'エラーが発生しました' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPriceDrop = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の価格を${discountPercent}%値下げしますか？`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/inventory/stale/bulk-price-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: Array.from(selectedIds),
          discountPercent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        mutate();
        addToast({ type: 'success', message: `${selectedIds.size}件の価格を値下げしました` });
      } else {
        addToast({ type: 'error', message: 'エラーが発生しました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'エラーが発生しました' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRelist = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件を再出品しますか？`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/inventory/stale/bulk-relist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        mutate();
        addToast({ type: 'success', message: '再出品を登録しました' });
      } else {
        addToast({ type: 'error', message: 'エラーが発生しました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'エラーが発生しました' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">滞留在庫管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            出品から{minDays}日以上経過した商品を管理
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Filter className="h-4 w-4" />
          フィルター
          <ChevronDown className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">滞留在庫数</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}件</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総額</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">${stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">平均滞留日数</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.avgDaysSinceListed}日</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">削除推奨</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.byAction.delete}件</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                最小滞留日数
              </label>
              <select
                value={minDays}
                onChange={(e) => setMinDays(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value={30}>30日以上</option>
                <option value={45}>45日以上</option>
                <option value={60}>60日以上</option>
                <option value={90}>90日以上</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="">すべて</option>
                {filters?.categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ブランド
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="">すべて</option>
                {filters?.brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                並び替え
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="daysSinceListed-desc">滞留日数（長い順）</option>
                <option value="daysSinceListed-asc">滞留日数（短い順）</option>
                <option value="staleScore-desc">滞留スコア（高い順）</option>
                <option value="currentPrice-desc">価格（高い順）</option>
                <option value="currentPrice-asc">価格（低い順）</option>
                <option value="profitMargin-desc">利益率（高い順）</option>
                <option value="profitMargin-asc">利益率（低い順）</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
            {selectedIds.size}件選択中
          </span>
          <div className="flex flex-1 items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              出品停止
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBulkPriceDrop}
                disabled={isProcessing}
                className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <TrendingDown className="h-4 w-4" />
                値下げ
              </button>
              <select
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm dark:border-amber-700 dark:bg-amber-900/30"
              >
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
                <option value={30}>30%</option>
              </select>
            </div>
            <button
              onClick={handleBulkRelist}
              disabled={isProcessing}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              再出品
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <input
            type="checkbox"
            checked={items.length > 0 && selectedIds.size === items.length}
            onChange={toggleSelectAll}
            className="mr-4 h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            全{response?.pagination.total || 0}件
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">滞留在庫はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => {
              const action = actionLabels[item.recommendedAction];
              const ActionIcon = action.icon;
              return (
                <div
                  key={item.listingId}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                    selectedIds.has(item.listingId) && 'bg-blue-50 dark:bg-blue-900/10'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.listingId)}
                    onChange={() => toggleSelect(item.listingId)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  {/* Image */}
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.category && <span>{item.category}</span>}
                      {item.brand && <span>{item.brand}</span>}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {item.watchers}
                      </span>
                    </div>
                  </div>
                  {/* Stale Info */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {item.daysSinceListed}日
                    </p>
                    <p className="text-xs text-zinc-500">滞留</p>
                  </div>
                  {/* Price */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      ${item.currentPrice.toFixed(2)}
                    </p>
                    <p className={cn(
                      'text-xs',
                      item.profitMargin >= 0.2 ? 'text-emerald-600' : item.profitMargin >= 0 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      利益率 {(item.profitMargin * 100).toFixed(0)}%
                    </p>
                  </div>
                  {/* Score */}
                  <div className="text-center">
                    <p className={cn(
                      'text-lg font-bold',
                      item.staleScore >= 100 ? 'text-red-600' : item.staleScore >= 50 ? 'text-amber-600' : 'text-emerald-600'
                    )}>
                      {item.staleScore}
                    </p>
                    <p className="text-xs text-zinc-500">スコア</p>
                  </div>
                  {/* Action */}
                  <div className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', action.color)}>
                    <ActionIcon className="h-3 w-3" />
                    {action.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

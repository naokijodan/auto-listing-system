'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useListings } from '@/lib/hooks';
import { Listing } from '@/lib/api';
import {
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Play,
  Pause,
  DollarSign,
  Globe,
  Loader2,
  AlertCircle,
  Eye,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

const ROW_HEIGHT = 52; // Height of each row in pixels

// View mode types
type ViewMode = 'overview' | 'performance' | 'price';

const viewModes: { id: ViewMode; label: string; icon: typeof Eye }[] = [
  { id: 'overview', label: '概要', icon: Eye },
  { id: 'performance', label: 'パフォーマンス', icon: TrendingUp },
  { id: 'price', label: '価格', icon: DollarSign },
];

const marketplaceLabels: Record<string, { label: string; color: string }> = {
  ebay: { label: 'eBay', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  joom: { label: 'Joom', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
};

const statusLabels: Record<string, string> = {
  PUBLISHED: '出品中',
  DRAFT: '下書き',
  SOLD: '売却済',
  ENDED: '終了',
};

export default function ListingsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Ref for virtual scroll container
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch listings from API
  const { data, error, isLoading, mutate } = useListings({
    status: statusFilter || undefined,
    marketplace: marketplaceFilter || undefined,
    limit: 5000, // Request more items for virtual scroll
  });

  const listings = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;

  // Set initial focus when listings load
  useEffect(() => {
    if (listings.length > 0 && !focusedId) {
      setFocusedId(listings[0].id);
    }
  }, [listings, focusedId]);

  const selectedListing = listings.find((l) => l.id === focusedId);
  const isMultiSelect = selectedIds.size > 1;

  // Client-side search filter (API handles marketplace/status)
  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;
    const query = searchQuery.toLowerCase();
    return listings.filter((listing) => {
      const title = listing.product?.title || listing.product?.titleEn || '';
      return title.toLowerCase().includes(query) || listing.externalId?.toLowerCase().includes(query);
    });
  }, [listings, searchQuery]);

  // Virtual scroll setup
  const virtualizer = useVirtualizer({
    count: filteredListings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Scroll to focused item
  useEffect(() => {
    if (focusedId && filteredListings.length > 0) {
      const index = filteredListings.findIndex((l) => l.id === focusedId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'auto' });
      }
    }
  }, [focusedId, filteredListings, virtualizer]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = filteredListings.findIndex((l) => l.id === focusedId);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < filteredListings.length - 1) {
            setFocusedId(filteredListings[currentIndex + 1].id);
          }
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedId(filteredListings[currentIndex - 1].id);
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusedId) {
            toggleSelect(focusedId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, filteredListings]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map((l) => l.id)));
    }
  }, [selectedIds.size, filteredListings]);

  // Stats (from all listings, not filtered)
  const stats = useMemo(() => ({
    published: listings.filter((l) => l.status === 'PUBLISHED').length,
    draft: listings.filter((l) => l.status === 'DRAFT').length,
    sold: listings.filter((l) => l.status === 'SOLD').length,
    ended: listings.filter((l) => l.status === 'ENDED').length,
  }), [listings]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">出品管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLoading ? '読み込み中...' : `${totalCount.toLocaleString()} 件の出品`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              出品中: {stats.published}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              下書き: {stats.draft}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              売却: {stats.sold}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="出品を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのマーケット</option>
          <option value="ebay">eBay</option>
          <option value="joom">Joom</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          <option value="DRAFT">下書き</option>
          <option value="PUBLISHING">出品処理中</option>
          <option value="PUBLISHED">出品中</option>
          <option value="SOLD">売却済</option>
          <option value="ENDED">終了</option>
          <option value="ERROR">エラー</option>
        </select>
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === mode.id
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              )}
            >
              <mode.icon className="h-3.5 w-3.5" />
              {mode.label}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={() => mutate()}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Table */}
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Table Header - Changes based on view mode */}
          <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <div className="w-8">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredListings.length && filteredListings.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="w-12">画像</div>
            <div className="w-20">マーケット</div>
            <div className="flex-1 min-w-0">タイトル</div>

            {/* View Mode: Overview */}
            {viewMode === 'overview' && (
              <>
                <div className="w-24 text-right">価格</div>
                <div className="w-16 text-right">Views</div>
                <div className="w-16 text-right">Watch</div>
                <div className="w-24">ステータス</div>
              </>
            )}

            {/* View Mode: Performance */}
            {viewMode === 'performance' && (
              <>
                <div className="w-16 text-right">Views</div>
                <div className="w-16 text-right">Watch</div>
                <div className="w-16 text-right">CV率</div>
                <div className="w-20 text-right">売上</div>
                <div className="w-24">出品日</div>
              </>
            )}

            {/* View Mode: Price */}
            {viewMode === 'price' && (
              <>
                <div className="w-24 text-right">仕入価格</div>
                <div className="w-24 text-right">出品価格</div>
                <div className="w-20 text-right">利益</div>
                <div className="w-20 text-right">利益率</div>
              </>
            )}
          </div>

          {/* Table Body - Virtual Scroll */}
          <div
            ref={parentRef}
            className="overflow-y-auto"
            style={{ height: 'calc(100% - 36px)' }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <span className="ml-2 text-sm text-zinc-500">読み込み中...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-500">データの取得に失敗しました</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
                  <RefreshCw className="h-4 w-4" />
                  再試行
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredListings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-zinc-500">出品がありません</p>
              </div>
            )}

            {/* Virtualized Listing Rows */}
            {!isLoading && !error && filteredListings.length > 0 && (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const listing = filteredListings[virtualRow.index];
                  const isSelected = selectedIds.has(listing.id);
                  const isFocused = focusedId === listing.id;
                  const mp = marketplaceLabels[listing.marketplace] || { label: listing.marketplace, color: 'bg-zinc-100 text-zinc-800' };
                  const imageUrl = listing.product?.processedImages?.[0] || listing.product?.images?.[0] || `https://placehold.co/400x400/27272a/f59e0b?text=No+Image`;
                  const title = listing.product?.titleEn || listing.product?.title || 'No Title';
                  const views = (listing.marketplaceData as Record<string, unknown>)?.views as number ?? 0;
                  const watchers = (listing.marketplaceData as Record<string, unknown>)?.watchers as number ?? 0;

                  return (
                    <div
                      key={listing.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      onClick={() => setFocusedId(listing.id)}
                      className={cn(
                        'absolute left-0 top-0 w-full flex items-center border-b border-zinc-100 px-3 cursor-pointer transition-colors',
                        'dark:border-zinc-800/50',
                        isFocused && 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500',
                        !isFocused && isSelected && 'bg-zinc-50 dark:bg-zinc-800/30',
                        !isFocused && !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                      )}
                      style={{
                        height: `${ROW_HEIGHT}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="w-8">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(listing.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                        />
                      </div>
                      <div className="w-12">
                        <div className="h-10 w-10 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      </div>
                      <div className="w-20">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', mp.color)}>
                          {mp.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {title}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {listing.externalId || listing.id.slice(0, 12)}
                        </p>
                      </div>

                      {/* View Mode: Overview */}
                      {viewMode === 'overview' && (
                        <>
                          <div className="w-24 text-right">
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              {listing.currency === 'USD' ? '$' : ''}{listing.listingPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-16 text-right">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {views}
                            </span>
                          </div>
                          <div className="w-16 text-right">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {watchers}
                            </span>
                          </div>
                          <div className="w-24">
                            <StatusBadge status={listing.status} />
                          </div>
                        </>
                      )}

                      {/* View Mode: Performance */}
                      {viewMode === 'performance' && (() => {
                        const marketplaceData = listing.marketplaceData as Record<string, unknown> || {};
                        const cvRate = views > 0 ? ((marketplaceData.sales as number || 0) / views * 100) : 0;
                        const sales = (marketplaceData.sales as number) || 0;
                        const publishDate = listing.publishedAt
                          ? new Date(listing.publishedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                          : '-';

                        return (
                          <>
                            <div className="w-16 text-right">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">{views}</span>
                            </div>
                            <div className="w-16 text-right">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">{watchers}</span>
                            </div>
                            <div className="w-16 text-right">
                              <span className={cn(
                                'text-sm font-medium',
                                cvRate >= 5 ? 'text-emerald-600 dark:text-emerald-400' :
                                cvRate >= 2 ? 'text-amber-600 dark:text-amber-400' :
                                'text-zinc-400'
                              )}>
                                {cvRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-20 text-right">
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                {sales > 0 ? `$${(listing.listingPrice * sales).toFixed(0)}` : '-'}
                              </span>
                            </div>
                            <div className="w-24">
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">{publishDate}</span>
                            </div>
                          </>
                        );
                      })()}

                      {/* View Mode: Price */}
                      {viewMode === 'price' && (() => {
                        const costJpy = listing.product?.price || 0;
                        const priceUsd = listing.listingPrice;
                        const exchangeRate = 150; // Assumed exchange rate
                        const costUsd = costJpy / exchangeRate;
                        const profit = priceUsd - costUsd - (listing.shippingCost || 0);
                        const profitRate = priceUsd > 0 ? (profit / priceUsd) * 100 : 0;

                        return (
                          <>
                            <div className="w-24 text-right">
                              <span className="text-sm text-zinc-900 dark:text-white">
                                {formatCurrency(costJpy)}
                              </span>
                            </div>
                            <div className="w-24 text-right">
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                ${priceUsd.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-20 text-right">
                              <span className={cn(
                                'text-sm font-medium',
                                profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              )}>
                                ${profit.toFixed(0)}
                              </span>
                            </div>
                            <div className="w-20 text-right">
                              <span className={cn(
                                'text-sm font-medium',
                                profitRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' :
                                profitRate >= 10 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              )}>
                                {profitRate.toFixed(0)}%
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {selectedListing ? (
            <div className="p-4">
              {/* Image */}
              <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={selectedListing.product?.processedImages?.[0] || selectedListing.product?.images?.[0] || `https://placehold.co/400x400/27272a/f59e0b?text=No+Image`}
                  alt={selectedListing.product?.title || ''}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', (marketplaceLabels[selectedListing.marketplace] || { color: 'bg-zinc-100 text-zinc-800' }).color)}>
                      {(marketplaceLabels[selectedListing.marketplace] || { label: selectedListing.marketplace }).label}
                    </span>
                    <StatusBadge status={selectedListing.status} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {selectedListing.product?.titleEn || selectedListing.product?.title || 'No Title'}
                  </h3>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">出品価格</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedListing.currency === 'USD' ? '$' : ''}{selectedListing.listingPrice.toFixed(2)}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {((selectedListing.marketplaceData as Record<string, unknown>)?.views as number) ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">閲覧数</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {((selectedListing.marketplaceData as Record<string, unknown>)?.watchers as number) ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">ウォッチャー</p>
                  </div>
                </div>

                {/* Details */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                    出品情報
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      { label: '出品ID', value: selectedListing.externalId || selectedListing.id.slice(0, 12) },
                      { label: '商品ID', value: selectedListing.productId.slice(0, 12) },
                      { label: '出品日', value: selectedListing.publishedAt ? new Date(selectedListing.publishedAt).toLocaleDateString('ja-JP') : '-' },
                      { label: '送料', value: selectedListing.shippingCost ? `$${selectedListing.shippingCost.toFixed(2)}` : '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                    編集
                  </Button>
                  {selectedListing.listingUrl && (
                    <a href={selectedListing.listingUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4" />
                        出品ページ
                      </Button>
                    </a>
                  )}
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4" />
                    価格変更
                  </Button>
                  <Button variant="outline" size="sm">
                    <Pause className="h-4 w-4" />
                    停止
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              {isLoading ? '読み込み中...' : '出品を選択してください'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className={cn(
          'mt-4 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
          isMultiSelect
            ? 'border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
        )}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedIds.size > 0 ? (
              <span className={isMultiSelect ? 'font-medium text-amber-700 dark:text-amber-400' : ''}>
                {selectedIds.size} 件選択中
              </span>
            ) : (
              'アクションを選択'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <DollarSign className="h-4 w-4" />
            価格一括変更
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Play className="h-4 w-4" />
            再出品
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Pause className="h-4 w-4" />
            一括停止
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Download className="h-4 w-4" />
            エクスポート
          </Button>
          <Button variant="danger" size="sm" disabled={selectedIds.size === 0}>
            <Trash2 className="h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">J</kbd> / <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">K</kbd> 移動</span>
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">Space</kbd> 選択</span>
      </div>
    </div>
  );
}

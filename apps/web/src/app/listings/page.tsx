'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

// Mock data
const mockListings = Array.from({ length: 40 }, (_, i) => ({
  id: `listing-${String(i + 1).padStart(5, '0')}`,
  productId: `prod-${String(i + 1).padStart(5, '0')}`,
  sku: `nt${String(i + 1).padStart(4, '0')}`,
  title: ['SEIKO SKX007 Diver Watch', 'ORIENT Bambino Automatic', 'CASIO G-SHOCK GA-2100', 'CITIZEN Promaster', 'Hermes Silk Tie', 'Christian Dior Cufflinks', 'Tiffany Necklace'][i % 7],
  marketplace: ['ebay', 'joom', 'ebay', 'joom', 'ebay', 'ebay', 'joom'][i % 7],
  status: ['PUBLISHED', 'PUBLISHED', 'DRAFT', 'SOLD', 'PUBLISHED', 'ENDED', 'PUBLISHED'][i % 7],
  listingPrice: [126.30, 146.68, 156.87, 126.30, 114.07, 79.64, 174.88][i % 7],
  currency: 'USD',
  views: Math.floor(Math.random() * 500),
  watchers: Math.floor(Math.random() * 20),
  externalId: `EXT-${String(Math.floor(Math.random() * 100000000)).padStart(12, '0')}`,
  publishedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
  images: [`https://placehold.co/400x400/27272a/f59e0b?text=${encodeURIComponent(['SKX', 'Bambino', 'G-SHOCK', 'Promaster', 'Hermes', 'Dior', 'Tiffany'][i % 7])}`],
}));

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
  const [focusedId, setFocusedId] = useState<string | null>(mockListings[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('');

  const selectedListing = mockListings.find((l) => l.id === focusedId);
  const isMultiSelect = selectedIds.size > 1;

  const filteredListings = mockListings.filter((listing) => {
    if (marketplaceFilter && listing.marketplace !== marketplaceFilter) return false;
    if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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

  // Stats
  const stats = {
    published: mockListings.filter((l) => l.status === 'PUBLISHED').length,
    draft: mockListings.filter((l) => l.status === 'DRAFT').length,
    sold: mockListings.filter((l) => l.status === 'SOLD').length,
    ended: mockListings.filter((l) => l.status === 'ENDED').length,
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">出品管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mockListings.length.toLocaleString()} 件の出品
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
        <select className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">すべてのステータス</option>
          <option value="PUBLISHED">出品中</option>
          <option value="DRAFT">下書き</option>
          <option value="SOLD">売却済</option>
          <option value="ENDED">終了</option>
        </select>
        <Button variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Table */}
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Table Header */}
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
            <div className="w-24 text-right">価格</div>
            <div className="w-16 text-right">Views</div>
            <div className="w-16 text-right">Watch</div>
            <div className="w-24">ステータス</div>
          </div>

          {/* Table Body */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
            {filteredListings.map((listing) => {
              const isSelected = selectedIds.has(listing.id);
              const isFocused = focusedId === listing.id;
              const mp = marketplaceLabels[listing.marketplace];

              return (
                <div
                  key={listing.id}
                  onClick={() => setFocusedId(listing.id)}
                  className={cn(
                    'flex items-center border-b border-zinc-100 px-3 py-1.5 cursor-pointer transition-colors',
                    'dark:border-zinc-800/50',
                    isFocused && 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500',
                    !isFocused && isSelected && 'bg-zinc-50 dark:bg-zinc-800/30',
                    !isFocused && !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  )}
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
                      <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div className="w-20">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', mp.color)}>
                      {mp.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {listing.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {listing.externalId}
                    </p>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      ${listing.listingPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {listing.views}
                    </span>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {listing.watchers}
                    </span>
                  </div>
                  <div className="w-24">
                    <StatusBadge status={listing.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {selectedListing ? (
            <div className="p-4">
              {/* Image */}
              <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={selectedListing.images[0]}
                  alt={selectedListing.title}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', marketplaceLabels[selectedListing.marketplace].color)}>
                      {marketplaceLabels[selectedListing.marketplace].label}
                    </span>
                    <StatusBadge status={selectedListing.status} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {selectedListing.title}
                  </h3>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">出品価格</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${selectedListing.listingPrice.toFixed(2)}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedListing.views}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">閲覧数</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedListing.watchers}</p>
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
                      { label: '出品ID', value: selectedListing.externalId },
                      { label: 'SKU', value: selectedListing.sku },
                      { label: '出品日', value: new Date(selectedListing.publishedAt).toLocaleDateString('ja-JP') },
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
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    出品ページ
                  </Button>
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
              出品を選択してください
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

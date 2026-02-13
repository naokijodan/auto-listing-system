'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { EbayPreviewModal } from '@/components/ebay-preview-modal';
import {
  Store,
  Package,
  DollarSign,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Pause,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Eye,
  AlertTriangle,
  FileText,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: '下書き', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: FileText },
  PENDING_PUBLISH: { label: '出品待ち', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  PUBLISHING: { label: '処理中', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  ACTIVE: { label: '出品中', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  SOLD: { label: '売却済', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: DollarSign },
  ENDED: { label: '終了', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Pause },
  ERROR: { label: 'エラー', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

interface EbayStats {
  total: number;
  byStatus: {
    draft: number;
    pendingPublish: number;
    publishing: number;
    active: number;
    sold: number;
    error: number;
  };
  sales: {
    count: number;
    totalRevenue: number;
  };
}

interface EbayListing {
  id: string;
  productId: string;
  marketplace: string;
  listingPrice: number;
  shippingCost: number | null;
  currency: string;
  status: string;
  externalId: string | null;
  marketplaceListingId: string | null;
  listingUrl: string | null;
  marketplaceData: Record<string, unknown> | null;
  listedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    titleEn: string | null;
    price: number;
    images: string[];
    processedImages: string[];
    category: string | null;
    brand: string | null;
    condition: string | null;
  };
}

interface ListingsResponse {
  listings: EbayListing[];
  total: number;
}

interface PriceSyncStatus {
  success: boolean;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentChanges: Array<{
    listingId: string;
    productTitle: string;
    oldPrice: number;
    newPrice: number;
    changePercent: string;
    createdAt: string;
  }>;
  stats24h: {
    totalChanges: number;
    averageChangePercent: string;
  };
}

export default function EbayPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [previewListingId, setPreviewListingId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPriceSyncing, setIsPriceSyncing] = useState(false);
  const [showPriceSyncStatus, setShowPriceSyncStatus] = useState(false);

  // プレビューを開く
  const handleOpenPreview = useCallback((id: string) => {
    setPreviewListingId(id);
    setIsPreviewOpen(true);
  }, []);

  // プレビューを閉じる
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewListingId(null);
  }, []);

  // Fetch eBay listings from Phase 103 API
  const { data, error, isLoading, mutate } = useSWR<ListingsResponse>(
    `/api/ebay-listings/listings${statusFilter ? `?status=${statusFilter}` : ''}`,
    fetcher
  );

  // Fetch eBay stats from Phase 103 API
  const { data: statsData, mutate: mutateStats } = useSWR<EbayStats>(
    '/api/ebay-listings/stats',
    fetcher
  );

  // Fetch price sync status
  const { data: priceSyncStatus, mutate: mutatePriceSyncStatus } = useSWR<PriceSyncStatus>(
    showPriceSyncStatus ? '/api/ebay-listings/pricing/sync/status' : null,
    fetcher,
    { refreshInterval: showPriceSyncStatus ? 5000 : 0 }
  );

  const listings = data?.listings ?? [];
  const totalCount = data?.total ?? 0;
  const stats = statsData ?? {
    total: 0,
    byStatus: { draft: 0, pendingPublish: 0, publishing: 0, active: 0, sold: 0, error: 0 },
    sales: { count: 0, totalRevenue: 0 },
  };

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
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listings.map((l) => l.id)));
    }
  }, [selectedIds.size, listings]);

  // 単一出品を公開
  const handlePublish = useCallback(async (id: string) => {
    setIsProcessing(true);
    try {
      await postApi(`/api/ebay-listings/listings/${id}/publish`, {});
      addToast({ type: 'success', message: '出品ジョブを開始しました' });
      mutate();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '出品開始に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate, mutateStats]);

  // バッチ出品
  const handleBatchPublish = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBatchPublishing(true);
    try {
      const response = await postApi('/api/ebay-listings/batch-publish', {
        listingIds: Array.from(selectedIds),
      }) as { message: string; count: number; jobId: string };

      addToast({
        type: 'success',
        message: `${response.count}件の出品ジョブを開始しました`,
      });
      setSelectedIds(new Set());
      mutate();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: 'バッチ出品に失敗しました' });
    } finally {
      setIsBatchPublishing(false);
    }
  }, [selectedIds, mutate, mutateStats]);

  // 出品終了
  const handleEndListing = useCallback(async (id: string) => {
    if (!confirm('この出品を終了しますか？')) return;

    setIsProcessing(true);
    try {
      await postApi(`/api/ebay-listings/listings/${id}/end`, {});
      addToast({ type: 'success', message: '出品を終了しました' });
      mutate();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '出品終了に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate, mutateStats]);

  // 価格同期
  const handlePriceSync = useCallback(async () => {
    setIsPriceSyncing(true);
    setShowPriceSyncStatus(true);
    try {
      const response = await postApi('/api/ebay-listings/pricing/sync', {
        priceChangeThreshold: 0.03, // 3%以上の価格変動で同期
        maxListings: 100,
        syncToMarketplace: false, // まずはDB更新のみ
      }) as { message: string; jobId: string };

      addToast({ type: 'success', message: response.message });
      mutatePriceSyncStatus();
    } catch {
      addToast({ type: 'error', message: '価格同期の開始に失敗しました' });
    } finally {
      setIsPriceSyncing(false);
    }
  }, [mutatePriceSyncStatus]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">eBay管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading ? '読み込み中...' : `${totalCount} 件の出品`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePriceSync}
            disabled={isPriceSyncing}
          >
            {isPriceSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <DollarSign className="h-4 w-4 mr-1" />
            )}
            価格同期
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBatchPublish}
            disabled={isBatchPublishing || selectedIds.size === 0}
          >
            {isBatchPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            選択した{selectedIds.size}件を出品
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutate(); mutateStats(); }}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 grid grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">総出品数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">下書き</p>
              <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{stats.byStatus.draft}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">出品待ち</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.byStatus.pendingPublish + stats.byStatus.publishing}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">出品中</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.byStatus.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">売上</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                ${stats.sales.totalRevenue.toFixed(0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">エラー</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.byStatus.error}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Price Sync Status Panel */}
      {showPriceSyncStatus && priceSyncStatus && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-zinc-900 dark:text-white">価格同期ステータス</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPriceSyncStatus(false)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Queue Status */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{priceSyncStatus.queue.waiting}</p>
              <p className="text-xs text-zinc-500">待機中</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{priceSyncStatus.queue.active}</p>
              <p className="text-xs text-zinc-500">処理中</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{priceSyncStatus.queue.completed}</p>
              <p className="text-xs text-zinc-500">完了</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{priceSyncStatus.queue.failed}</p>
              <p className="text-xs text-zinc-500">失敗</p>
            </div>
          </div>

          {/* 24h Stats */}
          <div className="mb-4 p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              過去24時間: <span className="font-medium">{priceSyncStatus.stats24h.totalChanges}件</span>の価格変更
              {priceSyncStatus.stats24h.totalChanges > 0 && (
                <span className="ml-2">
                  (平均変動: <span className="font-medium">{priceSyncStatus.stats24h.averageChangePercent}%</span>)
                </span>
              )}
            </p>
          </div>

          {/* Recent Changes */}
          {priceSyncStatus.recentChanges.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">最近の価格変更</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {priceSyncStatus.recentChanges.slice(0, 5).map((change) => (
                  <div
                    key={change.listingId}
                    className="flex items-center justify-between text-sm p-2 bg-zinc-50 rounded dark:bg-zinc-800/50"
                  >
                    <span className="truncate flex-1 text-zinc-700 dark:text-zinc-300">
                      {change.productTitle}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-zinc-500 line-through">${change.oldPrice.toFixed(2)}</span>
                      <span className="text-zinc-900 font-medium dark:text-white">${change.newPrice.toFixed(2)}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        parseFloat(change.changePercent) > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {parseFloat(change.changePercent) > 0 ? '+' : ''}{change.changePercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          <option value="DRAFT">下書き</option>
          <option value="PENDING_PUBLISH">出品待ち</option>
          <option value="PUBLISHING">処理中</option>
          <option value="ACTIVE">出品中</option>
          <option value="SOLD">売却済</option>
          <option value="ENDED">終了</option>
          <option value="ERROR">エラー</option>
        </select>

        {selectedIds.size > 0 && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {selectedIds.size}件を選択中
          </span>
        )}
      </div>

      {/* Listings Table */}
      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
          <div className="w-8">
            <input
              type="checkbox"
              checked={listings.length > 0 && selectedIds.size === listings.length}
              onChange={toggleSelectAll}
              disabled={listings.length === 0}
              className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="w-16">画像</div>
          <div className="flex-1 min-w-0">商品名</div>
          <div className="w-24 text-right">出品価格</div>
          <div className="w-20 text-right">送料</div>
          <div className="w-16 text-right">Views</div>
          <div className="w-16 text-right">Watch</div>
          <div className="w-24">ステータス</div>
          <div className="w-24">出品日</div>
          <div className="w-28">操作</div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm text-red-500">データの取得に失敗しました</p>
            </div>
          )}

          {!isLoading && !error && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-sm text-zinc-500">eBay出品がありません</p>
              <p className="mt-2 text-xs text-zinc-400">商品ページからeBay出品を作成してください</p>
            </div>
          )}

          {listings.map((listing) => {
            const isSelected = selectedIds.has(listing.id);
            const product = listing.product;
            const imageUrl = product?.processedImages?.[0] || product?.images?.[0] || 'https://placehold.co/64x64/27272a/3b82f6?text=N';
            const config = statusConfig[listing.status] || statusConfig.ERROR;
            const StatusIcon = config.icon;
            const ebayData = listing.marketplaceData || {};
            const views = (ebayData.views as number) || 0;
            const watchers = (ebayData.watchers as number) || 0;

            return (
              <div
                key={listing.id}
                className={cn(
                  'flex items-center border-b border-zinc-100 px-3 py-2 transition-colors dark:border-zinc-800',
                  isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                  !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                )}
              >
                <div className="w-8">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(listing.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="w-16">
                  <div className="h-12 w-12 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {product?.titleEn || product?.title || 'Unknown Product'}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    SKU: {listing.productId.slice(0, 8)}
                    {listing.marketplaceListingId && ` • eBay: ${listing.marketplaceListingId}`}
                  </p>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    ${listing.listingPrice.toFixed(2)}
                  </span>
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    ${(listing.shippingCost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{views}</span>
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{watchers}</span>
                </div>
                <div className="w-24">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                    <StatusIcon className={cn('h-3 w-3', listing.status === 'PUBLISHING' && 'animate-spin')} />
                    {config.label}
                  </span>
                </div>
                <div className="w-24">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {listing.listedAt
                      ? new Date(listing.listedAt).toLocaleDateString('ja-JP')
                      : '-'}
                  </span>
                </div>
                <div className="w-28 flex items-center gap-1">
                  {/* 出品ボタン (下書き/エラーの場合) */}
                  {['DRAFT', 'ERROR'].includes(listing.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePublish(listing.id)}
                      disabled={isProcessing}
                      title="出品開始"
                    >
                      <Play className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  {/* プレビューボタン */}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="プレビュー"
                    onClick={() => handleOpenPreview(listing.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* 終了ボタン (出品中の場合) */}
                  {listing.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEndListing(listing.id)}
                      disabled={isProcessing}
                      title="出品終了"
                    >
                      <Pause className="h-4 w-4 text-amber-600" />
                    </Button>
                  )}
                  {/* eBayページへのリンク */}
                  {listing.listingUrl && (
                    <a
                      href={listing.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* プレビューモーダル */}
      <EbayPreviewModal
        listingId={previewListingId}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onPublish={async (id) => {
          await handlePublish(id);
        }}
      />
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, fetcher, Listing, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Store,
  DollarSign,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Pause,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  Activity,
  ShoppingCart,
  Boxes,
} from 'lucide-react';
import { JoomStats } from './components/joom-stats';
import { JoomListingTable } from './components/joom-listing-table';
import type {
  ListingStats,
  BatchPublishStatus,
  PriceSyncStatus,
  ExchangeRateData,
  OrderSyncStatus,
  InventorySyncStatus,
} from './components/joom-types';

export default function JoomPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [isPriceSyncing, setIsPriceSyncing] = useState(false);
  const [showPriceSyncStatus, setShowPriceSyncStatus] = useState(false);
  const [isOrderSyncing, setIsOrderSyncing] = useState(false);
  const [showOrderSyncStatus, setShowOrderSyncStatus] = useState(false);
  const [isInventorySyncing, setIsInventorySyncing] = useState(false);
  const [showInventorySyncStatus, setShowInventorySyncStatus] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Joom listings
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: Listing[]; pagination: { total: number } }>(
    api.getListings({
      marketplace: 'JOOM',
      status: statusFilter || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    fetcher
  );

  // Fetch batch publish status
  const { data: batchStatus, mutate: mutateBatchStatus } = useSWR<BatchPublishStatus>(
    showBatchStatus ? '/api/batch/publish/status' : null,
    fetcher,
    { refreshInterval: showBatchStatus ? 5000 : 0 }
  );

  // Fetch price sync status
  const { data: priceSyncStatus, mutate: mutatePriceSyncStatus } = useSWR<PriceSyncStatus>(
    showPriceSyncStatus ? '/api/pricing/sync/status' : null,
    fetcher,
    { refreshInterval: showPriceSyncStatus ? 5000 : 0 }
  );

  // Fetch exchange rate
  const { data: exchangeRate, mutate: mutateExchangeRate } = useSWR<ExchangeRateData>(
    '/api/pricing/exchange-rate',
    fetcher,
    { refreshInterval: 60000 } // 1分ごとに更新
  );

  // Fetch order sync status
  const { data: orderSyncStatus, mutate: mutateOrderSyncStatus } = useSWR<OrderSyncStatus>(
    showOrderSyncStatus ? '/api/orders/sync/status' : null,
    fetcher,
    { refreshInterval: showOrderSyncStatus ? 5000 : 0 }
  );

  // Fetch inventory sync status
  const { data: inventorySyncStatus, mutate: mutateInventorySyncStatus } = useSWR<InventorySyncStatus>(
    showInventorySyncStatus ? '/api/listings/inventory/sync/status' : null,
    fetcher,
    { refreshInterval: showInventorySyncStatus ? 5000 : 0 }
  );

  const listings = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;

  // Calculate stats
  const stats: ListingStats = listings.reduce(
    (acc, listing) => {
      acc.total++;
      if (listing.status === 'ACTIVE') acc.active++;
      if (listing.status === 'PENDING_PUBLISH') acc.pending++;
      if (listing.status === 'SOLD') {
        acc.sold++;
        acc.revenue += listing.soldPrice || listing.listingPrice;
      }
      return acc;
    },
    { total: 0, active: 0, pending: 0, sold: 0, revenue: 0 }
  );

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

  const handlePublish = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      await postApi('/api/listings/bulk/publish', { ids: Array.from(selectedIds) });
      addToast({ type: 'success', message: `${selectedIds.size}件の出品を開始しました` });
      setSelectedIds(new Set());
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: '出品開始に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, mutate]);

  const handleDisable = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      await postApi('/api/listings/bulk/disable', { ids: Array.from(selectedIds) });
      addToast({ type: 'success', message: `${selectedIds.size}件の出品を停止しました` });
      setSelectedIds(new Set());
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: '出品停止に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, mutate]);

  // Batch publish new products
  const handleBatchPublish = useCallback(async () => {
    setIsBatchPublishing(true);
    try {
      const response = await postApi('/api/batch/publish', {
        marketplace: 'joom',
        options: { maxProducts: 20, skipExisting: true },
      }) as { success: boolean; summary: { totalQueued: number } };
      if (response.success) {
        addToast({
          type: 'success',
          message: `${response.summary.totalQueued}件をキューに追加しました`,
        });
        setShowBatchStatus(true);
        mutate();
        mutateBatchStatus();
      }
    } catch (error) {
      addToast({ type: 'error', message: 'バッチ出品に失敗しました' });
    } finally {
      setIsBatchPublishing(false);
    }
  }, [mutate, mutateBatchStatus]);

  // Price sync (DB only)
  const handlePriceSync = useCallback(async () => {
    setIsPriceSyncing(true);
    try {
      const response = await postApi('/api/pricing/sync', {
        marketplace: 'joom',
        priceChangeThreshold: 2,
        maxListings: 100,
        syncToMarketplace: false,
      }) as { success: boolean; message: string; data: { jobId: string } };
      if (response.success) {
        addToast({
          type: 'success',
          message: '価格同期ジョブを開始しました（DB更新のみ）',
        });
        setShowPriceSyncStatus(true);
        mutatePriceSyncStatus();
      }
    } catch (error) {
      addToast({ type: 'error', message: '価格同期に失敗しました' });
    } finally {
      setIsPriceSyncing(false);
    }
  }, [mutatePriceSyncStatus]);

  // Price sync with marketplace API
  const handlePriceSyncWithMarketplace = useCallback(async () => {
    setIsPriceSyncing(true);
    try {
      const response = await postApi('/api/pricing/sync', {
        marketplace: 'joom',
        priceChangeThreshold: 2,
        maxListings: 100,
        syncToMarketplace: true, // Joom APIにも同期
      }) as { success: boolean; message: string; data: { jobId: string } };
      if (response.success) {
        addToast({
          type: 'success',
          message: '価格同期ジョブを開始しました（Joomにも同期）',
        });
        setShowPriceSyncStatus(true);
        mutatePriceSyncStatus();
      }
    } catch (error) {
      addToast({ type: 'error', message: '価格同期に失敗しました' });
    } finally {
      setIsPriceSyncing(false);
    }
  }, [mutatePriceSyncStatus]);

  // Order sync from Joom
  const handleOrderSync = useCallback(async () => {
    setIsOrderSyncing(true);
    try {
      const response = await postApi('/api/orders/sync', {
        marketplace: 'joom',
        sinceDays: 7,
        maxOrders: 100,
      }) as { success: boolean; message: string; data: { jobId: string } };
      if (response.success) {
        addToast({
          type: 'success',
          message: '注文同期ジョブを開始しました',
        });
        setShowOrderSyncStatus(true);
        mutateOrderSyncStatus();
      }
    } catch (error) {
      addToast({ type: 'error', message: '注文同期に失敗しました' });
    } finally {
      setIsOrderSyncing(false);
    }
  }, [mutateOrderSyncStatus]);

  // Inventory sync to Joom
  const handleInventorySync = useCallback(async () => {
    setIsInventorySyncing(true);
    try {
      const response = await postApi('/api/listings/inventory/sync', {
        marketplace: 'joom',
        syncOutOfStock: true,
        maxListings: 100,
      }) as { success: boolean; message: string; data: { jobId: string } };
      if (response.success) {
        addToast({
          type: 'success',
          message: '在庫同期ジョブを開始しました',
        });
        setShowInventorySyncStatus(true);
        mutateInventorySyncStatus();
      }
    } catch (error) {
      addToast({ type: 'error', message: '在庫同期に失敗しました' });
    } finally {
      setIsInventorySyncing(false);
    }
  }, [mutateInventorySyncStatus]);

  const handleDelete = useCallback(async (listingId: string) => {
    setIsDeleting(true);
    try {
      await deleteApi(`/api/joom/listings/${listingId}`);
      addToast({ type: 'success', message: '削除リクエストを送信しました' });
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: '削除に失敗しました' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [mutate]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-pink-500">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Joom管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading ? '読み込み中...' : `${totalCount} 件の出品`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBatchStatus(!showBatchStatus)}
            className={showBatchStatus ? 'border-amber-500 text-amber-600' : ''}
          >
            <Activity className="h-4 w-4 mr-1" />
            ジョブ状況
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOrderSyncStatus(!showOrderSyncStatus)}
            className={showOrderSyncStatus ? 'border-green-500 text-green-600' : ''}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            注文
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPriceSyncStatus(!showPriceSyncStatus)}
            className={showPriceSyncStatus ? 'border-blue-500 text-blue-600' : ''}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            価格同期
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBatchPublish}
            disabled={isBatchPublishing}
          >
            {isBatchPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            新規バッチ出品
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePriceSync}
            disabled={isPriceSyncing}
            title="DBの価格のみ更新"
          >
            {isPriceSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-1" />
            )}
            価格計算
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePriceSyncWithMarketplace}
            disabled={isPriceSyncing}
            title="JoomのAPIにも価格を反映"
          >
            {isPriceSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-1" />
            )}
            Joom同期
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOrderSync}
            disabled={isOrderSyncing}
            title="Joomから注文を取得"
          >
            {isOrderSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-1" />
            )}
            注文取得
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleInventorySync}
            disabled={isInventorySyncing}
            title="在庫をJoomに同期"
          >
            {isInventorySyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Boxes className="h-4 w-4 mr-1" />
            )}
            在庫同期
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <JoomStats stats={stats} usdToJpy={exchangeRate?.data?.usdToJpy} />

      {/* Batch Publish Status */}
      {showBatchStatus && batchStatus && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4" />
              出品ジョブステータス
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                待機: {batchStatus.queue.waiting}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                処理中: {batchStatus.queue.active}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                完了: {batchStatus.queue.completed}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                失敗: {batchStatus.queue.failed}
              </span>
            </div>
          </div>
          {batchStatus.recentJobs.jobs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {batchStatus.recentJobs.jobs.slice(0, 5).map((job) => (
                <div
                  key={job.jobId}
                  className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {job.status === 'COMPLETED' ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    ) : job.status === 'FAILED' ? (
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {job.productTitle}
                    </span>
                  </div>
                  {job.result?.listingUrl && (
                    <a
                      href={job.result.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:text-amber-700 flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {job.errorMessage && (
                    <span className="text-red-500 truncate max-w-32">{job.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Price Sync Status */}
      {showPriceSyncStatus && priceSyncStatus && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              価格同期ステータス
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                待機: {priceSyncStatus.queue.waiting}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                処理中: {priceSyncStatus.queue.active}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                完了: {priceSyncStatus.queue.completed}
              </span>
              <span className="text-zinc-500">
                24h変更: {priceSyncStatus.stats24h.totalChanges}件 (平均{priceSyncStatus.stats24h.averageChangePercent}%)
              </span>
            </div>
          </div>
          {priceSyncStatus.recentChanges.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {priceSyncStatus.recentChanges.slice(0, 5).map((change, idx) => (
                <div
                  key={`${change.listingId}-${idx}`}
                  className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {change.productTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-zinc-500">${change.oldPrice.toFixed(2)}</span>
                    <span className="text-zinc-400">→</span>
                    <span className="text-zinc-900 dark:text-white font-medium">${change.newPrice.toFixed(2)}</span>
                    <span className={cn(
                      'text-xs font-medium',
                      change.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {change.changePercent >= 0 ? '+' : ''}{change.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Order Sync Status */}
      {showOrderSyncStatus && orderSyncStatus && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              注文同期ステータス
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                待機: {orderSyncStatus.queue.waiting}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                処理中: {orderSyncStatus.queue.active}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                完了: {orderSyncStatus.queue.completed}
              </span>
              <span className="text-zinc-500">
                24h新規注文: {orderSyncStatus.stats24h.newOrders}件
              </span>
            </div>
          </div>
          {orderSyncStatus.recentJobs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {orderSyncStatus.recentJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {job.status === 'COMPLETED' ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    ) : job.status === 'FAILED' ? (
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ジョブ {job.jobId}
                    </span>
                  </div>
                  {job.result && (
                    <div className="flex items-center gap-3 text-zinc-500">
                      <span>取得: {job.result.totalFetched || 0}</span>
                      <span className="text-emerald-600">新規: {job.result.totalCreated || 0}</span>
                      <span className="text-blue-600">更新: {job.result.totalUpdated || 0}</span>
                    </div>
                  )}
                  {job.errorMessage && (
                    <span className="text-red-500 truncate max-w-40">{job.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Inventory Sync Status */}
      {showInventorySyncStatus && inventorySyncStatus && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              在庫同期ステータス
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                待機: {inventorySyncStatus.queue.waiting}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                処理中: {inventorySyncStatus.queue.active}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                完了: {inventorySyncStatus.queue.completed}
              </span>
            </div>
          </div>
          {inventorySyncStatus.recentJobs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {inventorySyncStatus.recentJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {job.status === 'COMPLETED' ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    ) : job.status === 'FAILED' ? (
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ジョブ {job.jobId}
                    </span>
                  </div>
                  {job.result && (
                    <div className="flex items-center gap-3 text-zinc-500">
                      <span>処理: {job.result.totalProcessed || 0}</span>
                      <span className="text-emerald-600">同期: {job.result.totalSynced || 0}</span>
                      <span className="text-amber-600">スキップ: {job.result.totalSkipped || 0}</span>
                      {(job.result.totalErrors || 0) > 0 && (
                        <span className="text-red-600">エラー: {job.result.totalErrors}</span>
                      )}
                    </div>
                  )}
                  {job.errorMessage && (
                    <span className="text-red-500 truncate max-w-40">{job.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          <option value="PENDING_PUBLISH">出品待ち</option>
          <option value="ACTIVE">出品中</option>
          <option value="SOLD">売却済</option>
          <option value="DISABLED">停止中</option>
          <option value="ERROR">エラー</option>
        </select>

        {selectedIds.size > 0 && (
          <>
            <Button variant="primary" size="sm" onClick={handlePublish} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              出品開始
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisable} disabled={isProcessing}>
              <Pause className="h-4 w-4" />
              停止
            </Button>
          </>
        )}
      </div>

      {/* Listings Table */}
      <JoomListingTable
        listings={listings}
        isLoading={isLoading}
        error={error}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        deleteTarget={deleteTarget}
        onSetDeleteTarget={setDeleteTarget}
        isDeleting={isDeleting}
        onDelete={handleDelete}
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
      />
    </div>
  );
}

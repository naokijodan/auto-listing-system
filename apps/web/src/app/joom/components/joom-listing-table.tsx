'use client';

import { ExternalLink, Trash2, Loader2, AlertCircle, Package, CheckCircle, Clock, DollarSign, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Listing } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING_PUBLISH: { label: '出品待ち', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  ACTIVE: { label: '出品中', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  SOLD: { label: '売却済', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: DollarSign },
  DISABLED: { label: '停止中', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Pause },
  ERROR: { label: 'エラー', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

type JoomListingTableProps = {
  listings: Listing[];
  isLoading: boolean;
  error?: Error | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  deleteTarget: string | null;
  onSetDeleteTarget: (id: string | null) => void;
  isDeleting: boolean;
  onDelete: (id: string) => void | Promise<void>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function JoomListingTable({
  listings,
  isLoading,
  error,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  deleteTarget,
  onSetDeleteTarget,
  isDeleting,
  onDelete,
  page,
  pageSize,
  total,
  onPageChange,
}: JoomListingTableProps) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  return (
    <>
      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col h-full">
        {/* Header */}
        <div className="hidden sm:flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
          <div className="w-8">
            <input
              type="checkbox"
              checked={listings.length > 0 && selectedIds.size === listings.length}
              onChange={onToggleSelectAll}
              disabled={listings.length === 0}
              className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
            />
          </div>
          <div className="w-16">画像</div>
          <div className="flex-1 min-w-0">商品名</div>
          <div className="w-24 text-right">出品価格</div>
          <div className="w-20 text-right">送料</div>
          <div className="w-24">ステータス</div>
          <div className="w-24">出品日</div>
          <div className="w-20">操作</div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
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
              <p className="mt-4 text-sm text-zinc-500">出品がありません</p>
            </div>
          )}

          {listings.map((listing) => {
            const isSelected = selectedIds.has(listing.id);
            const product = listing.product;
            const imageUrl = product?.processedImages?.[0] || product?.images?.[0] || 'https://placehold.co/64x64/27272a/f59e0b?text=N';
            const config = statusConfig[listing.status] || statusConfig.ERROR;
            const StatusIcon = config.icon;

            return (
              <div key={listing.id}>
                {/* Mobile card */}
                <div
                  className={cn(
                    'sm:hidden border-b border-zinc-100 px-3 py-3 transition-colors dark:border-zinc-800',
                    isSelected && 'bg-amber-50 dark:bg-amber-900/20',
                    !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(listing.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="h-14 w-14 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {product?.titleEn || product?.title || 'Unknown Product'}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">SKU: {listing.productId.slice(0, 8)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {listing.publishedAt
                            ? new Date(listing.publishedAt).toLocaleDateString('ja-JP')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">出品価格</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">${listing.listingPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">送料</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">${(listing.shippingCost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end items-center gap-2">
                    {listing.listingUrl && (
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
                        title="Joomで見る"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onSetDeleteTarget(listing.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Desktop row */}
                <div
                  className={cn(
                    'hidden sm:flex items-center border-b border-zinc-100 px-3 py-2 transition-colors dark:border-zinc-800',
                    isSelected && 'bg-amber-50 dark:bg-amber-900/20',
                    !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  )}
                >
                  <div className="w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(listing.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
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
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">SKU: {listing.productId.slice(0, 8)}</p>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">${listing.listingPrice.toFixed(2)}</span>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">${(listing.shippingCost || 0).toFixed(2)}</span>
                  </div>
                  <div className="w-24">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="w-24">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {listing.publishedAt ? new Date(listing.publishedAt).toLocaleDateString('ja-JP') : '-'}
                    </span>
                  </div>
                  <div className="w-20 flex items-center gap-2">
                    {listing.listingUrl && (
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
                        title="Joomで見る"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onSetDeleteTarget(listing.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-zinc-200 p-3 flex items-center justify-between text-sm text-zinc-500 dark:border-zinc-800">
          <div>ページ {page} / {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              前へ
            </button>
            <button
              className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              次へ
            </button>
          </div>
          <div>全{total}件</div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && onSetDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">この出品をJoomから削除しますか？</h3>
            </div>
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">削除は非同期で処理されます。取り消しはできません。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => onSetDeleteTarget(null)}
                disabled={isDeleting}
                className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteTarget && onDelete(deleteTarget)}
                disabled={isDeleting}
                className="inline-flex h-8 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

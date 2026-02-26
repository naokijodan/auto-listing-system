'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Store,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  Settings,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => r.json());

interface DepopListing {
  id: string;
  productId: string;
  depopProductId?: number;
  sku?: string;
  description?: string;
  pictures: string[];
  price?: number;
  currency: string;
  quantity: number;
  condition?: string;
  status: string;
  errorMessage?: string;
  errorCount: number;
  depopUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    title: string;
    titleEn?: string;
    sourceUrl?: string;
    images: string[];
    price: number;
    brand?: string;
    condition?: string;
  };
}

interface DepopStats {
  total: number;
  active: number;
  draft: number;
  error: number;
  publishing: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: '下書き', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Clock },
  READY: { label: '準備完了', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
  PUBLISHING: { label: '出品中...', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Loader2 },
  ACTIVE: { label: '出品中', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  SOLD_OUT: { label: '売切', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
  ERROR: { label: 'エラー', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  DELETED: { label: '削除済', color: 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500', icon: Trash2 },
};

export default function DepopPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: listingsData, error: listingsError, isLoading, mutate } = useSWR<{ listings: DepopListing[]; total: number }>(
    `/api/depop/listings?limit=100${statusFilter ? `&status=${statusFilter}` : ''}`,
    fetcher,
  );

  const { data: stats } = useSWR<DepopStats>(
    '/api/depop/stats',
    fetcher,
  );

  const { data: settingsData } = useSWR<{ configured: boolean }>(
    '/api/depop/settings',
    fetcher,
  );

  const listings = listingsData?.listings ?? [];
  const total = listingsData?.total ?? 0;

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

  const handlePublish = useCallback(async (productId: string) => {
    setIsPublishing(true);
    try {
      await fetch(`${API_BASE}/api/depop/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      mutate();
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [mutate]);

  const handleBatchPublish = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsPublishing(true);
    try {
      const productIds = listings
        .filter((l) => selectedIds.has(l.id))
        .map((l) => l.productId);
      await fetch(`${API_BASE}/api/depop/publish/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      });
      setSelectedIds(new Set());
      mutate();
    } catch (error) {
      console.error('Batch publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [selectedIds, listings, mutate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/depop/listings/${id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [mutate]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-pink-500">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Depop管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading ? '読み込み中...' : `${total} 件の出品`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!settingsData?.configured && (
            <Link href="/depop/settings">
              <Button variant="outline" size="sm" className="border-amber-500 text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                APIキー未設定
              </Button>
            </Link>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleBatchPublish}
            disabled={isPublishing || selectedIds.size === 0}
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            一括出品 ({selectedIds.size})
          </Button>
          <Link href="/depop/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              設定
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">総出品数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats?.total ?? 0}</p>
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
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.active ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Clock className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">下書き</p>
              <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{stats?.draft ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Loader2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">出品処理中</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats?.publishing ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">エラー</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats?.error ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        {['', 'DRAFT', 'ACTIVE', 'PUBLISHING', 'ERROR', 'DELETED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === s
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
            )}
          >
            {s === '' ? '全て' : statusConfig[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Listings Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === listings.length && listings.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-300"
                />
              </th>
              <th className="px-3 py-2 text-left text-zinc-500 dark:text-zinc-400">商品</th>
              <th className="px-3 py-2 text-left text-zinc-500 dark:text-zinc-400">SKU</th>
              <th className="px-3 py-2 text-left text-zinc-500 dark:text-zinc-400">価格</th>
              <th className="px-3 py-2 text-left text-zinc-500 dark:text-zinc-400">状態</th>
              <th className="px-3 py-2 text-left text-zinc-500 dark:text-zinc-400">コンディション</th>
              <th className="px-3 py-2 text-right text-zinc-500 dark:text-zinc-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-zinc-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2">読み込み中...</p>
                </td>
              </tr>
            ) : listingsError ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-red-500">
                  <AlertCircle className="mx-auto h-6 w-6" />
                  <p className="mt-2">データの取得に失敗しました</p>
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-zinc-500">
                  <Package className="mx-auto h-6 w-6" />
                  <p className="mt-2">出品データがありません</p>
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const status = statusConfig[listing.status] ?? statusConfig.DRAFT;
                const StatusIcon = status.icon;
                const productTitle = listing.product?.titleEn || listing.product?.title || 'Unknown';
                const thumbnail = listing.pictures[0] || listing.product?.images[0] || '';

                return (
                  <tr
                    key={listing.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(listing.id)}
                        onChange={() => toggleSelect(listing.id)}
                        className="rounded border-zinc-300"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
                            <Package className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white max-w-xs">
                            {productTitle}
                          </p>
                          {listing.product?.brand && (
                            <p className="text-xs text-zinc-500">{listing.product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                      {listing.sku || '-'}
                    </td>
                    <td className="px-3 py-2 text-zinc-900 dark:text-white font-medium">
                      {listing.price ? `$${listing.price.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {listing.errorMessage && (
                        <p className="mt-1 text-xs text-red-500 truncate max-w-32" title={listing.errorMessage}>
                          {listing.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {listing.condition || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {listing.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(listing.productId)}
                            disabled={isPublishing}
                            title="Depopに出品"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                        {listing.depopUrl && (
                          <a
                            href={listing.depopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" title="Depopで見る">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(listing.id)}
                          title="削除"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

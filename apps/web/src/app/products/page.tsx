'use client';

import { useState, useCallback, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useProducts, useExchangeRate } from '@/lib/hooks';
import { Product, productApi, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  Package,
  DollarSign,
  FileText,
  ShoppingBag,
} from 'lucide-react';

const ROW_HEIGHT = 52; // Height of each row in pixels

// View mode types
type ViewMode = 'inventory' | 'price' | 'seo';

const viewModes: { id: ViewMode; label: string; icon: typeof Package }[] = [
  { id: 'inventory', label: '在庫', icon: Package },
  { id: 'price', label: '価格', icon: DollarSign },
  { id: 'seo', label: 'SEO', icon: FileText },
];

const sourceSiteLabels: Record<string, string> = {
  mercari: 'メルカリ',
  yahoo: 'ヤフオク',
  rakuma: 'ラクマ',
  ebay: 'eBay',
};

export default function ProductsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('inventory');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // デバウンスされた検索クエリ
  const deferredSearch = useDeferredValue(searchQuery);

  // Ref for virtual scroll container
  const parentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products from API with search
  const { data, error, isLoading, mutate } = useProducts({
    status: statusFilter || undefined,
    search: deferredSearch || undefined,
    sourceType: sourceFilter || undefined,
    limit: 5000, // Request more items for virtual scroll demo
  });

  const products = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;

  // Fetch exchange rate from API
  const { data: rateData } = useExchangeRate();
  const exchangeRate = rateData?.currentRate?.usdToJpy ?? 150; // Fallback to 150

  // Virtual scroll setup
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra items above/below visible area
  });

  // Set initial focus when products load
  useEffect(() => {
    if (products.length > 0 && !focusedId) {
      setFocusedId(products[0].id);
    }
  }, [products, focusedId]);

  const selectedProduct = products.find((p) => p.id === focusedId);
  const isMultiSelect = selectedIds.size > 1;

  // Scroll to focused item
  useEffect(() => {
    if (focusedId && products.length > 0) {
      const index = products.findIndex((p) => p.id === focusedId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'auto' });
      }
    }
  }, [focusedId, products, virtualizer]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (products.length === 0) return;
      const currentIndex = products.findIndex((p) => p.id === focusedId);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < products.length - 1) {
            setFocusedId(products[currentIndex + 1].id);
          }
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedId(products[currentIndex - 1].id);
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
  }, [focusedId, products]);

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
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [selectedIds.size, products]);

  // エクスポート処理
  const handleExport = useCallback(async (exportSelected = false) => {
    setIsExporting(true);
    try {
      const ids = exportSelected && selectedIds.size > 0
        ? Array.from(selectedIds)
        : undefined;
      await productApi.exportCsv(ids);
    } catch (error) {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' });
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds]);

  // インポート処理
  const handleImport = useCallback(async (file: File) => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const csv = await file.text();
      const result = await productApi.importCsv(csv);
      setImportResult(result.data);
      mutate(); // リストを更新
    } catch (error) {
      addToast({ type: 'error', message: 'インポートに失敗しました' });
      setImportResult({
        created: 0,
        updated: 0,
        failed: 1,
        errors: ['インポートに失敗しました'],
      });
    } finally {
      setIsImporting(false);
    }
  }, [mutate]);

  // 一括削除（Undo対応）
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const count = idsToDelete.length;

    try {
      await productApi.bulkDelete(idsToDelete);
      setSelectedIds(new Set());
      mutate();

      // Undo可能なトースト表示
      addToast({
        type: 'undo',
        message: `${count}件の商品を削除しました`,
        duration: 10000,
        undoLabel: '元に戻す',
        onUndo: async () => {
          try {
            await productApi.restore(idsToDelete);
            mutate();
            addToast({
              type: 'success',
              message: `${count}件の商品を復元しました`,
            });
          } catch (error) {
            addToast({
              type: 'error',
              message: '復元に失敗しました',
            });
          }
        },
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: '削除に失敗しました',
      });
    }
  }, [selectedIds, mutate]);

  // 一括出品
  const handleBulkPublish = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;

    try {
      const result = await productApi.bulkPublish(Array.from(selectedIds));
      mutate();

      addToast({
        type: 'success',
        message: `${result.data.createdCount}件の出品を登録しました`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: '出品登録に失敗しました',
      });
    }
  }, [selectedIds, mutate]);

  // eBay出品作成（単一）
  const [isCreatingEbayListing, setIsCreatingEbayListing] = useState(false);
  const handleCreateEbayListing = useCallback(async (productId: string) => {
    setIsCreatingEbayListing(true);
    try {
      const response = await postApi('/api/ebay-listings/listings', {
        productId,
      }) as { id: string };

      addToast({
        type: 'success',
        message: 'eBay出品（下書き）を作成しました',
      });
      mutate();
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('already exists')) {
        addToast({
          type: 'error',
          message: 'この商品は既にeBay出品が存在します',
        });
      } else {
        addToast({
          type: 'error',
          message: 'eBay出品作成に失敗しました',
        });
      }
    } finally {
      setIsCreatingEbayListing(false);
    }
  }, [mutate]);

  // eBay出品作成（一括）
  const [isCreatingEbayListings, setIsCreatingEbayListings] = useState(false);
  const handleBulkCreateEbayListings = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsCreatingEbayListings(true);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
      for (const productId of Array.from(selectedIds)) {
        try {
          await postApi('/api/ebay-listings/listings', { productId });
          successCount++;
        } catch (error: unknown) {
          const err = error as { message?: string };
          if (err.message?.includes('already exists')) {
            skipCount++;
          } else {
            errorCount++;
          }
        }
      }

      setSelectedIds(new Set());
      mutate();

      if (successCount > 0) {
        addToast({
          type: 'success',
          message: `${successCount}件のeBay出品（下書き）を作成しました${skipCount > 0 ? `（${skipCount}件スキップ）` : ''}`,
        });
      } else if (skipCount > 0) {
        addToast({
          type: 'info',
          message: `全ての商品が既にeBay出品済みです（${skipCount}件）`,
        });
      }

      if (errorCount > 0) {
        addToast({
          type: 'error',
          message: `${errorCount}件の作成に失敗しました`,
        });
      }
    } finally {
      setIsCreatingEbayListings(false);
    }
  }, [selectedIds, mutate]);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    e.target.value = ''; // リセット
  }, [handleImport]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLoading ? '読み込み中...' : `${totalCount.toLocaleString()} 件の商品`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            インポート
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport(false)}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            エクスポート
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="商品を検索... (SKU, 商品名)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          <option value="SCRAPED">スクレイピング済</option>
          <option value="PROCESSING">処理中</option>
          <option value="READY">出品可能</option>
          <option value="LISTED">出品中</option>
          <option value="SOLD">売却済</option>
          <option value="ERROR">エラー</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべての仕入元</option>
          <option value="MERCARI">メルカリ</option>
          <option value="YAHOO_AUCTION">ヤフオク</option>
          <option value="YAHOO_FLEA">ヤフフリ</option>
          <option value="RAKUMA">ラクマ</option>
          <option value="RAKUTEN">楽天</option>
          <option value="AMAZON">Amazon</option>
          <option value="OTHER">その他</option>
        </select>
        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4" />
          詳細
        </Button>

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

      {/* Main Content: Table + Detail Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Table */}
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Table Header - Changes based on view mode */}
          <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <div className="w-8">
              <input
                type="checkbox"
                checked={products.length > 0 && selectedIds.size === products.length}
                onChange={toggleSelectAll}
                disabled={products.length === 0}
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="w-12">画像</div>
            <div className="w-24">SKU</div>
            <div className="flex-1 min-w-0">商品名</div>

            {/* View Mode: Inventory */}
            {viewMode === 'inventory' && (
              <>
                <div className="w-24 text-right">仕入価格</div>
                <div className="w-24 text-right">出品価格</div>
                <div className="w-20">仕入元</div>
                <div className="w-24">ステータス</div>
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

            {/* View Mode: SEO */}
            {viewMode === 'seo' && (
              <>
                <div className="w-32">ブランド</div>
                <div className="w-32">カテゴリ</div>
                <div className="w-24">翻訳</div>
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
            {!isLoading && !error && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-zinc-500">商品がありません</p>
              </div>
            )}

            {/* Virtualized Product Rows */}
            {!isLoading && !error && products.length > 0 && (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const product = products[virtualRow.index];
                  const isSelected = selectedIds.has(product.id);
                  const isFocused = focusedId === product.id;
                  const imageUrl = product.processedImages?.[0] || product.images?.[0] || `https://placehold.co/400x400/27272a/f59e0b?text=No+Image`;
                  const listingPrice = product.listings?.[0]?.listingPrice;

                  return (
                    <div
                      key={product.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      onClick={() => setFocusedId(product.id)}
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
                          onChange={() => toggleSelect(product.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                        />
                      </div>
                      <div className="w-12">
                        <div className="h-10 w-10 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <div className="w-24">
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {product.sourceItemId?.slice(0, 8) || product.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {product.title}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {product.titleEn || '翻訳なし'}
                        </p>
                      </div>

                      {/* View Mode: Inventory */}
                      {viewMode === 'inventory' && (
                        <>
                          <div className="w-24 text-right">
                            <span className="text-sm text-zinc-900 dark:text-white">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                          <div className="w-24 text-right">
                            {listingPrice ? (
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                ${listingPrice.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm text-zinc-400">-</span>
                            )}
                          </div>
                          <div className="w-20">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {sourceSiteLabels[product.source?.type || ''] || product.source?.name || '-'}
                            </span>
                          </div>
                          <div className="w-24">
                            <StatusBadge status={product.status} />
                          </div>
                        </>
                      )}

                      {/* View Mode: Price */}
                      {viewMode === 'price' && (() => {
                        const costJpy = product.price;
                        const priceUsd = listingPrice || 0;
                        const costUsd = costJpy / exchangeRate;
                        const profit = priceUsd - costUsd;
                        const profitRate = priceUsd > 0 ? (profit / priceUsd) * 100 : 0;

                        return (
                          <>
                            <div className="w-24 text-right">
                              <span className="text-sm text-zinc-900 dark:text-white">
                                {formatCurrency(product.price)}
                              </span>
                            </div>
                            <div className="w-24 text-right">
                              {listingPrice ? (
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                  ${listingPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-sm text-zinc-400">-</span>
                              )}
                            </div>
                            <div className="w-20 text-right">
                              {priceUsd > 0 ? (
                                <span className={cn(
                                  'text-sm font-medium',
                                  profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                )}>
                                  ${profit.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-sm text-zinc-400">-</span>
                              )}
                            </div>
                            <div className="w-20 text-right">
                              {priceUsd > 0 ? (
                                <span className={cn(
                                  'text-sm font-medium',
                                  profitRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' :
                                  profitRate >= 10 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-red-600 dark:text-red-400'
                                )}>
                                  {profitRate.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-sm text-zinc-400">-</span>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {/* View Mode: SEO */}
                      {viewMode === 'seo' && (
                        <>
                          <div className="w-32">
                            <span className="text-sm text-zinc-900 dark:text-white truncate block">
                              {product.brand || '-'}
                            </span>
                          </div>
                          <div className="w-32">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate block">
                              {product.category || '-'}
                            </span>
                          </div>
                          <div className="w-24">
                            {product.titleEn ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                完了
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                未翻訳
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {selectedProduct ? (
            <div className="p-4">
              {/* Product Image */}
              <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={selectedProduct.processedImages?.[0] || selectedProduct.images?.[0] || `https://placehold.co/400x400/27272a/f59e0b?text=No+Image`}
                  alt={selectedProduct.title}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {selectedProduct.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {selectedProduct.titleEn || '翻訳なし'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedProduct.status} />
                  {selectedProduct.listings && selectedProduct.listings.length > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedProduct.listings.length}件の出品
                    </span>
                  )}
                </div>

                {/* Specs Table */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                    詳細情報
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      { label: 'ID', value: selectedProduct.sourceItemId?.slice(0, 12) || selectedProduct.id.slice(0, 12) },
                      { label: 'ブランド', value: selectedProduct.brand || '-' },
                      { label: 'カテゴリ', value: selectedProduct.category || '-' },
                      { label: 'コンディション', value: selectedProduct.condition || '-' },
                      { label: '仕入元', value: sourceSiteLabels[selectedProduct.source?.type || ''] || selectedProduct.source?.name || '-' },
                      { label: '仕入価格', value: formatCurrency(selectedProduct.price) },
                      { label: '出品価格', value: selectedProduct.listings?.[0]?.listingPrice ? `$${selectedProduct.listings[0].listingPrice.toFixed(2)}` : '-' },
                      { label: '重量', value: selectedProduct.weight ? `${selectedProduct.weight}g` : '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4" />
                    編集
                  </Button>
                  {selectedProduct.sourceUrl && (
                    <a
                      href={selectedProduct.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4" />
                        仕入元
                      </Button>
                    </a>
                  )}
                </div>

                {/* eBay出品作成 */}
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCreateEbayListing(selectedProduct.id)}
                  disabled={isCreatingEbayListing}
                >
                  {isCreatingEbayListing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  eBay出品作成
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              {isLoading ? '読み込み中...' : '商品を選択してください'}
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
            <Edit className="h-4 w-4" />
            一括編集
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            価格一括変更
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleBulkPublish}
          >
            一括出品
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0 || isCreatingEbayListings}
            onClick={handleBulkCreateEbayListings}
          >
            {isCreatingEbayListings ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            eBay一括出品
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0 || isExporting}
            onClick={() => handleExport(true)}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            エクスポート
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">J</kbd> / <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">K</kbd> 移動</span>
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">Space</kbd> 選択</span>
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">Enter</kbd> 詳細</span>
      </div>

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              インポート結果
            </h3>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">新規作成:</span>
                <span className="font-medium text-emerald-600">{importResult.created}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">更新:</span>
                <span className="font-medium text-blue-600">{importResult.updated}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">失敗:</span>
                <span className="font-medium text-red-600">{importResult.failed}件</span>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mb-4 max-h-32 overflow-y-auto rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {importResult.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setImportResult(null)}
            >
              閉じる
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

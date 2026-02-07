'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useProducts } from '@/lib/hooks';
import { Product, productApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface JoomPreviewData {
  product: {
    id: string;
    title: string;
    titleEn?: string;
    price: number;
    status: string;
  };
  joomPreview: {
    id: string;
    name: string;
    description: string;
    mainImage: string;
    extraImages: string[];
    price: number;
    currency: string;
    quantity: number;
    shipping: { price: number; time: string };
    tags: string[];
    parentSku: string;
    sku: string;
  };
  pricing: {
    originalPriceJpy: number;
    costUsd: number;
    shippingCost: number;
    platformFee: number;
    paymentFee: number;
    profit: number;
    finalPriceUsd: number;
    exchangeRate: number;
  };
  validation: {
    passed: boolean;
    warnings: string[];
  };
  seo: {
    score: number;
    estimatedVisibility: 'high' | 'medium' | 'low';
  };
}

export default function ProductReviewPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewData, setPreviewData] = useState<JoomPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Fetch products in READY_TO_REVIEW status
  const { data, error, isLoading, mutate } = useProducts({
    status: 'READY_TO_REVIEW',
    limit: 100,
  });

  const products = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;
  const currentProduct = products[selectedIndex];

  // Load Joom preview when product changes
  useEffect(() => {
    if (!currentProduct) {
      setPreviewData(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const result = await productApi.previewJoom(currentProduct.id);
        setPreviewData(result.data);
      } catch (error) {
        console.error('Failed to load preview:', error);
        setPreviewData(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [currentProduct]);

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

  const handleApprove = useCallback(async () => {
    if (!currentProduct) return;

    setIsApproving(true);
    try {
      await productApi.approve(currentProduct.id);
      addToast({ type: 'success', message: '商品を承認しました' });
      mutate();
      // Move to next product
      if (selectedIndex < products.length - 1) {
        setSelectedIndex((i) => i + 1);
      }
    } catch (error) {
      addToast({ type: 'error', message: '承認に失敗しました' });
    } finally {
      setIsApproving(false);
    }
  }, [currentProduct, mutate, selectedIndex, products.length]);

  const handleReject = useCallback(async () => {
    if (!currentProduct) return;

    setIsApproving(true);
    try {
      await productApi.bulkReject([currentProduct.id]);
      addToast({ type: 'success', message: '商品を却下しました' });
      mutate();
      // Move to next product
      if (selectedIndex < products.length - 1) {
        setSelectedIndex((i) => i + 1);
      } else if (selectedIndex > 0) {
        setSelectedIndex((i) => i - 1);
      }
    } catch (error) {
      addToast({ type: 'error', message: '却下に失敗しました' });
    } finally {
      setIsApproving(false);
    }
  }, [currentProduct, mutate, selectedIndex, products.length]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsApproving(true);
    try {
      const result = await productApi.bulkApprove(Array.from(selectedIds));
      addToast({ type: 'success', message: `${result.data.updatedCount}件を承認しました` });
      setSelectedIds(new Set());
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: '一括承認に失敗しました' });
    } finally {
      setIsApproving(false);
    }
  }, [selectedIds, mutate]);

  const navigatePrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex((i) => i - 1);
    }
  };

  const navigateNext = () => {
    if (selectedIndex < products.length - 1) {
      setSelectedIndex((i) => i + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        navigateNext();
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleApprove();
      } else if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, products.length, handleApprove, handleReject]);

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'high':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'medium':
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30';
      case 'low':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-zinc-600 bg-zinc-50';
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品レビュー</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLoading ? '読み込み中...' : `${totalCount} 件の商品が承認待ち`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkApprove}
              disabled={isApproving}
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {selectedIds.size}件を一括承認
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Product List */}
        <div className="w-72 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="mt-4 text-sm text-zinc-500">すべてレビュー済みです</p>
            </div>
          )}

          {products.map((product, index) => {
            const isSelected = index === selectedIndex;
            const isChecked = selectedIds.has(product.id);
            const imageUrl = product.processedImages?.[0] || product.images?.[0] || 'https://placehold.co/80x80/27272a/f59e0b?text=N';

            return (
              <div
                key={product.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'flex items-center gap-3 border-b border-zinc-100 p-3 cursor-pointer transition-colors dark:border-zinc-800',
                  isSelected && 'bg-amber-50 dark:bg-amber-900/20',
                  !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelect(product.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                />
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {product.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Preview */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {!currentProduct ? (
            <div className="flex h-full items-center justify-center text-zinc-400">
              商品を選択してください
            </div>
          ) : isLoadingPreview ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="p-6">
              {/* Navigation */}
              <div className="mb-4 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={navigatePrev} disabled={selectedIndex === 0}>
                  <ChevronLeft className="h-4 w-4" /> 前へ
                </Button>
                <span className="text-sm text-zinc-500">
                  {selectedIndex + 1} / {products.length}
                </span>
                <Button variant="ghost" size="sm" onClick={navigateNext} disabled={selectedIndex === products.length - 1}>
                  次へ <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Joom Preview */}
              {previewData && (
                <div className="space-y-6">
                  {/* Images */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3 aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={previewData.joomPreview.mainImage || 'https://placehold.co/400x400/27272a/f59e0b?text=No+Image'}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      {previewData.joomPreview.extraImages.slice(0, 4).map((img, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Title & Price */}
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                      {previewData.joomPreview.name}
                    </h2>
                    <div className="mt-2 flex items-center gap-4">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${previewData.joomPreview.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-zinc-500 line-through">
                        {formatCurrency(previewData.pricing.originalPriceJpy)}
                      </span>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  {previewData.validation.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">注意事項</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-amber-600 dark:text-amber-300">
                        {previewData.validation.warnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SEO & Visibility */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">SEOスコア:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {previewData.seo.score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">予想可視性:</span>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        getVisibilityColor(previewData.seo.estimatedVisibility)
                      )}>
                        {previewData.seo.estimatedVisibility === 'high' ? '高' :
                         previewData.seo.estimatedVisibility === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      価格内訳
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {[
                        { label: '仕入原価', value: `${formatCurrency(previewData.pricing.originalPriceJpy)} (${previewData.pricing.costUsd.toFixed(2)} USD)` },
                        { label: '送料', value: `$${previewData.pricing.shippingCost.toFixed(2)}` },
                        { label: 'プラットフォーム手数料', value: `$${previewData.pricing.platformFee.toFixed(2)}` },
                        { label: '決済手数料', value: `$${previewData.pricing.paymentFee.toFixed(2)}` },
                        { label: '利益', value: `$${previewData.pricing.profit.toFixed(2)}`, highlight: true },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between px-4 py-2">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</span>
                          <span className={cn(
                            'text-sm',
                            item.highlight ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                          )}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">商品説明</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {previewData.joomPreview.description || '説明なし'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Action Buttons */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">アクション</h3>
            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleApprove}
                disabled={!currentProduct || isApproving}
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                承認 (A)
              </Button>
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                onClick={handleReject}
                disabled={!currentProduct || isApproving}
              >
                <X className="h-4 w-4" />
                却下 (R)
              </Button>
            </div>
          </Card>

          {/* Product Info */}
          {currentProduct && (
            <Card className="p-4">
              <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">商品情報</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">SKU</span>
                  <p className="font-mono text-zinc-900 dark:text-white">
                    {currentProduct.sourceItemId?.slice(0, 12)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">ブランド</span>
                  <p className="text-zinc-900 dark:text-white">{currentProduct.brand || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">カテゴリ</span>
                  <p className="text-zinc-900 dark:text-white">{currentProduct.category || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">コンディション</span>
                  <p className="text-zinc-900 dark:text-white">{currentProduct.condition || '-'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Keyboard Hints */}
          <div className="text-xs text-zinc-400 space-y-1">
            <p><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">←</kbd> / <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">→</kbd> 移動</p>
            <p><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">A</kbd> 承認</p>
            <p><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">R</kbd> 却下</p>
          </div>
        </div>
      </div>
    </div>
  );
}

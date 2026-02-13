'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetcher, postApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Tag,
  Package,
  Image as ImageIcon,
  ExternalLink,
  Upload,
} from 'lucide-react';

interface EbayPreviewData {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    category: string | null;
    condition: string | null;
    itemSpecifics: Record<string, string>;
    images: string[];
  };
  validation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
  estimatedFees: {
    insertionFee: number;
    finalValueFee: number;
    paymentProcessingFee: number;
    total: number;
  };
}

interface EbayPreviewModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish?: (listingId: string) => Promise<void>;
}

export function EbayPreviewModal({
  listingId,
  isOpen,
  onClose,
  onPublish,
}: EbayPreviewModalProps) {
  const [previewData, setPreviewData] = useState<EbayPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (isOpen && listingId) {
      fetchPreview();
    } else {
      setPreviewData(null);
      setError(null);
    }
  }, [isOpen, listingId]);

  const fetchPreview = async () => {
    if (!listingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await postApi(`/api/ebay-listings/listings/${listingId}/preview`, {}) as EbayPreviewData;
      setPreviewData(response);
    } catch (err) {
      setError('プレビューの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!listingId || !onPublish) return;

    setIsPublishing(true);
    try {
      await onPublish(listingId);
      onClose();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            eBay出品プレビュー
          </DialogTitle>
          <DialogDescription>
            出品前の確認と手数料の試算
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-zinc-500">読み込み中...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchPreview}>
              再試行
            </Button>
          </div>
        )}

        {previewData && (
          <div className="space-y-6">
            {/* Validation Status */}
            <div className={cn(
              'rounded-lg border p-4',
              previewData.validation.isValid
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            )}>
              <div className="flex items-center gap-2">
                {previewData.validation.isValid ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      出品可能です
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      出品できません
                    </span>
                  </>
                )}
              </div>

              {previewData.validation.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {previewData.validation.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {previewData.validation.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {previewData.validation.warnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listing Preview */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">出品内容</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Images */}
                {previewData.listing.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previewData.listing.images.slice(0, 6).map((img, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 h-20 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {previewData.listing.images.length > 6 && (
                      <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <span className="text-sm text-zinc-500">
                          +{previewData.listing.images.length - 6}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">タイトル</label>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {previewData.listing.title}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">出品価格</label>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ${previewData.listing.price.toFixed(2)}
                    </p>
                  </div>
                  {previewData.listing.category && (
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400">カテゴリ</label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {previewData.listing.category}
                      </p>
                    </div>
                  )}
                  {previewData.listing.condition && (
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400">コンディション</label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {previewData.listing.condition}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {previewData.listing.description && (
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">説明</label>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3">
                      {previewData.listing.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Estimated Fees */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  手数料試算
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">掲載料</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ${previewData.estimatedFees.insertionFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">落札手数料 (~13.25%)</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ${previewData.estimatedFees.finalValueFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">決済手数料 (2.9% + $0.30)</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ${previewData.estimatedFees.paymentProcessingFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-zinc-700 dark:text-zinc-300">合計手数料</span>
                      <span className="text-red-600 dark:text-red-400">
                        -${previewData.estimatedFees.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-zinc-500 dark:text-zinc-400">想定手取り</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ${(previewData.listing.price - previewData.estimatedFees.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          {previewData && onPublish && (
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!previewData.validation.isValid || isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              出品開始
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
